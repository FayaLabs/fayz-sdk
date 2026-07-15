-- Grant access to archetype tables created in migration 004
-- The original GRANT ALL ON ALL TABLES only covered tables that existed at that time
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
