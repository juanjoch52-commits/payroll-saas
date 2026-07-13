/**
 * Diccionario de strings usados en PDFs generados por @react-pdf/renderer.
 *
 * No usamos next-intl aquí porque los PDFs se renderizan server-side fuera del
 * contexto de request (server actions, cron jobs, e-mail attachments). Por eso
 * exponemos un helper síncrono `pdfStrings(locale)`.
 *
 * Para Canadá los formularios T4/T4A/ROE son legalmente bilingües (EN/FR).
 * El componente `<BilingualLabel en="…" fr="…">` (en `src/lib/tax-forms/_shared.tsx`)
 * usa estos strings cuando el locale del PDF es 'fr-CA' o 'en-CA'.
 */

export type PdfLocale = 'en' | 'es' | 'fr' | 'fr-CA'

type PdfDict = {
  paystub: {
    title: string
    employer: string
    employee: string
    payPeriod: string
    payDate: string
    earnings: string
    deductions: string
    grossPay: string
    netPay: string
    federalTax: string
    stateTax: string
    socialSecurity: string
    medicare: string
    hoursWorked: string
    rate: string
    ytd: string
  }
  w2: {
    title: string
    employee: string
    employer: string
    wages: string
    fedWithheld: string
    ssWages: string
    ssWithheld: string
    medicareWages: string
    medicareWithheld: string
    year: string
  }
  form1099: {
    title: string
    payer: string
    recipient: string
    nonEmpComp: string
    fedWithheld: string
    year: string
  }
  t4: {
    title: string
    employer: string
    employee: string
    sin: string
    employmentIncome: string
    cppContribs: string
    eiPremiums: string
    incomeTaxDeducted: string
    pensionableEarnings: string
    insurableEarnings: string
    year: string
    box14: string
    box16: string
    box18: string
    box22: string
    box24: string
    box26: string
  }
  common: {
    generated: string
    page: string
    of: string
    confidential: string
  }
}

const en: PdfDict = {
  paystub: {
    title: 'Pay stub',
    employer: 'Employer',
    employee: 'Employee',
    payPeriod: 'Pay period',
    payDate: 'Pay date',
    earnings: 'Earnings',
    deductions: 'Deductions',
    grossPay: 'Gross pay',
    netPay: 'Net pay',
    federalTax: 'Federal tax',
    stateTax: 'State tax',
    socialSecurity: 'Social Security',
    medicare: 'Medicare',
    hoursWorked: 'Hours worked',
    rate: 'Rate',
    ytd: 'YTD',
  },
  w2: {
    title: 'Form W-2 — Wage and Tax Statement',
    employee: "Employee's information",
    employer: "Employer's information",
    wages: 'Wages, tips, other compensation',
    fedWithheld: 'Federal income tax withheld',
    ssWages: 'Social Security wages',
    ssWithheld: 'Social Security tax withheld',
    medicareWages: 'Medicare wages and tips',
    medicareWithheld: 'Medicare tax withheld',
    year: 'Tax year',
  },
  form1099: {
    title: 'Form 1099-NEC — Nonemployee Compensation',
    payer: 'Payer',
    recipient: 'Recipient',
    nonEmpComp: 'Nonemployee compensation',
    fedWithheld: 'Federal income tax withheld',
    year: 'Tax year',
  },
  t4: {
    title: 'T4 — Statement of Remuneration Paid',
    employer: 'Employer name',
    employee: "Employee's name",
    sin: 'Social insurance number',
    employmentIncome: 'Employment income',
    cppContribs: 'CPP contributions',
    eiPremiums: 'EI premiums',
    incomeTaxDeducted: 'Income tax deducted',
    pensionableEarnings: 'Pensionable earnings',
    insurableEarnings: 'Insurable earnings',
    year: 'Tax year',
    box14: 'Box 14 — Employment income',
    box16: 'Box 16 — Employee CPP contributions',
    box18: 'Box 18 — Employee EI premiums',
    box22: 'Box 22 — Income tax deducted',
    box24: 'Box 24 — EI insurable earnings',
    box26: 'Box 26 — CPP pensionable earnings',
  },
  common: {
    generated: 'Generated on',
    page: 'Page',
    of: 'of',
    confidential: 'Confidential — do not share',
  },
}

