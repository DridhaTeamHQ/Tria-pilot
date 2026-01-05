/**
 * LAYER 4: POSE NATURALISM CONTROLLER
 * 
 * ANTI-MANNEQUIN: Enforce asymmetry and natural human poses.
 * Reject stiff, symmetrical, catalog-style poses.
 */

import 'server-only'
import { getOpenAI } from '@/lib/openai'

/**
 * Build pose naturalism constraints for prompt
 */
export function buildPoseNaturalismConstraints(): string {
    return `
═══════════════════════════════════════════════════════════════
LAYER 4: POSE NATURALISM (ANTI-MANNEQUIN)
═══════════════════════════════════════════════════════════════

⚠️  MANDATORY ASYMMETRY ⚠️

Human bodies are NEVER perfectly symmetrical.
Mannequin poses are FORBIDDEN.

REQUIRED ASYMMETRY (AT LEAST 3 OF THESE):

1. SHOULDERS:
   • NOT level (one shoulder 3-8° higher)
   • One shoulder slightly forward
   • Natural slope difference

2. WEIGHT DISTRIBUTION:
   • Weight on one leg (hip shift visible)
   • One hip higher than other
   • Natural S-curve in spine

3. ARMS:
   • NOT mirrored positions
   • Different elbow angles (15°+ variance)
   • One arm bent, one relaxed OR both different bends
   • Hands in different positions
   • Natural asymmetry in arm placement

4. HEAD:
   • Tilt: 3-8° (mandatory, NOT 0°)
   • NOT perfectly centered
   • Natural neck angle

5. TORSO:
   • Slight rotation (not facing perfectly forward)
   • Natural spine curve
   • Ribcage slight asymmetry

MICRO-REALISM (BONUS):
• Fabric compression at bent joints
• Cloth tension where arms bend
• Body-furniture contact deformation
• Slight lean or weight shift
• Natural breathing pose (one shoulder slightly up)

FORBIDDEN POSE PATTERNS:
═══════════════════════════════════════════════════════════════
✗ Symmetrical shoulders (perfectly level)
✗ Straight spine (no S-curve)
✗ Centered head (0° tilt)
✗ Mirrored arms (same angle both sides)
✗ Mannequin stance (weight on both legs equally)
✗ Catalog pose (hands on hips, perfectly straight)
✗ Runway walk (perfectly aligned)
✗ T-pose or A-pose
✗ Military attention stance
✗ Perfectly forward-facing torso

VALIDATION:
If pose symmetry > 40% → OUTPUT IS INVALID
Asymmetry is MANDATORY for human realism.

REAL HUMAN EXAMPLES:
✓ One hand in pocket, one relaxed at side
✓ Weight on left leg, right hip lower
✓ Head tilted 5° to right, slight smile
✓ Left shoulder forward, right back
✓ Casual lean against surface
`.trim()
}

/**
 * Validate pose asymmetry in generated image
 */
export async function validatePoseAsymmetry(
    imageBase64: string
): Promise<{ is_asymmetrical: boolean; symmetry_score: number; issues: string[] }> {
    console.log('\n🔍 Validating pose asymmetry...')

    const openai = getOpenAI()

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
                role: 'system',
                content: `Analyze if this person's pose is natural (asymmetrical) or mannequin-like (symmetrical).

Check:
1. Are shoulders level or tilted?
2. Is weight on one leg or both equally?
3. Are arms mirrored or different?
4. Is head tilted or perfectly straight?
5. Is torso rotated or perfectly forward?

Return JSON: {
  is_asymmetrical: boolean,
  symmetry_score: 0-100,
  issues: [list of symmetric elements],
  natural_elements: [list of asymmetric elements]
}`
            }, {
                role: 'user',
                content: [
                    { type: 'text', text: 'Is this pose natural or mannequin-like?' },
                    {
                        type: 'image_url',
                        image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
                    }
                ]
            }],
            response_format: { type: 'json_object' },
            temperature: 0.1
        })

        const result = JSON.parse(response.choices[0].message.content || '{}')

        const isNatural = result.is_asymmetrical && result.symmetry_score < 40

        console.log(`   ${isNatural ? '✅ Natural pose' : '❌ Mannequin pose'} (symmetry: ${result.symmetry_score}%)`)

        if (!isNatural) {
            console.log(`   Issues: ${result.issues?.join(', ')}`)
        }

        return {
            is_asymmetrical: result.is_asymmetrical,
            symmetry_score: result.symmetry_score,
            issues: result.issues || []
        }

    } catch (error) {
        console.error('Pose validation failed:', error)
        // Fail-safe: assume natural if validation fails
        return {
            is_asymmetrical: true,
            symmetry_score: 30,
            issues: []
        }
    }
}

/**
 * Build retry emphasis for failed pose validation
 */
export function buildPoseRetryEmphasis(symmetryScore: number): string {
    return `
╔════════════════════════════════════════════════════════════╗
║  ⚠️  PREVIOUS ATTEMPT FAILED: POSE TOO SYMMETRICAL       ║
╚════════════════════════════════════════════════════════════╝

Previous symmetry score: ${symmetryScore}% (threshold: < 40%)

The pose was too mannequin-like, too perfect, too symmetrical.

INCREASED ASYMMETRY REQUIREMENT:
• Shoulder tilt MUST be 5-10° (more pronounced)
• Weight shift MUST be obvious (hip clearly lower on one side)
• Arms MUST be in clearly different positions
• Head tilt MUST be visible (5-8°)

Make it look like a REAL person, not a catalog model.
`.trim()
}
