# Crystal hero

The desktop sequence uses procedural glass rendered with the vendored Three.js 0.170.0. The renderer refracts the clean portrait behind the glass. `hero.js` maps portrait video time onto the 26-second sequence, and `hero-particles.js` uses that same time for the orbit and the transfer to the selected Agent.

## Timing

Edit `heroCrystalConfig.timeline` in [`hero-crystal.js`](hero-crystal.js). These fields are cumulative end times in seconds. Keep them in order.

| Phase                                     | End field     | Default |
| ----------------------------------------- | ------------- | ------: |
| Human idle                                | `idleEnd`     |     3 s |
| One orbit                                 | `orbitEnd`    |    10 s |
| Crystal growth                            | `growthEnd`   |    16 s |
| Crystal hold                              | `holdEnd`     |    20 s |
| Transfer to the selected Agent            | `transferEnd` |    23 s |
| Dissolve and return to the human portrait | `duration`    |    26 s |

## Face and occlusion

- `anchors` holds the crystal roots. The `x` and `y` coordinates run from 0 to 1 across the portrait image, starting at the top left. In scene coordinates, positive `z` points toward the camera and positive `y` points up. Adjust `direction`, `size`, and `delay` to control the growth of each cluster. Keep the crystals on one side and check eye visibility at full growth.
- `occluder` is the invisible, depth-writing ellipsoid that blocks particles behind the head. Align its `x` and `y` with the portrait, use `scale` for the three radii, and use `z` and `roll` to set its depth and tilt. `roll` is in radians. Check both the rear crossing and the foreground pass after adjusting it.
- `crystalCentroid` marks the start of the particle transfer. Move it with the cluster if you relocate the anchors.

## Glass and render cost

Use `material.thickness` to change the depth of the glass and `material.ior` to adjust its refraction. Raise `roughness` for softer highlights. `iridescence` and `dispersion` control color at the edges. Adjust `colors` for the glass tint and sparks. `density` sets the procedural seed and piece counts, and `render.maxDpr` and `render.maxPixels` cap the drawing resolution.

## Preview and fallback

On desktop, let the animation load, then use **Pause motion**. In the browser console, run `heroCrystal.setTime(14)` and check 2, 7, 14, 18, 22, and 25 seconds in the same way. Use the Agent buttons to test where the stream lands. The original 2D animation runs on narrow screens and when WebGL2 is unavailable. Reduced-motion mode opens on the human still.

## Optional alpha video

Set `heroCrystalConfig.useOverlayVideo` to `true` and supply `assets/video/crystal-overlay.webm` in VP9 with alpha and `assets/video/crystal-overlay-hevc.mov` in HEVC with alpha. Safari tries the HEVC source first. Align the transparent frame to the 1104 × 1024 portrait and render one continuous 16-second clip covering growth, hold, transfer, and dissolve. The controller maps the clip to the interval from `orbitEnd` to `duration` and uses live glass while the clip is unavailable or out of sync. The orbit and transfer still follow the site’s particle timeline.
