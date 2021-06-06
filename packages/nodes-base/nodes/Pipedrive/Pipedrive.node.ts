import {
	BINARY_ENCODING,
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	ICustomProperties,
	pipedriveApiRequest,
	pipedriveApiRequestAllItems,
	pipedriveEncodeCustomProperties,
	pipedriveGetCustomProperties,
	pipedriveResolveCustomProperties,
} from './GenericFunctions';

interface CustomProperty {
	name: string;
	value: string;
}

/**
 * Add the additional fields to the body
 *
 * @param {IDataObject} body The body object to add fields to
 * @param {IDataObject} additionalFields The fields to add
 */
function addAdditionalFields(body: IDataObject, additionalFields: IDataObject) {
	for (const key of Object.keys(additionalFields)) {
		if (key === 'customProperties' && (additionalFields.customProperties as IDataObject).property !== undefined) {
			for (const customProperty of (additionalFields.customProperties as IDataObject)!.property! as CustomProperty[]) {
				body[customProperty.name] = customProperty.value;
			}
		} else {
			body[key] = additionalFields[key];
		}
	}
}

export class Pipedrive implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Pipedrive',
		name: 'pipedrive',
		icon: 'file:pipedrive.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
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
				displayOptions: {
					show: {
						authentication: [
							'apiToken',
						],
					},
				},
			},
			{
				name: 'pipedriveOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
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
						name: 'API Token',
						value: 'apiToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'apiToken',
				description: 'Method of authentication.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Activity',
						value: 'activity',
					},
					{
						name: 'Deal',
						value: 'deal',
					},
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Note',
						value: 'note',
					},
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Person',
						value: 'person',
					},
					{
						name: 'Product',
						value: 'product',
					},
				],
				default: 'deal',
				description: 'The resource to operate on.',
			},



			// ----------------------------------
			//         operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'activity',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an activity',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an activity',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of an activity',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get data of all activities',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an activity',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'deal',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a deal',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a deal',
					},
					{
						name: 'Duplicate',
						value: 'duplicate',
						description: 'Duplicate a deal',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of a deal',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get data of all deals',
					},
					{
						name: 'Search',
						value: 'search',
						description: 'Search a deal',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a deal',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'file',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a file',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a file',
					},
					{
						name: 'Download',
						value: 'download',
						description: 'Download a file',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of a file',
					},
					// {
					// 	name: 'Get All',
					// 	value: 'getAll',
					// 	description: 'Get data of all file',
					// },
					// {
					// 	name: 'Update',
					// 	value: 'update',
					// 	description: 'Update a file',
					// },
				],
				default: 'create',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'note',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a note',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a note',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of a note',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get data of all notes',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a note',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'organization',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an organization',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an organization',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of an organization',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get data of all organizations',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an organization',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'person',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a person',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a person',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of a person',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get data of all persons',
					},
					{
						name: 'Search',
						value: 'search',
						description: 'Search all persons',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a person',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'product',
						],
					},
				},
				options: [
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get data of all products',
					},
				],
				default: 'getAll',
				description: 'The operation to perform.',
			},



			// ----------------------------------
			//         Activity
			// ----------------------------------

			// ----------------------------------
			//         activity:create
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
							'create',
						],
						resource: [
							'activity',
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
							'create',
						],
						resource: [
							'activity',
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
							'create',
						],
						resource: [
							'activity',
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
							'create',
						],
						resource: [
							'activity',
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
						displayName: 'Due Date',
						name: 'due_date',
						type: 'dateTime',
						default: '',
						description: 'Due Date to activity be done YYYY-MM-DD',
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
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getOrganizationIds',
						},
						default: '',
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
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getUserIds',
						},
						default: '',
						description: 'ID of the active user whom the activity will be assigned to. If omitted, the activity will be assigned to the authorized user.',
					},
					{
						displayName: 'Custom Properties',
						name: 'customProperties',
						placeholder: 'Add Custom Property',
						description: 'Adds a custom property to set also values which have not been predefined.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Property Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the property to set.',
									},
									{
										displayName: 'Property Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the property to set.',
									},
								],
							},
						],
					},
				],
			},

			// ----------------------------------
			//         activity:delete
			// ----------------------------------
			{
				displayName: 'Activity ID',
				name: 'activityId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
						resource: [
							'activity',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the activity to delete.',
			},


			// ----------------------------------
			//         activity:get
			// ----------------------------------
			{
				displayName: 'Activity ID',
				name: 'activityId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'activity',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the activity to get.',
			},
			// ----------------------------------
			//         activity:update
			// ----------------------------------
			{
				displayName: 'Activity ID',
				name: 'activityId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'activity',
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
							'update',
						],
						resource: [
							'activity',
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
						displayName: 'Due Date',
						name: 'due_date',
						type: 'dateTime',
						default: '',
						description: 'Due Date to activity be done YYYY-MM-DD',
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
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getOrganizationIds',
						},
						default: '',
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
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getUserIds',
						},
						default: '',
						description: 'ID of the active user whom the activity will be assigned to. If omitted, the activity will be assigned to the authorized user.',
					},
					{
						displayName: 'Custom Properties',
						name: 'customProperties',
						placeholder: 'Add Custom Property',
						description: 'Adds a custom property to set also values which have not been predefined.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Property Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the property to set.',
									},
									{
										displayName: 'Property Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the property to set.',
									},
								],
							},
						],
					},
				],
			},



			// ----------------------------------
			//         deal
			// ----------------------------------

			// ----------------------------------
			//         deal:create
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
							'create',
						],
						resource: [
							'deal',
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
							'create',
						],
						resource: [
							'deal',
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
						displayName: 'Custom Properties',
						name: 'customProperties',
						placeholder: 'Add Custom Property',
						description: 'Adds a custom property to set also values which have not been predefined.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Property Name',
										name: 'name',
										type: 'options',
										typeOptions: {
											loadOptionsMethod: 'getDealCustomFields',
										},
										default: '',
										description: 'Name of the property to set.',
									},
									{
										displayName: 'Property Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the property to set.',
									},
								],
							},
						],
					},
					{
						displayName: 'Label',
						name: 'label',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getDealLabels',
						},
						default: '',
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
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getOrganizationIds',
						},
						default: '',
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
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getStageIds',
						},
						default: '',
						description: 'ID of the stage this deal will be placed in a pipeline. If omitted, the deal will be placed in the first stage of the default pipeline. (PIPELINE > STAGE)',
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
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getUserIds',
						},
						default: '',
						description: 'ID of the active user whom the activity will be assigned to. If omitted, the activity will be assigned to the authorized user.',
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
			//         deal:delete
			// ----------------------------------
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
						resource: [
							'deal',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the deal to delete.',
			},

			// ----------------------------------
			//         deal:duplicate
			// ----------------------------------
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'duplicate',
						],
						resource: [
							'deal',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the deal to duplicate.',
			},

			// ----------------------------------
			//         deal:get
			// ----------------------------------
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'deal',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the deal to get.',
			},

			// ----------------------------------
			//         deal:update
			// ----------------------------------
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'deal',
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
							'update',
						],
						resource: [
							'deal',
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
						displayName: 'Custom Properties',
						name: 'customProperties',
						placeholder: 'Add Custom Property',
						description: 'Adds a custom property to set also values which have not been predefined.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Property Name',
										name: 'name',
										type: 'options',
										typeOptions: {
											loadOptionsMethod: 'getDealCustomFields',
										},
										default: '',
										description: 'Name of the custom field to set.',
									},
									{
										displayName: 'Property Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the property to set.',
									},
								],
							},
						],
					},
					{
						displayName: 'User ID',
						name: 'user_id',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getUserIds',
						},
						default: '',
						description: 'ID of the active user whom the activity will be assigned to. If omitted, the activity will be assigned to the authorized user.',
					},
					{
						displayName: 'Label',
						name: 'label',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getDealLabels',
						},
						default: '',
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
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getOrganizationIds',
						},
						default: '',
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
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getStageIds',
						},
						default: '',
						description: 'ID of the stage this deal will be placed in a pipeline. If omitted, the deal will be placed in the first stage of the default pipeline. (PIPELINE > STAGE)',
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
			//         deal:search
			// ----------------------------------
			{
				displayName: 'Term',
				name: 'term',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'search',
						],
						resource: [
							'deal',
						],
					},
				},
				default: '',
				description: 'The search term to look for. Minimum 2 characters (or 1 if using exact_match).',
			},
			{
				displayName: 'Exact Match',
				name: 'exactMatch',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'search',
						],
						resource: [
							'deal',
						],
					},
				},
				default: false,
				description: 'When enabled, only full exact matches against the given term are returned. It is not case sensitive.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'search',
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
							'search',
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
			}, {
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'search',
						],
						resource: [
							'deal',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Include Fields',
						name: 'includeFields',
						type: 'string',
						default: '',
						description: 'Supports including optional fields in the results which are not provided by default. Example: deal.cc_email',
					},
					{
						displayName: 'Organization ID',
						name: 'organizationId',
						type: 'string',
						default: '',
						description: 'Will filter Deals by the provided Organization ID.',
					},
					{
						displayName: 'Person ID',
						name: 'personId',
						type: 'string',
						default: '',
						description: 'Will filter Deals by the provided Person ID.',
					},
					{
						displayName: 'Search Fields',
						name: 'fields',
						type: 'multiOptions',
						options: [
							{
								name: 'Custom Fields',
								value: 'custom_fields',
							},
							{
								name: 'Notes',
								value: 'notes',
							},
							{
								name: 'Title',
								value: 'title',
							},
						],
						default: [
							'custom_fields',
							'notes',
							'title',
						],
						description: 'A comma-separated string array. The fields to perform the search from. Defaults to all of them.',
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
						],
						default: 'open',
						description: 'The status of the deal. If not provided it will automatically be set to "open".',
					},
				],
			},


			// ----------------------------------
			//         file
			// ----------------------------------

			// ----------------------------------
			//         file:create
			// ----------------------------------
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'file',
						],
					},

				},
				placeholder: '',
				description: 'Name of the binary property which contains<br />the data for the file to be created.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'file',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Activity ID',
						name: 'activity_id',
						type: 'number',
						default: 0,
						description: 'ID of the activite this file will be associated with.',
					},
					{
						displayName: 'Deal ID',
						name: 'deal_id',
						type: 'number',
						default: 0,
						description: 'ID of the deal this file will be associated with',
					},
					{
						displayName: 'Organization ID',
						name: 'org_id',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getOrganizationIds',
						},
						default: '',
						description: 'ID of the organization this deal will be associated with.',
					},
					{
						displayName: 'Person ID',
						name: 'person_id',
						type: 'number',
						default: 0,
						description: 'ID of the person this file will be associated with.',
					},
					{
						displayName: 'Product ID',
						name: 'product_id',
						type: 'number',
						default: 0,
						description: 'ID of the person this file will be associated with.',
					},
				],
			},

			// ----------------------------------
			//         file:delete
			// ----------------------------------
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
						resource: [
							'file',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the file to delete.',
			},

			// ----------------------------------
			//         file:download
			// ----------------------------------
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'download',
						],
						resource: [
							'file',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the file to download.',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						operation: [
							'download',
						],
						resource: [
							'file',
						],
					},
				},
				description: 'Name of the binary property to which to<br />write the data of the downloaded file.',
			},

			// ----------------------------------
			//         file:get
			// ----------------------------------
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'file',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the file to get.',
			},



			// ----------------------------------
			//         note
			// ----------------------------------

			// ----------------------------------
			//         note:create
			// ----------------------------------
			{
				displayName: 'Content',
				name: 'content',
				typeOptions: {
					rows: 5,
				},
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'note',
						],
					},
				},
				description: 'The content of the note to create',
			},
			// {
			// 	displayName: 'Additional Fields',
			// 	name: 'additionalFields',
			// 	type: 'collection',
			// 	placeholder: 'Add Field',
			// 	displayOptions: {
			// 		show: {
			// 			operation: [
			// 				'create',
			// 				'getAll',
			// 			],
			// 			resource: [
			// 				'note',
			// 			],
			// 		},
			// 	},
			// 	default: {},
			// 	options: [
			// 		{
			// 			displayName: 'Deal ID',
			// 			name: 'deal_id',
			// 			type: 'number',
			// 			default: 0,
			// 			description: 'ID of the deal this note will be associated with',
			// 		},
			// 		{
			// 			displayName: 'Organization ID',
			// 			name: 'org_id',
			// 			type: 'options',
			// 			typeOptions: {
			// 				loadOptionsMethod: 'getOrganizationIds',
			// 			},
			// 			default: '',
			// 			description: 'ID of the organization this deal will be associated with.',
			// 		},
			// 		{
			// 			displayName: 'Person ID',
			// 			name: 'person_id',
			// 			type: 'number',
			// 			default: 0,
			// 			description: 'ID of the person this note will be associated with.',
			// 		},
			// 	],
			// },

			// ----------------------------------
			//         note:delete
			// ----------------------------------
			{
				displayName: 'Note ID',
				name: 'noteId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
						resource: [
							'note',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the note to delete.',
			},

			// ----------------------------------
			//         note:get
			// ----------------------------------
			{
				displayName: 'Note ID',
				name: 'noteId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'note',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the note to get.',
			},

			// ----------------------------------
			//         note:update
			// ----------------------------------
			{
				displayName: 'Note ID',
				name: 'noteId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'note',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the note to update.',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'note',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Content',
						name: 'content',
						typeOptions: {
							rows: 5,
						},
						type: 'string',
						default: '',
						description: 'The content of the note',
					},
					{
						displayName: 'Deal ID',
						name: 'deal_id',
						type: 'number',
						default: 0,
						description: 'ID of the deal this note will be associated with',
					},
					{
						displayName: 'Organization ID',
						name: 'org_id',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getOrganizationIds',
						},
						default: '',
						description: 'ID of the organization this deal will be associated with.',
					},
					{
						displayName: 'Person ID',
						name: 'person_id',
						type: 'number',
						default: 0,
						description: 'ID of the person this note will be associated with.',
					},
				],
			},



			// ----------------------------------
			//         organization
			// ----------------------------------

			// ----------------------------------
			//         organization:create
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
							'create',
						],
						resource: [
							'organization',
						],
					},
				},
				description: 'The name of the organization to create',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'organization',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Custom Properties',
						name: 'customProperties',
						placeholder: 'Add Custom Property',
						description: 'Adds a custom property to set also values which have not been predefined.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Property Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the property to set.',
									},
									{
										displayName: 'Property Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the property to set.',
									},
								],
							},
						],
					},
					{
						displayName: 'Label',
						name: 'label',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getOrganizationLabels',
						},
						default: '',
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
						description: 'Visibility of the person. If omitted, visibility will be set to the default visibility setting of this item type for the authorized user.',
					},
				],
			},

			// ----------------------------------
			//         organization:delete
			// ----------------------------------
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
						resource: [
							'organization',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the organization to delete.',
			},

			// ----------------------------------
			//         organization:get
			// ----------------------------------
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'organization',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the organization to get.',
			},

			// ----------------------------------
			//         organization:update
			// ----------------------------------
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'number',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'organization',
						],
					},
				},
				description: 'The ID of the organization to create',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'organization',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Custom Properties',
						name: 'customProperties',
						placeholder: 'Add Custom Property',
						description: 'Adds a custom property to set also values which have not been predefined.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Property Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the property to set.',
									},
									{
										displayName: 'Property Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the property to set.',
									},
								],
							},
						],
					},
					{
						displayName: 'Label',
						name: 'label',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getOrganizationLabels',
						},
						default: '',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Organization name',
					},
					{
						displayName: 'Owner ID',
						name: 'owner_id',
						type: 'number',
						default: 0,
						description: 'The ID of the user who will be marked as the owner of this Organization. When omitted, the authorized User ID will be used.',
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
						description: 'Visibility of the person. If omitted, visibility will be set to the default visibility setting of this item type for the authorized user.',
					},
				],
			},



			// ----------------------------------
			//         person
			// ----------------------------------

			// ----------------------------------
			//         person:create
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
							'create',
						],
						resource: [
							'person',
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
							'create',
						],
						resource: [
							'person',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Custom Properties',
						name: 'customProperties',
						placeholder: 'Add Custom Property',
						description: 'Adds a custom property to set also values which have not been predefined.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Property Name',
										name: 'name',
										type: 'options',
										typeOptions: {
											loadOptionsMethod: 'getPersonCustomFields',
										},
										default: '',
										description: 'Name of the custom field to set.',
									},
									{
										displayName: 'Property Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the property to set.',
									},
								],
							},
						],
					},
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
						displayName: 'Label',
						name: 'label',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getPersonLabels',
						},
						default: '',
					},
					{
						displayName: 'Organization ID',
						name: 'org_id',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getOrganizationIds',
						},
						default: '',
						description: 'ID of the organization this deal will be associated with.',
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
						description: 'Visibility of the person. If omitted, visibility will be set to the default visibility setting of this item type for the authorized user.',
					},
				],
			},

			// ----------------------------------
			//         person:delete
			// ----------------------------------
			{
				displayName: 'Person ID',
				name: 'personId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
						resource: [
							'person',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the person to delete.',
			},

			// ----------------------------------
			//         person:get
			// ----------------------------------
			{
				displayName: 'Person ID',
				name: 'personId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'person',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the person to get.',
			},

			// ----------------------------------
			//         person:update
			// ----------------------------------
			{
				displayName: 'Person ID',
				name: 'personId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'person',
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
							'update',
						],
						resource: [
							'person',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Custom Properties',
						name: 'customProperties',
						placeholder: 'Add Custom Property',
						description: 'Adds a custom property to set also values which have not been predefined.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Property Name',
										name: 'name',
										type: 'options',
										typeOptions: {
											loadOptionsMethod: 'getPersonCustomFields',
										},
										default: '',
										description: 'Name of the custom field to set.',
									},
									{
										displayName: 'Property Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the property to set.',
									},
								],
							},
						],
					},
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
						displayName: 'Label',
						name: 'label',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getPersonLabels',
						},
						default: '',
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
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getOrganizationIds',
						},
						default: '',
						description: 'ID of the organization this deal will be associated with.',
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
			//         activity / deal / note / organization / person / product
			// ----------------------------------
			{
				displayName: 'Resolve Properties',
				name: 'resolveProperties',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'activity',
							'deal',
							'organization',
							'person',
							'product',
						],
						operation: [
							'get',
							'getAll',
						],
					},
				},
				default: false,
				description: 'By default do custom properties get returned only as ID instead of their actual name. Also option fields contain only the ID instead of their actual value. If this option gets set they get automatically resolved.',
			},
			{
				displayName: 'Encode Properties',
				name: 'encodeProperties',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'activity',
							'deal',
							'organization',
							'person',
							'product',
						],
						operation: [
							'update',
						],
					},
				},
				default: false,
				description: 'By default do custom properties have to be set as ID instead of their actual name. Also option fields have to be set as ID instead of their actual value. If this option gets set they get automatically encoded.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'getAll',
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
							'getAll',
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
			//         person:getAll
			// ----------------------------------
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'getAll',
						],
						resource: [
							'person',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Filter ID',
						name: 'filterId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getFilters',
						},
						default: '',
						description: 'ID of the filter to use.',
					},
					{
						displayName: 'First Char',
						name: 'firstChar',
						type: 'string',
						default: '',
						description: 'If supplied, only persons whose name starts with the specified letter will be returned ',
					},
				],
			},

			// ----------------------------------
			//         person:search
			// ----------------------------------
			{
				displayName: 'Term',
				name: 'term',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'search',
						],
						resource: [
							'person',
						],
					},
				},
				default: '',
				description: 'The search term to look for. Minimum 2 characters (or 1 if using exact_match).',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'search',
						],
						resource: [
							'person',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Exact Match',
						name: 'exactMatch',
						type: 'boolean',
						default: false,
						description: 'When enabled, only full exact matches against the given term are returned. It is not case sensitive.',
					},
					{
						displayName: 'Fields',
						name: 'fields',
						type: 'string',
						default: '',
						description: 'A comma-separated string array. The fields to perform the search from. Defaults to all of them.',
					},
					{
						displayName: 'Include Fields',
						name: 'includeFields',
						type: 'string',
						default: '',
						description: 'Supports including optional fields in the results which are not provided by default.',
					},
					{
						displayName: 'Organization ID',
						name: 'organizationId',
						type: 'string',
						default: '',
						description: 'Will filter Deals by the provided Organization ID.',
					},
					{
						displayName: 'RAW Data',
						name: 'rawData',
						type: 'boolean',
						default: false,
						description: `Returns the data exactly in the way it got received from the API.`,
					},
				],
			},

			// ----------------------------------
			//         note:create/getAll
			// ----------------------------------
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'create',
							'getAll',
						],
						resource: [
							'note',
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
						description: 'ID of the deal this note will be associated with',
					},
					{
						displayName: 'Organization ID',
						name: 'org_id',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getOrganizationIds',
						},
						default: '',
						description: 'ID of the organization this deal will be associated with.',
					},
					{
						displayName: 'Person ID',
						name: 'person_id',
						type: 'number',
						default: 0,
						description: 'ID of the person this note will be associated with.',
					},
				],
			},
			// ----------------------------------
			//         activity:getAll
			// ----------------------------------
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'getAll',
						],
						resource: [
							'activity',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Done',
						name: 'done',
						type: 'boolean',
						default: false,
						description: 'Whether the Activity is done or not. 0 = Not done, 1 = Done. If omitted returns both Done and Not done activities.',
					},
					{
						displayName: 'End Date',
						name: 'end_date',
						type: 'dateTime',
						default: '',
						description: 'Use the Activity due date where you wish to stop fetching Activities from. Insert due date in YYYY-MM-DD format.',
					},
					{
						displayName: 'Filter ID ',
						name: 'filterId',
						type: 'string',
						default: '',
						description: 'The ID of the Filter to use (will narrow down results if used together with user_id parameter)',
					},
					{
						displayName: 'Star Date',
						name: 'start_date',
						type: 'dateTime',
						default: '',
						description: 'Use the Activity due date where you wish to begin fetching Activities from. Insert due date in YYYY-MM-DD format.',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getActivityTypes',
						},
						default: [],
						description: 'Type of the Activity.',
					},
					{
						displayName: 'User ID',
						name: 'user_id',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getUserIds',
						},
						default: '',
						description: 'The ID of the User whose Activities will be fetched. If omitted, the User associated with the API token will be used. If 0, Activities for all company Users will be fetched based on the permission sets.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all Organizations to display them to user so that he can
			// select them easily
			async getActivityTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { data } = await pipedriveApiRequest.call(this, 'GET', '/activityTypes', {});
				for (const activity of data) {
					returnData.push({
						name: activity.name,
						value: activity.key_string,
					});
				}

				returnData.sort((a, b) => {
					const aName = a.name.toLowerCase();
					const bName = b.name.toLowerCase();
					if (aName < bName) { return -1; }
					if (aName > bName) { return 1; }
					return 0;
				});

				return returnData;
			},
			// Get all Organizations to display them to user so that he can
			// select them easily
			async getOrganizationIds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { data } = await pipedriveApiRequest.call(this, 'GET', '/organizations', {});
				for (const org of data) {
					returnData.push({
						name: org.name,
						value: org.id,
					});
				}

				returnData.sort((a, b) => {
					const aName = a.name.toLowerCase();
					const bName = b.name.toLowerCase();
					if (aName < bName) { return -1; }
					if (aName > bName) { return 1; }
					return 0;
				});

				return returnData;
			},
			// Get all Organizations to display them to user so that he can
			// select them easily
			async getUserIds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { data } = await pipedriveApiRequest.call(this, 'GET', '/users', {});
				for (const user of data) {
					if (user.active_flag === true) {
						returnData.push({
							name: user.name,
							value: user.id,
						});
					}
				}

				returnData.sort((a, b) => {
					const aName = a.name.toLowerCase();
					const bName = b.name.toLowerCase();
					if (aName < bName) { return -1; }
					if (aName > bName) { return 1; }
					return 0;
				});

				return returnData;
			},
			// Get all Stages to display them to user so that he can
			// select them easily
			async getStageIds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { data } = await pipedriveApiRequest.call(this, 'GET', '/stages', {});
				for (const stage of data) {
					returnData.push({
						name: `${stage.pipeline_name} > ${stage.name}`,
						value: stage.id,
					});
				}

				returnData.sort((a, b) => {
					const aName = a.name.toLowerCase();
					const bName = b.name.toLowerCase();
					if (aName < bName) { return -1; }
					if (aName > bName) { return 1; }
					return 0;
				});

				return returnData;
			},
			// Get all the Organization Custom Fields to display them to user so that he can
			// select them easily
			async getOrganizationCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { data } = await pipedriveApiRequest.call(this, 'GET', '/organizationFields', {});
				for (const field of data) {
					if (field.key.length === 40) {
						returnData.push({
							name: field.name,
							value: field.key,
						});
					}
				}

				returnData.sort((a, b) => {
					const aName = a.name.toLowerCase();
					const bName = b.name.toLowerCase();
					if (aName < bName) { return -1; }
					if (aName > bName) { return 1; }
					return 0;
				});

				return returnData;
			},
			// Get all the Deal Custom Fields to display them to user so that he can
			// select them easily
			async getDealCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { data } = await pipedriveApiRequest.call(this, 'GET', '/dealFields', {});
				for (const field of data) {
					if (field.key.length === 40) {
						returnData.push({
							name: field.name,
							value: field.key,
						});
					}
				}

				returnData.sort((a, b) => {
					const aName = a.name.toLowerCase();
					const bName = b.name.toLowerCase();
					if (aName < bName) { return -1; }
					if (aName > bName) { return 1; }
					return 0;
				});

				return returnData;
			},
			// Get all the Person Custom Fields to display them to user so that he can
			// select them easily
			async getPersonCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { data } = await pipedriveApiRequest.call(this, 'GET', '/personFields', {});
				for (const field of data) {
					if (field.key.length === 40) {
						returnData.push({
							name: field.name,
							value: field.key,
						});
					}
				}

				returnData.sort((a, b) => {
					const aName = a.name.toLowerCase();
					const bName = b.name.toLowerCase();
					if (aName < bName) { return -1; }
					if (aName > bName) { return 1; }
					return 0;
				});

				return returnData;
			},
			// Get all the filters to display them to user so that he can
			// select them easily
			async getFilters(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { data } = await pipedriveApiRequest.call(this, 'GET', '/filters', {}, { type: 'people' });
				for (const filter of data) {
					const filterName = filter.name;
					const filterId = filter.id;
					returnData.push({
						name: filterName,
						value: filterId,
					});
				}

				returnData.sort((a, b) => {
					const aName = a.name.toLowerCase();
					const bName = b.name.toLowerCase();
					if (aName < bName) { return -1; }
					if (aName > bName) { return 1; }
					return 0;
				});

				return returnData;
			},
			// Get all the person labels to display them to user so that he can
			// select them easily
			async getPersonLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const operation = this.getCurrentNodeParameter('operation') as string;
				const { data } = await pipedriveApiRequest.call(this, 'GET', '/personFields', {});
				for (const field of data) {
					if (field.key === 'label') {
						if (field.options) {
							for (const option of field.options) {
								returnData.push({
									name: option.label,
									value: option.id,
								});
							}
						}
					}
				}

				returnData.sort((a, b) => {
					const aName = a.name.toLowerCase();
					const bName = b.name.toLowerCase();
					if (aName < bName) { return -1; }
					if (aName > bName) { return 1; }
					return 0;
				});

				if (operation === 'update') {
					returnData.push({
						name: 'No Label',
						value: 'null',
					});
				}
				return returnData;
			},
			// Get all the labels to display them to user so that he can
			// select them easily
			async getOrganizationLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const operation = this.getCurrentNodeParameter('operation') as string;
				const { data } = await pipedriveApiRequest.call(this, 'GET', '/organizationFields', {});
				for (const field of data) {
					if (field.key === 'label') {
						if (field.options) {
							for (const option of field.options) {
								returnData.push({
									name: option.label,
									value: option.id,
								});
							}
						}
					}
				}

				returnData.sort((a, b) => {
					const aName = a.name.toLowerCase();
					const bName = b.name.toLowerCase();
					if (aName < bName) { return -1; }
					if (aName > bName) { return 1; }
					return 0;
				});

				if (operation === 'update') {
					returnData.push({
						name: 'No Label',
						value: 'null',
					});
				}
				return returnData;
			},
			// Get all the labels to display them to user so that he can
			// select them easily
			async getDealLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const operation = this.getCurrentNodeParameter('operation') as string;
				const { data } = await pipedriveApiRequest.call(this, 'GET', '/dealFields', {});
				for (const field of data) {
					if (field.key === 'label') {
						if (field.options) {
							for (const option of field.options) {
								returnData.push({
									name: option.label,
									value: option.id,
								});
							}
						}
					}
				}

				returnData.sort((a, b) => {
					const aName = a.name.toLowerCase();
					const bName = b.name.toLowerCase();
					if (aName < bName) { return -1; }
					if (aName > bName) { return 1; }
					return 0;
				});

				if (operation === 'update') {
					returnData.push({
						name: 'No Label',
						value: 'null',
					});
				}
				return returnData;
			},
		},
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		// For Post
		let body: IDataObject;
		// For FormData
		let formData: IDataObject;
		// For Query string
		let qs: IDataObject;

		let downloadFile: boolean;

		let requestMethod: string;
		let endpoint: string;
		let returnAll = false;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let customProperties: ICustomProperties | undefined;
		if (['get', 'getAll', 'update'].includes(operation) && ['activity', 'deal', 'organization', 'person', 'product'].includes(resource)) {
			// Request the custom properties once in the beginning to not query it multiple
			// times if multiple items get updated

			let getCustomProperties = false;
			if (['update'].includes(operation)) {
				getCustomProperties = this.getNodeParameter('encodeProperties', 0, false) as boolean;
			} else {
				getCustomProperties = this.getNodeParameter('resolveProperties', 0, false) as boolean;
			}

			if (getCustomProperties === true) {
				customProperties = await pipedriveGetCustomProperties.call(this, resource);
			}
		}

		for (let i = 0; i < items.length; i++) {

			requestMethod = 'GET';
			endpoint = '';
			downloadFile = false;
			body = {};
			formData = {};
			qs = {};

			if (resource === 'activity') {
				if (operation === 'create') {
					// ----------------------------------
					//         activity:create
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = '/activities';

					body.subject = this.getNodeParameter('subject', i) as string;
					body.done = this.getNodeParameter('done', i) as string;
					body.type = this.getNodeParameter('type', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					addAdditionalFields(body, additionalFields);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         activity:delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const activityId = this.getNodeParameter('activityId', i) as number;
					endpoint = `/activities/${activityId}`;

				} else if (operation === 'get') {
					// ----------------------------------
					//         activity:get
					// ----------------------------------

					requestMethod = 'GET';

					const activityId = this.getNodeParameter('activityId', i) as number;

					endpoint = `/activities/${activityId}`;

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         activity:getAll
					// ----------------------------------

					requestMethod = 'GET';

					returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll === false) {
						qs.limit = this.getNodeParameter('limit', i) as number;
					}

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					addAdditionalFields(qs, additionalFields);

					if (qs.type) {
						qs.type = (qs.type as string[]).join(',');
					}

					endpoint = `/activities`;

				} else if (operation === 'update') {
					// ----------------------------------
					//         activity:update
					// ----------------------------------

					requestMethod = 'PUT';

					const activityId = this.getNodeParameter('activityId', i) as number;
					endpoint = `/activities/${activityId}`;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					addAdditionalFields(body, updateFields);

				}
			} else if (resource === 'deal') {
				if (operation === 'create') {
					// ----------------------------------
					//         deal:create
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = '/deals';

					body.title = this.getNodeParameter('title', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					addAdditionalFields(body, additionalFields);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         deal:delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const dealId = this.getNodeParameter('dealId', i) as number;
					endpoint = `/deals/${dealId}`;

				} else if (operation === 'duplicate') {
					// ----------------------------------
					//         deal:duplicate
					// ----------------------------------

					requestMethod = 'POST';

					const dealId = this.getNodeParameter('dealId', i) as number;
					endpoint = `/deals/${dealId}/duplicate`;

				} else if (operation === 'get') {
					// ----------------------------------
					//         deal:get
					// ----------------------------------

					requestMethod = 'GET';

					const dealId = this.getNodeParameter('dealId', i) as number;
					endpoint = `/deals/${dealId}`;

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         deal:getAll
					// ----------------------------------

					requestMethod = 'GET';

					returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll === false) {
						qs.limit = this.getNodeParameter('limit', i) as number;
					}

					endpoint = `/deals`;

				} else if (operation === 'update') {
					// ----------------------------------
					//         deal:update
					// ----------------------------------

					requestMethod = 'PUT';

					const dealId = this.getNodeParameter('dealId', i) as number;
					endpoint = `/deals/${dealId}`;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					addAdditionalFields(body, updateFields);

					if (body.label === 'null') {
						body.label = null;
					}
				} else if (operation === 'search') {
					// ----------------------------------
					//         deal:search
					// ----------------------------------

					requestMethod = 'GET';

					qs.term = this.getNodeParameter('term', i) as string;
					returnAll = this.getNodeParameter('returnAll', i) as boolean;
					qs.exact_match = this.getNodeParameter('exactMatch', i) as boolean;
					if (returnAll === false) {
						qs.limit = this.getNodeParameter('limit', i) as number;
					}

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (additionalFields.fields) {
						qs.fields = (additionalFields.fields as string[]).join(',');
					}

					if (additionalFields.organizationId) {
						qs.organization_id = parseInt(additionalFields.organizationId as string, 10);
					}

					if (additionalFields.includeFields) {
						qs.include_fields = additionalFields.includeFields as string;
					}

					if (additionalFields.personId) {
						qs.person_id = parseInt(additionalFields.personId as string, 10);
					}
					if (additionalFields.status) {
						qs.status = additionalFields.status as string;
					}

					endpoint = `/deals/search`;

				}
			} else if (resource === 'file') {
				if (operation === 'create') {
					// ----------------------------------
					//         file:create
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = '/files';

					const item = items[i];

					if (item.binary === undefined) {
						throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
					}

					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

					if (item.binary[binaryPropertyName] === undefined) {
						throw new NodeOperationError(this.getNode(), `No binary data property "${binaryPropertyName}" does not exists on item!`);
					}

					const fileBufferData = Buffer.from(item.binary[binaryPropertyName].data, BINARY_ENCODING);

					formData.file = {
						value: fileBufferData,
						options: {
							contentType: item.binary[binaryPropertyName].mimeType,
							filename: item.binary[binaryPropertyName].fileName,
						},
					};

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					addAdditionalFields(formData, additionalFields);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         file:delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const fileId = this.getNodeParameter('fileId', i) as number;
					endpoint = `/files/${fileId}`;

				} else if (operation === 'download') {
					// ----------------------------------
					//         file:download
					// ----------------------------------

					requestMethod = 'GET';
					downloadFile = true;

					const fileId = this.getNodeParameter('fileId', i) as number;
					endpoint = `/files/${fileId}/download`;

				} else if (operation === 'get') {
					// ----------------------------------
					//         file:get
					// ----------------------------------

					requestMethod = 'GET';

					const fileId = this.getNodeParameter('fileId', i) as number;
					endpoint = `/files/${fileId}`;

				}
			} else if (resource === 'note') {
				if (operation === 'create') {
					// ----------------------------------
					//         note:create
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = '/notes';

					body.content = this.getNodeParameter('content', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					addAdditionalFields(body, additionalFields);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         note:delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const noteId = this.getNodeParameter('noteId', i) as number;
					endpoint = `/notes/${noteId}`;

				} else if (operation === 'get') {
					// ----------------------------------
					//         note:get
					// ----------------------------------

					requestMethod = 'GET';

					const noteId = this.getNodeParameter('noteId', i) as number;
					endpoint = `/notes/${noteId}`;

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         note:getAll
					// ----------------------------------

					requestMethod = 'GET';
					endpoint = `/notes`;

					returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll === false) {
						qs.limit = this.getNodeParameter('limit', i) as number;
					}
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					addAdditionalFields(qs, additionalFields);

				} else if (operation === 'update') {
					// ----------------------------------
					//         note:update
					// ----------------------------------

					requestMethod = 'PUT';

					const noteId = this.getNodeParameter('noteId', i) as number;
					endpoint = `/notes/${noteId}`;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					addAdditionalFields(body, updateFields);

				}
			} else if (resource === 'organization') {
				if (operation === 'create') {
					// ----------------------------------
					//         organization:create
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = '/organizations';

					body.name = this.getNodeParameter('name', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					addAdditionalFields(body, additionalFields);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         organization:delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const organizationId = this.getNodeParameter('organizationId', i) as number;
					endpoint = `/organizations/${organizationId}`;

				} else if (operation === 'get') {
					// ----------------------------------
					//         organization:get
					// ----------------------------------

					requestMethod = 'GET';

					const organizationId = this.getNodeParameter('organizationId', i) as number;
					endpoint = `/organizations/${organizationId}`;

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         organization:getAll
					// ----------------------------------

					requestMethod = 'GET';

					returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll === false) {
						qs.limit = this.getNodeParameter('limit', i) as number;
					}

					endpoint = `/organizations`;

				}
				if (operation === 'update') {
					// ----------------------------------
					//         organization:update
					// ----------------------------------

					const id = this.getNodeParameter('organizationId', i) as string;

					requestMethod = 'PUT';
					endpoint = `/organizations/${id}`;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					addAdditionalFields(body, updateFields);

					if (body.label === 'null') {
						body.label = null;
					}

				}
			} else if (resource === 'person') {
				if (operation === 'create') {
					// ----------------------------------
					//         person:create
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = '/persons';

					body.name = this.getNodeParameter('name', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					addAdditionalFields(body, additionalFields);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         person:delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const personId = this.getNodeParameter('personId', i) as number;
					endpoint = `/persons/${personId}`;

				} else if (operation === 'get') {
					// ----------------------------------
					//         person:get
					// ----------------------------------

					requestMethod = 'GET';

					const personId = this.getNodeParameter('personId', i) as number;
					endpoint = `/persons/${personId}`;

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         persons:getAll
					// ----------------------------------

					requestMethod = 'GET';

					returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll === false) {
						qs.limit = this.getNodeParameter('limit', i) as number;
					}

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (additionalFields.filterId) {
						qs.filter_id = additionalFields.filterId as string;
					}

					if (additionalFields.firstChar) {
						qs.first_char = additionalFields.firstChar as string;
					}

					endpoint = `/persons`;

				} else if (operation === 'search') {
					// ----------------------------------
					//         persons:search
					// ----------------------------------

					requestMethod = 'GET';

					qs.term = this.getNodeParameter('term', i) as string;
					returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll === false) {
						qs.limit = this.getNodeParameter('limit', i) as number;
					}

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (additionalFields.fields) {
						qs.fields = additionalFields.fields as string;
					}

					if (additionalFields.exactMatch) {
						qs.exact_match = additionalFields.exactMatch as boolean;
					}

					if (additionalFields.organizationId) {
						qs.organization_id = parseInt(additionalFields.organizationId as string, 10);
					}

					if (additionalFields.includeFields) {
						qs.include_fields = additionalFields.includeFields as string;
					}

					endpoint = `/persons/search`;

				} else if (operation === 'update') {
					// ----------------------------------
					//         person:update
					// ----------------------------------

					requestMethod = 'PUT';

					const personId = this.getNodeParameter('personId', i) as number;
					endpoint = `/persons/${personId}`;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					addAdditionalFields(body, updateFields);

					if (body.label === 'null') {
						body.label = null;
					}

				}
			} else if (resource === 'product') {
				if (operation === 'getAll') {
					// ----------------------------------
					//         product:getAll
					// ----------------------------------

					requestMethod = 'GET';

					returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll === false) {
						qs.limit = this.getNodeParameter('limit', i) as number;
					}

					endpoint = `/products`;

				}
			} else {
				throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
			}

			let responseData;
			if (returnAll === true) {

				responseData = await pipedriveApiRequestAllItems.call(this, requestMethod, endpoint, body, qs);

			} else {

				if (customProperties !== undefined) {
					pipedriveEncodeCustomProperties(customProperties!, body);
				}

				responseData = await pipedriveApiRequest.call(this, requestMethod, endpoint, body, qs, formData, downloadFile);

			}

			if (resource === 'file' && operation === 'download') {
				const newItem: INodeExecutionData = {
					json: items[i].json,
					binary: {},
				};

				if (items[i].binary !== undefined) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, items[i].binary);
				}

				items[i] = newItem;

				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

				items[i].binary![binaryPropertyName] = await this.helpers.prepareBinaryData(responseData.data);
			} else {

				if (responseData.data === null) {
					responseData.data = [];
				}

				if (operation === 'search' && responseData.data && responseData.data.items) {
					responseData.data = responseData.data.items;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					if (additionalFields.rawData !== true) {
						responseData.data = responseData.data.map((item: { result_score: number, item: object }) => {
							return {
								result_score: item.result_score,
								...item.item,
							};
						});
					}
				}

				if (Array.isArray(responseData.data)) {
					returnData.push.apply(returnData, responseData.data as IDataObject[]);
				} else {
					returnData.push(responseData.data as IDataObject);
				}
			}
		}

		if (customProperties !== undefined) {
			for (const item of returnData) {
				await pipedriveResolveCustomProperties(customProperties, item);
			}
		}

		if (resource === 'file' && operation === 'download') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else {
			// For all other ones does the output items get replaced
			return [this.helpers.returnJsonArray(returnData)];
		}
	}
}
