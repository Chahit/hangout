'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useChannel } from '@ably-labs/react-hooks';
import * as Ably from 'ably';
import { useParams } from 'next/navigation';
import { EmojiPicker } from '@/components/emoji-picker';
import { VoiceRecorder } from '@/components/voice-recorder';
import { Send, Smile, ArrowLeft, MessageCircle, Mic, MoreVertical, Image } from 'lucide-react';
import Link from 'next/link';
import type { Database } from '@/lib/database.types';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export default function DirectMessagePage() {
  const params = useParams();
  const otherUserId = params.userId as string;
  const supabase = createClientComponentClient<Database>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<{ name: string; email: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ably, setAbly] = useState<Ably.Realtime | null>(null);
  const [channel, setChannel] = useState<Ably.RealtimeChannel | null>(null);

  useEffect(() => {
    const setupAbly = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('No user session found');
          return;
        }

        // Create user profile object
        const userProfile: UserProfile = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous',
          email: user.email || ''
        };
        setCurrentUser(userProfile);

        // Initialize Ably
        const ablyClient = new Ably.Realtime({
          key: process.env.NEXT_PUBLIC_ABLY_API_KEY || '',
          clientId: user.id
        });

        setAbly(ablyClient);

        // Create a unique channel name for the two users
        const channelName = [user.id, otherUserId].sort().join('-');
        const channelInstance = ablyClient.channels.get(`dm-${channelName}`);
        setChannel(channelInstance);

        // Subscribe to messages
        channelInstance.subscribe('new-message', (message: Ably.Message) => {
          if (message.data) {
            setMessages(prev => [...prev, message.data as Message]);
          }
        });

        // Subscribe to reactions
        channelInstance.subscribe('reaction', (message: Ably.Message) => {
          if (message.data) {
            const { messageId, reactions } = message.data as { messageId: string; reactions: Message['reactions'] };
            setMessages(prev => prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, reactions }
                : msg
            ));
          }
        });

        return () => {
          channelInstance.unsubscribe();
          ablyClient.close();
        };
      } catch (error) {
        console.error('Error setting up Ably:', error);
      }
    };

    setupAbly();
    fetchOtherUser();
    fetchMessages();
  }, [otherUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchOtherUser = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', otherUserId)
        .single();

      if (error) throw error;
      
      if (data) {
        const profile = data as Database['public']['Tables']['profiles']['Row'];
        setOtherUser({
          name: profile.name,
          email: profile.email
        });
      }
    } catch (error) {
      console.error('Error fetching other user:', error);
    }
  };

  const fetchMessages = async () => {
    type MessageWithProfile = {
      id: string;
      content: string;
      created_at: string;
      reactions: Record<string, any>;
      sender_id: string;
      profiles: Array<{
        name: string;
        email: string;
      }>;
    };

    const { data } = await supabase
      .from('direct_messages')
      .select(`
        id,
        content,
        created_at,
        reactions,
        sender_id,
        profiles!sender_id (
          name,
          email
        )
      `)
      .or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`)
      .or(`sender_id.eq.${currentUser?.id},receiver_id.eq.${currentUser?.id}`)
      .order('created_at', { ascending: true });

    if (data) {
      const formattedMessages = (data as MessageWithProfile[]).map(msg => ({
        id: msg.id,
        content: msg.content,
        timestamp: new Date(msg.created_at).getTime(),
        sender: {
          id: msg.sender_id,
          name: msg.profiles[0]?.name || msg.profiles[0]?.email?.split('@')[0] || 'Anonymous'
        },
        reactions: msg.reactions || {}
      }));
      setMessages(formattedMessages);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !channel || !currentUser) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', currentUser.id)
        .single();

      const message = {
        id: crypto.randomUUID(),
        content: newMessage,
        sender: {
          id: currentUser.id,
          name: profile?.name || currentUser.email?.split('@')[0] || 'Anonymous'
        },
        timestamp: Date.now(),
        reactions: {}
      };

      // Store message in Supabase
      const { error: dbError } = await supabase
        .from('direct_messages')
        .insert({
          id: message.id,
          content: message.content,
          sender_id: currentUser.id,
          receiver_id: otherUserId,
          reactions: message.reactions
        });

      if (dbError) throw dbError;

      // Publish to Ably
      await channel.publish('new-message', message);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!channel || !currentUser) return;

    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', currentUser.id)
        .single();

      const reactions = { ...message.reactions };
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }

      const userReactionIndex = reactions[emoji].findIndex(u => u.id === currentUser.id);
      if (userReactionIndex === -1) {
        reactions[emoji].push({
          id: currentUser.id,
          name: profile?.name || currentUser.email?.split('@')[0] || 'Anonymous'
        });
      } else {
        reactions[emoji].splice(userReactionIndex, 1);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      }

      // Update reactions in Supabase
      const { error: dbError } = await supabase
        .from('direct_messages')
        .update({ reactions })
        .eq('id', messageId);

      if (dbError) throw dbError;

      // Publish to Ably
      await channel.publish('reaction', { messageId, reactions });
      setShowEmojiPicker(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-800">
        <Link href="/dashboard/messages" className="mr-4">
          <ArrowLeft className="w-6 h-6 text-gray-400 hover:text-white transition-colors" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white">{otherUser?.name}</h1>
          <p className="text-sm text-gray-400">{otherUser?.email}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender.id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div className="relative group max-w-[70%]">
              <div className={`rounded-lg p-3 ${
                message.sender.id === currentUser?.id 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-100'
              }`}>
                <div className="text-sm font-medium mb-1 flex items-center gap-2">
                  <span>{message.sender.name}</span>
                  <span className="text-xs opacity-50">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>{message.content}</div>
                
                {/* Reactions */}
                {Object.entries(message.reactions).length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {Object.entries(message.reactions).map(([emoji, users]) => (
                      <div
                        key={emoji}
                        className="bg-black/20 rounded px-2 py-0.5 text-sm cursor-pointer"
                        title={users.map(u => u.name).join(', ')}
                      >
                        {emoji} {users.length}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reaction button */}
              <button
                onClick={() => {
                  setSelectedMessage(message.id);
                  setShowEmojiPicker(true);
                }}
                className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Smile className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-purple-600 text-white rounded-lg p-2 hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Emoji Picker */}
      {showEmojiPicker && selectedMessage && (
        <div className="absolute bottom-20 right-4">
          <EmojiPicker
            onEmojiSelect={(emoji: string) => addReaction(selectedMessage, emoji)}
            onClose={() => {
              setShowEmojiPicker(false);
              setSelectedMessage(null);
            }}
          />
        </div>
      )}
    </div>
  );
} 