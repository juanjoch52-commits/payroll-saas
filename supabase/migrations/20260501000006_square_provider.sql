-- =============================================================================
-- MyJova — H4: Añade 'square' al enum integration_provider (POS)
-- =============================================================================
-- ALTER TYPE ADD VALUE en migración aislada.
-- =============================================================================

alter type public.integration_provider add value if not exists 'square';
