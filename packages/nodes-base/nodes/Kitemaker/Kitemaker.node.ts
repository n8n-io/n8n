import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	organizationOperations,
	spaceFields,
	spaceOperations,
	userFields,
	userOperations,
	workItemFields,
	workItemOperations,
} from './descriptions';

import type { LoadOptions } from './GenericFunctions';
import { createLoadOptions, kitemakerRequest, kitemakerRequestAllItems } from './GenericFunctions';

import {
	getAllSpaces,
	getAllUsers,
	getAllWorkItems,
	getLabels,
	getOrganization,
	getSpaces,
	getStatuses,
	getUsers,
	getWorkItem,
	getWorkItems,
} from './queries';

import { createWorkItem, editWorkItem } from './mutations';

export class Kitemaker implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kitemaker',
		name: 'kitemaker',
		icon: 'file:kitemaker.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Consume the Kitemaker GraphQL API',
		defaults: {
			name: 'Kitemaker',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'kitemakerApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Space',
						value: 'space',
					},
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Work Item',
						value: 'workItem',
					},
				],
				default: 'workItem',
				required: true,
			},
			...organizationOperations,
			...spaceOperations,
			...spaceFields,
			...userOperations,
			...userFields,
			...workItemOperations,
			...workItemFields,
		],
	};

	methods = {
		loadOptions: {
			async getLabels(this: ILoadOptionsFunctions) {
				const responseData = await kitemakerRequest.call(this, { query: getLabels });
				const {
					data: {
						organization: { spaces },
					},
				} = responseData;

				return createLoadOptions(spaces[0].labels as LoadOptions[]);
			},

			async getSpaces(this: ILoadOptionsFunctions) {
				const responseData = await kitemakerRequest.call(this, { query: getSpaces });
				const {
					data: {
						organization: { spaces },
					},
				} = responseData;

				return createLoadOptions(spaces as LoadOptions[]);
			},

			async getStatuses(this: ILoadOptionsFunctions) {
				const spaceId = this.getNodeParameter('spaceId', 0) as string;
				if (!spaceId.length) {
					throw new NodeOperationError(
						this.getNode(),
						'Please choose a space to set for the work item to create.',
					);
				}

				const responseData = await kitemakerRequest.call(this, { query: getStatuses });
				const {
					data: {
						organization: { spaces },
					},
				} = responseData;
				const space = spaces.find((e: { [x: string]: string }) => e.id === spaceId);

				return createLoadOptions(space.statuses as LoadOptions[]);
			},

			async getUsers(this: ILoadOptionsFunctions) {
				const responseData = await kitemakerRequest.call(this, { query: getUsers });
				const {
					data: {
						organization: { users },
					},
				} = responseData;

				return createLoadOptions(users as LoadOptions[]);
			},

			async getWorkItems(this: ILoadOptionsFunctions) {
				const spaceId = this.getNodeParameter('spaceId', 0) as string;

				const responseData = await kitemakerRequest.call(this, {
					query: getWorkItems,
					variables: { spaceId },
				});

				const {
					data: {
						workItems: { workItems },
					},
				} = responseData;

				return createLoadOptions(workItems as LoadOptions[]);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let responseData;
		const returnData: INodeExecutionData[] = [];

		// https://github.com/kitemakerhq/docs/blob/main/kitemaker.graphql

		for (let i = 0; i < items.length; i++) {
			if (resource === 'organization') {
				// *********************************************************************
				//                           organization
				// *********************************************************************

				if (operation === 'get') {
					// ----------------------------------
					//         organization: get
					// ----------------------------------

					responseData = await kitemakerRequest.call(this, {
						query: getOrganization,
					});

					responseData = responseData.data.organization;
				}
			} else if (resource === 'space') {
				// *********************************************************************
				//                             space
				// *********************************************************************

				if (operation === 'getAll') {
					// ----------------------------------
					//          space: getAll
					// ----------------------------------

					const allItems = await kitemakerRequestAllItems.call(this, {
						query: getAllSpaces,
						variables: {},
					});

					responseData = allItems;
				}
			} else if (resource === 'user') {
				// *********************************************************************
				//                             user
				// *********************************************************************

				if (operation === 'getAll') {
					// ----------------------------------
					//          user: getAll
					// ----------------------------------

					const allItems = await kitemakerRequestAllItems.call(this, {
						query: getAllUsers,
						variables: {},
					});

					responseData = allItems;
				}
			} else if (resource === 'workItem') {
				// *********************************************************************
				//                             workItem
				// *********************************************************************

				if (operation === 'create') {
					// ----------------------------------
					//         workItem: create
					// ----------------------------------

					const input = {
						title: this.getNodeParameter('title', i) as string,
						statusId: this.getNodeParameter('statusId', i) as string[],
					};

					if (!input.statusId.length) {
						throw new NodeOperationError(
							this.getNode(),
							'Please enter a status to set for the work item to create.',
							{ itemIndex: i },
						);
					}

					const additionalFields = this.getNodeParameter('additionalFields', i);

					if (Object.keys(additionalFields).length) {
						Object.assign(input, additionalFields);
					}

					responseData = await kitemakerRequest.call(this, {
						query: createWorkItem,
						variables: { input },
					});

					responseData = responseData.data.createWorkItem.workItem;
				} else if (operation === 'get') {
					// ----------------------------------
					//         workItem: get
					// ----------------------------------

					const workItemId = this.getNodeParameter('workItemId', i) as string;

					responseData = await kitemakerRequest.call(this, {
						query: getWorkItem,
						variables: { workItemId },
					});

					responseData = responseData.data.workItem;
				} else if (operation === 'getAll') {
					// ----------------------------------
					//         workItem: getAll
					// ----------------------------------

					const allItems = await kitemakerRequestAllItems.call(this, {
						query: getAllWorkItems,
						variables: {
							spaceId: this.getNodeParameter('spaceId', i) as string,
						},
					});

					responseData = allItems;
				} else if (operation === 'update') {
					// ----------------------------------
					//         workItem: update
					// ----------------------------------

					const input = {
						id: this.getNodeParameter('workItemId', i),
					};

					const updateFields = this.getNodeParameter('updateFields', i);

					if (!Object.keys(updateFields).length) {
						throw new NodeOperationError(
							this.getNode(),
							'Please enter at least one field to update for the work item.',
							{ itemIndex: i },
						);
					}

					Object.assign(input, updateFields);

					responseData = await kitemakerRequest.call(this, {
						query: editWorkItem,
						variables: { input },
					});

					responseData = responseData.data.editWorkItem.workItem;
				}
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}

		return this.prepareOutputData(returnData);
	}
}
