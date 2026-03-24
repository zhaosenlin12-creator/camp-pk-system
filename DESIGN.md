# Pet Galaxy Design System

## Product Intent

The pet layer is not a side widget. It is the emotional core of the classroom system.

For 乐启享, the pet experience should make students feel:

- "This pet belongs to me."
- "My classroom effort is turning into visible growth."
- "Big moments like hatching and evolution feel like rewards."
- "My pet has personality, status, and future potential."

The design goal is not generic "cute". The goal is `proud ownership + ritual + anticipation`.

## Phase 1 Visual Direction

Phase 1 does not build the battle royale mode. It builds the fantasy that makes students care enough to want battle later.

The visual direction is:

- Soft, rounded, collectible mascot style
- Clean vector illustration rather than mixed third-party sprites
- Bright classroom-friendly palette, not gamer-dark
- Plush-toy proportions with oversized heads and expressive faces
- Motion that feels magical and celebratory, not noisy

Reference feeling:

- collectible sticker book
- mobile pet raising game
- classroom reward ceremony
- toy capsule reveal

## Illustration Rules

All pets should share a unified system.

- Head-to-body ratio should feel chibi and friendly
- Shapes should be rounded and low-threat
- Eyes and mouth must communicate emotion clearly even at small sizes
- Every pet should work in three contexts:
  - tiny badge
  - card hero
  - full modal spotlight
- Each pet must support distinct stages:
  - egg
  - early form
  - current form
  - evolved form

Do not mix pixel art, emoji art, raster clipart, and custom art in the same experience.

## Color System

Base page palette:

- Sky: `#79d5ff`
- Mint: `#8ee6c4`
- Cream: `#fff8ef`
- Ink: `#23314f`
- Warm shadow: `rgba(35, 49, 79, 0.12)`

Rarity colors:

- Common: `#54d2a8`
- Rare: `#58a6ff`
- Epic: `#c987ff`
- Legendary: `#ffb347`

Ceremony accents:

- Hatch glow: `#ffe082`
- Evolution glow: `#ff8fd7`
- Spotlight halo: `#ffffff`

## Typography

Use the current Chinese-friendly stack for now, but hierarchy must become more intentional.

- Title: extra bold, short, celebratory
- Card title: bold and compact
- Meta labels: small and calm
- Numbers: strong and highly legible

Avoid oversized paragraphs in the main reward moments. Ceremony screens should read like reward cards, not admin tools.

## Card Design Rules

Pet cards should feel collectible.

- Large hero art area
- Clear rarity chip
- Name first, species second
- One-line personality hook
- Status chip with high contrast
- Primary CTA anchored to the bottom
- Hover lift and soft glow

Student pet panels should feel like a personal pet passport, not a metrics dump.

## Motion System

The pet experience needs 3 motion levels.

### Ambient

- floating halo
- soft idle bob
- breathing scale
- subtle sparkle drift

### Interactive

- card lift on hover
- artwork pulse on click
- modal pop with spring
- selected level thumbnail focus ring

### Ceremony

- full-screen dim and spotlight
- pet rises into center
- particles burst
- title reveal
- number increase pulse
- confetti and glow finish

Ceremony motion must be short and satisfying.

- hatch target: `2200ms - 3200ms`
- evolve target: `2800ms - 4200ms`

## Audio System

Audio should be synthetic and lightweight for now, but must still feel intentional.

Required cues:

- claim
- nurture
- play
- clean
- hatch
- evolve
- ranking highlight
- modal open

Rules:

- no harsh or long sounds
- hatch should feel bright and curious
- evolve should feel larger and triumphant
- support mute globally

## Interaction Rules

- Every pet hero area must be clickable
- Clicking a pet opens a profile modal with:
  - current stage
  - level path preview
  - rarity
  - personality hook
  - current growth and care summary
- Hatching and evolution must always open ceremony overlay
- If a student has no claimed pet, the egg should still feel special and clickable

## Ranking and Motivation

Phase 1 introduces `培养力` as a classroom motivation layer.

培养力 should be derived from:

- growth value
- care score
- stage bonus
- evolution bonus

It should not create unbridgeable gaps.

The design purpose of ranking is:

- create anticipation
- celebrate progress
- surface near-term goals

Not:

- permanently shame low-ranking students

## Out of Scope for Phase 1

- real-time pet PvP
- battle map
- shrinking safe zone
- device-linked multi-user controls
- authoritative combat server

These belong to later phases after the pet fantasy is emotionally strong enough.
