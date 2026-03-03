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
    id: 'night_beach_streetwear',
    label: 'Night Beach Streetwear',
    category: 'outdoor',
    region: 'global',
    scene: 'Night beach shoreline with dark sand, low surf, sparse distant practical light, and open black sky with natural horizon separation.',
    lighting: 'Key: low mixed night ambient from nearby practicals or soft sky glow. Fill: weak sand and water bounce preserving legibility in clothing and skin without flattening the scene. Rim: subtle edge separation from shoreline reflections or distant practicals. Cool-neutral night balance with controlled blacks and realistic low-light noise.',
    camera: 'Smartphone-style full-body to three-quarter night framing with natural perspective, crisp subject detail, and readable shoreline depth without fake portrait blur.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No daylight beach look, no teal-orange blockbuster grade, no fake moonbeam spotlight, no mushy background, no synthetic bokeh, no pasted subject edges.'
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
  {
    id: 'garden_oak_bench_golden_hour',
    label: 'Oak Garden Bench Golden Hour',
    category: 'outdoor',
    region: 'global',
    scene: 'Peaceful garden under a sprawling old oak tree with a weathered stone bench, soft ground cover, layered foliage, and calm late-day atmosphere.',
    lighting: 'Key: golden afternoon sunlight filtering through oak branches. Fill: soft garden bounce from stone, ground, and foliage preserving skin texture and dress detail. Rim: delicate warm edge where sun breaks through leaves. Warm 3600-4500K with intricate branch-shadow lacework and gentle contrast.',
    camera: 'Eye-level seated environmental portrait with medium framing, natural perspective, and crisp bench, dress, and garden texture without synthetic blur haze.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No fantasy-glow foliage, no overcooked golden filter, no fake haze, no sticker edges, no artificial blur wall background.'
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
  {
    id: 'urban_street_dusk',
    label: 'City Street at Dusk',
    category: 'street',
    region: 'india',
    scene: 'Upscale city street at blue hour with smooth pavement, modern facades, practical streetlights, and sparse distant pedestrian blur.',
    lighting: 'Key: warm practical streetlight from side. Fill: cool blue-hour ambient from sky and opposite facades. Rim: distant storefront spill on silhouette edge. Dual temperature blend around 3200K practical and 6800K ambient.',
    camera: '35mm lens, full-body framing with converging street perspective.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No heavy traffic dominance, no messy signage clutter, no muddy mixed white balance, no oversaturated neon cast.'
  },
  {
    id: 'paris_eiffel_flash_night',
    label: 'Paris Eiffel Flash Night',
    category: 'street',
    region: 'global',
    scene: 'Night Paris riverfront with stone parapet seating, Eiffel Tower brightly illuminated in the background, dark water with boat reflections, and open night sky.',
    lighting: 'Key: hard direct on-camera flash shaping the seated subject. Fill: low ambient night spill from the riverfront and surrounding city light. Rim: warm side light for silhouette volume against the dark scene. Mixed warm tower glow and cool night ambient with preserved black depth and realistic reflection behavior.',
    camera: 'Canon EOS R5 style 85mm telephoto portrait framing with seated subject facing camera, compressed background perspective, crisp tower detail, and no synthetic bokeh artifacts.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No fake postcard Paris look, no overdone HDR halos, no sticker compositing, no artificial blur wash, no warped tower geometry, no plastic skin.'
  },
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
  {
    id: 'indian_influencer_daylight_fullbody',
    label: 'Indian Influencer Daylight',
    category: 'lifestyle',
    region: 'india',
    scene: 'Clean outdoor or lifestyle location with uncluttered background depth, natural urban or garden context, and premium but believable influencer-photo spacing.',
    lighting: 'Key: soft natural daylight. Fill: open-sky and ground bounce maintaining realistic facial detail and clean clothing separation. Rim: subtle daylight edge when available. Neutral-warm daylight with gentle shadows and natural highlights.',
    camera: '85mm DSLR-style full-body portrait framing with shallow but believable depth, sharp subject detail, and no fake bokeh cutout.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No plastic skin, no body reshaping, no beauty-filter symmetry, no HDR haloing, no fake blur gradient, no CGI influencer look.'
  },
]

