-- Migration: Add archiving support to tasks table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Index for fast filtering of active tasks
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON public.tasks (archived);

-- Comment
COMMENT ON COLUMN public.tasks.archived IS 'If true, this task is archived and removed from the active Kanban view';
COMMENT ON COLUMN public.tasks.archived_at IS 'Timestamp of when the task was archived';
