import {
	IDataObject,
	IExecutePaginationFunctions,
	INodeExecutionData,
	IRequestOptionsFromParameters
} from "n8n-workflow";


export async function squarespaceApiPagination(this: IExecutePaginationFunctions, requestData: IRequestOptionsFromParameters): Promise<INodeExecutionData[]> {

	const responseData: INodeExecutionData[] = [];
	const resource = this.getNodeParameter('resource') as string;
	// const returnAll = this.getNodeParameter('returnAll', false) as boolean;
	const resourceMapping: { [key: string]: string } = {
		'product': 'products',
		'inventory': 'inventory'
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

	} while (hasNextPage)

	return responseData;
};
