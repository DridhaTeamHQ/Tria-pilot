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
    scene: 'Professional photo studio with seamless white cyclorama, curved infinity wall creating a shadowless horizon, polished white epoxy floor with subtle reflections, and absolutely no visible equipment, cables, or stands in frame. The backdrop should feel infinite with a smooth gradient from pure white to light grey at the edges.',
    lighting: 'Key: large 4-foot softbox positioned front-left at 45 degrees creating soft, wrap-around illumination. Fill: matched softbox front-right at 1-stop lower power for gentle shadow fill. Rim: overhead silk diffusion panel providing delicate edge separation. Color temperature precisely 5400-5600K neutral daylight with controlled floor bounce and zero specular hotspots on skin.',
    camera: '85mm f/1.8 portrait lens, chest-up to full-body framing with subject at optimal distance for natural perspective. Shallow depth of field with clean backdrop falloff. Sharp focus on eyes with gentle bokeh transition. ISO 200, 1/200s shutter.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No colored gels, no harsh contrasty shadows, no visible stands or cables, no oversaturation, no plastic skin texture, no beauty filter smoothing, no HDR artifacts, no lens flare.'
  },
  {
    id: 'studio_cream',
    label: 'Warm Cream Backdrop',
    category: 'lifestyle',
    region: 'global',
    scene: 'Warm cream seamless paper backdrop with visible paper grain and natural fiber texture, matte concrete or wood floor with authentic scuff variation and wear marks, minimal studio props. The backdrop should show realistic paper roll curvature at floor transition.',
    lighting: 'Key: broad 3-foot diffused source from camera-left creating gentle directional modeling. Fill: cream wall bounce on camera-right preserving realistic shadow contrast without lifting too much. Rim: gentle overhead spill creating subtle shoulder and hair separation. Warm-neutral 4800-5100K emphasizing natural warm skin undertones with true texture retention.',
    camera: '85mm f/2.0 portrait lens, three-quarter framing from chest to knees. Medium-deep focus preserving backdrop paper texture and garment edge detail. Natural perspective without wide-angle distortion. ISO 160, balanced exposure.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No cool blue cast, no hard specular flash bouncing off paper, no clipped highlights on cheekbones, no heavy orange color grade, no synthetic bokeh wash, no skin smoothing.'
  },
  {
    id: 'studio_editorial',
    label: 'Fashion Editorial Studio',
    category: 'lifestyle',
    region: 'global',
    scene: 'High-end editorial studio with white painted brick or hand-troweled plaster wall showing authentic texture, polished concrete floor with visible aggregate pattern, sparse directional set styling with maybe one architectural element. The space should feel minimal, intentional, and curated.',
    lighting: 'Key: large diffused directional window-style source from frame-left creating sculptural facial modeling. Fill: controlled white card bounce preserving pore-level skin detail and fabric weave in shadows. Rim: narrow overhead strip light for precise contour separation on shoulders and jawline. Daylight balance 5300-5600K with editorial micro-contrast and realistic shadow falloff.',
    camera: '85-100mm f/2.8 editorial framing with clean geometry, legible background material texture, and architectural precision. Subject positioned with intentional negative space. Sharp throughout garment detail.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No cluttered props, no visible strobes or light stands, no harsh direct flash creating raccoon eyes, no excessive capture sharpening, no fake gaussian depth blur, no retouched poreless skin.'
  },
]

