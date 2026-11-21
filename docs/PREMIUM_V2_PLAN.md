# Talentopia V2: Premium Cinematic City Upgrade, Audit & Plan

Branch: `feature/premium-city-v2` (from `387b010`, identical to `main` and `backup-2026-11-21-pre-premium` at the start).
Rules: no edits to `backup-2026-11-21-pre-premium`, nothing merged or pushed to `main`, **Vercel preview deployments only** until a production release is approved.

## 1. Audit of the current build

| Area | Where | What works | What holds it back |
|---|---|---|---|
| City layout | `world/city.js`, `world/districts.js` | 10 connected districts, street grid, plaza, monorail, signals, navigation graph | Architecture is procedural boxes from `kit.js` (`mass`, `glassTower`, `classical`): repetitive rectangular towers, similar heights, flat silhouettes |
| Materials | `world/kit.js`, `world/textures.js` | PBR + Poly Haven textures, canvas facade textures | Facades are painted textures on boxes; little real geometry depth; palette is the V1 palette |
| Rendering | `world/main.js` | HDR sky, ACES, shadows, GTAO (desktop) | Using `EffectComposer` drops MSAA (jagged edges on desktop); no bloom for accents; no camera presentation (no flyover) |
| Interiors + tasks | `world/interiors.js`, `world/activities.js`, `world/ui.js` | 10 enterable buildings, 41 stations, 20 activities, Passport | Most activities are 2D panels over the world; little physical/animated response in 3D (exceptions: bridge beam, ad screen) |
| Characters | `world/characters.js`, `assets/people/*.glb` | MPFB (CC0) bodies + Quaternius UAL (CC0) clips retargeted; distance-driven phase (no foot slide) | 8 fixed models, 4 avatar presets; no morph targets, no face rig, no blink/visemes; walk 1.45 m/s and run 4.5 m/s feel slow; one generic Talk clip |
| NPC behaviour | `world/main.js` | Pedestrians on sidewalk loops, professionals face the player | Professionals stand still; dialogue is static text; no voice, no lip sync, no camera framing |
| Performance | `world/main.js` | Phone caps, dynamic resolution, `?debug=1` report | No presets the user can choose; ~650–770k triangles per frame (characters are the heaviest items) |

## 2. Approach

- **Keep** the Three.js architecture, city geography, districts, navigation, missions and Passport. The redesign layers on top of the working foundation.
- **Blender**: drive Blender 5.3 headless with Python scripts (`blender/*.py`), already proven in this repo (characters, MedCity hospital, retargeting). An MCP bridge (e.g. *blender-mcp*) would need a Blender add-on plus a local server; scripts give the same control and are reproducible, so they are the default. Blender sources go to `blender/` (scripts) and generated `.blend` files to `asset-src/` (not shipped). Only optimised `.glb` files go to `assets/`.
- **Licensing**: CC0 only unless a licence is explicitly compatible (Poly Haven, MakeHuman/MPFB, Quaternius).

## 3. Milestones

### A. Premium city environment (this milestone)
1. Blender-authored landmarks with real facade geometry (mullions, fins, glass planes, stone, metal, timber):
   - Talentopia Tower (Central Plaza landmark)
   - Capital Bay Bank Headquarters tower
   - Pulse Advertising Agency upper volumes (cantilevered, timber louvres)
   - Talentopia University main building (Civic Square)
   - MedCity hospital exterior upgrade (brise-soleil, glass canopy, signage)
2. Skyline variety: a kit of Blender tower variants (tapered, stepped, twisted, rounded) replacing repetitive procedural towers.
3. Art direction: V2 palette, materials led by stone, glass and metal; violet and cyan only for brand and interactive accents.
4. Rendering: MSAA restored in the post chain, subtle bloom on accents only, atmosphere.
5. Presentation: opening flyover across districts that hands over to the avatar.
6. Life: autonomous shuttle pods and holographic displays.

