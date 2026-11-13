import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import {
	getChatResponse,
	sendMediaGroupResponse,
	sendMessageResponse,
	sendLocationMessageResponse,
	okTrueResponse,
	sendStickerResponse,
	editMessageTextResponse,
	chatAdministratorsResponse,
	sendAnimationMessageResponse,
	sendAudioResponse,
	getMemberResponse,
	sendMessageWithBinaryDataAndReplyMarkupResponse,
} from './apiResponses';

describe('Telegram', () => {
	const credentials = {
		telegramApi: {
			accessToken: 'testToken',
			baseUrl: 'https://api.telegram.org',
		},
	};

	describe('Run Telegram workflow', () => {
		beforeAll(() => {
			const mock = nock(credentials.telegramApi.baseUrl);

			mock.post('/bottestToken/getChat').reply(200, getChatResponse);
			mock.post('/bottestToken/getChat').reply(404, { error: 'Chat not found' });
			mock.post('/bottestToken/sendMessage').reply(200, sendMessageResponse);
			mock.post('/bottestToken/sendMediaGroup').reply(200, sendMediaGroupResponse);
			mock.post('/bottestToken/sendLocation').reply(200, sendLocationMessageResponse);
			mock.post('/bottestToken/deleteMessage').reply(200, okTrueResponse);
			mock.post('/bottestToken/pinChatMessage').reply(200, okTrueResponse);
			mock.post('/bottestToken/setChatDescription').reply(200, okTrueResponse);
			mock.post('/bottestToken/setChatTitle').reply(200, okTrueResponse);
			mock.post('/bottestToken/unpinChatMessage').reply(200, okTrueResponse);
			mock.post('/bottestToken/sendChatAction').reply(200, okTrueResponse);
			mock.post('/bottestToken/leaveChat').reply(200, okTrueResponse);
			mock.post('/bottestToken/sendSticker').reply(200, sendStickerResponse);
			mock.post('/bottestToken/editMessageText').reply(200, editMessageTextResponse);
			mock.post('/bottestToken/getChatAdministrators').reply(200, chatAdministratorsResponse);
			mock.post('/bottestToken/sendAnimation').reply(200, sendAnimationMessageResponse);
			mock.post('/bottestToken/sendAudio').reply(200, sendAudioResponse);
			mock.post('/bottestToken/getChatMember').reply(200, getMemberResponse);
		});

		new NodeTestHarness().setupTests({ credentials, workflowFiles: ['workflow.json'] });
	});

	describe('Binary Data and Reply Markup', () => {
		beforeAll(() => {
			const mock = nock(credentials.telegramApi.baseUrl);
			mock
				.post('/bottestToken/sendDocument')
				.reply(200, sendMessageWithBinaryDataAndReplyMarkupResponse);
		});

		new NodeTestHarness().setupTests({ credentials, workflowFiles: ['binaryData.workflow.json'] });
	});

	describe('File requests', () => {
		const fileCredentials = {
			telegramApi: {
				accessToken: '123456789:AAH-fake_Token-abc',
				baseUrl: 'https://api.telegram.org',
			},
		};
		const getFileResponse = {
			ok: true,
			result: {
				file_id: 'BQACAgIAAxkBAAIBG2Zf-file_id',
				file_unique_id: 'AgADuQQAAkW1',
				file_size: 9,
				file_path: 'documents/file_1.pdf',
			},
		};

		beforeAll(() => {
			const mock = nock(fileCredentials.telegramApi.baseUrl);
			mock
				.post('/bot123456789:AAH-fake_Token-abc/getFile', {
					file_id: 'BQACAgIAAxkBAAIBG2Zf-file_id',
				})
				.times(2)
				.reply(200, getFileResponse);
			mock
				.get('/file/bot123456789:AAH-fake_Token-abc/documents/file_1.pdf')
				.reply(200, 'test-file');
		});

		new NodeTestHarness().setupTests({
			credentials: fileCredentials,
			workflowFiles: ['file.workflow.json'],
			customAssertions: () => expect(nock.isDone()).toBe(true),
		});
	});
});