const LIFESTYLE_PRESETS: ScenePreset[] = [
  {
    id: 'lifestyle_cafe',
    label: 'Modern Cafe',
    category: 'lifestyle',
    region: 'india',
    scene: 'Contemporary Indian cafe with exposed red-brown brick accent wall showing mortar texture, light oak wood tables with visible grain, matte terrazzo or stone floor, brass and black metal pendant light fixtures, and a lush monstera plant near the storefront glass window. Coffee cups and a small dessert plate visible on the table surface.',
    lighting: 'Key: soft natural daylight streaming through left storefront glazing creating directional warmth. Fill: pendant fixture spill and warm interior masonry wall bounce holding facial shadow detail. Rim: subtle practical warm edge from hanging Edison fixtures. Warm-neutral 4800-5200K with no fluorescent green cast and natural interior ambiance.',
    camera: '50mm f/2.0 eye-level framing, standing or seated three-quarter composition (waist to head). Natural cafe depth rendering with blurred background patrons and fixtures. Smartphone-quality casual feel with intentional composition. ISO 400 indoor ambient.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No messy tabletops with scattered items, no neon color tint, no flat front-on lighting destroying depth, no pasted-on subject look with mismatched shadows, no harsh overhead spots.'
  },
  {
    id: 'lifestyle_living_room',
    label: 'Modern Living Room',
    category: 'home',
    region: 'india',
    scene: 'Contemporary living room with floor-to-ceiling windows showing a soft cityscape beyond, neutral linen sofa with throw pillows, warm oak hardwood floorboards with visible wood grain, sheer white curtains gently filtering light, one large fiddle-leaf fig plant in a ceramic planter, and clean side surfaces with minimal decor.',
    lighting: 'Key: broad soft window daylight from left through sheer curtains creating diffused directional light. Fill: warm off-white wall and ceiling bounce holding shadow detail on face and body. Rim: rear window spill creating a soft luminous edge separating subject from background. Balanced warm daylight around 4900-5300K with residential warmth.',
    camera: '50mm f/2.0 eye-level, three-quarter body framing. Natural deep focus with clear room materials visible — wood grain, fabric texture, plant leaves. No heavy background blur; room should feel real and lived-in.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No overhead fluorescent dominance creating green cast, no clutter or mess, no competing mixed-temperature light sources, no sticker-edge compositing artifacts, no synthetic portrait-mode blur destroying room context.'
  },
]

const OUTDOOR_PRESETS: ScenePreset[] = [
  {
    id: 'outdoor_golden_hour',
    label: 'Golden Hour Walkway',
    category: 'outdoor',
    region: 'global',
    scene: 'Clean waterfront promenade with warm honey-toned paving stones, low brushed-steel safety railing, distant mature trees with backlit foliage, and expansive sunset sky with layered soft cirrus cloud texture painted in gold and peach tones. Ocean or lake visible beyond railing.',
    lighting: 'Key: low warm sun positioned camera-left near horizon casting long directional shadows. Fill: open sky ambient from opposite side providing cool-toned shadow fill. Rim: warm golden back edge wrapping around shoulders, hair, and garment edges. Golden-hour color mix around 3500-4500K with natural long shadows and warm skin glow.',
    camera: '85mm f/1.8 portrait lens, three-quarter body framing from knees up. Beautiful sunset bokeh layers in background with golden circles from distant lights. Focus locked on subject with dreamy atmospheric separation. ISO 200.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No crowds or other people, no harsh midday overhead light, no crushed black shadows, no overcooked orange saturation turning skin unnatural, no fake lens flare overlays.'
  },
  {
    id: 'outdoor_beach',
    label: 'Beach Evening',
    category: 'outdoor',
    region: 'india',
    scene: 'Indian coastline with fine warm golden sand showing natural ripple patterns, gentle turquoise shoreline foam lapping at the beach, sparse footprints leading away, and a dramatic horizon sky gradient transitioning from deep amber through salmon to steel blue. Distant fishing boats or rock formations for depth.',
    lighting: 'Key: setting sun positioned at rear-side angle creating a warm rim-lit silhouette outline. Fill: sky dome light and sand bounce opening up facial shadows with warm reflected glow. Rim: warm sun edge from horizon line creating hair and shoulder luminance. Mixed 3800-5200K balance between warm skin tones and cool sky atmosphere.',
    camera: '50mm f/2.0 lens, three-quarter framing with visible ocean horizon line and foreground sand texture providing depth. Subject positioned using rule of thirds against the dramatic sky.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No beach crowd clutter or other people, no beach umbrellas near subject, no harsh direct noon sun creating squinting, no unrealistic teal-orange color push, no HDR tonemapping.'
  },
  {
    id: 'outdoor_park',
    label: 'Morning Park',
    category: 'outdoor',
    region: 'india',
    scene: 'Well-maintained urban park with trimmed emerald lawn showing morning dew, paved stone walking path with visible wear, mature banyan or neem trees with textured bark, wooden park benches with iron armrests, and light morning mist hovering low over ground surfaces. Distant joggers as tiny background elements.',
    lighting: 'Key: low morning sun filtered through tree canopy creating dappled light patterns. Fill: grass and path bounce providing gentle under-shadow lift with green-reflected warmth. Rim: dappled warm backlight through leaves creating bokeh spots. Natural 4300-5200K with soft mist diffusion and true saturated greens.',
    camera: '50mm f/2.8 environmental framing with visible foreground-midground-background depth through the park. Path leading into frame creates natural composition. Deep focus keeping trees and park features recognizable.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No crowded pathways, no neon-bright artificial greens, no hard midday overhead light, no synthetic CGI foliage texture, no oversaturated processing.'
  },
]

