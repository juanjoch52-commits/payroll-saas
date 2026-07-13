-- =============================================================================
-- MyJova — CTR-1a: rol 'contractor' en membership_role
-- =============================================================================
-- Tercer perfil: EMPRESA (owner/admin/manager) · CONTRATISTA (contractor,
-- vinculado a una fila de subcontractors) · TRABAJADOR (employee).
-- ALTER TYPE ... ADD VALUE va en archivo propio (convención del repo).
-- =============================================================================

alter type public.membership_role add value if not exists 'contractor' before 'viewer';
