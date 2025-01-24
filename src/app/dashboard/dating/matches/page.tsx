'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { calculateCompatibilityScore } from '../questions';
import { Heart, X, MessageCircle, Loader2, UserPlus, Check } from 'lucide-react';
import Link from 'next/link';
import type { Database } from '@/lib/database.types';
import { motion } from 'framer-motion';

interface Profile {
  id: string;
  name: string;
  email: string;
}

interface DatingProfile {
  id: string;
  user_id: string;
  gender: 'male' | 'female';
  looking_for: 'male' | 'female';
  bio: string | null;
  interests: string[];
  answers: Record<string, any>;
  has_completed_profile: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    name: string;
    email: string;
  };
  compatibility?: number;
}

interface DatingConnection {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export default function MatchesPage() {
  const supabase = createClientComponentClient<Database>();
  const [matches, setMatches] = useState<DatingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<DatingProfile | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error('Not authenticated');
      }

      // First get the user's profile and answers
      const { data: myProfile, error: profileError } = await supabase
        .from('dating_profiles')
        .select(`
          *,
          profiles!inner (
            id,
            name,
            email
          )
        `)
        .eq('user_id', session.user.id)
        .single();

      if (profileError) throw profileError;
      setUserProfile(myProfile);

      // Get potential matches based on gender preference
      const { data: potentialMatches, error: matchesError } = await supabase
        .from('dating_profiles')
        .select(`
          *,
          profiles!inner (
            id,
            name,
            email
          )
        `)
        .eq('gender', myProfile.looking_for)
        .eq('looking_for', myProfile.gender)
        .neq('user_id', session.user.id)
        .eq('has_completed_profile', true);

      if (matchesError) throw matchesError;

      // Calculate compatibility scores
      const matchesWithScores = potentialMatches.map((match) => ({
        ...match,
        compatibility: calculateCompatibilityScore(myProfile.answers, match.answers)
      }));

      // Sort by compatibility score
      const sortedMatches = matchesWithScores.sort((a, b) => 
        (b.compatibility || 0) - (a.compatibility || 0)
      );

      setMatches(sortedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setMessage({ type: 'error', text: 'Failed to load matches' });
    } finally {
      setLoading(false);
    }
  };

  const createConnection = async (toUserId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('dating_connections')
        .insert({
          from_user_id: session.user.id,
          to_user_id: toUserId,
          status: 'pending'
        });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Connection request sent!' });
      fetchMatches();
    } catch (error) {
      console.error('Error creating connection:', error);
      setMessage({ type: 'error', text: 'Failed to send connection request' });
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Your Matches</h1>
        <Link 
          href="/dashboard/dating/requests" 
          className="text-purple-400 hover:text-purple-300 transition"
        >
          View Connection Requests
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 p-6 rounded-xl backdrop-blur-lg border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {match.profiles?.name || 'Anonymous'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Heart className="w-4 h-4 text-pink-500" />
                    <span className="text-gray-300">
                      {Math.round((match.compatibility || 0) * 100)}% Match
                    </span>
                  </div>
                </div>
              </div>

              {match.bio && (
                <p className="text-gray-300 mb-4">{match.bio}</p>
              )}

              {match.interests && match.interests.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {match.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => createConnection(match.user_id)}
                  className="flex-1 p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white flex items-center justify-center gap-2 hover:opacity-90 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Connect
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {message && (
        <div
          className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white ${
            message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}