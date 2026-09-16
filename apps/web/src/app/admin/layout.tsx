import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/shared/Navbar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('name, email, role')
    .eq('id', user.id)
    .single();

  // Fallback to JWT metadata if the DB query returns null (RLS timing issue)
  const name = profile?.name ?? (user!.user_metadata?.name as string) ?? 'User';
  const email = profile?.email ?? user!.email ?? '';
  const role = profile?.role ?? (user!.user_metadata?.role as string) ?? 'student';

  if (!['admin', 'grievance_authority'].includes(role)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar
        userName={name}
        userEmail={email}
        userRole={role}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
