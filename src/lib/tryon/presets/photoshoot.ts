/**
 * CURATED SCENE PRESETS - INSTAGRAM-READY
 *
 * Each preset describes an EMPTY environment with concrete scene elements,
 * physically plausible lighting, and explicit negative bias constraints.
 */

import type { ScenePreset } from './india'

const STUDIO_PRESETS: ScenePreset[] = [
  {
    id: 'studio_white',
    label: 'Seamless White Studio',
    category: 'lifestyle',
    region: 'global',
    scene: 'Professional photo studio with seamless white cyclorama, curved infinity wall, polished white epoxy floor, and no visible equipment in frame.',
    lighting: 'Key: large softbox front-left at 45 degrees. Fill: matched softbox front-right at lower power. Rim: overhead diffusion panel for gentle edge lift. Neutral 5400-5600K with soft floor bounce and controlled highlights.',
    camera: '85mm portrait lens, chest-up to full-body framing, shallow depth of field with clean backdrop falloff.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No colored gels, no harsh shadows, no visible stands or cables, no oversaturation, no plastic skin texture.'
  },
  {
    id: 'studio_cream',
    label: 'Warm Cream Backdrop',
    category: 'lifestyle',
    region: 'global',
    scene: 'Warm cream seamless paper backdrop with visible paper grain, matte floor with natural scuff variation, and practical studio minimalism.',
    lighting: 'Key: broad diffused source from camera-left. Fill: cream wall bounce on camera-right with realistic contrast retention. Rim: gentle top spill for shoulder separation. Warm-neutral 4800-5100K with true skin texture.',
    camera: '85mm portrait lens, three-quarter framing, medium-deep focus preserving backdrop texture and garment edges.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No cool blue cast, no hard specular flash, no clipped highlights, no heavy orange grade, no synthetic bokeh wash.'
  },
  {
    id: 'studio_editorial',
    label: 'Fashion Editorial Studio',
    category: 'lifestyle',
    region: 'global',
    scene: 'High-end editorial studio with white painted brick or plaster wall options, polished concrete floor, and sparse directional-set styling.',
    lighting: 'Key: diffused directional window source from frame-left. Fill: controlled bounce preserving pore-level and fabric detail in shadows. Rim: narrow overhead edge for contour separation. Daylight balance 5300-5600K with realistic micro-contrast.',
    camera: '85-100mm editorial framing with clean geometry and legible background material texture.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No cluttered props, no visible strobes, no hard paparazzi flash, no excessive sharpening, no fake depth blur.'
  },
]

const LIFESTYLE_PRESETS: ScenePreset[] = [
  {
    id: 'lifestyle_cafe',
    label: 'Modern Cafe',
    category: 'lifestyle',
    region: 'india',
    scene: 'Contemporary Indian cafe with exposed brick accent wall, light wood tables, matte stone floor, pendant fixtures, and a window-side plant near the storefront glass.',
    lighting: 'Key: window daylight from left storefront glazing. Fill: pendant spill and warm interior wall bounce. Rim: subtle practical edge from hanging lights. Warm-neutral 4800-5200K with no fluorescent green cast.',
    camera: '50mm eye-level framing, standing or seated three-quarter composition, natural cafe depth blur.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No messy tabletops, no neon tint, no flat front lighting, no pasted-subject look.'
  },
  {
    id: 'lifestyle_living_room',
    label: 'Modern Living Room',
    category: 'home',
    region: 'india',
    scene: 'Contemporary living room with floor-to-ceiling windows, neutral sofa, warm wooden floorboards, sheer curtains, one accent plant, and tidy side surfaces.',
    lighting: 'Key: broad window daylight from left through sheer curtains. Fill: warm wall and ceiling bounce to hold shadow detail. Rim: rear window spill for soft silhouette edge. Balanced warm daylight around 4900-5300K.',
    camera: '50mm eye-level, three-quarter body framing, natural deep focus with clear room materials and no blur wall effect.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No overhead fluorescent dominance, no clutter, no competing mixed light sources, no sticker-edge compositing, no synthetic background blur.'
  },
]

