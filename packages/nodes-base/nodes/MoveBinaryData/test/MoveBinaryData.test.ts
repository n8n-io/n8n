/* eslint-disable @typescript-eslint/no-loop-func */
import * as Helpers from '../../../test/nodes/Helpers';
import type { WorkflowTestData } from '../../../test/nodes/types';
import { executeWorkflow } from '../../../test/nodes/ExecuteWorkflow';
import path from 'path';

describe('Test Move Binary Data Node', () => {
	beforeEach(async () => {
		await Helpers.initBinaryDataManager();
	});

	const workflow = Helpers.readJsonFileSync(
		'nodes/MoveBinaryData/test/MoveBinaryData.workflow.json',
	);
	const node = workflow.nodes.find((n: any) => n.name === 'Read Binary File');
	node.parameters.filePath = path.join(__dirname, 'data', 'sample.json');

	const tests: WorkflowTestData[] = [
		{
			description: 'nodes/MoveBinaryData/test/MoveBinaryData.workflow.json',
			input: {
				workflowData: workflow,
			},
			output: {
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
									},
								},
							},
						],
					],
				},
			},
		},
	];

	const nodeTypes = Helpers.setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => {
			const { result } = await executeWorkflow(testData, nodeTypes);

			const resultNodeData = Helpers.getResultNodeData(result, testData);
			resultNodeData.forEach(({ nodeName, resultData }) =>
				expect(resultData).toEqual(testData.output.nodeData[nodeName]),
			);

			expect(result.finished).toEqual(true);
		});
	}
});
