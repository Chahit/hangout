'use client';

import { useEffect, useRef, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams, useRouter } from 'next/navigation';
import { Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Ably from 'ably';

type Message = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  group_id: string;
  user: {
    name: string;
    email?: string;  // Make email optional
  };
};

type GroupInfo = {
  id: string;
  name: string;
  description: string;
  members: {
    user_id: string;
    role: string;
    user: {
      name: string;
      email?: string;  // Make email optional
    };
  }[];
};

export default function GroupChatPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ablyChannel, setAblyChannel] = useState<any>(null);

  useEffect(() => {
    // Initialize Ably
    const ably = new Ably.Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY!);
    const channel = ably.channels.get(`group-${params.id}`);
    
    // Subscribe to new messages
    channel.subscribe('new-message', (message) => {
      const newMsg = message.data as Message;
      setMessages(prev => {
        const exists = prev.some(msg => msg.id === newMsg.id);
        if (!exists) {
          return [...prev, newMsg];
        }
        return prev;
      });
    });

    setAblyChannel(channel);

    // Cleanup
    return () => {
      channel.unsubscribe();
      ably.close();
    };
  }, [params.id]);

  useEffect(() => {
    fetchUser();
    fetchGroupInfo();
    fetchMessages();
  }, [params.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    
    // Set up realtime subscription
    const channel = supabase
      .channel(`group_${params.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `group_id=eq.${params.id}`
      }, (payload) => {
        // Handle message updates
        console.log('Received message:', payload);
        fetchMessages();
      })
      .subscribe();

    // Cleanup subscription on unmount or hot reload
    return () => {
      channel.unsubscribe().catch(console.error);
    };
  }, [params.id, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUserForMessage = async (message: Message) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', message.user_id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return message;
    }

    return {
      ...message,
      user: profile
    };
  };

  const fetchUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
    } else {
      router.push('/auth');
    }
  };

  const fetchGroupInfo = async () => {
    try {
      const { data: group, error } = await supabase
        .from('groups')
        .select(`
          *,
          members:group_members (
            user_id,
            role,
            profiles:user_id (
              name
            )
          )
        `)
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setGroupInfo(group);
    } catch (error) {
      console.error('Error fetching group info:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:user_id (
            name
          )
        `)
        .eq('group_id', params.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(messages.map(msg => ({
        ...msg,
        user: msg.profiles
      })));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
  
    try {
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          group_id: params.id,
          user_id: user.id
        })
        .select(`
          *,
          profiles:user_id (
            name
          )
        `)
        .single();
  
      if (error) throw error;
  
      // Then publish to Ably
      if (message && ablyChannel) {
        const messageWithUser = {
          ...message,
          user: message.profiles
        };
        await ablyChannel.publish('new-message', messageWithUser);
      }
  
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-white/10">
        <Link href="/dashboard/groups" className="mr-4">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="w-6 h-6 text-gray-400 hover:text-white transition-colors" />
          </motion.div>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white">{groupInfo?.name}</h1>
          <p className="text-sm text-gray-400">
            {groupInfo?.members?.length || 0} members
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-[70%] rounded-lg p-3 ${
                message.user_id === user?.id 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              <div className="text-sm font-medium mb-1 flex items-center gap-2">
                <span>{message.user?.name || message.user?.email?.split('@')[0] || 'Unknown User'}</span>
                <span className="text-xs opacity-50">
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <p>{message.content}</p>
            </motion.div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-purple-600 text-white rounded-lg p-2 hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </form>
    </div>
  );
} 