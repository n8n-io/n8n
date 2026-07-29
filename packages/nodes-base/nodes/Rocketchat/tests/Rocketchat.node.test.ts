import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	rocketchatApi: {
		domain: 'https://chat.example.com',
		userId: 'user',
		authKey: 'token',
	},
};

describe('RocketChat Node', () => {
	nock('https://chat.example.com/api/v1')
		.post('/chat.postMessage', {
			channel: '#general',
			text: 'hello world',
			alias: 'bot',
			avatar: 'https://chat.example.com/avatar.png',
			emoji: ':robot:',
		})
		.reply(200, {
			message: {
				_id: 'message1',
				msg: 'hello world',
				rid: 'GENERAL',
			},
			success: true,
		});

	nock('https://chat.example.com/api/v1')
		.get('/subscriptions.get')
		.reply(200, {
			update: [{ rid: 'ROOM1', name: 'general' }],
			remove: [{ rid: 'ROOM2' }],
			success: true,
		});

	nock('https://chat.example.com/api/v1').post('/subscriptions.read', { rid: 'ROOM1' }).reply(200, {
		success: true,
	});

	nock('https://chat.example.com/api/v1')
		.get('/dm.messages')
		.query({ roomId: 'ROOM1', offset: 0, count: 100 })
		.reply(200, {
			messages: [{ _id: 'msg1', msg: 'hello' }],
			count: 1,
			offset: 0,
			total: 2,
			success: true,
		});

	nock('https://chat.example.com/api/v1')
		.get('/dm.messages')
		.query({ roomId: 'ROOM1', offset: 1, count: 100 })
		.reply(200, {
			messages: [{ _id: 'msg2', msg: 'world' }],
			count: 1,
			offset: 1,
			total: 2,
			success: true,
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: [
			'workflows/chat_postMessage.workflow.json',
			'workflows/subscriptions_get.workflow.json',
			'workflows/subscriptions_read.workflow.json',
			'workflows/dm_messages.workflow.json',
		],
	});
});
