/**
 * GARMENT CLASSIFIER - Anti-Hallucination System
 * 
 * Uses GPT-4o Vision to extract EXACT structured data from garment image
 * before sending to Gemini. This grounds generation in facts, not descriptions.
 * 
 * RAG Approach: Extract data first, then use that data in prompts.
 */

import 'server-only'
import { getOpenAI } from '@/lib/openai'

// ═══════════════════════════════════════════════════════════════
// GARMENT CLASSIFICATION TYPES
// ═══════════════════════════════════════════════════════════════

export type GarmentCategory =
    | 'SHIRT'           // Button-up, ends at waist/hips
    | 'T_SHIRT'         // Casual, no buttons, ends at waist
    | 'POLO'            // Collar with buttons, ends at waist
    | 'SHORT_KURTA'     // Ends at hip/mid-thigh
    | 'LONG_KURTA'      // Ends at knee or below
    | 'KURTI'           // Women's kurta, various lengths
    | 'DRESS'           // One-piece
    | 'BLOUSE'          // Fitted top
    | 'CROP_TOP'        // Ends above waist
    | 'JACKET'          // Outerwear
    | 'SWEATER'         // Knit top
    | 'UNKNOWN'

export type HemlinePosition =
    | 'above_waist'     // Crop top
    | 'at_waist'        // Regular shirts, blouses
    | 'hip_level'       // Shirts tucked out, short kurtas
    | 'mid_thigh'       // Short dresses, long shirts
    | 'above_knee'      // Knee-length kurtas
    | 'at_knee'         // Knee-length dresses
    | 'below_knee'      // Long kurtas, midi dresses
    | 'ankle'           // Maxi dresses
    | 'unknown'

export type PatternType =
    | 'solid'
    | 'stripes_horizontal'
    | 'stripes_vertical'
    | 'stripes_diagonal'
    | 'checks'
    | 'plaid'
    | 'polka_dots'
    | 'floral'
    | 'paisley'
    | 'geometric'
    | 'abstract'
    | 'printed_graphic'
    | 'embroidered'
    | 'unknown'

export interface GarmentClassification {
    // Core identification
    category: GarmentCategory
    category_confidence: number // 0-100

    // Length specifics (critical for kurta issue)
    hemline_position: HemlinePosition
    hemline_description: string // "ends 10cm below waist"
    is_short_garment: boolean  // Quick check
    is_long_garment: boolean   // Quick check

    // Pattern details
    pattern_type: PatternType
    pattern_colors: string[]   // Hex codes
    pattern_scale: 'tiny' | 'small' | 'medium' | 'large' | 'extra_large'
    pattern_description: string

    // Construction
    collar_type: string
    sleeve_type: string
    sleeve_length: string
    closure_type: string

    // Fabric
    fabric_type: string
    fabric_texture: string

    // Primary color
    primary_color_hex: string
    primary_color_name: string

    // Summary for prompt
    one_line_summary: string

    // Raw data for debugging
    raw_analysis: string
}

// ═══════════════════════════════════════════════════════════════
// CLASSIFY GARMENT
// ═══════════════════════════════════════════════════════════════

