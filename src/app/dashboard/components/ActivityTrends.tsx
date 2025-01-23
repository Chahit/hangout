'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import { Database } from '@/lib/database.types';

interface ActivityData {
  id: string;
  user_id: string;
  type: string;
  timestamp: string;
  metadata: {
    value: number;
    category: string;
  };
}

interface DataPoint {
  value: number;
}

export default function ActivityTrends() {
  const [data, setData] = useState<ActivityData[]>([]);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    fetchActivityData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchActivityData = async () => {
    try {
      const { data: activityData, error } = await supabase
        .from('user_activity')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(30);

      if (error) throw error;
      setData(activityData || []);
    } catch (error) {
      console.error('Error fetching activity data:', error);
    }
  };

  const generateDataPoints = (count: number): DataPoint[] => {
    return Array.from({ length: count }, () => ({
      value: Math.floor(Math.random() * 100)
    }));
  };

  return (
    <div className="w-full h-48 bg-black/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Activity Trends</h3>
      </div>
      <div className="relative h-32">
        <div className="absolute inset-0 flex items-end justify-between">
          {generateDataPoints(12).map((point, index) => (
            <motion.div
              key={index}
              className="w-4 bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-sm"
              initial={{ height: 0 }}
              animate={{ height: `${point.value}%` }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
} 