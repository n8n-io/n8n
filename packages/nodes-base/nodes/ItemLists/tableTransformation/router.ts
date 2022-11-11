import { IExecuteFunctions } from 'n8n-core';
import { INodeExecutionData } from 'n8n-workflow';

import {
	OperationType,
	ReconfigureOperation,
	SimplifyOperation,
	SummarizeOperation,
} from './types';

import { simplify } from './simplify/Simplify.operation.type';
import { summarize } from './summarize/Summarize.operation.type';
import { reconfigure } from './reconfigure/Reconfigure.operation.type';

export async function tableTransformationRouter(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const operationType = this.getNodeParameter('operationType', 0) as OperationType;
	const operation = this.getNodeParameter('operation', 0);

	let returnData: INodeExecutionData[] = [];

	try {
		if (operationType === 'simplify') {
			returnData = await simplify.call(this, operation as SimplifyOperation);
		}
		if (operationType === 'summarize') {
			returnData = await summarize.call(this, operation as SummarizeOperation);
		}
		if (operationType === 'reconfigure') {
			returnData = await reconfigure.call(this, operation as ReconfigureOperation);
		}
	} catch (error) {
		throw error;
	}

	return this.prepareOutputData(returnData);
}
