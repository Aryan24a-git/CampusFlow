import { chatCompletion, sanitizeInput } from './provider';
import { logger } from '../utils/logger';
import type { IntentType } from '../../../packages/types/src/index';

// ─── Intent Classification System Prompt ──────────────────────────────────────
const INTENT_SYSTEM_PROMPT = `You are a campus service assistant intent classifier for CampusFlow.
Classify the user's message into EXACTLY ONE of these intents:

- MAINTENANCE_REPORT: physical problems, broken items, infrastructure issues, repair needed, not working, damaged, leaking, power failure, water problem, fan, AC, lift, projector, lab equipment
- COMPLAINT_STATUS: asking about status of an existing complaint or request
- CAMPUS_INFORMATION: asking who handles something, where an office is, procedures, scholarship, fees, hostel rules, timings, contact info, department info
- ADMINISTRATIVE_REQUEST: requesting official documents, certificates, NOC, letters
- GRIEVANCE: sensitive personal complaints — ragging, harassment, discrimination, safety threats
- LOST_ITEM: reporting a lost item, lost something, can't find belongings
- FOUND_ITEM: reporting a found item, picked up something, found belongings
- EMERGENCY_INFORMATION: emergency contacts, fire, medical emergency, urgent safety
- GENERAL_CONVERSATION: greetings, thanks, unclear requests, anything else

Respond with ONLY the intent name. No punctuation. No explanation. Just the intent.

Examples:
"The fan in Hostel B Room 204 is broken" → MAINTENANCE_REPORT
"Hostel er fan ta kaaj korche na" → MAINTENANCE_REPORT
"Wi-Fi is down in CSE lab" → MAINTENANCE_REPORT
"Who handles scholarship issues?" → CAMPUS_INFORMATION
"What is the status of my complaint?" → COMPLAINT_STATUS
"I lost my wallet near the library" → LOST_ITEM
"I found a black bag in the canteen" → FOUND_ITEM
"Someone is harassing me in the hostel" → GRIEVANCE
"Hello, how are you?" → GENERAL_CONVERSATION`;

// ─── Keyword Fallback (no AI needed) ──────────────────────────────────────────
function keywordClassify(message: string): IntentType {
  const lower = message.toLowerCase();

  if (lower.match(/broken|not working|repair|fix|damaged|leaking|down|fault|dead|no power|kaaj kore ?na|band ho|nahi chal/)) {
    return 'MAINTENANCE_REPORT';
  }
  if (lower.match(/lost|missing|can't find|khoya|gum ho/)) return 'LOST_ITEM';
  if (lower.match(/found|picked up|mila|found it|turning in/)) return 'FOUND_ITEM';
  if (lower.match(/status|update|what happened|my complaint|complaint ki|progress/)) return 'COMPLAINT_STATUS';
  if (lower.match(/who handles|where is|office|contact|scholarship|fee|hostel rules|timings|procedure|how to apply/)) return 'CAMPUS_INFORMATION';
  if (lower.match(/harassment|ragging|bully|threat|uncomfortable|unsafe|discriminat/)) return 'GRIEVANCE';
  if (lower.match(/emergency|fire|ambulance|urgent|dangerous|accident/)) return 'EMERGENCY_INFORMATION';
  if (lower.match(/certificate|noc|letter|document request|official/)) return 'ADMINISTRATIVE_REQUEST';

  return 'GENERAL_CONVERSATION';
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export async function classifyIntent(message: string): Promise<IntentType> {
  const sanitized = sanitizeInput(message);

  try {
    const raw = await chatCompletion({
      system: INTENT_SYSTEM_PROMPT,
      userMessage: sanitized,
      maxTokens: 50,
      temperature: 0,
    });

    const intent = raw.trim().toUpperCase() as IntentType;
    const validIntents: IntentType[] = [
      'MAINTENANCE_REPORT', 'COMPLAINT_STATUS', 'CAMPUS_INFORMATION',
      'ADMINISTRATIVE_REQUEST', 'GRIEVANCE', 'LOST_ITEM', 'FOUND_ITEM',
      'EMERGENCY_INFORMATION', 'GENERAL_CONVERSATION',
    ];

    if (validIntents.includes(intent)) {
      logger.info('Intent classified', { message: sanitized.slice(0, 50), intent });
      return intent;
    }

    // AI returned unexpected string — fall back to keyword
    logger.warn('AI returned unexpected intent, using keyword fallback', { raw });
    return keywordClassify(sanitized);

  } catch (err) {
    // ALL_PROVIDERS_FAILED — use keyword
    logger.warn('Intent classification AI failed — using keyword fallback', { err });
    return keywordClassify(sanitized);
  }
}
