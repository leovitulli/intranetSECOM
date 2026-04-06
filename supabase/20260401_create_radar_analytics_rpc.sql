-- Migration: Create RPC function for radar_noticias analytics aggregation
-- This moves the aggregation logic to Postgres, avoiding the 1000-row limit

CREATE OR REPLACE FUNCTION get_radar_analytics(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_entrega_type TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
BEGIN
    WITH filtered AS (
        SELECT *
        FROM radar_noticias
        WHERE (p_start_date IS NULL OR published_at >= p_start_date)
          AND (p_end_date IS NULL OR published_at <= p_end_date)
          AND (p_category IS NULL OR category = p_category)
          AND (p_entrega_type IS NULL OR entrega_type = p_entrega_type)
    ),
    total_count AS (
        SELECT COUNT(*) AS cnt FROM radar_noticias
    ),
    by_category AS (
        SELECT COALESCE(category, 'Outros') AS name, COUNT(*) AS value
        FROM filtered
        GROUP BY category
        ORDER BY value DESC
    ),
    by_year AS (
        SELECT EXTRACT(YEAR FROM published_at)::INT AS year, COUNT(*) AS count
        FROM filtered
        WHERE published_at IS NOT NULL
        GROUP BY EXTRACT(YEAR FROM published_at)
        ORDER BY year
    ),
    deliveries AS (
        SELECT COALESCE(entrega_type, 'outros') AS type, COUNT(*) AS count
        FROM filtered
        WHERE is_entrega = true
        GROUP BY entrega_type
        ORDER BY count DESC
    ),
    entregas_total AS (
        SELECT COUNT(*) AS cnt FROM filtered WHERE is_entrega = true
    ),
    categories_list AS (
        SELECT DISTINCT category
        FROM filtered
        WHERE category IS NOT NULL AND category != ''
        ORDER BY category
    ),
    recent_news AS (
        SELECT id, title, url, category, published_at, is_entrega, entrega_type
        FROM filtered
        ORDER BY published_at DESC
        LIMIT 15
    ),
    all_news AS (
        SELECT id, title, url, category, published_at, is_entrega, entrega_type
        FROM filtered
        ORDER BY published_at DESC
    )
    SELECT json_build_object(
        'total', (SELECT COUNT(*) FROM filtered),
        'totalCount', (SELECT cnt FROM total_count),
        'byCategory', COALESCE((SELECT json_agg(json_build_object('name', name, 'value', value)) FROM by_category), '[]'::json),
        'byYear', COALESCE((SELECT json_agg(json_build_object('year', year, 'count', count)) FROM by_year), '[]'::json),
        'deliveries', COALESCE((SELECT json_agg(json_build_object('type', type, 'count', count)) FROM deliveries), '[]'::json),
        'entregasTotal', (SELECT cnt FROM entregas_total),
        'recentNews', COALESCE((SELECT json_agg(row_to_json(rn)) FROM recent_news rn), '[]'::json),
        'allNews', COALESCE((SELECT json_agg(row_to_json(an)) FROM all_news an), '[]'::json),
        'categories', COALESCE((SELECT json_agg(category) FROM categories_list), '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$;
