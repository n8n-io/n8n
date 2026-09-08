import { OperationalError, updateDisplayOptions } from 'n8n-workflow';
import { HeaderConstants } from '../../helpers/constants';
import { processJsonInput } from '../../helpers/utils';
const properties = [
    {
        displayName: 'ID',
        name: 'containerCreate',
        default: '',
        description: 'Unique identifier for the new container',
        placeholder: 'e.g. Container1',
        required: true,
        routing: {
            send: {
                preSend: [
                    async function (requestOptions) {
                        const id = this.getNodeParameter('containerCreate');
                        if (/\s/.test(id)) {
                            throw new OperationalError('The container ID must not contain spaces.');
                        }
                        if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
                            throw new OperationalError('The container ID may only contain letters, numbers, hyphens, and underscores.');
                        }
                        requestOptions.body.id = id;
                        return requestOptions;
                    },
                ],
            },
        },
        type: 'string',
    },
    {
        displayName: 'Partition Key',
        name: 'partitionKey',
        default: '{\n\t"paths": [\n\t\t"/id"\n\t],\n\t"kind": "Hash",\n\t"version": 2\n}',
        description: 'The partition key is used to automatically distribute data across partitions for scalability. Choose a property in your JSON document that has a wide range of values and evenly distributes request volume.',
        required: true,
        routing: {
            send: {
                preSend: [
                    async function (requestOptions) {
                        const rawPartitionKey = this.getNodeParameter('partitionKey');
                        const partitionKey = processJsonInput(rawPartitionKey, 'Partition Key', {
                            paths: ['/id'],
                            kind: 'Hash',
                            version: 2,
                        });
                        requestOptions.body.partitionKey = partitionKey;
                        return requestOptions;
                    },
                ],
            },
        },
        type: 'json',
    },
    {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        default: {},
        options: [
            {
                displayName: 'Indexing Policy',
                name: 'indexingPolicy',
                default: '{\n\t"indexingMode": "consistent",\n\t"automatic": true,\n\t"includedPaths": [\n\t\t{\n\t\t\t"path": "/*"\n\t\t}\n\t],\n\t"excludedPaths": []\n}',
                description: 'This value is used to configure indexing policy',
                routing: {
                    send: {
                        preSend: [
                            async function (requestOptions) {
                                const rawIndexingPolicy = this.getNodeParameter('additionalFields.indexingPolicy');
                                const indexPolicy = processJsonInput(rawIndexingPolicy, 'Indexing Policy');
                                requestOptions.body.indexingPolicy = indexPolicy;
                                return requestOptions;
                            },
                        ],
                    },
                },
                type: 'json',
            },
            {
                displayName: 'Max RU/s (for Autoscale)',
                name: 'maxThroughput',
                default: 1000,
                description: 'The user specified autoscale max RU/s',
                displayOptions: {
                    hide: {
                        '/additionalFields.offerThroughput': [{ _cnd: { exists: true } }],
                    },
                },
                routing: {
                    request: {
                        headers: {
                            [HeaderConstants.X_MS_COSMOS_OFFER_AUTOPILOT_SETTING]: '={{ $value }}',
                        },
                    },
                },
                type: 'number',
                typeOptions: {
                    minValue: 1000,
                },
            },
            {
                displayName: 'Manual Throughput RU/s',
                name: 'offerThroughput',
                default: 400,
                description: 'The user specified manual throughput (RU/s) for the collection expressed in units of 100 request units per second',
                displayOptions: {
                    hide: {
                        '/additionalFields.maxThroughput': [{ _cnd: { exists: true } }],
                    },
                },
                routing: {
                    request: {
                        headers: {
                            [HeaderConstants.X_MS_OFFER_THROUGHPUT]: '={{ $value }}',
                        },
                    },
                },
                type: 'number',
                typeOptions: {
                    minValue: 400,
                },
            },
        ],
        placeholder: 'Add Option',
        type: 'collection',
    },
];
const displayOptions = {
    show: {
        resource: ['container'],
        operation: ['create'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
//# sourceMappingURL=create.operation.js.map