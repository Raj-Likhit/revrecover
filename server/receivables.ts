import { B2BInvoiceCase } from '../src/types/revrecover.js';

export class ReceivablesEngine {
  private invoices: B2BInvoiceCase[] = [
    {
      invoice_id: 'INV-2026-0891',
      customer_name: 'Vikram Seth',
      company_name: 'TechInnovate Solutions Pvt Ltd',
      amount_paise: 25000000, // ₹2,50,000
      due_date: Math.floor(new Date('2026-08-14T00:00:00Z').getTime() / 1000),
      overdue_days: 14,
      aging_bucket: '1-15d',
      status: 'unpaid',
      recovery_action: 'Polite DLT Service Reminder + UPI/NEFT Virtual Account QR',
      working_capital_interest_saved_paise: 95890, // @ 14% p.a.
      outcome: 'Direct NEFT Settle in Progress',
    },
    {
      invoice_id: 'INV-2026-0842',
      customer_name: 'Sunita Narayanan',
      company_name: 'OmniRetail Logistics LLP',
      amount_paise: 48000000, // ₹4,80,000
      due_date: Math.floor(new Date('2026-08-01T00:00:00Z').getTime() / 1000),
      overdue_days: 27,
      aging_bucket: '16-30d',
      status: 'unpaid',
      recovery_action: 'Firm Notice + 2% Early Settlement Discount Offer on Prompt Payment',
      working_capital_interest_saved_paise: 368219,
      outcome: 'Awaiting CFO Approval',
    },
    {
      invoice_id: 'INV-2026-0775',
      customer_name: 'Rajesh Khandelwal',
      company_name: 'Bharat Fintech Labs',
      amount_paise: 12500000, // ₹1,25,000
      due_date: Math.floor(new Date('2026-07-15T00:00:00Z').getTime() / 1000),
      overdue_days: 44,
      aging_bucket: '31-60d',
      status: 'settled_with_discount',
      recovery_action: 'Final Executive Escalation + Account Manager WhatsApp',
      working_capital_interest_saved_paise: 143835,
      outcome: 'Recovered via RTGS Virtual Account (Direct)',
    },
    {
      invoice_id: 'INV-2026-0610',
      customer_name: 'Anil Deshmukh',
      company_name: 'Apex Infrastructure & Services',
      amount_paise: 89000000, // ₹8,90,000
      due_date: Math.floor(new Date('2026-06-20T00:00:00Z').getTime() / 1000),
      overdue_days: 69,
      aging_bucket: '60d+',
      status: 'escalated_legal',
      recovery_action: 'Formal Pre-Legal Demand Notice & Human Recovery Team Handoff',
      working_capital_interest_saved_paise: 1640547,
      outcome: 'Escalated to In-House Legal',
    },
  ];

  public getInvoices(): B2BInvoiceCase[] {
    return this.invoices;
  }

  public getReceivablesSummary() {
    const totalOutstandingPaise = this.invoices.reduce((acc, inv) => acc + (inv.status === 'unpaid' ? inv.amount_paise : 0), 0);
    const totalRecoveredPaise = this.invoices.reduce((acc, inv) => acc + (inv.status === 'settled_with_discount' || inv.status === 'paid' ? inv.amount_paise : 0), 0);
    const interestSavedPaise = this.invoices.reduce((acc, inv) => acc + inv.working_capital_interest_saved_paise, 0);

    return {
      total_invoices: this.invoices.length,
      total_outstanding_paise: totalOutstandingPaise,
      total_recovered_paise: totalRecoveredPaise,
      interest_saved_paise: interestSavedPaise,
      invoices: this.invoices,
    };
  }
}

export const globalReceivablesEngine = new ReceivablesEngine();
