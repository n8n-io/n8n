import { googleBigQueryApiRequest } from '../transport';
export async function searchProjects(filter, paginationToken) {
    const qs = {
        pageToken: paginationToken || undefined,
    };
    const response = await googleBigQueryApiRequest.call(this, 'GET', '/v2/projects', undefined, qs);
    let { projects } = response;
    if (filter) {
        projects = projects.filter((project) => project.friendlyName.includes(filter) ||
            project.id.includes(filter));
    }
    return {
        results: projects.map((project) => ({
            name: project.friendlyName,
            value: project.id,
            url: `https://console.cloud.google.com/bigquery?project=${project.id}`,
        })),
        paginationToken: response.nextPageToken,
    };
}
export async function searchDatasets(filter, paginationToken) {
    const projectId = this.getNodeParameter('projectId', undefined, {
        extractValue: true,
    });
    const qs = {
        pageToken: paginationToken || undefined,
    };
    const response = await googleBigQueryApiRequest.call(this, 'GET', `/v2/projects/${projectId}/datasets`, undefined, qs);
    let { datasets } = response;
    if (filter) {
        datasets = datasets.filter((dataset) => dataset.datasetReference.datasetId.includes(filter));
    }
    return {
        results: datasets.map((dataset) => ({
            name: dataset.datasetReference.datasetId,
            value: dataset.datasetReference.datasetId,
        })),
        paginationToken: response.nextPageToken,
    };
}
export async function searchTables(filter, paginationToken) {
    const projectId = this.getNodeParameter('projectId', undefined, {
        extractValue: true,
    });
    const datasetId = this.getNodeParameter('datasetId', undefined, {
        extractValue: true,
    });
    const qs = {
        pageToken: paginationToken || undefined,
    };
    const response = await googleBigQueryApiRequest.call(this, 'GET', `/v2/projects/${projectId}/datasets/${datasetId}/tables`, undefined, qs);
    let { tables } = response;
    if (filter) {
        tables = tables.filter((table) => table.tableReference.tableId.includes(filter));
    }
    const returnData = {
        results: tables.map((table) => ({
            name: table.tableReference.tableId,
            value: table.tableReference.tableId,
        })),
        paginationToken: response.nextPageToken,
    };
    return returnData;
}
//# sourceMappingURL=listSearch.js.map