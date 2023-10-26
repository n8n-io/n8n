import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import {
	seaTableApiRequest,
	getTableColumns,
	split,
	rowExport,
	updateAble,
	splitStringColumnsToArrays,
} from '../../../GenericFunctions';
import type { IRowObject } from '../../Interfaces';
import type { TColumnsUiValues, TColumnValue } from '../../../types';

export async function update(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const tableName = this.getNodeParameter('tableName', index) as string;
	const tableColumns = await getTableColumns.call(this, tableName);
	const fieldsToSend = this.getNodeParameter('fieldsToSend', index) as
		| 'defineBelow'
		| 'autoMapInputData';
	const rowId = this.getNodeParameter('rowId', index) as string;

	const body = {
		table_name: tableName,
		row_id: rowId,
	} as IDataObject;
	let rowInput = {} as IRowObject;

	// get rowInput, an object of key:value pairs like { Name: 'Promo Action 1', Status: "Draft" }.
	if (fieldsToSend === 'autoMapInputData') {
		const items = this.getInputData();
		const incomingKeys = Object.keys(items[index].json);
		const inputDataToIgnore = split(this.getNodeParameter('inputsToIgnore', index, '') as string);
		for (const key of incomingKeys) {
			if (inputDataToIgnore.includes(key)) continue;
			rowInput[key] = items[index].json[key] as TColumnValue;
		}
	} else {
		const columns = this.getNodeParameter('columnsUi.columnValues', index, []) as TColumnsUiValues;
		for (const column of columns) {
			rowInput[column.columnName] = column.columnValue;
		}
	}

	// only keep key:value pairs for columns that are allowed to update.
	rowInput = rowExport(rowInput, updateAble(tableColumns));

	// string to array: multi-select and collaborators
	rowInput = splitStringColumnsToArrays(rowInput, tableColumns);

	body.row = rowInput;

	const responseData = await seaTableApiRequest.call(
		this,
		{},
		'PUT',
		'/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/',
		body,
	);

	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
