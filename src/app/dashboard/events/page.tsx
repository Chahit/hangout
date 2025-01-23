'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Calendar, Clock, MapPin, Plus, Users, X, Sparkles, PartyPopper, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/shared/Modal';

type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  created_by: string;
  group_id: string | null;
  is_public: boolean;
  max_participants: number | null;
  created_at: string;
  is_approved: boolean;
  group?: {
    name: string;
  };
  creator?: {
    id: string;
    name: string;
  };
  participants?: {
    status: string;
    user: {
      id: string;
      name: string;
    };
  }[];
};

// Add type definitions at the top of the file
type GroupMember = {
  group: {
    id: string;
    name: string;
  } | null;
};

// Add type definition at the top of the file
type GroupMemberResponse = {
  group_id: string;
  groups: {
    id: string;
    name: string;
  };
}

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

// Enhanced loading component with purple gradient shimmer
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px] relative">
    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-transparent animate-shimmer" />
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="relative"
    >
      <Loader2 className="w-12 h-12 text-purple-500" />
      <motion.div
        className="absolute inset-0 bg-purple-500/20 blur-xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </motion.div>
  </div>
);

export default function EventsPage() {
  const supabase = createClientComponentClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved');
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    is_public: true,
    max_participants: '',
    group_id: '',
  });
  const [userGroups, setUserGroups] = useState<{ id: string; name: string; }[]>([]);

  useEffect(() => {
    checkAdminStatus();
    fetchEvents();
    fetchUserGroups();
  }, [activeTab]);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === 'cl883@snu.edu.in') {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      let query = supabase
        .from('events')
        .select(`
          *,
          group:groups(name),
          creator:profiles!events_created_by_fkey(id, name),
          participants:event_participants(
            status,
            user:profiles!event_participants_user_id_fkey(id, name)
          )
        `)
        .order('start_time', { ascending: true });

      // If user is admin and viewing pending events
      if (isAdmin && activeTab === 'pending') {
        query = query.eq('is_approved', false);
      } else {
        // For regular users or admin viewing approved events
        query = query.eq('is_approved', true);
      }

      const { data: events, error } = await query;

      if (error) throw error;
      setEvents(events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGroups = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('group_members')
        .select('group_id, groups!inner(id, name)')
        .eq('user_id', session.user.id)
        .returns<GroupMemberResponse[]>();

      if (error) throw error;
      
      if (data) {
        const groups = data.map(item => ({
          id: item.groups.id,
          name: item.groups.name
        }));
        setUserGroups(groups);
      }
    } catch (error) {
      console.error('Error fetching user groups:', error);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase.from('events').insert({
        ...newEvent,
        created_by: session.user.id,
        max_participants: newEvent.max_participants ? parseInt(newEvent.max_participants) : null,
        group_id: newEvent.group_id || null,
        is_approved: session.user.email === 'cl883@snu.edu.in', // Auto-approve if admin
      });

      if (error) throw error;

      setShowCreateModal(false);
      setNewEvent({
        title: '',
        description: '',
        location: '',
        start_time: '',
        end_time: '',
        is_public: true,
        max_participants: '',
        group_id: '',
      });
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase.from('event_participants').insert({
        event_id: eventId,
        user_id: session.user.id,
        status: 'going',
      });

      if (error) throw error;
      fetchEvents();
    } catch (error) {
      console.error('Error joining event:', error);
    }
  };

  const handleApproveEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_approved: true })
        .eq('id', eventId);

      if (error) throw error;
      fetchEvents();
    } catch (error) {
      console.error('Error approving event:', error);
    }
  };

  const handleRemoveEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      fetchEvents();
    } catch (error) {
      console.error('Error removing event:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full relative font-cabinet-grotesk">
        <FloatingShapes />
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <LoadingSpinner />
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
              Campus Events ✨
            </h1>
            <p className="text-sm md:text-base text-gray-400 mt-1">
              {isAdmin ? 'Manage and approve campus events' : 'Discover exciting events happening around campus'}
            </p>
          </div>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all text-sm md:text-base flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </motion.button>
        </div>

        {/* Admin Tabs */}
        {isAdmin && (
          <div className="flex gap-2">
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setActiveTab('approved')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'approved'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Approved Events
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'pending'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Pending Approval
            </motion.button>
          </div>
        )}

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.1 }}
              className="glass-morphism rounded-xl overflow-hidden"
            >
              <div className="p-4 md:p-5 space-y-3 md:space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-base md:text-lg truncate">
                      {event.title}
                    </h3>
                    {event.group && (
                      <p className="text-xs text-purple-400 mt-0.5">
                        Hosted by {event.group.name}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                      {event.is_public ? 'Public' : 'Private'}
                    </span>
                    {event.max_participants && (
                      <span className="text-xs text-gray-400">
                        {event.participants?.length || 0}/{event.max_participants} spots
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-400 line-clamp-2">
                  {event.description}
                </p>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(event.start_time), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>
                      {format(new Date(event.start_time), 'h:mm a')} - {format(new Date(event.end_time), 'h:mm a')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>
              </div>

              {/* Event Actions */}
              <div className="p-4 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">
                    {event.participants?.length || 0} going
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && activeTab === 'pending' ? (
                    <>
                      <motion.button
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => handleApproveEvent(event.id)}
                        className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Approve
                      </motion.button>
                      <motion.button
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => handleRemoveEvent(event.id)}
                        className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Remove
                      </motion.button>
                    </>
                  ) : isAdmin ? (
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => handleRemoveEvent(event.id)}
                      className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Remove
                    </motion.button>
                  ) : (
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => handleJoinEvent(event.id)}
                      disabled={event.participants?.some(p => p.user.id === event.creator?.id)}
                      className="px-4 py-1.5 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Join Event
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {events.length === 0 && (
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
              <PartyPopper className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-lg md:text-xl font-medium mb-2">
              {isAdmin && activeTab === 'pending'
                ? 'No Events Pending Approval'
                : 'No Events Yet'}
            </h3>
            <p className="text-gray-400 text-sm md:text-base">
              {isAdmin && activeTab === 'pending'
                ? 'All events have been reviewed'
                : isAdmin
                ? 'Create an event or wait for submissions'
                : 'Check back later for upcoming events!'}
            </p>
          </motion.div>
        )}

        {/* Create Event Modal */}
        {showCreateModal && (
          <Modal onClose={() => setShowCreateModal(false)} maxWidth="max-w-md">
            <div className="bg-gray-900 p-4 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-clash-display font-bold">
                  Create Event
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Give your event a title..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px] resize-none"
                    placeholder="Describe your event..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Where is the event?"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                      className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                      className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Group (Optional)</label>
                    <select
                      value={newEvent.group_id}
                      onChange={(e) => setNewEvent({ ...newEvent, group_id: e.target.value })}
                      className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">No group</option>
                      {userGroups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Participants</label>
                    <input
                      type="number"
                      value={newEvent.max_participants}
                      onChange={(e) => setNewEvent({ ...newEvent, max_participants: e.target.value })}
                      className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Optional"
                      min="1"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEvent.is_public}
                    onChange={(e) => setNewEvent({ ...newEvent, is_public: e.target.checked })}
                    className="rounded border-gray-600 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-400">Make this event public</span>
                </label>

                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  type="submit"
                  className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAdmin ? 'Create Event' : 'Submit for Approval'}
                </motion.button>
              </form>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
} 