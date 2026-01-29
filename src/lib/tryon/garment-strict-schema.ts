/**
 * STRICT GARMENT PATTERN & COLOR EXTRACTION SYSTEM
 * 
 * This module provides:
 * 1. Strict JSON schema for garment attributes
 * 2. GPT-4o mini extraction function that enforces schema compliance
 * 3. Enforcement prompt block for image generation
 * 
 * SCOPE: Only garment pattern and color accuracy
 * DOES NOT TOUCH: Identity, face, scene, or model selection
 */

import { getOpenAI } from '@/lib/openai'

// ═══════════════════════════════════════════════════════════════════════════════
// STRICT GARMENT JSON SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export interface ColorSpec {
    name: string
    hex: string
    coverage_percent: number
}

export interface PatternSpec {
    exists: boolean
    type: 'floral' | 'geometric' | 'stripes' | 'polka_dots' | 'abstract' | 'checkered' | 'paisley' | 'animal_print' | 'solid' | 'other'
    motif_description: string
    motif_scale: 'small' | 'medium' | 'large'
    repeat_type: 'uniform' | 'staggered' | 'linear' | 'random'
    repeat_density: 'dense' | 'medium' | 'sparse'
    orientation: 'non-directional' | 'vertical' | 'horizontal' | 'diagonal'
    edge_behavior: string
}

export interface FabricSpec {
    material: 'cotton' | 'linen' | 'silk' | 'polyester' | 'wool' | 'denim' | 'velvet' | 'satin' | 'chiffon' | 'blend' | 'other'
    weight: 'sheer' | 'light' | 'medium' | 'heavy' | 'structured'
    surface_finish: 'matte' | 'slight_sheen' | 'glossy' | 'textured'
    drape: 'flowy' | 'semi-structured' | 'stiff' | 'crisp'
}

export interface ConstructionSpec {
    neckline: 'round' | 'square' | 'v-neck' | 'scoop' | 'high' | 'boat' | 'off-shoulder' | 'halter' | 'collared' | 'mandarin' | 'other'
    sleeves: {
        length: 'sleeveless' | 'cap' | 'short' | 'three-quarter' | 'long'
        style: 'straight' | 'puff' | 'bell' | 'fitted' | 'raglan' | 'other'
        elastic_cuff: boolean
    }
    waist: 'fitted' | 'elastic' | 'smocked' | 'straight' | 'empire' | 'drop'
    length: 'crop' | 'waist' | 'hip' | 'above_knee' | 'knee' | 'midi' | 'ankle' | 'floor'
}