const OUTDOOR_PRESETS: ScenePreset[] = [
  {
    id: 'outdoor_golden_hour',
    label: 'Golden Hour Walkway',
    category: 'outdoor',
    region: 'global',
    scene: 'Clean promenade with warm paving stones, low safety railing, distant trees, and open sunset sky with soft cloud texture.',
    lighting: 'Key: low sun from camera-left near horizon. Fill: open-sky ambient from opposite side. Rim: warm back edge on shoulders and hair. Golden-hour mix around 3500-4500K with long natural shadows.',
    camera: '85mm portrait lens, three-quarter body, sunset bokeh layers in background.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No crowds, no harsh midday light, no crushed blacks, no overcooked orange saturation.'
  },
  {
    id: 'outdoor_beach',
    label: 'Beach Evening',
    category: 'outdoor',
    region: 'india',
    scene: 'Indian shoreline with fine warm sand, gentle shoreline foam, sparse footprints, and horizon sky gradient from amber to blue.',
    lighting: 'Key: sunset source from rear-side angle. Fill: sky dome and sand bounce to open facial shadows. Rim: warm sun edge from horizon line. Mixed 3800-5200K balance between warm skin and cool sky.',
    camera: '50mm lens, three-quarter framing with visible ocean horizon and depth.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No beach crowd clutter, no umbrellas near subject, no harsh direct noon sun, no unrealistic teal-orange push.'
  },
  {
    id: 'outdoor_park',
    label: 'Morning Park',
    category: 'outdoor',
    region: 'india',
    scene: 'Maintained park with trimmed lawn, paved walking path, mature trees, wooden benches, and light morning mist over ground surfaces.',
    lighting: 'Key: low morning sun filtered by tree canopy. Fill: grass and path bounce for gentle under-shadow lift. Rim: dappled backlight through leaves. Natural 4300-5200K with soft mist diffusion and true greens.',
    camera: '50mm environmental framing with visible foreground-midground-background park depth.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No crowded pathways, no neon greens, no hard midday overhead, no synthetic CGI foliage texture.'
  },
]

const URBAN_PRESETS: ScenePreset[] = [
  {
    id: 'urban_rooftop_day',
    label: 'Rooftop Terrace Day',
    category: 'outdoor',
    region: 'india',
    scene: 'Modern rooftop terrace with glass railing, clean concrete deck, potted plants, minimalist outdoor seating, and open skyline backdrop.',
    lighting: 'Key: open daylight from high front-left with mild cloud diffusion. Fill: concrete floor and glass railing bounce. Rim: subtle skyline back edge. Neutral-cool 5500-6000K with clean daylight contrast.',
    camera: '48mm smartphone-equivalent perspective, lifestyle standing composition with skyline depth.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No rooftop clutter, no industrial tanks, no flat overcast haze, no clipped sky highlights.'
  },
  // Removed: urban_street_dusk — dual color temperature (3200K+6800K) forces face recoloring
]

const CELEBRATION_PRESETS: ScenePreset[] = [
  {
    id: 'celebration_festive',
    label: 'Festive Evening',
    category: 'lifestyle',
    region: 'india',
    scene: 'Festive interior with marigold floral accents, brass diyas, candle points at multiple depths, silk drapes, and polished floor reflecting warm practicals.',
    lighting: 'Key: clustered diya and candle practicals near foreground plane. Fill: warm reflected bounce from drapes and walls. Rim: string-light back edge producing soft bokeh halos. Warm 2600-3200K festive color temperature with controlled highlights.',
    camera: '50mm eye-level framing, chest-up to three-quarter composition with layered festive bokeh.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No harsh direct flash, no garish decoration overload, no plastic decor texture, no flat single-source illumination.'
  },
]

const CASUAL_PRESETS: ScenePreset[] = [
  {
    id: 'casual_mirror_selfie',
    label: 'Mirror Selfie',
    category: 'lifestyle',
    region: 'india',
    scene: 'Bedroom or wardrobe mirror corner with visible frame edge, neutral painted wall, clean tiled or wood floor, and everyday home objects kept minimal.',
    lighting: 'Key: window side light reflected in mirror from camera-left. Fill: soft room bounce plus weak ceiling practical. Rim: faint rear practical edge. Mixed indoor 3800-4600K with authentic phone-capture realism.',
    camera: '26mm smartphone wide lens, handheld mirror perspective, slight natural tilt.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No pro studio setup, no perfect symmetry, no beauty-portrait framing, no synthetic mirror-clean CGI look.'
  },
  {
    id: 'casual_street_candid',
    label: 'Street Candid',
    category: 'street',
    region: 'india',
    scene: 'Clean sidewalk lane with textured wall, muted storefront depth, smooth pavement, and sparse background traffic blur.',
    lighting: 'Key: soft side light from overcast sky corridor. Fill: pavement and wall bounce to keep natural facial shadow detail. Rim: faint ambient from open street end. Neutral daylight around 5200-5800K.',
    camera: '48mm smartphone main camera, eye-level casual framing with natural portrait depth.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No fashion-runway posing, no dramatic theatrical lighting, no HDR halos, no over-smoothed street textures.'
  },
]

