import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

import {
	apiRequest,
} from './GenericFunctions';

import {
	attachmentOperations,
	attachmentFields,
} from './AttachmentDescription';

import {
	boardOperations,
	boardFields,
} from './BoardDescription';

import {
	cardOperations,
	cardFields,
} from './CardDescription';

import {
	cardCommentOperations,
	cardCommentFields,
} from './CardCommentDescription';

import {
	checklistOperations,
	checklistFields,
} from './ChecklistDescription';

import {
	labelOperations,
	labelFields,
} from './LabelDescription';

import {
	listOperations,
	listFields,
} from './ListDescription';

export class Trello implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Trello',
		name: 'trello',
		icon: 'file:trello.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create, change and delete boards and cards',
		defaults: {
			name: 'Trello',
			color: '#026aa7',
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
				options: [
					{
						name: 'Attachment',
						value: 'attachment'
					},
					{
						name: 'Board',
						value: 'board',
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
						value: 'label'
					},
					{
						name: 'List',
						value: 'list',
					},
				],
				default: 'card',
				description: 'The resource to operate on.',
			},

			// ----------------------------------
			//         operations
			// ----------------------------------
			...attachmentOperations,
			...boardOperations,
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
			...cardFields,
			...cardCommentFields,
			...checklistFields,
			...labelFields,
			...listFields

		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const operation = this.getNodeParameter('operation', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;

		for (let i = 0; i < items.length; i++) {
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

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const id = this.getNodeParameter('id', i) as string;

					endpoint = `boards/${id}`;

				} else if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';

					const id = this.getNodeParameter('id', i) as string;

					endpoint = `boards/${id}`;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

				} else if (operation === 'update') {
					// ----------------------------------
					//         update
					// ----------------------------------

					requestMethod = 'PUT';

					const id = this.getNodeParameter('id', i) as string;

					endpoint = `boards/${id}`;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					Object.assign(qs, updateFields);

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
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

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const id = this.getNodeParameter('id', i) as string;

					endpoint = `cards/${id}`;

				} else if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';

					const id = this.getNodeParameter('id', i) as string;

					endpoint = `cards/${id}`;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

				} else if (operation === 'update') {
					// ----------------------------------
					//         update
					// ----------------------------------

					requestMethod = 'PUT';

					const id = this.getNodeParameter('id', i) as string;

					endpoint = `cards/${id}`;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					Object.assign(qs, updateFields);

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}

			} else if (resource === 'cardComment') {

				if (operation === 'add') {
					// ----------------------------------
					//         add
					// ----------------------------------

					const cardId = this.getNodeParameter('cardId', i) as string;

					qs.text = this.getNodeParameter('text', i) as string;

					requestMethod = 'POST';

					endpoint = `cards/${cardId}/actions/comments`;


				} else if (operation === 'remove') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const cardId = this.getNodeParameter('cardId', i) as string;

					const commentId = this.getNodeParameter('commentId', i) as string;

					endpoint = `/cards/${cardId}/actions/${commentId}/comments`;

				} else if (operation === 'update') {
					// ----------------------------------
					//         update
					// ----------------------------------

					requestMethod = 'PUT';

					const cardId = this.getNodeParameter('cardId', i) as string;

					const commentId = this.getNodeParameter('commentId', i) as string;

					qs.text = this.getNodeParameter('text', i) as string;

					endpoint = `cards/${cardId}/actions/${commentId}/comments`;

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
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

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

				} else if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';

					const id = this.getNodeParameter('id', i) as string;

					endpoint = `lists/${id}`;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

				} else if (operation === 'update') {
					// ----------------------------------
					//         update
					// ----------------------------------

					requestMethod = 'PUT';

					const id = this.getNodeParameter('id', i) as string;

					endpoint = `lists/${id}`;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					Object.assign(qs, updateFields);

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}

			} else if (resource === 'attachment') {

				if (operation === 'create') {
					// ----------------------------------
					//         create
					// ----------------------------------

					requestMethod = 'POST';

					const cardId = this.getNodeParameter('cardId', i) as string;
					const url = this.getNodeParameter('url', i) as string;

					Object.assign(qs, {
						url,
					});

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

					endpoint = `cards/${cardId}/attachments`;

				} else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const cardId = this.getNodeParameter('cardId', i) as string;
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `cards/${cardId}/attachments/${id}`;

				} else if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';

					const cardId = this.getNodeParameter('cardId', i) as string;
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `cards/${cardId}/attachments/${id}`;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					requestMethod = 'GET';

					const cardId = this.getNodeParameter('cardId', i) as string;

					endpoint = `cards/${cardId}/attachments`;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);
				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}

			} else if (resource === 'checklist') {

				if (operation === 'create') {
					// ----------------------------------
					//         create
					// ----------------------------------

					requestMethod = 'POST';

					const cardId = this.getNodeParameter('cardId', i) as string;
					const name = this.getNodeParameter('name', i) as string;

					Object.assign(qs, { name });

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

					endpoint = `cards/${cardId}/checklists`;

				} else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const cardId = this.getNodeParameter('cardId', i) as string;
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `cards/${cardId}/checklists/${id}`;

				} else if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';

					const id = this.getNodeParameter('id', i) as string;

					endpoint = `checklists/${id}`;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					requestMethod = 'GET';

					const cardId = this.getNodeParameter('cardId', i) as string;

					endpoint = `cards/${cardId}/checklists`;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

				} else if (operation === 'getCheckItem') {
					// ----------------------------------
					//         getCheckItem
					// ----------------------------------

					requestMethod = 'GET';

					const cardId = this.getNodeParameter('cardId', i) as string;
					const checkItemId = this.getNodeParameter('checkItemId', i) as string;

					endpoint = `cards/${cardId}/checkItem/${checkItemId}`;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

				} else if (operation === 'deleteCheckItem') {
					// ----------------------------------
					//         deleteCheckItem
					// ----------------------------------

					requestMethod = 'DELETE';

					const cardId = this.getNodeParameter('cardId', i) as string;
					const checkItemId = this.getNodeParameter('checkItemId', i) as string;

					endpoint = `cards/${cardId}/checkItem/${checkItemId}`;

				} else if (operation === 'updateCheckItem') {
					// ----------------------------------
					//         updateCheckItem
					// ----------------------------------

					requestMethod = 'PUT';

					const cardId = this.getNodeParameter('cardId', i) as string;
					const checkItemId = this.getNodeParameter('checkItemId', i) as string;

					endpoint = `cards/${cardId}/checkItem/${checkItemId}`;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

				} else if (operation ==='completedCheckItems') {
					// ----------------------------------
					//         completedCheckItems
					// ----------------------------------

					requestMethod = 'GET';

					const cardId = this.getNodeParameter('cardId', i) as string;

					endpoint = `cards/${cardId}/checkItemStates`;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			} else if (resource === 'label') {

				if (operation === 'create') {
					// ----------------------------------
					//         create
					// ----------------------------------

					requestMethod = 'POST';

					const idBoard = this.getNodeParameter('boardId', i) as string;
					const name = this.getNodeParameter('name', i) as string;
					const color = this.getNodeParameter('color', i) as string;

					Object.assign(qs, {
						idBoard,
						name,
						color
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

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					requestMethod = 'GET';

					const idBoard = this.getNodeParameter('boardId', i) as string;

					endpoint = `board/${idBoard}/labels`;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					Object.assign(qs, additionalFields);
				} else if (operation === 'update') {
					// ----------------------------------
					//         update
					// ----------------------------------

					requestMethod = 'PUT';

					const id = this.getNodeParameter('id', i) as string;

					endpoint = `labels/${id}`;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					Object.assign(qs, updateFields);

				} else if (operation === 'addLabel') {
					// ----------------------------------
					//         addLabel
					// ----------------------------------

					requestMethod = 'POST';

					const cardId = this.getNodeParameter('cardId', i) as string;
					const id = this.getNodeParameter('id', i) as string;

					qs.value = id;

					endpoint = `/cards/${cardId}/idLabels`;

				} else if (operation === 'removeLabel') {
					// ----------------------------------
					//         removeLabel
					// ----------------------------------

					requestMethod = 'DELETE';

					const cardId = this.getNodeParameter('cardId', i) as string;
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `/cards/${cardId}/idLabels/${id}`;

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
