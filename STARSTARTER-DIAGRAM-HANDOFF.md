# Handoff — embed the StarStarter entitlement diagram (zoomable)

**For:** the Claude Code working in the `Website` repo (VS Code).
**Goal:** replace the "Replace with diagram" placeholder in the StarStarter case
study with a zoomable/pannable flow diagram of the dual-entitlement system.

---

## Files already created (by Cowork, sitting in this repo)

| File | What it is |
|---|---|
| `games/starstarter-entitlement-flow.html` | **Self-contained zoomable viewer.** Renders the diagram (Mermaid via CDN) and adds wheel-zoom, drag-pan, pinch, +/−/Fit controls, a legend, styled to the site's dark design system. Works standalone or in an `<iframe>`. |
| `assets/Starstarter/starstarter-entitlement-flow.mermaid` | **Source of truth.** The Mermaid `flowchart TD` with the themed `classDef` palette. Edit this if the flow ever changes. |

The diagram content is verified against the app code at commit `7c0cbc880`. Do **not**
add nodes that aren't there — see "Diagram ground rules" below.

---

## Where it goes

`games/starstarter.html`, section **"Three · Subscription, enterprise vs App"**.
Look for this block (around lines 412–421) and replace the whole `<figure>`:

```html
<figure class="figure">
  <div class="frame">
    <div class="placeholder tall">
      <div class="glyph">◐</div>
      <div class="what">Dual entitlement, enterprise + App-Store flows</div>
      <div class="swap">Replace with diagram</div>
    </div>
  </div>
  <figcaption><b>Fig 2.</b> Two pipes that had to look like one product to the player, clinic codes on one side, the App Store on the other.</figcaption>
</figure>
```

---

## Integration — pick one

### Option A — iframe (fastest, fully isolated) ✅ recommended first
The viewer is already styled to match the site (transparent bg, purple glass border,
Quicksand). Drop it into the figure frame:

```html
<figure class="figure">
  <div class="frame" style="padding:0;overflow:hidden;border-radius:12px;">
    <iframe
      src="starstarter-entitlement-flow.html"
      title="StarStarter dual-entitlement flow — zoomable"
      loading="lazy"
      style="width:100%;height:min(78vh,720px);border:0;display:block;background:transparent;"
      scrolling="no"></iframe>
  </div>
  <figcaption><b>Fig 2.</b> Two pipes that had to look like one product to the player — the JWT <code>org_id</code> claim on one side, the App Store on the other. Scroll to zoom, drag to pan.</figcaption>
</figure>
```
Pros: zero risk of CSS/JS collision with the case-study page. Cons: one extra network
doc + the Mermaid CDN bundle (~loads inside the iframe).

### Option B — inline + prebuilt static SVG (best for performance/SEO)
Don't ship the Mermaid runtime on the case-study page. Prebuild an SVG and inline it
behind the same pan/zoom wrapper.

1. Generate the SVG from source (you have a full dev env; Cowork's sandbox didn't have a
   headless browser, so this step was left for you):
   ```bash
   npx -y @mermaid-js/mermaid-cli \
     -i assets/Starstarter/starstarter-entitlement-flow.mermaid \
     -o assets/Starstarter/starstarter-entitlement-flow.svg \
     -b transparent
   ```
2. Reuse the pan/zoom logic from `games/starstarter-entitlement-flow.html` (the
   `<script type="module">` block) but skip the `mermaid.render` call — instead
   `fetch()` the `.svg`, inject it into `.ss-content`, read its `viewBox` for `natW/natH`,
   then `fit()`. Everything else (wheel/pointer/pinch/controls) is unchanged.
3. Move the `.ss-*` CSS into a scoped block or `src/case-study-narrative.css`.

Prefer B if you care about the ~1 MB Mermaid CDN payload or want the diagram crawlable.
Otherwise A is fine and already done.

---

## Palette (already applied)

Node fills come from the StarStarter header art; the viewer chrome uses the site's
design tokens (`design-system/colors_and_type.css`).

| Role | Fill | Meaning |
|---|---|---|
| Screen / scene | `#6F5ABB` purple, cream text | a Unity scene or view |
| Decision | `#EA9C1D` gold | a gate/branch (`yes`/`no`) |
| Unlocked (success) | `#F9EFCC` cream | `MainScene` — every success path converges here |
| Login gate (fail) | `#DA3142` red | `LoginScene` — the single failure sink |
| Paywall | `#E45A5F` coral | the store paywall |
| Launch | `#A488E4` lavender | entry point |
| Edges | `#A488E4` lavender lines, cream labels on `#1a1a30` | — |

If you'd rather the diagram read cooler/more on-brand, the only knobs are the
`themeVariables` block and the `classDef` lines at the top/bottom of the `.mermaid`
source (and the mirrored `SRC` string in the viewer HTML — keep them in sync).

---

## Diagram ground rules (do not "improve" the flow)

The graph is traced to real code. When editing, keep these true:
- **No invented screens.** There is NO enterprise/clinic-code entry screen, NO
  "re-enter code" screen, NO "contact clinic" screen. Enterprise access is conferred
  solely by the Cognito `custom:org_id` JWT claim, provisioned out-of-band.
- Labels stay short (`yes` / `no` / a few words). No file:line refs in the rendered
  diagram (they were intentionally stripped for the portfolio).
- Keep shared nodes shared: `Decode org_id`, `APA Labs screen`, `LoginScene`, and
  `MainScene` are each reached from multiple paths — don't duplicate per persona.
- It must stay `flowchart TD`.

## Note for the credits block
`games/starstarter.html` currently lists **RevenueCat** under Tools (line ~489). The app
does **not** use RevenueCat — it uses **Unity IAP** (`UnityIAPServices.StoreController`)
with **AWS Cognito** for auth. Worth correcting while you're in there.

---

## Quick test
1. `git add` the two new files, open `games/starstarter.html` locally (Live Server / any
   static server — GitHub Pages-style relative paths).
2. Scroll to section iii "Subscription, enterprise vs App". Confirm: diagram fills the
   frame, scroll-wheel zooms toward the cursor, drag pans, **Fit** re-centers, legend
   shows on desktop, pinch works on touch.
3. Check mobile width (≤640px): legend hides, controls still reachable.
