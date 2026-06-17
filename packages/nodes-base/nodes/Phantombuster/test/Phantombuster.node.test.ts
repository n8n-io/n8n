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
});
