-- ==========================================
-- 1. ADICIONAR COLUNAS EXTRAS EM USERS
-- ==========================================
-- Garantir que a tabela users pode guardar a URL do Storage ou da API
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ==========================================
-- 2. TABELA DE NOTIFICAÇÕES (NOTIFICATIONS)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    module TEXT, -- ex: 'kanban', 'agenda', 'system'
    read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url TEXT, -- URL para onde a notificação joga o usuário ao clicar
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Usuários só podem LER as próprias notificações
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Usuários só podem ATUALIZAR as próprias notificações (para marcar como lida)
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Usuários só podem DELETAR as próprias notificações
CREATE POLICY "Users can delete own notifications"
    ON public.notifications FOR DELETE
    USING (auth.uid() = user_id);

-- Para CRIAR notificações, qualquer usuário autenticado pode criar notificação para QUALQUER um 
-- (necessário para que um usuário atribuindo outro em uma tarefa consiga notificar o destino)
CREATE POLICY "Authenticated users can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Habilitar replicação em tempo real para a tabela notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;


-- ==========================================
-- 3. STORAGE: BUCKET PARA AVATARS (PERFIS)
-- ==========================================
-- Criação de um bucket que é público para leitura, mas seguro para upload
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- O RLS no Storage é aplicado em storage.objects
-- Permitir QUALQUER PESSOA LER as fotos de perfil
CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Permitir INSERT para usuários autenticados (eles farão o upload do próprio rosto)
CREATE POLICY "Auth users can upload avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid() IS NOT NULL
    );

-- Permitir UPDATE apenas pelo dono (opção recomendada), mas na intranet vamos deixar livre por praticidade ou o próprio uid do auth
CREATE POLICY "Auth users can update avatars"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' AND 
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Auth users can delete avatars"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' AND
        auth.uid() IS NOT NULL
    );
