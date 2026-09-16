'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
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
    { label: 'Grievances', href: '/grievances', icon: '📣' },
  ],
  faculty: [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'AI Chat', href: '/chat', icon: '💬' },
    { label: 'My Issues', href: '/issues', icon: '📋' },
    { label: 'Grievances', href: '/grievances', icon: '📣' },
  ],
  staff: [
    { label: 'Work Queue', href: '/queue', icon: '📋' },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { label: 'Grievances', href: '/admin/grievances', icon: '📣' },
  ],
  grievance_authority: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { label: 'Grievances', href: '/admin/grievances', icon: '📣' },
  ],
};

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  student: { label: 'Student', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  faculty: { label: 'Faculty', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  staff: { label: 'Maintenance Staff', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  admin: { label: 'Admin', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  grievance_authority: { label: 'Head of Dept', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
};

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export function Navbar({ userName, userRole, userEmail }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const navItems = ROLE_NAV[userRole] ?? ROLE_NAV.student;
  const badge = ROLE_BADGES[userRole] ?? ROLE_BADGES.student;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    loadNotifications();
    // Supabase realtime subscription
    const channel = supabase
      .channel('notifications-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev.slice(0, 19)]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function loadNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, type, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data ?? []);
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo + Nav Links */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-xs">🎓</span>
              </div>
              <span className="font-bold text-white text-sm hidden sm:block">CampusFlow</span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
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
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Role badge */}
            <span className={`hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
              {badge.label}
            </span>

            {/* Notification Bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setShowNotifs(v => !v); if (!showNotifs && unread > 0) markAllRead(); }}
                className="relative w-8 h-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center transition-all"
                title="Notifications"
              >
                <span className="text-sm">🔔</span>
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifs && (
                <div className="absolute right-0 top-10 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <div className="text-3xl mb-2">🔕</div>
                        <div className="text-sm text-slate-500">No notifications yet</div>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 border-b border-white/5 last:border-0 transition-colors ${
                            !n.read ? 'bg-blue-500/5' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-blue-400" style={{ opacity: n.read ? 0 : 1 }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white truncate">{n.title}</div>
                              <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</div>
                              <div className="text-xs text-slate-600 mt-1">
                                {new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden w-8 h-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center transition-all"
            >
              <span className="text-slate-400 text-xs">{mobileOpen ? '✕' : '☰'}</span>
            </button>

            {/* User + logout */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-right">
                <div className="text-xs font-medium text-white leading-none">{userName}</div>
                <div className="text-xs text-slate-500 leading-none mt-0.5 truncate max-w-[120px]">{userEmail}</div>
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

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 py-3 space-y-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  pathname === item.href ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between px-3">
              <div>
                <div className="text-xs font-medium text-white">{userName}</div>
                <div className="text-xs text-slate-500">{userEmail}</div>
              </div>
              <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white transition-colors">Sign out ↪</button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
