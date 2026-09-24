# design.md — Lotto Formula Lab

Locked design system. Every screen uses these tokens; pages share one system (no per-page rotation).

## Provenance
Studied DNA from Hallmark example `usehallmark.com/examples/custom-04` (public Hallmark reference the user chose for this app). Structure and palette logic only, no copy or imagery.

## Brief
- **Audience:** a small group of friends on phones, Thai-language UI.
- **Use:** roll a number set from a formula → pick one set per draw → check the leaderboard / history / tickets.
- **Tone:** broadsheet + risograph print. Honest, a little loud, never glossy.

## Palette (OKLCH, see `styles/tokens.css`)
| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-paper` | cream `oklch(95% 0.02 85)` | `oklch(19% 0.012 60)` | page |
| `--color-paper-2` | `oklch(91% 0.025 85)` | `oklch(24% 0.014 60)` | cards, inputs |
| `--color-ink` | `oklch(20% 0.012 60)` | `oklch(93% 0.02 85)` | text, rules |
| `--color-ink-2` | `oklch(42% 0.015 60)` | `oklch(72% 0.02 85)` | secondary text |
| `--color-accent` | riso red `oklch(50% 0.19 30)` | `oklch(66% 0.19 30)` | one action per view, hits |
| `--color-riso` | teal `oklch(62% 0.1 195)` | `oklch(58% 0.09 195)` | misregistration offset only |

Accent discipline: red marks the primary action, the active tab and hits. Nothing else.

## Type
- **Display / numbers:** Big Shoulders (condensed, roman) → Thai falls back to **Kanit**.
- **Body:** Fraunces → Thai falls back to **Noto Serif Thai**.
- **Labels / meta:** Spline Sans Mono → Thai falls back to **Anuphan**.
- No italics anywhere. Numbers use tabular figures.
- Riso misregistration (teal offset shadow) on decorative headings only — **never on numbers people read or verify**.

## Layout
- Mobile first, single column, max width 34rem; 16px side gutter; no horizontal page scroll.
- Hairline ink rules divide sections (broadsheet), cards are flat paper-2 with a 1.5px ink border, no drop shadows except the floating nav.
- Bottom padding on content = nav height + safe-area, so the nav never covers content.

## Navigation — N5 floating pill, bottom
Five tabs: สุ่ม · ตรวจหวย · ประวัติ · อันดับ · โปรไฟล์ (initials avatar). Pill detached from edges, ink background, 44px+ targets, active tab = paper chip behind the icon, `aria-current="page"`, respects `env(safe-area-inset-bottom)`.

## Motion
Cut by default. Only: button press (`transform: translateY(1px)`), 120ms colour change on state. `prefers-reduced-motion` removes transforms.

## Voice
Short Thai verbs on buttons (สุ่ม, เลือกชุดนี้, ตรวจ, ดูเพิ่ม). Errors say what happened and what to do.
