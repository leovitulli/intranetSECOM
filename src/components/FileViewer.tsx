import { X, Download } from 'lucide-react';
import type { Attachment } from '../types/kanban';
import './FileViewer.css';

interface FileViewerProps {
    attachment: Attachment;
    onClose: () => void;
}

export default function FileViewer({ attachment, onClose }: FileViewerProps) {
    const isImage = attachment.type === 'image';
    const isVideo = attachment.type === 'video';
    const isPDF = attachment.type === 'pdf';

    return (
        <div className="file-viewer-overlay" onClick={onClose}>
            <div className="file-viewer-container" onClick={e => e.stopPropagation()}>

                {/* Header Bar */}
                <div className="file-viewer-header">
                    <div className="file-info">
                        <h3 className="file-name">{attachment.name}</h3>
                        <span className="file-size">{attachment.size}</span>
                    </div>

                    <div className="file-actions">
                        <button className="icon-btn-light" title="Fazer Download (Simulado)">
                            <Download size={20} />
                        </button>
                        <div className="divider"></div>
                        <button className="icon-btn-light" onClick={onClose} title="Fechar">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="file-viewer-content">
                    {isImage && (
                        <img
                            src="https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=1000&auto=format&fit=crop"
                            alt={attachment.name}
                            className="preview-image"
                        />
                    )}

                    {isVideo && (
                        <div className="video-placeholder">
                            <div className="play-circle">▶</div>
                            <p>Preview de Vídeo (Mock)</p>
                        </div>
                    )}

                    {isPDF && (
                        <div className="pdf-placeholder">
                            <p>📄 Preview de Arquivo PDF (Mock)</p>
                        </div>
                    )}

                    {(!isImage && !isVideo && !isPDF) && (
                        <div className="unsupported-placeholder">
                            <p>Formato não suportado para visualização no navegador.</p>
                            <button className="btn-primary" style={{ marginTop: '1rem' }}>
                                Baixar Arquivo
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
