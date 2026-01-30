import isEmpty from 'lodash/isEmpty';
import omit from 'lodash/omit';
import {
	type IExecuteFunctions,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type INodeTypeBaseDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import {
	activityFields,
	activityOperations,
	campaignFields,
	campaignOperations,
	companyFields,
	companyOperations,
	contactFields,
	contactOperations,
	databaseFields,
	databaseOperations,
	enrichmentFields,
	enrichmentOperations,
	inboxFields,
	inboxOperations,
	leadFields,
	leadOperations,
	scheduleFields,
	scheduleOperations,
	sequenceFields,
	sequenceOperations,
	taskFields,
	taskOperations,
	teamFields,
	teamOperations,
	unsubscribeFields,
	unsubscribeOperations,
	webhookFields,
	webhookOperations,
} from './descriptions';
import { lemlistApiRequest, lemlistApiRequestAllItems } from '../GenericFunctions';

const versionDescription: INodeTypeDescription = {
	displayName: 'Lemlist',
	name: 'lemlist',
	icon: 'file:lemlist.svg',
	group: ['transform'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume the Lemlist API',
	defaults: {
		name: 'Lemlist',
	},
	usableAsTool: true,
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'lemlistApi',
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
					name: 'Campaign',
					value: 'campaign',
				},
				{
					name: 'Company',
					value: 'company',
				},
				{
					name: 'Contact',
					value: 'contact',
				},
				{
					name: 'Database',
					value: 'database',
				},
				{
					name: 'Enrichment',
					value: 'enrich',
				},
				{
					name: 'Inbox',
					value: 'inbox',
				},
				{
					name: 'Lead',
					value: 'lead',
				},
				{
					name: 'Schedule',
					value: 'schedule',
				},
				{
					name: 'Sequence',
					value: 'sequence',
				},
				{
					name: 'Task',
					value: 'task',
				},
				{
					name: 'Team',
					value: 'team',
				},
				{
					name: 'Unsubscribe',
					value: 'unsubscribe',
				},
				{
					name: 'Webhook',
					value: 'webhook',
				},
			],
			default: 'activity',
		},
		...activityOperations,
		...activityFields,
		...campaignOperations,
		...campaignFields,
		...companyOperations,
		...companyFields,
		...contactOperations,
		...contactFields,
		...databaseOperations,
		...databaseFields,
		...enrichmentOperations,
		...enrichmentFields,
		...inboxOperations,
		...inboxFields,
		...leadOperations,
		...leadFields,
		...scheduleOperations,
		...scheduleFields,
		...sequenceOperations,
		...sequenceFields,
		...taskOperations,
		...taskFields,
		...teamOperations,
		...teamFields,
		...unsubscribeOperations,
		...unsubscribeFields,
		...webhookOperations,
		...webhookFields,
	],
};

