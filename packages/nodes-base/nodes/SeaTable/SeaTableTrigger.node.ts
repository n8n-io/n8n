import {IPollFunctions} from 'n8n-core';

import {
		IDataObject,
		ILoadOptionsFunctions,
		INodeExecutionData,
		INodeType,
		INodeTypeDescription,
		NodeOperationError,
} from 'n8n-workflow';

import {
		apiCtx,
		apiDtableColumns,
		apiRequestAllItems,
		columnNamesGlob,
		columnNamesToArray,
		getTableNames,
		rowsFormatColumns,
		rowsTimeFilter,
		rowsTimeSort,
} from './GenericFunctions';

import * as moment from 'moment';
import {TCredentials, TTriggerOperation} from './types';
import {IApi} from './Interfaces';
import {schema} from './Schema';

export class SeaTableTrigger implements INodeType {
		description: INodeTypeDescription = {
				displayName: 'SeaTable Trigger',
				name: 'seatableTrigger',
				icon: 'file:seaTable.svg',
				group: ['trigger'],
				version: 1,
				description: 'Starts the workflow when SeaTable events occur',
				// nodelinter-ignore-next-line NON_STANDARD_SUBTITLE
				subtitle: '={{$parameter["operation"] + ": " + $parameter["table"]}}',
				defaults: {
						// nodelinter-ignore-next-line PARAM_DESCRIPTION_MISSING_WHERE_OPTIONAL
						name: 'SeaTable Trigger',
						color: '#FF8000',
				},
				credentials: [
						{
								// nodelinter-ignore-next-line PARAM_DESCRIPTION_MISSING_WHERE_OPTIONAL
								name: 'seatableApi',
								required: true,
						},
				],
				polling: true,
				inputs: [],
				outputs: ['main'],
				properties: [
						{
								displayName: 'Table',
								name: 'tableName',
								type: 'options',
								placeholder: 'Name of table',
								required: true,
								typeOptions: {
										loadOptionsMethod: 'getTableNames',
								},
								// nodelinter-ignore-next-line WRONG_DEFAULT_FOR_OPTIONS_TYPE_PARAM
								default: '',
								description: 'The name of SeaTable table to access',
						},
						{
								displayName: 'Trigger Operation',
								name: 'operation',
								type: 'options',
								options: [
										{
												name: 'Row Creation',
												value: 'create',
												description: 'Trigger has newly created rows',
										},
										{
												name: 'Row Modification',
												value: 'update',
												description: 'Trigger has recently modified rows',
										},
								],
								default: 'create',
								description: 'On what the trigger operates',
						},

						// ----------------------------------
						//         All
						// ----------------------------------
						{
								displayName: 'Additional Fields',
								name: 'additionalFields',
								type: 'collection',
								placeholder: 'Add Field',
								default: {},
								options: [
										{
												displayName: 'Columns:',
												name: 'columnNames',
												type: 'string',
												default: '',
												// nodelinter-ignore-next-line TECHNICAL_TERM_IN_PARAM_DESCRIPTION
												description: 'Additional columns to be included. <br><br>By default the standard (always first) column is returned, this field allows to add one or more additional.<br><br><ul><li>Multiple can be separated by comma. Example: <samp>Title,Surname</samp>.',
										},
								],
						},
				],
		};

		methods = {
				loadOptions: {
						async getTableNames(this: ILoadOptionsFunctions) {
								return await getTableNames.call(this);
						},
				},
		};

		async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
				const webhookData = this.getWorkflowStaticData('node');

				const qs: IDataObject = {};

				const tableName = this.getNodeParameter('tableName') as string;

				const triggerOperation = this.getNodeParameter('operation') as TTriggerOperation;

				const additionalFields = this.getNodeParameter('additionalFields') as IDataObject;

				const triggerColumn = triggerOperation === 'create' ? '_ctime' : '_mtime';

				let columnNames = columnNamesToArray(additionalFields.columnNames as string);

				const credentials: TCredentials = await this.getCredentials('seatableApi');
				const ctx = apiCtx(credentials as unknown as IApi);

				const endpoint = '/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/';

				const nowMoment = moment().utc();
				let lastTimeCheckedMoment = nowMoment;
				if (this.getMode() === 'manual') {
						lastTimeCheckedMoment = lastTimeCheckedMoment.subtract(2, 'minute');
				}

				const now = nowMoment.format(schema.dateTimeFormat);
				const lastTimeChecked = lastTimeCheckedMoment.format(schema.dateTimeFormat);
				const startDate = webhookData.lastTimeChecked as string || lastTimeChecked;
				const endDate = now;

				const dtableColumns = await apiDtableColumns.call(this, ctx, tableName);
				columnNames = columnNamesGlob(columnNames, dtableColumns);

				qs.table_name = tableName;

				const rows = await apiRequestAllItems.call(this, ctx, 'GET', endpoint, {}, qs);

				webhookData.lastTimeChecked = endDate;

				if (Array.isArray(rows.rows) && rows.rows.length) {
						if (this.getMode() === 'manual' && rows.rows[0][triggerColumn] === undefined) {
								throw new NodeOperationError(this.getNode(), `The Field "${triggerColumn}" does not exist.`);
						}
						rowsTimeFilter(rows, triggerColumn, startDate);
						rowsTimeSort(rows, triggerColumn);
						const [{name: defaultColumn}] = dtableColumns;
						columnNames = [defaultColumn, ...columnNames].filter((columnName) => dtableColumns.find(({name}) => name === columnName));
						rowsFormatColumns(rows, columnNames);

						return [this.helpers.returnJsonArray(rows.rows)];
				}

				return null;
		}
}
