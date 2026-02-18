/**
 * CURATED SCENE PRESETS — INSTAGRAM-READY
 *
 * Focus: image quality, colour control, and feed-worthy aesthetic.
 * Each preset is tuned for consistent colour temperature, flattering light,
 * and a cohesive look that works as an Instagram post.
 *
 * Trimmed set (14 presets). Each describes an EMPTY ENVIRONMENT;
 * Nano Banana Pro builds the scene around the subject.
 */

import type { ScenePreset } from './india'

// ═══════════════════════════════════════════════════════════════════════════════
// STUDIO (3) — Best colour control, clean and feed-ready
// ═══════════════════════════════════════════════════════════════════════════════

const STUDIO_PRESETS: ScenePreset[] = [
    {
        id: 'studio_white',
        label: 'Seamless White Studio',
        category: 'lifestyle',
        region: 'global',
        scene: 'Professional photography studio with seamless white backdrop curving into the floor, clean infinity curve with no visible edges, polished white floor reflecting soft light',
        lighting: 'Two softboxes at 45° from front-left and front-right, large overhead diffusion panel, even illumination wrapping around the subject with minimal shadows. Neutral-to-cool white balance (5500K), Instagram-ready colour grading with clean highlights and controlled shadows, no colour cast',
        camera: '85mm portrait lens, chest-up to full body framing, shallow depth of field softening the backdrop edges',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No colored gels, no dramatic shadows, no visible equipment, no oversaturation, no muddy skin tones'
    },
    {
        id: 'studio_cream',
        label: 'Warm Cream Backdrop',
        category: 'lifestyle',
        region: 'global',
        scene: 'Warm cream-colored seamless paper backdrop with subtle natural texture, soft off-white tone that flatters warm skin tones, clean studio floor',
        lighting: 'Soft diffused daylight-balanced lighting from large window-style modifier, gentle warm shadows, golden undertone (approx 5000K). Cohesive warm palette, feed-worthy skin tones, subtle cream-to-gold colour harmony',
        camera: '85mm portrait lens, three-quarter body shot, warm tones throughout, subtle background texture visible',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No cold blue tones, no harsh shadows, no stark contrast, no orange push'
    },
    {
        id: 'studio_editorial',
        label: 'Fashion Editorial Studio',
        category: 'lifestyle',
        region: 'global',
        scene: 'High-end fashion studio with floor-to-ceiling windows covered by large diffusion panels, polished concrete floor, clean white walls with architectural detail',
        lighting: 'Natural window light streaming through diffusion panels mixed with subtle studio strobes, soft wraparound quality. Editorial-grade colour: neutral skin, true fabric colours, crisp but not over-sharpened, Instagram feed aesthetic',
        camera: '100mm telephoto lens, full body fashion editorial framing, slight compression of background, sharp subject against soft environment',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No cluttered props, no visible studio equipment, no harsh direct flash, no oversaturation'
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// LIFESTYLE INDOOR (2) — Relatable, warm, feed-ready
// ═══════════════════════════════════════════════════════════════════════════════

const LIFESTYLE_PRESETS: ScenePreset[] = [
    {
        id: 'lifestyle_cafe',
        label: 'Modern Café',
        category: 'lifestyle',
        region: 'india',
        scene: 'Contemporary Indian coffee shop with exposed brick accent wall on the right, light wood tables receding into background, warm pendant lights overhead, indoor plant near large glass storefront window on the left, clean minimal decor with warm earthy palette',
        lighting: 'Natural daylight through left-side windows with soft pendant fill. Consistent warm colour temperature (4800–5200K), Instagram-ready: flattering skin tones, warm neutrals, cohesive feed look. No green or fluorescent cast',
        camera: '50mm lens at eye level, standing or seated three-quarter framing, shallow depth of field blurring café background naturally, subject sharply in focus',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No cluttered tables, no visible mess, no harsh fluorescent, no flat lighting, no pasted or sticker look, no oversaturation'
    },
    {
        id: 'lifestyle_living_room',
        label: 'Modern Living Room',
        category: 'home',
        region: 'india',
        scene: 'Spacious contemporary living room with large floor-to-ceiling windows on the left wall, neutral-toned sofa and warm wooden floor receding into background, soft sheer curtains diffusing daylight, one accent plant, clean minimal décor with warm earthy tones',
        lighting: 'Strong natural daylight through left-side windows, warm ambient fill from walls and ceiling. Cohesive warm palette, soft shadows, feed-worthy colour grading with natural skin and true fabric colours',
        camera: '50mm lens at eye level, three-quarter body framing, shallow depth of field softening the room behind while keeping the subject tack-sharp',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No flat lighting, no overhead fluorescent, no cluttered surfaces, no competing light sources, no pasted or sticker look'
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// OUTDOOR (3) — Golden hour and natural light, Instagram favourites
// ═══════════════════════════════════════════════════════════════════════════════

const OUTDOOR_PRESETS: ScenePreset[] = [
    {
        id: 'outdoor_golden_hour',
        label: 'Golden Hour Walkway',
        category: 'outdoor',
        region: 'global',
        scene: 'Clean promenade walkway during golden hour, warm-toned paving stones, low railing on one side, open sky with soft clouds catching sunset colour, trees casting long shadows',
        lighting: 'Golden hour sunlight from camera-left at 15° above horizon, rim glow on hair and shoulders, long soft shadows. Warm colour palette (3500–4500K), rich but natural golden skin and fabric tones, Instagram golden-hour aesthetic — no overcooked orange',
        camera: '85mm portrait lens, three-quarter body shot with sunset bokeh behind, warm tones dominating the frame',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No crowds, no street vendors, no harsh midday light, no oversaturation'
    },
    {
        id: 'outdoor_beach',
        label: 'Beach Evening',
        category: 'outdoor',
        region: 'india',
        scene: 'Clean Indian beach at golden hour, warm golden sand stretching out, calm waves in background, soft sunset sky with warm gradient from orange to blue, sparse footprints on sand',
        lighting: 'Sunset golden light from behind and to the side, ocean reflecting warm tones, soft wrap-around glow on skin. Cohesive warm-cool balance: golden skin, soft blue sky, feed-ready colour grading',
        camera: '50mm lens, three-quarter body with ocean horizon in background, warm colour palette throughout',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No beach umbrellas, no tourist crowds, no harsh bright sun, no oversaturated sky'
    },
    {
        id: 'outdoor_park',
        label: 'Morning Park',
        category: 'outdoor',
        region: 'india',
        scene: 'Well-maintained Indian park in early morning, manicured green lawns, clean walking pathway, mature trees with dappled light filtering through, wooden benches along the path, fresh dewy atmosphere',
        lighting: 'Early morning golden light at low angle, soft mist catching light rays through tree canopy, long gentle shadows, warm green tones. Natural colour balance: flattering skin, true greens, Instagram lifestyle aesthetic',
        camera: '50mm lens, environmental lifestyle shot with park depth visible, trees creating natural framing',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No joggers, no crowded paths, no harsh midday light, no neon green'
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// URBAN (2) — City aesthetic, feed-worthy
// ═══════════════════════════════════════════════════════════════════════════════

const URBAN_PRESETS: ScenePreset[] = [
    {
        id: 'urban_rooftop_day',
        label: 'Rooftop Terrace Day',
        category: 'outdoor',
        region: 'india',
        scene: 'Modern rooftop terrace with glass railing, clean concrete floor, contemporary outdoor furniture, city skyline visible beyond with modern buildings, clear blue sky, potted plants along the perimeter',
        lighting: 'Bright daylight from open sky with slight cloud diffusion, clean even illumination with soft shadows. Neutral-to-cool colour (5500–6000K), crisp skin and fabric, true sky blue, Instagram travel/lifestyle look',
        camera: '48mm iPhone main lens, lifestyle standing shot with cityscape behind, natural perspective and depth',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No water tanks, no industrial equipment, no messy rooftop clutter, no flat or harsh light'
    },
    {
        id: 'urban_street_dusk',
        label: 'City Street at Dusk',
        category: 'street',
        region: 'india',
        scene: 'Quiet upscale Indian city street at blue hour, clean modern buildings on both sides, warm street lights beginning to glow, smooth pavement, a few distant blurred pedestrians, evening sky transitioning to deep blue',
        lighting: 'Blue hour ambient mixing with warm golden street lights — cinematic dual-tone: cool sky above, warm fixtures below. Cohesive colour grading: no muddiness, feed-worthy contrast and colour separation',
        camera: '35mm lens, full body shot with street perspective receding behind, mixed cool-warm colour temperature',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No busy traffic, no rickshaws, no cluttered signage, no harsh lighting, no oversaturation'
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// CELEBRATION (1) — Festive, warm, controlled colour
// ═══════════════════════════════════════════════════════════════════════════════

const CELEBRATION_PRESETS: ScenePreset[] = [
    {
        id: 'celebration_festive',
        label: 'Festive Evening',
        category: 'lifestyle',
        region: 'india',
        scene: 'Tasteful Indian festive setting at evening with warm string lights draped across the background, brass diyas and candles providing point lights at various depths, rich floral arrangement with marigolds visible in soft focus behind, elegant silk drapes framing the scene',
        lighting: 'Warm fairy lights and diya glow casting soft golden light on the subject, warm amber with subtle golden rim from string lights behind. Consistent warm golden colour temperature, flattering skin, bokeh lights as soft circles — Instagram festive aesthetic, no garish colour',
        camera: '50mm lens at eye level, chest-up to three-quarter framing with festive bokeh lights behind, shallow depth of field',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No harsh camera flash, no overcrowded space, no garish decorations, no plastic decor, no flat lighting, no pasted or sticker look'
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// CASUAL (2) — Authentic iPhone feel, highly Instagram-native
// ═══════════════════════════════════════════════════════════════════════════════

const CASUAL_PRESETS: ScenePreset[] = [
    {
        id: 'casual_mirror_selfie',
        label: 'Mirror Selfie',
        category: 'lifestyle',
        region: 'india',
        scene: 'Full-length bedroom or wardrobe mirror in a clean modern Indian home, soft neutral wall behind, edge of mirror frame visible, clean floor, natural home setting with warm tones',
        lighting: 'Soft indoor side light from nearby window, warm natural colour temperature, subtle shadows, diffused quality. Natural skin and fabric colours, authentic iPhone-style colour science — feed-ready selfie look',
        camera: '26mm iPhone wide angle lens, arm-length distance, phone partially in frame for authenticity, slightly tilted angle for candid feel',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No studio lighting, no perfect symmetry, no professional posing — authentic phone selfie aesthetic'
    },
    {
        id: 'casual_street_candid',
        label: 'Street Candid',
        category: 'street',
        region: 'india',
        scene: 'Clean modern Indian sidewalk with a textured building wall behind, soft city blur in background, smooth pavement, clean urban environment with muted colours',
        lighting: 'Natural diffused side light from overcast sky or building shade, neutral colour temperature, soft shadows. Authentic iPhone colour science: natural skin, true neutrals, feed-ready candid aesthetic',
        camera: '48mm iPhone main camera, eye-level casual framing, natural portrait mode depth separating subject from street background',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No fashion model posing, no perfect symmetry, no dramatic lighting — natural off-guard moment'
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// EXTENDED FROM EXAMPLES (expanded style library for 20+ preset options)
// ═══════════════════════════════════════════════════════════════════════════════

const EXTENDED_PRESETS: ScenePreset[] = [
    {
        id: 'urban_gas_station_night',
        label: 'Gas Station Night',
        category: 'street',
        region: 'global',
        scene: 'Gas station at night with wet reflective ground, black car as prop, fuel pumps and lit storefront (e.g. Tesco Express, Costa). Canopy overhead with rectangular lights. England/UK urban night.',
        lighting: 'Overhead canopy lights and storefront signs. Wet ground and car surface reflect colourful artificial lights. Dark moody night, mix of warm and cool. HDR-style sharpness, cinematic night, no orange push.',
        camera: 'iPhone or 35mm, vertical 9:16, full body or three-quarter with car and pumps behind',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No dry ground, no daylight, no flat lighting, no oversaturated neon'
    },
    {
        id: 'golden_hour_bedroom',
        label: 'Golden Hour Bed (Blinds)',
        category: 'home',
        region: 'global',
        scene: 'Bedroom with white or off-white linen sheets, wrinkled. Window with horizontal blinds. Minimal clutter. Cozy, intimate.',
        lighting: 'Soft golden hour light through window blinds casting striped shadows across face and bedding. Warm golden hue, soft muted shadows, cinematic bands of light.',
        camera: 'POV from above, selfie-style. Shallow depth of field, film grain aesthetic.',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No harsh flash, no flat overhead, no cold blue'
    },
    {
        id: 'editorial_mafia_office',
        label: 'Editorial Study (Mafia Office)',
        category: 'lifestyle',
        region: 'global',
        scene: 'Classic study or mafia-style office. Brown leather tufted sofa with nailhead trim, dark wood paneling, leather desk and chair. Opulent, stripped-down editorial.',
        lighting: 'Strong direct frontal flash. Harsh contrasts, crisp shadows, glossy highlights on skin and fabric, metallic accents. Paparazzi-like rawness, bold cast shadows.',
        camera: 'Mid-frame portrait, sharp focus, moderate DoF. ISO 400, f/4, 1/125 s feel.',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No soft diffused only, no flat lighting — editorial needs punch'
    },
    {
        id: 'studio_beam_split',
        label: 'Split-Light Character Portrait',
        category: 'lifestyle',
        region: 'global',
        scene: 'Minimal neutral-gray studio backdrop. Empty set with no props. Vertical beam light slices through frame creating geometric split composition.',
        lighting: 'Single narrow hard beam from front-left splitting face and torso into highlight/shadow planes. Restrained contrast, natural skin tone, no overprocessing.',
        camera: '50mm lens, head-on close portrait, slight edge softness, editorial composition.',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No beauty smoothing, no glam retouch, no soft fill flattening, no color cast'
    },
    {
        id: 'studio_gray_flash',
        label: 'Gray Flash Editorial',
        category: 'lifestyle',
        region: 'global',
        scene: 'Studio with smooth gray gradient backdrop. Clean set with no props, focus on subject attitude and silhouette.',
        lighting: 'Strong direct frontal flash with crisp facial detail and defined garment shadows. Subtle rim separation, analog grain feel.',
        camera: '85mm portrait framing, chest-up to mid-shot, shallow depth of field.',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No soft beauty light, no flat exposure, no pastel wash, no plastic skin'
    },
    {
        id: 'studio_crimson_noir',
        label: 'Crimson Neo-Noir',
        category: 'lifestyle',
        region: 'global',
        scene: 'Minimal studio with deep crimson monochrome background and clean negative space. No props.',
        lighting: 'Low-key cinematic side light from slightly below plus subtle rim contour on jaw and shoulders. High contrast, deep controlled shadows.',
        camera: 'Close-up or medium close-up portrait, slightly low angle, shallow depth of field.',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No smiling expression shift, no wide-angle distortion, no painterly look, no washed blacks'
    },
    {
        id: 'lifestyle_airport_terminal',
        label: 'Airport Travel Candid',
        category: 'travel',
        region: 'global',
        scene: 'Modern airport terminal walkway with floor-to-ceiling glass, runway and aircraft infrastructure visible outside, metal beams and railings, rolling suitcase nearby.',
        lighting: 'Muted natural daylight through large windows. Soft ambient contrast with subtle reflections on metal and luggage surfaces.',
        camera: 'iPhone-style mid-shot, slight tilt and off-center framing, candid travel capture.',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No staged catalog pose, no harsh flash, no oversaturated airport colors'
    },
    {
        id: 'lifestyle_tropical_patio',
        label: 'Tropical Patio Lunch',
        category: 'lifestyle',
        region: 'global',
        scene: 'Upscale outdoor restaurant patio with dense tropical plants, dark green umbrella overhead, white tableware, food bowl and lifestyle props on table.',
        lighting: 'Mixed daylight: subject in umbrella shade with low-contrast skin tones, bright sunlit foliage in background for separation and natural bokeh.',
        camera: 'Smartphone medium close-up from slight high angle, food and hands in foreground.',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No sterile studio look, no empty table, no over-sharpened food texture'
    },
    {
        id: 'lifestyle_european_bench',
        label: 'European Street Bench',
        category: 'travel',
        region: 'global',
        scene: 'European city sidewalk with stone architecture, wrought-iron balconies, subtle street life, wooden bench and cafe-style details.',
        lighting: 'Soft natural daylight with diffused shadows. Neutral-warm palette and clean ambient contrast.',
        camera: 'iPhone-style full or three-quarter seated framing, casual off-center composition.',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No aggressive HDR, no heavy crowd clutter, no overposed model stance'
    },
    {
        id: 'street_subway_fisheye',
        label: 'Subway Fisheye Streetwear',
        category: 'street',
        region: 'global',
        scene: 'Graffiti-lined underground stairwell with tiled walls, fluorescent fixtures, worn concrete steps and urban grit.',
        lighting: 'Hard overhead fluorescent lighting with strong local contrast and cool-neutral tones, shadows under steps and clothing folds.',
        camera: 'Wide fisheye low-angle shot, dynamic perspective and barrel distortion.',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No clean corporate corridor, no flat diffuse lighting, no lens correction removing fisheye feel'
    },
    {
        id: 'street_mcdonalds_bmw_night',
        label: 'Fast-Food Luxury Night',
        category: 'street',
        region: 'global',
        scene: 'Night fast-food parking lot with brightly lit McDonald’s storefront and signage, white BMW performance sedan in foreground, branded takeaway props on hood.',
        lighting: 'Streetlamp and storefront mixed lighting with warm highlights, gentle rim light and realistic night reflections on car paint.',
        camera: '35mm cinematic lifestyle framing, subject sharp with softly blurred background.',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No daytime sky, no incorrect car class, no washed-out night blacks'
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const PHOTOSHOOT_PRESETS: ScenePreset[] = [
    ...STUDIO_PRESETS,
    ...LIFESTYLE_PRESETS,
    ...OUTDOOR_PRESETS,
    ...URBAN_PRESETS,
    ...CELEBRATION_PRESETS,
    ...CASUAL_PRESETS,
    ...EXTENDED_PRESETS,
]

export function getPhotoshootPreset(id: string): ScenePreset | undefined {
    return PHOTOSHOOT_PRESETS.find(p => p.id === id)
}

export function getPhotoshootPresetsByCategory(category: ScenePreset['category']): ScenePreset[] {
    return PHOTOSHOOT_PRESETS.filter(p => p.category === category)
}

export function getPhotoshootPresetIds(): string[] {
    return PHOTOSHOOT_PRESETS.map(p => p.id)
}
