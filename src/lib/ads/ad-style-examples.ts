/**
 * AD STYLE REFERENCE EXAMPLES
 *
 * Stored prompts and style notes for defining/tuning ad presets.
 * Product ads can be for many types: shirts, pants, hats, clothing,
 * fashion accessories, beauty products—presets should be product-agnostic
 * and support this range. Creative styles here include: UGC, editorial,
 * vintage poster, cinematic motion, surreal/conceptual, placement (OOH),
 * product-hero beauty, text-based ads (bold brand + slogan), standalone
 * product shots (no model), creative/custom creative ads, and additional
 * types (OOH, sports monochrome, food, vintage catalog, B&W+neon CTA,
 * glow-blur editorial), cinematic sports (tunnel hero shot), and CGI animal
 * fashion (surreal luxury). Placeholders [Player Name]/[Football Club] or
 * [animal]/[cloth]/[color] for substitution. Reference only.
 *
 * Image paths point to workspace assets; copy into repo if needed.
 */

export interface AdStyleExample {
  id: string
  name: string
  prompt: string
  styleNotes: string
  /** Optional path to reference image (workspace or repo-relative) */
  imagePath?: string
}

export const AD_STYLE_EXAMPLES: AdStyleExample[] = [
  {
    id: 'vintage-negroni-poster',
    name: 'Vintage Italian Poster (Negroni)',
    prompt: `Vintage italian-style poster of an old-school negroni cocktail: slices of orange rind on the rocks, with a view of the cinque terre port and small boats floating by, an italian cityscape, and water behind glass. The cocktail is in the foreground, with flat colors and a red liquid. The illustration has a vintage style, resembling an advertising poster. The text at the top reads "negroni," and the overall design is in the 1950s style, with intricate details.`,
    styleNotes:
      '1950s vintage travel/ad poster: flat colours, limited palette, gold border, off-white outer border, nostalgic print-like quality. Product (cocktail) in foreground, scenic backdrop (Italian coast, harbour, pastel buildings). Typography: bold sans-serif, red with white outline.',
    imagePath: 'assets/ad-examples/negroni-poster.png',
  },
  {
    id: 'editorial-kerala-bed',
    name: 'Editorial – Kerala Bed (Guy Bourdin style)',
    prompt: `An indian parisian model wearing a beige lace slip dress, long hair messy styling, no makeup, fresh luminous skin, calm expression, sitting on the edge of a messy bed with white sheets, the bed is half sunken and half floating in the middle of lotus-covered backwaters of kerala, overcast soft lighting, calm expression, cinematic photography, high-resolution editorial style, shot by Guy Bourdin`,
    styleNotes:
      'High-res editorial: serene, cinematic. Model on white-sheet bed half-submerged in lotus backwaters. Overcast soft light, no harsh shadows. Guy Bourdin–inspired; calm, contemplative, shallow depth of field, lotus flowers in focus.',
    imagePath: 'assets/ad-examples/editorial-kerala-bed.png',
  },
  {
    id: 'cinematic-motion-runners',
    name: 'Cinematic Motion – Runners in Park',
    prompt: `A cinematic photo of two men running in a park, motion blur effect, dramatic panning shot, dynamic legs movement, athletic outfits, street photography style, 35mm film grain, low saturation, vintage documentary look, blurred city background, high energy moment, muted tones, shallow depth of field`,
    styleNotes:
      'Dynamic motion: panning blur, limbs in motion, athletic wear. Muted tones, low saturation, 35mm film grain. Street/documentary feel; blurred trees and city in background, horizontal streaks. High energy, vintage documentary look.',
    imagePath: 'assets/ad-examples/cinematic-runners.png',
  },
  {
    id: 'ugc-phone-sky',
    name: 'UGC – Hand with Phone Against Sky',
    prompt: `Close-up, low-angle shot of a person's hand holding a smartphone against a clear, vibrant blue sky. The phone screen reflects the sky and a fluffy white cloud. Natural bright outdoor lighting, soft shadows on hand and sleeve. Dynamic composition: hand and phone from bottom-right toward center, clean minimalist sky backdrop.`,
    styleNotes:
      'UGC / social: hand + phone, sky reflection on screen. Simple composition, natural light, soft shadows. Minimal, relatable, “in-the-moment” feel.',
    imagePath: 'assets/ad-examples/ugc-phone-sky.png',
  },
  {
    id: 'studio-chrome-floral',
    name: 'Studio – Chrome Florals on Red',
    prompt: `Chrome, metallic chrome rocks made from glass, hints of orange and dark deep reds, close up studio shot, smooth petals, the flowers float isolated against a red background, ultra detail, premium, rendered in 4k blender`,
    styleNotes:
      'Premium product/studio: reflective chrome-like floral shapes, deep red background. Close-up, floating, isolated. Ultra detail, 4K Blender-style rendering; orange and deep red in reflections.',
    imagePath: 'assets/ad-examples/studio-chrome-floral.png',
  },
  {
    id: 'editorial-late-night-playlist',
    name: 'Editorial – Late Night Playlist (Cocktails + Vinyl)',
    prompt: `Visual interpretation of a late-night playlist, cocktails and vinyl arranged like album art, warm crimson and gold tones, spotlighted objects against darkness, cinematic lighting, analog grain, restrained editorial photography`,
    styleNotes:
      'Moody editorial still life: turntable, cocktails, record sleeve on dark surface. Warm key light from one side, deep shadows, warm crimson and gold. Analog grain, album-art composition, restrained editorial.',
    imagePath: 'assets/ad-examples/editorial-late-night-playlist.png',
  },
  // ─── Creative / conceptual (product-agnostic: works for clothing, accessories, beauty, etc.) ───
  {
    id: 'surreal-magritte-picnic',
    name: 'Surreal – Magritte-style (Melting Blanket)',
    prompt: `A calm countryside meadow in soft daylight. A couple sits casually on a large checkered picnic blanket, relaxed and quiet. The blanket lies flat on the grass, but one of its edges begins to soften and melt, the checkered pattern stretching and dripping downward in thin vertical streams, as if the fabric has partially lost its solidity. The couple remains completely unaffected, continuing their picnic without reacting. Peaceful atmosphere, no movement, no wind. Subtle surrealism, quiet strangeness, 1960s British surrealism, René Magritte inspired, muted natural colors, clean composition, realistic yet uncanny`,
    styleNotes:
      'Subtle surrealism: realistic photo with one uncanny element (blanket melting into chasm). Muted natural colours, calm meadow, couple oblivious. Magritte-inspired, 1960s British surrealism; narrative, conceptual. Works for any product woven into the scene (blanket, clothing, accessories).',
    imagePath: 'assets/ad-examples/surreal-magritte-picnic.png',
  },
  {
    id: 'cinematic-low-angle-flying',
    name: 'Cinematic – Extreme Low-Angle Flying',
    prompt: `EXTREME LOW-ANGLE UNDER-SIDE VIEW. The camera is on the ground far below, looking straight UP into the sky. More than 80% of the frame is open blue sky. A girl flying, 18-year-old girl, black long hair, wearing a red skirt. The girl is seen from underneath, legs and back silhouetted against the sky. The girl is flying at overwhelming speed, tilted diagonally toward the upper-right. Motion blur is EXTREME; wheels, frame, and clouds stretch into long streaks. Wind tears backward: hair, skirt, stream violently. Far below, only tiny fragments of a flower-covered world and a distant lake appear at the very edges of the frame. Bright daytime, ultra-detailed 3D Ghibli-inspired cinematic style. Only looking UP from below. No pause, no static—pure overhead flight, explosive speed, height, and freedom.`,
    styleNotes:
      'Dramatic cinematic: extreme low-angle, silhouette against sky, extreme motion blur, Ghibli-inspired. Explosive speed and freedom; fashion (skirt, hair) reads as motion. Works for sportswear, activewear, travel, fantasy campaigns.',
    imagePath: 'assets/ad-examples/cinematic-low-angle-flying.png',
  },
  {
    id: 'placement-subway-billboard',
    name: 'Placement – Billboard in Subway (OOH)',
    prompt: `A billboard advertisement inside a New York subway station. The advertising banner is displayed on one wall of the train station platform. People passing by can be seen walking in the background.`,
    styleNotes:
      'Ad-in-environment: billboard on tiled subway wall, commuters blurred in motion. Street photography / cinematic; the “creative” is the placement (OOH). The banner content can be fashion/beauty/model close-up. Moody, urban, high-traffic context.',
    imagePath: 'assets/ad-examples/placement-subway-billboard.png',
  },
  {
    id: 'product-hero-beauty-lipstick',
    name: 'Product Hero – Beauty (KIKO Lipstick)',
    prompt: `Ultra realistic 3D render of a modern KIKO Milano lipstick floating in mid-air, surrounded by glossy black spheres of different sizes, bright magenta and pink gradient background, shiny plastic studio surface, high contrast cinematic lighting, crisp reflections, premium beauty product advertising shot, clean composition, depth of field, hyper detailed, 8K, octane render, unreal engine, studio photography style, sharp focus, minimal, futuristic, luxury aesthetic`,
    styleNotes:
      'Premium product hero: floating product, glossy spheres, gradient background, reflective surface. High-end beauty/fashion product shot; 8K, Octane/Unreal style. Works for accessories, beauty, fashion items—minimal, luxury, futuristic.',
    imagePath: 'assets/ad-examples/product-hero-beauty-lipstick.png',
  },
  // ─── Text-based / typographic ads (bold brand + slogan in layout) ───
  {
    id: 'text-based-dynamic-magenta',
    name: 'Text-based – Dynamic (Magenta gradient)',
    prompt: `A dynamic fashion advertisement for Nike Air featuring a young brown-skinned female model with full curly hair in a dramatic backward-leaning pose against a fluo magenta gradient background with flowing neon magenta organic shapes. The model looks to the camera. The model wears a white oversized sweatshirt and magenta cargo pants with gold chain accessories, complemented by a featured white Nike Air Max sneaker with NIKE LOGO. The composition includes bold white typography displaying "NIKE", "AIR", and "JUST DO IT" in sans-serif fonts. The image combines professional fashion photography with modern graphic design elements, creating a powerful and contemporary athletic aesthetic.`,
    styleNotes:
      'Text-based ad: model + product + bold typography (brand + slogan). Fluo magenta gradient, neon magenta organic shapes, fashion photography + graphic design. Sans-serif "NIKE", "AIR", "JUST DO IT". Works for any brand/product with headline + tagline.',
    imagePath: 'assets/ad-examples/text-based-dynamic-magenta.png',
  },
  {
    id: 'text-based-dynamic-green',
    name: 'Text-based – Dynamic (Green gradient)',
    prompt: `A dynamic fashion advertisement for Nike Air featuring a young female model in a dramatic backward-leaning pose against a fluo green gradient background with flowing neon green organic shapes. The model wears a white oversized sweatshirt and orange cargo pants with chain accessories, complemented by a featured white Nike Air Max sneaker. The composition includes bold white typography displaying "NIKE", "AIR", and "JUST DO IT" in sans-serif fonts. The image combines professional fashion photography with modern graphic design elements, creating a powerful and contemporary athletic aesthetic.`,
    styleNotes:
      'Text-based ad: model + sneaker + bold typography. Fluo green gradient, neon green organic shapes, backward-leaning pose. Sans-serif "NIKE", "AIR", "JUST DO IT". Same formula as magenta variant; swap gradient/shapes for different campaigns.',
    imagePath: 'assets/ad-examples/text-based-dynamic-green.png',
  },
  {
    id: 'text-based-dynamic-blue-white',
    name: 'Text-based – Dynamic (Blue/white + numbers)',
    prompt: `A dynamic fashion advertisement for Nike featuring a young model in a dramatically tilted pose against a fluorescent hot white gradient backdrop with fluid neon blue organic shapes. The model wears an oversized sweatshirt and a soft pleated skirt with chain accessories, accessorized with white Nike sneakers. The composition includes bold white typography featuring the word Nike in serif fonts. The background is composed of the number "684". The image combines professional fashion photography with modern graphic design elements, creating a powerful and contemporary sports aesthetic.`,
    styleNotes:
      'Text-based ad: tilted pose, hot white + neon blue shapes, serif "Nike" typography, large background numerals (e.g. 684). Editorial/sports aesthetic. Numbers add campaign or product-code feel.',
    imagePath: 'assets/ad-examples/text-based-dynamic-blue-white.png',
  },
  {
    id: 'text-based-parody-urban',
    name: 'Text-based – Parody / urban (e.g. "Nixe")',
    prompt: `Illustration of fake Nike sneakers, the brand is called "nixe", cool composition, urban elements that make up the composition.`,
    styleNotes:
      'Conceptual/parody: alternate brand name, urban elements, illustration. Useful for testing layouts or non-literal brand treatments without using real trademarks.',
    imagePath: 'assets/ad-examples/text-based-parody-urban.png',
  },
  {
    id: 'text-based-pop-art',
    name: 'Text-based – Pop art / retro (Just Do It)',
    prompt: `Vibrant pop art style athletic advertising illustration, neon gradient backgrounds from green to purple, dynamic 3D typography with bold letters, stylized cartoon athlete character in action pose, Nike sneakers prominently featured, dramatic lighting effects, retro 80s-90s aesthetic, fluorescent color palette with hot pink, electric green, and purple, comic book style shading, stadium floodlights in background, energetic "Just Do It" motivational vibe, vector art style, high contrast colors, geometric shapes, street art influence, commercial poster design.`,
    styleNotes:
      'Text-based ad: pop art / illustration style. Neon gradient (green to purple), 3D typography, stylized athlete, retro 80s–90s, comic shading, stadium lights, "Just Do It" vibe. Vector art, poster design. Strong for campaigns that want bold, nostalgic, non-photorealistic look.',
    imagePath: 'assets/ad-examples/text-based-pop-art.png',
  },
  {
    id: 'text-based-air-jordan-explosion',
    name: 'Text-based – Product explosion (Air Jordan)',
    prompt: `Dynamic advertisement for Nike Air Jordan: black and red high-top sneaker in deconstructed or explosive state, sole detached, fragments and debris, dark and white smoke, crumbling urban skyscrapers and geometric shapes, vibrant splashes of orange and red paint. Clean light grey background. Bold "NIKE" and "AIR JORDAN" typography. Premium athletic, modern graphic design, high impact.`,
    styleNotes:
      'Text-based + product hero: single sneaker exploding/deconstructed, urban decay, smoke, color splashes. Brand typography integrated. Strong for launch or hero-product campaigns.',
    imagePath: 'assets/ad-examples/text-based-air-jordan-explosion.png',
  },
  // ─── Standalone product shots (no model; brand provides product image) ───
  {
    id: 'standalone-surreal-installation',
    name: 'Standalone – Surreal installation (floating beads, ribbons)',
    prompt: `A pair of clean Air Jordan 1 Retro High OG on a floating string of off-white stone beads. The shoes are suspended in mid-air, with Bohemian-style ribbons floating around them. This surreal Air Jordan 1 Retro High OG features a white-brown gradient background and an installation art style. Wide-angle perspective, strong visual impact, Carlos Jimenez Varela style, advertising design image, warm tones, film style, surreal 3D landscape style, shoe advertisement, poster.`,
    styleNotes:
      'Standalone product: no model. Product (e.g. sneakers) in surreal setting—floating stone beads, ribbons, gradient sky-to-ground, installation art. Wide-angle, warm tones, poster-style. Brand supplies product image; we generate or describe the context.',
    imagePath: 'assets/ad-examples/standalone-surreal-installation.png',
  },
  {
    id: 'standalone-clean-4k',
    name: 'Standalone – Clean 4K product image',
    prompt: `Jordan 1 Golf Shoes, product image, 4K.`,
    styleNotes:
      'Standalone product: clean studio shot, neutral grey background, even lighting, high-res 4K. No environment narrative—product only, professional e‑commerce/catalog style. Brand supplies product image.',
    imagePath: 'assets/ad-examples/standalone-clean-4k.png',
  },
  {
    id: 'standalone-high-fashion-path',
    name: 'Standalone – High-fashion minimal (concrete path to horizon)',
    prompt: `High-fashion photograph of a single Air Jordan 1 High Chicago sneaker. The sneaker rests on a smooth, continuous, abstract ribbon of light grey concrete, winding and vanishing into a bright white horizon. The concrete texture is fine and polished. Professional studio lighting, clean, modern, artistic. Wide-angle, expansive background, luxury product presentation.`,
    styleNotes:
      'Standalone product: one hero product on abstract path (concrete ribbon) receding into white horizon. Minimal, high-fashion, luxury. Brand supplies product image; we generate the path/horizon context.',
    imagePath: 'assets/ad-examples/standalone-high-fashion-path.png',
  },
  // ─── Creative / custom creative ads (conceptual, editorial, one-off concepts) ───
  {
    id: 'creative-reeded-glass-portrait',
    name: 'Creative – Reeded glass portrait (optical distortion)',
    prompt: `Side profile portrait of a man facing left, wearing a bright neon green tracksuit, photographed entirely through thick vertically reeded architectural glass. Vertical grooves running top to bottom across the entire frame, parallel vertical lines clearly visible, no horizontal texture. Full-frame optical distortion dominating the image, textured acrylic glass in the foreground, realistic physical light refraction warping the profile of the face and upper body into vertical repetitions. Subtle neon green glow softly radiating from the clothing and gently bleeding into the glass ridges, faint green light scattering through the vertical grooves. High-key studio background in pale gray and off-white tones, cool neutral lighting, modern editorial portrait, restrained and minimal. Physical optics not digital, no glitch.`,
    styleNotes:
      'Creative portrait: subject shot through reeded glass; vertical grooves, light refraction, vertical repetitions. Neon glow from clothing into glass. High-key studio, cool neutral light, editorial, no digital glitch—physical optics only.',
    imagePath: 'assets/ad-examples/creative-reeded-glass-portrait.png',
  },
  {
    id: 'creative-bold-color-studio',
    name: 'Creative – Bold color studio (red backdrop, strong contrast)',
    prompt: `A high-fashion editorial portrait of a woman sitting on the floor in a relaxed yet confident pose, legs folded asymmetrically, arms resting casually. She wears a black minimalist dress, vivid green tights, and glossy red high-heeled shoes. Natural makeup with bold red lipstick, short brown hair with soft bangs. The background is a solid deep red studio backdrop. Clean composition, strong color contrast between red, green, and black, retro-modern aesthetic, editorial fashion photography, soft but directional studio lighting, sharp focus, realistic skin texture, cinematic color grading, magazine-quality styling.`,
    styleNotes:
      'Creative editorial: deep red backdrop, black dress, green tights, red shoes/lipstick. Strong color contrast, retro-modern, magazine-quality. Seated confident pose, clean composition.',
    imagePath: 'assets/ad-examples/creative-bold-color-studio.png',
  },
  {
    id: 'creative-bingo-table',
    name: 'Creative – Bingo table (group editorial, flash, film grain)',
    prompt: `Photography of women wearing blue and pink, sitting at a table playing bingo with friends in a bright hall. One woman holds her hand out to show off large rings on each finger. Another has black sunglasses, a third wears glasses and holds up a diamond ring. They all wear white hats and different colored outfits. The table is covered by many scattered bingo cards with bright colors and symbols. The shot is taken from above, using flash photography on 35mm film, resulting in a grainy appearance.`,
    styleNotes:
      'Creative group editorial: bingo table, statement accessories (rings, sunglasses), varied hats and colors. Overhead angle, flash on 35mm, film grain. Bold, personality-driven, retro social vibe.',
    imagePath: 'assets/ad-examples/creative-bingo-table.png',
  },
  {
    id: 'creative-follow-cam-snowboard',
    name: 'Creative – Follow-cam action (snowboard, powder, motion)',
    prompt: `Follow-cam snowboard shot from directly behind a rider in a white jacket, positioned near the bottom of the frame, standing sideways on the board while carving fast through snow, with powder spraying outward behind the tail. A single massive snow jump rises in the distance at center frame beneath a clear blue sky, with subtle directional motion blur in the snow to convey speed.`,
    styleNotes:
      'Creative action: low-angle follow-cam, rider in white, powder spray, motion blur, blue sky, distant jump. Athletic/outdoor campaign; works for sportswear, winter, adventure.',
    imagePath: 'assets/ad-examples/creative-follow-cam-snowboard.png',
  },
  {
    id: 'creative-product-hands-motion-blur',
    name: 'Creative – Product in hands (motion blur, golden glow)',
    prompt: `Product photography of a bottle of golden serum floating in the air, surrounded by hands reaching out from behind. The hands show strong horizontal motion blur. The bottle is frosted glass with a soft golden glow. The background is white with soft lighting highlighting the product texture. Shot on a macro lens for sharp focus on the product, shallow depth of field. Warm, luxurious, dynamic.`,
    styleNotes:
      'Creative product: bottle (or hero product) centered, hands with motion blur framing it. Golden glow, warm tones, macro sharp on product. Beauty/skincare/luxury; human touch without showing face.',
    imagePath: 'assets/ad-examples/creative-product-hands-motion-blur.png',
  },
  {
    id: 'creative-raw-analog-tennis',
    name: 'Creative – RAW analog tennis (Gen Z, Lacoste-style)',
    prompt: `RAW analog editorial of two Gen Z individuals standing casually on a tennis court near the net, playful and rebellious vibe. In the foreground, a female wears a cropped white sports top, pleated white tennis skirt, white crew socks with bold black stripes, and crisp white sneakers. A headband and wristbands add a retro flair. Her tennis racket lies on the blue-green court beside scattered white tennis balls. Behind her, a male sits relaxed on the net, leaning back. He wears an all-white outfit: polo, shorts, socks with stripes, white sneakers. Style: RAW analog fashion editorial, 35mm overhead angle, natural daylight, soft urban outdoor tone, slight overexposure for film look. Mood: rebellious, carefree, Gen Z editorial sports-lifestyle crossover. Analog film grain, matte finish. Color palette: whites and blacks dominant, balanced by blue-green tennis court.`,
    styleNotes:
      'Creative lifestyle: tennis court, two models, sport + fashion. RAW analog, 35mm, film grain, natural daylight. Gen Z, playful, rebellious. Strong for sportswear/lifestyle brands.',
    imagePath: 'assets/ad-examples/creative-raw-analog-tennis.png',
  },
  {
    id: 'creative-surreal-horse-shadow',
    name: 'Creative – Surreal shadow (horse, red backdrop, Tim Walker)',
    prompt: `Full-body fashion photography of an Asian woman, holding a black object (kettle or box) in one hand and a rein in the other. A large, sharp shadow of a horse head and neck is cast on the deep red wall behind her. The model is dressed entirely in black—long-sleeved top, long pleated skirt, belt with gold accents and tassel. She stands sideways in front of a deep red background, symmetrical left-to-right composition. Style references Tim Walker surreal theatrical aesthetic blended with Eastern mood and restrained romance. High-contrast palette: red, black, gold. Studio lighting, strong contrast between light and shadow, cinematic depth. Dark yet refined, hyper-realistic details, high-end fashion magazine cover, luxury campaign quality, film look.`,
    styleNotes:
      'Creative editorial: surreal horse shadow on red wall, model in black with rein and prop. Tim Walker–meets–Wong Kar-wai mood. Luxury, cinematic, symbolic. Strong for high-fashion and luxury campaigns.',
    imagePath: 'assets/ad-examples/creative-surreal-horse-shadow.png',
  },
  {
    id: 'creative-beauty-close-up-cream',
    name: 'Creative – Beauty close-up (cream application)',
    prompt: `A clean studio beauty close-up portrait of a Black woman with an oval face, dewy realistic skin with natural pores, and soft freckles across the cheeks and nose. Her dark hair is slicked straight back, makeup is minimal, lips are softly glossy, and her expression is calm with a gentle gaze toward the camera. Pose: tight 3/4 view, head slightly tilted, one hand lifted beside her face gripping a plain white squeeze tube, wrist subtly rotated so the nozzle points toward the upper cheekbone. A thick white cream dollop sits on the cheek as it is dispensed, forming a rounded drip with glossy highlights and clean edges, showing realistic viscosity and surface tension. Warm off-white seamless background, high-key soft studio lighting, shallow depth of field focusing on the cheek texture and cream, neutral modern color grading, 85mm portrait look, f/2.8.`,
    styleNotes:
      'Beauty/skincare creative: close-up portrait, product (cream/tube) in application moment on cheek. Realistic viscosity, dewy skin, minimal makeup. 85mm, warm off-white studio, high-key soft light. For beauty brands.',
    imagePath: 'assets/ad-examples/creative-beauty-close-up-cream.png',
  },
  {
    id: 'creative-cyclorama-juice-portrait',
    name: 'Creative – White void portrait (14mm, juice carton)',
    prompt: `Photorealistic close-up portrait of a young man standing in an infinite white void with no visible walls or ceiling, like a seamless white cyclorama. The camera is very close to his face, shot on an ultra-wide 14mm lens with subtle perspective distortion, his face centered in frame. He is drinking juice from a small cardboard carton with a straw; the carton has early-2000s retro tech packaging vibes inspired by Windows XP color blocks (no readable branding). He wears an oversized crisp white button-up shirt, loose black trousers, chunky black shoes, thin round glasses, slightly messy dark hair; calm, detached expression. Soft studio lighting from above and slightly front, gentle shadows, high skin and fabric detail, slight glossy highlights on the carton, shallow depth of field focused on the eyes and the straw.`,
    styleNotes:
      'Creative portrait: infinite white void/cyclorama, 14mm ultra-wide, face centered, barrel distortion. Product (juice carton) in use, retro packaging. Detached, calm mood. Strong for F&B or lifestyle with product-in-hand.',
    imagePath: 'assets/ad-examples/creative-cyclorama-juice-portrait.png',
  },
  {
    id: 'creative-fashion-kick-identity',
    name: 'Creative – Fashion kick (identity lock, wide-angle boot)',
    prompt: `Use the provided reference photo as identity reference of the person. Preserve face, body, proportions, age, and appearance exactly. Do not change identity. Ultra realistic fashion action shot. The same person is standing and kicking directly into the camera with one leg. The boot is extremely close to the lens, dominating the foreground. Perspective distortion is strong but realistic, wide-angle lens effect. The sole of the boot is sharply detailed, fabric, seams, texture visible. Outfit: pastel pink ribbed bodysuit, knitted pastel pink balaclava (no logos, no text), pastel pink winter boots. Everything identical to previous look. Camera angle: very low, almost floor level, looking up. Camera: 24mm wide lens, dramatic perspective, cinematic distortion. Focus: boot in foreground sharp, face slightly softer but still recognizable. Motion: frozen action moment, dynamic energy, fashion kick. Lighting: strong studio key light from above, soft fill from front, clean shadows on the white background, high contrast, crisp commercial light. Background: pure white seamless studio. Skin: realistic texture, slight moisture, subtle snow particles on legs and outfit.`,
    styleNotes:
      'Creative action with identity lock: reference photo preserves face/body. Frozen kick toward camera, pastel pink bodysuit/balaclava/boots. Low angle, 24mm, boot dominates foreground. White seamless studio, high contrast. For fashion/athletic campaigns with influencer or model reference.',
    imagePath: 'assets/ad-examples/creative-fashion-kick-identity.png',
  },
  {
    id: 'creative-martin-parr-domestic',
    name: 'Creative – Martin Parr style (domestic, ice cream, pottery)',
    prompt: `A realistic photo in the style of Martin Parr. An old woman is sitting on her chair eating ice cream in a balaclava and watching a boy doing pottery in a red and white striped shirt at home. The wall behind them has blue wallpaper. There is another picture above their heads depicting the earth standing next to two suns in the sky.`,
    styleNotes:
      'Creative documentary/editorial: Martin Parr–style saturated, candid domestic scene. Quirky details (balaclava + ice cream, boy pottery, red-white shirt, blue wallpaper, surreal picture of earth and two suns). Strong for lifestyle, F&B, or editorial with a humorous, observational tone.',
    imagePath: 'assets/ad-examples/creative-martin-parr-domestic.png',
  },
  // ─── Additional ad types (prompts inferred from reference; focus on lighting & format) ───
  {
    id: 'ooh-billboard-dual-panel',
    name: 'OOH – Dual-panel billboard (linked narrative)',
    prompt: `Large outdoor billboard on a brick building, composed of two horizontal panels. Top panel: beauty/fashion ad, dark background, close-up portrait of a woman with wind-swept hair, bold red lipstick, holding a straw between her lips, lipstick tube and brand type visible. Bottom panel: beverage ad, solid red background, glass bottle with condensation, same straw extending from the model’s mouth down into the bottle, linking both panels. Crisp studio-style lighting on both panels, bold red/black/white palette. Shot of the full billboard in context: building, windows, sky. High-quality OOH campaign, unified narrative across panels.`,
    styleNotes:
      'OOH format: multi-panel billboard with shared element (straw) linking beauty + beverage. Quality: dramatic key light on model, bright even light on product, strong color contrast. For placement or cross-category campaigns.',
    imagePath: 'assets/ad-examples/ooh-billboard-dual-panel.png',
  },
  {
    id: 'sports-monochrome-typography',
    name: 'Sports – Monochrome + integrated typography (Nike-style)',
    prompt: `Motivational sports advertisement. Male athlete in dynamic motion—mid-stride or jump, holding a basketball, one leg raised, arm extended. Bold white sans-serif typography "JUST DO IT" stacked vertically and integrated with the figure so the subject and type overlap. Solid medium gray background. Grayscale only: black, white, dark gray. Professional studio lighting: key light from above and front, crisp shadows defining musculature and form, no color distraction. Brand logo small at bottom center. High contrast, timeless, powerful.`,
    styleNotes:
      'Sports/motivation: monochrome, athlete + slogan merged in layout. Quality lighting: single key, clean shadows, sharp detail on skin and fabric. Strong for athletic brands.',
    imagePath: 'assets/ad-examples/sports-monochrome-typography.png',
  },
  {
    id: 'food-urban-night',
    name: 'Food – Urban night (product in context)',
    prompt: `Food advertisement in an urban night setting. Young person at a bus shelter or transit stop, about to take a bite of a sandwich, product held toward camera. Cool greenish fluorescent light from shelter ceiling, warm glow from illuminated ad posters in background. Wet street reflecting neon (magenta, blue, yellow) in distance. Slightly low angle, cinematic moody but inviting. Product and face well-lit despite night; studio-quality fill so sandwich and expression are sharp. Red and yellow brand accents. Tagline and logo visible.`,
    styleNotes:
      'Food/F&B: product in use in real-world night context. Quality: mix of fluorescent + poster glow + reflected neon; subject and product still crisp and appetizing. For QSR or packaged food.',
    imagePath: 'assets/ad-examples/food-urban-night.png',
  },
  {
    id: 'vintage-catalog-whimsical',
    name: 'Vintage catalog – Whimsical (product + character)',
    prompt: `Vintage print ad style, late 1980s. Central character (e.g. animal or stylized figure) using or holding the product, earphones on, device in hand. Additional product lineup displayed below on a surface. Soft gradient background (e.g. light blue sky). Japanese and English typography: brand name, product line, catalog copy. Bright even studio light, subtle shadows, muted product colors (red, white, black) popping against soft blue. Whimsical, memorable, catalog layout with clear branding.`,
    styleNotes:
      'Vintage catalog: character + product, gradient background, multilingual copy. Quality: soft, even lighting; no harsh shadows; product colors clear. For electronics, CPG, or retro campaigns.',
    imagePath: 'assets/ad-examples/vintage-catalog-whimsical.png',
  },
  {
    id: 'food-office-product-in-hand',
    name: 'Food – Office / lifestyle (product-in-hand to camera)',
    prompt: `Modern food advertisement in an office or co-working setting. Woman smiling at camera, one hand extending the product (e.g. yogurt cup) directly toward the viewer. Desk with laptop and papers, glass partitions in soft-focus background. Bright, soft overhead lighting (recessed ceiling lights), high-key. Slightly low angle so product in foreground reads large. Sharp focus on face and product; background gently blurred. Bold headline and brand typography. Fresh, healthy, professional lifestyle.`,
    styleNotes:
      'F&B lifestyle: product offered to camera in workplace. Quality: even overhead soft light, high-key, no harsh shadows; product and skin texture clear. For yogurt, snacks, wellness.',
    imagePath: 'assets/ad-examples/food-office-product-in-hand.png',
  },
  {
    id: 'creative-bw-neon-cta',
    name: 'Creative – B&W portrait + neon graphics + CTA',
    prompt: `Modern creative or educational ad. Black and white portrait of a person filling one half of the frame, looking at camera, one hand pointing toward viewer. Bold graphic element (e.g. neon green bar) across eyes or key area. Opposite side: bold black headline type (e.g. "start Learning today #create design") with neon green highlight on key word. Organic neon green shape behind subject. Clean white background. Call-to-action and contact (e.g. "Contact Us Now", Instagram) in smaller type with neon accent. Studio lighting on portrait: soft, even, high contrast.`,
    styleNotes:
      'Creative/education: B&W photo + neon graphic overlays + strong CTA. Quality: clean studio light on face, crisp neon, clear hierarchy. For courses, agencies, design brands.',
    imagePath: 'assets/ad-examples/creative-bw-neon-cta.png',
  },
  {
    id: 'editorial-glow-blur-portrait',
    name: 'Editorial – Glow blur portrait (dreamy, warm)',
    prompt: `Editorial or magazine-style portrait with a "glow blur" aesthetic. Male or female subject, close-up, soft focus at edges. Strong warm key light from one side creating a radiant halo on hair, glasses, and skin; opposite side in soft shadow with subtle edge glow. Dark background (black or charcoal) with faint warm golden-orange reflections. Dreamy, ethereal, slightly painterly. Bold typography for title (e.g. "CHROMAZINE", "GLOW BLUR") in warm golden-orange. Descriptive or editorial copy below. High-quality portrait lighting with deliberate blur and glow for mood.`,
    styleNotes:
      'Editorial/beauty: glow-blur technique, warm key light, halo effect, dark BG. Quality: soft transitions, no harsh edges, ethereal. For magazines, beauty, or technique-led campaigns.',
    imagePath: 'assets/ad-examples/editorial-glow-blur-portrait.png',
  },
  // ─── Cinematic sports & CGI animal fashion (full prompts with placeholders) ───
  {
    id: 'cinematic-sports-tunnel',
    name: 'Cinematic sports – Stadium tunnel (back view)',
    prompt: `Cinematic back view shot of footballer [Player Name] from [Football Club] emerging from stadium tunnel onto illuminated football pitch, captured by professional sports photographer using dynamic low-angle perspective with subject centered in frame, dramatic nocturnal stadium lighting creating volumetric god rays and atmospheric mist, high detail rendering showing player's kit textures and muscular definition against moody blue-purple ambient glow, club emblem visible on tunnel wall banner in selective focus, stadium crowd banners softly blurred in background stands, photorealistic depth of field with bokeh effects, wet concrete floor reflecting colored stadium lights transitioning to pristine grass, epic hero moment composition with strong leading lines from tunnel architecture opening to pitch, professional color grading with teal and orange cinematic LUT, 8K resolution sharp details, sports illustrated magazine cover quality, golden ratio composition placing player slightly off-center for visual tension, rim lighting separating subject from background, Canon EOS R5 aesthetic with 24-70mm f/2.8 lens characteristics, subtle lens flare from stadium floods, HDR tone mapping preserving shadow and highlight detail, artificial floodlights clearly illuminating player's back and shoulders.`,
    styleNotes:
      'Replace [Player Name] with e.g. Cristiano Ronaldo, Lionel Messi, Kylian Mbappé; [Football Club] with e.g. Real Madrid, Barcelona, Arsenal. Cinematic: low angle, volumetric god rays, rim light, teal-orange grade, wet reflections, tunnel leading lines, 8K, bokeh. Sports magazine / hero moment.',
    imagePath: 'assets/ad-examples/cinematic-sports-tunnel.png',
  },
  {
    id: 'cgi-animal-fashion',
    name: 'CGI animal fashion – Surreal luxury editorial',
    prompt: `A photorealistic CGI 3D rendered [animal] wearing luxurious [cloth], shot from waist up in frontal pose with focus on the head, set against a clean minimalist [color] solid background, styled with surrealist and comedic elements for a high-fashion editorial look, illuminated by soft diffused lighting with gentle shadows that create smooth tonal transitions and dimensional depth, rendered in ultra-high detail with sharp textures on the subject while maintaining a shallow depth of field, bold saturated colors with contemporary luxury brand aesthetic that's both premium and playfully absurd.`,
    styleNotes:
      'Replace [animal] with e.g. polar bear, cat, dog, fox, owl; [cloth] with e.g. blue puffer jacket, leather jacket, silk kimono, evening gown; [color] with e.g. pastel blue, mint green, ivory white. Soft diffused studio light, shallow DoF, surreal + comedic high-fashion. Video variant: same character, minimal pastel BG, subtle weight shifts and fabric sways, static camera, calm premium motion.',
    imagePath: 'assets/ad-examples/cgi-animal-fashion.png',
  },
  // ─── 9:16 vertical fashion + text overlay; lifestyle product mockup ───
  {
    id: 'vertical-lehenga-celebrate',
    name: '9:16 vertical – Celebratory lehenga (peach, text overlay)',
    prompt: `9:16 vertical format. Joyful celebratory shot, model in peach organza lehenga with rose gold sequin work creating all-over shimmer, layered organza creating volume and texture, matching embroidered crop-style blouse, peach dupatta with rose gold border held in both hands raised slightly creating wings effect, standing against soft lilac painted wall with subtle texture filling entire vertical frame, model laughing genuinely with head slightly tilted back showing pure joy, hair in loose romantic curls with small floral hair accessory, rose gold jewelry—statement earrings and layered delicate necklaces, fresh dewy makeup with peach-toned lips and highlighter, shot at 1/250 capturing the joyful moment, natural window light from side creating warm glow, model centered in frame with fabric creating visual interest. TEXT OVERLAY: Top left—"Celebrate" in playful handwritten-style font, rose gold #B76E79; below "in your" in modern sans-serif, soft gray #808080; lower right near fabric—"OWN SHADE" in larger elegant serif, peach #FFE5B4 matching lehenga; diagonal flow, celebratory and light.`,
    styleNotes:
      'Vertical 9:16 Indian/wedding fashion. Text overlay specs: Celebrate (handwritten, #B76E79), in your (sans, #808080), OWN SHADE (serif, #FFE5B4). Natural window light, lilac wall, peach + rose gold palette.',
    imagePath: 'assets/ad-examples/vertical-lehenga-celebrate.png',
  },
  {
    id: 'vertical-sharara-twirl',
    name: '9:16 vertical – Sharara twirl (powder blue, text overlay)',
    prompt: `9:16 vertical format. Dynamic fashion shot, model in powder blue georgette sharara set with intricate gota patti work, matching short kurti with three-quarter sleeves and delicate embroidery on neckline, powder blue dupatta flowing mid-motion, model captured mid-twirl showing the beautiful flare and movement of sharara pants, shot against soft blush pink textured wall that fills entire vertical frame, natural afternoon light creating gentle shadows, profile view with model's face turned slightly toward camera, eyes closed with peaceful smile suggesting joy and freedom, hair in loose natural waves flowing with movement, minimal gold jewelry—small hoops and thin bangles, shot at 1/500 shutter speed to freeze the graceful motion perfectly, model positioned in center with fabric movement creating visual interest in lower half. TEXT OVERLAY: Upper right (top 20% of frame) in minimalist thin sans-serif "Who said love" / "has to be loud?" in soft charcoal gray #4A4A4A; left side middle area, elegant script (Allura style) "Whisper it in powder blue" in powder blue #AEC6CF matching outfit, curving with fabric; light and airy.`,
    styleNotes:
      'Vertical 9:16 Indian fashion, mid-twirl. Text: "Who said love has to be loud?" (sans, #4A4A4A) top right; "Whisper it in powder blue" (script, #AEC6CF) left. Blush pink wall, 1/500 freeze motion.',
    imagePath: 'assets/ad-examples/vertical-sharara-twirl.png',
  },
  {
    id: 'lifestyle-blank-tee-mockup',
    name: 'Lifestyle – Blank tee mockup (product clean, no graphics)',
    prompt: `Photorealistic lifestyle image of a woman wearing a moss green oversized t-shirt with a denim jacket draped off her shoulders. Keep the model, lighting, pose, background, accessories, and fabric texture exactly the same. Remove all text and graphics from the t-shirt completely: no American flag, no "1776", "We The People", "250 Years", "2026", no stars. The t-shirt front must be completely blank, smooth, and clean. No ghosting, no faded print marks, no shadow residue from any previous design. Maintain natural cotton texture and realistic fabric folds. High resolution 4500x5400px, 300 DPI, ultra realistic, print-ready mockup. The chest area must look factory-new and never printed before.`,
    styleNotes:
      'Lifestyle product mockup: same model/pose/lighting/background; only change is shirt—fully blank, no graphics or text residue. For print-ready apparel mockups (e.g. custom tee). Outdoor, rustic BG, natural light.',
    imagePath: 'assets/ad-examples/lifestyle-blank-tee-mockup.png',
  },
]

/** Look up an example by id */
export function getAdStyleExample(id: string): AdStyleExample | undefined {
  return AD_STYLE_EXAMPLES.find((e) => e.id === id)
}
