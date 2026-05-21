export type PostTimingSuggestion = {
  label: string
  window: string
  reason: string
  angle: string
}

function normalizeCategory(category?: string | null) {
  return String(category || '').trim().toLowerCase()
}

export function getBestTimeToPost(category?: string | null): PostTimingSuggestion {
  const normalized = normalizeCategory(category)

  if (normalized.includes('dress') || normalized.includes('fashion') || normalized.includes('women')) {
    return {
      label: 'Best time to post',
      window: '7:00 PM - 9:00 PM',
      reason: 'Fashion discovery usually performs best when people are in evening browsing mode.',
      angle: 'Lead with the final look first, then the try-on reveal in the second slide or story tap.',
    }
  }

  if (normalized.includes('men') || normalized.includes('street') || normalized.includes('casual')) {
    return {
      label: 'Best time to post',
      window: '6:30 PM - 8:30 PM',
      reason: 'Style and shopping intent tends to pick up after work and commute hours.',
      angle: 'Use a sharper first line and keep the first frame clean and outfit-led.',
    }
  }

  if (normalized.includes('beauty') || normalized.includes('accessor')) {
    return {
      label: 'Best time to post',
      window: '12:30 PM - 2:00 PM',
      reason: 'Midday posts often catch save-heavy browsing for smaller style and beauty buys.',
      angle: 'Use a short caption with a direct product hook and a close crop first.',
    }
  }

  return {
    label: 'Best time to post',
    window: '7:00 PM - 8:30 PM',
    reason: 'This is a strong default for creator-fashion content while we build account-level engagement data.',
    angle: 'Post the clearest result first and keep the affiliate link ready in story follow-ups.',
  }
}
