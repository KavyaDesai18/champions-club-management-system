# Champions Club — Design System Specification

**Version:** 2.0 (Athletic Redesign)  
**Tone & Visual Direction:** Warm and athletic, tournament courts, crisp chalk lines, clay, grass, and ball-optic yellow. Premium but approachable. Software built for athletes on phones and staff on tablets.  
**Branch:** `feature/ui-redesign`

---

## 1. Brand Essence & Creative Direction

Champions Club is not a corporate SaaS utility or a crypto platform; it is a premier physical racquet sports facility (badminton, tennis, squash, padel, and pickleball) combined with courtside dining and pro-shop retail.

### Visual Pillars:
1. **Physical Court Geometry:** Layouts reflect the clean lines, precise boundaries, and structured zones of regulation tournament courts. Chalk line borders (`1px solid`, high-contrast) ground cards instead of blurry floating neon orbs.
2. **Warm Athletic Warmth (Not Cold SaaS Blue):** The primary dark mode is inspired by floodlit night courts (deep charcoal, umber graphite, `#0E1216`), while light mode captures sunlit hardcourts and grass lawns (`#F7F5F0`).
3. **One Heroic Accent:** **Ball-Optic Yellow** (`#CCFF00` / `#DFFF00`), the electric, high-visibility color of tournament tennis and padel balls. It cuts through dark court surfaces with instant clarity and athletic punch.
4. **Natural Surface Semantics:** Supporting accents reflect physical play surfaces: **Tournament Grass** (`#16A34A`), **Roland-Garros Clay** (`#C2410C`), and **DecoTurf Hardcourt** (`#2563EB`).
5. **Role-Tailored Density:** Touch targets are large (`≥ 48px`) on tablets and POS surfaces, while administrative data tables feature dense, scannable rows with tabular figures.

---

## 2. Color Palette & Tokens

### 2.1 The Hero Accent: Ball-Optic Yellow
| Token Name | Light Mode Value | Dark Mode Value | Usage |
|---|---|---|---|
| `--color-accent` | `#8C9B00` (High contrast) | `#CCFF00` (Optic Yellow) | Primary CTA, focus ring, highlight badge |
| `--color-accent-hover` | `#758200` | `#DFFF33` | Hover states |
| `--color-accent-active` | `#5E6900` | `#B8E600` | Pressed / active state |
| `--color-accent-subtle` | `rgba(140, 155, 0, 0.12)` | `rgba(204, 255, 0, 0.12)` | Pill backgrounds, active tab pills |
| `--color-on-accent` | `#FFFFFF` | `#0E1216` (Deep ink) | Text/icons on accent backgrounds |

### 2.2 Neutrals (Court Surfaces & Chalk Lines)
| Token Name | Light Mode (Sunlit Court) | Dark Mode (Night Stadium) | Description |
|---|---|---|---|
| `--bg-app` | `#F7F5F0` | `#0E1216` | Main viewport canvas |
| `--bg-surface` | `#FFFFFF` | `#151B21` | Standard card / table surface |
| `--bg-surface-elevated` | `#EFECE4` | `#1C242C` | Modals, dropdowns, sticky headers |
| `--bg-surface-subtle` | `#E7E3D8` | `#242E38` | Hover rows, secondary buttons |
| `--border-chalk` | `#DDD8CD` | `rgba(244, 241, 235, 0.12)` | Regulation chalk boundary lines |
| `--border-subtle` | `#EBE8DF` | `rgba(244, 241, 235, 0.06)` | Inner dividers and secondary rules |
| `--text-primary` | `#13171B` | `#F6F4EE` | Headings, primary values |
| `--text-secondary` | `#4B545E` | `#A2ADB9` | Body copy, secondary metadata |
| `--text-muted` | `#7B8590` | `#677380` | Placeholders, captions, disabled |

