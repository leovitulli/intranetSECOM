import { useMemo } from 'react';
import { X, Printer, Calendar, BarChart2, Hash, FileSpreadsheet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx-js-style';
import './RadarReportModal.css';

interface RadarReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    news: any[];
    byCategory: { name: string; value: number }[];
    periodLabel: string;
    userName: string;
}

export default function RadarReportModal({ isOpen, onClose, news, byCategory, periodLabel, userName }: RadarReportModalProps) {
    
    const { sortedNews, byMonth, mediaMensal, total } = useMemo(() => {
        const sorted = [...news].sort((a, b) => new Date(a.published_at || 0).getTime() - new Date(b.published_at || 0).getTime());
        
        const mMap = new Map<string, number>();
        sorted.forEach(item => {
            if (item.published_at) {
                const date = parseISO(item.published_at);
                const label = format(date, 'MMMM/yyyy', { locale: ptBR }).toUpperCase();
                mMap.set(label, (mMap.get(label) || 0) + 1);
            }
        });
        
        const byM = Array.from(mMap.entries()).map(([month, count]) => ({ month, count }));
        const media = byM.length > 0 ? Math.round(sorted.length / byM.length) : sorted.length;

        return {
            sortedNews: sorted,
            byMonth: byM,
            mediaMensal: media,
            total: sorted.length
        };
    }, [news]);

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        
        // Sheet 1: Raw Data with Metadata
        const now = new Date();
        const wsDataRaw: any[][] = [
            ["RELATÓRIO DE RELEASES / PAUTAS - COMUNICA HUB"],
            ["Filtro de Período:", periodLabel],
            ["Gerado por:", userName],
            ["Data da exportação:", format(now, 'dd/MM/yyyy')],
            ["Hora da exportação:", format(now, 'HH:mm')],
            [],
            ["Nº", "DATA", "SIGLA", "TÍTULO DO RELEASE / NOTÍCIA"],
            ...sortedNews.map((item, idx) => [
                idx + 1,
                item.published_at ? format(parseISO(item.published_at), 'dd/MM/yyyy') : '-',
                item.category || 'OUTROS',
                item.title
            ])
        ];
        
        const wsData = XLSX.utils.aoa_to_sheet(wsDataRaw);
        
        // --- STYLES FOR RELEASES SHEET ---
        const rangeData = XLSX.utils.decode_range(wsData['!ref'] || "A1:A1");
        for (let R = 0; R <= rangeData.e.r; ++R) {
            for (let C = 0; C <= rangeData.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
                if (!wsData[cellRef]) continue;

                if (!wsData[cellRef].s) wsData[cellRef].s = {};
                
                // Base borders for everything below meta
                if (R >= 6) {
                    wsData[cellRef].s.border = {
                        top: { style: 'thin', color: { rgb: "E2E8F0" } },
                        bottom: { style: 'thin', color: { rgb: "E2E8F0" } },
                        left: { style: 'thin', color: { rgb: "E2E8F0" } },
                        right: { style: 'thin', color: { rgb: "E2E8F0" } }
                    };
                }

                if (R === 0 && C === 0) {
                    wsData[cellRef].s = { font: { bold: true, sz: 14, color: { rgb: "1E3A8A" } } };
                } else if (R >= 1 && R <= 4 && C === 0) {
                    wsData[cellRef].s.font = { bold: true, color: { rgb: "475569" } };
                } else if (R >= 1 && R <= 4 && C === 1) {
                    wsData[cellRef].s.font = { color: { rgb: "0F172A" } };
                } else if (R === 6) { // Header
                    wsData[cellRef].s = {
                        font: { bold: true, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: "1E3A8A" } },
                        alignment: { horizontal: "center", vertical: "center" }
                    };
                } else if (R > 6) { // Data rows
                    wsData[cellRef].s.alignment = { vertical: "center" };
                    if (C === 0 || C === 1) wsData[cellRef].s.alignment.horizontal = "center";
                    if (C === 2) {
                        wsData[cellRef].s.font = { bold: true, color: { rgb: "334155" } };
                        wsData[cellRef].s.alignment.horizontal = "center";
                        wsData[cellRef].s.fill = { fgColor: { rgb: "F8FAFC" } };
                    }
                }
            }
        }

        // Set column widths
        wsData['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 18 }, { wch: 80 }];
        XLSX.utils.book_append_sheet(wb, wsData, "Releases");

        // --- Helper for basic table styling ---
        const styleTableSheet = (ws: any) => {
            const range = XLSX.utils.decode_range(ws['!ref'] || "A1:A1");
            for (let R = 0; R <= range.e.r; ++R) {
                for (let C = 0; C <= range.e.c; ++C) {
                    const cell = XLSX.utils.encode_cell({ c: C, r: R });
                    if (!ws[cell]) continue;
                    ws[cell].s = {
                        border: {
                            top: { style: 'thin', color: { rgb: "CBD5E1" } },
                            bottom: { style: 'thin', color: { rgb: "CBD5E1" } },
                            left: { style: 'thin', color: { rgb: "CBD5E1" } },
                            right: { style: 'thin', color: { rgb: "CBD5E1" } }
                        }
                    };
                    if (R === 0) {
                        ws[cell].s.font = { bold: true, color: { rgb: "FFFFFF" } };
                        ws[cell].s.fill = { fgColor: { rgb: "3B82F6" } };
                        ws[cell].s.alignment = { horizontal: "center" };
                    } else {
                        ws[cell].s.alignment = { vertical: "center" };
                        if (C === 1) ws[cell].s.alignment.horizontal = "center";
                    }
                }
            }
            ws['!cols'] = [{ wch: 25 }, { wch: 20 }];
        };

        // Sheet 2: Resumo Mês
        const monthData = byMonth.map(m => ({
            'MÊS': m.month,
            'Nº DE RELEASES': m.count
        }));
        monthData.push({ 'MÊS': 'TOTAL GERAL', 'Nº DE RELEASES': total });
        const wsMonth = XLSX.utils.json_to_sheet(monthData);
        styleTableSheet(wsMonth);
        XLSX.utils.book_append_sheet(wb, wsMonth, "Resumo Mensal");

        // Sheet 3: Resumo Secretaria
        const secData = byCategory.map(c => ({
            'SIGLA / SECRETARIA': c.name,
            'Nº DE RELEASES': c.value
        }));
        const wsSec = XLSX.utils.json_to_sheet(secData);
        styleTableSheet(wsSec);
        XLSX.utils.book_append_sheet(wb, wsSec, "Resumo Secretaria");

        // Save
        XLSX.writeFile(wb, `Radar_SECOM_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`);
    };

    if (!isOpen) return null;

    return (
        <div className="radar-report-overlay">
            <div className="radar-report-modal" onClick={(e) => e.stopPropagation()}>
                
                {/* No-print toolbar */}
                <div className="radar-report-toolbar no-print">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart2 size={20} color="#0ea5e9" />
                        Pré-visualização do Relatório
                    </h2>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn-save-premium" style={{ background: '#10b981', borderColor: '#059669' }} onClick={handleExportExcel}>
                            <FileSpreadsheet size={18} /> Baixar Excel (.xlsx)
                        </button>
                        <button className="btn-save-premium" onClick={() => window.print()}>
                            <Printer size={18} /> Imprimir / PDF
                        </button>
                        <button className="btn-cancel-premium" onClick={onClose} title="Fechar">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div className="radar-report-print-area">
                    {/* Header */}
                    <header className="report-header">
                        <div className="report-header-left">
                            <h1>RELATÓRIO DE RELEASES / PAUTAS</h1>
                            <div className="report-org">Secretaria de Comunicação - Comunica Hub</div>
                        </div>
                        <div className="report-header-right">
                            <div className="report-meta"><strong>PERÍODO:</strong> {periodLabel}</div>
                            <div className="report-meta"><strong>GERADO EM:</strong> {format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
                            <div className="report-meta"><strong>GERADO POR:</strong> {userName}</div>
                        </div>
                    </header>

                    {/* KPIs */}
                    <div className="report-kpis">
                        <div className="report-kpi-card">
                            <div className="kpi-icon"><Hash size={20} /></div>
                            <div className="kpi-info">
                                <span>TOTAL DE RELEASES</span>
                                <strong>{total}</strong>
                            </div>
                        </div>
                        <div className="report-kpi-card">
                            <div className="kpi-icon"><Calendar size={20} /></div>
                            <div className="kpi-info">
                                <span>MÉDIA MENSAL</span>
                                <strong>{mediaMensal}</strong>
                            </div>
                        </div>
                        <div className="report-kpi-card">
                            <div className="kpi-icon"><BarChart2 size={20} /></div>
                            <div className="kpi-info">
                                <span>SECRETARIAS ATIVAS</span>
                                <strong>{byCategory.length}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Summary Tables Side by Side */}
                    <div className="report-summaries">
                        {/* Month Summary */}
                        <div className="report-summary-box">
                            <h3>TOTAL GERAL POR MÊS</h3>
                            <table className="report-table-small">
                                <thead>
                                    <tr>
                                        <th>Mês</th>
                                        <th style={{ textAlign: 'right' }}>Nº de Releases</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byMonth.map((m, i) => (
                                        <tr key={i}>
                                            <td>{m.month}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{m.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td><strong>TOTAL</strong></td>
                                        <td style={{ textAlign: 'right', fontWeight: 800 }}>{total}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Category Summary */}
                        <div className="report-summary-box">
                            <h3>TOTAL GERAL POR SECRETARIA</h3>
                            <table className="report-table-small">
                                <thead>
                                    <tr>
                                        <th>Sigla / Secretaria</th>
                                        <th style={{ textAlign: 'right' }}>Nº de Releases</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byCategory.slice(0, 15).map((c, i) => (
                                        <tr key={i}>
                                            <td>{c.name}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Full Data Table */}
                    <div className="report-data-list">
                        <h3>CONTROLE DE RELEASES (DADOS BRUTOS)</h3>
                        <table className="report-table-large">
                            <thead>
                                <tr>
                                    <th style={{ width: '5%' }}>Nº</th>
                                    <th style={{ width: '12%' }}>DATA</th>
                                    <th style={{ width: '15%' }}>SIGLA</th>
                                    <th>TÍTULO DO RELEASE / NOTÍCIA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedNews.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                                        <td>{item.published_at ? format(parseISO(item.published_at), 'dd/MM/yyyy') : '-'}</td>
                                        <td><span className="badge-sigla">{item.category || 'OUTROS'}</span></td>
                                        <td style={{ fontWeight: 500, color: '#1e293b' }}>{item.title}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        </div>
    );
}
