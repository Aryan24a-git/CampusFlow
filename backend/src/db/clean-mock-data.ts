import { db } from './client';

export async function clearMockData() {
  console.log('🧹 Clearing mock data from database...');

  // 1. Clear issue updates
  const { error: errUpdates } = await db.from('issue_updates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✓ Cleared issue_updates:', !errUpdates);

  // 2. Clear issues
  const { error: errIssues } = await db.from('issues').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✓ Cleared issues:', !errIssues);

  // 3. Clear grievances
  const { error: errGrievances } = await db.from('grievances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✓ Cleared grievances:', !errGrievances);

  // 4. Clear lost & found items
  const { error: errMatches } = await db.from('lost_found_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: errLost } = await db.from('lost_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: errFound } = await db.from('found_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✓ Cleared lost & found:', !errLost && !errFound && !errMatches);

  // 5. Clear notifications
  const { error: errNotifs } = await db.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✓ Cleared notifications:', !errNotifs);

  console.log('✨ All mock data successfully cleaned! Database is fresh for real testing.');
}

if (require.main === module) {
  clearMockData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error clearing mock data:', err);
      process.exit(1);
    });
}
