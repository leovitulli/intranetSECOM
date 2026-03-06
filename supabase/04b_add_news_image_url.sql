-- Migration: Add image_url column to news table
-- Run this in the Supabase SQL Editor

ALTER TABLE public.news
    ADD COLUMN IF NOT EXISTS image_url TEXT;
