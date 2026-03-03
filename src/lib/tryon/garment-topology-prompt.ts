/**
 * GARMENT TOPOLOGY PROMPT INJECTION
 *
 * Injects topology-aware constraints into Nano Banana prompts.
 * These rules are system-defined and non-negotiable.
 */

import 'server-only'
import type { GarmentTopology, GarmentTopologyResult } from './garment-topology-classifier'

export const TOP_ONLY_LOCK = [
  'Garment topology lock: TOP_ONLY.',
  'This topology is system-defined and final.',
  '',
  'Rules:',
  '- The top must end above the hip line.',
  '- The top must not form a continuous full-length silhouette.',
  '- Never convert the top into a dress.',
  '- Never extend the top below hip level.',
  '',
  'Mandatory requirements:',
  '- Generate a separate lower garment.',
  '- Lower garment must be plain, neutral, practical, and clearly separate from the top.',
  '- Top and bottom must remain structurally separate.',
  '',
  'Violation checks:',
  '- If the garment extends below the hip line, regenerate.',
  '- If pants or skirt are missing, regenerate.',
  '- If the top flows into a dress silhouette, regenerate.',
].join('\n')

export const DRESS_LOCK = [
  'Garment topology lock: DRESS.',
  'This topology is system-defined and final.',
  '',
  'Rules:',
  '- The dress must extend to its natural reference length.',
  '- Do not truncate the dress or convert it into a top.',
  '- Maintain a continuous full-length silhouette.',
  '',
  'Forbidden:',
  '- Do not add separate pants or a skirt.',
  '- Do not shorten the dress.',
  '- Do not treat the garment as a top.',
].join('\n')

export const TWO_PIECE_LOCK = [
  'Garment topology lock: TWO_PIECE.',
  'This topology is system-defined and final.',
  '',
  'Rules:',
  '- Include both top and bottom pieces from the reference.',
  '- Maintain the set as a coordinated outfit.',
  '- Match both pieces to the reference exactly.',
].join('\n')

export function buildTopologyPromptInjection(topologyResult: GarmentTopologyResult): string {
  let topologyBlock: string

  switch (topologyResult.topology) {
    case 'TOP_ONLY':
      topologyBlock = TOP_ONLY_LOCK
      break
    case 'DRESS':
      topologyBlock = DRESS_LOCK
      break
    case 'TWO_PIECE':
      topologyBlock = TWO_PIECE_LOCK
      break
    default:
      topologyBlock = TOP_ONLY_LOCK
  }

  const context = [
    'Garment analysis result:',
    `- Detected topology: ${topologyResult.topology}`,
    `- Classification confidence: ${(topologyResult.confidence * 100).toFixed(0)}%`,
    `- Reason: ${topologyResult.reason}`,
    `- Pants required: ${topologyResult.requiresPants ? 'yes' : 'no'}`,
  ].join('\n')

  return [context, '', topologyBlock].join('\n')
}

export function getTopologyReminder(topology: GarmentTopology): string {
  switch (topology) {
    case 'TOP_ONLY':
      return [
        'TOPOLOGY: TOP_ONLY',
        '- Top ends above hip.',
        '- Must include pants or skirt.',
        '- Never extend into a dress.',
        '- Top and bottom stay separate.',
      ].join('\n')
    case 'DRESS':
      return [
        'TOPOLOGY: DRESS',
        '- Full-length garment.',
        '- No separate pants.',
        '- Maintain dress silhouette.',
      ].join('\n')
    case 'TWO_PIECE':
      return [
        'TOPOLOGY: TWO_PIECE',
        '- Include both pieces.',
        '- Maintain set coordination.',
      ].join('\n')
    default:
      return ''
  }
}

export function getPantsInstruction(): string {
  return [
    'Pants generation is mandatory for TOP_ONLY references.',
    'Generate a lower garment with these defaults:',
    '- fitted and practical',
    '- neutral color: black, navy, charcoal, or beige',
    '- solid color only',
    '- full length or otherwise appropriate to the outfit',
    '- visually secondary to the top',
    '',
    'If unsure, default to slim-fit black pants.',
  ].join('\n')
}

export function logTopologyInjection(topologyResult: GarmentTopologyResult): void {
  console.log('\nTOPOLOGY PROMPT INJECTION APPLIED')
  console.log(`   Topology: ${topologyResult.topology}`)
  console.log(`   Confidence: ${(topologyResult.confidence * 100).toFixed(0)}%`)
  console.log(`   Pants required: ${topologyResult.requiresPants ? 'yes' : 'no'}`)
}
