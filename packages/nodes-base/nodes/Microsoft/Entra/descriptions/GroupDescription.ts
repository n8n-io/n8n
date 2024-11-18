import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { handleErrorPostReceive, microsoftApiRequest } from '../GenericFunctions';

export const groupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['group'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a group',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'POST',
						url: '/groups',
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
				action: 'Create group',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a group',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'DELETE',
						url: '=/groups/{{ $parameter["group"] }}',
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
				action: 'Delete group',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve data for a specific group',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						url: '=/groups/{{ $parameter["group"] }}',
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
				action: 'Get group',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of groups',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						url: '/groups',
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							{
								type: 'rootProperty',
								properties: {
									property: 'value',
								},
							},
						],
					},
				},
				action: 'Get many groups',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a group',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'PATCH',
						url: '=/groups/{{ $parameter["group"] }}',
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
				action: 'Update group',
			},
		],
		default: 'getAll',
	},
];

const createFields: INodeProperties[] = [
	{
		displayName: 'Display Name',
		name: 'displayName',
		default: '',
		description: 'The name to display in the address book for the group',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['create'],
			},
		},
		required: true,
		routing: {
			send: {
				property: 'displayName',
				type: 'body',
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						const displayName = this.getNodeParameter('displayName') as string;
						if (displayName?.length > 256) {
							throw new NodeOperationError(
								this.getNode(),
								"'Display Name' should have a maximum length of 256",
							);
						}
						return requestOptions;
					},
				],
			},
		},
		type: 'string',
		validateType: 'string',
	},
	{
		displayName: 'Mail Enabled',
		name: 'mailEnabled',
		default: false,
		description: 'Whether the group is mail-enabled',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['create'],
			},
		},
		required: true,
		routing: {
			send: {
				property: 'mailEnabled',
				type: 'body',
			},
		},
		type: 'boolean',
		validateType: 'boolean',
	},
	{
		displayName: 'Mail Nickname',
		name: 'mailNickname',
		default: '',
		description: 'The mail alias for the group',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['create'],
			},
		},
		required: true,
		routing: {
			send: {
				property: 'mailNickname',
				type: 'body',
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						const mailNickname = this.getNodeParameter('mailNickname') as string;
						if (mailNickname?.length > 64) {
							throw new NodeOperationError(
								this.getNode(),
								"'Mail Nickname' should have a maximum length of 64",
							);
						}
						if (mailNickname && !/^((?![@()\[\]"\\;:<> ,])[\x00-\x7F])*$/.test(mailNickname)) {
							throw new NodeOperationError(
								this.getNode(),
								"'Mail Nickname' should only contain characters in the ASCII character set 0 - 127 except the following: @ () \\ [] \" ; : <> , SPACE",
							);
						}
						return requestOptions;
					},
				],
			},
		},
		type: 'string',
		validateType: 'string',
	},
	{
		displayName: 'Security Enabled',
		name: 'securityEnabled',
		default: true,
		description: 'Whether the group is a security group',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				property: 'securityEnabled',
				type: 'body',
			},
		},
		type: 'boolean',
		validateType: 'boolean',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		default: {},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Allow External Senders',
				name: 'allowExternalSenders',
				default: false,
				description: 'Whether people external to the organization can send messages to the group',
				type: 'boolean',
				validateType: 'boolean',
			},
			{
				displayName: 'Assigned Label',
				name: 'assignedLabels',
				default: [],
				description: 'List of sensitivity label pairs associated with the group',
				options: [
					{
						displayName: 'Label',
						name: 'labelValues',
						values: [
							{
								displayName: 'Display Name',
								name: 'displayName',
								default: '',
								description: 'The display name of the label',
								type: 'string',
							},
							{
								displayName: 'Label ID',
								name: 'labelId',
								default: '',
								description: 'The unique identifier of the label',
								type: 'string',
							},
						],
					},
				],
				type: 'fixedCollection',
			},
			{
				displayName: 'Auto Subscribe New Members',
				name: 'autoSubscribeNewMembers',
				default: false,
				description:
					'Whether new members added to the group will be auto-subscribed to receive email notifications',
				type: 'boolean',
				validateType: 'boolean',
			},
			{
				displayName: 'Description',
				name: 'description',
				default: '',
				description: 'Description for the group',
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Preferred Data Location',
				name: 'preferredDataLocation',
				default: '',
				description: 'The preferred data location for the group',
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Unique Name',
				name: 'uniqueName',
				default: '',
				description:
					'The unique identifier for the group, can only be updated if null, and is immutable once set',
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Visibility',
				name: 'visibility',
				default: 'Public',
				description: 'Specifies the visibility of the group',
				options: [
					{
						name: 'Private',
						value: 'Private',
					},
					{
						name: 'Public',
						value: 'Public',
					},
				],
				type: 'options',
				validateType: 'options',
			},
		],
		placeholder: 'Add Field',
		routing: {
			output: {
				postReceive: [
					async function (
						this: IExecuteSingleFunctions,
						items: INodeExecutionData[],
						_response: IN8nHttpFullResponse,
					): Promise<INodeExecutionData[]> {
						for (const item of items) {
							const groupId = item.json.id as string;
							const fields = this.getNodeParameter('additionalFields', item.index) as IDataObject;
							if (Object.keys(fields).length) {
								const body: IDataObject = {
									...fields,
								};
								if (body.assignedLabels) {
									body.assignedLabels = [(body.assignedLabels as IDataObject).labelValues];
								}

								// To update the following properties, you must specify them in their own PATCH request, without including the other properties
								const separateProperties = [
									'allowExternalSenders',
									'autoSubscribeNewMembers',
									// 'hideFromAddressLists',
									// 'hideFromOutlookClients',
									// 'isSubscribedByMail',
									// 'unseenCount',
								];
								const separateBody: IDataObject = {};
								for (const [key, value] of Object.entries(body)) {
									if (separateProperties.includes(key)) {
										separateBody[key] = value;
										delete body[key];
									}
								}

								try {
									if (Object.keys(body).length) {
										await microsoftApiRequest.call(this, 'PATCH', `/groups/${groupId}`, body);
										Object.assign(item.json, body);
									}
									if (Object.keys(separateBody).length) {
										await microsoftApiRequest.call(
											this,
											'PATCH',
											`/groups/${groupId}`,
											separateBody,
										);
										Object.assign(item.json, separateBody);
									}
								} catch (error) {
									try {
										await microsoftApiRequest.call(this, 'DELETE', `/groups/${groupId}`);
									} catch {}
									throw error;
								}
							}
						}
						return items;
					},
				],
			},
		},
		type: 'collection',
	},
];

