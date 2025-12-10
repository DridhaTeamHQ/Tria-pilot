import { GoogleGenAI, type ImageConfig, type GenerateContentConfig, type ContentListUnion } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'

// Initialize the Google GenAI client
const getClient = () => {
  const apiKey = getGeminiKey()
  return new GoogleGenAI({ apiKey })
}

export interface TryOnOptions {
  personImage: string // base64 (with or without data URI prefix) - primary image
  personImages?: string[] // Optional: additional person images for Pro model (up to 5 total for character consistency)
  clothingImage?: string // base64 (with or without data URI prefix)
  prompt: string
  model?: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'
  resolution?: '1K' | '2K' | '4K' // Pro model only
  background?: string
  pose?: string
  expression?: string
}

/**
 * Generate virtual try-on image using Gemini image generation models
 * 
 * INSTRUCTIONS TO GEMINI:
 * 
 * CRITICAL FOCUS AREAS (MUST PRIORITIZE):
 * 1. REALISM: Generate photorealistic images with authentic details, natural textures, realistic fabric behavior (folds, creases, drape), and realistic physics
 * 2. LIGHTING: Follow lighting instructions exactly - implement the specified source, direction, quality, and color temperature. Create realistic shadows and highlights on clothing and skin
 * 3. TONE: Maintain consistent color palette, mood, and aesthetic throughout the entire image
 * 4. FACE CONSISTENCY: Preserve the person's identity EXACTLY - all facial features (face shape, eyes, nose, mouth, skin tone, hair, expression) must match the reference image perfectly with no changes
 * 5. CLOTHING CONSISTENCY: Match clothing EXACTLY - color, pattern, fabric texture, fit, and all micro-details (zippers, buttons, patterns, textures) must match the reference image precisely
 * 
 * PROCESS:
 * 1. Receive the intelligent prompt from GPT-4o Mini (contains detailed scene, lighting, identity, and clothing instructions)
 * 2. Process both person and clothing reference images
 * 3. Generate photorealistic try-on image following the prompt exactly
 * 4. Preserve person's identity (facial features must match exactly - no changes to face shape, eyes, nose, mouth, skin tone, hair color/texture/style/length, expression, age)
 * 5. Apply clothing accurately (color, pattern, fabric texture, fit type, neckline, sleeve length, design elements must match reference exactly)
 * 6. Maintain realistic physics and natural fabric behavior (realistic folds, creases, drape, shadows, highlights)
 * 7. Implement lighting as specified in prompt (source, direction, quality, color temperature) with realistic shadows and highlights
 * 8. Maintain consistent tone and color palette throughout
 * 9. Use specified aspect ratio and resolution
 * 
 * Model Options:
 * - gemini-2.5-flash-image (Nano Banana): Fast (~10s), 1024px, up to 3 ref images, GOOD face lock
 * - gemini-3-pro-image-preview (Nano Banana Pro): Slow (~40s), up to 4K, up to 14 ref images, EXCELLENT face lock
 * 
 * FACE LOCK STRATEGY:
 * Both models implement CHARACTER LOCK through:
 * 1. Detailed identity preservation instructions in the prompt
 * 2. Reference image passed as inline data (critical for face matching)
 * 3. Explicit "DO NOT CHANGE" directives for facial features
 * 
 * Pro model offers superior face lock due to:
 * - Advanced reasoning ("Thinking" mode)
 * - Support for up to 14 reference images for character consistency
 * - Higher fidelity at capturing subtle facial features
 * 
 * Flash model provides good face lock through:
 * - Fast inference optimized for identity preservation
 * - Supports up to 3 reference images
 * - Cost-effective for high-volume try-ons
 * 
 * @param options - Try-on generation options
 * @param options.personImage - Base64 person image (required)
 * @param options.clothingImage - Base64 clothing image (optional)
 * @param options.prompt - Intelligent prompt from GPT-4o Mini (required)
 * @param options.model - Gemini model to use (default: gemini-3-pro-image-preview)
 * @param options.aspectRatio - Image aspect ratio (default: 4:5 portrait)
 * @param options.resolution - Image resolution for Pro model (default: 2K)
 * @returns Base64 encoded image with data URI prefix
 */