const URBAN_PRESETS: ScenePreset[] = [
  {
    id: 'urban_rooftop_day',
    label: 'Rooftop Terrace Day',
    category: 'outdoor',
    region: 'india',
    scene: 'Modern high-rise rooftop terrace with frameless glass railing, clean light concrete deck with expansion joints visible, manicured potted plants in geometric planters, minimalist outdoor teak lounge seating, and a sweeping city skyline backdrop with buildings at varying distances. Clear blue sky with wispy clouds.',
    lighting: 'Key: open daylight from high front-left with mild cloud diffusion softening shadows. Fill: concrete floor and glass railing bounce creating gentle uplight. Rim: subtle skyline back edge separating subject from buildings. Neutral-cool 5500-6000K with clean urban daylight contrast and crisp shadow definition.',
    camera: '35-50mm smartphone-equivalent perspective, lifestyle standing composition with skyline providing dramatic background depth. Full body or three-quarter framing with architectural context.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No rooftop clutter or industrial equipment, no water tanks or AC units, no flat overcast haze washing out sky, no clipped sky highlights, no HDR halos.'
  },
]

const CELEBRATION_PRESETS: ScenePreset[] = [
  {
    id: 'celebration_festive',
    label: 'Festive Evening',
    category: 'lifestyle',
    region: 'india',
    scene: 'Festive interior with fresh marigold garland accents in vibrant orange and yellow, polished brass diyas with flickering flames, clustered tea-light candles at multiple depths creating layered warmth, rich silk drapes in deep red or gold, and polished marble floor reflecting the warm practical lights. Rangoli or traditional decor elements visible.',
    lighting: 'Key: clustered diya and candle practicals near foreground plane creating warm intimate illumination. Fill: warm reflected bounce from silk drapes and painted walls. Rim: string-light back edge producing soft circular bokeh halos at multiple distances. Warm 2600-3200K festive color temperature with controlled highlights and rich deep shadows.',
    camera: '50mm f/1.8 eye-level framing, chest-up to three-quarter composition. Layered festive bokeh from candles and string lights creating magical background atmosphere. Rich warm tones throughout.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No harsh direct camera flash washing out ambiance, no garish plastic decoration overload, no cheap plastic decor texture, no flat single-source illumination destroying festive mood, no cool white light.'
  },
]

