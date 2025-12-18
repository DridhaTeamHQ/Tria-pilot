/**
 * FACE ANALYZER - GPT-4o Vision for Forensic Identity Extraction
 * 
 * This module analyzes a person's face and body with extreme precision
 * to generate detailed identity descriptions that Gemini can use for
 * perfect identity preservation.
 * 
 * Based on research:
 * - Google Whisk's SUBJECT reference concept
 * - Midjourney's --cref (character reference)
 * - Forensic facial analysis techniques
 */

import { getOpenAI } from '@/lib/openai'

function formatImageUrl(base64: string) {
  if (base64.startsWith('data:image/')) return base64
  return `data:image/jpeg;base64,${base64}`
}

export interface ForensicFaceAnalysis {
  // Core facial geometry
  faceShape: string
  faceWidth: string
  jawlineType: string
  chinShape: string
  foreheadShape: string
  cheekboneProminence: string

  // Eye region
  eyeColor: string
  eyeShape: string
  eyeSize: string
  eyeSpacing: string
  eyeDepth: string
  eyelidType: string
  eyeLashes: string
  eyebrowShape: string
  eyebrowThickness: string
  eyebrowColor: string

  // Nose details
  noseShape: string
  noseBridgeWidth: string
  noseTipShape: string
  nostrilShape: string

  // Mouth and lips
  lipFullnessUpper: string
  lipFullnessLower: string
  lipWidth: string
  cupidsBow: string
  lipColor: string
  teethVisibility: string

  // Skin
  skinTone: string
  skinUndertone: string
  skinTexture: string
  poreVisibility: string
  skinImperfections: string[] // moles, freckles, scars, etc.

  // Hair
  hairColor: string
  hairHighlights: string
  hairTexture: string
  hairDensity: string
  hairLength: string
  hairStyle: string
  hairPartPosition: string

  // Body characteristics
  bodyType: string
  shoulderWidth: string
  neckLength: string
  armProportions: string

  // Expression and pose
  currentExpression: string
  headTilt: string
  gazeDirection: string

  // Distinctive features (critical for identity)
  distinctiveMarks: string[]

  // Summary for prompt use
  identitySummary: string
}

/**
 * Analyze face with GPT-4o Vision for forensic-level identity extraction
 * This creates a detailed "identity fingerprint" that Gemini can use
 */