export async function generateTryOn(options: TryOnOptions): Promise<string> {
  const {
    personImage,
    personImages = [], // Additional person images for Pro model
    clothingImage,
    prompt,
    model = 'gemini-2.5-flash-image', // Default to Flash (faster, cheaper, good quality)
    aspectRatio = '4:5', // Default portrait aspect ratio for try-on
    resolution = '2K', // Default 2K for quality
  } = options

  try {
    console.log('🎨 Starting Gemini image generation...')
    console.log(`Model: ${model}, Aspect Ratio: ${aspectRatio}, Resolution: ${resolution}`)
    console.log(`Prompt preview: ${prompt.substring(0, 150)}...`)

    const client = getClient()

    // Build contents array with prompt and images
    // For Gemini 3 Pro, we can use up to 14 reference images (6 objects + 5 humans) for character consistency
    const contents: ContentListUnion = []

    // 1. Pro-specific vs Flash prompting
    // SIMPLIFIED: Complex prompts confuse Pro model. Simpler is better.
    const isPro = model === 'gemini-3-pro-image-preview'

    const enhancedPrompt: string = isPro
      ? `TASK: HIGH-FIDELITY FACE CLONING & CLOTHING COMPOSITING
═══════════════════════════════════════════════════════════════════════════
 OBJECTIVE:
═══════════════════════════════════════════════════════════════════════════
 Clone the exact identity (face, features, skin) from the PERSON IMAGES.
 Composite them wearing the garment from the CLOTHING IMAGE.
 This is NOT a "creative generation" - this is a REPLICATION task.

═══════════════════════════════════════════════════════════════════════════
 1. IDENTITY EXECUTION (CRITICAL):
═══════════════════════════════════════════════════════════════════════════
 START with the Person Image (Image 1).
 PRESERVE EXACT facial topography:
  • Exact Bone Structure (jawline, cheekbones, chin)
  • Exact Feature Shapes (eyes, nose, lips are UNCHANGEABLE constants)
  • Exact Skin Details (moles, pores, scars, texture - DO NOT SMOOTH)
  • Exact Hair (length, color, style - DO NOT GROW HAIR)
  • Exact Body Type (weight, build, proportions - DO NOT SLIM)

 ⛔ FORBIDDEN:
  • NO "Beautification" (do not fix skin, do not slim face)
  • NO "De-aging" (preserve nasolabial folds, age signs)
  • NO "Westernizing" or altering ethnicity
  • NO "Face Swapping" with a generic model - USE THE SOURCE FACE.
  • NO Gender Alteration - if person is female/woman, output MUST be female/woman with correct body proportions. If person is male/man, output MUST be male/man.
  • NO extracting faces from clothing image - COMPLETELY IGNORE any face in clothing reference
  • NO creating multiple people - ONLY ONE PERSON in output (from Person Image)
  • NO using any identity/face/body from clothing image - it is GARMENT ONLY

═══════════════════════════════════════════════════════════════════════════
 2. CLOTHING EXECUTION (CRITICAL - READ CAREFULLY):
═══════════════════════════════════════════════════════════════════════════
 ⚠️⚠️⚠️ CLOTHING IMAGE IS FOR GARMENT EXTRACTION ONLY ⚠️⚠️⚠️
 
 • Extract ONLY the garment/clothing from Clothing Image: color, pattern, texture, buttons, zippers, fabric details
 • COMPLETELY IGNORE ANY FACE in the clothing image - DO NOT extract, copy, or use ANY facial features from it
 • COMPLETELY IGNORE ANY PERSON in the clothing image - DO NOT extract, copy, or use ANY body parts, skin, hair, or identity from it
 • DO NOT create a second person from the clothing image - ONLY ONE PERSON should appear in the output (the person from Person Image)
 • If you see a face in the clothing image, PRETEND IT DOES NOT EXIST - focus ONLY on the garment itself
 • Apply the extracted garment naturally to the person from Person Image
 • The output must show ONLY the person from Person Image wearing the extracted garment - NO other people, NO faces from clothing image

═══════════════════════════════════════════════════════════════════════════
 3. SCENE & STYLE (ATMOSPHERE ONLY - IDENTITY IS ALWAYS PRIORITY):
═══════════════════════════════════════════════════════════════════════════
${prompt}

⚠️⚠️⚠️ CRITICAL: The above style/preset instructions are ONLY for:
- Background scene and environment
- Lighting atmosphere and mood
- Camera settings and framing
- Scene elements and props

⚠️⚠️⚠️ The style/preset CANNOT change:
- Face identity, features, expression (MUST match Person Image exactly)
- Body proportions, shape, gender characteristics (MUST match Person Image exactly)
- Clothing type, color, pattern (MUST match Clothing Image exactly)
- Hair, skin tone, age (MUST match Person Image exactly)

═══════════════════════════════════════════════════════════════════════════
 FINAL OVERRIDE (NON-NEGOTIABLE):
═══════════════════════════════════════════════════════════════════════════
 IF Style/Preset conflicts with Identity (e.g. style says "smile" but person is serious),
 IDENTITY WINS. IGNORE STYLE. KEEP ORIGINAL FACE.

 IF Style/Preset conflicts with Clothing (e.g. style suggests different clothing),
 CLOTHING WINS. IGNORE STYLE. KEEP ORIGINAL CLOTHING.

 IF Style/Preset conflicts with Body (e.g. style suggests different body shape),
 BODY WINS. IGNORE STYLE. KEEP ORIGINAL BODY.

 PRIORITY ORDER: IDENTITY > CLOTHING > BODY > STYLE/PRESET

 OUTPUT: PHOTOREALISTIC CLONE OF THE PERSON IN THE CLOTHES.`
      : `TASK: EXACT FACE REPLICATION & TRY-ON
═══════════════════════════════════════════════════════════════════════════
 OBJECTIVE: TRANSFER CLOTHING TO THIS EXACT PERSON
═══════════════════════════════════════════════════════════════════════════
 • IMAGE 1 (PERSON): SOURCE OF TRUTH. Copy this face piixel-perfectly.
 • IMAGE 2 (CLOTHING): Source of garment.

═══════════════════════════════════════════════════════════════════════════
 IDENTITY RULES (NON-NEGOTIABLE):
═══════════════════════════════════════════════════════════════════════════
 • The face in the output MUST be a digital clone of Image 1.
 • PRESERVE: Face shape, nose width, jawline, cheek fullness.
 • PRESERVE: Gender expression EXACTLY (female/woman stays female/woman, male/man stays male/man) - CRITICAL.
 • PRESERVE: Skin irregularities, moles, signs of age (No beautification).
 • PRESERVE: Body size and proportions (No slimming). For women: preserve curves, hip-to-waist ratio, breast shape. For men: preserve masculine structure, shoulder width.
 • PRESERVE: Hair length and style (Short stays short).

 ⛔ DO NOT BE CREATIVE WITH THE FACE. COPY IT.
 ⛔ DO NOT extract or use ANY face from the clothing image - ONLY use the person from Image 1.
 ⛔ ONLY ONE PERSON in output - the person from Image 1. NO second person from clothing image.

═══════════════════════════════════════════════════════════════════════════
 STYLE INSTRUCTIONS (ATMOSPHERE ONLY - IDENTITY IS ALWAYS PRIORITY):
═══════════════════════════════════════════════════════════════════════════
${prompt}

⚠️⚠️⚠️ CRITICAL: The above style/preset instructions are ONLY for:
- Background scene and environment
- Lighting atmosphere and mood
- Camera settings and framing

⚠️⚠️⚠️ The style/preset CANNOT change:
- Face identity, features, expression (MUST match Image 1 exactly)
- Body proportions, shape, gender characteristics (MUST match Image 1 exactly)
- Clothing type, color, pattern (MUST match Clothing Image exactly)

═══════════════════════════════════════════════════════════════════════════
 PRIORITY FINAL CHECK (NON-NEGOTIABLE):
═══════════════════════════════════════════════════════════════════════════
If style/preset prompts differ from the face in Image 1, IGNORE style.
If style/preset prompts differ from the body in Image 1, IGNORE style.
If style/preset prompts differ from the clothing, IGNORE style.

PRIORITY ORDER: IDENTITY > CLOTHING > BODY > STYLE/PRESET

IDENTITY IS KING. CLOTHING IS QUEEN. STYLE IS SERVANT.

OUTPUT: The SAME PERSON from Image 1 wearing the new clothes. ONLY ONE PERSON. NO second person from clothing image.`)

    contents.push(enhancedPrompt)

    // 2. Add person image(s) (CRITICAL for identity)
    if (!personImage) {
      throw new Error('Person image is required for try-on generation')
    }

    const cleanPersonImage = personImage.replace(/^data:image\/[a-z]+;base64,/, '')
    if (!cleanPersonImage || cleanPersonImage.length < 100) {
      throw new Error('Invalid person image: image data is too short or empty')
    }

    // Pro model: Use multiple person images for stronger character DNA (up to 5 human references)
    // If user provided additional images, use them. Otherwise, duplicate the primary image 3x
    if (isPro) {
      // Collect all person images (primary + additional)
      const allPersonImages = [cleanPersonImage]

      // Add any additional person images provided by user
      for (const additionalImage of personImages.slice(0, 4)) { // Max 4 additional = 5 total
        const cleanAdditional = additionalImage.replace(/^data:image\/[a-z]+;base64,/, '')
        if (cleanAdditional && cleanAdditional.length >= 100) {
          allPersonImages.push(cleanAdditional)
        }
      }

      // If user didn't provide multiple images, duplicate the primary for reinforcement
      while (allPersonImages.length < 3) {
        allPersonImages.push(cleanPersonImage)
      }

      // Add all person images to contents
      for (let i = 0; i < allPersonImages.length; i++) {
        contents.push({
          inlineData: {
            data: allPersonImages[i],
            mimeType: 'image/jpeg',
          },
        } as any)
      }
      console.log(`📸 Added ${allPersonImages.length} person image(s) for Pro character DNA(${personImages.length > 0 ? 'user provided' : 'auto-replicated'})`)
    } else {
      // Flash model: Boosting identity signal with key duplication
      // Send image twice to force attention
      contents.push({
        inlineData: {
          data: cleanPersonImage,
          mimeType: 'image/jpeg',
        },
      } as any)
      contents.push({
        inlineData: {
          data: cleanPersonImage,
          mimeType: 'image/jpeg',
        },
      } as any)
      console.log('📸 Added person image 2x for Flash face reference')
    }

    // 3. Add clothing image if provided
    // CRITICAL: Add strict instructions BEFORE clothing image to ignore faces
    if (clothingImage) {
      contents.push(`⚠️⚠️⚠️ CRITICAL CLOTHING IMAGE RULES - READ CAREFULLY ⚠️⚠️⚠️
      
THE NEXT IMAGE IS A CLOTHING REFERENCE IMAGE ONLY.

STRICT RULES FOR CLOTHING IMAGE:
1. EXTRACT ONLY THE GARMENT/CLOTHING - color, pattern, texture, buttons, zippers, fabric details
2. COMPLETELY IGNORE ANY FACE in this image - DO NOT extract, copy, or use ANY facial features
3. COMPLETELY IGNORE ANY PERSON in this image - DO NOT extract, copy, or use ANY body parts, skin, hair, or identity
4. DO NOT create a second person from this image - ONLY ONE PERSON should appear in the output (the person from the Person Image)
5. This image is ONLY for CLOTHING/GARMENT extraction - treat it like a flat lay or product photo
6. If you see a face in the clothing image, PRETEND IT DOES NOT EXIST - focus ONLY on the garment itself
7. The output must show ONLY the person from the Person Image wearing this garment - NO other people

REMEMBER: Clothing image = GARMENT ONLY. Person image = IDENTITY ONLY.`)

      const cleanClothingImage = clothingImage.replace(/^data:image\/[a-z]+;base64,/, '')
      if (cleanClothingImage && cleanClothingImage.length >= 100) {
        contents.push({
          inlineData: {
            data: cleanClothingImage,
            mimeType: 'image/jpeg',
          },
        } as any)
        
        // Add reinforcement after clothing image
        contents.push(`✅ CLOTHING IMAGE PROCESSED:
- Did you extract ONLY the garment details? (color, pattern, texture, buttons, zippers)
- Did you COMPLETELY IGNORE any face in that image?
- Did you COMPLETELY IGNORE any person/body in that image?
- Remember: ONLY ONE PERSON in output (from Person Image), wearing the extracted garment.`)
        
        console.log('👕 Added clothing image (1x) for clothing reference with strict face-ignoring rules')
      } else {
        console.warn('Clothing image appears invalid, skipping')
      }
    }

    // 4. Add person image AGAIN at the end to reinforce face identity
    // Research shows repeating the reference face helps preserve identity
    contents.push({
      inlineData: {
        data: cleanPersonImage,
        mimeType: 'image/jpeg',
      },
    } as any)
    contents.push(`FINAL IDENTITY CONFIRMATION:
THIS IS A CLONING TASK - NOT A GENERATION TASK.
1. The FACE in output MUST be an exact digital copy of THIS person (from Person Image) - NO other faces.
2. ONLY ONE PERSON in the output - the person from Person Image. NO second person from clothing image.
3. The GENDER EXPRESSION MUST match exactly (female/woman stays female/woman, male/man stays male/man) - CRITICAL.
4. The HAIR MUST match this person's length and style (Short stays short).
5. The BODY MUST match this person's build and gender-specific characteristics (No slimming, preserve curves for women, masculine structure for men).
6. The CLOTHING MUST match the specific garment from clothing image (color, pattern, texture) - but IGNORE any face/person in clothing image.
7. COMPLETELY IGNORE any face, person, or identity in the clothing image - it is for GARMENT EXTRACTION ONLY.
DO NOT GENERATE A RANDOM PERSON. DO NOT CREATE A SECOND PERSON. REPLICATE THIS IDENTITY EXACTLY.`)
    console.log('🔒 Added person image AGAIN at end for identity anchor')

    // Build image config
    const imageConfig = {
      aspectRatio: aspectRatio,
      // Enable person generation for face consistency
      personGeneration: 'allow_adult',
    } as ImageConfig

    if (model === 'gemini-3-pro-image-preview' && resolution) {
      imageConfig.imageSize = resolution as any
    }

    // Build generation config
    const config: GenerateContentConfig = {
      responseModalities: ['IMAGE'],
      imageConfig,
    }

    console.log('📡 Sending generation request to Gemini...')
    const startTime = Date.now()

    // Generate content
    const response = await client.models.generateContent({
      model,
      contents,
      config,
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`✅ Gemini responded in ${duration} s`)

    // Extract image from response
    if (response.data) {
      console.log('✅ Image extracted from response.data')
      return `data:image/png;base64,${response.data}`
    }

    // Check candidates for inline data
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            console.log(`✅ Image extracted from candidates(${part.inlineData.mimeType})`)
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }
        }
      }
    }

    console.error('❌ No image found in Gemini response')
    console.error('Response structure:', JSON.stringify(response, null, 2).substring(0, 500))
    throw new Error('No image generated by Gemini - response structure unexpected')
  } catch (error) {
    console.error('❌ Gemini image generation error:', error)

    if (error instanceof Error) {
      // Provide user-friendly error messages
      if (error.message.includes('API key')) {
        throw new Error('Gemini API key is invalid or missing. Please check your GEMINI_API_KEY environment variable.')
      } else if (error.message.includes('quota')) {
        throw new Error('Gemini API quota exceeded. Please try again later or upgrade your plan.')
      } else if (error.message.includes('timeout')) {
        throw new Error('Gemini API request timed out. The service may be experiencing high load. Please try again.')
      } else if (error.message.includes('Invalid person image')) {
        throw error // Re-throw validation errors as-is
      }
      // Re-throw with original message
      throw new Error(`Gemini generation failed: ${error.message} `)
    }

    throw new Error('Failed to generate image with Gemini')
  }
}

