# TALENTOPIA • Talent City (interactive web prototype)

An original browser-based 3D city experience, intended as the first working proof of concept for a virtual career-learning platform.

## What's included

- Interactive 3D city with ten themed career-district buildings, orbit/pan-by-drag, zoom and clickable buildings.
- An accessible 2D clickable district-map fallback when WebGL or the graphics library is unavailable.
- 10 first-shift career decisions, explanatory feedback and local progress tracking.
- Medical anatomy study interactions, a working finance loan repayment slider, and a working marketing budget allocator.
- Career Passport, discovery badges and XP (stored locally on the browser device).
- Desktop and mobile responsive interface, including a guest welcome flow.

## What's new in V5: Code Nexus HQ

Open Code Nexus in the city → **"Enter Code Nexus HQ"** (or add `?enter=nexus` to the URL). It's an engineering shift:

1. **Check in with Priya**, the engineering lead, and pick what interests you (software, security or AI).
2. **Dev Lab with Leo:** the student dashboard shows `NaN`. Run the tests to reproduce the bug, tap the buggy line (`i <= scores.length`), choose a fix, and run the tests again. Then add a guard for the empty-list edge case until all 3 tests pass. **The tests genuinely execute the student's version of the code** in the browser, so wrong fixes really fail.
3. **Security Ops with Amira:** a fictional phishing email reported by 37 students. Tap the 4 red flags (lookalike sender, urgency, mismatched link, password request), then choose how to respond.
4. **Debrief with Priya:** what comes first when building an AI that uses student data (consent, data minimisation, security, bias testing).
5. **Badge:** *Code Nexus Problem Solver* (+150 XP, plus +60 for each mission).

**Files to upload when hosting:** `index.html`, `interior.js`, `medcity.js`, `capitalbay.js`, `codenexus.js`.

## What's new in V4: Capital Bay Bank + shared interior engine

**Capital Bay Bank** (open Capital Bay in the city → "Enter Capital Bay Bank", or add `?enter=capital` to the URL) is a trainee banking-analyst shift:

1. **Check in with Omar**, the branch manager.
2. **Teller station:** serve Mr. Karim. Verify his identity (know-your-customer rules), then work out 5% compound interest on $2,000 over 2 years.
3. **Loan Office:** Layla wants at least $20,000 for her café. Use the loan sliders (amount, term, 8% APR) to find a loan she can afford. The panel shows live monthly payment, total interest and DSCR (cash flow ÷ debt payments, target 1.25 or more). The default 24-month plan *fails* (DSCR 1.24), so the student must adjust it.
4. **Back to Omar:** present the recommendation and stress-test it against a 20% winter revenue drop.
5. **Badge:** *Capital Bay Credit Analyst* (+150 XP, plus +40/+60 for steps and a +10 bonus fact at the vault).

**Shared engine (`interior.js`).** Walking, collisions, doorway routing, avatar editor, dialogue and quizzes, objectives, NOVA, focus panels and badges now live in one file. Each district is a config file (`medcity.js`, `capitalbay.js`) that builds its rooms and missions. The avatar now follows you into every building and gained a **Navy suit** outfit. The Passport lists every shift badge.

To add a district: copy `capitalbay.js`, change `id` to the district id from `index.html`, build its rooms with `shell()` + props, and write the missions. Add its `<script>` tag after `interior.js`.


## What's new in V3: MedCity Hospital (walkable 3D shift)

Open MedCity in the city and press **"Enter MedCity Hospital"** (or go straight in with `?enter=med` on the URL).

