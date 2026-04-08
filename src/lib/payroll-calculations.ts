/**
 * Payroll calculations for federal tax withholding
 * Based on 2024 IRS tax brackets and withholding methods
 */

interface TaxCalculationParams {
  grossPay: number;
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  filingStatus: 'single' | 'married' | 'head_of_household';
  allowances: number;
  stateTaxRate?: number;
  localTaxRate?: number;
}

interface TaxWithholding {
  federalIncomeTax: number;
  socialSecurityTax: number;
  medicareTax: number;
  stateTax: number;
  localTax: number;
  totalTax: number;
}

/**
 * Social Security and Medicare tax rates (2024)
 */
const SOCIAL_SECURITY_RATE = 0.062; // 6.2%
const SOCIAL_SECURITY_WAGE_BASE = 168600; // Annual limit
const MEDICARE_RATE = 0.0145; // 1.45%
const MEDICARE_ADDITIONAL_RATE = 0.009; // Additional 0.9% for high earners
const MEDICARE_THRESHOLD_SINGLE = 200000;
const MEDICARE_THRESHOLD_MARRIED = 250000;

/**
 * 2024 Federal income tax brackets (simplified)
 */
const TAX_BRACKETS_2024 = {
  single: [
    { min: 0, max: 11600, rate: 0.1 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
  married: [
    { min: 0, max: 23200, rate: 0.1 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { min: 0, max: 15900, rate: 0.1 },
    { min: 15900, max: 60850, rate: 0.12 },
    { min: 60850, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243700, rate: 0.32 },
    { min: 243700, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
};

/**
 * 2024 Standard deduction
 */
const STANDARD_DEDUCTION_2024 = {
  single: 14600,
  married: 29200,
  head_of_household: 21900,
};

/**
 * Calculate federal income tax withholding
 */
function calculateFederalIncomeTax(
  annualGross: number,
  filingStatus: string,
  allowances: number
): number {
  // Each allowance reduces taxable income (simplified approach)
  const allowanceValue = 5150; // 2024 personal exemption equivalent
  const taxableIncome = Math.max(
    0,
    annualGross - STANDARD_DEDUCTION_2024[filingStatus as keyof typeof STANDARD_DEDUCTION_2024] -
      allowances * allowanceValue
  );

  const brackets = TAX_BRACKETS_2024[filingStatus as keyof typeof TAX_BRACKETS_2024];
  let tax = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const taxableInThisBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += taxableInThisBracket * bracket.rate;
  }

  return Math.max(0, tax);
}

/**
 * Calculate Social Security tax
 */
function calculateSocialSecurityTax(annualGross: number, period: string): number {
  if (annualGross >= SOCIAL_SECURITY_WAGE_BASE) {
    // Once annual limit is reached, no more SS tax
    return 0;
  }

  const periodsPerYear = getPeriodMultiplier(period);
  const grossForPeriod = annualGross / periodsPerYear;

  return grossForPeriod * SOCIAL_SECURITY_RATE;
}

/**
 * Calculate Medicare tax (including additional Medicare tax)
 */
function calculateMedicareTax(
  annualGross: number,
  period: string,
  filingStatus: string
): number {
  const periodsPerYear = getPeriodMultiplier(period);
  const grossForPeriod = annualGross / periodsPerYear;
  let medicareTax = grossForPeriod * MEDICARE_RATE;

  // Additional Medicare tax for high earners
  const threshold =
    filingStatus === 'married'
      ? MEDICARE_THRESHOLD_MARRIED
      : MEDICARE_THRESHOLD_SINGLE;

  if (annualGross > threshold) {
    const excessIncome = annualGross - threshold;
    const excessForPeriod = excessIncome / periodsPerYear;
    medicareTax += excessForPeriod * MEDICARE_ADDITIONAL_RATE;
  }

  return medicareTax;
}

/**
 * Get period multiplier for annual calculations
 */
function getPeriodMultiplier(period: string): number {
  const multipliers: { [key: string]: number } = {
    weekly: 52,
    biweekly: 26,
    semimonthly: 24,
    monthly: 12,
  };
  return multipliers[period] || 12;
}

/**
 * Main function: Calculate all tax withholdings
 */
export function calculateTaxWithholdings(
  params: TaxCalculationParams
): TaxWithholding {
  const { grossPay, payFrequency, filingStatus, allowances, stateTaxRate = 0, localTaxRate = 0 } = params;

  // Convert to annual gross
  const periodMultiplier = getPeriodMultiplier(payFrequency);
  const annualGross = grossPay * periodMultiplier;

  // Calculate federal income tax (for this period)
  const annualFederalTax = calculateFederalIncomeTax(
    annualGross,
    filingStatus,
    allowances
  );
  const federalIncomeTax = annualFederalTax / periodMultiplier;

  // Calculate Social Security tax
  const socialSecurityTax = calculateSocialSecurityTax(annualGross, payFrequency);

  // Calculate Medicare tax
  const medicareTax = calculateMedicareTax(annualGross, payFrequency, filingStatus);

  // Calculate state and local taxes
  const stateTax = grossPay * (stateTaxRate / 100);
  const localTax = grossPay * (localTaxRate / 100);

  // Total
  const totalTax =
    federalIncomeTax + socialSecurityTax + medicareTax + stateTax + localTax;

  return {
    federalIncomeTax: Math.round(federalIncomeTax * 100) / 100,
    socialSecurityTax: Math.round(socialSecurityTax * 100) / 100,
    medicareTax: Math.round(medicareTax * 100) / 100,
    stateTax: Math.round(stateTax * 100) / 100,
    localTax: Math.round(localTax * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
  };
}

/**
 * Calculate net pay after all deductions
 */
export function calculateNetPay(
  grossPay: number,
  taxes: TaxWithholding,
  voluntaryDeductions: number = 0
): number {
  const netPay = grossPay - taxes.totalTax - voluntaryDeductions;
  return Math.round(netPay * 100) / 100;
}

/**
 * Calculate overtime pay
 */
export function calculateOvertimePay(
  hourlyRate: number,
  regularHours: number,
  overtimeHours: number,
  overtimeMultiplier: number = 1.5
): { regular: number; overtime: number; total: number } {
  const regularPay = regularHours * hourlyRate;
  const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
  const total = regularPay + overtimePay;

  return {
    regular: Math.round(regularPay * 100) / 100,
    overtime: Math.round(overtimePay * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Calculate gross pay from hours worked
 */
export function calculateGrossPayFromHours(
  hourlyRate: number,
  regularHours: number,
  overtimeHours: number = 0
): number {
  const { total } = calculateOvertimePay(hourlyRate, regularHours, overtimeHours);
  return total;
}

/**
 * Estimate take-home pay
 */
export function estimateTakeHomePay(
  grossPay: number,
  payFrequency: string,
  filingStatus: string,
  allowances: number,
  voluntaryDeductions: number = 0
): number {
  const taxes = calculateTaxWithholdings({
    grossPay,
    payFrequency: payFrequency as any,
    filingStatus: filingStatus as any,
    allowances,
  });

  return calculateNetPay(grossPay, taxes, voluntaryDeductions);
}