export interface StrictGarmentProfile {
    garment_type: 'dress' | 'shirt' | 'top' | 'blouse' | 'pants' | 'skirt' | 'jacket' | 'saree' | 'kurta' | 'kurti' | 't-shirt' | 'sweater' | 'other'
    base_color: ColorSpec
    secondary_colors: ColorSpec[]
    pattern: PatternSpec
    fabric: FabricSpec
    construction: ConstructionSpec
    constraints: {
        no_redesign: boolean
        no_pattern_scaling: boolean
        no_color_shift: boolean
        pattern_uniformity_required: boolean
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GPT-4o MINI EXTRACTION PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

const STRICT_EXTRACTION_PROMPT = `You are a precision garment analyzer for a virtual try-on system.
Analyze the garment image and extract EXACT attributes. Return ONLY valid JSON.

CRITICAL RULES:
- Extract what you SEE, not what you assume
- If pattern exists, describe it with maximum precision
- Color names must be specific (e.g., "dusty rose" not "pink")
- Hex codes must match visible colors exactly
- Coverage percentages must sum to 100%
- If uncertain, pick the closest factual description
- Do NOT guess creatively
- Do NOT omit any fields

RETURN THIS EXACT SCHEMA:
{
  "garment_type": "dress|shirt|top|blouse|pants|skirt|jacket|saree|kurta|kurti|t-shirt|sweater|other",
  
  "base_color": {
    "name": "specific color name",
    "hex": "#XXXXXX",
    "coverage_percent": number (0-100)
  },
  
  "secondary_colors": [
    {
      "name": "specific color name",
      "hex": "#XXXXXX", 
      "coverage_percent": number (0-100)
    }
  ],
  
  "pattern": {
    "exists": true|false,
    "type": "floral|geometric|stripes|polka_dots|abstract|checkered|paisley|animal_print|solid|other",
    "motif_description": "detailed description of the pattern motifs",
    "motif_scale": "small|medium|large",
    "repeat_type": "uniform|staggered|linear|random",
    "repeat_density": "dense|medium|sparse",
    "orientation": "non-directional|vertical|horizontal|diagonal",
    "edge_behavior": "how pattern continues across seams"
  },
  
  "fabric": {
    "material": "cotton|linen|silk|polyester|wool|denim|velvet|satin|chiffon|blend|other",
    "weight": "sheer|light|medium|heavy|structured",
    "surface_finish": "matte|slight_sheen|glossy|textured",
    "drape": "flowy|semi-structured|stiff|crisp"
  },
  
  "construction": {
    "neckline": "round|square|v-neck|scoop|high|boat|off-shoulder|halter|collared|mandarin|other",
    "sleeves": {
      "length": "sleeveless|cap|short|three-quarter|long",
      "style": "straight|puff|bell|fitted|raglan|other",
      "elastic_cuff": true|false
    },
    "waist": "fitted|elastic|smocked|straight|empire|drop",
    "length": "crop|waist|hip|above_knee|knee|midi|ankle|floor"
  },
  
  "constraints": {
    "no_redesign": true,
    "no_pattern_scaling": true,
    "no_color_shift": true,
    "pattern_uniformity_required": true
  }
}

PATTERN ANALYSIS GUIDE:
- Floral: flowers, leaves, botanical motifs
- Geometric: shapes, lines, angular patterns
- Stripes: vertical, horizontal, or diagonal lines
- Polka dots: circular dots of uniform or varied sizes
- Abstract: non-representational, artistic patterns
- Checkered: grid patterns, gingham, plaid
- Paisley: teardrop-shaped motifs
- Animal print: leopard, zebra, snake, etc.
- Solid: no pattern, single color

Return ONLY the JSON. No explanation. No markdown code blocks.`

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract strict garment profile from image using GPT-4o mini
 * Returns complete JSON with all fields populated
 */
export async function extractStrictGarmentProfile(garmentImageBase64: string): Promise<StrictGarmentProfile> {
    const openai = getOpenAI()
    const startTime = Date.now()

    // Strip data URL if present
    const cleanBase64 = garmentImageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')

    console.log('\n👔 STRICT GARMENT EXTRACTION: Starting...')

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: STRICT_EXTRACTION_PROMPT,
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Analyze this garment with maximum precision:' },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${cleanBase64}`,
                                detail: 'high',
                            },
                        },
                    ],
                },
            ],
            max_tokens: 1500,
            temperature: 0.1, // Low temperature for precision
        })

        const content = response.choices[0]?.message?.content || '{}'

        // Extract JSON from response
        let jsonText = content.trim()
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            jsonText = jsonMatch[0]
        }

        const parsed = JSON.parse(jsonText) as StrictGarmentProfile
        const duration = Date.now() - startTime

        // Log extraction results
        console.log(`✅ STRICT GARMENT EXTRACTION: Complete in ${duration}ms`)
        console.log(`   📍 Type: ${parsed.garment_type}`)
        console.log(`   🎨 Base: ${parsed.base_color?.name} (${parsed.base_color?.coverage_percent}%)`)
        console.log(`   🔲 Pattern: ${parsed.pattern?.exists ? parsed.pattern.type : 'solid'}`)
        if (parsed.pattern?.exists) {
            console.log(`   📐 Scale: ${parsed.pattern.motif_scale}, Density: ${parsed.pattern.repeat_density}`)
        }
        console.log(`   🧵 Fabric: ${parsed.fabric?.material}, ${parsed.fabric?.weight}`)

        return ensureCompleteProfile(parsed)

    } catch (error) {
        console.error('❌ STRICT GARMENT EXTRACTION: Failed', error)
        return getDefaultProfile()
    }
}

