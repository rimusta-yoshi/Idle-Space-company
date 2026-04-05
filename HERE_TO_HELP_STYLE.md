# Here To Help — Visual & Tonal Style Guide
*Working document. Designers: read this before opening Figma.*

---

## 1. Concept Logline

Here To Help is a factory idle game about building pharmaceutical supply chains across a colonized galaxy, narrated by a mascot that is incapable of doubt. You smelt ore, process chemicals, ship medicine to struggling colonies, and expand the franchise — all under the cheerful supervision of a corporate logo that genuinely believes it is saving lives. The player is handed the tools of exploitation and told, warmly, that they are doing good. Whether that's true is left as an exercise for the player.

---

## 2. Tone & Voice

**The register is corporate sincerity.** Not sarcasm, not winking irony — the company means it. That's what makes it unsettling.

### The Mascot Speaks
- Present tense, active voice, inclusive "we."
- Every notification is a small celebration: "Colony 7 is running low on analgesics! That's our cue to help."
- Suffering is reframed as opportunity: "High demand means high impact."
- Never acknowledges exploitation, scarcity, or suffering directly — but the language implies awareness of all three.
- Ends messages with warmth that doesn't quite land: "Keep it up. You're making a difference. (Dividend payout in 3 days.)"

### The Gap
The world is grim. Colonies are rationing. Workers are described in output-per-shift. The mascot's copy never acknowledges this — it just applies cheerful pharmaceutical brand language to industrial strip-mining. The humor lives entirely in that gap. Never lampshade it. Trust the player.

### Avoid
- Breaking character to wink at the player ("We both know what's really going on here, heh")
- Overt dystopia signaling ("WELCOME TO HELL CORP")
- Edgelord nihilism — this is satire, not cynicism

---

## 3. Visual Palette

### Existing Base: Amber/Dark Industrial
The existing game is warm amber on near-black. That stays. It's the reality layer — the actual factory floor, the ore, the smoke, the conveyor belts.

```
--ink:     #060805   (deepest background)
--s2:      #181a14   (panel backgrounds)
--amber:   #c49a2a   (primary accent, resource flows)
--amber-hi:#e8c840   (highlights, active states)
--text:    #f0e8d8   (body text)
--muted:   #9a8b72   (secondary text)
```

### Added Layer: Pharma Clean
The corporate UI, the mascot, the HUD overlays — these use a second palette that sits visually ON TOP of the gritty base. Think clinical white pressed against oily darkness.

```
--pharma-white:  #f5f7f2    (modal backgrounds, brand surfaces)
--pharma-red:    #d42b2b    (the mascot's red cross, CTA buttons, alerts)
--pharma-accent: #e8f0ec    (light teal-white, form fields, card insets)
--pharma-border: #c8d4cc    (clean separator lines)
--pharma-ink:    #1a2018    (text on light surfaces)
```

### Two-Layer Rule
Never fully replace the dark base. The pharma layer appears as panels, modals, notification toasts, and HUD elements — islands of clinical brightness floating over the industrial dark. When the player minimizes the corporate UI, they're left alone with the factory. The contrast should feel deliberate: you can always see what's underneath.

---

## 4. UI Style Direction

### Core Panels (Factory, Resources, Connections)
These stay in the amber/dark palette — they're the real world. Functional, slightly worn. Pixel borders, no rounded corners, monospace values.

### Corporate UI Layer (Notifications, Mascot Messages, Reports)
- White or near-white card backgrounds with a 1–2px `--pharma-red` top border
- Clean sans-serif body text on light background
- The mascot's icon appears top-left of every corporate message, always smiling
- Generous padding — pharma UIs always feel like they have too much whitespace
- Metric readouts styled like clinical lab results: left-aligned label, right-aligned value, fine rule between

### HUD Elements
- Status bar across the top: branded, white, carrying the mascot and a ticker of positive copy
- Planet/colony indicators: small pill-shaped badges (deliberate pharma reference) showing supply status
- Satisfaction meters: clinical progress bars, labeled in corporate euphemism ("Colony Wellness Index")

### Modal Windows
- Appear as white overlay cards on the dark canvas — hard shadow, no blur
- Header always has the logo + a headline in bold sans
- Footer always has a "Proceed" or "Authorize" button in `--pharma-red`, never a "Cancel"

---

## 5. Typography Direction

### Three Roles, Three Fonts

**Corporate Headlines & Mascot Copy**
A geometric or humanist sans — clean, confident, slightly too wide. Archivo Black (already in project) works well. Used for mascot dialogue, modal headers, metric labels. Always sentence case, never all-caps for body copy (all-caps reads aggressive; pharma brands are warm).

**Body / In-game Data**
Playfair Display or a readable serif for longer UI copy — reports, colony descriptions, lore text. The serif adds a layer of officialness, like a printed pamphlet.

