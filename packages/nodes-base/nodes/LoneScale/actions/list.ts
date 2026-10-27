import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { lonescaleApiRequest } from '../GenericFunctions';

export async function create(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const name = this.getNodeParameter('name', i) as string;
	const entity = this.getNodeParameter('type', i) as string;
	const body: IDataObject = {
		name,
		entity,
	};

	const responseData = await lonescaleApiRequest.call(this, 'POST', '/lists', body);
	return this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), {
		itemData: { item: i },
	});
}
