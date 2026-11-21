# TALENTOPIA • Talent City (interactive web prototype)

**Live:** https://talentopia.vercel.app · **QR / 60-second mission:** https://talentopia.vercel.app/?qr=1 (QR images: `talentopia-qr.png`, `talentopia-qr.svg`)

Hosting: Vercel project `talentopia` (Adnan's projects), deployed from this GitHub repo. Pushes to `main` are deployed with a manual Vercel deployment.

An original browser-based 3D city experience, intended as the first working proof of concept for a virtual career-learning platform.

## What's included

- Interactive 3D city with ten themed career-district buildings, orbit/pan-by-drag, zoom and clickable buildings.
- An accessible 2D clickable district-map fallback when WebGL or the graphics library is unavailable.
- 10 first-shift career decisions, explanatory feedback and local progress tracking.
- Medical anatomy study interactions, a working finance loan repayment slider, and a working marketing budget allocator.
- Career Passport, discovery badges and XP (stored locally on the browser device).
- Desktop and mobile responsive interface, including a guest welcome flow.

## V10: deeper interiors (`world/interiors.js`, `world/activities.js`)

- Every featured building now has a finished room: plaster linings, skirting, timber dado or slats, a branded feature wall, pendant lights, rugs and plants. The rooms have three hands-on workstations, a careers board (five real jobs with study paths), standing professionals and seated staff, customers or passengers.
- 20 new activities on five reusable engines: rank (triage, IRAC, recipe sequence, code lines), classify (alerts, food safety, merchandising, evidence), calc (dose, currency, zoning, margin, flight fuel), allocate (portfolio, media budget, power mix) and design (ad designer, bridge beam, titration, aircraft loading).
- 3D tie-ins: the ad you design plays on the agency's studio screen, the test beam on the bridge rig visibly bends with your design's deflection, and desk workstations make the avatar sit down.
- The Career Passport shows progress per building (x of 3) with badges; every activity awards XP once.

## V9: one connected Talentopia city (`index.html`, `world/`)

The main experience is now a single continuous 3D city. You spawn at Central Plaza and can walk (or click-to-walk) to every district without leaving the world. The old homepage is kept as `legacy.html`; `medcity.html` now redirects into the hospital inside the city.

- **City layout (`world/city.js`, `world/districts.js`)**: a street grid with roads, lane markings, crosswalks, raised sidewalks, street trees and lamps. A raised Central Plaza with ramps, the Talentopia Tower, a fountain, lawns and a café. An elevated monorail loop with a station. Ten districts, each with several recognisable buildings and signage: MedCity (hospital, pharmacy, dental clinic, medical school, research lab), Capital Bay (classical central bank, finance tower, fintech hub, investment centre), Creative Quarter (agency, media studio with animated screens, fashion house, design school), Forge & Form (engineering studio, construction site with crane, factory, architects), Code Nexus (software HQ, robotics lab, cyber-security, AI data centre), Taste District (restaurant & culinary school, hotel, café row, pastry school), Planet Lab (research institute, biodomes, lake, chemical pilot plant, solar + wind), Civic Square (courthouse, law firm, teaching centre, institute), Market Street (store, shop row, business centre, logistics hub) and Skyport (terminal, control tower, hangars, runway with aircraft, mobility centre, transit hub).
- **Building entry (`world/kit.js` `shell()`, `world/interiors.js`)**: each district's featured building has a real walk-in ground floor in the same world, with sliding doors, furniture, a professional NPC and a mission station. Every named building has a click target; featured ones show "Press E to enter".
- **Avatar locomotion (`world/characters.js`)**: MakeHuman/MPFB characters (CC0) with Quaternius Universal Animation Library clips (CC0), retargeted in Blender by `blender/retarget.py` (A-pose/T-pose reference alignment + world-space rotation transfer). A velocity-driven state machine blends Idle, Walk and Jog. Leg phase is driven by distance travelled, using strides calibrated in the browser, so planted feet don't slide (measured at <1% of body speed when walking). The avatar turns at a human rate and slows into sharp turns. Movement is frame-rate independent. Walk is about 1.45 m/s and run 4.5 m/s.
- **Systems (`world/main.js`)**: spatial-hash collisions, ground heights with ramps and steps, a camera that follows and avoids walls, sidewalk/crosswalk navigation for click-to-walk, pedestrians on sidewalk loops (pausing, giving way), traffic on lane loops (braking for cars and people), automatic doors, a guided route, a minimap, a full map with fast travel, WebAudio ambience and footsteps, and saved position + progress (`localStorage`).
- **Missions (`world/ui.js`)**: the Heart Lab in the hospital, a bank loan-affordability calculator, and two-to-three-step professional challenges in the other eight featured buildings. Each awards XP and a Passport badge.

## What's new in V8: walkable, realistic MedCity (`medcity.html`)

A genuinely interactive vertical slice, built in Blender and running in the browser:

- **Realistic daylight district:** plaza with fountain, lawns, trees, benches and the Talentopia landmark; Health Avenue with lane markings, crossing, curbs, streetlights and a bus stop; office buildings; **MedCity General Hospital** with glass ground floor, stone facade with window bands, entrance canopy and sign, ambulance bay, roof garden and helipad. Real PBR textures and sky lighting (Poly Haven, CC0).
- **Realistic people:** 4 avatar choices plus receptionist, doctor and visitors, made with MPFB/MakeHuman (CC0), fully clothed, with idle and walk animations.
- **Third-person control:** WASD/arrows, Shift to run, drag to look, scroll to zoom, E to interact, M for map/fast travel, touch joystick on phones. Collisions with buildings and furniture; the camera avoids walls.
- **Click the hospital:** it highlights on hover; clicking walks you to the entrance (route goes around the fountain). The **sliding doors open** and you **walk inside**, no portal.
- **Inside:** lobby with reception (Maya greets you; study mode is marked as planned), then the **Anatomy Lab** with a **3D heart from BodyParts3D scan data** (29 structures: chambers, valves, papillary muscles, great vessels, coronary arteries). Rotate/zoom, toggle layers, tap structures for explanations, then a 5-question find-the-structure challenge.
- **Progress:** +150 XP and the *MedCity Heart Anatomy Explorer* badge saved to the Career Passport (survives reloads, shared with the rest of Talentopia).
- Blender source scripts: `blender/medcity_env.py`, `blender/medcity_heart.py`, `blender/make_character.py`, `blender/make_characters.sh`.
- Credits: heart © DBCLS BodyParts3D, CC BY-SA 2.1 JP; textures & sky Poly Haven (CC0); people MakeHuman/MPFB (CC0).

## What's new in V7: cinematic Blender city

- The city view is now a **cinematic fly-through rendered in Blender** (`assets/city/talentopia_city.mp4`, 10 s loop, 1280×720, plus `poster.jpg`): a dusk Talentopia city with the lotus plaza, Talentopia tower and logo, curved elevated ring roads over water, glass towers with lit windows and neon light lines, holographic district signs and moving traffic light-streaks.
- The interactive Three.js city is still there behind the **◎ 3D map** button. Districts open from the list or "Start a mission".
- The Blender source scripts (scene build, tuning, animation, encoding) are in `blender/`, so the city can be re-rendered or extended.
- Realistic people: the engine can load Mixamo characters (`assets/people/*.fbx`). Set `PEOPLE_ENABLED=true` in `interior.js` once the files are added.

## What's new in V6: every district is a real building + a realistic city

- **All 10 districts are walkable 3D workplaces.** Click any building in the city (or pick it in the list): the camera dives in, a themed "Entering…" portal plays, and you start a shift inside.
  | District | Building | Hands-on missions (all genuinely computed) |
  |---|---|---|
  | MedCity | Hospital | Layered 3D anatomy + quiz, vital signs, safe escalation |
  | Capital Bay | Bank | KYC, compound interest, loan affordability (DSCR), stress test |
  | Creative Quarter | Design agency | WCAG colour-contrast poster design, campaign budget model, honest advertising |
  | Forge & Form | Engineering firm | Beam test with a bending 3D beam (M = PL/4), build sequence, safety, ethics |
  | Code Nexus | Tech HQ | Debug with real unit tests, phishing investigation, responsible AI |
  | Taste District | Restaurant "Saffron & Salt" | Recipe scaling + food cost %, temperature safety checks, allergen order |
  | Planet Lab | Research centre | River water testing (scientific method), solar array sizing, process-safety alarm |
  | Civic Square | Courtroom + classroom | Evidence evaluation, burden of proof, class-results data, counselling ethics |
  | Market Street | Store | Customer returns, reorder point, pricing margin vs markup |
  | Skyport | Aviation centre | Full-size aircraft walk-around, fuel planning, crosswind go/delay decision |
- **Realistic city:** dusk sky with sun, soft shadows, lit-window facades, glowing building entrances, streets with lanes, crosswalks and street lamps, moving cars and buses, pedestrians, a waterfront bay and skyline, and a Talentopia tower. Perspective camera; hover a building to see "Enter …".
- Interiors have tiled floors and deeper tones; quiz answers are shuffled so the correct one isn't always first.

**Files to upload when hosting:** `index.html`, `interior.js` and the 10 district files (`medcity.js`, `capitalbay.js`, `codenexus.js`, `creative.js`, `forge.js`, `taste.js`, `planetlab.js`, `civic.js`, `market.js`, `skyport.js`). With the GitHub → Vercel setup, pushing to `main` is enough.

## What's new in V5: Code Nexus HQ

Open Code Nexus in the city → **"Enter Code Nexus HQ"** (or add `?enter=nexus` to the URL). It's an engineering shift:

1. **Check in with Priya**, the engineering lead, and pick what interests you (software, security or AI).
2. **Dev Lab with Leo:** the student dashboard shows `NaN`. Run the tests to reproduce the bug, tap the buggy line (`i <= scores.length`), choose a fix, and run the tests again. Then add a guard for the empty-list edge case until all 3 tests pass. **The tests genuinely execute the student's version of the code** in the browser, so wrong fixes really fail.
3. **Security Ops with Amira:** a fictional phishing email reported by 37 students. Tap the 4 red flags (lookalike sender, urgency, mismatched link, password request), then choose how to respond.
4. **Debrief with Priya:** what comes first when building an AI that uses student data (consent, data minimisation, security, bias testing).
5. **Badge:** *Code Nexus Problem Solver* (+150 XP, plus +60 for each mission).


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
