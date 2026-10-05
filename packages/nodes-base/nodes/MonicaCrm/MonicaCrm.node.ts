import {
	type IExecuteFunctions,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import {
	activityFields,
	activityOperations,
	callFields,
	callOperations,
	contactFieldFields,
	contactFieldOperations,
	contactFields,
	contactOperations,
	contactTagFields,
	contactTagOperations,
	conversationFields,
	conversationMessageFields,
	conversationMessageOperations,
	conversationOperations,
	journalEntryFields,
	journalEntryOperations,
	noteFields,
	noteOperations,
	reminderFields,
	reminderOperations,
	tagFields,
	tagOperations,
	taskFields,
	taskOperations,
} from './descriptions';
import {
	getDateParts,
	monicaCrmApiRequest,
	monicaCrmApiRequestAllItems,
	toOptions,
} from './GenericFunctions';
import type { LoaderGetResponse, Option } from './types';

export class MonicaCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Monica CRM',
		name: 'monicaCrm',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:monicaCrm.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Monica CRM API',
		defaults: {
			name: 'Monica CRM',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'monicaCrmApi',
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
						name: 'Activity',
						value: 'activity',
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
						name: 'Contact Field',
						value: 'contactField',
					},
					{
						name: 'Contact Tag',
						value: 'contactTag',
					},
					{
						name: 'Conversation',
						value: 'conversation',
					},
					{
						name: 'Conversation Message',
						value: 'conversationMessage',
					},
					{
						name: 'Journal Entry',
						value: 'journalEntry',
					},
					{
						name: 'Note',
						value: 'note',
					},
					{
						name: 'Reminder',
						value: 'reminder',
					},
					{
						name: 'Tag',
						value: 'tag',
					},
					{
						name: 'Task',
						value: 'task',
					},
				],
				default: 'contact',
			},
			...activityOperations,
			...activityFields,
			...callOperations,
			...callFields,
			...contactOperations,
			...contactFields,
			...contactFieldOperations,
			...contactFieldFields,
			...contactTagOperations,
			...contactTagFields,
			...conversationOperations,
			...conversationFields,
			...conversationMessageOperations,
			...conversationMessageFields,
			...journalEntryOperations,
			...journalEntryFields,
			...noteOperations,
			...noteFields,
			...reminderOperations,
			...reminderFields,
			...tagOperations,
			...tagFields,
			...taskOperations,
			...taskFields,
		],
	};

	methods = {
		loadOptions: {
			async getActivityTypes(this: ILoadOptionsFunctions) {
				const responseData = (await monicaCrmApiRequest.call(
					this,
					'GET',
					'/activitytypes',
				)) as LoaderGetResponse;
				return toOptions(responseData);
			},

			async getTagsToAdd(this: ILoadOptionsFunctions) {
				const responseData = await monicaCrmApiRequestAllItems.call(
					this,
					'GET',
					'/tags',
					{},
					{},
					{ forLoader: true },
				);

				// intentional, name required when adding
				return responseData.map(({ name }) => ({ value: name, name })) as Option[];
			},

			async getTagsToRemove(this: ILoadOptionsFunctions) {
				const responseData = await monicaCrmApiRequestAllItems.call(
					this,
					'GET',
					'/tags',
					{},
					{},
					{ forLoader: true },
				);
				return responseData.map(({ id, name }) => ({ value: id, name })) as Option[];
			},

			async getContactFieldTypes(this: ILoadOptionsFunctions) {
				const responseData = (await monicaCrmApiRequest.call(
					this,
					'GET',
					'/contactfieldtypes',
				)) as LoaderGetResponse;
				return toOptions(responseData);
			},

			async getGenders(this: ILoadOptionsFunctions) {
				const responseData = (await monicaCrmApiRequest.call(
					this,
					'GET',
					'/genders',
				)) as LoaderGetResponse;
				return toOptions(responseData);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'activity') {
					// **********************************************************************
					//                                activity
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//             activity: create
						// ----------------------------------------

						const contacts = this.getNodeParameter('contacts', i) as string;
						const happenedAt = this.getNodeParameter('happenedAt', i) as string;

						const body = {
							activity_type_id: this.getNodeParameter('activityTypeId', i),
							contacts: contacts.split(','),
							happened_at: happenedAt.split('T')[0],
							summary: this.getNodeParameter('summary', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await monicaCrmApiRequest.call(this, 'POST', '/activities', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//             activity: delete
						// ----------------------------------------

						const activityId = this.getNodeParameter('activityId', i);

						const endpoint = `/activities/${activityId}`;
						await monicaCrmApiRequest.call(this, 'DELETE', endpoint);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//              activity: get
						// ----------------------------------------

						const activityId = this.getNodeParameter('activityId', i);

						const endpoint = `/activities/${activityId}`;
						responseData = await monicaCrmApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//             activity: getAll
						// ----------------------------------------

						const endpoint = '/activities';
						responseData = await monicaCrmApiRequestAllItems.call(this, 'GET', endpoint);
					} else if (operation === 'update') {
						// ----------------------------------------
						//             activity: update
						// ----------------------------------------

						const activityId = this.getNodeParameter('activityId', i);

						const { data } = await monicaCrmApiRequest.call(
							this,
							'GET',
							`/activities/${activityId}`,
						);

						const body = {
							activity_type_id: data.activity_type.id,
							contacts: data.attendees.contacts.map((contact: IDataObject) => contact.id),
							happened_at: data.happened_at,
							summary: data.summary,
						} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						}

						body.happened_at = (body.happened_at as string).split('T')[0];

						if (typeof body.contacts === 'string') {
							body.contacts = body.contacts.split(',');
						}

						const endpoint = `/activities/${activityId}`;
						responseData = await monicaCrmApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'call') {
					// **********************************************************************
					//                                  call
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//               call: create
						// ----------------------------------------

						const body = {
							called_at: this.getNodeParameter('calledAt', i),
							contact_id: this.getNodeParameter('contactId', i),
							content: this.getNodeParameter('content', i),
						} as IDataObject;

						responseData = await monicaCrmApiRequest.call(this, 'POST', '/calls', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               call: delete
						// ----------------------------------------

						const callId = this.getNodeParameter('callId', i);

						responseData = await monicaCrmApiRequest.call(this, 'DELETE', `/calls/${callId}`);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//                call: get
						// ----------------------------------------

						const callId = this.getNodeParameter('callId', i);

						responseData = await monicaCrmApiRequest.call(this, 'GET', `/calls/${callId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               call: getAll
						// ----------------------------------------

						const endpoint = '/calls';
						responseData = await monicaCrmApiRequestAllItems.call(this, 'GET', endpoint);
					} else if (operation === 'update') {
						// ----------------------------------------
						//               call: update
						// ----------------------------------------

						const callId = this.getNodeParameter('callId', i);

						const { data } = await monicaCrmApiRequest.call(this, 'GET', `/calls/${callId}`);

						const body = {
							called_at: data.called_at,
						} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						}

						responseData = await monicaCrmApiRequest.call(this, 'PUT', `/calls/${callId}`, body);
					}
				} else if (resource === 'contact') {
					// **********************************************************************
					//                                contact
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//             contact: create
						// ----------------------------------------

						const body = {
							first_name: this.getNodeParameter('firstName', i),
							gender_id: this.getNodeParameter('genderId', i),
						} as IDataObject;

						const {
							isDeceased = false,
							deceasedDate,
							birthdate,
							...rest
						} = this.getNodeParameter('additionalFields', i) as {
							isDeceased?: boolean;
							deceasedDate?: string;
							birthdate?: string;
						} & IDataObject;

						body.is_birthdate_known = false;
						body.is_deceased = isDeceased;
						body.is_deceased_date_known = false;

						if (birthdate) {
							body.is_birthdate_known = true;

							const [day, month, year] = getDateParts(birthdate);
							body.birthdate_day = day;
							body.birthdate_month = month;
							body.birthdate_year = year;
						}

						if (deceasedDate) {
							body.is_deceased = true;
							body.is_deceased_date_known = true;

							const [day, month, year] = getDateParts(deceasedDate);
							body.deceased_date_day = day;
							body.deceased_date_month = month;
							body.deceased_date_year = year;
						}

						if (Object.keys(rest).length) {
							Object.assign(body, rest);
						}

						responseData = await monicaCrmApiRequest.call(this, 'POST', '/contacts', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//             contact: delete
						// ----------------------------------------

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/contacts/${contactId}`;
						await monicaCrmApiRequest.call(this, 'DELETE', endpoint);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//               contact: get
						// ----------------------------------------

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/contacts/${contactId}`;
						responseData = await monicaCrmApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//             contact: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i);

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						responseData = await monicaCrmApiRequestAllItems.call(this, 'GET', '/contacts', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//             contact: update
						// ----------------------------------------

						const contactId = this.getNodeParameter('contactId', i);

						const { data } = await monicaCrmApiRequest.call(this, 'GET', `/contacts/${contactId}`);

						const body = {
							first_name: data.first_name,
						} as IDataObject;

						const {
							is_deaceased = false,
							deceased_date,
							birthdate,
							...rest
						} = this.getNodeParameter('updateFields', i) as {
							is_deaceased?: boolean;
							deceased_date?: string;
							birthdate?: string;
						} & IDataObject;

						body.is_birthdate_known = false;
						body.is_deceased = is_deaceased;
						body.is_deceased_date_known = false;

						if (birthdate) {
							body.is_birthdate_known = true;

							const [day, month, year] = getDateParts(birthdate);
							body.birthdate_day = day;
							body.birthdate_month = month;
							body.birthdate_year = year;
						}

						if (deceased_date) {
							body.is_deceased = true;
							body.is_deceased_date_known = true;

							const [day, month, year] = getDateParts(deceased_date);
							body.deceased_date_day = day;
							body.deceased_date_month = month;
							body.deceased_date_year = year;
						}

						if (Object.keys(rest).length) {
							Object.assign(body, rest);
						}

						const endpoint = `/contacts/${contactId}`;
						responseData = await monicaCrmApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'contactField') {
					// **********************************************************************
					//                              contactField
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//           contactField: create
						// ----------------------------------------

						const body = {
							contact_field_type_id: this.getNodeParameter('contactFieldTypeId', i),
							contact_id: this.getNodeParameter('contactId', i),
							data: this.getNodeParameter('data', i),
						} as IDataObject;

						responseData = await monicaCrmApiRequest.call(this, 'POST', '/contactfields', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//           contactField: delete
						// ----------------------------------------

						const contactFieldId = this.getNodeParameter('contactFieldId', i);

						const endpoint = `/contactfields/${contactFieldId}`;
						await monicaCrmApiRequest.call(this, 'DELETE', endpoint);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//            contactField: get
						// ----------------------------------------

						const contactFieldId = this.getNodeParameter('contactFieldId', i);

						const endpoint = `/contactfields/${contactFieldId}`;
						responseData = await monicaCrmApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//           contactField: getAll
						// ----------------------------------------

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/contact/${contactId}/contactfields`;
						responseData = await monicaCrmApiRequestAllItems.call(this, 'GET', endpoint);
					} else if (operation === 'update') {
						// ----------------------------------------
						//           contactField: update
						// ----------------------------------------

						const body = {
							contact_field_type_id: this.getNodeParameter('contactFieldTypeId', i),
							contact_id: this.getNodeParameter('contactId', i),
							data: this.getNodeParameter('data', i),
						} as IDataObject;

						const contactFieldId = this.getNodeParameter('contactFieldId', i);

						const endpoint = `/contactfields/${contactFieldId}`;
						responseData = await monicaCrmApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'contactTag') {
					// **********************************************************************
					//                             contactTag
					// **********************************************************************

					if (operation === 'add') {
						// ----------------------------------------
						//            contactTag: add
						// ----------------------------------------

						const body = {
							tags: this.getNodeParameter('tagsToAdd', i),
						} as IDataObject;

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/contacts/${contactId}/setTags`;
						responseData = await monicaCrmApiRequest.call(this, 'POST', endpoint, body);
					} else if (operation === 'remove') {
						// ----------------------------------------
						//              tag: remove
						// ----------------------------------------

						const body = {
							tags: this.getNodeParameter('tagsToRemove', i),
						} as IDataObject;

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/contacts/${contactId}/unsetTag`;
						responseData = await monicaCrmApiRequest.call(this, 'POST', endpoint, body);
					}
				} else if (resource === 'conversation') {
					// **********************************************************************
					//                              conversation
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//           conversation: create
						// ----------------------------------------

						const body = {
							contact_field_type_id: this.getNodeParameter('contactFieldTypeId', i),
							contact_id: this.getNodeParameter('contactId', i),
							happened_at: this.getNodeParameter('happenedAt', i),
						} as IDataObject;

						responseData = await monicaCrmApiRequest.call(this, 'POST', '/conversations', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//           conversation: delete
						// ----------------------------------------

						const conversationId = this.getNodeParameter('conversationId', i);

						const endpoint = `/conversations/${conversationId}`;
						await monicaCrmApiRequest.call(this, 'DELETE', endpoint);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//            conversation: get
						// ----------------------------------------

						const conversationId = this.getNodeParameter('conversationId', i);

						const endpoint = `/conversations/${conversationId}`;
						responseData = await monicaCrmApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'update') {
						// ----------------------------------------
						//           conversation: update
						// ----------------------------------------

						const body = {
							contact_field_type_id: this.getNodeParameter('contactFieldTypeId', i),
							happened_at: this.getNodeParameter('happenedAt', i),
						} as IDataObject;

						const conversationId = this.getNodeParameter('conversationId', i);

						const endpoint = `/conversations/${conversationId}`;
						responseData = await monicaCrmApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'conversationMessage') {
					if (operation === 'add') {
						// ----------------------------------------
						//         conversationMessage: add
						// ----------------------------------------

						const conversationId = this.getNodeParameter('conversationId', i);

						const endpoint = `/conversations/${conversationId}/messages`;

						const { data } = await monicaCrmApiRequest.call(
							this,
							'GET',
							`/conversations/${conversationId}`,
						);

						const body = {
							contact_id: data.contact.id,
							content: this.getNodeParameter('content', i),
							written_at: this.getNodeParameter('writtenAt', i),
							written_by_me: this.getNodeParameter('writtenByMe', i),
						} as IDataObject;

						responseData = await monicaCrmApiRequest.call(this, 'POST', endpoint, body);
					} else if (operation === 'update') {
						// ----------------------------------------
						//       conversationMessage: update
						// ----------------------------------------

						const conversationId = this.getNodeParameter('conversationId', i);
						const messageId = this.getNodeParameter('messageId', i) as string;
						const endpoint = `/conversations/${conversationId}/messages/${messageId}`;

						const updateFields = this.getNodeParameter('updateFields', i, {});

						const { data } = await monicaCrmApiRequest.call(
							this,
							'GET',
							`/conversations/${conversationId}`,
						);

						const message = data.messages.filter(
							(entry: IDataObject) => entry.id === parseInt(messageId, 10),
						)[0];

						const body = {
							contact_id: data.contact.id,
							content: message.content,
							written_at: message.written_at,
							written_by_me: message.written_by_me,
						} as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						}

						responseData = await monicaCrmApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'journalEntry') {
					// **********************************************************************
					//                              journalEntry
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//           journalEntry: create
						// ----------------------------------------

						const body = {
							title: this.getNodeParameter('title', i),
							post: this.getNodeParameter('post', i),
						} as IDataObject;

						responseData = await monicaCrmApiRequest.call(this, 'POST', '/journal', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//           journalEntry: delete
						// ----------------------------------------

						const journalId = this.getNodeParameter('journalId', i);

						await monicaCrmApiRequest.call(this, 'DELETE', `/journal/${journalId}`);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//            journalEntry: get
						// ----------------------------------------

						const journalId = this.getNodeParameter('journalId', i);

						responseData = await monicaCrmApiRequest.call(this, 'GET', `/journal/${journalId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//           journalEntry: getAll
						// ----------------------------------------

						responseData = await monicaCrmApiRequestAllItems.call(this, 'GET', '/journal');
					} else if (operation === 'update') {
						// ----------------------------------------
						//           journalEntry: update
						// ----------------------------------------

						const journalId = this.getNodeParameter('journalId', i);

						const { data } = await monicaCrmApiRequest.call(this, 'GET', `/journal/${journalId}`);

						const updateFields = this.getNodeParameter('updateFields', i);

						const body = {
							post: data.post,
							title: data.title,
						} as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						}

						responseData = await monicaCrmApiRequest.call(
							this,
							'PUT',
							`/journal/${journalId}`,
							body,
						);
					}
				} else if (resource === 'note') {
					// **********************************************************************
					//                                  note
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//               note: create
						// ----------------------------------------

						const body = {
							body: this.getNodeParameter('body', i),
							contact_id: this.getNodeParameter('contactId', i),
						} as IDataObject;

						body.is_favorited = this.getNodeParameter('additionalFields.isFavorited', i, false);

						responseData = await monicaCrmApiRequest.call(this, 'POST', '/notes', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               note: delete
						// ----------------------------------------

						const noteId = this.getNodeParameter('noteId', i);

						await monicaCrmApiRequest.call(this, 'DELETE', `/notes/${noteId}`);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//                note: get
						// ----------------------------------------

						const noteId = this.getNodeParameter('noteId', i);

						responseData = await monicaCrmApiRequest.call(this, 'GET', `/notes/${noteId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               note: getAll
						// ----------------------------------------

						const endpoint = '/notes';
						responseData = await monicaCrmApiRequestAllItems.call(this, 'GET', endpoint);
					} else if (operation === 'update') {
						// ----------------------------------------
						//               note: update
						// ----------------------------------------

						const noteId = this.getNodeParameter('noteId', i);

						const updateFields = this.getNodeParameter('updateFields', i);

						const { data } = await monicaCrmApiRequest.call(this, 'GET', `/notes/${noteId}`);

						const body = {
							body: data.body,
							contact_id: data.contact.id,
						} as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						}

						responseData = await monicaCrmApiRequest.call(this, 'PUT', `/notes/${noteId}`, body);
					}
				} else if (resource === 'reminder') {
					// **********************************************************************
					//                                reminder
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//             reminder: create
						// ----------------------------------------

						const initialDate = this.getNodeParameter('initialDate', i) as string;

						const body = {
							contact_id: this.getNodeParameter('contactId', i),
							frequency_type: this.getNodeParameter('frequencyType', i),
							frequency_number: this.getNodeParameter('frequencyNumber', i, 1),
							initial_date: initialDate.split('T')[0],
							title: this.getNodeParameter('title', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await monicaCrmApiRequest.call(this, 'POST', '/reminders', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//             reminder: delete
						// ----------------------------------------

						const reminderId = this.getNodeParameter('reminderId', i);

						const endpoint = `/reminders/${reminderId}`;
						await monicaCrmApiRequest.call(this, 'DELETE', endpoint);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//              reminder: get
						// ----------------------------------------

						const reminderId = this.getNodeParameter('reminderId', i);

						const endpoint = `/reminders/${reminderId}`;
						responseData = await monicaCrmApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//             reminder: getAll
						// ----------------------------------------

						responseData = await monicaCrmApiRequestAllItems.call(this, 'GET', '/reminders');
					} else if (operation === 'update') {
						// ----------------------------------------
						//             reminder: update
						// ----------------------------------------

						const reminderId = this.getNodeParameter('reminderId', i);

						const { data } = await monicaCrmApiRequest.call(
							this,
							'GET',
							`/reminders/${reminderId}`,
						);

						const body = {
							contact_id: data.contact.id,
							frequency_type: data.frequency_type,
							frequency_number: data.frequency_number,
							initial_date: data.initial_date,
							title: data.title,
						} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						}

						body.initial_date = (body.initial_date as string).split('T')[0];

						const endpoint = `/reminders/${reminderId}`;
						responseData = await monicaCrmApiRequest.call(this, 'PUT', endpoint, body);
					}
				} else if (resource === 'tag') {
					// **********************************************************************
					//                                  tag
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//               tag: create
						// ----------------------------------------

						const body = {
							name: this.getNodeParameter('name', i),
						} as IDataObject;

						responseData = await monicaCrmApiRequest.call(this, 'POST', '/tags', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               tag: delete
						// ----------------------------------------

						const tagId = this.getNodeParameter('tagId', i);

						await monicaCrmApiRequest.call(this, 'DELETE', `/tags/${tagId}`);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//                 tag: get
						// ----------------------------------------

						const tagId = this.getNodeParameter('tagId', i);

						responseData = await monicaCrmApiRequest.call(this, 'GET', `/tags/${tagId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               tag: getAll
						// ----------------------------------------

						responseData = await monicaCrmApiRequestAllItems.call(this, 'GET', '/tags');
					} else if (operation === 'update') {
						// ----------------------------------------
						//               tag: update
						// ----------------------------------------

						const body = {
							name: this.getNodeParameter('name', i),
						} as IDataObject;

						const tagId = this.getNodeParameter('tagId', i);

						responseData = await monicaCrmApiRequest.call(this, 'PUT', `/tags/${tagId}`, body);
					}
				} else if (resource === 'task') {
					// **********************************************************************
					//                                  task
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//               task: create
						// ----------------------------------------

						const body = {
							contact_id: this.getNodeParameter('contactId', i),
							title: this.getNodeParameter('title', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await monicaCrmApiRequest.call(this, 'POST', '/tasks', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               task: delete
						// ----------------------------------------

						const taskId = this.getNodeParameter('taskId', i);

						await monicaCrmApiRequest.call(this, 'DELETE', `/tasks/${taskId}`);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//                task: get
						// ----------------------------------------

						const taskId = this.getNodeParameter('taskId', i);

						responseData = await monicaCrmApiRequest.call(this, 'GET', `/tasks/${taskId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               task: getAll
						// ----------------------------------------

						const endpoint = '/tasks';
						responseData = await monicaCrmApiRequestAllItems.call(this, 'GET', endpoint);
					} else if (operation === 'update') {
						// ----------------------------------------
						//               task: update
						// ----------------------------------------

						const taskId = this.getNodeParameter('taskId', i);

						const { data } = await monicaCrmApiRequest.call(this, 'GET', `/tasks/${taskId}`);

						const body = {
							contact_id: data.contact.id,
							title: data.title,
							completed: data.completed,
						} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						}

						responseData = await monicaCrmApiRequest.call(this, 'PUT', `/tasks/${taskId}`, body);
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

			if (['create', 'get', 'update', 'add'].includes(operation)) {
				responseData = responseData.data;
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}

		return [returnData];
	}
}
