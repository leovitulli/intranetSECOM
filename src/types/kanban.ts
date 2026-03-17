export type TaskStatus = 'solicitado' | 'producao' | 'correcao' | 'aprovado' | 'publicado' | 'cancelado' | 'inauguracao';
export type TaskType = 'release' | 'arte' | 'video' | 'foto' | 'post' | 'inauguracao';
export type TaskPriority = 'baixa' | 'media' | 'alta';

export interface Comment {
    id: string;
    author: string;
    avatar: string;
    text: string;
    date: Date;
    tab?: string; // Para segmentação de comentários por aba
}

export interface Attachment {
    id: string;
    name: string;
    url: string;
    type: string;
    size: string;
}

export type InaugurationTipo = 'simples' | 'master';

export interface InaugurationChecklistItem {
    id: string;
    label: string;
    done: boolean;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    type: TaskType[];
    creator: string;
    priority: TaskPriority;
    assignees: string[];
    dueDate: Date | null;
    comments: Comment[];
    attachments: Attachment[];
    createdAt: Date; // Added for Productivity filtering
    archived?: boolean;
    archived_at?: Date | null;
    // Inauguration-specific fields
    inauguracao_nome?: string;
    inauguracao_endereco?: string;
    inauguracao_secretarias?: string[];
    inauguracao_tipo?: InaugurationTipo;
    inauguracao_checklist?: InaugurationChecklistItem[];
    inauguracao_data?: Date | null; // Date of the inauguration event
    // General Pauta fields
    pauta_data?: string;
    pauta_horario?: string;
    pauta_endereco?: string;
    pauta_saida?: string;
    is_pauta_externa?: boolean;
    // Video-specific fields
    video_captacao_equipe?: string[];
    video_captacao_data?: Date | null;
    video_edicao_equipe?: string[];
    video_edicao_data?: Date | null;
    video_briefing?: string;
    video_necessidades?: string[];
    video_entrega_data?: Date | null;
    arte_tipo_pecas?: string;
    arte_entrega_data?: Date | null;
}
