'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, MessageSquare, Calendar, Settings, LogOut, Heart, Ghost, Laugh, HelpingHand, Menu, X } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { NotificationsDropdown } from './notifications';
import { motion, AnimatePresence } from 'framer-motion';

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
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors md:hidden"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ 
          x: isOpen ? 0 : -100,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ type: "spring", bounce: 0.25 }}
        className={`fixed top-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 min-h-screen p-4 md:relative md:translate-x-0 md:opacity-100 md:bg-transparent`}
      >
        <div className="space-y-4">
          <div className="px-3 py-2 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
              SNU Hangout
            </h2>
            <div className="flex items-center gap-2">
              <NotificationsDropdown />
              <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-gray-800/50 transition-colors text-red-400 hover:text-red-300"
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
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-purple-500/10 text-purple-400'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 transition-colors ${
                    isActive ? 'text-purple-400' : 'text-gray-400 group-hover:text-gray-100'
                  }`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </motion.div>
    </>
  );
} 