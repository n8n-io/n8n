import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Phantombuster Node', () => {
	const credentials = {
		phantombusterApi: {
			apiKey: 'test-api-key',
		},
	};

	describe('Launch Agent Without Arguments', () => {
		beforeAll(() => {
			const mock = nock('https://api.phantombuster.com');

			mock
				.post('/api/v2/agents/launch', (body) => {
					return body.id === 'test-agent-123' && !body.arguments && !body.bonusArgument;
				})
				.reply(200, { containerId: 'container-456' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['launch-without-arguments.workflow.json'],
		});
	});

	describe('Launch Agent With Arguments No Bonus', () => {
		beforeAll(() => {
			const mock = nock('https://api.phantombuster.com');

			mock
				.post('/api/v2/agents/launch', (body) => {
					return (
						body.id === 'test-agent-123' &&
						body.arguments &&
						body.arguments.testKey === 'testValue' &&
						!body.bonusArgument
					);
				})
				.reply(200, { containerId: 'container-456' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['launch-with-arguments-no-bonus.workflow.json'],
		});
	});

	describe('Launch Agent With Bonus Arguments', () => {
		beforeAll(() => {
			const mock = nock('https://api.phantombuster.com');

			mock
				.post('/api/v2/agents/launch', (body) => {
					return (
						body.id === 'test-agent-123' &&
						body.arguments &&
						body.arguments.testKey === 'testValue' &&
						body.bonusArgument &&
						body.bonusArgument.bonusKey === 'bonusValue'
					);
				})
				.reply(200, { containerId: 'container-456' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['launch-with-bonus-arguments.workflow.json'],
		});
	});

	describe('Launch Agent With JSON Arguments', () => {
		beforeAll(() => {
			const mock = nock('https://api.phantombuster.com');

			mock
				.post('/api/v2/agents/launch', (body) => {
					return (
						body.id === 'test-agent-123' &&
						body.arguments &&
						body.arguments.complexKey === 'complexValue' &&
						body.arguments.nestedObject &&
						body.arguments.nestedObject.nested === 'value'
					);
				})
				.reply(200, { containerId: 'container-456' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['launch-with-json-arguments.workflow.json'],
		});
	});

	describe('Launch Sync Agent', () => {
		beforeAll(() => {
			const ndjson =
				'{"type":"start","data":{"containerId":"container-456"}}\n' +
				'{"type":"summary","data":{"containerId":"container-456","executionTime":1234,"exitCode":0,"resultObject":{"foo":"bar"},"output":"agent finished"}}\n';

			nock('https://api.phantombuster.com')
				.post('/api/v2/agents/launch-sync', (body) => body.id === 'test-agent-123')
				.reply(200, ndjson, { 'Content-Type': 'application/x-ndjson' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['launch-sync-success.workflow.json'],
		});
	});

	describe('Launch Sync Agent Reports Server Error', () => {
		beforeAll(() => {
			const ndjson =
				'{"type":"start","data":{"containerId":"container-456"}}\n' +
				'{"type":"error","data":"agent script crashed"}\n';

			nock('https://api.phantombuster.com')
				.post('/api/v2/agents/launch-sync', (body) => body.id === 'test-agent-123')
				.reply(200, ndjson, { 'Content-Type': 'application/x-ndjson' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['launch-sync-server-error.workflow.json'],
		});
	});

	describe('Agent Requests', () => {
		beforeAll(() => {
			const agent = { id: '4567891234567890', name: 'LinkedIn Profile Scraper' };
			const mock = nock('https://api.phantombuster.com/api/v2');
			mock.post('/agents/delete', { id: '4567891234567890' }).reply(200, {});
			mock.get('/agents/fetch').query({ id: '4567891234567890' }).reply(200, agent);
			mock.get('/agents/fetch-all').reply(200, [agent]);
			mock
				.get('/agents/fetch-output')
				.query({ id: '4567891234567890' })
				.reply(200, { containerId: '7891234567890123', status: 'finished' });
			mock
				.get('/containers/fetch-result-object')
				.query({ id: '7891234567890123' })
				.reply(200, { resultObject: '{"profileUrl":"https://www.linkedin.com/in/nathan"}' });
			mock
				.post('/agents/launch', { id: '4567891234567890' })
				.reply(200, { containerId: '7891234567890123' });
			mock
				.get('/containers/fetch')
				.query({ id: '7891234567890123' })
				.reply(200, { id: '7891234567890123', status: 'finished' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['requests.workflow.json'],
			customAssertions: () => expect(nock.isDone()).toBe(true),
		});
	});
});
