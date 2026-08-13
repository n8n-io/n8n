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
});
