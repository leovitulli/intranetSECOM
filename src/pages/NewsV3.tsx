import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, Calendar, Trash2, Pin, X, ChevronDown, Search, Sparkles, UploadCloud } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { sanitizeText, sanitizeHTML } from '../utils/sanitize';
import './NewsV3.css';

interface NewsItem {
    id: string;
    title: string;
    body: string;
    category: string;
    author_name: string;
    author_id: string | null;
    pinned: boolean;
    image_url?: string | null;
    image_position?: string | null;
    created_at: string;
}

const CATEGORIES = [
    'Avisos Gerais',
    'Diretrizes',
    'Equipe',
    'Eventos',
    'Demandas',
    'Outros',
];

export default function NewsV3() {
    const { user } = useAuth();
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterCategory, setFilterCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Form state
    const [formTitle, setFormTitle] = useState('');
    const [formBody, setFormBody] = useState('');
    const [formCategory, setFormCategory] = useState('Avisos Gerais');
    const [formPinned, setFormPinned] = useState(false);
    const [formFile, setFormFile] = useState<File | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const canManage = user?.role === 'admin' || user?.role === 'desenvolvedor';

    // Drag-to-reposition state
    const [imgPositions, setImgPositions] = useState<Record<string, { x: number; y: number }>>({});
    const dragging = useRef<{ id: string; startX: number; startY: number; posX: number; posY: number } | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const getPos = (item: NewsItem) => {
        if (imgPositions[item.id]) return imgPositions[item.id];
        if (item.image_position) {
            const parts = item.image_position.split(' ');
            return { x: parseFloat(parts[0]) || 50, y: parseFloat(parts[1]) || 50 };
        }
        return { x: 50, y: 50 };
    };

    const currentDragPos = useRef<{ x: number; y: number } | null>(null);

    const handleImgMouseDown = (e: React.MouseEvent, item: NewsItem) => {
        if (!canManage) return;
        e.preventDefault();
        const pos = getPos(item);
        currentDragPos.current = { x: pos.x, y: pos.y };
        dragging.current = { id: item.id, startX: e.clientX, startY: e.clientY, posX: pos.x, posY: pos.y };
        setDraggingId(item.id);
        
        const onMove = (ev: MouseEvent) => {
            if (!dragging.current) return;
            const dx = ((ev.clientX - dragging.current.startX) / 300) * -100;
            const dy = ((ev.clientY - dragging.current.startY) / 200) * -100;
            const nx = Math.min(100, Math.max(0, dragging.current.posX + dx));
            const ny = Math.min(100, Math.max(0, dragging.current.posY + dy));
            currentDragPos.current = { x: nx, y: ny };
            setImgPositions(prev => ({ ...prev, [dragging.current!.id]: { x: nx, y: ny } }));
        };
        
        const onUp = async () => {
            if (!dragging.current) return;
            const id = dragging.current.id;
            const finalPos = currentDragPos.current;
            if (finalPos) {
                await supabase.from('news').update({ image_position: `${finalPos.x} ${finalPos.y}` }).eq('id', id);
            }
            dragging.current = null;
            currentDragPos.current = null;
            setDraggingId(null);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const fetchNews = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('news')
            .select('*')
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false });
        if (!error && data) setNews(data as NewsItem[]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchNews(); }, [fetchNews]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim() || !formBody.trim()) {
            setFormError('Título e conteúdo são obrigatórios.');
            return;
        }
        setSubmitting(true);
        setFormError('');

        let image_url: string | null = null;
        if (formFile) {
            const ext = formFile.name.split('.').pop();
            const fileName = `${Date.now()}.${ext}`;
            const { data: uploaded, error: uploadErr } = await supabase.storage
                .from('news-assets')
                .upload(fileName, formFile, { upsert: true });
            if (uploadErr) {
                setFormError(`Erro ao enviar arquivo: ${uploadErr.message}`);
                setSubmitting(false);
                return;
            }
            const { data: pub } = supabase.storage.from('news-assets').getPublicUrl(uploaded.path);
            image_url = pub.publicUrl;
        }

        const { error } = await supabase.from('news').insert([{
            title: formTitle.trim(),
            body: formBody.trim(),
            category: formCategory,
            author_name: user?.name || 'Desconhecido',
            author_id: user?.id || null,
            pinned: formPinned,
            image_url,
        }]);
        setSubmitting(false);
        if (error) {
            setFormError('Erro ao publicar. Tente novamente.');
            return;
        }
        setShowModal(false);
        setFormTitle(''); setFormBody(''); setFormCategory('Avisos Gerais'); setFormPinned(false); setFormFile(null);
        fetchNews();
    };

    const handleDelete = async (id: string) => {
        setConfirmDeleteId(id);
    };

    const handleDeleteConfirmed = async () => {
        if (!confirmDeleteId) return;
        await supabase.from('news').delete().eq('id', confirmDeleteId);
        setNews(prev => prev.filter(n => n.id !== confirmDeleteId));
        setConfirmDeleteId(null);
    };

    const handleTogglePin = async (item: NewsItem) => {
        await supabase.from('news').update({ pinned: !item.pinned }).eq('id', item.id);
        fetchNews();
    };

    const filtered = useMemo(() => {
        let result = news;
        
        if (filterCategory) {
            result = result.filter(n => n.category === filterCategory);
        }
        
        if (searchQuery) {
            const normalize = (str: string) => 
                str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const q = normalize(searchQuery);
            result = result.filter(n => 
                normalize(n.title).includes(q) || 
                normalize(n.body).includes(q) ||
                normalize(n.author_name).includes(q)
            );
        }
        
        return result;
    }, [news, filterCategory, searchQuery]);

    return (
        <div className="page-container news-v3-container">
            {/* Header Panel */}
            <div className="news-v3-header glass">
                <div className="news-v3-title-box">
                    <div className="glow-icon-box">
                        <Sparkles size={22} className="text-primary pulse-sparkle" />
                    </div>
                    <div>
                        <h1>Mural de Comunicação <span className="beta-tag">v3.0 Beta</span></h1>
                        <p className="subtitle">Avisos importantes, diretrizes e informes internos para a equipe.</p>
                    </div>
                </div>

                {/* Filters Area */}
                <div className="news-v3-controls">
                    <div className="search-v3-wrapper">
                        <Search size={16} className="search-v3-icon" />
                        <input
                            type="text"
                            placeholder="Buscar no mural..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <button className="btn-primary v3-new-btn" onClick={() => setShowModal(true)}>
                        <Plus size={16} />
                        <span>Novo Informe</span>
                    </button>
                </div>
            </div>

            {/* Category Filter Tabs (Chips Style) */}
            <div className="news-v3-categories-scroll">
                <div className="news-v3-categories-chips">
                    <button
                        className={`category-chip ${filterCategory === '' ? 'active' : ''}`}
                        onClick={() => setFilterCategory('')}
                    >
                        📢 Todos
                    </button>
                    {CATEGORIES.map(c => {
                        const iconMap: Record<string, string> = {
                            'Avisos Gerais': '🔔',
                            'Diretrizes': '📑',
                            'Equipe': '👥',
                            'Eventos': '📅',
                            'Demandas': '⚡',
                            'Outros': '🔮'
                        };
                        return (
                            <button
                                key={c}
                                className={`category-chip ${filterCategory === c ? 'active' : ''}`}
                                onClick={() => setFilterCategory(c)}
                            >
                                {iconMap[c] || '◽'} {c}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Feed Content */}
            {loading ? (
                <div className="news-v3-loading">
                    <span className="loading-spinner-v3"></span>
                    <p>Buscando comunicados do banco...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="news-v3-empty-state glass">
                    <Calendar size={40} style={{ opacity: 0.25, marginBottom: 12 }} />
                    <h3>Nenhum informe encontrado</h3>
                    <p>Tente alterar o filtro ou crie um novo comunicado para inaugurar esta categoria.</p>
                </div>
            ) : (
                <div className="news-v3-grid">
                    {filtered.map((item: NewsItem) => {
                        const isExpanded = expandedId === item.id;
                        const isLong = item.body.length > 220;
                        const displayBody = isLong && !isExpanded ? item.body.slice(0, 220) + '…' : item.body;
                        const pos = getPos(item);
                        
                        return (
                            <article 
                                key={item.id} 
                                className={`news-v3-card glass ${item.pinned ? 'is-pinned' : ''}`}
                            >
                                <div className="card-top-glow"></div>
                                
                                <div className="news-v3-card-content">
                                    {/* Header details */}
                                    <div className="news-v3-card-header">
                                        <span className="news-v3-card-category-badge">
                                            {item.category}
                                        </span>
                                        {item.pinned && (
                                            <span className="news-v3-card-pinned-badge">
                                                <Pin size={11} /> FIXADO NO TOPO
                                            </span>
                                        )}
                                    </div>

                                    {/* Cover image area */}
                                    {item.image_url && (
                                        <div
                                            className={`news-v3-card-image-box ${draggingId === item.id ? 'is-dragging' : ''}`}
                                            onMouseDown={e => handleImgMouseDown(e, item)}
                                            title={canManage ? 'Clique e arraste para alinhar a foto verticalmente' : undefined}
                                        >
                                            <img
                                                src={item.image_url}
                                                alt={item.title}
                                                style={{ 
                                                    objectPosition: `${pos.x}% ${pos.y}%`,
                                                    userSelect: 'none', 
                                                    pointerEvents: 'none' 
                                                }}
                                            />
                                            {canManage && (
                                                <div className="news-v3-image-drag-overlay">
                                                    <div className="drag-pill">
                                                        <span>✥ Arraste para alinhar</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Title and Excerpt */}
                                    <h2 className="news-v3-card-title">{sanitizeText(item.title)}</h2>
                                    <p 
                                        className="news-v3-card-body" 
                                        style={{ whiteSpace: 'pre-wrap' }} 
                                        dangerouslySetInnerHTML={{ __html: sanitizeHTML(displayBody) }}
                                    ></p>

                                    {isLong && (
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                            className="news-v3-card-toggle-expand"
                                        >
                                            <span>{isExpanded ? 'Ver menos' : 'Ler informe completo'}</span>
                                            <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
                                        </button>
                                    )}

                                    {/* Divider */}
                                    <div className="news-v3-card-divider"></div>

                                    {/* Footer details */}
                                    <div className="news-v3-card-footer">
                                        <div className="news-v3-author-info">
                                            <div className="author-avatar-v3">
                                                {item.author_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="author-text-v3">
                                                <span className="author-name-v3">{item.author_name}</span>
                                                <span className="post-date-v3">
                                                    {format(new Date(item.created_at), "d 'de' MMM", { locale: ptBR })}
                                                </span>
                                            </div>
                                        </div>

                                        {canManage && (
                                            <div className="news-v3-card-actions">
                                                <button
                                                    onClick={() => handleTogglePin(item)}
                                                    title={item.pinned ? 'Desafixar informe' : 'Fixar informe no topo'}
                                                    className={`card-action-btn-v3 pin-btn ${item.pinned ? 'active' : ''}`}
                                                >
                                                    <Pin size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    title="Excluir comunicado"
                                                    className="card-action-btn-v3 delete-btn"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Create Modal Dialog */}
            {showModal && (
                <div className="copy-modal-overlay news-v3-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="news-v3-modal glass" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-v3">
                            <div className="modal-title-box">
                                <Sparkles size={18} className="text-primary" />
                                <h2>Publicar no Mural</h2>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <p className="modal-sub-hint">Preencha as informações para divulgar um informe institucional a toda a equipe.</p>

                        <form onSubmit={handleCreate} className="news-v3-form">
                            <div className="form-group-v3">
                                <label>Título do Informe *</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Novo Cronograma de Plantões de Fim de Ano"
                                    value={formTitle}
                                    onChange={e => setFormTitle(e.target.value)}
                                    maxLength={120}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-group-v3">
                                <label>Categoria</label>
                                <select
                                    value={formCategory}
                                    onChange={e => setFormCategory(e.target.value)}
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="form-group-v3">
                                <label>Conteúdo / Comunicado *</label>
                                <textarea
                                    rows={5}
                                    placeholder="Escreva detalhadamente a mensagem que deseja transmitir à equipe..."
                                    value={formBody}
                                    onChange={e => setFormBody(e.target.value)}
                                    required
                                ></textarea>
                            </div>

                            {/* Custom File Attachment */}
                            <div className="form-group-v3">
                                <label>Anexar Capa / PDF (Opcional)</label>
                                <div className="news-v3-attachment-box">
                                    <button
                                        type="button"
                                        className="btn-secondary file-trigger-btn"
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        <UploadCloud size={16} />
                                        <span>{formFile ? formFile.name : 'Escolher arquivo...'}</span>
                                    </button>
                                    
                                    {formFile && (
                                        <button 
                                            type="button" 
                                            onClick={() => { setFormFile(null); if (fileRef.current) fileRef.current.value = ''; }} 
                                            className="remove-attachment-btn"
                                        >
                                            ✕ Remover
                                        </button>
                                    )}

                                    <input 
                                        ref={fileRef} 
                                        type="file" 
                                        accept="image/*,application/pdf" 
                                        style={{ display: 'none' }} 
                                        onChange={e => setFormFile(e.target.files?.[0] || null)} 
                                    />
                                </div>
                                <p className="file-format-hint">Formatos suportados: JPG, PNG, GIF ou PDF até 50MB.</p>
                            </div>

                            {/* Pinned Toggle */}
                            <label className="checkbox-v3-container">
                                <input
                                    type="checkbox"
                                    checked={formPinned}
                                    onChange={e => setFormPinned(e.target.checked)}
                                />
                                <span className="checkbox-v3-box"></span>
                                <span className="checkbox-v3-label">📌 Fixar no topo do mural de informes</span>
                            </label>

                            {formError && <p className="form-error-v3">{formError}</p>}

                            <div className="modal-actions-v3">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary" disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <span className="loading-spinner-v3" /> Publicando...
                                        </>
                                    ) : (
                                        <>Publicar Comunicado</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDeleteId && (
                <div className="copy-modal-overlay news-v3-modal-overlay" onClick={() => setConfirmDeleteId(null)}>
                    <div className="delete-confirm-card glass" onClick={e => e.stopPropagation()}>
                        <h3>Remover Comunicado</h3>
                        <p>Esta ação apagará permanentemente o informe selecionado de toda a equipe. Esta operação é irreversível. Tem certeza?</p>
                        <div className="delete-confirm-actions">
                            <button className="btn-secondary" onClick={() => setConfirmDeleteId(null)}>
                                Cancelar
                            </button>
                            <button className="btn-danger" onClick={handleDeleteConfirmed}>
                                Remover Permanentemente
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
