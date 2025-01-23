'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, MessageSquare, Calendar, Settings, LogOut, Heart, Ghost, Laugh, HelpingHand } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { NotificationsDropdown } from './notifications';

const menuItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard' },
  { icon: Users, label: 'Groups', href: '/dashboard/groups' },
  { icon: MessageSquare, label: 'Messages', href: '/dashboard/messages' },
  { icon: Calendar, label: 'Events', href: '/dashboard/events' },
  { icon: Heart, label: 'Dating', href: '/dashboard/dating' },
  { icon: Ghost, label: 'Confessions', href: '/dashboard/confessions' },
  { icon: Laugh, label: 'Memes', href: '/dashboard/memes' },
  { icon: HelpingHand, label: 'PeerSupport', href: '/dashboard/support' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  return (
    <div className="w-64 bg-card border-r border-secondary min-h-screen p-4">
      <div className="space-y-4">
        <div className="px-3 py-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            CollegeConnect
          </h2>
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-secondary transition-colors text-destructive"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
} 