import { useState } from 'react';
import { UserPlus, Pencil, Trash2, Mail, Phone, KeySquare, Slash, LayoutGrid, List, RefreshCw, ShieldCheck } from 'lucide-react';
import type { TeamMember } from '../types/team';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import TeamMemberModal from '../components/TeamMemberModal';
import './ProfileTeamTab.css';


export default function ProfileTeamTab() {
    const { user: currentUser } = useAuth();
    const { team, loading, searchTerm, addTeamMember, updateTeamMember, deleteTeamMember, resetUserPassword } = useData();
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'desenvolvedor';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

    const setBusy = (id: string, busy: boolean) =>
        setBusyIds(prev => { const s = new Set(prev); busy ? s.add(id) : s.delete(id); return s; });

    // ─── CREATE ──────────────────────────────────────────────────────────────
    const handleCreateMember = async (member: TeamMember, password?: string) => {
        const tempId = 'new-' + Date.now();
        setBusy(tempId, true);
        try {
            console.log('🏁 Solicitando criação de membro:', member.name);
            const success = await addTeamMember(member, password);
            
            if (success) {
                setIsModalOpen(false);
                setEditingMember(null);
                // Não precisamos de alert aqui se quisermos algo mais fluido, 
                // mas como o usuário gosta de confirmação, vou manter uma curta.
                console.log('✅ Membro criado com sucesso!');
            }
        } catch (err: any) {
            console.error('Create member error:', err);
            const msg = err.message || '';
            if (msg.includes('already registered') || msg.includes('identity_already_exists')) {
                alert(`❌ E-mail "${member.email}" já está em uso.\n\nSe ele não aparece na lista, remova-o no Supabase Dashboard primeiro.`);
            } else {
                alert(`❌ Falha no cadastro: ${msg}`);
            }
        } finally {
            setBusy(tempId, false);
        }
    };

    // ─── EDIT ─────────────────────────────────────────────────────────────────
    const handleEditMember = async (member: TeamMember) => {
        setBusy(member.id, true);
        try {
            const oldMember = team.find(m => m.id === member.id);
            if (!oldMember) throw new Error('Colaborador não encontrado.');

            const isEmailChanging = oldMember.email !== member.email;
            const updatedMember = { ...member };

            if (isEmailChanging) {
                updatedMember.pending_email = member.email;
                updatedMember.security_stamp = (oldMember.security_stamp || 0) + 1;
                // Mantemos o e-mail antigo no campo 'email' até a confirmação
                updatedMember.email = oldMember.email;
            }

            await updateTeamMember(updatedMember);

            setIsModalOpen(false);
            setEditingMember(null);

            if (isEmailChanging) {
                alert(`⚠️ O e-mail foi alterado para pendente: ${member.email}.\n\nO usuário precisará confirmar a mudança.`);
            }
        } catch (err: any) {
            console.error('Edit member error:', err);
            alert(`❌ Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setBusy(member.id, false);
        }
    };

    const handleSaveMember = (member: TeamMember, password?: string) => {
        if (editingMember) {
            handleEditMember(member);
        } else {
            handleCreateMember(member, password);
        }
    };

    // ─── DELETE ───────────────────────────────────────────────────────────────
    const handleDeleteMember = async (member: TeamMember) => {
        if (!confirm(`Remover ${member.name}?`)) return;

        setBusy(member.id, true);
        try {
            await deleteTeamMember(member.id);
        } catch (error: any) {
            alert(`❌ Erro ao remover: ${error.message}`);
        } finally {
            setBusy(member.id, false);
        }
    };

    // ─── RESET / SYNC ─────────────────────────────────────────────────────────
    const handleRefreshSync = async (member: TeamMember) => {
        const hasPendingSync = member.pending_email && member.pending_email !== member.email;
        const targetEmail = hasPendingSync ? member.pending_email : member.email;

        if (!targetEmail) {
            alert('Este usuário não tem e-mail cadastrado.');
            return;
        }

        setBusy(member.id, true);
        try {
            await resetUserPassword(targetEmail);
            if (hasPendingSync) {
                alert(`📧 Sincronização iniciada! Um e-mail de confirmação foi enviado para o novo endereço: ${targetEmail}`);
            } else {
                alert(`📧 E-mail de redefinição de senha enviado para ${targetEmail}`);
            }
        } catch (error: any) {
            alert(`❌ Erro: ${error.message}`);
        } finally {
            setBusy(member.id, false);
        }
    };

    return (
        <div className="profile-team-tab">
            <div className="page-header">
                <div>
                    <h2>Gestão de Equipe</h2>
                    <p className="subtitle">Adicione, edite, remova colaboradores e gerencie acessos ao sistema.</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {/* View toggler */}
                    <div className="view-toggle" style={{ display: 'flex', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '0.25rem', border: '1px solid var(--color-border)' }}>
                        <button
                            className={`icon-btn-small ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Grade"
                            style={viewMode === 'grid' ? { backgroundColor: 'var(--color-background)', color: 'var(--color-primary)' } : {}}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            className={`icon-btn-small ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="Lista"
                            style={viewMode === 'list' ? { backgroundColor: 'var(--color-background)', color: 'var(--color-primary)' } : {}}
                        >
                            <List size={16} />
                        </button>
                    </div>

                    {isAdmin && (
                        <button
                            className="btn-primary"
                            onClick={() => { setEditingMember(null); setIsModalOpen(true); }}
                        >
                            <UserPlus size={18} />
                            <span className="hide-mobile">Novo Usuário</span>
                        </button>
                    )}
                </div>
            </div>



            {/* ──────────────── MEMBER CARDS ──────────────── */}
            <div className={viewMode === 'grid' ? 'directory-grid' : 'team-list-view'}>
                {loading && <div className="empty-state" style={{ width: '100%', gridColumn: '1 / -1' }}>Carregando equipe...</div>}

                {!loading && team
                    .filter((m: TeamMember) => {
                        if (!searchTerm) return true;
                        const searchLower = searchTerm.toLowerCase();
                        return (
                            m.name.toLowerCase().includes(searchLower) ||
                            m.email?.toLowerCase().includes(searchLower) ||
                            m.job_titles?.some((t: string) => t.toLowerCase().includes(searchLower))
                        );
                    })
                    .map((member: TeamMember) => {
                    const isBusy = busyIds.has(member.id);
                    return (
                        <div key={member.id} className={`team-card glass ${viewMode === 'list' ? 'list-item' : ''}`}>
                            <div className="team-card-header">
                                {/* Avatar */}
                                {member.avatar_url ? (
                                    <img
                                        src={member.avatar_url}
                                        alt={member.name}
                                        className={viewMode === 'grid' ? 'team-avatar-large' : 'team-avatar-small'}
                                        style={{ border: `2px solid ${member.color}`, objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div
                                        className={viewMode === 'grid' ? 'team-avatar-large' : 'team-avatar-small'}
                                        style={{ backgroundColor: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: viewMode === 'grid' ? '1.5rem' : '1rem' }}
                                    >
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                )}

                                {viewMode === 'list' && (
                                    <div className="team-list-info">
                                        <h3 className="team-card-name" style={{ margin: 0 }}>{member.name}</h3>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                            {member.job_titles && member.job_titles.length > 0
                                                ? member.job_titles.join(', ')
                                                : (member.role === 'motorista' ? 'Motorista' : 'Colaborador')}
                                        </span>
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="team-actions" style={viewMode === 'list' ? { marginLeft: 'auto', display: 'flex', gap: '4px' } : {}}>
                                    {isAdmin && (
                                        <>
                                            <button
                                                className="icon-btn-small"
                                                title="Editar"
                                                disabled={isBusy}
                                                onClick={() => { setEditingMember(member); setIsModalOpen(true); }}
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            {member.email && member.hasLogin && (
                                                <button
                                                    className={`icon-btn-small ${member.pending_email && member.pending_email !== member.email ? 'active' : ''}`}
                                                    title={member.pending_email && member.pending_email !== member.email ? 'Sincronização pendente - Clique para re-enviar' : 'Re-enviar convite / Reset de senha'}
                                                    disabled={isBusy}
                                                    onClick={() => handleRefreshSync(member)}
                                                >
                                                    <RefreshCw size={14} className={member.pending_email && member.pending_email !== member.email ? 'spin-slow' : ''} />
                                                </button>
                                            )}
                                            <button
                                                className="icon-btn-small danger"
                                                title="Remover usuário"
                                                disabled={isBusy}
                                                onClick={() => handleDeleteMember(member)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {viewMode === 'grid' && (
                                <div className="team-card-body">
                                    <h3 className="team-card-name" style={{ marginBottom: 4 }}>{member.name}</h3>

                                    {/* Job tags */}
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: 10 }}>
                                        {member.job_titles?.map((jb: string) => (
                                            <span key={jb} className="badge type-release" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: '0.72rem' }}>{jb}</span>
                                        ))}
                                    </div>

                                    <div className="team-card-contact">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                            <ShieldCheck size={13} style={{ color: 'hsl(var(--color-primary))' }} />
                                            <span style={{ fontSize: '0.78rem', color: 'hsl(var(--color-text-muted))' }}>
                                                {member.job_titles && member.job_titles.length > 0
                                                    ? member.job_titles[0]
                                                    : (member.role === 'motorista' ? 'Motorista' : 'Colaborador')}
                                            </span>
                                        </div>

                                        {member.email && (
                                            <div className="contact-item">
                                                <Mail size={13} />
                                                <span>{member.email}</span>
                                                {member.pending_email && member.pending_email !== member.email && (
                                                    <span className="badge type-bug" style={{ fontSize: '0.65rem', padding: '1px 5px', marginLeft: '5px', borderRadius: '4px', background: 'hsl(var(--color-warning) / 0.1)', color: 'hsl(var(--color-warning))', border: '1px solid hsl(var(--color-warning) / 0.2)' }}>
                                                        Sinc. Pendente
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {member.phone && (
                                            <div className="contact-item">
                                                <Phone size={13} /> <span>{member.phone}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="team-card-footer">
                                        {member.hasLogin ? (
                                            <span className="login-status has-login">
                                                <KeySquare size={13} /> Acesso ao sistema
                                            </span>
                                        ) : (
                                            <span className="login-status no-login">
                                                <Slash size={13} /> Sem acesso (alocação)
                                            </span>
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
