import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { SECRETARIAS } from '../utils/secretarias';
import './SecretariasMultiSelect.css';

interface SecretariasMultiSelectProps {
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
}

export default function SecretariasMultiSelect({ selected, onChange, placeholder = 'Buscar secretaria...' }: SecretariasMultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filtered = SECRETARIAS.filter(s =>
        s.toLowerCase().includes(query.toLowerCase()) && !selected.includes(s)
    );

    const toggle = (sec: string) => {
        onChange(selected.includes(sec) ? selected.filter(s => s !== sec) : [...selected, sec]);
    };

    const remove = (sec: string) => onChange(selected.filter(s => s !== sec));

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="sms-container" ref={containerRef}>
            <div className="sms-trigger" onClick={() => setIsOpen(v => !v)}>
                <div className="sms-pills">
                    {selected.length === 0 && (
                        <span className="sms-placeholder">Selecione secretarias...</span>
                    )}
                    {selected.map(s => (
                        <span key={s} className="sms-pill">
                            {s}
                            <button
                                type="button"
                                className="sms-pill-remove"
                                onClick={e => { e.stopPropagation(); remove(s); }}
                            >
                                <X size={10} />
                            </button>
                        </span>
                    ))}
                </div>
                <ChevronDown size={16} className={`sms-chevron${isOpen ? ' open' : ''}`} />
            </div>

            {isOpen && (
                <div className="sms-dropdown">
                    <div className="sms-search">
                        <Search size={14} />
                        <input
                            autoFocus
                            type="text"
                            placeholder={placeholder}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </div>
                    <ul className="sms-list">
                        {filtered.length === 0 && (
                            <li className="sms-no-results">Nenhum resultado.</li>
                        )}
                        {filtered.map(s => (
                            <li key={s} className="sms-option" onClick={() => toggle(s)}>
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
