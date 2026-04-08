-- [19] FUNÇÃO PARA BUSCAR ANIVERSARIANTES DO DIA
-- Retorna os nomes e avatares de quem faz aniversário hoje.

CREATE OR REPLACE FUNCTION public.get_birthdays_today() 
RETURNS TABLE (name TEXT, avatar_url TEXT) AS $$
BEGIN
    RETURN QUERY 
    SELECT u.name, u.avatar_url 
    FROM public.users u 
    WHERE u.birth_date IS NOT NULL 
    AND EXTRACT(MONTH FROM u.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM u.birth_date) = EXTRACT(DAY FROM CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_birthdays_today() TO authenticated;
