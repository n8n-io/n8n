import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import path from 'path';

describe('Test Move Binary Data Node', () => {
	const testHarness = new NodeTestHarness();
	const workflowData = testHarness.readWorkflowJSON('MoveBinaryData.workflow.json');
	const node = workflowData.nodes.find((n) => n.name === 'Read Binary File')!;
	node.parameters.filePath = path.join(__dirname, 'data', 'sample.json');

	const tests: WorkflowTestData[] = [
		{
			description: 'nodes/MoveBinaryData/test/MoveBinaryData.workflow.json',
			input: {
				workflowData,
			},
			output: {
				assertBinaryData: true,
				nodeData: {
					'Binary to JSON': [
						[
							{
								json: {
									id: 1,
									title: 'My Title',
									description: 'Lorem Ipsum ...',
								},
							},
						],
					],
					'Binary to JSON - No Set All Data': [
						[
							{
								json: {
									data: '{\n\t"id": 1,\n\t"title": "My Title",\n\t"description": "Lorem Ipsum ..."\n}',
								},
							},
						],
					],
					'Binary to JSON - No Set All Data + Json Parse': [
						[
							{
								json: {
									data: {
										id: 1,
										title: 'My Title',
										description: 'Lorem Ipsum ...',
									},
								},
							},
						],
					],
					'Binary to JSON - No Set All Data + Encoding base64': [
						[
							{
								json: {
									data: 'ewoJImlkIjogMSwKCSJ0aXRsZSI6ICJNeSBUaXRsZSIsCgkiZGVzY3JpcHRpb24iOiAiTG9yZW0gSXBzdW0gLi4uIgp9',
								},
							},
						],
					],
					'Binary to JSON - Keep as Base64': [
						[
							{
								json: {
									data: 'ewoJImlkIjogMSwKCSJ0aXRsZSI6ICJNeSBUaXRsZSIsCgkiZGVzY3JpcHRpb24iOiAiTG9yZW0gSXBzdW0gLi4uIgp9',
								},
							},
						],
					],
					'JSON to Binary': [
						[
							{
								json: {},
								binary: {
									data: {
										data: 'eyJpZCI6MSwidGl0bGUiOiJNeSBUaXRsZSIsImRlc2NyaXB0aW9uIjoiTG9yZW0gSXBzdW0gLi4uIn0=',
										mimeType: 'application/json',
										fileType: 'json',
										fileSize: '59 B',
										fileExtension: 'json',
									},
								},
							},
						],
					],
					'JSON to Binary - No Convert All Data': [
						[
							{
								json: {
									id: 1,
									description: 'Lorem Ipsum ...',
								},
								binary: {
									data: {
										data: 'Ik15IFRpdGxlIg==',
										mimeType: 'application/json',
										fileType: 'json',
										fileSize: '10 B',
										fileName: 'example.json',
										fileExtension: 'json',
									},
								},
							},
						],
					],
				},
			},
		},
	];

	for (const testData of tests) {
		testHarness.setupTest(testData);
	}
});
