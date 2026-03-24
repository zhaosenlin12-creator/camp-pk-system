# Pet System Roadmap

## Current Decision

We are explicitly not building the classroom battle royale first.

The immediate priority is:

1. better art direction
2. stronger ceremony and emotional reward
3. better pet interaction and discoverability
4. motivation systems that increase learning energy

The battle royale mode remains a later phase.

## North Star

Turn the class pet feature into a classroom motivation engine:

- students care about their pets
- classroom performance visibly changes pet growth
- hatching and evolution feel memorable
- pet status creates anticipation before class ends

## Phase 1: Beauty And Ritual

Goal:

Make the pet system feel collectible, modern, and emotionally rewarding.

Deliverables:

- unified SVG pet art system
- clickable pet detail modal
- hatch ceremony overlay
- evolution ceremony overlay
- richer sound design
- stronger student pet card presentation
- pet power ranking on display pages

Acceptance:

- students can click any pet and preview its growth path
- hatching feels like a reward moment, not a status change
- evolution feels bigger than hatching
- pet cards are visually consistent across admin and display pages
- no mixed visual languages remain in the main pet surfaces

## Phase 2: Classroom Competition Layer

Goal:

Introduce light competition without requiring real-time combat.

Deliverables:

- pet power formula
- daily ranking and spotlight panels
- class-end duel mode
- simple pet skill tendencies
- battle preparation state
- fair catch-up logic so weaker students still have a chance

Acceptance:

- students understand why their pets are stronger or weaker
- rankings motivate rather than discourage
- class-end competition can run smoothly in a normal lesson

## Phase 3: Pet PvP Foundation

Goal:

Move from passive comparison to active pet-vs-pet play.

Deliverables:

- battle session model
- pet combat stats and skills
- turn-based or short arena prototype
- teacher-controlled and student-controlled input options
- win/loss resolution and replay summary

Acceptance:

- a class can complete a full pet battle flow reliably
- balance remains fair enough for mixed-skill students

## Phase 4: Pet Battle Royale

Goal:

Ship the `宠物吃鸡模式` after the pet fantasy and combat foundations are proven.

Deliverables:

- 2D battle map
- random spawn positions
- shrinking play zone
- movement controls
- collision and combat triggers
- elimination and survival ranking
- late-game spectator mode

Constraints:

- classroom session must be short
- controls must remain simple
- weaker pets cannot become useless
- server state must be authoritative

## Engineering Boundaries

Phase 1 and Phase 2 can continue on the current app architecture.

Before Phase 4:

- move pet logic out of the single server file
- add a dedicated battle domain model
- replace JSON-only persistence for battle sessions
- introduce real-time transport for combat synchronization

## What We Are Doing Now

This execution cycle is limited to Phase 1.

Concrete tasks:

1. lock design direction in repo docs
2. replace current pet art with unified SVG visuals
3. add clickable pet detail modal
4. add hatch/evolution ceremony animation and sound
5. add pet power ranking and better display storytelling
6. verify build and interaction quality
