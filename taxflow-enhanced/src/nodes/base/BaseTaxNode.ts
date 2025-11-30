import type { ITaxNode, ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';

export abstract class BaseTaxNode implements ITaxNode {
  abstract description: ITaxNodeDescription;

  abstract execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]>;

  protected createOutput(json: Record<string, any>): TaxData {
    return {
      json,
      metadata: {
        nodeType: this.description.name,
        nodeVersion: this.description.version,
        timestamp: Date.now(),
      },
    };
  }

  protected validateInput(inputData: TaxData[][]): void {
    if (!inputData || inputData.length === 0) {
      throw new Error(`${this.description.displayName} requires input data`);
    }
  }

  protected getFirstInput(inputData: TaxData[][]): TaxData {
    this.validateInput(inputData);
    if (!inputData[0] || !inputData[0][0]) {
      throw new Error(`${this.description.displayName} requires at least one input item`);
    }
    return inputData[0][0];
  }
}
