import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { supabase } from '../lib/supabaseClient';
import { Camera, Save, Loader2, User, Users, Shield, Building2 } from 'lucide-react';
import ProfileTeamTab from './ProfileTeamTab';
import ProfileRolesTab from './ProfileRolesTab';
import ProfileSecretariesTab from './ProfileSecretariesTab';
import ProfileSecurityLogsTab from './ProfileSecurityLogsTab';
import './Profile.css';

interface ProfileProps {
    forcedTab?: 'perfil' | 'equipe' | 'cargos' | 'secretarias' | 'auditoria';
    hideTabs?: boolean;
}

export default function Profile({ forcedTab, hideTabs }: ProfileProps) {
    const { user, fetchProfile } = useAuth();
    const { jobFunctions } = useData();

    // Tabs state
    const [activeTab, setActiveTab] = useState<'perfil' | 'equipe' | 'cargos' | 'secretarias' | 'auditoria'>(() => {
        if (forcedTab) return forcedTab;
        const stored = localStorage.getItem('profileActiveTab');
        return (stored as any) || 'perfil';
    });

    // Determines if user has Admin/Dev access
    const isAdmin = user?.role === 'admin' || user?.role === 'desenvolvedor';

    useEffect(() => {
        if (forcedTab) {
            setActiveTab(forcedTab);
            return;
        }
        // Critical Security: If user is not admin, force 'perfil' tab
        if (user && !isAdmin && activeTab !== 'perfil') {
            setActiveTab('perfil');
        }
        localStorage.setItem('profileActiveTab', activeTab);
    }, [activeTab, isAdmin, user, forcedTab]);

    // Form state for My Profile
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [jobTitles, setJobTitles] = useState<string[]>([]);
    const [role, setRole] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [bio, setBio] = useState('');

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        if (user) {
            setName(user.name);
            setRole(user.role);
            setJobTitles(user.job_titles || []);

            // Fetch the email directly from the auth session since it isn't in public.users by default
            supabase.auth.getSession().then(({ data }: any) => {
                if (data.session?.user) {
                    setEmail(data.session.user.email || '');
                }
            });

            setBirthDate(user.birth_date || '');
            setBio((user as any).bio || '');
        }
    }, [user]);

    const handleJobTitleToggle = (title: string) => {
        setJobTitles(prev => {
            const next = prev.includes(title)
                ? prev.filter(t => t !== title)
                : [...prev, title];
            return [...next].sort((a, b) => a.localeCompare(b));
        });
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        setToast(null);

        try {
            const updatePayload: any = {
                name,
                job_titles: jobTitles,
                birth_date: birthDate || null,
                bio: bio || null
            };

            // Only Admins update role visually from here (or maybe they don't, but let's keep it safe)
            // But wait, changing one's own role from user to admin is a security issue. 
            // In a real scenario, role shouldn't be editable by the user themselves directly unless they are already admin.
            if (isAdmin) {
                updatePayload.role = role;
            }

            const { error } = await supabase
                .from('users')
                .update(updatePayload)
                .eq('id', user.id);

            if (error) throw error;

            // Refresh local context
            const { data } = await supabase.auth.getSession();
            if (data.session?.user) {
                await fetchProfile(data.session.user);
            }

            setToast({ message: 'Perfil atualizado com sucesso!', type: 'success' });
            setTimeout(() => setToast(null), 3000);

        } catch (error: any) {
            console.error('Update profile error:', error);
            setToast({ 
                message: `Erro ao salvar perfil: ${error.message || 'Verifique sua conexão ou permissões.'}`, 
                type: 'error' 
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        setToast(null);

        try {
            // 1. Upload to Supabase Storage Bucket 'avatars'
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}_${Math.random()}.${fileExt}`;
            const filePath = `public/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: publicUrlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const avatarUrl = publicUrlData.publicUrl;

            // 3. Update public.users table
            const { error: updateError } = await supabase
                .from('users')
                .update({ avatar: avatarUrl, avatar_url: avatarUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 4. Refresh auth context so the header updates
            const { data } = await supabase.auth.getSession();
            if (data.session?.user) {
                await fetchProfile(data.session.user);
            }

            setToast({ message: 'Foto atualizada com sucesso!', type: 'success' });
            setTimeout(() => setToast(null), 3000);

        } catch (error: any) {
            console.error('Upload error:', error);
            setToast({ message: 'Falha ao fazer upload da foto.', type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPassword || !newPassword) return;

        if (newPassword.length < 6) {
            setToast({ message: 'A nova senha deve ter pelo menos 6 caracteres.', type: 'error' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setToast({ message: 'As novas senhas não coincidem.', type: 'error' });
            return;
        }

        setIsSaving(true);
        setToast(null);

        try {
            // 1. Re-authenticate to verify current password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user?.email || '', // use profile email
                password: currentPassword
            });

            if (signInError) {
                throw new Error('A senha atual está incorreta.');
            }

            // 2. Update to new password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            setToast({ message: 'Senha atualizada com sucesso!', type: 'success' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setToast(null), 3000);
        } catch (error: any) {
            console.error('Update password error:', error);
            setToast({ message: error.message || 'Erro ao atualizar senha.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return <div style={{ padding: '2rem' }}>Carregando perfil...</div>;

    return (
        <div className="profile-container animate-fade-in">
            {toast && (
                <div className={`toast-message ${toast.type}`}>
                    {toast.message}
                </div>
            )}

            {!user.birth_date && activeTab === 'perfil' && (
                <div className="profile-nudge-banner glass animate-slide-down">
                    <div className="nudge-icon">🎂</div>
                    <div className="nudge-content">
                        <h3>Complete o seu perfil</h3>
                        <p>Adicione sua data de nascimento para que possamos celebrar com você no dia do seu aniversário!</p>
                    </div>
                    <button className="btn-nudge-action" onClick={() => document.getElementById('birth_date_input')?.focus()}>
                        Completar Agora
                    </button>
                </div>
            )}

            {!hideTabs && isAdmin && (
                <div className="tabs-bar-premium">
                    <button
                        className={`tab-btn-premium ${activeTab === 'perfil' ? 'active' : ''}`}
                        onClick={() => setActiveTab('perfil')}
                        data-tab="perfil"
                    >
                        <User size={18} /> Meu Perfil
                    </button>
                    <button
                        className={`tab-btn-premium ${activeTab === 'equipe' ? 'active' : ''}`}
                        onClick={() => setActiveTab('equipe')}
                        data-tab="equipe"
                    >
                        <Users size={18} /> Gestão da Equipe
                    </button>
                    <button
                        className={`tab-btn-premium ${activeTab === 'cargos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('cargos')}
                        data-tab="cargos"
                    >
                        <Shield size={18} /> Cargos do Sistema
                    </button>
                    <button
                        className={`tab-btn-premium ${activeTab === 'secretarias' ? 'active' : ''}`}
                        onClick={() => setActiveTab('secretarias')}
                        data-tab="secretarias"
                    >
                        <Building2 size={18} /> Secretarias
                    </button>
                    <button
                        className={`tab-btn-premium ${activeTab === 'auditoria' ? 'active' : ''}`}
                        onClick={() => setActiveTab('auditoria')}
                        data-tab="auditoria"
                    >
                        <Shield size={18} /> Auditoria
                    </button>
                </div>
            )}

            <div className="tab-content">
                {activeTab === 'perfil' && (
                    <div className="profile-card">
                        <div className="profile-header">
                            <div className="avatar-wrapper">
                                <img src={user.avatar} alt={user.name} className="profile-avatar" style={{ objectFit: 'cover' }} />

                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    ref={fileInputRef}
                                    onChange={handleAvatarUpload}
                                />

                                <button
                                    className="avatar-edit-btn"
                                    title="Trocar Foto"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                                </button>
                            </div>

                            <div className="profile-title">
                                <h1>{user.name}</h1>
                                <p>
                                    {user.job_titles && user.job_titles.length > 0
                                        ? user.job_titles.join(' • ').toUpperCase()
                                        : user.role.toUpperCase()}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveProfile} className="profile-form-grid">
                            <div className="form-group full-width">
                                <label>Nome Completo</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Seu nome"
                                    required
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>E-mail Corporativo</label>
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    title="O e-mail de acesso não pode ser alterado por aqui"
                                />
                            </div>

                            <div className="form-group">
                                <label>Data de Nascimento</label>
                                <input
                                    id="birth_date_input"
                                    type="date"
                                    value={birthDate}
                                    onChange={e => setBirthDate(e.target.value)}
                                    placeholder="DD/MM/AAAA"
                                    required
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Sobre Mim (Bio)</label>
                                <textarea
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                    placeholder="Conte um pouco sobre sua trajetória na SECOM..."
                                    rows={3}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Minhas Funções (Você pode escolher mais de uma)</label>
                                <div className="job-functions-grid">
                                    {jobFunctions.map(jf => (
                                        <label key={jf.id} className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={jobTitles.includes(jf.title)}
                                                onChange={() => handleJobTitleToggle(jf.title)}
                                            />
                                            <span>{jf.title}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="profile-actions full-width">
                                <button type="submit" className="btn-save" disabled={isSaving || isUploading}>
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>

                        <hr style={{ border: 'none', borderTop: '1px solid hsl(var(--color-border))', margin: '2.5rem 0' }} />

                        <div className="security-card">
                            <div className="security-header">
                                <Shield size={24} style={{ color: 'hsl(var(--color-primary))' }} />
                                <h2>Segurança e Acesso</h2>
                            </div>

                            <div className="security-info-box">
                                <p>
                                    A segurança da sua conta é fundamental para a integridade da INTRANET SECOM.
                                    Recomendamos cadastrar uma senha forte e exclusiva que você não utilize em outros serviços.
                                </p>
                            </div>

                            <form onSubmit={handleUpdatePassword} className="password-form-compact">
                                <div className="form-group">
                                    <label>Senha Atual</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        placeholder="Sua senha de acesso"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Nova Senha</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Confirmar Nova Senha</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Repita a nova senha"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn-security-update"
                                    disabled={isSaving || !newPassword || !currentPassword}
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    <span>Atualizar Senha</span>
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {isAdmin && (
                    <>
                        {activeTab === 'equipe' && <ProfileTeamTab />}
                        {activeTab === 'cargos' && <ProfileRolesTab />}
                        {activeTab === 'secretarias' && <ProfileSecretariesTab />}
                        {activeTab === 'auditoria' && <ProfileSecurityLogsTab />}
                    </>
                )}
            </div>
        </div>
    );
}
