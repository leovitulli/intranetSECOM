import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import type { TeamMember } from '../types/team';
import './TeamMemberModal.css';

interface TeamMemberModalProps {
    member?: TeamMember | null;
    onClose: () => void;
    onSave: (member: TeamMember, password?: string) => void;
}

export default function TeamMemberModal({ member, onClose, onSave }: TeamMemberModalProps) {
    const isEditMode = !!member;
    const { jobFunctions } = useData();

    const [name, setName] = useState(member?.name || '');
    const [role, setRole] = useState(member?.role || 'user');
    const [email, setEmail] = useState(member?.email || '');
    const [phone, setPhone] = useState(member?.phone || '');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [jobTitles, setJobTitles] = useState<string[]>(member?.job_titles || []);
    const [hasLogin, setHasLogin] = useState<boolean>(member?.hasLogin ?? true);
    const color = member?.color || `hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`;

    useEffect(() => {
        if (member) {
            setName(member.name);
            setRole(member.role);
            setEmail(member.email || '');
            setPhone(member.phone || '');
            setJobTitles(member.job_titles || []);
            setHasLogin(member.hasLogin ?? true);
        }
    }, [member]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (!isEditMode && hasLogin && !email) {
            alert('E-mail é obrigatório para usuários com acesso ao sistema.');
            return;
        }
        if (!isEditMode && hasLogin && password.length < 6) {
            alert('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        const savedMember: TeamMember = {
            id: member?.id || '',
            name: name.trim(),
            role,
            color,
            hasLogin,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            job_titles: jobTitles
        };

        onSave(savedMember, hasLogin && !isEditMode ? password : undefined);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content team-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="modal-header">
                    <h2 className="modal-title">{isEditMode ? 'Editar Perfil' : 'Novo Usuário'}</h2>
                    <p className="subtitle" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        {isEditMode
                            ? 'Atualize os dados do colaborador.'
                            : 'Cadastre um novo colaborador. Se tiver acesso, um login será criado.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="team-form">
                    {/* Name */}
                    <div className="form-group">
                        <label>Nome Completo *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ex: João Silva"
                            required
                        />
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {/* Email */}
                        <div className="form-group">
                            <label>E-mail {!isEditMode && hasLogin ? '*' : '(Opcional)'}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="usuario@secom.gov.br"
                                required={!isEditMode && hasLogin}
                            />
                        </div>

                        {/* Phone */}
                        <div className="form-group">
                            <label>Telefone / WhatsApp</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="(00) 90000-0000"
                            />
                        </div>
                    </div>

                    {/* Role + Password row */}
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Nível de Acesso *</label>
                            <select value={role} onChange={e => setRole(e.target.value)} required>
                                <option value="admin">Administrador</option>
                                <option value="desenvolvedor">Desenvolvedor</option>
                                <option value="user">Usuário Comum</option>
                                <option value="viewer">Somente Visualização</option>
                                <option value="motorista">Motorista (Sem Acesso)</option>
                            </select>
                        </div>

                        {/* Password — only shown when creating a new user with login */}
                        {!isEditMode && hasLogin && (
                            <div className="form-group">
                                <label>Senha Inicial *</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        style={{ paddingRight: '2.5rem', width: '100%' }}
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(v => !v)}
                                        style={{ position: 'absolute', right: '0.6rem', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--color-text-muted))' }}
                                    >
                                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Job Titles */}
                    <div className="form-group">
                        <label>Funções / Especialidades</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem', padding: '0.75rem', background: 'hsl(var(--color-background))', border: '1px solid hsl(var(--color-border))', borderRadius: 'var(--radius-md)' }}>
                            {Array.from(new Set([...jobFunctions.map(jf => jf.title), ...jobTitles])).map(title => {
                                const isOrphaned = !jobFunctions.find(jf => jf.title === title);
                                return (
                                    <label
                                        key={title}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            fontSize: '0.8rem',
                                            padding: '0.3rem 0.7rem',
                                            borderRadius: '99px',
                                            border: `1px solid ${jobTitles.includes(title) ? (isOrphaned ? 'hsl(var(--color-danger))' : 'hsl(var(--color-primary))') : 'hsl(var(--color-border))'}`,
                                            background: jobTitles.includes(title) ? (isOrphaned ? 'hsl(var(--color-danger) / 0.1)' : 'hsl(var(--color-primary) / 0.1)') : 'transparent',
                                            color: jobTitles.includes(title) ? (isOrphaned ? 'hsl(var(--color-danger))' : 'hsl(var(--color-primary))') : 'hsl(var(--color-text-muted))',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            userSelect: 'none'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={jobTitles.includes(title)}
                                            onChange={() => setJobTitles(prev =>
                                                prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
                                            )}
                                            style={{ display: 'none' }}
                                        />
                                        {title} {isOrphaned && <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>(Antigo)</span>}
                                    </label>
                                );
                            })}
                            {jobFunctions.length === 0 && jobTitles.length === 0 && (
                                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--color-text-muted))' }}>Nenhum cargo cadastrado nas configurações.</span>
                            )}
                        </div>
                    </div>

                    {/* Toggle Login */}
                    <div className="login-access-container">
                        <label className="toggle-switch-wrapper">
                            <div className="toggle-info">
                                <strong>Permitir acesso ao sistema?</strong>
                                <span className="toggle-desc">
                                    {hasLogin
                                        ? 'A pessoa poderá fazer login e acessar a intranet.'
                                        : 'Perfil somente para alocação (ex: Motoristas), sem senha.'}
                                </span>
                            </div>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={hasLogin}
                                    onChange={e => setHasLogin(e.target.checked)}
                                />
                                <span className="slider round"></span>
                            </label>
                        </label>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-primary" disabled={!name}>
                            {isEditMode ? 'Salvar Alterações' : 'Criar Usuário'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
