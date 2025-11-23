import Decimal from 'decimal.js';

export interface TaxBracket {
  min: Decimal;
  max: Decimal;
  rate: Decimal;
}

export const TAX_BRACKETS_2024: Record<string, TaxBracket[]> = {
  single: [
    { min: new Decimal(0), max: new Decimal(11600), rate: new Decimal(0.10) },
    { min: new Decimal(11600), max: new Decimal(47150), rate: new Decimal(0.12) },
    { min: new Decimal(47150), max: new Decimal(100525), rate: new Decimal(0.22) },
    { min: new Decimal(100525), max: new Decimal(191950), rate: new Decimal(0.24) },
    { min: new Decimal(191950), max: new Decimal(243725), rate: new Decimal(0.32) },
    { min: new Decimal(243725), max: new Decimal(609350), rate: new Decimal(0.35) },
    { min: new Decimal(609350), max: new Decimal(Infinity), rate: new Decimal(0.37) },
  ],
  married_joint: [
    { min: new Decimal(0), max: new Decimal(23200), rate: new Decimal(0.10) },
    { min: new Decimal(23200), max: new Decimal(94300), rate: new Decimal(0.12) },
    { min: new Decimal(94300), max: new Decimal(201050), rate: new Decimal(0.22) },
    { min: new Decimal(201050), max: new Decimal(383900), rate: new Decimal(0.24) },
    { min: new Decimal(383900), max: new Decimal(487450), rate: new Decimal(0.32) },
    { min: new Decimal(487450), max: new Decimal(731200), rate: new Decimal(0.35) },
    { min: new Decimal(731200), max: new Decimal(Infinity), rate: new Decimal(0.37) },
  ],
  married_separate: [
    { min: new Decimal(0), max: new Decimal(11600), rate: new Decimal(0.10) },
    { min: new Decimal(11600), max: new Decimal(47150), rate: new Decimal(0.12) },
    { min: new Decimal(47150), max: new Decimal(100525), rate: new Decimal(0.22) },
    { min: new Decimal(100525), max: new Decimal(191950), rate: new Decimal(0.24) },
    { min: new Decimal(191950), max: new Decimal(243725), rate: new Decimal(0.32) },
    { min: new Decimal(243725), max: new Decimal(365600), rate: new Decimal(0.35) },
    { min: new Decimal(365600), max: new Decimal(Infinity), rate: new Decimal(0.37) },
  ],
  head_of_household: [
    { min: new Decimal(0), max: new Decimal(16550), rate: new Decimal(0.10) },
    { min: new Decimal(16550), max: new Decimal(63100), rate: new Decimal(0.12) },
    { min: new Decimal(63100), max: new Decimal(100500), rate: new Decimal(0.22) },
    { min: new Decimal(100500), max: new Decimal(191950), rate: new Decimal(0.24) },
    { min: new Decimal(191950), max: new Decimal(243700), rate: new Decimal(0.32) },
    { min: new Decimal(243700), max: new Decimal(609350), rate: new Decimal(0.35) },
    { min: new Decimal(609350), max: new Decimal(Infinity), rate: new Decimal(0.37) },
  ],
};

export const STANDARD_DEDUCTIONS_2024: Record<string, Decimal> = {
  single: new Decimal(14600),
  married_joint: new Decimal(29200),
  married_separate: new Decimal(14600),
  head_of_household: new Decimal(21900),
};

export const SELF_EMPLOYMENT_TAX_RATE = new Decimal(0.9235);
export const SOCIAL_SECURITY_TAX_RATE = new Decimal(0.124);
export const MEDICARE_TAX_RATE = new Decimal(0.029);
export const SOCIAL_SECURITY_WAGE_BASE_2024 = new Decimal(168600);
export const ADDITIONAL_MEDICARE_THRESHOLD = {
  single: new Decimal(200000),
  married_joint: new Decimal(250000),
  married_separate: new Decimal(125000),
  head_of_household: new Decimal(200000),
};
