-- Phase 11 Schema Updates

-- 1. Create Task Logs Table for the "Trello-style" activity history
CREATE TABLE IF NOT EXISTS public.task_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- who did the action
    user_name TEXT NOT NULL, -- soft copy in case user is deleted
    action_type TEXT NOT NULL, -- e.g., 'status_change', 'field_edit', 'comment', 'attachment_added'
    details TEXT NOT NULL, -- readable description, e.g., 'Moveu de Solicitado para Em Produção'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: We already have task_comments table, but a unified log might be better, or we keep comments separate and just interleave them in the UI. 
-- For a true Trello experience, the UI usually interleaves comments and logs based on the 'created_at' date.

-- 2. Add Departure Time and Mayor Attending to Events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS departure_time TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS mayor_attending BOOLEAN DEFAULT false;

-- 3. Create Suggestions Table
CREATE TABLE IF NOT EXISTS public.suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    department TEXT NOT NULL,
    author TEXT DEFAULT 'Anônimo',
    status TEXT DEFAULT 'pending', -- pending, reviewed, approved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Liberar Tudo Suggestions" ON public.suggestions;
CREATE POLICY "Liberar Tudo Suggestions" ON public.suggestions FOR ALL USING (true) WITH CHECK (true);

-- Enable RLS for the new table
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Liberar Tudo Task Logs" ON public.task_logs;
CREATE POLICY "Liberar Tudo Task Logs" ON public.task_logs FOR ALL USING (true) WITH CHECK (true);
