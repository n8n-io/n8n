import {
	IDataObject,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	IRequestOptionsFromParameters,
	NodeApiError
} from "n8n-workflow";

const hasKeys = (obj: object) => !!Object.keys(obj).length;

export async function profileFiltersPreSendAction(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
	const filters = this.getNodeParameter('filters') as any;
	if (hasKeys(filters)) {
		const isFilterFalse = (key: string) => key in filters && !filters[key];
		if (isFilterFalse('hasAccount') || isFilterFalse('isCustomer')) {
			const message = "Filters 'Is Customer' and 'Has Account' cannot be set to false";
			throw new NodeApiError(this.getNode(), {}, { message, description: message });
		}
		const filter = Object.entries(filters).map(([k, v]) => `${k},${v}`).join(';');
		requestOptions.qs = (requestOptions.qs || {}) as IDataObject;
		Object.assign(requestOptions.qs, { filter });
	}
	return requestOptions;
}


export async function squarespaceApiPagination(this: IExecutePaginationFunctions, requestData: IRequestOptionsFromParameters): Promise<INodeExecutionData[]> {

	const responseData: INodeExecutionData[] = [];
	const resource = this.getNodeParameter('resource') as string;
	const returnAll = this.getNodeParameter('returnAll') as boolean;
	const limit = this.getNodeParameter('limit', 0) as number;
	const resourceMapping: { [key: string]: string } = {
		'product': 'products',
		'inventory': 'inventory',
		'profile': 'profiles',
	}
	const rootProperty = resourceMapping[resource]

	requestData.options.qs = requestData.options.qs || {}
	let hasNextPage = false;

	do {

		const pageResponseData: INodeExecutionData[] = await this.makeRoutingRequest(requestData);
		const items = pageResponseData[0].json[rootProperty] as [];
		items.forEach(item => responseData.push({ json: item }));

		const pagination = pageResponseData[0].json.pagination as IDataObject;
		hasNextPage = pagination.hasNextPage as boolean;
		const cursor = pagination.nextPageCursor as string;
		requestData.options.qs = { cursor };

		// console.log({ hasNextPage, cursor })

	} while (returnAll && hasNextPage)

	// fake limit because squarspace's api does not support it
	if (!returnAll && responseData.length > limit) {
		responseData.splice(limit, responseData.length - limit);
	}

	return responseData;
};
