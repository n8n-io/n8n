import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { apiRequest, apiRequestAllItems } from './GenericFunctions';

import { attachmentFields, attachmentOperations } from './AttachmentDescription';

import { boardFields, boardOperations } from './BoardDescription';

import { boardMemberFields, boardMemberOperations } from './BoardMemberDescription';

import { cardFields, cardOperations } from './CardDescription';

import { cardCommentFields, cardCommentOperations } from './CardCommentDescription';

import { checklistFields, checklistOperations } from './ChecklistDescription';

import { labelFields, labelOperations } from './LabelDescription';

import { listFields, listOperations } from './ListDescription';

interface TrelloBoardType {
	id: string;
	name: string;
	url: string;
	desc: string;
}

export class Trello implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Trello',
		name: 'trello',
		icon: 'file:trello.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create, change and delete boards and cards',
		defaults: {
			name: 'Trello',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'trelloApi',
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
						name: 'Attachment',
						value: 'attachment',
					},
					{
						name: 'Board',
						value: 'board',
					},
					{
						name: 'Board Member',
						value: 'boardMember',
					},
					{
						name: 'Card',
						value: 'card',
					},
					{
						name: 'Card Comment',
						value: 'cardComment',
					},
					{
						name: 'Checklist',
						value: 'checklist',
					},
					{
						name: 'Label',
						value: 'label',
					},
					{
						name: 'List',
						value: 'list',
					},
				],
				default: 'card',
			},

			// ----------------------------------
			//         operations
			// ----------------------------------
			...attachmentOperations,
			...boardOperations,
			...boardMemberOperations,
			...cardOperations,
			...cardCommentOperations,
			...checklistOperations,
			...labelOperations,
			...listOperations,

			// ----------------------------------
			//         fields
			// ----------------------------------
			...attachmentFields,
			...boardFields,
			...boardMemberFields,
			...cardFields,
			...cardCommentFields,
			...checklistFields,
			...labelFields,
			...listFields,
		],
	};

	methods = {
		listSearch: {
			async searchBoards(
				this: ILoadOptionsFunctions,
				query?: string,
			): Promise<INodeListSearchResult> {
				if (!query) {
					throw new NodeOperationError(this.getNode(), 'Query required for Trello search');
				}
				const searchResults = await apiRequest.call(
					this,
					'GET',
					'search',
					{},
					{
						query,
						modelTypes: 'boards',
						board_fields: 'name,url,desc',
						// Enables partial word searching, only for the start of words though
						partial: true,
						// Seems like a good number since it isn't paginated. Default is 10.
						boards_limit: 50,
					},
				);
				return {
					results: searchResults.boards.map((b: TrelloBoardType) => ({
						name: b.name,
						value: b.id,
						url: b.url,
						description: b.desc,
					})),
				};
			},
			async searchCards(
				this: ILoadOptionsFunctions,
				query?: string,
			): Promise<INodeListSearchResult> {
				if (!query) {
					throw new NodeOperationError(this.getNode(), 'Query required for Trello search');
				}
				const searchResults = await apiRequest.call(
					this,
					'GET',
					'search',
					{},
					{
						query,
						modelTypes: 'cards',
						board_fields: 'name,url,desc',
						// Enables partial word searching, only for the start of words though
						partial: true,
						// Seems like a good number since it isn't paginated. Default is 10.
						cards_limit: 50,
					},
				);
				return {
					results: searchResults.cards.map((b: TrelloBoardType) => ({
						name: b.name,
						value: b.id,
						url: b.url,
						description: b.desc,
					})),
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const operation = this.getNodeParameter('operation', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;
		let returnAll = false;
		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				requestMethod = 'GET';
				endpoint = '';
				body = {};
				qs = {};

				if (resource === 'board') {
					if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';
						endpoint = 'boards';

						qs.name = this.getNodeParameter('name', i) as string;
						qs.desc = this.getNodeParameter('description', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const id = this.getNodeParameter('id', i, undefined, {
							extractValue: true,
						}) as string;

						endpoint = `boards/${id}`;
					} else if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';

						const id = this.getNodeParameter('id', i, undefined, { extractValue: true });

						endpoint = `boards/${id}`;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						requestMethod = 'PUT';

						const id = this.getNodeParameter('id', i, undefined, { extractValue: true });

						endpoint = `boards/${id}`;

						const updateFields = this.getNodeParameter('updateFields', i);
						Object.assign(qs, updateFields);
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'boardMember') {
					if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------

						requestMethod = 'GET';

						const id = this.getNodeParameter('id', i) as string;
						returnAll = this.getNodeParameter('returnAll', i);
						if (returnAll === false) {
							qs.limit = this.getNodeParameter('limit', i);
						}

						endpoint = `boards/${id}/members`;
					} else if (operation === 'add') {
						// ----------------------------------
						//               add
						// ----------------------------------

						requestMethod = 'PUT';

						const id = this.getNodeParameter('id', i) as string;
						const idMember = this.getNodeParameter('idMember', i) as string;

						endpoint = `boards/${id}/members/${idMember}`;

						qs.type = this.getNodeParameter('type', i) as string;
						qs.allowBillableGuest = this.getNodeParameter(
							'additionalFields.allowBillableGuest',
							i,
							false,
						) as boolean;
					} else if (operation === 'invite') {
						// ----------------------------------
						//              invite
						// ----------------------------------

						requestMethod = 'PUT';

						const id = this.getNodeParameter('id', i) as string;

						endpoint = `boards/${id}/members`;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						qs.email = this.getNodeParameter('email', i) as string;
						qs.type = additionalFields.type as string;
						body.fullName = additionalFields.fullName as string;
					} else if (operation === 'remove') {
						// ----------------------------------
						//              remove
						// ----------------------------------

						requestMethod = 'DELETE';

						const id = this.getNodeParameter('id', i) as string;
						const idMember = this.getNodeParameter('idMember', i) as string;

						endpoint = `boards/${id}/members/${idMember}`;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'card') {
					if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';
						endpoint = 'cards';

						qs.idList = this.getNodeParameter('listId', i) as string;

						qs.name = this.getNodeParameter('name', i) as string;
						qs.desc = this.getNodeParameter('description', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const id = this.getNodeParameter('id', i, undefined, { extractValue: true });

						endpoint = `cards/${id}`;
					} else if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';

						const id = this.getNodeParameter('id', i, undefined, { extractValue: true });

						endpoint = `cards/${id}`;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						requestMethod = 'PUT';

						const id = this.getNodeParameter('id', i, undefined, { extractValue: true });

						endpoint = `cards/${id}`;

						const updateFields = this.getNodeParameter('updateFields', i);
						Object.assign(qs, updateFields);
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'cardComment') {
					if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						qs.text = this.getNodeParameter('text', i) as string;

						requestMethod = 'POST';

						endpoint = `cards/${cardId}/actions/comments`;
					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						const commentId = this.getNodeParameter('commentId', i) as string;

						endpoint = `/cards/${cardId}/actions/${commentId}/comments`;
					} else if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						requestMethod = 'PUT';

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						const commentId = this.getNodeParameter('commentId', i) as string;

						qs.text = this.getNodeParameter('text', i) as string;

						endpoint = `cards/${cardId}/actions/${commentId}/comments`;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'list') {
					if (operation === 'archive') {
						// ----------------------------------
						//         archive
						// ----------------------------------

						requestMethod = 'PUT';

						const id = this.getNodeParameter('id', i) as string;
						qs.value = this.getNodeParameter('archive', i) as boolean;

						endpoint = `lists/${id}/closed`;
					} else if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';
						endpoint = 'lists';

						qs.idBoard = this.getNodeParameter('idBoard', i) as string;

						qs.name = this.getNodeParameter('name', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';

						const id = this.getNodeParameter('id', i) as string;

						endpoint = `lists/${id}`;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------

						requestMethod = 'GET';

						returnAll = this.getNodeParameter('returnAll', i);

						if (returnAll === false) {
							qs.limit = this.getNodeParameter('limit', i);
						}

						const id = this.getNodeParameter('id', i) as string;

						endpoint = `boards/${id}/lists`;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else if (operation === 'getCards') {
						// ----------------------------------
						//         getCards
						// ----------------------------------

						requestMethod = 'GET';

						returnAll = this.getNodeParameter('returnAll', i);

						if (returnAll === false) {
							qs.limit = this.getNodeParameter('limit', i);
						}

						const id = this.getNodeParameter('id', i) as string;

						endpoint = `lists/${id}/cards`;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						requestMethod = 'PUT';

						const id = this.getNodeParameter('id', i) as string;

						endpoint = `lists/${id}`;

						const updateFields = this.getNodeParameter('updateFields', i);
						Object.assign(qs, updateFields);
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'attachment') {
					if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						const url = this.getNodeParameter('url', i) as string;

						Object.assign(qs, {
							url,
						});

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);

						endpoint = `cards/${cardId}/attachments`;
					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						const id = this.getNodeParameter('id', i) as string;

						endpoint = `cards/${cardId}/attachments/${id}`;
					} else if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						const id = this.getNodeParameter('id', i) as string;

						endpoint = `cards/${cardId}/attachments/${id}`;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------

						requestMethod = 'GET';

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						endpoint = `cards/${cardId}/attachments`;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'checklist') {
					if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						const name = this.getNodeParameter('name', i) as string;

						Object.assign(qs, { name });

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);

						endpoint = `cards/${cardId}/checklists`;
					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						const id = this.getNodeParameter('id', i) as string;

						endpoint = `cards/${cardId}/checklists/${id}`;
					} else if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';

						const id = this.getNodeParameter('id', i) as string;

						endpoint = `checklists/${id}`;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------

						requestMethod = 'GET';

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						endpoint = `cards/${cardId}/checklists`;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else if (operation === 'getCheckItem') {
						// ----------------------------------
						//         getCheckItem
						// ----------------------------------

						requestMethod = 'GET';

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						const checkItemId = this.getNodeParameter('checkItemId', i) as string;

						endpoint = `cards/${cardId}/checkItem/${checkItemId}`;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else if (operation === 'createCheckItem') {
						// ----------------------------------
						//         createCheckItem
						// ----------------------------------

						requestMethod = 'POST';

						const checklistId = this.getNodeParameter('checklistId', i) as string;

						endpoint = `checklists/${checklistId}/checkItems`;

						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, { name, ...additionalFields });
					} else if (operation === 'deleteCheckItem') {
						// ----------------------------------
						//         deleteCheckItem
						// ----------------------------------

						requestMethod = 'DELETE';

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						const checkItemId = this.getNodeParameter('checkItemId', i) as string;

						endpoint = `cards/${cardId}/checkItem/${checkItemId}`;
					} else if (operation === 'updateCheckItem') {
						// ----------------------------------
						//         updateCheckItem
						// ----------------------------------

						requestMethod = 'PUT';

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						const checkItemId = this.getNodeParameter('checkItemId', i) as string;

						endpoint = `cards/${cardId}/checkItem/${checkItemId}`;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else if (operation === 'completedCheckItems') {
						// ----------------------------------
						//         completedCheckItems
						// ----------------------------------

						requestMethod = 'GET';

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						endpoint = `cards/${cardId}/checkItemStates`;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'label') {
					if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';

						const idBoard = this.getNodeParameter('boardId', i, undefined, {
							extractValue: true,
						}) as string;

						const name = this.getNodeParameter('name', i) as string;
						const color = this.getNodeParameter('color', i) as string;

						Object.assign(qs, {
							idBoard,
							name,
							color,
						});

						endpoint = 'labels';
					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const id = this.getNodeParameter('id', i) as string;

						endpoint = `labels/${id}`;
					} else if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';

						const id = this.getNodeParameter('id', i) as string;

						endpoint = `labels/${id}`;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------

						requestMethod = 'GET';

						const idBoard = this.getNodeParameter('boardId', i, undefined, {
							extractValue: true,
						}) as string;

						endpoint = `board/${idBoard}/labels`;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						Object.assign(qs, additionalFields);
					} else if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						requestMethod = 'PUT';

						const id = this.getNodeParameter('id', i) as string;

						endpoint = `labels/${id}`;

						const updateFields = this.getNodeParameter('updateFields', i);
						Object.assign(qs, updateFields);
					} else if (operation === 'addLabel') {
						// ----------------------------------
						//         addLabel
						// ----------------------------------

						requestMethod = 'POST';

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						const id = this.getNodeParameter('id', i) as string;

						qs.value = id;

						endpoint = `/cards/${cardId}/idLabels`;
					} else if (operation === 'removeLabel') {
						// ----------------------------------
						//         removeLabel
						// ----------------------------------

						requestMethod = 'DELETE';

						const cardId = this.getNodeParameter('cardId', i, undefined, {
							extractValue: true,
						}) as string;

						const id = this.getNodeParameter('id', i) as string;

						endpoint = `/cards/${cardId}/idLabels/${id}`;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, {
						itemIndex: i,
					});
				}

				// resources listed here do not support pagination so
				// paginate them 'manually'
				const skipPagination = ['list:getAll'];

				if (returnAll === true && !skipPagination.includes(`${resource}:${operation}`)) {
					responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
				} else {
					responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
					if (returnAll === false && qs.limit) {
						responseData = responseData.splice(0, qs.limit);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
