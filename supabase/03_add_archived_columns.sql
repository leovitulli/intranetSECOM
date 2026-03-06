-- Migration: Add archived columns to tasks table
-- Run this in the Supabase SQL Editor

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS archived      BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS archived_at   TIMESTAMP WITH TIME ZONE;
