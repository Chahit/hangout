'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { MessageSquare, User as UserIcon, Clock, Star } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  message_type: 'text' | 'dating' | 'group' | 'event';
  sender?: {
    id: string;
    name: string;
  };
  receiver?: {
    id: string;
    name: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  last_message?: {
    content: string;
    created_at: string;
    is_sender: boolean;
    is_read: boolean;
    message_type: 'text' | 'dating' | 'group' | 'event';
  };
  unread_count?: number;
  is_favorite?: boolean;
  connection_type?: 'dating' | 'group' | 'regular';
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
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorites'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'unread'>('recent');

  const fetchMessages = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch direct messages
      const { data: messages, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:profiles!direct_messages_sender_id_fkey(
            id,
            name
          ),
          receiver:profiles!direct_messages_receiver_id_fkey(
            id,
            name
          )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique users from messages
      const uniqueUsers = new Map<string, User>();
      messages.forEach((message: Message) => {
        const otherUser = message.sender_id === user.id ? message.receiver : message.sender;
        if (otherUser && !uniqueUsers.has(otherUser.id)) {
          uniqueUsers.set(otherUser.id, {
            id: otherUser.id,
            name: otherUser.name,
            email: '', // Will be populated later if needed
            last_message: {
              content: message.content,
              created_at: message.created_at,
              is_sender: message.sender_id === otherUser.id,
              is_read: message.is_read,
              message_type: message.message_type
            },
            connection_type: message.message_type === 'dating' ? 'dating' : 'regular'
          });
        }
      });

      // Fetch dating connections
      const { data: datingConnections, error: datingError } = await supabase
        .from('dating_connections')
        .select(`
          *,
          from_user:profiles!dating_connections_from_user_id_fkey(
            id,
            name
          ),
          to_user:profiles!dating_connections_to_user_id_fkey(
            id,
            name
          )
        `)
        .eq('status', 'accepted')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      if (datingError) throw datingError;

      // Add dating connections to users list if they don't have any messages yet
      datingConnections?.forEach(conn => {
        const otherUser = conn.from_user_id === user.id ? conn.to_user : conn.from_user;
        if (otherUser && !uniqueUsers.has(otherUser.id)) {
          uniqueUsers.set(otherUser.id, {
            id: otherUser.id,
            name: otherUser.name,
            email: '', // Will be populated later if needed
            connection_type: 'dating'
          });
        }
      });

      setUsers(Array.from(uniqueUsers.values()));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [supabase]);

  const setupRealtimeSubscription = useCallback((userId: string) => {
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${userId}`
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchMessages]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { id, email } = session.user;
        setCurrentUser({ id, email });
        fetchMessages();
        setupRealtimeSubscription(id);
      }
    };

    fetchCurrentUser();
  }, [supabase, fetchMessages, setupRealtimeSubscription]);

  const toggleFavorite = useCallback(async (userId: string) => {
    try {
      if (!currentUser) return;
      
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

      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, is_favorite: !isFavorite }
            : user
        )
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [currentUser, users, supabase]);

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      switch (filter) {
        case 'unread':
          return (user.unread_count || 0) > 0;
        case 'favorites':
          return user.is_favorite;
        default:
          return true;
      }
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

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'favorites')}
            className="px-4 py-2 bg-black border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50 text-gray-300"
          >
            <option value="all">All Messages</option>
            <option value="unread">Unread</option>
            <option value="favorites">Favorites</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'unread')}
            className="px-4 py-2 bg-black border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50 text-gray-300"
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
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                          {user.name[0].toUpperCase()}
                        </div>
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
                          {user.unread_count ? (
                            <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {user.unread_count ?? 0}
                            </span>
                          ) : null}
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