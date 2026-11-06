import type { CandidateEvent } from '../types'
import { runGates } from './gates'

export function publicationDecision(candidate: CandidateEvent, today?: string): { status: 'published' | 'rejected'; reasons: string[] } {
  const gates = runGates(candidate, today)
  const reasons = [...gates.reject, ...gates.demote, ...(candidate.qualityIssues ?? [])]
  if (/^consultar horario$/i.test(candidate.time)) reasons.push('time:missing')
  return { status: reasons.length ? 'rejected' : 'published', reasons: [...new Set(reasons)] }
}
