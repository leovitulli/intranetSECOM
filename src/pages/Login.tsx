import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import './Login.css';

export default function Login() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    // Auto-redirect if already logged in
    useEffect(() => {
        if (user && !isAuthLoading) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, isAuthLoading, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                setErrorMsg('Falha no login. Verifique seu e-mail e senha.');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setErrorMsg('Ocorreu um erro inesperado.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-visual">
                <div className="visual-content glass">
                    <h1 className="text-gradient">Comunica Hub</h1>
                    <p>O centro nervoso da comunicação da SECOM. Pautas, aprovações e criatividade conectadas.</p>

                    <div className="features-list">
                        <div className="feature-item">
                            <div className="feature-icon">📝</div>
                            <span>Gestão Centralizada de Pautas</span>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">✅</div>
                            <span>Fluxo de Correção e Aprovação</span>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">📰</div>
                            <span>Feed de Notícias Internas</span>
                        </div>
                    </div>
                </div>
                <div className="visual-decoration decoration-1"></div>
                <div className="visual-decoration decoration-2"></div>
            </div>

            <div className="login-form-wrapper">
                <div className="login-form-box">
                    <div className="login-header">
                        <h2>Acesse sua conta</h2>
                        <p className="text-muted">Entre com suas credenciais departamentais</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {errorMsg && (
                            <div className="error-message" style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'var(--color-danger-light, rgba(239,68,68,0.1))', borderRadius: '4px' }}>
                                {errorMsg}
                            </div>
                        )}
                        <div className="form-group">
                            <label htmlFor="email">E-mail Corporativo</label>
                            <input
                                type="email"
                                id="email"
                                placeholder="nome@secom.gov.br"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Senha</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-options">
                            <label className="checkbox-container">
                                <input type="checkbox" />
                                <span className="checkmark"></span>
                                Manter conectado
                            </label>
                            <a href="#" className="forgot-password">Esqueceu a senha?</a>
                        </div>

                        <button type="submit" className="login-submit-btn" disabled={isLoading}>
                            {isLoading ? <span className="loader"></span> : 'Entrar no Hub'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>Precisa de acesso? <a href="#">Solicite ao RH/TI</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
