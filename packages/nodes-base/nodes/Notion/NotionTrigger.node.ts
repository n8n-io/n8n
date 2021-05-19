import {
	IPollFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	notionApiRequest,
	notionApiRequestAllItems,
	simplifyProperties,
} from './GenericFunctions';

import * as moment from 'moment';

export class NotionTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Notion Trigger',
		name: 'notionTrigger',
		icon: 'file:notion.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Notion events occur',
		subtitle: '={{$parameter["event"]}}',
		defaults: {
			name: 'Notion Trigger',
			color: '#000000',
		},
		credentials: [
			{
				name: 'notionApi',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Record Added',
						value: 'recordAdded',
					},
					// {
					// 	name: 'Record Updated',
					// 	value: 'recordUpdated',
					// },
				],
				required: true,
				default: '',
			},
			{
				displayName: 'Database',
				name: 'databaseId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDatabases',
				},
				displayOptions: {
					show: {
						event: [
							'recordAdded',
							'recordUpdated',
						],
					},
				},
				default: '',
				required: true,
				description: 'The ID of this database.',
			},
			{
				displayName: 'Simple',
				name: 'simple',
				type: 'boolean',
				displayOptions: {
					show: {
						event: [
							'recordAdded',
							'recordUpdated',
						],
					},
				},
				default: true,
				description: 'When set to true a simplify version of the response will be used else the raw data.',
			},
		],
	};

	methods = {
		loadOptions: {
			async getDatabases(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { results: databases } = await notionApiRequest.call(this, 'POST', `/search`, { page_size: 100, filter: { property: 'object', value: 'database' } });
				for (const database of databases) {
					returnData.push({
						name: database.title[0].plain_text,
						value: database.id,
					});
				}
				returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});
				return returnData;
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const databaseId = this.getNodeParameter('databaseId') as string;
		const event = this.getNodeParameter('event') as string;
		const simple = this.getNodeParameter('simple') as boolean;

		const now = moment().utc().format();

		const startDate = webhookData.lastTimeChecked as string || now;

		const endDate = now;

		const maxPageSize = 10;

		const sortProperty = (event === 'recordAdded') ? 'created_time' : 'last_edited_time';

		const body: IDataObject = {
			page_size: maxPageSize,
			sorts: [
				{
					timestamp: sortProperty,
					direction: 'descending',
				},
			],
		};

		if (this.getMode() === 'manual') {
			body.page_size = 1;
		}

		let records: IDataObject[] = [];

		let hasMore = true;

		do {
			const { results, has_more, next_cursor } = await notionApiRequest.call(this, 'POST', `/databases/${databaseId}/query`, body);
			records.push.apply(records, results);
			hasMore = has_more;
			if (next_cursor !== null) {
				body['start_cursor'] = next_cursor;
			}
		} while (!moment(records[records.length - 1][sortProperty] as string).isSameOrBefore(startDate) && hasMore === true);

		if (this.getMode() !== 'manual') {
			records = records.filter((record: IDataObject) => moment(record[sortProperty] as string).isBetween(moment(startDate), moment(endDate)));
		}

		if (simple === true) {
			for (let i = 0; i < records.length; i++) {
				records[i].properties = simplifyProperties(records[i].properties);
			}
		}

		webhookData.lastTimeChecked = endDate;

		if (Array.isArray(records) && records.length) {
			return [this.helpers.returnJsonArray(records)];
		}
		return null;
	}
}
