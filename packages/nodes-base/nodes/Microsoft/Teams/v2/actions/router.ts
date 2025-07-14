import {
	type IExecuteFunctions,
	type IDataObject,
	type INodeExecutionData,
	NodeOperationError,
	SEND_AND_WAIT_OPERATION,
} from 'n8n-workflow';

import * as channel from './channel';
import * as channelMessage from './channelMessage';
import * as chatMessage from './chatMessage';
import type { MicrosoftTeamsType } from './node.type';
import * as task from './task';
import { configureWaitTillDate } from '../../../../../utils/sendAndWait/configureWaitTillDate.util';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	let responseData;

	const resource = this.getNodeParameter<MicrosoftTeamsType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const nodeVersion = this.getNode().typeVersion;
	const instanceId = this.getInstanceId();

	const microsoftTeamsTypeData = {
		resource,
		operation,
	} as MicrosoftTeamsType;

	if (
		microsoftTeamsTypeData.resource === 'chatMessage' &&
		microsoftTeamsTypeData.operation === SEND_AND_WAIT_OPERATION
	) {
		await chatMessage[microsoftTeamsTypeData.operation].execute.call(this, 0, instanceId);

		const waitTill = configureWaitTillDate(this);

		await this.putExecutionToWait(waitTill);
		return [items];
	}

	for (let i = 0; i < items.length; i++) {
		try {
			switch (microsoftTeamsTypeData.resource) {
				case 'channel':
					responseData = await channel[microsoftTeamsTypeData.operation].execute.call(this, i);
					break;
				case 'channelMessage':
					responseData = await channelMessage[microsoftTeamsTypeData.operation].execute.call(
						this,
						i,
						nodeVersion,
						instanceId,
					);
					break;
				case 'chatMessage':
					responseData = await chatMessage[microsoftTeamsTypeData.operation].execute.call(
						this,
						i,
						instanceId,
					);
					break;
				case 'task':
					responseData = await task[microsoftTeamsTypeData.operation].execute.call(this, i);
					break;
				default:
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported!`,
					);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
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
	return [returnData];
}
