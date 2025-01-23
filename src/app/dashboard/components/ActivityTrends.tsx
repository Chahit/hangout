'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import { TrendingUp, MessageSquare, Users, Calendar } from 'lucide-react';

interface ActivityData {
  date: string;
  messages: number;
  groupPosts: number;
  eventParticipation: number;
}

export default function ActivityTrends() {
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchActivityData();
  }, []);

  const fetchActivityData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get dates for the last 7 days
      const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      // Fetch message counts per day
      const messagePromises = dates.map(async (date) => {
        const startOfDay = new Date(date);
        const endOfDay = new Date(date);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact' })
          .eq('from_user_id', user.id)
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString());

        return count || 0;
      });

      // Fetch group post counts per day
      const groupPostPromises = dates.map(async (date) => {
        const startOfDay = new Date(date);
        const endOfDay = new Date(date);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const { count } = await supabase
          .from('group_messages')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString());

        return count || 0;
      });

      // Fetch event participation per day
      const eventPromises = dates.map(async (date) => {
        const startOfDay = new Date(date);
        const endOfDay = new Date(date);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const { count } = await supabase
          .from('event_participants')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString());

        return count || 0;
      });

      const [messages, groupPosts, events] = await Promise.all([
        Promise.all(messagePromises),
        Promise.all(groupPostPromises),
        Promise.all(eventPromises)
      ]);

      const data = dates.map((date, i) => ({
        date,
        messages: messages[i],
        groupPosts: groupPosts[i],
        eventParticipation: events[i]
      }));

      setActivityData(data);
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/5 p-6 rounded-xl border border-white/10">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-white/10 rounded w-1/4"></div>
          <div className="h-40 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  // Find the maximum values for scaling
  const maxMessages = Math.max(...activityData.map(d => d.messages));
  const maxPosts = Math.max(...activityData.map(d => d.groupPosts));
  const maxEvents = Math.max(...activityData.map(d => d.eventParticipation));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 p-6 rounded-xl border border-white/10"
    >
      <h3 className="text-lg font-medium mb-4">Activity Trends</h3>
      
      <div className="space-y-6">
        {/* Messages Trend */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-400">Messages Sent</span>
          </div>
          <div className="flex items-end gap-1 h-20">
            {activityData.map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500/20 rounded-t"
                  style={{
                    height: `${maxMessages ? (day.messages / maxMessages) * 100 : 0}%`,
                    minHeight: day.messages ? '2px' : '0'
                  }}
                ></div>
                <span className="text-xs text-gray-500 mt-1">
                  {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Group Posts Trend */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-400">Group Posts</span>
          </div>
          <div className="flex items-end gap-1 h-20">
            {activityData.map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-purple-500/20 rounded-t"
                  style={{
                    height: `${maxPosts ? (day.groupPosts / maxPosts) * 100 : 0}%`,
                    minHeight: day.groupPosts ? '2px' : '0'
                  }}
                ></div>
                <span className="text-xs text-gray-500 mt-1">
                  {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Event Participation Trend */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-400">Event Participation</span>
          </div>
          <div className="flex items-end gap-1 h-20">
            {activityData.map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-green-500/20 rounded-t"
                  style={{
                    height: `${maxEvents ? (day.eventParticipation / maxEvents) * 100 : 0}%`,
                    minHeight: day.eventParticipation ? '2px' : '0'
                  }}
                ></div>
                <span className="text-xs text-gray-500 mt-1">
                  {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
} 