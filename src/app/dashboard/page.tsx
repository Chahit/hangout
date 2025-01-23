"use client";

import { useEffect, useState } from "react";
import { 
  Share2, Users, Calendar, MessageSquare, 
  Plus, HelpCircle, TrendingUp, Coffee,
  ShoppingBag, Briefcase, Search, MapPin,
  Sparkles, Clock, ArrowRight, Heart,
  Send, Image as ImageIcon, Bell, MessageCircle,
  PartyPopper
} from "lucide-react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import ActivityTrends from './components/ActivityTrends';

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
};

const buttonVariants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
};

// Floating background shapes component
const FloatingShapes = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <motion.div
      className="absolute w-72 h-72 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl"
      animate={{
        x: [0, 100, 0],
        y: [0, 50, 0],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear"
      }}
      style={{ top: '10%', left: '20%' }}
    />
    <motion.div
      className="absolute w-96 h-96 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-full blur-3xl"
      animate={{
        x: [0, -70, 0],
        y: [0, 100, 0],
      }}
      transition={{
        duration: 25,
        repeat: Infinity,
        ease: "linear"
      }}
      style={{ top: '40%', right: '10%' }}
    />
  </div>
);

interface DashboardStats {
  communities: number;
  unreadMessages: number;
  upcomingEvents: number;
  notifications: number;
  totalConnections: number;
  activeChats: number;
  eventParticipation: number;
  groupEngagement: number;
}

interface Activity {
  id: string;
  type: 'community' | 'event' | 'message';
  title: string;
  description: string;
  timestamp: string;
}

interface Event {
  id: string;
  title: string;
  start_time: string;
  location: string;
  participants: number;
}

interface Group {
  id: string;
  name: string;
  members: number;
  description: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    communities: 0,
    unreadMessages: 0,
    upcomingEvents: 0,
    notifications: 0,
    totalConnections: 0,
    activeChats: 0,
    eventParticipation: 0,
    groupEngagement: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
  const [quickPost, setQuickPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch communities count
      const { count: groupsCount } = await supabase
        .from('group_members')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Fetch upcoming events count
      const { count: eventsCount } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Fetch unread messages count
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('to_user_id', user.id)
        .eq('read', false);

      // Fetch notifications count
      const { count: notificationsCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('read', false);

      // Fetch total connections (unique users interacted with)
      const { count: connectionsCount } = await supabase
        .from('messages')
        .select('DISTINCT to_user_id', { count: 'exact' })
        .eq('from_user_id', user.id);

      // Fetch active chats (conversations with messages in last 7 days)
      const { count: activeChatsCount } = await supabase
        .from('messages')
        .select('DISTINCT to_user_id', { count: 'exact' })
        .eq('from_user_id', user.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Fetch event participation rate
      const { count: totalEvents } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Get attended events count
      const { count: attendedEventsCount } = await supabase
        .from('event_attendees')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'attended');

      // Calculate group engagement (posts/messages in last 30 days)
      const { count: recentActivity } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('from_user_id', user.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const eventParticipation = attendedEventsCount ?? 0;
      const groupEngagement = (recentActivity || 0) / (totalEvents || 1);

      setStats({
        communities: groupsCount || 0,
        unreadMessages: messagesCount || 0,
        upcomingEvents: eventsCount || 0,
        notifications: notificationsCount || 0,
        totalConnections: connectionsCount || 0,
        activeChats: activeChatsCount || 0,
        eventParticipation,
        groupEngagement
      });

      // Fetch upcoming events
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .gt('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(3);

      if (events) {
        setUpcomingEvents(events);
      }

      // Fetch suggested groups
      const { data: groups } = await supabase
        .from('groups')
        .select('*')
        .limit(3);

      if (groups) {
        setSuggestedGroups(groups);
      }

      // Fetch recent activities
      const activities: Activity[] = [];
      
      // Fetch community activities
      const { data: groupActivities } = await supabase
        .from('group_members')
        .select('groups(name, created_at)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (groupActivities) {
        groupActivities.forEach((activity: any) => {
          activities.push({
            id: Math.random().toString(),
            type: 'community',
            title: 'New Community Joined',
            description: `You joined ${activity.groups.name}`,
            timestamp: activity.groups.created_at
          });
        });
      }

      setActivities(activities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotificationCount(count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleNotificationClick = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark all notifications as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotificationCount(0);
    } catch (error) {
      console.error('Error updating notifications:', error);
    }
  };

  const handleQuickPost = async () => {
    if (!quickPost.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('posts').insert({
        content: quickPost,
        user_id: user.id,
        created_at: new Date().toISOString()
      });

      setQuickPost('');
      // Optionally refresh activities
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full relative font-cabinet-grotesk">
        <FloatingShapes />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-24 bg-white/5 rounded-xl overflow-hidden">
              <div className="w-full h-full relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent animate-shimmer" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-white/5 rounded-xl overflow-hidden">
                  <div className="w-full h-full relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent animate-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative font-cabinet-grotesk">
      {/* Floating background shapes for visual interest */}
      <FloatingShapes />
      
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-clash-display font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
              Welcome Back! ✨
            </h1>
            <p className="text-gray-400 mt-1">
              Here's what's happening in your college community
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Communities Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-medium">Communities</h3>
                <p className="text-2xl font-bold">{stats.communities}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Active group memberships</p>
          </motion.div>

          {/* Messages Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-blue-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium">Messages</h3>
                <p className="text-2xl font-bold">{stats.unreadMessages}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Unread messages</p>
          </motion.div>

          {/* Events Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-green-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-medium">Events</h3>
                <p className="text-2xl font-bold">{stats.upcomingEvents}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Upcoming events</p>
          </motion.div>

          {/* Notifications Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-pink-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-pink-500/20 rounded-lg">
                <Bell className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <h3 className="font-medium">Notifications</h3>
                <p className="text-2xl font-bold">{stats.notifications}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Unread notifications</p>
          </motion.div>
        </div>

        {/* Engagement Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Connections Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-indigo-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Share2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-medium">Connections</h3>
                <p className="text-2xl font-bold">{stats.totalConnections}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Total unique connections</p>
          </motion.div>

          {/* Active Chats Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-cyan-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <MessageCircle className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-medium">Active Chats</h3>
                <p className="text-2xl font-bold">{stats.activeChats}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Conversations this week</p>
          </motion.div>

          {/* Event Participation Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-amber-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <PartyPopper className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-medium">Event Participation</h3>
                <p className="text-2xl font-bold">{stats.eventParticipation}%</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Attendance rate</p>
          </motion.div>

          {/* Group Engagement Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-rose-500/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-rose-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-medium">Group Activity</h3>
                <p className="text-2xl font-bold">{stats.groupEngagement}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Posts in last 30 days</p>
          </motion.div>
        </div>

        {/* Activity Trends Section */}
        <div className="mb-8">
          <ActivityTrends />
        </div>

        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/dashboard/messages">
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-blue-500/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium">Messages</h3>
                  <p className="text-sm text-gray-400">Start a conversation</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link href="/dashboard/groups">
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-purple-500/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium">Groups</h3>
                  <p className="text-sm text-gray-400">Join or create a group</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link href="/dashboard/events">
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-green-500/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-medium">Events</h3>
                  <p className="text-sm text-gray-400">Browse upcoming events</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link href="/dashboard/dating">
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-pink-500/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/20 rounded-lg">
                  <Heart className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h3 className="font-medium">Dating</h3>
                  <p className="text-sm text-gray-400">Find your match</p>
                </div>
              </div>
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
} 