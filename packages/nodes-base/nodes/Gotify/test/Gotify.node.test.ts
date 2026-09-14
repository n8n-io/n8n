import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Gotify Node', () => {
	const baseUrl = 'https://gotify.example.com';
	const credentials = {
		gotifyApi: {
			url: baseUrl,
			appApiToken: 'test-app-token',
			clientApiToken: 'test-client-token',
		},
	};

	afterEach(() => {
		nock.cleanAll();
	});

	describe('Message Operations', () => {
		describe('Create message - basic', () => {
			beforeAll(() => {
				nock(baseUrl)
					.matchHeader('X-Gotify-Key', 'test-app-token')
					.post('/message', { message: 'Test message' })
					.reply(200, {
						id: 1,
						appid: 1,
						message: 'Test message',
						title: '',
						priority: 1,
						date: '2024-01-01T00:00:00Z',
					});
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['create-message-basic.workflow.json'],
			});
		});

		describe('Create message - markdown', () => {
			beforeAll(() => {
				nock(baseUrl)
					.matchHeader('X-Gotify-Key', 'test-app-token')
					.post('/message', (body) => {
						return (
							body.message === 'Markdown message' &&
							body.extras?.['client::display']?.contentType === 'text/markdown'
						);
					})
					.reply(200, {
						id: 2,
						appid: 1,
						message: 'Markdown message',
						title: '',
						priority: 1,
						date: '2024-01-01T00:00:00Z',
					});
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['create-message-markdown.workflow.json'],
			});
		});

		describe('Create message - click URL', () => {
			beforeAll(() => {
				nock(baseUrl)
					.matchHeader('X-Gotify-Key', 'test-app-token')
					.post('/message', (body) => {
						return (
							body.message === 'Message with click URL' &&
							body.extras?.['client::notification']?.click?.url === 'https://example.com'
						);
					})
					.reply(200, {
						id: 3,
						appid: 1,
						message: 'Message with click URL',
						title: '',
						priority: 1,
						date: '2024-01-01T00:00:00Z',
					});
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['create-message-click-url.workflow.json'],
			});
		});

		describe('Create message - big image', () => {
			beforeAll(() => {
				nock(baseUrl)
					.matchHeader('X-Gotify-Key', 'test-app-token')
					.post('/message', (body) => {
						return (
							body.message === 'Message with big image' &&
							body.extras?.['client::notification']?.bigImageUrl === 'https://example.com/image.jpg'
						);
					})
					.reply(200, {
						id: 4,
						appid: 1,
						message: 'Message with big image',
						title: '',
						priority: 1,
						date: '2024-01-01T00:00:00Z',
					});
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['create-message-big-image.workflow.json'],
			});
		});

		describe('Create message - intent URL', () => {
			beforeAll(() => {
				nock(baseUrl)
					.matchHeader('X-Gotify-Key', 'test-app-token')
					.post('/message', (body) => {
						return (
							body.message === 'Message with intent URL' &&
							body.extras?.['android::action']?.onReceive?.intentUrl ===
								'https://example.com/intent'
						);
					})
					.reply(200, {
						id: 5,
						appid: 1,
						message: 'Message with intent URL',
						title: '',
						priority: 1,
						date: '2024-01-01T00:00:00Z',
					});
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['create-message-intent-url.workflow.json'],
			});
		});

		describe('Create message - all extras', () => {
			beforeAll(() => {
				nock(baseUrl)
					.matchHeader('X-Gotify-Key', 'test-app-token')
					.post('/message', (body) => {
						return (
							body.message === 'Message with all extras' &&
							body.extras?.['client::display']?.contentType === 'text/markdown' &&
							body.extras?.['client::notification']?.click?.url === 'https://example.com' &&
							body.extras?.['client::notification']?.bigImageUrl ===
								'https://example.com/image.jpg' &&
							body.extras?.['android::action']?.onReceive?.intentUrl ===
								'https://example.com/intent'
						);
					})
					.reply(200, {
						id: 6,
						appid: 1,
						message: 'Message with all extras',
						title: '',
						priority: 1,
						date: '2024-01-01T00:00:00Z',
					});
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['create-message-all-extras.workflow.json'],
			});
		});

		describe('Create message - priority and title', () => {
			beforeAll(() => {
				nock(baseUrl)
					.matchHeader('X-Gotify-Key', 'test-app-token')
					.post('/message', (body) => {
						return (
							body.message === 'Message with priority and title' &&
							body.priority === 5 &&
							body.title === 'Test Title'
						);
					})
					.reply(200, {
						id: 7,
						appid: 1,
						message: 'Message with priority and title',
						title: 'Test Title',
						priority: 5,
						date: '2024-01-01T00:00:00Z',
					});
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['create-message-priority-title.workflow.json'],
			});
		});

		describe('Delete message', () => {
			beforeAll(() => {
				const mock = nock(baseUrl);

				mock.delete('/message/123').matchHeader('X-Gotify-Key', 'test-client-token').reply(200, {});
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['delete-message.workflow.json'],
			});
		});

		describe('Get all messages', () => {
			beforeAll(() => {
				const mock = nock(baseUrl);

				mock
					.get('/message')
					.query({ limit: 20 })
					.matchHeader('X-Gotify-Key', 'test-client-token')
					.reply(200, {
						messages: [
							{
								id: 1,
								appid: 1,
								message: 'Test message 1',
								title: '',
								priority: 1,
								date: '2024-01-01T00:00:00Z',
							},
							{
								id: 2,
								appid: 1,
								message: 'Test message 2',
								title: '',
								priority: 1,
								date: '2024-01-01T00:00:00Z',
							},
						],
						paging: {
							limit: 20,
							next: null,
							since: 0,
							size: 2,
						},
					});

				mock
					.get('/message')
					.query({ limit: 100 })
					.matchHeader('X-Gotify-Key', 'test-client-token')
					.reply(200, {
						messages: [
							{
								id: 1,
								appid: 1,
								message: 'Test message 1',
								title: '',
								priority: 1,
								date: '2024-01-01T00:00:00Z',
							},
						],
						paging: {
							limit: 100,
							next: null,
							since: 0,
							size: 1,
						},
					});
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['get-all-messages.workflow.json'],
			});
		});
	});
});
