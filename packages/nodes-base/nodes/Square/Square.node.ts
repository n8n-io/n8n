import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

import { squareApiRequest, squareApiRequestAllItems } from './helpers';

import { NodeOperationError } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { customerOperations, customerFields } from './descriptions/CustomerOperations';

export class Square implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Square',
		name: 'square',
		icon: 'file:square.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Square API',
		defaults: {
			name: 'Square',
		},
		usableAsTool: true,
		inputs: [{ type: NodeConnectionType.Main }],
		outputs: [{ type: NodeConnectionType.Main }],
		credentials: [
			{
				name: 'squareApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL:
				'={{$credentials?.environment === "sandbox" ? "https://connect.squareupsandbox.com/v2" : "https://connect.squareup.com/v2"}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Customer',
						value: 'customer',
					},
					{
						name: 'Inventory',
						value: 'inventory',
					},
				],
				default: 'customer',
			},
			...customerOperations,
			...customerFields,
		],
	};

	methods = {
		loadOptions: {
			// Add any dynamic option loading methods here
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'customer') {
					// *********************************************************************
					//                             customer
					// *********************************************************************

					if (operation === 'create') {
						// ----------------------------------
						//         customer: create
						// ----------------------------------

						const body: IDataObject = {
							given_name: this.getNodeParameter('given_name', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(body, additionalFields);

						responseData = await squareApiRequest.call(this, 'POST', '/customers', body);
					} else if (operation === 'get') {
						// ----------------------------------
						//         customer: get
						// ----------------------------------

						const customerId = this.getNodeParameter('customerId', i);
						responseData = await squareApiRequest.call(
							this,
							'GET',
							`/customers/${customerId}`,
							{},
							{},
						);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         customer: getAll
						// ----------------------------------

						const returnAll = this.getNodeParameter('returnAll', i);
						const limit = this.getNodeParameter('limit', i, 100);

						if (returnAll) {
							responseData = await squareApiRequestAllItems.call(this, '/customers');
						} else {
							const qs = {
								limit,
							};
							responseData = await squareApiRequest.call(this, 'GET', '/customers', {}, qs);
						}
					} else if (operation === 'update') {
						// ----------------------------------
						//         customer: update
						// ----------------------------------

						const customerId = this.getNodeParameter('customerId', i);
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length === 0) {
							throw new NodeOperationError(
								this.getNode(),
								'Please enter at least one field to update for the customer',
								{ itemIndex: i },
							);
						}

						responseData = await squareApiRequest.call(
							this,
							'PUT',
							`/customers/${customerId}`,
							updateFields,
						);
					} else if (operation === 'delete') {
						// ----------------------------------
						//         customer: delete
						// ----------------------------------

						const customerId = this.getNodeParameter('customerId', i);
						responseData = await squareApiRequest.call(
							this,
							'DELETE',
							`/customers/${customerId}`,
							{},
							{},
						);
					} else if (operation === 'search') {
						// ----------------------------------
						//         customer: search
						// ----------------------------------

						const returnAll = this.getNodeParameter('returnAll', i);
						const searchFields = this.getNodeParameter('searchFields', i);
						const body: { query: { filter: object }; limit?: number } = {
							query: { filter: searchFields as object },
						};

						if (returnAll) {
							responseData = await squareApiRequestAllItems.call(this, '/customers/search', body);
						} else {
							const limit = this.getNodeParameter('limit', i, 100);
							body.limit = limit;
							responseData = await squareApiRequest.call(this, 'POST', '/customers/search', body);
						}
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}

		return [returnData];
	}
}
