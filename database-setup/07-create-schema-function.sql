-- Create get_table_schema function for SharpFlow
-- This function returns table schema information for dynamic column mapping

-- Drop function if it exists
DROP FUNCTION IF EXISTS get_table_schema(text);

-- Create the get_table_schema function
CREATE OR REPLACE FUNCTION get_table_schema(table_name text)
RETURNS TABLE(
    column_name text,
    data_type text,
    is_nullable text,
    column_default text,
    ordinal_position integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate table name to prevent SQL injection
    IF table_name !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
        RAISE EXCEPTION 'Invalid table name: %', table_name;
    END IF;
    
    -- Return table schema information
    RETURN QUERY
    SELECT 
        c.column_name::text,
        c.data_type::text,
        c.is_nullable::text,
        c.column_default::text,
        c.ordinal_position::integer
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
      AND c.table_name = get_table_schema.table_name
    ORDER BY c.ordinal_position;
    
    -- Check if any rows were returned
    IF NOT FOUND THEN
        RAISE NOTICE 'Table % not found in public schema', table_name;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_table_schema(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_schema(text) TO service_role;

-- Test the function
SELECT 'get_table_schema function created successfully!' as status;

-- Test with research_reports table
SELECT * FROM get_table_schema('research_reports');
