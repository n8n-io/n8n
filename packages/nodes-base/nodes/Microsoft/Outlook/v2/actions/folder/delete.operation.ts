import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = [];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const folderId = this.getNodeParameter('folderId', index) as string;
	const responseData = await microsoftApiRequest.call(this, 'DELETE', `/mailFolders/${folderId}`);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
