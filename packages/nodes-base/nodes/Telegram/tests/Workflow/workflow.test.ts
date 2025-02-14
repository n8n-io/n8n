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
} from './apiResponses';
import { FAKE_CREDENTIALS_DATA } from '../../../../test/nodes/FakeCredentialsMap';
import { getWorkflowFilenames, testWorkflows } from '../../../../test/nodes/Helpers';

describe('Telegram', () => {
	describe('Run Telegram workflow', () => {
		beforeAll(() => {
			const { baseUrl } = FAKE_CREDENTIALS_DATA.telegramApi;
			const mock = nock(baseUrl);

			mock.post('/bottestToken/getChat').reply(200, getChatResponse);
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

		const workflows = getWorkflowFilenames(__dirname);
		testWorkflows(workflows);
	});
});
