import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import Decimal from 'decimal.js';

export class PDFPackageGeneratorNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'pdfPackageGenerator',
    displayName: 'PDF Package Generator',
    group: 'output',
    version: 1,
    description: 'Generate complete PDF package with Form 1040 and all schedules',
    inputs: ['Form Data'],
    outputs: ['PDF Data'],
    properties: {
      includeCoverPage: { type: 'boolean', default: true },
      includeSchedules: { type: 'boolean', default: true },
    },
  };

  async execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);

    // Collect all form data
    const formData = this.collectFormData(inputData);

    // Create PDF document
    const pdfDoc = await PDFDocument.create();

    // Add cover page if requested
    if (this.description.properties.includeCoverPage.default) {
      await this.addCoverPage(pdfDoc, context, formData);
    }

    // Add Form 1040
    if (formData.form1040) {
      await this.addForm1040(pdfDoc, context, formData.form1040);
    }

    // Add schedules if requested
    if (this.description.properties.includeSchedules.default) {
      if (formData.scheduleA) {
        await this.addScheduleA(pdfDoc, context, formData.scheduleA);
      }
      if (formData.scheduleC) {
        await this.addScheduleC(pdfDoc, context, formData.scheduleC);
      }
      if (formData.scheduleSE) {
        await this.addScheduleSE(pdfDoc, context, formData.scheduleSE);
      }
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Convert to base64 for storage/transmission (browser-compatible)
    const base64 = btoa(String.fromCharCode(...pdfBytes));

    const pdfData = {
      type: 'pdf',
      fileName: `Form1040_${context.taxYear}_${context.taxpayerInfo.lastName}.pdf`,
      mimeType: 'application/pdf',
      size: pdfBytes.length,
      base64,
      pages: pdfDoc.getPageCount(),
      createdAt: Date.now(),
    };

    return [this.createOutput(pdfData)];
  }

  private collectFormData(inputData: TaxData[][]): any {
    const formData: any = {};

    for (const inputArray of inputData) {
      for (const item of inputArray) {
        const json = item.json;

        // Identify forms by their structure
        if (json.income && json.deductions && json.tax) {
          formData.form1040 = json;
        } else if (json.totalItemizedDeductions) {
          formData.scheduleA = json;
        } else if (json.netBusinessIncome && json.grossIncome) {
          formData.scheduleC = json;
        } else if (json.seEarnings && json.totalSETax) {
          formData.scheduleSE = json;
        }
      }
    }

    return formData;
  }

  private async addCoverPage(
    pdfDoc: PDFDocument,
    context: TaxExecutionContext,
    formData: any
  ) {
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    const fontSize = 12;

    // Title
    page.drawText('U.S. Individual Income Tax Return', {
      x: 50,
      y: height - 100,
      size: 20,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    // Tax year
    page.drawText(`Tax Year ${context.taxYear}`, {
      x: 50,
      y: height - 130,
      size: 16,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    // Taxpayer info
    let yPos = height - 180;
    page.drawText('Taxpayer Information:', {
      x: 50,
      y: yPos,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    yPos -= 30;
    page.drawText(
      `Name: ${context.taxpayerInfo.firstName} ${context.taxpayerInfo.lastName}`,
      { x: 70, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) }
    );

    yPos -= 25;
    page.drawText(`SSN: ${context.taxpayerInfo.ssn}`, {
      x: 70,
      y: yPos,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    yPos -= 25;
    page.drawText(
      `Filing Status: ${this.formatFilingStatus(context.filingStatus)}`,
      { x: 70, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) }
    );

    // Summary if Form 1040 data available
    if (formData.form1040) {
      yPos -= 50;
      page.drawText('Tax Return Summary:', {
        x: 50,
        y: yPos,
        size: 14,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      yPos -= 30;
      const agi = formData.form1040.agi
        ? this.formatCurrency(new Decimal(formData.form1040.agi))
        : '$0.00';
      page.drawText(`Adjusted Gross Income: ${agi}`, {
        x: 70,
        y: yPos,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });

      yPos -= 25;
      const taxableIncome = formData.form1040.taxableIncome
        ? this.formatCurrency(new Decimal(formData.form1040.taxableIncome))
        : '$0.00';
      page.drawText(`Taxable Income: ${taxableIncome}`, {
        x: 70,
        y: yPos,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });

      yPos -= 25;
      const totalTax = formData.form1040.tax?.totalTax
        ? this.formatCurrency(new Decimal(formData.form1040.tax.totalTax))
        : '$0.00';
      page.drawText(`Total Tax: ${totalTax}`, {
        x: 70,
        y: yPos,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }

    // Footer
    page.drawText('Generated by TaxFlow Enhanced', {
      x: 50,
      y: 50,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(new Date().toLocaleDateString(), {
      x: width - 150,
      y: 50,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  private async addForm1040(
    pdfDoc: PDFDocument,
    context: TaxExecutionContext,
    formData: any
  ) {
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { height } = page.getSize();
    let yPos = height - 50;

    // Form title
    page.drawText('Form 1040', {
      x: 50,
      y: yPos,
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    page.drawText(`U.S. Individual Income Tax Return - ${context.taxYear}`, {
      x: 50,
      y: yPos - 20,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });

    yPos -= 60;

    // Income section
    page.drawText('Income', {
      x: 50,
      y: yPos,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    yPos -= 25;
    if (formData.income) {
      this.addLineItem(page, font, 70, yPos, 'Wages', formData.income.wages);
      yPos -= 20;
      this.addLineItem(page, font, 70, yPos, 'Business Income', formData.income.businessIncome);
      yPos -= 20;
      this.addLineItem(page, font, 70, yPos, 'Total Income', formData.income.totalIncome);
    }

    yPos -= 40;

    // AGI
    page.drawText('Adjusted Gross Income', {
      x: 50,
      y: yPos,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    yPos -= 25;
    this.addLineItem(page, font, 70, yPos, 'AGI', formData.agi);

    yPos -= 40;

    // Deductions
    page.drawText('Deductions', {
      x: 50,
      y: yPos,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    yPos -= 25;
    if (formData.deductions) {
      this.addLineItem(
        page,
        font,
        70,
        yPos,
        `${formData.deductions.type} Deduction`,
        formData.deductions.amount
      );
    }

    yPos -= 40;

    // Tax
    page.drawText('Tax and Credits', {
      x: 50,
      y: yPos,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    yPos -= 25;
    if (formData.tax) {
      this.addLineItem(page, font, 70, yPos, 'Total Tax', formData.tax.totalTax);
    }

    yPos -= 25;
    if (formData.refundOrOwed) {
      const amount = new Decimal(formData.refundOrOwed);
      const label = amount.isPositive() ? 'Refund' : 'Amount Owed';
      this.addLineItem(page, font, 70, yPos, label, amount.abs());
    }
  }

  private async addScheduleA(
    pdfDoc: PDFDocument,
    _context: TaxExecutionContext,
    scheduleData: any
  ) {
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yPos = page.getHeight() - 50;

    page.drawText('Schedule A - Itemized Deductions', {
      x: 50,
      y: yPos,
      size: 16,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    yPos -= 40;

    // Medical expenses
    this.addLineItem(page, font, 50, yPos, 'Medical Expenses', scheduleData.deductibleMedical);
    yPos -= 25;

    // SALT
    this.addLineItem(page, font, 50, yPos, 'State and Local Taxes', scheduleData.deductibleSALT);
    yPos -= 25;

    // Mortgage interest
    this.addLineItem(page, font, 50, yPos, 'Mortgage Interest', scheduleData.deductibleInterest);
    yPos -= 25;

    // Charitable
    this.addLineItem(
      page,
      font,
      50,
      yPos,
      'Charitable Contributions',
      scheduleData.deductibleCharitable
    );
    yPos -= 40;

    // Total
    this.addLineItem(
      page,
      fontBold,
      50,
      yPos,
      'Total Itemized Deductions',
      scheduleData.totalItemizedDeductions
    );
  }

  private async addScheduleC(
    pdfDoc: PDFDocument,
    _context: TaxExecutionContext,
    scheduleData: any
  ) {
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yPos = page.getHeight() - 50;

    page.drawText('Schedule C - Profit or Loss from Business', {
      x: 50,
      y: yPos,
      size: 16,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    yPos -= 40;

    this.addLineItem(page, font, 50, yPos, 'Gross Receipts', scheduleData.grossReceipts);
    yPos -= 25;
    this.addLineItem(page, font, 50, yPos, 'Returns and Allowances', scheduleData.returns);
    yPos -= 25;
    this.addLineItem(page, font, 50, yPos, 'Cost of Goods Sold', scheduleData.costOfGoodsSold);
    yPos -= 25;
    this.addLineItem(page, font, 50, yPos, 'Gross Income', scheduleData.grossIncome);
    yPos -= 25;
    this.addLineItem(page, font, 50, yPos, 'Total Expenses', scheduleData.totalExpenses);
    yPos -= 40;
    this.addLineItem(page, fontBold, 50, yPos, 'Net Profit', scheduleData.netBusinessIncome);
  }

  private async addScheduleSE(
    pdfDoc: PDFDocument,
    _context: TaxExecutionContext,
    scheduleData: any
  ) {
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yPos = page.getHeight() - 50;

    page.drawText('Schedule SE - Self-Employment Tax', {
      x: 50,
      y: yPos,
      size: 16,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    yPos -= 40;

    this.addLineItem(page, font, 50, yPos, 'Net Business Income', scheduleData.netBusinessIncome);
    yPos -= 25;
    this.addLineItem(page, font, 50, yPos, 'SE Earnings (92.35%)', scheduleData.seEarnings);
    yPos -= 25;
    this.addLineItem(
      page,
      font,
      50,
      yPos,
      'Social Security Tax',
      scheduleData.socialSecurityTax
    );
    yPos -= 25;
    this.addLineItem(page, font, 50, yPos, 'Medicare Tax', scheduleData.medicareTax);
    yPos -= 40;
    this.addLineItem(page, fontBold, 50, yPos, 'Total SE Tax', scheduleData.totalSETax);
    yPos -= 25;
    this.addLineItem(
      page,
      font,
      50,
      yPos,
      'Deductible SE Tax (50%)',
      scheduleData.deductibleSETax
    );
  }

  private addLineItem(
    page: any,
    font: any,
    x: number,
    y: number,
    label: string,
    value: any
  ) {
    const formattedValue = value ? this.formatCurrency(new Decimal(value)) : '$0.00';
    page.drawText(`${label}:`, { x, y, size: 11, font, color: rgb(0, 0, 0) });
    page.drawText(formattedValue, { x: 400, y, size: 11, font, color: rgb(0, 0, 0) });
  }

  private formatCurrency(value: Decimal): string {
    return `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
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
}
