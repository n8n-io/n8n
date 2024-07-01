import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { seaTableApiRequest } from '../../../GenericFunctions';

export async function unlock(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const tableName = this.getNodeParameter('tableName', index) as string;
	const rowId = this.getNodeParameter('rowId', index) as string;

	const responseData = await seaTableApiRequest.call(
		this,
		{},
		'PUT',
		'/dtable-server/api/v1/dtables/{{dtable_uuid}}/unlock-rows/',
		{
			table_name: tableName,
			row_ids: [rowId],
		},
	);

	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