const EXTENDED_PRESETS: ScenePreset[] = [
  // ─── SAFE EXTENDED PRESETS ─────────────────────────────────────────────────
  // Only presets with natural/neutral lighting and standard camera angles.
  // Removed 18 presets that caused face drift due to:
  //   - Colored gels/backdrops bleeding onto face (crimson, green-red, orange, red)
  //   - Night mixed-color-temp lighting (gas station, fast-food, dusk, night garden)
  //   - Unusual angles warping face geometry (fisheye, drone aerial, low-frame)
  //   - B&W conversion reprocessing skin tones
  //   - Hard directional light creating face shadows (beam split, court sun, dark study)
  //   - Mirror reflection physics complicating identity
  //   - High-contrast flash overriding face detail (mafia office, newspaper set)
  // ──────────────────────────────────────────────────────────────────────────
  /*
  {
    id: 'golden_hour_bedroom',
    label: 'Golden Hour Bed (Blinds)',
    category: 'home',
    region: 'global',
    scene: 'Cozy bedroom with wrinkled off-white linen bedding, slatted blinds on side window, matte painted walls, and minimal bedside clutter.',
    lighting: 'Key: low golden sun passing through blinds creating stripe pattern. Fill: soft wall bounce preserving shadow detail in bedding folds. Rim: narrow warm edge from blind slits. Warm 3400-4200K with natural falloff.',
    camera: 'Top-down selfie POV with deep-to-moderate focus; keep bedding texture and room context legible, subtle grain only.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No hard overhead flash, no cold blue cast, no perfectly flat bedding, no sterile hotel-room look.'
  },
  {
    id: 'studio_gray_flash',
    label: 'Gray Flash Editorial',
    category: 'lifestyle',
    region: 'global',
    scene: 'Gray gradient studio backdrop with clean matte floor, no props, and visible tonal roll-off from center to edges.',
    lighting: 'Key: direct frontal flash for crisp detail. Fill: low ambient bounce from gray floor and backdrop. Rim: gentle side kicker to separate garment edges. Neutral 5200-5600K with analog-like grain tolerance.',
    camera: '85mm chest-up to mid-shot framing, shallow depth.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No soft beauty flattening, no pastel haze, no overexposed forehead hotspots, no plastic texture.'
  },
  {
    id: 'lifestyle_airport_terminal',
    label: 'Airport Travel Candid',
    category: 'travel',
    region: 'global',
    scene: 'Airport concourse with floor-to-ceiling glass, visible tarmac activity, brushed metal columns, handrails, rolling luggage, and polished tile walkways.',
    lighting: 'Key: broad overcast daylight through glass walls. Fill: reflective bounce from tile floor and metal surfaces. Rim: back-side window edge on silhouette. Cool-neutral 5200-6200K with soft travel-documentary contrast.',
    camera: 'Smartphone-style mid-shot with slight tilt and off-center framing.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No catalog-style posing, no flash hotspot look, no overly saturated airport signage, no fake motion blur artifacts.'
  },
  {
    id: 'lifestyle_tropical_patio',
    label: 'Tropical Patio Lunch',
    category: 'lifestyle',
    region: 'global',
    scene: 'Upscale patio dining area with dark green umbrella canopy, marble-pattern table surface, white dishware, food bowl, glassware, and dense tropical foliage behind.',
    lighting: 'Key: soft shaded daylight under umbrella. Fill: table and light stone surfaces bouncing neutral light upward. Rim: bright sunlit foliage edge behind subject separation. Mixed 4500-6000K with shaded foreground and bright background contrast.',
    camera: 'Smartphone medium close-up from slight high angle with food props in foreground.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No empty table, no sterile studio ambiance, no over-sharpened food details, no flat one-zone exposure.'
  },
  {
    id: 'lifestyle_european_bench',
    label: 'European Street Bench',
    category: 'travel',
    region: 'global',
    scene: 'European sidewalk with stone facades, wrought-iron balconies, wooden bench, cafe details, and textured paving stones.',
    lighting: 'Key: soft directional daylight from open street side. Fill: stone wall and pavement bounce to keep tonal continuity. Rim: subtle back edge from sky opening at street end. Neutral-warm 5000-5700K.',
    camera: 'Phone-style seated three-quarter composition, casual off-center travel framing.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No aggressive HDR, no heavy crowd congestion, no over-posed stance, no unrealistic architectural blur.'
  },
  {
    id: 'home_cozy_teddy_selfie',
    label: 'Cozy Teddy Selfie',
    category: 'home',
    region: 'global',
    scene: 'Apartment living-room couch with textured throw blanket, pastel cushion accents, neutral wall, and natural lived-in scale.',
    lighting: 'Key: diffused window-style light at 45 degrees camera-left. Fill: couch fabric bounce preserving skin texture and plush fiber detail. Rim: mild ambient wrap from room walls.',
    camera: 'Front-facing selfie perspective with realistic phone optics; subject and nearby props sharp, background detail present without blur smearing.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No over-smoothed pores, no CGI plush texture, no waxy fabric, no fake portrait-mode blur.'
  },
  {
    id: 'travel_scene_lock_realism',
    label: 'Travel Scene Lock',
    category: 'travel',
    region: 'global',
    scene: 'Travel location remains fixed from source: consistent architecture, road/floor geometry, and environmental objects in true perspective.',
    lighting: 'Key/fill/rim must match the original travel scene exactly, preserving source light direction and shadow behavior on all surfaces.',
    camera: 'Preserve source camera perspective and depth behavior with natural deep focus and crisp environmental detail.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No scene replacement, no perspective drift, no extra people, no fake depth blur or bokeh overlays.'
  },
  */
  {
    id: 'studio_white_brick_bench',
    label: 'White Brick Bench Studio',
    category: 'lifestyle',
    region: 'global',
    scene: 'Minimal white brick wall studio with dark bench seating and matte light floor, clean architectural geometry and neutral tone control.',
    lighting: 'Key: broad diffused front source. Fill: wall and floor bounce for gentle tonal continuity. Rim: subtle side contour to maintain body separation from wall.',
    camera: '35-50mm symmetric editorial composition with deep focus across wall texture and seating.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No overexposed wall clipping, no hazy blur haze, no artificial texture smoothing.'
  },
]

