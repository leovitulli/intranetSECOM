-- Correção de RLS para permitir que Usuários Comuns (role: 'user') gerenciem pautas
-- Sem isso, o Usuário Comum não consegue mover pautas no Kanban nem excluí-las.

BEGIN;

-- 1. Tasks
DROP POLICY IF EXISTS "Admins and Devs can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins and Devs can delete tasks" ON public.tasks;

CREATE POLICY "Admins, Devs and Users can update tasks" ON public.tasks 
FOR UPDATE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor', 'user')) 
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor', 'user'));

CREATE POLICY "Admins, Devs and Users can delete tasks" ON public.tasks 
FOR DELETE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor', 'user'));


-- 2. Task Assignees
DROP POLICY IF EXISTS "Admins and Devs can update task assignees" ON public.task_assignees;
DROP POLICY IF EXISTS "Admins and Devs can delete task assignees" ON public.task_assignees;

CREATE POLICY "Admins, Devs and Users can update task assignees" ON public.task_assignees 
FOR UPDATE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor', 'user')) 
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor', 'user'));

CREATE POLICY "Admins, Devs and Users can delete task assignees" ON public.task_assignees 
FOR DELETE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor', 'user'));


-- 3. Task Logs
DROP POLICY IF EXISTS "Admins and Devs can update task_logs" ON public.task_logs;
DROP POLICY IF EXISTS "Admins and Devs can delete task_logs" ON public.task_logs;

CREATE POLICY "Admins, Devs and Users can update task_logs" ON public.task_logs 
FOR UPDATE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor', 'user')) 
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor', 'user'));

CREATE POLICY "Admins, Devs and Users can delete task_logs" ON public.task_logs 
FOR DELETE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor', 'user'));


-- 4. Sugestões (Opcional, mas recomendado para o Usuário Comum poder editar suas sugestões)
DROP POLICY IF EXISTS "Admins and Devs can update suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Admins and Devs can delete suggestions" ON public.suggestions;

CREATE POLICY "Admins, Devs and Users can update suggestions" ON public.suggestions 
FOR UPDATE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor', 'user')) 
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor', 'user'));

CREATE POLICY "Admins, Devs and Users can delete suggestions" ON public.suggestions 
FOR DELETE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor', 'user'));

COMMIT;
