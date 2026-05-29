/**
 * PHOTOSHOOT PRESETS (Beta "Full Image Generation" mode)
 *
 * Curated, self-contained scene blueprints for the photoshoot generator.
 * Each preset describes a SCENE + LIGHTING + CAMERA the model should build
 * fresh around the person (new background, pose, and lighting) while keeping
 * the person's face/identity locked and dressing them in the product garment.
 *
 * IMPORTANT: presets are deliberately PERSON- and GARMENT-NEUTRAL. They never
 * specify who the person is or what they wear — the user's face crop and the
 * product garment supply that. No apparel brand names are baked in.
 *
 * EVERY preset is tuned to the same "try-on use case" standard:
 *   - SOFT, EVEN, FLATTERING light on the FACE (identity survives), even for
 *     moody/night/fog scenes — the face always gets a clean soft key.
 *   - MEDIUM framing (waist/chest-up) so the face is LARGE and clearly resolved.
 *   - PHOTOREAL, natural color, fine grain — no harsh flash, no plastic/CGI.
 *   - The GARMENT stays clearly visible on the torso.
 */

export interface PhotoshootPreset {
  id: string
  label: string
  /** Short UI category chip */
  category: 'Studio' | 'Lifestyle' | 'Outdoor' | 'Urban' | 'Editorial'
  /** One-line description shown on the preset card */
  blurb: string
  /** Full scene description fed to the image model */
  scene: string
  /** Lighting blueprint — always keeps a soft even key on the face */
  lighting: string
  /** Camera/lens guidance — always medium framing with a large, sharp face */
  camera: string
  /** Things to avoid */
  negativeBias: string
}

// Shared tail appended to every preset's negativeBias so the whole library
// enforces the same identity/realism guarantees.
const BASE_NEGATIVE =
  // The "no fat/puffy face" cluster targets Nano Banana's known tendency to
  // round, widen and smooth the face — the top cause of "close but not them".
  'no fat or puffy face, no rounded or widened jaw, no bloated cheeks, no doll-like or airbrushed face, no over-retouched or waxy skin, no harsh on-camera flash, no flat washed-out face, no plastic/CGI skin, no AI smoothing, no oversaturation, no warped or floating objects, no distorted anatomy, no readable signage or license-plate text'

// Shared camera tail — every scene resolves to a large, sharp, well-lit face.
// Framing is TIGHT (chest-up) on purpose: face size in the frame is the single
// biggest identity lever — a large face holds the person, a small full-body
// face drifts. Chest-up still shows the top garment clearly.
const FACE_FORWARD_CAMERA =
  'Tight CHEST-UP portrait: the head and face are LARGE and prominent (the face fills a large central part of the frame), with the upper body and the garment on the chest clearly visible; eye-level 85mm portrait look, shallow depth of field, natural true-to-life color, fine realistic grain. This is NOT a full-body, knees-up, or wide shot.'

function preset(p: Omit<PhotoshootPreset, 'negativeBias'> & { negativeBias?: string }): PhotoshootPreset {
  return {
    ...p,
    negativeBias: p.negativeBias ? `${p.negativeBias}, ${BASE_NEGATIVE}` : BASE_NEGATIVE,
  }
}

