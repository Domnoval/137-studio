# Studio 137 — Plan of Attack

**Written:** 16 August 2026
**Status:** live. Amend rather than replace.

---

## Decisions already made

These are settled. Everything below assumes them, and if one reverses the plan
changes shape, so they are listed first.

| Decision | Call | Why |
|---|---|---|
| **Look** | Photoreal | Chosen deliberately after seeing photoreal, ink-on-paper and chalk-on-slate rendered off the same frame. The ink pass is deleted; it is in git history if the call ever reverses. |
| **Navigation** | Objects are the doors | Easel, machine, radio, journal. Not a 4-bit lever machine — a visitor should not have to solve the furniture to see the work. |
| **Transition** | The fold, always | You never move. The view shatters onto a dodecahedron and reassembles somewhere else. Same move whether you click a prop or go through a door. |
| **Hero asset** | Rebuilt in Blender | The console is a fused single-material reconstruction. That is the ceiling. Contract in `docs/console-asset-contract.md`. |
| **Homepage** | Decide at day 90 | Build to the bar; decide with evidence. Nothing in this plan is irreversible. |

---

## Where it actually stands

Honest inventory, not a status report.

**Working:**

- The room renders correctly. Exposure verified by measurement, not by eye:
  median 45/255, 6.3% crushed, 56.5% midtones, against 11 / 40.9% / 14.8% before.
- The fold works. Click a door, the frame freezes, twelve pentagons carry it
  apart, the destination swaps under cover, a control brings you back.
- Environment reflections, chalk on three walls, corrected metalness and
  roughness, the painting actually on the easel.
- An asset pipeline that measures itself (`tools/asset-forge/`).

**Not working, or not built:**

- The console is still the fused reconstruction. It is the first thing anyone
  sees and the weakest thing in the frame.
- All four doors land on the same placeholder. **Nothing is behind them.**
- No keyboard navigation, no screen-reader path, no non-WebGL fallback. A
  visitor who cannot use a mouse cannot use this site at all.
- No loading state. First paint is however long twelve meshes take.
- No shop. No sigil artifact. Both explicitly wanted, neither started.
- Two competing homepages — the scroll site at `/` and the room at `/studio` —
  and no decision between them. **This is the biggest unresolved thing.**

---

## Today — done

- Fold landed and pushed. Three bugs behind it: a capture that had to become a
  render, a duplicated uniform that silently killed the shader, and rest
  positions in the wrong coordinate frame.
- Console asset contract written. **This unblocks Blender work immediately** and
  is the only thing on the critical path that needs your hands rather than mine.

---

## Next 5 days — unblock, measure, make one thing real

The goal is not features. It is removing every reason the next 85 days could
stall.

| # | Work | Why now |
|---|---|---|
| 1 | **Proxy console** satisfying the contract | Engineering builds against it the day you start modelling. Neither of us blocks the other. |
| 2 | **Baseline measurement** — bundle size, GLB and texture weight, time to first frame, draw calls, triangles, frame rate | You cannot optimise what you have not measured. This project already lost months tuning by eye against a broken instrument; that does not happen twice. |
| 3 | **Keyboard navigation for doors** | Tab to a door, Enter to open it, Escape to come back. Currently a keyboard user cannot enter this site at all. Small, and it changes who can use it. |
| 4 | **Loading state** | Room shell first, then console, then props. Right now the first thing a visitor sees is nothing, for an unmeasured length of time. |
| 5 | **Feature flags formalised** | `?fold=0` already exists. Same discipline for anything that can make the site unusable without erroring. This is how a bad release stops being a broken one. |

**Yours in parallel:** blockout of the console — right proportions, right node
names, no detail. An hour of work that unblocks everything behind it.

---

## Day 30 — one door, all the way through

**The gate: a stranger can sit down, open THE PAINTINGS, look at real work, and
come back — without a mouse if they need to.**

One door built properly teaches more than four built halfway, and every system
it needs is a system the other three will reuse: the fold arriving somewhere
real, a room behind it, a return path, keyboard parity, state preserved.

- Production console in, replacing the proxy.
- THE PAINTINGS built: the fold lands in a real space with real paintings, with
  the raking-light and loupe idea from the Higgsfield plan — you control the
  *conditions of looking* rather than being served finished images. It is the
  best idea in that document and it is your philosophy as a mechanic.
