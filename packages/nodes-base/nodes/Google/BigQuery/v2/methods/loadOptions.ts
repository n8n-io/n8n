import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { googleApiRequest } from '../transport';

export async function getDatasets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const projectId = this.getNodeParameter('projectId', undefined, {
		extractValue: true,
	});
	const returnData: INodePropertyOptions[] = [];
	const { datasets } = await googleApiRequest.call(
		this,
		'GET',
		`/v2/projects/${projectId}/datasets`,
	);
	for (const dataset of datasets) {
		returnData.push({
			name: dataset.datasetReference.datasetId as string,
			value: dataset.datasetReference.datasetId,
		});
	}
	return returnData;
}

export async function getSchema(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const projectId = this.getNodeParameter('projectId', undefined, {
		extractValue: true,
	});
	const datasetId = this.getNodeParameter('datasetId', undefined, {
		extractValue: true,
	});
	const tableId = this.getNodeParameter('tableId', undefined, {
		extractValue: true,
	});

	const returnData: INodePropertyOptions[] = [];

	const { schema } = await googleApiRequest.call(
		this,
		'GET',
		`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}`,
		{},
	);

	for (const field of schema.fields as IDataObject[]) {
		returnData.push({
			name: field.name as string,
			value: field.name as string,
			// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
			description:
				`type: ${field.type as string}` + (field.mode ? ` mode: ${field.mode as string}` : ''),
		});
	}
	return returnData;
}
