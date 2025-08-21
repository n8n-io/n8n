import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { apiMetaRequestAllItems, apiRequest } from '../../GenericFunctions';

export class BaseExecutor {
	constructor(protected executeFunctions: IExecuteFunctions) {}

	async execute(): Promise<INodeExecutionData[][]> {
		const items = this.executeFunctions.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;

		const operation = this.executeFunctions.getNodeParameter('operation', 0) as string;

		let requestMethod: IHttpRequestMethods;
		let endPoint = '';
		let qs: IDataObject = {};

		for (let i = 0; i < items.length; i++) {
			const workspaceId = this.executeFunctions.getNodeParameter('workspaceId', i, undefined, {
				extractValue: true,
			}) as string;
			try {
				if (operation === 'getAll') {
					requestMethod = 'GET';
					endPoint = `/api/v3/meta/workspaces/${workspaceId}/bases`; // Endpoint for getting all bases (NocoDB API v2)

					responseData = await apiMetaRequestAllItems.call(
						this.executeFunctions,
						requestMethod,
						endPoint,
						{},
						qs,
					);
					returnData.push(...(responseData as IDataObject[]));
				} else if (operation === 'get') {
					requestMethod = 'GET';
					const baseId = this.executeFunctions.getNodeParameter('projectId', i, undefined, {
						extractValue: true,
					}) as string;
					endPoint = `/api/v3/meta/bases/${baseId}`;

					responseData = await apiRequest.call(
						this.executeFunctions,
						requestMethod,
						endPoint,
						{},
						qs,
					);
					returnData.push(responseData as IDataObject);
				} else {
					throw new NodeOperationError(
						this.executeFunctions.getNode(),
						`The operation "${operation}" is not supported for the Base resource.`,
					);
				}
			} catch (error) {
				if (this.executeFunctions.continueOnFail()) {
					returnData.push({ error: error.toString() });
				} else {
					throw new NodeApiError(this.executeFunctions.getNode(), error as JsonObject);
				}
			}
		}

		return [this.executeFunctions.helpers.returnJsonArray(returnData)];
	}
}
