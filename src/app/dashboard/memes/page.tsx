'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Heart, Send, Plus, X, Trash2, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchMemes();
    getCurrentUser();
  }, []);

  const fetchMemes = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
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
          has_liked: meme.likes?.some((like: { user_id: string }) => like.user_id === currentUser.id) || false,
          likes_count: meme.likes?.length || 0,
          comments: meme.comments?.map((comment: any) => ({
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
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

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
            <p className="text-sm md:text-base text-gray-400 mt-1">
              Share and enjoy the best college moments
            </p>
          </div>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => setShowPostModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all text-sm md:text-base flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Post Meme
          </motion.button>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 text-sm">
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'mostLiked')}
            className="bg-white/5 text-gray-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="newest">Newest First</option>
            <option value="mostLiked">Most Liked</option>
          </select>
        </div>

        {/* Memes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {sortedMemes.map((meme, index) => (
            <motion.div
              key={meme.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.1 }}
              className="glass-morphism rounded-xl overflow-hidden"
            >
              {/* Meme Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                    {meme.user_name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm md:text-base truncate">
                      {meme.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {format(new Date(meme.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Meme Image */}
              <div className="relative aspect-square bg-black/20">
                {meme.media_type === 'video' ? (
                  <video
                    src={meme.media_url}
                    className="w-full h-auto max-h-96 object-cover rounded-lg"
                    controls
                  />
                ) : (
                  <img
                    src={meme.media_url}
                    alt={meme.title}
                    className="w-full h-auto max-h-96 object-cover rounded-lg"
                  />
                )}
              </div>

              {/* Meme Actions */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      className="flex items-center gap-1.5 text-gray-400 hover:text-red-400"
                    >
                      <Heart className="w-5 h-5" />
                      <span className="text-sm">{meme.likes_count}</span>
                    </motion.button>
                  </div>
                  <span className="text-xs text-gray-400">
                    {format(new Date(meme.created_at), 'MMM d')}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {sortedMemes.length === 0 && (
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="text-center py-12"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block"
            >
              <img className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-lg md:text-xl font-medium mb-2">No Memes Yet</h3>
            <p className="text-gray-400 text-sm md:text-base">
              Be the first to share a meme with your campus!
            </p>
          </motion.div>
        )}

        {/* Post Modal */}
        {showPostModal && (
          <Modal onClose={() => setShowPostModal(false)} maxWidth="max-w-md">
            <div className="bg-gray-900 p-4 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-clash-display font-bold">
                  Post a Meme
                </h2>
                <button
                  onClick={() => setShowPostModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Give your meme a title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Image</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*, video/*"
                      className="hidden"
                      id="meme-upload"
                    />
                    <label
                      htmlFor="meme-upload"
                      className="block w-full h-[200px] rounded-lg border-2 border-dashed border-gray-600 hover:border-purple-500 transition-colors cursor-pointer"
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <img className="w-6 h-6 mb-1" />
                        <span className="text-sm">Click to upload an image or video</span>
                      </div>
                    </label>
                  </div>
                </div>

                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Post Meme
                </motion.button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}