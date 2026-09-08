import { googleBigQueryApiRequest } from '../transport';
export async function getDatasets() {
    const projectId = this.getNodeParameter('projectId', undefined, {
        extractValue: true,
    });
    const returnData = [];
    const { datasets } = await googleBigQueryApiRequest.call(this, 'GET', `/v2/projects/${projectId}/datasets`);
    for (const dataset of datasets) {
        returnData.push({
            name: dataset.datasetReference.datasetId,
            value: dataset.datasetReference.datasetId,
        });
    }
    return returnData;
}
export async function getSchema() {
    const projectId = this.getNodeParameter('projectId', undefined, {
        extractValue: true,
    });
    const datasetId = this.getNodeParameter('datasetId', undefined, {
        extractValue: true,
    });
    const tableId = this.getNodeParameter('tableId', undefined, {
        extractValue: true,
    });
    const returnData = [];
    const { schema } = await googleBigQueryApiRequest.call(this, 'GET', `/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}`, {});
    for (const field of schema.fields) {
        returnData.push({
            name: field.name,
            value: field.name,
            description: `type: ${field.type}` + (field.mode ? ` mode: ${field.mode}` : ''),
        });
    }
    return returnData;
}
//# sourceMappingURL=loadOptions.js.map