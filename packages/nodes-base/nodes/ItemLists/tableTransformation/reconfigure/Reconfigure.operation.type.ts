import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { ReconfigureOperation } from '../resource.type';

export async function reconfigure(this: IExecuteFunctions, operation: ReconfigureOperation) {
	const returnData: INodeExecutionData[] = [];
	switch (operation) {
		case 'expandNestedFields':
			returnData.push();
			break;
		case 'flipTable':
			returnData.push();
			break;
		case 'sort':
			returnData.push();
			break;
		case 'splitColumn':
			returnData.push();
			break;
		case 'updateColumnHeaders':
			returnData.push();
			break;
		default:
			throw new NodeOperationError(this.getNode(), `Operation "${operation}" is not supported!`);
	}
	return returnData;
}
