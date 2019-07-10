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
	pipedriveApiRequest,
	pipedriveApiRequestAllItems,
} from './GenericFunctions';


export class Pipedrive implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Pipedrive',
		name: 'pipedrive',
		icon: 'file:pipedrive.png',
		group: ['transform'],
		version: 1,
		description: 'Create and edit data in Pipedrive',
		defaults: {
			name: 'Pipedrive',
			color: '#227722',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'pipedriveApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Create Activity',
						value: 'createActivity',
						description: 'Creates an activity',
					},
					{
						name: 'Create Deal',
						value: 'createDeal',
						description: 'Creates a deal',
					},
					{
						name: 'Create Person',
						value: 'createPerson',
						description: 'Creates a person',
					},
					{
						name: 'Delete Activity',
						value: 'deleteActivity',
						description: 'Delete an activity',
					},
					{
						name: 'Delete Deal',
						value: 'deleteDeal',
						description: 'Delete a deal',
					},
					{
						name: 'Delete Person',
						value: 'deletePerson',
						description: 'Delete a person',
					},
					{
						name: 'Get Activity',
						value: 'getActivity',
						description: 'Get data of an activity',
					},
					{
						name: 'Get Deal',
						value: 'getDeal',
						description: 'Get data of a deal',
					},
					{
						name: 'Get Organization',
						value: 'getOrganization',
						description: 'Get data of an organization',
					},
					{
						name: 'Get Person',
						value: 'getPerson',
						description: 'Get data of a person',
					},
					{
						name: 'Get All Organizations',
						value: 'getAllOrganizations',
						description: 'Get data of all organizations',
					},
					{
						name: 'Get All Persons',
						value: 'getAllPersons',
						description: 'Get data of all persons',
					},
					{
						name: 'Get All Products',
						value: 'getAllProducts',
						description: 'Get data of all products',
					},
					{
						name: 'Update Activity',
						value: 'updateActivity',
						description: 'Update an activity',
					},
					{
						name: 'Update Deal',
						value: 'updateDeal',
						description: 'Update a deal',
					},
					{
						name: 'Update Person',
						value: 'updatePerson',
						description: 'Update a person',
					},
				],
				default: 'createDeal',
				description: 'The operation to perform.',
			},


			// ----------------------------------
			//         createActivity
			// ----------------------------------
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'createActivity',
						],
					},
				},
				description: 'The subject of the activity to create',
			},
			{
				displayName: 'Done',
				name: 'done',
				type: 'options',
				displayOptions: {
					show: {
						operation: [
							'createActivity',
						],
					},
				},
				options: [
					{
						name: 'Not done',
						value: '0',
					},
					{
						name: 'Done',
						value: '1',
					},
				],
				default: '0',
				description: 'Whether the activity is done or not.',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'createActivity',
						],
					},
				},
				placeholder: 'call',
				description: 'Type of the activity like "call", "meeting", ...',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'createActivity',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Deal ID',
						name: 'deal_id',
						type: 'number',
						default: 0,
						description: 'ID of the deal this activity will be associated with',
					},
					{
						displayName: 'Note',
						name: 'note',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
							rows: 5,
						},
						default: '',
						description: 'Note of the activity (HTML format)',
					},
					{
						displayName: 'Organization ID',
						name: 'org_id',
						type: 'number',
						default: 0,
						description: 'ID of the organization this activity will be associated with',
					},
					{
						displayName: 'Person ID',
						name: 'person_id',
						type: 'number',
						default: 0,
						description: 'ID of the person this activity will be associated with',
					},
					{
						displayName: 'User ID',
						name: 'user_id',
						type: 'number',
						default: 0,
						description: 'ID of the user whom the activity will be assigned to. If omitted, the activity will be assigned to the authorized user.',
					},
				],
			},


			// ----------------------------------
			//         createDeal
			// ----------------------------------
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'createDeal',
						],
					},
				},
				description: 'The title of the deal to create',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'createDeal',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Currency',
						name: 'currency',
						type: 'string',
						default: 'USD',
						description: 'Currency of the deal. Accepts a 3-character currency code. Like EUR, USD, ...',
					},
					{
						displayName: 'Lost Reason',
						name: 'lost_reason',
						type: 'string',
						default: '',
						description: 'Reason why the deal was lost.',
					},
					{
						displayName: 'Organization ID',
						name: 'org_id',
						type: 'number',
						default: 0,
						description: 'ID of the organization this deal will be associated with.',
					},
					{
						displayName: 'Person ID',
						name: 'person_id',
						type: 'number',
						default: 0,
						description: 'ID of the person this deal will be associated with.',
					},
					{
						displayName: 'Probability',
						name: 'probability',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 100,
						},
						default: 0,
						description: 'Deal success probability percentage.',
					},
					{
						displayName: 'Stage ID',
						name: 'stage_id',
						type: 'number',
						default: 0,
						description: 'ID of the stage this deal will be placed in a pipeline. If omitted, the deal will be placed in the first stage of the default pipeline.',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Open',
								value: 'open',
							},
							{
								name: 'Won',
								value: 'won',
							},
							{
								name: 'Lost',
								value: 'lost',
							},
							{
								name: 'Deleted',
								value: 'deleted',
							},
						],
						default: 'open',
						description: 'The status of the deal. If not provided it will automatically be set to "open".',
					},
					{
						displayName: 'User ID',
						name: 'user_id',
						type: 'number',
						default: 0,
						description: 'ID of the user who will be marked as the owner of this deal. If omitted, the authorized user ID will be used.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'number',
						default: 0,
						description: 'Value of the deal. If not set it will automatically be set to 0.',
					},
					{
						displayName: 'Visible to',
						name: 'visible_to',
						type: 'options',
						options: [
							{
								name: 'Owner & followers (private)',
								value: '1',
							},
							{
								name: 'Entire company (shared)',
								value: '3',
							},
						],
						default: '3',
						description: 'Visibility of the deal. If omitted, visibility will be set to the default visibility setting of this item type for the authorized user.',
					},
				],
			},


			// ----------------------------------
			//         createPerson
			// ----------------------------------
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'createPerson',
						],
					},
				},
				description: 'The name of the person to create',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'createPerson',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						typeOptions: {
							multipleValues: true,
						},
						default: '',
						description: 'Email of the person.',
					},
					{
						displayName: 'Organization ID',
						name: 'org_id',
						type: 'number',
						default: 0,
						description: 'ID of the organization this person will belong to.',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						typeOptions: {
							multipleValues: true,
						},
						default: '',
						description: 'Phone number of the person.',
					},
					{
						displayName: 'Visible to',
						name: 'visible_to',
						type: 'options',
						options: [
							{
								name: 'Owner & followers (private)',
								value: '1',
							},
							{
								name: 'Entire company (shared)',
								value: '3',
							},
						],
						default: '3',
						description: 'Visibility of the deal. If omitted, visibility will be set to the default visibility setting of this item type for the authorized user.',
					},
				],
			},

			// ----------------------------------
			//         deleteActivity
			// ----------------------------------
			{
				displayName: 'Activity ID',
				name: 'activityId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'deleteActivity',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the activity to delete.',
			},

			// ----------------------------------
			//         deleteDeal
			// ----------------------------------
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'deleteDeal',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the deal to delete.',
			},

			// ----------------------------------
			//         deletePerson
			// ----------------------------------
			{
				displayName: 'Person ID',
				name: 'personId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'deletePerson',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the person to delete.',
			},


			// ----------------------------------
			//         getAllOrganizations
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'getAllOrganizations',
						],
					},
				},
				default: false,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'getAllOrganizations',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				default: 100,
				description: 'How many results to return.',
			},


			// ----------------------------------
			//         getAllPersons
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'getAllPersons',
						],
					},
				},
				default: false,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'getAllPersons',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				default: 100,
				description: 'How many results to return.',
			},


			// ----------------------------------
			//         getAllProducts
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'getAllProducts',
						],
					},
				},
				default: false,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'getAllProducts',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				default: 100,
				description: 'How many results to return.',
			},


			// ----------------------------------
			//         getActivity
			// ----------------------------------
			{
				displayName: 'Activity ID',
				name: 'activityId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'getActivity'
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the activity to get.',
			},


			// ----------------------------------
			//         getDeal
			// ----------------------------------
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'getDeal'
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the deal to get.',
			},


			// ----------------------------------
			//         getOrganization
			// ----------------------------------
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'getOrganization'
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the organization to get.',
			},


			// ----------------------------------
			//         getPerson
			// ----------------------------------
			{
				displayName: 'Person ID',
				name: 'personId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'getPerson'
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the person to get.',
			},


			// ----------------------------------
			//         updateActivity
			// ----------------------------------
			{
				displayName: 'Activity ID',
				name: 'activityId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'updateActivity'
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the activity to update.',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'updateActivity'
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Deal ID',
						name: 'deal_id',
						type: 'number',
						default: 0,
						description: 'ID of the deal this activity will be associated with',
					},
					{
						displayName: 'Done',
						name: 'done',
						type: 'options',
						options: [
							{
								name: 'Not done',
								value: '0',
							},
							{
								name: 'Done',
								value: '1',
							},
						],
						default: '0',
						description: 'Whether the activity is done or not.',
					},

					{
						displayName: 'Note',
						name: 'note',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
							rows: 5,
						},
						default: '',
						description: 'Note of the activity (HTML format)',
					},
					{
						displayName: 'Organization ID',
						name: 'org_id',
						type: 'number',
						default: 0,
						description: 'ID of the organization this activity will be associated with',
					},
					{
						displayName: 'Person ID',
						name: 'person_id',
						type: 'number',
						default: 0,
						description: 'ID of the person this activity will be associated with',
					},
					{
						displayName: 'Subject',
						name: 'subject',
						type: 'string',
						default: '',
						description: 'The subject of the activity',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'string',
						default: '',
						placeholder: 'call',
						description: 'Type of the activity like "call", "meeting", ...',
					},
					{
						displayName: 'User ID',
						name: 'user_id',
						type: 'number',
						default: 0,
						description: 'ID of the user whom the activity will be assigned to. If omitted, the activity will be assigned to the authorized user.',
					},
				],
			},

			// ----------------------------------
			//         updateDeal
			// ----------------------------------
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'updateDeal'
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the deal to update.',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'updateDeal'
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Currency',
						name: 'currency',
						type: 'string',
						default: 'USD',
						description: 'Currency of the deal. Accepts a 3-character currency code. Like EUR, USD, ...',
					},
					{
						displayName: 'Lost Reason',
						name: 'lost_reason',
						type: 'string',
						default: '',
						description: 'Reason why the deal was lost.',
					},
					{
						displayName: 'Organization ID',
						name: 'org_id',
						type: 'number',
						default: 0,
						description: 'ID of the organization this deal will be associated with.',
					},
					{
						displayName: 'Person ID',
						name: 'person_id',
						type: 'number',
						default: 0,
						description: 'ID of the person this deal will be associated with.',
					},
					{
						displayName: 'Probability',
						name: 'probability',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 100,
						},
						default: 0,
						description: 'Deal success probability percentage.',
					},
					{
						displayName: 'Stage ID',
						name: 'stage_id',
						type: 'number',
						default: 0,
						description: 'ID of the stage this deal will be placed in a pipeline. If omitted, the deal will be placed in the first stage of the default pipeline.',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Open',
								value: 'open',
							},
							{
								name: 'Won',
								value: 'won',
							},
							{
								name: 'Lost',
								value: 'lost',
							},
							{
								name: 'Deleted',
								value: 'deleted',
							},
						],
						default: 'open',
						description: 'The status of the deal. If not provided it will automatically be set to "open".',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'The title of the deal',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'number',
						default: 0,
						description: 'Value of the deal. If not set it will automatically be set to 0.',
					},
					{
						displayName: 'Visible to',
						name: 'visible_to',
						type: 'options',
						options: [
							{
								name: 'Owner & followers (private)',
								value: '1',
							},
							{
								name: 'Entire company (shared)',
								value: '3',
							},
						],
						default: '3',
						description: 'Visibility of the deal. If omitted, visibility will be set to the default visibility setting of this item type for the authorized user.',
					},
				],
			},


			// ----------------------------------
			//         updatePerson
			// ----------------------------------
			{
				displayName: 'Person ID',
				name: 'personId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'updatePerson'
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the person to update.',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				description: 'The fields to update.',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'updatePerson'
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						typeOptions: {
							multipleValues: true,
						},
						default: '',
						description: 'Email of the person.',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'The name of the person',
					},
					{
						displayName: 'Organization ID',
						name: 'org_id',
						type: 'number',
						default: 0,
						description: 'ID of the organization this person will belong to.',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						typeOptions: {
							multipleValues: true,
						},
						default: '',
						description: 'Phone number of the person.',
					},
					{
						displayName: 'Visible to',
						name: 'visible_to',
						type: 'options',
						options: [
							{
								name: 'Owner & followers (private)',
								value: '1',
							},
							{
								name: 'Entire company (shared)',
								value: '3',
							},
						],
						default: '3',
						description: 'Visibility of the deal. If omitted, visibility will be set to the default visibility setting of this item type for the authorized user.',
					},
				],
			},

		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const operation = this.getNodeParameter('operation', 0) as string;

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;
		let returnAll = false;

		for (let i = 0; i < items.length; i++) {
			requestMethod = 'GET';
			endpoint = '';
			body = {};
			qs = {};

			if (operation === 'createActivity') {
				// ----------------------------------
				//         createActivity
				// ----------------------------------

				requestMethod = 'POST';
				endpoint = '/activities';

				body.subject = this.getNodeParameter('subject', i) as string;
				body.done = this.getNodeParameter('done', i) as string;
				body.type = this.getNodeParameter('type', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
				Object.assign(body, additionalFields);

			} else if (operation === 'createDeal') {
				// ----------------------------------
				//         createTask
				// ----------------------------------

				requestMethod = 'POST';
				endpoint = '/deals';

				body.title = this.getNodeParameter('title', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
				Object.assign(body, additionalFields);

			} else if (operation === 'createPerson') {
				// ----------------------------------
				//         createPerson
				// ----------------------------------

				requestMethod = 'POST';
				endpoint = '/persons';

				body.name = this.getNodeParameter('name', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
				Object.assign(body, additionalFields);

			} else if (operation === 'deleteActivity') {
				// ----------------------------------
				//         deleteActivity
				// ----------------------------------

				requestMethod = 'DELETE';

				const activityId = this.getNodeParameter('activityId', i) as number;
				endpoint = `/activities/${activityId}`;

			} else if (operation === 'deleteDeal') {
				// ----------------------------------
				//         deleteDeal
				// ----------------------------------

				requestMethod = 'DELETE';

				const dealId = this.getNodeParameter('dealId', i) as number;
				endpoint = `/deals/${dealId}`;

			} else if (operation === 'deletePerson') {
				// ----------------------------------
				//         deletePerson
				// ----------------------------------

				requestMethod = 'DELETE';

				const personId = this.getNodeParameter('personId', i) as number;
				endpoint = `/persons/${personId}`;

			} else if (operation === 'getAllOrganizations') {
				// ----------------------------------
				//         getAllOrganizations
				// ----------------------------------

				requestMethod = 'GET';

				returnAll = this.getNodeParameter('returnAll', i) as boolean;
				if (returnAll === false) {
					qs.limit = this.getNodeParameter('limit', i) as number;
				}

				endpoint = `/organizations`;

			} else if (operation === 'getAllPersons') {
				// ----------------------------------
				//         getAllPersons
				// ----------------------------------

				requestMethod = 'GET';

				returnAll = this.getNodeParameter('returnAll', i) as boolean;
				if (returnAll === false) {
					qs.limit = this.getNodeParameter('limit', i) as number;
				}

				endpoint = `/persons`;

			} else if (operation === 'getAllProducts') {
				// ----------------------------------
				//         getAllProducts
				// ----------------------------------

				requestMethod = 'GET';

				returnAll = this.getNodeParameter('returnAll', i) as boolean;
				if (returnAll === false) {
					qs.limit = this.getNodeParameter('limit', i) as number;
				}

				endpoint = `/products`;

			} else if (operation === 'getActivity') {
				// ----------------------------------
				//         getActivity
				// ----------------------------------

				requestMethod = 'GET';

				const activityId = this.getNodeParameter('activityId', i) as number;
				endpoint = `/activities/${activityId}`;

			} else if (operation === 'getDeal') {
				// ----------------------------------
				//         getDeal
				// ----------------------------------

				requestMethod = 'GET';

				const dealId = this.getNodeParameter('dealId', i) as number;
				endpoint = `/deals/${dealId}`;

			} else if (operation === 'getOrganization') {
				// ----------------------------------
				//         getOrganization
				// ----------------------------------

				requestMethod = 'GET';

				const organizationId = this.getNodeParameter('organizationId', i) as number;
				endpoint = `/organizations/${organizationId}`;

			} else if (operation === 'getPerson') {
				// ----------------------------------
				//         getPerson
				// ----------------------------------

				requestMethod = 'GET';

				const personId = this.getNodeParameter('personId', i) as number;
				endpoint = `/persons/${personId}`;

			} else if (operation === 'updateActivity') {
				// ----------------------------------
				//         updateActivity
				// ----------------------------------

				requestMethod = 'PUT';

				const activityId = this.getNodeParameter('activityId', i) as number;
				endpoint = `/activities/${activityId}`;

				const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
				Object.assign(body, updateFields);

			} else if (operation === 'updateDeal') {
				// ----------------------------------
				//         updateDeal
				// ----------------------------------

				requestMethod = 'PUT';

				const dealId = this.getNodeParameter('dealId', i) as number;
				endpoint = `/deals/${dealId}`;

				const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
				Object.assign(body, updateFields);

			} else if (operation === 'updatePerson') {
				// ----------------------------------
				//         updatePerson
				// ----------------------------------

				requestMethod = 'PUT';

				const personId = this.getNodeParameter('personId', i) as number;
				endpoint = `/persons/${personId}`;

				const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
				Object.assign(body, updateFields);

			} else {
				throw new Error(`The operation "${operation}" is not known!`);
			}

			let responseData;
			if (returnAll === true) {
				responseData = await pipedriveApiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
			} else {
				responseData = await pipedriveApiRequest.call(this, requestMethod, endpoint, body, qs);
			}

			if (Array.isArray(responseData.data)) {
				returnData.push.apply(returnData, responseData.data as IDataObject[]);
			} else {
				returnData.push(responseData.data as IDataObject);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
