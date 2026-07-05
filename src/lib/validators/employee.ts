import { z } from 'zod'

// =============================================================================
// Esquemas Zod para empleados y pay schemes.
// Compartidos entre Server Actions (validación entrada) y el formulario (RHF).
// =============================================================================

export const FILING_STATUSES = [
  'single',
  'married_jointly',
  'married_separately',
  'head_of_household',
] as const

export const EMPLOYEE_TYPES = ['employee', 'contractor'] as const
export const EMPLOYEE_STATUSES = ['active', 'on_leave', 'terminated'] as const
export const PAY_SCHEME_TYPES = ['hourly', 'salary', 'daily', 'commission', 'piecerate'] as const

// -----------------------------------------------------------------------------
// Pay scheme config — discriminated union
// -----------------------------------------------------------------------------
// Cada tipo tiene un shape distinto en `config`. El motor de cálculo
// inspecciona `type` y aplica la fórmula adecuada.
export const paySchemeSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hourly'),
    rateCents: z.coerce.number().int().positive(),
    overtimeMultiplier: z.coerce.number().min(1).default(1.5),
    overtimeThresholdHours: z.coerce.number().min(0).default(40),
  }),
  z.object({
    type: z.literal('salary'),
    annualCents: z.coerce.number().int().positive(),
    periodsPerYear: z.coerce.number().int().min(1).max(53).default(26), // bi-weekly default
  }),
  z.object({
    type: z.literal('daily'),
    dailyRateCents: z.coerce.number().int().positive(),
  }),
  z.object({
    type: z.literal('commission'),
    baseCents: z.coerce.number().int().nonnegative().default(0),
    ratePct: z.coerce.number().min(0).max(1),
    tiers: z
      .array(
        z.object({
          thresholdCents: z.coerce.number().int().nonnegative(),
          rate: z.coerce.number().min(0).max(1),
        }),
      )
      .optional(),
  }),
  z.object({
    // Pago por producción / a destajo: ratePerUnitCents por cada unidad producida.
    type: z.literal('piecerate'),
    ratePerUnitCents: z.coerce.number().int().positive(),
    unitLabel: z.string().min(1).default('unit'),
    // Suelo opcional de salario mínimo por hora (FLSA): si lo defines, el motor
    // garantiza que el bruto ≥ horas × este mínimo, añadiendo un "make-up".
    minimumHourlyFloorCents: z.coerce.number().int().nonnegative().optional(),
  }),
])

export type PaySchemeConfig = z.infer<typeof paySchemeSchema>

// -----------------------------------------------------------------------------
// Employee schema
// -----------------------------------------------------------------------------
export const employeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(EMPLOYEE_STATUSES).default('active'),
  employeeType: z.enum(EMPLOYEE_TYPES).default('employee'),
  jobTitle: z.string().optional(),
  primaryJurisdictionCode: z.string().min(2),
  // tax_id viene en plano del formulario; el server lo encripta antes de guardar.
  taxId: z
    .string()
    .regex(/^\d{3}-?\d{2}-?\d{4}$|^\d{9}$/, 'Invalid SSN format')
    .optional()
    .or(z.literal('')),
  w4FilingStatus: z.enum(FILING_STATUSES).default('single'),
  w4Dependents: z.coerce.number().int().nonnegative().default(0),
  // Código de localidad para impuesto municipal (NYC/PHL/YON). Vacío → sin retención local.
  localityCode: z.string().optional().or(z.literal('')),
  // Subcontratista al que pertenece (vacío = trabajador propio del tenant).
  subcontractorId: z.string().uuid().optional().or(z.literal('')),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .default({}),
  paySchemeJson: z.string().min(2),  // JSON serializado del paySchemeSchema
})

export type EmployeeInput = z.infer<typeof employeeSchema>

/**
 * Helper para parsear el `paySchemeJson` después del schema raíz.
 */
export function parsePaySchemeJson(json: string): PaySchemeConfig {
  return paySchemeSchema.parse(JSON.parse(json))
}
