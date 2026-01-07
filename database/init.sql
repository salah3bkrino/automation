-- Initialize database for Automation Service
-- This file creates the n8n database and basic setup

-- Create n8n database
CREATE DATABASE IF NOT EXISTS n8n;

-- Create automation user and grant permissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog WHERE rolname = 'automation_user') THEN
        CREATE ROLE automation_user WITH LOGIN PASSWORD 'automation_password_2024';
    END IF;
END
$$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE n8n TO automation_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO automation_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO automation_user;

-- Create extensions needed by the application
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance
-- These will be created by Prisma migrations, but we can add some basic ones here

-- Log the initialization
\echo 'Automation Service database initialized successfully';