- Return preserves the room exactly as you left it.
- Keyboard and reduced-motion paths for everything shipped.
- The other three doors labelled honestly as unbuilt rather than landing on a
  placeholder that pretends.

### Fork: which door first?

| Option | For | Against |
|---|---|---|
| **THE PAINTINGS** *(recommended)* | It is the actual work. Highest chance a stranger cares. Needs no new applications — you already have the images. | Image-heavy; needs a real loading strategy. |
| THE BUILDS | Three destinations already exist (`/play`, `/sing`, `/rng`). Fastest to wire. | Wiring existing pages is plumbing, not experience. Proves the least. |
| THE JOURNAL | Most personal, contains contact, cheapest to author. | Text in a 3D room is the hardest thing on this list to make good. |

---

## Day 90 — four doors, hard enough to promote

**The gate is not "does it work." It is: someone who has never heard of you sits
in it for two minutes and tells someone else about it.**

Every other acceptance criterion is functional and can be passed by something
dead. This one cannot.

- All four doors real.
- The shop — exiting through the gift shop, leave and shop at equal weight, the
  muzak you supply.
- The sigil artifact on the desk: click it, make something, keep it. **The only
  thing in this whole design where a visitor makes rather than browses.**
- Non-WebGL fallback that exposes the same content, not a redirect to a
  different site.
- Performance tiers: 60 fps reference desktop, 50+ mid-tier, 30+ guided mobile,
  degrading automatically rather than stuttering.
- Soak on real devices: keyboard only, touch, reduced motion, muted, slow
  network, WebGL disabled, context loss, direct URLs, back button, refresh.
- **Then** decide the homepage, with evidence.

### Fork at day 90: does the studio become `/`?

| Option | For | Against |
|---|---|---|
| Studio becomes `/` | The room *is* the site. Full commitment, and the only version where the room is what people meet first. | Costs SEO and link previews. Anyone on a phone on bad signal meets a WebGL load before they meet you. |
| Studio stays `/studio` | Zero risk. Scroll site keeps doing its job. | The room stays a side quest, which is arguably the point of not building it. |
| Split by capability | Serve the room to capable devices, the scroll site to everyone else. | Two front doors to maintain forever, and neither gets your full attention. |

Not answered now, on purpose. It is answerable in November with real numbers
and unanswerable today.

---

## What is deliberately not being built

Named so they stop being open questions.

- The 4-bit lever machine, and the 33–42 interaction inventory around it.
- A second navigation model — no sitemap panel, no utility panel on a wall. If
  navigation needs an emergency exit, fix the navigation.
- Camera travel of any kind. The fold is the transition. All of them.
- An about page, in any disguise, including a photograph wall.
- The telephone as a contact door. Contact is in the back of the journal, where
  an address goes in a real notebook.
- New applications. Six were proposed; none are needed to prove any of this.

---

## The risks worth naming

| Risk | Reality | Mitigation |
|---|---|---|
| **The console blocks everything** | It is your time, on the critical path, and it is the biggest single art task. | The proxy. Engineering never waits. A blockout on day 2 removes the risk almost entirely. |
| **The room is impressive and empty** | It is the most likely failure. A beautiful hub with nothing behind the doors is a tech demo. | Day 30 gate is one door *finished*, not four started. |
| **Nothing tests whether it is good** | Every gate in every plan so far is functional. You could pass all of them and ship something dead. | The day-90 stranger test. It is the only gate that can fail a working build. |
| **Scope arrives faster than it ships** | Two 40-interaction plans landed this week. | This document. Amend it deliberately; do not append to it casually. |
| **The harness lies** | It has produced false black-room readings and a false "identity verified" that was a dead shader. | Measure, then verify the measurement. Every number in this document was checked twice. |

---

## Working agreements

- **Measure before opinion.** The room was judged by eye for months against
  five bugs. Any grading or performance claim comes with a number.
- **Comments state what is true.** A comment claiming chalk wrapped the corners
  sat above two bare walls for weeks and stopped anyone looking.
- **Nothing ships that can only be operated with a mouse.**
- **The four philosophy lines are verbatim and are not edited.**
- **Source artwork in `public/art/` is never modified.**
