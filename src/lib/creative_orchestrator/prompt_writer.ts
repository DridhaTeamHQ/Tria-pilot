
import { getOpenAI } from '@/lib/openai'
import { CreativeContract } from './types'
import { AdGradePreset } from './presets'

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT FOR CREATIVE WRITER
// ═══════════════════════════════════════════════════════════════════════════════

const CREATIVE_WRITER_SYSTEM_PROMPT = `
You are the Lead Prompt Engineer for "Nano Banana Pro" (Gemini 3 Pro Image), a Reasoning Image Engine.
Your goal is to convert a structured JSON Creative Contract into a lush, flowing NARRATIVE PROMPT.

This model hates "tag salad" (comma-separated keywords).
It loves descriptive, atmospheric prose that explains the relationship between light, texture, and subject.

RULES:
1. Write in full, coherent sentences.
2. Weave the "Style Narrative" into the description naturally.
3. Focus intensely on LIGHTING behavior (how it hits surfaces) and TEXTURE fidelity.
4. Do not mention "JSON" or "contract" in the output.
5. Output ONLY the prompt string.

EXAMPLE INPUT:
{
  "ad_type": "fashion_editorial",
  "lighting": { "mode": "soft_pastel" },
  "product": { "category": "Silk Scarf" },
  "preset_intent": "Daydreamy and airy"
}

EXAMPLE OUTPUT:
The scene captures a dreamy fashion editorial featuring a delicate Silk Scarf. Soft, omni-directional light bathes the subject in gentle pastels, eliminating harsh shadows and creating an airy atmosphere. The silk texture is rendered with exquisite fidelity, catching the diffused light with a subtle sheen. The composition feels effortless and high-end, evoking a sense of calm luxury.
`

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATOR FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateCreativePrompt(
    contract: CreativeContract,
    preset: AdGradePreset
): Promise<string> {
    const openai = getOpenAI()

    console.log('[PromptWriter] Generating creative prompt with GPT-4o-mini...')

    const context = {
        contract,
        preset_name: preset.name,
        preset_intent: preset.intent,
        preset_narrative: preset.description
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: CREATIVE_WRITER_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Here is the Creative Contract. Write the narrative prompt:\n${JSON.stringify(context, null, 2)}`
                }
            ],
            temperature: 0.7, // Higher creativity allowed
            max_tokens: 500,
        })

        const content = response.choices[0]?.message?.content?.trim()

        if (!content) {
            console.warn('[PromptWriter] Empty response from GPT, falling back to basic prompt.')
            return `A pro commercial shot of ${contract.product.category}. ${preset.intent}`
        }

        console.log('[PromptWriter] Creative prompt generated:', content.slice(0, 50))
        return content

    } catch (error) {
        console.error('[PromptWriter] Failed to generate prompt:', error)
        // Fallback if GPT fails
        return `A high-quality commercial photograph of ${contract.product.category}. ${preset.intent}`
    }
}
