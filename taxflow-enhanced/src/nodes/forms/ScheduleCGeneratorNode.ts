import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import Decimal from 'decimal.js';

export class ScheduleCGeneratorNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'scheduleCGenerator',
    displayName: 'Schedule C Generator',
    group: 'forms',
    version: 1,
    description: 'Generate Schedule C (Profit or Loss from Business)',
    inputs: ['Business Data'],
    outputs: ['Schedule C'],
    properties: {
      businessName: { type: 'string', default: '' },
      businessCode: { type: 'string', default: '' },
      accountingMethod: { type: 'string', default: 'cash' },
    },
  };

  async execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);

    // Gather business income and expense data
    let grossReceipts = new Decimal(0);
    let returns = new Decimal(0);
    let costOfGoodsSold = new Decimal(0);

    // Expenses
    const expenses = {
      advertising: new Decimal(0),
      carAndTruck: new Decimal(0),
      commissions: new Decimal(0),
      contractLabor: new Decimal(0),
      depletion: new Decimal(0),
      depreciation: new Decimal(0),
      employeeBenefit: new Decimal(0),
      insurance: new Decimal(0),
      interest: new Decimal(0),
      legal: new Decimal(0),
      officeExpense: new Decimal(0),
      pension: new Decimal(0),
      rent: new Decimal(0),
      repairs: new Decimal(0),
      supplies: new Decimal(0),
      taxes: new Decimal(0),
      travel: new Decimal(0),
      meals: new Decimal(0),
      utilities: new Decimal(0),
      wages: new Decimal(0),
      other: new Decimal(0),
    };

    for (const inputArray of inputData) {
      for (const item of inputArray) {
        // Business income
        if (item.json.grossReceipts) {
          grossReceipts = grossReceipts.plus(new Decimal(item.json.grossReceipts));
        }
        if (item.json.returns) {
          returns = returns.plus(new Decimal(item.json.returns));
        }
        if (item.json.costOfGoodsSold) {
          costOfGoodsSold = costOfGoodsSold.plus(new Decimal(item.json.costOfGoodsSold));
        }

        // Business expenses
        if (item.json.type === 'business_expense') {
          const category = item.json.category;
          const amount = new Decimal(item.json.amount);

          if (category in expenses) {
            expenses[category as keyof typeof expenses] =
              expenses[category as keyof typeof expenses].plus(amount);
          } else {
            expenses.other = expenses.other.plus(amount);
          }
        }

        // Accept pre-aggregated expense data
        if (item.json.expenses) {
          for (const [key, value] of Object.entries(item.json.expenses)) {
            if (key in expenses && typeof value === 'number') {
              expenses[key as keyof typeof expenses] =
                expenses[key as keyof typeof expenses].plus(new Decimal(value));
            }
          }
        }
      }
    }

    // Part I: Income
    const netGrossReceipts = grossReceipts.minus(returns);
    const grossIncome = netGrossReceipts.minus(costOfGoodsSold);

    // Part II: Expenses
    // Meals are only 50% deductible
    const deductibleMeals = expenses.meals.times(0.5);

    const totalExpenses = expenses.advertising
      .plus(expenses.carAndTruck)
      .plus(expenses.commissions)
      .plus(expenses.contractLabor)
      .plus(expenses.depletion)
      .plus(expenses.depreciation)
      .plus(expenses.employeeBenefit)
      .plus(expenses.insurance)
      .plus(expenses.interest)
      .plus(expenses.legal)
      .plus(expenses.officeExpense)
      .plus(expenses.pension)
      .plus(expenses.rent)
      .plus(expenses.repairs)
      .plus(expenses.supplies)
      .plus(expenses.taxes)
      .plus(expenses.travel)
      .plus(deductibleMeals)
      .plus(expenses.utilities)
      .plus(expenses.wages)
      .plus(expenses.other);

    // Part III: Net profit or loss
    const netBusinessIncome = grossIncome.minus(totalExpenses);

    const scheduleC = {
      taxYear: context.taxYear,
      taxpayer: context.taxpayerInfo,
      businessName: this.description.properties.businessName.default,
      businessCode: this.description.properties.businessCode.default,
      accountingMethod: this.description.properties.accountingMethod.default,

      // Part I: Income
      grossReceipts,
      returns,
      netGrossReceipts,
      costOfGoodsSold,
      grossIncome,

      // Part II: Expenses (detailed)
      expenses: {
        ...expenses,
        meals: deductibleMeals, // Show only deductible portion
        mealsTotal: expenses.meals, // Keep track of total
      },
      totalExpenses,

      // Part III: Net profit or loss
      netBusinessIncome,
      grossRevenue: grossReceipts,

      // Additional info
      isLoss: netBusinessIncome.lt(0),
    };

    return [this.createOutput(scheduleC)];
  }
}