**Factory / Technical Readouts**
VT323 or equivalent pixel monospace (already in project). Rates, quantities, coordinates, debug-adjacent info. Stays in the amber/dark world — never appears on white pharma surfaces.

### Coexistence Rule
Corporate copy (sans-serif, white background) should never appear on the same visual surface as factory readouts (monospace, dark background). The aesthetic split reinforces the thematic one. When a notification bridges them — e.g., a mascot message about a factory output — the corporate framing wraps the raw data: the sans-serif headline, then a monospace inset showing actual numbers.

---

## 6. Thematic References

**Rimworld (Ludeon, 2018)**
Neutral systemic narration that trusts the player to feel the moral weight. The game doesn't tell you that letting a colonist die for resources is bad — it just records it. Take: the gap between system language and human outcome. Leave: the grit-for-its-own-sake.

**Disco Elysium (ZA/UM, 2019)**
Corporate ideology delivered with complete sincerity by characters who've fully internalized it. The horror is always in the speaker's obliviousness. Take: voice and interiority of true believers. Leave: the text volume and literary density — this is idle game copy, not a novel.

**GLaDOS / Portal (Valve, 2007)**
An AI that frames harm as helpfulness with cheerful precision. The mascot is not GLaDOS — it's warmer, more earnest, more tragic — but the mechanism is the same: sincerity as the horror delivery vehicle. Take: the helpfulness veneer. Leave: the menace; our mascot is not secretly malicious, just blinkered.

**Actual pharma brand design (Pfizer, Johnson & Johnson, Abbott)**
Study the real thing: clean white, reassuring blue-greens, always a human face or symbol of care, language of partnership and wellness. The pharma layer should feel like something a designer at an actual pharmaceutical company produced. Take: the visual grammar and the euphemistic vocabulary. Leave: any direct parody of real brands (legal).

**Papers Please (Lucas Pope, 2013)**
Bureaucratic complicity delivered through mundane task repetition. The player does the bad thing because the interface asks them to, and the bad thing is framed as correct procedure. Take: the mechanism where normal game actions carry systemic weight. Leave: the austerity aesthetic — we're warmer and more colorful.

---

## 7. The Mascot

### Name
"Here To Help" — this is both the mascot's name and its operating philosophy. It introduces itself as "Here To Help" in all messages, which never stops being slightly disorienting.

### Visual Form
A red cross — the standard medical/first-aid cross — rendered as a simple, rounded pixel-art icon. It has two small circular eyes (always looking slightly up and to the right, toward a bright future) and a flat smile. No arms, no body. Just the cross, eyes, and smile. It should read as friendly, not grotesque.

- Color: `--pharma-red` (#d42b2b) fill, white eyes and smile
- Size: Appears at 24x24px in notifications, 64x64px in modal headers, large in splash/loading screens
- Animation: Gentle bob. Occasionally blinks. On high-output notifications, the smile gets very slightly wider — almost imperceptibly.
- Never frowns. Never shows confusion. The eyes tilt slightly on "difficult" messages (supply shortages, colony deaths) — not sadness, just concern that's immediately resolved by the next sentence.

### Personality on the Page
- Enthusiastic but measured — not exclamation-mark-every-sentence, more "warmly informative"
- Refers to the player as "you" or "our franchise partner," never "user"
- Uses "we" when discussing the company, switches to "I" only when giving personal encouragement
- Has opinions about logistics: genuinely excited about efficient supply chains
- Sample voice:

> "Colony 12 is experiencing a shortfall in analgesics. This is a meaningful opportunity to expand our wellness footprint in the outer belt. I've flagged the route for your review. You're doing great work out here."

---

## 8. What to Avoid

**Don't make the mascot a villain.** The mascot is not evil — it's optimized. Evil implies self-awareness. The mascot has none. The moment it winks or shows awareness of irony, the satire collapses into a joke.

**Don't make the game self-righteous.** Players aren't here for a lecture. The critique is baked into the mechanics and the language — it doesn't need a moment where the game steps out of frame to tell you what to think.

**Don't make the dark base too grimy.** The amber/dark world is industrial, not apocalyptic. Grit signals real stakes; filth signals genre. Keep it legible and functional — the horror is in the system, not the texture.

**Don't make the pharma layer cartoonishly evil.** It should look genuinely like a real pharma brand — professional, trustworthy, well-designed. The more convincing it looks, the more effective the contrast. Bad parody pharma (too many dollar signs, skull-and-crossbones Easter eggs) defuses the tension.

**Don't over-explain the premise.** There's no tutorial screen that says "this company is morally dubious." The mascot introduces itself, tells you to help some colonies, and the game begins. The player figures out what kind of game this is by playing it.

**Don't mix the aesthetic layers arbitrarily.** Pharma white on a factory panel, or monospace readouts in a mascot message, breaks the visual grammar that carries the thematic meaning. The two-layer rule is structural, not decorative.

---

*Last updated: March 2026*
*Companion documents: project_game_design.md, project_world_design.md, project_ux_plan.md*