const CASUAL_PRESETS: ScenePreset[] = [
  {
    id: 'casual_mirror_selfie',
    label: 'Mirror Selfie',
    category: 'lifestyle',
    region: 'india',
    scene: 'Bedroom or wardrobe mirror corner with visible wood or metal frame edge, neutral matte-painted wall in off-white or light grey, clean ceramic tile or warm wood laminate floor, and minimal everyday home objects (a shoe rack edge, a hanging jacket, a small plant). The mirror should show realistic reflection with slight glass imperfections.',
    lighting: 'Key: window side light reflected in mirror from camera-left creating natural directional warmth. Fill: soft room bounce from ceiling and walls plus weak warm-tone ceiling practical light. Rim: faint rear practical edge from a bedside lamp. Mixed indoor 3800-4600K with authentic phone-capture realism and slight color fringing.',
    camera: '26mm smartphone wide-angle selfie lens, handheld mirror perspective with phone visible in reflection. Slight natural tilt and off-center framing. Authentic phone camera quality with natural noise at ISO 800+.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No professional studio setup visible, no perfect bilateral symmetry, no beauty-portrait framing, no synthetic mirror-clean CGI look, no portrait-mode blur, no beauty filter skin smoothing.'
  },
  {
    id: 'casual_street_candid',
    label: 'Street Candid',
    category: 'street',
    region: 'india',
    scene: 'Clean Indian sidewalk lane with textured painted or plastered wall in warm cream or terracotta tones, muted colorful storefront depth with shop signage, smooth concrete or flagstone pavement with natural patina, and sparse background traffic blur suggesting urban life without crowding.',
    lighting: 'Key: soft directional light from overcast sky filtered through urban corridor creating even illumination. Fill: pavement and wall bounce preserving natural facial shadow detail without harsh contrast. Rim: faint ambient glow from open street end creating gentle edge separation. Neutral daylight around 5200-5800K with urban documentary feel.',
    camera: '48mm smartphone main camera f/1.8, eye-level casual framing with natural shallow depth. Candid composition as if a friend took the photo while walking. Slight motion energy without blur. ISO 200-400.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No fashion-runway stiff posing, no dramatic theatrical lighting with colored gels, no HDR halos around buildings, no over-smoothed road and wall textures, no oversaturated colors.'
  },
]

