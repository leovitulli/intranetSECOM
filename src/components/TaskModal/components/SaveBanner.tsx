import React from 'react';

interface SaveBannerProps {
    show: boolean;
    isSaving: boolean;
    onDiscard: () => void;
    onSave: (closeAfter?: boolean) => void;
}

export const SaveBanner: React.FC<SaveBannerProps> = ({
    show,
    isSaving,
    onDiscard,
    onSave
}) => {
    if (!show) return null;

    return (
        <div className="save-banner-premium" style={{ 
            position: 'absolute', 
            bottom: '2rem', 
            right: '2.5rem', 
            width: '340px', 
            padding: '1.25rem', 
            background: '#1e293b', 
            borderRadius: 16, 
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', 
            zIndex: 1100,
            animation: 'slideUp 0.3s ease-out',
            border: '1px solid rgba(255,255,255,0.1)'
        }}>
            <div style={{ color: 'white', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.85rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <div style={{ 
                    width: 6, 
                    height: 6, 
                    background: isSaving ? '#3b82f6' : '#f59e0b', 
                    borderRadius: '50%',
                    boxShadow: isSaving ? '0 0 8px #3b82f6' : 'none'
                }}></div>
                {isSaving ? 'Salvando alterações...' : 'Alterações não salvas'}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                    className="btn-save-banner-cancel-premium" 
                    style={{ flex: 1, padding: '10px 8px', fontSize: '0.75rem', opacity: isSaving ? 0.5 : 1 }} 
                    onClick={onDiscard}
                    disabled={isSaving}
                >Descartar</button>
                <button 
                    className="btn-save-banner-confirm-premium" 
                    style={{ 
                        flex: 1.5, 
                        padding: '10px 8px', 
                        fontSize: '0.75rem', 
                        background: isSaving ? '#64748b' : undefined,
                        cursor: isSaving ? 'not-allowed' : 'pointer'
                    }} 
                    onClick={() => onSave(false)}
                    disabled={isSaving}
                >
                    {isSaving ? 'Processando...' : 'Salvar Tudo'}
                </button>
            </div>
        </div>
    );
};
