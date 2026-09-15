import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment');
}

// Service role client — bypasses RLS (backend use only, NEVER expose to frontend)
export const db = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test connection on startup
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await db.from('users').select('id').limit(1);
    if (error && !error.message.includes('does not exist')) {
      throw error;
    }
    return true;
  } catch (err) {
    return false;
  }
}
