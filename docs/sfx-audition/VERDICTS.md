# SFX audition — 2026-06-12

## impactBell_heavy_000.ogg
Slot: a settlement grows into a village — a single warm bell toll
> ⚠ BLIND CALL — ignore
FIT: 3 — It feels too abrupt and harsh for a cozy milestone, lacking the warmth, grandeur, and resonance expected for a village growth event in a dark-fantasy setting.
SOUND: It is a short, sharp metallic strike with rapid decay and very little sustain, sounding more like a generic, cheap UI "clank" or anvil hit than a physical, cast-iron bell.

## impactBell_heavy_001.ogg
Slot: a settlement grows into a village — a single warm bell toll (currently installed as bell.ogg)
> ⚠ BLIND CALL — ignore
FIT: 8 — The heavy, resonant tone grounds the achievement with a sense of weight that suits the dark-fantasy setting well, though it leans slightly more solemn than cozy.
SOUND: It features a metallic, heavy initial strike followed by a low-pitched, lingering bell decay, sounding acoustic and entirely free of synthetic or cheap arcade brightness.

## impactBell_heavy_004.ogg
Slot: a new camp is founded — a low, soft bell (currently installed as bellLow.ogg)
FIT: 3 — The sudden, forceful transient is too aggressive for a cozy settlement founding, feeling more like a harsh combat impact than a peaceful, atmospheric marker of growth.
SOUND: A heavy, mid-low metallic clang with a rapid decay, resembling a hammer striking an anvil rather than a softly struck, resonant village bell.

## impactPunch_heavy_000.ogg
Slot: a war skirmish at the frontier — a dull battle drum thud
FIT: 3 — While it provides a deep thud, it feels too much like an arcade action punch rather than the resonant, atmospheric drum strike required for our muted, medieval setting.
SOUND: It is a very short, bass-heavy, synthetic-sounding impact with no acoustic tail, resembling a generic fist punch or modern sub-kick rather than a natural wood-and-skin instrument.

## impactSoft_heavy_001.ogg
Slot: a war skirmish at the frontier — a dull battle drum thud (currently installed as drum.ogg)
FIT: 9 — The heavy, muffled character excellently captures the distant tension of a frontier skirmish while maintaining our muted, cozy dark-fantasy aesthetic.
SOUND: It is a low-pitched, warm, and brief thumping impact that sounds like a large, taut leather bass drum being struck, completely devoid of any harsh, cartoony, or "cheap mobile" high frequencies.

## impactWood_heavy_000.ogg
Slot: a settlement collapses into ruin — breaking timber (currently installed as rumble.ogg)
FIT: 3 — It is far too brief and lacks the atmospheric gravity needed to represent an entire settlement crumbling into ruin in a dark-fantasy setting.
SOUND: It is a short, dry, and punchy wooden thud with no sustained debris or environmental reverberation, making it sound more like a single box breaking in a casual mobile game.

## impactPlank_medium_000.ogg
Slot: a settlement collapses into ruin — breaking timber
FIT: 2 — It lacks the gravity, scale, and destruction needed for a settlement collapse, feeling far too lightweight for the game's grounded, dark-fantasy aesthetic.
SOUND: It is a very short, single-layered, hollow wooden "thwack" with no resonance or splintering qualities, sounding more like a casual UI interaction or dropping a small plank than a structural failure.

## impactMining_000.ogg
Slot: a town is captured in war — metal and stone violence
> ⚠ BLIND CALL — ignore
FIT: 2 — It entirely lacks the heavy, devastating scale required for a town capture, feeling far too small and lightweight for a dark-fantasy war event.
SOUND: A very short, bright, high-pitched metallic "clink" against stone with no low-end rumble, sounding exactly like a single pickaxe strike from a casual resource-gathering game.

## jingles_HIT00.ogg
Slot: a peace treaty is signed — a gentle, hopeful chime
FIT: 1/10 — The bright, overly synthetic nature of this sound shatters the medieval immersion and completely fails to capture the gentle, organic hopefulness required for a dark-fantasy peace treaty.
SOUND: A short, high-pitched, digital electronic burst that lacks acoustic resonance and strongly resembles a generic "success" sound from a cheap casual mobile game.

## jingles_HIT07.ogg
Slot: a golden age begins — a warm rising shimmer
FIT: 2/10 — The overly bright and synthetic nature of this sound shatters our cozy, muted dark-fantasy atmosphere, feeling completely out of place for a medieval golden age.
SOUND: It is a quick, high-pitched, synthetic success chord that immediately evokes the "cheap casual mobile game" feel rather than offering a natural, warm, and organic shimmer.

---

# Controls, reruns and final decisions (post-run analysis)

ffprobe ground truth: bell_000 1.48s · bell_001 1.74s · bell_004 0.30s ·
mining 0.94s · plank 0.78s · punch 0.65s · soft_001 0.57s · wood 0.31s ·
jingles_HIT00/07 0.28s each.

**Control probe** (1 call, 3 audios, 10878tok — attachments confirmed):
asked for duration/strikes/tail/brightness only. Reported 2.1s/1.6s/0.4s for
bell_000/bell_001/mining — right ballpark, correct relative shapes, so the
audio path itself works.

**Rerun of the three sub-baseline (~9.8k tok) calls** — all came back with
confirmed attachments (10.8–21.9k tok) but **flipped**: bell_001 went FIT 8
("low-pitched, lingering") → FIT 2 ("high-pitched plink, very short decay"),
contradicting both the first call and the control's own measurements.

**Meta-conclusion**: Gemini's timbre/pitch judgments on sub-2-second SFX are
unstable call-to-call. Only verdicts that are (a) consistent with measured
duration and (b) stable across repeats were acted on. The token gate
(±~1k preamble drift, audio ≈ +32/s) cannot prove attachment for short audio;
multi-turn CLI calls also inflate prompt-token sums ~2-3×.

| Slot | Candidate | Verdict | Decision |
| --- | --- | --- | --- |
| bell (village) | impactBell_heavy_001 (installed) | FIT 8→2, contradictory | **keep** — no stable negative; owner's ears decide |
| bell (village) | impactBell_heavy_000 | FIT 3/2 | reject |
| bellLow (founding) | impactBell_heavy_004 (installed) | FIT 3, 0.30s abrupt clang | **uninstalled** → falls back to bell.ogg @0.78× |
| drum (skirmish) | impactSoft_heavy_001 (installed) | FIT 9, duration-consistent | **keep** (best of batch) |
| drum (skirmish) | impactPunch_heavy_000 | FIT 3 | reject (gap 6) |
| rumble (collapse) | impactWood_heavy_000 (installed) | FIT 3, 0.31s — too brief | **uninstalled** → synth rumble (1.1s noise+thump) |
| rumble (collapse) | impactPlank_medium_000 | FIT 2 | reject |
| capture | impactMining_000 | FIT 2/2 (stable) | reject |
| chime (peace) | jingles_HIT00 | FIT 1, 0.28s | reject — synth stays |
| shimmer (golden age) | jingles_HIT07 | FIT 2, 0.28s | reject — synth stays |

All verdicts advisory — the owner's ears are the final gate.
