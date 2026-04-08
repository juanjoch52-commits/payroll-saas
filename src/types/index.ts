// User & Auth Types
export type UserRole = 'admin' | 'manager' | 'employee';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

// Company Types
export interface Company {
  id: string;
  user_id: string;
  name: string;
  legal_name?: string;
  ein?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  industry?: string;
  employee_count?: number;
  subscription_plan: 'starter' | 'professional' | 'enterprise';
  subscription_status: 'active' | 'paused' | 'canceled';
  created_at: string;
  updated_at: string;
}

// Employee Types
export type EmployeeStatus = 'active' | 'inactive' | 'terminated';
export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type WithholdingStatus = 'single' | 'married' | 'head_of_household';

export interface Employee {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  ssn?: string;
  hire_date: string;
  birth_date?: string;
  status: EmployeeStatus;
  department?: string;
  job_title?: string;
  manager_id?: string;
  salary?: number;
  hourly_rate?: number;
  is_hourly: boolean;
  pay_frequency: PayFrequency;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  federal_withholding_status: WithholdingStatus;
  federal_allowances: number;
  state_withholding_status?: string;
  state_allowances?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Payroll Types
export type PayrollStatus = 'draft' | 'processing' | 'completed' | 'paid';

export interface PayrollRun {
  id: string;
  company_id: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: PayrollStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollItem {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  hours_worked: number;
  regular_hours: number;
  overtime_hours: number;
  gross_pay: number;
  federal_income_tax: number;
  social_security_tax: number;
  medicare_tax: number;
  state_income_tax: number;
  local_income_tax: number;
  health_insurance: number;
  retirement_401k: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  is_paid: boolean;
  paid_date?: string;
  created_at: string;
  updated_at: string;
}

// Forms
export interface CreateEmployeeForm {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  hire_date: string;
  job_title?: string;
  department?: string;
  is_hourly: boolean;
  salary?: number;
  hourly_rate?: number;
  pay_frequency: PayFrequency;
  federal_withholding_status: WithholdingStatus;
  federal_allowances: number;
}

export interface CreatePayrollRunForm {
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  notes?: string;
}

// Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}
