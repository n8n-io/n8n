import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	apiRequest,
} from '../transport';

export async function getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const response = await apiRequest.call(this, 'GET', 'templates', {});
	const { data : templates } = response;
	for (const template of templates) {
		returnData.push({
			name: template.name,
			value: template.id,
		});
	}
	return returnData;
}