export const PHOTOSHOOT_PRESETS: ScenePreset[] = [
  ...STUDIO_PRESETS,
  ...LIFESTYLE_PRESETS,
  ...OUTDOOR_PRESETS,
  ...URBAN_PRESETS,
  ...CELEBRATION_PRESETS,
  ...CASUAL_PRESETS,
  ...EXTENDED_PRESETS,
]

function validatePhotoshootPresetDataset(presets: ScenePreset[]): void {
  const ids = new Set<string>()
  for (const preset of presets) {
    if (!preset.id?.trim()) throw new Error('Preset dataset error: preset id is empty')
    if (ids.has(preset.id)) throw new Error(`Preset dataset error: duplicate preset id "${preset.id}"`)
    ids.add(preset.id)
    if (!preset.scene?.trim()) throw new Error(`Preset dataset error: scene missing for "${preset.id}"`)
    if (!preset.lighting?.trim()) throw new Error(`Preset dataset error: lighting missing for "${preset.id}"`)
    if (!preset.camera?.trim()) throw new Error(`Preset dataset error: camera missing for "${preset.id}"`)
    if (!preset.negative_bias?.trim()) throw new Error(`Preset dataset error: negative_bias missing for "${preset.id}"`)
    const lightingLower = preset.lighting.toLowerCase()
    const hasLightingStructure =
      lightingLower.includes('key') &&
      (lightingLower.includes('fill') || lightingLower.includes('ambient')) &&
      (lightingLower.includes('rim') || lightingLower.includes('edge'))
    if (!hasLightingStructure) {
      throw new Error(
        `Preset dataset error: lighting blueprint must specify key/fill/rim structure for "${preset.id}"`
      )
    }
  }
}

validatePhotoshootPresetDataset(PHOTOSHOOT_PRESETS)

export function getPhotoshootPreset(id: string): ScenePreset | undefined {
  return PHOTOSHOOT_PRESETS.find(p => p.id === id)
}

export function getPhotoshootPresetsByCategory(category: ScenePreset['category']): ScenePreset[] {
  return PHOTOSHOOT_PRESETS.filter(p => p.category === category)
}

export function getPhotoshootPresetIds(): string[] {
  return PHOTOSHOOT_PRESETS.map(p => p.id)
}
