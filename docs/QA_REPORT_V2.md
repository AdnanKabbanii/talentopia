# Talentopia V2: QA report (Milestone E)

Branch `feature/premium-city-v2`. The automated suite is `qa/qa.js`. It runs inside the page after you enter the city (`const { runQA } = await import('/qa/qa.js'); await runQA(window.__talentopia)`) and is not deployed.

Environment: Chrome in the Claude desktop preview pane on macOS. This pane renders slowly and caps at about 33 fps, so its frame rates are only useful for **comparing presets**, not as absolute device performance. **No real phone has been tested yet.** The `?debug=1` device report exists for that.

## Result: 15 / 15 checks pass, 0 console errors

| Group | Check | Result |
|---|---|---|
| Locomotion | Walk speed | 1.80 m/s (target 1.8) |
| Locomotion | Walk planted-foot slip | 1.1 % of body speed |
| Locomotion | Jog speed | 3.20 m/s (target 3.2) |
| Locomotion | Jog planted-foot slip | −3.9 % |
| Locomotion | Sprint speed | 6.00 m/s (target 6.0) |
| Locomotion | Sprint planted-foot slip | −2.4 % |
| Rigs | Named staff on the V2 avatar | 23 / 23 |
| Rigs | NaN bones | 0 |
| Rigs | Standing staff feet on the floor | all within −6 / +12 cm |
| Rigs | Seated staff at seat height | 5 / 5 |
| Clipping | Skin hidden under each outfit | all staff |
| Conversations | Every staff conversation opens, answers a question and closes | 23 / 23 |
| Workstations | Every station opens, closes with Esc, returns to walking, and its staged scene cleans up | 41 / 41 (5 staged) |
| Presets | Light is cheaper than High | yes, see below |
| Console | No errors during the run | clean |

Locally, the AI endpoint `/api/npc` returns 404 because the plain local server has no serverless runtime. That is expected: the game then hides the AI choice. The check ignores it.

**How slip is measured**: the player is stepped at a fixed 60 Hz along a straight street. Whenever a foot's lowest point is within 1.5 cm of the ground, its forward drift is recorded. The figure is the median drift as a share of body speed (0 % means the planted foot is perfectly still). The pass mark is under 8 %. Run-to-run variation is about ±2 %.

## Presets: render cost at fixed views (same session)

| Preset | View | Draw calls* | Triangles* | Pixel ratio | Post effects | Pane fps |
|---|---|---|---|---|---|---|
| High | Plaza | 867 | 1.72 M | 1.85 | AO + bloom | 6 |
| High | Hospital | 740 | 1.77 M | 1.70 | AO + bloom | 12 |
| Balanced | Plaza | 796 | 1.61 M | 1.50 | bloom | 33 |
| Balanced | Hospital | 701 | 1.68 M | 1.50 | bloom | 32 |
| Light | Plaza | 676 | 1.46 M | 1.00 | none | 33 |
| Light | Hospital | 639 | 1.47 M | 1.00 | none | 34 |

\* Counts include the sun shadow pass. They come from rendering the scene directly, because with post-processing on, the renderer's own counter only sees the final screen pass.

Reading the table:
- In this pane, ambient occlusion plus 4K shadows (High) is the expensive part. Balanced and Light both reach the pane's cap.
- **Auto** chooses High on desktop and Light on phones. It still drops post effects and lowers resolution automatically if the frame rate stays low.
- Light mainly saves fill rate (pixel ratio 1.0, no post effects, 1K shadows) and draws people and cars closer. City geometry is the same in every preset.

## Bugs found by QA and fixed
1. **Esc did nothing inside any task with a number box** (currency exchange, dose, zoning, cash-up, fuel plan, the kitchen rush). The key handler ignored keys while a text field had focus, and the field also swallowed the key. Esc now closes the panel from anywhere, including the free-question box.
2. **Sprint foot sliding (−12 %)**: a calibration factor carried over from Milestone B played the sprint cycle about 9 % too fast. It was re-tuned with the 60 Hz test, and sprint slip is now −2.4 %.
3. **Large-text mode** made the top-bar chips overlap. The top bar now keeps its normal size.
4. **Counter conversations**: across a counter, the player's head blocked the speaker. The shoulder offset now grows with distance.

## Test artifacts (not product bugs) fixed in the suite
- Seated-height and feet checks now let each pose settle before measuring.
- The Heart Lab opens after a 1.5 s reach animation, so the station test now waits for it.
- Slip is measured at 60 Hz along the walking direction. At 30 Hz, heel-lift frames were being counted as sliding.

## Not covered by automation
- **Visual quality**: hair edges, beard dots and similar details were checked by eye in screenshots for each milestone.
- **Real phones and tablets**: performance and touch input on actual devices.
- **AI dialogue**: needs `ANTHROPIC_API_KEY` set on Vercel.
- **Voices**: speech quality varies with the device's installed voices.
