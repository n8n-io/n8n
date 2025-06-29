import { captor, mock } from 'jest-mock-extended';
import type { MqttClient, OnMessageCallback, IPublishPacket } from 'mqtt';
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
		triggerFunctions.getNodeParameter.calledWith('topic').mockReturnValue(topic);
		triggerFunctions.getNodeParameter.calledWith('options', {}).mockReturnValue({});
	});

	it('should subscribe to topic and handle messages', async () => {
		const response = await new MqttTrigger().trigger.call(triggerFunctions);
		expect(response.closeFunction).toBeDefined();

		expect(triggerFunctions.getCredentials).toHaveBeenCalledTimes(1);
		expect(triggerFunctions.getNodeParameter).toHaveBeenCalledTimes(2);

		const mockMqttClient = await createClient(mock());
		const onMessageCaptor = captor<OnMessageCallback>();
		expect(mockMqttClient.on).toHaveBeenCalledWith('message', onMessageCaptor);
		expect(mockMqttClient.subscribe).toHaveBeenCalledWith(topic, { qos: 0 }, expect.any(Function));
		expect(triggerFunctions.emit).not.toHaveBeenCalled();

		// simulate a message
		const onMessage = onMessageCaptor.value;
		onMessage(topic, payload, mock<IPublishPacket>());
		expect(triggerFunctions.emit).toHaveBeenCalledWith([
			[{ json: { message: '{"testing": true}', topic } }],
		]);

		await response.closeFunction!();
		expect(mockMqttClient.end).toHaveBeenCalledTimes(1);
	});

	it('should parse JSON messages when configured', async () => {
		triggerFunctions.getNodeParameter.calledWith('options', {}).mockReturnValue({
			parseJson: true,
		});

		await new MqttTrigger().trigger.call(triggerFunctions);

		const mockMqttClient = await createClient(mock());
		const onMessageCaptor = captor<OnMessageCallback>();
		expect(mockMqttClient.on).toHaveBeenCalledWith('message', onMessageCaptor);

		// simulate a message
		const onMessage = onMessageCaptor.value;
		onMessage(topic, payload, mock<IPublishPacket>());
		expect(triggerFunctions.emit).toHaveBeenCalledWith([[{ json: { testing: true, topic } }]]);
	});

	it('should handle non-JSON messages when parseJson is true', async () => {
		triggerFunctions.getNodeParameter.calledWith('options', {}).mockReturnValue({
			parseJson: true,
		});

		await new MqttTrigger().trigger.call(triggerFunctions);

		const mockMqttClient = await createClient(mock());
		const onMessageCaptor = captor<OnMessageCallback>();
		expect(mockMqttClient.on).toHaveBeenCalledWith('message', onMessageCaptor);

		// simulate a non-JSON message
		const onMessage = onMessageCaptor.value;
		onMessage(topic, Buffer.from('plain text'), mock<IPublishPacket>());
		expect(triggerFunctions.emit).toHaveBeenCalledWith([
			[{ json: { message: 'plain text', topic } }],
		]);
	});

	it('should handle QoS levels', async () => {
		triggerFunctions.getNodeParameter.calledWith('options', {}).mockReturnValue({
			qos: 2,
		});

		await new MqttTrigger().trigger.call(triggerFunctions);

		const mockMqttClient = await createClient(mock());
		expect(mockMqttClient.subscribe).toHaveBeenCalledWith(topic, { qos: 2 }, expect.any(Function));
	});

	it('should handle client errors', async () => {
		await new MqttTrigger().trigger.call(triggerFunctions);

		const mockMqttClient = await createClient(mock());
		const onErrorCaptor = captor<(error: Error) => void>();
		expect(mockMqttClient.on).toHaveBeenCalledWith('error', onErrorCaptor);

		// simulate an error
		const onError = onErrorCaptor.value;
		onError(new Error('Connection error'));
		expect(triggerFunctions.emit).toHaveBeenCalledWith([[{ json: { error: 'Connection error' } }]]);
	});

	it('should handle reconnection', async () => {
		await new MqttTrigger().trigger.call(triggerFunctions);

		const mockMqttClient = await createClient(mock());
		const onReconnectCaptor = captor<() => void>();
		expect(mockMqttClient.on).toHaveBeenCalledWith('reconnect', onReconnectCaptor);

		// simulate reconnection
		const onReconnect = onReconnectCaptor.value;
		onReconnect();
		expect(triggerFunctions.emit).toHaveBeenCalledWith([[{ json: { status: 'reconnecting' } }]]);
	});

	it('should handle disconnection', async () => {
		await new MqttTrigger().trigger.call(triggerFunctions);

		const mockMqttClient = await createClient(mock());
		const onCloseCaptor = captor<() => void>();
		expect(mockMqttClient.on).toHaveBeenCalledWith('close', onCloseCaptor);

		// simulate disconnection
		const onClose = onCloseCaptor.value;
		onClose();
		expect(triggerFunctions.emit).toHaveBeenCalledWith([[{ json: { status: 'disconnected' } }]]);
	});
});
