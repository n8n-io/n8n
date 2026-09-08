import {
	type IExecuteFunctions,
	type IDataObject,
	type INodeExecutionData,
	type JsonObject,
	NodeOperationError,
	SEND_AND_WAIT_OPERATION,
} from 'n8n-workflow';

import * as channel from './channel';
import * as channelMessage from './channelMessage';
import * as chat from './chat';
import { throwIfChatUnsupported } from './chat/sharedGuard';
import * as chatMember from './chatMember';
import { throwIfChatMemberUnsupported } from './chatMember/sharedGuard';
import * as chatMessage from './chatMessage';
import { throwIfChatMessageUnsupported } from './chatMessage/sharedGuard';
import type { MicrosoftTeamsType } from './node.type';
import * as onlineMeeting from './onlineMeeting';
import { throwIfOnlineMeetingUnsupported } from './onlineMeeting/shared';
import * as task from './task';
import { configureWaitTillDate } from '../../../../../utils/sendAndWait/configureWaitTillDate.util';

/**
 * The resources whose operation selector is hidden under the Service Principal credential.
 *
 * `Workflow` drops a hidden parameter before execution, so `operation` is absent for these
 * and the read below fails with `Could not get parameter "operation"` before any operation
 * can run its own guard. Guard on the resource first, so the user gets the real reason.
 * Each entry is the operation-level guard itself, so the message has one source.
 *
 * A `Map`, not an object: `resource` is a stored parameter, and a plain object walks
 * `Object.prototype`, so a resource of `__proto__` returns a non-nullish value and fails
 * with a raw `TypeError` instead of the node's own unsupported-operation error.
 */
const SERVICE_PRINCIPAL_RESOURCE_GUARDS = new Map<string, (this: IExecuteFunctions) => void>([
	['chat', throwIfChatUnsupported],
	['chatMember', throwIfChatMemberUnsupported],
	['chatMessage', throwIfChatMessageUnsupported],
	['onlineMeeting', throwIfOnlineMeetingUnsupported],
]);

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	let responseData;

	const resource = this.getNodeParameter<MicrosoftTeamsType>('resource', 0);
	SERVICE_PRINCIPAL_RESOURCE_GUARDS.get(String(resource))?.call(this);
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
		try {
			await chatMessage[microsoftTeamsTypeData.operation].execute.call(this, 0, instanceId);
		} catch (error) {
			if (this.continueOnFail()) {
				return [[{ json: { error: (error as JsonObject).message } }]];
			}
			throw error;
		}

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
				case 'chat':
					responseData = await chat[microsoftTeamsTypeData.operation].execute.call(this, i);
					break;
				case 'chatMember':
					responseData = await chatMember[microsoftTeamsTypeData.operation].execute.call(this, i);
					break;
				case 'chatMessage':
					responseData = await chatMessage[microsoftTeamsTypeData.operation].execute.call(
						this,
						i,
						instanceId,
					);
					break;
				case 'onlineMeeting':
					responseData = await onlineMeeting[microsoftTeamsTypeData.operation].execute.call(
						this,
						i,
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
