import {IPollFunctions} from 'n8n-core';

import {IDataObject, INodeExecutionData, INodeType, INodeTypeDescription, NodeOperationError} from 'n8n-workflow';

import {
		apiDtableColumns,
		apiRequestAllItems,
		columnNamesToArray,
		ctx as apiCtx,
		IApi,
		rowsFormatColumns,
		rowsTimeFilter,
		rowsTimeSort,
		TTriggerOperationValue,
} from './GenericFunctions';

import * as moment from 'moment';

export class SeaTableTrigger implements INodeType {
		description: INodeTypeDescription = {
				displayName: 'SeaTable Trigger',
				name: 'seatableTrigger',
				icon: 'file:seaTable.svg',
				group: ['trigger'],
				version: 1,
				description: 'Starts the workflow when SeaTable events occur',
				subtitle: '={{$parameter["event"]}}',
				defaults: {
						name: 'SeaTable Trigger',
						color: '#FF8000',
				},
				credentials: [
						{
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
								type: 'string',
								default: '',
								placeholder: 'Name of table',
								required: true,
								description: 'The name of SeaTable table to access.',
						},
						{
								displayName: 'Trigger Operation',
								name: 'operation',
								type: 'options',
								options: [
										{
												name: 'Row Creation',
												value: 'create',
												description: 'Trigger has newly created rows.',
										},
										{
												name: 'Row Modification',
												value: 'update',
												description: 'Trigger has recently modified rows.',
										},
								],
								default: 'create',
								description: 'On what the trigger operates.',
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
												description: `Additional columns to be included in the response. <br><br>By default the standard (always first) column is returned, this field allows to add one or more additional fields.<br><br>
																			<ul><li>Multiple ones can be set separated by comma. Example: <samp>Title,Surname</samp>.<br>`,
										},
								],
						},
				],
		};

		async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
				const webhookData = this.getWorkflowStaticData('node');

				const qs: IDataObject = {};

				const table = this.getNodeParameter('tableName') as string;

				const triggerOperation = this.getNodeParameter('operation') as TTriggerOperationValue;

				const additionalFields = this.getNodeParameter('additionalFields') as IDataObject;

				const triggerColumn = triggerOperation === 'create' ? '_ctime' : '_mtime';

				let columnNames = columnNamesToArray(additionalFields.columnNames as string);

				const ctx = apiCtx(this.getCredentials('seatableApi') as unknown as IApi);

				const endpoint = '/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/';

				const nowMoment = moment().utc();
				let lastTimeCheckedMoment = nowMoment;
				if (this.getMode() === 'manual') {
						lastTimeCheckedMoment = lastTimeCheckedMoment.subtract(2, 'minute');
				}
				const dateTimeFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
				const now = nowMoment.format(dateTimeFormat);
				const lastTimeChecked = lastTimeCheckedMoment.format(dateTimeFormat);
				const startDate = webhookData.lastTimeChecked as string || lastTimeChecked;
				const endDate = now;

				const dtableColumns = await apiDtableColumns.call(this, ctx, table);

				qs.table_name = table;

				const rows = await apiRequestAllItems.call(this, ctx, 'GET', endpoint, {}, qs);

				webhookData.lastTimeChecked = endDate;

				if (Array.isArray(rows.rows) && rows.rows.length) {
						if (this.getMode() === 'manual' && rows.rows[0][triggerColumn] === undefined) {
								throw new NodeOperationError(this.getNode(), `The Field "${triggerColumn}" does not exist.`);
						}
						rowsTimeFilter(rows, triggerColumn, startDate);
						rowsTimeSort(rows, triggerColumn);
						const [{name: defaultColumn}] = dtableColumns;
						columnNames = [defaultColumn, ...columnNames].filter((name) => dtableColumns.find((column) => column.name === name));
						rowsFormatColumns(rows, columnNames);

						return [this.helpers.returnJsonArray(rows.rows)];
				}

				return null;
		}
}
