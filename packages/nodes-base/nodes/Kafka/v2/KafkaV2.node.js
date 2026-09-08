import { ensureError } from '@n8n/utils/errors/ensure-error';
import { jsonParse, NodeConnectionTypes, NodeError, NodeOperationError } from 'n8n-workflow';
import { generatePairedItemData } from '@utils/utilities';
import { createSchemaRegistry } from '../utils';
import { createKafkaProducer } from './transport';
const DEFAULT_TIMEOUT_MS = 30000;
/**
 * Maps the `options` collection onto the producer factory's options. Both fields
 * differ deliberately from v1, so they are converted in one place rather than at
 * the call site.
 */
function toProducerOptions(options) {
    return {
        // -1 = all in-sync replicas, matching the option description. v1 maps
        // `true` to 1 (leader only) — a bug not worth carrying into a new version.
        acks: options.acks === true ? -1 : 0,
        // Unlike v1 (kafkajs tolerates `undefined`), confluent's native library
        // crashes if either of these reaches the producer config as `undefined` —
        // which they would be if the user never added the option, since a
        // `collection` param only carries the keys the user explicitly set,
        // ignoring its declared UI default. Fall back to those defaults here.
        // 'none' is a codec of its own, so it reaches the config explicitly.
        compression: (options.compression ?? 'none'),
        timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
    };
}
/**
 * Encodes a message for the wire, returning it unchanged when the Schema Registry
 * is off. Both failure modes are the user's to fix, so each maps to its own
 * message rather than surfacing a registry-internal error.
 */
async function encodeMessage(message, schemaRegistry, node, itemIndex) {
    if (!schemaRegistry)
        return message;
    let parsedMessage;
    try {
        parsedMessage = JSON.parse(message);
    }
    catch {
        throw new NodeOperationError(node, 'Message is not valid JSON', {
            description: 'The Schema Registry encodes JSON messages. Provide a valid JSON message, or turn off "Use Schema Registry".',
            itemIndex,
        });
    }
    try {
        return await schemaRegistry.registry.encode(schemaRegistry.schemaId, parsedMessage);
    }
    catch {
        // The original error is dropped rather than kept as `cause`: registry errors
        // interpolate the request URL and response body, which would then be
        // persisted into execution data.
        throw new NodeOperationError(node, 'Verify your Schema Registry configuration', { itemIndex });
    }
}
/**
 * The native binding rejects a non-string header value only after the message is queued,
 * so an unchecked value fails the node for a message the broker already accepted.
 */
