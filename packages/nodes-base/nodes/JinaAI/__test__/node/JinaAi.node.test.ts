import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import deepResearchResult from './fixtures/deepResearch.json';
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
			jinaAiNock.get('/https://first.com/some/path').times(2).reply(200, readResult);
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

		afterAll(() => jinaAiNock.done());

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
				.times(2)
				.reply(200, searchResult);
			jinaAiNock
				.get('/')
				.query({
					q: 'Jina AI',
					page: 2,
				})
				.matchHeader('X-Return-Format', 'markdown')
				.matchHeader('X-Site', 'jina.ai')
				.reply(200, searchResult);
		});

		afterAll(() => jinaAiNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['search.workflow.json'],
		});
	});

	describe('Research -> Deep Research', () => {
		const jinaAiNock = nock('https://deepsearch.jina.ai');

		beforeAll(() => {
			jinaAiNock
				.post('/v1/chat/completions', {
					messages: [
						{
							role: 'user',
							content: 'Describe the latest features in Jina AI',
						},
					],
				})
				.times(2)
				.reply(200, deepResearchResult);
			jinaAiNock
				.post('/v1/chat/completions', {
					messages: [
						{
							role: 'user',
							content: 'Describe the latest features in Jina AI',
						},
					],
					max_returned_urls: 5,
					boost_hostnames: ['jina.ai'],
					bad_hostnames: ['medium.com'],
					only_hostnames: ['jina.ai', 'github.com'],
				})
				.reply(200, deepResearchResult);
		});

		afterAll(() => jinaAiNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['deepResearch.workflow.json'],
		});
	});
});
