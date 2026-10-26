# Tortakártya-videó — kötelező szabályrendszer (prompt a videókészítő AI-nak)

Készült: 2026-10-22, módosítva ugyanaznap (a torta minden kivágásban a kép aljára kerül, telefonon is) · Bohoka döntései alapján · Figma: elrendezési tábla `1783:12951`, kártyák `1776:12902`, `1776:12914`, `1777:12902`, `1777:12926`, animáció ANIM-11 (`claude/ANIMATIONS.md`).

**Mire való:** minden torta kap egy külön **kártya-videót**. Ezt Linda az adminban tölti fel („Add photo / video”), és csak a tortakártyán jelenik meg, a „Customise a design” oldalon nem. A kártya csukva a videó **első képkockáját** mutatja távolabbról (kizoomolva, mozdulatlanul). Kinyitva a videó **ráközelítve**, végtelenítve forog.

**A torta mindig a kép alján ül** — gépen, tableten és telefonon, csukva és nyitva is. Ezért a forgótányér a videókép aljára kerül, és a weboldal minden kivágást a videó aljához igazít; a torta fölött háttér marad (telefonon csukva a kép felső ~40 %-a háttér, ezt érdemes a háttér tervezésénél figyelembe venni).

**Miért ilyen szigorú:** egy videóból vágja ki a weboldal a gépes, tabletes és telefonos kivágást, csukva és nyitva is. Csak akkor működik, ha minden videóban ugyanott van a torta és az alátét.

**A háttér:** azt Bohoka tervezi, ez a szabályrendszer csak az elrendezést rögzíti. A lenti angol szöveg egy az egyben bemásolható promptként; a háttér leírását a jelölt helyre kell beírni.

---

## PROMPT (copy everything below this line)

You are producing a product video for a cake shop website. Follow every rule exactly. All positions are given in **normalised frame coordinates**: x from 0 (left edge) to 1 (right edge), y from 0 (top edge) to 1 (bottom edge). For the 2160 × 2160 output, multiply by 2160 to get pixels (e.g. 0.22 → 475 px).

### 1. Output file
- Size: **2160 × 2160 px, square (1:1)**. Never letterboxed, never padded.
- Frame rate: **30 fps, constant**. Length: **exactly 5.000 s = 150 frames** (frames 0–149).
- Codec: MP4 (H.264 High, 4:2:0, 8-bit) or ProRes 422. sRGB / Rec.709, SDR. No HDR.
- **No audio track.** No text, no logos, no watermark, no captions, no people, no hands.

### 2. Camera (locked)
- **Full side view**: the optical axis is horizontal (0° tilt, 0° roll), pointing straight at the rotation axis.
- Long lens (85–135 mm full-frame equivalent), so the perspective is almost flat and the cake's silhouette does not change size as it turns.
- The camera never moves, zooms, refocuses or breathes. Exposure, white balance and focus are locked for all 150 frames.
- Depth of field: the whole cake is sharp, front to back.

### 3. Turntable (identical in every video)
- A plain round turntable, seen exactly from the side, standing **at the bottom of the frame**. It turns about a **vertical axis at x = 0.500**.
- **Plate:** a slab with its top surface at **y = 0.910** and its bottom at **y = 0.930** (thickness 0.020), spanning **x 0.220 – 0.780** (width 0.560), centred on the axis.
- **Stem:** y 0.930 – 0.950, width 0.080 (x 0.460 – 0.540).
- **Base:** y 0.950 – 0.970, width 0.280 (x 0.360 – 0.640).
- Nothing of the turntable goes below **y = 0.970**. A soft, static contact shadow may extend to y 0.980 at most. The strip y 0.970 – 1.000 below it is plain background (the surface the turntable stands on).
- Everything above the cake (y 0.000 – 0.410) is background only.
- The turntable's colour and material: [OWNER FILLS IN].

### 4. Cake (fits one fixed box)
- The cake stands on the plate, centred on the rotation axis: its bottom sits on **y = 0.910**.
- **Cake box: x 0.260 – 0.740, y 0.410 – 0.910** (width 0.480, height 0.500). The cake, including every decoration and topper, stays inside this box in every frame.
- **Scale the cake so that it fills the box:** its widest point reaches the box width (0.480), or its highest point reaches the box top (y 0.410), whichever comes first. Then it touches at least two opposite sides of the box. Every cake video therefore has the same visual size, whatever the real cake size.
- The cake is centred on the axis to within ±0.005 of the frame width, so its silhouette does not wobble while it turns.

