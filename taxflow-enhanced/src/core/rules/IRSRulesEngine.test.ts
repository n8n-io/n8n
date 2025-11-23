/**
 * IRSRulesEngine Tests
 * Tests the IRS tax calculation and validation rules
 */

import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { IRSRulesEngine } from './IRSRulesEngine';

describe('IRSRulesEngine', () => {
  describe('calculateTax', () => {
    describe('Single filer calculations', () => {
      it('should calculate tax for income in first bracket ($10,000)', () => {
        const taxableIncome = new Decimal(10000);
        const tax = IRSRulesEngine.calculateTax(taxableIncome, 'single');

        // Expected: $10,000 * 10% = $1,000
        expect(tax.toNumber()).toBe(1000);
      });

      it('should calculate tax for income spanning two brackets ($50,000)', () => {
        const taxableIncome = new Decimal(50000);
        const tax = IRSRulesEngine.calculateTax(taxableIncome, 'single');

        // Expected:
        // First bracket: $11,600 * 10% = $1,160
        // Second bracket: ($47,150 - $11,600) * 12% = $4,266
        // Third bracket: ($50,000 - $47,150) * 22% = $627
        // Total: $6,053
        expect(tax.toNumber()).toBeCloseTo(6053, 2);
      });

      it('should calculate tax for income in 22% bracket ($75,500)', () => {
        const taxableIncome = new Decimal(75500);
        const tax = IRSRulesEngine.calculateTax(taxableIncome, 'single');

        // Expected:
        // 10% bracket: $11,600 * 0.10 = $1,160
        // 12% bracket: ($47,150 - $11,600) * 0.12 = $4,266
        // 22% bracket: ($75,500 - $47,150) * 0.22 = $6,237
        // Total: $11,663
        expect(tax.toNumber()).toBeCloseTo(11663, 2);
      });

      it('should calculate tax for high income in top bracket ($700,000)', () => {
        const taxableIncome = new Decimal(700000);
        const tax = IRSRulesEngine.calculateTax(taxableIncome, 'single');

        // Complex calculation across all brackets
        // Should be significantly high (>$200k)
        expect(tax.toNumber()).toBeGreaterThan(200000);
        expect(tax.toNumber()).toBeLessThan(300000);
      });

      it('should handle zero income', () => {
        const taxableIncome = new Decimal(0);
        const tax = IRSRulesEngine.calculateTax(taxableIncome, 'single');

        expect(tax.toNumber()).toBe(0);
      });

      it('should handle very small income ($1)', () => {
        const taxableIncome = new Decimal(1);
        const tax = IRSRulesEngine.calculateTax(taxableIncome, 'single');

        // Expected: $1 * 10% = $0.10
        expect(tax.toNumber()).toBeCloseTo(0.10, 2);
      });
    });

    describe('Married filing jointly calculations', () => {
      it('should calculate tax for married joint ($100,000)', () => {
        const taxableIncome = new Decimal(100000);
        const tax = IRSRulesEngine.calculateTax(taxableIncome, 'married_joint');

        // Expected:
        // 10% bracket: $23,200 * 0.10 = $2,320
        // 12% bracket: ($94,300 - $23,200) * 0.12 = $8,532
        // 22% bracket: ($100,000 - $94,300) * 0.22 = $1,254
        // Total: $12,106
        expect(tax.toNumber()).toBeCloseTo(12106, 2);
      });

      it('should have different tax than single for same income', () => {
        const taxableIncome = new Decimal(50000);
        const taxSingle = IRSRulesEngine.calculateTax(taxableIncome, 'single');
        const taxMarried = IRSRulesEngine.calculateTax(taxableIncome, 'married_joint');

        // Married filing jointly should pay less tax for same income
        expect(taxMarried.toNumber()).toBeLessThan(taxSingle.toNumber());
      });
    });

    describe('Head of household calculations', () => {
      it('should calculate tax for head of household ($80,000)', () => {
        const taxableIncome = new Decimal(80000);
        const tax = IRSRulesEngine.calculateTax(taxableIncome, 'head_of_household');

        // Should be between single and married filing jointly
        expect(tax.toNumber()).toBeGreaterThan(0);
        expect(tax.toNumber()).toBeLessThan(20000);
      });
    });

    describe('Edge cases and error handling', () => {
      it('should throw error for invalid filing status', () => {
        const taxableIncome = new Decimal(50000);

        expect(() => {
          IRSRulesEngine.calculateTax(taxableIncome, 'invalid_status');
        }).toThrow(/Invalid filing status/);
      });

      it('should handle negative income gracefully', () => {
        const taxableIncome = new Decimal(-5000);
        const tax = IRSRulesEngine.calculateTax(taxableIncome, 'single');

        // Negative income should result in zero tax
        expect(tax.toNumber()).toBe(0);
      });

      it('should handle extremely large income (MAX_SAFE_INTEGER)', () => {
        const taxableIncome = new Decimal(Number.MAX_SAFE_INTEGER);
        const tax = IRSRulesEngine.calculateTax(taxableIncome, 'single');

        // Should calculate without overflow
        expect(tax.toNumber()).toBeGreaterThan(0);
        expect(Number.isFinite(tax.toNumber())).toBe(true);
      });

      it('should maintain precision with decimal amounts', () => {
        const taxableIncome = new Decimal('50000.55');
        const tax = IRSRulesEngine.calculateTax(taxableIncome, 'single');

        // Should handle cents precisely
        expect(tax.toFixed(2)).toMatch(/^\d+\.\d{2}$/);
      });
    });
  });

  describe('getStandardDeduction', () => {
    it('should return correct deduction for single filer', () => {
      const deduction = IRSRulesEngine.getStandardDeduction('single');
      expect(deduction.toNumber()).toBe(14600);
    });

    it('should return correct deduction for married filing jointly', () => {
      const deduction = IRSRulesEngine.getStandardDeduction('married_joint');
      expect(deduction.toNumber()).toBe(29200);
    });

    it('should return correct deduction for married filing separately', () => {
      const deduction = IRSRulesEngine.getStandardDeduction('married_separate');
      expect(deduction.toNumber()).toBe(14600);
    });

    it('should return correct deduction for head of household', () => {
      const deduction = IRSRulesEngine.getStandardDeduction('head_of_household');
      expect(deduction.toNumber()).toBe(21900);
    });

    it('should return zero for invalid filing status', () => {
      const deduction = IRSRulesEngine.getStandardDeduction('invalid');
      expect(deduction.toNumber()).toBe(0);
    });
  });

  describe('validateAGI', () => {
    it('should validate correct AGI calculation', () => {
      const totalIncome = new Decimal(100000);
      const adjustments = new Decimal(5000);
      const agi = new Decimal(95000);

      const isValid = IRSRulesEngine.validateAGI(totalIncome, adjustments, agi);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect AGI calculation', () => {
      const totalIncome = new Decimal(100000);
      const adjustments = new Decimal(5000);
      const agi = new Decimal(96000); // Should be 95000

      const isValid = IRSRulesEngine.validateAGI(totalIncome, adjustments, agi);
      expect(isValid).toBe(false);
    });

    it('should handle zero adjustments', () => {
      const totalIncome = new Decimal(100000);
      const adjustments = new Decimal(0);
      const agi = new Decimal(100000);

      const isValid = IRSRulesEngine.validateAGI(totalIncome, adjustments, agi);
      expect(isValid).toBe(true);
    });

    it('should handle decimal precision', () => {
      const totalIncome = new Decimal('100000.50');
      const adjustments = new Decimal('5000.25');
      const agi = new Decimal('95000.25');

      const isValid = IRSRulesEngine.validateAGI(totalIncome, adjustments, agi);
      expect(isValid).toBe(true);
    });

    it('should validate large numbers precisely', () => {
      const totalIncome = new Decimal(1000000);
      const adjustments = new Decimal(50000);
      const agi = new Decimal(950000);

      const isValid = IRSRulesEngine.validateAGI(totalIncome, adjustments, agi);
      expect(isValid).toBe(true);
    });
  });

  describe('validateTaxableIncome', () => {
    it('should validate correct taxable income calculation', () => {
      const agi = new Decimal(95000);
      const deduction = new Decimal(14600);
      const taxableIncome = new Decimal(80400);

      const isValid = IRSRulesEngine.validateTaxableIncome(agi, deduction, taxableIncome);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect taxable income calculation', () => {
      const agi = new Decimal(95000);
      const deduction = new Decimal(14600);
      const taxableIncome = new Decimal(81000); // Should be 80400

      const isValid = IRSRulesEngine.validateTaxableIncome(agi, deduction, taxableIncome);
      expect(isValid).toBe(false);
    });

    it('should handle case where deduction exceeds AGI (floor at zero)', () => {
      const agi = new Decimal(10000);
      const deduction = new Decimal(14600);
      const taxableIncome = new Decimal(0); // Should be floored at 0

      const isValid = IRSRulesEngine.validateTaxableIncome(agi, deduction, taxableIncome);
      expect(isValid).toBe(true);
    });

    it('should reject negative taxable income when deduction exceeds AGI', () => {
      const agi = new Decimal(10000);
      const deduction = new Decimal(14600);
      const taxableIncome = new Decimal(-4600); // Invalid - should be 0

      const isValid = IRSRulesEngine.validateTaxableIncome(agi, deduction, taxableIncome);
      expect(isValid).toBe(false);
    });

    it('should handle decimal precision in validation', () => {
      const agi = new Decimal('95000.75');
      const deduction = new Decimal('14600.50');
      const taxableIncome = new Decimal('80400.25');

      const isValid = IRSRulesEngine.validateTaxableIncome(agi, deduction, taxableIncome);
      expect(isValid).toBe(true);
    });
  });

  describe('applySALTCap', () => {
    it('should not cap SALT deductions below $10,000', () => {
      const stateAndLocalTaxes = new Decimal(5000);
      const capped = IRSRulesEngine.applySALTCap(stateAndLocalTaxes);

      expect(capped.toNumber()).toBe(5000);
    });

    it('should cap SALT deductions at exactly $10,000', () => {
      const stateAndLocalTaxes = new Decimal(10000);
      const capped = IRSRulesEngine.applySALTCap(stateAndLocalTaxes);

      expect(capped.toNumber()).toBe(10000);
    });

    it('should cap SALT deductions above $10,000', () => {
      const stateAndLocalTaxes = new Decimal(25000);
      const capped = IRSRulesEngine.applySALTCap(stateAndLocalTaxes);

      expect(capped.toNumber()).toBe(10000);
    });

    it('should cap very large SALT deductions', () => {
      const stateAndLocalTaxes = new Decimal(500000);
      const capped = IRSRulesEngine.applySALTCap(stateAndLocalTaxes);

      expect(capped.toNumber()).toBe(10000);
    });

    it('should handle zero SALT deductions', () => {
      const stateAndLocalTaxes = new Decimal(0);
      const capped = IRSRulesEngine.applySALTCap(stateAndLocalTaxes);

      expect(capped.toNumber()).toBe(0);
    });

    it('should handle decimal amounts below cap', () => {
      const stateAndLocalTaxes = new Decimal('9999.99');
      const capped = IRSRulesEngine.applySALTCap(stateAndLocalTaxes);

      expect(capped.toNumber()).toBeCloseTo(9999.99, 2);
    });

    it('should handle decimal amounts above cap', () => {
      const stateAndLocalTaxes = new Decimal('10000.01');
      const capped = IRSRulesEngine.applySALTCap(stateAndLocalTaxes);

      expect(capped.toNumber()).toBe(10000);
    });
  });
});
