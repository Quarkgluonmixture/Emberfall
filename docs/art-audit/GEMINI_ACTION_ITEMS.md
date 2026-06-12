# Gemini Action Items — Emberfall

_Model: gemini-3.1-pro-preview · 2026-06-12 · seed 48 · 12 shots from `docs/art-audit/current/`, one call per shot_

Here is the ranked action-item list, ordered by the highest leverage (player impact relative to implementation effort) to the lowest. 

- [ ] **Ambient Nighttime Moonlight**
  **Problem:** The game lacks nighttime moonlight, turning the world into an impenetrable, pitch-black wash at night.
  **Fix:** Inject a subtle blue ambient base to the night mode so landmasses, water, and geography remain readable in the dark.
  **Impact:** High

- [ ] **On-Map Text Shadows and Glows**
  **Problem:** Settlement labels and text overlays are completely swallowed by the muddy terrain due to their dark hues.
  **Fix:** Apply a dark drop shadow or a soft glowing outline to all on-map serif labels (like "Emberstead") to guarantee contrast against dark terrain.
  **Impact:** High

- [ ] **Macro-Zoom Decluttering and Anchors**
  **Problem:** At fully zoomed-out views, citizens and roads create muddy visual noise while settlement lights are too dim to act as anchors.
  **Fix:** Drop all rendering of citizens and roads at macro zoom. Exaggerate the thickness of territory borders, and dramatically scale up the brightness and bloom radius of settlement glows to act as clear navigational anchors.
  **Impact:** High

- [ ] **UI Panel Background Transparency**
  **Problem:** The heavy, opaque black backgrounds of UI panels unnecessarily weigh down the composition and crowd the viewport.
  **Fix:** Increase the transparency of the UI panel backgrounds to let the map breathe, making sure to retain the existing crisp typography (do not change the gold, white, and red text).
  **Impact:** Medium

- [ ] **Road Visibility and Edge Blending**
  **Problem:** Inter-settlement roads are drawn as thin, low-contrast brown lines that vanish into the dark green terrain.
  **Fix:** Widen the dirt paths and add soft edge-blending so they read clearly as connecting infrastructure rather than muddy scratches. Ensure they pop distinctly at mid-zoom.
  **Impact:** Medium

- [ ] **Settlement Glow Gradients and Localization**
  **Problem:** At mid and close zooms, settlement lights are blown-out, uniform blobs that completely obscure the buildings beneath them.
  **Fix:** Transition settlement glows into soft alpha gradients that tint the area rather than blowing it out. Add localized light sources (hearths, lit windows) so the underlying architecture is highlighted instead of erased.
  **Impact:** High

- [ ] **Settlement Grounding and Hierarchy**
  **Problem:** Dense buildings lack baseplates or shadows, looking like chaotic, floating mounds of pixels pasted onto the map.
  **Fix:** Add dark baseplates, edge blending, and ambient occlusion shadows beneath settlements to separate them cleanly from the grass and dirt. Break up the dense stacking of rooftops by introducing visual hierarchy and negative space.
  **Impact:** High

- [ ] **Citizen Scaling and Simulation VFX**
  **Problem:** Massive citizen sprites obscure structures, and simulation events like crises entirely lack on-map visual markers.
  **Fix:** Drastically downscale oversized citizen meeples at close zoom. Render distinct overhead action icons (working, trading) and crisis VFX (fire, smoke) directly onto the map to visually telegraph the simulation state.
  **Impact:** High

- [ ] **Terrain Tiling, Noise, and Biome Readability**
  **Problem:** Mountains and forests suffer from severe repetition, and extreme weather/biomes turn the map into monochromatic sludge.
  **Fix:** Reduce the density and tiling repetition of mountain and forest sprites to establish clear foreground/background hierarchy. Ensure terrain values remain distinct so autumn biomes or heavy rain do not destroy readability.
  **Impact:** Medium

- [ ] **Organic Grid Smoothing and Blending**
  **Problem:** Territory borders, coastlines, and palisades are rendered as rigid, blocky, stair-stepped lines that violently clash with the organic art style.
  **Fix:** Replace tan right-angles, stair-stepped territory borders, and perfectly square palisades with smooth, blended curves that dynamically adapt to the natural geography. Hide the strict geometric grid entirely at mid-zoom, and use subtle regional tinting for territory borders.
  **Impact:** High

- [ ] **Close-Zoom Asset Clipping**
  **Problem:** At close zoom, structural elements like walls and houses chaotically clip through one another and natural water features.
  **Fix:** Complete a close-zoom asset clipping audit to ensure walls do not float unconnected or slice through houses and rivers.
  **Impact:** Medium
