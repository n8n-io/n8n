import { NodeConnectionTypes } from 'n8n-workflow';
import { parseAndResolveQueryParameters } from '@utils/query-parameters';
import { collectionFields, collectionOperations } from './CollectionDescription';
import { documentFields, documentOperations } from './DocumentDescription';
import { fullDocumentToJson, googleApiRequest, googleApiRequestAllItems, jsonToDocument, } from './GenericFunctions';
import { generatePairedItemData } from '../../../../utils/utilities';
export class GoogleFirebaseCloudFirestore {
    description = {
        displayName: 'Google Cloud Firestore',
        name: 'googleFirebaseCloudFirestore',
        // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
        icon: 'file:googleFirebaseCloudFirestore.png',
        group: ['input'],
        version: [1, 1.1],
        subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
        description: 'Interact with Google Firebase - Cloud Firestore API',
        schemaPath: 'Google/Firebase/CloudFirestore',
        defaults: {
            name: 'Google Cloud Firestore',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'googleFirebaseCloudFirestoreOAuth2Api',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['googleFirebaseCloudFirestoreOAuth2Api'],
                    },
                },
            },
            {
                name: 'googleApi',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['serviceAccount'],
                    },
                },
            },
        ],
        properties: [
            {
                displayName: 'Authentication',
                name: 'authentication',
                type: 'options',
                options: [
                    {
                        // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
                        name: 'OAuth2 (recommended)',
                        value: 'googleFirebaseCloudFirestoreOAuth2Api',
                    },
                    {
                        name: 'Service Account',
                        value: 'serviceAccount',
                    },
                ],
                default: 'googleFirebaseCloudFirestoreOAuth2Api',
            },
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Document',
                        value: 'document',
                    },
                    {
                        name: 'Collection',
                        value: 'collection',
                    },
                ],
                default: 'document',
            },
            ...documentOperations,
            ...documentFields,
            ...collectionOperations,
            ...collectionFields,
        ],
    };
    methods = {
        loadOptions: {
            async getProjects() {
                const collections = await googleApiRequestAllItems.call(this, 'results', 'GET', '', {}, {}, 'https://firebase.googleapis.com/v1beta1/projects');
                // @ts-ignore
                const returnData = collections.map((o) => ({
                    name: o.projectId,
                    value: o.projectId,
                }));
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const itemData = generatePairedItemData(items.length);
        const returnData = [];
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        const nodeVersion = this.getNode().typeVersion;
        let itemsLength = items.length ? 1 : 0;
        let fallbackPairedItems;
        if (nodeVersion >= 1.1) {
            itemsLength = items.length;
        }
        else {
            fallbackPairedItems = generatePairedItemData(items.length);
        }
        if (resource === 'document') {
            if (operation === 'get') {
                const projectId = this.getNodeParameter('projectId', 0);
                const database = this.getNodeParameter('database', 0);
                const simple = this.getNodeParameter('simple', 0);
                const documentList = items.map((_, i) => {
                    const collection = this.getNodeParameter('collection', i);
                    const documentId = this.getNodeParameter('documentId', i);
                    return `projects/${projectId}/databases/${database}/documents/${collection}/${documentId}`;
                });
                responseData = await googleApiRequest.call(this, 'POST', `/${projectId}/databases/${database}/documents:batchGet`, { documents: documentList });
                responseData = responseData.map((element) => {
                    if (element.found) {
                        element.found.id = element.found.name.split('/').pop();
                    }
                    return element;
                });
                if (simple) {
                    responseData = responseData
                        .map((element) => {
                        return fullDocumentToJson(element.found);
                    })
                        .filter((el) => !!el);
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData });
                returnData.push(...executionData);
            }
            else if (operation === 'create') {
                const projectId = this.getNodeParameter('projectId', 0);
                const database = this.getNodeParameter('database', 0);
                const simple = this.getNodeParameter('simple', 0);
                await Promise.all(items.map(async (item, i) => {
                    const collection = this.getNodeParameter('collection', i);
                    const columns = this.getNodeParameter('columns', i);
                    const documentId = this.getNodeParameter('documentId', i);
                    const columnList = columns.split(',').map((column) => column.trim());
                    const document = { fields: {} };
                    columnList.map((column) => {
                        // @ts-ignore
                        if (item.json[column]) {
                            // @ts-ignore
                            document.fields[column] = jsonToDocument(item.json[column]);
                        }
                        else {
                            // @ts-ignore
                            document.fields[column] = jsonToDocument(null);
                        }
                    });
                    responseData = await googleApiRequest.call(this, 'POST', `/${projectId}/databases/${database}/documents/${collection}`, document, { documentId });
                    responseData.id = responseData.name.split('/').pop();
                    if (simple) {
                        responseData = fullDocumentToJson(responseData);
                    }
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                    returnData.push(...executionData);
                }));
            }
            else if (operation === 'getAll') {
                for (let i = 0; i < itemsLength; i++) {
                    try {
                        const projectId = this.getNodeParameter('projectId', i);
                        const database = this.getNodeParameter('database', i);
                        const collection = this.getNodeParameter('collection', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const simple = this.getNodeParameter('simple', i);
                        if (returnAll) {
                            responseData = await googleApiRequestAllItems.call(this, 'documents', 'GET', `/${projectId}/databases/${database}/documents/${collection}`);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', i);
                            const getAllResponse = (await googleApiRequest.call(this, 'GET', `/${projectId}/databases/${database}/documents/${collection}`, {}, { pageSize: limit }));
                            responseData = getAllResponse.documents;
                        }
                        responseData = responseData.map((element) => {
                            element.id = element.name.split('/').pop();
                            return element;
                        });
                        if (simple) {
                            responseData = responseData.map((element) => fullDocumentToJson(element));
                        }
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: fallbackPairedItems ?? [{ item: i }] });
                        returnData.push(...executionData);
                    }
                    catch (error) {
                        if (this.continueOnFail()) {
                            returnData.push({
                                json: { error: error.message },
                                pairedItem: fallbackPairedItems ?? [{ item: i }],
                            });
                            continue;
                        }
                        throw error;
                    }
                }
            }
            else if (operation === 'delete') {
                await Promise.all(items.map(async (_, i) => {
                    const projectId = this.getNodeParameter('projectId', i);
                    const database = this.getNodeParameter('database', i);
                    const collection = this.getNodeParameter('collection', i);
                    const documentId = this.getNodeParameter('documentId', i);
                    await googleApiRequest.call(this, 'DELETE', `/${projectId}/databases/${database}/documents/${collection}/${documentId}`);
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
                    returnData.push(...executionData);
                }));
            }
            else if (operation === 'upsert') {
                const projectId = this.getNodeParameter('projectId', 0);
                const database = this.getNodeParameter('database', 0);
                const updates = items.map((item, i) => {
                    const collection = this.getNodeParameter('collection', i);
                    const updateKey = this.getNodeParameter('updateKey', i);
                    // @ts-ignore
                    const documentId = item.json[updateKey];
                    const columns = this.getNodeParameter('columns', i);
                    const columnList = columns.split(',').map((column) => column.trim());
                    const document = {};
                    columnList.map((column) => {
                        // @ts-ignore
                        if (item.json.hasOwnProperty(column)) {
                            // @ts-ignore
                            document[column] = jsonToDocument(item.json[column]);
                        }
                        else {
                            // @ts-ignore
                            document[column] = jsonToDocument(null);
                        }
                    });
                    return {
                        update: {
                            name: `projects/${projectId}/databases/${database}/documents/${collection}/${documentId}`,
                            fields: document,
                        },
                        updateMask: {
                            fieldPaths: columnList,
                        },
                    };
                });
                responseData = [];
                const { writeResults, status } = await googleApiRequest.call(this, 'POST', `/${projectId}/databases/${database}/documents:batchWrite`, { writes: updates });
                for (let i = 0; i < writeResults.length; i++) {
                    writeResults[i].status = status[i];
                    Object.assign(writeResults[i], items[i].json);
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(writeResults[i]), { itemData: { item: i } });
                    returnData.push(...executionData);
                }
            }
            else if (operation === 'query') {
                const projectId = this.getNodeParameter('projectId', 0);
                const database = this.getNodeParameter('database', 0);
                const simple = this.getNodeParameter('simple', 0);
                await Promise.all(items.map(async (_, i) => {
                    const query = this.getNodeParameter('query', i);
                    const queryParameters = this.getNodeParameter('queryParameters', i, '[]');
                    const body = parseAndResolveQueryParameters(query, queryParameters, this.getNode(), i);
                    responseData = await googleApiRequest.call(this, 'POST', `/${projectId}/databases/${database}/documents:runQuery`, body);
                    responseData = responseData.map((element) => {
                        if (element.document) {
                            element.document.id = element.document.name.split('/').pop();
                        }
                        return element;
                    });
                    if (simple) {
                        responseData = responseData
                            .map((element) => {
                            return fullDocumentToJson(element.document);
                        })
                            .filter((element) => !!element);
                    }
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                    returnData.push(...executionData);
                }));
            }
        }
        else if (resource === 'collection') {
            if (operation === 'getAll') {
                for (let i = 0; i < itemsLength; i++) {
                    try {
                        const projectId = this.getNodeParameter('projectId', i);
                        const database = this.getNodeParameter('database', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        if (returnAll) {
                            const getAllResponse = await googleApiRequestAllItems.call(this, 'collectionIds', 'POST', `/${projectId}/databases/${database}/documents:listCollectionIds`);
                            // @ts-ignore
                            responseData = getAllResponse.map((o) => ({ name: o }));
                        }
                        else {
                            const limit = this.getNodeParameter('limit', i);
                            const getAllResponse = (await googleApiRequest.call(this, 'POST', `/${projectId}/databases/${database}/documents:listCollectionIds`, {}, { pageSize: limit }));
                            // @ts-ignore
                            responseData = getAllResponse.collectionIds.map((o) => ({ name: o }));
                        }
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: fallbackPairedItems ?? [{ item: i }] });
                        returnData.push(...executionData);
                    }
                    catch (error) {
                        if (this.continueOnFail()) {
                            returnData.push({
                                json: { error: error.message },
                                pairedItem: fallbackPairedItems ?? [{ item: i }],
                            });
                            continue;
                        }
                        throw error;
                    }
                }
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=GoogleFirebaseCloudFirestore.node.js.map