import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check } from 'lucide-react';
import getCroppedImg from '../utils/cropImage';

interface ImageCropperModalProps {
    imageSrc: string;
    onClose: () => void;
    onCropCompleteAction: (croppedFile: File, previewUrl: string) => void;
}

export default function ImageCropperModal({ imageSrc, onClose, onCropCompleteAction }: ImageCropperModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        try {
            setIsSaving(true);
            const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (croppedFile) {
                const previewUrl = URL.createObjectURL(croppedFile);
                onCropCompleteAction(croppedFile, previewUrl);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
            <div className="modal-content nova-pauta-modal" style={{ maxWidth: '600px', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                
                <div className="nova-pauta-header-premium">
                    <div className="header-left-premium">
                        <div className="header-titles-premium">
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Ajustar Foto de Perfil</h2>
                            <span className="header-subtitle-premium">Arraste a imagem e use o zoom para alinhar</span>
                        </div>
                    </div>
                    <button className="close-btn-premium" onClick={onClose} disabled={isSaving}>
                        <X size={20} />
                    </button>
                </div>

                <div className="nova-pauta-body-premium" style={{ background: '#111', position: 'relative', minHeight: '400px', flex: '1 0 400px', width: '100%', padding: 0 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>
                </div>

                <div className="nova-pauta-footer-premium" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, marginRight: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Zoom</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            style={{ flex: 1, accentColor: '#3b82f6' }}
                        />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" className="btn-cancel-premium" onClick={onClose} disabled={isSaving}>
                            Cancelar
                        </button>
                        <button 
                            type="button" 
                            className="btn-save-premium" 
                            onClick={handleSave} 
                            disabled={isSaving}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            {isSaving ? 'Recortando...' : <><Check size={16} /> Confirmar</>}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
