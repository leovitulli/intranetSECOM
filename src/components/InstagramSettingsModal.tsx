import { useState, useEffect } from 'react';
import { X, Settings, Facebook, Instagram, Key, ShieldCheck, HelpCircle, ChevronRight, Save, CheckCircle2, BrainCircuit, AlertCircle } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import './InstagramSettingsModal.css';

interface InstagramSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function InstagramSettingsModal({ isOpen, onClose }: InstagramSettingsModalProps) {
    const [igHandle, setIgHandle] = useState('');
    const [appId, setAppId] = useState('');
    const [appSecret, setAppSecret] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'claude'>('gemini');
    const [aiKey, setAiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [aiStatus, setAiStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    
    const [activeStep, setActiveStep] = useState<number | null>(1);

    useEffect(() => {
        if (isOpen) {
            setIgHandle(localStorage.getItem('ig_handle') || '');
            setAppId(localStorage.getItem('ig_appId') || '');
            setAppSecret(localStorage.getItem('ig_appSecret') || '');
            setAccessToken(localStorage.getItem('ig_accessToken') || '');
            setAiProvider((localStorage.getItem('ig_aiProvider') as any) || 'gemini');
            setAiKey(localStorage.getItem('ig_aiKey') || '');
            setAiStatus('idle');
            setSaveSuccess(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        setAiStatus('testing');
        
        try {
            // Test AI Key based on provider
            if (aiKey) {
                if (aiProvider === 'gemini') {
                    const genAI = new GoogleGenerativeAI(aiKey);
                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                    await model.generateContent("Respond with exactly 'OK'.");
                } else if (aiProvider === 'openai') {
                    const openai = new OpenAI({ apiKey: aiKey, dangerouslyAllowBrowser: true });
                    await openai.models.list();
                } else if (aiProvider === 'claude') {
                    // Anthropic SDK doesn't allow browser usage by default without a proxy,
                    // but we can test a simple raw fetch just for validation.
                    const res = await fetch("https://api.anthropic.com/v1/messages", {
                        method: "POST",
                        headers: { "x-api-key": aiKey, "anthropic-version": "2023-06-01", "content-type": "application/json", "anthropic-dangerous-direct-browser-access": "true" },
                        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 10, messages: [{ role: "user", content: "Say OK" }] })
                    });
                    if (!res.ok) throw new Error("Claude auth failed");
                }
                setAiStatus('success');
            } else {
                setAiStatus('idle');
            }
            
            // Save to browser's local storage for persistence
            localStorage.setItem('ig_handle', igHandle);
            localStorage.setItem('ig_appId', appId);
            localStorage.setItem('ig_appSecret', appSecret);
            localStorage.setItem('ig_accessToken', accessToken);
            localStorage.setItem('ig_aiProvider', aiProvider);
            localStorage.setItem('ig_aiKey', aiKey);

            setIsSaving(false);
            setSaveSuccess(true);
            setTimeout(() => {
                setSaveSuccess(false);
                onClose();
            }, 2000);
        } catch (error) {
            console.error("Gemini Validation Error:", error);
            setAiStatus('error');
            setIsSaving(false);
        }
    };

    const toggleStep = (step: number) => {
        setActiveStep(activeStep === step ? null : step);
    };

    return (
        <div className="ig-modal-overlay" onClick={onClose}>
            <div className="ig-modal-content" onClick={e => e.stopPropagation()}>
                <button className="ig-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="ig-modal-header">
                    <div className="ig-modal-icon">
                        <Settings size={24} />
                    </div>
                    <div>
                        <h2>Configurações da API</h2>
                        <p>Integração oficial com Meta Graph API</p>
                    </div>
                </div>

                <div className="ig-modal-body">
                    {/* Left Column: Form */}
                    <div className="ig-modal-form-section">
                        <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}><Facebook size={18} color="#3b82f6" /> 1. Conexão do Instagram</h3>
                            <p className="ig-form-desc" style={{ marginTop: '4px' }}>Insira o perfil a ser analisado e as chaves do Meta for Developers.</p>
                            
                            <div className="ig-input-group" style={{ marginTop: '1rem' }}>
                                <label><Instagram size={16} /> Login do Instagram (@perfil)</label>
                                <input 
                                    type="text" 
                                    value={igHandle} 
                                    onChange={e => setIgHandle(e.target.value)} 
                                    placeholder="ex: @prefeituraguarulhos"
                                />
                            </div>

                            <div className="ig-input-group">
                            <label><Facebook size={16} /> App ID (ID do Aplicativo)</label>
                            <input 
                                type="text" 
                                placeholder="Ex: 123456789012345" 
                                value={appId}
                                onChange={e => setAppId(e.target.value)}
                            />
                        </div>

                        <div className="ig-input-group">
                            <label><ShieldCheck size={16} /> App Secret (Chave Secreta)</label>
                            <input 
                                type="password" 
                                placeholder="Insira a chave secreta do aplicativo" 
                                value={appSecret}
                                onChange={e => setAppSecret(e.target.value)}
                            />
                        </div>

                        <div className="ig-input-group">
                            <label><Key size={16} /> Long-Lived Access Token</label>
                            <textarea 
                                placeholder="Cole aqui o Token de Acesso de Longa Duração..." 
                                value={accessToken}
                                onChange={e => setAccessToken(e.target.value)}
                                rows={2}
                            />
                        </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}><BrainCircuit size={18} color="#8b5cf6" /> 2. Conexão do Cérebro (IA)</h3>
                            <p className="ig-form-desc" style={{ marginTop: '4px' }}>Escolha o motor de inteligência artificial que fará a leitura e o resumo das reclamações.</p>
                        
                            <div className="ig-input-group" style={{ marginTop: '1rem' }}>
                                <label><BrainCircuit size={16} color="#8b5cf6" /> Provedor de IA (Motor Semântico)</label>
                            <select 
                                value={aiProvider} 
                                onChange={e => {
                                    setAiProvider(e.target.value as any);
                                    setAiStatus('idle');
                                }}
                                style={{ padding: '0.875rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.95rem' }}
                            >
                                <option value="gemini">Google Gemini (Gemini 1.5 Flash)</option>
                                <option value="openai">OpenAI (ChatGPT / GPT-4o Mini)</option>
                                <option value="claude">Anthropic (Claude 4.5 Haiku)</option>
                            </select>
                        </div>

                        <div className="ig-input-group">
                            <label><Key size={16} color="#8b5cf6" /> Chave de API ({aiProvider === 'gemini' ? 'Google' : aiProvider === 'openai' ? 'OpenAI' : 'Anthropic'})</label>
                            <input 
                                type="password" 
                                placeholder={aiProvider === 'gemini' ? 'AIzaSy...' : aiProvider === 'openai' ? 'sk-proj-...' : 'sk-ant-...'} 
                                value={aiKey}
                                onChange={e => setAiKey(e.target.value)}
                                style={{ borderColor: aiStatus === 'error' ? '#ef4444' : aiStatus === 'success' ? '#10b981' : undefined }}
                            />
                            {aiStatus === 'error' && <span style={{ color: '#ef4444', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><AlertCircle size={12}/> Chave inválida ou sem créditos</span>}
                            {aiStatus === 'success' && <span style={{ color: '#10b981', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><CheckCircle2 size={12}/> IA Conectada e Operante</span>}
                            {aiStatus === 'testing' && <span style={{ color: '#3b82f6', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>Testando chave no servidor...</span>}
                        </div>
                        </div>

                        <button 
                            className={`ig-btn-save ${saveSuccess ? 'success' : ''}`}
                            onClick={handleSave}
                            disabled={isSaving || (!appId && !appSecret && !accessToken && !aiKey)}
                        >
                            {isSaving ? 'Salvando...' : saveSuccess ? <><CheckCircle2 size={18} /> Salvo com Sucesso!</> : <><Save size={18} /> Salvar Configurações</>}
                        </button>
                    </div>

                    {/* Right Column: Guide */}
                    <div className="ig-modal-guide-section">
                        <h3><HelpCircle size={18} /> Como obter essas chaves?</h3>
                        <p className="ig-guide-intro">Siga os passos abaixo na plataforma Meta for Developers para gerar suas credenciais oficiais de forma gratuita.</p>

                        <div className="ig-guide-accordion">
                            <div className={`ig-guide-step ${activeStep === 1 ? 'active' : ''}`}>
                                <button className="ig-step-header" onClick={() => toggleStep(1)}>
                                    <span className="ig-step-num">1</span>
                                    <span>Criar App no Meta for Developers</span>
                                    <ChevronRight size={16} className="ig-chevron" />
                                </button>
                                <div className="ig-step-content">
                                    <p>1. Acesse <strong>developers.facebook.com</strong> e faça login com a conta do administrador da página da Prefeitura.</p>
                                    <p>2. Clique em <strong>Meus Aplicativos</strong> e depois em <strong>Criar Aplicativo</strong>.</p>
                                    <p>3. Selecione o tipo <strong>Empresa</strong> e dê um nome ao aplicativo (ex: "Radar Comunica Hub").</p>
                                </div>
                            </div>

                            <div className={`ig-guide-step ${activeStep === 2 ? 'active' : ''}`}>
                                <button className="ig-step-header" onClick={() => toggleStep(2)}>
                                    <span className="ig-step-num">2</span>
                                    <span>Adicionar Produtos</span>
                                    <ChevronRight size={16} className="ig-chevron" />
                                </button>
                                <div className="ig-step-content">
                                    <p>1. No painel do aplicativo, vá em <strong>Adicionar Produto</strong>.</p>
                                    <p>2. Encontre <strong>API de Gráficos do Instagram</strong> e clique em Configurar.</p>
                                    <p>3. Adicione também o <strong>Login do Facebook para Empresas</strong> para autorizar o acesso à página vinculada.</p>
                                </div>
                            </div>

                            <div className={`ig-guide-step ${activeStep === 3 ? 'active' : ''}`}>
                                <button className="ig-step-header" onClick={() => toggleStep(3)}>
                                    <span className="ig-step-num">3</span>
                                    <span>Copiar ID e Secret</span>
                                    <ChevronRight size={16} className="ig-chevron" />
                                </button>
                                <div className="ig-step-content">
                                    <p>1. No menu lateral esquerdo, vá em <strong>Configurações &gt; Básico</strong>.</p>
                                    <p>2. Lá você encontrará o <strong>App ID</strong> e o <strong>App Secret</strong> (clique em mostrar e digite sua senha do Facebook).</p>
                                    <p>3. Copie esses valores e cole no formulário ao lado.</p>
                                </div>
                            </div>

                            <div className={`ig-guide-step ${activeStep === 4 ? 'active' : ''}`}>
                                <button className="ig-step-header" onClick={() => toggleStep(4)}>
                                    <span className="ig-step-num">4</span>
                                    <span>Gerar o Access Token</span>
                                    <ChevronRight size={16} className="ig-chevron" />
                                </button>
                                <div className="ig-step-content">
                                    <p>1. Acesse a ferramenta <strong>Explorador da API de Gráficos</strong> (Graph API Explorer).</p>
                                    <p>2. Selecione seu Aplicativo e gere um Token de Acesso de Usuário com as permissões: <code>instagram_basic</code>, <code>instagram_manage_comments</code> e <code>pages_show_list</code>.</p>
                                    <p>3. Utilize a ferramenta de "Access Token Debugger" para estender a validade desse token para 60 dias (Token de Longa Duração) e cole-o aqui.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
