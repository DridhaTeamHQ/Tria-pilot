/**
 * PHOTOSHOOT PRESETS (Beta "Full Image Generation" mode)
 *
 * Curated, self-contained scene blueprints for the photoshoot generator.
 * Each preset describes a SCENE + LIGHTING + CAMERA the model should build
 * fresh around the person (new background, pose, and lighting) while keeping
 * the person's face/identity locked.
 *
 * Kept deliberately small and self-contained (no dependency on the older,
 * partly-dead preset modules) so the beta feature is easy to reason about.
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
  {
    id: 'studio_white',
    label: 'Clean White Studio',
    category: 'Studio',
    blurb: 'Seamless white backdrop, soft pro lighting.',
    scene:
      'Professional photo studio with a seamless white cyclorama, curved infinity wall meeting a polished white floor, smooth tonal gradient, shadowless horizon line.',
    lighting:
      'Large softbox front-left at 45°, matched fill front-right one stop lower, overhead silk for edge separation, neutral 5500K daylight.',
    camera: '85mm f/2.0, three-quarter to full-body framing, tack-sharp on the eyes, clean backdrop falloff.',
    negativeBias: 'no colored gels, no harsh shadows, no visible stands, no oversaturation, no plastic skin, no beauty filter',
  },
  {
    id: 'studio_editorial',
    label: 'Fashion Editorial',
    category: 'Editorial',
    blurb: 'High-end magazine studio with bold contrast.',
    scene:
      'High-end editorial studio with a white painted brick wall showing authentic mortar texture, polished concrete floor, spare architectural geometry and intentional negative space.',
    lighting:
      'Large diffused window-style key from frame-left for sculptural modeling, white-card bounce fill, narrow overhead strip for contour separation, 5400K daylight.',
    camera: '85-100mm f/2.8, editorial framing, clean geometry, shallow depth of field.',
    negativeBias: 'no cluttered props, no visible strobes, no harsh direct flash, no gaussian blur, no over-sharpening',
  },
  {
    id: 'cafe_lifestyle',
    label: 'Cozy Café',
    category: 'Lifestyle',
    blurb: 'Warm café window light, candid vibe.',
    scene:
      'Cozy modern café interior with warm wood tables, exposed brick, hanging Edison bulbs, a softly blurred espresso bar and greenery in the background.',
    lighting: 'Soft warm window light from camera-left, gentle ambient bounce, cozy 4800K tungsten-warm balance with natural falloff.',
    camera: '50mm f/1.8, waist-up candid framing, creamy natural bokeh, relaxed eye contact.',
    negativeBias: 'no harsh flash, no clipped highlights, no plastic skin, no synthetic bokeh, no cluttered foreground',
  },
  {
    id: 'golden_hour_field',
    label: 'Golden Hour Outdoors',
    category: 'Outdoor',
    blurb: 'Warm sunset glow in open fields.',
    scene:
      'Open grassy field at golden hour with soft rolling hills, tall sunlit grass, distant treeline, warm hazy atmosphere and gentle lens flare.',
    lighting: 'Low warm backlight from the setting sun creating a rim/hair glow, soft frontal fill, golden 3200-3800K warmth.',
    camera: '85mm f/1.8, three-quarter to full-body, backlit with warm bokeh, sharp on the eyes.',
    negativeBias: 'no blown-out sky detail, no orange oversaturation, no haloing, no plastic skin',
  },
  {
    id: 'urban_street',
    label: 'Urban Street',
    category: 'Urban',
    blurb: 'City street, daylight, streetwear energy.',
    scene:
      'Contemporary city street with textured concrete walls, subtle graffiti, parked bikes and softly blurred pedestrians and storefronts in the background.',
    lighting: 'Overcast soft daylight for even skin rendering, gentle directional bounce from buildings, neutral 5600K.',
    camera: '35mm f/2.8, full-body to three-quarter, street-photography framing with environmental context.',
    negativeBias: 'no harsh midday shadows, no license-plate text, no readable signage text, no distorted limbs',
  },
  {
    id: 'urban_night',
    label: 'Neon Night',
    category: 'Urban',
    blurb: 'Moody neon-lit city night.',
    scene:
      'Night city street with glowing neon signage, wet reflective pavement, bokeh of car headlights and shop lights, cinematic urban atmosphere.',
    lighting: 'Mixed neon color light (teal + magenta) with a soft key on the face, cinematic low-key contrast, 4000K with colored accents.',
    camera: '50mm f/1.4, waist-up, shallow depth, glowing background bokeh, sharp on the face.',
    negativeBias: 'no muddy shadows, no unreadable melted neon text, no plastic skin, no overexposed highlights',
  },
  {
    id: 'rooftop_sunset',
    label: 'Rooftop Sunset',
    category: 'Outdoor',
    blurb: 'City rooftop against a sunset skyline.',
    scene:
      'Modern rooftop terrace at sunset with a softly blurred city skyline, glass railing, warm ambient sky gradient from orange to deep blue.',
    lighting: 'Warm directional sunset key, cool sky ambient fill, balanced cinematic dusk lighting around 4200K.',
    camera: '85mm f/2.0, three-quarter framing, skyline bokeh behind the subject.',
    negativeBias: 'no blown highlights, no haloing, no oversaturated orange, no plastic skin',
  },
  {
    id: 'beach_day',
    label: 'Bright Beach',
    category: 'Outdoor',
    blurb: 'Sunny coastline, breezy and fresh.',
    scene:
      'Sunny beach with soft sand, gentle turquoise waves and a clear bright sky, breezy relaxed coastal atmosphere with soft background haze.',
    lighting: 'Bright natural sunlight with soft fill from sand bounce, airy high-key feel, 5800K with warm skin rendering.',
    camera: '50mm f/2.5, three-quarter to full-body, breezy candid framing.',
    negativeBias: 'no harsh squinting, no blown-out sky, no plastic skin, no oversaturation',
  },
  {
    id: 'luxury_interior',
    label: 'Luxury Interior',
    category: 'Lifestyle',
    blurb: 'Upscale hotel-lobby elegance.',
    scene:
      'Upscale hotel lobby / luxury interior with marble floors, warm architectural lighting, elegant furniture and softly blurred ambient detail.',
    lighting: 'Warm ambient interior key with soft directional fill, refined low-contrast luxury lighting at 3600K warm.',
    camera: '85mm f/2.0, three-quarter elegant framing, refined shallow depth.',
    negativeBias: 'no clutter, no harsh shadows, no plastic skin, no oversharpening',
  },
  {
    id: 'minimal_color',
    label: 'Bold Color Pop',
    category: 'Studio',
    blurb: 'Single bold solid-color backdrop.',
    scene:
      'Minimalist studio with a single bold solid-color seamless backdrop (vibrant but tasteful), clean floor, modern fashion-forward simplicity.',
    lighting: 'Even soft key with subtle gradient falloff on the backdrop, clean fashion lighting at 5500K.',
    camera: '85mm f/2.8, chest-up to three-quarter, crisp clean rendering.',
    negativeBias: 'no harsh shadows on backdrop, no banding, no plastic skin, no oversaturation of skin',
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
