import {
	type IExecuteFunctions,
	type IDataObject,
	type INodeExecutionData,
	type JsonObject,
	NodeOperationError,
	SEND_AND_WAIT_OPERATION,
} from 'n8n-workflow';

import * as activityNotification from './activityNotification';
import * as channel from './channel';
import * as channelMessage from './channelMessage';
import * as chat from './chat';
import * as chatMember from './chatMember';
import * as chatMessage from './chatMessage';
import type { MicrosoftTeamsType } from './node.type';
import * as onlineMeeting from './onlineMeeting';
import * as task from './task';
import { configureWaitTillDate } from '../../../../../utils/sendAndWait/configureWaitTillDate.util';
import { stampItemIndexOnError } from '../../../GenericFunctions';
import { getTeamsCredentialType, SERVICE_PRINCIPAL_AUTH } from '../transport';

/**
 * The resources whose operation selector is hidden under the Service Principal credential.
 *
 * `Workflow` drops a hidden parameter before execution, so `operation` is absent for these
 * and the read below fails with `Could not get parameter "operation"`. Guard on the resource
 * first, so the user gets the real reason. Each entry holds the error for one resource.
 *
 * A `Map`, not an object: `resource` is a stored parameter, and a plain object walks
 * `Object.prototype`, so a resource of `__proto__` would match the guard, and the error
 * constructor would fail with a raw `TypeError` on the `undefined` message.
 */
const SERVICE_PRINCIPAL_RESOURCE_GUARDS = new Map([
	[
		'chat',
		{
			message: 'Chats are not available with the Service Principal credential',
			description:
				'App-only Microsoft Graph has no signed-in user to read or create chats for. Use an OAuth2 credential for chat actions.',
		},
	],
	[
		'chatMember',
		{
			message: 'Chat members are not available with the Service Principal credential',
			description:
				'The chat picker cannot list chats app-only. Use an OAuth2 credential for chat actions.',
		},
	],
	[
		'chatMessage',
		{
			message: 'Chat messages are not available with the Service Principal credential',
			description:
				'App-only Microsoft Graph has no signed-in user. Use an OAuth2 credential for chat actions.',
		},
	],
]);

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	let responseData;

	const resource = this.getNodeParameter<MicrosoftTeamsType>('resource', 0);
	const unsupported = SERVICE_PRINCIPAL_RESOURCE_GUARDS.get(resource);
	if (unsupported && getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH) {
		throw new NodeOperationError(this.getNode(), unsupported.message, {
			description: unsupported.description,
		});
	}
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
				case 'activityNotification':
					responseData = await activityNotification[microsoftTeamsTypeData.operation].execute.call(
						this,
						i,
					);
					break;
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
			throw stampItemIndexOnError(error, i);
		}
	}
	return [returnData];
}
