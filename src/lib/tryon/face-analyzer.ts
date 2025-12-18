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
  
  const systemPrompt = `You are a forensic facial analyst creating an EXACT identity profile for virtual try-on.
Your analysis will be used to ensure the generated image has IDENTICAL features to the original.

ANALYZE WITH EXTREME PRECISION. Every detail matters for identity preservation.

Return a JSON object with these exact fields:

FACIAL GEOMETRY (measure proportions precisely):
- faceShape: (oval/round/square/heart/diamond/oblong/rectangular)
- faceWidth: (narrow/medium/wide) relative to length
- jawlineType: (sharp/angular/soft/rounded/square)
- chinShape: (pointed/rounded/square/cleft/small/prominent)
- foreheadShape: (high/medium/low) and (narrow/medium/wide)
- cheekboneProminence: (high and prominent/subtle/flat)

EYE REGION (most critical for identity):
- eyeColor: EXACT color with nuances (e.g., "dark brown with warm amber undertones near pupil")
- eyeShape: (almond/round/hooded/monolid/upturned/downturned/deep-set/protruding)
- eyeSize: (small/medium/large) relative to face
- eyeSpacing: (close-set/medium/wide-set)
- eyeDepth: (deep-set/average/protruding)
- eyelidType: (single/double/hooded/crease position)
- eyeLashes: (long/medium/short, thick/sparse, curved/straight)
- eyebrowShape: (arched/straight/curved/S-shaped/angular)
- eyebrowThickness: (thin/medium/thick/bushy)
- eyebrowColor: (matches hair/darker/lighter)

NOSE (specific measurements):
- noseShape: (straight/curved/concave/convex/bumpy)
- noseBridgeWidth: (narrow/medium/wide)
- noseTipShape: (pointed/rounded/bulbous/upturned)
- nostrilShape: (narrow/medium/wide/flared)

LIPS AND MOUTH:
- lipFullnessUpper: (thin/medium/full)
- lipFullnessLower: (thin/medium/full)
- lipWidth: (narrow/medium/wide)
- cupidsBow: (pronounced/subtle/flat)
- lipColor: natural color (pink/rose/brown/dark)
- teethVisibility: (showing/partially visible/not visible)

SKIN (critical - NO beautification):
- skinTone: EXACT tone (fair/light/light-medium/medium/medium-tan/tan/deep tan/deep/rich)
- skinUndertone: (warm/cool/neutral/olive)
- skinTexture: (smooth/textured/combination) with visible pores
- poreVisibility: (visible on nose/visible on cheeks/minimal)
- skinImperfections: Array of ALL visible marks ["mole on left cheek", "freckles across nose", "scar on chin", etc.]

HAIR:
- hairColor: EXACT color with any variations ("jet black with subtle blue sheen", "dark brown with natural red highlights")
- hairHighlights: (natural lighter areas/dyed/none)
- hairTexture: (straight/wavy/curly/coily) with (fine/medium/thick) strands
- hairDensity: (thin/medium/thick/very thick)
- hairLength: (pixie/ear-length/chin-length/shoulder/mid-back/waist)
- hairStyle: current style (loose/ponytail/bun/braided/parted/etc.)
- hairPartPosition: (left/center/right/none)

BODY:
- bodyType: (slim/average/athletic/curvy/plus-size)
- shoulderWidth: (narrow/medium/broad)
- neckLength: (short/medium/long)
- armProportions: (slender/medium/muscular)

EXPRESSION & POSE:
- currentExpression: (neutral/smiling/slight smile/serious/relaxed)
- headTilt: (straight/slight left/slight right/tilted up/tilted down)
- gazeDirection: (direct at camera/looking left/looking right/looking up/looking down)

DISTINCTIVE MARKS (CRITICAL - list ALL):
- distinctiveMarks: Array of EVERY identifying feature ["beauty mark below right eye", "small mole on neck", "ear piercing", "nose piercing", etc.]

IDENTITY SUMMARY:
- identitySummary: A 2-3 sentence summary that captures the MOST DISTINCTIVE features that make this person recognizable. Focus on: exact skin tone, eye characteristics, unique facial proportions, and any distinctive marks.

BE HYPER-SPECIFIC. These details will be used to ensure 100% identity match in generated images.`

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
    
    console.log('✅ Forensic face analysis complete')
    console.log(`   Identity summary: ${analysis.identitySummary?.slice(0, 100)}...`)
    
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
 * Convert forensic analysis to a concise identity prompt section
 */
