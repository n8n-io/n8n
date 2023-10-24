import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { microsoftApiRequest } from '../transport';

export async function getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	let planId = '';

	try {
		planId = this.getCurrentNodeParameter('planId', { extractValue: true }) as string;
	} catch (error) {}

	const operation = this.getNodeParameter('operation', 0);

	if (operation === 'update' && !planId) {
		planId = this.getCurrentNodeParameter('updateFields.planId', { extractValue: true }) as string;
	}

	const response = await microsoftApiRequest.call(
		this,
		'GET',
		`/v1.0/planner/plans/${planId}/details`,
	);

	const categoryDescriptions = response.categoryDescriptions as IDataObject;

	for (const key of Object.keys(categoryDescriptions)) {
		if (categoryDescriptions[key] !== null) {
			returnData.push({
				name: categoryDescriptions[key] as string,
				value: key,
			});
		}
	}
	return returnData;
}
