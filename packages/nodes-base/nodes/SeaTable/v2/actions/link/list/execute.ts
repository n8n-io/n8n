import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { seaTableApiRequest } from '../../../GenericFunctions';

export async function list(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	// get parameters
	const tableName = this.getNodeParameter('tableName', index) as string;
	const linkColumn = this.getNodeParameter('linkColumn', index) as string;
	const rowId = this.getNodeParameter('rowId', index) as string;

	// get rows
	const responseData = await seaTableApiRequest.call(
		this,
		{},
		'POST',
		'/dtable-db/api/v1/linked-records/{{dtable_uuid}}/',
		{
			table_id: tableName.split(':::')[1],
			link_column: linkColumn.split(':::')[3],
			rows: [
				{
					row_id: rowId,
					offset: 0,
					limit: 100,
				},
			],
		},
	);
	return this.helpers.returnJsonArray(responseData[rowId] as IDataObject[]);
}
