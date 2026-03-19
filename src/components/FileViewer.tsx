import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, ChevronLeft, ChevronRight, File as FileIcon, Image as ImageIcon } from 'lucide-react';
import './FileViewer.css';

interface Attachment {
    id: string;
    name: string;
    url: string;
    type: string;
    size: string;
}

interface FileViewerProps {
    attachment: Attachment;
    attachments: Attachment[];
    onClose: () => void;
}

export default function FileViewer({ attachment, attachments, onClose }: FileViewerProps) {
    const items = (attachments && attachments.length > 0) ? attachments : [attachment];
    const [currentIndex, setCurrentIndex] = useState(() => {
        const found = items.findIndex(a => a.id === attachment.id);
        return found !== -1 ? found : 0;
    });

    const currentAttachment = items[currentIndex] || attachment;
    const isImage = currentAttachment.type === 'image';
    const isVideo = currentAttachment.type === 'video';
    const isPDF = currentAttachment.type === 'pdf';

    const handlePrevious = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : items.length - 1));
    }, [items.length]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex(prev => (prev < items.length - 1 ? prev + 1 : 0));
    }, [items.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handlePrevious();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrevious, onClose]);

    return (
        <div className="file-viewer-overlay" onClick={onClose}>
            {/* Navegação Lateral Fixa */}
            {items.length > 1 && (
                <>
                    <button className="nav-btn-gallery nav-prev" onClick={handlePrevious}>
                        <ChevronLeft size={48} strokeWidth={2.5} />
                    </button>
                    <button className="nav-btn-gallery nav-next" onClick={handleNext}>
                        <ChevronRight size={48} strokeWidth={2.5} />
                    </button>
                </>
            )}

            <div className="file-viewer-container" onClick={e => e.stopPropagation()}>
                <div className="file-viewer-header">
                    <div className="file-info">
                        <h3 className="file-name">
                            {items.length > 1 && <span className="gallery-counter">{currentIndex + 1} de {items.length}</span>} 
                            {currentAttachment.name}
                        </h3>
                        <span className="file-size">{currentAttachment.size}</span>
                    </div>

                    <div className="file-actions">
                        <a href={currentAttachment.url} download={currentAttachment.name} className="icon-btn-light" target="_blank" rel="noopener noreferrer">
                            <Download size={20} />
                        </a>
                        <div className="divider"></div>
                        <button className="icon-btn-light" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="file-viewer-content">
                    <div className="preview-main-container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
                        {isImage && <img src={currentAttachment.url} alt={currentAttachment.name} className="preview-image" />}
                        {isVideo && <video src={currentAttachment.url} controls autoPlay className="preview-video" style={{ maxWidth: '100%', maxHeight: '65vh' }} />}
                        {isPDF && <iframe src={`${currentAttachment.url}#toolbar=0`} title={currentAttachment.name} style={{ width: '100%', height: '65vh', border: 'none' }} />}
                    </div>

                    {/* BARRA DE MINIATURAS (THUMBNAILS) */}
                    {items.length > 1 && (
                        <div className="gallery-thumbnails-bar">
                            {items.map((item, idx) => (
                                <div 
                                    key={item.id} 
                                    className={`thumb-item ${idx === currentIndex ? 'active' : ''}`}
                                    onClick={() => setCurrentIndex(idx)}
                                >
                                    {item.type === 'image' ? (
                                        <img src={item.url} alt="thumb" />
                                    ) : (
                                        <div className="thumb-placeholder">{item.type.charAt(0).toUpperCase()}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
