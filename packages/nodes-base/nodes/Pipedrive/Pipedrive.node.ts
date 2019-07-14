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
			}
		],
		properties: [
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
					// TODO: Currently missing
					// {
					// 	name: 'Get All',
					// 	value: 'getAll',
					// 	description: 'Get data of all activities',
					// },
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
						name: 'Get',
						value: 'get',
						description: 'Get data of a deal',
					},
					// TODO: Currently missing
					// {
					// 	name: 'Get All',
					// 	value: 'getAll',
					// 	description: 'Get data of all deals',
					// },
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
						description: 'Delete anorganization',
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
					// TODO: Currently missing
					// {
					// 	name: 'Update',
					// 	value: 'update',
					// 	description: 'Update an organization',
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
								]
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
							'get'
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
							'update'
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
							'update'
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
								]
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
								]
							},
						],
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
			//         deal:get
			// ----------------------------------
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'get'
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
							'update'
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
							'update'
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
								]
							},
						],
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
								]
							},
						],
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
			//         organization:getAll
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'getAll',
						],
						resource: [
							'organization',
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
						resource: [
							'organization',
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
						description: 'Visibility of the person. If omitted, visibility will be set to the default visibility setting of this item type for the authorized user.',
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
								]
							},
						],
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
			//         person:getAll
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
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
						resource: [
							'person',
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
								]
							},
						],
					},
				],
			},



			// ----------------------------------
			//         product
			// ----------------------------------

			// ----------------------------------
			//         product:getAll
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'getAll',
						],
						resource: [
							'product',
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
						resource: [
							'product',
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

		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let resource: string;
		let operation: string;

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;
		let returnAll = false;

		for (let i = 0; i < items.length; i++) {
			resource = this.getNodeParameter('resource', 0) as string;
			operation = this.getNodeParameter('operation', 0) as string;

			requestMethod = 'GET';
			endpoint = '';
			body = {};
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

				} else if (operation === 'get') {
					// ----------------------------------
					//         deal:get
					// ----------------------------------

					requestMethod = 'GET';

					const dealId = this.getNodeParameter('dealId', i) as number;
					endpoint = `/deals/${dealId}`;

				} else if (operation === 'update') {
					// ----------------------------------
					//         deal:update
					// ----------------------------------

					requestMethod = 'PUT';

					const dealId = this.getNodeParameter('dealId', i) as number;
					endpoint = `/deals/${dealId}`;

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

					endpoint = `/persons`;

				} else if (operation === 'update') {
					// ----------------------------------
					//         person:update
					// ----------------------------------

					requestMethod = 'PUT';

					const personId = this.getNodeParameter('personId', i) as number;
					endpoint = `/persons/${personId}`;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					addAdditionalFields(body, updateFields);

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
				throw new Error(`The resource "${resource}" is not known!`);
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
