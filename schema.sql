-- Ângelo Melim: preparação idempotente. Não remove dados.
-- Faça backup e execute no MESMO banco do dashboard atual.

-- Grêmio Novorizontino 2026
BEGIN;
CREATE SCHEMA IF NOT EXISTS "public";
SET LOCAL search_path TO "public";
CREATE TABLE IF NOT EXISTS season_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS gps_sessions (id SERIAL PRIMARY KEY, session_date VARCHAR(20) NOT NULL, session_name VARCHAR(255) NOT NULL, filename VARCHAR(255), uploaded_at TIMESTAMPTZ DEFAULT NOW(), rows JSONB NOT NULL, metadata JSONB NOT NULL DEFAULT '{}');
ALTER TABLE gps_sessions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS idx_gps_sessions_date_name ON gps_sessions(session_date, session_name);
CREATE TABLE IF NOT EXISTS athletes (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, full_name VARCHAR(255), birth_date DATE, weight_kg DECIMAL(5,2), height_cm INTEGER, dominant_foot VARCHAR(20), city VARCHAR(255), position VARCHAR(50), notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS injury_history (id SERIAL PRIMARY KEY, athlete_name VARCHAR(255) NOT NULL, injury_date DATE NOT NULL, body_region VARCHAR(10) NOT NULL, injury_type VARCHAR(255) NOT NULL, description TEXT, severity VARCHAR(20), days_out INTEGER, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS cmj_baseline (id SERIAL PRIMARY KEY, athlete_name VARCHAR(255) NOT NULL UNIQUE, melhor_salto FLOAT NOT NULL, data_avaliacao DATE, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS cmj_coletas (id SERIAL PRIMARY KEY, athlete_name VARCHAR(255) NOT NULL, data_coleta DATE NOT NULL, salto_1 FLOAT, salto_2 FLOAT, salto_3 FLOAT, media FLOAT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS name_aliases (id SERIAL PRIMARY KEY, gps_name VARCHAR(255) NOT NULL UNIQUE, bem_name VARCHAR(255) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS squad_exclusions (id SERIAL PRIMARY KEY, player_name VARCHAR(255) NOT NULL, normalized_name VARCHAR(255) NOT NULL UNIQUE, excluded_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_cmj_date ON cmj_coletas(data_coleta DESC);
CREATE INDEX IF NOT EXISTS idx_injury_athlete ON injury_history(athlete_name);
COMMIT;

-- Americano Futebol Clube 2027
BEGIN;
CREATE SCHEMA IF NOT EXISTS "season_2027_americano";
SET LOCAL search_path TO "season_2027_americano";
CREATE TABLE IF NOT EXISTS season_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS gps_sessions (id SERIAL PRIMARY KEY, session_date VARCHAR(20) NOT NULL, session_name VARCHAR(255) NOT NULL, filename VARCHAR(255), uploaded_at TIMESTAMPTZ DEFAULT NOW(), rows JSONB NOT NULL, metadata JSONB NOT NULL DEFAULT '{}');
ALTER TABLE gps_sessions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS idx_gps_sessions_date_name ON gps_sessions(session_date, session_name);
CREATE TABLE IF NOT EXISTS athletes (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, full_name VARCHAR(255), birth_date DATE, weight_kg DECIMAL(5,2), height_cm INTEGER, dominant_foot VARCHAR(20), city VARCHAR(255), position VARCHAR(50), notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS injury_history (id SERIAL PRIMARY KEY, athlete_name VARCHAR(255) NOT NULL, injury_date DATE NOT NULL, body_region VARCHAR(10) NOT NULL, injury_type VARCHAR(255) NOT NULL, description TEXT, severity VARCHAR(20), days_out INTEGER, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS cmj_baseline (id SERIAL PRIMARY KEY, athlete_name VARCHAR(255) NOT NULL UNIQUE, melhor_salto FLOAT NOT NULL, data_avaliacao DATE, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS cmj_coletas (id SERIAL PRIMARY KEY, athlete_name VARCHAR(255) NOT NULL, data_coleta DATE NOT NULL, salto_1 FLOAT, salto_2 FLOAT, salto_3 FLOAT, media FLOAT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS name_aliases (id SERIAL PRIMARY KEY, gps_name VARCHAR(255) NOT NULL UNIQUE, bem_name VARCHAR(255) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS squad_exclusions (id SERIAL PRIMARY KEY, player_name VARCHAR(255) NOT NULL, normalized_name VARCHAR(255) NOT NULL UNIQUE, excluded_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_cmj_date ON cmj_coletas(data_coleta DESC);
CREATE INDEX IF NOT EXISTS idx_injury_athlete ON injury_history(athlete_name);
COMMIT;

