import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { googleApiRequest, googleApiRequestAllItems } from '../GenericFunctions';

/**
 * Get all the labels to display them to user so that they can select them easily
 */
export async function getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const labels = await googleApiRequestAllItems.call(
		this,
		'labels',
		'GET',
		'/gmail/v1/users/me/labels',
	);

	for (const label of labels) {
		returnData.push({
			name: label.name,
			value: label.id,
		});
	}

	return returnData.sort((a, b) => {
		if (a.name < b.name) {
			return -1;
		}
		if (a.name > b.name) {
			return 1;
		}
		return 0;
	});
}

export async function getThreadMessages(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const id = this.getNodeParameter('threadId', 0) as string;
	const { messages } = await googleApiRequest.call(
		this,
		'GET',
		`/gmail/v1/users/me/threads/${id}`,
		{},
		{ format: 'minimal' },
	);

	for (const message of messages || []) {
		returnData.push({
			name: message.snippet,
			value: message.id,
		});
	}

	return returnData;
}

export async function getGmailAliases(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const { sendAs } = await googleApiRequest.call(this, 'GET', '/gmail/v1/users/me/settings/sendAs');

	for (const alias of sendAs || []) {
		const displayName = alias.isDefault ? `${alias.sendAsEmail} (Default)` : alias.sendAsEmail;
		returnData.push({
			name: displayName,
			value: alias.sendAsEmail,
		});
	}

	return returnData;
}
