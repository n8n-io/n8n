import { mock } from 'jest-mock-extended';
import { MqttClient } from 'mqtt';
import { ApplicationError } from '@n8n/errors';

import { createClient, type MqttCredential } from '../GenericFunctions';

describe('createClient', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should create a client with minimal credentials', async () => {
		const mockConnect = jest.spyOn(MqttClient.prototype, 'connect').mockImplementation(function (
			this: MqttClient,
		) {
			setImmediate(() => this.emit('connect', mock()));
			return this;
		});

		const credentials = mock<MqttCredential>({
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

	it('should reject with ApplicationError on connection error and close connection', async () => {
		const mockConnect = jest.spyOn(MqttClient.prototype, 'connect').mockImplementation(function (
			this: MqttClient,
		) {
			setImmediate(() => this.emit('error', new Error('Connection failed')));
			return this;
		});
		const mockEnd = jest.spyOn(MqttClient.prototype, 'end').mockImplementation();

		const credentials: MqttCredential = {
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

		await expect(clientPromise).rejects.toThrow(ApplicationError);
		expect(mockConnect).toBeCalledTimes(1);
		expect(mockEnd).toBeCalledTimes(1);
	});
});
