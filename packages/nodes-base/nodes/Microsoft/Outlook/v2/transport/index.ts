import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';

//declared in node root folder as also used by trigger node
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../../GenericFunctions';
export { microsoftApiRequest, microsoftApiRequestAllItems };

export async function microsoftApiRequestAllItemsSkip(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	headers: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;
	query['$top'] = 100;
	query['$skip'] = 0;

	do {
		responseData = await microsoftApiRequest.call(
			this,
			method,
			endpoint,
			body,
			query,
			undefined,
			headers,
		);
		query['$skip'] += query['$top'];
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (responseData['value'].length !== 0);

	return returnData;
}

export async function downloadAttachments(
	this: IExecuteFunctions,
	messages: IDataObject[] | IDataObject,
	prefix: string,
) {
	const elements: INodeExecutionData[] = [];
	if (!Array.isArray(messages)) {
		messages = [messages];
	}
	for (const message of messages) {
		const element: INodeExecutionData = {
			json: message,
			binary: {},
		};
		if (message.hasAttachments === true) {
			const attachments = await microsoftApiRequestAllItems.call(
				this,
				'value',
				'GET',
				`/messages/${message.id}/attachments`,
				{},
			);
			for (const [index, attachment] of attachments.entries()) {
				const response = await microsoftApiRequest.call(
					this,
					'GET',
					`/messages/${message.id}/attachments/${attachment.id}/$value`,
					undefined,
					{},
					undefined,
					{},
					{ encoding: null, resolveWithFullResponse: true },
				);

				const data = Buffer.from(response.body as string, 'utf8');
				element.binary![`${prefix}${index}`] = await this.helpers.prepareBinaryData(
					data as unknown as Buffer,
					attachment.name as string,
					attachment.contentType as string,
				);
			}
		}
		if (Object.keys(element.binary!).length === 0) {
			delete element.binary;
		}
		elements.push(element);
	}
	return elements;
}

export async function getMimeContent(
	this: IExecuteFunctions,
	messageId: string,
	binaryPropertyName: string,
	outputFileName?: string,
) {
	const response = await microsoftApiRequest.call(
		this,
		'GET',
		`/messages/${messageId}/$value`,
		undefined,
		{},
		undefined,
		{},
		{ encoding: null, resolveWithFullResponse: true },
	);

	let mimeType: string | undefined;
	if (response.headers['content-type']) {
		mimeType = response.headers['content-type'];
	}

	const fileName = `${outputFileName || messageId}.eml`;
	const data = Buffer.from(response.body as string, 'utf8');
	const binary: IDataObject = {};
	binary[binaryPropertyName] = await this.helpers.prepareBinaryData(
		data as unknown as Buffer,
		fileName,
		mimeType,
	);

	return binary;
}
