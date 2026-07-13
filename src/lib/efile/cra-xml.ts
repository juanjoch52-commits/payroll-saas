/**
 * CRA T4 XML builder.
 *
 * Generates a CRA-spec XML file with a batch of T4 slips for upload via
 * CRA Web Forms or Filer Identification Number (FIN) electronic filing.
 *
 * Live submission requires CRA "MyAccount for Business" and per-tenant
 * Account Number / Web Access Code. We build the XML; the user uploads it
 * manually to CRA's portal (or via certified payroll software).
 */
import type { EfilingResult } from './types'

export type T4XmlInput = {
  taxYear: number
  payer: {
    legalName: string
    businessNumber: string // ##########RP####
    addressLine1: string
    city: string
    province: string
    postalCode: string
    transmitterAccountNumber?: string
  }
  slips: Array<{
    employeeFullName: string
    sin: string // 9 digits no spaces
    employmentIncomeCents: number
    cppContribsCents: number
    eiPremiumsCents: number
    incomeTaxDeductedCents: number
    insurableEarningsCents: number
    pensionableEarningsCents: number
    provinceOfEmployment: string // 'ON', 'QC', etc
  }>
}

function escape(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!),
  )
}

function dollars(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function buildT4XML(input: T4XmlInput): string {
  const submissionId = `MYJOVA-${input.taxYear}-${Date.now()}`
  const slipsXml = input.slips
    .map(
      (s) => `
    <T4Slip>
      <ReportTaxationYear>${input.taxYear}</ReportTaxationYear>
      <EmployeeName>${escape(s.employeeFullName)}</EmployeeName>
      <SocialInsuranceNumber>${s.sin}</SocialInsuranceNumber>
      <EmploymentProvinceCode>${s.provinceOfEmployment}</EmploymentProvinceCode>
      <T4Amount>
        <EmploymentIncome>${dollars(s.employmentIncomeCents)}</EmploymentIncome>
        <EmployeesCPPContributions>${dollars(s.cppContribsCents)}</EmployeesCPPContributions>
        <EmployeesEIPremiums>${dollars(s.eiPremiumsCents)}</EmployeesEIPremiums>
        <IncomeTaxDeducted>${dollars(s.incomeTaxDeductedCents)}</IncomeTaxDeducted>
        <EIInsurableEarnings>${dollars(s.insurableEarningsCents)}</EIInsurableEarnings>
        <CPPPensionableEarnings>${dollars(s.pensionableEarningsCents)}</CPPPensionableEarnings>
      </T4Amount>
    </T4Slip>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Submission>
  <SubmissionId>${submissionId}</SubmissionId>
  <ReportTaxationYear>${input.taxYear}</ReportTaxationYear>
  <Payer>
    <BusinessNumber>${input.payer.businessNumber}</BusinessNumber>
    <LegalName>${escape(input.payer.legalName)}</LegalName>
    <Address>
      <Line1>${escape(input.payer.addressLine1)}</Line1>
      <City>${escape(input.payer.city)}</City>
      <ProvinceCode>${input.payer.province}</ProvinceCode>
      <PostalCode>${input.payer.postalCode}</PostalCode>
    </Address>
  </Payer>
  <T4Slips>${slipsXml}
  </T4Slips>
</Submission>`
}

/** Stub for future direct submission to CRA — for now user uploads manually. */
export async function submitT4ToCRA(): Promise<EfilingResult> {
  return {
    ok: false,
    provider: 'cra',
    error: 'Automated CRA T4 submission not yet implemented — upload built XML to CRA MyBusiness Account',
  }
}