const EXTENDED_PRESETS: ScenePreset[] = [
  {
    id: 'urban_gas_station_night',
    label: 'Gas Station Night',
    category: 'street',
    region: 'global',
    scene: 'UK-style gas station forecourt at night with wet reflective asphalt, canopy columns, fuel pumps, convenience storefront glow, and parked dark car near pumps.',
    lighting: 'Key: overhead canopy practicals (cool-white) from top-front. Fill: storefront and sign spill (mixed warm/cool) across forecourt. Rim: specular reflections from wet ground and car panels. Mixed 3200-5200K night lighting with deep but readable blacks.',
    camera: '35mm or smartphone-equivalent vertical framing, full-body to three-quarter with pumps and car context.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No daylight sky, no dry pavement, no neon over-saturation, no face beautification or heavy face grading, no washed night blacks, no synthetic background blur or fake bokeh.'
  },
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
    id: 'editorial_mafia_office',
    label: 'Editorial Study (Mafia Office)',
    category: 'lifestyle',
    region: 'global',
    scene: 'Dark wood study with tufted brown leather sofa, leather desk chair, brass hardware accents, textured paneling, and polished wood side surfaces.',
    lighting: 'Key: direct frontal flash with crisp specular response. Fill: minimal ambient bounce from dark wood to keep shape readable. Rim: subtle practical back edge from lamp or window slit. Mixed 3200-4600K with high-contrast editorial punch.',
    camera: 'Mid-frame portrait look, moderate depth, sharp subject emphasis.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No flat soft-only beauty light, no blown highlights on leather, no plastic skin smoothing, no washed shadows.'
  },
  {
    id: 'studio_beam_split',
    label: 'Split-Light Character Portrait',
    category: 'lifestyle',
    region: 'global',
    scene: 'Neutral gray studio with clean floor-to-backdrop transition and a controlled slit-beam pattern crossing the set.',
    lighting: 'Key: narrow hard beam from front-left creating geometric split. Fill: very low-level bounce to retain shadow-side detail. Rim: subtle rear kicker for shoulder separation. Neutral 5000-5400K with controlled contrast.',
    camera: '50mm close portrait framing, head-on with slight edge softness.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No glam retouch, no heavy soft fill flattening, no random color cast, no painterly rendering.'
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
    id: 'studio_crimson_noir',
    label: 'Crimson Neo-Noir',
    category: 'lifestyle',
    region: 'global',
    scene: 'Minimal studio with deep crimson background paper, matte floor, and negative-space composition without props.',
    lighting: 'Key: low-key side source slightly below eye level. Fill: very restrained bounce to keep shadow detail credible. Rim: narrow rear edge on jawline and shoulders. Warm-red scene bias with practical neutral skin handling around 3000-4200K.',
    camera: 'Close-up to medium close-up, slightly low angle, medium depth with crisp facial and background edge detail.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No smile or expression rewrite, no wide-angle distortion, no crushed-black clipping, no stylized face reshaping.'
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
    id: 'street_subway_fisheye',
    label: 'Subway Fisheye Streetwear',
    category: 'street',
    region: 'global',
    scene: 'Underground stairwell with tiled walls, graffiti surfaces, worn concrete steps, steel handrail, and fluorescent ceiling fixtures.',
    lighting: 'Key: overhead fluorescent practicals. Fill: cool bounce from tiled walls and concrete steps. Rim: rear fixture spill along edge contours. Cool-neutral 4000-4800K with localized high contrast and hard step shadows.',
    camera: 'Wide fisheye low-angle framing with intentional barrel distortion and dynamic perspective.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No clean corporate hallway look, no flat soft-light wash, no fisheye correction, no sterile textures.'
  },
  {
    id: 'street_mcdonalds_bmw_night',
    label: 'Fast-Food Luxury Night',
    category: 'street',
    region: 'global',
    scene: 'Night fast-food parking lot with illuminated storefront signage, reflective asphalt, white performance sedan, and takeaway props on hood surface.',
    lighting: 'Key: warm streetlamp practical from upper side. Fill: storefront spill and sign bounce across car paint and pavement. Rim: bright reflected edge from signage and wet asphalt highlights. Mixed 3000-5000K night palette with preserved black depth.',
    camera: '35mm cinematic lifestyle framing with deep focus; storefront, car contours, and asphalt reflections stay crisp without synthetic bokeh.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No daylight elements, no incorrect vehicle class look, no blown signage, no face beautification or aggressive face grading, no artificial background blur or bokeh blobs.'
  },
  {
    id: 'street_porsche_panamera_residential',
    label: 'Residential Porsche Street',
    category: 'street',
    region: 'global',
    scene: 'Residential street with a sleek black Porsche Panamera parked curbside, scattered pine needles on the pavement, modest homes, a white van and dark sedan in the background, and natural lived-in neighborhood spacing.',
    lighting: 'Key: soft warm late-afternoon sun from high side angle. Fill: open-sky ambient and pavement bounce to keep face and black clothing readable without flattening contrast. Rim: subtle warm edge on jacket, hair, and car contours from sun reflection and sky wrap. Warm-neutral 4300-5200K with realistic car-paint reflections and natural shadow falloff.',
    camera: 'High-angle full-body urban street framing with moderate-deep focus; keep the car body, hood reflections, and background vehicles readable without synthetic blur haze.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No showroom CGI gloss, no incorrect Porsche body shape, no warped car reflections, no sticker-edge compositing, no fake portrait-mode blur, no exaggerated orange sunset grade.'
  },
  {
    id: 'street_ramen_booth_snapshot',
    label: 'Retro Ramen Booth Snapshot',
    category: 'lifestyle',
    region: 'global',
    scene: 'Dim retro Japanese restaurant booth with deep teal tufted seating, illuminated calligraphy panels, cluttered side-shelf details, green or marble tabletop, ramen bowl, drink glass, napkin, and natural table clutter.',
    lighting: 'Key: warm amber practical glow from illuminated wall panels behind and beside the booth. Fill: soft table bounce and ambient interior spill preserving skin texture, food detail, and booth color. Rim: subtle practical edge on hair, sunglasses, and chopsticks. Mixed 2800-4200K restaurant lighting with low-contrast phone-camera realism.',
    camera: 'Slightly high-angle medium close-up smartphone framing around chest-up with ramen bowl prominent in the lower frame, sharp subject-and-food focus, and softly diffused background detail.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No beauty-dish studio light, no clean minimalist restaurant look, no fake food-ad photography polish, no neon over-saturation, no sticker compositing, no artificial blur haze.'
  },
  {
    id: 'outdoor_kerala_theyyam_gtr',
    label: 'Kerala Theyyam GT-R Aerial',
    category: 'outdoor',
    region: 'global',
    scene: 'Traditional Kerala tiled ancestral house centered in frame, dense tropical greenery and coconut trees, slightly wet mud driveway, matte black GT-R parked in front, culturally authentic Theyyam performer beside the car.',
    lighting: 'Key: soft overcast monsoon daylight from high sky dome. Fill: wet-ground and wall bounce with humid atmospheric haze. Rim: warm headlight edge reflections through mist. Balanced monsoon palette with natural contrast and no oversaturation.',
    camera: 'High drone-angle cinematic composition (about 45 degrees), deep focus across house, vehicle, and performer with no blur wash.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No fake CGI look, no warped architecture, no oversaturated greens or reds, no synthetic depth blur.'
  },
  {
    id: 'studio_bw_minimalist_portrait',
    label: 'B&W Minimalist Portrait',
    category: 'lifestyle',
    region: 'global',
    scene: 'Minimal light-toned studio wall, no props, clean vertical framing with strong geometric negative space.',
    lighting: 'Key: soft front-top studio source. Fill: gentle frontal return preserving smooth tonal transitions. Rim: minimal contour edge for clean face outline. Monochrome conversion with true micro-contrast.',
    camera: 'Vertical portrait framing (9:16 friendly), medium-deep focus with clean contour detail and no fake blur halos.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No face distortion, no plastic skin, no anime/CGI style, no synthetic bokeh, no warped eyewear geometry.'
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
  {
    id: 'street_elevator_mirror_chic',
    label: 'Elevator Mirror Chic',
    category: 'street',
    region: 'global',
    scene: 'Business elevator mirror environment with brushed-steel panels, practical LED strips, realistic smudges/fingerprints, and reflective control panel details.',
    lighting: 'Key: cool overhead LED practicals. Fill: metallic bounce from walls and mirror. Rim: controlled edge highlights on clothing and phone surfaces, keeping reflection physics realistic.',
    camera: 'Handheld phone mirror capture at waist-to-chest height, slight natural tilt, deep focus across reflected surfaces without AI blur.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No perfect-clean mirror CGI, no warped reflections, no beauty light, no artificial blur gradients.'
  },
  {
    id: 'editorial_sky_negative_space',
    label: 'Sky Negative Space Editorial',
    category: 'outdoor',
    region: 'global',
    scene: 'Open sky-dominant composition with expansive cloud field and minimal horizon occupancy, subject positioned low in frame for negative-space storytelling.',
    lighting: 'Key: soft daylight from open sky. Fill: ambient atmospheric bounce with gentle tonal rolloff. Rim: natural edge from sun angle when available. Neutral-cool daylight with filmic contrast.',
    camera: '50mm editorial framing with deep sky detail and no artificial blur; preserve cloud texture and horizon clarity.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No fake cloud smoothing, no extreme HDR halos, no blur wall sky, no oversaturated cyan cast.'
  },
  {
    id: 'editorial_night_garden_flash',
    label: 'Night Garden Flash Editorial',
    category: 'lifestyle',
    region: 'global',
    scene: 'Dense tropical garden backdrop at night with layered leaves, natural depth, and dark environmental separation behind subject.',
    lighting: 'Key: direct frontal flash with clean skin detail. Fill: low-level ambient foliage bounce. Rim: colored practical spill for subtle red-green edge separation while keeping skin realistic.',
    camera: '35mm portrait framing with sharp leaf texture and realistic flash falloff; avoid synthetic blur patterns.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No neon overdrive, no plastic foliage, no skin airbrushing, no fake bokeh circles.'
  },
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
  {
    id: 'editorial_newspaper_set',
    label: 'Newspaper Set Editorial',
    category: 'lifestyle',
    region: 'global',
    scene: 'Concept editorial set with chair and surrounding newspaper collage on floor and walls, visible print texture and layered paper folds.',
    lighting: 'Key: punchy direct source from front-top. Fill: paper bounce retaining legibility of typography and texture. Rim: subtle side kicker to separate silhouette.',
    camera: '35mm low-seated framing with crisp paper detail, balanced perspective, and no synthetic depth blur.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No unreadable smeared paper texture, no cartoon color push, no blur gradient artifacts.'
  },
  {
    id: 'editorial_court_geometric_sun',
    label: 'Court Geometric Sunlight',
    category: 'outdoor',
    region: 'global',
    scene: 'Outdoor court with painted ground planes, clean walls, and geometric sunlight/shadow shapes creating graphic composition.',
    lighting: 'Key: hard natural sunlight with directional shadow geometry. Fill: ground bounce keeping facial and garment detail readable. Rim: sun edge on shoulders and shoes.',
    camera: '35mm seated full-body lifestyle framing, deep focus on court lines and wall textures.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No flat overcast relight, no shadow inconsistency, no synthetic blur or washed textures.'
  },
  {
    id: 'studio_window_blind_portrait',
    label: 'Window Blind Portrait',
    category: 'lifestyle',
    region: 'global',
    scene: 'Minimal interior wall with natural window-blind projection patterns and clean uncluttered composition.',
    lighting: 'Key: directional sunlight through blinds creating stripe patterns. Fill: soft room bounce preserving skin texture in shadow bands. Rim: gentle warm edge from window direction.',
    camera: 'Portrait framing with medium depth; keep wall texture and light pattern edges clean, no blur haze.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No fake projected patterns, no oversoft skin, no bokeh blobs, no muddy shadow bands.'
  },
  {
    id: 'editorial_dark_study_set',
    label: 'Dark Study Set Editorial',
    category: 'lifestyle',
    region: 'global',
    scene: 'Dark studio study set with armchair, side table, lamp, stacked books, flowers, and textured rug for rich set storytelling.',
    lighting: 'Key: controlled warm practical plus soft directional fill. Fill: low ambient return to retain dark-set depth. Rim: subtle edge separation from background.',
    camera: '50mm seated environmental portrait with deep set detail and natural tonal contrast.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No crushed black clipping, no fake lamp glow bloom, no blur-smear in prop textures.'
  },
  {
    id: 'studio_orange_director_chair',
    label: 'Orange Director Chair Studio',
    category: 'lifestyle',
    region: 'global',
    scene: 'Solid orange seamless studio backdrop with director chair and clean floor transition for bold color-block editorial look.',
    lighting: 'Key: soft front source with controlled contrast. Fill: backdrop bounce preserving skin and fabric detail. Rim: mild side edge for shape definition.',
    camera: 'Full-body seated framing with deep focus and crisp edge rendering against seamless backdrop.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No oversaturated clipping, no background banding, no synthetic depth blur, no plastic skin.'
  },
  {
    id: 'studio_white_wall_saree_shadow',
    label: 'White Wall Saree Shadow',
    category: 'lifestyle',
    region: 'global',
    scene: 'Minimal solid white wall with clean floor-to-wall meeting line, empty set, and space for strong diagonal shadow geometry around the subject.',
    lighting: 'Key: strong directional sunlight-style source from upper left creating crisp dramatic shadows on the wall and defined fabric sheen. Fill: restrained wall bounce preserving contrast and facial structure. Rim: subtle edge lift from ambient room return only. Warm-neutral daylight with bright highlights and deep controlled shadow shape.',
    camera: 'Editorial full-body to three-quarter framing with sharp saree texture, braid detail, and wall-shadow geometry; no synthetic blur or background haze.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No glamour studio softbox wash, no beauty-retouch skin, no random props, no fake wind simulation artifacts, no oversaturated yellow clipping, no sticker edges.'
  },
  {
    id: 'studio_industrial_window_chair',
    label: 'Industrial Window Chair Editorial',
    category: 'lifestyle',
    region: 'global',
    scene: 'Minimal industrial studio with matte white wall corner seam, raw gray concrete floor, vintage brown office chair with metal caster base, and large negative space.',
    lighting: 'Key: strong left-side window daylight creating crisp geometric wall shadows and diagonal light streaks across the floor. Fill: soft concrete and wall bounce preserving skin texture and satin folds. Rim: minimal ambient edge on the shadow side. Neutral daylight with lifted blacks and restrained saturation.',
    camera: 'Wide editorial composition with subject placed on the right third, sharp focus on subject and chair, deep set readability, and no softbox-beauty look or fake blur.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No extra props, no wrong chair type, no glossy CGI floor, no heavy vignette, no fake bokeh, no softbox studio wash, no oversharpening.'
  },
  {
    id: 'studio_green_red_gel_editorial',
    label: 'Green-Red Gel Editorial',
    category: 'lifestyle',
    region: 'global',
    scene: 'Minimal studio wall setup with controlled colored-light interplay and clean floor/wall transition.',
    lighting: 'Key: warm directional source on subject plane. Fill: controlled green gel spill on shadow side for editorial contrast. Rim: subtle edge separation maintaining natural skin texture.',
    camera: 'Three-quarter standing framing with medium-deep focus and clean wall gradients, no fake blur.',
    motion: 'subtle motion',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No posterized color banding, no skin recolor artifacts, no AI haze blur.'
  },
  {
    id: 'studio_red_seamless_profile',
    label: 'Red Seamless Profile',
    category: 'lifestyle',
    region: 'global',
    scene: 'Bold red seamless backdrop with minimal set elements and profile-oriented editorial composition.',
    lighting: 'Key: soft side light shaping profile contours. Fill: subtle front bounce preserving facial micro-detail. Rim: fine shoulder outline against red background.',
    camera: 'Medium profile framing with deep focus and crisp hair/garment edge detail.',
    motion: 'static',
    mood: 'candid',
    style: 'realism',
    negative_bias: 'No red channel clipping, no warped profile anatomy, no soft blur wall, no painterly rendering.'
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