function validateHeaders(headers, node, itemIndex) {
    for (const [key, value] of Object.entries(headers)) {
        const values = Array.isArray(value) ? value : [value];
        if (values.some((entry) => typeof entry !== 'string' && !Buffer.isBuffer(entry))) {
            throw new NodeOperationError(node, `Header "${key}" must be a string`, { itemIndex });
        }
    }
}
const versionDescription = {
    displayName: 'Kafka',
    name: 'kafka',
    icon: { light: 'file:kafka.svg', dark: 'file:kafka.dark.svg' },
    group: ['transform'],
    version: 2,
    description: 'Sends messages to a Kafka topic',
    defaults: {
        name: 'Kafka',
    },
    usableAsTool: true,
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
        {
            // Leave the `kafka` credential test to v1: it is resolved per credential type, so a
            // `methods.credentialTest.kafkaConnectionTest` here would take over v1's test too.
            // See 'should leave the kafka credential test to v1' in test/Kafka.node.test.ts.
            name: 'kafka',
            required: true,
        },
        {
            name: 'schemaRegistryApi',
            required: false,
            displayName: 'Schema Registry',
            displayOptions: {
                show: {
                    useSchemaRegistry: [true],
                },
            },
        },
    ],
    properties: [
        {
            displayName: 'Topic',
            name: 'topic',
            type: 'string',
            default: '',
            placeholder: 'topic-name',
            description: 'Name of the queue of topic to publish to',
        },
        {
            displayName: 'Send Input Data',
            name: 'sendInputData',
            type: 'boolean',
            default: true,
            description: 'Whether to send the data the node receives as JSON to Kafka',
        },
        {
            displayName: 'Message',
            name: 'message',
            type: 'string',
            displayOptions: {
                show: {
                    sendInputData: [false],
                },
            },
            default: '',
            description: 'The message to be sent',
        },
        {
            displayName: 'JSON Parameters',
            name: 'jsonParameters',
            type: 'boolean',
            default: false,
        },
        {
            displayName: 'Use Schema Registry',
            name: 'useSchemaRegistry',
            type: 'boolean',
            default: false,
            description: 'Whether to use Confluent Schema Registry',
        },
        {
            displayName: 'Schema Registry URL',
            name: 'schemaRegistryUrl',
            type: 'string',
            displayOptions: {
                show: {
                    useSchemaRegistry: [true],
                },
            },
            placeholder: 'https://schema-registry-domain:8081',
            default: '',
            description: 'URL of the schema registry. Only used when no Schema Registry credential is selected.',
        },
        {
            displayName: 'Use Key',
            name: 'useKey',
            type: 'boolean',
            default: false,
            description: 'Whether to use a message key',
        },
        {
            displayName: 'Key',
            name: 'key',
            type: 'string',
            required: true,
            displayOptions: {
                show: {
                    useKey: [true],
                },
            },
            placeholder: '',
            default: '',
            description: 'The message key',
        },
        {
            displayName: 'Event Name',
            name: 'eventName',
            type: 'string',
            required: true,
            displayOptions: {
                show: {
                    useSchemaRegistry: [true],
                },
            },
            default: '',
            description: 'Namespace and Name of Schema in Schema Registry (namespace.name)',
        },
        {
            displayName: 'Headers',
            name: 'headersUi',
            placeholder: 'Add Header',
            type: 'fixedCollection',
            displayOptions: {
                show: {
                    jsonParameters: [false],
                },
            },
            typeOptions: {
                multipleValues: true,
            },
            default: {},
            options: [
                {
                    name: 'headerValues',
                    displayName: 'Header',
                    values: [
                        {
                            displayName: 'Key',
                            name: 'key',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Value',
                            name: 'value',
                            type: 'string',
                            default: '',
                        },
                    ],
                },
            ],
        },
        {
            displayName: 'Headers (JSON)',
            name: 'headerParametersJson',
            type: 'json',
            displayOptions: {
                show: {
                    jsonParameters: [true],
                },
            },
            default: '',
            description: 'Header parameters as JSON (flat object)',
        },
        {
            displayName: 'Options',
            name: 'options',
            type: 'collection',
            default: {},
            placeholder: 'Add option',
            options: [
                {
                    displayName: 'Acks',
                    name: 'acks',
                    type: 'boolean',
                    default: false,
                    description: 'Whether or not producer must wait for acknowledgement from all replicas',
                },
                {
                    displayName: 'Compression',
                    name: 'compression',
                    type: 'options',
                    default: 'none',
                    description: 'Codec used to compress messages. Version 1 of the Kafka Trigger cannot read Snappy, LZ4 or Zstd — use GZIP or None while version 1 triggers consume this topic.',
                    // eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items -- 'None' (no compression) reads better last than between LZ4 and Snappy
                    options: [
                        { name: 'GZIP', value: 'gzip' },
                        { name: 'LZ4', value: 'lz4' },
                        { name: 'Snappy', value: 'snappy' },
                        { name: 'Zstd', value: 'zstd' },
                        { name: 'None', value: 'none' },
                    ],
                },
                {
                    displayName: 'Timeout',
                    name: 'timeout',
                    type: 'number',
                    default: DEFAULT_TIMEOUT_MS,
                    description: 'The time to await a response in ms',
                },
            ],
        },
    ],
};
export class KafkaV2 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
        };
    }
    async execute() {
        const items = this.getInputData();
        const itemData = generatePairedItemData(items.length);
        const length = items.length;
        const topicMessages = [];
        let responseData;
        try {
            const producerOptions = toProducerOptions(this.getNodeParameter('options', 0));
            const sendInputData = this.getNodeParameter('sendInputData', 0);
            const useSchemaRegistry = this.getNodeParameter('useSchemaRegistry', 0);
            const credentials = await this.getCredentials('kafka');
            // Resolve the registry configuration once, before the producer is set
            // up, so credential misconfiguration surfaces with its own error
            // message and never leaks a connected producer. The registry client
            // and schema ID are loop-invariant (`eventName` is read at index 0)
            let schemaRegistry;
            if (useSchemaRegistry) {
                const registry = await createSchemaRegistry(this, this.getNodeParameter('schemaRegistryUrl', 0));
                try {
                    const eventName = this.getNodeParameter('eventName', 0);
                    const schemaId = await registry.getLatestSchemaId(eventName);
                    schemaRegistry = { registry, schemaId };
                }
                catch (exception) {
                    throw new NodeOperationError(this.getNode(), 'Verify your Schema Registry configuration');
                }
            }
            for (let i = 0; i < length; i++) {
                const rawMessage = sendInputData
                    ? JSON.stringify(items[i].json)
                    : this.getNodeParameter('message', i);
                const message = await encodeMessage(rawMessage, schemaRegistry, this.getNode(), i);
                const topic = this.getNodeParameter('topic', i);
                const jsonParameters = this.getNodeParameter('jsonParameters', i);
                const useKey = this.getNodeParameter('useKey', i);
                const key = useKey ? this.getNodeParameter('key', i) : null;
                let headers;
                if (jsonParameters) {
                    try {
                        headers = jsonParse(this.getNodeParameter('headerParametersJson', i));
                    }
                    catch {
                        throw new NodeOperationError(this.getNode(), 'Headers must be valid JSON', {
                            itemIndex: i,
                        });
                    }
                }
                else {
                    // `Object.fromEntries` builds the object in one step rather than assigning
                    // user-supplied names as computed keys.
                    headers = Object.fromEntries((this.getNodeParameter('headersUi', i).headerValues ??
                        []).map(({ key: headerKey, value }) => [headerKey, value]));
                }
                validateHeaders(headers, this.getNode(), i);
                topicMessages.push({
                    topic,
                    messages: [
                        {
                            value: message,
                            headers,
                            key,
                        },
                    ],
                });
            }
            const producer = await createKafkaProducer(credentials, producerOptions);
            try {
                await producer.connect();
                responseData = await producer.sendBatch({ topicMessages });
            }
            finally {
                // Unlike v1, always close the connection. The failure is logged rather than
                // rethrown so it can never mask the error the user needs to see — but a native
                // client that fails to disconnect leaks threads, so it must leave a trace.
                await producer.disconnect().catch((disconnectError) => {
                    this.logger.warn('Kafka producer failed to disconnect', {
                        error: ensureError(disconnectError).message,
                    });
                });
            }
            if (responseData.length === 0) {
                responseData.push({
                    success: true,
                });
            }
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData });
            return [executionData];
        }
        catch (error) {
            if (this.continueOnFail()) {
                return [[{ json: { error: ensureError(error).message }, pairedItem: itemData }]];
            }
            // The transport throws plain UserErrors for an unusable credential, and core adds no
            // node context to non-NodeErrors, so they would surface in the UI unattributed.
            if (error instanceof NodeError)
                throw error;
            throw new NodeOperationError(this.getNode(), ensureError(error));
        }
    }
}
//# sourceMappingURL=KafkaV2.node.js.map