### 2.3 Semantic Status Palette
| Role | Light Hex | Dark Hex | Athletic Surface Analogy |
|---|---|---|---|
| **Success** | `#15803D` | `#22C55E` | Championship Grass Turf |
| **Warning** | `#B45309` | `#F59E0B` | Courtside Amber Spotlight |
| **Danger / Destructive** | `#B91C1C` | `#EF4444` | Red Clay Court / Out of Bounds |
| **Info** | `#1D4ED8` | `#3B82F6` | Hardcourt Blue / Technical Info |

---

## 3. Booking Slot State Palette (Color-Blind Accessible)

To guarantee full WCAG 2.1 AA accessibility for users with deuteranopia, protanopia, or tritanopia, **color is never the sole indicator of slot state**. Each state integrates:
- Distinct luminance contrast
- Explicit border stroke pattern (solid, dashed, dotted, or hatched)
- An accompanying vector icon and explicit text label

```
+--------------------+   +--------------------+   +--------------------+
|  [V] AVAILABLE     |   |  [~] CART HOLD     |   |  [X] BOOKED        |
|  17:00 - 18:00     |   |  Holding: 03:45    |   |  Sania Mirza       |
|  Solid Green       |   |  Dashed Amber      |   |  Solid Clay Red    |
+--------------------+   +--------------------+   +--------------------+
+--------------------+   +--------------------+   +--------------------+
|  [!] BLOCKED       |   |  [*] SOCIAL MIXER  |   |  [-] PAST          |
|  Court Maintenance |   |  Friday Round-Robin|   |  08:00 - 09:00     |
|  Diagonal Hatch    |   |  Dotted Violet     |   |  Muted Dim 40%     |
+--------------------+   +--------------------+   +--------------------+
```

| Slot State | Visual Pattern & Border | Dark Token | Light Token | Icon | Accessibility Guarantee |
|---|---|---|---|---|---|
| **AVAILABLE** | Solid line (`border-solid border-2`) | `bg-emerald-500/15 border-emerald-500 text-emerald-400` | `bg-emerald-50 border-emerald-600 text-emerald-800` | `Check` | Distinct green fill + checkmark + price pill |
| **HELD** | Dashed line (`border-dashed border-2`) | `bg-amber-500/15 border-amber-400 text-amber-300` | `bg-amber-50 border-amber-600 text-amber-900` | `Clock` | Dashed border + countdown timer string |
| **BOOKED** | Solid border (`border-solid border-2`) | `bg-orange-600/15 border-orange-500 text-orange-300` | `bg-orange-50 border-orange-700 text-orange-900` | `Lock` / `User` | Clay red + locked icon + member name |
| **BLOCKED** | Diagonal stripe pattern (`repeating-linear-gradient`) | `bg-slate-800 border-slate-600 text-slate-300` | `bg-slate-200 border-slate-400 text-slate-700` | `ShieldAlert` | Diagonal physical hatch pattern + alert shield |
| **SOCIAL** | Dotted border (`border-dotted border-2`) | `bg-violet-600/15 border-violet-400 text-violet-300` | `bg-violet-50 border-violet-600 text-violet-900` | `Users` | Dotted line + community group glyph |
| **PAST** | Faint solid border (`border-slate-800/40 opacity-40`) | `bg-slate-900/40 border-slate-800 text-slate-600` | `bg-slate-100 border-slate-300 text-slate-400` | `History` | 40% dimmed opacity + past timestamp |

---

## 4. Typography Scale & Font System

### 4.1 Typefaces
1. **Display & Heading:** **`Barlow Condensed`** (`400`, `600`, `700`, `800`, `900`)
   - High-energy, athletic tournament posture.
   - Used for page titles, hero headlines, scoreboard cards, court names, and badge labels.
2. **Body & UI Controls:** **`Plus Jakarta Sans`** (`400`, `500`, `600`, `700`)
   - Crisp, modern geometric sans with wide counters.
   - Maximum legibility on mobile phones and tablet POS screens at arm's length.
3. **Tabular Numerals:** **`font-variant-numeric: tabular-nums`** (`font-mono` / `.tabular-nums`)
   - Mandatory for all prices (`₹350.00`), timestamps (`17:00 - 18:00`), timers, and table cells.
   - Prevents visual jitter when numbers animate or update live via SSE.

