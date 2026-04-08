import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { NodeConnectionTypes, type WorkflowTestData } from 'n8n-workflow';

import { apiUrl } from '../Peekalink.node';

describe('Peekalink Node', () => {
	const testHarness = new NodeTestHarness();
	const exampleComPreview = {
		url: 'https://example.com/',
		domain: 'example.com',
		lastUpdated: '2022-11-13T22:43:20.986744Z',
		nextUpdate: '2022-11-20T22:43:20.982384Z',
		contentType: 'html',
		mimeType: 'text/html',
		size: 648,
		redirected: false,
		title: 'Example Domain',
		description: 'This domain is for use in illustrative examples in documents',
		name: 'EXAMPLE.COM',
		trackersDetected: false,
	};

	const tests: WorkflowTestData[] = [
		{
			description: 'should run isAvailable operation',
			input: {
				workflowData: {
					nodes: [
						{
							parameters: {},
							id: '8b7bb389-e4ef-424a-bca1-e7ead60e43eb',
							name: 'When clicking "Execute Workflow"',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [740, 380],
						},
						{
							parameters: {
								operation: 'isAvailable',
								url: 'https://example.com/',
							},
							id: '7354367e-39a7-4fc1-8cdd-442f0b0c7b62',
							name: 'Peekalink',
							type: 'n8n-nodes-base.peekalink',
							typeVersion: 1,
							position: [960, 380],
							credentials: {
								peekalinkApi: {
									id: '1',
									name: 'peekalink',
								},
							},
						},
					],
					connections: {
						'When clicking "Execute Workflow"': {
							main: [
								[
									{
										node: 'Peekalink',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
					},
				},
			},
			output: {
				nodeData: {
					Peekalink: [
						[
							{
								json: {
									isAvailable: true,
								},
							},
						],
					],
				},
			},
			nock: {
				baseUrl: apiUrl,
				mocks: [
					{
						method: 'post',
						path: '/is-available/',
						statusCode: 200,
						responseBody: { isAvailable: true },
					},
				],
			},
		},
		{
			description: 'should run preview operation',
			input: {
				workflowData: {
					nodes: [
						{
							parameters: {},
							id: '8b7bb389-e4ef-424a-bca1-e7ead60e43eb',
							name: 'When clicking "Execute Workflow"',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [740, 380],
						},
						{
							parameters: {
								operation: 'preview',
								url: 'https://example.com/',
							},
							id: '7354367e-39a7-4fc1-8cdd-442f0b0c7b62',
							name: 'Peekalink',
							type: 'n8n-nodes-base.peekalink',
							typeVersion: 1,
							position: [960, 380],
							credentials: {
								peekalinkApi: {
									id: '1',
									name: 'peekalink',
								},
							},
						},
					],
					connections: {
						'When clicking "Execute Workflow"': {
							main: [
								[
									{
										node: 'Peekalink',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
					},
				},
			},
			output: {
				nodeData: {
					Peekalink: [
						[
							{
								json: exampleComPreview,
							},
						],
					],
				},
			},
			nock: {
				baseUrl: apiUrl,
				mocks: [
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						responseBody: exampleComPreview,
					},
				],
			},
		},
	];

	for (const testData of tests) {
		testHarness.setupTest(testData);
	}
});
