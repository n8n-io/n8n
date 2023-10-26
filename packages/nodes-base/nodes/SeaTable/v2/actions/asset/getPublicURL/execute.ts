import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { seaTableApiRequest } from '../../../GenericFunctions';

export async function getPublicURL(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const assetPath = this.getNodeParameter('assetPath', index) as string;

	let responseData = [] as IDataObject[];
	if (assetPath) {
		responseData = await seaTableApiRequest.call(
			this,
			{},
			'GET',
			`/api/v2.1/dtable/app-download-link/?path=${assetPath}`,
		);
	}

	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
