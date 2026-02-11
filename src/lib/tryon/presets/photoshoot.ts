/**
 * CURATED SCENE PRESETS — PRODUCTION GRADE
 * 
 * 25 presets, each designed for:
 * 1. SCENE INTELLIGENCE — Multiple valid placements per preset
 *    (e.g., hotel lobby → standing by reception, near elevator, by window)
 * 2. DIRECTORIAL NARRATIVE — Rich enough for the narrative prompt builder
 * 3. INDIA-PREMIUM FOCUS — Modern Indian settings, NOT stereotypical
 * 
 * Each preset describes an EMPTY ENVIRONMENT.
 * Scene Intelligence decides WHERE the person goes.
 * Nano Banana Pro builds the scene around them.
 */

import type { ScenePreset } from './india'

// ═══════════════════════════════════════════════════════════════════════════════
// STUDIO / CAMPAIGN (5 presets)
// Clean backdrops for e-commerce and brand campaigns
// Scene Intelligence scenarios: center, slight-left, slight-right, close crop
// ═══════════════════════════════════════════════════════════════════════════════

const STUDIO_PRESETS: ScenePreset[] = [
    {
        id: 'studio_white',
        label: 'Seamless White Studio',
        category: 'lifestyle',
        region: 'global',
        scene: 'Professional photography studio with seamless white backdrop curving into the floor, clean infinity curve with no visible edges, polished white floor reflecting soft light',
        lighting: 'Two softboxes at 45° from front-left and front-right, large overhead diffusion panel, even illumination wrapping around the subject with minimal shadows on backdrop',
        camera: '85mm portrait lens, chest-up to full body framing, shallow depth of field softening the backdrop edges',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No colored gels, no dramatic shadows, no visible equipment'
    },
    {
        id: 'studio_grey',
        label: 'Grey Cyclorama',
        category: 'lifestyle',
        region: 'global',
        scene: 'Neutral mid-grey cyclorama wall curving into matching grey floor, professional studio environment with clean seamless backdrop, subtle gradient from light grey at top to slightly darker at floor',
        lighting: 'Large octabox overhead creating soft even light, fill card from below, gentle shadow gradient on backdrop behind subject',
        camera: '50mm standard lens, full body or three-quarter framing, deep depth of field keeping the entire backdrop in focus',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No colored backgrounds, no props, no distracting patterns'
    },
    {
        id: 'studio_black',
        label: 'Matte Black Studio',
        category: 'lifestyle',
        region: 'global',
        scene: 'Deep matte black velvet backdrop absorbing all light, non-reflective surface creating total darkness behind the subject, clean dark floor',
        lighting: 'Single key light from camera-left at 60° creating dramatic modeling on face, subtle rim light from behind for separation from dark background, no fill light',
        camera: '85mm lens, chest-up portrait framing, subject cleanly isolated from the dark void behind',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No colored accent lights, no smoke, no theatrical haze'
    },
    {
        id: 'studio_cream',
        label: 'Warm Cream Backdrop',
        category: 'lifestyle',
        region: 'global',
        scene: 'Warm cream-colored seamless paper backdrop with subtle natural texture, soft off-white tone that flatters warm skin tones, clean studio floor',
        lighting: 'Soft diffused daylight-balanced lighting from large window-style modifier, gentle warm shadows, golden undertone to overall illumination',
        camera: '85mm portrait lens, three-quarter body shot, warm tones throughout, subtle background texture visible',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No cold blue tones, no harsh shadows, no stark contrast'
    },
    {
        id: 'studio_editorial',
        label: 'Fashion Editorial Studio',
        category: 'lifestyle',
        region: 'global',
        scene: 'High-end fashion studio with floor-to-ceiling windows covered by large diffusion panels, polished concrete floor, clean white walls with architectural detail',
        lighting: 'Natural window light streaming through diffusion panels mixed with subtle studio strobes, soft wraparound quality creating fashion-grade illumination',
        camera: '100mm telephoto lens, full body fashion editorial framing, slight compression of background, sharp subject against soft environment',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No cluttered props, no visible studio equipment, no harsh direct flash'
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// LIFESTYLE INDOOR (5 presets)
// Premium Indian interiors — modern, aspirational, NOT stereotypical
// Scene Intelligence scenarios: standing by window, seated, near counter, 
//   by entrance, walking through, leaning against wall
// ═══════════════════════════════════════════════════════════════════════════════

const LIFESTYLE_PRESETS: ScenePreset[] = [
    {
        id: 'lifestyle_cafe',
        label: 'Modern Café',
        category: 'lifestyle',
        region: 'india',
        scene: 'Contemporary Indian coffee shop with exposed brick accent wall on the right, light wood tables receding into background, warm pendant lights overhead, indoor plant near large glass storefront window on the left, clean minimal decor with warm earthy palette',
        lighting: 'Natural daylight streaming through large left-side glass windows casting directional warm light on the subject, soft warm glow from pendant lights adding fill from above, the subject is lit by the window light with gentle warm shadows on the brick-wall side, consistent warm color temperature blending window daylight with café ambience',
        camera: '50mm lens at eye level, standing or seated three-quarter framing, shallow depth of field blurring café background naturally, subject sharply in focus with café depth visible behind',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No cluttered tables, no visible mess, no harsh fluorescent overhead, no flat lighting, no pasted or sticker look'
    },
    {
        id: 'lifestyle_living_room',
        label: 'Modern Living Room',
        category: 'home',
        region: 'india',
        scene: 'Spacious contemporary living room with large floor-to-ceiling windows on the left wall, neutral-toned sofa and warm wooden floor receding into background, soft sheer curtains diffusing daylight, one accent plant, clean minimal décor with warm earthy tones and visible depth from foreground to far wall',
        lighting: 'Strong natural daylight streaming through left-side windows casting directional light on the subject with soft window-shadow patterns on the floor, warm ambient fill bouncing off light walls and ceiling, subject illuminated by the same window light with gentle shadow on the far side of the face and body, consistent warm color temperature throughout the room',
        camera: '50mm lens at eye level, three-quarter body framing, shallow depth of field softening the room behind while keeping the subject tack-sharp, living room receding naturally behind the subject',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No flat lighting, no overhead fluorescent, no cluttered surfaces, no multiple competing light sources, no pasted or sticker look'
    },
    {
        id: 'lifestyle_hotel_lobby',
        label: 'Premium Hotel Lobby',
        category: 'lifestyle',
        region: 'india',
        scene: 'Upscale Indian hotel lobby with polished marble floor reflecting ambient light, contemporary reception desk receding into background, tasteful brass and wood accents framing the space, large chandelier overhead providing the main light source, clean architectural lines creating visible depth',
        lighting: 'Warm chandelier light from directly above casting soft downward illumination on the subject, concealed ceiling fixtures adding even warm fill, marble floor reflecting light upward as subtle fill on the subject, warm golden color temperature throughout, soft shadows falling directly below the subject consistent with overhead lighting',
        camera: '35mm lens at slightly below eye level, standing full body with lobby architecture and depth receding behind, subject naturally grounded on the reflective marble surface',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No busy crowds, no luggage, no institutional fluorescent, no flat lighting, no pasted or sticker look'
    },
    {
        id: 'lifestyle_coworking',
        label: 'Co-working Space',
        category: 'office',
        region: 'india',
        scene: 'Modern Indian coworking space with clean desks receding into background, glass partition walls creating depth, indoor greenery as accents, warm pendant lights overhead, large side windows providing natural light from the left, minimal contemporary décor with visible spatial depth',
        lighting: 'Natural daylight from left-side windows providing directional key light on the subject, warm pendant lights overhead adding fill, the subject is lit primarily by the window with a soft shadow falling to the right side, consistent warm-neutral color temperature blending daylight and interior fixtures',
        camera: '50mm lens at eye level, standing or seated three-quarter framing, workspace elements providing contextual depth behind the subject, shallow depth of field keeping the subject sharp against a naturally blurred office background',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No tangled wires, no messy desks, no startup-brochure generic look, no flat lighting, no pasted or sticker look'
    },
    {
        id: 'lifestyle_restaurant',
        label: 'Fine Dining Evening',
        category: 'lifestyle',
        region: 'india',
        scene: 'Upscale Indian restaurant interior with warm low-light atmosphere, elegant table settings with white linen receding into background, soft candles on tables providing warm point lights, dark wood accents and tasteful art on walls, depth visible through rows of tables leading to the back of the restaurant',
        lighting: 'Warm candlelight from table level casting soft upward glow on the subject face, subtle amber overhead from concealed ceiling fixtures providing even fill, the subject is illuminated by the warm ambient light with golden skin tones, soft shadows adding three-dimensional depth, consistent warm golden color temperature throughout',
        camera: '50mm lens at seated eye level, three-quarter framing with restaurant depth softly blurred behind, shallow depth of field separating the sharp subject from the warm bokeh of candles and ambient lights in the background',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No harsh overhead flash, no busy crowded background, no plastic decor, no flat lighting, no pasted or sticker look'
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// OUTDOOR NATURE (5 presets)
// Beautiful natural environments — universally appealing
// Scene Intelligence scenarios: standing on path, seated on bench, near railing,
//   walking, leaning near tree, at water's edge
// ═══════════════════════════════════════════════════════════════════════════════

const OUTDOOR_PRESETS: ScenePreset[] = [
    {
        id: 'outdoor_golden_hour',
        label: 'Golden Hour Walkway',
        category: 'outdoor',
        region: 'global',
        scene: 'Clean promenade walkway during golden hour, warm-toned paving stones, low railing on one side, open sky with soft clouds catching sunset color, trees casting long shadows',
        lighting: 'Golden hour sunlight from camera-left at 15° above horizon, warm backlight creating rim glow on hair and shoulders, long soft shadows stretching across the walkway',
        camera: '85mm portrait lens, three-quarter body shot with sunset bokeh behind, warm tones dominating the entire frame',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No crowds, no street vendors, no harsh midday light'
    },
    {
        id: 'outdoor_beach',
        label: 'Beach Evening',
        category: 'outdoor',
        region: 'india',
        scene: 'Clean Indian beach at golden hour, warm golden sand stretching out, calm waves in background, soft sunset sky with warm gradient from orange to blue, sparse footprints on sand',
        lighting: 'Sunset golden light from behind and to the side, ocean reflecting warm tones, soft wrap-around glow on skin, sky providing fill from above',
        camera: '50mm lens, three-quarter body with ocean horizon in background, warm color palette throughout',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No beach umbrellas, no tourist crowds, no harsh bright sun'
    },
    {
        id: 'outdoor_park',
        label: 'Morning Park',
        category: 'outdoor',
        region: 'india',
        scene: 'Well-maintained Indian park in early morning, manicured green lawns, clean walking pathway, mature trees with dappled light filtering through, wooden benches along the path, fresh dewy atmosphere',
        lighting: 'Early morning golden light at low angle, soft mist catching light rays through tree canopy, long gentle shadows, warm green tones',
        camera: '50mm lens, environmental lifestyle shot with park depth visible, trees creating natural framing',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No joggers, no crowded paths, no harsh midday light'
    },
    {
        id: 'outdoor_garden',
        label: 'Botanical Garden',
        category: 'outdoor',
        region: 'india',
        scene: 'Beautiful Mughal-style garden with trimmed hedges, colorful flower beds in bloom, clean stone pathways, ornamental fountain or water feature in background, well-maintained grounds',
        lighting: 'Soft overcast or open shade from trees, even natural light with no harsh shadows, colors appearing rich and saturated in diffused light',
        camera: '85mm portrait lens, three-quarter body shot with flower bokeh behind, shallow depth of field isolating subject from garden background',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No wilted flowers, no messy patches, no harsh direct sunlight'
    },
    {
        id: 'outdoor_lake',
        label: 'Peaceful Lakeside',
        category: 'outdoor',
        region: 'india',
        scene: 'Serene Indian lake or reservoir at calm hour, still water reflecting the sky, trees lining the far shore, clean stone or wooden dock edge, mountains or hills visible in the distance',
        lighting: 'Soft morning or evening light, gentle reflections on water surface, atmospheric haze in distance softening the background naturally',
        camera: '35mm lens, environmental portrait with water and distant landscape visible, natural depth separation from atmospheric perspective',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No boats, no fishermen, no tourist groups, no harsh midday glare'
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// URBAN (5 presets)
// Modern city environments — premium Indian urban settings
// Scene Intelligence scenarios: standing at railing, near wall, on walkway,
//   by entrance, at viewpoint, leaning on structure
// ═══════════════════════════════════════════════════════════════════════════════

const URBAN_PRESETS: ScenePreset[] = [
    {
        id: 'urban_rooftop_day',
        label: 'Rooftop Terrace Day',
        category: 'outdoor',
        region: 'india',
        scene: 'Modern rooftop terrace with glass railing, clean concrete floor, contemporary outdoor furniture, city skyline visible beyond with modern buildings, clear blue sky, potted plants along the perimeter',
        lighting: 'Bright daylight from open sky with slight cloud diffusion, rooftop structures providing partial shade, clean even illumination with soft shadows from furniture and railing',
        camera: '48mm iPhone main lens, lifestyle standing shot with cityscape behind, natural perspective and depth',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No water tanks, no industrial equipment, no messy rooftop clutter, no drying clothes'
    },
    {
        id: 'urban_rooftop_night',
        label: 'Rooftop City Lights',
        category: 'outdoor',
        region: 'india',
        scene: 'Upscale rooftop lounge at night, sleek railing with city lights bokeh behind, ambient string lights overhead, clean modern seating, evening sky transitioning from deep blue to violet at horizon',
        lighting: 'Warm ambient string lights and subtle venue lighting from above, city lights providing backdrop bokeh, blue-hour sky still holding some color, gentle warm illumination on subject from venue lights',
        camera: '35mm lens, standing lifestyle shot with city bokeh behind, slightly wide to capture the rooftop ambiance, natural night mode grain',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No harsh neon, no club lighting, no strobe effects'
    },
    {
        id: 'urban_street_dusk',
        label: 'City Street at Dusk',
        category: 'street',
        region: 'india',
        scene: 'Quiet upscale Indian city street at blue hour, clean modern buildings on both sides, warm street lights beginning to glow, smooth pavement, a few distant blurred pedestrians, evening sky transitioning to deep blue',
        lighting: 'Blue hour ambient mixing with warm golden street lights, creating a cinematic dual-tone atmosphere with cool sky above and warm fixtures below, soft shadows',
        camera: '35mm lens, full body shot with street perspective receding behind, mixed cool-warm color temperature creating visual interest',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No busy traffic, no rickshaws, no cluttered signage, no harsh lighting'
    },
    {
        id: 'urban_heritage_wall',
        label: 'Heritage Sandstone Wall',
        category: 'outdoor',
        region: 'india',
        scene: 'Beautiful clean heritage sandstone wall with carved architectural detail, warm golden stone texture, arched doorway or window frame creating depth, well-maintained historical surface',
        lighting: 'Golden hour side light hitting the textured wall at an angle, warm sandstone glowing with amber tones, long soft shadows emphasizing carved reliefs, warm enveloping atmosphere',
        camera: '50mm lens, three-quarter body with wall texture visible, warm color palette, subject against the golden stone',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No peeling paint, no graffiti, no trash, no damaged stonework'
    },
    {
        id: 'urban_skyline_bridge',
        label: 'Bridge with City View',
        category: 'outdoor',
        region: 'india',
        scene: 'Modern pedestrian bridge or overpass with clean railing, city skyline stretching out behind, evening sky with city lights beginning to twinkle, smooth bridge surface, uncluttered path',
        lighting: 'Blue hour with warm city lights reflected, bridge fixtures providing subtle illumination, mixed color temperature from sky and city creating depth and atmosphere',
        camera: '50mm lens, standing on bridge with city bokeh behind, street and building lights creating beautiful circular bokeh in background',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No heavy traffic, no harsh direct lights, no cluttered signage'
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// CELEBRATION (3 presets)
// Premium Indian festive settings
// Scene Intelligence scenarios: standing with decor, near entrance, 
//   by table, at bar area, on dance floor edge
// ═══════════════════════════════════════════════════════════════════════════════

const CELEBRATION_PRESETS: ScenePreset[] = [
    {
        id: 'celebration_festive',
        label: 'Festive Evening',
        category: 'lifestyle',
        region: 'india',
        scene: 'Tasteful Indian festive setting at evening with warm string lights draped across the background, brass diyas and candles providing point lights at various depths, rich floral arrangement with marigolds visible in soft focus behind, elegant silk drapes framing the scene, warm ambient glow filling the space',
        lighting: 'Warm fairy lights and diya glow casting soft golden light on the subject from multiple directions, the subject is bathed in warm amber light with subtle golden rim highlights from string lights behind, overall low-light atmosphere with rich warm tones and gentle three-dimensional shadows on the subject, consistent warm golden color temperature',
        camera: '50mm lens at eye level, chest-up to three-quarter framing with festive bokeh lights creating circles of warmth behind, shallow depth of field keeping the subject sharp against the soft warm background glow',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No harsh camera flash, no overcrowded space, no garish decorations, no plastic decor, no flat lighting, no pasted or sticker look'
    },
    {
        id: 'celebration_wedding',
        label: 'Wedding Venue',
        category: 'lifestyle',
        region: 'india',
        scene: 'Elegant Indian wedding venue with tasteful floral mandap or archway in background, sophisticated draping in rich fabrics, crystal chandeliers, well-decorated stage area, polished marble floor',
        lighting: 'Warm venue lighting from concealed fixtures and chandeliers, soft amber glow creating an intimate atmosphere, golden wash from decorative elements, gentle fill from floral arrangements reflecting light',
        camera: '85mm lens, portrait framing with venue bokeh, warm golden tones, elegant shallow depth separating subject from ornate background',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No chaotic crowds, no harsh stage spotlights, no messy catering areas'
    },
    {
        id: 'celebration_party',
        label: 'Cocktail Evening',
        category: 'lifestyle',
        region: 'india',
        scene: 'Upscale cocktail party or lounge setting, elegant bar with backlit bottles in background, sophisticated guests as soft blurs, contemporary Indian decor, clean dark-toned interior with brass accents',
        lighting: 'Ambient warm bar lighting, subtle accent lights highlighting architectural features, low intimate atmosphere with warm golden undertones',
        camera: '50mm lens, standing socializing framing, shallow depth of field with bar and ambient lights creating warm bokeh behind',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No harsh flash, no neon bar signs, no garish party decorations'
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// CASUAL REAL (2 presets)
// Authentic iPhone-shot feel — most relatable
// Scene Intelligence scenarios: mirror angle, standing casual, 
//   phone in frame, relaxed body language
// ═══════════════════════════════════════════════════════════════════════════════

const CASUAL_PRESETS: ScenePreset[] = [
    {
        id: 'casual_mirror_selfie',
        label: 'Mirror Selfie',
        category: 'lifestyle',
        region: 'india',
        scene: 'Full-length bedroom or wardrobe mirror in a clean modern Indian home, soft neutral wall behind, edge of mirror frame visible, clean floor, natural home setting with warm tones',
        lighting: 'Soft indoor side light from nearby window, warm natural color temperature, subtle shadows, diffused quality typical of home interiors',
        camera: '26mm iPhone wide angle lens, arm-length distance, phone partially in frame for authenticity, slightly tilted angle for candid feel, natural iPhone processing',
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
        scene: 'Clean modern Indian sidewalk with a textured building wall behind, soft city blur in background, smooth pavement, clean urban environment with muted colors',
        lighting: 'Natural diffused side light from overcast sky or building shade, neutral color temperature, soft shadows from ambient daylight, no harsh direct sun',
        camera: '48mm iPhone main camera, eye-level casual framing, natural portrait mode depth separating subject from street background, authentic iPhone color science',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No fashion model posing, no perfect symmetry, no dramatic lighting — capture natural off-guard moment'
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT ALL PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export const PHOTOSHOOT_PRESETS: ScenePreset[] = [
    ...STUDIO_PRESETS,
    ...LIFESTYLE_PRESETS,
    ...OUTDOOR_PRESETS,
    ...URBAN_PRESETS,
    ...CELEBRATION_PRESETS,
    ...CASUAL_PRESETS,
]

export function getPhotoshootPreset(id: string): ScenePreset | undefined {
    return PHOTOSHOOT_PRESETS.find(p => p.id === id)
}

export function getPhotoshootPresetsByCategory(category: ScenePreset['category']): ScenePreset[] {
    return PHOTOSHOOT_PRESETS.filter(p => p.category === category)
}

/**
 * Get all photoshoot preset IDs for validation
 */
export function getPhotoshootPresetIds(): string[] {
    return PHOTOSHOOT_PRESETS.map(p => p.id)
}

console.log(`📸 Loaded ${PHOTOSHOOT_PRESETS.length} curated presets`)
