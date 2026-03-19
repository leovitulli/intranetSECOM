import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Calendar, Trash2, Pin, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import './News.css';

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

export default function News() {
    const { user } = useAuth();
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterCategory, setFilterCategory] = useState('');
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

    const filtered = filterCategory
        ? news.filter(n => n.category === filterCategory)
        : news;

    return (
        <div className="news-container">
            <div className="page-header">
                <div>
                    <h1>Mural de Comunicação</h1>
                    <p className="subtitle">Avisos, diretrizes e informes da equipe.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <select
                        className="edit-input-small"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        style={{ minWidth: 160, fontSize: '0.85rem' }}
                    >
                        <option value="">Todas as categorias</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} />
                        <span>Novo Informe</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <p style={{ padding: '2rem', color: 'hsl(var(--color-text-muted))' }}>Carregando informes...</p>
            ) : filtered.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--color-text-muted))' }}>
                    <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Nenhum informe publicado ainda.</p>
                    <p style={{ fontSize: '0.9rem' }}>Clique em <b>Novo Informe</b> para começar.</p>
                </div>
            ) : (
                <div className="news-grid">
                    {filtered.map(item => {
                        const isExpanded = expandedId === item.id;
                        const isLong = item.body.length > 220;
                        const displayBody = isLong && !isExpanded ? item.body.slice(0, 220) + '…' : item.body;
                        const pos = getPos(item);
                        return (
                            <article key={item.id} className="news-card">
                                <div className="news-content no-image" style={{ position: 'relative' }}>
                                    {/* Badges row */}
                                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <span className="news-category-badge-inline">{item.category}</span>
                                        {item.pinned && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 700, color: 'hsl(40, 80%, 40%)', background: 'hsl(40, 90%, 92%)', borderRadius: 99, padding: '2px 8px', border: '1px solid hsl(40, 70%, 80%)' }}>
                                                <Pin size={11} /> Fixado
                                            </span>
                                        )}
                                    </div>

                                    {item.image_url && (
                                        <div
                                            style={{ margin: '0 0 0.85rem', borderRadius: 10, overflow: 'hidden', height: 180, position: 'relative', cursor: canManage ? (draggingId === item.id ? 'grabbing' : 'grab') : 'default' }}
                                            onMouseDown={e => handleImgMouseDown(e, item)}
                                            title={canManage ? 'Arraste para reposicionar a foto' : undefined}
                                        >
                                            <img
                                                src={item.image_url}
                                                alt={item.title}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${pos.x}% ${pos.y}%`, display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                                            />
                                            {canManage && (
                                                <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '0.68rem', fontWeight: 600, padding: '2px 9px', borderRadius: 99, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                                                    ✥ Arraste para reposicionar
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <h2 className="news-title">{item.title}</h2>
                                    <p className="news-excerpt" style={{ whiteSpace: 'pre-wrap' }}>{displayBody}</p>
                                    {isLong && (
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                            style={{ background: 'none', border: 'none', color: 'hsl(var(--color-primary))', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 3 }}
                                        >
                                            {isExpanded ? 'Ver menos' : 'Ver mais'} <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                        </button>
                                    )}

                                    <div className="news-meta">
                                        <div className="news-author">
                                            <div className="author-avatar">{item.author_name.charAt(0).toUpperCase()}</div>
                                            <span>{item.author_name}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <div className="news-date">
                                                <Calendar size={14} />
                                                <span>{format(new Date(item.created_at), "d 'de' MMM", { locale: ptBR })}</span>
                                            </div>
                                            {canManage && (
                                                <>
                                                    <button
                                                        onClick={() => handleTogglePin(item)}
                                                        title={item.pinned ? 'Desafixar' : 'Fixar no topo'}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: item.pinned ? 'hsl(40, 70%, 45%)' : 'hsl(var(--color-text-muted))', padding: 2, borderRadius: 4 }}
                                                    >
                                                        <Pin size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        title="Remover informe"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--color-danger, 0, 72%, 55%))', padding: 2, borderRadius: 4 }}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" style={{ maxWidth: 560, width: '95%' }} onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                        <div className="modal-header" style={{ marginBottom: '1.25rem' }}>
                            <h2 style={{ fontSize: '1.4rem' }}>Publicar Informe</h2>
                            <p style={{ color: 'hsl(var(--color-text-muted))', fontSize: '0.875rem', marginTop: 4 }}>
                                O informe ficará visível para toda a equipe no Mural de Comunicação.
                            </p>
                        </div>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0 0.25rem' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Título *</label>
                                <input
                                    type="text"
                                    className="edit-textarea"
                                    style={{ width: '100%', marginTop: 4 }}
                                    placeholder="Ex: Reunião de pauta — sexta-feira, 9h"
                                    value={formTitle}
                                    onChange={e => setFormTitle(e.target.value)}
                                    maxLength={120}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Categoria</label>
                                <select
                                    className="edit-input-small"
                                    value={formCategory}
                                    onChange={e => setFormCategory(e.target.value)}
                                    style={{ width: '100%', marginTop: 4 }}
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Conteúdo *</label>
                                <textarea
                                    className="edit-textarea"
                                    style={{ width: '100%', minHeight: 130, resize: 'vertical', marginTop: 4 }}
                                    placeholder="Digite o conteúdo do informe..."
                                    value={formBody}
                                    onChange={e => setFormBody(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Anexar Imagem <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
                                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        📎 {formFile ? formFile.name : 'Escolher arquivo'}
                                    </button>
                                    {formFile && (
                                        <button type="button" onClick={() => { setFormFile(null); if (fileRef.current) fileRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--color-text-muted))', fontSize: '0.8rem' }}>✕ remover</button>
                                    )}
                                    <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => setFormFile(e.target.files?.[0] || null)} />
                                </div>
                                <p style={{ fontSize: '0.72rem', color: 'hsl(var(--color-text-muted))', marginTop: 4 }}>Suporta imagens (JPG, PNG, GIF) e PDF.</p>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
                                <input
                                    type="checkbox"
                                    checked={formPinned}
                                    onChange={e => setFormPinned(e.target.checked)}
                                    style={{ accentColor: 'hsl(var(--color-primary))', width: 15, height: 15 }}
                                />
                                📌 Fixar este informe no topo do mural
                            </label>
                            {formError && <p style={{ color: 'hsl(0, 72%, 50%)', fontSize: '0.85rem', margin: 0 }}>{formError}</p>}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={submitting}>
                                    {submitting ? 'Publicando…' : 'Publicar Informe'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de confirmação de exclusão */}
            {confirmDeleteId && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setConfirmDeleteId(null)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: '1.75rem', maxWidth: 380, width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Remover informe</h3>
                        <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#64748b' }}>Tem certeza que deseja remover este informe do mural? Esta ação não pode ser desfeita.</p>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '8px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                            <button onClick={handleDeleteConfirmed} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>Remover</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
