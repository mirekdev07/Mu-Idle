'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

const MENU_ITEMS = [
  { href: '/', label: 'Game', icon: '🎮' },
  { href: '/boss-zone', label: 'Boss Zone', icon: '👹' },
  { href: '/chaos-machine', label: 'Chaos Machine', icon: '⚗️' },
  { href: '/vault', label: 'Vault', icon: '🏦' },
  { href: '/events', label: 'Events', icon: '🎁' },
  { href: '/ranking', label: 'Ranking', icon: '🏆' },
  { href: '/wiki', label: 'Wiki', icon: '📖' },
  { href: '/characters', label: 'Characters', icon: '👤' },
];

export default function DesktopMenu() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Don't show menu on auth pages or select-class
  const hideMenuPaths = ['/login', '/register', '/select-class'];
  if (hideMenuPaths.includes(pathname)) {
    return null;
  }

  // Don't show menu if not logged in
  if (status === 'loading') {
    return null;
  }

  if (!session) {
    return null;
  }

  return (
    <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-700">
      <div className="max-w-7xl mx-auto w-full px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl">⚔️</span>
            <span className="font-bold text-purple-400">MU Idle</span>
          </div>

          {/* Menu Items */}
          <div className="flex items-center gap-1">
            {MENU_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {session.user?.name || session.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