const deleteFields: INodeProperties[] = [
	{
		displayName: 'Group to Delete',
		name: 'group',
		default: {
			mode: 'list',
			value: '',
		},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['delete'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getGroups',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				placeholder: 'e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
];

const getFields: INodeProperties[] = [
	{
		displayName: 'Group to Get',
		name: 'group',
		default: {
			mode: 'list',
			value: '',
		},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getGroups',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				placeholder: 'e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Options',
		name: 'options',
		default: {},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['get'],
			},
		},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Fields',
				name: 'select',
				default: [],
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
				description: 'The fields to add to the output',
				routing: {
					send: {
						property: '$select',
						type: 'query',
						value: '={{ $value?.join(",") }}',
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getGroupProperties',
				},
				type: 'multiOptions',
			},
			{
				displayName: 'Include Members',
				name: 'includeMembers',
				default: false,
				routing: {
					send: {
						property: '$expand',
						type: 'query',
						value: '={{ $value ? "members" : undefined }}',
					},
				},
				type: 'boolean',
				validateType: 'boolean',
			},
		],
		placeholder: 'Add Option',
		type: 'collection',
	},
];

const getAllFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getAll'],
			},
		},
		routing: {
			send: {
				paginate: '={{ $value }}',
			},
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: '={{ !!$response.body?.["@odata.nextLink"] }}',
						request: {
							url: '={{ $response.body?.["@odata.nextLink"] ?? $request.url }}',
							qs: {
								$filter:
									'={{ !!$response.body?.["@odata.nextLink"] ? undefined : $request.qs?.$filter }}',
								$select:
									'={{ !!$response.body?.["@odata.nextLink"] ? undefined : $request.qs?.$select }}',
							},
						},
					},
				},
			},
		},
		type: 'boolean',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		routing: {
			send: {
				property: '$top',
				type: 'query',
				value: '={{ $value }}',
			},
		},
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		validateType: 'number',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		default: {},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Filter Query Parameter',
				name: 'filter',
				default: '',
				description:
					'<a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter">Query parameter</a> to filter results by',
				placeholder: "startswith(displayName, 'a')",
				routing: {
					send: {
						property: '$filter',
						type: 'query',
					},
				},
				type: 'string',
				validateType: 'string',
			},
		],
		placeholder: 'Add Filter',
		type: 'collection',
	},
	{
		displayName: 'Options',
		name: 'options',
		default: {},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Fields',
				name: 'select',
				default: [],
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
				description: 'The fields to add to the output',
				routing: {
					send: {
						property: '$select',
						type: 'query',
						value: '={{ $value?.join(",") }}',
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getGroupProperties',
				},
				type: 'multiOptions',
			},
		],
		placeholder: 'Add Option',
		type: 'collection',
	},
];