export async function analyzeFaceForensic(
  personImageBase64: string,
  additionalImages: string[] = []
): Promise<ForensicFaceAnalysis> {
  const openai = getOpenAI()

  const systemPrompt = `You are a FORENSIC FACIAL BIOMETRICS EXPERT creating a precise identity profile for AI image generation.
Your analysis determines whether the AI will correctly reproduce this exact person. Errors mean identity loss.

CRITICAL: This is forensic-level analysis. Measure, don't guess. Be specific, not generic.

Return a JSON object with these exact fields:

═══════════════════════════════════════════════════════════════════════════════
FACIAL GEOMETRY (CRITICAL FOR SHAPE PRESERVATION):
═══════════════════════════════════════════════════════════════════════════════
- faceShape: Primary shape (oval/round/square/heart/diamond/oblong/rectangular)
  └ Include RATIO observation: "oval, face length ~1.4x width" or "square, width nearly equals length"
- faceWidth: (narrow/medium/wide) + comparison: "wide, notably wider than typical oval"
- jawlineType: (sharp/angular/soft/rounded/square/V-shaped/U-shaped)
  └ Be specific: "sharp angular jaw tapering to pointed chin" not just "angular"
- chinShape: (pointed/rounded/square/cleft/small/prominent/receding/protruding)
- foreheadShape: Height (high/medium/low) + width (narrow/medium/wide) + curvature
- cheekboneProminence: (high and prominent/subtle/flat) + position on face

═══════════════════════════════════════════════════════════════════════════════
EYE REGION (MOST CRITICAL FOR IDENTITY - 60% OF RECOGNITION):
═══════════════════════════════════════════════════════════════════════════════
- eyeColor: EXACT color with layers. Examples:
  ✓ "dark brown, nearly black, with warm amber ring around pupil"
  ✓ "medium brown with golden-honey flecks, darker outer ring"
  ✗ "brown" (too vague)
- eyeShape: (almond/round/hooded/monolid/upturned/downturned/deep-set/protruding/cat-eye)
  └ Add asymmetry if present: "almond, slightly more hooded on left"
- eyeSize: (small/medium/large) + proportion: "large relative to face, horizontally elongated"
- eyeSpacing: (close-set/medium/wide-set) + measurement: "wide-set, ~1.5 eye-widths apart"
- eyeDepth: (deep-set/average/protruding) + shadow pattern description
- eyelidType: (single/double/hooded) + crease position + visibility
- eyeLashes: Length + density + curl. "Long, dense, naturally curled upward"
- eyebrowShape: (arched/straight/curved/S-shaped/angular/rounded arch)
  └ Include peak position: "high arch, peak at outer 1/3"
- eyebrowThickness: (thin/medium/thick/bushy) + grooming: "thick, natural, slightly ungroomed"
- eyebrowColor: Compare to hair: "matches black hair" or "lighter than dark brown hair"

═══════════════════════════════════════════════════════════════════════════════
NOSE (UNIQUE IDENTIFIER):
═══════════════════════════════════════════════════════════════════════════════
- noseShape: Profile shape (straight/curved/concave/convex/roman/button/aquiline)
- noseBridgeWidth: (narrow/medium/wide) at different points if variable
- noseTipShape: (pointed/rounded/bulbous/upturned/downturned/bifid)
- nostrilShape: (narrow/medium/wide/flared) + symmetry notes

═══════════════════════════════════════════════════════════════════════════════
LIPS AND MOUTH:
═══════════════════════════════════════════════════════════════════════════════
- lipFullnessUpper: (thin/medium/full/very full) + shape
- lipFullnessLower: (thin/medium/full/very full) + ratio to upper
- lipWidth: (narrow/medium/wide) relative to nose width
- cupidsBow: (pronounced/subtle/flat/M-shaped/rounded)
- lipColor: Natural undertone (pink-toned/rose/mauve/brown-pink/burgundy/dark)
- teethVisibility: Current state + tooth characteristics if visible

═══════════════════════════════════════════════════════════════════════════════
SKIN (CRITICAL - AI TENDS TO LIGHTEN/SMOOTH - MUST PRESERVE EXACTLY):
═══════════════════════════════════════════════════════════════════════════════
- skinTone: Use Fitzpatrick + descriptive scale:
  Type I-II: "very fair/fair with pink undertones"
  Type III: "light-medium, beige"  
  Type IV: "medium, warm olive" or "medium, golden-tan"
  Type V: "medium-deep, warm brown" or "tan, caramel"
  Type VI: "deep, rich brown" or "very deep, ebony"
  └ BE PRECISE. "Medium-tan with warm golden undertone" not just "tan"
- skinUndertone: (warm/cool/neutral/olive) + evidence: "warm, yellow-gold tones in neck"
- skinTexture: Real texture, not idealized. Include: pore size, any roughness, shine zones
- poreVisibility: Location-specific: "visible on nose and inner cheeks, minimal on forehead"
- skinImperfections: ARRAY of ALL visible marks with EXACT LOCATIONS:
  ["mole on left cheek 2cm from nose", "freckles scattered across nose bridge and cheeks", "small acne marks on chin area", "dark circles under eyes"]
  └ Include: moles, freckles, scars, birthmarks, texture variations, tan lines

═══════════════════════════════════════════════════════════════════════════════
HAIR (FRAMING AFFECTS FACE PERCEPTION):
═══════════════════════════════════════════════════════════════════════════════
- hairColor: Multi-tonal description:
  ✓ "jet black with subtle blue-sheen in light, no visible brown"
  ✓ "dark brown base with natural copper highlights at crown, darker at roots"
  ✗ "dark brown" (too vague)
- hairHighlights: (natural sun-lightened/dyed/balayage/none) + placement
- hairTexture: Curl pattern (straight/wavy/curly/coily) + strand thickness (fine/medium/coarse)
- hairDensity: (thin/medium/thick/very thick) + volume description
- hairLength: Precise. "Just past shoulders, longest layers reach mid-back"
- hairStyle: CURRENT styling visible in image
- hairPartPosition: (left/center/right/none/zigzag) + depth of part

═══════════════════════════════════════════════════════════════════════════════
BODY BUILD:
═══════════════════════════════════════════════════════════════════════════════
- bodyType: (slim/slender/average/athletic/curvy/plus-size/pear/hourglass/inverted-triangle)
- shoulderWidth: (narrow/medium/broad) relative to hips
- neckLength: (short/medium/long) + thickness
- armProportions: (slender/medium/toned/muscular) + any notes

═══════════════════════════════════════════════════════════════════════════════
CURRENT STATE (EXPRESSION & POSE):
═══════════════════════════════════════════════════════════════════════════════
- currentExpression: Detailed description, not just label
  ✓ "genuine wide smile, cheeks raised, eye crinkles visible"
  ✓ "neutral with slight lip tension, relaxed brow"
- headTilt: Axis + degree: "slight right tilt ~10 degrees, chin slightly down"
- gazeDirection: "direct camera contact" or "looking camera-left, eyes ~15 degrees off-axis"

═══════════════════════════════════════════════════════════════════════════════
DISTINCTIVE MARKS (MAKE-OR-BREAK FOR RECOGNITION):
═══════════════════════════════════════════════════════════════════════════════
- distinctiveMarks: EXHAUSTIVE ARRAY with precise locations:
  ["beauty mark 1cm below right eye outer corner", "gold nose stud right nostril", "small vertical scar through left eyebrow", "3 ear piercings on left ear", "single lobe piercing right ear"]

═══════════════════════════════════════════════════════════════════════════════
IDENTITY SUMMARY (THIS IS FED DIRECTLY TO IMAGE AI):
═══════════════════════════════════════════════════════════════════════════════
- identitySummary: 3-4 sentences capturing the MOST DISTINCTIVE features.
  Format: Start with most unique identifiers. Include:
  1. Skin tone + undertone (exact)
  2. Eye color + distinctive eye features
  3. Face shape + key proportions
  4. Any unique marks/features that are instantly recognizable
  
  Example: "Medium-tan skin with warm golden undertone (Fitzpatrick IV). Large, dark brown almond eyes with visible double eyelid and long natural lashes. Heart-shaped face with high cheekbones, small pointed chin. Distinctive beauty mark below right eye. Thick black hair with natural wave, parted center."

THIS ANALYSIS MUST BE PRECISE ENOUGH TO IDENTIFY THIS PERSON IN A LINEUP.`

  const imageInputs: any[] = [
    { type: 'image_url', image_url: { url: formatImageUrl(personImageBase64), detail: 'high' } },
  ]

  // Add additional reference images if provided
  for (const img of additionalImages.slice(0, 5)) { // Max 5 additional
    if (img && img.length > 100) {
      imageInputs.push({ type: 'image_url', image_url: { url: formatImageUrl(img), detail: 'high' } })
    }
  }

  const userPrompt = imageInputs.length > 1
    ? `Analyze this person's face from ${imageInputs.length} reference images. Study all angles to build a complete identity profile. Extract EVERY detail with forensic precision.`
    : `Analyze this person's face with forensic precision. Extract EVERY detail for identity preservation in virtual try-on.`

  try {
    console.log(`🔬 GPT-4o: Forensic face analysis (${imageInputs.length} reference(s))...`)

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: [{ type: 'text', text: userPrompt }, ...imageInputs] },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2500,
      temperature: 0.1, // Very low for consistency
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from GPT-4o face analysis')
    }

    const analysis = JSON.parse(content) as ForensicFaceAnalysis

    // Ensure summary exists for logging and prompt
    const summary = analysis.identitySummary
    if (!summary || summary === 'undefined' || summary === 'null') {
      analysis.identitySummary = `A person with ${analysis.skinTone || 'natural'} skin, ${analysis.eyeColor || 'dark'} eyes, and ${analysis.faceShape || 'oval'} face shape.`
    }

    console.log('✅ Forensic face analysis complete')
    console.log(`   Identity summary: ${String(analysis.identitySummary).slice(0, 100)}...`)

    // Ensure arrays are initialized
    if (!analysis.skinImperfections) analysis.skinImperfections = []
    if (!analysis.distinctiveMarks) analysis.distinctiveMarks = []

    return analysis
  } catch (error) {
    console.error('❌ GPT-4o face analysis failed:', error)

    // Return a basic structure on error
    return {
      faceShape: 'oval',
      faceWidth: 'medium',
      jawlineType: 'soft',
      chinShape: 'rounded',
      foreheadShape: 'medium height and width',
      cheekboneProminence: 'subtle',
      eyeColor: 'dark brown',
      eyeShape: 'almond',
      eyeSize: 'medium',
      eyeSpacing: 'medium',
      eyeDepth: 'average',
      eyelidType: 'double lid',
      eyeLashes: 'medium length',
      eyebrowShape: 'natural arch',
      eyebrowThickness: 'medium',
      eyebrowColor: 'matches hair',
      noseShape: 'straight',
      noseBridgeWidth: 'medium',
      noseTipShape: 'rounded',
      nostrilShape: 'medium',
      lipFullnessUpper: 'medium',
      lipFullnessLower: 'medium',
      lipWidth: 'medium',
      cupidsBow: 'subtle',
      lipColor: 'natural pink',
      teethVisibility: 'not visible',
      skinTone: 'medium',
      skinUndertone: 'warm',
      skinTexture: 'natural with visible pores',
      poreVisibility: 'visible on nose',
      skinImperfections: [],
      hairColor: 'dark brown',
      hairHighlights: 'natural',
      hairTexture: 'straight, medium thickness',
      hairDensity: 'medium',
      hairLength: 'shoulder length',
      hairStyle: 'loose',
      hairPartPosition: 'center',
      bodyType: 'average',
      shoulderWidth: 'medium',
      neckLength: 'medium',
      armProportions: 'medium',
      currentExpression: 'neutral',
      headTilt: 'straight',
      gazeDirection: 'direct at camera',
      distinctiveMarks: [],
      identitySummary: 'Standard facial features - analysis failed, using defaults',
    }
  }
}

