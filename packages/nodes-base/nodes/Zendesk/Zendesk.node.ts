import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	zendeskApiRequest,
	zendeskApiRequestAllItems,
} from './GenericFunctions';
import {
	ticketFields,
	ticketOperations
} from './TicketDescription';
import {
	ITicket,
	IComment,
 } from './TicketInterface';

export class Zendesk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zendesk',
		name: 'zendesk',
		icon: 'file:zendesk.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Zendesk API',
		defaults: {
			name: 'Zendesk',
			color: '#13353c',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'zendeskApi',
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
						name: 'Ticket',
						value: 'ticket',
						description: 'Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support.',
					},
				],
				default: 'ticket',
				description: 'Resource to consume.',
			},
			...ticketOperations,
			...ticketFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the groups to display them to user so that he can
			// select them easily
			async getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const groups = await zendeskApiRequestAllItems.call(this, 'groups', 'GET', '/groups');
				for (const group of groups) {
					const groupName = group.name;
					const groupId = group.id;
					returnData.push({
						name: groupName,
						value: groupId,
					});
				}
				return returnData;
			},
			// Get all the tags to display them to user so that he can
			// select them easily
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const tags = await zendeskApiRequestAllItems.call(this, 'tags', 'GET', '/tags');
				for (const tag of tags) {
					const tagName = tag.name;
					const tagId = tag.name;
					returnData.push({
						name: tagName,
						value: tagId,
					});
				}
				return returnData;
			},
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;
		for (let i = 0; i < length; i++) {
			const resource = this.getNodeParameter('resource', 0) as string;
			const operation = this.getNodeParameter('operation', 0) as string;
			//https://developer.zendesk.com/rest_api/docs/support/introduction
			if (resource === 'ticket') {
				//https://developer.zendesk.com/rest_api/docs/support/tickets
				if (operation === 'create') {
					const description = this.getNodeParameter('description', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const comment: IComment = {
						body: description,
					};
					const body: ITicket = {
							comment,
					};
					if (additionalFields.type) {
						body.type = additionalFields.type as string;
					}
					if (additionalFields.externalId) {
						body.external_id = additionalFields.externalId as string;
					}
					if (additionalFields.subject) {
						body.subject = additionalFields.subject as string;
					}
					if (additionalFields.status) {
						body.status = additionalFields.status as string;
					}
					if (additionalFields.recipient) {
						body.recipient = additionalFields.recipient as string;
					}
					if (additionalFields.group) {
						body.group = additionalFields.group as string;
					}
					if (additionalFields.tags) {
						body.tags = additionalFields.tags as string[];
					}
					try {
						responseData = await zendeskApiRequest.call(this, 'POST', '/tickets', { ticket: body });
						responseData = responseData.ticket;
					} catch (err) {
						throw new Error(`Zendesk Error: ${err}`);
					}
				}
				//https://developer.zendesk.com/rest_api/docs/support/tickets#update-ticket
				if (operation === 'update') {
					const ticketId = this.getNodeParameter('id', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const body: ITicket = {};
					if (updateFields.type) {
						body.type = updateFields.type as string;
					}
					if (updateFields.externalId) {
						body.external_id = updateFields.externalId as string;
					}
					if (updateFields.subject) {
						body.subject = updateFields.subject as string;
					}
					if (updateFields.status) {
						body.status = updateFields.status as string;
					}
					if (updateFields.recipient) {
						body.recipient = updateFields.recipient as string;
					}
					if (updateFields.group) {
						body.group = updateFields.group as string;
					}
					if (updateFields.tags) {
						body.tags = updateFields.tags as string[];
					}
					try {
						responseData = await zendeskApiRequest.call(this, 'PUT', `/tickets/${ticketId}`, { ticket: body });
						responseData = responseData.ticket;
					} catch (err) {
						throw new Error(`Zendesk Error: ${err}`);
					}
				}
				//https://developer.zendesk.com/rest_api/docs/support/tickets#show-ticket
				if (operation === 'get') {
					const ticketId = this.getNodeParameter('id', i) as string;
					try {
						responseData = await zendeskApiRequest.call(this, 'GET', `/tickets/${ticketId}`, {});
						responseData = responseData.ticket;
					} catch (err) {
						throw new Error(`Zendesk Error: ${err}`);
					}
				}
				//https://developer.zendesk.com/rest_api/docs/support/search#list-search-results
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('options', i) as IDataObject;
					qs.query = 'type:ticket';
					if (options.status) {
						qs.query += ` status:${options.status}`;
					}
					if (options.sortBy) {
						qs.sort_by = options.sortBy;
					}
					if (options.sortOrder) {
						qs.sort_order = options.sortOrder;
					}
					try {
						if (returnAll) {
							responseData = await zendeskApiRequestAllItems.call(this, 'results', 'GET', `/search`, {}, qs);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.per_page = limit;
							responseData = await zendeskApiRequest.call(this, 'GET', `/search`, {}, qs);
							responseData = responseData.results;
						}
					} catch (err) {
						throw new Error(`Zendesk Error: ${err}`);
					}
				}
				//https://developer.zendesk.com/rest_api/docs/support/tickets#delete-ticket
				if (operation === 'delete') {
					const ticketId = this.getNodeParameter('id', i) as string;
					try {
						responseData = await zendeskApiRequest.call(this, 'DELETE', `/tickets/${ticketId}`, {});
					} catch (err) {
						throw new Error(`Zendesk Error: ${err}`);
					}
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
