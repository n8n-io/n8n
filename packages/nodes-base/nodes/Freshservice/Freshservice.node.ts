import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	adjustAddress,
	adjustAgentRoles,
	formatFilters,
	freshserviceApiRequest,
	handleListing,
	sanitizeAssignmentScopeGroup,
	toArray,
	toOptions,
	toUserOptions,
	validateAssignmentScopeGroup,
	validateUpdateFields,
} from './GenericFunctions';

import {
	agentFields,
	agentGroupFields,
	agentGroupOperations,
	agentOperations,
	agentRoleFields,
	agentRoleOperations,
	announcementFields,
	announcementOperations,
	assetTypeFields,
	assetTypeOperations,
	changeFields,
	changeOperations,
	departmentFields,
	departmentOperations,
	locationFields,
	locationOperations,
	problemFields,
	problemOperations,
	productFields,
	productOperations,
	releaseFields,
	releaseOperations,
	requesterFields,
	requesterGroupFields,
	requesterGroupOperations,
	requesterOperations,
	softwareFields,
	softwareOperations,
	ticketFields,
	ticketOperations,
} from './descriptions';

import type { AddressFixedCollection, LoadedResource, LoadedUser, RolesParameter } from './types';

import { tz } from 'moment-timezone';

export class Freshservice implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Freshservice',
		name: 'freshservice',
		icon: 'file:freshservice.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Freshservice API',
		defaults: {
			name: 'Freshservice',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'freshserviceApi',
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
						name: 'Agent',
						value: 'agent',
					},
					{
						name: 'Agent Group',
						value: 'agentGroup',
					},
					{
						name: 'Agent Role',
						value: 'agentRole',
					},
					{
						name: 'Announcement',
						value: 'announcement',
					},
					// {
					// 	name: 'Asset',
					// 	value: 'asset',
					// },
					{
						name: 'Asset Type',
						value: 'assetType',
					},
					{
						name: 'Change',
						value: 'change',
					},
					{
						name: 'Department',
						value: 'department',
					},
					{
						name: 'Location',
						value: 'location',
					},
					{
						name: 'Problem',
						value: 'problem',
					},
					{
						name: 'Product',
						value: 'product',
					},
					{
						name: 'Release',
						value: 'release',
					},
					{
						name: 'Requester',
						value: 'requester',
					},
					{
						name: 'Requester Group',
						value: 'requesterGroup',
					},
					{
						name: 'Software',
						value: 'software',
					},
					{
						name: 'Ticket',
						value: 'ticket',
					},
				],
				default: 'agent',
			},
			...agentOperations,
			...agentFields,
			...agentGroupOperations,
			...agentGroupFields,
			...agentRoleOperations,
			...agentRoleFields,
			...announcementOperations,
			...announcementFields,
			// ...assetOperations,
			// ...assetFields,
			...assetTypeOperations,
			...assetTypeFields,
			...changeOperations,
			...changeFields,
			...departmentOperations,
			...departmentFields,
			...locationOperations,
			...locationFields,
			...problemOperations,
			...problemFields,
			...productOperations,
			...productFields,
			...releaseOperations,
			...releaseFields,
			...requesterOperations,
			...requesterFields,
			...requesterGroupOperations,
			...requesterGroupFields,
			...softwareOperations,
			...softwareFields,
			...ticketOperations,
			...ticketFields,
		],
	};

	methods = {
		loadOptions: {
			async getAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { agents } = (await freshserviceApiRequest.call(this, 'GET', '/agents')) as {
					agents: LoadedUser[];
				};
				return toUserOptions(agents.filter((agent) => agent.active));
			},

			async getAgentGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { groups } = (await freshserviceApiRequest.call(this, 'GET', '/groups')) as {
					groups: LoadedResource[];
				};
				return toOptions(groups);
			},

			async getAgentRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { roles } = (await freshserviceApiRequest.call(this, 'GET', '/roles')) as {
					roles: LoadedResource[];
				};
				return toOptions(roles);
			},

			async getAssetTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { asset_types } = (await freshserviceApiRequest.call(
					this,
					'GET',
					'/asset_types',
				)) as {
					asset_types: LoadedResource[];
				};
				return toOptions(asset_types);
			},

			async getAssetTypeFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const assetType = this.getCurrentNodeParameter('assetTypeId');
				const { asset_type_fields } = (await freshserviceApiRequest.call(
					this,
					'GET',
					`/asset_types/${assetType}/fields`,
				)) as {
					asset_type_fields: [{ fields: LoadedResource[] }];
				};

				let fields: any[] = [];
				fields = fields
					.concat(...asset_type_fields.map((data) => data.fields))
					.map((data) => ({ name: data.label, id: data.name }));
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				return toOptions(fields);
			},

			async getDepartments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { departments } = (await freshserviceApiRequest.call(
					this,
					'GET',
					'/departments',
				)) as {
					departments: LoadedResource[];
				};
				return toOptions(departments);
			},

			async getLocations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { locations } = (await freshserviceApiRequest.call(this, 'GET', '/locations')) as {
					locations: LoadedResource[];
				};
				return toOptions(locations);
			},

			async getRequesters(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { requesters } = (await freshserviceApiRequest.call(this, 'GET', '/requesters')) as {
					requesters: LoadedUser[];
				};
				return toUserOptions(requesters);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		const defaultTimezone = this.getTimezone();

		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'agent') {
					// **********************************************************************
					//                                 agent
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//              agent: create
						// ----------------------------------------

						const body = {
							email: this.getNodeParameter('email', i),
							first_name: this.getNodeParameter('firstName', i),
						} as IDataObject;

						const roles = this.getNodeParameter('roles', i) as RolesParameter;

						validateAssignmentScopeGroup.call(this, roles);
						sanitizeAssignmentScopeGroup.call(this, roles);

						Object.assign(body, adjustAgentRoles(roles));

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await freshserviceApiRequest.call(this, 'POST', '/agents', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//              agent: delete
						// ----------------------------------------

						const agentId = this.getNodeParameter('agentId', i);
						responseData = await freshserviceApiRequest.call(this, 'DELETE', `/agents/${agentId}`);
					} else if (operation === 'get') {
						// ----------------------------------------
						//                agent: get
						// ----------------------------------------

						const agentId = this.getNodeParameter('agentId', i);
						responseData = await freshserviceApiRequest.call(this, 'GET', `/agents/${agentId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//              agent: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i);

						if (Object.keys(filters).length) {
							Object.assign(qs, formatFilters(filters));
						}

						responseData = await handleListing.call(this, 'GET', '/agents', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//              agent: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						validateUpdateFields.call(this, updateFields, resource);

						Object.assign(body, updateFields);

						const agentId = this.getNodeParameter('agentId', i);
						responseData = await freshserviceApiRequest.call(
							this,
							'PUT',
							`/agents/${agentId}`,
							body,
						);
					}
				} else if (resource === 'agentGroup') {
					// **********************************************************************
					//                               agentGroup
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//            agentGroup: create
						// ----------------------------------------

						const body = {
							name: this.getNodeParameter('name', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await freshserviceApiRequest.call(this, 'POST', '/groups', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//            agentGroup: delete
						// ----------------------------------------

						const agentGroupId = this.getNodeParameter('agentGroupId', i);
						const endpoint = `/groups/${agentGroupId}`;
						responseData = await freshserviceApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//             agentGroup: get
						// ----------------------------------------

						const agentGroupId = this.getNodeParameter('agentGroupId', i);
						const endpoint = `/groups/${agentGroupId}`;
						responseData = await freshserviceApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//            agentGroup: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/groups');
					} else if (operation === 'update') {
						// ----------------------------------------
						//            agentGroup: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						validateUpdateFields.call(this, updateFields, resource);

						Object.assign(body, updateFields);

						const agentGroupId = this.getNodeParameter('agentGroupId', i);
						const endpoint = `/groups/${agentGroupId}`;
						responseData = await freshserviceApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'agentRole') {
					// **********************************************************************
					//                               agentRole
					// **********************************************************************

					if (operation === 'get') {
						// ----------------------------------------
						//              agentRole: get
						// ----------------------------------------

						const agentRoleId = this.getNodeParameter('agentRoleId', i);
						responseData = await freshserviceApiRequest.call(this, 'GET', `/roles/${agentRoleId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//            agentRole: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/roles');
					}
				} else if (resource === 'announcement') {
					// **********************************************************************
					//                              announcement
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//           announcement: create
						// ----------------------------------------

						const visibleFrom = this.getNodeParameter('visibleFrom', i) as string;

						const body = {
							title: this.getNodeParameter('title', i),
							body_html: this.getNodeParameter('bodyHtml', i),
							visibility: this.getNodeParameter('visibility', i),
							visible_from: tz(visibleFrom, defaultTimezone),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject & {
							additional_emails?: string;
							visible_till?: string;
						};

						if (Object.keys(additionalFields).length) {
							const { visible_till, additional_emails, ...rest } = additionalFields;

							Object.assign(body, {
								...(additional_emails && { additional_emails: toArray(additional_emails) }),
								...(visible_till && { visible_till: tz(visible_till, defaultTimezone) }),
								...rest,
							});
						}

						responseData = await freshserviceApiRequest.call(this, 'POST', '/announcements', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//           announcement: delete
						// ----------------------------------------

						const announcementId = this.getNodeParameter('announcementId', i);
						const endpoint = `/announcements/${announcementId}`;
						responseData = await freshserviceApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//            announcement: get
						// ----------------------------------------

						const announcementId = this.getNodeParameter('announcementId', i);

						const endpoint = `/announcements/${announcementId}`;
						responseData = await freshserviceApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//           announcement: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/announcements');
					} else if (operation === 'update') {
						// ----------------------------------------
						//           announcement: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject & {
							additional_emails?: string;
							visible_till?: string;
						};

						validateUpdateFields.call(this, updateFields, resource);

						const { visible_till, additional_emails, ...rest } = updateFields;

						Object.assign(body, {
							...(additional_emails && { additional_emails: toArray(additional_emails) }),
							...(visible_till && { visible_till: tz(visible_till, defaultTimezone) }),
							...rest,
						});

						const announcementId = this.getNodeParameter('announcementId', i);
						const endpoint = `/announcements/${announcementId}`;
						responseData = await freshserviceApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'asset') {
					// **********************************************************************
					//                                 asset
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//              asset: create
						// ----------------------------------------

						const body = {
							asset_type_id: this.getNodeParameter('assetTypeId', i),
							name: this.getNodeParameter('name', i),
						} as IDataObject;

						const assetFields = this.getNodeParameter(
							'assetFieldsUi.assetFieldValue',
							i,
							[],
						) as IDataObject[];

						Object.assign(body, {
							type_fields: assetFields.reduce(
								(obj, value) => Object.assign(obj, { [`${value.name}`]: value.value }),
								{},
							),
						});
						responseData = await freshserviceApiRequest.call(this, 'POST', '/assets', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//              asset: delete
						// ----------------------------------------

						const assetDisplayId = this.getNodeParameter('assetDisplayId', i);
						responseData = await freshserviceApiRequest.call(
							this,
							'DELETE',
							`/assets/${assetDisplayId}`,
						);
					} else if (operation === 'get') {
						// ----------------------------------------
						//                asset: get
						// ----------------------------------------

						const assetDisplayId = this.getNodeParameter('assetDisplayId', i);
						responseData = await freshserviceApiRequest.call(
							this,
							'GET',
							`/assets/${assetDisplayId}`,
						);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//              asset: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i);

						if (Object.keys(filters).length) {
							Object.assign(qs, formatFilters(filters));
						}

						responseData = await handleListing.call(this, 'GET', '/assets', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//              asset: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						validateUpdateFields.call(this, updateFields, resource);

						Object.assign(body, updateFields);

						const assetDisplayId = this.getNodeParameter('assetDisplayId', i);
						responseData = await freshserviceApiRequest.call(
							this,
							'PUT',
							`/assets/${assetDisplayId}`,
							body,
						);
					}
				} else if (resource === 'assetType') {
					// **********************************************************************
					//                               assetType
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//            assetType: create
						// ----------------------------------------

						const body = {
							name: this.getNodeParameter('name', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await freshserviceApiRequest.call(this, 'POST', '/asset_types', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//            assetType: delete
						// ----------------------------------------

						const assetTypeId = this.getNodeParameter('assetTypeId', i);

						const endpoint = `/asset_types/${assetTypeId}`;
						responseData = await freshserviceApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//              assetType: get
						// ----------------------------------------

						const assetTypeId = this.getNodeParameter('assetTypeId', i);
						const endpoint = `/asset_types/${assetTypeId}`;
						responseData = await freshserviceApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//            assetType: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/asset_types');
					} else if (operation === 'update') {
						// ----------------------------------------
						//            assetType: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						validateUpdateFields.call(this, updateFields, resource);

						Object.assign(body, updateFields);

						const assetTypeId = this.getNodeParameter('assetTypeId', i);
						const endpoint = `/asset_types/${assetTypeId}`;
						responseData = await freshserviceApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'change') {
					// **********************************************************************
					//                                 change
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//              change: create
						// ----------------------------------------

						const body = {
							requester_id: this.getNodeParameter('requesterId', i),
							subject: this.getNodeParameter('subject', i),
							planned_start_date: this.getNodeParameter('plannedStartDate', i),
							planned_end_date: this.getNodeParameter('plannedEndDate', i),
							status: 1,
							priority: 1,
							impact: 1,
							risk: 1,
							change_type: 1,
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await freshserviceApiRequest.call(this, 'POST', '/changes', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//              change: delete
						// ----------------------------------------

						const changeId = this.getNodeParameter('changeId', i);
						responseData = await freshserviceApiRequest.call(
							this,
							'DELETE',
							`/changes/${changeId}`,
						);
					} else if (operation === 'get') {
						// ----------------------------------------
						//               change: get
						// ----------------------------------------

						const changeId = this.getNodeParameter('changeId', i);
						responseData = await freshserviceApiRequest.call(this, 'GET', `/changes/${changeId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//              change: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i);

						if (Object.keys(filters).length) {
							Object.assign(qs, formatFilters(filters));
						}

						responseData = await handleListing.call(this, 'GET', '/changes', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//              change: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						validateUpdateFields.call(this, updateFields, resource);

						Object.assign(body, updateFields);

						const changeId = this.getNodeParameter('changeId', i);
						responseData = await freshserviceApiRequest.call(
							this,
							'PUT',
							`/changes/${changeId}`,
							body,
						);
					}
				} else if (resource === 'department') {
					// **********************************************************************
					//                               department
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//            department: create
						// ----------------------------------------

						const body = {
							name: this.getNodeParameter('name', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject & {
							domains?: string;
						};

						if (Object.keys(additionalFields).length) {
							const { domains, ...rest } = additionalFields;
							Object.assign(body, {
								...(domains && { domains: toArray(domains) }),
								...rest,
							});
						}

						responseData = await freshserviceApiRequest.call(this, 'POST', '/departments', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//            department: delete
						// ----------------------------------------

						const departmentId = this.getNodeParameter('departmentId', i);
						const endpoint = `/departments/${departmentId}`;
						responseData = await freshserviceApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//             department: get
						// ----------------------------------------

						const departmentId = this.getNodeParameter('departmentId', i);
						const endpoint = `/departments/${departmentId}`;
						responseData = await freshserviceApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//            department: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i);

						if (Object.keys(filters).length) {
							Object.assign(qs, formatFilters(filters));
						}

						responseData = await handleListing.call(this, 'GET', '/departments', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//            department: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject & {
							domains?: string;
						};

						validateUpdateFields.call(this, updateFields, resource);

						const { domains, ...rest } = updateFields;
						Object.assign(body, {
							...(domains && { domains: toArray(domains) }),
							...rest,
						});

						const departmentId = this.getNodeParameter('departmentId', i);
						const endpoint = `/departments/${departmentId}`;
						responseData = await freshserviceApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'location') {
					// **********************************************************************
					//                                location
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//             location: create
						// ----------------------------------------

						const body = {
							name: this.getNodeParameter('name', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject &
							AddressFixedCollection;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustAddress(additionalFields));
						}

						responseData = await freshserviceApiRequest.call(this, 'POST', '/locations', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//             location: delete
						// ----------------------------------------

						const locationId = this.getNodeParameter('locationId', i);
						const endpoint = `/locations/${locationId}`;
						responseData = await freshserviceApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//              location: get
						// ----------------------------------------

						const locationId = this.getNodeParameter('locationId', i);
						const endpoint = `/locations/${locationId}`;
						responseData = await freshserviceApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//             location: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/locations');
					} else if (operation === 'update') {
						// ----------------------------------------
						//             location: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						validateUpdateFields.call(this, updateFields, resource);

						Object.assign(body, adjustAddress(updateFields));

						const locationId = this.getNodeParameter('locationId', i);
						const endpoint = `/locations/${locationId}`;
						responseData = await freshserviceApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'problem') {
					// **********************************************************************
					//                                problem
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//             problem: create
						// ----------------------------------------

						const body = {
							subject: this.getNodeParameter('subject', i),
							requester_id: this.getNodeParameter('requesterId', i),
							due_by: this.getNodeParameter('dueBy', i),
							status: 1,
							priority: 1,
							impact: 1,
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await freshserviceApiRequest.call(this, 'POST', '/problems', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//             problem: delete
						// ----------------------------------------

						const problemId = this.getNodeParameter('problemId', i);
						const endpoint = `/problems/${problemId}`;
						responseData = await freshserviceApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//               problem: get
						// ----------------------------------------

						const problemId = this.getNodeParameter('problemId', i);
						const endpoint = `/problems/${problemId}`;
						responseData = await freshserviceApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//             problem: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/problems');
					} else if (operation === 'update') {
						// ----------------------------------------
						//             problem: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						validateUpdateFields.call(this, updateFields, resource);

						Object.assign(body, updateFields);

						const problemId = this.getNodeParameter('problemId', i);
						const endpoint = `/problems/${problemId}`;
						responseData = await freshserviceApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'product') {
					// **********************************************************************
					//                                product
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//             product: create
						// ----------------------------------------

						const body = {
							asset_type_id: this.getNodeParameter('assetTypeId', i),
							name: this.getNodeParameter('name', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await freshserviceApiRequest.call(this, 'POST', '/products', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//             product: delete
						// ----------------------------------------

						const productId = this.getNodeParameter('productId', i);

						const endpoint = `/products/${productId}`;
						responseData = await freshserviceApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//               product: get
						// ----------------------------------------

						const productId = this.getNodeParameter('productId', i);
						const endpoint = `/products/${productId}`;
						responseData = await freshserviceApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//             product: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/products');
					} else if (operation === 'update') {
						// ----------------------------------------
						//             product: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						Object.assign(body, updateFields);

						const productId = this.getNodeParameter('productId', i);
						const endpoint = `/products/${productId}`;
						responseData = await freshserviceApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'release') {
					// **********************************************************************
					//                                release
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//             release: create
						// ----------------------------------------

						const body = {
							subject: this.getNodeParameter('subject', i),
							release_type: this.getNodeParameter('releaseType', i),
							status: this.getNodeParameter('status', i),
							priority: this.getNodeParameter('priority', i),
							planned_start_date: this.getNodeParameter('plannedStartDate', i),
							planned_end_date: this.getNodeParameter('plannedEndDate', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await freshserviceApiRequest.call(this, 'POST', '/releases', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//             release: delete
						// ----------------------------------------

						const releaseId = this.getNodeParameter('releaseId', i);
						const endpoint = `/releases/${releaseId}`;
						responseData = await freshserviceApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//               release: get
						// ----------------------------------------

						const releaseId = this.getNodeParameter('releaseId', i);
						const endpoint = `/releases/${releaseId}`;
						responseData = await freshserviceApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//             release: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/releases');
					} else if (operation === 'update') {
						// ----------------------------------------
						//             release: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						Object.assign(body, updateFields);

						const releaseId = this.getNodeParameter('releaseId', i);
						const endpoint = `/releases/${releaseId}`;
						responseData = await freshserviceApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'requester') {
					// **********************************************************************
					//                               requester
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//            requester: create
						// ----------------------------------------

						const body = {
							first_name: this.getNodeParameter('firstName', i),
							primary_email: this.getNodeParameter('primaryEmail', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject & {
							secondary_emails?: string;
						};

						if (Object.keys(additionalFields).length) {
							const { secondary_emails, ...rest } = additionalFields;

							Object.assign(body, {
								...(secondary_emails && { secondary_emails: toArray(secondary_emails) }),
								...rest,
							});
						}

						responseData = await freshserviceApiRequest.call(this, 'POST', '/requesters', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//            requester: delete
						// ----------------------------------------

						const requesterId = this.getNodeParameter('requesterId', i);
						const endpoint = `/requesters/${requesterId}`;
						responseData = await freshserviceApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//              requester: get
						// ----------------------------------------

						const requesterId = this.getNodeParameter('requesterId', i);
						const endpoint = `/requesters/${requesterId}`;
						responseData = await freshserviceApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//            requester: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i);

						if (Object.keys(filters).length) {
							Object.assign(qs, formatFilters(filters));
						}

						responseData = await handleListing.call(this, 'GET', '/requesters', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//            requester: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject & {
							secondary_emails?: string;
						};

						validateUpdateFields.call(this, updateFields, resource);

						const { secondary_emails, ...rest } = updateFields;

						Object.assign(body, {
							...(secondary_emails && { secondary_emails: toArray(secondary_emails) }),
							...rest,
						});

						const requesterId = this.getNodeParameter('requesterId', i);
						const endpoint = `/requesters/${requesterId}`;
						responseData = await freshserviceApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'requesterGroup') {
					// **********************************************************************
					//                             requesterGroup
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//          requesterGroup: create
						// ----------------------------------------

						const body = {
							name: this.getNodeParameter('name', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await freshserviceApiRequest.call(
							this,
							'POST',
							'/requester_groups',
							body,
						);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//          requesterGroup: delete
						// ----------------------------------------

						const requesterGroupId = this.getNodeParameter('requesterGroupId', i);
						const endpoint = `/requester_groups/${requesterGroupId}`;
						responseData = await freshserviceApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//           requesterGroup: get
						// ----------------------------------------

						const requesterGroupId = this.getNodeParameter('requesterGroupId', i);
						const endpoint = `/requester_groups/${requesterGroupId}`;
						responseData = await freshserviceApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//          requesterGroup: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/requester_groups');
					} else if (operation === 'update') {
						// ----------------------------------------
						//          requesterGroup: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						validateUpdateFields.call(this, updateFields, resource);

						Object.assign(body, updateFields);

						const requesterGroupId = this.getNodeParameter('requesterGroupId', i);
						const endpoint = `/requester_groups/${requesterGroupId}`;
						responseData = await freshserviceApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'software') {
					// **********************************************************************
					//                                software
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//             software: create
						// ----------------------------------------

						const body = {
							application: {
								application_type: this.getNodeParameter('applicationType', i),
								name: this.getNodeParameter('name', i),
							},
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body.application!, additionalFields);
						}

						responseData = await freshserviceApiRequest.call(this, 'POST', '/applications', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//             software: delete
						// ----------------------------------------

						const softwareId = this.getNodeParameter('softwareId', i);
						const endpoint = `/applications/${softwareId}`;
						responseData = await freshserviceApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//              software: get
						// ----------------------------------------

						const softwareId = this.getNodeParameter('softwareId', i);
						const endpoint = `/applications/${softwareId}`;
						responseData = await freshserviceApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//             software: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/applications');
					} else if (operation === 'update') {
						// ----------------------------------------
						//             software: update
						// ----------------------------------------

						const body = { application: {} } as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						validateUpdateFields.call(this, updateFields, resource);

						Object.assign(body.application!, updateFields);

						const softwareId = this.getNodeParameter('softwareId', i);
						const endpoint = `/applications/${softwareId}`;
						responseData = await freshserviceApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'ticket') {
					// **********************************************************************
					//                                 ticket
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//              ticket: create
						// ----------------------------------------

						const body = {
							email: this.getNodeParameter('email', i),
							subject: this.getNodeParameter('subject', i),
							description: this.getNodeParameter('description', i),
							priority: this.getNodeParameter('priority', i),
							status: this.getNodeParameter('status', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject & {
							cc_emails?: string;
						};

						if (Object.keys(additionalFields).length) {
							const { cc_emails, ...rest } = additionalFields;

							Object.assign(body, {
								...(cc_emails && { cc_emails: toArray(cc_emails) }),
								...rest,
							});
						}

						responseData = await freshserviceApiRequest.call(this, 'POST', '/tickets', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//              ticket: delete
						// ----------------------------------------

						const ticketId = this.getNodeParameter('ticketId', i);
						responseData = await freshserviceApiRequest.call(
							this,
							'DELETE',
							`/tickets/${ticketId}`,
						);
					} else if (operation === 'get') {
						// ----------------------------------------
						//               ticket: get
						// ----------------------------------------

						const ticketId = this.getNodeParameter('ticketId', i);
						responseData = await freshserviceApiRequest.call(this, 'GET', `/tickets/${ticketId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//              ticket: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i);
						let endpoint = '';

						if (Object.keys(filters).length) {
							Object.assign(qs, formatFilters(filters));
							endpoint = '/tickets/filter';
						} else {
							endpoint = '/tickets';
						}

						responseData = await handleListing.call(this, 'GET', endpoint, {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//              ticket: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						validateUpdateFields.call(this, updateFields, resource);

						Object.assign(body, updateFields);

						const ticketId = this.getNodeParameter('ticketId', i);
						responseData = await freshserviceApiRequest.call(
							this,
							'PUT',
							`/tickets/${ticketId}`,
							body,
						);
					}
				}

				if (operation === 'delete' && !responseData) {
					responseData = { success: true };
				} else if (operation !== 'getAll') {
					const special: { [key: string]: string } = {
						agentGroup: 'group',
						agentRole: 'role',
						assetType: 'asset_type',
						requesterGroup: 'requester_group',
						software: 'application',
					};
					responseData = responseData[special[resource]] ?? responseData[resource];
				}
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

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		}

		return this.prepareOutputData(returnData);
	}
}
