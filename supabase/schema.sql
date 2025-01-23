-- Create tables
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  year_of_study INT,
  major TEXT,
  courses TEXT[],
  is_mentor BOOLEAN DEFAULT false,
  mentor_subjects TEXT[]
);

CREATE TABLE groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  image_url TEXT,
  is_private BOOLEAN DEFAULT false,
  invite_code TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE group_members (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content TEXT NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT message_recipient CHECK (
    (group_id IS NOT NULL AND receiver_id IS NULL) OR
    (group_id IS NULL AND receiver_id IS NOT NULL)
  )
);

-- Create resources table
CREATE TABLE resources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  course_code TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'notes', 'past_paper', 'study_material'
  tags TEXT[],
  downloads INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create courses table
CREATE TABLE courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  department TEXT NOT NULL,
  credits INT NOT NULL,
  prerequisites TEXT[]
);

-- Create course reviews table
CREATE TABLE course_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  difficulty INT CHECK (difficulty >= 1 AND difficulty <= 5),
  workload INT CHECK (workload >= 1 AND workload <= 5),
  content TEXT NOT NULL,
  semester TEXT NOT NULL,
  year INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(course_id, reviewer_id, semester, year)
);

-- Create mentorship table
CREATE TABLE mentorship (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mentor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mentee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subjects TEXT[],
  status TEXT DEFAULT 'pending', -- 'pending', 'active', 'completed', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(mentor_id, mentee_id)
);

-- Create events table
CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  max_participants INT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create event participants table
CREATE TABLE event_participants (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'going', -- 'going', 'maybe', 'not_going'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (event_id, user_id)
);

-- Create voice messages table
CREATE TABLE voice_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration INT NOT NULL, -- in seconds
  transcription TEXT, -- for search and accessibility
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT voice_message_recipient CHECK (
    (group_id IS NOT NULL AND receiver_id IS NULL) OR
    (group_id IS NULL AND receiver_id IS NOT NULL)
  )
);

-- Create content moderation table
CREATE TABLE moderation_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content_type TEXT NOT NULL, -- 'message', 'resource', 'review', etc.
  content_id UUID NOT NULL,
  content_text TEXT,
  moderation_score FLOAT,
  categories TEXT[], -- 'spam', 'inappropriate', 'offensive', etc.
  action_taken TEXT, -- 'flagged', 'hidden', 'deleted'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_messages_group_id ON messages(group_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_resources_course_code ON resources(course_code);
CREATE INDEX idx_resources_uploaded_by ON resources(uploaded_by);
CREATE INDEX idx_course_reviews_course_id ON course_reviews(course_id);
CREATE INDEX idx_mentorship_mentor_id ON mentorship(mentor_id);
CREATE INDEX idx_mentorship_mentee_id ON mentorship(mentee_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_group_id ON events(group_id);
CREATE INDEX idx_voice_messages_sender_id ON voice_messages(sender_id);

-- Create functions and triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Anyone can view public groups"
  ON groups FOR SELECT
  USING (NOT is_private OR EXISTS (
    SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid()
  ));

CREATE POLICY "Group members can view private groups"
  ON groups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Group admins can update groups"
  ON groups FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = id AND user_id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Users can view their group memberships"
  ON group_members FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = group_members.group_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view messages in their groups"
  ON messages FOR SELECT
  USING (
    sender_id = auth.uid() OR
    receiver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = messages.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Anyone can view public resources"
  ON resources FOR SELECT
  USING (true);

CREATE POLICY "Users can upload resources"
  ON resources FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view course reviews"
  ON course_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create course reviews"
  ON course_reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can view mentorship requests"
  ON mentorship FOR SELECT
  USING (auth.uid() IN (mentor_id, mentee_id));

CREATE POLICY "Users can create mentorship requests"
  ON mentorship FOR INSERT
  WITH CHECK (auth.uid() = mentee_id);

CREATE POLICY "Anyone can view public events"
  ON events FOR SELECT
  USING (is_public OR auth.uid() = organizer_id OR EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = events.group_id AND user_id = auth.uid()
  ));

-- Function to update resource download count
CREATE OR REPLACE FUNCTION increment_resource_downloads()
RETURNS trigger AS $$
BEGIN
  UPDATE resources
  SET downloads = downloads + 1
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 