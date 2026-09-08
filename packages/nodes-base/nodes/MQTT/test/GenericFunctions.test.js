import { mock } from 'vitest-mock-extended';
import { MqttClient } from 'mqtt';
import { OperationalError } from 'n8n-workflow';
import { createClient } from '../GenericFunctions';
describe('createClient', () => {
    beforeEach(() => vi.clearAllMocks());
    it('should create a client with minimal credentials', async () => {
        const mockConnect = vi.spyOn(MqttClient.prototype, 'connect').mockImplementation(function () {
            setImmediate(() => this.emit('connect', mock()));
            return this;
        });
        const credentials = mock({
            protocol: 'mqtt',
            host: 'localhost',
            port: 1883,
            clean: true,
            clientId: 'testClient',
            ssl: false,
        });
        const client = await createClient(credentials);
        expect(mockConnect).toBeCalledTimes(1);
        expect(client).toBeDefined();
        expect(client).toBeInstanceOf(MqttClient);
        expect(client.options).toMatchObject({
            protocol: 'mqtt',
            host: 'localhost',
            port: 1883,
            clean: true,
            clientId: 'testClient',
        });
    });
    it('should reject with OperationalError on connection error and close connection', async () => {
        const mockConnect = vi.spyOn(MqttClient.prototype, 'connect').mockImplementation(function () {
            setImmediate(() => this.emit('error', new Error('Connection failed')));
            return this;
        });
        const mockEnd = vi
            .spyOn(MqttClient.prototype, 'end')
            .mockImplementation((() => { }));
        const credentials = {
            protocol: 'mqtt',
            host: 'localhost',
            port: 1883,
            clean: true,
            clientId: 'testClientId',
            username: 'testUser',
            password: 'testPass',
            ssl: false,
        };
        const clientPromise = createClient(credentials);
        await expect(clientPromise).rejects.toThrow(OperationalError);
        expect(mockConnect).toBeCalledTimes(1);
        expect(mockEnd).toBeCalledTimes(1);
    });
});
//# sourceMappingURL=GenericFunctions.test.js.map