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
	NodeOperationError,
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
						name: 'On New Record',
						value: 'OnNewRecord',
					},
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
							'OnNewRecord',
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
							'OnNewRecord',
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
				const databases = await notionApiRequestAllItems.call(this, 'results', 'GET', `/databases`);
				for (const database of databases) {
					returnData.push({
						name: database.title[0].plain_text,
						value: database.id,
					});
				}
				return returnData;
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const databaseId = this.getNodeParameter('databaseId') as string;
		const simple = this.getNodeParameter('simple') as boolean;

		const now = moment().utc().format();

		const startDate = webhookData.lastTimeChecked as string || now;

		const endDate = now;

		const body: IDataObject = {
			filter: {
				property: 'timestamp',
				created_time: { after: startDate },
			},
		};

		if (this.getMode() === 'manual') {
			delete body.filter;
		}

		let records = await notionApiRequestAllItems.call(this, 'results', 'POST', `/databases/${databaseId}/query`, body);

		if (this.getMode() === 'manual') {
			records = records.splice(0, 1);
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
