(() => {
  const P = window.PARTY, $ = (s) => document.querySelector(s);
  const stages = ["boot", "ident", "profiles", "browse"];
  const show = (id) => { stages.forEach((s) => $("#" + s).classList.toggle("active", s === id)); document.body.dataset.stage = id; };
  const photo = (n) => `media/photos/${String(n).padStart(2, "0")}.jpg`;
  const items = { film: P.film };
  P.rows.forEach((r) => r.items.forEach((it, i) => { if (it.id === "film") r.items[i] = P.film; else items[it.id] = it; }));

  /* ── AJM ident: a pre-rendered 1080p film (media/intro.mp4) with its own synced sound ── */
  const identVideo = $("#ident-video");
  let started = false, identDone = false;
  const goFull = () => { const d = document.documentElement; if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().catch(() => {}); };
  // Plays the moment the page opens, like the real thing. Browsers only allow sound without a click in some cases
  // (see party.command, which opens Chrome with sound allowed); otherwise the intro plays silently and one click adds sound.
  function start(withGesture) {
    started = true; identDone = false; show("ident"); document.body.classList.remove("needs-sound");
    if (withGesture) goFull();
    const done = () => { if (identDone) return; identDone = true; identVideo.pause(); document.body.classList.remove("needs-sound"); toProfiles(); };
    identVideo.onended = done; identVideo.onerror = done;
    identVideo.muted = false; identVideo.currentTime = 0;
    const pr = identVideo.play();
    if (pr) pr.catch(() => { identVideo.muted = true; document.body.classList.add("needs-sound"); identVideo.play().catch(done); });
    clearTimeout(start.timer); start.timer = setTimeout(done, 6500);
  }
  function toProfiles() { show("profiles"); $("#profile-btn").focus({ preventScroll: true }); }
  function toBrowse() {
    const p = $("#profiles"); p.classList.add("leaving");
    setTimeout(() => { p.classList.remove("leaving"); show("browse"); $("#browse").scrollTop = 0; $("#play").focus({ preventScroll: true }); warmFilm(); }, 480);
  }

  /* ── populate ── */
  $("#profile-img").src = $("#mini-avatar").src = P.profile.photo;
  $("#profile-name").textContent = P.profile.name;
  // ?hero=garba (or any name in config.js → hero.alternates) previews another poster without editing anything
  const alt = new URLSearchParams(location.search).get("hero");
  const heroPick = (alt && P.hero.alternates && P.hero.alternates[alt]) || P.hero;
  $("#hero-img").style.backgroundImage = $("#info-img").style.backgroundImage = `url("${heroPick.image}")`;
  $("#hero-img").style.backgroundPosition = $("#info-img").style.backgroundPosition = heroPick.position || "70% 30%";
  document.documentElement.style.setProperty("--hero-pos-mobile", heroPick.mobilePosition || "68% 0");
  $("#hero-title").textContent = $("#info-title").textContent = P.hero.title;
  $("#hero-sub").textContent = $("#info-sub").textContent = P.hero.subtitle;
  $("#hero-detail").textContent = $("#info-detail").textContent = P.hero.detail;
  $("#hero-syn").textContent = $("#info-syn").textContent = P.hero.synopsis;
  $("#info-year").textContent = P.film.year; $("#info-run").textContent = P.film.runtime;
  $("#info-cast").textContent = P.film.cast; $("#info-genres").textContent = P.film.genres; $("#info-moods").textContent = P.film.moods;

  const ico = { play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z" fill="#000"/></svg>', plus: '<svg viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" stroke="#fff" stroke-width="2"/></svg>', like: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.500-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.500-7 10-7 10z" fill="none" stroke="#fff" stroke-width="1.8"/></svg>' };
  $("#rows").innerHTML = P.rows.map((r) => `<section class="row"><h3>${r.title}</h3><div class="row-track">${r.items.map((it) => `
      <button class="card" type="button" data-id="${it.id}" aria-label="${it.title}">
        <span class="card-art" style="background-image:url('${it.cover}')"></span>
        <span class="card-mark">${P.initials}</span>${it.bakedTitle ? "" : `<span class="card-title">${it.title}</span>`}
        <span class="card-info"><span class="ci-btns"><span class="ci-btn play">${ico.play}</span><span class="ci-btn">${ico.plus}</span><span class="ci-btn">${ico.like}</span></span>
          <span class="ci-meta"><span class="match">100% Match</span><span>${it.tag || it.runtime || ""}</span><span class="hd">HD</span></span></span>
      </button>`).join("")}</div></section>`).join("");

  /* ── overlays: player, gallery, info ── */
  const video = $("#video"), player = $("#player"), gallery = $("#gallery"), info = $("#info");
  let open = null, lastFocus = null, uiTimer, gal = null, gi = 0, filmWarm = false;
  function warmFilm() { if (!filmWarm && !filmBlob) { filmWarm = true; video.src = P.film.src; video.load(); } }
  /* Internet-proofing: the moment the page opens, the intro and the whole film are downloaded into memory.
     Once the corner of the black screen says "Ready", both play from memory — no buffering, even if the Wi-Fi drops. */
  let filmBlob = null;
  const status = (t) => { const e = $("#ready"); if (e) e.textContent = t; };
  async function pull(url, onProgress) {
    const r = await fetch(url); if (!r.ok || !r.body) throw new Error("fetch");
    const total = +r.headers.get("Content-Length") || 0, rd = r.body.getReader(), parts = []; let got = 0;
    for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; if (total && onProgress) onProgress(got / total); }
    return URL.createObjectURL(new Blob(parts, { type: "video/mp4" }));
  }
  (async () => {
    if (location.protocol === "file:") return;
    try {
      status("Loading…");
      await pull("media/intro.mp4");
      const small = Math.min(screen.width, screen.height) < 700 || (navigator.connection && navigator.connection.saveData);
      if (small) { status(""); return; }                                   // phones stream the film instead of holding it in memory
      filmBlob = await pull(P.film.src, (f) => status(`Loading film ${Math.round(f * 100)}%`));
      if (open !== player) { video.src = filmBlob; video.load(); filmWarm = true; }
      status("Ready ✓");
    } catch (e) { status(""); }
  })();
  function openOverlay(el) { if (!open) lastFocus = document.activeElement; else open.classList.remove("open"); open = el; el.classList.add("open"); }
  function closeOverlay() {
    if (!open) return;
    if (open === player) { video.pause(); }
    open.classList.remove("open"); open = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function play(it) {
    openOverlay(player);
    const src = (it === P.film && filmBlob) || it.src, want = new URL(src, location.href).href;
    if (video.src !== want) { video.src = src; filmWarm = it === P.film; }
    $("#ptitle").textContent = it.title; video.muted = false; player.classList.remove("muted");
    try { video.currentTime = 0; } catch (e) {}
    const p = video.play(); if (p) p.catch(() => {});
    pokeUI();
  }
  function showPhoto() {
    const img = $("#g-img"); img.style.animation = "none"; void img.offsetWidth; img.style.animation = "";
    img.src = photo(gal.photos[gi]); $("#g-count").textContent = `${gi + 1} / ${gal.photos.length}`;
    [1, -1].forEach((d) => { new Image().src = photo(gal.photos[(gi + d + gal.photos.length) % gal.photos.length]); });
  }
  function step(d) { gi = (gi + d + gal.photos.length) % gal.photos.length; showPhoto(); }
  function openItem(it) {
    if (it.type === "gallery") { gal = it; gi = 0; $("#g-title").textContent = it.title; openOverlay(gallery); showPhoto(); }
    else play(it);
  }
  const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  function pokeUI() { player.classList.add("show-ui"); clearTimeout(uiTimer); uiTimer = setTimeout(() => { if (!video.paused) player.classList.remove("show-ui"); }, 2600); }
  const toggle = () => { video.paused ? video.play() : video.pause(); pokeUI(); };
  const toggleFS = () => {
    const d = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (d.requestFullscreen) d.requestFullscreen().catch(() => {});
    else if (open === player && video.webkitEnterFullscreen) video.webkitEnterFullscreen();   // iPhone
  };
  // swipe left/right through gallery photos on touch screens
  let tx = null;
  gallery.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  gallery.addEventListener("touchend", (e) => { if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 45) { step(dx < 0 ? 1 : -1); e.preventDefault(); } });
  player.addEventListener("touchstart", pokeUI, { passive: true });
  const toggleMute = () => { video.muted = !video.muted; player.classList.toggle("muted", video.muted); pokeUI(); };
  video.addEventListener("timeupdate", () => { $("#fill").style.width = (video.currentTime / (video.duration || 1)) * 100 + "%"; $("#ptime").textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`; });
  video.addEventListener("progress", () => { if (video.buffered.length) $("#buf").style.width = (video.buffered.end(video.buffered.length - 1) / (video.duration || 1)) * 100 + "%"; });
  video.addEventListener("play", () => { $("#pp-icon").setAttribute("d", "M6 4h4v16H6zM14 4h4v16h-4z"); });
  video.addEventListener("pause", () => { $("#pp-icon").setAttribute("d", "M7 4v16l13-8z"); player.classList.add("show-ui"); });
  video.addEventListener("ended", () => { if (open === player) setTimeout(closeOverlay, 600); });   // back to the homepage
  video.addEventListener("click", toggle);
  player.addEventListener("mousemove", pokeUI);
  $("#pp").onclick = toggle; $("#fs").onclick = toggleFS; $("#mute").onclick = toggleMute;
  $("#seek").addEventListener("click", (e) => { const r = e.currentTarget.getBoundingClientRect(); video.currentTime = ((e.clientX - r.left) / r.width) * (video.duration || 0); pokeUI(); });
  $("#g-prev").onclick = () => step(-1); $("#g-next").onclick = () => step(1);
  $("#g-img").addEventListener("click", (e) => step(e.clientX < innerWidth / 2 ? -1 : 1));
  document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = closeOverlay));
  info.addEventListener("click", (e) => { if (e.target === info) closeOverlay(); });

  /* ── wiring ── */
  $("#enter").onclick = () => { if (document.body.dataset.stage === "ident") start(true); else goFull(); };
  $("#profile-btn").onclick = toBrowse;
  $("#play").onclick = $("#info-play").onclick = () => play(P.film);       // the party button
  $("#more").onclick = () => { openOverlay(info); info.scrollTop = 0; $("#info-play").focus(); };
  $("#rows").addEventListener("click", (e) => { const c = e.target.closest(".card"); if (c) openItem(items[c.dataset.id]); });
  $("#home-link").onclick = (e) => { e.preventDefault(); $("#browse").scrollTo({ top: 0, behavior: "smooth" }); };
  $("#browse").addEventListener("scroll", () => $("#topbar").classList.toggle("solid", $("#browse").scrollTop > 30));

  document.addEventListener("keydown", (e) => {
    const k = e.key;
    if (document.body.dataset.stage === "ident") { if (identVideo.muted && (k === "Enter" || k === " ")) { e.preventDefault(); start(true); } return; }
    if (open === player) {
      if (k === " " || k === "k" || k === "Enter") { e.preventDefault(); toggle(); }
      else if (k === "ArrowRight") { video.currentTime = Math.min(video.currentTime + 10, video.duration || 0); pokeUI(); }
      else if (k === "ArrowLeft") { video.currentTime = Math.max(video.currentTime - 10, 0); pokeUI(); }
      else if (k === "f") toggleFS(); else if (k === "m") toggleMute();
      else if (k === "Escape" || k === "Backspace") { e.preventDefault(); closeOverlay(); }
      return;
    }
    if (open === gallery) {
      if (k === "ArrowRight" || k === " ") { e.preventDefault(); step(1); } else if (k === "ArrowLeft") step(-1);
      else if (k === "f") toggleFS(); else if (k === "Escape" || k === "Backspace") { e.preventDefault(); closeOverlay(); }
      return;
    }
    if (open === info) { if (k === "Escape" || k === "Backspace") { e.preventDefault(); closeOverlay(); } return; }
    if ($("#browse").classList.contains("active") && (k === "ArrowRight" || k === "ArrowLeft") && document.activeElement.classList.contains("card")) {
      const sib = k === "ArrowRight" ? document.activeElement.nextElementSibling : document.activeElement.previousElementSibling; if (sib) sib.focus();
    }
  });

  // ?skip jumps straight to the homepage (handy for rehearsing); ?profiles to the picker
  const q = location.search;
  if (/[?&]skip/.test(q)) { started = true; show("browse"); warmFilm(); } else if (/[?&]profiles/.test(q)) { started = true; toProfiles(); }
  else start(false);
})();
