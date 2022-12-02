import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	keysToSnakeCase,
	pagerDutyApiRequest,
	pagerDutyApiRequestAllItems,
} from './GenericFunctions';

import { incidentFields, incidentOperations } from './IncidentDescription';

import { incidentNoteFields, incidentNoteOperations } from './IncidentNoteDescription';

import { logEntryFields, logEntryOperations } from './LogEntryDescription';

import { userFields, userOperations } from './UserDescription';

import { IIncident } from './IncidentInterface';

import { snakeCase } from 'change-case';

import moment from 'moment-timezone';

export class PagerDuty implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PagerDuty',
		name: 'pagerDuty',
		icon: 'file:pagerDuty.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume PagerDuty API',
		defaults: {
			name: 'PagerDuty',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'pagerDutyApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['apiToken'],
					},
				},
			},
			{
				name: 'pagerDutyOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
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
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Incident',
						value: 'incident',
					},
					{
						name: 'Incident Note',
						value: 'incidentNote',
					},
					{
						name: 'Log Entry',
						value: 'logEntry',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'incident',
			},
			// INCIDENT
			...incidentOperations,
			...incidentFields,
			// INCIDENT NOTE
			...incidentNoteOperations,
			...incidentNoteFields,
			// LOG ENTRY
			...logEntryOperations,
			...logEntryFields,
			// USER
			...userOperations,
			...userFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available escalation policies to display them to user so that he can
			// select them easily
			async getEscalationPolicies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const escalationPolicies = await pagerDutyApiRequestAllItems.call(
					this,
					'escalation_policies',
					'GET',
					'/escalation_policies',
				);
				for (const escalationPolicy of escalationPolicies) {
					const escalationPolicyName = escalationPolicy.name;
					const escalationPolicyId = escalationPolicy.id;
					returnData.push({
						name: escalationPolicyName,
						value: escalationPolicyId,
					});
				}
				return returnData;
			},
			// Get all the available priorities to display them to user so that he can
			// select them easily
			async getPriorities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const priorities = await pagerDutyApiRequestAllItems.call(
					this,
					'priorities',
					'GET',
					'/priorities',
				);
				for (const priority of priorities) {
					const priorityName = priority.name;
					const priorityId = priority.id;
					const priorityDescription = priority.description;
					returnData.push({
						name: priorityName,
						value: priorityId,
						description: priorityDescription,
					});
				}
				return returnData;
			},
			// Get all the available services to display them to user so that he can
			// select them easily
			async getServices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const services = await pagerDutyApiRequestAllItems.call(
					this,
					'services',
					'GET',
					'/services',
				);
				for (const service of services) {
					const serviceName = service.name;
					const serviceId = service.id;
					returnData.push({
						name: serviceName,
						value: serviceId,
					});
				}
				return returnData;
			},
			// Get all the timezones to display them to user so that he can
			// select them easily
			async getTimezones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (const timezone of moment.tz.names()) {
					const timezoneName = timezone;
					const timezoneId = timezone;
					returnData.push({
						name: timezoneName,
						value: timezoneId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'incident') {
					//https://api-reference.pagerduty.com/#!/Incidents/post_incidents
					if (operation === 'create') {
						const title = this.getNodeParameter('title', i) as string;
						const serviceId = this.getNodeParameter('serviceId', i) as string;
						const email = this.getNodeParameter('email', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const conferenceBridge = (this.getNodeParameter('conferenceBridgeUi', i) as IDataObject)
							.conferenceBridgeValues as IDataObject;
						const body: IIncident = {
							type: 'incident',
							title,
							service: {
								id: serviceId,
								type: 'service_reference',
							},
						};
						if (additionalFields.details) {
							body.body = {
								type: 'incident_body',
								details: additionalFields.details,
							};
						}
						if (additionalFields.priorityId) {
							body.priority = {
								id: additionalFields.priorityId,
								type: 'priority_reference',
							};
						}
						if (additionalFields.escalationPolicyId) {
							body.escalation_policy = {
								id: additionalFields.escalationPolicyId,
								type: 'escalation_policy_reference',
							};
						}
						if (additionalFields.urgency) {
							body.urgency = additionalFields.urgency as string;
						}
						if (additionalFields.incidentKey) {
							body.incident_key = additionalFields.incidentKey as string;
						}
						if (conferenceBridge) {
							body.conference_bridge = {
								conference_number: conferenceBridge.conferenceNumber,
								conference_url: conferenceBridge.conferenceUrl,
							};
						}
						responseData = await pagerDutyApiRequest.call(
							this,
							'POST',
							'/incidents',
							{ incident: body },
							{},
							undefined,
							{ from: email },
						);
						responseData = responseData.incident;
					}
					//https://api-reference.pagerduty.com/#!/Incidents/get_incidents_id
					if (operation === 'get') {
						const incidentId = this.getNodeParameter('incidentId', i) as string;
						responseData = await pagerDutyApiRequest.call(this, 'GET', `/incidents/${incidentId}`);
						responseData = responseData.incident;
					}
					//https://api-reference.pagerduty.com/#!/Incidents/get_incidents
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', 0);
						const options = this.getNodeParameter('options', 0) as IDataObject;
						if (options.userIds) {
							options.userIds = (options.userIds as string).split(',') as string[];
						}
						if (options.teamIds) {
							options.teamIds = (options.teamIds as string).split(',') as string[];
						}
						if (options.include) {
							options.include = (options.include as string[]).map((e) => snakeCase(e));
						}
						if (options.sortBy) {
							options.sortBy = options.sortBy as string;
						}
						Object.assign(qs, keysToSnakeCase(options)[0]);
						if (returnAll) {
							responseData = await pagerDutyApiRequestAllItems.call(
								this,
								'incidents',
								'GET',
								'/incidents',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', 0);
							responseData = await pagerDutyApiRequest.call(this, 'GET', '/incidents', {}, qs);
							responseData = responseData.incidents;
						}
					}
					//https://api-reference.pagerduty.com/#!/Incidents/put_incidents_id
					if (operation === 'update') {
						const incidentId = this.getNodeParameter('incidentId', i) as string;
						const email = this.getNodeParameter('email', i) as string;
						const conferenceBridge = (this.getNodeParameter('conferenceBridgeUi', i) as IDataObject)
							.conferenceBridgeValues as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IIncident = {
							type: 'incident',
						};
						if (updateFields.title) {
							body.title = updateFields.title as string;
						}
						if (updateFields.escalationLevel) {
							body.escalation_level = updateFields.escalationLevel as number;
						}
						if (updateFields.details) {
							body.body = {
								type: 'incident_body',
								details: updateFields.details,
							};
						}
						if (updateFields.priorityId) {
							body.priority = {
								id: updateFields.priorityId,
								type: 'priority_reference',
							};
						}
						if (updateFields.escalationPolicyId) {
							body.escalation_policy = {
								id: updateFields.escalationPolicyId,
								type: 'escalation_policy_reference',
							};
						}
						if (updateFields.urgency) {
							body.urgency = updateFields.urgency as string;
						}
						if (updateFields.resolution) {
							body.resolution = updateFields.resolution as string;
						}
						if (updateFields.status) {
							body.status = updateFields.status as string;
						}
						if (conferenceBridge) {
							body.conference_bridge = {
								conference_number: conferenceBridge.conferenceNumber,
								conference_url: conferenceBridge.conferenceUrl,
							};
						}
						responseData = await pagerDutyApiRequest.call(
							this,
							'PUT',
							`/incidents/${incidentId}`,
							{ incident: body },
							{},
							undefined,
							{ from: email },
						);
						responseData = responseData.incident;
					}
				}
				if (resource === 'incidentNote') {
					//https://api-reference.pagerduty.com/#!/Incidents/post_incidents_id_notes
					if (operation === 'create') {
						const incidentId = this.getNodeParameter('incidentId', i) as string;
						const content = this.getNodeParameter('content', i) as string;
						const email = this.getNodeParameter('email', i) as string;
						const body: IDataObject = {
							content,
						};
						responseData = await pagerDutyApiRequest.call(
							this,
							'POST',
							`/incidents/${incidentId}/notes`,
							{ note: body },
							{},
							undefined,
							{ from: email },
						);
					}
					//https://api-reference.pagerduty.com/#!/Incidents/get_incidents_id_notes
					if (operation === 'getAll') {
						const incidentId = this.getNodeParameter('incidentId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', 0);
						if (returnAll) {
							responseData = await pagerDutyApiRequestAllItems.call(
								this,
								'notes',
								'GET',
								`/incidents/${incidentId}/notes`,
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', 0);
							responseData = await pagerDutyApiRequest.call(
								this,
								'GET',
								`/incidents/${incidentId}/notes`,
								{},
								qs,
							);
							responseData = responseData.notes;
						}
					}
				}
				if (resource === 'logEntry') {
					//https://api-reference.pagerduty.com/#!/Log_Entries/get_log_entries_id
					if (operation === 'get') {
						const logEntryId = this.getNodeParameter('logEntryId', i) as string;
						responseData = await pagerDutyApiRequest.call(
							this,
							'GET',
							`/log_entries/${logEntryId}`,
						);
						responseData = responseData.log_entry;
					}
					//https://api-reference.pagerduty.com/#!/Log_Entries/get_log_entries
					if (operation === 'getAll') {
						const options = this.getNodeParameter('options', i);
						Object.assign(qs, options);
						keysToSnakeCase(qs);
						const returnAll = this.getNodeParameter('returnAll', 0);
						if (returnAll) {
							responseData = await pagerDutyApiRequestAllItems.call(
								this,
								'log_entries',
								'GET',
								'/log_entries',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', 0);
							responseData = await pagerDutyApiRequest.call(this, 'GET', '/log_entries', {}, qs);
							responseData = responseData.log_entries;
						}
					}
				}
				if (resource === 'user') {
					//https://developer.pagerduty.com/api-reference/reference/REST/openapiv3.json/paths/~1users~1%7Bid%7D/get
					if (operation === 'get') {
						const userId = this.getNodeParameter('userId', i) as string;
						responseData = await pagerDutyApiRequest.call(this, 'GET', `/users/${userId}`);
						responseData = responseData.user;
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
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
		}
		return this.prepareOutputData(returnData);
	}
}