### 4.2 Type Scale
| Token | Font Family | Size / Line Height | Tracking | Usage |
|---|---|---|---|---|
| `font-display-2xl` | Barlow Condensed | `56px` / `60px` | `-0.02em` | Public Hero headlines, stadium splash |
| `font-display-xl` | Barlow Condensed | `40px` / `44px` | `-0.01em` | Section headings, primary dashboard values |
| `font-display-lg` | Barlow Condensed | `28px` / `32px` | `0` | Card headers, court titles, modal titles |
| `font-display-md` | Barlow Condensed | `22px` / `26px` | `+0.01em` | Subsection titles, KDS ticket headers |
| `font-body-lg` | Plus Jakarta Sans | `16px` / `24px` | `0` | Lead paragraphs, large button labels |
| `font-body-md` | Plus Jakarta Sans | `14px` / `20px` | `0` | Standard body text, form inputs, table data |
| `font-body-sm` | Plus Jakarta Sans | `12px` / `16px` | `+0.01em` | Table secondary text, helper text, badges |
| `font-caption` | Plus Jakarta Sans | `11px` / `14px` | `+0.02em` | Micro-labels, slot price pills, timestamps |

---

## 5. Spacing, Radius, Elevation & Motion Tokens

### 5.1 Component-Role Radius Scale
*Anti-Slop Mandate: No giant uniform rounded-2xl on everything. Radius is tailored strictly to component purpose.*

| Token | Value | Functional Role | Components |
|---|---|---|---|
| `radius-none` | `0px` | Regulation bounds, full bleed | Top banner strips, flush court dividing rails |
| `radius-xs` | `4px` | Compact identifiers | Keyboard shortcut tags (`Ctrl+K`), table badges |
| `radius-sm` | `6px` | Grid interactive units | Availability slot buttons, date strip chips, dropdown items |
| `radius-md` | `10px` | Standard interactive elements | Action buttons, form inputs, search bars, tabs |
| `radius-lg` | `16px` | Surface cards | Stat cards, court facility cards, KDS ticket cards |
| `radius-xl` | `24px` | Overlay containers | Dialog modals, drawer panels, floating sheet drawers |
| `radius-full`| `9999px` | Organic pills | Status pills, avatar rings, round toggle switches |

### 5.2 Spacing & Touch Target Hierarchy
- **Base Grid:** `4px` and `8px` rhythm.
- **Minimum Touch Target:** `48px × 48px` on mobile/tablet (WCAG 2.5.5 AAA / 2.5.8 AA compliant).
- **High-Density Operational Table:** `py-2.5 px-4` per row (`~40px` row height), allowing 14+ rows per desktop viewport.
- **Tablet POS Grid:** `min-h-[64px]` tiles for touch ordering with `>= 8px` gutter.

### 5.3 Elevation & Shadows (No Neon Glows)
- `--shadow-court-sm`: `0 1px 3px rgba(0, 0, 0, 0.2)`
- `--shadow-court-md`: `0 4px 12px rgba(0, 0, 0, 0.3)`
- `--shadow-court-lg`: `0 12px 28px rgba(0, 0, 0, 0.45)`
- `--shadow-chalk`: `0 0 0 1px var(--border-chalk)` (crisp athletic edge outline)

### 5.4 Motion & Interaction Tokens
- **Micro-interactions (Hover, Press, Tab Switch):** `150ms` | `cubic-bezier(0.16, 1, 0.3, 1)`
- **Drawers & Modals (Enter / Exit):** `250ms` enter, `180ms` exit | spring physics
- **Count-up Dashboard Totals:** `350ms` linear tick
- **Prefers Reduced Motion:** Immediate jump (`0.01ms`), no animated loops.

---

## 6. Implementation Architecture

1. **Google Fonts Setup:** Linked in `index.html` and imported in `index.css`.
2. **Tailwind Extended Theme:** Added to `tailwind.config.js`.
3. **CSS Variables & Utility Classes:** Injected into `src/index.css`.
4. **Living Styleguide Page:** Updated at route `/styleguide` with live theme toggles, slot matrix, typography specimen, and form states.
