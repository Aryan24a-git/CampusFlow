import { Router, Request, Response } from 'express';
import { auth } from '../../middleware/auth';
import { classifyIntent } from '../../ai/intent';
import { extractIssueFields } from '../../ai/extract';
import { db } from '../../db/client';
import { chatCompletion, sanitizeInput } from '../../ai/provider';
import type { IntentType, ActionCard } from '../../types';

const router = Router();

// Knowledge base quick lookup for CAMPUS_INFORMATION
const CAMPUS_INFO_MAP: Record<string, string> = {
  library: 'The Central Library is open Monday to Saturday from 8:00 AM to 10:00 PM. Digital reading halls remain open 24/7 during exam weeks.',
  scholarship: 'National and State scholarship applications are handled by the Student Welfare Office (Admin Building, 2nd Floor). Deadline for renewal is October 31st.',
  wifi: 'For CampusNet or eduroam Wi-Fi issues, ensure your MAC address is registered at the IT Helpdesk (Central Labs, Server Room ext-403).',
  hostel: 'Hostel gate curfew is 10:00 PM for all hostels. Room maintenance requests can be logged directly right here on CampusFlow.',
  fee: 'Fee receipts and payment verification are managed at the Accounts Section, Admin Building Counter 4, open 10:00 AM to 3:00 PM.',
  medical: 'Campus Health Center is situated next to Hostel A. Doctor available: 9:00 AM - 1:00 PM and 4:00 PM - 7:00 PM. Emergency ambulance: ext-100.',
};

// POST /api/chat
router.post('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, error: 'Message is required' });
      return;
    }

    const userId = req.user!.id;
    const sanitized = sanitizeInput(message);

    // 1. Classify Intent
    const intent: IntentType = await classifyIntent(sanitized);

    let replyText = '';
    let actionCard: ActionCard | undefined;

    switch (intent) {
      case 'MAINTENANCE_REPORT': {
        const extracted = await extractIssueFields(sanitized);

        // Check for potential duplicate issues at same location
        let duplicateFound = false;
        let existingIncidentId: string | undefined;

        if (extracted.location_label && extracted.location_label !== 'Not specified') {
          const { data: openIssues } = await db
            .from('issues')
            .select('id, title, status, location_label')
            .ilike('location_label', `%${extracted.location_label}%`)
            .in('status', ['reported', 'assigned', 'in_progress'])
            .limit(1);

          if (openIssues && openIssues.length > 0) {
            duplicateFound = true;
            existingIncidentId = openIssues[0].id;
          }
        }

        if (duplicateFound) {
          replyText = `⚠️ A similar issue has already been reported at "${extracted.location_label}". You can join this existing ticket to boost its priority or create a separate report:`;
          actionCard = {
            type: 'duplicate_found',
            data: {
              ...extracted,
              existingIssueId: existingIncidentId,
            },
          };
        } else {
          replyText = `I've analyzed your report. Here is the ticket summary ready for dispatch:`;
          actionCard = {
            type: 'issue_confirmation',
            data: { ...extracted } as Record<string, unknown>,
          };
        }
        break;
      }

      case 'COMPLAINT_STATUS': {
        const { data: issues } = await db
          .from('issues')
          .select('id, title, status, priority, category, created_at')
          .eq('created_by', userId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!issues || issues.length === 0) {
          replyText = `You don't have any active complaints registered right now. If you're facing an issue on campus, simply describe it to me!`;
        } else {
          replyText = `Here is the current status of your most recent complaints:`;
          actionCard = {
            type: 'issue_status',
            data: { issues },
          };
        }
        break;
      }

      case 'CAMPUS_INFORMATION': {
        const lower = sanitized.toLowerCase();
        let matched = '';
        for (const [key, answer] of Object.entries(CAMPUS_INFO_MAP)) {
          if (lower.includes(key)) {
            matched = answer;
            break;
          }
        }

        if (matched) {
          replyText = matched;
        } else {
          try {
            replyText = await chatCompletion({
              system: 'You are CampusFlow AI, a helpful campus assistant. Provide a brief, accurate, 2-3 sentence answer to the student question.',
              userMessage: sanitized,
              maxTokens: 150,
            });
          } catch {
            replyText = 'Campus administrative offices are open 9:30 AM to 5:00 PM in the Admin Building. For specific department queries, visit Student Welfare on 2nd Floor.';
          }
        }
        break;
      }

      case 'LOST_ITEM': {
        replyText = `I'm sorry you lost your item! You can register it in our Lost & Found registry so campus security and fellow students can match it if found.`;
        actionCard = {
          type: 'lost_found_match',
          data: { action: 'report_lost' },
        };
        break;
      }

      case 'FOUND_ITEM': {
        replyText = `Thank you for being a responsible campus citizen! Please log the item in Lost & Found or turn it in to the Security Office at Main Gate.`;
        actionCard = {
          type: 'lost_found_match',
          data: { action: 'report_found' },
        };
        break;
      }

      case 'EMERGENCY_INFORMATION': {
        replyText = `🚨 Campus Emergency Contacts:\n• Security Control Room: ext-408 / +91 98765 43210\n• Campus Health Center Ambulance: ext-100\n• National Emergency: 112\n• Fire Emergency: 101`;
        break;
      }

      case 'GRIEVANCE': {
        replyText = `CampusFlow takes student welfare and safety very seriously. Your concern can be logged as a confidential grievance visible ONLY to the Internal Grievance Authority and Dean of Student Affairs.`;
        break;
      }

      default: {
        try {
          replyText = await chatCompletion({
            system: 'You are CampusFlow AI, an intelligent, polite, and helpful campus assistant. Answer concisely in 2-3 sentences.',
            userMessage: sanitized,
            maxTokens: 100,
          });
        } catch {
          replyText = 'Hello! I am CampusFlow AI. You can report broken equipment, track existing tickets, ask about campus facilities, or check Lost & Found.';
        }
        break;
      }
    }

    res.json({
      success: true,
      data: {
        intent,
        reply: replyText,
        actionCard,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to process chat message' });
  }
});

export default router;
