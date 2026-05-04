/**
 * BRAND VOICE EXTRACTOR
 *
 * Given 3-5 sample posts from a brand, GPT-4o extracts a structured
 * "voice fingerprint" that conditions every future AI-generated piece
 * of content (captions, scripts, hooks, ad copy, briefs).
 *
 * Stored in profiles.brand_data.voice as a JSONB blob.
 */

import 'server-only'
import OpenAI from 'openai'
import { getOpenAIKey } from '@/lib/config/api-keys'

export interface BrandVoice {
  /** One-line summary of the brand's voice */
  summary: string
  /** Tone descriptors — e.g. ["confident", "playful", "premium"] */
  tone: string[]
  /** Vocabulary preferences */
  vocabulary: {
    favoredWords: string[]
    avoidedWords: string[]
  }
  /** Sentence rhythm — short/medium/long */
  sentenceLength: 'short' | 'medium' | 'long' | 'mixed'
  /** Emoji usage frequency */
  emojiFrequency: 'none' | 'minimal' | 'moderate' | 'heavy'
  /** Preferred emoji set if any */
  preferredEmojis: string[]
  /** Hashtag style */
  hashtagStyle: 'none' | 'minimal' | 'standard' | 'aggressive'
  /** Hook patterns the brand uses (e.g. "starts with question", "stat-led") */
  hookPatterns: string[]
  /** Punctuation quirks (e.g. "uses em-dashes", "no exclamation marks") */
  punctuationQuirks: string[]
  /** Plain-English do/don't list the AI follows */
  dos: string[]
  donts: string[]
  /** Sample voice line the AI can reference */
  exampleLine: string
}

const FALLBACK_VOICE: BrandVoice = {
  summary: 'Modern, confident Indian D2C voice — clear, friendly, conversion-focused',
  tone: ['confident', 'friendly', 'aspirational'],
  vocabulary: {
    favoredWords: [],
    avoidedWords: ['cheap', 'bargain', 'discount-mania'],
  },
  sentenceLength: 'mixed',
  emojiFrequency: 'minimal',
  preferredEmojis: [],
  hashtagStyle: 'standard',
  hookPatterns: ['benefit-led', 'question opener'],
  punctuationQuirks: [],
  dos: ['Lead with the customer benefit', 'Use ₹ for currency'],
  donts: ['Avoid generic claims', 'No corporate jargon'],
  exampleLine: '',
}

export async function extractBrandVoice(samples: string[]): Promise<BrandVoice> {
  let apiKey: string
  try {
    apiKey = getOpenAIKey()
  } catch {
    return FALLBACK_VOICE
  }

  const cleanSamples = samples
    .map((s) => (s || '').trim())
    .filter((s) => s.length > 10)
    .slice(0, 5)

  if (cleanSamples.length === 0) return FALLBACK_VOICE

  const openai = new OpenAI({ apiKey })

  const systemPrompt = `You are a brand voice analyst. Given 3-5 sample social posts or captions from a brand, extract their distinctive voice into a structured fingerprint.

Be specific and concrete. Avoid vague labels like "engaging" or "modern" — describe what's actually observable in the samples.

Return ONLY valid JSON in this exact shape:
{
  "summary": "one-line description (under 20 words)",
  "tone": ["3-5 tone descriptors"],
  "vocabulary": {
    "favoredWords": ["actual words/phrases this brand uses"],
    "avoidedWords": ["words this brand clearly avoids based on the samples"]
  },
  "sentenceLength": "short|medium|long|mixed",
  "emojiFrequency": "none|minimal|moderate|heavy",
  "preferredEmojis": ["emojis appearing in samples"],
  "hashtagStyle": "none|minimal|standard|aggressive",
  "hookPatterns": ["patterns observed in opening lines"],
  "punctuationQuirks": ["specific punctuation habits"],
  "dos": ["3-5 actionable do rules for AI mimicking this voice"],
  "donts": ["3-5 actionable don't rules"],
  "exampleLine": "a single new line in this brand's voice for a hypothetical product launch"
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Sample posts from the brand:\n\n${cleanSamples.map((s, i) => `[${i + 1}] ${s}`).join('\n\n')}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
      temperature: 0.4,
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) return FALLBACK_VOICE
    const parsed = JSON.parse(raw) as Partial<BrandVoice>

    // Merge with fallback to ensure shape stability
    return {
      summary: parsed.summary || FALLBACK_VOICE.summary,
      tone: Array.isArray(parsed.tone) ? parsed.tone : FALLBACK_VOICE.tone,
      vocabulary: {
        favoredWords: Array.isArray(parsed.vocabulary?.favoredWords)
          ? parsed.vocabulary!.favoredWords
          : FALLBACK_VOICE.vocabulary.favoredWords,
        avoidedWords: Array.isArray(parsed.vocabulary?.avoidedWords)
          ? parsed.vocabulary!.avoidedWords
          : FALLBACK_VOICE.vocabulary.avoidedWords,
      },
      sentenceLength: parsed.sentenceLength || FALLBACK_VOICE.sentenceLength,
      emojiFrequency: parsed.emojiFrequency || FALLBACK_VOICE.emojiFrequency,
      preferredEmojis: Array.isArray(parsed.preferredEmojis)
        ? parsed.preferredEmojis
        : FALLBACK_VOICE.preferredEmojis,
      hashtagStyle: parsed.hashtagStyle || FALLBACK_VOICE.hashtagStyle,
      hookPatterns: Array.isArray(parsed.hookPatterns) ? parsed.hookPatterns : FALLBACK_VOICE.hookPatterns,
      punctuationQuirks: Array.isArray(parsed.punctuationQuirks)
        ? parsed.punctuationQuirks
        : FALLBACK_VOICE.punctuationQuirks,
      dos: Array.isArray(parsed.dos) ? parsed.dos : FALLBACK_VOICE.dos,
      donts: Array.isArray(parsed.donts) ? parsed.donts : FALLBACK_VOICE.donts,
      exampleLine: parsed.exampleLine || FALLBACK_VOICE.exampleLine,
    }
  } catch (err) {
    console.warn('[voice-extractor] failed:', err)
    return FALLBACK_VOICE
  }
}

/**
 * Compose a system-prompt fragment that tells AI generators to write in
 * this brand's voice. Designed to be appended to existing prompts.
 */
export function brandVoiceSystemPrompt(voice: BrandVoice | null | undefined): string {
  if (!voice) return ''
  const parts: string[] = []
  parts.push(`## BRAND VOICE — MATCH THIS EXACTLY`)
  parts.push(`Voice: ${voice.summary}`)
  if (voice.tone.length) parts.push(`Tone: ${voice.tone.join(', ')}`)
  parts.push(`Sentence length: ${voice.sentenceLength}. Emoji usage: ${voice.emojiFrequency}. Hashtag style: ${voice.hashtagStyle}.`)

  if (voice.vocabulary.favoredWords.length) {
    parts.push(`Use these words/phrases naturally: ${voice.vocabulary.favoredWords.join(', ')}`)
  }
  if (voice.vocabulary.avoidedWords.length) {
    parts.push(`Avoid: ${voice.vocabulary.avoidedWords.join(', ')}`)
  }
  if (voice.dos.length) parts.push(`Do:\n- ${voice.dos.join('\n- ')}`)
  if (voice.donts.length) parts.push(`Don't:\n- ${voice.donts.join('\n- ')}`)
  if (voice.exampleLine) parts.push(`Voice example to mimic: "${voice.exampleLine}"`)

  return parts.join('\n')
}
