import type { Task } from '../types/kanban';

export const INITIAL_TASKS: Task[] = [
    {
        id: '1',
        title: 'Release: Evento de Aniversário da Cidade',
        description: 'Texto para a imprensa sobre as comemorações que ocorrerão no próximo final de semana na praça central.',
        status: 'solicitado',
        type: ['release'],
        creator: 'Diretoria de Imprensa',
        priority: 'media',
        assignees: [],
        dueDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
        comments: [],
        attachments: [
            { id: 'a1', name: 'referencias_evento.pdf', url: '#', type: 'pdf', size: '2.4 MB' }
        ],
        createdAt: new Date(Date.now() - 86400000 * 5)
    },
    {
        id: '2',
        title: 'Artes Redes Sociais: Campanha de Vacinação',
        description: 'Carrossel de 4 imagens para Instagram detalhando os grupos prioritários e locais de vacinação.',
        status: 'producao',
        type: ['arte', 'release'],
        creator: 'Sec. de Saúde',
        priority: 'alta',
        assignees: ['João Silva'],
        dueDate: new Date(Date.now() + 86400000), // Tomorrow
        comments: [
            { id: 'c1', author: 'Ana Lima', avatar: 'https://ui-avatars.com/api/?name=Ana+Lima', text: 'Não esqueçam de incluir a logo do SUS e da Prefeitura na última tela!', date: new Date() },
            { id: 'c2', author: 'João Silva', avatar: 'https://ui-avatars.com/api/?name=Joao+Silva', text: 'Pode deixar, Ana! Já coloquei no grid base.', date: new Date() }
        ],
        attachments: [
            { id: 'a2', name: 'logo_prefeitura_2025.png', url: '#', type: 'image', size: '450 KB' },
            { id: 'a3', name: 'roteiro_vacinacao.docx', url: '#', type: 'doc', size: '1.2 MB' }
        ],
        createdAt: new Date(Date.now() - 86400000 * 2)
    },
    {
        id: '3',
        title: 'Vídeo Entrevista Prefeito: Obras da Rodoviária',
        description: 'Vídeo curto de 1 minuto para Reels/TikTok com as atualizações da obra. Necessário correção no lettering aos 0:45s.',
        status: 'correcao',
        type: ['video'],
        creator: 'Gabinete',
        priority: 'alta',
        assignees: ['Maria Ferreira', 'Carlos (Vídeo)'],
        dueDate: new Date(), // Today
        comments: [
            { id: 'c3', author: 'Carlos Editor', avatar: 'https://ui-avatars.com/api/?name=Carlos', text: 'Subindo o novo render com a correção do lettering.', date: new Date(Date.now() - 3600000) },
            { id: 'c4', author: 'Maria Ferreira', avatar: 'https://ui-avatars.com/api/?name=Maria', text: 'A cor da fonte ainda está um pouco apagada no vídeo. Pode colocar bold?', date: new Date(Date.now() - 1800000) }
        ],
        attachments: [
            { id: 'a4', name: 'entrevista_v2.mp4', url: '#', type: 'video', size: '45 MB' }
        ],
        createdAt: new Date(Date.now() - 3600000 * 5)
    },
    {
        id: '4',
        title: 'Post: Novo Horário do Posto de Saúde',
        description: 'Postagem única informando a extensão de horário da UBS do bairro Centro.',
        status: 'publicado',
        type: ['arte'],
        creator: 'Sec. de Saúde',
        priority: 'baixa',
        assignees: ['Ana Lima'],
        dueDate: new Date(Date.now() - 86400000), // Yesterday
        comments: [
            { id: 'c5', author: 'João Silva', avatar: 'https://ui-avatars.com/api/?name=Joao', text: 'Postado as 08h00!', date: new Date(Date.now() - 86400000) }
        ],
        attachments: [],
        createdAt: new Date(Date.now() - 86400000)
    }
];