/**
 * Generate try-on with multi-turn conversation support (for iterative refinement)
 * This creates a chat session that can be used for follow-up edits
 */
export async function generateTryOnWithChat(
  options: TryOnOptions,
  chatHistory?: Array<{ role: 'user' | 'model'; content: any }>
): Promise<{ image: string; chat: any }> {
  const {
    personImage,
    clothingImage,
    prompt,
    model = 'gemini-3-pro-image-preview',
    aspectRatio = '4:5',
    resolution = '2K',
  } = options

  try {
    const client = getClient()

    // Build contents
    const contents: ContentListUnion = [prompt]

    if (personImage) {
      const cleanPersonImage = personImage.replace(/^data:image\/[a-z]+;base64,/, '')
      contents.push({
        inlineData: {
          data: cleanPersonImage,
          mimeType: 'image/jpeg',
        },
      } as any)
    }

    if (clothingImage) {
      const cleanClothingImage = clothingImage.replace(/^data:image\/[a-z]+;base64,/, '')
      contents.push({
        inlineData: {
          data: cleanClothingImage,
          mimeType: 'image/jpeg',
        },
      } as any)
    }

    const imageConfig: ImageConfig = {
      aspectRatio: aspectRatio as any,
    }

    if (model === 'gemini-3-pro-image-preview' && resolution) {
      imageConfig.imageSize = resolution as any
    }

    // Create chat for multi-turn conversation
    const chat = await client.chats.create({
      model,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig,
      },
    })

    // Send initial message - contents should be PartListUnion (array of Parts)
    const response = await chat.sendMessage({ message: contents as any })

    // Extract image from response
    let generatedImage: string | null = null

    if (response.data) {
      generatedImage = `data:image/png;base64,${response.data}`
    } else if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            break
          }
        }
      }
    }

    if (!generatedImage) {
      throw new Error('No image found in response')
    }

    return { image: generatedImage, chat }
  } catch (error) {
    console.error('Gemini chat generation error:', error)
    throw error instanceof Error ? error : new Error('Failed to generate image with chat')
  }
}
