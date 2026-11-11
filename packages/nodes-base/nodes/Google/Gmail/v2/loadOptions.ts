import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { googleApiRequest, googleApiRequestAllItems, getLabels } from '../GenericFunctions';

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

/**
 * User labels only, value = label name (for composing nested names).
 * Display name is indented by nesting depth.
 */
export async function getUserLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const labels = await googleApiRequestAllItems.call(
		this,
		'labels',
		'GET',
		'/gmail/v1/users/me/labels',
	);

	for (const label of labels) {
		if (label.type === 'system') {
			continue;
		}
		const depth = label.name.split('/').length - 1;
		const indent = depth > 0 ? `${'  '.repeat(depth)}` : '';
		returnData.push({
			name: `${indent}${label.name}`,
			value: label.name,
		});
	}

	const sorted = returnData.sort((a, b) => {
		if (a.value < b.value) {
			return -1;
		}
		if (a.value > b.value) {
			return 1;
		}
		return 0;
	});

	// Parent Label is optional; without an empty choice the editor flags '' as unsupported.
	return [{ name: 'None (Top Level)', value: '' }, ...sorted];
}

export { getLabels };