### B. Avatar studio + character animation + movement
- Movement retuned to walk ~1.8, jog ~3.2 (default), sprint ~6.0 m/s, NPCs 1.4–2.0 m/s, with clip-synced phase (no sliding), auto-run, and smoother camera.
- Avatar studio: large 3D preview, 360° rotation and zoom, studio lighting.
  - Body: MPFB-built base with morph targets exported from Blender (body proportions and face shape).
  - Modular parts: hair, outfits and shoes as separate meshes, with material variants for skin, eyes and hair colour.
  - Choices are saved locally.
- Expressions: blink and basic expressions via morph targets.
- Photo-to-avatar: designed as an opt-in integration point. It needs an external image-to-3D or face-fitting service plus a backend; it is not faked.

### C. NPC conversations + facial animation + physical interactions
- Scripted, branching dialogue with gestures (point, wave, explain), camera framing and reactions.
- Optional speech via the browser speech API, with mouth shapes driven by speech timing.
- AI dialogue through a real backend endpoint, once an API key/backend is approved.

### D. Richer missions
- Physical task staging: hologram anatomy figure, banking desk with documents on screen and a reacting customer, campaign board with results screen, kitchen ingredient pick-up. The existing scoring logic is kept.

### E. Performance, QA, preview
- Performance presets (High / Balanced / Light).
- Testing: rigging, sliding and clipping checks, mobile report, Vercel preview link.

## 4. Known constraints (stated up front)
- Facial rigging and lip sync require blend shapes on the head mesh. MPFB's game-engine rig has no face bones, so expressions and visemes must be authored as shape keys in Blender (Milestone B/C work).
- AI dialogue and photo-to-avatar both need a backend and API credentials the project does not have yet. Integration points will be built and clearly labelled.
- No real phone test so far; the `?debug=1` device report exists for that.

## Milestone B, delivered (feature/premium-city-v2)
- **Movement**: walk 1.8, jog 3.2 (default), sprint 6.0 m/s.
  - Ctrl/Alt or V switches to walking; Shift sprints; R toggles auto-run.
  - On touch, joystick depth sets walk or jog, and the RUN button sprints.
  - NPCs walk at 1.4–2.0 m/s.
- **How the gaits work**: four phase-synced gaits (Stroll, WalkG, JogG, RunG) are derived from the CC0 clips by rescaling limb swing and cycle time (`world/characters.js`).
  - Each gait's ground speed and foot-contact phase are measured on the character's own skeleton at load.
  - Leg phase advances with distance travelled, so feet don't slide.
  - Planted-foot slip measured in the browser: walk −0.4 %, jog 2.9 %, sprint −4.5 % of body speed.
- **Avatar base** (`blender/avatar_build.py`): an MPFB body with 23 morph targets: 5 body, 10 face, 8 expressions (blink L/R, smile, jaw open, 2 visemes, brows up/down).
  - Parts: 10 hairstyles, 8 outfits, 3 footwear, a hat, 2 eyebrow styles and 2 procedural beards.
  - Every part is refitted to each body morph. Skin under clothing is hidden per outfit via a per-vertex bitmask.
- **Avatar Studio** (`world/avatar.js`): a lit turntable with 360° drag, zoom and Full/Upper/Face framing.
  - Controls: presentation (feminine ↔ masculine), build, muscle, height, face structure, skin (8 bases + fine tone), eye colour, hairstyle and colour, eyebrows, facial hair, outfit and outfit colour, footwear, eyewear (procedural, attached to the head bone) and hat.
  - Expression preview (smile, talk, surprised); idle blinking.
  - Choices are saved in `localStorage` (`avatarV2`), and the same model becomes the player.
- **Photo-assisted creator**: an opt-in consent screen and the integration point `AVATAR_PHOTO_ENDPOINT` (null; no service connected). No photo is uploaded or stored.
- **Known limits**:
  - Finger motion is not retargeted (hands hold a relaxed rest pose).
  - No lab coat, scrubs or chef uniform assets.
  - Afro and some hair cards show a visible hairline edge.
  - The NPCs still use the older fixed models.
  - The avatar download is about 7.5 MB (base 5.8 MB).
