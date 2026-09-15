import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/shared/Navbar';

export default async function StudentLayout({
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

  if (!profile) redirect('/login');

  // Staff/admin shouldn't be in student routes
  if (['staff', 'admin', 'grievance_authority'].includes(profile.role)) {
    redirect(profile.role === 'staff' ? '/queue' : '/admin/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar
        userName={profile.name}
        userEmail={profile.email}
        userRole={profile.role}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