/**
 * Generate an identity anchor (unique name + 3 most distinct features)
 * Based on Gemini best practices for character consistency
 */
function generateIdentityAnchor(analysis: ForensicFaceAnalysis): string {
  // Create a unique identifier from most distinctive features
  const topFeatures: string[] = []

  // Priority 1: Distinctive marks (most unique)
  if (analysis.distinctiveMarks?.length > 0) {
    topFeatures.push(analysis.distinctiveMarks[0])
  }

  // Priority 2: Unique eye characteristics
  if (analysis.eyeColor && analysis.eyeColor !== 'brown' && analysis.eyeColor !== 'dark brown') {
    topFeatures.push(`${analysis.eyeColor} eyes`)
  } else if (analysis.eyeShape && analysis.eyeShape !== 'almond' && analysis.eyeShape !== 'round') {
    topFeatures.push(`${analysis.eyeShape} eyes`)
  }

  // Priority 3: Unique facial feature
  if (analysis.faceShape && analysis.faceShape !== 'oval') {
    topFeatures.push(`${analysis.faceShape} face`)
  } else if (analysis.jawlineType && analysis.jawlineType !== 'soft' && analysis.jawlineType !== 'rounded') {
    topFeatures.push(`${analysis.jawlineType} jawline`)
  }

  // Priority 4: Skin tone if distinctive
  if (analysis.skinTone && !analysis.skinTone.includes('medium')) {
    topFeatures.push(`${analysis.skinTone} skin`)
  }

  // Generate unique name from hash of features
  const featureHash = `${analysis.eyeColor}-${analysis.faceShape}-${analysis.skinTone}`.slice(0, 8)
  const uniqueName = `Subject-${featureHash}`

  const anchorFeatures = topFeatures.slice(0, 3).join(', ')
  return `${uniqueName}, ${anchorFeatures}`
}

