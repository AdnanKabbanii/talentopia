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
