'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams } from 'next/navigation';
import { Send, Smile, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Database } from '@/lib/database.types';

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
  const [otherUser, setOtherUser] = useState<{ name: string; email: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const setupMessaging = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Anonymous',
          email: session.user.email || ''
        });
        await Promise.all([
          fetchOtherUser(),
          fetchMessages()
        ]);
      }
    };
    
    setupMessaging();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!currentUser?.id) return;

    const { data } = await supabase
      .from('direct_messages')
      .select(`
        id,
        content,
        created_at,
        sender_id,
        receiver_id
      `)
      .or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`)
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser?.id) return;

    const message = {
      content: newMessage,
      sender_id: currentUser.id,
      receiver_id: otherUserId,
    };

    const { error } = await supabase
      .from('direct_messages')
      .insert([message]);

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    setNewMessage('');
    await fetchMessages();
  };

  if (!currentUser) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-white/10">
        <Link href="/dashboard/messages" className="mr-4">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h2 className="font-medium">{otherUser?.name}</h2>
          <p className="text-sm text-gray-400">{otherUser?.email}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-xl ${
                message.sender_id === currentUser.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-white'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <Smile className="w-6 h-6" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/5 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="p-2 bg-purple-500 rounded-full hover:bg-purple-600 transition-colors"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </form>
    </div>
  );
} 