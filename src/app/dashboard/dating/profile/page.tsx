'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import { DATING_QUESTIONS } from '../questions';
import { useRouter } from 'next/navigation';
import type { Database } from '@/lib/database.types';
import { Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  const checkProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }

      const { data: profile, error } = await supabase
        .from('dating_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;

      if (profile?.has_completed_profile) {
        router.push('/dashboard/dating/matches');
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  const submitAnswer = useCallback(async (answer: string) => {
    const newAnswers = { ...answers, [currentQuestion]: answer };
    setAnswers(newAnswers);

    if (currentQuestion < DATING_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      await completeProfile(newAnswers);
    }
  }, [currentQuestion, answers]);

  const completeProfile = useCallback(async (finalAnswers: Record<number, string>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }

      const { error } = await supabase
        .from('dating_profiles')
        .update({
          answers: finalAnswers,
          has_completed_profile: true
        })
        .eq('user_id', session.user.id);

      if (error) throw error;
      router.push('/dashboard/dating/matches');
    } catch (error) {
      console.error('Error completing profile:', error);
    }
  }, [supabase, router]);

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

  const currentQ = DATING_QUESTIONS[currentQuestion];

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto bg-white/5 p-8 rounded-xl backdrop-blur-lg"
      >
        <div className="mb-8">
          <div className="w-full bg-white/10 rounded-full h-2 mb-4">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / DATING_QUESTIONS.length) * 100}%` }}
            />
          </div>
          <p className="text-sm text-gray-400">Question {currentQuestion + 1} of {DATING_QUESTIONS.length}</p>
        </div>

        <h2 className="text-2xl font-bold mb-6 text-white">{currentQ.question}</h2>
        
        <div className="grid grid-cols-2 gap-4">
          {currentQ.options.map((option, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => submitAnswer(option)}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-white border border-white/10 transition-all duration-200"
            >
              {option}
            </motion.button>
          ))}
        </div>

        {currentQuestion > 0 && (
          <button
            onClick={() => setCurrentQuestion(prev => prev - 1)}
            className="mt-6 text-gray-400 hover:text-white transition"
          >
            Go back to previous question
          </button>
        )}
      </motion.div>
    </div>
  );
}
