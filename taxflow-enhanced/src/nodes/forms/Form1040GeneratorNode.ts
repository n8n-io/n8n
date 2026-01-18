import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import Decimal from 'decimal.js';

export class Form1040GeneratorNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'form1040Generator',
    displayName: 'Form 1040 Generator',
    group: 'forms',
    version: 1,
    description: 'Generate complete Form 1040 data',
    inputs: ['Tax Calculation', 'Deduction Data', 'AGI Data'],
    outputs: ['Form 1040 Data'],
    properties: {
      outputFormat: { type: 'string', default: 'json' }, // 'json' or 'pdf'
    },
  };

  async execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);

    // Gather data from all inputs
    let taxData: any = {};
    let deductionData: any = {};
    let agiData: any = {};

    for (const inputArray of inputData) {
      for (const item of inputArray) {
        if (item.json.totalTax) {
          taxData = item.json;
        }
        if (item.json.deductionType) {
          deductionData = item.json;
        }
        if (item.json.agi) {
          agiData = item.json;
        }
      }
    }

    // Build Form 1040 data
    const form1040 = {
      taxYear: context.taxYear,
      filingStatus: context.filingStatus,
      taxpayer: context.taxpayerInfo,

      // Income section
      income: {
        wages: agiData.incomeBreakdown?.wages || new Decimal(0),
        interest: agiData.incomeBreakdown?.interest || new Decimal(0),
        dividends: agiData.incomeBreakdown?.dividends || new Decimal(0),
        businessIncome: agiData.incomeBreakdown?.businessIncome || new Decimal(0),
        capitalGains: agiData.incomeBreakdown?.capitalGains || new Decimal(0),
        otherIncome: agiData.incomeBreakdown?.other || new Decimal(0),
        totalIncome: agiData.totalIncome || new Decimal(0),
      },

      // Adjustments
      adjustments: agiData.totalAdjustments ? [
        { type: 'various', amount: agiData.totalAdjustments }
      ] : [],

      // AGI
      agi: agiData.agi || new Decimal(0),

      // Deductions
      deductions: {
        type: deductionData.deductionType || 'standard',
        amount: deductionData.deductionAmount || new Decimal(0),
        itemizedBreakdown: deductionData.itemizedBreakdown,
      },

      // Taxable income
      taxableIncome: deductionData.taxableIncome || new Decimal(0),

      // Tax
      tax: {
        regularTax: taxData.totalTax || new Decimal(0),
        amt: new Decimal(0), // Alternative Minimum Tax (not implemented yet)
        totalTax: taxData.totalTax || new Decimal(0),
      },

      // Credits (to be implemented)
      credits: [],

      // Payments (to be implemented)
      payments: new Decimal(0),

      // Refund or amount owed
      refundOrOwed: new Decimal(0).minus(taxData.totalTax || new Decimal(0)),
    };

    return [this.createOutput(form1040)];
  }
}
