import type { TaxData } from '../../models/TaxData';

export interface ITaxNodeDescription {
  name: string;
  displayName: string;
  group: 'input' | 'calculation' | 'forms' | 'validation' | 'output';
  version: number;
  description: string;
  inputs: string[];
  outputs: string[];
  properties: Record<string, any>;
}

export interface TaxExecutionContext {
  workflowId: string;
  taxYear: number;
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'head_of_household';
  taxpayerInfo: {
    firstName: string;
    lastName: string;
    ssn: string;
  };
  getNodeData: (nodeId: string) => TaxData[][] | undefined;
}

export interface ITaxNode {
  description: ITaxNodeDescription;
  execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]>;
}
