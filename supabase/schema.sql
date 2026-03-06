-- Database Schema for Intranet SECOM

-- 1. Users / Team Members Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT UNIQUE,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tasks / Kanban Board Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'solicitado',
    priority TEXT NOT NULL DEFAULT 'media',
    type TEXT[] NOT NULL DEFAULT '{}',
    creator TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Task Assignees (Many-to-Many relationship between tasks and users)
CREATE TABLE IF NOT EXISTS public.task_assignees (
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, user_id)
);

-- 4. External Events (Agenda) Table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT,
    location TEXT,
    type TEXT NOT NULL DEFAULT 'pauta',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Event Attendees (Many-to-Many relationship between events and users)
CREATE TABLE IF NOT EXISTS public.event_attendees (
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, user_id)
);

-- 6. Task Comments Table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    avatar TEXT,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Setting up Row Level Security (RLS)
-- For MVP/Internal tool, we will enable RLS but allow authenticated/anon full access to start,
-- or strictly rely on the app logic if there's no complex multi-tenant setup.
-- WARNING: In a production app facing the internet without a backend, 
-- you should restrict these policies using auth.uid().

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (MVP scope)
CREATE POLICY "Enable all operations for all users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for all tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for assignees" ON public.task_assignees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for events" ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for attendees" ON public.event_attendees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for comments" ON public.task_comments FOR ALL USING (true) WITH CHECK (true);
