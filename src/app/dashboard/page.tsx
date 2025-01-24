"use client";

import { useEffect, useState } from "react";
import { 
  Share2, Calendar, Plus, HelpCircle, TrendingUp, Coffee,
  ShoppingBag, Briefcase, Search, MapPin,
  Sparkles, Clock, ArrowRight, Send, ImageIcon, PartyPopper,
  Users, MessageSquare, Bell, MessageCircle, Heart
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
  datingMatches: number;
  pendingConfessions: number;
  supportResponses: number;
  memeInteractions: number;
}

interface Activity {
  id: string;
  type: 'community' | 'event' | 'message' | 'dating' | 'confession' | 'meme' | 'support';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    avatar_url: string;
  };
  link?: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  is_public: boolean;
  is_approved: boolean;
  max_participants: number;
  participants: {
    user: {
      id: string;
      name: string;
    };
    status: string;
  }[];
  group?: {
    id: string;
    name: string;
  };
}

interface Group {
  id: string;
  name: string;
  description: string;
  members: {
    user: {
      id: string;
      name: string;
    };
    role: 'admin' | 'member';
  }[];
  events: Event[];
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
    groupEngagement: 0,
    datingMatches: 0,
    pendingConfessions: 0,
    supportResponses: 0,
    memeInteractions: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
  const [quickPost, setQuickPost] = useState('');
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

      // Fetch stats
      const stats = await Promise.all([
        // Fetch unread messages
        supabase
          .from('direct_messages')
          .select('id', { count: 'exact' })
          .eq('receiver_id', user.id)
          .eq('is_read', false),

        // Fetch upcoming events
        supabase
          .from('events')
          .select('id', { count: 'exact' })
          .gte('start_time', new Date().toISOString())
          .eq('is_approved', true),

        // Fetch notifications
        supabase
          .from('notifications')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('is_read', false),

        // Fetch dating matches
        supabase
          .from('dating_connections')
          .select('id', { count: 'exact' })
          .eq('status', 'accepted')
          .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`),

        // Fetch group memberships
        supabase
          .from('group_members')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id),
      ]);

      setStats({
        unreadMessages: stats[0].count || 0,
        upcomingEvents: stats[1].count || 0,
        notifications: stats[2].count || 0,
        totalConnections: stats[3].count || 0,
        communities: stats[4].count || 0,
        activeChats: 0,
        eventParticipation: 0,
        groupEngagement: 0,
        datingMatches: stats[3].count || 0,
        pendingConfessions: 0,
        supportResponses: 0,
        memeInteractions: 0
      });

      // Fetch recent activities
      const { data: activities } = await supabase
        .from('activities')
        .select(`
          *,
          user:profiles(name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (activities) {
        setActivities(activities.map(activity => ({
          ...activity,
          timestamp: activity.created_at
        })));
      }

      // Fetch upcoming events
      const { data: events } = await supabase
        .from('events')
        .select(`
          *,
          participants:event_participants(
            user:profiles(id, name),
            status
          ),
          group:groups(id, name)
        `)
        .gte('start_time', new Date().toISOString())
        .eq('is_approved', true)
        .order('start_time', { ascending: true })
        .limit(3);

      if (events) {
        setUpcomingEvents(events);
      }

      // Fetch user's groups
      const { data: groups } = await supabase
        .from('groups')
        .select(`
          *,
          members:group_members(
            user:profiles(id, name),
            role
          ),
          events(*)
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (groups) {
        setSuggestedGroups(groups);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
        .eq('is_read', false);

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
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

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

// Add notification badge component
const NotificationBadge = ({ count }: { count: number }) => (
  count > 0 ? (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
      {count > 9 ? '9+' : count}
    </span>
  ) : null
);

// Add activity card component
const ActivityCard = ({ activity }: { activity: Activity }) => (
  <motion.div
    variants={cardVariants}
    initial="hidden"
    animate="visible"
    whileHover="hover"
    className="bg-white/5 backdrop-blur-sm rounded-xl p-4 relative"
  >
    <div className="flex items-start gap-3">
      {activity.user?.avatar_url && (
        <img
          src={activity.user.avatar_url}
          alt={activity.user.name}
          className="w-10 h-10 rounded-full"
        />
      )}
      <div className="flex-1">
        <h3 className="font-medium text-sm">{activity.title}</h3>
        <p className="text-sm text-gray-400">{activity.description}</p>
        <span className="text-xs text-gray-500">
          {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
        </span>
      </div>
    </div>
    {activity.link && (
      <Link
        href={activity.link}
        className="absolute inset-0 rounded-xl hover:bg-white/5 transition-colors"
      />
    )}
  </motion.div>
);