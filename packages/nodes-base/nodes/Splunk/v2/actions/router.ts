import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import * as fieldAlert from './firedAlert';
import * as searchConfiguration from './searchConfiguration';
import * as searchJob from './searchJob';
import * as searchResult from './searchResult';
import * as user from './user';

import set from 'lodash/set';
import type { SplunkType } from './node.type';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	let returnData: INodeExecutionData[] = [];

	const resource = this.getNodeParameter<SplunkType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const splunkNodeData = {
		resource,
		operation,
	} as SplunkType;

	let responseData;

	for (let i = 0; i < items.length; i++) {
		try {
			switch (splunkNodeData.resource) {
				case 'firedAlert':
					responseData = await fieldAlert[splunkNodeData.operation].execute.call(this, i);
					break;
				case 'searchConfiguration':
					responseData = await searchConfiguration[splunkNodeData.operation].execute.call(this, i);
					break;
				case 'searchJob':
					responseData = await searchJob[splunkNodeData.operation].execute.call(this, i);
					break;
				case 'searchResult':
					responseData = await searchResult[splunkNodeData.operation].execute.call(this, i);
					break;
				case 'user':
					responseData = await user[splunkNodeData.operation].execute.call(this, i);
					break;
				default:
					throw new NodeOperationError(this.getNode(), 'Resource not found', { itemIndex: i });
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.cause.error }, pairedItem: { item: i } });
				continue;
			}

			if (error instanceof NodeApiError) {
				set(error, 'context.itemIndex', i);
				throw error;
			}

			if (error instanceof NodeOperationError) {
				if (error?.context?.itemIndex === undefined) {
					set(error, 'context.itemIndex', i);
				}
				throw error;
			}

			throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
		}

		const executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(responseData),
			{ itemData: { item: i } },
		);

		returnData = returnData.concat(executionData);
	}

	return [returnData];
}
