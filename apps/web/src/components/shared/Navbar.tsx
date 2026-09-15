'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface NavbarProps {
  userName: string;
  userRole: string;
  userEmail: string;
}

const ROLE_NAV: Record<string, { label: string; href: string; icon: string }[]> = {
  student: [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'AI Chat', href: '/chat', icon: '💬' },
    { label: 'My Issues', href: '/issues', icon: '📋' },
    { label: 'Lost & Found', href: '/lost-found', icon: '🔍' },
  ],
  faculty: [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'AI Chat', href: '/chat', icon: '💬' },
    { label: 'My Issues', href: '/issues', icon: '📋' },
  ],
  staff: [
    { label: 'Work Queue', href: '/queue', icon: '📋' },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { label: 'All Issues', href: '/admin/issues', icon: '📋' },
    { label: 'Staff', href: '/admin/staff', icon: '👥' },
    { label: 'Knowledge', href: '/admin/knowledge', icon: '📚' },
  ],
  grievance_authority: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
  ],
};

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  student: { label: 'Student', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  faculty: { label: 'Faculty', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  staff: { label: 'Staff', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  admin: { label: 'Admin', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  grievance_authority: { label: 'Authority', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};

export function Navbar({ userName, userRole, userEmail }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const navItems = ROLE_NAV[userRole] ?? ROLE_NAV.student;
  const badge = ROLE_BADGES[userRole] ?? ROLE_BADGES.student;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-xs">🎓</span>
              </div>
              <span className="font-bold text-white text-sm hidden sm:block">CampusFlow</span>
            </Link>

            {/* Nav Links */}
            <div className="flex items-center gap-1">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="hidden sm:block">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Role badge */}
            <span className={`hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
              {badge.label}
            </span>

            {/* User menu */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-medium text-white">{userName}</div>
                <div className="text-xs text-slate-500">{userEmail}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-8 h-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center transition-all group"
                title="Sign out"
              >
                <span className="text-slate-400 group-hover:text-white text-xs">↪</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