export const PHOTOSHOOT_PRESETS: PhotoshootPreset[] = [
  // ─────────────────────────── STUDIO ───────────────────────────
  preset({
    id: 'studio_white',
    label: 'Clean White Studio',
    category: 'Studio',
    blurb: 'Seamless white backdrop, soft pro lighting.',
    scene:
      'Professional photo studio with a seamless white cyclorama, a curved infinity wall meeting a polished white floor, smooth tonal gradient and a shadowless horizon line.',
    lighting:
      'Soft three-point studio lighting: a large softbox key front-left at 45°, a gentle fill front-right, overhead silk for separation — even, flattering and clean on the face with true-to-life skin tones, neutral 5500K.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no visible stands, no hard shadows',
  }),
  preset({
    id: 'studio_editorial',
    label: 'Fashion Editorial',
    category: 'Editorial',
    blurb: 'High-end magazine studio, refined contrast.',
    scene:
      'High-end editorial studio with a white painted brick wall showing authentic mortar texture, a polished concrete floor and spare architectural geometry with negative space.',
    lighting:
      'Large diffused window-style key from frame-left for gentle sculptural modeling with a white-card fill so the face stays evenly and softly lit, refined low-to-moderate contrast, 5400K daylight.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no harsh direct flash, no crushed shadows on the face',
  }),
  preset({
    id: 'blue_y2k_studio',
    label: 'Blue Studio',
    category: 'Studio',
    blurb: 'Royal-blue gradient backdrop, clean key, soft grain.',
    scene:
      'Studio set against a rich royal-blue to deep-navy vertical gradient backdrop with subtle film grain and a slight edge vignette, clean Y2K poster-portrait feel.',
    lighting:
      'A soft cool blue rim separating the subject from the backdrop, with a clean soft warm key on the face so features stay clearly and evenly lit, gentle 5200K balance, subtle authentic grain.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no neon clipping, no posterization, no harsh contrast on the face',
  }),
  preset({
    id: 'minimal_color',
    label: 'Bold Color Pop',
    category: 'Studio',
    blurb: 'Single bold solid-color backdrop.',
    scene:
      'Minimalist studio with a single bold solid-color seamless backdrop (vibrant but tasteful), clean floor, modern fashion-forward simplicity.',
    lighting:
      'Even soft key with a subtle gradient falloff on the backdrop and clean, flattering, evenly distributed light on the face, 5500K.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no banding on the backdrop, no harsh shadows',
  }),

  // ─────────────────────────── LIFESTYLE ───────────────────────────
  preset({
    id: 'cafe_lifestyle',
    label: 'Cozy Café',
    category: 'Lifestyle',
    blurb: 'Warm café window light, candid vibe.',
    scene:
      'Cozy modern café interior with warm wood tables, exposed brick, hanging Edison bulbs and a softly blurred espresso bar with greenery in the background.',
    lighting:
      'Soft warm window light from camera-left with gentle ambient bounce keeping the face evenly and warmly lit, cozy 4800K balance, natural falloff.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no clipped highlights, no cluttered foreground, no synthetic bokeh',
  }),
  preset({
    id: 'retro_wood_study',
    label: 'Retro Wood Study',
    category: 'Lifestyle',
    blurb: 'Walnut-panelled mid-century interior, warm window light.',
    scene:
      'A curated retro interior with warm walnut wood-grain wall paneling, green velvet curtains, a tobacco-leather mid-century chair, a simple side table and a soft floor lamp, with calm negative space and clean lines.',
    lighting:
      'Soft directional diffused window key from the left with warm tungsten practicals behind, keeping the face softly and evenly lit with gentle specular highlights, warm 4000-4800K, soft falloff.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no HDR, no glossy sheen, no clutter, no harsh shadows on the face',
  }),
  preset({
    id: 'luxury_interior',
    label: 'Luxury Interior',
    category: 'Lifestyle',
    blurb: 'Upscale hotel-lobby elegance.',
    scene:
      'An upscale hotel lobby / luxury interior with marble floors, warm architectural lighting, elegant furniture and softly blurred ambient detail.',
    lighting:
      'Warm ambient interior key with a soft directional fill so the face is evenly and flatteringly lit, refined low-contrast luxury lighting at 3600K warm.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no clutter, no harsh shadows on the face',
  }),

  // ─────────────────────────── OUTDOOR ───────────────────────────
  preset({
    id: 'golden_hour_field',
    label: 'Golden Hour Field',
    category: 'Outdoor',
    blurb: 'Warm sunset glow in open fields.',
    scene:
      'An open grassy field at golden hour with soft rolling hills, tall sunlit grass, a distant treeline, warm hazy atmosphere and gentle natural lens flare.',
    lighting:
      'A low warm sun creating a soft rim/hair glow, balanced by a soft frontal fill so the FACE is clearly and evenly lit (never a dark silhouette), golden 3400-3800K warmth.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no blown-out sky, no orange oversaturation, no haloing, no underexposed face',
  }),
  preset({
    id: 'canvas_backdrop_street',
    label: 'Canvas Studio Street',
    category: 'Editorial',
    blurb: 'Cream-gold canvas backdrop on a calm golden-hour street.',
    scene:
      'A tall vertical hand-rolled canvas backdrop of buttery cream-gold fabric printed with intricate pale-gold ornamental damask patterns, hung from above and rolling onto the ground, set on a calm city street at golden hour; warm asphalt with painted lane lines below and a deep cobalt-blue sky with wispy clouds above.',
    lighting:
      'Even directional golden-hour sunlight from camera-left with soft fill, keeping the face softly and evenly lit, warm glow on the canvas, no harsh contrast.',
    camera:
      'Medium portrait framed from roughly the waist/chest up so the FACE is large and sharp; medium-format film look with Kodak Portra-style grain, painterly soft-focus background, nostalgic magazine-spread mood, the garment clearly shown.',
    negativeBias: 'no warped architecture, no harsh contrast on the face',
  }),
  preset({
    id: 'rooftop_sunset',
    label: 'Rooftop Sunset',
    category: 'Outdoor',
    blurb: 'City rooftop against a sunset skyline.',
    scene:
      'A modern rooftop terrace at sunset with a softly blurred city skyline, glass railing and a warm ambient sky gradient from orange to deep blue.',
    lighting:
      'A warm directional sunset key with a soft cool ambient fill so the face stays clearly and evenly lit, balanced cinematic dusk lighting around 4200K.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no blown highlights, no haloing, no underexposed face',
  }),
  preset({
    id: 'beach_day',
    label: 'Bright Beach',
    category: 'Outdoor',
    blurb: 'Sunny coastline, breezy and fresh.',
    scene:
      'A bright beach with soft sand, gentle turquoise waves and a clear sky, breezy relaxed coastal atmosphere with soft background haze.',
    lighting:
      'Bright but DIFFUSED natural daylight with soft fill from sand bounce so the face is evenly lit and relaxed (no harsh squint, no hard nose shadow), airy feel at 5600K with warm skin rendering.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no harsh squinting, no blown-out sky, no hard facial shadows',
  }),

  // ─────────────────────────── URBAN ───────────────────────────
  preset({
    id: 'urban_street',
    label: 'Urban Street',
    category: 'Urban',
    blurb: 'City street, soft daylight, streetwear energy.',
    scene:
      'A contemporary city street with textured concrete walls, subtle graffiti, parked bikes and softly blurred pedestrians and storefronts in the background.',
    lighting:
      'Soft overcast daylight for even, flattering skin rendering on the face with a gentle directional bounce from the buildings, neutral 5600K.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no harsh midday shadows on the face',
  }),
  preset({
    id: 'y2k_flash_day',
    label: 'Y2K Daylight',
    category: 'Urban',
    blurb: 'Sunny sidewalk, casual Y2K street energy.',
    scene:
      'A sunlit city sidewalk with faint crosswalk paint and scattered asphalt grit, blue sky overhead and softly blurred urban edges, casual candid Y2K street energy.',
    lighting:
      'Bright daylight with a SOFT, gentle fill on the face (no harsh flat flash) so features stay clearly lit, a subtle nostalgic blue-and-warm color pop and light grain.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no harsh blown highlights, no flat washed-out flash on the face',
  }),
  preset({
    id: 'lofi_digicam',
    label: 'Urban Alley',
    category: 'Urban',
    blurb: 'Gritty alley, soft daylight, candid editorial.',
    scene:
      'A narrow urban alley between tall glass-and-metal buildings, green construction hoarding with weathered signage, gritty pavement and layered city depth receding behind.',
    lighting:
      'Soft, even overcast daylight gently illuminating the face with natural skin tones and a subtle ambient bounce from the walls, neutral 5600K — no harsh flash, no hard shadows.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no hard flash shadows, no heavy desaturation of the face',
  }),
  preset({
    id: 'film_snapshot_store',
    label: 'Corner Store',
    category: 'Urban',
    blurb: 'Convenience-store sidewalk, soft daylight, lived-in.',
    scene:
      'A gray urban sidewalk near a run-down convenience store entrance, a stickered post and gritty pavement in frame, bland softly out-of-focus signage and a pop of color from a red curb.',
    lighting:
      'Soft natural daylight with gentle even fill on the face and true-to-life skin tones, a faint nostalgic film tone and subtle soft shadow — no harsh flash, no washed-out exposure.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no harsh flash, no blown highlights, no heavy desaturation of the face',
  }),
  preset({
    id: 'euro_street_flash',
    label: 'European Street',
    category: 'Urban',
    blurb: 'Stately facade, soft daylight, fashion-forward.',
    scene:
      'A city sidewalk in front of a stately European building facade with classical detailing and muted, softly blurred street activity behind.',
    lighting:
      'Soft natural daylight with gentle directional modeling and even fill on the face, refined pastel-neutral greys and beiges, low contrast — no harsh flash.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no flat washed-out lighting, no warped architecture',
  }),
  preset({
    id: 'distressed_wall',
    label: 'Distressed Wall',
    category: 'Urban',
    blurb: 'Weathered cracked wall, warm muted daylight.',
    scene:
      'A textured, weathered urban wall with visible cracks, a peeling surface and characterful detail, warm muted bohemian atmosphere.',
    lighting:
      'Soft natural daylight creating a warm, muted palette with gentle directional modeling that keeps the face evenly and softly lit, low contrast.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no harsh flash, no hard facial shadows',
  }),
  preset({
    id: 'urban_night',
    label: 'Neon Night',
    category: 'Urban',
    blurb: 'Moody neon city night, face still clearly lit.',
    scene:
      'A night city street with glowing neon signage, wet reflective pavement and soft bokeh of car headlights and shop lights, cinematic urban atmosphere.',
    lighting:
      'Cinematic low-key mood with neon color accents (teal + magenta) in the background, BUT a clean, soft, even key light on the FACE so the features stay clearly visible and the identity holds — the face is never lost to colored shadow.',
    camera: FACE_FORWARD_CAMERA,
    negativeBias: 'no muddy facial shadows, no melted neon text, no colored cast hiding the face, no overexposed highlights',
  }),
  preset({
    id: 'foggy_underpass',
    label: 'Foggy Underpass',
    category: 'Editorial',
    blurb: 'Misty underpass, soft cool light, sharp clear face.',
    scene:
      'An urban underpass with metal railings and perforated mesh, faint graffiti hints and soft fog drifting through the background, a pale industrial skyline dissolving into soft negative space.',
    lighting:
      'Soft, diffused cool daylight with a clean soft key on the FACE so it stays sharp and clearly lit against the misty background; cold fog-white, charcoal and muted blue-gray palette with faint cream highlights, matte low-noise finish.',
    camera:
      'Medium portrait framed from roughly the waist/chest up with the FACE large, sharp and in clear focus while the fog softens the background; natural color, photographic matte finish, the garment clearly shown.',
    negativeBias: 'no blurry or foggy face, no underexposed face, no heavy grain',
  }),
]

export function getPhotoshootPreset(id: string | undefined | null): PhotoshootPreset | undefined {
  if (!id) return undefined
  return PHOTOSHOOT_PRESETS.find((p) => p.id === id)
}

/** Lightweight list for client UI (no heavy prompt text needed there). */
export const PHOTOSHOOT_PRESET_CARDS = PHOTOSHOOT_PRESETS.map((p) => ({
  id: p.id,
  label: p.label,
  category: p.category,
  blurb: p.blurb,
}))
