import { NodeOperationError, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import * as operations from './operations';

type OpenAiType = 'generateImage' | 'analyzeImage' | 'createModeration' | 'generateAudio';

export async function router(this: IExecuteFunctions) {
	const returnData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const operation = this.getNodeParameter('operation', 0) as OpenAiType;

	for (let i = 0; i < items.length; i++) {
		try {
			const responseData = await operations[operation].execute.call(this, i);

			returnData.push(...responseData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
				continue;
			}
			throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
		}
	}

	return [returnData];
}
