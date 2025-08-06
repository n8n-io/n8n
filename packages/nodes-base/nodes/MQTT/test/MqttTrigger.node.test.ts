import { captor, mock } from 'jest-mock-extended';
import type { MqttClient, OnMessageCallback } from 'mqtt';
import { returnJsonArray } from 'n8n-core';
import type { ICredentialDataDecryptedObject, ITriggerFunctions } from 'n8n-workflow';

import { createClient } from '../GenericFunctions';
import { MqttTrigger } from '../MqttTrigger.node';

jest.mock('../GenericFunctions', () => {
	const mockMqttClient = mock<MqttClient>();
	return {
		createClient: jest.fn().mockResolvedValue(mockMqttClient),
	};
});

describe('MQTT Trigger Node', () => {
	const topic = 'test/topic';
	const payload = Buffer.from('{"testing": true}');
	const credentials = mock<ICredentialDataDecryptedObject>();
	const triggerFunctions = mock<ITriggerFunctions>({
		helpers: { returnJsonArray },
	});

	beforeEach(() => {
		jest.clearAllMocks();

		triggerFunctions.getCredentials.calledWith('mqtt').mockResolvedValue(credentials);
		triggerFunctions.getNodeParameter.calledWith('topics').mockReturnValue(topic);
	});

	it('should emit in manual mode', async () => {
		triggerFunctions.getMode.mockReturnValue('manual');
		triggerFunctions.getNodeParameter.calledWith('options').mockReturnValue({});

		const response = await new MqttTrigger().trigger.call(triggerFunctions);
		expect(response.manualTriggerFunction).toBeDefined();
		expect(response.closeFunction).toBeDefined();

		expect(triggerFunctions.getCredentials).toHaveBeenCalledTimes(1);
		expect(triggerFunctions.getNodeParameter).toHaveBeenCalledTimes(2);

		// manually trigger the node, like Workflow.runNode does
		const triggerPromise = response.manualTriggerFunction!();

		const mockMqttClient = await createClient(mock());
		expect(mockMqttClient.on).not.toHaveBeenCalled();

		const onMessageCaptor = captor<OnMessageCallback>();
		expect(mockMqttClient.once).toHaveBeenCalledWith('message', onMessageCaptor);
		expect(mockMqttClient.subscribeAsync).toHaveBeenCalledWith({ [topic]: { qos: 0 } });
		expect(triggerFunctions.emit).not.toHaveBeenCalled();

		// simulate a message
		const onMessage = onMessageCaptor.value;
		onMessage('test/topic', payload, mock());
		expect(triggerFunctions.emit).toHaveBeenCalledWith([
			[{ json: { message: '{"testing": true}', topic } }],
		]);

		// wait for the promise to resolve
		await new Promise((resolve) => setImmediate(resolve));
		await expect(triggerPromise).resolves.toEqual(undefined);

		expect(mockMqttClient.endAsync).not.toHaveBeenCalled();
		await response.closeFunction!();
		expect(mockMqttClient.endAsync).toHaveBeenCalledTimes(1);
	});

	it('should emit in trigger mode', async () => {
		triggerFunctions.getMode.mockReturnValue('trigger');
		triggerFunctions.getNodeParameter.calledWith('options').mockReturnValue({});

		const response = await new MqttTrigger().trigger.call(triggerFunctions);
		expect(response.manualTriggerFunction).toBeDefined();
		expect(response.closeFunction).toBeDefined();

		expect(triggerFunctions.getCredentials).toHaveBeenCalledTimes(1);
		expect(triggerFunctions.getNodeParameter).toHaveBeenCalledTimes(2);

		const mockMqttClient = await createClient(mock());
		expect(mockMqttClient.once).not.toHaveBeenCalled();

		const onMessageCaptor = captor<OnMessageCallback>();
		expect(mockMqttClient.on).toHaveBeenCalledWith('message', onMessageCaptor);
		expect(mockMqttClient.subscribeAsync).toHaveBeenCalledWith({ [topic]: { qos: 0 } });
		expect(triggerFunctions.emit).not.toHaveBeenCalled();

		// simulate a message
		const onMessage = onMessageCaptor.value;
		onMessage('test/topic', payload, mock());
		expect(triggerFunctions.emit).toHaveBeenCalledWith(
			[[{ json: { message: '{"testing": true}', topic } }]],
			undefined,
			undefined,
		);

		expect(mockMqttClient.endAsync).not.toHaveBeenCalled();
		await response.closeFunction!();
		expect(mockMqttClient.endAsync).toHaveBeenCalledTimes(1);
	});

	it('should parse JSON messages when configured', async () => {
		triggerFunctions.getMode.mockReturnValue('trigger');
		triggerFunctions.getNodeParameter.calledWith('options').mockReturnValue({
			jsonParseBody: true,
		});

		await new MqttTrigger().trigger.call(triggerFunctions);

		const mockMqttClient = await createClient(mock());
		const onMessageCaptor = captor<OnMessageCallback>();
		expect(mockMqttClient.on).toHaveBeenCalledWith('message', onMessageCaptor);

		// simulate a message
		const onMessage = onMessageCaptor.value;
		onMessage('test/topic', payload, mock());
		expect(triggerFunctions.emit).toHaveBeenCalledWith(
			[[{ json: { message: { testing: true }, topic } }]],
			undefined,
			undefined,
		);
	});
});
