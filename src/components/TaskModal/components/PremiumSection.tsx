import React from 'react';

interface PremiumSectionProps {
    title: string;
    icon?: React.ReactNode;
    number?: string | number;
    isEditing?: boolean;
    onEdit?: () => void;
    isViewer?: boolean;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    alternateBg?: boolean;
    specialBg?: string; // e.g. 'inuag-premium-bg'
}

export const PremiumSection: React.FC<PremiumSectionProps> = ({
    title, icon, number, isEditing, onEdit, isViewer, children, className = '', style, alternateBg, specialBg
}) => {
    const bgClass = specialBg ? specialBg : (alternateBg ? 'alternate-bg-premium' : '');
    
    return (
        <div className={`modal-section-group-premium ${bgClass} ${className}`} style={style}>
            <div className="section-header-premium">
                {number && <div className="section-number-premium">{number}</div>}
                {icon && <div className="section-icon-premium">{icon}</div>}
                <h3>{title}</h3>
                {!isEditing && !isViewer && onEdit && (
                    <button className="btn-edit-premium" onClick={onEdit}>Editar</button>
                )}
            </div>
            {children}
        </div>
    );
};
