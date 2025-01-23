"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Calendar,
  Heart,
  Ghost,
  SmilePlus,
  HeartHandshake,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu
} from 'lucide-react';

const menuItems = [
  { name: 'Overview', icon: LayoutDashboard, href: '/dashboard', color: 'purple' },
  { name: 'Groups', icon: Users, href: '/dashboard/groups', color: 'blue' },
  { name: 'Messages', icon: MessageSquare, href: '/dashboard/messages', color: 'pink' },
  { name: 'Events', icon: Calendar, href: '/dashboard/events', color: 'green' },
  { name: 'Dating', icon: Heart, href: '/dashboard/dating', color: 'red' },
  { name: 'Confessions', icon: Ghost, href: '/dashboard/confessions', color: 'yellow' },
  { name: 'Memes', icon: SmilePlus, href: '/dashboard/memes', color: 'orange' },
  { name: 'PeerSupport', icon: HeartHandshake, href: '/dashboard/support', color: 'teal' },
  { name: 'Settings', icon: Settings, href: '/dashboard/settings', color: 'gray' }
];

// Mobile navigation items (limited to main features)
const mobileNavItems = [
  { name: 'Home', icon: LayoutDashboard, href: '/dashboard', color: 'purple' },
  { name: 'Groups', icon: Users, href: '/dashboard/groups', color: 'blue' },
  { name: 'Messages', icon: MessageSquare, href: '/dashboard/messages', color: 'pink' },
  { name: 'Events', icon: Calendar, href: '/dashboard/events', color: 'green' },
  { name: 'More', icon: Menu, href: '#', color: 'gray' }
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createClientComponentClient();
  const router = useRouter();

  // Handle logout function
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  // Check if we're on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-black">
      {/* Desktop Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: isCollapsed ? '5rem' : '16rem' }}
        className="fixed left-0 top-0 h-screen bg-black border-r border-white/10 z-50 hidden md:block"
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <h1 className="text-xl font-clash-display font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
                  SNU Hangout
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>

        {/* Desktop Menu Items */}
        <div className="py-4 space-y-2 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group cursor-pointer
                    ${isActive 
                      ? `bg-${item.color}-500/10 text-${item.color}-500` 
                      : 'hover:bg-white/5 text-gray-400 hover:text-white'
                    }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? `text-${item.color}-500` : 'group-hover:text-white'}`} />
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="font-medium"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Desktop Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <motion.button
            onClick={handleLogout}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer w-full"
          >
            <LogOut className="w-5 h-5" />
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-medium"
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 z-50 md:hidden">
        <div className="flex justify-around items-center p-2">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-1 p-2"
                >
                  <item.icon 
                    className={`w-6 h-6 ${
                      isActive ? `text-${item.color}-500` : 'text-gray-400'
                    }`}
                  />
                  <span className={`text-xs ${
                    isActive ? `text-${item.color}-500` : 'text-gray-400'
                  }`}>
                    {item.name}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute right-0 top-0 bottom-0 w-64 bg-gray-900 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                      <motion.div
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          isActive ? `bg-${item.color}-500/10 text-${item.color}-500` : 'text-gray-400'
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? `text-${item.color}-500` : ''}`} />
                        <span className="font-medium">{item.name}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-200 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'} mb-20 md:mb-0`}>
        {children}
      </main>
    </div>
  );
} 