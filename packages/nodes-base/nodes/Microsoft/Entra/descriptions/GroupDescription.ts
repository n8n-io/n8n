import merge from 'lodash/merge';
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
						postReceive: [
							handleErrorPostReceive,
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true } }}',
								},
							},
						],
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
						postReceive: [
							handleErrorPostReceive,
							{
								type: 'set',
								properties: {
									value: '={{ { "updated": true } }}',
								},
							},
						],
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
		displayName: 'Group Type',
		name: 'groupType',
		default: '',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Microsoft 365',
				value: 'Unified',
			},
			{
				name: 'Security',
				value: '',
			},
		],
		routing: {
			send: {
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						const groupType = this.getNodeParameter('groupType') as string;
						const body = requestOptions.body as IDataObject;
						if (groupType) {
							body.groupTypes ??= [] as string[];
							(body.groupTypes as string[]).push(groupType);
						} else {
							// Properties mailEnabled and securityEnabled are not visible for Security group, but are required. So we add them here.
							body.mailEnabled = false;
							body.securityEnabled = true;
						}
						return requestOptions;
					},
				],
			},
		},
		type: 'options',
	},
	{
		displayName: 'Group Name',
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
		displayName: 'Group Email Address',
		name: 'mailNickname',
		default: '',
		description: 'The mail alias for the group. Only enter the local-part without the domain.',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['create'],
			},
		},
		placeholder: 'e.g. alias',
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
						if (mailNickname?.includes('@')) {
							throw new NodeOperationError(
								this.getNode(),
								`'Group Email Address' should only include the local-part of the email address, without ${mailNickname.slice(mailNickname.indexOf('@'))}`,
							);
						}
						if (mailNickname?.length > 64) {
							throw new NodeOperationError(
								this.getNode(),
								"'Group Email Address' should have a maximum length of 64",
							);
						}
						if (mailNickname && !/^((?![@()\[\]"\\;:<> ,])[\x00-\x7F])*$/.test(mailNickname)) {
							throw new NodeOperationError(
								this.getNode(),
								"'Group Email Address' should only contain characters in the ASCII character set 0 - 127 except the following: @ () \\ [] \" ; : <> , SPACE",
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
				groupType: ['Unified'],
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
		displayName: 'Membership Type',
		name: 'membershipType',
		default: '',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Assigned',
				value: '',
				description:
					'Lets you add specific users as members of a group and have unique permissions',
			},
			{
				name: 'Dynamic',
				value: 'DynamicMembership',
				description: 'Lets you use rules to automatically add and remove users as members',
			},
		],
		routing: {
			send: {
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						const membershipType = this.getNodeParameter('membershipType') as string;
						if (membershipType) {
							const body = requestOptions.body as IDataObject;
							body.groupTypes ??= [] as string[];
							(body.groupTypes as string[]).push(membershipType);
						}
						return requestOptions;
					},
				],
			},
		},
		type: 'options',
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
				groupType: ['Unified'],
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
				displayName: 'Assignable to Role',
				name: 'isAssignableToRole',
				default: false,
				description: 'Whether Microsoft Entra roles can be assigned to the group',
				displayOptions: {
					hide: {
						'/membershipType': ['DynamicMembership'],
					},
				},
				routing: {
					send: {
						property: 'isAssignableToRole',
						type: 'body',
						preSend: [
							async function (
								this: IExecuteSingleFunctions,
								requestOptions: IHttpRequestOptions,
							): Promise<IHttpRequestOptions> {
								const isAssignableToRole = this.getNodeParameter(
									'additionalFields.isAssignableToRole',
								) as boolean;
								if (isAssignableToRole) {
									const securityEnabled = this.getNodeParameter('securityEnabled', true) as boolean;
									const visibility = this.getNodeParameter(
										'additionalFields.visibility',
										'',
									) as string;
									const groupType = this.getNodeParameter('groupType') as string;
									const mailEnabled = this.getNodeParameter('mailEnabled', false) as boolean;
									if (!securityEnabled) {
										throw new NodeOperationError(
											this.getNode(),
											"'Security Enabled' must be set to true if 'Assignable to Role' is set",
										);
									}
									if (visibility !== 'Private') {
										throw new NodeOperationError(
											this.getNode(),
											"'Visibility' must be set to 'Private' if 'Assignable to Role' is set",
										);
									}
									if (groupType === 'Unified' && !mailEnabled) {
										throw new NodeOperationError(
											this.getNode(),
											"'Mail Enabled' must be set to true if 'Assignable to Role' is set",
										);
									}
								}
								return requestOptions;
							},
						],
					},
				},
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
				displayName: 'Membership Rule',
				name: 'membershipRule',
				default: '',
				description:
					'The <a href="https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-membership">dynamic membership rules</a>',
				displayOptions: {
					show: {
						'/membershipType': ['DynamicMembership'],
					},
				},
				placeholder: 'e.g. user.department -eq "Marketing"',
				routing: {
					send: {
						property: 'membershipRule',
						type: 'body',
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Membership Rule Processing State',
				name: 'membershipRuleProcessingState',
				default: 'On',
				description: 'Indicates whether the dynamic membership processing is on or paused',
				displayOptions: {
					show: {
						'/membershipType': ['DynamicMembership'],
					},
				},
				options: [
					{
						name: 'On',
						value: 'On',
					},
					{
						name: 'Paused',
						value: 'Paused',
					},
				],
				routing: {
					send: {
						property: 'membershipRuleProcessingState',
						type: 'body',
					},
				},
				type: 'options',
				validateType: 'options',
			},
			{
				displayName: 'Preferred Data Location',
				name: 'preferredDataLocation',
				default: '',
				description:
					'A property set for the group that Office 365 services use to provision the corresponding data-at-rest resources (mailbox, OneDrive, groups sites, and so on)',
				displayOptions: {
					show: {
						'/groupType': ['Unified'],
					},
				},
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
							delete fields.isAssignableToRole;
							delete fields.membershipRule;
							delete fields.membershipRuleProcessingState;
							if (Object.keys(fields).length) {
								const body: IDataObject = {
									...fields,
								};
								if (body.assignedLabels) {
									body.assignedLabels = [(body.assignedLabels as IDataObject).labelValues];
								}

								try {
									await microsoftApiRequest.call(this, 'PATCH', `/groups/${groupId}`, body);
									merge(item.json, body);
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
		displayName: 'Output',
		name: 'output',
		default: 'simple',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['get'],
			},
		},
		options: [
			{
				name: 'Simplified',
				value: 'simple',
				routing: {
					send: {
						property: '$select',
						type: 'query',
						value:
							'id,createdDateTime,description,displayName,mail,mailEnabled,mailNickname,securityEnabled,securityIdentifier,visibility',
					},
				},
			},
			{
				name: 'Raw',
				value: 'raw',
			},
			{
				name: 'Selected Fields',
				value: 'fields',
			},
		],
		type: 'options',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Fields',
		name: 'fields',
		default: [],
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
		description: 'The fields to add to the output',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['get'],
				output: ['fields'],
			},
		},
		routing: {
			send: {
				property: '$select',
				type: 'query',
				value: '={{ $value.concat("id").join(",") }}',
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getGroupProperties',
		},
		type: 'multiOptions',
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
				displayName: 'Include Members',
				name: 'includeMembers',
				default: false,
				routing: {
					send: {
						property: '$expand',
						type: 'query',
						value:
							'={{ $value ? "members($select=id,accountEnabled,createdDateTime,displayName,employeeId,mail,securityIdentifier,userPrincipalName,userType)" : undefined }}',
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
		displayName: 'Filter',
		name: 'filter',
		default: '',
		description:
			'<a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter">Query parameter</a> to filter results by',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getAll'],
			},
		},
		hint: 'If empty, all the groups will be returned',
		placeholder: "e.g. startswith(displayName, 'a')",
		routing: {
			send: {
				property: '$filter',
				type: 'query',
				value: '={{ $value ? $value : undefined }}',
			},
		},
		type: 'string',
		validateType: 'string',
	},
	{
		displayName: 'Output',
		name: 'output',
		default: 'simple',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				name: 'Simplified',
				value: 'simple',
				routing: {
					send: {
						property: '$select',
						type: 'query',
						value:
							'id,createdDateTime,description,displayName,mail,mailEnabled,mailNickname,securityEnabled,securityIdentifier,visibility',
					},
				},
			},
			{
				name: 'Raw',
				value: 'raw',
			},
			{
				name: 'Selected Fields',
				value: 'fields',
			},
		],
		type: 'options',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Fields',
		name: 'fields',
		default: [],
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
		description: 'The fields to add to the output',
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getAll'],
				output: ['fields'],
			},
		},
		routing: {
			send: {
				property: '$select',
				type: 'query',
				value: '={{ $value.concat("id").join(",") }}',
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getGroupPropertiesGetAll',
		},
		type: 'multiOptions',
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
				description:
					'Whether people external to the organization can send messages to the group. Wait a few seconds before editing this field in a newly created group.',
				type: 'boolean',
				validateType: 'boolean',
			},
			{
				displayName: 'Auto Subscribe New Members',
				name: 'autoSubscribeNewMembers',
				default: false,
				description:
					'Whether new members added to the group will be auto-subscribed to receive email notifications. Wait a few seconds before editing this field in a newly created group.',
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
				displayName: 'Group Name',
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
				displayName: 'Group Email Address',
				name: 'mailNickname',
				default: '',
				description: 'The mail alias for the group. Only enter the local-part without the domain.',
				placeholder: 'e.g. alias',
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
								if (mailNickname?.includes('@')) {
									throw new NodeOperationError(
										this.getNode(),
										`'Group Email Address' should only include the local-part of the email address, without ${mailNickname.slice(mailNickname.indexOf('@'))}`,
									);
								}
								if (mailNickname?.length > 64) {
									throw new NodeOperationError(
										this.getNode(),
										"'Group Email Address' should have a maximum length of 64",
									);
								}
								if (mailNickname && !/^((?![@()\[\]"\\;:<> ,])[\x00-\x7F])*$/.test(mailNickname)) {
									throw new NodeOperationError(
										this.getNode(),
										"'Group Email Address' should only contain characters in the ASCII character set 0 - 127 except the following: @ () \\ [] \" ; : <> , SPACE",
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
				displayName: 'Membership Rule',
				name: 'membershipRule',
				default: '',
				description:
					'The <a href="https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-membership">dynamic membership rules</a>',
				placeholder: 'e.g. user.department -eq "Marketing"',
				routing: {
					send: {
						property: 'membershipRule',
						type: 'body',
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Membership Rule Processing State',
				name: 'membershipRuleProcessingState',
				default: 'On',
				description: 'Indicates whether the dynamic membership processing is on or paused',
				options: [
					{
						name: 'On',
						value: 'On',
					},
					{
						name: 'Paused',
						value: 'Paused',
					},
				],
				routing: {
					send: {
						property: 'membershipRuleProcessingState',
						type: 'body',
					},
				},
				type: 'options',
				validateType: 'options',
			},
			{
				displayName: 'Preferred Data Location',
				name: 'preferredDataLocation',
				default: '',
				description:
					'A property set for the group that Office 365 services use to provision the corresponding data-at-rest resources (mailbox, OneDrive, groups sites, and so on)',
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
