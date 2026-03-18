/**
 * MultiSelect.tsx — Componente genérico de seleção múltipla.
 * Substitui TeamMultiSelect e SecretariasMultiSelect.
 *
 * Modo string (SecretariasMultiSelect):
 *   <MultiSelect options={SECRETARIAS} selected={s} onChange={setS} />
 *
 * Modo objeto (TeamMultiSelect):
 *   <MultiSelect
 *     options={team}
 *     selected={names}
 *     onChange={setNames}
 *     getLabel={m => m.name}
 *     getSubLabel={m => m.job_titles?.[0] ?? m.role}
 *     getValue={m => m.name}
 *   />
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import './MultiSelect.css';

type AnyOption = string | Record<string, any>;

interface MultiSelectProps<T extends AnyOption> {
    options: T[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    getLabel?: (opt: T) => string;
    getSubLabel?: (opt: T) => string;
    getValue?: (opt: T) => string;
}

export default function MultiSelect<T extends AnyOption>({
    options, selected, onChange, placeholder = 'Selecione...',
    getLabel, getSubLabel, getValue,
}: MultiSelectProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    const lbl = (o: T) => getLabel ? getLabel(o) : (o as string);
    const val = (o: T) => getValue ? getValue(o) : (o as string);
    const sub = (o: T) => getSubLabel ? getSubLabel(o) : undefined;

    const filtered = options.filter(o =>
        lbl(o).toLowerCase().includes(query.toLowerCase())
    );

    const toggle = (o: T) => {
        const v = val(o);
        onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v]);
    };

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false); setQuery('');
            }
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    return (
        <div className="ms-container" ref={ref}>
            <div className="ms-trigger" onClick={() => setIsOpen(v => !v)}>
                <div className="ms-pills">
                    {selected.length === 0
                        ? <span className="ms-placeholder">{placeholder}</span>
                        : selected.map(v => (
                            <span key={v} className="ms-pill">
                                {v}
                                <button type="button" className="ms-pill-remove"
                                    onClick={e => { e.stopPropagation(); onChange(selected.filter(s => s !== v)); }}>
                                    <X size={10} />
                                </button>
                            </span>
                        ))
                    }
                </div>
                <ChevronDown size={16} className={`ms-chevron ${isOpen ? 'open' : ''}`} />
            </div>

            {isOpen && (
                <div className="ms-dropdown">
                    <div className="ms-search">
                        <Search size={14} />
                        <input autoFocus type="text" placeholder="Buscar..."
                            value={query} onChange={e => setQuery(e.target.value)} />
                    </div>
                    <ul className="ms-list">
                        {filtered.length === 0
                            ? <li className="ms-empty">Nenhum resultado.</li>
                            : filtered.map((o, i) => {
                                const v = val(o);
                                const s = sub(o);
                                const sel = selected.includes(v);
                                return (
                                    <li key={v ?? i} className={`ms-option ${sel ? 'selected' : ''}`}
                                        onClick={() => toggle(o)}>
                                        <div className="ms-check">
                                            {sel && <div className="ms-check-dot" />}
                                        </div>
                                        <div className="ms-option-info">
                                            <span className="ms-option-label">{lbl(o)}</span>
                                            {s && <span className="ms-option-sublabel">{s}</span>}
                                        </div>
                                    </li>
                                );
                            })
                        }
                    </ul>
                </div>
            )}
        </div>
    );
}
