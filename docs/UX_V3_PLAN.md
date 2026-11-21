# Talentopia V3: mobile-first UX redesign

## Stage 1: audit and preservation (done)
- **Live production version**: commit `0734b1b` (Vercel deployment `dpl_Dfg9PSXS3mzoRMVCAdTRoUBFg7xr`, talentopia.vercel.app). `main` points at the same commit.
- **Checkpoint**: tag `checkpoint-2026-11-22-v2-live` and branch `backup-2026-11-22-v2-live`, both at `0734b1b`. The older `backup-2026-11-21-pre-premium` is untouched.
- **Development branch**: `feature/ux-redesign-v3`. Work ships to Vercel previews only. No change to production or `main` until approved.
- **Audit findings that shaped stages 2–3**:
  1. Entry was blocked until about 13 MB loaded (sky, landmarks and the 4 MB hospital model), and the heart model was also downloaded up front.
  2. The welcome card was text-heavy and named the course code.
  3. The map was a flat 2D drawing.
  4. The HUD was a row of chips along the top, plus a minimap and a large objectives card that covered the phone screen.
  5. There was no guided first-time path or returning-visitor screen.

## Stage 2: onboarding and first-time experience (done)
- **Instant preview**: a still render of the real city (`assets/ui/city_poster.jpg`, 336 KB) shows immediately and cross-fades into the live 3D flyover once it is ready (with a 9 s safety fallback). Portrait phones get a wider flyover framing.
- **Real progress**: the primary button fills as assets actually load (load stages plus the loader's item count), reading "Preparing your world…", then "Your future is almost ready.", then "Enter Talent City".
- **Progressive entry**: entry now needs only the sky, the landmarks and your avatar. The hospital starts loading right after, and its staff appear when it arrives. The Heart Lab model loads later, or on demand.
- **Liquid-glass welcome panel** (`ui/v3.css`):
  - Copy: TALENTOPIA · "Your Future Is Waiting." · one supporting line.
  - Buttons: **Enter Talent City**, plus **Explore MedCity** and **Create Your Avatar**.
  - Footer: "No download needed. Explore as a guest."
  - No course code. The logo is a clearly marked placeholder: `assets/brand/logo.svg`.
- **Avatar choice**: Enter goes to **Choose your avatar**, with six ready-made avatars (`READY` in `world/avatar.js`).
  - Their cards are renders of the actual 3D models. Picking one updates the live 3D preview.
  - There is also **Customize my avatar** (the full studio), **Create my Digital Twin** (an honest coming-soon screen, with consent and a manual option always available), and **Skip for now**.
- **Cinematic entry**: the panel fades and the camera arcs down from the aerial view to the plaza and behind your avatar (3.4 s; 1.6 s for returning visitors or with reduced motion).
  - It runs on real time, so slow devices don't stretch it, and a tap skips it.
  - "Welcome to Talentopia" appears, then a one-time hint fitted to touch or keyboard.
- **Returning visitors**: "Welcome back." with **Continue Exploring**, **Open World View** and **Edit Avatar**, plus "Start fresh as a new guest" (asks for confirmation first).

## Stage 3: World View (done)
`world/worldview.js` is an aerial mode on the **real 3D city**, not a separate map.
- **Opening**: the camera rises from your avatar until all ten districts are visible. On portrait phones the view turns 90° so the long city fills the screen.
- **Labels**: district labels (icon, name, field) are projected from 3D. Workplace name tags appear as you zoom in, and a "You" marker shows where your avatar is.
- **Levels**: whole city → district (outlined, with a sheet listing its workplaces and professions) → building (professions, hands-on experiences, **Walk there** or **Fast travel**) → back to your avatar.
- **Gestures**:
  - **Touch**: one-finger pan, pinch zoom, tap to select, double-tap to focus.
  - **Mouse**: drag to pan, the wheel to zoom, Shift-drag or right-drag to rotate.
  - **Buttons**: +, −, Fit city, a breadcrumb trail, and **Return to my avatar**, which keeps your position.
- **Search**: careers and keywords ("doctor", "banking", "chef", "engineer") lead to the right workplace. Picking a result flies the camera there.
- **Comfort**: the camera moves on real time, the bottom or side sheet never covers the focused building, and fog and shadows follow the aerial view.

## Stage 4 (started): mobile UI
- **Navigation bar**: a floating glass bar with **Explore · World View · Passport · Avatar**. Settings and sound stay as small top-right buttons, and the old top chips are hidden.
- **Touch controls**: a translucent joystick, with the controls raised above the nav bar.
- **Objectives and prompts**: on phones the objectives card is a compact pill at the top, and building prompts are two-line glass cards ("Talentopia Central Bank / Enter") with a Tap or E key.
- **Safe areas**: safe-area insets (`viewport-fit=cover`) are respected throughout.

## Remaining stages
4. **Mobile UI**: bottom sheets for mission and career info, a camera-reset button, landscape tuning, and camera-sensitivity settings.
5. **Avatar Studio and Career Passport**: visual thumbnails for hair and outfits, and a full Passport redesign (journey, skills, badges, careers, learning).
6. **City Hall**: the central welcome building with a lobby city model that opens World View, using the logo placeholder.
7. **Guided exploration**: Help Me Explore, the NOVA guide, and a Career Discovery Trail.
8. **Testing and optimisation**: demo mode (`?demo=1`, with campaign parameters), network throttling, real devices, a mobile asset diet (pedestrian models are about 19 MB), and analytics only if approved.
