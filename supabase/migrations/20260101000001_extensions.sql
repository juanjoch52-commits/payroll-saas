-- =============================================================================
-- MyJova — Migración 01: Extensiones de PostgreSQL
-- =============================================================================
-- pgcrypto: usado para gen_random_uuid() y futuras necesidades de hashing.
-- uuid-ossp: alternativa para uuid_generate_v4(); incluida por compatibilidad.
-- citext:    columnas case-insensitive (emails, slugs).
-- pgsodium:  encriptación a nivel de columna para datos sensibles como SSN.
--            Supabase la habilita por dashboard si no está aquí.
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "citext";