### 5. Rotation and loop
- The turntable and cake make **exactly one full turn (360°) in 150 frames**, at a constant 2.4° per frame. No ease-in, no ease-out, no pause.
- Direction: **clockwise seen from above**, so the front of the cake moves from right to left.
- **Seamless loop:** frame 150 would be identical to frame 0, so deliver frames 0–149 only. Jumping from frame 149 to frame 0 must show no jump in angle, light, shadow, colour or noise.
- **Frame 0 shows the cake's best side, facing the camera.** It is the still picture on the closed card.
- Natural motion blur only (180° shutter equivalent or less).

### 6. Light and background
- Light is fixed in the world and does not turn with the cake: a soft key light from the front-left at about 45°, a soft fill, 5000 K. There is no flicker and no moving reflection hot-spots that jump between frames.
- Background: [OWNER FILLS IN — e.g. colour, texture, surface]. It must be **completely static**, the same in every frame, and run full-bleed to all four edges of the square. Background props, if any, stay outside the safe box (section 7) and never move.

### 7. Areas that must stay clear
- **Safe box (everything that matters): x 0.220 – 0.780, y 0.410 – 0.970.** Only the cake and the turntable live here.
- **Corner-button areas, which must stay calm (no props, no bright details):**
  - top-right x 0.69 – 1.00, y 0.00 – 0.25 (phone cards);
  - right side x 0.76 – 1.00, y 0.36 – 0.54 (desktop and tablet cards).
  The website draws a small button there.
- Keep the edges calm. The website crops the frame differently on each screen (section 8); anything outside the safe box may be cut off.

### 8. How the website uses the frame (for checking — do not draw these)

| Use | Aspect (w : h) | Crop in the square (x0, y0 – x1, y1) |
|---|---|---|
| Desktop and tablet card, closed (zoomed out, still frame 0) | 1.608 : 1 | 0.000, 0.3783 – 1.000, 1.000 |
| Desktop and tablet card, open (zoomed in, playing) | 1.208 : 1 | 0.1136, 0.3600 – 0.8864, 1.000 |
| Phone card, closed (Home and catalogue) | 1 : 1 | 0.000, 0.000 – 1.000, 1.000 |
| Phone Home card, open | 0.735 : 1 | 0.1800, 0.1288 – 0.8200, 1.000 |
| Phone catalogue card, open | 0.710 : 1 | 0.1800, 0.0988 – 0.8200, 1.000 |

Every crop shares the bottom edge of the frame, so the turntable always sits at the bottom of the picture.

### 9. Final check before delivering
- 2160 × 2160, 30 fps, 150 frames, no audio.
- In frames 0, 37, 75 and 112, the cake stays inside x 0.26 – 0.74 and y 0.41 – 0.91; the plate top is at y 0.91; the base ends at y 0.97; the axis is at x 0.50.
- Looping 149 → 0 shows no jump.
- Nothing appears in the corner-button areas.

---

## A weboldal oldaláról (Claude Code-nak, nem az AI-nak)

**A kivágás képlete:**
- **Minden kivágás alulra igazított:** alsó éle a videó alja (y = 1), vízszintesen középen (`object-position: 50% 100%`).
- **Csukott kivágás:** a legnagyobb téglalap a kártyakép arányával (`object-fit: cover`, alulra igazítva).
- **Nyitott kivágás:** szélesség = max(0,64 ; 0,64 × r), magasság = szélesség / r, ahol r a nyitott kép aránya (sz/m); érvényes 0,64 ≤ r ≤ 1,56 között.
  - Oldalt 0,04 margót hagy a biztonsági doboz körül, a talp alatt 0,03 háttér marad (a kép magasságának 3–5 %-a), és a lehető legjobban ráközelít.
  - Bármilyen új kártyaméretre ugyanez a képlet érvényes.

**Ellenőrizve:** a kártya sarokgombja minden kivágásban a tortadobozon kívül esik (a Figma-táblán megjelölve).

**Feltöltés az adminban („Card video”):**
- **Fájl:** MP4 vagy MOV, négyzetes, legalább 1440 × 1440, 4,9–5,1 mp.
- **A szerver ebből készít:**
  - 1080 × 1080 és 1440 × 1440 web-változatot (H.264, kulcskocka a 0. képkockán, hang nélkül);
  - egy 1440 × 1440 állóképet a 0. képkockából, ez a csukott kártya képe.
- **Ha nincs kártyavideó:** a kártya a főfotót mutatja, és nincs sarokgomb.
