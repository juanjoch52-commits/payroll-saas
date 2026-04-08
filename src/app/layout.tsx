import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PayrollHub - Payroll Management for Small Businesses',
  description: 'Manage your employees and payroll efficiently. Perfect for construction, remodeling, automotive, and restaurant businesses.',
  keywords: ['payroll', 'payroll software', 'HR management', 'small business'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white">{children}</body>
    </html>
  );
}