const updateFields: INodeProperties[] = [
	{
		displayName: 'Group to Update',
		name: 'group',
		default: {
			mode: 'list',
			value: '',
		},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['update'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getGroups',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				placeholder: 'e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		default: {},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Allow External Senders',
				name: 'allowExternalSenders',
				default: false,
				description: 'Whether people external to the organization can send messages to the group',
				type: 'boolean',
				validateType: 'boolean',
			},
			{
				displayName: 'Assigned Label',
				name: 'assignedLabels',
				default: [],
				description: 'List of sensitivity label pairs associated with the group',
				options: [
					{
						displayName: 'Label',
						name: 'labelValues',
						values: [
							{
								displayName: 'Display Name',
								name: 'displayName',
								default: '',
								description: 'The display name of the label',
								routing: {
									send: {
										property: '=assignedLabels[{{$index}}].displayName',
										type: 'body',
									},
								},
								type: 'string',
							},
							{
								displayName: 'Label ID',
								name: 'labelId',
								default: '',
								description: 'The unique identifier of the label',
								routing: {
									send: {
										property: '=assignedLabels[{{$index}}].labelId',
										type: 'body',
									},
								},
								type: 'string',
							},
						],
					},
				],
				type: 'fixedCollection',
			},
			{
				displayName: 'Auto Subscribe New Members',
				name: 'autoSubscribeNewMembers',
				default: false,
				description:
					'Whether new members added to the group will be auto-subscribed to receive email notifications',
				type: 'boolean',
				validateType: 'boolean',
			},
			{
				displayName: 'Description',
				name: 'description',
				default: '',
				description: 'Description for the group',
				routing: {
					send: {
						property: 'description',
						type: 'body',
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Display Name',
				name: 'displayName',
				default: '',
				description: 'The name to display in the address book for the group',
				routing: {
					send: {
						property: 'displayName',
						type: 'body',
						preSend: [
							async function (
								this: IExecuteSingleFunctions,
								requestOptions: IHttpRequestOptions,
							): Promise<IHttpRequestOptions> {
								const displayName = this.getNodeParameter('updateFields.displayName') as string;
								if (displayName?.length > 256) {
									throw new NodeOperationError(
										this.getNode(),
										"'Display Name' should have a maximum length of 256",
									);
								}
								return requestOptions;
							},
						],
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Mail Nickname',
				name: 'mailNickname',
				default: '',
				description: 'The mail alias for the group',
				routing: {
					send: {
						property: 'mailNickname',
						type: 'body',
						preSend: [
							async function (
								this: IExecuteSingleFunctions,
								requestOptions: IHttpRequestOptions,
							): Promise<IHttpRequestOptions> {
								const mailNickname = this.getNodeParameter('updateFields.mailNickname') as string;
								if (mailNickname?.length > 64) {
									throw new NodeOperationError(
										this.getNode(),
										'Mail Nickname should have a maximum length of 64',
									);
								}
								if (mailNickname && !/^((?![@()\[\]"\\;:<> ,])[\x00-\x7F])*$/.test(mailNickname)) {
									throw new NodeOperationError(
										this.getNode(),
										"'Mail Nickname' should only contain characters in the ASCII character set 0 - 127 except the following: @ () \\ [] \" ; : <> , SPACE",
									);
								}
								return requestOptions;
							},
						],
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Preferred Data Location',
				name: 'preferredDataLocation',
				default: '',
				description: 'The preferred data location for the group',
				routing: {
					send: {
						property: 'preferredDataLocation',
						type: 'body',
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Security Enabled',
				name: 'securityEnabled',
				default: true,
				description: 'Whether the group is a security group',
				routing: {
					send: {
						property: 'securityEnabled',
						type: 'body',
					},
				},
				type: 'boolean',
				validateType: 'boolean',
			},
			{
				displayName: 'Unique Name',
				name: 'uniqueName',
				default: '',
				description:
					'The unique identifier for the group, can only be updated if null, and is immutable once set',
				routing: {
					send: {
						property: 'uniqueName',
						type: 'body',
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Visibility',
				name: 'visibility',
				default: 'Public',
				description: 'Specifies the visibility of the group',
				options: [
					{
						name: 'Private',
						value: 'Private',
					},
					{
						name: 'Public',
						value: 'Public',
					},
				],
				routing: {
					send: {
						property: 'visibility',
						type: 'body',
					},
				},
				type: 'options',
				validateType: 'options',
			},
		],
		placeholder: 'Add Field',
		routing: {
			output: {
				postReceive: [
					async function (
						this: IExecuteSingleFunctions,
						items: INodeExecutionData[],
						_response: IN8nHttpFullResponse,
					): Promise<INodeExecutionData[]> {
						for (const item of items) {
							const groupId = this.getNodeParameter('group.value', item.index) as string;
							const fields = this.getNodeParameter('updateFields', item.index) as IDataObject;
							// To update the following properties, you must specify them in their own PATCH request, without including the other properties
							const separateProperties = [
								'allowExternalSenders',
								'autoSubscribeNewMembers',
								// 'hideFromAddressLists',
								// 'hideFromOutlookClients',
								// 'isSubscribedByMail',
								// 'unseenCount',
							];
							const separateFields = Object.keys(fields)
								.filter((key) => separateProperties.includes(key))
								.reduce((obj, key) => {
									return {
										...obj,
										[key]: fields[key],
									};
								}, {});
							if (Object.keys(separateFields).length) {
								const body: IDataObject = {
									...separateFields,
								};
								await microsoftApiRequest.call(this, 'PATCH', `/groups/${groupId}`, body);
							}
						}
						return items;
					},
				],
			},
		},
		type: 'collection',
	},
];

export const groupFields: INodeProperties[] = [
	...createFields,
	...deleteFields,
	...getFields,
	...getAllFields,
	...updateFields,
];
