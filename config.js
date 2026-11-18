/* ─────────────────────────────────────────────────────────────
   EASY EDITS — everything the party site shows comes from here.
   • Swap the hero photo:    change hero.image below (three posters are in media/heroes/)
   • Swap the profile photo: replace media/profile.jpg (square, 400×400)
   • Change any wording below, save, refresh.
   The closing "Happy Birthday, Arushi" card lives inside the film itself:
   edit WORDS at the top of work/film2.py and re-run ./build-film.sh
   ───────────────────────────────────────────────────────────── */
window.PARTY = {
  initials: "AJM",
  profile: { name: "Arushi", photo: "media/profile.jpg" },

  hero: {
    image: "media/heroes/childhood.jpg", position: "70% 40%", mobilePosition: "74% 30%",
    // Other posters, ready to go live: copy one of these lines over the line above.
    // Preview without editing: http://localhost:8020/?skip&hero=mountains, ?skip&hero=rooftop or ?skip&hero=garba
    alternates: {
      mountains: { image: "media/heroes/mountains.jpg", position: "62% 30%", mobilePosition: "60% 0" },
      rooftop: { image: "media/heroes/rooftop.jpg", position: "70% 30%", mobilePosition: "72% 0" },
      garba: { image: "media/heroes/garba.jpg", position: "62% 0%", mobilePosition: "60% 0" },
    },
    title: "Arushi",
    subtitle: "The Birthday Special",
    detail: "Premiering 20 November",
    synopsis:
      "One leading lady, countless moods, and a co-star who is completely smitten. A love letter in four chapters to the girl who makes every ordinary day worth filming.",
  },

  film: {
    id: "film",
    type: "video",
    title: "Arushi: The Birthday Special",
    src: "media/video/birthday-special.mp4",
    cover: "media/covers/film.jpg", bakedTitle: true,
    runtime: "2m 16s",
    year: "2026",
    cast: "Arushi, Jatin",
    genres: "Romance, Comedy, Feel-good",
    moods: "Heartwarming, Funny, Made with love",
  },

  // Rows and cards are generated from work/catalog.py into catalog.js
  rows: window.CATALOG_ROWS,
};