/**
 * Ensure all fields are populated with sensible defaults
 */
function ensureCompleteProfile(partial: Partial<StrictGarmentProfile>): StrictGarmentProfile {
    return {
        garment_type: partial.garment_type || 'top',
        base_color: partial.base_color || { name: 'unknown', hex: '#808080', coverage_percent: 100 },
        secondary_colors: partial.secondary_colors || [],
        pattern: partial.pattern || {
            exists: false,
            type: 'solid',
            motif_description: 'No pattern - solid color',
            motif_scale: 'medium',
            repeat_type: 'uniform',
            repeat_density: 'medium',
            orientation: 'non-directional',
            edge_behavior: 'N/A for solid color'
        },
        fabric: partial.fabric || {
            material: 'cotton',
            weight: 'medium',
            surface_finish: 'matte',
            drape: 'semi-structured'
        },
        construction: partial.construction || {
            neckline: 'round',
            sleeves: { length: 'short', style: 'straight', elastic_cuff: false },
            waist: 'straight',
            length: 'hip'
        },
        constraints: {
            no_redesign: true,
            no_pattern_scaling: true,
            no_color_shift: true,
            pattern_uniformity_required: true
        }
    }
}

function getDefaultProfile(): StrictGarmentProfile {
    return ensureCompleteProfile({})
}

/**
 * Build enforcement prompt block from strict garment profile
 * This block is injected into the image generation prompt
 * 
 * ENHANCED with:
 * - Critical constraint repetition (start + end)
 * - Explicit negative prompts
 * - Visual anchors for patterns
 * - Role-based persona
 */
