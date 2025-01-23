'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Plus, Users, Dumbbell, Code, Book, Music, Gamepad, Camera, Coffee, MessageSquare, X, Sparkles, Trash2, MessageCircle, Search, Clock } from 'lucide-react';
import { Database } from '../../../lib/database.types';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Modal from '@/components/shared/Modal';
import { format } from 'date-fns';

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

// Group icon mapping with animations
const GROUP_ICONS = {
  'gym': <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}><Dumbbell className="w-6 h-6" /></motion.div>,
  'code': <motion.div whileHover={{ scale: 1.2 }}><Code className="w-6 h-6" /></motion.div>,
  'study': <motion.div whileHover={{ y: -2 }}><Book className="w-6 h-6" /></motion.div>,
  'music': <motion.div whileHover={{ rotate: 15 }}><Music className="w-6 h-6" /></motion.div>,
  'gaming': <motion.div whileHover={{ scale: 1.1 }}><Gamepad className="w-6 h-6" /></motion.div>,
  'photography': <motion.div whileHover={{ rotate: -15 }}><Camera className="w-6 h-6" /></motion.div>,
  'social': <motion.div whileHover={{ y: -2 }}><Coffee className="w-6 h-6" /></motion.div>,
  'default': <motion.div whileHover={{ scale: 1.1 }}><MessageSquare className="w-6 h-6" /></motion.div>
} as const;

// Function to get icon based on group name
const getGroupIcon = (groupName: string) => {
  const lowercaseName = groupName.toLowerCase();
  for (const [keyword, icon] of Object.entries(GROUP_ICONS)) {
    if (lowercaseName.includes(keyword)) {
      return icon;
    }
  }
  return GROUP_ICONS.default;
};

interface GroupStats {
  totalMembers: number;
  activeToday: number;
  totalMessages: number;
  lastActivity: string;
}

type Group = Database['public']['Tables']['groups']['Row'] & {
  role?: string;
  category?: string;
};

