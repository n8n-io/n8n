import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { SummarizeOperation } from '../resource.type';

export async function summarize(this: IExecuteFunctions, operation: SummarizeOperation) {
	const returnData: INodeExecutionData[] = [];
	switch (operation) {
		case 'countRowsAndColumns':
			returnData.push();
			break;
		case 'pivotColumns':
			returnData.push();
			break;
		case 'unpivotColumns':
			returnData.push();
			break;

		default:
			throw new NodeOperationError(this.getNode(), `Operation "${operation}" is not supported!`);
	}
	return returnData;
}
