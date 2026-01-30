/**
 * AGICalculatorNode Tests
 * Tests AGI calculation with income aggregation and precision handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Decimal from 'decimal.js';
import { AGICalculatorNode } from './AGICalculatorNode';
import { createMockExecutionContext } from '../../test/utils';
import type { TaxData } from '../../models/TaxData';

describe('AGICalculatorNode', () => {
  let node: AGICalculatorNode;

  beforeEach(() => {
    node = new AGICalculatorNode();
  });

  describe('Basic AGI calculation', () => {
    it('should calculate AGI from single W-2 income', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              type: 'w2',
              wages: new Decimal(75000),
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);

      expect(result).toHaveLength(1);
      expect(result[0].json.agi.toNumber()).toBe(75000);
      expect(result[0].json.totalIncome.toNumber()).toBe(75000);
    });

    it('should calculate AGI from multiple W-2 sources', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              type: 'w2',
              wages: new Decimal(50000),
            },
          },
          {
            json: {
              type: 'w2',
              wages: new Decimal(30000),
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);

      expect(result[0].json.totalIncome.toNumber()).toBe(80000);
      expect(result[0].json.agi.toNumber()).toBe(80000);
      expect(result[0].json.incomeBreakdown.wages.toNumber()).toBe(80000);
    });

    it('should calculate AGI from 1099-NEC income', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              type: '1099-NEC',
              nonemployeeCompensation: new Decimal(45000),
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);

      expect(result[0].json.agi.toNumber()).toBe(45000);
      expect(result[0].json.incomeBreakdown.businessIncome.toNumber()).toBe(45000);
    });

    it('should calculate AGI from manual income entries', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              incomeType: 'interest',
              amount: new Decimal(500),
            },
          },
          {
            json: {
              incomeType: 'dividends',
              amount: new Decimal(1200),
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);

      expect(result[0].json.totalIncome.toNumber()).toBe(1700);
      expect(result[0].json.incomeBreakdown.interest.toNumber()).toBe(500);
      expect(result[0].json.incomeBreakdown.dividends.toNumber()).toBe(1200);
    });
  });

  describe('Income aggregation from multiple sources', () => {
    it('should aggregate W-2, 1099, and manual income', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              type: 'w2',
              wages: new Decimal(60000),
            },
          },
          {
            json: {
              type: '1099-NEC',
              nonemployeeCompensation: new Decimal(15000),
            },
          },
          {
            json: {
              incomeType: 'interest',
              amount: new Decimal(800),
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);

      expect(result[0].json.totalIncome.toNumber()).toBe(75800);
      expect(result[0].json.incomeBreakdown.wages.toNumber()).toBe(60000);
      expect(result[0].json.incomeBreakdown.businessIncome.toNumber()).toBe(15000);
      expect(result[0].json.incomeBreakdown.interest.toNumber()).toBe(800);
    });

    it('should aggregate income from multiple input arrays', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              type: 'w2',
              wages: new Decimal(40000),
            },
          },
        ],
        [
          {
            json: {
              type: 'w2',
              wages: new Decimal(35000),
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);

      expect(result[0].json.totalIncome.toNumber()).toBe(75000);
    });
  });

  describe('Adjustments to income', () => {
    it('should subtract adjustments from total income to calculate AGI', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              type: 'w2',
              wages: new Decimal(100000),
              adjustments: [
                { amount: new Decimal(3000), type: 'Student Loan Interest' },
                { amount: new Decimal(2000), type: 'IRA Contribution' },
              ],
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);

      expect(result[0].json.totalIncome.toNumber()).toBe(100000);
      expect(result[0].json.totalAdjustments.toNumber()).toBe(5000);
      expect(result[0].json.agi.toNumber()).toBe(95000);
    });

    it('should handle zero adjustments', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              type: 'w2',
              wages: new Decimal(75000),
              adjustments: [],
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);

      expect(result[0].json.totalAdjustments.toNumber()).toBe(0);
      expect(result[0].json.agi.toNumber()).toBe(75000);
    });
  });

  describe('Decimal precision', () => {
    it('should handle decimal amounts precisely', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              type: 'w2',
              wages: new Decimal('75000.55'),
            },
          },
          {
            json: {
              incomeType: 'interest',
              amount: new Decimal('1250.33'),
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);

      expect(result[0].json.totalIncome.toFixed(2)).toBe('76250.88');
      expect(result[0].json.agi.toFixed(2)).toBe('76250.88');
    });

    it('should handle very small decimal amounts', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              incomeType: 'interest',
              amount: new Decimal('0.01'),
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);

      expect(result[0].json.totalIncome.toFixed(2)).toBe('0.01');
    });

    it('should handle large numbers without precision loss', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              type: 'w2',
              wages: new Decimal(9999999.99),
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);

      expect(result[0].json.totalIncome.toNumber()).toBe(9999999.99);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty input data', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [[]];

      const result = await node.execute(context, inputData);

      expect(result[0].json.totalIncome.toNumber()).toBe(0);
      expect(result[0].json.agi.toNumber()).toBe(0);
    });

    it('should handle zero income', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              type: 'w2',
              wages: new Decimal(0),
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);

      expect(result[0].json.totalIncome.toNumber()).toBe(0);
      expect(result[0].json.agi.toNumber()).toBe(0);
    });

    it('should handle income types not in standard breakdown', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              incomeType: 'customIncome',
              amount: new Decimal(5000),
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);

      expect(result[0].json.totalIncome.toNumber()).toBe(5000);
      expect(result[0].json.incomeBreakdown.other.toNumber()).toBe(5000);
    });

    it('should handle missing optional fields', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              type: 'w2',
              wages: new Decimal(50000),
              // adjustments field missing
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);

      expect(result[0].json.agi.toNumber()).toBe(50000);
    });
  });

  describe('Income breakdown verification', () => {
    it('should correctly categorize mixed income sources', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              type: 'w2',
              wages: new Decimal(65000),
            },
          },
          {
            json: {
              incomeType: 'capitalGains',
              amount: new Decimal(8000),
            },
          },
          {
            json: {
              incomeType: 'dividends',
              amount: new Decimal(2500),
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);
      const breakdown = result[0].json.incomeBreakdown;

      expect(breakdown.wages.toNumber()).toBe(65000);
      expect(breakdown.capitalGains.toNumber()).toBe(8000);
      expect(breakdown.dividends.toNumber()).toBe(2500);
      expect(breakdown.businessIncome.toNumber()).toBe(0);
      expect(breakdown.interest.toNumber()).toBe(0);
    });

    it('should sum breakdown to equal total income', async () => {
      const context = createMockExecutionContext();
      const inputData: TaxData[][] = [
        [
          {
            json: {
              type: 'w2',
              wages: new Decimal(60000),
            },
          },
          {
            json: {
              incomeType: 'interest',
              amount: new Decimal(500),
            },
          },
          {
            json: {
              incomeType: 'dividends',
              amount: new Decimal(1500),
            },
          },
        ],
      ];

      const result = await node.execute(context, inputData);
      const breakdown = result[0].json.incomeBreakdown;

      const breakdownSum = Object.values(breakdown).reduce(
        (sum: Decimal, val: unknown) => sum.plus(val as Decimal),
        new Decimal(0)
      );

      expect((breakdownSum as Decimal).toNumber()).toBe(result[0].json.totalIncome.toNumber());
    });
  });
});
