'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Music, BookOpen, Palette, Code, Dumbbell, Camera, Film, Gamepad, Users, Coffee } from 'lucide-react';

const INTERESTS = [
  { id: 'music', label: 'Music', icon: Music },
  { id: 'academics', label: 'Academics', icon: BookOpen },
  { id: 'art', label: 'Art', icon: Palette },
  { id: 'coding', label: 'Coding', icon: Code },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'photography', label: 'Photography', icon: Camera },
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'gaming', label: 'Gaming', icon: Gamepad },
  { id: 'socializing', label: 'Socializing', icon: Users },
  { id: 'coffee', label: 'Coffee', icon: Coffee },
];

const BATCHES = ['2020', '2021', '2022', '2023', '2024'];
const BRANCHES = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Chemical'];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    batch: '',
    branch: '',
  });
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [error, setError] = useState('');

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: formData.name,
          batch: formData.batch,
          branch: formData.branch,
          interests: selectedInterests,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      router.push('/dashboard');
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-md mx-auto space-y-8 pt-8">
        <div>
          <h2 className="text-3xl font-bold text-center">Complete Your Profile</h2>
          <p className="mt-2 text-center text-muted-foreground">
            Let&apos;s get to know you better
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                required
                className="mobile-input"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="batch" className="block text-sm font-medium mb-1">
                Batch
              </label>
              <select
                id="batch"
                required
                className="mobile-input"
                value={formData.batch}
                onChange={(e) => setFormData(prev => ({ ...prev, batch: e.target.value }))}
              >
                <option value="">&nbsp;Select Batch</option>
                {BATCHES.map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="branch" className="block text-sm font-medium mb-1">
                Branch
              </label>
              <select
                id="branch"
                required
                className="mobile-input"
                value={formData.branch}
                onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
              >
                <option value="">&nbsp;Select Branch</option>
                {BRANCHES.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">
              Your Interests
            </label>
            <div className="grid grid-cols-2 gap-3">
              {INTERESTS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleInterest(id)}
                  className={`interest-button flex items-center justify-center gap-2 ${
                    selectedInterests.includes(id) ? 'selected' : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-destructive text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mobile-button w-full"
          >
            {loading ? 'Saving...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
} 