/**
 * Convert forensic analysis to a structured identity prompt section
 * Optimized for Gemini image generation - uses clear hierarchical structure
 * Includes identity anchor for character consistency
 */
export function buildIdentityPromptFromAnalysis(analysis: ForensicFaceAnalysis): string {
  const marks = analysis.distinctiveMarks?.length > 0
    ? analysis.distinctiveMarks.join('; ')
    : 'none noted'

  const imperfections = analysis.skinImperfections?.length > 0
    ? analysis.skinImperfections.join('; ')
    : 'natural skin'

  const identityAnchor = generateIdentityAnchor(analysis)

  return `🔒 IDENTITY ANCHOR (CHARACTER REFERENCE - USE THIS EXACT PERSON):
"${identityAnchor}"

This is the EXACT person who must appear in the output. Use the reference images as character sheets.
Maintain this person's exact facial features, hairstyle, and physique in all generated images.

═══════════════════════════════════════════════════════════════════════════════
🔒 IDENTITY FINGERPRINT (LOCKED - MUST MATCH EXACTLY)

┌─────────────────────────────────────────────────────────────────────────────┐
│ FACE GEOMETRY (DO NOT ALTER)                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Shape: ${analysis.faceShape}                                                
│ Jawline: ${analysis.jawlineType}                                            
│ Chin: ${analysis.chinShape}                                                 
│ Cheekbones: ${analysis.cheekboneProminence}                                 
│ Forehead: ${analysis.foreheadShape}                                         
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ EYES (60% OF RECOGNITION - CRITICAL)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Color: ${analysis.eyeColor}                                                 
│ Shape: ${analysis.eyeShape}, ${analysis.eyeSize} size, ${analysis.eyeSpacing}
│ Eyelids: ${analysis.eyelidType}                                             
│ Depth: ${analysis.eyeDepth}                                                 
│ Lashes: ${analysis.eyeLashes}                                               
│ Brows: ${analysis.eyebrowShape}, ${analysis.eyebrowThickness}, ${analysis.eyebrowColor}
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ NOSE                                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Profile: ${analysis.noseShape}                                              
│ Bridge: ${analysis.noseBridgeWidth}                                         
│ Tip: ${analysis.noseTipShape}                                               
│ Nostrils: ${analysis.nostrilShape}                                          
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ MOUTH                                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Upper lip: ${analysis.lipFullnessUpper}                                     
│ Lower lip: ${analysis.lipFullnessLower}                                     
│ Width: ${analysis.lipWidth}                                                 
│ Cupid's bow: ${analysis.cupidsBow}                                          
│ Color: ${analysis.lipColor}                                                 
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ SKIN (PRESERVE EXACTLY - NO LIGHTENING/SMOOTHING)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Tone: ${analysis.skinTone}                                                  
│ Undertone: ${analysis.skinUndertone}                                        
│ Texture: ${analysis.skinTexture}                                            
│ Pores: ${analysis.poreVisibility}                                           
│ Marks: ${imperfections}                                                     
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ HAIR                                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Color: ${analysis.hairColor}                                                
│ Texture: ${analysis.hairTexture}                                            
│ Length: ${analysis.hairLength}                                              
│ Style: ${analysis.hairStyle}                                                
│ Part: ${analysis.hairPartPosition}                                          
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ BODY                                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Build: ${analysis.bodyType}                                                 
│ Shoulders: ${analysis.shoulderWidth}                                        
│ Neck: ${analysis.neckLength}                                                
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ DISTINCTIVE MARKS (MUST INCLUDE)                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ ${marks}                                                                    
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CURRENT STATE                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Expression: ${analysis.currentExpression}                                   
│ Head position: ${analysis.headTilt}                                         
│ Gaze: ${analysis.gazeDirection}                                             
└─────────────────────────────────────────────────────────────────────────────┘

⚡ IDENTITY LOCK: ${analysis.identitySummary}

⛔ FORBIDDEN CHANGES:
- Do NOT widen/narrow face, jaw, or cheeks
- Do NOT change eye shape, size, or color
- Do NOT lighten skin tone
- Do NOT smooth skin texture
- Do NOT remove distinctive marks`
}

