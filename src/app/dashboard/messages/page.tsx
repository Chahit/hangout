'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Search, MessageSquare, User, Clock, Sparkles, Star, Filter, ArrowUp, Circle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  online_status?: boolean;
  last_seen?: string;
  last_message?: {
    content: string;
    created_at: string;
    is_sender: boolean;
    is_read: boolean;
  };
  unread_count?: number;
  is_favorite?: boolean;
}

interface ChatStats {
  totalMessages: number;
  lastActive: string;
  averageResponseTime: number;
}

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  hover: { scale: 1.02, borderColor: 'rgb(168, 85, 247)' },
  tap: { scale: 0.98 }
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

export default function MessagesPage() {
  const supabase = createClientComponentClient();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chatStats, setChatStats] = useState<{[key: string]: ChatStats}>({});
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorites'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'unread'>('recent');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        fetchUsers(session.user.id);
        setupRealtimeSubscription(session.user.id);
      }
    };

    fetchCurrentUser();
  }, []);

  const setupRealtimeSubscription = (userId: string) => {
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${userId}`
      }, () => {
        fetchUsers(userId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchUsers = async (currentUserId: string) => {
    try {
      // Fetch all users except current user
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, online_status, last_seen')
        .neq('id', currentUserId);

      if (error) throw error;

      // Fetch messages and stats for each user
      const usersWithData = await Promise.all(
        profiles.map(async (profile) => {
          // Fetch last message
          const { data: messages, error: messagesError } = await supabase
            .from('direct_messages')
            .select('content, created_at, sender_id, is_read')
            .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
            .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
            .order('created_at', { ascending: false })
            .limit(1);

          // Fetch unread count
          const { count: unreadCount } = await supabase
            .from('direct_messages')
            .select('*', { count: 'exact' })
            .eq('receiver_id', currentUserId)
            .eq('sender_id', profile.id)
            .eq('is_read', false);

          // Fetch favorite status
          const { data: favorite } = await supabase
            .from('favorite_contacts')
            .select('*')
            .eq('user_id', currentUserId)
            .eq('contact_id', profile.id)
            .single();

          // Calculate chat stats
          const { data: allMessages } = await supabase
            .from('direct_messages')
            .select('created_at, sender_id')
            .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
            .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`);

          const stats = calculateChatStats(allMessages || []);

          return {
            ...profile,
            last_message: messages?.[0] ? {
              content: messages[0].content,
              created_at: messages[0].created_at,
              is_sender: messages[0].sender_id === currentUserId,
              is_read: messages[0].is_read
            } : undefined,
            unread_count: unreadCount || 0,
            is_favorite: !!favorite,
            chat_stats: stats
          };
        })
      );

      setUsers(usersWithData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateChatStats = (messages: any[]): ChatStats => {
    if (!messages.length) {
      return {
        totalMessages: 0,
        lastActive: '',
        averageResponseTime: 0
      };
    }

    const lastActive = messages[0].created_at;
    const totalMessages = messages.length;

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;
    
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].sender_id !== messages[i-1].sender_id) {
        const responseTime = new Date(messages[i-1].created_at).getTime() - 
                           new Date(messages[i].created_at).getTime();
        totalResponseTime += responseTime;
        responseCount++;
      }
    }

    const averageResponseTime = responseCount ? totalResponseTime / responseCount / 1000 : 0;

    return {
      totalMessages,
      lastActive,
      averageResponseTime
    };
  };

  const toggleFavorite = async (userId: string) => {
    try {
      const isFavorite = users.find(u => u.id === userId)?.is_favorite;

      if (isFavorite) {
        await supabase
          .from('favorite_contacts')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('contact_id', userId);
      } else {
        await supabase
          .from('favorite_contacts')
          .insert({
            user_id: currentUser.id,
            contact_id: userId
          });
      }

      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_favorite: !isFavorite }
          : user
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = 
        filter === 'all' ? true :
        filter === 'unread' ? (user.unread_count || 0) > 0 :
        filter === 'favorites' ? user.is_favorite : true;

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.last_message?.created_at || 0).getTime() - 
                 new Date(a.last_message?.created_at || 0).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'unread':
          return (b.unread_count || 0) - (a.unread_count || 0);
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="min-h-screen w-full relative font-cabinet-grotesk">
        <FloatingShapes />
        <div className="p-6 max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/5 rounded w-1/3"></div>
            <div className="h-12 bg-white/5 rounded"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-white/5 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative font-cabinet-grotesk">
      <FloatingShapes />
      
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
              Messages
            </h1>
            <p className="text-gray-400 mt-1">
              Connect and chat with your college community
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'favorites')}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50"
          >
            <option value="all">All Messages</option>
            <option value="unread">Unread</option>
            <option value="favorites">Favorites</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'unread')}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50"
          >
            <option value="recent">Most Recent</option>
            <option value="name">Name</option>
            <option value="unread">Unread First</option>
          </select>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredUsers.map((user) => (
              <motion.div
                key={user.id}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                layout
              >
                <Link href={`/dashboard/messages/${user.id}`}>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 hover:border-purple-500/30 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Avatar/Status */}
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            user.name[0].toUpperCase()
                          )}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${
                          user.online_status ? 'bg-green-500' : 'bg-gray-500'
                        }`} />
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium flex items-center gap-2">
                              {user.name}
                              {user.is_favorite && (
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              )}
                            </h3>
                            <p className="text-sm text-gray-400">{user.email}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              toggleFavorite(user.id);
                            }}
                            className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <Star 
                              className={`w-4 h-4 ${
                                user.is_favorite 
                                  ? 'text-yellow-400 fill-yellow-400' 
                                  : 'text-gray-400'
                              }`} 
                            />
                          </button>
                        </div>

                        {/* Last Message */}
                        {user.last_message && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-400 flex items-center gap-2">
                              {user.last_message.is_sender && "You: "}
                              {user.last_message.content}
                              {!user.last_message.is_sender && !user.last_message.is_read && (
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                              )}
                            </p>
                          </div>
                        )}

                        {/* Message Stats */}
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {user.last_message
                                ? format(new Date(user.last_message.created_at), 'MMM d, h:mm a')
                                : 'No messages yet'}
                            </span>
                          </div>
                          {user.unread_count > 0 && (
                            <div className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                              {user.unread_count} unread
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">No messages found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 