export function buildIdentityPromptFromAnalysis(analysis: ForensicFaceAnalysis): string {
  const marks = analysis.distinctiveMarks?.length > 0
    ? `Distinctive marks: ${analysis.distinctiveMarks.join(', ')}.`
    : ''
  
  const imperfections = analysis.skinImperfections?.length > 0
    ? `Skin marks: ${analysis.skinImperfections.join(', ')}.`
    : ''

  return `IDENTITY FINGERPRINT (Must match EXACTLY):

FACE: ${analysis.faceShape} face shape, ${analysis.jawlineType} jawline, ${analysis.chinShape} chin, ${analysis.cheekboneProminence} cheekbones.

EYES (Critical): ${analysis.eyeColor} ${analysis.eyeShape} eyes, ${analysis.eyeSize} size, ${analysis.eyeSpacing} spacing, ${analysis.eyelidType}. ${analysis.eyebrowShape} eyebrows (${analysis.eyebrowThickness}).

NOSE: ${analysis.noseShape} nose with ${analysis.noseBridgeWidth} bridge, ${analysis.noseTipShape} tip.

LIPS: ${analysis.lipFullnessUpper} upper lip, ${analysis.lipFullnessLower} lower lip, ${analysis.cupidsBow} cupid's bow, ${analysis.lipColor} color.

SKIN (No modification allowed): ${analysis.skinTone} with ${analysis.skinUndertone} undertone. ${analysis.skinTexture}, pores ${analysis.poreVisibility}. ${imperfections}

HAIR: ${analysis.hairColor}, ${analysis.hairTexture}, ${analysis.hairLength}, styled ${analysis.hairStyle}, parted ${analysis.hairPartPosition}.

BODY: ${analysis.bodyType} build, ${analysis.shoulderWidth} shoulders.

${marks}

EXPRESSION: ${analysis.currentExpression}, head ${analysis.headTilt}, gaze ${analysis.gazeDirection}.

⚠️ ${analysis.identitySummary}`
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
  
  const prompt = `Analyze this garment image for EXACT replication in virtual try-on.
First, detect whether the image includes a person or visible face. This is used to avoid identity mixing.

If a person is wearing the garment, IGNORE the person completely and extract ONLY the clothing details.

Return JSON with:
- containsPerson: boolean (true if any person/body is visible)
- containsFace: boolean (true if a face/head is visible)
- garmentType: exact type (kurti, A-line dress, fitted blouse, crop top, etc.)
- sleeveType: (sleeveless/cap sleeve/short sleeve/elbow/3-4 sleeve/full sleeve)
- necklineType: (round/V-neck/scoop/boat/off-shoulder/collared/mandarin/square)
- fitType: (fitted/regular/relaxed/loose/A-line/flared)
- fabricType: (cotton/silk/linen/polyester/chiffon/georgette/rayon/denim/knit)
- fabricTexture: (smooth/textured/ribbed/woven/matte/shiny/embroidered)
- primaryColor: EXACT color (e.g., "deep burgundy wine", "forest green", "dusty rose pink")
- colorDetails: any color variations, gradient, or multiple colors
- patternType: (solid/printed/embroidered/striped/checked/floral/geometric/abstract)
- patternDescription: detailed pattern description if any
- designElements: Array of ALL details ["front placket", "two buttons", "gold piping", "side slits", etc.]
- lengthStyle: (crop/waist/hip/mid-thigh/knee/midi/maxi)
- summary: 1 sentence describing the EXACT garment for precise replication`

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
    if (!content) throw new Error('No response from garment analysis')
    
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
 * Build a garment description for the prompt
 */
export function buildGarmentPromptFromAnalysis(analysis: GarmentAnalysis): string {
  const elements = analysis.designElements?.length > 0
    ? `Details: ${analysis.designElements.join(', ')}.`
    : ''

  return `GARMENT TO APPLY (Exact match required):
Type: ${analysis.garmentType}
Color: ${analysis.primaryColor} (${analysis.colorDetails})
Fabric: ${analysis.fabricType}, ${analysis.fabricTexture}
Neckline: ${analysis.necklineType}
Sleeves: ${analysis.sleeveType}
Fit: ${analysis.fitType}
Length: ${analysis.lengthStyle}
Pattern: ${analysis.patternType}${analysis.patternDescription !== 'no pattern' ? ` - ${analysis.patternDescription}` : ''}
${elements}

ACTION (NON-NEGOTIABLE):
- REMOVE the person's current outfit completely. No layering, no blending.
- The GARMENT reference is the ONLY source of clothing.
- The PERSON reference images are ONLY for identity (face/body). IGNORE their clothing entirely.
- Do NOT keep any original clothing. Do NOT copy clothing from identity images.

${analysis.summary}`
}

