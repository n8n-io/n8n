import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { seaTableApiRequest } from '../../../GenericFunctions';

export async function metadata(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const responseData = await seaTableApiRequest.call(
		this,
		{},
		'GET',
		'/dtable-server/api/v1/dtables/{{dtable_uuid}}/metadata/',
	);
	return this.helpers.returnJsonArray(responseData.metadata as IDataObject[]);
}
