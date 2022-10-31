import { INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { IExecuteFunctions } from 'n8n-core';

import { MicrosoftOutlook } from './node.type';
import * as contact from './contact/Contact.resource';
import * as draft from './draft/Draft.resource';
import * as folder from './folder/Folder.resource';
import * as message from './message/Message.resource';
import * as messageAttachment from './messageAttachment/MessageAttachment.resource';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const resource = this.getNodeParameter<MicrosoftOutlook>('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as string;

	let responseData;

	const microsoftOutlook = {
		resource,
		operation,
	} as MicrosoftOutlook;

	for (let i = 0; i < items.length; i++) {
		try {
			switch (microsoftOutlook.resource) {
				case 'contact':
					responseData = await contact[microsoftOutlook.operation].execute.call(this, i);
					break;
				case 'draft':
					responseData = await draft[microsoftOutlook.operation].execute.call(this, i, items);
					break;
				case 'folder':
					responseData = await folder[microsoftOutlook.operation].execute.call(this, i);
					break;
				case 'message':
					responseData = await message[microsoftOutlook.operation].execute.call(this, i, items);
					break;
				case 'messageAttachment':
					responseData = await messageAttachment[microsoftOutlook.operation].execute.call(
						this,
						i,
						items,
					);
					break;
				default:
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known`);
			}

			returnData.push(...responseData);
		} catch (error) {
			if (this.continueOnFail()) {
				const executionErrorData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionErrorData);
				continue;
			}
			throw error;
		}
	}
	return this.prepareOutputData(returnData);
}
