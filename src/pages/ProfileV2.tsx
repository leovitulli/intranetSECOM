import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { Newspaper, Clock, X, Users, Shield, Building2, PartyPopper, Trophy, Pencil, Check, Activity, Camera } from 'lucide-react';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { normalizeText } from '../utils/searchUtils';
import TaskModal from '../components/TaskModal';
import Profile from './Profile';
import ImageCropperModal from '../components/ImageCropperModal';
import MeusRegistrosRH from '../components/MeusRegistrosRH';
import './ProfileV2.css';
import type { Task } from '../types/kanban';
import type { TeamMember } from '../types/team';
import { supabase } from '../lib/supabaseClient';

export default function ProfileV2() {
    const { user } = useAuth();
    const { tasks, team, updateTask, jobFunctions } = useData();
    const navigate = useNavigate();

    // ─── States ──────────────────────────────────────────────────
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [taskTab, setTaskTab] = useState<'ativas' | 'concluidas'>('ativas');
    const [modalConfig, setModalConfig] = useState<{ open: boolean; tab: 'equipe' | 'cargos' | 'secretarias' | 'auditoria' }>({
        open: false,
        tab: 'equipe'
    });
    const [newsItems, setNewsItems] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
    const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null);
    
    // Form States
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editBirthDate, setEditBirthDate] = useState('');
    const [editCodFuncional, setEditCodFuncional] = useState('');
    const [editJobTitles, setEditJobTitles] = useState<string[]>([]);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const isAdmin = user?.role === 'admin' || user?.role === 'desenvolvedor';

    // ─── Fetch Mural (News) ──────────────────────────────────────
    useEffect(() => {
        const fetchMural = async () => {
            const { data } = await supabase
                .from('news')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(4);
            if (data) setNewsItems(data);
        };
        fetchMural();
        
        if (user) {
            setEditName(user.name);
            setEditEmail(user.email || '');
            setEditBio((user as any).bio || '');
            setEditBirthDate(user.birth_date || '');
            setEditCodFuncional((user as any).cod_funcional || '');
            setEditJobTitles(user.job_titles || []);
            setPreviewAvatar(user.avatar || null);
        }
    }, [user]);
    
    const handleJobTitleToggle = useCallback((title: string) => {
        setEditJobTitles(prev => {
            const next = prev.includes(title)
                ? prev.filter(t => t !== title)
                : [...prev, title];
            return [...next].sort((a, b) => a.localeCompare(b));
        });
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const tempUrl = URL.createObjectURL(file);
            setCropperImageSrc(tempUrl);
        }
        e.target.value = ''; // Reset to allow re-selection
    }, []);

    const handleCropComplete = useCallback((croppedFile: File, previewUrl: string) => {
        setAvatarFile(croppedFile);
        setPreviewAvatar(previewUrl);
        setCropperImageSrc(null);
    }, []);

    // ─── Lógica de Pautas Reais ──────────────────────────────────
    const myTasksMetrics = useMemo(() => {
        if (!user || !tasks) return { active: [], completed: [], completedCount: 0 };
        const userNameNormalized = normalizeText(user.name);
        
        const allMyTasks = tasks.filter(t => {
            return (
                (t.creator && normalizeText(t.creator).includes(userNameNormalized)) ||
                t.assignees?.some(a => normalizeText(a).includes(userNameNormalized))
            );
        });
        
        const completed = allMyTasks
            .filter(t => t.status?.toLowerCase() === 'publicado' || t.status?.toLowerCase() === 'arquivado')
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 10); // Mostra até 10 concluídas recentes

        const active = allMyTasks
            .filter(t => t.status?.toLowerCase() !== 'publicado' && t.status?.toLowerCase() !== 'arquivado')
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()); // Mostra todas as ativas (com scroll)

        return { 
            active, 
            completed, 
            completedCount: allMyTasks.filter(t => t.status?.toLowerCase() === 'publicado' || t.status?.toLowerCase() === 'arquivado').length 
        };
    }, [user, tasks]);

    // ─── Lógica de Aniversariantes do Mês ───────────────────
    const birthdays = useMemo(() => {
        if (!team) return { today: [], month: [] };
        const now = new Date();
        const todayStr = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        const today: TeamMember[] = [];
        const monthList: TeamMember[] = [];

        team.forEach((m: TeamMember) => {
            if (!m.birth_date) return;
            const birthMonthDay = m.birth_date.substring(5);
            if (birthMonthDay === todayStr) {
                today.push(m);
            } else if (m.birth_date.split('-')[1] === (now.getMonth() + 1).toString().padStart(2, '0')) {
                monthList.push(m);
            }
        });

        monthList.sort((a, b) => {
            const dayA = parseInt(a.birth_date?.split('-')[2] || '0');
            const dayB = parseInt(b.birth_date?.split('-')[2] || '0');
            return dayA - dayB;
        });

        return { today, month: monthList };
    }, [team]);

    const handleUpdateTask = useCallback(async (updatedTask: Task) => {
        await updateTask(updatedTask);
        setSelectedTask(prev => prev?.id === updatedTask.id ? updatedTask : prev);
    }, [updateTask]);

    const handleSaveProfile = useCallback(async () => {
        if (!user) return;
        setIsSaving(true);
        setSaveToast(null);
        try {
            // 1. Handle Avatar Upload
            let finalAvatarUrl = user.avatar;
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${user.id}-${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, avatarFile);
                
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName);
                
                finalAvatarUrl = publicUrl;
            }

            // 2. Handle Profile Data Change
            const { error: profileError } = await supabase
                .from('users')
                .update({ 
                    name: editName,
                    bio: editBio,
                    birth_date: editBirthDate || null,
                    cod_funcional: editCodFuncional || null,
                    job_titles: editJobTitles,
                    avatar_url: finalAvatarUrl
                })
                .eq('id', user.id);
            
            if (profileError) throw profileError;

            // 3. Handle Email Change (Personal email/login) - Editable for Admin/Dev only
            if (isAdmin && editEmail !== user.email) {
                const { error: emailError } = await supabase.auth.updateUser({
                    email: editEmail
                });
                if (emailError) throw emailError;
            }

            // 4. Handle Password Change (Optional)
            if (newPassword) {
                if (newPassword !== confirmPassword) {
                    throw new Error('As novas senhas não coincidem!');
                }
                
                if (!currentPassword) {
                    throw new Error('Informe sua senha atual para prosseguir!');
                }

                // Verify current password first
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: user.email || '',
                    password: currentPassword
                });

                if (signInError) {
                    throw new Error('A senha atual está incorreta.');
                }

                const { error: passwordError } = await supabase.auth.updateUser({
                    password: newPassword
                });
                
                if (passwordError) throw passwordError;
            }

            setSaveToast({ message: 'Perfil atualizado!', type: 'success' });
            setTimeout(() => {
                setIsEditing(false);
                window.location.reload();
            }, 1000);
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            setSaveToast({ message: error.message || 'Erro ao salvar perfil', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    }, [user, avatarFile, editName, editBio, editBirthDate, editCodFuncional, editJobTitles, editEmail, isAdmin, newPassword, confirmPassword, currentPassword]);

    const openManagementModal = useCallback((tab: 'equipe' | 'cargos' | 'secretarias' | 'auditoria') => {
        setModalConfig({ open: true, tab });
    }, []);

    return (
        <div className="dashboard-container dashboard-v3-root profile-v2-container">
            
            {/* ─── Modal Premium: Gestão Administrativa ────────────────────── */}

            {modalConfig.open && (
                <div className="modal-overlay" onClick={() => setModalConfig(prev => ({ ...prev, open: false }))}>
                    <div className="modal-content nova-pauta-modal" style={{ maxWidth: '1100px' }} onClick={e => e.stopPropagation()}>
                        
                        {/* CABEÇALHO PREMIUM MODELO NOVA PAUTA */}
                        <div className="nova-pauta-header-premium">
                            <div className="header-left-premium">
                                <div className="header-icon-premium" style={{ 
                                    background: modalConfig.tab === 'auditoria' ? '#1e293b' : undefined,
                                    boxShadow: modalConfig.tab === 'auditoria' ? '0 4px 12px rgba(15, 23, 42, 0.3)' : undefined
                                }}>
                                    {modalConfig.tab === 'equipe' && <Users size={22} />}
                                    {modalConfig.tab === 'cargos' && <Shield size={22} />}
                                    {modalConfig.tab === 'secretarias' && <Building2 size={22} />}
                                    {modalConfig.tab === 'auditoria' && <Shield size={22} />}
                                </div>
                                <div className="header-titles-premium">
                                    <h2>
                                        {modalConfig.tab === 'equipe' && 'Gestão de Colaboradores'}
                                        {modalConfig.tab === 'cargos' && 'Cargos e Funções'}
                                        {modalConfig.tab === 'secretarias' && 'Rede de Secretarias'}
                                        {modalConfig.tab === 'auditoria' && 'AuditLog: Segurança do Sistema'}
                                    </h2>
                                    <span className="header-subtitle-premium">
                                        {modalConfig.tab === 'equipe' && 'Controle de acessos e permissões da equipe SECOM'}
                                        {modalConfig.tab === 'cargos' && 'Definição de atribuições técnicas do sistema'}
                                        {modalConfig.tab === 'secretarias' && 'Listagem oficial de órgãos e departamentos'}
                                        {modalConfig.tab === 'auditoria' && 'Rastreamento de ações administrativas em tempo real'}
                                    </span>
                                </div>
                            </div>
                            <button className="close-btn-premium" onClick={() => setModalConfig(prev => ({ ...prev, open: false }))}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="nova-pauta-body-premium" style={{ background: '#fff' }}>
                            <Profile forcedTab={modalConfig.tab} hideTabs={true} />
                        </div>

                        <div className="nova-pauta-footer-premium">
                            <button type="button" className="btn-cancel-premium" onClick={() => setModalConfig(prev => ({ ...prev, open: false }))}>
                                Fechar Janela
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Modal de Recorte de Imagem ────────────────────────────────── */}
            {cropperImageSrc && (
                <ImageCropperModal 
                    imageSrc={cropperImageSrc} 
                    onClose={() => setCropperImageSrc(null)}
                    onCropCompleteAction={handleCropComplete}
                />
            )}

            <div className="bento-grid">
                
                {/* ─── Profile Main Hub ────────────────────────────────────── */}
                <div className={`bento-card bento-profile-main card-full ${isEditing ? 'editing-active' : ''}`}>
                    {/* Botão de Edição Standard */}
                    <button 
                        className={`btn-edit-premium-small ${isEditing ? 'active' : ''}`} 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if (isEditing) handleSaveProfile();
                            else setIsEditing(true);
                        }}
                        disabled={isSaving}
                    >
                        {isSaving ? <Activity size={14} className="animate-spin" /> : (isEditing ? <Check size={16} /> : <Pencil size={14} />)}
                    </button>
                    
                    {isEditing && (
                         <button 
                            className="btn-cancel-premium-small" 
                            style={{ position: 'absolute', top: '1.5rem', right: '4.5rem', zIndex: 11 }}
                            onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
                         >
                            <X size={14} />
                         </button>
                    )}
                    
                    {saveToast && (
                        <div className={`save-toast-lite ${saveToast.type}`} style={{ position: 'absolute', top: '6rem', right: '1.5rem', zIndex: 15 }}>
                            {saveToast.message}
                        </div>
                    )}

                    <div className="profile-identity-hub">
                        <div className={`avatar-container-hub ${isEditing ? 'editable' : ''}`}>
                            <img src={previewAvatar || user?.avatar} alt={user?.name} className="avatar-hub-large" />
                            {isEditing && (
                                <label className="avatar-upload-overlay">
                                    <Camera size={24} />
                                    <span>ALTERAR</span>
                                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                </label>
                            )}
                        </div>
                        
                        <div className="identity-details" style={{ flex: 1 }}>
                            {isEditing ? (
                                <div className="full-edit-form-hub">
                                    <div className="form-row-hub">
                                        <div className="form-field-hub">
                                            <label>NOME COMPLETO</label>
                                            <input 
                                                type="text" 
                                                className="input-premium-hub"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field-hub">
                                            <label>E-MAIL CORPORATIVO (LOGIN)</label>
                                            <input 
                                                type="email" 
                                                className="input-premium-hub"
                                                value={editEmail}
                                                onChange={e => setEditEmail(e.target.value)}
                                                disabled={!isAdmin}
                                                style={{ 
                                                    opacity: isAdmin ? 1 : 0.6, 
                                                    cursor: isAdmin ? 'text' : 'not-allowed' 
                                                }}
                                                title={isAdmin ? "Editar e-mail de acesso" : "O e-mail de acesso só pode ser alterado por Administradores"}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row-hub" style={{ marginTop: '1rem' }}>
                                        <div className="form-field-hub">
                                            <label>ANIVERSÁRIO</label>
                                            <input 
                                                type="date" 
                                                className="input-premium-hub"
                                                value={editBirthDate}
                                                onChange={e => setEditBirthDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field-hub">
                                            <label>CÓD. FUNCIONAL</label>
                                            <input 
                                                type="text" 
                                                className="input-premium-hub"
                                                placeholder="Ex: 84661"
                                                value={editCodFuncional}
                                                onChange={e => setEditCodFuncional(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field-hub" style={{ marginTop: '1rem' }}>
                                        <label>SOBRE MIM (BIO)</label>
                                        <textarea 
                                            className="edit-bio-textarea"
                                            value={editBio}
                                            onChange={e => setEditBio(e.target.value)}
                                            placeholder="Conte um pouco sobre sua trajetória..."
                                        />
                                    </div>

                                    <div className="form-field-hub" style={{ marginTop: '1rem' }}>
                                        <label>FUNÇÕES NO SISTEMA</label>
                                        <div className="job-selection-grid-hub">
                                            {jobFunctions.map(jf => (
                                                <label key={jf.id} className={`job-checkbox-label ${editJobTitles.includes(jf.title) ? 'checked' : ''}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={editJobTitles.includes(jf.title)}
                                                        onChange={() => handleJobTitleToggle(jf.title)}
                                                    />
                                                    <span>{jf.title}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-row-hub-3col" style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                                        <div className="form-field-hub">
                                            <label>SENHA ATUAL</label>
                                            <input 
                                                type="password" 
                                                className="input-premium-hub"
                                                placeholder="Sua senha atual"
                                                value={currentPassword}
                                                onChange={e => setCurrentPassword(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field-hub">
                                            <label>NOVA SENHA</label>
                                            <input 
                                                type="password" 
                                                className="input-premium-hub"
                                                placeholder="No mínimo 6 dígitos"
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field-hub">
                                            <label>CONFIRMAR SENHA</label>
                                            <input 
                                                type="password" 
                                                className="input-premium-hub"
                                                placeholder="Repita a nova senha"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {user?.name}
                                        <span className="badge-online-lite">ONLINE</span>
                                    </h2>
                                    <div className="job-tags-container" style={{ marginTop: '0.5rem' }}>
                                        {user?.job_titles && user.job_titles.length > 0 ? (
                                            user.job_titles.map((title, i) => (
                                                <span key={i} className="tag-premium-hub">{title}</span>
                                            ))
                                        ) : (
                                            <span className="tag-premium-hub">{user?.role}</span>
                                        )}
                                    </div>
                                    <div className="bio-hub-text">
                                        {(user as any)?.bio || "Membro estratégico da equipe de comunicação da SECOM. Focado em resultados e excelência operacional."}
                                    </div>

                                    {(!user?.birth_date || !(user as any)?.cod_funcional) && (
                                        <div style={{ marginTop: '1.5rem', background: '#fffbeb', border: '1px solid #fef3c7', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ background: '#f59e0b', color: 'white', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                                                <Shield size={16} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h5 style={{ margin: 0, fontSize: '0.85rem', color: '#92400e', fontWeight: 800 }}>Ação Necessária: Complete seu Perfil</h5>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#b45309', marginTop: '2px' }}>
                                                    Para utilizar a gestão de RH, preencha sua {![user?.birth_date, (user as any)?.cod_funcional].every(Boolean) && !user?.birth_date && !(user as any)?.cod_funcional ? 'Data de Nascimento e Cód. Funcional' : !user?.birth_date ? 'Data de Nascimento' : 'Cód. Funcional'}.
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => setIsEditing(true)} 
                                                style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                                Completar
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    
                    <div className="stats-grid-mini-institutional">
                        <div className="institutional-stat-item">
                            <span className="inst-stat-label">Nível de Credencial</span>
                            <span className="inst-stat-value">{user?.role === 'desenvolvedor' ? 'Administrador Pleno' : user?.role === 'admin' ? 'Administrador' : 'Colaborador'}</span>
                        </div>
                        <div className="institutional-stat-item">
                            <span className="inst-stat-label">Pautas em Andamento</span>
                            <span className="inst-stat-value">{myTasksMetrics.active.length}</span>
                        </div>
                        <div className="institutional-stat-item">
                            <span className="inst-stat-label">Minhas Entregas</span>
                            <span className="inst-stat-value">{myTasksMetrics.completedCount}</span>
                        </div>
                    </div>
                </div>

                {/* ─── ROW 2: Missões em Campo & RH ──────────────────────── */}
                <div className="bento-card card-wide" style={{ background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}><Clock size={18} color="#3b82f6" /> Missões em Campo</h3>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span 
                                onClick={() => setTaskTab('concluidas')}
                                style={{ 
                                    fontSize: '0.7rem', 
                                    background: taskTab === 'concluidas' ? '#166534' : '#dcfce7', 
                                    color: taskTab === 'concluidas' ? '#fff' : '#166534', 
                                    padding: '4px 12px', 
                                    borderRadius: '99px', 
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Check size={10} style={{ display: 'inline', marginRight: '4px' }} />
                                {myTasksMetrics.completedCount} CONCLUÍDAS
                            </span>
                            <span 
                                onClick={() => setTaskTab('ativas')}
                                style={{ 
                                    fontSize: '0.7rem', 
                                    background: taskTab === 'ativas' ? '#2563eb' : '#eff6ff', 
                                    color: taskTab === 'ativas' ? '#fff' : '#3b82f6', 
                                    padding: '4px 12px', 
                                    borderRadius: '99px', 
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {myTasksMetrics.active.length} ATIVAS
                            </span>
                        </div>
                    </div>
                    {(taskTab === 'ativas' ? myTasksMetrics.active : myTasksMetrics.completed).length > 0 ? (
                        <div className="scrollable-grid">
                            {(taskTab === 'ativas' ? myTasksMetrics.active : myTasksMetrics.completed).map(t => (
                                <div key={t.id} className="item-row-premium" onClick={() => setSelectedTask(t)} style={{ cursor: 'pointer', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                    <div className="item-content">
                                        <h4 style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: 700 }}>{t.title}</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.65rem', background: '#1e293b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>{t.status.toUpperCase()}</span>
                                            
                                            <span style={{ 
                                                fontSize: '0.65rem', 
                                                background: t.priority === 'alta' ? '#fee2e2' : t.priority === 'media' ? '#ffedd5' : '#dcfce7', 
                                                color: t.priority === 'alta' ? '#b91c1c' : t.priority === 'media' ? '#c2410c' : '#15803d', 
                                                padding: '2px 8px', 
                                                borderRadius: '4px', 
                                                fontWeight: 700 
                                            }}>
                                                {t.priority ? t.priority.toUpperCase() : 'NORMAL'}
                                            </span>
                                            
                                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>📅 {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Sem prazo'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', border: '1px dashed #cbd5e1', borderRadius: '16px' }}>
                            Nenhuma missão {taskTab === 'ativas' ? 'ativa' : 'concluída'} no momento.
                        </div>
                    )}
                </div>

                {/* ─── Recursos Humanos (Colaborador) ────────────────────── */}
                <MeusRegistrosRH />

                {/* ─── ROW 3: Secundários (Admin, Aniversários, Mural) ───── */}
                {/* ─── Sistema Administrativo ────────────────────────────── */}
                {isAdmin && (
                    <div className="bento-card">
                        <div style={{ marginBottom: '1.25rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={18} color="#d97706" /> Gestão Administrativa</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button className="atalho-btn-premium" onClick={() => openManagementModal('equipe')}><Users size={14} /> Equipe</button>
                            <button className="atalho-btn-premium" onClick={() => openManagementModal('cargos')}><Shield size={14} /> Cargos</button>
                            <button className="atalho-btn-premium" onClick={() => openManagementModal('secretarias')}><Building2 size={14} /> Secretarias</button>
                            <button className="atalho-btn-premium atalho-btn-audit" onClick={() => openManagementModal('auditoria')} style={{ marginTop: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}><Shield size={14} /> Auditoria do Site</button>
                        </div>
                    </div>
                )}

                {/* ─── Celebrações (Aniversários) ────────────────────────── */}
                <div className="bento-card card-celebration-premium">
                    <div className="celebration-header-clean">
                         <h3 style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <Trophy size={16} /> Aniversários
                        </h3>
                    </div>

                    {birthdays.today.length > 0 ? (
                        birthdays.today.map(b => (
                            <div key={b.id} className="party-day-clean">
                                <img src={b.avatar_url} alt={b.name} className="party-avatar" />
                                <div>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#9d174d' }}>{b.name}</h4>
                                    <p style={{ fontSize: '0.75rem', color: '#be185d', fontWeight: 700 }}>FELIZ ANIVERSÁRIO! 🎉</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8', margin: '1rem', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                            Nenhuma celebração hoje.
                        </div>
                    )}

                    <div style={{ padding: '0 1.25rem 0.5rem', fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Próximos Celebrantes:</div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.5rem', maxHeight: '180px' }}>
                        {birthdays.month.slice(0, 8).map(b => (
                            <div key={b.id} className="birthday-row-clean" style={{ padding: '0.5rem 1rem' }}>
                                <div className="date-bubble-clean" style={{ minWidth: '36px', height: '36px', fontSize: '0.9rem' }}>
                                    {new Date(b.birth_date + 'T12:00:00').getDate()}
                                </div>
                                <img src={b.avatar_url} alt={b.name} className="avatar-mini-clean" style={{ width: '36px', height: '36px' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h5 style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</h5>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── Mural Hub ─────────────────────────────────────────── */}
                <div className="bento-card">
                    <div style={{ marginBottom: '1.25rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}><Newspaper size={18} color="#7c3aed" /> Mural Recente</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {newsItems.slice(0, 3).map(n => (
                            <div key={n.id} className="item-row-premium" onClick={() => navigate('/noticias')} style={{ cursor: 'pointer', padding: '10px 15px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                <h4 style={{ fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</h4>
                                <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{new Date(n.created_at).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal de Tarefa */}
            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={handleUpdateTask}
                />
            )}
        </div>
    );
}
