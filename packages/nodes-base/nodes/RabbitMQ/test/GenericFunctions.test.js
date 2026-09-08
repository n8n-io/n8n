import { mock, mockDeep } from 'vitest-mock-extended';
const { connect } = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock('amqplib', () => ({ connect }));
const mockChannel = mock();
const mockConnection = mock({ createChannel: async () => mockChannel });
mockChannel.connection = mockConnection;
connect.mockReturnValue(mockConnection);
import { parseMessage, rabbitmqConnect, rabbitmqConnectExchange, rabbitmqConnectQueue, rabbitmqCreateChannel, MessageTracker, handleMessage, } from '../GenericFunctions';
describe('RabbitMQ GenericFunctions', () => {
    const credentials = {
        hostname: 'some.host',
        port: 5672,
        username: 'user',
        password: 'pass',
        vhost: '/',
    };
    const context = mockDeep();
    beforeEach(() => {
        vi.clearAllMocks();
        connect.mockReturnValue(mockConnection);
    });
    describe('parseMessage', () => {
        const helpers = mock();
        it('should handle binary data', async () => {
            const message = mock();
            const content = Buffer.from('test');
            message.content = content;
            const options = mock({ contentIsBinary: true });
            helpers.prepareBinaryData.mockResolvedValue(mock());
            const item = await parseMessage(message, options, helpers);
            expect(item.json).toBe(message);
            expect(item.binary?.data).toBeDefined();
            expect(helpers.prepareBinaryData).toHaveBeenCalledWith(content);
            expect(message.content).toBeUndefined();
        });
        it('should handle JSON data', async () => {
            const message = mock();
            const content = Buffer.from(JSON.stringify({ test: 'test' }));
            message.content = content;
            const options = mock({
                contentIsBinary: false,
                jsonParseBody: true,
                onlyContent: false,
            });
            const item = await parseMessage(message, options, helpers);
            expect(item.json).toBe(message);
            expect(item.binary).toBeUndefined();
            expect(helpers.prepareBinaryData).not.toHaveBeenCalled();
            expect(message.content).toEqual({ test: 'test' });
        });
        it('should return only content, when requested', async () => {
            const message = mock();
            const content = Buffer.from(JSON.stringify({ test: 'test' }));
            message.content = content;
            const options = mock({
                contentIsBinary: false,
                jsonParseBody: false,
                onlyContent: true,
            });
            const item = await parseMessage(message, options, helpers);
            expect(item.json).toBe(content.toString());
            expect(item.binary).toBeUndefined();
            expect(helpers.prepareBinaryData).not.toHaveBeenCalled();
            expect(message.content).toEqual(content);
        });
    });
    describe('rabbitmqConnect', () => {
        it('should connect to RabbitMQ', async () => {
            const connection = await rabbitmqConnect({ ...credentials, ssl: false });
            expect(connect).toHaveBeenCalledWith(credentials, {});
            expect(connection).toBe(mockConnection);
        });
        it('should connect to RabbitMQ over SSL', async () => {
            const connection = await rabbitmqConnect({
                ...credentials,
                ssl: true,
                ca: 'ca',
                passwordless: false,
            });
            expect(connect).toHaveBeenCalledWith({ ...credentials, protocol: 'amqps' }, { ca: [Buffer.from('ca')] });
            expect(connection).toBe(mockConnection);
        });
    });
    describe('rabbitmqCreateChannel', () => {
        it('should create a channel', async () => {
            context.getCredentials.mockResolvedValue(credentials);
            const channel = await rabbitmqCreateChannel.call(context);
            expect(channel).toBe(mockChannel);
        });
    });
    describe('rabbitmqConnectQueue', () => {
        it('should assert a queue', async () => {
            context.getCredentials.mockResolvedValue(credentials);
            const options = mock({ assertQueue: true });
            await rabbitmqConnectQueue.call(context, 'queue', options);
            expect(mockChannel.assertQueue).toHaveBeenCalledWith('queue', options);
            expect(mockChannel.checkQueue).not.toHaveBeenCalled();
            expect(mockChannel.bindQueue).not.toHaveBeenCalled();
        });
        it('should check a queue', async () => {
            context.getCredentials.mockResolvedValue(credentials);
            const options = mock({ assertQueue: false });
            await rabbitmqConnectQueue.call(context, 'queue', options);
            expect(mockChannel.assertQueue).not.toHaveBeenCalled();
            expect(mockChannel.checkQueue).toHaveBeenCalledWith('queue');
            expect(mockChannel.bindQueue).not.toHaveBeenCalled();
        });
    });
    describe('rabbitmqConnectExchange', () => {
        it('should assert a queue', async () => {
            context.getCredentials.mockResolvedValue(credentials);
            context.getNodeParameter.calledWith('exchangeType', 0).mockReturnValue('topic');
            const options = mock({ assertExchange: true });
            await rabbitmqConnectExchange.call(context, 'exchange', options);
            expect(mockChannel.assertExchange).toHaveBeenCalledWith('exchange', 'topic', options);
            expect(mockChannel.checkExchange).not.toHaveBeenCalled();
        });
        it('should check a queue', async () => {
            context.getCredentials.mockResolvedValue(credentials);
            const options = mock({ assertExchange: false });
            await rabbitmqConnectExchange.call(context, 'exchange', options);
            expect(mockChannel.assertExchange).not.toHaveBeenCalled();
            expect(mockChannel.checkExchange).toHaveBeenCalledWith('exchange');
        });
    });
    describe('MessageTracker', () => {
        let messageTracker;
        beforeEach(() => {
            messageTracker = new MessageTracker();
        });
        it('should track received messages', () => {
            const message = { fields: { deliveryTag: 1 } };
            messageTracker.received(message);
            expect(messageTracker.messages).toContain(1);
        });
        it('should track answered messages', () => {
            const message = { fields: { deliveryTag: 1 } };
            messageTracker.received(message);
            messageTracker.answered(message);
            expect(messageTracker.messages).not.toContain(1);
        });
        it('should return the number of unanswered messages', () => {
            const message = { fields: { deliveryTag: 1 } };
            messageTracker.received(message);
            expect(messageTracker.unansweredMessages()).toBe(1);
        });
        it('should close the channel and connection', async () => {
            await messageTracker.closeChannel(mockChannel, 'consumerTag');
            expect(mockChannel.cancel).toHaveBeenCalledWith('consumerTag');
            expect(mockChannel.close).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });
    describe('handleMessage', () => {
        const mockChannel = mockDeep();
        const messageTracker = mock();
        const message = {
            content: {
                foo: 'bar',
            },
        };
        const item = { json: message };
        const options = {};
        it('should ack a message with "acknowledgeMode" set to "immediately"', async () => {
            await handleMessage.call(context, message, mockChannel, messageTracker, 'immediately', options);
            expect(context.emit).toHaveBeenCalledWith([[item]], undefined, undefined);
            expect(mockChannel.ack).toHaveBeenCalledWith(message);
        });
        it('should ack a message with "acknowledgeMode" set to "executionFinishesSuccessfully"', async () => {
            let resolvePromise = () => { };
            const deferredPromise = {
                promise: new Promise((resolve) => {
                    resolvePromise = resolve;
                }),
                resolve: vi.fn(),
                reject: vi.fn(),
            };
            context.helpers.createDeferredPromise.mockReturnValue(deferredPromise);
            const handleMessagePromise = handleMessage.call(context, message, mockChannel, messageTracker, 'executionFinishesSuccessfully', options);
            await Promise.resolve(); // yield control to let handleMessage run
            expect(messageTracker.received).toHaveBeenCalledWith(message);
            expect(context.emit).toHaveBeenCalledWith([[item]], undefined, deferredPromise);
            expect(mockChannel.ack).not.toHaveBeenCalled();
            expect(messageTracker.answered).not.toHaveBeenCalled();
            resolvePromise({
                data: {
                    resultData: {
                        error: undefined,
                    },
                },
            });
            await handleMessagePromise;
            expect(mockChannel.ack).toHaveBeenCalledWith(message);
            expect(messageTracker.answered).toHaveBeenCalledWith(message);
        });
        it('should nack a message with "acknowledgeMode" set to "executionFinishesSuccessfully" when there is an error', async () => {
            let resolvePromise = () => { };
            const deferredPromise = {
                promise: new Promise((resolve) => {
                    resolvePromise = resolve;
                }),
                resolve: vi.fn(),
                reject: vi.fn(),
            };
            context.helpers.createDeferredPromise.mockReturnValue(deferredPromise);
            const handleMessagePromise = handleMessage.call(context, message, mockChannel, messageTracker, 'executionFinishesSuccessfully', options);
            await Promise.resolve(); // yield control to let handleMessage run
            expect(messageTracker.received).toHaveBeenCalledWith(message);
            expect(context.emit).toHaveBeenCalledWith([[item]], undefined, deferredPromise);
            expect(mockChannel.nack).not.toHaveBeenCalled();
            expect(messageTracker.answered).not.toHaveBeenCalled();
            resolvePromise({
                data: {
                    resultData: {
                        error: new Error('Some error'),
                    },
                },
            });
            await handleMessagePromise;
            expect(mockChannel.nack).toHaveBeenCalledWith(message);
            expect(messageTracker.answered).toHaveBeenCalledWith(message);
        });
        it('should ack a message with "acknowledgeMode" set to "executionFinishes"', async () => {
            let resolvePromise = () => { };
            const deferredPromise = {
                promise: new Promise((resolve) => {
                    resolvePromise = resolve;
                }),
                resolve: vi.fn(),
                reject: vi.fn(),
            };
            context.helpers.createDeferredPromise.mockReturnValue(deferredPromise);
            const handleMessagePromise = handleMessage.call(context, message, mockChannel, messageTracker, 'executionFinishes', options);
            await Promise.resolve(); // yield control to let handleMessage run
            expect(messageTracker.received).toHaveBeenCalledWith(message);
            expect(context.emit).toHaveBeenCalledWith([[item]], undefined, deferredPromise);
            expect(mockChannel.ack).not.toHaveBeenCalled();
            expect(messageTracker.answered).not.toHaveBeenCalled();
            resolvePromise({
                data: {
                    resultData: {
                        error: undefined,
                    },
                },
            });
            await handleMessagePromise;
            expect(mockChannel.ack).toHaveBeenCalledWith(message);
            expect(messageTracker.answered).toHaveBeenCalledWith(message);
        });
        describe('acknowledgeMode = "laterMessageNode"', () => {
            const buildRunDeferred = () => {
                let resolvePromise = () => { };
                const deferred = {
                    promise: new Promise((resolve) => {
                        resolvePromise = resolve;
                    }),
                    resolve: vi.fn(),
                    reject: vi.fn(),
                };
                return { deferred, resolve: (data) => resolvePromise(data) };
            };
            const buildHookDeferred = () => {
                let resolvePromise = () => { };
                const deferred = {
                    promise: new Promise((resolve) => {
                        resolvePromise = resolve;
                    }),
                    resolve: vi.fn(),
                    reject: vi.fn(),
                };
                return {
                    deferred,
                    resolve: (data) => resolvePromise(data),
                };
            };
            it('should ack the message on a clean execution when Delete-from-Queue was not fired', async () => {
                // Simulates the engine's teardown: resolveExecutionResponsePromise
                // resolves the hook with an empty {}, then finalizeExecution
                // resolves the IRun with no error.
                const { deferred: hookDeferred, resolve: resolveHook } = buildHookDeferred();
                const { deferred: runDeferred, resolve: resolveRun } = buildRunDeferred();
                context.helpers.createDeferredPromise
                    .mockReturnValueOnce(hookDeferred)
                    .mockReturnValueOnce(runDeferred);
                const handleMessagePromise = handleMessage.call(context, message, mockChannel, messageTracker, 'laterMessageNode', options);
                await Promise.resolve();
                expect(messageTracker.received).toHaveBeenCalledWith(message);
                expect(context.emit).toHaveBeenCalledWith([[item]], hookDeferred, runDeferred);
                expect(mockChannel.ack).not.toHaveBeenCalled();
                expect(messageTracker.answered).not.toHaveBeenCalled();
                resolveHook({});
                resolveRun({
                    data: { resultData: { error: undefined } },
                });
                await handleMessagePromise;
                expect(mockChannel.ack).toHaveBeenCalledWith(message);
                expect(mockChannel.nack).not.toHaveBeenCalled();
                expect(messageTracker.answered).toHaveBeenCalledWith(message);
            });
            it('should nack the message when the execution errors before the Delete-from-Queue node runs', async () => {
                // Real engine behavior on crash: resolveExecutionResponsePromise
                // resolves the hook with {} first, then finalizeExecution
                // resolves the IRun with the error. The hook payload shape is
                // the only reliable signal — empty {} means cleanup, so we must
                // fall through to the IRun and nack on error.
                const { deferred: hookDeferred, resolve: resolveHook } = buildHookDeferred();
                const { deferred: runDeferred, resolve: resolveRun } = buildRunDeferred();
                context.helpers.createDeferredPromise
                    .mockReturnValueOnce(hookDeferred)
                    .mockReturnValueOnce(runDeferred);
                const handleMessagePromise = handleMessage.call(context, message, mockChannel, messageTracker, 'laterMessageNode', options);
                await Promise.resolve();
                resolveHook({});
                resolveRun({
                    data: { resultData: { error: new Error('workflow crashed') } },
                });
                await handleMessagePromise;
                expect(mockChannel.ack).not.toHaveBeenCalled();
                expect(mockChannel.nack).toHaveBeenCalledWith(message);
                expect(messageTracker.answered).toHaveBeenCalledWith(message);
            });
            it('should ack as soon as the Delete-from-Queue hook fires, without waiting for the full execution', async () => {
                // Happy path: sendResponse from the Delete-from-Queue node
                // resolves the hook with the item JSON mid-execution. Ack
                // immediately, don't wait for the IRun (downstream nodes may
                // still be running).
                const { deferred: hookDeferred, resolve: resolveHook } = buildHookDeferred();
                const { deferred: runDeferred } = buildRunDeferred();
                context.helpers.createDeferredPromise
                    .mockReturnValueOnce(hookDeferred)
                    .mockReturnValueOnce(runDeferred);
                const handleMessagePromise = handleMessage.call(context, message, mockChannel, messageTracker, 'laterMessageNode', options);
                await Promise.resolve();
                expect(mockChannel.ack).not.toHaveBeenCalled();
                resolveHook({ content: 'hello' });
                await handleMessagePromise;
                expect(mockChannel.ack).toHaveBeenCalledWith(message);
                expect(mockChannel.nack).not.toHaveBeenCalled();
                expect(messageTracker.answered).toHaveBeenCalledWith(message);
            });
            it('should ack when Delete-from-Queue fired before the workflow errored', async () => {
                // At-least-once semantics: if the Delete-from-Queue node ran
                // (real sendResponse with a non-empty payload), the user's
                // intent was satisfied. A later crash in a downstream node
                // should still ack.
                const { deferred: hookDeferred, resolve: resolveHook } = buildHookDeferred();
                const { deferred: runDeferred, resolve: resolveRun } = buildRunDeferred();
                context.helpers.createDeferredPromise
                    .mockReturnValueOnce(hookDeferred)
                    .mockReturnValueOnce(runDeferred);
                const handleMessagePromise = handleMessage.call(context, message, mockChannel, messageTracker, 'laterMessageNode', options);
                await Promise.resolve();
                resolveHook({ content: 'hello' });
                resolveRun({
                    data: { resultData: { error: new Error('downstream crash') } },
                });
                await handleMessagePromise;
                expect(mockChannel.ack).toHaveBeenCalledWith(message);
                expect(mockChannel.nack).not.toHaveBeenCalled();
                expect(messageTracker.answered).toHaveBeenCalledWith(message);
            });
        });
        it('should handle error when "acknowledgeMode" is set to "immediately"', async () => {
            mockChannel.ack.mockImplementation(() => {
                throw new Error('Test error');
            });
            context.getWorkflow.mockReturnValue({
                id: '123',
            });
            context.getNode.mockReturnValue({
                name: 'Test node',
            });
            await handleMessage.call(context, message, mockChannel, messageTracker, 'immediately', options);
            expect(context.logger.error).toHaveBeenCalledWith('There was a problem with the RabbitMQ Trigger node "Test node" in workflow "123": "Test error"', {
                node: 'Test node',
                workflowId: '123',
            });
        });
        it('should handle error when "acknowledgeMode" is set to something other than "immediately"', async () => {
            context.helpers.createDeferredPromise.mockImplementation(() => {
                throw new Error('Test error');
            });
            context.getWorkflow.mockReturnValue({
                id: '123',
            });
            context.getNode.mockReturnValue({
                name: 'Test node',
            });
            await handleMessage.call(context, message, mockChannel, messageTracker, 'executionFinishesSuccessfully', options);
            expect(context.logger.error).toHaveBeenCalledWith('There was a problem with the RabbitMQ Trigger node "Test node" in workflow "123": "Test error"', {
                node: 'Test node',
                workflowId: '123',
            });
        });
    });
});
//# sourceMappingURL=GenericFunctions.test.js.map