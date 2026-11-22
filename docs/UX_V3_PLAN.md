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

## Stage 4: mobile-first interface (done)
- **Navigation bar**: a floating glass bar with **Explore · World View · Passport · Avatar**. Settings, sound and **NOVA** are small top-right buttons, and a **camera-reset** button sits beneath them.
- **One glass language**: dialogs, conversation subtitles, the completion card, toasts, chips and the location label all share the liquid-glass style.
  - On phones, dialogs and conversations become full-width bottom sheets.
  - Every Passport, NOVA, learning and events panel is a swipe-to-dismiss bottom sheet on phones and a side card on desktop.
- **Touch controls**: a translucent joystick and buttons sit above the nav bar and fade slightly when idle (never disappearing).
- **Prompts**: building prompts are two-line glass cards, for example "Talentopia Central Bank / Enter", with a Tap or E key.
- **Guided route**: shown as a single pill with the current step.
- **Landscape phones**: the nav becomes a vertical rail on the right, sheets dock to the right, and the onboarding and studio adapt.
- **Settings**: a **camera sensitivity** slider, plus the existing reduce motion, larger text, high contrast and voices. Esc closes any panel.
- **Routing fixes**: walking to a spot inside a building now always goes through its entrance (it used to try straight through walls when under 18 m). The plaza is walked straight across, around the fountain, and is entered from the south ramp.

## Stage 5: Avatar Studio and Career Passport (done)
- **Career Passport** (`world/panels.js`):
  - **Header**: the avatar portrait (rendered from your own 3D avatar each time you enter or change it), an editable display name ("Guest Explorer" by default), XP, a level with a title and progress bar, careers explored, missions and badges.
  - **My Journey**: a timeline in district colours. Tap an entry for the badge, the skills practised, the result and "Go back".
  - **My Skills**: nine skills, each shown as evidence (which experiences practised it) with no invented levels.
  - **Achievements**: medallion badges with district, date, activity and XP.
  - **My Careers**: all ten districts marked as explored, visited or not explored yet, with careers saved in World View (♡ Save this career) and a Go button.
  - **My Learning**: Master Your Future (Journey B). Pick an academic field and see that field's practice simulations and your progress. Course upload is an honest "coming soon".
- **Avatar Studio**:
  - Tabs follow the requested order: Face, Hair, Skin & eyes, Body, Outfit, Accessories.
  - Hairstyles and outfits are **picture thumbnails rendered from the real 3D parts** (`assets/ui/studio/`), and skin tones are large swatches.
  - **Back**, **Save** and **Back to the city** (or **Enter Talent City**) buttons.
  - The studio opens from the nav bar, City Hall or the Passport.
  - Eye height is now measured in the bind pose, so framing and portraits are right for every body shape.

## Stage 6: Talentopia City Hall (done)
`world/cityhall.js`: the glass ground floor of Talentopia Tower at Central Plaza becomes an enterable building.
- **Entrance**: a ramp from the plaza, automatic doors, and "TALENTOPIA CITY HALL" signs inside and out using the logo placeholder.
- **Lobby**: frosted glass lining, a ceiling with a light cove, a gold floor inlay and planters.
- **Interactive objects**:
  - A **live miniature city model**, built from the real building footprints, that opens World View.
  - **NOVA**, a floating holographic guide orb.
  - A **Career Passport kiosk**.
  - An **Avatar Studio booth** with an arch and a mirror.
  - A **Start here** board that opens Help Me Explore.
  - A **Master Your Future** wall for university learning.
  - A **Career events** board. It shows an honest "none scheduled yet" list, ready for open days, fairs, workshops, ambassador sessions and consultations.

## Stage 7: guided exploration (done)
- **NOVA** is a scripted guide, opened from the top-bar button, the N key or City Hall. It never interrupts on its own, except to offer help once in demo mode.
  - **Help me explore** asks "What are you curious about?". Picking medicine, business, technology, design, engineering or food opens World View on that district and sets a guidance beacon and pill towards its main workplace. The guidance clears when you arrive.
  - **I'm not sure yet** starts a three-stop **Career Discovery Trail**: hospital triage, then currency exchange at the bank, then the agency campaign budget. Each stop advances when you finish its activity, and the trail resumes on your next visit.
  - It also answers "How do I move around?" (touch or keyboard version), "What is the Career Passport?", and offers "Show me the whole city".