const EXTENDED_PRESETS: ScenePreset[] = [
  {
    id: 'golden_hour_bedroom',
    label: 'Golden Hour Bed',
    category: 'home',
    region: 'global',
    scene: 'Cozy bedroom with rumpled off-white linen bedding showing natural fabric creases, slatted wooden blinds on a side window casting warm stripe patterns across the bed, matte warm-toned walls in cream or soft taupe, and minimal bedside clutter — just a small plant, a book, and a coffee mug on the nightstand.',
    lighting: 'Key: low golden afternoon sun passing through blinds creating warm stripe pattern across bedding and subject. Fill: soft wall and ceiling bounce preserving shadow detail in bedding folds. Rim: narrow warm edge from blind slits creating graphic light patterns. Warm 3400-4200K with natural golden falloff.',
    camera: 'Selfie POV from above, slightly angled. Deep-to-moderate focus keeping bedding texture and room context legible. Authentic phone camera quality with subtle grain and warm processing.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No harsh overhead flash, no cold blue cast, no perfectly flat ironed bedding, no sterile hotel-room look, no beauty filter smoothing.'
  },
  {
    id: 'studio_gray_flash',
    label: 'Gray Flash Editorial',
    category: 'lifestyle',
    region: 'global',
    scene: 'Medium gray gradient studio backdrop with clean matte floor, no props, and visible tonal roll-off from center to edges creating depth. The gray should be a true neutral 50% without color bias.',
    lighting: 'Key: controlled direct frontal flash for crisp detail and catchlights. Fill: low ambient bounce from gray floor and backdrop providing subtle shadow fill. Rim: narrow side kicker to separate garment edges from gray backdrop. Neutral 5200-5600K with analog-like grain tolerance and punchy contrast.',
    camera: '85mm f/2.0 chest-up to mid-shot framing with shallow depth of field. Fashion editorial composition with intentional negative space. Sharp focus on face and garment with smooth backdrop falloff.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No soft beauty flattening, no pastel haze overlays, no overexposed forehead hotspots, no plastic skin texture, no oversharpening artifacts.'
  },
  {
    id: 'lifestyle_airport_terminal',
    label: 'Airport Travel Candid',
    category: 'travel',
    region: 'global',
    scene: 'Modern airport terminal concourse with floor-to-ceiling glass walls showing tarmac activity, brushed stainless steel columns, chrome handrails, a rolling cabin suitcase nearby, and polished terrazzo tile walkways with wayfinding line markings. Distant departure boards and gate signage visible.',
    lighting: 'Key: broad overcast daylight flooding through glass curtain walls. Fill: reflective bounce from polished tile floor and metal surfaces creating soft uplight. Rim: back-side window edge creating a luminous silhouette outline. Cool-neutral 5200-6200K with travel-documentary soft contrast.',
    camera: 'Smartphone-style mid-shot with slight casual tilt and off-center framing. Travel influencer aesthetic — candid and effortless. Natural phone depth rendering.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No catalog-style stiff posing, no flash hotspot look, no overly saturated airport signage, no fake motion blur artifacts, no crowds near subject.'
  },
  {
    id: 'lifestyle_tropical_patio',
    label: 'Tropical Patio Lunch',
    category: 'lifestyle',
    region: 'global',
    scene: 'Upscale resort patio dining area with dark green canvas umbrella canopy providing shade, marble-pattern round table surface, white ceramic dishware with artful food plating, a clear glass of water with ice and lime, and dense tropical foliage (palms, banana leaves, bougainvillea) creating a lush green backdrop.',
    lighting: 'Key: soft shaded daylight under umbrella creating even facial illumination. Fill: table surface and light stone surfaces bouncing neutral light upward. Rim: bright sunlit foliage edge behind subject creating luminous green separation. Mixed 4500-6000K with cool shaded foreground and bright warm background contrast.',
    camera: 'Smartphone-style medium close-up from slight high angle looking down at table. Food props in foreground creating depth layers. Casual influencer lunch content style.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No empty table surface, no sterile studio ambiance, no over-sharpened food details, no flat single-zone exposure, no oversaturated tropical colors.'
  },
  {
    id: 'home_cozy_teddy_selfie',
    label: 'Cozy Home Selfie',
    category: 'home',
    region: 'global',
    scene: 'Apartment living-room plush sofa with a chunky knit throw blanket, pastel and earth-tone cushion accents, neutral painted wall in warm white or light sage, and natural lived-in scale — a remote control on the armrest, a mug on the coffee table, soft afternoon light.',
    lighting: 'Key: diffused window-style light at 45 degrees camera-left creating warm directional glow. Fill: sofa fabric and wall bounce preserving skin texture and plush fiber detail. Rim: mild ambient wrap from room walls providing gentle separation.',
    camera: 'Front-facing smartphone selfie perspective with realistic wide-angle phone optics. Subject and nearby cushions sharp, background room detail present without heavy blur. Natural phone processing with slight warmth.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No over-smoothed skin pores, no CGI plush texture on fabrics, no waxy shiny fabric look, no fake portrait-mode edge blur, no beauty filter.'
  },
  {
    id: 'studio_white_brick_bench',
    label: 'White Brick Bench Studio',
    category: 'lifestyle',
    region: 'global',
    scene: 'Minimal studio with painted white brick wall showing authentic mortar lines and texture variation, dark wooden or metal bench seating as the only prop, matte light concrete floor, clean architectural geometry with intentional negative space and neutral tonal control throughout.',
    lighting: 'Key: broad diffused front source creating even, flattering illumination. Fill: white brick wall and floor bounce for gentle tonal continuity across the scene. Rim: subtle side contour light maintaining body separation from the textured wall.',
    camera: '35-50mm symmetric editorial composition with deep focus preserving wall brick texture and bench material detail. Full body seated or perched pose showing complete outfit.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No overexposed wall clipping losing brick detail, no hazy blur haze, no artificial texture smoothing on brick, no plastic skin look.'
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
