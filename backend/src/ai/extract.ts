import { chatCompletion, sanitizeInput } from './provider';
import { logger } from '../utils/logger';
import type { ExtractedIssue, Priority } from '../../../packages/types/src/index';

// ─── Extraction System Prompt ──────────────────────────────────────────────────
const EXTRACT_SYSTEM_PROMPT = `You are a campus issue data extractor for CampusFlow.
Extract structured fields from the user's maintenance report.

Respond ONLY with valid JSON in this exact format:
{
  "title": "short 5-8 word title",
  "category": "electrical|plumbing|network|housekeeping|hostel|academic|security|library|general",
  "subcategory": "specific item e.g. ceiling_fan, water_pipe, wifi_router",
  "location_label": "exact location from message, or 'Not specified'",
  "severity": "low|medium|high|critical",
  "description": "clear, professional 1-2 sentence description"
}

Severity rules:
- critical: fire hazard, electrical danger, flooding, safety risk
- high: affects many users, complete outage (lab/hostel-wide)
- medium: single room, affects one person, partial malfunction
- low: cosmetic, minor, furniture, non-essential

Do not include any text outside the JSON.`;

// ─── Fallback extraction (keyword-based) ─────────────────────────────────────
function keywordExtract(message: string): ExtractedIssue {
  const lower = message.toLowerCase();

  let category = 'general';
  let subcategory = 'other';
  let severity: Priority = 'medium';

  if (lower.match(/fan|ac|air.con|electricity|electrical|power|light|socket|switch|wiring/)) {
    category = 'electrical';
    subcategory = lower.includes('fan') ? 'ceiling_fan' : lower.includes('ac') ? 'air_conditioner' : 'electrical_general';
  } else if (lower.match(/water|tap|pipe|leak|drain|flood|plumb/)) {
    category = 'plumbing';
    subcategory = lower.includes('leak') ? 'pipe_leak' : 'water_supply';
    severity = 'high';
  } else if (lower.match(/wifi|wi-fi|internet|network|router|connection/)) {
    category = 'network';
    subcategory = 'wifi';
  } else if (lower.match(/projector|screen|computer|lab|printer/)) {
    category = 'academic';
    subcategory = 'av_equipment';
  } else if (lower.match(/clean|dirty|garbage|dust|sweeping/)) {
    category = 'housekeeping';
    subcategory = 'cleaning';
    severity = 'low';
  } else if (lower.match(/hostel|dorm|room|bed|mess/)) {
    category = 'hostel';
    subcategory = 'hostel_facility';
  }

  // Extract location from common patterns
  const locationMatch = message.match(/(hostel [a-z] ?room ?\d+|room ?\d+|lab ?\d+|block [a-z0-9]+|floor ?\d+|building \w+)/i);
  const location_label = locationMatch ? locationMatch[0] : 'Not specified';

  return {
    title: `${category} issue — ${location_label}`,
    category,
    subcategory,
    location_label,
    severity,
    description: `User reported: "${message.slice(0, 200)}"`,
  };
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export async function extractIssueFields(message: string): Promise<ExtractedIssue> {
  const sanitized = sanitizeInput(message);

  try {
    const raw = await chatCompletion({
      system: EXTRACT_SYSTEM_PROMPT,
      userMessage: sanitized,
      maxTokens: 300,
      temperature: 0,
    });

    // Parse JSON from AI response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]) as ExtractedIssue;

    // Validate required fields
    if (!parsed.title || !parsed.category || !parsed.location_label) {
      throw new Error('Missing required fields in extraction');
    }

    logger.info('Issue extracted', { category: parsed.category, location: parsed.location_label });
    return parsed;

  } catch (err) {
    logger.warn('Extraction AI failed — using keyword extraction', { err });
    return keywordExtract(sanitized);
  }
}
