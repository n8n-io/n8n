import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { microsoftApiRequestAllItems } from '../transport';

export async function getCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const categories = await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		'/outlook/masterCategories',
	);
	for (const category of categories) {
		returnData.push({
			name: category.displayName as string,
			value: category.id as string,
		});
	}
	return returnData;
}

export async function getCategoriesNames(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const categories = await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		'/outlook/masterCategories',
	);
	for (const category of categories) {
		returnData.push({
			name: category.displayName as string,
			value: category.displayName as string,
		});
	}
	return returnData;
}

export async function getFolders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const folders = await microsoftApiRequestAllItems.call(this, 'value', 'GET', '/mailFolders', {});
	for (const folder of folders) {
		returnData.push({
			name: folder.displayName as string,
			value: folder.id as string,
		});
	}
	return returnData;
}

export async function getCalendarGroups(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const calendars = await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		'/calendarGroups',
		{},
	);
	for (const calendar of calendars) {
		returnData.push({
			name: calendar.name as string,
			value: calendar.id as string,
		});
	}
	return returnData;
}

export async function getCalendars(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const calendars = await microsoftApiRequestAllItems.call(this, 'value', 'GET', '/calendars');
	for (const calendar of calendars) {
		returnData.push({
			name: calendar.name as string,
			value: calendar.id as string,
		});
	}
	return returnData;
}

export async function getMessageAttachments(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const messageId = this.getNodeParameter('messageId', '') as string;

	if (messageId === '') {
		return [];
	}

	const attachments = await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		`/messages/${messageId}/attachments`,
	);
	for (const attachment of attachments) {
		returnData.push({
			name: attachment.name as string,
			value: attachment.id as string,
			description: attachment.contentType as string,
		});
	}
	return returnData;
}

export async function getDrafts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const qs = {
		$select: 'id,conversationId,subject,bodyPreview',
		$filter: 'isDraft eq true',
	};
	const drafts = await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		'/messages',
		undefined,
		qs,
	);
	for (const draft of drafts) {
		returnData.push({
			name: (draft.subject as string) || 'No Subject',
			value: draft.id as string,
			description: draft.bodyPreview as string,
		});
	}
	return returnData;
}
