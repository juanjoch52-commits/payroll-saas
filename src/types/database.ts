/**
 * Tipos generados desde el schema de Supabase.
 *
 * IMPORTANTE: este archivo se REGENERA después de aplicar migraciones:
 *   npm run db:types
 *
 * El placeholder a continuación es permisivo — `Row`, `Insert`, `Update` son
 * `Record<string, any>` para que todas las queries compilen ANTES de tener
 * el schema real en Supabase. Una vez que ejecutes `npm run db:types`,
 * este archivo será reemplazado con tipos estrictos derivados del schema.
 *
 * Estructura esperada del archivo regenerado:
 *
 *   export type Database = {
 *     public: {
 *       Tables: {
 *         organizations: { Row: { id: string, ... }, Insert: { ... }, Update: { ... } },
 *         employees: { ... },
 *         ...
 *       },
 *       ...
 *     }
 *   }
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// eslint-disable-next-line
type AnyRow = Record<string, any>

/** Stub: todas las tablas/views/functions aceptan cualquier shape. */
type PermissiveSchema = {
  Tables: Record<string, { Row: AnyRow; Insert: AnyRow; Update: AnyRow; Relationships: [] }>
  Views: Record<string, { Row: AnyRow; Relationships: [] }>
  Functions: Record<string, { Args: AnyRow; Returns: unknown }>
  Enums: Record<string, string>
  CompositeTypes: Record<string, AnyRow>
}

export interface Database {
  public: PermissiveSchema
}