- Free exploration stays possible at any time.

## Stage 8: presentation, performance and recovery (done)
- **Demo mode**: `talentopia.vercel.app/demo` (Vercel rewrite) or `?demo=1`.
  - No returning-visitor screen, and no avatar step (a random ready-made avatar is assigned).
  - After the entry title NOVA offers **Try a career in one minute**, which fades straight to Grace's triage desk.
  - Measured in the preview pane: **7.2 s from Enter to the first career activity**.
  - After completing it, NOVA asks what to try next.
- **Presenter QR page**: `/qr`. A large QR code points to the stable production path `https://talentopia.vercel.app/demo?utm_source=qr&utm_medium=presentation&utm_campaign=classroom`.
  - Use `?campaign=` for a different event, or `?target=` for rehearsals on a preview.
  - The QR destination only works after the redesign is released to production; until then `/demo` serves the current live site.
- **Analytics integration point**: `track()` sends aggregated events (visit, enter_world, enter, complete, demo_first, plus campaign tags and the demo flag) only if an approved `window.TALENTOPIA_ANALYTICS` is provided. It sends no names, avatars or location history, and is not connected yet.
- **Slow networks**:
  - After 20 s, "Slow connection: still loading the city…" appears with **Enter now** (enter as soon as the avatar is ready while the city keeps streaming).
  - After 60 s, a **Retry** option appears.
  - The render loop survives a bad frame instead of freezing.
- **Phone diet**: the Light preset (Auto on phones) uses 2 pedestrian models instead of 8 (about 5 MB instead of 19 MB), fewer walkers, and the same two models for seated extras.
- **Heart Lab**: if you arrive before its 3D model has streamed in, it opens automatically when the model arrives. Esc cancels this.

## Not done / limits
- **Devices and networks**: no real iPhone or Android test yet, and no real network-throttling run. The browser tools here can't throttle; entry needs about 13 MB minus the hospital, plus about 6 MB for the avatar.
- **Avatar quality**: avatar hair edges and beards are unchanged.
- **Logo**: the official logo is still a placeholder (replace `assets/brand/logo.svg`).
- **Not built**: there is no AI NOVA (scripted only) and no analytics backend.
- **Districts**: individual district interiors were not redesigned in this phase, as planned.

## Avatar upgrade (toward the reference look)
- **Talentopia uniform** (`talentopia_f` tailored cut, `talentopia_m` classic cut): the tailored suits re-dressed in graphite navy.
  - Glowing violet piping runs along every seam, lapel, cuff and hem. It is generated in the browser from each garment's UV-island borders and used as an emissive map, so bloom makes it glow.
  - A gold-rimmed pin sits on the left lapel, showing the replaceable logo placeholder.
  - Nothing extra is downloaded. New guests start in the uniform.
- **Makeup** (None / Natural / Bold): lip tint and eyeshadow painted into the skin texture. The lips and eyelids are found from the face's own morph targets (the vertices that "fuller lips" and "blink" move), so the makeup lands exactly on them.
- **Skin**: a physical material with a soft sheen and a gentle warm cast.
- **Hair**: alpha-to-coverage gives soft strand edges instead of hard cut-out lines.
- **Lashes**: darker and fuller.
- **Avatar Studio**: a dusk-violet look, with a skyline backdrop of out-of-focus city lights, a dark glossy floor, warm key light, and violet plus cyan rim lights. Passport portraits use the same look.
- **Ready-made avatars**: **Layla** (long dark hair, full brows, natural makeup, tailored uniform) leads the line-up, and Kai wears the classic-cut uniform. All portraits and thumbnails were re-rendered from the live 3D models.
- **Limits**: still a real-time MakeHuman body, not a photoreal render; the female uniform keeps the base suit's skirt; the hair cards come from the same CC0 set.
