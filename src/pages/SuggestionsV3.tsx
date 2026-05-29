import { useState, useRef } from 'react';
import { 
    Send, Clock, User, Building, CheckCircle2, XCircle, Eye, 
    X, FileText, Image, Video, Trash2, CloudUpload, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './SuggestionsV3.css';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { sanitizeText } from '../utils/sanitize';
import FileViewer from '../components/FileViewer';
import type { Attachment } from '../types/kanban';

const ACCEPTED_TYPES = 'image/*,video/*,.pdf,.doc,.docx,.txt';
const MAX_FILE_SIZE_MB = 50;

function getFileIcon(file: File) {
    if (file.type.startsWith('image/')) return <Image size={14} />;
    if (file.type.startsWith('video/')) return <Video size={14} />;
    return <FileText size={14} />;
}

export default function SuggestionsV3() {
    const { suggestions, secretarias, loading, addSuggestion, addTask, deleteSuggestion } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'desenvolvedor';

    // Form States
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [department, setDepartment] = useState('');
    const [author, setAuthor] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // List Filters and Statuses
    const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
    const [viewingFile, setViewingFile] = useState<Attachment | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    
    // Inbox Filters
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterSec, setFilterSec] = useState<string>('');

    // Feedbacks
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [fileSizeError, setFileSizeError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Drag & Drop Handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files || []);
        processFiles(files);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        processFiles(files);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const processFiles = (files: File[]) => {
        const oversized = files.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
        if (oversized.length > 0) {
            setFileSizeError(`"${oversized[0].name}" é muito grande. Máximo ${MAX_FILE_SIZE_MB}MB.`);
            setTimeout(() => setFileSizeError(''), 4000);
        }
        const valid = files.filter(f => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024);
        setAttachments(prev => [...prev, ...valid]);
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
                    attachments: [],
                    comments: [],
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
            case 'pending': 
                return (
                    <span className="status-badge pending">
                        <span className="status-dot-pulse orange"></span>
                        <Clock size={11} /> Pendente
                    </span>
                );
            case 'reviewed': 
                return (
                    <span className="status-badge reviewed">
                        <span className="status-dot-pulse blue"></span>
                        <Eye size={11} /> Em Análise
                    </span>
                );
            case 'approved': 
                return (
                    <span className="status-badge approved">
                        <span className="status-dot-pulse green"></span>
                        <CheckCircle2 size={11} /> Aprovada
                    </span>
                );
            case 'rejected': 
                return (
                    <span className="status-badge rejected">
                        <span className="status-dot-pulse crimson"></span>
                        <XCircle size={11} /> Reprovada
                    </span>
                );
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

    // Filter Suggestions List
    const filteredSuggestions = suggestions.filter((s: any) => {
        const currentStatus = localStatuses[s.id] || s.status;
        
        if (filterStatus && currentStatus !== filterStatus) return false;
        if (filterSec && s.department !== filterSec) return false;
        
        return true;
    });

    return (
        <div className="page-container suggestions-v3-page">
            
            {/* Header Panel */}
            <div className="suggestions-v3-header glass">
                <div className="suggestions-v3-title-box">
                    <div className="glow-icon-box">
                        <Send size={22} className="text-primary pulse-sparkle" />
                    </div>
                    <div>
                        <h1>Caixa de Sugestões de Pauta <span className="beta-tag">v3.0 Beta</span></h1>
                        <p className="subtitle">Espaço para secretarias proporem novas pautas. Administradores podem analisar e aprovar.</p>
                    </div>
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="suggestions-v3-layout">
                
                {/* ── Formulário de Envio (Esquerda) ── */}
                {user?.role !== 'viewer' ? (
                    <div className="suggestions-v3-form-wrapper glass">
                        <div className="form-header-box">
                            <Sparkles size={16} className="text-primary" />
                            <h2>Enviar Nova Sugestão</h2>
                        </div>
                        <p className="form-sub-hint">
                            Forneça as informações fundamentais da sua ideia. A equipe do Comunica Hub receberá uma notificação em tempo real para avaliação.
                        </p>

                        <form className="suggestion-v3-form" onSubmit={handleSubmit}>
                            <div className="form-group-v3">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Sparkles size={14} className="text-primary" />
                                    Título da Sugestão / Assunto Principal *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: Lançamento da Campanha de Vacinação Infantil 2026"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                />
                                <span className="field-help-text" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                    Defina um título claro e direto para facilitar a triagem pela equipe.
                                </span>
                            </div>

                            <div className="form-row-v3">
                                <div className="form-group-v3 flex-1">
                                    <label>Secretaria Solicitante *</label>
                                    <select
                                        value={department}
                                        onChange={e => setDepartment(e.target.value)}
                                        required
                                    >
                                        <option value="">Selecione a secretaria...</option>
                                        {secretarias.map(sec => (
                                            <option key={sec.id} value={sec.nome}>{sec.nome}</option>
                                        ))}
                                    </select>
                                    <span className="field-help-text" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                        Secretaria responsável pela pauta.
                                    </span>
                                </div>
                                <div className="form-group-v3 flex-1">
                                    <label>Nome do Solicitante (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: João da Silva - Assessor"
                                        value={author}
                                        onChange={e => setAuthor(e.target.value)}
                                    />
                                    <span className="field-help-text" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                        Caso queira se identificar para dúvidas.
                                    </span>
                                </div>
                            </div>

                            <div className="form-group-v3">
                                <label>Detalhamento e Briefing da Proposta *</label>
                                <textarea
                                    rows={4}
                                    placeholder="Descreva a pauta detalhadamente: o que motivou a ação? Qual o público-alvo? Onde e quando ocorrerá? Há autoridades convidadas?"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    required
                                ></textarea>
                                <span className="field-help-text" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                    Insira o máximo de informações possíveis para agilizar o processo de criação de pauta.
                                </span>
                            </div>

                            {/* Dropzone Attachment */}
                            <div className="form-group-v3">
                                <label>Anexar Materiais de Apoio (Opcional)</label>
                                <p className="file-format-hint">
                                    Arraste e solte fotos de referência, PDFs com cronogramas ou arquivos de texto de até {MAX_FILE_SIZE_MB}MB.
                                </p>

                                <div 
                                    className={`suggestions-v3-dropzone ${isDragging ? 'dragging' : ''} ${attachments.length > 0 ? 'has-files' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <CloudUpload size={28} className="dropzone-icon" />
                                    <span>
                                        {isDragging ? 'Pode soltar os arquivos aqui!' : 'Arraste arquivos aqui ou clique para buscar no computador'}
                                    </span>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={ACCEPTED_TYPES}
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                    />
                                </div>

                                {/* Uploaded Mini Cards list */}
                                {attachments.length > 0 && (
                                    <div className="dropzone-file-list">
                                        {attachments.map((file, i) => (
                                            <div key={i} className="dropzone-file-card glass">
                                                <div className="file-card-icon-box">
                                                    {getFileIcon(file)}
                                                </div>
                                                <div className="file-card-details">
                                                    <span className="file-card-name" title={file.name}>
                                                        {file.name}
                                                    </span>
                                                    <span className="file-card-size">
                                                        {(file.size / 1024 / 1024).toFixed(1)} MB
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFile(i);
                                                    }}
                                                    className="file-card-remove-btn"
                                                    title="Remover arquivo"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button 
                                type="submit" 
                                className="btn-primary-v3 submit-suggestion-btn" 
                                disabled={uploading}
                                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
                            >
                                {uploading ? (
                                    <>
                                        <span className="loading-spinner-v3" /> Processando Envio...
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} /> Submeter Proposta de Pauta Premium
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="suggestions-v3-form-wrapper glass view-only-state">
                        <div className="view-only-icon-box">
                            <Eye size={28} />
                        </div>
                        <h3>Modo de Visualização</h3>
                        <p>
                            Seu usuário possui perfil de consulta geral. O envio de novas sugestões está desativado para o seu nível de permissão.
                        </p>
                    </div>
                )}

                {/* ── Caixa de Entrada (Direita) ── */}
                <div className="suggestions-v3-inbox">
                    
                    {/* Inbox Filters */}
                    <div className="inbox-v3-filter-panel glass">
                        <div className="inbox-filter-title">
                            <h3>Caixa de Entrada</h3>
                            <span className="inbox-counter-badge">{filteredSuggestions.length}</span>
                        </div>

                        <div className="inbox-filters-row">
                            <select 
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="inbox-filter-select"
                            >
                                <option value="">Todos os Status</option>
                                <option value="pending">Pendentes</option>
                                <option value="reviewed">Em Análise</option>
                                <option value="approved">Aprovadas</option>
                                <option value="rejected">Reprovadas</option>
                            </select>

                            <select 
                                value={filterSec}
                                onChange={e => setFilterSec(e.target.value)}
                                className="inbox-filter-select"
                            >
                                <option value="">Todas as Secretarias</option>
                                {secretarias.map(sec => (
                                    <option key={sec.id} value={sec.nome}>{sec.nome}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Inbox Items Scroll List */}
                    <div className="inbox-v3-scroll-list">
                        {loading && <p className="inbox-empty-hint">Buscando sugestões no banco...</p>}
                        {!loading && filteredSuggestions.length === 0 && (
                            <div className="inbox-empty-hint">
                                <Clock size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                                <p>Nenhuma sugestão encontrada com os filtros selecionados.</p>
                            </div>
                        )}
                        {!loading && filteredSuggestions.map((suggestion: any) => {
                            const currentStatus = localStatuses[suggestion.id] || suggestion.status;
                            const urls: string[] = suggestion.attachments || [];
                            
                            return (
                                <div
                                    key={suggestion.id}
                                    className={`suggestion-v3-card glass status-${currentStatus}`}
                                >
                                    {/* Header */}
                                    <div className="suggestion-v3-header-card">
                                        {getStatusBadge(currentStatus)}
                                        <span className="suggestion-v3-date">
                                            {format(new Date(suggestion.date), "dd MMM, HH:mm", { locale: ptBR })}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="suggestion-v3-title">
                                        {sanitizeText(suggestion.title)}
                                    </h3>

                                    {/* Department Badge */}
                                    {suggestion.department && (
                                        <div className="suggestion-v3-dep-badge">
                                            <Building size={11} />
                                            <span>{suggestion.department}</span>
                                        </div>
                                    )}

                                    {/* Description */}
                                    <p className="suggestion-v3-desc">{suggestion.description}</p>

                                    {/* Attachments grid */}
                                    {urls.length > 0 && (
                                        <div className="suggestion-v3-attachments-area">
                                            {urls.map((url, i) => (
                                                isImage(url) ? (
                                                    <div 
                                                        key={i} 
                                                        onClick={() => openAttachment(url)}
                                                        className="attachment-v3-img-card"
                                                    >
                                                        <img src={url} alt={`anexo-${i}`} />
                                                    </div>
                                                ) : isVideo(url) ? (
                                                    <button 
                                                        key={i} 
                                                        onClick={() => openAttachment(url)}
                                                        className="btn-secondary small attachment-v3-button"
                                                    >
                                                        <Video size={12} />
                                                        <span>Ver Vídeo</span>
                                                    </button>
                                                ) : (
                                                    <button 
                                                        key={i} 
                                                        onClick={() => openAttachment(url)}
                                                        className="btn-secondary small attachment-v3-button"
                                                    >
                                                        <FileText size={12} />
                                                        <span>{isPDF(url) ? 'PDF' : 'Arquivo'}</span>
                                                    </button>
                                                )
                                            ))}
                                        </div>
                                    )}

                                    {/* Sub-Footer */}
                                    <div className="suggestion-v3-subfooter">
                                        {suggestion.author && (
                                            <div className="author-meta">
                                                <User size={12} />
                                                <span>{suggestion.author}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Admin Actions Bar */}
                                    {isAdmin && (currentStatus === 'pending' || currentStatus === 'reviewed') && (
                                        <div className="suggestion-v3-actions-bar">
                                            {currentStatus === 'pending' && (
                                                <button
                                                    className="btn-secondary small btn-action-beta inline-action-btn"
                                                    onClick={() => updateSuggestionStatus(suggestion.id, 'reviewed')}
                                                >
                                                    <Eye size={13} />
                                                    <span>Análise</span>
                                                </button>
                                            )}
                                            <button
                                                className="btn-primary small inline-action-btn approve"
                                                onClick={() => updateSuggestionStatus(suggestion.id, 'approved', suggestion)}
                                            >
                                                <CheckCircle2 size={13} />
                                                <span>Aprovar</span>
                                            </button>
                                            <button
                                                className="btn-secondary small inline-action-btn reject"
                                                onClick={() => updateSuggestionStatus(suggestion.id, 'rejected')}
                                            >
                                                <XCircle size={13} />
                                                <span>Reprovar</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Definite Deletion for Developer */}
                                    {user?.role === 'desenvolvedor' && (
                                        <div className="suggestion-v3-delete-row">
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(suggestion.id)}
                                                className="definite-delete-btn"
                                            >
                                                <Trash2 size={12} />
                                                <span>Excluir Definitivamente</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                </div>

            </div>

            {/* Viewer Modal */}
            {viewingFile && (
                <FileViewer
                    attachment={viewingFile}
                    attachments={suggestions.find(s => s.attachments?.some((a: any) => a.id === viewingFile.id))?.attachments || [viewingFile]}
                    onClose={() => setViewingFile(null)}
                />
            )}

            {/* Custom Glowing Feedbacks */}
            {(submitSuccess || submitError || fileSizeError) && (
                <div className={`custom-feedback-toast glass ${submitSuccess ? 'success' : 'error'}`}>
                    {submitSuccess ? (
                        <>
                            <span>✅</span>
                            <span>Sugestão enviada com sucesso! Os administradores foram notificados.</span>
                        </>
                    ) : (
                        <>
                            <span>⚠️</span>
                            <span>{submitError || fileSizeError}</span>
                        </>
                    )}
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {confirmDeleteId && (
                <div className="copy-modal-overlay" onClick={() => setConfirmDeleteId(null)}>
                    <div className="delete-confirm-card glass" onClick={e => e.stopPropagation()}>
                        <h3>Confirmar Exclusão</h3>
                        <p>Esta ação apagará permanentemente a sugestão enviada. Esta operação é irreversível. Tem certeza?</p>
                        <div className="delete-confirm-actions">
                            <button 
                                className="btn-secondary" 
                                onClick={() => setConfirmDeleteId(null)}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="btn-danger" 
                                onClick={handleDeleteConfirmed}
                            >
                                Excluir Permanentemente
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
