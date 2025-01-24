'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Heart, Loader2, ArrowRight, UserPlus, Users, Sparkles, Crown, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpring, animated } from 'react-spring';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';
import type { Database } from '@/lib/database.types';

// Add these type definitions at the top of the file
type Answer = {
  user_id: string;
  question_number: number;
  answer: string;
};

type DatingMatch = {
  id: string;
  user1_id: string;
  user2_id: string;
  match_score: number;
  status: string;
  sender_id?: string;
  receiver_id?: string;
  sender_name?: string;
  receiver_name?: string;
  compatibility_score?: number;
  created_at?: string;
  sender?: { id: string; name: string };
  receiver?: { id: string; name: string };
};

const DATING_QUESTIONS = [
  {
    id: 1,
    question: "What's your ideal weekend activity?",
    options: ["Outdoor Adventures", "Netflix & Chill", "Social Events", "Creative Projects"]
  },
  {
    id: 2,
    question: "How do you prefer to communicate?",
    options: ["Texting", "Phone Calls", "Face to Face", "Mix of Everything"]
  },
  {
    id: 3,
    question: "What's your favorite music genre?",
    options: ["Pop", "Rock", "Hip Hop", "Everything"]
  },
  {
    id: 4,
    question: "How do you handle stress?",
    options: ["Exercise", "Meditation", "Talk it Out", "Keep Busy"]
  },
  {
    id: 5,
    question: "What's your ideal first date?",
    options: ["Coffee Chat", "Adventure Activity", "Dinner Date", "Casual Walk"]
  },
  {
    id: 6,
    question: "What's your approach to decision making?",
    options: ["Logical Analysis", "Go with Gut", "Seek Advice", "Pros & Cons List"]
  },
  {
    id: 7,
    question: "What's your primary love language?",
    options: ["Quality Time", "Physical Touch", "Words of Affirmation", "Acts of Service"]
  },
  {
    id: 8,
    question: "What's your ideal living environment?",
    options: ["City Life", "Suburban", "Rural", "Beach Town"]
  },
  {
    id: 9,
    question: "How do you define success?",
    options: ["Career Growth", "Personal Growth", "Relationships", "Life Balance"]
  },
  {
    id: 10,
    question: "What's your preferred social setting?",
    options: ["Small Groups", "Large Parties", "One-on-One", "Mix of Both"]
  },
  {
    id: 11,
    question: "How do you approach problems?",
    options: ["Head-on", "Step by Step", "Seek Help", "Creative Solutions"]
  },
  {
    id: 12,
    question: "What's your stance on pets?",
    options: ["Love All Pets", "Dogs Only", "Cats Only", "No Pets"]
  },
  {
    id: 13,
    question: "How do you prefer to learn?",
    options: ["Reading", "Watching", "Doing", "Discussion"]
  },
  {
    id: 14,
    question: "What's your favorite cuisine?",
    options: ["Indian", "Italian", "Asian", "Everything"]
  },
  {
    id: 15,
    question: "How do you spend your free time?",
    options: ["Hobbies", "Friends", "Family", "Mix of All"]
  },
  {
    id: 16,
    question: "What field interests you most?",
    options: ["Technology", "Arts", "Business", "Science"]
  },
  {
    id: 17,
    question: "How do you express emotions?",
    options: ["Openly", "Selectively", "Actions", "Take Time"]
  },
  {
    id: 18,
    question: "What's your favorite season?",
    options: ["Spring", "Summer", "Fall", "Winter"]
  },
  {
    id: 19,
    question: "How do you approach relationships?",
    options: ["Take it Slow", "All In", "Go with Flow", "Friendship First"]
  },
  {
    id: 20,
    question: "What's your ideal vacation?",
    options: ["Beach Resort", "City Exploring", "Mountain Adventure", "Road Trip"]
  }
];

// Animation variants for cards
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

// Micro-interaction animation for buttons
const buttonVariants = {
  hover: { scale: 1.05, transition: { duration: 0.2 } },
  tap: { scale: 0.95, transition: { duration: 0.1 } }
};

// Add floating background shapes component
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
  <div className="flex items-center justify-center min-h-screen relative">
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

// Toast notification component
interface ToastProps {
  message: { type: 'success' | 'error'; text: string } | null;
}

const Toast = ({ message }: ToastProps) => {
  if (!message) return null;

  const emoji = message.type === 'success' ? '🎉' : '❌';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className={`fixed bottom-4 right-4 p-4 rounded-xl backdrop-blur-lg shadow-lg ${
        message.type === 'success'
          ? 'bg-green-500/10 text-green-500 border border-green-500/20'
          : 'bg-red-500/10 text-red-500 border border-red-500/20'
      }`}
    >
      <div className="flex items-center gap-2">
        <span>{emoji}</span>
        <p className="font-medium">{message.text}</p>
      </div>
    </motion.div>
  );
};

interface Profile {
  id: string;
  name: string;
  email: string;
  bio: string;
  interests: string[];
  answers: Record<string, string>;
}

