'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { calculateCompatibilityScore } from '../questions';
import { Heart, X, MessageCircle, Loader2, UserPlus, Check } from 'lucide-react';
import Link from 'next/link';
import type { Database } from '@/lib/database.types';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface Match {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender: UserProfile;
  receiver: UserProfile;
  user_id?: string;
  email?: string;
  bio?: string;
  interests?: string[];
  answers?: any;
  compatibility?: number;
  matchStatus?: string;
}

export default function MatchesPage() {
  const supabase = createClientComponentClient<Database>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  async function fetchMatches() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch current user's profile
      const { data: profile, error: profileError } = await supabase
        .from('dating_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profile);

      // Fetch all other profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('dating_profiles')
        .select(`
          *,
          users:user_id (
            email
          )
        `)
        .neq('user_id', user.id);

      if (profilesError) throw profilesError;

      // Fetch existing match requests
      const { data: matchRequests, error: matchError } = await supabase
        .from('dating_matches')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (matchError) throw matchError;

      // Calculate compatibility and combine with match status
      const matchesWithCompatibility = profiles.map((otherProfile: any) => {
        const compatibility = calculateCompatibilityScore(profile.answers, otherProfile.answers);
        const matchRequest = matchRequests?.find(
          (m: any) => (m.sender_id === user.id && m.receiver_id === otherProfile.user_id) ||
                      (m.sender_id === otherProfile.user_id && m.receiver_id === user.id)
        );

        return {
          id: otherProfile.id,
          sender_id: user.id,
          receiver_id: otherProfile.user_id,
          status: matchRequest?.status || 'pending',
          created_at: new Date().toISOString(),
          user_id: otherProfile.user_id,
          email: otherProfile.users.email,
          bio: otherProfile.bio,
          interests: otherProfile.interests,
          answers: otherProfile.answers,
          compatibility: Math.round(compatibility * 100),
          matchStatus: matchRequest ? matchRequest.status : undefined
        } as Match;
      });

      // Sort by compatibility
      matchesWithCompatibility.sort((a, b) => {
        const compA = a.compatibility || 0;
        const compB = b.compatibility || 0;
        return compB - compA;
      });
      setMatches(matchesWithCompatibility);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setMessage({ type: 'error', text: 'Failed to load matches. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  async function sendMatchRequest(matchId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('dating_matches')
        .insert({
          sender_id: user.id,
          receiver_id: matchId,
          status: 'pending',
          compatibility_score: matches.find(m => m.user_id === matchId)?.compatibility || 0
        });

      if (error) throw error;

      // Update local state
      setMatches(prev => prev.map(match => 
        match.user_id === matchId 
          ? { ...match, matchStatus: 'pending' }
          : match
      ));

      setMessage({ type: 'success', text: 'Match request sent!' });
    } catch (error) {
      console.error('Error sending match request:', error);
      setMessage({ type: 'error', text: 'Failed to send match request. Please try again.' });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-8">
        <Heart className="w-8 h-8 text-purple-500" />
        <h1 className="text-3xl font-bold">Your Matches</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-8 ${
          message.type === 'success' ? 'bg-green-800' : 'bg-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {matches.map((match) => (
          <div key={match.id} className="bg-gray-800 rounded-lg p-6 space-y-4">
            {/* Profile Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {match.email?.split('@')[0] || 'Anonymous User'}
                </h3>
                <div className="flex items-center gap-2 text-purple-400">
                  <Heart className="w-4 h-4" />
                  <span>{match.compatibility}% Match</span>
                </div>
              </div>
            </div>

            {/* Bio */}
            <p className="text-gray-300">{match.bio}</p>

            {/* Email */}
            {match.email && (
              <p className="text-sm text-gray-600 mb-2">{match.email}</p>
            )}

            {/* Interests */}
            {match.interests && match.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {match.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4">
              {match.matchStatus ? (
                match.matchStatus === 'accepted' ? (
                  <Link
                    href={`/dashboard/dating/chat/${match.id}`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <MessageCircle size={20} />
                    Chat
                  </Link>
                ) : (
                  <button
                    className="w-full px-4 py-2 bg-gray-200 text-gray-600 rounded-lg cursor-not-allowed"
                    disabled
                  >
                    Pending
                  </button>
                )
              ) : (
                <button
                  onClick={() => sendMatchRequest(match.user_id || '')}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <UserPlus size={20} />
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {matches.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No matches found yet. Check back later!</p>
        </div>
      )}
    </div>
  );
} 