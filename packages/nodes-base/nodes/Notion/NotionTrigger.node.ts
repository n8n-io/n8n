import moment from 'moment-timezone';
import {
	type IPollFunctions,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import {
	databaseUrlExtractionRegexp,
	databaseUrlValidationRegexp,
	idExtractionRegexp,
	idValidationRegexp,
} from './shared/constants';
import { notionApiRequest, simplifyObjects } from './shared/GenericFunctions';
import { listSearch } from './shared/methods';

export class NotionTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Notion Trigger',
		name: 'notionTrigger',
		icon: { light: 'file:notion.svg', dark: 'file:notion.dark.svg' },
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
			},
		],
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
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
				default: 'pageAddedToDatabase',
			},
			{
				displayName:
					'In Notion, make sure to <a href="https://www.notion.so/help/add-and-manage-connections-with-the-api" target="_blank">add your connection</a> to the pages you want to access.',
				name: 'notionNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Database',
				name: 'databaseId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'Database',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Database...',
						typeOptions: {
							searchListMethod: 'getDatabases',
							searchable: true,
						},
					},
					{
						displayName: 'Link',
						name: 'url',
						type: 'string',
						placeholder:
							'https://www.notion.so/0fe2f7de558b471eab07e9d871cdf4a9?v=f2d424ba0c404733a3f500c78c881610',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: databaseUrlValidationRegexp,
									errorMessage: 'Not a valid Notion Database URL',
								},
							},
						],
						extractValue: {
							type: 'regex',
							regex: databaseUrlExtractionRegexp,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'ab1545b247fb49fa92d6f4b49f4d8116',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: idValidationRegexp,
									errorMessage: 'Not a valid Notion Database ID',
								},
							},
						],
						extractValue: {
							type: 'regex',
							regex: idExtractionRegexp,
						},
						url: '=https://www.notion.so/{{$value.replace(/-/g, "")}}',
					},
				],
				displayOptions: {
					show: {
						event: ['pageAddedToDatabase', 'pagedUpdatedInDatabase'],
					},
				},
				description: 'The Notion Database to operate on',
			},
			{
				displayName: 'Simplify',
				name: 'simple',
				type: 'boolean',
				displayOptions: {
					show: {
						event: ['pageAddedToDatabase', 'pagedUpdatedInDatabase'],
					},
				},
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
		],
	};

	methods = {
		listSearch,
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const databaseId = this.getNodeParameter('databaseId', '', { extractValue: true }) as string;
		const event = this.getNodeParameter('event') as string;
		const simple = this.getNodeParameter('simple') as boolean;

		const lastTimeChecked = webhookData.lastTimeChecked
			? moment(webhookData.lastTimeChecked as string)
			: moment().set({ second: 0, millisecond: 0 }); // Notion timestamp accuracy is only down to the minute

		// update lastTimeChecked to now
		webhookData.lastTimeChecked = moment().set({ second: 0, millisecond: 0 });

		// because Notion timestamp accuracy is only down to the minute some duplicates can be fetch
		const possibleDuplicates = (webhookData.possibleDuplicates as string[]) ?? [];

		const sortProperty = event === 'pageAddedToDatabase' ? 'created_time' : 'last_edited_time';

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
			...(this.getMode() !== 'manual' && {
				filter: {
					timestamp: sortProperty,
					[sortProperty]: {
						on_or_after: lastTimeChecked.utc().format(),
					},
				},
			}),
		};

		let records: IDataObject[] = [];

		let hasMore = true;

		//get last record
		let { results: data } = await notionApiRequest.call(
			this,
			'POST',
			`/databases/${databaseId}/query`,
			body,
			{},
			'',
			option,
		);

		if (this.getMode() === 'manual') {
			if (simple) {
				data = simplifyObjects(data, false, 1);
			}
			if (Array.isArray(data) && data.length) {
				return [this.helpers.returnJsonArray(data)];
			}
		}

		// if something changed after the last check
		if (Array.isArray(data) && data.length && Object.keys(data[0] as IDataObject).length !== 0) {
			do {
				body.page_size = 10;
				const { results, has_more, next_cursor } = await notionApiRequest.call(
					this,
					'POST',
					`/databases/${databaseId}/query`,
					body,
					{},
					'',
					option,
				);
				records.push(...(results as IDataObject[]));
				hasMore = has_more;
				if (next_cursor !== null) {
					body.start_cursor = next_cursor;
				}
				// Only stop when we reach records strictly before last recorded time to be sure we catch records from the same minute
			} while (
				!moment(records[records.length - 1][sortProperty] as string).isBefore(lastTimeChecked) &&
				hasMore
			);

			// Filter out already processed left over records:
			// with a time strictly before the last record processed
			// or from the same minute not present in the list of processed records
			records = records.filter(
				(record: IDataObject) => !possibleDuplicates.includes(record.id as string),
			);

			// Save the time of the most recent record processed
			if (records[0]) {
				const latestTimestamp = moment(records[0][sortProperty] as string);

				// Save record ids with the same timestamp as the latest processed records
				webhookData.possibleDuplicates = records
					.filter((record: IDataObject) =>
						moment(record[sortProperty] as string).isSame(latestTimestamp),
					)
					.map((record: IDataObject) => record.id);
			} else {
				webhookData.possibleDuplicates = undefined;
			}

			if (simple) {
				records = simplifyObjects(records, false, 1);
			}

			if (Array.isArray(records) && records.length) {
				return [this.helpers.returnJsonArray(records)];
			}
		}

		return null;
	}
}
