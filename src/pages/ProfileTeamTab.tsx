import { useState } from 'react';
import { UserPlus, Pencil, Trash2, Mail, Phone, KeySquare, Slash, LayoutGrid, List, RefreshCw, ShieldCheck, AlertCircle, CheckCircle, X, Search } from 'lucide-react';
import type { TeamMember } from '../types/team';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import TeamMemberModal from '../components/TeamMemberModal';
import './ProfileTeamTab.css';

// ── Toast de feedback inline (substitui window.alert) ─────────────────────────
type ToastType = 'success' | 'error' | 'warning';
function Toast({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) {
    const colors = {
        success: { bg: '#ecfdf5', border: '#a7f3d0', color: '#065f46' },
        error:   { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b' },
        warning: { bg: '#fff7ed', border: '#fed7aa', color: '#92400e' },
    };
    const icons = { success: <CheckCircle size={16} />, error: <AlertCircle size={16} />, warning: <AlertCircle size={16} /> };
    const s = colors[type];
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 12, background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: '0.875rem', fontWeight: 500, marginBottom: '1rem' }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>{icons[type]}</span>
            <span style={{ flex: 1 }}>{message}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.color, padding: 0, flexShrink: 0 }}>
                <X size={14} />
            </button>
        </div>
    );
}

// ── Modal de confirmação inline (substitui window.confirm) ────────────────────
function ConfirmDeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onCancel}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: '1.75rem', maxWidth: 400, width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
                        <Trash2 size={18} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Remover colaborador</h3>
                </div>
                <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#64748b' }}>
                    Tem certeza que deseja remover <strong>{name}</strong>? Esta ação não pode ser desfeita.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={onCancel} style={{ padding: '8px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancelar
                    </button>
                    <button onClick={() => { onConfirm(); onCancel(); }} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Remover
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ProfileTeamTab() {
    const { user: currentUser } = useAuth();
    const { team, loading, addTeamMember, updateTeamMember, deleteTeamMember, resetUserPassword } = useData();
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'desenvolvedor';

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null);
    const [localSearch, setLocalSearch] = useState('');

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const setBusy = (id: string, busy: boolean) =>
        setBusyIds(prev => { const s = new Set(prev); busy ? s.add(id) : s.delete(id); return s; });

    // ── CRUD HANDLERS ────────────────────────────────────────────────────────
    const handleCreateMember = async (member: TeamMember, password?: string): Promise<string | null> => {
        const tempId = 'new-' + Date.now();
        setBusy(tempId, true);
        try {
            const result = await addTeamMember(member, password);
            if (result.success) {
                setIsModalOpen(false);
                setEditingMember(null);
                showToast(`${member.name} foi adicionado à equipe.`, 'success');
                return null;
            } else {
                // Se o erro indicar duplicidade, trata amigavelmente
                const msg = result.error || 'Erro desconhecido';
                if (msg.includes('already registered') || msg.includes('identity_already_exists') || msg.includes('duplicate key')) {
                    return `O e-mail "${member.email}" já está em uso em algum lugar do Supabase.`;
                } else {
                    return `Não foi possível criar o usuário: ${msg}`;
                }
            }
        } catch (err: any) {
            return `Falha crítica no cadastro: ${err.message || 'Erro de conexão'}`;
        } finally {
            setBusy(tempId, false);
        }
    };

    const handleEditMember = async (member: TeamMember): Promise<string | null> => {
        setBusy(member.id, true);
        try {
            const oldMember = team.find(m => m.id === member.id);
            if (!oldMember) throw new Error('Colaborador não encontrado.');

            const isEmailChanging = oldMember.email !== member.email;
            const updatedMember = { ...member };

            if (isEmailChanging) {
                updatedMember.pending_email = member.email;
                updatedMember.security_stamp = (oldMember.security_stamp || 0) + 1;
                updatedMember.email = oldMember.email;
            }

            await updateTeamMember(updatedMember);
            setIsModalOpen(false);
            setEditingMember(null);

            if (isEmailChanging) {
                showToast(`E-mail alterado para pendente: ${member.email}. O usuário precisará confirmar a mudança.`, 'warning');
            } else {
                showToast(`Perfil de ${member.name} atualizado.`, 'success');
            }
            return null;
        } catch (err: any) {
            return `Erro ao salvar: ${err.message || 'Erro desconhecido'}`;
        } finally {
            setBusy(member.id, false);
        }
    };

    const handleSaveMember = (member: TeamMember, password?: string): Promise<string | null> => {
        if (editingMember) return handleEditMember(member);
        else return handleCreateMember(member, password);
    };

    const handleDeleteConfirmed = async (member: TeamMember) => {
        setBusy(member.id, true);
        try {
            await deleteTeamMember(member.id);
            showToast(`${member.name} foi removido da equipe.`, 'success');
        } catch (error: any) {
            showToast(`Erro ao remover: ${error.message}`, 'error');
        } finally {
            setBusy(member.id, false);
        }
    };

    const handleRefreshSync = async (member: TeamMember) => {
        const hasPendingSync = member.pending_email && member.pending_email !== member.email;
        const targetEmail = hasPendingSync ? member.pending_email : member.email;

        if (!targetEmail) {
            showToast('Este usuário não tem e-mail cadastrado.', 'warning');
            return;
        }

        setBusy(member.id, true);
        try {
            await resetUserPassword(targetEmail);
            if (hasPendingSync) showToast(`E-mail de confirmação enviado para: ${targetEmail}`, 'success');
            else showToast(`E-mail de redefinição de senha enviado para ${targetEmail}`, 'success');
        } catch (error: any) {
            showToast(`Erro: ${error.message}`, 'error');
        } finally {
            setBusy(member.id, false);
        }
    };

    // ── FILTRAGEM E ORDENAÇÃO ────────────────────────────────────────────────
    const sortedTeam = [...team].sort((a, b) => a.name.localeCompare(b.name));
    const filteredTeam = sortedTeam.filter(m => {
        if (!localSearch) return true;
        const s = localSearch.toLowerCase();
        return m.name.toLowerCase().includes(s) || 
               m.email?.toLowerCase().includes(s) || 
               m.job_titles?.some((t: string) => t.toLowerCase().includes(s));
    });

    return (
        <div className="profile-team-tab">
            {/* Confirm Delete Overlay */}
            {confirmDelete && (
                <ConfirmDeleteModal
                    name={confirmDelete.name}
                    onConfirm={() => handleDeleteConfirmed(confirmDelete)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}

            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h2>Gestão de Equipe</h2>
                    <p className="subtitle">Adicione, edite, remova colaboradores e gerencie acessos ao sistema.</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Barra de Busca Dinâmica */}
                    <div className="team-search-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, color: '#94a3b8' }} />
                        <input 
                            type="text" 
                            placeholder="Buscar colaborador..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            style={{ 
                                padding: '8px 12px 8px 36px',
                                borderRadius: '10px',
                                border: '1px solid var(--color-border)',
                                background: 'white',
                                fontSize: '0.875rem',
                                width: '220px',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                        />
                    </div>

                    <div className="view-toggle" style={{ display: 'flex', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '0.25rem', border: '1px solid var(--color-border)' }}>
                        <button className={`icon-btn-small ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grade">
                            <LayoutGrid size={16} />
                        </button>
                        <button className={`icon-btn-small ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Lista">
                            <List size={16} />
                        </button>
                    </div>

                    {isAdmin && (
                        <button className="btn-primary" onClick={() => { setEditingMember(null); setIsModalOpen(true); }} style={{ height: '40px' }}>
                            <UserPlus size={18} />
                            <span className="hide-mobile">Novo Usuário</span>
                        </button>
                    )}
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className={viewMode === 'grid' ? 'directory-grid' : 'team-list-view'}>
                {loading && <div className="empty-state" style={{ width: '100%', gridColumn: '1 / -1' }}>Carregando equipe...</div>}

                {!loading && filteredTeam.length === 0 && (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                        {localSearch ? `Nenhum colaborador encontrado para "${localSearch}"` : 'Nenhum colaborador cadastrado.'}
                    </div>
                )}

                {!loading && filteredTeam.map((member: TeamMember) => {
                    const isBusy = busyIds.has(member.id);
                    return (
                        <div key={member.id} className={`team-card glass ${viewMode === 'list' ? 'list-item' : ''}`}>
                            <div className="team-card-header">
                                {member.avatar_url ? (
                                    <img src={member.avatar_url} alt={member.name} className={viewMode === 'grid' ? 'team-avatar-large' : 'team-avatar-small'} style={{ border: `2px solid ${member.color}`, objectFit: 'cover' }} />
                                ) : (
                                    <div className={viewMode === 'grid' ? 'team-avatar-large' : 'team-avatar-small'} style={{ backgroundColor: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: viewMode === 'grid' ? '1.5rem' : '1rem' }}>
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                )}

                                {viewMode === 'list' && (
                                    <div className="team-list-info" style={{ marginLeft: '12px' }}>
                                        <h3 className="team-card-name" style={{ margin: 0, fontSize: '0.95rem' }}>{member.name}</h3>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            {member.job_titles && member.job_titles.length > 0 ? member.job_titles.join(', ') : (member.role === 'motorista' ? 'Motorista' : 'Colaborador')}
                                        </span>
                                    </div>
                                )}

                                <div className="team-actions" style={viewMode === 'list' ? { marginLeft: 'auto', display: 'flex', gap: '4px' } : {}}>
                                    {isAdmin && (
                                        <>
                                            <button className="icon-btn-small" title="Editar" disabled={isBusy} onClick={() => { setEditingMember(member); setIsModalOpen(true); }}>
                                                <Pencil size={14} />
                                            </button>
                                            {member.email && member.hasLogin && (
                                                <button
                                                    className={`icon-btn-small ${member.pending_email && member.pending_email !== member.email ? 'active' : ''}`}
                                                    title="Sincronizar / Resetar"
                                                    disabled={isBusy}
                                                    onClick={() => handleRefreshSync(member)}
                                                >
                                                    <RefreshCw size={14} className={member.pending_email && member.pending_email !== member.email ? 'spin-slow' : ''} />
                                                </button>
                                            )}
                                            <button className="icon-btn-small danger" title="Remover" disabled={isBusy} onClick={() => setConfirmDelete(member)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {viewMode === 'grid' && (
                                <div className="team-card-body">
                                    <h3 className="team-card-name" style={{ marginBottom: 4 }}>{member.name}</h3>
                                    <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', marginBottom: 10, minHeight: '24px' }}>
                                        {member.job_titles?.map((jb: string) => (
                                            <span key={jb} className="badge" style={{ backgroundColor: 'var(--color-surface-hover)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: '0.65rem' }}>{jb}</span>
                                        ))}
                                    </div>
                                    <div className="team-card-contact">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                            <ShieldCheck size={13} style={{ color: 'var(--color-primary)' }} />
                                            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                                {member.job_titles && member.job_titles.length > 0 ? member.job_titles[0] : (member.role === 'motorista' ? 'Motorista' : 'Colaborador')}
                                            </span>
                                        </div>
                                        {member.email && (
                                            <div className="contact-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <Mail size={13} />
                                                <span style={{ whiteSpace: 'nowrap' }}>{member.email}</span>
                                            </div>
                                        )}
                                        {member.phone && (
                                            <div className="contact-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                                                <Phone size={13} /> <span>{member.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="team-card-footer" style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                                        {member.hasLogin ? (
                                            <span className="login-status has-login" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--color-success)' }}><KeySquare size={13} /> Acesso completo</span>
                                        ) : (
                                            <span className="login-status no-login" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}><Slash size={13} /> Sem acesso</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <TeamMemberModal
                    member={editingMember}
                    onClose={() => { setIsModalOpen(false); setEditingMember(null); }}
                    onSave={handleSaveMember}
                />
            )}
        </div>
    );
}
