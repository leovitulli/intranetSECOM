import { useState, useRef } from 'react';
import { Send, Clock, User, Building, CheckCircle2, XCircle, Eye, Paperclip, X, FileText, Image, Video, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Suggestions.css';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import FileViewer from '../components/FileViewer';
import type { Attachment } from '../types/kanban';

const ACCEPTED_TYPES = 'image/*,video/*,.pdf,.doc,.docx,.txt';
const MAX_FILE_SIZE_MB = 50;

function getFileIcon(file: File) {
    if (file.type.startsWith('image/')) return <Image size={14} />;
    if (file.type.startsWith('video/')) return <Video size={14} />;
    return <FileText size={14} />;
}

export default function Suggestions() {
    const { suggestions, loading, addSuggestion, addTask, deleteSuggestion } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'desenvolvedor';

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [department, setDepartment] = useState('');
    const [author, setAuthor] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
    const [viewingFile, setViewingFile] = useState<Attachment | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [fileSizeError, setFileSizeError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const oversized = files.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
        if (oversized.length > 0) {
            setFileSizeError(`"${oversized[0].name}" é muito grande. Máximo ${MAX_FILE_SIZE_MB}MB.`);
            setTimeout(() => setFileSizeError(''), 4000);
        }
        const valid = files.filter(f => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024);
        setAttachments(prev => [...prev, ...valid]);
        // reset input so same file can be re-added if removed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async (files: File[]): Promise<string[]> => {
        const urls: string[] = [];
        for (const file of files) {
            const ext = file.name.split('.').pop();
            const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { error } = await supabase.storage
                .from('suggestion-attachments')
                .upload(path, file, { upsert: false });
            if (error) {
                console.warn('Erro ao fazer upload de', file.name, error.message);
                continue;
            }
            const { data } = supabase.storage
                .from('suggestion-attachments')
                .getPublicUrl(path);
            urls.push(data.publicUrl);
        }
        return urls;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description || !department) return;

        setUploading(true);
        try {
            let attachmentUrls: string[] = [];
            if (attachments.length > 0) {
                attachmentUrls = await uploadFiles(attachments);
            }

            await addSuggestion(title, description, department, author, attachmentUrls);
            setTitle('');
            setDescription('');
            setDepartment('');
            setAuthor('');
            setAttachments([]);
            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 5000);
        } catch (err: any) {
            setSubmitError(`Erro ao enviar sugestão: ${err.message}`);
            setTimeout(() => setSubmitError(''), 5000);
        } finally {
            setUploading(false);
        }
    };

    const updateSuggestionStatus = async (id: string, status: string, suggestion?: any) => {
        setLocalStatuses(prev => ({ ...prev, [id]: status }));
        await supabase.from('suggestions').update({ status }).eq('id', id);

        if (status === 'approved' && suggestion) {
            try {
                await addTask({
                    title: `[Sugestão] ${suggestion.title}`,
                    description: `**Origem:** ${suggestion.department}\n**Solicitante:** ${suggestion.author || 'Anônimo'}\n\n${suggestion.description}`,
                    status: 'solicitado',
                    type: ['release'],
                    creator: suggestion.author || suggestion.department,
                    priority: 'media',
                    assignees: [],
                    dueDate: null,
                    createdAt: new Date()
                });
            } catch (e) {
                console.warn('Não foi possível criar pauta a partir da sugestão', e);
            }
        }
    };

    const handleDelete = (id: string) => {
        setConfirmDeleteId(id);
    };

    const handleDeleteConfirmed = async () => {
        if (!confirmDeleteId) return;
        await deleteSuggestion(confirmDeleteId);
        setConfirmDeleteId(null);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <span className="status-badge pending"><Clock size={12} /> Pendente</span>;
            case 'reviewed': return <span className="status-badge reviewed"><Eye size={12} /> Em Análise</span>;
            case 'approved': return <span className="status-badge approved"><CheckCircle2 size={12} /> Aprovada</span>;
            case 'rejected': return <span className="status-badge" style={{ background: 'hsl(350, 80%, 93%)', color: 'hsl(350, 80%, 40%)', padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> Reprovada</span>;
            default: return null;
        }
    };

    const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
    const isVideo = (url: string) => /\.(mp4|mov|webm|avi|mkv)$/i.test(url);
    const isPDF = (url: string) => /\.pdf$/i.test(url);

    const openAttachment = (url: string) => {
        const name = url.split('/').pop() || 'Arquivo';
        let type = 'file';
        if (isImage(url)) type = 'image';
        else if (isVideo(url)) type = 'video';
        else if (isPDF(url)) type = 'pdf';

        setViewingFile({
            id: url,
            name,
            url,
            type,
            size: '—'
        });
    };

    return (
        <div className="page-container suggestions-page">
            <div className="page-header">
                <div>
                    <h1>Caixa de Sugestões de Pauta</h1>
                    <p className="subtitle">Espaço para secretarias enviarem solicitações de comunicação. Admins podem aprovar ou reprovar.</p>
                </div>
            </div>

            <div className="suggestions-layout">
                {/* Form Column */}
                {user?.role !== 'viewer' ? (
                    <div className="suggestions-form-wrapper glass">
                        <h2>Enviar Nova Sugestão</h2>
                        <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            Descreva sua ideia ou necessidade. A equipe de comunicação será notificada e avaliará.
                        </p>

                    <form className="suggestion-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Título / Assunto *</label>
                            <input
                                type="text"
                                placeholder="Ex: Cobertura da Feira Cultural"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group flex-1">
                                <label>Secretaria / Departamento *</label>
                                <select
                                    value={department}
                                    onChange={e => setDepartment(e.target.value)}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    <option>SVCS - Secretaria do Verde</option>
                                    <option>SVCS - Gestão de Resíduos</option>
                                    <option>SVCS - Bem-estar Animal</option>
                                    <option>SRC - Receita</option>
                                    <option>SIURB - Infraestrutura</option>
                                    <option>SCT - Cultura e Turismo</option>
                                    <option>SDH - Direitos Humanos</option>
                                    <option>SDH - Juventude</option>
                                    <option>SDH - Mulher</option>
                                    <option>SDH - Acessibilidade</option>
                                    <option>SDH - Igualdade Racial</option>
                                    <option>SDH - Diversidade</option>
                                    <option>SCTI - Tecnologia e Inovação</option>
                                    <option>SGE - Gestão</option>
                                    <option>SS - Saúde</option>
                                    <option>SE - Educação</option>
                                    <option>SDET - Des. Econômico e Trabalho</option>
                                    <option>CFSS - Fundo Social</option>
                                    <option>CPDC - Procon</option>
                                    <option>SH - Habitação</option>
                                    <option>SDS - Des. Social</option>
                                    <option>SDS - Defesa Civil</option>
                                    <option>SDS - Idoso</option>
                                    <option>SCC - Casa Civil</option>
                                    <option>CGP - Chefia de Gabinete</option>
                                    <option>SAR</option>
                                    <option>SDU</option>
                                    <option>SEL - Esportes</option>
                                    <option>SJC - Justiça</option>
                                    <option>SFI - Finanças</option>
                                    <option>SEMOB</option>
                                    <option>SJCP - Procuradoria</option>
                                    <option>Controladoria</option>
                                    <option>Ouvidoria</option>
                                    <option>Segurança</option>
                                </select>
                            </div>
                            <div className="form-group flex-1">
                                <label>Seu Nome (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Para entrarmos em contato"
                                    value={author}
                                    onChange={e => setAuthor(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Detalhes da Sugestão / Necessidade *</label>
                            <textarea
                                rows={5}
                                placeholder="Qual o objetivo? Onde vai acontecer? O que você precisa (foto, vídeo, texto)?"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                required
                            ></textarea>
                        </div>

                        {/* File Attachments */}
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Paperclip size={14} /> Anexos (opcional)
                            </label>
                            <p style={{ fontSize: '0.78rem', color: 'hsl(var(--color-text-muted))', margin: '0 0 0.5rem' }}>
                                Fotos, vídeos, PDFs ou documentos de texto. Máx. {MAX_FILE_SIZE_MB}MB por arquivo.
                            </p>

                            {/* File list */}
                            {attachments.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '0.75rem' }}>
                                    {attachments.map((file, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '6px 10px', borderRadius: 'var(--radius-md)',
                                            background: 'hsl(var(--color-background))',
                                            border: '1px solid hsl(var(--color-border))',
                                            fontSize: '0.82rem'
                                        }}>
                                            {getFileIcon(file)}
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {file.name}
                                            </span>
                                            <span style={{ color: 'hsl(var(--color-text-muted))', fontSize: '0.75rem', flexShrink: 0 }}>
                                                {(file.size / 1024 / 1024).toFixed(1)}MB
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(i)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--color-text-muted))', padding: 0, display: 'flex' }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ACCEPTED_TYPES}
                                multiple
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                            <button
                                type="button"
                                className="btn-secondary"
                                style={{ justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px', width: '100%', fontSize: '0.85rem' }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip size={15} /> Adicionar Arquivo
                            </button>
                        </div>

                        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={uploading}>
                            {uploading ? (
                                <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Enviando...</>
                            ) : (
                                <><Send size={18} /> Enviar Sugestão</>
                            )}
                        </button>
                    </form>
                </div>
                ) : (
                    <div className="suggestions-form-wrapper glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '3rem 2rem' }}>
                        <div style={{ background: 'hsl(var(--color-primary) / 0.1)', color: 'hsl(var(--color-primary))', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <Eye size={32} />
                        </div>
                        <h2 style={{ marginBottom: '0.5rem' }}>Modo Visualização</h2>
                        <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                            Seu perfil possui acesso apenas para consulta. O envio de novas sugestões de pauta não está disponível para este nível de permissão.
                        </p>
                    </div>
                )}

                {/* Inbox Column */}
                <div className="suggestions-inbox">
                    <h2>Caixa de Entrada ({suggestions.length})</h2>

                    <div className="inbox-list">
                        {loading && <p className="empty-state" style={{ padding: '1rem' }}>Carregando sugestões...</p>}
                        {!loading && suggestions.length === 0 && <p className="empty-state text-muted" style={{ padding: '1rem' }}>Nenhuma sugestão ainda.</p>}
                        {!loading && suggestions.map((suggestion: any) => {
                            const currentStatus = localStatuses[suggestion.id] || suggestion.status;
                            const urls: string[] = suggestion.attachments || [];
                            return (
                                <div
                                    key={suggestion.id}
                                    className="suggestion-card"
                                    style={{
                                        borderLeft: currentStatus === 'approved'
                                            ? '4px solid hsl(var(--color-primary))'
                                            : currentStatus === 'rejected'
                                                ? '4px solid hsl(350, 80%, 50%)'
                                                : '4px solid hsl(var(--color-border))'
                                    }}
                                >
                                    <div className="suggestion-header">
                                        {getStatusBadge(currentStatus)}
                                        <span className="suggestion-date">
                                            {format(suggestion.date, "dd MMM, HH:mm", { locale: ptBR })}
                                        </span>
                                    </div>

                                    <h3 className="suggestion-title">{suggestion.title}</h3>
                                    {suggestion.department && (
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            fontSize: '0.75rem', fontWeight: 600,
                                            padding: '3px 10px', borderRadius: '99px',
                                            background: 'hsl(var(--color-primary) / 0.1)',
                                            color: 'hsl(var(--color-primary))',
                                            border: '1px solid hsl(var(--color-primary) / 0.25)',
                                            alignSelf: 'flex-start'
                                        }}>
                                            <Building size={11} /> {suggestion.department}
                                        </span>
                                    )}
                                    <p className="suggestion-desc">{suggestion.description}</p>

                                    {/* Attachments preview */}
                                    {urls.length > 0 && (
                                        <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {urls.map((url, i) => (
                                                isImage(url) ? (
                                                    <div 
                                                        key={i} 
                                                        onClick={() => openAttachment(url)}
                                                        style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                                    >
                                                        <img src={url} alt={`anexo-${i}`} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid hsl(var(--color-border))' }} />
                                                    </div>
                                                ) : isVideo(url) ? (
                                                    <button 
                                                        key={i} 
                                                        onClick={() => openAttachment(url)}
                                                        className="btn-secondary small"
                                                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6 }}
                                                    >
                                                        <Video size={13} /> Ver vídeo
                                                    </button>
                                                ) : (
                                                    <button 
                                                        key={i} 
                                                        onClick={() => openAttachment(url)}
                                                        className="btn-secondary small"
                                                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6 }}
                                                    >
                                                        <FileText size={13} /> {isPDF(url) ? 'PDF' : 'Documento'}
                                                    </button>
                                                )
                                            ))}
                                        </div>
                                    )}

                                    <div className="suggestion-footer">
                                        <span className="meta-info">
                                            <Building size={14} /> {suggestion.department}
                                        </span>
                                        {suggestion.author && (
                                            <span className="meta-info">
                                                <User size={14} /> {suggestion.author}
                                            </span>
                                        )}
                                    </div>

                                    {/* Admin Actions */}
                                    {isAdmin && (currentStatus === 'pending' || currentStatus === 'reviewed') && (
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid hsl(var(--color-border))' }}>
                                            {currentStatus === 'pending' && (
                                                <button
                                                    className="btn-secondary small"
                                                    style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    onClick={() => updateSuggestionStatus(suggestion.id, 'reviewed')}
                                                >
                                                    <Eye size={14} /> Em Análise
                                                </button>
                                            )}
                                            <button
                                                className="btn-primary small"
                                                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                                                onClick={() => updateSuggestionStatus(suggestion.id, 'approved', suggestion)}
                                            >
                                                <CheckCircle2 size={14} /> Aprovar
                                            </button>
                                            <button
                                                className="btn-secondary small"
                                                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '4px', color: 'hsl(350, 80%, 45%)', borderColor: 'hsl(350, 80%, 75%)' }}
                                                onClick={() => updateSuggestionStatus(suggestion.id, 'rejected')}
                                            >
                                                <XCircle size={14} /> Reprovar
                                            </button>
                                        </div>
                                    )}

                                    {user?.role === 'desenvolvedor' && (
                                        <div style={{ display: 'flex', marginTop: currentStatus === 'pending' || currentStatus === 'reviewed' ? '0.5rem' : '0.75rem', paddingTop: currentStatus === 'pending' || currentStatus === 'reviewed' ? '0' : '0.75rem', borderTop: currentStatus === 'pending' || currentStatus === 'reviewed' ? 'none' : '1px solid hsl(var(--color-border))' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(suggestion.id)}
                                                style={{
                                                    background: 'none', border: 'none', color: 'hsl(var(--color-text-muted))',
                                                    fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px',
                                                    cursor: 'pointer', padding: '4px', marginLeft: 'auto', opacity: 0.7
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(350, 80%, 50%)'; e.currentTarget.style.opacity = '1'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--color-text-muted))'; e.currentTarget.style.opacity = '0.7'; }}
                                            >
                                                <Trash2 size={13} /> Excluir Definitivamente
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {viewingFile && (
                <FileViewer
                    attachment={viewingFile}
                    attachments={suggestions.find(s => s.attachments?.some((a: any) => a.id === viewingFile.id))?.attachments || [viewingFile]}
                    onClose={() => setViewingFile(null)}
                />
            )}

            {/* Toast de sucesso/erro do envio */}
            {(submitSuccess || submitError || fileSizeError) && (
                <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, borderRadius: 12, padding: '12px 20px', fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 8, background: submitSuccess ? '#ecfdf5' : '#fef2f2', border: `1px solid ${submitSuccess ? '#a7f3d0' : '#fca5a5'}`, color: submitSuccess ? '#065f46' : '#991b1b' }}>
                    {submitSuccess ? '✅ Sugestão enviada! Os responsáveis foram notificados.' : (submitError || fileSizeError)}
                </div>
            )}

            {/* Modal confirmação exclusão */}
            {confirmDeleteId && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setConfirmDeleteId(null)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: '1.75rem', maxWidth: 400, width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Excluir sugestão</h3>
                        <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#64748b' }}>Esta ação é permanente e não pode ser desfeita. Tem certeza?</p>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '8px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                            <button onClick={handleDeleteConfirmed} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
