import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { mondayComApiRequest, mondayComApiRequestAllItems } from './GenericFunctions';

import { boardFields, boardOperations } from './BoardDescription';

import { boardColumnFields, boardColumnOperations } from './BoardColumnDescription';

import { boardGroupFields, boardGroupOperations } from './BoardGroupDescription';

import { boardItemFields, boardItemOperations } from './BoardItemDescription';

import { snakeCase } from 'change-case';

interface IGraphqlBody {
	query: string;
	variables: IDataObject;
}

export class MondayCom implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Monday.com',
		name: 'mondayCom',
		icon: 'file:mondayCom.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Monday.com API',
		defaults: {
			name: 'Monday.com',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mondayComApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'mondayComOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Board',
						value: 'board',
					},
					{
						name: 'Board Column',
						value: 'boardColumn',
					},
					{
						name: 'Board Group',
						value: 'boardGroup',
					},
					{
						name: 'Board Item',
						value: 'boardItem',
					},
				],
				default: 'board',
			},
			//BOARD
			...boardOperations,
			...boardFields,
			// BOARD COLUMN
			...boardColumnOperations,
			...boardColumnFields,
			// BOARD GROUP
			...boardGroupOperations,
			...boardGroupFields,
			// BOARD ITEM
			...boardItemOperations,
			...boardItemFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available boards to display them to user so that he can
			// select them easily
			async getBoards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const body = {
					query: `query ($page: Int, $limit: Int) {
							boards (page: $page, limit: $limit){
								id
								description
								name
							}
						}`,
					variables: {
						page: 1,
					},
				};
				const boards = await mondayComApiRequestAllItems.call(this, 'data.boards', body);
				if (boards === undefined) {
					return returnData;
				}

				for (const board of boards) {
					const boardName = board.name;
					const boardId = board.id;
					const boardDescription = board.description;
					returnData.push({
						name: boardName,
						value: boardId,
						description: boardDescription,
					});
				}
				return returnData;
			},
			// Get all the available columns to display them to user so that he can
			// select them easily
			async getColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const boardId = parseInt(this.getCurrentNodeParameter('boardId') as string, 10);
				const body: IGraphqlBody = {
					query: `query ($boardId: [Int]) {
							boards (ids: $boardId){
								columns() {
									id
									title
								}
							}
						}`,
					variables: {
						page: 1,
						boardId,
					},
				};
				const { data } = await mondayComApiRequest.call(this, body);
				if (data === undefined) {
					return returnData;
				}

				const columns = data.boards[0].columns;
				for (const column of columns) {
					const columnName = column.title;
					const columnId = column.id;
					returnData.push({
						name: columnName,
						value: columnId,
					});
				}
				return returnData;
			},
			// Get all the available groups to display them to user so that he can
			// select them easily
			async getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const boardId = parseInt(this.getCurrentNodeParameter('boardId') as string, 10);
				const body = {
					query: `query ($boardId: Int!) {
							boards ( ids: [$boardId]){
								groups () {
									id
									title
								}
							}
						}`,
					variables: {
						boardId,
					},
				};
				const { data } = await mondayComApiRequest.call(this, body);
				if (data === undefined) {
					return returnData;
				}

				const groups = data.boards[0].groups;
				for (const group of groups) {
					const groupName = group.title;
					const groupId = group.id;
					returnData.push({
						name: groupName,
						value: groupId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'board') {
					if (operation === 'archive') {
						const boardId = parseInt(this.getNodeParameter('boardId', i) as string, 10);

						const body: IGraphqlBody = {
							query: `mutation ($id: Int!) {
									archive_board (board_id: $id) {
										id
									}
								}`,
							variables: {
								id: boardId,
							},
						};

						responseData = await mondayComApiRequest.call(this, body);
						responseData = responseData.data.archive_board;
					}
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const kind = this.getNodeParameter('kind', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IGraphqlBody = {
							query: `mutation ($name: String!, $kind: BoardKind!, $templateId: Int) {
									create_board (board_name: $name, board_kind: $kind, template_id: $templateId) {
										id
									}
								}`,
							variables: {
								name,
								kind,
							},
						};

						if (additionalFields.templateId) {
							body.variables.templateId = additionalFields.templateId as number;
						}

						responseData = await mondayComApiRequest.call(this, body);
						responseData = responseData.data.create_board;
					}
					if (operation === 'get') {
						const boardId = parseInt(this.getNodeParameter('boardId', i) as string, 10);

						const body: IGraphqlBody = {
							query: `query ($id: [Int]) {
									boards (ids: $id){
										id
										name
										description
										state
										board_folder_id
										board_kind
										owner() {
											id
										}
									}
								}`,
							variables: {
								id: boardId,
							},
						};

						responseData = await mondayComApiRequest.call(this, body);
						responseData = responseData.data.boards;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						const body: IGraphqlBody = {
							query: `query ($page: Int, $limit: Int) {
									boards (page: $page, limit: $limit){
										id
										name
										description
										state
										board_folder_id
										board_kind
										owner() {
											id
										}
									}
								}`,
							variables: {
								page: 1,
							},
						};

						if (returnAll === true) {
							responseData = await mondayComApiRequestAllItems.call(this, 'data.boards', body);
						} else {
							body.variables.limit = this.getNodeParameter('limit', i);
							responseData = await mondayComApiRequest.call(this, body);
							responseData = responseData.data.boards;
						}
					}
				}
				if (resource === 'boardColumn') {
					if (operation === 'create') {
						const boardId = parseInt(this.getNodeParameter('boardId', i) as string, 10);
						const title = this.getNodeParameter('title', i) as string;
						const columnType = this.getNodeParameter('columnType', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IGraphqlBody = {
							query: `mutation ($boardId: Int!, $title: String!, $columnType: ColumnType, $defaults: JSON ) {
									create_column (board_id: $boardId, title: $title, column_type: $columnType, defaults: $defaults) {
										id
									}
								}`,
							variables: {
								boardId,
								title,
								columnType: snakeCase(columnType),
							},
						};

						if (additionalFields.defaults) {
							try {
								JSON.parse(additionalFields.defaults as string);
							} catch (error) {
								throw new NodeOperationError(this.getNode(), 'Defauls must be a valid JSON', {
									itemIndex: i,
								});
							}
							body.variables.defaults = JSON.stringify(
								JSON.parse(additionalFields.defaults as string),
							);
						}

						responseData = await mondayComApiRequest.call(this, body);
						responseData = responseData.data.create_column;
					}
					if (operation === 'getAll') {
						const boardId = parseInt(this.getNodeParameter('boardId', i) as string, 10);

						const body: IGraphqlBody = {
							query: `query ($boardId: [Int]) {
									boards (ids: $boardId){
										columns() {
											id
											title
											type
											settings_str
											archived
										}
									}
								}`,
							variables: {
								page: 1,
								boardId,
							},
						};

						responseData = await mondayComApiRequest.call(this, body);
						responseData = responseData.data.boards[0].columns;
					}
				}
				if (resource === 'boardGroup') {
					if (operation === 'create') {
						const boardId = parseInt(this.getNodeParameter('boardId', i) as string, 10);
						const name = this.getNodeParameter('name', i) as string;

						const body: IGraphqlBody = {
							query: `mutation ($boardId: Int!, $groupName: String!) {
									create_group (board_id: $boardId, group_name: $groupName) {
										id
									}
								}`,
							variables: {
								boardId,
								groupName: name,
							},
						};

						responseData = await mondayComApiRequest.call(this, body);
						responseData = responseData.data.create_group;
					}
					if (operation === 'delete') {
						const boardId = parseInt(this.getNodeParameter('boardId', i) as string, 10);
						const groupId = this.getNodeParameter('groupId', i) as string;

						const body: IGraphqlBody = {
							query: `mutation ($boardId: Int!, $groupId: String!) {
									delete_group (board_id: $boardId, group_id: $groupId) {
										id
									}
								}`,
							variables: {
								boardId,
								groupId,
							},
						};

						responseData = await mondayComApiRequest.call(this, body);
						responseData = responseData.data.delete_group;
					}
					if (operation === 'getAll') {
						const boardId = parseInt(this.getNodeParameter('boardId', i) as string, 10);

						const body: IGraphqlBody = {
							query: `query ($boardId: [Int]) {
									boards (ids: $boardId, ){
										id
										groups() {
											id
											title
											color
											position
											archived
										}
									}
								}`,
							variables: {
								boardId,
							},
						};

						responseData = await mondayComApiRequest.call(this, body);
						responseData = responseData.data.boards[0].groups;
					}
				}
				if (resource === 'boardItem') {
					if (operation === 'addUpdate') {
						const itemId = parseInt(this.getNodeParameter('itemId', i) as string, 10);
						const value = this.getNodeParameter('value', i) as string;

						const body: IGraphqlBody = {
							query: `mutation ($itemId: Int!, $value: String!) {
									create_update (item_id: $itemId, body: $value) {
										id
									}
								}`,
							variables: {
								itemId,
								value,
							},
						};

						responseData = await mondayComApiRequest.call(this, body);
						responseData = responseData.data.create_update;
					}
					if (operation === 'changeColumnValue') {
						const boardId = parseInt(this.getNodeParameter('boardId', i) as string, 10);
						const itemId = parseInt(this.getNodeParameter('itemId', i) as string, 10);
						const columnId = this.getNodeParameter('columnId', i) as string;
						const value = this.getNodeParameter('value', i) as string;

						const body: IGraphqlBody = {
							query: `mutation ($boardId: Int!, $itemId: Int!, $columnId: String!, $value: JSON!) {
									change_column_value (board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
										id
									}
								}`,
							variables: {
								boardId,
								itemId,
								columnId,
							},
						};

						try {
							JSON.parse(value);
						} catch (error) {
							throw new NodeOperationError(this.getNode(), 'Custom Values must be a valid JSON', {
								itemIndex: i,
							});
						}
						body.variables.value = JSON.stringify(JSON.parse(value));

						responseData = await mondayComApiRequest.call(this, body);
						responseData = responseData.data.change_column_value;
					}
					if (operation === 'changeMultipleColumnValues') {
						const boardId = parseInt(this.getNodeParameter('boardId', i) as string, 10);
						const itemId = parseInt(this.getNodeParameter('itemId', i) as string, 10);
						const columnValues = this.getNodeParameter('columnValues', i) as string;

						const body: IGraphqlBody = {
							query: `mutation ($boardId: Int!, $itemId: Int!, $columnValues: JSON!) {
									change_multiple_column_values (board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
										id
									}
								}`,
							variables: {
								boardId,
								itemId,
							},
						};

						try {
							JSON.parse(columnValues);
						} catch (error) {
							throw new NodeOperationError(this.getNode(), 'Custom Values must be a valid JSON', {
								itemIndex: i,
							});
						}
						body.variables.columnValues = JSON.stringify(JSON.parse(columnValues));

						responseData = await mondayComApiRequest.call(this, body);
						responseData = responseData.data.change_multiple_column_values;
					}
					if (operation === 'create') {
						const boardId = parseInt(this.getNodeParameter('boardId', i) as string, 10);
						const groupId = this.getNodeParameter('groupId', i) as string;
						const itemName = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IGraphqlBody = {
							query: `mutation ($boardId: Int!, $groupId: String!, $itemName: String!, $columnValues: JSON) {
									create_item (board_id: $boardId, group_id: $groupId, item_name: $itemName, column_values: $columnValues) {
										id
									}
								}`,
							variables: {
								boardId,
								groupId,
								itemName,
							},
						};

						if (additionalFields.columnValues) {
							try {
								JSON.parse(additionalFields.columnValues as string);
							} catch (error) {
								throw new NodeOperationError(this.getNode(), 'Custom Values must be a valid JSON', {
									itemIndex: i,
								});
							}
							body.variables.columnValues = JSON.stringify(
								JSON.parse(additionalFields.columnValues as string),
							);
						}

						responseData = await mondayComApiRequest.call(this, body);
						responseData = responseData.data.create_item;
					}
					if (operation === 'delete') {
						const itemId = parseInt(this.getNodeParameter('itemId', i) as string, 10);

						const body: IGraphqlBody = {
							query: `mutation ($itemId: Int!) {
									delete_item (item_id: $itemId) {
										id
									}
								}`,
							variables: {
								itemId,
							},
						};
						responseData = await mondayComApiRequest.call(this, body);
						responseData = responseData.data.delete_item;
					}
					if (operation === 'get') {
						const itemIds = (
							(this.getNodeParameter('itemId', i) as string).split(',') as string[]
						).map((n) => parseInt(n, 10));

						const body: IGraphqlBody = {
							query: `query ($itemId: [Int!]){
									items (ids: $itemId) {
										id
										name
										created_at
										state
										column_values() {
											id
											text
											title
											type
											value
											additional_info
										}
									}
								}`,
							variables: {
								itemId: itemIds,
							},
						};
						responseData = await mondayComApiRequest.call(this, body);
						responseData = responseData.data.items;
					}
					if (operation === 'getAll') {
						const boardId = parseInt(this.getNodeParameter('boardId', i) as string, 10);
						const groupId = this.getNodeParameter('groupId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);

						const body: IGraphqlBody = {
							query: `query ($boardId: [Int], $groupId: [String], $page: Int, $limit: Int) {
									boards (ids: $boardId) {
										groups (ids: $groupId) {
											id
											items(limit: $limit, page: $page) {
												id
												name
												created_at
												state
												column_values() {
													id
													text
													title
													type
													value
													additional_info
												}
											}
										}
									}
								}`,
							variables: {
								boardId,
								groupId,
							},
						};

						if (returnAll) {
							responseData = await mondayComApiRequestAllItems.call(
								this,
								'data.boards[0].groups[0].items',
								body,
							);
						} else {
							body.variables.limit = this.getNodeParameter('limit', i);
							responseData = await mondayComApiRequest.call(this, body);
							responseData = responseData.data.boards[0].groups[0].items;
						}
					}
					if (operation === 'getByColumnValue') {
						const boardId = parseInt(this.getNodeParameter('boardId', i) as string, 10);
						const columnId = this.getNodeParameter('columnId', i) as string;
						const columnValue = this.getNodeParameter('columnValue', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);

						const body: IGraphqlBody = {
							query: `query ($boardId: Int!, $columnId: String!, $columnValue: String!, $page: Int, $limit: Int ){
									items_by_column_values (board_id: $boardId, column_id: $columnId, column_value: $columnValue, page: $page, limit: $limit) {
										id
										name
										created_at
										state
										board {
											id
										}
										column_values() {
											id
											text
											title
											type
											value
											additional_info
										}
									}
								}`,
							variables: {
								boardId,
								columnId,
								columnValue,
							},
						};

						if (returnAll) {
							responseData = await mondayComApiRequestAllItems.call(
								this,
								'data.items_by_column_values',
								body,
							);
						} else {
							body.variables.limit = this.getNodeParameter('limit', i);
							responseData = await mondayComApiRequest.call(this, body);
							responseData = responseData.data.items_by_column_values;
						}
					}
					if (operation === 'move') {
						const groupId = this.getNodeParameter('groupId', i) as string;
						const itemId = parseInt(this.getNodeParameter('itemId', i) as string, 10);

						const body: IGraphqlBody = {
							query: `mutation ($groupId: String!, $itemId: Int!) {
									move_item_to_group (group_id: $groupId, item_id: $itemId) {
										id
									}
								}`,
							variables: {
								groupId,
								itemId,
							},
						};

						responseData = await mondayComApiRequest.call(this, body);
						responseData = responseData.data.move_item_to_group;
					}
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
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
		}

		return this.prepareOutputData(returnData);
	}
}
