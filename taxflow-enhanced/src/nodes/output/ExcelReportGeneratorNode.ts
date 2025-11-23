import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import * as XLSX from 'xlsx';
import Decimal from 'decimal.js';

export class ExcelReportGeneratorNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'excelReportGenerator',
    displayName: 'Excel Report Generator',
    group: 'output',
    version: 1,
    description: 'Generate comprehensive Excel report with all tax data and calculations',
    inputs: ['Tax Data'],
    outputs: ['Excel File'],
    properties: {
      includeCharts: { type: 'boolean', default: false },
      includeRawData: { type: 'boolean', default: true },
    },
  };

  async execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);

    // Collect all tax data
    const taxData = this.collectTaxData(inputData);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Add summary sheet
    this.addSummarySheet(workbook, context, taxData);

    // Add income sheet
    if (taxData.income) {
      this.addIncomeSheet(workbook, taxData.income);
    }

    // Add deductions sheet
    if (taxData.deductions) {
      this.addDeductionsSheet(workbook, taxData.deductions);
    }

    // Add tax calculation sheet
    if (taxData.tax) {
      this.addTaxCalculationSheet(workbook, context, taxData);
    }

    // Add credits sheet
    if (taxData.credits) {
      this.addCreditsSheet(workbook, taxData.credits);
    }

    // Add schedules
    if (taxData.scheduleC) {
      this.addScheduleCSheet(workbook, taxData.scheduleC);
    }

    if (taxData.scheduleSE) {
      this.addScheduleSESheet(workbook, taxData.scheduleSE);
    }

    // Add W-2 data sheet
    if (taxData.w2.length > 0) {
      this.addW2Sheet(workbook, taxData.w2);
    }

    // Add 1099 data sheet
    if (taxData.form1099.length > 0) {
      this.add1099Sheet(workbook, taxData.form1099);
    }

    // Generate Excel file (browser-compatible)
    const excelArray = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

    // Convert to base64 (browser-compatible)
    const base64 = btoa(String.fromCharCode(...new Uint8Array(excelArray)));

    const excelData = {
      type: 'excel',
      fileName: `TaxReport_${context.taxYear}_${context.taxpayerInfo.lastName}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: excelArray.byteLength,
      base64,
      sheets: workbook.SheetNames.length,
      createdAt: Date.now(),
    };

    return [this.createOutput(excelData)];
  }

  private collectTaxData(inputData: TaxData[][]): any {
    const data: any = {
      w2: [],
      form1099: [],
      income: null,
      deductions: null,
      tax: null,
      credits: null,
      scheduleC: null,
      scheduleSE: null,
    };

    for (const inputArray of inputData) {
      for (const item of inputArray) {
        const json = item.json;

        if (json.type === 'w2') {
          data.w2.push(json);
        } else if (json.type?.startsWith('1099')) {
          data.form1099.push(json);
        } else if (json.totalIncome || json.incomeBreakdown) {
          data.income = json;
        } else if (json.deductionType || json.deductionAmount) {
          data.deductions = json;
        } else if (json.totalTax && !json.seEarnings) {
          data.tax = json;
        } else if (json.credits || json.totalCredits) {
          data.credits = json;
        } else if (json.netBusinessIncome && json.grossIncome) {
          data.scheduleC = json;
        } else if (json.seEarnings && json.totalSETax) {
          data.scheduleSE = json;
        }
      }
    }

    return data;
  }

  private addSummarySheet(workbook: XLSX.WorkBook, context: TaxExecutionContext, taxData: any) {
    const summaryData = [
      ['TAX RETURN SUMMARY'],
      [],
      ['Tax Year', context.taxYear],
      [
        'Filing Status',
        this.formatFilingStatus(context.filingStatus),
      ],
      [
        'Taxpayer',
        `${context.taxpayerInfo.firstName} ${context.taxpayerInfo.lastName}`,
      ],
      ['SSN', context.taxpayerInfo.ssn],
      [],
      ['INCOME'],
      ['Total Income', this.formatDecimal(taxData.income?.totalIncome)],
      ['Adjusted Gross Income (AGI)', this.formatDecimal(taxData.income?.agi)],
      [],
      ['DEDUCTIONS'],
      [
        'Deduction Type',
        taxData.deductions?.deductionType || 'N/A',
      ],
      ['Deduction Amount', this.formatDecimal(taxData.deductions?.deductionAmount)],
      ['Taxable Income', this.formatDecimal(taxData.deductions?.taxableIncome)],
      [],
      ['TAX'],
      ['Total Tax', this.formatDecimal(taxData.tax?.totalTax)],
      ['Total Credits', this.formatDecimal(taxData.credits?.totalCredits)],
      ['Tax After Credits', this.formatDecimal(taxData.tax?.taxAfterCredits)],
      [],
      ['REFUND/OWED'],
      [
        'Amount',
        this.formatDecimal(taxData.tax?.refundOrOwed),
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
  }

  private addIncomeSheet(workbook: XLSX.WorkBook, incomeData: any) {
    const data = [
      ['INCOME BREAKDOWN'],
      [],
      ['Category', 'Amount'],
      ['Wages (W-2)', this.formatDecimal(incomeData.incomeBreakdown?.wages)],
      ['Interest', this.formatDecimal(incomeData.incomeBreakdown?.interest)],
      ['Dividends', this.formatDecimal(incomeData.incomeBreakdown?.dividends)],
      ['Business Income', this.formatDecimal(incomeData.incomeBreakdown?.businessIncome)],
      ['Capital Gains', this.formatDecimal(incomeData.incomeBreakdown?.capitalGains)],
      ['Other Income', this.formatDecimal(incomeData.incomeBreakdown?.other)],
      [],
      ['Total Income', this.formatDecimal(incomeData.totalIncome)],
      ['Adjustments', this.formatDecimal(incomeData.totalAdjustments)],
      ['Adjusted Gross Income', this.formatDecimal(incomeData.agi)],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Income');
  }

  private addDeductionsSheet(workbook: XLSX.WorkBook, deductionsData: any) {
    const data = [
      ['DEDUCTIONS'],
      [],
      ['Deduction Type', deductionsData.deductionType || 'Standard'],
      ['Deduction Amount', this.formatDecimal(deductionsData.deductionAmount)],
      [],
    ];

    if (deductionsData.itemizedBreakdown) {
      data.push(['ITEMIZED DEDUCTIONS BREAKDOWN']);
      data.push(['Category', 'Amount']);
      data.push([
        'Medical Expenses',
        this.formatDecimal(deductionsData.itemizedBreakdown.medicalExpenses),
      ]);
      data.push([
        'State and Local Taxes',
        this.formatDecimal(deductionsData.itemizedBreakdown.stateAndLocalTaxes),
      ]);
      data.push([
        'Mortgage Interest',
        this.formatDecimal(deductionsData.itemizedBreakdown.mortgageInterest),
      ]);
      data.push([
        'Charitable Contributions',
        this.formatDecimal(deductionsData.itemizedBreakdown.charitableContributions),
      ]);
      data.push([
        'Other Deductions',
        this.formatDecimal(deductionsData.itemizedBreakdown.other),
      ]);
      data.push([]);
      data.push(['Total Itemized', this.formatDecimal(deductionsData.totalItemized)]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Deductions');
  }

  private addTaxCalculationSheet(
    workbook: XLSX.WorkBook,
    context: TaxExecutionContext,
    taxData: any
  ) {
    const data = [
      ['TAX CALCULATION'],
      [],
      ['Taxable Income', this.formatDecimal(taxData.deductions?.taxableIncome)],
      ['Filing Status', this.formatFilingStatus(context.filingStatus)],
      [],
      ['TAX BREAKDOWN'],
      ['Regular Tax', this.formatDecimal(taxData.tax?.totalTax)],
      ['Alternative Minimum Tax (AMT)', this.formatDecimal(taxData.tax?.amt)],
      ['Self-Employment Tax', this.formatDecimal(taxData.scheduleSE?.totalSETax)],
      [],
      ['Total Tax Before Credits', this.formatDecimal(taxData.tax?.totalTax)],
      ['Total Credits', this.formatDecimal(taxData.credits?.totalCredits)],
      ['Tax After Credits', this.formatDecimal(taxData.tax?.taxAfterCredits)],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tax Calculation');
  }

  private addCreditsSheet(workbook: XLSX.WorkBook, creditsData: any) {
    const data = [
      ['TAX CREDITS'],
      [],
      ['Credit Name', 'Amount', 'Refundable'],
    ];

    if (creditsData.credits && Array.isArray(creditsData.credits)) {
      for (const credit of creditsData.credits) {
        data.push([
          credit.name,
          this.formatDecimal(credit.amount),
          credit.refundable ? 'Yes' : 'No',
        ]);
      }
    }

    data.push([]);
    data.push(['Total Non-Refundable Credits', this.formatDecimal(creditsData.totalNonRefundable)]);
    data.push(['Total Refundable Credits', this.formatDecimal(creditsData.totalRefundable)]);
    data.push(['Total All Credits', this.formatDecimal(creditsData.totalCredits)]);

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Credits');
  }

  private addScheduleCSheet(workbook: XLSX.WorkBook, scheduleCData: any) {
    const data = [
      ['SCHEDULE C - PROFIT OR LOSS FROM BUSINESS'],
      [],
      ['INCOME'],
      ['Gross Receipts', this.formatDecimal(scheduleCData.grossReceipts)],
      ['Returns and Allowances', this.formatDecimal(scheduleCData.returns)],
      ['Cost of Goods Sold', this.formatDecimal(scheduleCData.costOfGoodsSold)],
      ['Gross Income', this.formatDecimal(scheduleCData.grossIncome)],
      [],
      ['EXPENSES'],
    ];

    if (scheduleCData.expenses) {
      for (const [key, value] of Object.entries(scheduleCData.expenses)) {
        if (typeof value === 'object' && value !== null && 'toString' in value) {
          data.push([this.formatExpenseName(key), this.formatDecimal(value)]);
        }
      }
    }

    data.push([]);
    data.push(['Total Expenses', this.formatDecimal(scheduleCData.totalExpenses)]);
    data.push([]);
    data.push(['Net Profit (Loss)', this.formatDecimal(scheduleCData.netBusinessIncome)]);

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Schedule C');
  }

  private addScheduleSESheet(workbook: XLSX.WorkBook, scheduleSEData: any) {
    const data = [
      ['SCHEDULE SE - SELF-EMPLOYMENT TAX'],
      [],
      ['Net Business Income', this.formatDecimal(scheduleSEData.netBusinessIncome)],
      ['Self-Employment Earnings (92.35%)', this.formatDecimal(scheduleSEData.seEarnings)],
      [],
      ['Social Security Tax', this.formatDecimal(scheduleSEData.socialSecurityTax)],
      ['Medicare Tax', this.formatDecimal(scheduleSEData.medicareTax)],
      [
        'Additional Medicare Tax',
        this.formatDecimal(scheduleSEData.additionalMedicareTax),
      ],
      [],
      ['Total Self-Employment Tax', this.formatDecimal(scheduleSEData.totalSETax)],
      [
        'Deductible SE Tax (50%)',
        this.formatDecimal(scheduleSEData.deductibleSETax),
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Schedule SE');
  }

  private addW2Sheet(workbook: XLSX.WorkBook, w2Data: any[]) {
    const data = [
      [
        'Employer Name',
        'Employer EIN',
        'Wages',
        'Federal Tax Withheld',
        'SS Wages',
        'SS Tax',
        'Medicare Wages',
        'Medicare Tax',
        'State Wages',
        'State Tax',
      ],
    ];

    for (const w2 of w2Data) {
      data.push([
        w2.employerName,
        w2.employerEIN,
        this.formatDecimal(w2.wages),
        this.formatDecimal(w2.federalTaxWithheld),
        this.formatDecimal(w2.socialSecurityWages),
        this.formatDecimal(w2.socialSecurityTaxWithheld),
        this.formatDecimal(w2.medicareWages),
        this.formatDecimal(w2.medicareTaxWithheld),
        this.formatDecimal(w2.stateWages),
        this.formatDecimal(w2.stateTaxWithheld),
      ]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'W-2 Data');
  }

  private add1099Sheet(workbook: XLSX.WorkBook, form1099Data: any[]) {
    const data = [
      [
        'Form Type',
        'Payer Name',
        'Interest',
        'Dividends',
        'Capital Gains',
        'Other Income',
        'Federal Tax Withheld',
      ],
    ];

    for (const form1099 of form1099Data) {
      data.push([
        form1099.type,
        form1099.payerName,
        this.formatDecimal(form1099.interestIncome),
        this.formatDecimal(form1099.ordinaryDividends),
        this.formatDecimal(form1099.capitalGain),
        this.formatDecimal(form1099.otherIncome),
        this.formatDecimal(form1099.federalTaxWithheld),
      ]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, '1099 Data');
  }

  private formatDecimal(value: any): string {
    if (!value) return '0.00';
    const decimal = new Decimal(value);
    return decimal.toFixed(2);
  }

  private formatFilingStatus(status: string): string {
    const statusMap: Record<string, string> = {
      single: 'Single',
      married_joint: 'Married Filing Jointly',
      married_separate: 'Married Filing Separately',
      head_of_household: 'Head of Household',
    };
    return statusMap[status] || status;
  }

  private formatExpenseName(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }
}
