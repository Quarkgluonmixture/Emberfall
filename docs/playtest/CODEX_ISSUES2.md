# Emberfall Playtest Issues 2

Source screenshots: `iss-walls` and `iss-citizens`, reviewed against `src/render/citizenLayer.ts`, `src/render/settlementCluster.ts`, and `ASSET_PROMPTS.md` batch 14.

## 1. Corner towers mismatch the clean wall ring

Tag: [needs-art]

What I see: yes, the report is accurate. The wall body now reads as clean, level, modular masonry: flat horizontal runs and straight vertical side tiles. The corner towers still read as older three-quarter building sprites. They lean into perspective, have angled roof and side geometry, and sit "around" the joints instead of feeling like level modular caps for the new wall language. In the screenshots, the walls form crisp orthogonal lines while the towers look rotated/slanted relative to them.

Concrete fix: regenerate `wall_tower` as a matched level corner cap for batch 14 style. It should not be a freestanding 3/4 tower. It should be an orthogonal square tower whose left/right wall connection points are level and flush, with only a thin top plane and side shading giving depth. It can still have a small roof or battlements, but its base footprint and wall sockets must align to the clean horizontal and vertical wall tiles. Keep its visual width close to the existing `wall_tower` footprint, because `settlementCluster.ts` places it at the four rect corners with `layer: 1` to hide wall joins.

Ready-to-paste GPT-Image prompt:

```text
Cozy dark-fantasy video game sprite set, painterly pixel-art hybrid, top-down three-quarter view (camera tilted about 45 degrees), muted earthy palette with warm ember accents, soft ambient light from the upper left. Mid-tones brighter than typical dark fantasy: rooftops clearly lighter than walls so structures stay readable against dark terrain. Crisp, readable silhouettes at small sizes. Each object isolated on a plain solid white background, with only a small soft contact shadow directly beneath it. No checkerboard, no text, no watermark, no border, no smoke, no fire glow, no light halos. Objects must not touch each other or the image edges.

A single medieval stone wall CORNER TOWER for a clean modular town-wall set, same stone color, thickness, scale, lighting, and painterly pixel-art style as the batch 14 clean walls. The tower must read LEVEL and orthogonal, not a slanted freestanding building: square stone tower footprint, vertical sides straight up/down in image space, horizontal wall sockets exiting left and right at the same height with FLUSH cut ends, and vertical wall sockets continuing straight down/up behind it so it tiles into a rectangular wall ring. Three-quarter depth comes only from a thin visible top plane, crenellated battlements, and soft side shading; no diagonal lean, no rotated base, no skewed perspective, no big roof overhang. Designed to sit exactly on top of the joint between a level left-to-right wall run and a straight-down wall tile, hiding the seam. Isolated on white, one object centered, no ground patch beyond a tiny contact shadow.
```

## 2. Gatehouse clashes with the level south wall

Tag: [needs-art]

What I see: yes. The bottom-center gatehouse is still the old `wall_gate` art. It has a more conventional 3/4 building angle and an arched front that reads as slanted compared with the dead-level wall run on either side. The wall body says "flat modular tile"; the gate says "old perspective landmark", so the join feels pasted in.

Concrete fix: regenerate `wall_gate` as a level gatehouse module. The south wall currently leaves a gap and places the gate at `(0, ry)` with the same sprite anchor behavior as other pieces, so the art needs flush horizontal wall connections at both sides and a centered arch/doors on the same level baseline. Avoid diagonal side wings, angled roofs, or an isometric block. Match the batch 14 stone run: straight crenellated top, thin top/walkway plane, side shading only, flush left/right cut ends.

Ready-to-paste GPT-Image prompt:

```text
Cozy dark-fantasy video game sprite set, painterly pixel-art hybrid, top-down three-quarter view (camera tilted about 45 degrees), muted earthy palette with warm ember accents, soft ambient light from the upper left. Mid-tones brighter than typical dark fantasy: rooftops clearly lighter than walls so structures stay readable against dark terrain. Crisp, readable silhouettes at small sizes. Each object isolated on a plain solid white background, with only a small soft contact shadow directly beneath it. No checkerboard, no text, no watermark, no border, no smoke, no fire glow, no light halos. Objects must not touch each other or the image edges.

A single medieval stone GATEHOUSE module for a clean modular town-wall set, same stone color, thickness, scale, lighting, and painterly pixel-art style as the batch 14 clean walls. It must read LEVEL and tile directly into a straight left-to-right wall run: long horizontal gatehouse front, FLUSH vertical cut ends on both sides, matching crenellated top line and thin wooden walkway/top plane, centered arched opening with closed dark wooden double doors. The left and right wall connection points must be perfectly level with each other and match the height/thickness of the clean stone wall run. Three-quarter depth comes only from a thin top plane and subtle side shading; no diagonal lean, no skewed base, no angled side wings, no old isometric tower perspective. Designed to replace `wall_gate` at the bottom center of a rectangular wall ring, with the adjacent level wall segments tucking cleanly into its sides. Isolated on white, one object centered, no ground patch beyond a tiny contact shadow.
```

## 3. Citizens read as floating above their shadows

Tag: [render-fix]

What I see: the soft oval shadows are present and useful, but in the close screenshot many citizens appear to hover slightly above them. The shadow is not just too soft; the visible feet often sit above the oval center/baseline, so the oval reads detached from the body. This is especially visible in the crowded market center where each figure has a dark oval a few pixels below the boots.

Likely cause confirmed from code: `citizenLayer.ts` bottom-anchors the sprite with `sp.anchor.set(0.5, 1)` and places the sprite at `a.y`. The shadow is centered at `a.y + 0.35` with `tex.glow`, width `3.2`, height `1.5`. Batch 15 processing in `scripts/process-assets.mjs` keys the citizen sheets but does not vertically trim them, then `textures.ts` slices fixed 128x128 grid cells. If those cells include transparent padding below the painted feet, the sprite's bottom anchor lands on the cell bottom, not the feet. That makes the rendered feet sit above `a.y`, while the shadow remains near `a.y`, so the character appears to float.

Concrete fix: keep this as a render/asset-processing alignment fix, not new citizen art. The best fix is to trim or normalize each citizen frame to a consistent foot baseline before runtime slicing/scaling, then keep `anchor(0.5, 1)`. If preserving a fixed grid is required, crop the batch 15 output rows/cells so the bottom of each 128x128 frame is within about 1 px of the lowest opaque foot pixel. The important invariant is: bottom of frame equals foot contact baseline.

If changing render only, add a per-frame or per-sheet foot-baseline correction instead of guessing a larger shadow offset. For example, after slicing batch 15 frames, compute the lowest non-transparent pixel for each frame/role and expose a `footOffsetY = frame.height - lowestOpaqueY`; then in `CitizenLayer`, place the sprite at `a.y + footOffsetY * scale` or set the texture/frame trim so the visible feet land at `a.y`. The shadow should then sit almost under the boots, around `sh.position.set(a.x, a.y + 0.1)` to `a.y + 0.2`, not `a.y + 0.35`. After baseline correction, reduce the shadow slightly if needed, roughly width `2.4-2.8`, height `0.8-1.0`, alpha `0.35-0.45`, because the current `3.2 x 1.5` glow is large enough to read as a separate oval at close zoom.

Do not solve this by moving only the shadow farther upward while the frames still contain bottom padding. That may hide the symptom in one pose, but walk/work/rest frames with different empty lower margins will keep swimming. Fix the foot baseline first; then tune the contact shadow as a smaller, closer grounding mark.
