import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { seaTableApiRequest } from '../../../GenericFunctions';

export async function remove(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const tableName = this.getNodeParameter('tableName', index) as string;
	const rowId = this.getNodeParameter('rowId', index) as string;

	const requestBody: IDataObject = {
		table_name: tableName,
		row_ids: [rowId],
	};

	const responseData = await seaTableApiRequest.call(
		this,
		{},
		'DELETE',
		'/dtable-db/api/v1/delete-rows/{{dtable_uuid}}/',
		requestBody,
	);

	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
