import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeApiError, NodeOperationError, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import * as calendar from './calendar';
import * as contact from './contact';
import * as draft from './draft';
import * as event from './event';
import * as folder from './folder';
import * as folderMessage from './folderMessage';
import * as message from './message';
import * as messageAttachment from './messageAttachment';
import type { MicrosoftOutlook } from './node.type';
import { configureWaitTillDate } from '../../../../../utils/sendAndWait/configureWaitTillDate.util';

export async function router(this: IExecuteFunctions) {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const resource = this.getNodeParameter<MicrosoftOutlook>('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0);

	let responseData;

	const microsoftOutlook = {
		resource,
		operation,
	} as MicrosoftOutlook;

	if (
		microsoftOutlook.resource === 'message' &&
		microsoftOutlook.operation === SEND_AND_WAIT_OPERATION
	) {
		await message[microsoftOutlook.operation].execute.call(this, 0, items);

		const waitTill = configureWaitTillDate(this);

		await this.putExecutionToWait(waitTill);
		return [items];
	}

	for (let i = 0; i < items.length; i++) {
		try {
			switch (microsoftOutlook.resource) {
				case 'calendar':
					responseData = await calendar[microsoftOutlook.operation].execute.call(this, i);
					break;
				case 'contact':
					responseData = await contact[microsoftOutlook.operation].execute.call(this, i);
					break;
				case 'draft':
					responseData = await draft[microsoftOutlook.operation].execute.call(this, i, items);
					break;
				case 'event':
					responseData = await event[microsoftOutlook.operation].execute.call(this, i);
					break;
				case 'folder':
					responseData = await folder[microsoftOutlook.operation].execute.call(this, i);
					break;
				case 'folderMessage':
					responseData = await folderMessage[microsoftOutlook.operation].execute.call(this, i);
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
			//NodeApiError will be missing the itemIndex, add it
			if (error instanceof NodeApiError && error?.context?.itemIndex === undefined) {
				if (error.context === undefined) {
					error.context = {};
				}
				error.context.itemIndex = i;
			}
			throw error;
		}
	}
	return [returnData];
}
