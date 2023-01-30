import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { googleApiRequest } from '../transport';

export async function searchProjects(
	this: ILoadOptionsFunctions,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const qs = {
		pageToken: (paginationToken as string) || undefined,
	};

	const response = await googleApiRequest.call(this, 'GET', '/v2/projects', undefined, qs);
	return {
		results: response.projects.map((project: IDataObject) => ({
			name: project.friendlyName as string,
			value: project.id,
			url: `https://console.cloud.google.com/bigquery?project=${project.id as string}`,
		})),
		paginationToken: response.nextPageToken,
	};
}

export async function searchDatasets(
	this: ILoadOptionsFunctions,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const projectId = this.getNodeParameter('projectId', undefined, {
		extractValue: true,
	});

	const qs = {
		pageToken: (paginationToken as string) || undefined,
	};

	const response = await googleApiRequest.call(
		this,
		'GET',
		`/v2/projects/${projectId}/datasets`,
		undefined,
		qs,
	);

	return {
		results: response.datasets.map((dataset: { datasetReference: IDataObject }) => ({
			name: dataset.datasetReference.datasetId as string,
			value: dataset.datasetReference.datasetId,
		})),
		paginationToken: response.nextPageToken,
	};
}

export async function searchTables(
	this: ILoadOptionsFunctions,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const projectId = this.getNodeParameter('projectId', undefined, {
		extractValue: true,
	});

	const datasetId = this.getNodeParameter('datasetId', undefined, {
		extractValue: true,
	});

	const qs = {
		pageToken: (paginationToken as string) || undefined,
	};

	const response = await googleApiRequest.call(
		this,
		'GET',
		`/v2/projects/${projectId}/datasets/${datasetId}/tables`,
		undefined,
		qs,
	);

	const returnData = {
		results: response.tables.map((tables: { tableReference: IDataObject }) => ({
			name: tables.tableReference.tableId as string,
			value: tables.tableReference.tableId,
		})),
		paginationToken: response.nextPageToken,
	};

	return returnData;
}
