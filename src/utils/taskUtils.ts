import type { Task } from '../types/kanban';

export const formatTaskFromDb = (t: any): Task => {
    let secretarias: string[] = [];
    if (t.inauguracao_secretarias) {
        if (typeof t.inauguracao_secretarias === 'string') {
            try {
                const parsed = JSON.parse(t.inauguracao_secretarias);
                secretarias = Array.isArray(parsed) ? parsed : [String(parsed)];
            } catch {
                secretarias = t.inauguracao_secretarias.split(',').map((s: string) => s.trim());
            }
        } else if (Array.isArray(t.inauguracao_secretarias)) {
            secretarias = t.inauguracao_secretarias;
        }
    }

    return {
        id: t.id,
        title: t.title,
        description: t.description || '',
        status: t.status as Task['status'],
        type: t.type || [],
        creator: t.creator || 'Desconhecido',
        priority: t.priority as Task['priority'] || 'baixa',
        dueDate: t.due_date ? new Date(t.due_date) : null,
        assignees: t.task_assignees?.map((a: any) => a.users?.name).filter(Boolean) || [],
        comments: t.comments || [],
        attachments: t.attachments || [],
        archived: t.archived || false,
        archived_at: t.archived_at ? new Date(t.archived_at) : null,
        createdAt: t.created_at ? new Date(t.created_at) : new Date(),
        
        // Inauguração
        inauguracao_nome: t.inauguracao_nome,
        inauguracao_endereco: t.inauguracao_endereco,
        inauguracao_secretarias: secretarias,
        inauguracao_tipo: t.inauguracao_tipo,
        inauguracao_checklist: t.inauguracao_checklist,
        inauguracao_data: t.inauguracao_data ? new Date(t.inauguracao_data + 'T12:00:00') : null,

        // Pauta Externa
        pauta_data: t.pauta_data,
        pauta_horario: t.pauta_horario,
        pauta_endereco: t.pauta_endereco,
        pauta_saida: t.pauta_saida,
        is_pauta_externa: t.is_pauta_externa || false,

        // Vídeo
        video_captacao_equipe: t.video_captacao_equipe || [],
        video_captacao_data: t.video_captacao_data ? new Date(t.video_captacao_data + 'T12:00:00') : null,
        video_edicao_equipe: t.video_edicao_equipe || [],
        video_edicao_data: t.video_edicao_data ? new Date(t.video_edicao_data + 'T12:00:00') : null,
        video_briefing: t.video_briefing,
        video_necessidades: t.video_necessidades || [],
        video_entrega_data: t.video_entrega_data ? new Date(t.video_entrega_data + 'T12:00:00') : null,

        // Arte
        arte_tipo_pecas: t.arte_tipo_pecas,
        arte_entrega_data: t.arte_entrega_data ? new Date(t.arte_entrega_data + 'T12:00:00') : null,

        // Post
        post_criacao_texto: t.post_criacao_texto,
        post_criacao_corrigido: t.post_criacao_corrigido || false,
        post_aprovado: t.post_aprovado || false,
        post_alterado_texto: t.post_alterado_texto,
        post_data_postagem: t.post_data_postagem,
        post_horario_postagem: t.post_horario_postagem,
        post_reprovado: t.post_reprovado || false,
        post_reprovado_comentario: t.post_reprovado_comentario,
        post_material_solicitado: t.post_material_solicitado || []
    };
};