export async function classifyGarment(garmentImageBase64: string): Promise<GarmentClassification> {
    console.log('\n🔍 GARMENT CLASSIFIER: Extracting structured data...')
    const startTime = Date.now()

    const openai = getOpenAI()

    // Clean base64 if needed
    const cleanBase64 = garmentImageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a  precise garment classification system. Analyze the garment image and extract EXACT structured data.

YOUR TASK: Look at this garment and classify it with precision.

═══════════════════════════════════════════════════════════════
CRITICAL: VISUAL HEMLINE DETECTION (THE KNEE TEST)
═══════════════════════════════════════════════════════════════

To determine garment type, USE THE KNEE AS YOUR REFERENCE POINT:

1️⃣ LOCATE THE KNEE:
   Look for where the knee would be on the model/mannequin.
   The knee is roughly halfway down the leg.

2️⃣ CHECK HEMLINE POSITION:
   
   IF hemline is ABOVE the knee:
   ├─ At WAIST or HIP level → SHIRT or T_SHIRT
   └─ At MID-THIGH (between hip and knee) → SHORT_KURTA

   IF hemline is AT or BELOW the knee:
   └─ LONG_KURTA (100% certain)

🔴 THE KNEE TEST (ABSOLUTE RULE):
   • Hemline reaches knee → LONG_KURTA
   • Hemline does NOT reach knee → Check if it's SHIRT (waist/hip) or SHORT_KURTA (mid-thigh)

═══════════════════════════════════════════════════════════════
COMMON MISTAKES TO AVOID
═══════════════════════════════════════════════════════════════

❌ WRONG: "It looks like a kurta, so it must be long"
✅ RIGHT: "WHERE is the hemline? Does it reach the knee?"

❌ WRONG: "The fabric flows, so it's a long kurta"
✅ RIGHT: "Ignore fabric flow. Measure hemline position from knee."

❌ WRONG: "It covers the thighs, so it's long"
✅ RIGHT: "Covering thighs ≠ long. Does it REACH the KNEE?"

═══════════════════════════════════════════════════════════════
HEMLINE POSITION DEFINITIONS
═══════════════════════════════════════════════════════════════

• above_waist: Crop top (rarely used)
• at_waist: Regular t-shirts, blouses, short shirts
• hip_level: Shirts worn untucked, short kurtas (upper range)
• mid_thigh: SHORT kurtas, short dresses (DOES NOT REACH KNEE)
• above_knee: Long garments approaching knee
• at_knee: Long kurtas, knee-length dresses
• below_knee: Long kurtas, maxi dresses

Return ONLY valid JSON with this structure:
{
  "category": "SHIRT" | "T_SHIRT" | "POLO" | "SHORT_KURTA" | "LONG_KURTA" | "KURTI" | "DRESS" | "BLOUSE" | "CROP_TOP" | "JACKET" | "SWEATER" | "UNKNOWN",
  "category_confidence": 0-100,
  "hemline_position": "above_waist" | "at_waist" | "hip_level" | "mid_thigh" | "above_knee" | "at_knee" | "below_knee" | "ankle" | "unknown",
  "hemline_description": "string describing where garment ends relative to body landmarks (waist, hip, thigh, knee)",
  "pattern_type": "solid" | "stripes_horizontal" | "stripes_vertical" | "floral" | "paisley" | "polka_dots" | "geometric" | "printed_graphic" | "embroidered" | "unknown",
  "pattern_colors": ["#hexcode1", "#hexcode2"],
  "pattern_scale": "tiny" | "small" | "medium" | "large" | "extra_large",
  "pattern_description": "description of the pattern",
  "collar_type": "round neck" | "v-neck" | "mandarin" | "collared" | "spread collar" | "none" | "other",
  "sleeve_type": "short" | "long" | "three-quarter" | "sleeveless" | "cap" | "rolled up",
  "sleeve_length": "sleeveless" | "cap" | "short" | "elbow" | "three-quarter" | "full",
  "closure_type": "buttons" | "zipper" | "pullover" | "none" | "other",
  "fabric_type": "cotton" | "silk" | "linen" | "polyester" | "chiffon" | "denim" | "unknown",
  "fabric_texture": "smooth" | "textured" | "matte" | "shiny" | "rough",
  "primary_color_hex": "#hexcode",
  "primary_color_name": "color name",
  "one_line_summary": "Type + color + pattern summary"
}`
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Classify this garment with PRECISION.

CRITICAL: Use THE KNEE TEST to determine type:
- Does the hemline reach the KNEE? → If YES: LONG_KURTA
- Does the hemline NOT reach the knee? → If NO: Check if SHIRT (waist/hip) or SHORT_KURTA (mid-thigh)

Look at WHERE the hemline ends relative to body landmarks.

Return JSON only.`
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${cleanBase64}`,
                                detail: 'high'
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000,
            temperature: 0.1  // Low temperature for consistent classification
        })

        const content = response.choices[0]?.message?.content || ''

        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error('No JSON found in response')
        }

        const parsed = JSON.parse(jsonMatch[0])

        // Build classification result
        const classification: GarmentClassification = {
            category: parsed.category || 'UNKNOWN',
            category_confidence: parsed.category_confidence || 50,

            hemline_position: parsed.hemline_position || 'unknown',
            hemline_description: parsed.hemline_description || '',
            is_short_garment: ['above_waist', 'at_waist', 'hip_level'].includes(parsed.hemline_position),
            is_long_garment: ['above_knee', 'at_knee', 'below_knee', 'ankle'].includes(parsed.hemline_position),

            pattern_type: parsed.pattern_type || 'unknown',
            pattern_colors: parsed.pattern_colors || [],
            pattern_scale: parsed.pattern_scale || 'medium',
            pattern_description: parsed.pattern_description || '',

            collar_type: parsed.collar_type || 'unknown',
            sleeve_type: parsed.sleeve_type || 'unknown',
            sleeve_length: parsed.sleeve_length || 'unknown',
            closure_type: parsed.closure_type || 'unknown',

            fabric_type: parsed.fabric_type || 'unknown',
            fabric_texture: parsed.fabric_texture || 'unknown',

            primary_color_hex: parsed.primary_color_hex || '#000000',
            primary_color_name: parsed.primary_color_name || 'unknown',

            one_line_summary: parsed.one_line_summary || '',
            raw_analysis: content
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

        console.log(`   ✓ Category: ${classification.category} (${classification.category_confidence}% confidence)`)
        console.log(`   ✓ Hemline: ${classification.hemline_position} - ${classification.hemline_description}`)
        console.log(`   ✓ Pattern: ${classification.pattern_type} with colors ${classification.pattern_colors.join(', ')}`)
        console.log(`   ✓ Short garment: ${classification.is_short_garment}, Long garment: ${classification.is_long_garment}`)
        console.log(`   ✓ Classification completed in ${elapsed}s`)

        return classification

    } catch (error) {
        console.error('Garment classification failed:', error)

        // Return safe defaults
        return {
            category: 'UNKNOWN',
            category_confidence: 0,
            hemline_position: 'unknown',
            hemline_description: 'Could not determine',
            is_short_garment: false,
            is_long_garment: false,
            pattern_type: 'unknown',
            pattern_colors: [],
            pattern_scale: 'medium',
            pattern_description: '',
            collar_type: 'unknown',
            sleeve_type: 'unknown',
            sleeve_length: 'unknown',
            closure_type: 'unknown',
            fabric_type: 'unknown',
            fabric_texture: 'unknown',
            primary_color_hex: '#000000',
            primary_color_name: 'unknown',
            one_line_summary: 'Classification failed',
            raw_analysis: ''
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// GENERATE GROUNDED PROMPT FROM CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

export function generateGarmentGroundedPrompt(classification: GarmentClassification): string {
    const shortLongWarning = classification.is_short_garment
        ? `
★★★ THIS IS A SHORT GARMENT ★★★
- Category: ${classification.category}
- Hemline ends at: ${classification.hemline_position}
- ${classification.hemline_description}
- DO NOT make this garment longer
- DO NOT extend past hip level
- This is NOT a kurta - it is a ${classification.category}
`
        : classification.is_long_garment
            ? `
★★★ THIS IS A LONG GARMENT ★★★
- Category: ${classification.category}
- Hemline ends at: ${classification.hemline_position}
- ${classification.hemline_description}
- DO NOT shorten this garment
- It should reach ${classification.hemline_position}
`
            : ''

    return `
════════════════════════════════════════════════════════════════════════════════
GARMENT CLASSIFICATION (GPT-4o EXTRACTED DATA)
════════════════════════════════════════════════════════════════════════════════

GARMENT TYPE: ${classification.category}
CONFIDENCE: ${classification.category_confidence}%
${shortLongWarning}

EXACT SPECIFICATIONS (copy these exactly):
┌─────────────────────────────────────────────────────────────────────────────┐
│ Hemline Position: ${classification.hemline_position.toUpperCase()}
│ Pattern Type: ${classification.pattern_type}
│ Pattern Colors: ${classification.pattern_colors.map(c => c.toUpperCase()).join(', ')}
│ Pattern Scale: ${classification.pattern_scale}
│ Collar: ${classification.collar_type}
│ Sleeves: ${classification.sleeve_type} (${classification.sleeve_length})
│ Primary Color: ${classification.primary_color_name} (${classification.primary_color_hex})
│ Fabric: ${classification.fabric_type}, ${classification.fabric_texture}
└─────────────────────────────────────────────────────────────────────────────┘

PATTERN DETAILS TO PRESERVE:
${classification.pattern_description}

ONE-LINE SUMMARY:
${classification.one_line_summary}

GENERATION RULES:
1. Output garment type MUST be: ${classification.category}
2. Output hemline MUST be at: ${classification.hemline_position}
3. Output pattern colors MUST be: ${classification.pattern_colors.join(', ')}
4. DO NOT change the garment type
5. DO NOT change the length
6. DO NOT change the pattern colors
`.trim()
}
