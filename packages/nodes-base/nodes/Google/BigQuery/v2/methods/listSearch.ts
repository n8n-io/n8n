import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { googleBigQueryApiRequest } from '../transport';

export async function searchProjects(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const qs = {
		pageToken: (paginationToken as string) || undefined,
	};

	const response = await googleBigQueryApiRequest.call(this, 'GET', '/v2/projects', undefined, qs);

	let { projects } = response;

	if (filter) {
		projects = projects.filter(
			(project: IDataObject) =>
				(project.friendlyName as string).includes(filter) ||
				(project.id as string).includes(filter),
		);
	}

	return {
		results: projects.map((project: IDataObject) => ({
			name: project.friendlyName as string,
			value: project.id,
			url: `https://console.cloud.google.com/bigquery?project=${project.id as string}`,
		})),
		paginationToken: response.nextPageToken,
	};
}

export async function searchDatasets(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const projectId = this.getNodeParameter('projectId', undefined, {
		extractValue: true,
	});

	const qs = {
		pageToken: (paginationToken as string) || undefined,
	};

	const response = await googleBigQueryApiRequest.call(
		this,
		'GET',
		`/v2/projects/${projectId}/datasets`,
		undefined,
		qs,
	);

	let { datasets } = response;

	if (filter) {
		datasets = datasets.filter((dataset: { datasetReference: IDataObject }) =>
			(dataset.datasetReference.datasetId as string).includes(filter),
		);
	}

	return {
		results: datasets.map((dataset: { datasetReference: IDataObject }) => ({
			name: dataset.datasetReference.datasetId as string,
			value: dataset.datasetReference.datasetId,
		})),
		paginationToken: response.nextPageToken,
	};
}

export async function searchTables(
	this: ILoadOptionsFunctions,
	filter?: string,
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

	const response = await googleBigQueryApiRequest.call(
		this,
		'GET',
		`/v2/projects/${projectId}/datasets/${datasetId}/tables`,
		undefined,
		qs,
	);

	let { tables } = response;

	if (filter) {
		tables = tables.filter((table: { tableReference: IDataObject }) =>
			(table.tableReference.tableId as string).includes(filter),
		);
	}

	const returnData = {
		results: tables.map((table: { tableReference: IDataObject }) => ({
			name: table.tableReference.tableId as string,
			value: table.tableReference.tableId,
		})),
		paginationToken: response.nextPageToken,
	};

	return returnData;
}
