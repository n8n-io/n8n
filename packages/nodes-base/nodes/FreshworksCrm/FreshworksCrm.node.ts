import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	adjustAccounts,
	adjustAttendees,
	freshworksCrmApiRequest,
	getAllItemsViewId,
	handleListing,
	loadResource,
	throwOnEmptyUpdate,
} from './GenericFunctions';

import {
	accountFields,
	accountOperations,
	appointmentFields,
	appointmentOperations,
	contactFields,
	contactOperations,
	dealFields,
	dealOperations,
	noteFields,
	noteOperations,
	salesActivityFields,
	salesActivityOperations,
	searchFields,
	searchOperations,
	taskFields,
	taskOperations,
} from './descriptions';

import type { FreshworksConfigResponse, LoadedCurrency, LoadedUser, LoadOption } from './types';

import { tz } from 'moment-timezone';

export class FreshworksCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Freshworks CRM',
		name: 'freshworksCrm',
		icon: 'file:freshworksCrm.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Freshworks CRM API',
		defaults: {
			name: 'Freshworks CRM',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'freshworksCrmApi',
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
						name: 'Account',
						value: 'account',
					},
					{
						name: 'Appointment',
						value: 'appointment',
					},
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Deal',
						value: 'deal',
					},
					{
						name: 'Note',
						value: 'note',
					},
					{
						name: 'Sales Activity',
						value: 'salesActivity',
					},
					{
						name: 'Search',
						value: 'search',
					},
					{
						name: 'Task',
						value: 'task',
					},
				],
				default: 'account',
			},
			...accountOperations,
			...accountFields,
			...appointmentOperations,
			...appointmentFields,
			...contactOperations,
			...contactFields,
			...dealOperations,
			...dealFields,
			...noteOperations,
			...noteFields,
			...salesActivityOperations,
			...salesActivityFields,
			...searchOperations,
			...searchFields,
			...taskOperations,
			...taskFields,
		],
	};

	methods = {
		loadOptions: {
			async getAccounts(this: ILoadOptionsFunctions) {
				const viewId = await getAllItemsViewId.call(this, { fromLoadOptions: true });
				const responseData = await handleListing.call(
					this,
					'GET',
					`/sales_accounts/view/${viewId}`,
				);

				return responseData.map(({ name, id }) => ({ name, value: id })) as LoadOption[];
			},

			async getAccountViews(this: ILoadOptionsFunctions) {
				const responseData = await handleListing.call(this, 'GET', '/sales_accounts/filters');
				return responseData.map(({ name, id }) => ({ name, value: id })) as LoadOption[];
			},

			async getBusinessTypes(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'business_types');
			},

			async getCampaigns(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'campaigns');
			},

			async getContactStatuses(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'contact_statuses');
			},

			async getContactViews(this: ILoadOptionsFunctions) {
				const responseData = await handleListing.call(this, 'GET', '/contacts/filters');

				return responseData.map(({ name, id }) => ({ name, value: id })) as LoadOption[];
			},

			async getCurrencies(this: ILoadOptionsFunctions) {
				const response = (await freshworksCrmApiRequest.call(
					this,
					'GET',
					'/selector/currencies',
				)) as FreshworksConfigResponse<LoadedCurrency>;

				const key = Object.keys(response)[0];

				return response[key].map(({ currency_code, id }) => ({ name: currency_code, value: id }));
			},

			async getDealPaymentStatuses(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'deal_payment_statuses');
			},

			async getDealPipelines(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'deal_pipelines');
			},

			async getDealProducts(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'deal_products');
			},

			async getDealReasons(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'deal_reasons');
			},

			async getDealStages(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'deal_stages');
			},

			async getDealTypes(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'deal_types');
			},

			async getDealViews(this: ILoadOptionsFunctions) {
				const responseData = await handleListing.call(this, 'GET', '/deals/filters');

				return responseData.map(({ name, id }) => ({ name, value: id })) as LoadOption[];
			},

			async getIndustryTypes(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'industry_types');
			},

			async getLifecycleStages(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'lifecycle_stages');
			},

			async getOutcomes(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'sales_activity_outcomes');
			},

			async getSalesActivityTypes(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'sales_activity_types');
			},

			async getTerritories(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'territories');
			},

			async getUsers(this: ILoadOptionsFunctions) {
				// for attendees, owners, and creators
				const response = (await freshworksCrmApiRequest.call(
					this,
					'GET',
					'/selector/owners',
				)) as FreshworksConfigResponse<LoadedUser>;

				const key = Object.keys(response)[0];

				return response[key].map(({ display_name, id }) => ({ name: display_name, value: id }));
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
				if (resource === 'account') {
					// **********************************************************************
					//                                account
					// **********************************************************************

					// https://developers.freshworks.com/crm/api/#accounts

					if (operation === 'create') {
						// ----------------------------------------
						//             account: create
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#create_account

						const body = {
							name: this.getNodeParameter('name', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await freshworksCrmApiRequest.call(
							this,
							'POST',
							'/sales_accounts',
							body,
						);
						responseData = responseData.sales_account;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//             account: delete
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#delete_account

						const accountId = this.getNodeParameter('accountId', i);

						const endpoint = `/sales_accounts/${accountId}`;
						await freshworksCrmApiRequest.call(this, 'DELETE', endpoint);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//               account: get
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#view_account

						const accountId = this.getNodeParameter('accountId', i);

						const endpoint = `/sales_accounts/${accountId}`;
						responseData = await freshworksCrmApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.sales_account;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//             account: getAll
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#list_all_accounts

						const view = this.getNodeParameter('view', i) as string;

						responseData = await handleListing.call(this, 'GET', `/sales_accounts/view/${view}`);
					} else if (operation === 'update') {
						// ----------------------------------------
						//             account: update
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#update_a_account

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const accountId = this.getNodeParameter('accountId', i);

						const endpoint = `/sales_accounts/${accountId}`;
						responseData = await freshworksCrmApiRequest.call(this, 'PUT', endpoint, body);
						responseData = responseData.sales_account;
					}
				} else if (resource === 'appointment') {
					// **********************************************************************
					//                              appointment
					// **********************************************************************

					// https://developers.freshworks.com/crm/api/#appointments

					if (operation === 'create') {
						// ----------------------------------------
						//           appointment: create
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#create_appointment

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject & {
							time_zone: string;
							is_allday: boolean;
						};

						const startDate = this.getNodeParameter('fromDate', i) as string;
						const endDate = this.getNodeParameter('endDate', i) as string;
						const attendees = this.getNodeParameter('attendees.attendee', i, []) as [
							{ type: string; contactId: string; userId: string },
						];

						const timezone = additionalFields.time_zone ?? defaultTimezone;

						let allDay = false;

						if (additionalFields.is_allday) {
							allDay = additionalFields.is_allday as boolean;
						}

						const start = tz(startDate, timezone);
						const end = tz(endDate, timezone);

						const body = {
							title: this.getNodeParameter('title', i),
							from_date: start.format(),
							end_date: allDay ? start.format() : end.format(),
						} as IDataObject;

						Object.assign(body, additionalFields);

						if (attendees.length) {
							body.appointment_attendees_attributes = adjustAttendees(attendees);
						}
						responseData = await freshworksCrmApiRequest.call(this, 'POST', '/appointments', body);
						responseData = responseData.appointment;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//           appointment: delete
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#delete_a_appointment

						const appointmentId = this.getNodeParameter('appointmentId', i);

						const endpoint = `/appointments/${appointmentId}`;
						await freshworksCrmApiRequest.call(this, 'DELETE', endpoint);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//             appointment: get
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#view_a_appointment

						const appointmentId = this.getNodeParameter('appointmentId', i);

						const endpoint = `/appointments/${appointmentId}`;
						responseData = await freshworksCrmApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.appointment;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//           appointment: getAll
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#list_all_appointments

						const { filter, include } = this.getNodeParameter('filters', i) as {
							filter: string;
							include: string[];
						};

						const qs: IDataObject = {};

						if (filter) {
							qs.filter = filter;
						}

						if (include) {
							qs.include = include;
						}
						responseData = await handleListing.call(this, 'GET', '/appointments', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//           appointment: update
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#update_a_appointment

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject & {
							from_date: string;
							end_date: string;
							time_zone: string;
						};

						const attendees = this.getNodeParameter('updateFields.attendees.attendee', i, []) as [
							{ type: string; contactId: string; userId: string },
						];

						if (!Object.keys(updateFields).length) {
							throwOnEmptyUpdate.call(this, resource);
						}

						const body = {} as IDataObject;
						const { from_date, end_date, ...rest } = updateFields;

						const timezone = rest.time_zone ?? defaultTimezone;

						if (from_date) {
							body.from_date = tz(from_date, timezone).format();
						}

						if (end_date) {
							body.end_date = tz(end_date, timezone).format();
						}

						Object.assign(body, rest);

						if (attendees.length) {
							body.appointment_attendees_attributes = adjustAttendees(attendees);
							delete body.attendees;
						}

						const appointmentId = this.getNodeParameter('appointmentId', i);

						const endpoint = `/appointments/${appointmentId}`;
						responseData = await freshworksCrmApiRequest.call(this, 'PUT', endpoint, body);
						responseData = responseData.appointment;
					}
				} else if (resource === 'contact') {
					// **********************************************************************
					//                                contact
					// **********************************************************************

					// https://developers.freshworks.com/crm/api/#contacts

					if (operation === 'create') {
						// ----------------------------------------
						//             contact: create
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#create_contact

						const body = {
							first_name: this.getNodeParameter('firstName', i),
							last_name: this.getNodeParameter('lastName', i),
							emails: this.getNodeParameter('emails', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustAccounts(additionalFields));
						}

						responseData = await freshworksCrmApiRequest.call(this, 'POST', '/contacts', body);
						responseData = responseData.contact;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//             contact: delete
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#delete_a_contact

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/contacts/${contactId}`;
						await freshworksCrmApiRequest.call(this, 'DELETE', endpoint);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//               contact: get
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#view_a_contact

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/contacts/${contactId}`;
						responseData = await freshworksCrmApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.contact;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//             contact: getAll
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#list_all_contacts

						const view = this.getNodeParameter('view', i) as string;

						responseData = await handleListing.call(this, 'GET', `/contacts/view/${view}`);
					} else if (operation === 'update') {
						// ----------------------------------------
						//             contact: update
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#update_a_contact

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustAccounts(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/contacts/${contactId}`;
						responseData = await freshworksCrmApiRequest.call(this, 'PUT', endpoint, body);
						responseData = responseData.contact;
					}
				} else if (resource === 'deal') {
					// **********************************************************************
					//                                  deal
					// **********************************************************************

					// https://developers.freshworks.com/crm/api/#deals

					if (operation === 'create') {
						// ----------------------------------------
						//               deal: create
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#create_deal

						const body = {
							name: this.getNodeParameter('name', i),
							amount: this.getNodeParameter('amount', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustAccounts(additionalFields));
						}

						responseData = await freshworksCrmApiRequest.call(this, 'POST', '/deals', body);
						responseData = responseData.deal;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               deal: delete
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#delete_a_deal

						const dealId = this.getNodeParameter('dealId', i);

						await freshworksCrmApiRequest.call(this, 'DELETE', `/deals/${dealId}`);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//                deal: get
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#view_a_deal

						const dealId = this.getNodeParameter('dealId', i);

						responseData = await freshworksCrmApiRequest.call(this, 'GET', `/deals/${dealId}`);
						responseData = responseData.deal;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               deal: getAll
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#list_all_deals

						const view = this.getNodeParameter('view', i) as string;

						responseData = await handleListing.call(this, 'GET', `/deals/view/${view}`);
					} else if (operation === 'update') {
						// ----------------------------------------
						//               deal: update
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#update_a_deal

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustAccounts(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const dealId = this.getNodeParameter('dealId', i);

						responseData = await freshworksCrmApiRequest.call(
							this,
							'PUT',
							`/deals/${dealId}`,
							body,
						);
						responseData = responseData.deal;
					}
				} else if (resource === 'note') {
					// **********************************************************************
					//                                  note
					// **********************************************************************

					// https://developers.freshworks.com/crm/api/#notes

					if (operation === 'create') {
						// ----------------------------------------
						//               note: create
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#create_note

						const body = {
							description: this.getNodeParameter('description', i),
							targetable_id: this.getNodeParameter('targetable_id', i),
							targetable_type: this.getNodeParameter('targetableType', i),
						} as IDataObject;

						responseData = await freshworksCrmApiRequest.call(this, 'POST', '/notes', body);
						responseData = responseData.note;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               note: delete
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#delete_a_note

						const noteId = this.getNodeParameter('noteId', i);

						await freshworksCrmApiRequest.call(this, 'DELETE', `/notes/${noteId}`);
						responseData = { success: true };
					} else if (operation === 'update') {
						// ----------------------------------------
						//               note: update
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#update_a_note

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const noteId = this.getNodeParameter('noteId', i);

						responseData = await freshworksCrmApiRequest.call(
							this,
							'PUT',
							`/notes/${noteId}`,
							body,
						);
						responseData = responseData.note;
					}
				} else if (resource === 'salesActivity') {
					// **********************************************************************
					//                             salesActivity
					// **********************************************************************

					// https://developers.freshworks.com/crm/api/#sales-activities

					if (operation === 'create') {
						// ----------------------------------------
						//          salesActivity: create
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#create_sales_activity

						const startDate = this.getNodeParameter('from_date', i) as string;
						const endDate = this.getNodeParameter('end_date', i) as string;

						const body = {
							sales_activity_type_id: this.getNodeParameter('sales_activity_type_id', i),
							title: this.getNodeParameter('title', i),
							owner_id: this.getNodeParameter('ownerId', i),
							start_date: tz(startDate, defaultTimezone).format(),
							end_date: tz(endDate, defaultTimezone).format(),
							targetable_type: this.getNodeParameter('targetableType', i),
							targetable_id: this.getNodeParameter('targetable_id', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await freshworksCrmApiRequest.call(this, 'POST', '/sales_activities', {
							sales_activity: body,
						});
						responseData = responseData.sales_activity;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//          salesActivity: delete
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#delete_a_sales_activity

						const salesActivityId = this.getNodeParameter('salesActivityId', i);

						const endpoint = `/sales_activities/${salesActivityId}`;
						await freshworksCrmApiRequest.call(this, 'DELETE', endpoint);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//            salesActivity: get
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#view_a_sales_activity

						const salesActivityId = this.getNodeParameter('salesActivityId', i);

						const endpoint = `/sales_activities/${salesActivityId}`;
						responseData = await freshworksCrmApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.sales_activity;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//          salesActivity: getAll
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#list_all_sales_activities

						responseData = await handleListing.call(this, 'GET', '/sales_activities');
					} else if (operation === 'update') {
						// ----------------------------------------
						//          salesActivity: update
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#update_a_sales_activity

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject & {
							from_date: string;
							end_date: string;
							time_zone: string;
						};

						if (!Object.keys(updateFields).length) {
							throwOnEmptyUpdate.call(this, resource);
						}

						const body = {} as IDataObject;
						const { from_date, end_date, ...rest } = updateFields;

						if (from_date) {
							body.from_date = tz(from_date, defaultTimezone).format();
						}

						if (end_date) {
							body.end_date = tz(end_date, defaultTimezone).format();
						}

						if (Object.keys(rest).length) {
							Object.assign(body, rest);
						}

						const salesActivityId = this.getNodeParameter('salesActivityId', i);

						const endpoint = `/sales_activities/${salesActivityId}`;
						responseData = await freshworksCrmApiRequest.call(this, 'PUT', endpoint, body);
						responseData = responseData.sales_activity;
					}
				} else if (resource === 'search') {
					// **********************************************************************
					//                             search
					// **********************************************************************

					if (operation === 'query') {
						// https://developers.freshworks.com/crm/api/#search
						const query = this.getNodeParameter('query', i) as string;
						let entities = this.getNodeParameter('entities', i);
						const returnAll = this.getNodeParameter('returnAll', 0, false);

						if (Array.isArray(entities)) {
							entities = entities.join(',');
						}

						const qs: IDataObject = {
							q: query,
							include: entities,
							per_page: 100,
						};

						responseData = await freshworksCrmApiRequest.call(this, 'GET', '/search', {}, qs);

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', 0);
							responseData = responseData.slice(0, limit);
						}
					}

					if (operation === 'lookup') {
						// https://developers.freshworks.com/crm/api/#lookup_search
						let searchField = this.getNodeParameter('searchField', i) as string;
						let fieldValue = this.getNodeParameter('fieldValue', i, '') as string;
						let entities = this.getNodeParameter('options.entities', i) as string;
						if (Array.isArray(entities)) {
							entities = entities.join(',');
						}

						if (searchField === 'customField') {
							searchField = this.getNodeParameter('customFieldName', i) as string;
							fieldValue = this.getNodeParameter('customFieldValue', i) as string;
						}

						const qs: IDataObject = {
							q: fieldValue,
							f: searchField,
							entities,
						};

						responseData = await freshworksCrmApiRequest.call(this, 'GET', '/lookup', {}, qs);
					}
				} else if (resource === 'task') {
					// **********************************************************************
					//                                  task
					// **********************************************************************

					// https://developers.freshworks.com/crm/api/#tasks

					if (operation === 'create') {
						// ----------------------------------------
						//               task: create
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#create_task

						const dueDate = this.getNodeParameter('dueDate', i);

						const body = {
							title: this.getNodeParameter('title', i),
							owner_id: this.getNodeParameter('ownerId', i),
							due_date: tz(dueDate, defaultTimezone).format(),
							targetable_type: this.getNodeParameter('targetableType', i),
							targetable_id: this.getNodeParameter('targetable_id', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await freshworksCrmApiRequest.call(this, 'POST', '/tasks', body);
						responseData = responseData.task;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               task: delete
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#delete_a_task

						const taskId = this.getNodeParameter('taskId', i);

						await freshworksCrmApiRequest.call(this, 'DELETE', `/tasks/${taskId}`);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//                task: get
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#view_a_task

						const taskId = this.getNodeParameter('taskId', i);

						responseData = await freshworksCrmApiRequest.call(this, 'GET', `/tasks/${taskId}`);
						responseData = responseData.task;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               task: getAll
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#list_all_tasks

						const { filter, include } = this.getNodeParameter('filters', i) as {
							filter: string;
							include: string;
						};

						const qs: IDataObject = {
							filter: 'open',
						};

						if (filter) {
							qs.filter = filter;
						}

						if (include) {
							qs.include = include;
						}

						responseData = await handleListing.call(this, 'GET', '/tasks', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//               task: update
						// ----------------------------------------

						// https://developers.freshworks.com/crm/api/#update_a_task

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						if (!Object.keys(updateFields).length) {
							throwOnEmptyUpdate.call(this, resource);
						}

						const { dueDate, ...rest } = updateFields;

						if (dueDate) {
							body.due_date = tz(dueDate, defaultTimezone).format();
						}

						if (Object.keys(rest).length) {
							Object.assign(body, rest);
						}

						const taskId = this.getNodeParameter('taskId', i);

						responseData = await freshworksCrmApiRequest.call(
							this,
							'PUT',
							`/tasks/${taskId}`,
							body,
						);
						responseData = responseData.task;
					}
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
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		}

		return this.prepareOutputData(returnData);
	}
}
