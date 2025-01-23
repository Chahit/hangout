'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { MessageSquare, Heart, Share2, Image, Video, Plus, X, Trash2, ArrowUpDown, Clock, Sparkles, Send } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/shared/Modal';

interface ConfessionLike {
  id: string;
  confession_id: string;
  user_id: string;
  created_at: string;
}

interface Confession {
  id: string;
  content: string;
  anonymous_name: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  likes: number;
  created_at: string;
  comments: Comment[];
  has_liked?: boolean;
  user_id: string;
  likes_data?: ConfessionLike[];
}

interface Comment {
  id: string;
  content: string;
  anonymous_name: string;
  created_at: string;
}

const ANONYMOUS_NAMES = [
  'Mysterious Owl', 'Silent Fox', 'Hidden Dragon', 'Secret Panda', 'Shadow Cat',
  'Invisible Ninja', 'Unknown Sage', 'Masked Phoenix', 'Cryptic Wolf', 'Stealth Eagle'
];

// Add type for sorting options
type SortOption = 'newest' | 'oldest' | 'mostLiked';

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

export default function ConfessionsPage() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [newConfession, setNewConfession] = useState('');
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchConfessions();
    getCurrentUser();
  }, []);

  const fetchConfessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: confessions, error } = await supabase
        .from('confessions')
        .select(`
          *,
          comments:confession_comments(*),
          likes:confession_likes(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include like count and has_liked status
      const transformedConfessions = confessions.map(confession => ({
        ...confession,
        likes: confession.likes?.length || 0,
        has_liked: confession.likes?.some((like: ConfessionLike) => like.user_id === user.id) || false
      }));

      setConfessions(transformedConfessions);
    } catch (error) {
      console.error('Error fetching confessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type.startsWith('image/') ? 'image' : 'video';
    setMediaType(fileType);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let mediaUrl = '';
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${mediaType}s/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('confessions')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('confessions')
          .getPublicUrl(filePath);

        mediaUrl = publicUrl;
      }

      const anonymousName = ANONYMOUS_NAMES[Math.floor(Math.random() * ANONYMOUS_NAMES.length)];

      const { error } = await supabase.from('confessions').insert({
        content: newConfession,
        anonymous_name: anonymousName,
        user_id: user.id,
        media_url: mediaUrl || null,
        media_type: mediaType || null
      });

      if (error) throw error;

      setNewConfession('');
      setShowPostModal(false);
      setSelectedFile(null);
      setMediaPreview('');
      setMediaType(null);
      fetchConfessions();
    } catch (error) {
      console.error('Error creating confession:', error);
    }
  };

  const handleLike = async (confessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const confession = confessions.find(c => c.id === confessionId);
      if (!confession) return;

      if (confession.has_liked) {
        await supabase
          .from('confession_likes')
          .delete()
          .eq('confession_id', confessionId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('confession_likes').insert({
          confession_id: confessionId,
          user_id: user.id
        });
      }

      fetchConfessions();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleComment = async (confessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const anonymousName = ANONYMOUS_NAMES[Math.floor(Math.random() * ANONYMOUS_NAMES.length)];

      const { error } = await supabase.from('confession_comments').insert({
        confession_id: confessionId,
        content: newComment,
        anonymous_name: anonymousName,
        user_id: user.id
      });

      if (error) throw error;

      setNewComment('');
      setCommenting(null);
      fetchConfessions();
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleDelete = async (confessionId: string) => {
    try {
      console.log('Starting delete process for confession:', confessionId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return;
      }
      console.log('Current user:', user.id);

      const confession = confessions.find(c => c.id === confessionId);
      if (!confession) {
        console.log('Confession not found:', confessionId);
        return;
      }
      if (confession.user_id !== user.id) {
        console.log('User does not own this confession');
        return;
      }
      console.log('Confession found:', confession);

      // Delete media from storage if exists
      if (confession.media_url) {
        console.log('Deleting media file...');
        const mediaPath = confession.media_url.split('/').pop();
        if (mediaPath) {
          const { error: storageError } = await supabase.storage
            .from('confessions')
            .remove([`${confession.media_type}s/${mediaPath}`]);
          
          if (storageError) {
            console.error('Error deleting media:', storageError);
          } else {
            console.log('Media deleted successfully');
          }
        }
      }

      // Delete confession (cascade will handle comments and likes)
      console.log('Deleting confession from database...');
      const { error } = await supabase
        .from('confessions')
        .delete()
        .eq('id', confessionId);

      if (error) {
        console.error('Error deleting confession:', error);
        throw error;
      }

      console.log('Confession deleted successfully');
      // Update local state immediately and don't fetch again
      setConfessions(prevConfessions => prevConfessions.filter(c => c.id !== confessionId));
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error in handleDelete:', error);
    }
  };

  // Add sorting function
  const sortConfessions = (confessions: Confession[]) => {
    switch (sortBy) {
      case 'oldest':
        return [...confessions].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case 'mostLiked':
        return [...confessions].sort((a, b) => 
          Object.keys(b.likes || {}).length - Object.keys(a.likes || {}).length
        );
      case 'newest':
      default:
        return [...confessions].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-gray-800 rounded"></div>
          <div className="h-40 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative font-cabinet-grotesk">
      <FloatingShapes />
      
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 md:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-clash-display font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
              Campus Confessions ✨
            </h1>
            <p className="text-sm md:text-base text-gray-400 mt-1">
              Share your thoughts anonymously with the community
            </p>
          </div>
          
          <div className="flex w-full sm:w-auto gap-3">
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setShowPostModal(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all text-sm md:text-base flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Share Confession
            </motion.button>
            
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setSortBy(sortBy === 'newest' ? 'mostLiked' : 'newest')}
              className="flex-1 sm:flex-none px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-sm md:text-base flex items-center justify-center gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortBy === 'newest' ? 'Most Liked' : 'Newest'}
            </motion.button>
          </div>
        </div>

        {/* Confessions List */}
        <div className="space-y-4 md:space-y-6">
          {confessions.map((confession) => (
            <motion.div
              key={confession.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="glass-morphism p-4 md:p-6 rounded-xl space-y-4"
            >
              {/* Confession Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-medium">
                      {confession.anonymous_name[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm md:text-base">
                      {confession.anonymous_name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {format(new Date(confession.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
                
                {confession.user_id === currentUser?.id && (
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => setDeleteConfirmation(confession.id)}
                    className="text-red-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                )}
              </div>

              {/* Confession Content */}
              <p className="text-sm md:text-base leading-relaxed">
                {confession.content}
              </p>

              {/* Media Content */}
              {confession.media_url && (
                <div className="rounded-lg overflow-hidden bg-white/5">
                  {confession.media_type === 'image' ? (
                    <img
                      src={confession.media_url}
                      alt="Confession media"
                      className="w-full h-auto max-h-96 object-cover"
                    />
                  ) : (
                    <video
                      src={confession.media_url}
                      controls
                      className="w-full h-auto max-h-96"
                    />
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-2">
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => handleLike(confession.id)}
                  className={`flex items-center gap-2 text-sm transition-colors ${
                    confession.has_liked
                      ? 'text-pink-500'
                      : 'text-gray-400 hover:text-pink-500'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${confession.has_liked ? 'fill-current' : ''}`} />
                  {confession.likes}
                </motion.button>

                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setCommenting(commenting === confession.id ? null : confession.id)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-purple-500 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  {confession.comments?.length || 0}
                </motion.button>

                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </motion.button>
              </div>

              {/* Comments Section */}
              {commenting === confession.id && (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  {confession.comments?.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {comment.anonymous_name[0]}
                        </span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">
                            {comment.anonymous_name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Comment Input */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-xs font-medium text-white">A</span>
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 bg-white/5 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <motion.button
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => handleComment(confession.id)}
                        disabled={!newComment.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Post Modal */}
        {showPostModal && (
          <Modal onClose={() => setShowPostModal(false)} maxWidth="max-w-lg">
            <div className="bg-gray-900 p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl md:text-2xl font-clash-display font-bold">
                  Share a Confession
                </h2>
                <button
                  onClick={() => setShowPostModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <textarea
                  value={newConfession}
                  onChange={(e) => setNewConfession(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full h-32 bg-white/5 rounded-xl p-4 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />

                {mediaPreview && (
                  <div className="relative">
                    {mediaType === 'image' ? (
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-xl"
                      />
                    ) : (
                      <video
                        src={mediaPreview}
                        className="w-full h-48 object-cover rounded-xl"
                        controls
                      />
                    )}
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setMediaPreview('');
                        setMediaType(null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all cursor-pointer text-sm">
                      <Image className="w-4 h-4" />
                      Add Media
                    </div>
                  </label>

                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handlePost}
                    disabled={!newConfession.trim()}
                    className="flex-[2] px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Share Anonymously
                  </motion.button>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmation && (
          <Modal onClose={() => setDeleteConfirmation(null)} maxWidth="max-w-md">
            <div className="bg-gray-900 p-6 rounded-2xl">
              <h2 className="text-xl font-clash-display font-bold mb-4">
                Delete Confession?
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                This action cannot be undone. Are you sure you want to delete this confession?
              </p>
              <div className="flex gap-3">
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-sm"
                >
                  Cancel
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => {
                    handleDelete(deleteConfirmation);
                    setDeleteConfirmation(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:opacity-90 transition-all text-sm"
                >
                  Delete
                </motion.button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
} 