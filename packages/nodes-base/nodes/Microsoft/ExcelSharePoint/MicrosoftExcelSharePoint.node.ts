import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import * as appendTable from './actions/table/append.operation';
import * as convertTableToRange from './actions/table/convertToRange.operation';
import * as createTable from './actions/table/create.operation';
import * as deleteTable from './actions/table/deleteTable.operation';
import * as getAllTables from './actions/table/getAll.operation';
import * as getTableColumns from './actions/table/getColumns.operation';
import * as getTableRows from './actions/table/getRows.operation';
import * as lookupTable from './actions/table/lookup.operation';
import * as workbook from './actions/workbook/Workbook.resource';
import * as append from './actions/worksheet/append.operation';
import * as clear from './actions/worksheet/clear.operation';
import * as deleteWorksheet from './actions/worksheet/deleteWorksheet.operation';
import * as getAllWorksheets from './actions/worksheet/getAll.operation';
import * as updateWorksheet from './actions/worksheet/update.operation';
import * as upsertWorksheet from './actions/worksheet/upsert.operation';
import * as readRows from './actions/worksheet/readRows.operation';
import { listSearch, loadOptions } from './methods';

export class MicrosoftExcelSharePoint implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Excel (SharePoint)',
		name: 'microsoftExcelSharePoint',
		icon: 'file:excelSharePoint.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Read and write Excel workbooks stored in SharePoint document libraries',
		defaults: {
			name: 'Microsoft Excel (SharePoint)',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		// Legacy credentials deliberately excluded: the SharePoint one targets
		// the old _api host (not Graph); the Excel one has no Sites.* scopes.
		credentials: [
			{
				name: 'microsoftOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['microsoftOAuth2Api'],
					},
				},
			},
			{
				name: 'microsoftEntraServicePrincipalApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['microsoftEntraServicePrincipalApi'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Microsoft OAuth2 (Graph)',
						value: 'microsoftOAuth2Api',
						description:
							'Generic Microsoft Graph credential. Enable the scopes this node needs (e.g. Sites.ReadWrite.All) on the credential.',
					},
					{
						name: 'Microsoft Entra Service Principal (App-Only)',
						value: 'microsoftEntraServicePrincipalApi',
						description:
							'App-only access via a Microsoft Entra app registration with admin-consented SharePoint application permissions',
					},
				],
				default: 'microsoftOAuth2Api',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Sheet',
						value: 'worksheet',
					},
					{
						name: 'Table',
						value: 'table',
					},
					{
						name: 'Workbook',
						value: 'workbook',
					},
				],
				default: 'worksheet',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['worksheet'],
					},
				},
				options: [
					{
						name: 'Append',
						value: 'append',
						description: 'Append rows to the end of a sheet',
						action: 'Append rows to sheet',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-option-name-wrong-for-upsert
						name: 'Append or Update',
						value: 'upsert',
						// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-upsert
						description: 'Append a new row or update the current one if it already exists (upsert)',
						action: 'Append or update rows in sheet',
					},
					{
						name: 'Clear',
						value: 'clear',
						description: 'Clear sheet',
						action: 'Clear sheet',
					},
					{
						name: 'Delete',
						value: 'deleteWorksheet',
						description: 'Delete sheet',
						action: 'Delete sheet',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: "Retrieve a list of the workbook's sheets",
						action: 'Get many sheets',
					},
					{
						name: 'Get Rows',
						value: 'readRows',
						description: 'Read rows from a range or the used range of a sheet',
						action: 'Get rows in sheet',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update rows matched by a column value',
						action: 'Update rows in sheet',
					},
				],
				default: 'readRows',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['table'],
					},
				},
				options: [
					{
						name: 'Append',
						value: 'append',
						description: 'Append rows to the end of a table',
						action: 'Append rows to table',
					},
					{
						name: 'Convert to Range',
						value: 'convertToRange',
						description: 'Convert a table to a plain range of cells',
						action: 'Convert table to range',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a table from a range of cells',
						action: 'Create table',
					},
					{
						name: 'Delete',
						value: 'deleteTable',
						description: 'Delete table',
						action: 'Delete table',
					},
					{
						name: 'Get Columns',
						value: 'getColumns',
						description: "Retrieve a list of the table's columns",
						action: 'Get columns in table',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: "Retrieve a list of the workbook's tables",
						action: 'Get many tables',
					},
					{
						name: 'Get Rows',
						value: 'getRows',
						description: "Retrieve a list of the table's rows",
						action: 'Get rows in table',
					},
					{
						name: 'Lookup',
						value: 'lookup',
						description: 'Look for a specific column value and then return the matching row',
						action: 'Look up column value in table',
					},
				],
				default: 'getAll',
			},
			...append.description,
			...clear.description,
			...deleteWorksheet.description,
			...readRows.description,
			...getAllWorksheets.description,
			...updateWorksheet.description,
			...upsertWorksheet.description,
			...getAllTables.description,
			...getTableColumns.description,
			...getTableRows.description,
			...lookupTable.description,
			...appendTable.description,
			...createTable.description,
			...convertTableToRange.description,
			...deleteTable.description,
			...workbook.description,
		],
	};

	methods = { listSearch, loadOptions };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		if (resource === 'worksheet' && operation === 'append') {
			return [await append.execute.call(this, items)];
		}

		if (resource === 'worksheet' && operation === 'readRows') {
			return [await readRows.execute.call(this, items)];
		}
		if (resource === 'worksheet' && operation === 'getAll') {
			return [await getAllWorksheets.execute.call(this, items)];
		}
		if (resource === 'worksheet' && operation === 'update') {
			return [await updateWorksheet.execute.call(this, items)];
		}
		if (resource === 'worksheet' && operation === 'upsert') {
			return [await upsertWorksheet.execute.call(this, items)];
		}
		if (resource === 'table' && operation === 'getAll') {
			return [await getAllTables.execute.call(this, items)];
		}
		if (resource === 'table' && operation === 'getColumns') {
			return [await getTableColumns.execute.call(this, items)];
		}
		if (resource === 'table' && operation === 'getRows') {
			return [await getTableRows.execute.call(this, items)];
		}
		if (resource === 'table' && operation === 'lookup') {
			return [await lookupTable.execute.call(this, items)];
		}
		if (resource === 'table' && operation === 'append') {
			return [await appendTable.execute.call(this, items)];
		}
		if (resource === 'table' && operation === 'create') {
			return [await createTable.execute.call(this, items)];
		}
		if (resource === 'table' && operation === 'convertToRange') {
			return [await convertTableToRange.execute.call(this, items)];
		}
		if (resource === 'table' && operation === 'deleteTable') {
			return [await deleteTable.execute.call(this, items)];
		}
		if (resource === 'workbook' && operation === 'getAll') {
			return [await workbook.getAll.execute.call(this, items)];
		}

		if (resource === 'worksheet' && operation === 'clear') {
			return [await clear.execute.call(this, items)];
		}

		if (resource === 'worksheet' && operation === 'deleteWorksheet') {
			return [await deleteWorksheet.execute.call(this, items)];
		}

		if (resource === 'workbook' && operation === 'addWorksheet') {
			return [await workbook.addWorksheet.execute.call(this, items)];
		}

		if (resource === 'workbook' && operation === 'deleteWorkbook') {
			return [await workbook.deleteWorkbook.execute.call(this, items)];
		}

		throw new NodeOperationError(
			this.getNode(),
			`The operation "${String(operation)}" is not supported!`,
		);
	}
}
