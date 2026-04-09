'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radar, LayoutDashboard, MessageCircle, User } from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/feed', label: 'Feed', icon: Radar },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/profil', label: 'Profil', icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-bg-primary/80 backdrop-blur-xl safe-bottom">
      <div className="mx-auto flex h-16 max-w-md items-stretch justify-around">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                isActive
                  ? 'text-accent-blue'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              <Icon
                className={clsx('size-5', isActive && 'drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]')}
              />
              <span>{label}</span>
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent-blue" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