/**
 * Analyze garment with GPT-4o Vision for precise clothing replication
 */
export interface GarmentAnalysis {
  /**
   * True if the garment reference image appears to include a person/body.
   * Used to prevent face-bleed by auto-extracting a garment-only reference.
   */
  containsPerson: boolean
  /**
   * True if a visible face/head appears in the garment reference image.
   */
  containsFace: boolean
  garmentType: string
  sleeveType: string
  necklineType: string
  fitType: string
  fabricType: string
  fabricTexture: string
  primaryColor: string
  colorDetails: string
  patternType: string
  patternDescription: string
  designElements: string[]
  lengthStyle: string
  summary: string
}

export async function analyzeGarmentForensic(garmentImageBase64: string): Promise<GarmentAnalysis> {
  const openai = getOpenAI()

  const prompt = `You are a FASHION TECHNICAL DESIGNER analyzing a garment for AI image generation.
Your analysis will be used to EXACTLY replicate this garment on a different person. Every detail matters.

FIRST: Detect if the image contains a person wearing the garment (for identity isolation).
THEN: Extract ONLY clothing details. Completely ignore any person/face visible.

Return JSON with:

═══════════════════════════════════════════════════════════════════════════════
PERSON DETECTION (for identity isolation):
═══════════════════════════════════════════════════════════════════════════════
- containsPerson: boolean (true if any person/body is visible in image)
- containsFace: boolean (true if a face/head is visible)

═══════════════════════════════════════════════════════════════════════════════
GARMENT CORE (BE PRECISE):
═══════════════════════════════════════════════════════════════════════════════
- garmentType: Exact category with sub-type:
  Indian: "straight-cut kurti", "anarkali kurta", "A-line kurti", "palazzo pants", "churidar"
  Western: "fitted blouse", "crop top", "shift dress", "A-line dress", "wrap dress", "blazer"
  └ Be specific: "A-line kurti" not just "kurti"

- sleeveType: (sleeveless/spaghetti/cap sleeve/flutter/short sleeve/elbow-length/3-4 sleeve/full sleeve/bell sleeve/bishop sleeve)
  └ Add details: "full sleeve with button cuffs" or "flutter sleeve, slightly sheer"

- necklineType: (crew/round/V-neck/deep-V/scoop/U-neck/boat/square/sweetheart/off-shoulder/one-shoulder/halter/collared/mandarin/keyhole/cowl)
  └ Add depth: "deep V-neck reaching mid-chest" or "high round neck at collarbone"

- fitType: (tight/fitted/semi-fitted/regular/relaxed/loose/oversized/A-line/flared/bodycon)
  └ Note variations: "fitted at bust, flared from waist"

═══════════════════════════════════════════════════════════════════════════════
FABRIC DETAILS (CRITICAL FOR REALISM):
═══════════════════════════════════════════════════════════════════════════════
- fabricType: Material with weight hint:
  Light: chiffon, georgette, crepe, lawn cotton, voile
  Medium: cotton, linen, rayon, jersey, poplin, silk
  Heavy: denim, velvet, brocade, tweed, canvas
  
- fabricTexture: Visual/tactile properties:
  (smooth/matte/lustrous/shiny/satin/textured/ribbed/woven/crepe-textured/embossed/crushed/pleated)
  └ Add detail: "smooth matte cotton with slight natural wrinkle" or "lustrous silk with soft drape"

═══════════════════════════════════════════════════════════════════════════════
COLOR (EXACT - AI MUST MATCH PRECISELY):
═══════════════════════════════════════════════════════════════════════════════
- primaryColor: Precise color name with descriptors:
  ✓ "deep burgundy wine with slight purple undertone"
  ✓ "earthy terracotta orange, muted"
  ✓ "bright coral pink, saturated"
  ✗ "red" or "pink" (too vague)

- colorDetails: Any variations, gradients, or multiple colors:
  "solid throughout" or "ombre from cream at shoulders to dusty pink at hem" or "navy body with white piping"

═══════════════════════════════════════════════════════════════════════════════
PATTERN (DETAILED):
═══════════════════════════════════════════════════════════════════════════════
- patternType: (solid/printed/block-print/screen-print/embroidered/woven-pattern/striped/pinstriped/checked/plaid/tartan/floral/botanical/geometric/abstract/paisley/ikat/batik/tie-dye/animal-print/polka-dot/chevron)

- patternDescription: Detailed description if not solid:
  ✓ "large-scale rust and cream block print, irregular hand-stamped floral motifs, 3-4 inch repeat"
  ✓ "delicate white thread embroidery at neckline and cuffs, floral vine pattern, ~2 inch border"
  ✓ "vertical navy and white stripes, 1cm stripe width, evenly spaced"
  "no pattern" for solids

═══════════════════════════════════════════════════════════════════════════════
CONSTRUCTION & DETAILS:
═══════════════════════════════════════════════════════════════════════════════
- designElements: EXHAUSTIVE array of ALL visible details:
  Closures: ["front button placket with 5 gold buttons", "invisible back zipper", "side zip"]
  Trims: ["gold piping at neckline", "lace hem", "tassel ties"]
  Features: ["side slits 8 inches", "front pocket", "pleated front", "gathered waist", "ruffled tier"]
  Embellishments: ["mirror work at yoke", "sequin border", "beaded neckline"]
  
- lengthStyle: Precise description:
  Tops: (crop above navel/crop at waist/hip-length/tunic mid-thigh/long tunic above knee)
  Dresses: (mini above mid-thigh/short mid-thigh/knee-length/midi below knee/midi calf-length/maxi ankle/maxi floor)

═══════════════════════════════════════════════════════════════════════════════
SUMMARY (FED DIRECTLY TO IMAGE AI):
═══════════════════════════════════════════════════════════════════════════════
- summary: Single sentence that captures the ESSENCE for exact replication. Format:
  "[Color] [fabric] [garment type] with [key features], [fit], [length]"
  
  Example: "Rust orange block-print cotton straight-cut kurti with 3/4 sleeves, mandarin collar, gold button placket, relaxed fit, knee-length with side slits"

BE THOROUGH. This analysis drives how the AI generates the garment on the new person.`

  try {
    console.log('👔 GPT-4o: Garment analysis...')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: formatImageUrl(garmentImageBase64), detail: 'high' } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800,
      temperature: 0.1,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.warn('⚠️ No content returned from GPT-4o garment analysis, using fallback.')
      return {
        containsPerson: false,
        containsFace: false,
        garmentType: 'top',
        sleeveType: 'short sleeve',
        necklineType: 'round',
        fitType: 'regular',
        fabricType: 'cotton',
        fabricTexture: 'smooth',
        primaryColor: 'neutral',
        colorDetails: 'solid color',
        patternType: 'solid',
        patternDescription: 'no pattern',
        designElements: [],
        lengthStyle: 'hip length',
        summary: 'Basic garment - AI response empty',
      }
    }

    const analysis = JSON.parse(content) as Partial<GarmentAnalysis>
    const normalized: GarmentAnalysis = {
      containsPerson: Boolean((analysis as any).containsPerson),
      containsFace: Boolean((analysis as any).containsFace),
      garmentType: String((analysis as any).garmentType || '').trim(),
      sleeveType: String((analysis as any).sleeveType || '').trim(),
      necklineType: String((analysis as any).necklineType || '').trim(),
      fitType: String((analysis as any).fitType || '').trim(),
      fabricType: String((analysis as any).fabricType || '').trim(),
      fabricTexture: String((analysis as any).fabricTexture || '').trim(),
      primaryColor: String((analysis as any).primaryColor || '').trim(),
      colorDetails: String((analysis as any).colorDetails || '').trim(),
      patternType: String((analysis as any).patternType || '').trim(),
      patternDescription: String((analysis as any).patternDescription || '').trim(),
      designElements: Array.isArray((analysis as any).designElements) ? (analysis as any).designElements.map((x: any) => String(x)) : [],
      lengthStyle: String((analysis as any).lengthStyle || '').trim(),
      summary: String((analysis as any).summary || '').trim(),
    }
    console.log(`✅ Garment: ${analysis.summary?.slice(0, 80)}...`)

    // Ensure required string fields have reasonable fallbacks
    return {
      ...normalized,
      garmentType: normalized.garmentType || 'top',
      sleeveType: normalized.sleeveType || 'short sleeve',
      necklineType: normalized.necklineType || 'round',
      fitType: normalized.fitType || 'regular',
      fabricType: normalized.fabricType || 'cotton',
      fabricTexture: normalized.fabricTexture || 'smooth',
      primaryColor: normalized.primaryColor || 'neutral',
      colorDetails: normalized.colorDetails || 'solid color',
      patternType: normalized.patternType || 'solid',
      patternDescription: normalized.patternDescription || 'no pattern',
      lengthStyle: normalized.lengthStyle || 'hip length',
      summary: normalized.summary || 'Garment analysis (normalized)',
    }
  } catch (error) {
    console.error('❌ Garment analysis failed:', error)
    return {
      containsPerson: false,
      containsFace: false,
      garmentType: 'top',
      sleeveType: 'short sleeve',
      necklineType: 'round',
      fitType: 'regular',
      fabricType: 'cotton',
      fabricTexture: 'smooth',
      primaryColor: 'neutral',
      colorDetails: 'solid color',
      patternType: 'solid',
      patternDescription: 'no pattern',
      designElements: [],
      lengthStyle: 'hip length',
      summary: 'Basic garment - analysis failed',
    }
  }
}

