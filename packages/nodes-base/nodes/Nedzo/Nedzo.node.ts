import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { nedzoApiRequest } from './GenericFunctions';

export class Nedzo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Nedzo',
		name: 'nedzo',
		icon: 'file:nedzo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Nedzo API',
		defaults: {
			name: 'Nedzo',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'nedzoApi',
				required: true,
			},
		],
		properties: [
			// Resource
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Agent',
						value: 'agent',
					},
					{
						name: 'Call',
						value: 'call',
					},
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Workspace',
						value: 'workspace',
					},
				],
				default: 'call',
			},

			// Agent operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['agent'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new agent',
						action: 'Create an agent',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an agent',
						action: 'Delete an agent',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get an agent by ID',
						action: 'Get an agent',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many agents',
						action: 'Get many agents',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an agent',
						action: 'Update an agent',
					},
				],
				default: 'create',
			},

			// Call operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['call'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Initiate an outbound call',
						action: 'Initiate an outbound call',
					},
				],
				default: 'create',
			},

			// Contact operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['contact'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new contact',
						action: 'Create a contact',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a contact',
						action: 'Delete a contact',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a contact by ID',
						action: 'Get a contact',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many contacts',
						action: 'Get many contacts',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a contact',
						action: 'Update a contact',
					},
				],
				default: 'create',
			},

			// Workspace Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['workspace'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new workspace',
						action: 'Create a workspace',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a workspace',
						action: 'Delete a workspace',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a workspace by ID',
						action: 'Get a workspace',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many workspaces',
						action: 'Get many workspaces',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a workspace',
						action: 'Update a workspace',
					},
				],
				default: 'create',
			},

			// ==================
			// Agent Parameters
			// ==================

			// Agent: Create
			{
				displayName: 'Workspace',
				name: 'workspaceId',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getWorkspaces',
				},
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'The workspace to create the agent in',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'The name of the agent',
			},
			{
				displayName: 'Agent Type',
				name: 'agentType',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'Inbound Voice',
						value: 'Inbound Voice',
					},
					{
						name: 'Outbound Voice',
						value: 'Outbound Voice',
					},
					{
						name: 'Chat',
						value: 'Chat',
					},
					{
						name: 'Widget',
						value: 'Widget',
					},
				],
				default: 'Inbound Voice',
				description: 'The type of agent to create',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Background Sound',
						name: 'backgroundSound',
						type: 'boolean',
						default: true,
						description: 'Whether to enable background sound (defaults to true)',
						displayOptions: {
							show: {
								'/agentType': ['Inbound Voice', 'Outbound Voice'],
							},
						},
					},
					{
						displayName: 'Call Duration',
						name: 'callDuration',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 60,
						},
						default: 30,
						description: 'Maximum call duration in minutes (1-60, defaults to 30)',
						displayOptions: {
							show: {
								'/agentType': ['Inbound Voice', 'Outbound Voice'],
							},
						},
					},
					{
						displayName: 'HIPAA Compliance',
						name: 'hipaaCompliance',
						type: 'boolean',
						default: false,
						description:
							'Whether to enable HIPAA compliance mode (defaults to false). When enabled, no logs, recordings, or transcriptions will be stored.',
						displayOptions: {
							show: {
								'/agentType': ['Inbound Voice', 'Outbound Voice'],
							},
						},
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'options',
						options: [
							{ name: 'English', value: 'english' },
							{ name: 'Spanish', value: 'spanish' },
							{ name: 'French', value: 'french' },
							{ name: 'German', value: 'german' },
							{ name: 'Portuguese', value: 'portuguese' },
							{ name: 'Dutch', value: 'dutch' },
							{ name: 'Chinese', value: 'chinese' },
							{ name: 'Japanese', value: 'japanese' },
						],
						default: 'english',
						description: 'Agent language',
					},
					{
						displayName: 'Opening Line',
						name: 'openingLine',
						type: 'string',
						default: '',
						description: 'Opening line the agent says when starting a conversation',
						displayOptions: {
							show: {
								'/agentType': ['Inbound Voice', 'Outbound Voice'],
							},
						},
					},
					{
						displayName: 'Prompt',
						name: 'prompt',
						type: 'string',
						typeOptions: {
							rows: 4,
						},
						default: '',
						description: 'System prompt for the agent',
					},
					{
						displayName: 'Voice ID',
						name: 'voiceId',
						type: 'string',
						default: '',
						description: 'Voice ID for text-to-speech',
						displayOptions: {
							show: {
								'/agentType': ['Inbound Voice', 'Outbound Voice'],
							},
						},
					},
					{
						displayName: 'Voicemail',
						name: 'voicemail',
						type: 'boolean',
						default: false,
						description: 'Whether to enable voicemail detection (defaults to false)',
						displayOptions: {
							show: {
								'/agentType': ['Outbound Voice'],
							},
						},
					},
					{
						displayName: 'Voicemail Message',
						name: 'voicemailMessage',
						type: 'string',
						default: '',
						description: 'Message to leave on voicemail',
						displayOptions: {
							show: {
								'/agentType': ['Outbound Voice'],
							},
						},
					},
				],
			},

			// Agent: Get, Delete
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['get', 'delete'],
					},
				},
				default: '',
				description: 'The ID of the agent to retrieve or delete',
			},

			// Agent: Get Many
			{
				displayName: 'Workspace',
				name: 'workspaceId',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getWorkspaces',
				},
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['getAll'],
					},
				},
				default: '',
				description: 'The workspace to list agents from',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Include Deleted',
						name: 'includeDeleted',
						type: 'boolean',
						default: false,
						description: 'Whether to include soft-deleted agents',
					},
				],
			},

			// Agent: Update
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['update'],
					},
				},
				default: '',
				description: 'The ID of the agent to update',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Call Duration',
						name: 'callDuration',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 60,
						},
						default: 30,
						description: 'Maximum call duration in minutes (1-60)',
					},
					{
						displayName: 'HIPAA Compliance',
						name: 'hipaaCompliance',
						type: 'boolean',
						default: false,
						description: 'Whether to enable HIPAA compliance mode',
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'options',
						options: [
							{ name: 'English', value: 'english' },
							{ name: 'Spanish', value: 'spanish' },
							{ name: 'French', value: 'french' },
							{ name: 'German', value: 'german' },
							{ name: 'Portuguese', value: 'portuguese' },
							{ name: 'Dutch', value: 'dutch' },
							{ name: 'Chinese', value: 'chinese' },
							{ name: 'Japanese', value: 'japanese' },
						],
						default: 'english',
						description: 'Agent language',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'The name of the agent',
					},
					{
						displayName: 'Prompt',
						name: 'prompt',
						type: 'string',
						typeOptions: {
							rows: 4,
						},
						default: '',
						description: 'System prompt for the agent',
					},
					{
						displayName: 'Voice Config (JSON)',
						name: 'voiceConfig',
						type: 'json',
						default: '{}',
						description: 'Voice configuration settings as JSON',
					},
				],
			},

			// ==================
			// Call Parameters
			// ==================

			// Call: Create
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['create'],
					},
				},
				default: '',
				placeholder: 'e.g. eecbbbaf-d2c6-4b49-b36f-9d0bb503dd75',
				description: 'UUID of the agent to use for the call',
			},
			{
				displayName: 'Call Type',
				name: 'callType',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'Phone Number',
						value: 'phoneNumber',
						description: 'Call a phone number directly',
					},
					{
						name: 'Contact',
						value: 'contact',
						description: 'Call a contact by ID',
					},
				],
				default: 'phoneNumber',
				description: 'Whether to call a phone number directly or a contact',
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['create'],
						callType: ['phoneNumber'],
					},
				},
				default: '',
				placeholder: '+14155551234',
				description: 'Phone number to call in E.164 format (e.g., +14155551234)',
			},
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['create'],
						callType: ['contact'],
					},
				},
				default: '',
				description: 'The ID of the contact to call',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['create'],
						callType: ['phoneNumber'],
					},
				},
				options: [
					{
						displayName: 'Business Name',
						name: 'businessName',
						type: 'string',
						default: '',
						description: 'Business or company name',
					},
					{
						displayName: 'Custom Fields (JSON)',
						name: 'customFields',
						type: 'json',
						default: '{}',
						description:
							'Custom field values by field name. Field names must match existing custom field definitions.',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
						description: 'Email address',
					},
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
						description: 'First name',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
						description: 'Last name',
					},
					{
						displayName: 'Variables (JSON)',
						name: 'variables',
						type: 'json',
						default: '{}',
						description:
							'Custom variables to pass to the assistant. These override contact field values.',
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['create'],
						callType: ['contact'],
					},
				},
				options: [
					{
						displayName: 'Variables (JSON)',
						name: 'variables',
						type: 'json',
						default: '{}',
						description:
							'Custom variables to pass to the assistant. These override contact field values.',
					},
				],
			},

			// ==================
			// Contact Parameters
			// ==================

			// Contact: Create
			{
				displayName: 'Workspace',
				name: 'workspaceId',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getWorkspaces',
				},
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'The workspace to create the contact in',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
						description: 'Contact email address',
					},
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
						description: 'Contact first name',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
						description: 'Contact last name',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
						description: 'Contact phone number',
					},
				],
			},

			// Contact: Get, Delete
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['get', 'delete'],
					},
				},
				default: '',
				description: 'The ID of the contact to retrieve or delete',
			},

			// Contact: Get Many
			{
				displayName: 'Workspace',
				name: 'workspaceId',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getWorkspaces',
				},
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['getAll'],
					},
				},
				default: '',
				description: 'The workspace to list contacts from',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Include Deleted',
						name: 'includeDeleted',
						type: 'boolean',
						default: false,
						description: 'Whether to include soft-deleted contacts',
					},
				],
			},

			// Contact: Update
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['update'],
					},
				},
				default: '',
				description: 'The contact to update',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
						description: 'Contact email address',
					},
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
						description: 'Contact first name',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
						description: 'Contact last name',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
						description: 'Contact phone number',
					},
				],
			},

			// ==================
			// Workspace Parameters
			// ==================

			// Workspace: Create
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['workspace'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'The name of the workspace',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['workspace'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Business Registration Number',
						name: 'businessRegistrationNumber',
						type: 'string',
						default: '',
						description: 'Business registration number (EIN, VAT, etc.)',
					},
					{
						displayName: 'Contact Email',
						name: 'contactEmail',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
						description: 'Contact email for the workspace',
					},
					{
						displayName: 'Contact Name',
						name: 'contactName',
						type: 'string',
						default: '',
						description: 'Contact name for the workspace',
					},
					{
						displayName: 'Contact Phone',
						name: 'contactPhone',
						type: 'string',
						default: '',
						description: 'Contact phone for the workspace',
					},
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
						placeholder: 'US',
						description: 'Country for the workspace',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						typeOptions: {
							rows: 2,
						},
						default: '',
						description: 'Workspace description',
					},
					{
						displayName: 'Icon',
						name: 'icon',
						type: 'string',
						default: '',
						description: 'Workspace icon URL or identifier',
					},
					{
						displayName: 'State',
						name: 'state',
						type: 'string',
						default: '',
						placeholder: 'NY',
						description: 'State/province for the workspace',
					},
					{
						displayName: 'Street Address',
						name: 'streetAddress',
						type: 'string',
						default: '',
						placeholder: '123 Main St',
						description: 'Street address for the workspace',
					},
					{
						displayName: 'Timezone',
						name: 'timezone',
						type: 'string',
						default: '',
						placeholder: 'America/New_York',
						description: 'Workspace timezone in IANA format',
					},
					{
						displayName: 'ZIP',
						name: 'zip',
						type: 'string',
						default: '',
						placeholder: '10001',
						description: 'ZIP/postal code for the workspace',
					},
				],
			},

			// Workspace: Get, Delete
			{
				displayName: 'Workspace ID',
				name: 'workspaceId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['workspace'],
						operation: ['get', 'delete'],
					},
				},
				default: '',
				description: 'The ID of the workspace to retrieve or delete',
			},

			// Workspace: Update
			{
				displayName: 'Workspace ID',
				name: 'workspaceId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['workspace'],
						operation: ['update'],
					},
				},
				default: '',
				description: 'The ID of the workspace to update',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['workspace'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Business Registration Number',
						name: 'businessRegistrationNumber',
						type: 'string',
						default: '',
						description: 'Business registration number (EIN, VAT, etc.)',
					},
					{
						displayName: 'Contact Email',
						name: 'contactEmail',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
						description: 'Contact email for the workspace',
					},
					{
						displayName: 'Contact Name',
						name: 'contactName',
						type: 'string',
						default: '',
						description: 'Contact name for the workspace',
					},
					{
						displayName: 'Contact Phone',
						name: 'contactPhone',
						type: 'string',
						default: '',
						description: 'Contact phone for the workspace',
					},
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
						placeholder: 'US',
						description: 'Country for the workspace',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						typeOptions: {
							rows: 2,
						},
						default: '',
						description: 'Workspace description',
					},
					{
						displayName: 'Icon',
						name: 'icon',
						type: 'string',
						default: '',
						description: 'Workspace icon URL or identifier',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'The name of the workspace',
					},
					{
						displayName: 'State',
						name: 'state',
						type: 'string',
						default: '',
						placeholder: 'NY',
						description: 'State/province for the workspace',
					},
					{
						displayName: 'Street Address',
						name: 'streetAddress',
						type: 'string',
						default: '',
						placeholder: '123 Main St',
						description: 'Street address for the workspace',
					},
					{
						displayName: 'Timezone',
						name: 'timezone',
						type: 'string',
						default: '',
						placeholder: 'America/New_York',
						description: 'Workspace timezone in IANA format',
					},
					{
						displayName: 'ZIP',
						name: 'zip',
						type: 'string',
						default: '',
						placeholder: '10001',
						description: 'ZIP/postal code for the workspace',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const workspaces = await nedzoApiRequest.call(this, 'GET', '/v1/workspaces');
				if (Array.isArray(workspaces)) {
					for (const workspace of workspaces) {
						returnData.push({
							name: workspace.name,
							value: workspace.id,
						});
					}
				}
				return returnData;
			},
			async getAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const workspaceId = this.getCurrentNodeParameter('workspaceId') as string;
				if (!workspaceId) {
					return returnData;
				}
				const agents = await nedzoApiRequest.call(this, 'GET', '/v1/agents', {}, { workspaceId });
				if (Array.isArray(agents)) {
					for (const agent of agents) {
						returnData.push({
							name: agent.name,
							value: agent.id,
						});
					}
				}
				return returnData;
			},
			async getAllAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// First get all workspaces
				const workspaces = await nedzoApiRequest.call(this, 'GET', '/v1/workspaces');
				if (Array.isArray(workspaces)) {
					// Then fetch agents for each workspace
					for (const workspace of workspaces) {
						const workspaceId = workspace.id;
						const workspaceName = workspace.name;
						// Fetch agents for this workspace
						const agents = await nedzoApiRequest.call(
							this,
							'GET',
							'/v1/agents',
							{},
							{ workspaceId },
						);
						if (Array.isArray(agents)) {
							for (const agent of agents) {
								// Include workspace name if multiple workspaces
								const agentName =
									workspaces.length > 1 ? `${agent.name} (${workspaceName})` : agent.name;
								returnData.push({
									name: agentName,
									value: agent.id,
								});
							}
						}
					}
				}
				return returnData;
			},
			async getContacts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const workspaceId = this.getCurrentNodeParameter('workspaceId') as string;
				if (!workspaceId) {
					return returnData;
				}
				const contacts = await nedzoApiRequest.call(
					this,
					'GET',
					'/v1/contacts',
					{},
					{ workspaceId },
				);
				if (Array.isArray(contacts)) {
					for (const contact of contacts) {
						// Build a display name from available fields
						let contactName = '';
						if (contact.firstName || contact.lastName) {
							contactName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
						} else if (contact.email) {
							contactName = contact.email;
						} else if (contact.phone) {
							contactName = contact.phone;
						} else {
							contactName = contact.id;
						}
						returnData.push({
							name: contactName,
							value: contact.id,
						});
					}
				}
				return returnData;
			},
			async getAllContacts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// Get workspaces accessible to the API key
				const workspaces = await nedzoApiRequest.call(this, 'GET', '/v1/workspaces');
				if (Array.isArray(workspaces)) {
					// Get contacts from each workspace
					for (const workspace of workspaces) {
						const contacts = await nedzoApiRequest.call(
							this,
							'GET',
							'/v1/contacts',
							{},
							{ workspaceId: workspace.id },
						);
						if (Array.isArray(contacts)) {
							for (const contact of contacts) {
								// Build a display name from available fields
								let contactName = '';
								if (contact.firstName || contact.lastName) {
									contactName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
								} else if (contact.email) {
									contactName = contact.email;
								} else if (contact.phone) {
									contactName = contact.phone;
								} else {
									contactName = contact.id;
								}
								// Include workspace name if multiple workspaces
								const displayName =
									workspaces.length > 1 ? `${contactName} (${workspace.name})` : contactName;
								returnData.push({
									name: displayName,
									value: contact.id,
								});
							}
						}
					}
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: unknown;

				// Agent
				if (resource === 'agent') {
					if (operation === 'create') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const agentType = this.getNodeParameter('agentType', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							workspaceId,
							name,
							agentType,
						};

						if (additionalFields.prompt) {
							body.prompt = additionalFields.prompt;
						}
						if (additionalFields.language) {
							body.language = additionalFields.language;
						}
						if (additionalFields.hipaaCompliance !== undefined) {
							body.hipaaCompliance = additionalFields.hipaaCompliance;
						}
						if (additionalFields.callDuration !== undefined) {
							body.callDuration = additionalFields.callDuration;
						}
						if (additionalFields.openingLine) {
							body.openingLine = additionalFields.openingLine;
						}
						if (additionalFields.voiceId) {
							body.voiceId = additionalFields.voiceId;
						}
						if (additionalFields.backgroundSound !== undefined) {
							body.backgroundSound = additionalFields.backgroundSound;
						}
						if (additionalFields.voicemail !== undefined) {
							body.voicemail = additionalFields.voicemail;
						}
						if (additionalFields.voicemailMessage) {
							body.voicemailMessage = additionalFields.voicemailMessage;
						}

						responseData = await nedzoApiRequest.call(this, 'POST', '/v1/agents', body);
					}

					if (operation === 'get') {
						const agentId = this.getNodeParameter('agentId', i) as string;
						responseData = await nedzoApiRequest.call(this, 'GET', `/v1/agents/${agentId}`);
					}

					if (operation === 'getAll') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const qs: IDataObject = {
							workspaceId,
						};

						if (additionalFields.includeDeleted) {
							qs.includeDeleted = 'true';
						}

						responseData = await nedzoApiRequest.call(this, 'GET', '/v1/agents', {}, qs);
					}

					if (operation === 'update') {
						const agentId = this.getNodeParameter('agentId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {};

						if (updateFields.name) {
							body.name = updateFields.name;
						}
						if (updateFields.prompt !== undefined) {
							body.prompt = updateFields.prompt;
						}
						if (updateFields.language !== undefined) {
							body.language = updateFields.language;
						}
						if (updateFields.voiceConfig) {
							body.voiceConfig =
								typeof updateFields.voiceConfig === 'string'
									? JSON.parse(updateFields.voiceConfig)
									: updateFields.voiceConfig;
						}
						if (updateFields.hipaaCompliance !== undefined) {
							body.hipaaCompliance = updateFields.hipaaCompliance;
						}
						if (updateFields.callDuration !== undefined) {
							body.callDuration = updateFields.callDuration;
						}

						responseData = await nedzoApiRequest.call(this, 'PATCH', `/v1/agents/${agentId}`, body);
					}

					if (operation === 'delete') {
						const agentId = this.getNodeParameter('agentId', i) as string;
						responseData = await nedzoApiRequest.call(this, 'DELETE', `/v1/agents/${agentId}`);
						if (!responseData) {
							responseData = { success: true, deleted: true, agentId };
						}
					}
				}

				// Call
				if (resource === 'call') {
					if (operation === 'create') {
						const agentId = this.getNodeParameter('agentId', i) as string;
						const callType = this.getNodeParameter('callType', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							agentId,
							type: callType,
						};

						if (callType === 'phoneNumber') {
							const phoneNumber = this.getNodeParameter('phoneNumber', i) as string;
							body.phoneNumber = phoneNumber;

							// Phone number specific fields
							if (additionalFields.firstName) {
								body.firstName = additionalFields.firstName;
							}
							if (additionalFields.lastName) {
								body.lastName = additionalFields.lastName;
							}
							if (additionalFields.email) {
								body.email = additionalFields.email;
							}
							if (additionalFields.businessName) {
								body.businessName = additionalFields.businessName;
							}
							if (additionalFields.customFields) {
								const customFields = additionalFields.customFields;
								body.customFields =
									typeof customFields === 'string' ? JSON.parse(customFields) : customFields;
							}
						} else if (callType === 'contact') {
							const contactId = this.getNodeParameter('contactId', i) as string;
							body.contactId = contactId;
						}

						if (additionalFields.variables) {
							const variables = additionalFields.variables;
							body.variables = typeof variables === 'string' ? JSON.parse(variables) : variables;
						}

						responseData = await nedzoApiRequest.call(this, 'POST', '/v1/call', body);
					}
				}

				// Contact
				if (resource === 'contact') {
					if (operation === 'create') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							workspaceId,
						};

						if (additionalFields.firstName) {
							body.firstName = additionalFields.firstName;
						}
						if (additionalFields.lastName) {
							body.lastName = additionalFields.lastName;
						}
						if (additionalFields.email) {
							body.email = additionalFields.email;
						}
						if (additionalFields.phone) {
							body.phone = additionalFields.phone;
						}

						responseData = await nedzoApiRequest.call(this, 'POST', '/v1/contacts', body);
					}

					if (operation === 'get') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						responseData = await nedzoApiRequest.call(this, 'GET', `/v1/contacts/${contactId}`);
					}

					if (operation === 'getAll') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const qs: IDataObject = {
							workspaceId,
						};

						if (additionalFields.includeDeleted) {
							qs.includeDeleted = 'true';
						}

						responseData = await nedzoApiRequest.call(this, 'GET', '/v1/contacts', {}, qs);
					}

					if (operation === 'update') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {};

						if (updateFields.firstName !== undefined) {
							body.firstName = updateFields.firstName;
						}
						if (updateFields.lastName !== undefined) {
							body.lastName = updateFields.lastName;
						}
						if (updateFields.email !== undefined) {
							body.email = updateFields.email;
						}
						if (updateFields.phone !== undefined) {
							body.phone = updateFields.phone;
						}

						responseData = await nedzoApiRequest.call(
							this,
							'PATCH',
							`/v1/contacts/${contactId}`,
							body,
						);
					}

					if (operation === 'delete') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						responseData = await nedzoApiRequest.call(this, 'DELETE', `/v1/contacts/${contactId}`);
						if (!responseData) {
							responseData = { success: true, deleted: true, contactId };
						}
					}
				}

				// Workspace
				if (resource === 'workspace') {
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							name,
						};

						if (additionalFields.description) {
							body.description = additionalFields.description;
						}
						if (additionalFields.timezone) {
							body.timezone = additionalFields.timezone;
						}
						if (additionalFields.icon) {
							body.icon = additionalFields.icon;
						}
						if (additionalFields.contactName) {
							body.contactName = additionalFields.contactName;
						}
						if (additionalFields.contactEmail) {
							body.contactEmail = additionalFields.contactEmail;
						}
						if (additionalFields.contactPhone) {
							body.contactPhone = additionalFields.contactPhone;
						}
						if (additionalFields.streetAddress) {
							body.streetAddress = additionalFields.streetAddress;
						}
						if (additionalFields.state) {
							body.state = additionalFields.state;
						}
						if (additionalFields.zip) {
							body.zip = additionalFields.zip;
						}
						if (additionalFields.country) {
							body.country = additionalFields.country;
						}
						if (additionalFields.businessRegistrationNumber) {
							body.businessRegistrationNumber = additionalFields.businessRegistrationNumber;
						}

						responseData = await nedzoApiRequest.call(this, 'POST', '/v1/workspaces', body);
					}

					if (operation === 'get') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						responseData = await nedzoApiRequest.call(this, 'GET', `/v1/workspaces/${workspaceId}`);
					}

					if (operation === 'getAll') {
						responseData = await nedzoApiRequest.call(this, 'GET', '/v1/workspaces');
					}

					if (operation === 'update') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {};

						if (updateFields.name) {
							body.name = updateFields.name;
						}
						if (updateFields.description !== undefined) {
							body.description = updateFields.description;
						}
						if (updateFields.timezone) {
							body.timezone = updateFields.timezone;
						}
						if (updateFields.icon !== undefined) {
							body.icon = updateFields.icon;
						}
						if (updateFields.contactName !== undefined) {
							body.contactName = updateFields.contactName;
						}
						if (updateFields.contactEmail !== undefined) {
							body.contactEmail = updateFields.contactEmail;
						}
						if (updateFields.contactPhone !== undefined) {
							body.contactPhone = updateFields.contactPhone;
						}
						if (updateFields.streetAddress !== undefined) {
							body.streetAddress = updateFields.streetAddress;
						}
						if (updateFields.state !== undefined) {
							body.state = updateFields.state;
						}
						if (updateFields.zip !== undefined) {
							body.zip = updateFields.zip;
						}
						if (updateFields.country !== undefined) {
							body.country = updateFields.country;
						}
						if (updateFields.businessRegistrationNumber !== undefined) {
							body.businessRegistrationNumber = updateFields.businessRegistrationNumber;
						}

						responseData = await nedzoApiRequest.call(
							this,
							'PATCH',
							`/v1/workspaces/${workspaceId}`,
							body,
						);
					}

					if (operation === 'delete') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						responseData = await nedzoApiRequest.call(
							this,
							'DELETE',
							`/v1/workspaces/${workspaceId}`,
						);
						if (!responseData) {
							responseData = { success: true, deleted: true, workspaceId };
						}
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject | IDataObject[]),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