- **Avatar editor:** name, skin tone, hair style and colour, and outfit (scrubs or white coat). It's a stylized character, never generated from a photo, and it's saved on the device.
- **Walkable hospital:** a lobby, corridor, Anatomy Studio and Patient Ward with walls and furniture you can't walk through. Move with WASD or the arrow keys, click or tap the floor (the avatar finds its way through doorways), or use the on-screen joystick on phones. Walls between the camera and your avatar fade out.
- **Characters:** Maya at reception, Dr. Haddad (supervising physician) and Sam, a fictional patient. **NOVA**, your learning guide, floats beside you and gives hints, and a glowing marker shows where to go next.
- **3D Anatomy Studio:** a layered body model (skin, skeleton, organs, blood vessels, nerves) you can rotate and zoom. Tap any of 20 structures for a learning note. After exploring 4, NOVA gives a 3-question "find the structure" quiz (+60 XP).
- **Patient case:** a 4-step supervised scenario with Sam (vital signs, safe escalation, linking to anatomy, choosing an ECG) with explanations for every answer.
- **Badge:** finish the shift to earn the *MedCity Anatomy Explorer* badge (+150 XP). It appears in the Career Passport with your first-try score.
- Code lives in `medcity.js`, a separate module that `index.html` loads, which is the pattern to reuse for the other districts.

(As of V4, MedCity runs on the shared engine in `interior.js`.)

## What's new in V2 (presentation-ready)

- **Fixed:** the 3D city crashed on load in V1 (a bug in the building-window code), so only the menus showed. It now renders.
- **Brand palette:** Future Violet, Deep Midnight, Electric Cyan, Dream Lilac, Blush Aurora, Mint Signal, Warm Gold and Cloud White are now CSS tokens in `:root`.
- **60-second QR mission:** open the site with `?qr=1` (for example `https://your-site.netlify.app/?qr=1`). Visitors skip the intro, pick one of six flagship careers, make one decision, and unlock the Discovery Crest (+50 XP, once per device). The welcome screen also has a "60-second mission" button.
- **New hands-on tools:** Taste District recipe scaler and fridge safety check, Forge & Form beam load tester, and Code Nexus bug hunt.
- **Mobile:** the phone camera fits the whole city, buttons no longer wrap, label drawing works on older phone browsers, and rendering is lighter on small screens.
- `index.v1-backup.html` is the untouched original.

## Run it locally

`index.html` is self-contained except for the Three.js graphics library, which is loaded from a CDN. You can open `index.html` in a modern browser while connected to the internet. For a development webserver, run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Host it and make the QR code

1. Go to https://app.netlify.com/drop and drag this whole folder onto the page. You get a live `https://….netlify.app` URL in seconds (free; sign up to keep it permanently). GitHub Pages or Vercel work too.
2. Open `https://<your-url>/?qr=1` on your phone and run the 60-second mission once.
3. Generate a QR code for that exact `?qr=1` URL and put it on your slide.

## Important scope limits

This is a polished concept prototype, not an accredited learning product or commercial metaverse service. The procedural buildings are navigable by camera (not by walking an avatar); professional missions are short interactive scenario previews. No login, photo-to-avatar processing, AI API, authenticated learning data, multi-user chat, or actual blockchain token minting is implemented. The medical interface is a stylized schematic, not a clinical or anatomically precise 3D atlas. The loan simulator is illustrative, not a credit decision.

## Next development steps

1. Separate scene creation, careers, simulation logic, UI and persistence into modules.
2. Reuse the MedCity module pattern (`medcity.js`) for walkable interiors in the other five flagship districts; later swap primitive models for authored 3D assets (glTF).
3. Build six deeper role simulations: anatomy, banking, marketing, design, engineering and culinary arts.
4. Add secure authentication and a real database for user progress.
5. Build a source-grounded educational upload workflow with extraction, citation and teacher verification.
6. Design youth-safety, data privacy, accessible content and meaningful achievement credentials.
7. Add optional multiplayer, verified institutional achievements and partner events.
8. Instrument the cross-channel funnel: QR scan, guest entry, first completed mission, return rate and offline conversion.

**Suggested ownership split:** ChatGPT/Claude Design for product discovery and style directions, Claude Code for application development, PlayCanvas/Three.js for 3D authoring, and a hosting provider to publish a live QR URL.
