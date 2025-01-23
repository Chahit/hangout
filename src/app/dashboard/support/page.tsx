'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { MessageCircle, Plus, Tag, ThumbsUp, User, Search, X, Sparkles, ArrowRight, Clock, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/shared/Modal';

interface SupportPost {
  id: string;
  title: string;
  content: string;
  category: string;
  created_by: string;
  created_at: string;
  is_anonymous: boolean;
  profiles?: {
    name: string;
  };
  support_responses: SupportResponse[];
}

interface SupportResponse {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
  is_anonymous: boolean;
  profiles?: {
    name: string;
  };
}

const CATEGORIES = [
  'Academic',
  'Mental Health',
  'Career',
  'Personal',
  'Technical',
  'Other'
];

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  hover: { scale: 1.02, borderColor: 'rgb(168, 85, 247)' },
  tap: { scale: 0.98 }
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

export default function SupportPage() {
  const supabase = createClientComponentClient();
  const [posts, setPosts] = useState<SupportPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByNewest, setSortByNewest] = useState(true);
  const [showCommentModal, setShowCommentModal] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isAnonymousComment, setIsAnonymousComment] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: '',
    is_anonymous: false
  });

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, sortByNewest]);

  const fetchPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('support_posts')
        .select(`
          *,
          profiles!support_posts_created_by_fkey (
            id,
            name
          ),
          support_responses (
            *,
            profiles!support_responses_created_by_fkey (
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: !sortByNewest });

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      const { data: posts, error } = await query;

      if (error) throw error;

      setPosts(posts || []);
    } catch (error) {
      console.error('Error fetching support posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('support_posts')
        .insert([
          {
            title: newPost.title,
            content: newPost.content,
            created_by: user.id,
            is_anonymous: newPost.is_anonymous,
            category: newPost.category
          }
        ]);

      if (error) throw error;

      setShowCreateModal(false);
      setNewPost({
        title: '',
        content: '',
        category: '',
        is_anonymous: false
      });
      fetchPosts();
    } catch (error) {
      console.error('Error creating support post:', error);
    }
  };

  const handleCreateComment = async (postId: string) => {
    if (!newComment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('support_responses')
        .insert([
          {
            content: newComment,
            post_id: postId,
            created_by: user.id,
            is_anonymous: isAnonymousComment
          }
        ]);

      if (error) throw error;

      setShowCommentModal(null);
      setNewComment('');
      setIsAnonymousComment(false);
      fetchPosts();
    } catch (error) {
      console.error('Error creating comment:', error);
    }
  };

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen w-full relative font-cabinet-grotesk">
        <FloatingShapes />
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4 md:space-y-6">
            <div className="h-12 bg-white/5 rounded-xl w-1/3" />
            <div className="space-y-3 md:space-y-4">
              <div className="h-48 bg-white/5 rounded-xl" />
              <div className="h-48 bg-white/5 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative font-cabinet-grotesk">
      <FloatingShapes />
      
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 md:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-clash-display font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
              Peer Support ✨
            </h1>
            <p className="text-sm md:text-base text-gray-400 mt-1">
              Connect, share, and support each other through challenges
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setSortByNewest(!sortByNewest)}
              className="px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              {sortByNewest ? 'Newest First' : 'Oldest First'}
            </button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:opacity-90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ask for Help
            </motion.button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3 md:space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search support posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 rounded-xl pl-11 pr-4 py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm transition-colors ${
                selectedCategory === '' ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              All
            </motion.button>
            {CATEGORIES.map(category => (
              <motion.button
                key={category}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm transition-colors ${
                  selectedCategory === category ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {category}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredPosts.map((post) => (
            <motion.div
              key={post.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              whileTap="tap"
              className="bg-white/5 rounded-xl p-4 md:p-6 border border-transparent hover:border-purple-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-base md:text-lg truncate">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                      {post.category}
                    </span>
                    {post.is_anonymous && (
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                        Anonymous
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end text-xs text-gray-400">
                  <span>{format(new Date(post.created_at), 'MMM d, yyyy')}</span>
                  <span>{format(new Date(post.created_at), 'h:mm a')}</span>
                </div>
              </div>

              <p className="text-sm md:text-base text-gray-400 mt-3">
                {post.content}
              </p>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">
                    {post.is_anonymous ? 'Anonymous' : post.profiles?.name}
                  </span>
                </div>
                <button
                  onClick={() => setShowCommentModal(post.id)}
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">
                    {post.support_responses.length} Responses
                  </span>
                </button>
              </div>

              {/* Comments Section */}
              {post.support_responses.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Responses</h4>
                  <div className="space-y-3">
                    {post.support_responses.map((response) => (
                      <div
                        key={response.id}
                        className="bg-white/5 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-300">
                            {response.is_anonymous ? 'Anonymous' : response.profiles?.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {format(new Date(response.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{response.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPosts.length === 0 && (
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
              <MessageCircle className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-lg md:text-xl font-medium mb-2">No Support Posts Found</h3>
            <p className="text-gray-400 text-sm md:text-base">
              {searchQuery ? 'Try adjusting your search or filters' : 'Be the first to ask for help!'}
            </p>
          </motion.div>
        )}

        {/* Create Post Modal */}
        {showCreateModal && (
          <Modal onClose={() => setShowCreateModal(false)} maxWidth="max-w-lg">
            <div className="bg-gray-900 p-4 md:p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl md:text-2xl font-clash-display font-bold">
                  Ask for Help
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="What do you need help with?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px] resize-none"
                    placeholder="Describe your situation..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={newPost.category}
                    onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPost.is_anonymous}
                    onChange={(e) => setNewPost({ ...newPost, is_anonymous: e.target.checked })}
                    className="rounded border-gray-600 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-400">Post anonymously</span>
                </label>

                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all text-sm md:text-base flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Create Post
                </motion.button>
              </form>
            </div>
          </Modal>
        )}

        {/* Add Comment Modal */}
        {showCommentModal && (
          <Modal onClose={() => setShowCommentModal(null)} maxWidth="max-w-lg">
            <div className="bg-gray-900 p-6 rounded-2xl">
              <h3 className="text-lg font-medium mb-4">Add a Response</h3>
              <div className="space-y-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write your response..."
                  className="w-full h-32 bg-white/5 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="anonymous-comment"
                    checked={isAnonymousComment}
                    onChange={(e) => setIsAnonymousComment(e.target.checked)}
                    className="rounded border-gray-600"
                  />
                  <label htmlFor="anonymous-comment" className="text-sm text-gray-300">
                    Post anonymously
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCommentModal(null)}
                    className="flex-1 px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCreateComment(showCommentModal)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                    disabled={!newComment.trim()}
                  >
                    Post Response
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
} 