export default function DatingPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'matches'>('profile');
  const [matches, setMatches] = useState<DatingMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();

  useEffect(() => {
    const setup = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Setup error:', error);
        setMessage({ type: 'error', text: 'Failed to load profile' });
      } finally {
        setLoading(false);
      }
    };
    setup();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from('dating_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      
      if (profile) {
        setProfile(profile);
        if (profile.answers) {
          setSelectedAnswers(profile.answers);
          setCurrentQuestionIndex(DATING_QUESTIONS.length);
        }
        await fetchMatches();
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile' });
    }
  }

  const fetchMatches = async () => {
    try {
      if (!profile) {
        setMatches([]);
        return;
      }

      const { data: matchesData, error } = await supabase
        .from('dating_matches')
        .select(`
          *,
          sender:profiles!dating_matches_sender_id_fkey(id, name),
          receiver:profiles!dating_matches_receiver_id_fkey(id, name)
        `)
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`);

      if (error) throw error;

      const matchesWithNames = matchesData.map(match => ({
        ...match,
        sender_name: match.sender?.name,
        receiver_name: match.receiver?.name
      }));

      setMatches(matchesWithNames);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load matches. Please try again.'
      });
    }
  };

  const handleAnswer = async (option: string) => {
    try {
      if (!profile) {
        throw new Error('Not authenticated');
      }

      const newAnswers = { ...selectedAnswers, [DATING_QUESTIONS[currentQuestionIndex].id]: option };
      setSelectedAnswers(newAnswers);

      // Save answers if it's the last question
      if (currentQuestionIndex === DATING_QUESTIONS.length - 1) {
        const { error } = await supabase
          .from('dating_profiles')
          .upsert({
            user_id: profile.id,
            answers: newAnswers,
          });

        if (error) throw error;
        
        triggerConfetti();
      }

      setCurrentQuestionIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const handleAcceptMatch = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from('dating_matches')
        .update({ status: 'accept' })
        .eq('id', matchId);

      if (error) throw error;
      fetchMatches();
    } catch (error) {
      console.error('Error accepting match:', error);
    }
  };

  const handleRejectMatch = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from('dating_matches')
        .update({ status: 'reject' })
        .eq('id', matchId);

      if (error) throw error;
      fetchMatches();
    } catch (error) {
      console.error('Error rejecting match:', error);
    }
  };

  // Function to trigger confetti on profile completion
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleFinish = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Save answers to dating_profiles
      const { error: profileError } = await supabase
        .from('dating_profiles')
        .upsert({
          user_id: session.user.id,
          answers: selectedAnswers
        });

      if (profileError) throw profileError;

      // Find potential matches by querying other dating profiles
      const { data: otherProfiles, error: matchError } = await supabase
        .from('dating_profiles')
        .select('user_id, answers')
        .neq('user_id', session.user.id);

      if (matchError) throw matchError;

      if (!otherProfiles || otherProfiles.length === 0) {
        // Show success message but indicate no matches yet
        setMessage({
          type: 'success',
          text: 'Profile completed! You are one of our first users. Check back later for matches!'
        });
        router.push('/dashboard/dating/matches');
        return;
      }

      // Calculate matches
      const matches: Omit<DatingMatch, 'id' | 'created_at'>[] = [];
      otherProfiles.forEach((profile) => {
        let matchingAnswers = 0;
        const theirAnswers = profile.answers;
        
        // Compare answers
        Object.entries(selectedAnswers).forEach(([questionId, myAnswer]) => {
          if (theirAnswers[questionId] === myAnswer) {
            matchingAnswers++;
          }
        });

        // If 15 or more answers match, create a match
        if (matchingAnswers >= 15) {
          matches.push({
            user1_id: session.user.id,
            user2_id: profile.user_id,
            match_score: matchingAnswers,
            status: 'pending'
          });
        }
      });

      // Insert new matches if any found
      if (matches.length > 0) {
        const { error: matchInsertError } = await supabase
          .from('dating_matches')
          .upsert(matches, { onConflict: 'user1_id,user2_id' });

        if (matchInsertError) throw matchInsertError;
        
        setMessage({
          type: 'success',
          text: `Profile completed! Found ${matches.length} potential matches!`
        });
      } else {
        setMessage({
          type: 'success',
          text: 'Profile completed! No matches found yet, but keep checking back!'
        });
      }

      // Redirect to matches page
      router.push('/dashboard/dating/matches');
    } catch (error) {
      console.error('Error saving answers and finding matches:', error);
      setMessage({
        type: 'error',
        text: 'Failed to save answers. Please try again.'
      });
    }
  };

  if (loading || matchesLoading) {
    return <LoadingSpinner />;
  }

  const currentQuestion = DATING_QUESTIONS[currentQuestionIndex];
  const progress = (currentQuestionIndex / DATING_QUESTIONS.length) * 100;

  if (currentQuestionIndex === DATING_QUESTIONS.length) {
    return (
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="max-w-2xl mx-auto p-8"
      >
        <div className="text-center glass-morphism p-8 rounded-2xl">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="relative"
          >
            <Heart className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <Sparkles className="w-6 h-6 text-purple-300 absolute top-0 right-0" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-purple-600 text-transparent bg-clip-text">
            Profile Complete!
          </h1>
          <p className="text-muted-foreground mb-8 text-lg">
            Your dating profile is ready. Check out your matches!
          </p>
          <div className="flex gap-6 justify-center">
            <motion.button
              whileHover="hover"
              whileTap="tap"
              variants={buttonVariants}
              onClick={() => setCurrentQuestionIndex(0)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300"
            >
              Update Answers
            </motion.button>
            <motion.button
              whileHover="hover"
              whileTap="tap"
              variants={buttonVariants}
              onClick={() => setActiveTab('matches')}
              className="px-6 py-3 bg-secondary/80 backdrop-blur text-foreground rounded-xl hover:shadow-lg transition-all duration-300"
            >
              View Matches
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen w-full relative font-cabinet-grotesk">
      <FloatingShapes />
      
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 md:space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col space-y-4"
        >
          <h1 className="text-2xl md:text-3xl font-clash-display font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
            Campus Dating ✨
          </h1>
          <p className="text-sm md:text-base text-gray-400">
            Find your perfect match based on shared interests and compatibility.
          </p>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 border-b border-white/10 pb-4">
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm md:text-base transition-all ${
              activeTab === 'profile'
                ? 'bg-purple-500/10 text-purple-500'
                : 'hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            Profile
          </motion.button>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => setActiveTab('matches')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm md:text-base transition-all ${
              activeTab === 'matches'
                ? 'bg-pink-500/10 text-pink-500'
                : 'hover:bg-white/5'
            }`}
          >
            <Heart className="w-4 h-4" />
            Matches
            {matches.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-pink-500/20 text-pink-500 rounded-full">
                {matches.length}
              </span>
            )}
          </motion.button>
        </div>

        {/* Profile Section */}
        {activeTab === 'profile' && (
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6"
          >
            {/* Question Card */}
            <div className="glass-morphism p-4 md:p-6 rounded-xl space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg md:text-xl font-medium">
                  Question {currentQuestionIndex + 1} of {DATING_QUESTIONS.length}
                </h3>
                <span className="text-sm text-gray-400">
                  {Math.round(((currentQuestionIndex + 1) / DATING_QUESTIONS.length) * 100)}% Complete
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQuestionIndex + 1) / DATING_QUESTIONS.length) * 100}%` }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                />
              </div>

              <h2 className="text-xl md:text-2xl font-medium">
                {DATING_QUESTIONS[currentQuestionIndex].question}
              </h2>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {DATING_QUESTIONS[currentQuestionIndex].options.map((option, index) => (
                  <motion.button
                    key={option}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => {
                      setSelectedAnswers({
                        ...selectedAnswers,
                        [DATING_QUESTIONS[currentQuestionIndex].id]: option
                      });
                    }}
                    className={`p-4 rounded-xl text-left transition-all ${
                      selectedAnswers[DATING_QUESTIONS[currentQuestionIndex].id] === option
                        ? 'bg-purple-500/20 border-2 border-purple-500/50'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="px-2 py-1 bg-white/10 rounded text-sm">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="text-sm md:text-base">{option}</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 text-sm md:text-base bg-white/5 rounded-xl hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </motion.button>
                {currentQuestionIndex === DATING_QUESTIONS.length - 1 ? (
                  <motion.button
                    onClick={handleFinish}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all"
                  >
                    Finish
                  </motion.button>
                ) : (
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => {
                      if (selectedAnswers[DATING_QUESTIONS[currentQuestionIndex].id]) {
                        setCurrentQuestionIndex(prev => prev + 1);
                      }
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all"
                  >
                    Next
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Matches Section */}
        {activeTab === 'matches' && (
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4"
          >
            {matches.map((match, index) => (
              <motion.div
                key={match.id}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.1 }}
                className="glass-morphism p-4 md:p-6 rounded-xl"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium line-clamp-1">
                        {match.sender_id === profile?.id ? match.receiver_name : match.sender_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          {(match.match_score || 0) >= 18 ? (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <Star className="w-4 h-4 text-purple-500" />
                          )}
                          <span>
                            {Math.round((match.match_score || 0) * 5)}% Compatible
                          </span>
                        </div>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-white/10">
                          {match.status === 'pending' ? 'Pending' : match.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {match.status === 'pending' && match.receiver_id === profile?.id && (
                      <>
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => handleAcceptMatch(match.id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-sm"
                        >
                          Accept
                        </motion.button>
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => handleRejectMatch(match.id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 rounded-xl text-sm"
                        >
                          Decline
                        </motion.button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {matches.length === 0 && !matchesLoading && (
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
                  <Heart className="w-12 h-12 text-pink-500 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-lg md:text-xl font-medium mb-2">No Matches Yet</h3>
                <p className="text-gray-400 text-sm md:text-base">
                  Complete your profile to start finding matches!
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Toast Notification */}
        <AnimatePresence>
          {message && <Toast message={message} />}
        </AnimatePresence>
      </div>
    </div>
  );
}