/**
 * Build a structured garment description for the prompt
 * Optimized for Gemini image generation - clear specification format
 */
export function buildGarmentPromptFromAnalysis(analysis: GarmentAnalysis): string {
  const elements = analysis.designElements?.length > 0
    ? analysis.designElements.join(' | ')
    : 'no special details'

  const patternInfo = analysis.patternType === 'solid' || analysis.patternDescription === 'no pattern'
    ? 'Solid color (no pattern)'
    : `${analysis.patternType}: ${analysis.patternDescription}`

  return `👗 GARMENT SPECIFICATION (MUST MATCH EXACTLY)

┌─────────────────────────────────────────────────────────────────────────────┐
│ GARMENT IDENTITY                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Type: ${analysis.garmentType}                                               
│ Fit: ${analysis.fitType}                                                    
│ Length: ${analysis.lengthStyle}                                             
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ COLOR (MATCH PRECISELY)                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Primary: ${analysis.primaryColor}                                           
│ Details: ${analysis.colorDetails}                                           
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ FABRIC                                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Material: ${analysis.fabricType}                                            
│ Texture: ${analysis.fabricTexture}                                          
│ Behavior: Add natural wrinkles, draping, fabric weight physics              
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CONSTRUCTION                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Neckline: ${analysis.necklineType}                                          
│ Sleeves: ${analysis.sleeveType}                                             
│ Details: ${elements}                                                        
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PATTERN/PRINT                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ ${patternInfo}                                                              
└─────────────────────────────────────────────────────────────────────────────┘

📋 SUMMARY: ${analysis.summary}

⚠️ CRITICAL CLOTHING RULES:
1. COMPLETELY REMOVE the person's current outfit first
2. The GARMENT reference image is the ONLY source for clothing
3. IGNORE any clothing visible in person/identity reference images
4. The garment must fit the person's body naturally with realistic fabric physics
5. Add natural wrinkles at elbows, waist, and movement points
6. Match garment color EXACTLY - do not shift hue or saturation`
}

