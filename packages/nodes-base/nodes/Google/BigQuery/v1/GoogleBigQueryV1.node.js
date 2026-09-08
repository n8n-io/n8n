import { NodeConnectionTypes, NodeApiError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { oldVersionNotice } from '@utils/descriptions';
import { googleApiRequest, googleApiRequestAllItems, simplify } from './GenericFunctions';
import { recordFields, recordOperations } from './RecordDescription';
import { generatePairedItemData } from '../../../../utils/utilities';
const versionDescription = {
    displayName: 'Google BigQuery',
    name: 'googleBigQuery',
    icon: 'file:googleBigQuery.svg',
    group: ['input'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Consume Google BigQuery API',
    defaults: {
        name: 'Google BigQuery',
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
        {
            name: 'googleApi',
            required: true,
            displayOptions: {
                show: {
                    authentication: ['serviceAccount'],
                },
            },
        },
        {
            name: 'googleBigQueryOAuth2Api',
            required: true,
            displayOptions: {
                show: {
                    authentication: ['oAuth2'],
                },
            },
        },
    ],
    properties: [
        oldVersionNotice,
        {
            displayName: 'Authentication',
            name: 'authentication',
            type: 'options',
            noDataExpression: true,
            options: [
                {
                    // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
                    name: 'OAuth2 (recommended)',
                    value: 'oAuth2',
                },
                {
                    name: 'Service Account',
                    value: 'serviceAccount',
                },
            ],
            default: 'oAuth2',
        },
        {
            displayName: 'Resource',
            name: 'resource',
            type: 'options',
            noDataExpression: true,
            options: [
                {
                    name: 'Record',
                    value: 'record',
                },
            ],
            default: 'record',
        },
        ...recordOperations,
        ...recordFields,
    ],
};
export class GoogleBigQueryV1 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
        };
    }
    methods = {
        loadOptions: {
            async getProjects() {
                const returnData = [];
                const { projects } = await googleApiRequest.call(this, 'GET', '/v2/projects');
                for (const project of projects) {
                    returnData.push({
                        name: project.friendlyName,
                        value: project.id,
                    });
                }
                return returnData;
            },
            async getDatasets() {
                const projectId = this.getCurrentNodeParameter('projectId');
                const returnData = [];
                const { datasets } = await googleApiRequest.call(this, 'GET', `/v2/projects/${projectId}/datasets`);
                for (const dataset of datasets) {
                    returnData.push({
                        name: dataset.datasetReference.datasetId,
                        value: dataset.datasetReference.datasetId,
                    });
                }
                return returnData;
            },
            async getTables() {
                const projectId = this.getCurrentNodeParameter('projectId');
                const datasetId = this.getCurrentNodeParameter('datasetId');
                const returnData = [];
                const { tables } = await googleApiRequest.call(this, 'GET', `/v2/projects/${projectId}/datasets/${datasetId}/tables`);
                for (const table of tables) {
                    returnData.push({
                        name: table.tableReference.tableId,
                        value: table.tableReference.tableId,
                    });
                }
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        const qs = {};
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        if (resource === 'record') {
            // *********************************************************************
            //                               record
            // *********************************************************************
            if (operation === 'create') {
                // ----------------------------------
                //         record: create
                // ----------------------------------
                // https://cloud.google.com/bigquery/docs/reference/rest/v2/tabledata/insertAll
                const projectId = this.getNodeParameter('projectId', 0);
                const datasetId = this.getNodeParameter('datasetId', 0);
                const tableId = this.getNodeParameter('tableId', 0);
                const rows = [];
                const body = {};
                for (let i = 0; i < length; i++) {
                    const options = this.getNodeParameter('options', i);
                    Object.assign(body, options);
                    if (body.traceId === undefined) {
                        body.traceId = uuid();
                    }
                    const columns = this.getNodeParameter('columns', i);
                    const columnList = columns.split(',').map((column) => column.trim());
                    const record = {};
                    for (const key of Object.keys(items[i].json)) {
                        if (columnList.includes(key)) {
                            record[`${key}`] = items[i].json[key];
                        }
                    }
                    rows.push({ json: record });
                }
                body.rows = rows;
                const itemData = generatePairedItemData(items.length);
                try {
                    responseData = await googleApiRequest.call(this, 'POST', `/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/insertAll`, body);
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData });
                    returnData.push(...executionData);
                }
                catch (error) {
                    if (this.continueOnFail()) {
                        const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData });
                        returnData.push(...executionErrorData);
                    }
                    throw new NodeApiError(this.getNode(), error, { itemIndex: 0 });
                }
            }
            else if (operation === 'getAll') {
                // ----------------------------------
                //         record: getAll
                // ----------------------------------
                // https://cloud.google.com/bigquery/docs/reference/rest/v2/tables/get
                const returnAll = this.getNodeParameter('returnAll', 0);
                const projectId = this.getNodeParameter('projectId', 0);
                const datasetId = this.getNodeParameter('datasetId', 0);
                const tableId = this.getNodeParameter('tableId', 0);
                const simple = this.getNodeParameter('simple', 0);
                let fields;
                if (simple) {
                    const { schema } = await googleApiRequest.call(this, 'GET', `/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}`, {});
                    fields = (schema.fields || []).map((field) => field.name);
                }
                for (let i = 0; i < length; i++) {
                    try {
                        const options = this.getNodeParameter('options', i);
                        Object.assign(qs, options);
                        if (qs.selectedFields) {
                            fields = qs.selectedFields.split(',');
                        }
                        if (returnAll) {
                            responseData = await googleApiRequestAllItems.call(this, 'rows', 'GET', `/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/data`, {}, qs);
                        }
                        else {
                            qs.maxResults = this.getNodeParameter('limit', i);
                            responseData = await googleApiRequest.call(this, 'GET', `/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/data`, {}, qs);
                        }
                        if (!returnAll) {
                            responseData = responseData.rows;
                        }
                        responseData = simple
                            ? simplify(responseData, fields)
                            : responseData;
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
                    }
                    catch (error) {
                        if (this.continueOnFail()) {
                            const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                            returnData.push(...executionErrorData);
                            continue;
                        }
                        throw new NodeApiError(this.getNode(), error, { itemIndex: i });
                    }
                }
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=GoogleBigQueryV1.node.js.map