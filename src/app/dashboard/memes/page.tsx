'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Heart, Send, Plus, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Modal from '@/components/shared/Modal';

interface Meme {
  id: string;
  title: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  user_id: string;
  has_liked: boolean;
  likes_count: number;
  comments: MemeComment[];
  user_name: string;
  likes?: Array<{ user_id: string }>;
  profiles?: { name: string };
}

interface MemeComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
  meme_id: string;
  profiles?: {
    name: string;
  };
}

interface MemeLike {
  id: string;
  meme_id: string;
  user_id: string;
  created_at: string;
}

interface MemeWithLikes {
  id: string;
  title: string;
  media_url: string;
  media_type: string;
  user_id: string;
  created_at: string;
  likes_count: number;
  user_name: string;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

// Add type for sorting options
type SortOption = 'newest' | 'mostLiked';

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

const buttonVariants = {
  hover: { scale: 1.02 },
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

export default function MemesPage() {
  const [memes, setMemes] = useState<MemeWithLikes[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'mostLiked'>('newest');
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const supabase = createClientComponentClient();

  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { id, email } = user;
      setCurrentUser({ id, email });
    }
  }, [supabase]);

  const fetchMemes = useCallback(async () => {
    try {
      if (!currentUser) return;

      const { data: memesData, error } = await supabase
        .from('memes')
        .select(`
          *,
          profiles:user_id(name),
          likes:meme_likes(user_id),
          comments:meme_comments(
            id,
            content,
            created_at,
            user_id,
            profiles:user_id(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (memesData) {
        const formattedMemes = memesData.map((meme: Meme) => ({
          ...meme,
          user_name: meme.profiles?.name || 'Anonymous',
          has_liked: meme.likes?.some(like => like.user_id === currentUser.id) || false,
          likes_count: meme.likes?.length || 0,
          comments: meme.comments?.map(comment => ({
            ...comment,
            user_name: comment.profiles?.name || 'Anonymous'
          })) || []
        }));

        setMemes(formattedMemes);
      }
    } catch (error) {
      console.error('Error fetching memes:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentUser]);

  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchMemes();
    }
  }, [currentUser, fetchMemes]);

  if (loading) {
    return (
      <div className="min-h-screen w-full relative font-cabinet-grotesk">
        <FloatingShapes />
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4 md:space-y-6">
            <div className="h-12 bg-white/5 rounded-xl w-1/3" />
            <div className="space-y-3 md:space-y-4">
              <div className="h-64 bg-white/5 rounded-xl" />
              <div className="h-64 bg-white/5 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sortedMemes = [...memes].sort((a, b) => {
    switch (sortBy) {
      case 'mostLiked':
        return (b.likes_count || 0) - (a.likes_count || 0);
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <div className="min-h-screen w-full relative font-cabinet-grotesk">
      <FloatingShapes />
      
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 md:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-clash-display font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
              Campus Memes ✨
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setSortBy(sortBy === 'newest' ? 'mostLiked' : 'newest')}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>{sortBy === 'newest' ? 'Latest' : 'Most Liked'}</span>
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setShowPostModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Meme</span>
            </motion.button>
          </div>
        </div>

        {/* Memes Grid */}
        <div className="grid grid-cols-1 gap-6">
          {sortedMemes.map((meme) => (
            <motion.div
              key={meme.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-colors"
            >
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="text-sm">
                      <span className="font-medium text-purple-400">{meme.user_name}</span>
                      <span className="text-gray-400 ml-2">
                        {format(new Date(meme.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-medium mb-4">{meme.title}</h3>
                {meme.media_type === 'image' ? (
                  <Image
                    src={meme.media_url}
                    alt={meme.title}
                    width={800}
                    height={600}
                    className="rounded-lg w-full"
                  />
                ) : (
                  <video
                    src={meme.media_url}
                    controls
                    className="rounded-lg w-full"
                  />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}