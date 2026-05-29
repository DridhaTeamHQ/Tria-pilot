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
  /** Lighting blueprint */
  lighting: string
  /** Camera/lens guidance */
  camera: string
  /** Things to avoid */
  negativeBias: string
}

export const PHOTOSHOOT_PRESETS: PhotoshootPreset[] = [
  // ─────────────────────────── STUDIO ───────────────────────────
  {
    id: 'studio_white',
    label: 'Clean White Studio',
    category: 'Studio',
    blurb: 'Seamless white backdrop, soft pro lighting.',
    scene:
      'Professional photo studio with a seamless white cyclorama, curved infinity wall meeting a polished white floor, smooth tonal gradient, shadowless horizon line.',
    lighting:
      'Large softbox key front-left at 45°, matched fill front-right one stop lower, overhead silk for edge separation, neutral 5500K daylight, soft realistic falloff.',
    camera:
      'Shot on a full-frame camera, 85mm f/2.0, three-quarter waist-up (face large and clear, not a tiny full-body figure) framing, tack-sharp on the eyes, clean backdrop falloff, subtle natural grain.',
    negativeBias: 'no colored gels, no harsh shadows, no visible stands, no oversaturation, no plastic skin, no beauty filter, no CGI look',
  },
  {
    id: 'studio_editorial',
    label: 'Fashion Editorial',
    category: 'Editorial',
    blurb: 'High-end magazine studio, bold contrast.',
    scene:
      'High-end editorial studio with a white painted brick wall showing authentic mortar texture, polished concrete floor, spare architectural geometry and intentional negative space.',
    lighting:
      'Large diffused window-style key from frame-left for sculptural modeling, white-card bounce fill, narrow overhead strip for contour separation, 5400K daylight.',
    camera:
      'Medium-format editorial look, 85-100mm f/2.8, clean geometric framing, shallow depth of field, fine film grain, magazine-spread finish.',
    negativeBias: 'no cluttered props, no visible strobes, no harsh direct flash, no gaussian blur, no over-sharpening, no CGI look',
  },
  {
    id: 'blue_y2k_studio',
    label: 'Blue Y2K Studio',
    category: 'Studio',
    blurb: 'Royal-blue gradient, cool rim light, Y2K grain.',
    scene:
      'Studio set against a rich royal-blue to deep-navy vertical gradient backdrop with subtle film grain and a slight edge vignette, clean Y2K poster-portrait feel.',
    lighting:
      'Soft cool blue rim-light separating the subject from the backdrop, warm natural key on the skin for contrast, gentle 5200K balance with authentic grain.',
    camera:
      'Chest-up to three-quarter portrait, 85mm f/1.8, crisp on the eyes, nostalgic early-2000s film-grain texture and slight CRT warmth.',
    negativeBias: 'no neon clipping, no plastic skin, no posterization, no oversaturation, no CGI sheen',
  },
  {
    id: 'minimal_color',
    label: 'Bold Color Pop',
    category: 'Studio',
    blurb: 'Single bold solid-color backdrop.',
    scene:
      'Minimalist studio with a single bold solid-color seamless backdrop (vibrant but tasteful), clean floor, modern fashion-forward simplicity.',
    lighting: 'Even soft key with a subtle gradient falloff on the backdrop, clean fashion lighting at 5500K.',
    camera: '85mm f/2.8, chest-up to three-quarter, crisp clean rendering with natural skin texture.',
    negativeBias: 'no harsh shadows on backdrop, no banding, no plastic skin, no oversaturation of skin, no CGI look',
  },

  // ─────────────────────────── LIFESTYLE ───────────────────────────
  {
    id: 'cafe_lifestyle',
    label: 'Cozy Café',
    category: 'Lifestyle',
    blurb: 'Warm café window light, candid vibe.',
    scene:
      'Cozy modern café interior with warm wood tables, exposed brick, hanging Edison bulbs, a softly blurred espresso bar and greenery in the background.',
    lighting: 'Soft warm window light from camera-left, gentle ambient bounce, cozy 4800K tungsten-warm balance with natural falloff.',
    camera: '50mm f/1.8, waist-up candid framing, creamy natural bokeh, relaxed expression, subtle film grain.',
    negativeBias: 'no harsh flash, no clipped highlights, no plastic skin, no synthetic bokeh, no cluttered foreground',
  },
  {
    id: 'retro_wood_study',
    label: 'Retro Wood Study',
    category: 'Lifestyle',
    blurb: 'Walnut-panelled mid-century interior, warm window light.',
    scene:
      'Curated retro interior with warm walnut wood-grain wall paneling, green velvet curtains, a beige patterned rug, a tobacco-leather mid-century chair and a simple side table with a ceramic vase, purposeful negative space and clean architectural lines.',
    lighting:
      'Soft directional diffused window key from the left with warm tungsten practicals in the background, diffuse shadows, gentle specular highlights on leather and wool, soft falloff.',
    camera:
      '35-50mm portrait feel at eye level, moderate depth of field keeping the subject crisp while the interior stays readable, filmic finish with subtle grain and slightly lifted blacks.',
    negativeBias: 'no HDR, no glossy sheen, no clutter, no harsh shadows, no oversharpening, no CGI look',
  },
  {
    id: 'luxury_interior',
    label: 'Luxury Interior',
    category: 'Lifestyle',
    blurb: 'Upscale hotel-lobby elegance.',
    scene:
      'Upscale hotel lobby / luxury interior with marble floors, warm architectural lighting, elegant furniture and softly blurred ambient detail.',
    lighting: 'Warm ambient interior key with soft directional fill, refined low-contrast luxury lighting at 3600K warm.',
    camera: '85mm f/2.0, three-quarter elegant framing, refined shallow depth, natural skin texture.',
    negativeBias: 'no clutter, no harsh shadows, no plastic skin, no oversharpening, no CGI look',
  },

  // ─────────────────────────── OUTDOOR ───────────────────────────
  {
    id: 'golden_hour_field',
    label: 'Golden Hour Field',
    category: 'Outdoor',
    blurb: 'Warm sunset glow in open fields.',
    scene:
      'Open grassy field at golden hour with soft rolling hills, tall sunlit grass, a distant treeline, warm hazy atmosphere and gentle natural lens flare.',
    lighting: 'Low warm backlight from the setting sun creating a rim/hair glow, soft frontal fill, golden 3200-3800K warmth.',
    camera: '85mm f/1.8, three-quarter waist-up (face large and clear, not a tiny full-body figure), backlit with warm bokeh, sharp on the eyes, subtle film grain.',
    negativeBias: 'no blown-out sky, no orange oversaturation, no haloing, no plastic skin, no CGI look',
  },
  {
    id: 'canvas_backdrop_street',
    label: 'Canvas Studio Street',
    category: 'Editorial',
    blurb: 'Cream-gold canvas backdrop dropped on a golden-hour street.',
    scene:
      'A tall vertical hand-rolled canvas backdrop of buttery cream-gold fabric printed with intricate pale-gold ornamental damask patterns, hung from above and rolling forward onto the ground, set in the middle of an empty city street at golden hour; warm reddish-brown asphalt with painted white lane lines below, low concrete barriers and weathered warehouse walls at the frame edges, deep cobalt-blue late-afternoon sky with wispy clouds overhead.',
    lighting:
      'Even directional natural golden-hour sunlight from camera-left casting a soft long shadow, warm glow softening the canvas, no harsh contrast.',
    camera:
      'Medium-format film look (Pentax 67 / Mamiya 7), Kodak Portra 800 grain, painterly soft-focus background with sharp focus on the subject, centered symmetrical waist-up composition (face large and clear), nostalgic 90s magazine-spread mood.',
    negativeBias: 'no readable signage text, no warped architecture, no harsh midday contrast, no plastic skin, no CGI look',
  },
  {
    id: 'rooftop_sunset',
    label: 'Rooftop Sunset',
    category: 'Outdoor',
    blurb: 'City rooftop against a sunset skyline.',
    scene:
      'Modern rooftop terrace at sunset with a softly blurred city skyline, glass railing, and a warm ambient sky gradient from orange to deep blue.',
    lighting: 'Warm directional sunset key, cool sky ambient fill, balanced cinematic dusk lighting around 4200K.',
    camera: '85mm f/2.0, three-quarter framing, real skyline bokeh behind the subject, natural grain.',
    negativeBias: 'no blown highlights, no haloing, no oversaturated orange, no plastic skin, no CGI look',
  },
  {
    id: 'beach_day',
    label: 'Bright Beach',
    category: 'Outdoor',
    blurb: 'Sunny coastline, breezy and fresh.',
    scene:
      'Sunny beach with soft sand, gentle turquoise waves and a clear bright sky, breezy relaxed coastal atmosphere with soft background haze.',
    lighting: 'Bright natural sunlight with soft fill from sand bounce, airy high-key feel, 5800K with warm skin rendering.',
    camera: '50mm f/2.5, three-quarter waist-up (face large and clear, not a tiny full-body figure), breezy candid framing, subtle grain.',
    negativeBias: 'no harsh squinting, no blown-out sky, no plastic skin, no oversaturation, no CGI look',
  },

  // ─────────────────────────── URBAN ───────────────────────────
  {
    id: 'urban_street',
    label: 'Urban Street',
    category: 'Urban',
    blurb: 'City street, soft daylight, streetwear energy.',
    scene:
      'Contemporary city street with textured concrete walls, subtle graffiti, parked bikes and softly blurred pedestrians and storefronts in the background.',
    lighting: 'Overcast soft daylight for even skin rendering, gentle directional bounce from buildings, neutral 5600K.',
    camera: '35mm f/2.8, three-quarter waist-up framing (face large and clear, not a tiny full-body figure), street-photography environmental context, subtle grain.',
    negativeBias: 'no harsh midday shadows, no readable signage or license-plate text, no distorted limbs, no CGI look',
  },
  {
    id: 'y2k_flash_day',
    label: 'Y2K Daylight Flash',
    category: 'Urban',
    blurb: 'Sunny sidewalk, on-camera flash, Y2K pop.',
    scene:
      'A sunlit city sidewalk with faint crosswalk paint and scattered asphalt grit, blue sky overhead and blurred urban edges in the background, candid street energy.',
    lighting:
      'Bold midday daylight combined with direct on-camera flash fill on the skin, deep crisp sidewalk shadows, punchy blue-and-red color pop.',
    camera:
      'Point-and-shoot wide-angle shot from close range, slight film grain, bold Y2K daylight-flash street-style portrait energy.',
    negativeBias: 'no plastic skin, no muddy shadows, no readable text, no over-smoothing, no CGI look',
  },
  {
    id: 'lofi_digicam',
    label: 'Urban Alley',
    category: 'Urban',
    blurb: 'Gritty alley, soft daylight, candid editorial.',
    scene:
      'A narrow urban alley between tall glass-and-metal buildings, green construction hoarding with weathered signage and gritty pavement, layered city depth receding behind.',
    lighting:
      'Soft, even overcast daylight gently and evenly illuminating the face with natural skin tones, subtle ambient bounce from the surrounding walls, neutral 5600K. No harsh flash, no hard shadows.',
    camera:
      'Casual editorial framing, 50mm, natural true-to-life color with a touch of fine grain, the face clearly and softly lit — candid street-photography feel without any washed-out flash look.',
    negativeBias: 'no harsh on-camera flash, no hard flash shadows, no blown highlights, no heavy desaturation, no flattened/washed-out face, no plastic skin, no readable signage text, no CGI look',
  },
  {
    id: 'film_snapshot_store',
    label: 'Corner Store',
    category: 'Urban',
    blurb: 'Convenience-store sidewalk, soft daylight, lived-in.',
    scene:
      'A gray urban sidewalk near a run-down convenience store entrance, a stickered post and gritty pavement in frame, bland softly out-of-focus signage and a pop of color from a red curb.',
    lighting:
      'Soft natural daylight with gentle, even fill on the face and true-to-life skin tones, a faint nostalgic film tone, subtle soft shadow. No harsh flash, no washed-out exposure.',
    camera:
      'Relaxed candid framing slightly off-axis, 35-50mm, fine grain and light vignette for a lived-in documentary vibe while keeping the face clearly and softly resolved.',
    negativeBias: 'no harsh on-camera flash, no blown highlights, no heavy desaturation, no flattened/washed-out face, no plastic skin, no readable text, no CGI look',
  },
  {
    id: 'euro_street_flash',
    label: 'European Street',
    category: 'Urban',
    blurb: 'Stately facade, soft daylight, fashion-forward.',
    scene:
      'A city sidewalk in front of a stately European building facade with classical detailing and muted, softly blurred street activity behind.',
    lighting:
      'Soft natural daylight with gentle directional modeling and even fill on the face, refined pastel-neutral greys and beiges, low contrast. No harsh flash.',
    camera:
      'Three-quarter editorial framing, 50-85mm, natural true-to-life color with subtle grain, the face clearly and softly lit, nostalgic fashion-magazine mood.',
    negativeBias: 'no harsh on-camera flash, no flat washed-out lighting, no heavy desaturation, no plastic skin, no readable signage text, no warped architecture, no CGI look',
  },
  {
    id: 'distressed_wall',
    label: 'Distressed Wall',
    category: 'Urban',
    blurb: 'Weathered cracked wall, warm muted daylight.',
    scene:
      'A textured, weathered urban wall with visible cracks, peeling surface and exposed wires, gritty and characterful, warm muted bohemian atmosphere.',
    lighting: 'Soft natural daylight creating a warm, muted color palette, gentle directional modeling, low contrast.',
    camera: 'Medium shot at eye level, 50mm feel, natural skin texture, warm muted fashion-forward editorial grade with subtle grain.',
    negativeBias: 'no harsh flash, no oversaturation, no plastic skin, no clean studio look, no CGI look',
  },
  {
    id: 'foggy_underpass',
    label: 'Foggy Underpass',
    category: 'Editorial',
    blurb: 'Misty underpass, cold diffusion, introspective.',
    scene:
      'An urban underpass with empty metal railings and perforated mesh, faint graffiti hints, dense ethereal fog swallowing a cracked pale industrial skyline into soft negative space.',
    lighting:
      'Mist as the main light modifier: dense pale daylight glowing from behind, opening highlights, flattening blacks, minimal shadow and indefinite soft edges; cold fog-white, charcoal, slate and muted blue-gray palette with faint cream highlights.',
    camera:
      'Eye-level medium-wide framing, heavy atmospheric diffusion, photographic matte low-noise finish with early-digital softness, smooth gradients, subtle vignette, no film grain.',
    negativeBias: 'no warm tones, no harsh sun, no plastic skin, no heavy grain, no CGI look',
  },
  {
    id: 'urban_night',
    label: 'Neon Night',
    category: 'Urban',
    blurb: 'Moody neon-lit city night.',
    scene:
      'Night city street with glowing neon signage, wet reflective pavement, bokeh of car headlights and shop lights, cinematic urban atmosphere.',
    lighting: 'Mixed neon color light (teal + magenta) with a soft key on the face, cinematic low-key contrast, 4000K with colored accents.',
    camera: '50mm f/1.4, waist-up, shallow depth, glowing real background bokeh, sharp on the face.',
    negativeBias: 'no muddy shadows, no unreadable melted neon text, no plastic skin, no overexposed highlights, no CGI look',
  },
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