export class LemlistV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		loadOptions: {
			async getCampaigns(this: ILoadOptionsFunctions) {
				const campaigns = await lemlistApiRequest.call(this, 'GET', '/campaigns');
				return campaigns.map(({ _id, name }: { _id: string; name: string }) => ({
					name,
					value: _id,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let responseData;
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'activity') {
					// *********************************************************************
					//                             activity
					// *********************************************************************

					if (operation === 'getAll') {
						// ----------------------------------
						//        activity: getAll
						// ----------------------------------

						const returnAll = this.getNodeParameter('returnAll', i);

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i);

						if (!isEmpty(filters)) {
							Object.assign(qs, filters);
						}

						if (returnAll) {
							responseData = await lemlistApiRequestAllItems.call(this, 'GET', '/activities', qs);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await lemlistApiRequest.call(this, 'GET', '/activities', {}, qs);
						}
					}
				} else if (resource === 'campaign') {
					// *********************************************************************
					//                             campaign
					// *********************************************************************

					if (operation === 'create') {
						// ----------------------------------
						//        campaign: create
						// ----------------------------------

						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = { name };

						if (typeof additionalFields.labels === 'string') {
							body.labels = additionalFields.labels.split(',').map((l) => l.trim());
						}

						responseData = await lemlistApiRequest.call(this, 'POST', '/campaigns', body);
					} else if (operation === 'get') {
						// ----------------------------------
						//        campaign: get
						// ----------------------------------

						const campaignId = this.getNodeParameter('campaignId', i);
						responseData = await lemlistApiRequest.call(this, 'GET', `/campaigns/${campaignId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//        campaign: getAll
						// ----------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i);

						if (!isEmpty(filters)) {
							Object.assign(qs, filters);
						}
						const returnAll = this.getNodeParameter('returnAll', i);

						if (returnAll) {
							responseData = await lemlistApiRequestAllItems.call(this, 'GET', '/campaigns', qs);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await lemlistApiRequest.call(this, 'GET', '/campaigns', {}, qs);
						}
					} else if (operation === 'getStats') {
						// ----------------------------------
						//        campaign: getStats
						// ----------------------------------

						const qs = {} as IDataObject;

						const campaignId = this.getNodeParameter('campaignId', i);

						qs.startDate = this.getNodeParameter('startDate', i);
						qs.endDate = this.getNodeParameter('endDate', i);
						qs.timezone = this.getNodeParameter('timezone', i);
						responseData = await lemlistApiRequest.call(
							this,
							'GET',
							`/v2/campaigns/${campaignId}/stats`,
							{},
							qs,
						);
					} else if (operation === 'getReports') {
						// ----------------------------------
						//        campaign: getReports
						// ----------------------------------

						const campaignIds = this.getNodeParameter('campaignIds', i) as string[];
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const qs: IDataObject = {
							campaignIds: campaignIds.join(','),
						};

						if (additionalFields.startDate) {
							qs.startDate = additionalFields.startDate;
						}
						if (additionalFields.endDate) {
							qs.endDate = additionalFields.endDate;
						}
						if (additionalFields.timezone) {
							qs.timezone = additionalFields.timezone;
						}

						responseData = await lemlistApiRequest.call(this, 'GET', '/campaigns/reports', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------
						//        campaign: update
						// ----------------------------------

						const campaignId = this.getNodeParameter('campaignId', i);
						const updateFields = this.getNodeParameter('updateFields', i);

						const body: IDataObject = {};

						if (updateFields.name) {
							body.name = updateFields.name;
						}
						if (typeof updateFields.labels === 'string') {
							body.labels = updateFields.labels.split(',').map((l) => l.trim());
						}

						responseData = await lemlistApiRequest.call(
							this,
							'PATCH',
							`/campaigns/${campaignId}`,
							body,
						);
					} else if (operation === 'pause') {
						// ----------------------------------
						//        campaign: pause
						// ----------------------------------

						const campaignId = this.getNodeParameter('campaignId', i);
						responseData = await lemlistApiRequest.call(
							this,
							'POST',
							`/campaigns/${campaignId}/pause`,
						);
					} else if (operation === 'exportLeads') {
						// ----------------------------------
						//        campaign: exportLeads
						// ----------------------------------

						const campaignId = this.getNodeParameter('campaignId', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const qs: IDataObject = {};

						if (additionalFields.state) {
							qs.state = additionalFields.state;
						}
						if (additionalFields.perPage) {
							qs.perPage = additionalFields.perPage;
						}
						if (additionalFields.page) {
							qs.page = additionalFields.page;
						}

						responseData = await lemlistApiRequest.call(
							this,
							'GET',
							`/campaigns/${campaignId}/export/leads`,
							{},
							qs,
						);
					}
				} else if (resource === 'lead') {
					// *********************************************************************
					//                             lead
					// *********************************************************************

					if (operation === 'create') {
						// ----------------------------------
						//          lead: create
						// ----------------------------------

						const qs = {} as IDataObject;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.deduplicate !== undefined) {
							qs.deduplicate = additionalFields.deduplicate;
						}

						const body = {} as IDataObject;

						const remainingAdditionalFields = omit(additionalFields, 'deduplicate');

						if (!isEmpty(remainingAdditionalFields)) {
							Object.assign(body, remainingAdditionalFields);
						}

						const campaignId = this.getNodeParameter('campaignId', i);
						const email = this.getNodeParameter('email', i);
						const endpoint = `/campaigns/${campaignId}/leads/${email}`;

						responseData = await lemlistApiRequest.call(this, 'POST', endpoint, body, qs);
					} else if (operation === 'delete') {
						// ----------------------------------
						//         lead: delete
						// ----------------------------------

						const campaignId = this.getNodeParameter('campaignId', i);
						const email = this.getNodeParameter('email', i);
						const endpoint = `/campaigns/${campaignId}/leads/${email}`;
						responseData = await lemlistApiRequest.call(
							this,
							'DELETE',
							endpoint,
							{},
							{ action: 'remove' },
						);
					} else if (operation === 'get') {
						// ----------------------------------
						//         lead: get
						// ----------------------------------

						const email = this.getNodeParameter('email', i);
						responseData = await lemlistApiRequest.call(this, 'GET', `/leads/${email}`);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         lead: getAll
						// ----------------------------------

						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);

						const qs: IDataObject = {};

						if (!isEmpty(filters)) {
							Object.assign(qs, filters);
						}

						if (returnAll) {
							responseData = await lemlistApiRequestAllItems.call(this, 'GET', '/leads', qs);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await lemlistApiRequest.call(this, 'GET', '/leads', {}, qs);
						}
					} else if (operation === 'update') {
						// ----------------------------------
						//         lead: update
						// ----------------------------------

						const campaignId = this.getNodeParameter('campaignId', i);
						const leadId = this.getNodeParameter('leadId', i);
						const updateFields = this.getNodeParameter('updateFields', i);

						const body: IDataObject = {};

						if (!isEmpty(updateFields)) {
							Object.assign(body, updateFields);
						}

						responseData = await lemlistApiRequest.call(
							this,
							'PATCH',
							`/campaigns/${campaignId}/leads/${leadId}`,
							body,
						);
					} else if (operation === 'pause') {
						// ----------------------------------
						//         lead: pause
						// ----------------------------------

						const leadId = this.getNodeParameter('leadId', i);
						responseData = await lemlistApiRequest.call(this, 'POST', `/leads/pause/${leadId}`);
					} else if (operation === 'resume') {
						// ----------------------------------
						//         lead: resume
						// ----------------------------------

						const leadId = this.getNodeParameter('leadId', i);
						responseData = await lemlistApiRequest.call(this, 'POST', `/leads/start/${leadId}`);
					} else if (operation === 'markInterested') {
						// ----------------------------------
						//         lead: markInterested
						// ----------------------------------

						const leadIdOrEmail = this.getNodeParameter('leadIdOrEmail', i);
						const scope = this.getNodeParameter('scope', i);

						if (scope === 'global') {
							responseData = await lemlistApiRequest.call(
								this,
								'POST',
								`/leads/interested/${leadIdOrEmail}`,
							);
						} else {
							const campaignId = this.getNodeParameter('campaignId', i);
							responseData = await lemlistApiRequest.call(
								this,
								'POST',
								`/campaigns/${campaignId}/leads/${leadIdOrEmail}/interested`,
							);
						}
					} else if (operation === 'markNotInterested') {
						// ----------------------------------
						//         lead: markNotInterested
						// ----------------------------------

						const leadIdOrEmail = this.getNodeParameter('leadIdOrEmail', i);
						const scope = this.getNodeParameter('scope', i);

						if (scope === 'global') {
							responseData = await lemlistApiRequest.call(
								this,
								'POST',
								`/leads/notinterested/${leadIdOrEmail}`,
							);
						} else {
							const campaignId = this.getNodeParameter('campaignId', i);
							responseData = await lemlistApiRequest.call(
								this,
								'POST',
								`/campaigns/${campaignId}/leads/${leadIdOrEmail}/notinterested`,
							);
						}
					} else if (operation === 'unsubscribe') {
						// ----------------------------------
						//         lead: unsubscribe
						// ----------------------------------

						const campaignId = this.getNodeParameter('campaignId', i);
						const email = this.getNodeParameter('email', i);
						const endpoint = `/campaigns/${campaignId}/leads/${email}`;
						responseData = await lemlistApiRequest.call(this, 'DELETE', endpoint);
					}
				} else if (resource === 'team') {
					// *********************************************************************
					//                             team
					// *********************************************************************

					if (operation === 'get') {
						// ----------------------------------
						//         team: get
						// ----------------------------------

						responseData = await lemlistApiRequest.call(this, 'GET', '/team');
					} else if (operation === 'getCredits') {
						// ----------------------------------
						//         team: getCredits
						// ----------------------------------

						responseData = await lemlistApiRequest.call(this, 'GET', '/team/credits');
					} else if (operation === 'getSenders') {
						// ----------------------------------
						//         team: getSenders
						// ----------------------------------

						responseData = await lemlistApiRequest.call(this, 'GET', '/team/senders');
					}
				} else if (resource === 'unsubscribe') {
					// *********************************************************************
					//                             unsubscribe
					// *********************************************************************

					if (operation === 'add') {
						// ----------------------------------
						//        unsubscribe: Add
						// ----------------------------------

						const email = this.getNodeParameter('email', i);
						responseData = await lemlistApiRequest.call(this, 'POST', `/unsubscribes/${email}`);
					} else if (operation === 'delete') {
						// ----------------------------------
						//        unsubscribe: delete
						// ----------------------------------

						const email = this.getNodeParameter('email', i);
						responseData = await lemlistApiRequest.call(this, 'DELETE', `/unsubscribes/${email}`);
					} else if (operation === 'get') {
						// ----------------------------------
						//        unsubscribe: get
						// ----------------------------------

						const email = this.getNodeParameter('email', i);
						responseData = await lemlistApiRequest.call(this, 'GET', `/unsubscribes/${email}`);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//        unsubscribe: getAll
						// ----------------------------------

						const returnAll = this.getNodeParameter('returnAll', i);

						if (returnAll) {
							responseData = await lemlistApiRequestAllItems.call(this, 'GET', '/unsubscribes', {});
						} else {
							const qs = {
								limit: this.getNodeParameter('limit', i),
							};
							responseData = await lemlistApiRequest.call(this, 'GET', '/unsubscribes', {}, qs);
						}
					} else if (operation === 'export') {
						// ----------------------------------
						//        unsubscribe: export
						// ----------------------------------

						responseData = await lemlistApiRequest.call(this, 'GET', '/unsubs/export');
					}
				} else if (resource === 'enrich') {
					// *********************************************************************
					//                             enrichment
					// *********************************************************************

					if (operation === 'get') {
						// ----------------------------------
						//        enrichment: get
						// ----------------------------------

						const enrichId = this.getNodeParameter('enrichId', i);

						responseData = await lemlistApiRequest.call(this, 'GET', `/enrich/${enrichId}`);
					} else if (operation === 'enrichLead') {
						// ----------------------------------
						//        enrichment: enrichLead
						// ----------------------------------

						const findEmail = this.getNodeParameter('findEmail', i);
						const verifyEmail = this.getNodeParameter('verifyEmail', i);
						const linkedinEnrichment = this.getNodeParameter('linkedinEnrichment', i);
						const findPhone = this.getNodeParameter('findPhone', i);
						const qs = {} as IDataObject;

						qs.findEmail = findEmail;
						qs.verifyEmail = verifyEmail;
						qs.linkedinEnrichment = linkedinEnrichment;
						qs.findPhone = findPhone;

						const body = {} as IDataObject;

						const leadId = this.getNodeParameter('leadId', i);
						const endpoint = `/leads/${leadId}/enrich/`;

						responseData = await lemlistApiRequest.call(this, 'POST', endpoint, body, qs);
					} else if (operation === 'enrichPerson') {
						// ----------------------------------
						//        enrichment: enrichPerson
						// ----------------------------------

						const findEmail = this.getNodeParameter('findEmail', i);
						const verifyEmail = this.getNodeParameter('verifyEmail', i);
						const linkedinEnrichment = this.getNodeParameter('linkedinEnrichment', i);
						const findPhone = this.getNodeParameter('findPhone', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const qs = {} as IDataObject;
						if (!isEmpty(additionalFields)) {
							Object.assign(qs, additionalFields);
						}
						qs.findEmail = findEmail;
						qs.verifyEmail = verifyEmail;
						qs.linkedinEnrichment = linkedinEnrichment;
						qs.findPhone = findPhone;

						const body = {} as IDataObject;

						const endpoint = '/enrich/';

						responseData = await lemlistApiRequest.call(this, 'POST', endpoint, body, qs);
					} else if (operation === 'bulkEnrich') {
						// ----------------------------------
						//        enrichment: bulkEnrich
						// ----------------------------------

						const entities = this.getNodeParameter('entities', i);
						const options = this.getNodeParameter('options', i);

						const body: IDataObject = {
							entities: typeof entities === 'string' ? JSON.parse(entities) : entities,
						};

						if (!isEmpty(options)) {
							Object.assign(body, options);
						}

						responseData = await lemlistApiRequest.call(this, 'POST', '/v2/enrichments/bulk', body);
					}
				} else if (resource === 'inbox') {
					// *********************************************************************
					//                             inbox
					// *********************************************************************

					if (operation === 'getAll') {
						// ----------------------------------
						//        inbox: getAll
						// ----------------------------------

						const returnAll = this.getNodeParameter('returnAll', i);

						if (returnAll) {
							responseData = await lemlistApiRequestAllItems.call(this, 'GET', '/inbox', {});
						} else {
							const qs = {
								limit: this.getNodeParameter('limit', i),
							};
							responseData = await lemlistApiRequest.call(this, 'GET', '/inbox', {}, qs);
						}
					} else if (operation === 'getMessages') {
						// ----------------------------------
						//        inbox: getMessages
						// ----------------------------------

						const contactId = this.getNodeParameter('contactId', i);
						responseData = await lemlistApiRequest.call(this, 'GET', `/inbox/${contactId}`);
					} else if (operation === 'sendEmail') {
						// ----------------------------------
						//        inbox: sendEmail
						// ----------------------------------

						const toEmail = this.getNodeParameter('toEmail', i);
						const subject = this.getNodeParameter('subject', i);
						const body = this.getNodeParameter('body', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const requestBody: IDataObject = {
							to: toEmail,
							subject,
							body,
						};

						if (additionalFields.fromEmail) {
							requestBody.from = additionalFields.fromEmail;
						}
						if (additionalFields.cc) {
							requestBody.cc = additionalFields.cc;
						}
						if (additionalFields.bcc) {
							requestBody.bcc = additionalFields.bcc;
						}

						responseData = await lemlistApiRequest.call(this, 'POST', '/inbox/email', requestBody);
					} else if (operation === 'sendLinkedIn') {
						// ----------------------------------
						//        inbox: sendLinkedIn
						// ----------------------------------

						const contactId = this.getNodeParameter('contactId', i);
						const message = this.getNodeParameter('message', i);

						const requestBody: IDataObject = {
							contactId,
							message,
						};

						responseData = await lemlistApiRequest.call(
							this,
							'POST',
							'/inbox/linkedin',
							requestBody,
						);
					} else if (operation === 'sendWhatsApp') {
						// ----------------------------------
						//        inbox: sendWhatsApp
						// ----------------------------------

						const contactId = this.getNodeParameter('contactId', i);
						const message = this.getNodeParameter('message', i);

						const requestBody: IDataObject = {
							contactId,
							message,
						};

						responseData = await lemlistApiRequest.call(
							this,
							'POST',
							'/inbox/whatsapp',
							requestBody,
						);
					}
				} else if (resource === 'task') {
					// *********************************************************************
					//                             task
					// *********************************************************************

					if (operation === 'create') {
						// ----------------------------------
						//        task: create
						// ----------------------------------

						const taskType = this.getNodeParameter('taskType', i);
						const entityId = this.getNodeParameter('entityId', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							type: taskType,
							entityId,
						};

						if (!isEmpty(additionalFields)) {
							Object.assign(body, additionalFields);
						}

						responseData = await lemlistApiRequest.call(this, 'POST', '/tasks', body);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//        task: getAll
						// ----------------------------------

						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);

						const qs: IDataObject = {};

						if (!isEmpty(filters)) {
							Object.assign(qs, filters);
						}

						if (returnAll) {
							responseData = await lemlistApiRequestAllItems.call(this, 'GET', '/tasks', qs);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await lemlistApiRequest.call(this, 'GET', '/tasks', {}, qs);
						}
					} else if (operation === 'update') {
						// ----------------------------------
						//        task: update
						// ----------------------------------

						const taskId = this.getNodeParameter('taskId', i);
						const updateFields = this.getNodeParameter('updateFields', i);

						const body: IDataObject = {
							taskId,
						};

						if (!isEmpty(updateFields)) {
							Object.assign(body, updateFields);
						}

						responseData = await lemlistApiRequest.call(this, 'PATCH', '/tasks', body);
					} else if (operation === 'ignore') {
						// ----------------------------------
						//        task: ignore
						// ----------------------------------

						const taskIds = this.getNodeParameter('taskIds', i) as string;

						const body: IDataObject = {
							taskIds: taskIds.split(',').map((id) => id.trim()),
						};

						responseData = await lemlistApiRequest.call(this, 'POST', '/tasks/ignore', body);
					}
				} else if (resource === 'company') {
					// *********************************************************************
					//                             company
					// *********************************************************************

					if (operation === 'getAll') {
						// ----------------------------------
						//        company: getAll
						// ----------------------------------

						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);

						const qs: IDataObject = {};

						if (!isEmpty(filters)) {
							Object.assign(qs, filters);
						}

						if (returnAll) {
							responseData = await lemlistApiRequestAllItems.call(this, 'GET', '/companies', qs);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await lemlistApiRequest.call(this, 'GET', '/companies', {}, qs);
						}
					} else if (operation === 'addNote') {
						// ----------------------------------
						//        company: addNote
						// ----------------------------------

						const companyId = this.getNodeParameter('companyId', i);
						const content = this.getNodeParameter('content', i);

						const body: IDataObject = {
							content,
						};

						responseData = await lemlistApiRequest.call(
							this,
							'POST',
							`/companies/${companyId}/notes`,
							body,
						);
					} else if (operation === 'getNotes') {
						// ----------------------------------
						//        company: getNotes
						// ----------------------------------

						const companyId = this.getNodeParameter('companyId', i);
						responseData = await lemlistApiRequest.call(
							this,
							'GET',
							`/companies/${companyId}/notes`,
						);
					}
				} else if (resource === 'contact') {
					// *********************************************************************
					//                             contact
					// *********************************************************************

					if (operation === 'get') {
						// ----------------------------------
						//        contact: get
						// ----------------------------------

						const idOrEmail = this.getNodeParameter('idOrEmail', i);
						responseData = await lemlistApiRequest.call(this, 'GET', `/contacts/${idOrEmail}`);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//        contact: getAll
						// ----------------------------------

						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);

						const qs: IDataObject = {};

						if (!isEmpty(filters)) {
							Object.assign(qs, filters);
						}

						if (returnAll) {
							responseData = await lemlistApiRequestAllItems.call(this, 'GET', '/contacts', qs);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await lemlistApiRequest.call(this, 'GET', '/contacts', {}, qs);
						}
					}
				} else if (resource === 'webhook') {
					// *********************************************************************
					//                             webhook
					// *********************************************************************

					if (operation === 'create') {
						// ----------------------------------
						//        webhook: create
						// ----------------------------------

						const targetUrl = this.getNodeParameter('targetUrl', i);
						const event = this.getNodeParameter('event', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							targetUrl,
							type: event,
						};

						if (additionalFields.campaignId) {
							body.campaignId = additionalFields.campaignId;
						}
						if (additionalFields.isFirst !== undefined) {
							body.isFirst = additionalFields.isFirst;
						}

						responseData = await lemlistApiRequest.call(this, 'POST', '/hooks', body);
					} else if (operation === 'delete') {
						// ----------------------------------
						//        webhook: delete
						// ----------------------------------

						const webhookId = this.getNodeParameter('webhookId', i);
						responseData = await lemlistApiRequest.call(this, 'DELETE', `/hooks/${webhookId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//        webhook: getAll
						// ----------------------------------

						responseData = await lemlistApiRequest.call(this, 'GET', '/hooks');
					}
				} else if (resource === 'schedule') {
					// *********************************************************************
					//                             schedule
					// *********************************************************************

					if (operation === 'create') {
						// ----------------------------------
						//        schedule: create
						// ----------------------------------

						const name = this.getNodeParameter('name', i);
						const timezone = this.getNodeParameter('timezone', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							name,
							timezone,
						};

						// Process day fields
						const days = [
							'monday',
							'tuesday',
							'wednesday',
							'thursday',
							'friday',
							'saturday',
							'sunday',
						];
						for (const day of days) {
							if (additionalFields[day]) {
								body[day] =
									typeof additionalFields[day] === 'string'
										? JSON.parse(additionalFields[day])
										: additionalFields[day];
							}
						}

						responseData = await lemlistApiRequest.call(this, 'POST', '/schedules', body);
					} else if (operation === 'get') {
						// ----------------------------------
						//        schedule: get
						// ----------------------------------

						const scheduleId = this.getNodeParameter('scheduleId', i);
						responseData = await lemlistApiRequest.call(this, 'GET', `/schedules/${scheduleId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//        schedule: getAll
						// ----------------------------------

						const returnAll = this.getNodeParameter('returnAll', i);

						if (returnAll) {
							responseData = await lemlistApiRequestAllItems.call(this, 'GET', '/schedules', {});
						} else {
							const qs = {
								limit: this.getNodeParameter('limit', i),
							};
							responseData = await lemlistApiRequest.call(this, 'GET', '/schedules', {}, qs);
						}
					} else if (operation === 'update') {
						// ----------------------------------
						//        schedule: update
						// ----------------------------------

						const scheduleId = this.getNodeParameter('scheduleId', i);
						const updateFields = this.getNodeParameter('updateFields', i);

						const body: IDataObject = {};

						if (updateFields.name) {
							body.name = updateFields.name;
						}
						if (updateFields.timezone) {
							body.timezone = updateFields.timezone;
						}

						// Process day fields
						const days = [
							'monday',
							'tuesday',
							'wednesday',
							'thursday',
							'friday',
							'saturday',
							'sunday',
						];
						for (const day of days) {
							if (updateFields[day]) {
								body[day] =
									typeof updateFields[day] === 'string'
										? JSON.parse(updateFields[day])
										: updateFields[day];
							}
						}

						responseData = await lemlistApiRequest.call(
							this,
							'PATCH',
							`/schedules/${scheduleId}`,
							body,
						);
					} else if (operation === 'delete') {
						// ----------------------------------
						//        schedule: delete
						// ----------------------------------

						const scheduleId = this.getNodeParameter('scheduleId', i);
						responseData = await lemlistApiRequest.call(this, 'DELETE', `/schedules/${scheduleId}`);
					} else if (operation === 'associateWithCampaign') {
						// ----------------------------------
						//        schedule: associateWithCampaign
						// ----------------------------------

						const campaignId = this.getNodeParameter('campaignId', i);
						const scheduleId = this.getNodeParameter('scheduleId', i);

						responseData = await lemlistApiRequest.call(
							this,
							'POST',
							`/campaigns/${campaignId}/schedules/${scheduleId}`,
						);
					}
				} else if (resource === 'sequence') {
					// *********************************************************************
					//                             sequence
					// *********************************************************************

					if (operation === 'getAll') {
						// ----------------------------------
						//        sequence: getAll
						// ----------------------------------

						const campaignId = this.getNodeParameter('campaignId', i);
						responseData = await lemlistApiRequest.call(
							this,
							'GET',
							`/campaigns/${campaignId}/sequences`,
						);
					} else if (operation === 'createStep') {
						// ----------------------------------
						//        sequence: createStep
						// ----------------------------------

						const sequenceId = this.getNodeParameter('sequenceId', i);
						const stepType = this.getNodeParameter('stepType', i);
						const delayDays = this.getNodeParameter('delayDays', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							type: stepType,
							delayDays,
						};

						if (!isEmpty(additionalFields)) {
							Object.assign(body, additionalFields);
						}

						responseData = await lemlistApiRequest.call(
							this,
							'POST',
							`/sequences/${sequenceId}/steps`,
							body,
						);
					} else if (operation === 'updateStep') {
						// ----------------------------------
						//        sequence: updateStep
						// ----------------------------------

						const sequenceId = this.getNodeParameter('sequenceId', i);
						const stepId = this.getNodeParameter('stepId', i);
						const updateFields = this.getNodeParameter('updateFields', i);

						const body: IDataObject = {};

						if (!isEmpty(updateFields)) {
							Object.assign(body, updateFields);
						}

						responseData = await lemlistApiRequest.call(
							this,
							'PATCH',
							`/sequences/${sequenceId}/steps/${stepId}`,
							body,
						);
					} else if (operation === 'deleteStep') {
						// ----------------------------------
						//        sequence: deleteStep
						// ----------------------------------

						const sequenceId = this.getNodeParameter('sequenceId', i);
						const stepId = this.getNodeParameter('stepId', i);

						responseData = await lemlistApiRequest.call(
							this,
							'DELETE',
							`/sequences/${sequenceId}/steps/${stepId}`,
						);
					}
				} else if (resource === 'database') {
					// *********************************************************************
					//                             database
					// *********************************************************************

					if (operation === 'getFilters') {
						// ----------------------------------
						//        database: getFilters
						// ----------------------------------

						responseData = await lemlistApiRequest.call(this, 'GET', '/database/filters');
					} else if (operation === 'getPeopleSchema') {
						// ----------------------------------
						//        database: getPeopleSchema
						// ----------------------------------

						responseData = await lemlistApiRequest.call(this, 'GET', '/schema/people');
					} else if (operation === 'getCompaniesSchema') {
						// ----------------------------------
						//        database: getCompaniesSchema
						// ----------------------------------

						responseData = await lemlistApiRequest.call(this, 'GET', '/schema/companies');
					} else if (operation === 'searchPeople') {
						// ----------------------------------
						//        database: searchPeople
						// ----------------------------------

						const filtersInput = this.getNodeParameter('filters', i);
						const seed = this.getNodeParameter('seed', i) as string;
						const page = this.getNodeParameter('page', i) as number;
						const size = this.getNodeParameter('size', i) as number;
						const excludes = this.getNodeParameter('excludes', i) as string;

						// Build filters array from fixedCollection
						const filtersArray: IDataObject[] = [];
						if (filtersInput.filterValues && Array.isArray(filtersInput.filterValues)) {
							for (const filter of filtersInput.filterValues as IDataObject[]) {
								const filterObj: IDataObject = {
									filterId: filter.filterId,
									in:
										typeof filter.in === 'string'
											? filter.in
													.split(',')
													.map((v) => v.trim())
													.filter(Boolean)
											: [],
									out:
										typeof filter.out === 'string'
											? filter.out
													.split(',')
													.map((v) => v.trim())
													.filter(Boolean)
											: [],
								};
								filtersArray.push(filterObj);
							}
						}

						const body: IDataObject = {
							filters: filtersArray,
							seed,
							page,
							size,
							excludes: excludes ? excludes.split(',').map((v) => v.trim()) : [],
						};

						responseData = await lemlistApiRequest.call(this, 'POST', '/database/people', body);
					} else if (operation === 'searchCompanies') {
						// ----------------------------------
						//        database: searchCompanies
						// ----------------------------------

						const filtersInput = this.getNodeParameter('filters', i);
						const seed = this.getNodeParameter('seed', i) as string;
						const page = this.getNodeParameter('page', i) as number;
						const size = this.getNodeParameter('size', i) as number;
						const excludes = this.getNodeParameter('excludes', i) as string;

						// Build filters array from fixedCollection
						const filtersArray: IDataObject[] = [];
						if (filtersInput.filterValues && Array.isArray(filtersInput.filterValues)) {
							for (const filter of filtersInput.filterValues as IDataObject[]) {
								const filterObj: IDataObject = {
									filterId: filter.filterId,
									in:
										typeof filter.in === 'string'
											? filter.in
													.split(',')
													.map((v) => v.trim())
													.filter(Boolean)
											: [],
									out:
										typeof filter.out === 'string'
											? filter.out
													.split(',')
													.map((v) => v.trim())
													.filter(Boolean)
											: [],
								};
								filtersArray.push(filterObj);
							}
						}

						const body: IDataObject = {
							filters: filtersArray,
							seed,
							page,
							size,
							excludes: excludes ? excludes.split(',').map((v) => v.trim()) : [],
						};

						responseData = await lemlistApiRequest.call(this, 'POST', '/database/companies', body);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);

					returnData.push.apply(returnData, executionErrorData);
					continue;
				}
				throw error;
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject),
				{ itemData: { item: i } },
			);

			returnData.push.apply(returnData, executionData);
		}

		return [returnData];
	}
}
