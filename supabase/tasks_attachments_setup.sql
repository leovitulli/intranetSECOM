-- 1. Add jsonb columns to tasks table for attachments and comments
ALTER TABLE "public"."tasks"
ADD COLUMN IF NOT EXISTS "attachments" JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "comments" JSONB DEFAULT '[]'::jsonb;

-- 2. Create the task-attachments bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies for task-attachments (so anyone can upload/read)
CREATE POLICY "Task attachments are publicly readable" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'task-attachments');

CREATE POLICY "Auth users can upload task attachments" 
    ON storage.objects FOR INSERT 
    WITH CHECK (
        bucket_id = 'task-attachments' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Auth users can delete task attachments" 
    ON storage.objects FOR DELETE 
    USING (
        bucket_id = 'task-attachments' AND 
        auth.role() = 'authenticated'
    );
