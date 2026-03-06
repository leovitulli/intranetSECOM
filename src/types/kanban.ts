export type TaskStatus = 'solicitado' | 'producao' | 'correcao' | 'publicado' | 'inauguracao';
export type TaskType = 'release' | 'arte' | 'video' | 'foto' | 'inauguracao';
export type TaskPriority = 'baixa' | 'media' | 'alta';

export interface Comment {
    id: string;
    author: string;
    avatar: string;
    text: string;
    date: Date;
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
    archived?: boolean;
    archived_at?: Date | null;
    // Inauguration-specific fields
    inauguracao_nome?: string;
    inauguracao_endereco?: string;
    inauguracao_secretarias?: string[];
    inauguracao_tipo?: InaugurationTipo;
    inauguracao_checklist?: InaugurationChecklistItem[];
    inauguracao_data?: Date | null; // Date of the inauguration event
}
