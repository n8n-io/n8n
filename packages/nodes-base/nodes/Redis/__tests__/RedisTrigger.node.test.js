import { captor, mock } from 'vitest-mock-extended';
import { returnJsonArray } from 'n8n-core';
import { RedisTrigger } from '../RedisTrigger.node';
import { setupRedisClient } from '../utils';
vi.mock('../utils', async () => {
    const mockRedisClient = mock();
    return {
        ...(await vi.importActual('../utils')),
        setupRedisClient: vi.fn().mockReturnValue(mockRedisClient),
    };
});
describe('Redis Trigger Node', () => {
    const channel = 'testing';
    const credentials = mock();
    const triggerFunctions = mock({
        helpers: { returnJsonArray },
    });
    beforeEach(() => {
        vi.clearAllMocks();
        triggerFunctions.getCredentials.calledWith('redis').mockResolvedValue(credentials);
        triggerFunctions.getNodeParameter.calledWith('channels').mockReturnValue(channel);
    });
    it('should emit in manual mode', async () => {
        triggerFunctions.getMode.mockReturnValue('manual');
        triggerFunctions.getNodeParameter.calledWith('options').mockReturnValue({});
        const response = await new RedisTrigger().trigger.call(triggerFunctions);
        expect(response.manualTriggerFunction).toBeDefined();
        expect(response.closeFunction).toBeDefined();
        expect(triggerFunctions.getCredentials).toHaveBeenCalledTimes(1);
        expect(triggerFunctions.getNodeParameter).toHaveBeenCalledTimes(2);
        const mockRedisClient = setupRedisClient(mock());
        expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
        expect(mockRedisClient.ping).toHaveBeenCalledTimes(1);
        // manually trigger the node, like Workflow.runNode does
        const triggerPromise = response.manualTriggerFunction();
        const onMessageCaptor = captor();
        expect(mockRedisClient.pSubscribe).toHaveBeenCalledWith([channel], onMessageCaptor);
        expect(triggerFunctions.emit).not.toHaveBeenCalled();
        // simulate a message
        const onMessage = onMessageCaptor.value;
        onMessage('{"testing": true}', channel);
        expect(triggerFunctions.emit).toHaveBeenCalledWith([
            [{ json: { message: '{"testing": true}', channel } }],
        ]);
        // wait for the promise to resolve
        await new Promise((resolve) => setImmediate(resolve));
        await expect(triggerPromise).resolves.toEqual(undefined);
        expect(mockRedisClient.quit).not.toHaveBeenCalled();
        await response.closeFunction();
        expect(mockRedisClient.pUnsubscribe).toHaveBeenCalledTimes(1);
        expect(mockRedisClient.quit).toHaveBeenCalledTimes(1);
    });
    it('should emit in trigger mode', async () => {
        triggerFunctions.getMode.mockReturnValue('trigger');
        triggerFunctions.getNodeParameter.calledWith('options').mockReturnValue({});
        const response = await new RedisTrigger().trigger.call(triggerFunctions);
        expect(response.manualTriggerFunction).toBeDefined();
        expect(response.closeFunction).toBeDefined();
        expect(triggerFunctions.getCredentials).toHaveBeenCalledTimes(1);
        expect(triggerFunctions.getNodeParameter).toHaveBeenCalledTimes(2);
        const mockRedisClient = setupRedisClient(mock());
        expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
        expect(mockRedisClient.ping).toHaveBeenCalledTimes(1);
        const onMessageCaptor = captor();
        expect(mockRedisClient.pSubscribe).toHaveBeenCalledWith([channel], onMessageCaptor);
        expect(triggerFunctions.emit).not.toHaveBeenCalled();
        // simulate a message
        const onMessage = onMessageCaptor.value;
        onMessage('{"testing": true}', channel);
        expect(triggerFunctions.emit).toHaveBeenCalledWith([
            [{ json: { message: '{"testing": true}', channel } }],
        ]);
        expect(mockRedisClient.quit).not.toHaveBeenCalled();
        await response.closeFunction();
        expect(mockRedisClient.pUnsubscribe).toHaveBeenCalledTimes(1);
        expect(mockRedisClient.quit).toHaveBeenCalledTimes(1);
    });
    it('should parse JSON messages when configured', async () => {
        triggerFunctions.getMode.mockReturnValue('trigger');
        triggerFunctions.getNodeParameter.calledWith('options').mockReturnValue({
            jsonParseBody: true,
        });
        await new RedisTrigger().trigger.call(triggerFunctions);
        const mockRedisClient = setupRedisClient(mock());
        const onMessageCaptor = captor();
        expect(mockRedisClient.pSubscribe).toHaveBeenCalledWith([channel], onMessageCaptor);
        // simulate a message
        const onMessage = onMessageCaptor.value;
        onMessage('{"testing": true}', channel);
        expect(triggerFunctions.emit).toHaveBeenCalledWith([
            [{ json: { message: { testing: true }, channel } }],
        ]);
    });
});
//# sourceMappingURL=RedisTrigger.node.test.js.map