export default function GroupsPage() {
  const supabase = createClientComponentClient<Database>();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupCode, setGroupCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupStats, setGroupStats] = useState<{[key: string]: GroupStats}>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'members' | 'activity'>('activity');
  const [user, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchGroups();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (groups.length > 0) {
      fetchGroupStats();
    }
  }, [groups]);

  const fetchCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUser(session.user);
    }
  };

  const fetchGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*');

      if (groupsError) throw groupsError;

      const { data: membershipsData, error: membershipsError } = await supabase
        .from('group_members')
        .select('*')
        .eq('user_id', user?.id);

      if (membershipsError) throw membershipsError;

      // Combine groups with membership roles
      const groupsWithRoles = groupsData.map((group) => ({
        ...group,
        role: membershipsData.find((m) => m.group_id === group.id)?.role || 'none',
      })) as Group[];

      setGroups(groupsWithRoles);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupStats = async () => {
    const stats: {[key: string]: GroupStats} = {};
    
    for (const group of groups) {
      try {
        // Fetch total members
        const { count: totalMembers } = await supabase
          .from('group_members')
          .select('*', { count: 'exact' })
          .eq('group_id', group.id);

        // Fetch active members today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: activeToday } = await supabase
          .from('group_messages')
          .select('DISTINCT user_id', { count: 'exact' })
          .eq('group_id', group.id)
          .gte('created_at', today.toISOString());

        // Fetch total messages
        const { count: totalMessages } = await supabase
          .from('group_messages')
          .select('*', { count: 'exact' })
          .eq('group_id', group.id);

        // Fetch last activity
        const { data: lastMessage } = await supabase
          .from('group_messages')
          .select('created_at')
          .eq('group_id', group.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        stats[group.id] = {
          totalMembers: totalMembers || 0,
          activeToday: activeToday || 0,
          totalMessages: totalMessages || 0,
          lastActivity: lastMessage?.created_at || group.created_at
        };
      } catch (error) {
        console.error(`Error fetching stats for group ${group.id}:`, error);
      }
    }

    setGroupStats(stats);
  };

  // Filter and sort groups
  const filteredGroups = groups
    .filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          group.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || group.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'members':
          return (groupStats[b.id]?.totalMembers || 0) - (groupStats[a.id]?.totalMembers || 0);
        case 'activity':
          return new Date(groupStats[b.id]?.lastActivity || 0).getTime() - 
                 new Date(groupStats[a.id]?.lastActivity || 0).getTime();
        default:
          return 0;
      }
    });

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (!session?.user) throw new Error('Not authenticated');

      // Generate a unique code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName,
          description: groupDescription,
          code,
          created_by: session.user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: session.user.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      setShowCreateModal(false);
      setGroupName('');
      setGroupDescription('');
      await fetchGroups(); // Refresh the groups list
    } catch (error: any) {
      console.error('Detailed error:', error);
      setError(error?.message || 'Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (!session?.user) throw new Error('Not authenticated');

      // Check if group exists
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('code', groupCode)
        .single();

      if (groupError || !group) {
        throw new Error('Invalid group code');
      }

      // Add user to group
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: session.user.id,
          role: 'member'
        });

      if (memberError) throw memberError;

      setShowJoinModal(false);
      setGroupCode('');
      await fetchGroups(); // Refresh the groups list
    } catch (error: any) {
      console.error('Error:', error);
      setError(error?.message || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    setLoading(true);
    setError('');

    try {
      // Delete group members first
      const { error: membersError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', selectedGroup.id);

      if (membersError) throw membersError;

      // Delete the group
      const { error: groupError } = await supabase
        .from('groups')
        .delete()
        .eq('id', selectedGroup.id);

      if (groupError) throw groupError;

      setShowDeleteModal(false);
      setSelectedGroup(null);
      await fetchGroups(); // Refresh the groups list
    } catch (error: any) {
      console.error('Error deleting group:', error);
      setError(error?.message || 'Failed to delete group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative font-cabinet-grotesk">
      <FloatingShapes />
      
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
              Your Groups
            </h1>
            <p className="text-gray-400 mt-1">Connect and collaborate with your communities</p>
          </div>
          
          <div className="flex gap-3 mt-4 md:mt-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
            >
              Join Group
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-pink-500/20 text-pink-400 rounded-lg hover:bg-pink-500/30 transition-colors"
            >
              Create Group
            </motion.button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50"
          >
            <option value="">All Categories</option>
            <option value="study">Study</option>
            <option value="social">Social</option>
            <option value="sports">Sports</option>
            <option value="tech">Tech</option>
            <option value="arts">Arts</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'members' | 'activity')}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50"
          >
            <option value="activity">Sort by Activity</option>
            <option value="name">Sort by Name</option>
            <option value="members">Sort by Members</option>
          </select>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <Link href={`/dashboard/groups/${group.id}`} key={group.id}>
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-purple-500/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      {getGroupIcon(group.name)}
                    </div>
                    <div>
                      <h3 className="font-medium">{group.name}</h3>
                      <p className="text-sm text-gray-400">{group.description}</p>
                    </div>
                  </div>
                  {group.role === 'admin' && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedGroup(group);
                        setShowDeleteModal(true);
                      }}
                      className="p-1 hover:bg-white/5 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white/5 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Members</p>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      <p className="font-medium">{groupStats[group.id]?.totalMembers || 0}</p>
                    </div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Active Today</p>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-green-400" />
                      <p className="font-medium">{groupStats[group.id]?.activeToday || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>{groupStats[group.id]?.totalMessages || 0} messages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      {groupStats[group.id]?.lastActivity
                        ? format(new Date(groupStats[group.id].lastActivity), 'MMM d, h:mm a')
                        : 'No activity'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* Join Group Modal */}
      {showJoinModal && (
        <Modal onClose={() => setShowJoinModal(false)}>
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4">Join Group</h2>
            <form onSubmit={handleJoinGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Group Code</label>
                <input
                  type="text"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="Enter group code"
                  required
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Group'}
              </button>
            </form>
          </div>
        </Modal>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4">Create Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="Enter group name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="Enter group description"
                  rows={3}
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          </div>
        </Modal>
      )}

      {/* Delete Group Modal */}
      {showDeleteModal && selectedGroup && (
        <Modal onClose={() => setShowDeleteModal(false)}>
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4">Delete Group</h2>
            <p className="text-gray-400 mb-4">
              Are you sure you want to delete <span className="text-white">{selectedGroup.name}</span>? 
              This action cannot be undone.
            </p>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteGroup()}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
} 