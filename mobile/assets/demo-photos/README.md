# Demo photography

These are licensed photographic illustrations of fictional demo identities and requests. The pictured people are not members, recipients, or endorsers. No identifiable stock-photo faces are used as requesters: the profile images show people from behind, with no recognizable faces. These are a privacy-preserving substitute for consented local selfies, which are not available yet.

All 16 photographs were downloaded from Pexels on 2026-11-06 under the [Pexels License](https://www.pexels.com/license/). The license permits app use and modification; it does not imply endorsement or grant unrestricted personality rights. `sources.json` records the original photo page (including photographer credit), download URL, license, retrieval date, and SHA-256 for every file. Source images were downloaded at 1000px wide using Pexels compression; no generative edits, filters, synthetic degradation, or compositing were applied. The app retains its existing cover crops.

Request photos depict an iced matcha by a laptop, shared delivery pizza, headphones in everyday use, takeaway noodles, a used sketchbook, a flower market, a flat white by a laptop, and an open chemistry textbook. Images illustrate the existing requests; they are not evidence of ownership, a price, or a real request for money.

`src/data/demoPhotos.ts` supplies bundled copies for mocks and exactly the eight fixed seeded demo post IDs. This also replaces old seeded photos without requiring a database reset. Other Supabase posts and uploaded photos are unaffected. The seed uses the corresponding licensed remote URLs; rerunning it refreshes photo paths without changing gift history or progress.

For future identifiable portrait replacements, obtain the subject's permission specifically for use as a fictional profile in a gifting demo. Keep that consent record privately; do not commit personal consent documents into this repository.
