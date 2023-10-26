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
		row_id: rowId,
	};

	const responseData = await seaTableApiRequest.call(
		this,
		{},
		'DELETE',
		'/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/',
		requestBody,
	);

	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
