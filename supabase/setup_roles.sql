-- ==========================================
-- 1. FUNÇÕES AUXILIARES DE SEGURANÇA (RLS)
-- ==========================================

-- Removemos políticas de testes antigas (MVP genérico)
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.users;
DROP POLICY IF EXISTS "Enable all operations for all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Enable all operations for assignees" ON public.task_assignees;
DROP POLICY IF EXISTS "Enable all operations for events" ON public.events;
DROP POLICY IF EXISTS "Enable all operations for attendees" ON public.event_attendees;
DROP POLICY IF EXISTS "Enable all operations for comments" ON public.task_comments;

-- Função utilitária para pegar a role de um usuário logado
CREATE OR REPLACE FUNCTION public.get_user_role(target_user_id uuid)
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = target_user_id;
  RETURN COALESCE(v_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 2. POLÍTICAS PARA USUÁRIOS (users)
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- QUALQUER USUÁRIO LOGADO PODE LER OS DADOS DOS USUÁRIOS (Para que a lista de equipe funcione)
CREATE POLICY "Users can view all profiles"
  ON public.users FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- APENAS ADMIN E DESENVOLVEDOR (OU O PRÓPRIO USUÁRIO SE ATUALIZANDO) PODE ATUALIZAR
CREATE POLICY "Admins, Devs, and self can update profiles"
  ON public.users FOR UPDATE
  USING (
    auth.uid() = id OR
    public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')
  )
  WITH CHECK (
    auth.uid() = id OR
    public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')
  );

-- APENAS ADMIN E DESENVOLVEDOR PODE INSERIR OU DELETAR USUÁRIOS
CREATE POLICY "Admins and Devs can insert profiles"
  ON public.users FOR INSERT
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')
  );

CREATE POLICY "Admins and Devs can delete profiles"
  ON public.users FOR DELETE
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')
  );


-- ==========================================
-- 3. POLÍTICAS PARA COMENTÁRIOS (task_comments)
-- ==========================================

-- Adicionar o author_id para vincular o comentário ao Supabase Auth
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- QUALQUER LOGADO PODE LER OS COMENTÁRIOS DA PAUTA
CREATE POLICY "Users can view all comments"
  ON public.task_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- QUALQUER LOGADO PODE CRIAR O SEU COMENTÁRIO
CREATE POLICY "Users can create comments"
  ON public.task_comments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = author_id
  );

-- PARA UPDATE E DELETE:
-- - Se for O PRÓPRIO dono do comentário (auth.uid() = author_id)
-- - Se for um ADMIN ou DESENVOLVEDOR
CREATE POLICY "Users can update own comments, Admins and Devs can update any"
  ON public.task_comments FOR UPDATE
  USING (
    auth.uid() = author_id OR 
    public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')
  )
  WITH CHECK (
    auth.uid() = author_id OR 
    public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')
  );

CREATE POLICY "Users can delete own comments, Admins and Devs can delete any"
  ON public.task_comments FOR DELETE
  USING (
    auth.uid() = author_id OR 
    public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')
  );


-- ==========================================
-- 4. POLÍTICAS GENÉRICAS PARA OUTRAS TABELAS
-- ==========================================
-- Como MVP, liberar leitura e edição para Logados nas entidades de negócios primárias, 
-- ou limitar de acordo com necessidade futura. Para já, focamos restrição forte em comments/users.

CREATE POLICY "Authenticated users can select tasks" ON public.tasks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update tasks" ON public.tasks FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete tasks" ON public.tasks FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage task assignees" ON public.task_assignees FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage events" ON public.events FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage event attendees" ON public.event_attendees FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage suggestions" ON public.suggestions FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage task_logs" ON public.task_logs FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
