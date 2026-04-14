export const normalizeText = (text?: string | null): string => {
    if (!text) return '';
    return text.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};
