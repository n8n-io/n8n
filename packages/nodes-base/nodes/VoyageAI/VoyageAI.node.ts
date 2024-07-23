import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';

export class VoyageAI implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Voyage AI',
        name: 'voyageAI',
        icon: 'file:voyage.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Interact with Voyage AI API',
        defaults: {
            name: 'Voyage AI',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'voyageAIApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Embedding',
                        value: 'embedding',
                    },
                ],
                default: 'embedding',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: [
                            'embedding',
                        ],
                    },
                },
                options: [
                    {
                        name: 'Create',
                        value: 'create',
                        description: 'Create an embedding',
                        action: 'Create an embedding',
                    },
                ],
                default: 'create',
            },
            {
                displayName: 'Text',
                name: 'text',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        resource: [
                            'embedding',
                        ],
                        operation: [
                            'create',
                        ],
                    },
                },
                description: 'The text to embed',
            },
            {
                displayName: 'Model',
                name: 'model',
                type: 'options',
                options: [
                    {
                        name: 'voyage-2',
                        value: 'voyage-2',
                    },
                    {
                        name: 'voyage-large-2',
                        value: 'voyage-large-2',
                    },
                    {
                        name: 'voyage-finance-2',
                        value: 'voyage-finance-2',
                    },
                    {
                        name: 'voyage-multilingual-2',
                        value: 'voyage-multilingual-2',
                    },
                    {
                        name: 'voyage-law-2',
                        value: 'voyage-law-2',
                    },
                    {
                        name: 'voyage-code-2',
                        value: 'voyage-code-2',
                    },
                ],
                default: 'voyage-large-2',
                description: 'The model to use for embedding',
                displayOptions: {
                    show: {
                        resource: [
                            'embedding',
                        ],
                        operation: [
                            'create',
                        ],
                    },
                },
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;

        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'embedding') {
                    if (operation === 'create') {
                        const text = this.getNodeParameter('text', i) as string;
                        const model = this.getNodeParameter('model', i) as string;

                        const body = {
                            input: text,
                            model,
                        };

                        const credentials = await this.getCredentials('voyageAIApi');

                        const response = await this.helpers.httpRequest({
                            method: 'POST',
                            url: 'https://api.voyageai.com/v1/embeddings',
                            body,
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${credentials.apiKey}`,
                            },
                        });

                        returnData.push({
                            json: response as INodeExecutionData['json'],
                        });
                    }
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message } });
                    continue;
                }
                throw new NodeOperationError(this.getNode(), error as Error, {
                    itemIndex: i,
                });
            }
        }

        return [returnData];
    }
}
