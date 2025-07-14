import { DateTime } from 'luxon';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function microsoftApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
	option: IDataObject = { json: true },
): Promise<any> {
	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://graph.microsoft.com/v1.0/me${resource}`,
	};
	try {
		Object.assign(options, option);
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		return await this.helpers.requestOAuth2.call(this, 'microsoftOneDriveOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function microsoftApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.$top = 100;

	do {
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query, uri);
		uri = responseData['@odata.nextLink'];
		if (uri?.includes('$top')) {
			delete query.$top;
		}
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData['@odata.nextLink'] !== undefined);

	return returnData;
}

export async function microsoftApiRequestAllItemsSkip(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.$top = 100;
	query.$skip = 0;

	do {
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query);
		query.$skip += query.$top;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.value.length !== 0);

	return returnData;
}

export async function microsoftApiRequestAllItemsDelta(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	link: string,
	lastDate: DateTime,
	eventType: string,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let deltaLink: string = '';
	let uri: string = link;

	do {
		responseData = (await microsoftApiRequest.call(this, 'GET', '', {}, {}, uri)) as IDataObject;
		uri = responseData['@odata.nextLink'] as string;

		for (const value of responseData.value as IDataObject[]) {
			if (value.fileSystemInfo as IDataObject) {
				const updatedTimeStamp = (value.fileSystemInfo as IDataObject)
					?.lastModifiedDateTime as string;
				const createdTimeStamp = (value.fileSystemInfo as IDataObject)?.createdDateTime as string;
				if (eventType === 'created') {
					if (DateTime.fromISO(createdTimeStamp) >= lastDate) {
						returnData.push(value);
					}
				}
				if (eventType === 'updated') {
					if (
						DateTime.fromISO(updatedTimeStamp) >= lastDate &&
						DateTime.fromISO(createdTimeStamp) < lastDate
					) {
						returnData.push(value);
					}
				}
			}
		}
		//returnData.push.apply(returnData, responseData.value as IDataObject[]);
		deltaLink = (responseData['@odata.deltaLink'] as string) || '';
	} while (responseData['@odata.nextLink'] !== undefined);

	return { deltaLink, returnData };
}

export async function getPath(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	itemId: string,
): Promise<string> {
	const responseData = (await microsoftApiRequest.call(
		this,
		'GET',
		'',
		{},
		{},
		`https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`,
	)) as IDataObject;
	if (responseData.folder) {
		return (responseData?.parentReference as IDataObject)?.path + `/${responseData?.name}`;
	} else {
		const workflow = this.getWorkflow();
		const node = this.getNode();
		this.logger.error(
			`There was a problem in '${node.name}' node in workflow '${workflow.id}': 'Item to watch is not a folder'`,
			{
				node: node.name,
				workflowId: workflow.id,
				error: 'Item to watch is not a folder',
			},
		);
		throw new NodeApiError(this.getNode(), {
			error: 'Item to watch is not a folder',
		} as JsonObject);
	}
}
