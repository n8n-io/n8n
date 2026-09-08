import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { redisConnectionTest, setupRedisClient } from './utils';
export class RedisTrigger {
    description = {
        displayName: 'Redis Trigger',
        name: 'redisTrigger',
        icon: 'file:redis.svg',
        group: ['trigger'],
        version: 1,
        description: 'Subscribe to redis channel',
        defaults: {
            name: 'Redis Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'redis',
                required: true,
                testedBy: 'redisConnectionTest',
            },
        ],
        properties: [
            {
                displayName: 'Channels',
                name: 'channels',
                type: 'string',
                default: '',
                required: true,
                description: 'Channels to subscribe to, multiple channels be defined with comma. Wildcard character(*) is supported.',
            },
            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add option',
                default: {},
                options: [
                    {
                        displayName: 'JSON Parse Body',
                        name: 'jsonParseBody',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to try to parse the message to an object',
                    },
                    {
                        displayName: 'Only Message',
                        name: 'onlyMessage',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to return only the message property',
                    },
                ],
            },
        ],
    };
    methods = {
        credentialTest: { redisConnectionTest },
    };
    async trigger() {
        const credentials = await this.getCredentials('redis');
        const channels = this.getNodeParameter('channels').split(',');
        const options = this.getNodeParameter('options');
        if (!channels) {
            throw new NodeOperationError(this.getNode(), 'Channels are mandatory!');
        }
        const client = setupRedisClient(credentials);
        await client.connect();
        await client.ping();
        const onMessage = (message, channel) => {
            if (options.jsonParseBody) {
                try {
                    message = JSON.parse(message);
                }
                catch (error) { }
            }
            const data = options.onlyMessage ? { message } : { channel, message };
            this.emit([this.helpers.returnJsonArray(data)]);
        };
        const manualTriggerFunction = async () => await new Promise(async (resolve) => {
            await client.pSubscribe(channels, (message, channel) => {
                onMessage(message, channel);
                resolve();
            });
        });
        if (this.getMode() === 'trigger') {
            await client.pSubscribe(channels, onMessage);
        }
        async function closeFunction() {
            await client.pUnsubscribe();
            await client.quit();
        }
        return {
            closeFunction,
            manualTriggerFunction,
        };
    }
}
//# sourceMappingURL=RedisTrigger.node.js.map