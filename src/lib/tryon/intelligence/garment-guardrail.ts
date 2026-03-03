/**
 * GARMENT GUARDRAIL - Post-Generation Validation
 * 
 * Validates that the garment type in the output matches the reference.
 * Rejects outputs where short kurta became long kurta, etc.
 */

import 'server-only'
import { getOpenAI } from '@/lib/openai'
import { GarmentCategory, HemlinePosition } from './garment-classifier'

export interface GarmentValidationResult {
    is_valid: boolean
    type_match: boolean
    length_match: boolean
    pattern_match: boolean
    color_match: boolean
    issues: string[]
    recommendation: 'accept' | 'reject' | 'retry'
    details: {
        expected_type: GarmentCategory
        actual_type: GarmentCategory
        expected_hemline: HemlinePosition
        actual_hemline: HemlinePosition
    }
}

export async function validateGarmentMatch(
    referenceImageBase64: string,
    generatedImageBase64: string,
    expectedCategory: GarmentCategory,
    expectedHemline: HemlinePosition
): Promise<GarmentValidationResult> {
    console.log('\n👔 GARMENT GUARDRAIL: Validating garment match...')
    const startTime = Date.now()

    const openai = getOpenAI()

    const cleanReference = referenceImageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
    const cleanGenerated = generatedImageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a garment verification system. Compare the garment in Image 1 (reference) with the garment in Image 2 (generated output).

Check:
1. Is it the same TYPE of garment? (shirt stayed shirt, kurta stayed kurta)
2. Is the LENGTH the same? (short stayed short, long stayed long)
3. Is the PATTERN the same? (same design)
4. Are the COLORS the same?

Expected garment: ${expectedCategory}
Expected hemline: ${expectedHemline}

Return JSON:
{
  "type_match": true/false,
  "actual_type": "SHIRT" | "SHORT_KURTA" | "LONG_KURTA" | etc.,
  "length_match": true/false,
  "actual_hemline": "hip_level" | "knee" | etc.,
  "pattern_match": true/false,
  "color_match": true/false,
  "issues": ["list of mismatches"],
  "recommendation": "accept" | "reject" | "retry"
}`
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Compare these garments. Image 1 is the reference (expected: ${expectedCategory}, hemline: ${expectedHemline}). Image 2 is the generated output. Do they match?`
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${cleanReference}`,
                                detail: 'high'
                            }
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${cleanGenerated}`,
                                detail: 'high'
                            }
                        }
                    ]
                }
            ],
            max_tokens: 500,
            temperature: 0.1
        })

        const content = response.choices[0]?.message?.content || ''
        const jsonMatch = content.match(/\{[\s\S]*\}/)

        if (!jsonMatch) {
            throw new Error('No JSON in response')
        }

        const parsed = JSON.parse(jsonMatch[0])
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

        const result: GarmentValidationResult = {
            is_valid: parsed.type_match && parsed.length_match,
            type_match: parsed.type_match || false,
            length_match: parsed.length_match || false,
            pattern_match: parsed.pattern_match || false,
            color_match: parsed.color_match || false,
            issues: parsed.issues || [],
            recommendation: parsed.recommendation || 'reject',
            details: {
                expected_type: expectedCategory,
                actual_type: parsed.actual_type || 'UNKNOWN',
                expected_hemline: expectedHemline,
                actual_hemline: parsed.actual_hemline || 'unknown'
            }
        }

        if (result.is_valid) {
            console.log(`   ✅ Garment VALID: type=${result.type_match}, length=${result.length_match} (${elapsed}s)`)
        } else {
            console.log(`   ❌ Garment REJECTED: ${result.issues.join(', ')} (${elapsed}s)`)
            console.log(`   Expected: ${expectedCategory} (${expectedHemline})`)
            console.log(`   Got: ${result.details.actual_type} (${result.details.actual_hemline})`)
        }

        return result

    } catch (error) {
        console.error('Garment validation failed:', error)
        return {
            is_valid: false,
            type_match: false,
            length_match: false,
            pattern_match: false,
            color_match: false,
            issues: ['Validation error'],
            recommendation: 'retry',
            details: {
                expected_type: expectedCategory,
                actual_type: 'UNKNOWN',
                expected_hemline: expectedHemline,
                actual_hemline: 'unknown'
            }
        }
    }
}
