import {
	IExecutePaginationFunctions,
	IRequestOptionsFromParameters,
	INodeExecutionData,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	IDataObject,
	IHttpRequestOptions,
} from "n8n-workflow";

import {
	DateTime,
	ToISOTimeOptions
} from 'luxon';

export function wait(millis: number = 1000) {
	return new Promise((resolve, _reject) => {
		setTimeout(() => {
			resolve(true);
		}, millis);
	});
}

const VALID_EMAIL_REGEX = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const VALID_PHONE_REGEX = /((?:\+|00)[17](?: |\-)?|(?:\+|00)[1-9]\d{0,2}(?: |\-)?|(?:\+|00)1\-\d{3}(?: |\-)?)?(0\d|\([0-9]{3}\)|[1-9]{0,3})(?:((?: |\-)[0-9]{2}){4}|((?:[0-9]{2}){4})|((?: |\-)[0-9]{3}(?: |\-)[0-9]{4})|([0-9]{7}))/

export function isEmailValid(email: string): boolean {
	return VALID_EMAIL_REGEX.test(String(email).toLowerCase());
}

export function isPhoneValid(phone: string): boolean {
	return VALID_PHONE_REGEX.test(String(phone));
}

export async function highLevelApiPagination(this: IExecutePaginationFunctions, requestData: IRequestOptionsFromParameters): Promise<INodeExecutionData[]> {

	const responseData: INodeExecutionData[] = [];
	const resource = this.getNodeParameter('resource') as string;
	const returnAll = this.getNodeParameter('returnAll', false) as boolean;
	const resourceMapping: { [key: string]: string } = {
		'contact': 'contacts',
		'opportunity': 'opportunities'
	}
	const rootProperty = resourceMapping[resource]

	requestData.options.qs = requestData.options.qs || {}
	if (returnAll) requestData.options.qs.limit = 100;

	let responseTotal = 0;

	do {
		// console.log(requestData.options);

		const pageResponseData: INodeExecutionData[] = await this.makeRoutingRequest(requestData);
		const items = pageResponseData[0].json[rootProperty] as [];
		items.forEach(item => responseData.push({ json: item }));

		const meta = pageResponseData[0].json.meta as IDataObject;
		const startAfterId = meta.startAfterId as string;
		const startAfter = meta.startAfter as number;
		requestData.options.qs = { startAfterId, startAfter };
		responseTotal = meta.total as number || 0;

		// console.log(JSON.stringify(meta, null, 2));
		// await wait();

	} while (returnAll && responseTotal > responseData.length)

	return responseData;
};

async function postReceiveAction(this: IExecuteSingleFunctions, items: INodeExecutionData[], response: IN8nHttpFullResponse,): Promise<INodeExecutionData[]> {
	const pipelineIdentifier = this.getNodeParameter('pipelineIdentifier') as string;
	console.log('pipelineIdentifier', pipelineIdentifier);
	console.log(items);
	return items;
}

export async function dueDatePreSendAction(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
	const dueDateParam = this.getNodeParameter('dueDate') as string;
	const options: ToISOTimeOptions = { suppressMilliseconds: true }
	const dueDate = DateTime.fromISO(dueDateParam).toISO(options);
	requestOptions.body = (requestOptions.body || {}) as object;
	Object.assign(requestOptions.body, { dueDate });
	// console.log({ dueDateParam, dueDate });
	return requestOptions;
}
