import type {
	IPollFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { getColumns, rowFormatColumns, seaTableApiRequest, simplify } from './GenericFunctions';

import type { ICtx, IRow, IRowResponse } from './Interfaces';

import moment from 'moment';

export class SeaTableTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SeaTable Trigger',
		name: 'seaTableTrigger',
		icon: 'file:seaTable.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when SeaTable events occur',
		subtitle: '={{$parameter["event"]}}',
		defaults: {
			name: 'SeaTable Trigger',
		},
		credentials: [
			{
				name: 'seaTableApi',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Table Name or ID',
				name: 'tableName',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getTableNames',
				},
				default: '',
				description:
					'The name of SeaTable table to access. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Row Created',
						value: 'rowCreated',
						description: 'Trigger on newly created rows',
					},
					// {
					// 	name: 'Row Modified',
					// 	value: 'rowModified',
					// 	description: 'Trigger has recently modified rows',
					// },
				],
				default: 'rowCreated',
			},
			{
				displayName: 'Simplify',
				name: 'simple',
				type: 'boolean',
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
		],
	};

	methods = {
		loadOptions: {
			async getTableNames(this: ILoadOptionsFunctions) {
				const returnData: INodePropertyOptions[] = [];
				const {
					metadata: { tables },
				} = await seaTableApiRequest.call(
					this,
					{},
					'GET',
					'/dtable-server/api/v1/dtables/{{dtable_uuid}}/metadata',
				);
				for (const table of tables) {
					returnData.push({
						name: table.name,
						value: table.name,
					});
				}
				return returnData;
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const tableName = this.getNodeParameter('tableName') as string;
		const simple = this.getNodeParameter('simple') as boolean;
		const event = this.getNodeParameter('event') as string;
		const ctx: ICtx = {};
		const credentials = await this.getCredentials('seaTableApi');

		const timezone = (credentials.timezone as string) || 'Europe/Berlin';
		const now = moment().utc().format();
		const startDate = (webhookData.lastTimeChecked as string) || now;
		const endDate = now;
		webhookData.lastTimeChecked = endDate;

		let rows;

		const filterField = event === 'rowCreated' ? '_ctime' : '_mtime';

		const endpoint = '/dtable-db/api/v1/query/{{dtable_uuid}}/';

		if (this.getMode() === 'manual') {
			rows = (await seaTableApiRequest.call(this, ctx, 'POST', endpoint, {
				sql: `SELECT * FROM ${tableName} LIMIT 1`,
			})) as IRowResponse;
		} else {
			rows = (await seaTableApiRequest.call(this, ctx, 'POST', endpoint, {
				sql: `SELECT * FROM ${tableName}
					WHERE ${filterField} BETWEEN "${moment(startDate).tz(timezone).format('YYYY-MM-D HH:mm:ss')}"
					AND "${moment(endDate).tz(timezone).format('YYYY-MM-D HH:mm:ss')}"`,
			})) as IRowResponse;
		}

		let response;

		if (rows.metadata && rows.results) {
			const columns = getColumns(rows);
			if (simple) {
				response = simplify(rows, columns);
			} else {
				response = rows.results;
			}

			const allColumns = rows.metadata.map((meta) => meta.name);

			response = response
				//@ts-ignore
				.map((row: IRow) => rowFormatColumns(row, allColumns))
				.map((row: IRow) => ({ json: row }));
		}

		if (Array.isArray(response) && response.length) {
			return [response];
		}

		return null;
	}
}
