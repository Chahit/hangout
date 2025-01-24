'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Database } from '@/lib/database.types';
import { useRouter } from 'next/navigation';

interface DatingProfile {
  id: string;
  user_id: string;
  gender: 'male' | 'female';
  looking_for: 'male' | 'female';
  bio: string | null;
  interests: string[];
  answers: Record<string, string>;
  has_completed_profile: boolean;
  created_at: string;
  updated_at: string;
}

type SupabaseClient = ReturnType<typeof createClientComponentClient<Database>>;

export default function DatingPage() {
  const router = useRouter();
  const supabase: SupabaseClient = createClientComponentClient<Database>();
  const [profile, setProfile] = useState<DatingProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const checkProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('dating_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setProfile(profile);

      // Handle routing based on profile state
      if (profile) {
        if (!profile.has_completed_profile) {
          router.push('/dashboard/dating/profile');
        } else {
          router.push('/dashboard/dating/matches');
        }
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  const createProfile = useCallback(async (gender: 'male' | 'female', lookingFor: 'male' | 'female') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

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
      await checkProfile();
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  }, [supabase, router, checkProfile]);

  useEffect(() => {
    checkProfile();
  }, [checkProfile]);

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
          <p className="mb-6 text-gray-300">Let&apos;s start by knowing a bit about you.</p>
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

  return null;
}