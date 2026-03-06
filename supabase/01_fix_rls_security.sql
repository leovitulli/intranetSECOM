-- Script para corrigir permissões RLS permissivas nas tabelas principais
-- Restringe UPDATE e DELETE apenas para usuários com role 'admin' ou 'desenvolvedor'

BEGIN;

-- 1. Tasks
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;

CREATE POLICY "Admins and Devs can update tasks" ON public.tasks 
FOR UPDATE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')) 
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor'));

CREATE POLICY "Admins and Devs can delete tasks" ON public.tasks 
FOR DELETE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor'));


-- 2. Task Assignees
DROP POLICY IF EXISTS "Authenticated users can manage task assignees" ON public.task_assignees;

CREATE POLICY "Authenticated users can view task assignees" ON public.task_assignees 
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert task assignees" ON public.task_assignees 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and Devs can update task assignees" ON public.task_assignees 
FOR UPDATE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')) 
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor'));

CREATE POLICY "Admins and Devs can delete task assignees" ON public.task_assignees 
FOR DELETE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor'));


-- 3. Events
DROP POLICY IF EXISTS "Authenticated users can manage events" ON public.events;

CREATE POLICY "Authenticated users can view events" ON public.events 
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert events" ON public.events 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and Devs can update events" ON public.events 
FOR UPDATE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')) 
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor'));

CREATE POLICY "Admins and Devs can delete events" ON public.events 
FOR DELETE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor'));


-- 4. Event Attendees
DROP POLICY IF EXISTS "Authenticated users can manage event attendees" ON public.event_attendees;

CREATE POLICY "Authenticated users can view event attendees" ON public.event_attendees 
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert event attendees" ON public.event_attendees 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and Devs can update event attendees" ON public.event_attendees 
FOR UPDATE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')) 
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor'));

CREATE POLICY "Admins and Devs can delete event attendees" ON public.event_attendees 
FOR DELETE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor'));


-- 5. Suggestions
DROP POLICY IF EXISTS "Authenticated users can manage suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Liberar Tudo Suggestions" ON public.suggestions;

CREATE POLICY "Authenticated users can view suggestions" ON public.suggestions 
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert suggestions" ON public.suggestions 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and Devs can update suggestions" ON public.suggestions 
FOR UPDATE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')) 
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor'));

CREATE POLICY "Admins and Devs can delete suggestions" ON public.suggestions 
FOR DELETE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor'));


-- 6. Task Logs
DROP POLICY IF EXISTS "Authenticated users can manage task_logs" ON public.task_logs;
DROP POLICY IF EXISTS "Liberar Tudo Task Logs" ON public.task_logs;

CREATE POLICY "Authenticated users can view task_logs" ON public.task_logs 
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert task_logs" ON public.task_logs 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Task logs generally shouldn't be updated or deleted even by admins, 
-- but we'll allow it for devs/admins for cleanup purposes.
CREATE POLICY "Admins and Devs can update task_logs" ON public.task_logs 
FOR UPDATE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')) 
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor'));

CREATE POLICY "Admins and Devs can delete task_logs" ON public.task_logs 
FOR DELETE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor'));

COMMIT;
