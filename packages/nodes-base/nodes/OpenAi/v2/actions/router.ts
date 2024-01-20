import { NodeOperationError, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import * as audio from './audio';
import * as file from './file';
import * as image from './image';
import * as text from './text';

import type { OpenAiType } from './node.type';

export async function router(this: IExecuteFunctions) {
	const returnData: INodeExecutionData[] = [];
	let responseData;

	const items = this.getInputData();
	const resource = this.getNodeParameter<OpenAiType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const openAiTypeData = {
		resource,
		operation,
	} as OpenAiType;

	for (let i = 0; i < items.length; i++) {
		try {
			switch (openAiTypeData.resource) {
				case 'audio':
					responseData = await audio[openAiTypeData.operation].execute.call(this, i);
					break;
				case 'file':
					responseData = await file[openAiTypeData.operation].execute.call(this, i);
					break;
				case 'image':
					responseData = await image[openAiTypeData.operation].execute.call(this, i);
					break;
				case 'text':
					responseData = await text[openAiTypeData.operation].execute.call(this, i);
					break;
				default:
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported!`,
					);
			}

			returnData.push(...responseData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
				continue;
			}
			throw new NodeOperationError(this.getNode(), error, {
				itemIndex: i,
				description: error.description,
			});
		}
	}

	return [returnData];
}
