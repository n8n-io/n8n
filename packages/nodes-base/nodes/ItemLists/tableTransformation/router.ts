import { IExecuteFunctions } from 'n8n-core';
import { INodeExecutionData, NodeOperationError } from 'n8n-workflow';

import {
	OperationType,
	ReconfigureOperation,
	SimplifyOperation,
	SummarizeOperation,
} from './resource.type';

import { simplify } from './simplify/Simplify.operation.type';
import { summarize } from './summarize/Summarize.operation.type';
import { reconfigure } from './reconfigure/Reconfigure.operation.type';

export async function tableTransformationRouter(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const operationType = this.getNodeParameter('operationType', 0) as OperationType;
	const operation = this.getNodeParameter('operation', 0) as
		| SimplifyOperation
		| SummarizeOperation
		| ReconfigureOperation;

	let returnData: INodeExecutionData[] = [];

	try {
		switch (operationType) {
			case 'simplify':
				returnData = await simplify.call(this, operation as SimplifyOperation);
				break;
			case 'summarize':
				returnData = await summarize.call(this, operation as SummarizeOperation);
				break;
			case 'reconfigure':
				returnData = await reconfigure.call(this, operation as ReconfigureOperation);
				break;
			default:
				throw new NodeOperationError(
					this.getNode(),
					`The operation type "${operationType}" is not known`,
				);
		}
	} catch (error) {
		throw error;
	}

	return this.prepareOutputData(returnData);
}
