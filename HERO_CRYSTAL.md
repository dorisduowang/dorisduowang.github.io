# Crystal hero

The desktop sequence uses procedural glass rendered with the vendored Three.js 0.170.0. The glass refracts the playing portrait video. `hero.js` maps video time onto the 26-second sequence, and `hero-particles.js` uses that time for the ring, cold-white scan, and transfer to the selected Agent.

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

- `anchors` holds the crystal roots around the eye on the viewer’s right, with the principal root over the iris. The `x` and `y` coordinates run from 0 to 1 across the portrait image, starting at the top left. In scene coordinates, positive `z` points toward the camera and positive `y` points up. Adjust `direction`, `size`, and `delay` to control the clusters.
- `crystalCentroid` is the reference eye center and the starting point of the transfer. `hero-portrait-pose.js` measures the eye position, scale, and roll against the exact source clip. The crystals and ring use that calibration to follow the portrait. If you replace the footage, calibrate those coordinates against the new clip.
- `occluder` is the depth-writing ellipsoid that blocks particles behind the head. Its placement follows the same portrait calibration. Use `scale` for the three reference radii and `z` and `roll` for reference depth and tilt. Roll is in radians. Check both passes after adjusting it.
- `drawScan` in `hero-particles.js` controls the sweep’s brightness and position in source-video seconds. The line fades in after the clean opening and softens as it crosses the eyes.

## Glass and render cost

Use `material.thickness` to change the depth of the glass and `material.ior` to adjust its refraction. Raise `roughness` for softer highlights. `iridescence` and `dispersion` control color at the edges. Adjust `colors` for the glass tint and sparks. `density` sets the procedural seed and piece counts, and `render.maxDpr` and `render.maxPixels` cap the drawing resolution.

## Preview and fallback

On desktop, let the animation load, then use **Pause motion**. In the browser console, run `heroCrystal.setTime(14)` and check 2, 7, 14, 18, 22, and 25 seconds in the same way. Use the Agent buttons to test where the stream lands. Narrow screens and browsers without WebGL2 play the portrait with the 2D particles and scan. Reduced-motion mode opens on the portrait still.

## Optional alpha video

Set `heroCrystalConfig.useOverlayVideo` to `true` and supply `assets/video/crystal-overlay.webm` in VP9 with alpha and `assets/video/crystal-overlay-hevc.mov` in HEVC with alpha. Safari tries the HEVC source first. Align each frame of the 1104 × 1024 transparent clip to the matching pose in the video. Render one continuous 16-second clip covering growth, hold, transfer, and dissolve. The controller maps the clip to the interval from `orbitEnd` to `duration` and uses live glass while the clip is unavailable or out of sync.
