import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import readResult from './fixtures/read.json';
import searchResult from './fixtures/search.json';

describe('JinaAI Node', () => {
	const credentials = {
		jinaAiApi: {
			apiKey: 'API-KEY',
		},
	};

	describe('Reader -> Read', () => {
		const jinaAiNock = nock('https://r.jina.ai');

		beforeAll(() => {
			jinaAiNock.get('/https://first.com/some/path').reply(200, readResult);
			jinaAiNock
				.get('/https://second.com/other')
				.query({
					foo: 'bar',
				})
				.matchHeader('X-Return-Format', 'markdown')
				.matchHeader('X-Target-Selector', 'article')
				.matchHeader('X-Remove-Selector', '.ad')
				.matchHeader('X-With-Generated-Alt', 'true')
				.matchHeader('X-Wait-For-Selector', '#posts')
				.reply(200, readResult);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['read.workflow.json'],
		});
	});

	describe('Reader -> Search', () => {
		const jinaAiNock = nock('https://s.jina.ai');

		beforeAll(() => {
			jinaAiNock
				.get('/')
				.query({
					q: 'Jina AI',
				})
				.reply(200, searchResult);
			jinaAiNock
				.get('/')
				.query({
					q: 'Jina AI',
				})
				.matchHeader('X-Return-Format', 'markdown')
				.matchHeader('X-Site', 'jina.ai')
				.reply(200, searchResult);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['search.workflow.json'],
		});
	});
});
