import { mock } from 'jest-mock-extended';
import type { MqttClient } from 'mqtt';
import type { ICredentialDataDecryptedObject, IExecuteFunctions } from 'n8n-workflow';

import { createClient } from '../GenericFunctions';
import { Mqtt } from '../Mqtt.node';

jest.mock('../GenericFunctions', () => {
	const mockMqttClient = mock<MqttClient>();
	return {
		createClient: jest.fn().mockResolvedValue(mockMqttClient),
	};
});

describe('MQTT Node', () => {
	const credentials = mock<ICredentialDataDecryptedObject>();
	const executeFunctions = mock<IExecuteFunctions>();

	beforeEach(() => {
		jest.clearAllMocks();

		executeFunctions.getCredentials.calledWith('mqtt').mockResolvedValue(credentials);
		executeFunctions.getInputData.mockReturnValue([{ json: { testing: true } }]);
		executeFunctions.getNodeParameter.calledWith('topic', 0).mockReturnValue('test/topic');
		executeFunctions.getNodeParameter.calledWith('options', 0).mockReturnValue({});
	});

	it('should publish input data', async () => {
		executeFunctions.getNodeParameter.calledWith('sendInputData', 0).mockReturnValue(true);

		const result = await new Mqtt().execute.call(executeFunctions);

		expect(result).toEqual([[{ json: { testing: true } }]]);
		expect(executeFunctions.getCredentials).toHaveBeenCalledTimes(1);
		expect(executeFunctions.getNodeParameter).toHaveBeenCalledTimes(3);

		const mockMqttClient = await createClient(mock());
		expect(mockMqttClient.publishAsync).toHaveBeenCalledWith('test/topic', '{"testing":true}', {});
		expect(mockMqttClient.endAsync).toHaveBeenCalledTimes(1);
	});

	it('should publish a custom message', async () => {
		executeFunctions.getNodeParameter.calledWith('sendInputData', 0).mockReturnValue(false);
		executeFunctions.getNodeParameter.calledWith('message', 0).mockReturnValue('Hello, MQTT!');

		const result = await new Mqtt().execute.call(executeFunctions);

		expect(result).toEqual([[{ json: { testing: true } }]]);
		expect(executeFunctions.getCredentials).toHaveBeenCalledTimes(1);
		expect(executeFunctions.getNodeParameter).toHaveBeenCalledTimes(4);

		const mockMqttClient = await createClient(mock());
		expect(mockMqttClient.publishAsync).toHaveBeenCalledWith('test/topic', 'Hello, MQTT!', {});
		expect(mockMqttClient.endAsync).toHaveBeenCalledTimes(1);
	});
});
