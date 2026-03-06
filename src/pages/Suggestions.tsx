import { useState, useRef } from 'react';
import { Send, Clock, User, Building, CheckCircle2, XCircle, Eye, Paperclip, X, FileText, Image, Video } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Suggestions.css';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

const ACCEPTED_TYPES = 'image/*,video/*,.pdf,.doc,.docx,.txt';
const MAX_FILE_SIZE_MB = 50;

function getFileIcon(file: File) {
    if (file.type.startsWith('image/')) return <Image size={14} />;
    if (file.type.startsWith('video/')) return <Video size={14} />;
    return <FileText size={14} />;
}

export default function Suggestions() {
    const { suggestions, loading, addSuggestion, addTask } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'desenvolvedor';

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [department, setDepartment] = useState('');
    const [author, setAuthor] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const valid = files.filter(f => {
            if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                alert(`"${f.name}" é muito grande. Máximo ${MAX_FILE_SIZE_MB}MB.`);
                return false;
            }
            return true;
        });
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
            alert('Sugestão enviada com sucesso! Os responsáveis foram notificados.');
        } catch (err: any) {
            alert(`Erro ao enviar sugestão: ${err.message}`);
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
                    dueDate: null
                });
            } catch (e) {
                console.warn('Não foi possível criar pauta a partir da sugestão', e);
            }
        }
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
                                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                                        <img src={url} alt={`anexo-${i}`} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid hsl(var(--color-border))' }} />
                                                    </a>
                                                ) : isVideo(url) ? (
                                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', padding: '4px 8px', borderRadius: 6, border: '1px solid hsl(var(--color-border))', background: 'hsl(var(--color-background))', color: 'hsl(var(--color-primary))' }}>
                                                        <Video size={13} /> Ver vídeo
                                                    </a>
                                                ) : (
                                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', padding: '4px 8px', borderRadius: 6, border: '1px solid hsl(var(--color-border))', background: 'hsl(var(--color-background))', color: 'hsl(var(--color-text))' }}>
                                                        <FileText size={13} /> Documento
                                                    </a>
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
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
