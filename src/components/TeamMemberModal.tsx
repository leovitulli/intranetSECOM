import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import type { TeamMember } from '../types/team';
import './TeamMemberModal.css';

interface TeamMemberModalProps {
    member?: TeamMember | null;
    onClose: () => void;
    onSave: (member: TeamMember, password?: string) => void;
}

export default function TeamMemberModal({ member, onClose, onSave }: TeamMemberModalProps) {
    const isEditMode = !!member;
    const { user: currentUser } = useAuth();
    const { jobFunctions } = useData();

    const isDev = currentUser?.role === 'desenvolvedor';

    const [name, setName] = useState(member?.name || '');
    const [role, setRole] = useState(member?.role || 'user');
    const [email, setEmail] = useState(member?.email || '');
    const [phone, setPhone] = useState(member?.phone || '');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [jobTitles, setJobTitles] = useState<string[]>(member?.job_titles || []);
    const [hasLogin, setHasLogin] = useState<boolean>(member?.hasLogin ?? true);

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

        const memberData = {
            ...member,
            name,
            email: email.toLowerCase().trim(),
            phone,
            role,
            job_titles: jobTitles,
            has_login: hasLogin,
            password: password || undefined
        };

        onSave(memberData);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content nova-pauta-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
                <div className="nova-pauta-header-premium">
                    <div className="header-left-premium">
                        <div className="header-icon-premium">
                            <UserPlus size={22} />
                        </div>
                        <div className="header-titles-premium">
                            <h2>{isEditMode ? 'Editar Perfil' : 'Novo Usuário'}</h2>
                            <span className="header-subtitle-premium">
                                {isEditMode ? 'Atualize as permissões e dados do colaborador' : 'Cadastre um novo membro para a equipe interna'}
                            </span>
                        </div>
                    </div>
                    <button className="close-btn-premium" onClick={onClose} title="Fechar">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="nova-pauta-body-premium" noValidate>
                    {/* --- Seção 1: Dados do Colaborador --- */}
                    <div className="modal-section-group-premium">
                        <div className="section-header-premium">
                            <span className="section-number-premium">01</span>
                            <h3>Dados Básicos</h3>
                        </div>

                        <div className="nova-pauta-field-premium">
                            <label className="field-label-premium">Nome Completo</label>
                            <input
                                type="text"
                                className="input-premium title-input-premium"
                                placeholder="Ex: João Silva"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="fields-grid-2-premium" style={{ marginTop: '0.5rem' }}>
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">E-mail {!isEditMode && hasLogin ? '*' : '(Opcional)'}</label>
                                <input
                                    type="email"
                                    className="input-premium"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="usuario@secom.gov.br"
                                    required={!isEditMode && hasLogin}
                                />
                            </div>

                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">WhatsApp / Celular</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="(00) 90000-0000"
                                />
                            </div>
                        </div>
                    </div>

                    {/* --- Seção 2: Funções e Especialidades --- */}
                    <div className="modal-section-group-premium alternate-bg-premium">
                        <div className="section-header-premium">
                            <span className="section-number-premium">02</span>
                            <h3>Funções e Especialidades</h3>
                        </div>

                        <div className="nova-pauta-field-premium">
                            <div className="job-tags-grid-premium">
                                {Array.from(new Set([...jobFunctions.map(jf => jf.title), ...jobTitles])).map(title => {
                                    const isOrphaned = !jobFunctions.find(jf => jf.title === title);
                                    const isSelected = jobTitles.includes(title);
                                    return (
                                        <label
                                            key={title}
                                            className={`job-tag-premium-fixed ${isSelected ? 'active' : ''} ${isOrphaned ? 'orphaned' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => setJobTitles(prev =>
                                                    prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
                                                )}
                                                style={{ display: 'none' }}
                                            />
                                            {title}
                                            {isOrphaned && <span className="tag-hint-premium">(Antigo)</span>}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* --- Seção 3: Controle de Acesso --- */}
                    <div className="modal-section-group-premium">
                        <div className="section-header-premium">
                            <span className="section-number-premium">03</span>
                            <h3>Controle de Acesso</h3>
                        </div>

                        <div className="fields-grid-2-premium">
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Nível de Permissão</label>
                                <select 
                                    className="input-premium select-premium" 
                                    value={role} 
                                    onChange={e => setRole(e.target.value)} 
                                    required
                                >
                                    <option value="user">Usuário Comum</option>
                                    <option value="admin">Administrador</option>
                                    <option value="viewer">Somente Visualização</option>
                                    <option value="motorista">Motorista (Sem Acesso)</option>
                                    {isDev && <option value="desenvolvedor">Desenvolvedor</option>}
                                </select>
                            </div>

                            {!isEditMode && hasLogin && (
                                <div className="nova-pauta-field-premium">
                                    <label className="field-label-premium">Senha Inicial *</label>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            className="input-premium"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Mínimo 6 caracteres"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            className="pass-toggle-btn-premium"
                                            onClick={() => setShowPass(v => !v)}
                                        >
                                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={`pauta-externa-toggle-card-premium ${hasLogin ? 'active' : ''} mt-1-premium`}
                            onClick={() => setHasLogin(!hasLogin)}>
                            <div className="toggle-info-premium">
                                <span className="toggle-title-premium">Permitir acesso ao sistema?</span>
                                <span className="toggle-description-premium">
                                    {hasLogin 
                                        ? 'O usuário poderá fazer login e acessar as ferramentas' 
                                        : 'Perfil somente para alocação (motoristas, etc), sem acesso direto'}
                                </span>
                            </div>
                            <div className={`toggle-switch-premium ${hasLogin ? 'on' : ''}`}>
                                <div className="toggle-knob-premium"></div>
                            </div>
                        </div>
                    </div>

                    <div className="nova-pauta-footer-premium">
                        <button type="button" className="btn-cancel-premium" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-save-premium" disabled={!name}>
                            <span>{isEditMode ? 'Salvar Alterações' : 'Criar Usuário'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
