import {
	IExecutePaginationFunctions,
	IRequestOptionsFromParameters,
	INodeExecutionData,
	IDataObject,
	IPostReceiveRootProperty
} from "n8n-workflow";

export function wait(millis: number = 1000) {
	return new Promise((resolve, _reject) => {
		setTimeout(() => {
			resolve(true);
		}, millis);
	});
}

export async function highLevelApiPagination(this: IExecutePaginationFunctions, requestData: IRequestOptionsFromParameters): Promise<INodeExecutionData[]> {

	let rootProperty = '';
	requestData.postReceive.forEach(pR => {
		for (let i = 0; i < pR.actions.length; i++) {
			const action = pR.actions[i] as IPostReceiveRootProperty;
			if (action.type === 'rootProperty') {
				rootProperty = action.properties.property
				pR.actions.splice(i, 1);
				break;
			}
		}
	});

	const responseData: INodeExecutionData[] = [];
	const returnAll = this.getNodeParameter('returnAll', false) as boolean;
	let responseTotal = 0;

	do {

		// console.log(requestData.options);

		const pageResponseData: INodeExecutionData[] = await this.makeRoutingRequest(requestData);
		const items = pageResponseData[0].json[rootProperty] as [];
		items.forEach(item => responseData.push({ json: item }));

		const meta = pageResponseData[0].json.meta as IDataObject;
		const startAfterId = meta?.startAfterId as string;
		const startAfter = meta?.startAfter as number;
		requestData.options.qs = { startAfterId, startAfter };
		responseTotal = meta?.total as number || 0;

		// console.log(JSON.stringify(meta, null, 2));
		// await wait();

	} while (returnAll && responseTotal > responseData.length)

	return responseData;
};
