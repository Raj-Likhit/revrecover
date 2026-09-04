# RevRecover UI Redesign Specification

## Vision
**"One screen. One story. Maximum impact."**

A single-page experience that immediately communicates:
1. The problem (traditional dunning fails)
2. The solution (smart triage + restraint)
3. The proof (26.6% lift, live demo)
4. The action (trigger scenarios)

## Color Palette (Maintained)
- **Primary**: Amber/Gold (#FBBF24, #F59E0B)
- **Secondary**: Emerald (#10B981, #059669)
- **Tertiary**: Stone/Dark (#151717, #1C1917)
- **Accent**: Cyan (#06B6D4), Purple (#A855F7), Rose (#F43F5E)
- **Background**: Deep charcoal (#151717)

## New Layout Structure

### Single-Page, Scroll-Based Flow

```
┌─────────────────────────────────────┐
│  HEADER (sticky, minimal)           │
│  RevRecover | [GitHub link]         │
├─────────────────────────────────────┤
│                                     │
│  HERO SECTION (above fold)          │
│  Big Statement + Visual             │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  PROBLEM → SOLUTION FLOW            │
│  (animated comparison)              │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  THE 5 SCENARIOS (interactive)      │
│  Click to trigger, see results      │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  KEY METRICS (eye-catching)         │
│  26.6% · 44.4% vs 17.9%            │
│  z=2.59 · ₹226,394                 │
│                                     │
├─────────────────────────────────────┤
│  FOOTER (minimal)                   │
└─────────────────────────────────────┘
```

## Section-by-Section Design

### 1. HERO (Full Viewport Height)

**Layout**:
- Left 60%: Headline + subheadline + CTA
- Right 40%: Animated visual (no video, pure CSS/SVG)

**Typography**:
```
Headline: "Smart Triage Beats Spam"
Subheadline: "26.6% proven lift. 20% control group. Zero false attribution."

CTA: "See 5 failure types" (button with arrow)
```

**Visual**:
- Animated SVG showing money flow (soft decline → wait, hard decline → act)
- Particles/flow lines in amber + emerald
- No 3D, no lottie files — pure CSS animations

**Oomph Factor**:
- Headline text scales on scroll entry
- Background gradient shifts subtly
- Particles pulse with each beat

---

### 2. PROBLEM → SOLUTION (Scroll Section)

**Layout**: Split comparison, animated slide-in

```
Left (RED/Rose):              Right (GREEN/Emerald):
Traditional Dunning           RevRecover

✗ Message everyone           ✓ Smart triage (6 types)
✗ False attribution           ✓ Strategic restraint
✗ No control group            ✓ 20% holdout proves lift
✗ No prioritization           ✓ ROI per action
```

**Oomph Factor**:
- Checkboxes animate in staggered
- When scrolling, left side "fades to red", right side "glows green"
- Icons morph from X to ✓ on scroll
- Counter-narrative: "What if traditional tools could see what we see?" → slides up, disappears

---

### 3. THE 5 SCENARIOS (Interactive Hub)

**Layout**: Center-focused card carousel OR grid (decision TBD based on interaction design)

**Design A: Hexagon Grid** (modern, hand-designed feel)
```
              [1]
         [2]       [3]
              [4]
         [5]       
```
Each hexagon:
- Icon in center (emoji + subtle glow)
- Hover: scales, glows in color, shows label
- Click: triggers scenario, shows result below

**Design B: Vertical Scroll Stack** (mobile-first, modern)
- 5 cards stack vertically
- Each card is 80% viewport width, centered
- Scroll snaps to each card
- On scroll, triggers scenario automatically
- Result appears above/below card

**My Recommendation**: Design A (Hexagon Grid) for desktop, gracefully degrades to stack on mobile.

**Oomph Factor**:
- Hexagons have subtle 3D perspective transform
- Glow effect matches card color
- On hover: small particles orbit around hexagon
- On click: card explodes into result panel (confetti? no, too AI slop)
- Result panel slides up with data visualization

**Scenario Cards** (Hexagon content):
```
1. 💧 Soft Decline
   "System WAITS"
   Blue glow

2. 🔴 Hard Decline
   "System ACTS"
   Red glow

3. 🔐 AFA Required
   "System SENDS OTP"
   Purple glow

4. ⏸️ Halted
   "System EMPATHIZES"
   Orange glow

5. ❓ Unknown
   "System ESCALATES"
   Gray glow
```

---

### 4. RESULT PANEL (Below Hexagons)

When scenario triggered:

**Layout**:
```
Scenario Name (large, colored)
─────────────────────────────
Subscription ID: sub_live_xxx
Time: T+0ms

DECISION: [colored pill]
╔════════════════════════╗
║ SEND CARD UPDATE LINK  ║
║ (Red pill, Amber bg)   ║
╚════════════════════════╝

Expected Lift: ₹1,742
Intervention Cost: ₹49
ROI: 35×

Rationale: "Card expired. Autopay can never recover this."
```

**Oomph Factor**:
- Numbers count up in real-time (26.6% → animated counter)
- Metric cards have mini progress bars
- When result appears, slight shake/bounce animation
- Colors match scenario theme

---

### 5. KEY METRICS (Statement Section)

**Layout**: Large, bold, minimal

```
CENTER OF SCREEN:

         44.4%
      vs 17.9%
         = 26.6%

"Proven lift with control group"

[Smaller text below]
z=2.59 · p=0.0096 · 10 independent runs · Median selected
```

**Oomph Factor**:
- Numbers are HUGE (maybe 200px+ font)
- Animated counter when scrolling into view
- Comparison operators (%) scale and fade
- Equals sign glows amber
- Background has subtle gradient shift

---

### 6. AUDIT TRAIL / DETAILS (Optional Drawer or Tab)

**Decision**: NO TABS. Instead:
- "View Full Details" button below each result
- Slides out a beautiful modal/drawer on right side
- Shows audit log with scrollable events
- Closes on ESC or click outside

**Design**: Dark panel, monospace font, minimal borders

---

## What We're REMOVING

❌ Tab navigation (Simulator, Compliance, Audit Trail, etc.)
❌ Multi-page experience
❌ Dashboard widgets scattered everywhere
❌ Acceptance Criteria panel (too admin-y)
❌ System Report panel (too verbose)

---

## What We're KEEPING

✅ Color scheme (Amber + Emerald + Stone)
✅ Professional tone
✅ Real data (no fake numbers)
✅ Live demo functionality
✅ Audit log data (but accessed via drawer, not tab)

---

## Typography

**Headlines**: Inter Bold, 48-72px, tracking tight
**Subheadlines**: Inter SemiBold, 24-32px
**Body**: Inter Regular, 16px, leading 1.6
**Metrics**: Monospace (JetBrains Mono), 24-200px
**Labels**: Inter Medium, 12-14px, uppercase, tracking wider

---

## Spacing & Grid

- 24px base unit
- 8px sub-unit for fine-tuning
- Max width: 1200px
- Margins: 96px top/bottom (6 base units)
- Padding: 48px sides (2 base units)

---

## Motion & Animation

**Easing**: cubic-bezier(0.16, 1, 0.3, 1) [expo-out] (your current choice, keep it)

**Animations**:
1. Scroll reveals: stagger 100-150ms between elements
2. Hover states: 200ms smooth scale + color shift
3. Click feedback: 150ms pulse + scale-down
4. Counters: 1.2s animated number transitions
5. Panel slides: 400ms ease-out

---

## Breakpoints

- Desktop: 1200px+ (full hex grid)
- Tablet: 768-1199px (hex grid 2-3 per row)
- Mobile: < 768px (stacked cards, full-width)

---

## Interaction Flows

### Primary CTA: "See 5 Failure Types"
1. User clicks button
2. Page scrolls to scenarios section (smooth scroll, 800ms)
3. Hexagons are visible, ready to click
4. Hover state activates immediately

### Scenario Trigger
1. User clicks hexagon
2. Card glows, scales up slightly
3. Scenario fires (backend call)
4. Result panel slides up from bottom (or fades in below)
5. Metrics animate to final value

### View Details
1. User clicks "View Full Details"
2. Right-side drawer opens (400ms slide in)
3. Audit log scrolls, showing events in real-time
4. Close button or ESC exits drawer

---

## Oomph Factor Checklist

✅ Hero section immediately communicates value (26.6% lift)
✅ Comparison visualization (traditional vs RevRecover) is engaging
✅ Hexagon grid is unique, not standard SaaS
✅ Result panels have personality (colors, glows, animations)
✅ Metrics are LARGE and impactful
✅ No boilerplate design patterns
✅ Hand-designed feel (curves, spacing, color choices)
✅ Scrolling feels smooth and intentional
✅ Micro-interactions delight without being cheesy
✅ Zero AI-slop vibes (no gradients everywhere, no blur effects)

---

## Color Usage by Section

| Section | Background | Primary | Secondary | Accent |
|---------|-----------|---------|-----------|--------|
| Header | Stone-950 | Amber | - | - |
| Hero | Stone-900 (gradient) | Amber | Emerald | Cyan |
| Problem/Solution | Stone-950 | Rose (left) | Emerald (right) | - |
| Scenarios | Stone-900 | Color per scenario | - | Glow matching color |
| Results | Stone-950 | Scenario color | Amber | - |
| Metrics | Stone-900 | Amber | Emerald | - |
| Modal/Drawer | Stone-900 | Monospace text | - | Stone-700 borders |

---

## Next Steps (Implementation)

1. Build Hero section with scroll animations
2. Build Problem/Solution comparison (scrollTrigger)
3. Build Hexagon grid + hover/click states
4. Build Result panel template
5. Integrate API calls to backend
6. Build Details drawer
7. Polish animations & micro-interactions
8. Mobile responsive pass
9. Performance optimization

---

## File Structure

```
src/
├── components/
│   ├── Header.tsx (sticky nav, minimal)
│   ├── Hero.tsx (full viewport section)
│   ├── ProblemSolution.tsx (comparison flow)
│   ├── ScenarioGrid.tsx (hexagon grid)
│   ├── ResultPanel.tsx (result display)
│   ├── MetricsStatement.tsx (key numbers)
│   ├── DetailsDrawer.tsx (audit log modal)
│   └── Footer.tsx (minimal)
├── hooks/
│   ├── useScroll.ts (scroll-based animations)
│   └── useScenarioTrigger.ts (scenario logic)
├── utils/
│   ├── animations.ts (shared animation configs)
│   └── colors.ts (color constants)
└── App.tsx (main layout, routing)
```

---

## Success Criteria

When judges see this on screen, they should:
1. **Pause** — "Wow, this is different"
2. **Read** — "Oh, I understand the insight immediately"
3. **Click** — "I want to see what happens"
4. **Grok** — "26.6% is a specific, proven number, not marketing fluff"
5. **Remember** — "This is the one with restraint + control groups"

