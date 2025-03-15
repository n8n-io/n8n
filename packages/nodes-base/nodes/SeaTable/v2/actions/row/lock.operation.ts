import type { IDataObject, INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';

import { seaTableApiRequest } from '../../GenericFunctions';

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const tableName = this.getNodeParameter('tableName', index) as string;
	const rowId = this.getNodeParameter('rowId', index) as string;

	const responseData = await seaTableApiRequest.call(
		this,
		{},
		'PUT',
		'/api-gateway/api/v2/dtables/{{dtable_uuid}}/lock-rows/',
		{
			table_name: tableName,
			row_ids: [rowId],
		},
	);

	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
