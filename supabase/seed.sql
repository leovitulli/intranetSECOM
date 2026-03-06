-- Inserir Usuários Mockados com IDs FIXOS
INSERT INTO public.users (id, name, role, email) VALUES
('11111111-1111-1111-1111-111111111111', 'Carlos (Vídeo)', 'Cinegrafista', 'carlos@secom.gov'),
('22222222-2222-2222-2222-222222222222', 'Ana (Foto)', 'Fotógrafa', 'ana@secom.gov'),
('33333333-3333-3333-3333-333333333333', 'Rafael (Texto)', 'Jornalista', 'rafael@secom.gov'),
('44444444-4444-4444-4444-444444444444', 'Julia (Social)', 'Social Media', 'julia@secom.gov'),
('55555555-5555-5555-5555-555555555555', 'João Silva', 'Designer', 'joao@secom.gov'),
('66666666-6666-6666-6666-666666666666', 'Ana Lima', 'Designer', 'analima@secom.gov'),
('77777777-7777-7777-7777-777777777777', 'Maria Ferreira', 'Jornalista', 'maria@secom.gov'),
('88888888-8888-8888-8888-888888888888', 'João Motorista', 'Motorista', NULL),
('99999999-9999-9999-9999-999999999999', 'Pedro Motorista', 'Motorista', NULL)
ON CONFLICT (id) DO NOTHING;

-- Inserir Tasks Mockadas
INSERT INTO public.tasks (id, title, description, status, priority, type, creator, due_date) VALUES
('aaaa1111-1111-1111-1111-111111111111', 'Release: Evento de Aniversário da Cidade', 'Texto para a imprensa sobre as comemorações que ocorrerão no próximo final de semana na praça central.', 'solicitado', 'media', '{release}', 'Diretoria de Imprensa', now() + interval '3 days'),
('bbbb2222-2222-2222-2222-222222222222', 'Artes Redes Sociais: Campanha de Vacinação', 'Carrossel de 4 imagens para Instagram detalhando os grupos prioritários e locais de vacinação.', 'producao', 'alta', '{arte, release}', 'Sec. de Saúde', now() + interval '1 day'),
('cccc3333-3333-3333-3333-333333333333', 'Vídeo Entrevista Prefeito: Obras da Rodoviária', 'Vídeo curto de 1 minuto para Reels/TikTok com as atualizações da obra. Necessário correção no lettering aos 0:45s.', 'correcao', 'alta', '{video}', 'Gabinete', now()),
('dddd4444-4444-4444-4444-444444444444', 'Post: Novo Horário do Posto de Saúde', 'Postagem única informando a extensão de horário da UBS do bairro Centro.', 'publicado', 'baixa', '{arte}', 'Sec. de Saúde', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- Vincular Assignees (Responsáveis pelas tasks)
-- Task B (Campanha de Vacinação)
INSERT INTO public.task_assignees (task_id, user_id) VALUES 
('bbbb2222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555') -- João Silva
ON CONFLICT DO NOTHING;

-- Task C (Vídeo Prefeito)
INSERT INTO public.task_assignees (task_id, user_id) VALUES 
('cccc3333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777'), -- Maria Ferreira
('cccc3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111') -- Carlos (Vídeo)
ON CONFLICT DO NOTHING;

-- Task D (Post Posto de Saúde)
INSERT INTO public.task_assignees (task_id, user_id) VALUES 
('dddd4444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666') -- Ana Lima
ON CONFLICT DO NOTHING;

-- Inserindo Agenda / Eventos Mockados
INSERT INTO public.events (id, title, date, time, location, type) VALUES
('eeee1111-1111-1111-1111-111111111111', 'Coletiva Imprensa - Vacinação', CURRENT_DATE, '10:00', 'Paço Municipal', 'pauta'),
('ffff2222-2222-2222-2222-222222222222', 'Gravação Rodoviária Velha', CURRENT_DATE + interval '1 day', '09:00', 'Rodoviária Centro', 'video'),
('10101010-1010-1010-1010-101010101010', 'Fotos - Novas UBS', CURRENT_DATE + interval '2 days', '14:00', 'Bairro Jardim América', 'foto')
ON CONFLICT (id) DO NOTHING;

-- Vincular equipe aos eventos (attendees)
INSERT INTO public.event_attendees (event_id, user_id) VALUES
('eeee1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'), -- Ana
('eeee1111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333'), -- Rafael
('eeee1111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888'), -- João Motorista
('ffff2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'), -- Carlos
('ffff2222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999999'), -- Pedro Motorista
('10101010-1010-1010-1010-101010101010', '22222222-2222-2222-2222-222222222222')  -- Ana
ON CONFLICT DO NOTHING;