export function buildGarmentEnforcementBlock(profile: StrictGarmentProfile): string {
    const { base_color, secondary_colors, pattern, fabric, construction } = profile

    // Build detailed color specification
    const allColors = [base_color, ...secondary_colors]
    const colorSpec = allColors.map(c =>
        `${c.name} (${c.hex}) covering ${c.coverage_percent}%`
    ).join(', ')

    // Build pattern-specific instructions
    let patternBlock: string
    if (pattern.exists) {
        patternBlock = `
★★★ PATTERN PRESERVATION — CRITICAL ★★★

This garment has a ${pattern.type.toUpperCase()} pattern. Copy it EXACTLY.

PATTERN SPECIFICATION:
• Pattern type: ${pattern.type}
• Motif: ${pattern.motif_description}
• Scale: ${pattern.motif_scale} (DO NOT change scale)
• Repeat pattern: ${pattern.repeat_type}
• Density: ${pattern.repeat_density}
• Orientation: ${pattern.orientation}
• Edge behavior: ${pattern.edge_behavior}

PATTERN COPY RULES (MANDATORY):
1. Count the pattern motifs visible in Image 2
2. The output MUST show the same motif count per area
3. Pattern scale MUST match Image 2 exactly
4. Pattern spacing MUST match Image 2 exactly
5. Pattern continues uniformly across ALL garment sections
6. No creative interpretation — COPY the visual pattern

PATTERN NEGATIVE CONSTRAINTS:
✗ Do NOT simplify the pattern
✗ Do NOT reduce pattern complexity
✗ Do NOT enlarge pattern motifs
✗ Do NOT shrink pattern motifs
✗ Do NOT change pattern spacing
✗ Do NOT interpret pattern artistically
✗ Do NOT add pattern elements not in original
✗ Do NOT remove pattern elements from original`
    } else {
        patternBlock = `
SOLID COLOR GARMENT — No pattern
• This garment is a solid ${base_color.name} color
• Maintain uniform color across entire garment
• Do NOT add any patterns, prints, or textures
• Do NOT add visual interest through patterns`
    }

    // Build the enhanced enforcement block with REPETITION
    const block = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║           GARMENT FIDELITY SYSTEM — PATTERN & COLOR LOCK                      ║
║                    ★★★ ZERO CREATIVE INTERPRETATION ★★★                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝

You are a precision garment compositor. Your ONLY job is to copy the exact 
garment from Image 2 onto the person in Image 1. The garment MUST be a 
pixel-accurate representation of Image 2's garment.

═══════════════════════════════════════════════════════════════════════════════
GARMENT SPECIFICATION (from Image 2)
═══════════════════════════════════════════════════════════════════════════════
Type: ${profile.garment_type.toUpperCase()}
Colors: ${colorSpec}
Fabric: ${fabric.material}, ${fabric.weight}, ${fabric.surface_finish}
Neckline: ${construction.neckline}
Sleeves: ${construction.sleeves.length} ${construction.sleeves.style}
Length: ${construction.length}

${patternBlock}

═══════════════════════════════════════════════════════════════════════════════
COLOR PRESERVATION (MANDATORY)
═══════════════════════════════════════════════════════════════════════════════
Base color: ${base_color.name} (${base_color.hex})
${secondary_colors.length > 0 ? secondary_colors.map(c => `Secondary: ${c.name} (${c.hex})`).join('\n') : 'No secondary colors'}

COLOR NEGATIVE CONSTRAINTS:
✗ Do NOT shift the hue
✗ Do NOT increase saturation
✗ Do NOT decrease saturation  
✗ Do NOT brighten colors
✗ Do NOT darken colors
✗ Do NOT introduce new colors
✗ Do NOT make colors more "flattering"
✗ Do NOT color-correct the garment

═══════════════════════════════════════════════════════════════════════════════
ABSOLUTE PROHIBITIONS — VIOLATION = FAILURE
═══════════════════════════════════════════════════════════════════════════════
The following actions make the output INCORRECT and UNUSABLE:

1. REDESIGNING the garment in any way
2. SCALING patterns up or down
3. SIMPLIFYING patterns or details
4. ALTERING color distribution
5. INTERPRETING the garment creatively
6. ADDING embellishments not present
7. REMOVING details that are present
8. IMPROVING or ENHANCING the garment
9. Making the garment look "better"
10. Any deviation from exact replication

★★★ REMINDER: COPY THE GARMENT EXACTLY AS IT APPEARS IN IMAGE 2 ★★★
★★★ PATTERN SCALE, PATTERN DENSITY, AND COLORS ARE LOCKED ★★★
════════════════════════════════════════════════════════════════════════════════
`

    return block
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

export function logStrictGarmentStatus(sessionId: string, profile: StrictGarmentProfile | null): void {
    console.log(`\n👔 STRICT GARMENT PROFILE [${sessionId}]`)
    console.log('   ═══════════════════════════════════════════════')
    if (profile) {
        console.log(`   ✓ Type: ${profile.garment_type}`)
        console.log(`   ✓ Base Color: ${profile.base_color.name} (${profile.base_color.hex})`)
        console.log(`   ✓ Pattern: ${profile.pattern.exists ? profile.pattern.type : 'SOLID'}`)
        if (profile.pattern.exists) {
            console.log(`   ✓ Pattern Scale: ${profile.pattern.motif_scale}`)
            console.log(`   ✓ Pattern Density: ${profile.pattern.repeat_density}`)
        }
        console.log(`   ✓ Fabric: ${profile.fabric.material} (${profile.fabric.weight})`)
        console.log(`   ✓ Neckline: ${profile.construction.neckline}`)
        console.log(`   ✓ Sleeves: ${profile.construction.sleeves.length}`)
        console.log(`   ✓ Enforcement: ACTIVE`)
    } else {
        console.log('   ⚠️ No strict profile extracted')
    }
    console.log('   ═══════════════════════════════════════════════')
}
