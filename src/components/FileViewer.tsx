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
                        <a 
                            href={attachment.url} 
                            download={attachment.name} 
                            className="icon-btn-light" 
                            title="Fazer Download"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Download size={20} />
                        </a>
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
                            src={attachment.url}
                            alt={attachment.name}
                            className="preview-image"
                        />
                    )}

                    {isVideo && (
                        <video 
                            src={attachment.url} 
                            controls 
                            autoPlay 
                            className="preview-video"
                            style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 'var(--radius-md)' }}
                        />
                    )}

                    {isPDF && (
                        <iframe
                            src={`${attachment.url}#toolbar=0`}
                            title={attachment.name}
                            className="preview-pdf"
                            style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 'var(--radius-md)' }}
                        />
                    )}

                    {(!isImage && !isVideo && !isPDF) && (
                        <div className="unsupported-placeholder">
                            <p>Formato não suportado para visualização direta.</p>
                            <a 
                                href={attachment.url} 
                                download 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn-primary" 
                                style={{ marginTop: '1rem', textDecoration: 'none' }}
                            >
                                <Download size={18} /> Baixar Arquivo
                            </a>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
