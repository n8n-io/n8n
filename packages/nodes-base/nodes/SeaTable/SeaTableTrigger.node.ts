import moment from 'moment-timezone';
import {
	type IPollFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import type {
	ICtx,
	IRow,
	IRowResponse,
	IGetMetadataResult,
	IGetRowsResult,
	IDtableMetadataColumn,
	ICollaborator,
	ICollaboratorsResult,
	IColumnDigitalSignature,
} from './v2/actions/Interfaces';
import { seaTableApiRequest, simplify_new, enrichColumns } from './v2/GenericFunctions';
import { loadOptions } from './v2/methods';

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
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'New Row',
						value: 'newRow',
						description: 'Trigger on newly created rows',
					},
					{
						name: 'New or Updated Row',
						value: 'updatedRow',
						description: 'Trigger has recently created or modified rows',
					},
					{
						name: 'New Signature',
						value: 'newAsset',
						description: 'Trigger on new signatures',
					},
				],
				default: 'newRow',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Table Name',
				name: 'tableName',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getTableNames',
				},
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
				description:
					'The name of SeaTable table to access. Choose from the list, or specify the name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'View Name',
				name: 'viewName',
				type: 'options',
				displayOptions: {
					show: {
						event: ['newRow', 'updatedRow'],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ['tableName'],
					loadOptionsMethod: 'getTableViews',
				},
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
				description:
					'The name of SeaTable view to access. Choose from the list, or specify the name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Signature Column',
				name: 'assetColumn',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						event: ['newAsset'],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ['tableName'],
					loadOptionsMethod: 'getSignatureColumns',
				},
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
				description:
					'Select the digital-signature column that should be tracked. Choose from the list, or specify the name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Simplify',
				name: 'simple',
				type: 'boolean',
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
			{
				displayName: '"Fetch Test Event" returns max. three items of the last hour.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	methods = { loadOptions };

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const event = this.getNodeParameter('event') as string;
		const tableName = this.getNodeParameter('tableName') as string;
		const viewName = (event !== 'newAsset' ? this.getNodeParameter('viewName') : '') as string;
		const assetColumn = (
			event === 'newAsset' ? this.getNodeParameter('assetColumn') : ''
		) as string;
		const simple = this.getNodeParameter('simple') as boolean;

		const ctx: ICtx = {};

		const startDate =
			this.getMode() === 'manual'
				? moment().utc().subtract(1, 'h').format()
				: (webhookData.lastTimeChecked as string);
		const endDate = (webhookData.lastTimeChecked = moment().utc().format());

		const filterField = event === 'newRow' ? '_ctime' : '_mtime';

		let requestMeta: IGetMetadataResult;
		let requestRows: IGetRowsResult;
		let metadata: IDtableMetadataColumn[] = [];
		let rows: IRow[];
		let sqlResult: IRowResponse;

		const limit = this.getMode() === 'manual' ? 3 : 1000;

		// New Signature
		if (event === 'newAsset') {
			const endpoint = '/dtable-db/api/v1/query/{{dtable_uuid}}/';
			sqlResult = await seaTableApiRequest.call(this, ctx, 'POST', endpoint, {
				sql: `SELECT _id, _ctime, _mtime, \`${assetColumn}\` FROM ${tableName} WHERE \`${assetColumn}\` IS NOT NULL ORDER BY _mtime DESC LIMIT ${limit}`,
				convert_keys: true,
			});

			metadata = sqlResult.metadata as IDtableMetadataColumn[];
			const columnType = metadata.find((obj) => obj.name == assetColumn);
			const assetColumnType = columnType?.type || null;

			// remove unwanted entries
			rows = sqlResult.results.filter((obj) => new Date(obj._mtime) > new Date(startDate));

			// split the objects into new lines (not necessary for digital-sign)
			const newRows: any = [];
			for (const row of rows) {
				if (assetColumnType === 'digital-sign') {
					const signature = (row[assetColumn] as IColumnDigitalSignature) || [];
					if (signature.sign_time) {
						if (new Date(signature.sign_time) > new Date(startDate)) {
							newRows.push(signature);
						}
					}
				}
			}
		}

		// View => use getRows.
		else if (viewName) {
			requestMeta = await seaTableApiRequest.call(
				this,
				ctx,
				'GET',
				'/dtable-server/api/v1/dtables/{{dtable_uuid}}/metadata/',
			);
			requestRows = await seaTableApiRequest.call(
				this,
				ctx,
				'GET',
				'/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/',
				{},
				{
					table_name: tableName,
					view_name: viewName,
					limit,
				},
			);

			metadata =
				requestMeta.metadata.tables.find((table) => table.name === tableName)?.columns ?? [];

			// remove unwanted rows that are too old (compare startDate with _ctime or _mtime)
			if (this.getMode() === 'manual') {
				rows = requestRows.rows;
			} else {
				rows = requestRows.rows.filter((obj) => new Date(obj[filterField]) > new Date(startDate));
			}
		} else {
			const endpoint = '/dtable-db/api/v1/query/{{dtable_uuid}}/';
			const sqlQuery = `SELECT * FROM \`${tableName}\` WHERE ${filterField} BETWEEN "${moment(
				startDate,
			).format('YYYY-MM-D HH:mm:ss')}" AND "${moment(endDate).format(
				'YYYY-MM-D HH:mm:ss',
			)}" ORDER BY ${filterField} DESC LIMIT ${limit}`;
			sqlResult = await seaTableApiRequest.call(this, ctx, 'POST', endpoint, {
				sql: sqlQuery,
				convert_keys: true,
			});
			metadata = sqlResult.metadata as IDtableMetadataColumn[];
			rows = sqlResult.results;
		}

		const collaboratorsResult: ICollaboratorsResult = await seaTableApiRequest.call(
			this,
			ctx,
			'GET',
			'/dtable-server/api/v1/dtables/{{dtable_uuid}}/related-users/',
		);
		const collaborators: ICollaborator[] = collaboratorsResult.user_list || [];

		if (Array.isArray(rows) && rows.length > 0) {
			// remove columns starting with _ if simple;
			if (simple) {
				rows = rows.map((row) => simplify_new(row));
			}

			// enrich column types like {collaborator, creator, last_modifier}, {image, file}
			// remove button column from rows
			rows = rows.map((row) => enrichColumns(row, metadata, collaborators));

			// prepare for final output
			return [this.helpers.returnJsonArray(rows)];
		}

		return null;
	}
}