const es: PdfDict = {
  paystub: {
    title: 'Recibo de pago',
    employer: 'Empleador',
    employee: 'Empleado',
    payPeriod: 'Período de pago',
    payDate: 'Fecha de pago',
    earnings: 'Ingresos',
    deductions: 'Deducciones',
    grossPay: 'Pago bruto',
    netPay: 'Pago neto',
    federalTax: 'Impuesto federal',
    stateTax: 'Impuesto estatal',
    socialSecurity: 'Seguro Social',
    medicare: 'Medicare',
    hoursWorked: 'Horas trabajadas',
    rate: 'Tarifa',
    ytd: 'Año hasta la fecha',
  },
  w2: {
    title: 'Formulario W-2 — Declaración de salarios e impuestos',
    employee: 'Información del empleado',
    employer: 'Información del empleador',
    wages: 'Salarios, propinas y otras compensaciones',
    fedWithheld: 'Impuesto federal retenido',
    ssWages: 'Salarios sujetos a Seguro Social',
    ssWithheld: 'Seguro Social retenido',
    medicareWages: 'Salarios y propinas Medicare',
    medicareWithheld: 'Medicare retenido',
    year: 'Año fiscal',
  },
  form1099: {
    title: 'Formulario 1099-NEC — Compensación a no empleados',
    payer: 'Pagador',
    recipient: 'Receptor',
    nonEmpComp: 'Compensación a no empleado',
    fedWithheld: 'Impuesto federal retenido',
    year: 'Año fiscal',
  },
  t4: {
    title: 'T4 — Declaración de remuneración pagada',
    employer: 'Nombre del empleador',
    employee: 'Nombre del empleado',
    sin: 'Número de seguro social',
    employmentIncome: 'Ingresos por empleo',
    cppContribs: 'Contribuciones CPP',
    eiPremiums: 'Primas EI',
    incomeTaxDeducted: 'Impuesto sobre la renta deducido',
    pensionableEarnings: 'Ingresos sujetos a pensión',
    insurableEarnings: 'Ingresos asegurables',
    year: 'Año fiscal',
    box14: 'Casilla 14 — Ingresos por empleo',
    box16: 'Casilla 16 — Contribuciones CPP empleado',
    box18: 'Casilla 18 — Primas EI empleado',
    box22: 'Casilla 22 — Impuesto sobre la renta deducido',
    box24: 'Casilla 24 — Ingresos asegurables EI',
    box26: 'Casilla 26 — Ingresos sujetos a pensión CPP',
  },
  common: {
    generated: 'Generado el',
    page: 'Página',
    of: 'de',
    confidential: 'Confidencial — no compartir',
  },
}

const fr: PdfDict = {
  paystub: {
    title: 'Bulletin de paie',
    employer: 'Employeur',
    employee: 'Employé',
    payPeriod: 'Période de paie',
    payDate: 'Date de paie',
    earnings: 'Revenus',
    deductions: 'Retenues',
    grossPay: 'Salaire brut',
    netPay: 'Salaire net',
    federalTax: 'Impôt fédéral',
    stateTax: 'Impôt provincial',
    socialSecurity: 'Sécurité sociale',
    medicare: 'Medicare',
    hoursWorked: 'Heures travaillées',
    rate: 'Taux',
    ytd: 'Cumul annuel',
  },
  w2: {
    title: 'Formulaire W-2 — Déclaration des salaires et impôts',
    employee: "Informations sur l'employé",
    employer: "Informations sur l'employeur",
    wages: 'Salaires, pourboires, autres compensations',
    fedWithheld: 'Impôt fédéral retenu',
    ssWages: 'Salaires Social Security',
    ssWithheld: 'Social Security retenu',
    medicareWages: 'Salaires et pourboires Medicare',
    medicareWithheld: 'Medicare retenu',
    year: 'Année fiscale',
  },
  form1099: {
    title: 'Formulaire 1099-NEC — Rémunération non salariale',
    payer: 'Payeur',
    recipient: 'Bénéficiaire',
    nonEmpComp: 'Rémunération non salariale',
    fedWithheld: 'Impôt fédéral retenu',
    year: 'Année fiscale',
  },
  t4: {
    title: 'T4 — État de la rémunération payée',
    employer: "Nom de l'employeur",
    employee: "Nom de l'employé",
    sin: "Numéro d'assurance sociale",
    employmentIncome: 'Revenus d\'emploi',
    cppContribs: 'Cotisations RPC',
    eiPremiums: "Cotisations à l'AE",
    incomeTaxDeducted: 'Impôt sur le revenu retenu',
    pensionableEarnings: 'Gains ouvrant droit à pension',
    insurableEarnings: 'Gains assurables',
    year: 'Année fiscale',
    box14: 'Case 14 — Revenus d\'emploi',
    box16: 'Case 16 — Cotisations RPC de l\'employé',
    box18: "Case 18 — Cotisations à l'AE de l'employé",
    box22: 'Case 22 — Impôt sur le revenu retenu',
    box24: "Case 24 — Gains assurables d'AE",
    box26: 'Case 26 — Gains ouvrant droit à pension du RPC',
  },
  common: {
    generated: 'Généré le',
    page: 'Page',
    of: 'de',
    confidential: 'Confidentiel — ne pas partager',
  },
}

// fr-CA hereda de fr; agregamos overrides Quebec donde aplique.
const frCA: PdfDict = {
  ...fr,
  paystub: {
    ...fr.paystub,
    federalTax: 'Impôt fédéral',
    stateTax: 'Impôt provincial',
  },
  t4: {
    ...fr.t4,
    employee: "Nom de l'employé(e)",
  },
}

const dicts: Record<PdfLocale, PdfDict> = { en, es, fr, 'fr-CA': frCA }

export function pdfStrings(locale: string): PdfDict {
  if (locale in dicts) return dicts[locale as PdfLocale]
  return en
}
