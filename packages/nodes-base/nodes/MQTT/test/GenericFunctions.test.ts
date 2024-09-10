import { MqttClient } from 'mqtt';
import { mock } from 'jest-mock-extended';

import { createClient, type MqttCredential } from '../GenericFunctions';

describe('createClient', () => {
	const mockConnect = jest.spyOn(MqttClient.prototype, 'connect').mockImplementation(function (
		this: MqttClient,
	) {
		setImmediate(() => this.emit('connect', mock()));
		return this;
	});

	beforeEach(() => jest.clearAllMocks());

	it('should create a client with minimal credentials', async () => {
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
});
