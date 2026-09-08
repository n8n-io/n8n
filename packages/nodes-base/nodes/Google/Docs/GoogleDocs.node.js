import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';
import { documentFields, documentOperations } from './DocumentDescription';
import { extractID, googleApiRequest, googleApiRequestAllItems, hasKeys, upperFirst, } from './GenericFunctions';
export class GoogleDocs {
    description = {
        displayName: 'Google Docs',
        name: 'googleDocs',
        icon: 'file:googleDocs.svg',
        group: ['input'],
        version: [1, 2],
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Google Docs API.',
        schemaPath: 'Google/Docs',
        defaults: {
            name: 'Google Docs',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        usableAsTool: true,
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
                name: 'googleDocsOAuth2Api',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['oAuth2'],
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
                        name: 'Service Account',
                        value: 'serviceAccount',
                    },
                    {
                        name: 'OAuth2',
                        value: 'oAuth2',
                    },
                ],
                default: 'serviceAccount',
                displayOptions: {
                    show: {
                        '@version': [1],
                    },
                },
            },
            {
                displayName: 'Authentication',
                name: 'authentication',
                type: 'options',
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
                displayOptions: {
                    show: {
                        '@version': [2],
                    },
                },
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
                ],
                default: 'document',
            },
            ...documentOperations,
            ...documentFields,
        ],
    };
    methods = {
        loadOptions: {
            // Get all the drives to display them to user so that they can
            // select them easily
            async getDrives() {
                const returnData = [
                    {
                        name: 'My Drive',
                        value: 'myDrive',
                    },
                    {
                        name: 'Shared with Me',
                        value: 'sharedWithMe',
                    },
                ];
                let drives;
                try {
                    drives = await googleApiRequestAllItems.call(this, 'drives', 'GET', '', {}, {}, 'https://www.googleapis.com/drive/v3/drives');
                }
                catch (error) {
                    throw new NodeApiError(this.getNode(), error, {
                        message: 'Error in loading Drives',
                    });
                }
                for (const drive of drives) {
                    returnData.push({
                        name: drive.name,
                        value: drive.id,
                    });
                }
                return returnData;
            },
            async getFolders() {
                const returnData = [
                    {
                        name: '/',
                        value: 'default',
                    },
                ];
                const driveId = this.getNodeParameter('driveId', 'myDrive');
                const qs = {
                    q: `mimeType = \'application/vnd.google-apps.folder\' ${driveId === 'sharedWithMe' ? 'and sharedWithMe = true' : " and 'root' in parents"}`,
                    ...(driveId && driveId !== 'myDrive' && driveId !== 'sharedWithMe' ? { driveId } : {}),
                };
                let folders;
                try {
                    folders = await googleApiRequestAllItems.call(this, 'files', 'GET', '', {}, qs, 'https://www.googleapis.com/drive/v3/files');
                }
                catch (error) {
                    throw new NodeApiError(this.getNode(), error, {
                        message: 'Error in loading Folders',
                    });
                }
                for (const folder of folders) {
                    returnData.push({
                        name: folder.name,
                        value: folder.id,
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
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'document') {
                    if (operation === 'create') {
                        // https://developers.google.com/docs/api/reference/rest/v1/documents/create
                        const folderId = this.getNodeParameter('folderId', i);
                        const body = {
                            name: this.getNodeParameter('title', i),
                            mimeType: 'application/vnd.google-apps.document',
                            ...(folderId && folderId !== 'default' ? { parents: [folderId] } : {}),
                        };
                        responseData = await googleApiRequest.call(this, 'POST', '', body, {}, 'https://www.googleapis.com/drive/v3/files');
                    }
                    else if (operation === 'get') {
                        // https://developers.google.com/docs/api/reference/rest/v1/documents/get
                        const documentURL = this.getNodeParameter('documentURL', i);
                        const simple = this.getNodeParameter('simple', i);
                        let documentId = extractID(documentURL);
                        if (!documentId) {
                            documentId = documentURL;
                        }
                        responseData = await googleApiRequest.call(this, 'GET', `/documents/${documentId}`);
                        if (simple) {
                            const content = responseData.body.content
                                .reduce((arr, contentItem) => {
                                if (contentItem?.paragraph) {
                                    const texts = contentItem.paragraph.elements.map((element) => {
                                        if (element?.textRun) {
                                            return element.textRun.content;
                                        }
                                    });
                                    arr = [...arr, ...texts];
                                }
                                return arr;
                            }, [])
                                .join('');
                            responseData = {
                                documentId,
                                content,
                            };
                        }
                    }
                    else if (operation === 'update') {
                        // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
                        const documentURL = this.getNodeParameter('documentURL', i);
                        let documentId = extractID(documentURL);
                        const simple = this.getNodeParameter('simple', i);
                        const actionsUi = this.getNodeParameter('actionsUi', i);
                        const { writeControlObject } = this.getNodeParameter('updateFields', i);
                        if (!documentId) {
                            documentId = documentURL;
                        }
                        const body = {
                            requests: [],
                        };
                        if (hasKeys(writeControlObject)) {
                            const { control, value } = writeControlObject;
                            body.writeControl = {
                                [control]: value,
                            };
                        }
                        if (actionsUi) {
                            let requestBody;
                            actionsUi.actionFields.forEach((actionField) => {
                                const { action, object } = actionField;
                                if (object === 'positionedObject') {
                                    if (action === 'delete') {
                                        requestBody = {
                                            objectId: actionField.objectId,
                                        };
                                    }
                                }
                                else if (object === 'pageBreak') {
                                    if (action === 'insert') {
                                        const { insertSegment, segmentId, locationChoice, index } = actionField;
                                        requestBody = {
                                            [locationChoice]: {
                                                segmentId: insertSegment !== 'body' ? segmentId : '',
                                                ...(locationChoice === 'location' ? { index } : {}),
                                            },
                                        };
                                    }
                                }
                                else if (object === 'table') {
                                    if (action === 'insert') {
                                        const { rows, columns, insertSegment, locationChoice, segmentId, index } = actionField;
                                        requestBody = {
                                            rows,
                                            columns,
                                            [locationChoice]: {
                                                segmentId: insertSegment !== 'body' ? segmentId : '',
                                                ...(locationChoice === 'location' ? { index } : {}),
                                            },
                                        };
                                    }
                                }
                                else if (object === 'footer') {
                                    if (action === 'create') {
                                        const { insertSegment, locationChoice, segmentId, index } = actionField;
                                        requestBody = {
                                            type: 'DEFAULT',
                                            sectionBreakLocation: {
                                                segmentId: insertSegment !== 'body' ? segmentId : '',
                                                ...(locationChoice === 'location' ? { index } : {}),
                                            },
                                        };
                                    }
                                    else if (action === 'delete') {
                                        requestBody = {
                                            footerId: actionField.footerId,
                                        };
                                    }
                                }
                                else if (object === 'header') {
                                    if (action === 'create') {
                                        const { insertSegment, locationChoice, segmentId, index } = actionField;
                                        requestBody = {
                                            type: 'DEFAULT',
                                            sectionBreakLocation: {
                                                segmentId: insertSegment !== 'body' ? segmentId : '',
                                                ...(locationChoice === 'location' ? { index } : {}),
                                            },
                                        };
                                    }
                                    else if (action === 'delete') {
                                        requestBody = {
                                            headerId: actionField.headerId,
                                        };
                                    }
                                }
                                else if (object === 'tableColumn') {
                                    if (action === 'insert') {
                                        const { insertPosition, rowIndex, columnIndex, insertSegment, segmentId, index, } = actionField;
                                        requestBody = {
                                            insertRight: insertPosition,
                                            tableCellLocation: {
                                                rowIndex,
                                                columnIndex,
                                                tableStartLocation: {
                                                    segmentId: insertSegment !== 'body' ? segmentId : '',
                                                    index,
                                                },
                                            },
                                        };
                                    }
                                    else if (action === 'delete') {
                                        const { rowIndex, columnIndex, insertSegment, segmentId, index } = actionField;
                                        requestBody = {
                                            tableCellLocation: {
                                                rowIndex,
                                                columnIndex,
                                                tableStartLocation: {
                                                    segmentId: insertSegment !== 'body' ? segmentId : '',
                                                    index,
                                                },
                                            },
                                        };
                                    }
                                }
                                else if (object === 'tableRow') {
                                    if (action === 'insert') {
                                        const { insertPosition, rowIndex, columnIndex, insertSegment, segmentId, index, } = actionField;
                                        requestBody = {
                                            insertBelow: insertPosition,
                                            tableCellLocation: {
                                                rowIndex,
                                                columnIndex,
                                                tableStartLocation: {
                                                    segmentId: insertSegment !== 'body' ? segmentId : '',
                                                    index,
                                                },
                                            },
                                        };
                                    }
                                    else if (action === 'delete') {
                                        const { rowIndex, columnIndex, insertSegment, segmentId, index } = actionField;
                                        requestBody = {
                                            tableCellLocation: {
                                                rowIndex,
                                                columnIndex,
                                                tableStartLocation: {
                                                    segmentId: insertSegment !== 'body' ? segmentId : '',
                                                    index,
                                                },
                                            },
                                        };
                                    }
                                }
                                else if (object === 'text') {
                                    if (action === 'insert') {
                                        const { text, locationChoice, insertSegment, segmentId, index } = actionField;
                                        requestBody = {
                                            text,
                                            [locationChoice]: {
                                                segmentId: insertSegment !== 'body' ? segmentId : '',
                                                ...(locationChoice === 'location' ? { index } : {}),
                                            },
                                        };
                                    }
                                    else if (action === 'replaceAll') {
                                        const { text, replaceText, matchCase } = actionField;
                                        requestBody = {
                                            replaceText,
                                            containsText: { text, matchCase },
                                        };
                                    }
                                }
                                else if (object === 'paragraphBullets') {
                                    if (action === 'create') {
                                        const { bulletPreset, startIndex, insertSegment, segmentId, endIndex } = actionField;
                                        requestBody = {
                                            bulletPreset,
                                            range: {
                                                segmentId: insertSegment !== 'body' ? segmentId : '',
                                                startIndex,
                                                endIndex,
                                            },
                                        };
                                    }
                                    else if (action === 'delete') {
                                        const { startIndex, insertSegment, segmentId, endIndex } = actionField;
                                        requestBody = {
                                            range: {
                                                segmentId: insertSegment !== 'body' ? segmentId : '',
                                                startIndex,
                                                endIndex,
                                            },
                                        };
                                    }
                                }
                                else if (object === 'namedRange') {
                                    if (action === 'create') {
                                        const { name, insertSegment, segmentId, startIndex, endIndex } = actionField;
                                        requestBody = {
                                            name,
                                            range: {
                                                segmentId: insertSegment !== 'body' ? segmentId : '',
                                                startIndex,
                                                endIndex,
                                            },
                                        };
                                    }
                                    else if (action === 'delete') {
                                        const { namedRangeReference, value } = actionField;
                                        requestBody = {
                                            [namedRangeReference]: value,
                                        };
                                    }
                                }
                                body.requests.push({
                                    [`${action}${upperFirst(object)}`]: requestBody,
                                });
                            });
                        }
                        responseData = await googleApiRequest.call(this, 'POST', `/documents/${documentId}:batchUpdate`, body);
                        if (simple) {
                            if (Object.keys(responseData.replies[0]).length !== 0) {
                                const key = Object.keys(responseData.replies[0])[0];
                                responseData = responseData.replies[0][key];
                            }
                            else {
                                responseData = {};
                            }
                        }
                        responseData.documentId = documentId;
                    }
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionErrorData);
                    continue;
                }
                throw error;
            }
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        return [returnData];
    }
}
//# sourceMappingURL=GoogleDocs.node.js.map