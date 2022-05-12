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
	simplifyObjects,
} from './GenericFunctions';

import moment from 'moment';

export class NotionTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Notion Trigger (Beta)',
		name: 'notionTrigger',
		icon: 'file:notion.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Notion events occur',
		subtitle: '={{$parameter["event"]}}',
		defaults: {
			name: 'Notion Trigger',
		},
		credentials: [
			{
				name: 'notionApi',
				required: true,
				testedBy: 'notionApiCredentialTest',
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
						name: 'Page Added to Database',
						value: 'pageAddedToDatabase',
					},
					{
						name: 'Page Updated in Database',
						value: 'pagedUpdatedInDatabase',
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
							'pageAddedToDatabase',
							'pagedUpdatedInDatabase',
						],
					},
				},
				default: '',
				required: true,
				description: 'The ID of this database',
			},
			{
				displayName: 'Simplify Output',
				name: 'simple',
				type: 'boolean',
				displayOptions: {
					show: {
						event: [
							'pageAddedToDatabase',
							'pagedUpdatedInDatabase',
						],
					},
				},
				default: true,
				description: 'Whether to return a simplified version of the response instead of the raw data',
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
						name: database.title[0]?.plain_text || database.id,
						value: database.id,
					});
				}
				returnData.sort((a, b) => {
					if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) { return -1; }
					if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) { return 1; }
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

		const lastTimeChecked = webhookData.lastTimeChecked
			? moment(webhookData.lastTimeChecked as string)
			: moment().set({ second:0, millisecond:0 });  // Notion timestamp accuracy is only down to the minute
		console.log('==>', lastTimeChecked.utc().format());

		// because Notion timestamp accuracy is only down to the minute some duplicates can be fetch
		const possibleDuplicates = webhookData.possibleDuplicates as string[] ?? [];

		const sortProperty = (event === 'pageAddedToDatabase') ? 'created_time' : 'last_edited_time';

		const option: IDataObject = {
			headers: {
				'Notion-Version': '2022-02-22',
			},
		};

		const body: IDataObject = {
			page_size: 1,
			sorts: [
				{
					timestamp: sortProperty,
					direction: 'descending',
				},
			],
			filter: {
				timestamp: sortProperty,
				[sortProperty]: {
					on_or_after: lastTimeChecked.utc().format(),
				},
			},
		};

		let records: IDataObject[] = [];

		let hasMore = true;

		//get last record
		let { results: data } = await notionApiRequest.call(this, 'POST', `/databases/${databaseId}/query`, body, {}, '', option);

		if (this.getMode() === 'manual') {
			if (simple === true) {
				data = simplifyObjects(data, false, 1);
			}
			if (Array.isArray(data) && data.length) {
				return [this.helpers.returnJsonArray(data)];
			} else {
				return null;
			}
		}

		// if something changed after the last check
		if (Array.isArray(data) && data.length && Object.keys(data[0]).length !== 0) {
			do {
				body.page_size = 10;
				const { results, has_more, next_cursor } = await notionApiRequest.call(this, 'POST', `/databases/${databaseId}/query`, body, {}, '', option);
				records.push.apply(records, results);
				hasMore = has_more;
				if (next_cursor !== null) {
					body['start_cursor'] = next_cursor;
				}
			// Only stop when we reach records strictly before last recorded time to be sure we catch records from the same minute
			} while (!moment(records[records.length - 1][sortProperty] as string).isBefore(lastTimeChecked) && hasMore === true);

			// Filter out already processed left over records:
			// with a time strictly before the last record processed
			// or from the same minute not present in the list of processed records
			console.log('==>', possibleDuplicates);
			console.log('==>', records.length);
			records = records.filter((record: IDataObject) => !possibleDuplicates.includes(record.id as string));

			// Save the time of the most recent record processed
			if (records[0]) {
				webhookData.lastTimeChecked = moment(records[0][sortProperty] as string) ;
				const latestTimestamp = moment(records[0][sortProperty] as string);

				// Save record ids with the same timestamp as the latest processed records
				webhookData.possibleDuplicates = records
					.filter((record: IDataObject) => moment(record[sortProperty] as string).isSame(latestTimestamp))
					.map((record: IDataObject) => record.id);
			}
			if (simple === true) {
				records = simplifyObjects(records, false, 1);
			}

			if (Array.isArray(records) && records.length) {
				return [this.helpers.returnJsonArray(records)];
			}
		}

		return null;
	}
}
