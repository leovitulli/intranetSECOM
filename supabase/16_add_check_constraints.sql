-- Migration 16: CHECK Constraints para Validação no Banco
-- Garante integridade dos dados mesmo se o frontend for contornado

BEGIN;

-- 1. Tasks: validar status permitido
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_status_check
CHECK (status IN ('solicitado', 'producao', 'correcao', 'aprovado', 'publicado', 'cancelado', 'inauguracao', 'solicitacao'));

-- 2. Tasks: validar prioridade
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_priority_check
CHECK (priority IN ('baixa', 'media', 'alta'));

-- 3. Tasks: título não pode ser vazio ou só espaços
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_title_not_blank
CHECK (trim(title) <> '');

-- 4. Tasks: título com tamanho máximo (255 chars)
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_title_max_length
CHECK (char_length(title) <= 255);

-- 5. Users: validar roles permitidos
ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'desenvolvedor', 'user', 'viewer', 'Motorista'));

-- 6. Users: nome não pode ser vazio
ALTER TABLE public.users
ADD CONSTRAINT users_name_not_blank
CHECK (trim(name) <> '');

-- 7. Users: nome com tamanho máximo
ALTER TABLE public.users
ADD CONSTRAINT users_name_max_length
CHECK (char_length(name) <= 200);

-- 8. Task Comments: texto não pode ser vazio
ALTER TABLE public.task_comments
ADD CONSTRAINT task_comments_text_not_blank
CHECK (trim(text) <> '');

-- 9. Task Comments: texto com tamanho máximo (5000 chars)
ALTER TABLE public.task_comments
ADD CONSTRAINT task_comments_text_max_length
CHECK (char_length(text) <= 5000);

-- 10. Task Comments: autor não pode ser vazio
ALTER TABLE public.task_comments
ADD CONSTRAINT task_comments_author_not_blank
CHECK (trim(author) <> '');

-- 11. Events: título não pode ser vazio
ALTER TABLE public.events
ADD CONSTRAINT events_title_not_blank
CHECK (trim(title) <> '');

-- 12. Events: título com tamanho máximo
ALTER TABLE public.events
ADD CONSTRAINT events_title_max_length
CHECK (char_length(title) <= 255);

-- 13. Events: validar tipo
ALTER TABLE public.events
ADD CONSTRAINT events_type_check
CHECK (type IN ('pauta', 'cobertura', 'evento', 'reuniao', 'outro'));

-- 14. Suggestions: título não pode ser vazio
ALTER TABLE public.suggestions
ADD CONSTRAINT suggestions_title_not_blank
CHECK (trim(title) <> '');

-- 15. Suggestions: descrição não pode ser vazia
ALTER TABLE public.suggestions
ADD CONSTRAINT suggestions_description_not_blank
CHECK (trim(description) <> '');

-- 16. Suggestions: status válido
ALTER TABLE public.suggestions
ADD CONSTRAINT suggestions_status_check
CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected'));

-- 17. News: título não pode ser vazio
ALTER TABLE public.news
ADD CONSTRAINT news_title_not_blank
CHECK (trim(title) <> '');

-- 18. News: título com tamanho máximo
ALTER TABLE public.news
ADD CONSTRAINT news_title_max_length
CHECK (char_length(title) <= 300);

-- 19. News: body não pode ser vazio
ALTER TABLE public.news
ADD CONSTRAINT news_body_not_blank
CHECK (trim(body) <> '');

-- 20. News: categoria válida
ALTER TABLE public.news
ADD CONSTRAINT news_category_check
CHECK (category IN ('Avisos Gerais', 'Diretrizes', 'Equipe', 'Eventos', 'Demandas', 'Outros'));

COMMIT;
