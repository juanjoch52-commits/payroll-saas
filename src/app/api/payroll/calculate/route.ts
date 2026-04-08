import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase';
import { calculateTaxWithholdings, calculateNetPay } from '@/lib/payroll-calculations';

/**
 * POST /api/payroll/calculate
 * Calculate payroll for an employee
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      grossPay,
      payFrequency,
      filingStatus,
      allowances,
      voluntaryDeductions = 0,
      stateTaxRate = 0,
      localTaxRate = 0,
    } = body;

    // Validate inputs
    if (typeof grossPay !== 'number' || grossPay < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid grossPay' },
        { status: 400 }
      );
    }

    // Calculate taxes
    const taxes = calculateTaxWithholdings({
      grossPay,
      payFrequency,
      filingStatus,
      allowances,
      stateTaxRate,
      localTaxRate,
    });

    // Calculate net pay
    const netPay = calculateNetPay(grossPay, taxes, voluntaryDeductions);

    return NextResponse.json({
      success: true,
      data: {
        grossPay,
        taxes,
        voluntaryDeductions,
        totalDeductions: taxes.totalTax + voluntaryDeductions,
        netPay,
        takeHomePercentage: Math.round((netPay / grossPay) * 100),
      },
    });
  } catch (error) {
    console.error('Error calculating payroll:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate payroll' },
      { status: 500 }
    );
  }
}
