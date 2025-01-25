-- Add media_url column to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS media_url text;

-- Create events table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    location text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    media_url text,
    is_public boolean DEFAULT true NOT NULL,
    is_approved boolean DEFAULT false NOT NULL,
    created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE
);

-- Create event_participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.event_participants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status text CHECK (status IN ('going', 'maybe', 'not_going')) NOT NULL DEFAULT 'going',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Events read access" ON events;
    DROP POLICY IF EXISTS "Events insert access" ON events;
    DROP POLICY IF EXISTS "Events update access" ON events;
    DROP POLICY IF EXISTS "Events delete access" ON events;
    DROP POLICY IF EXISTS "Event participants read access" ON event_participants;
    DROP POLICY IF EXISTS "Event participants insert access" ON event_participants;
    DROP POLICY IF EXISTS "Event participants update access" ON event_participants;
    DROP POLICY IF EXISTS "Event participants delete access" ON event_participants;

    -- Events policies
    CREATE POLICY "Events read access"
        ON events FOR SELECT
        TO authenticated
        USING (
            is_approved = true 
            OR created_by = auth.uid()
            OR auth.email() = 'cl883@snu.edu.in' -- Admin can see all events
        );
    
    CREATE POLICY "Events insert access"
        ON events FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL);
    
    CREATE POLICY "Events update access"
        ON events FOR UPDATE
        TO authenticated
        USING (
            created_by = auth.uid()
            OR auth.email() = 'cl883@snu.edu.in' -- Admin can update any event
        );
    
    CREATE POLICY "Events delete access"
        ON events FOR DELETE
        TO authenticated
        USING (
            created_by = auth.uid()
            OR auth.email() = 'cl883@snu.edu.in' -- Admin can delete any event
        );

    -- Event participants policies
    CREATE POLICY "Event participants read access"
        ON event_participants FOR SELECT
        TO authenticated
        USING (true);
    
    CREATE POLICY "Event participants insert access"
        ON event_participants FOR INSERT
        TO authenticated
        WITH CHECK (
            auth.uid() = user_id
            AND EXISTS (
                SELECT 1 FROM events
                WHERE id = event_participants.event_id
                AND is_approved = true
            )
        );
    
    CREATE POLICY "Event participants update access"
        ON event_participants FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid());
    
    CREATE POLICY "Event participants delete access"
        ON event_participants FOR DELETE
        TO authenticated
        USING (user_id = auth.uid());
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS events_created_by_idx ON events(created_by);
CREATE INDEX IF NOT EXISTS events_group_id_idx ON events(group_id);
CREATE INDEX IF NOT EXISTS events_start_time_idx ON events(start_time);
CREATE INDEX IF NOT EXISTS event_participants_event_id_idx ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS event_participants_user_id_idx ON event_participants(user_id); 