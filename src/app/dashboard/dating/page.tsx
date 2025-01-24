'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database } from '@/lib/database.types';
import { Heart, ArrowRight, Loader2 } from 'lucide-react';

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
}

export default function DatingPage() {
  const supabase = createClientComponentClient<Database>();
  const [profile, setProfile] = useState<DatingProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkProfile();
  }, []);

  const checkProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile, error } = await supabase
        .from('dating_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setProfile(profile);
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (gender: 'male' | 'female', lookingFor: 'male' | 'female') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('dating_profiles')
        .insert({
          user_id: session.user.id,
          gender,
          looking_for: lookingFor,
          has_completed_profile: false,
          answers: {}
        });

      if (error) throw error;
      checkProfile();
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white/5 p-8 rounded-xl backdrop-blur-lg">
          <h2 className="text-2xl font-bold mb-6 text-white">Welcome to Dating!</h2>
          <p className="mb-6 text-gray-300">Let's start by knowing a bit about you.</p>
          <div className="space-y-4">
            <button
              onClick={() => createProfile('male', 'female')}
              className="w-full p-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition"
            >
              Male
            </button>
            <button
              onClick={() => createProfile('female', 'male')}
              className="w-full p-4 bg-pink-600 hover:bg-pink-700 rounded-lg text-white transition"
            >
              Female
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If profile exists but not completed, redirect to profile completion page
  if (!profile.has_completed_profile) {
    return window.location.href = '/dashboard/dating/profile';
  }

  // If profile is complete, show matches page
  return window.location.href = '/dashboard/dating/matches';
}