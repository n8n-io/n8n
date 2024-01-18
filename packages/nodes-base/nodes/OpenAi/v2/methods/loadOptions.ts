import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { apiRequest } from '../transport';

export async function getAssistantFiles(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const assistant_id = this.getNodeParameter('assistantId', '', { extractValue: true });
	const { data } = await apiRequest.call(this, 'GET', '/files', { qs: { purpose: 'assistants' } });

	let assistantFiles = (
		await apiRequest.call(this, 'GET', `/assistants/${assistant_id}/files`, {
			headers: {
				'OpenAI-Beta': 'assistants=v1',
			},
		})
	).data;

	assistantFiles = ((assistantFiles as IDataObject[]) || []).map((file) => file.id as string);

	const returnData: INodePropertyOptions[] = [];

	for (const file of data || []) {
		if (assistantFiles.includes(file.id as string)) {
			returnData.push({
				name: file.filename as string,
				value: file.id as string,
			});
		}
	}

	return returnData;
}
