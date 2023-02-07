import { INodeType } from 'n8n-workflow';
import * as Helpers from '../Helpers';
import { Start } from '../../../nodes/Start/Start.node';
import { Set } from '../../../nodes/Set/Set.node';
import { executeWorkflow } from '../ExecuteWorkflow';
import { WorkflowTestData } from '../types';

describe('Execute Set Node', () => {
	const tests: Array<WorkflowTestData> = [
		{
			description: 'should set value',
			input: {
				workflowData: {
					nodes: [
						{
							id: 'uuid-1',
							parameters: {},
							name: 'Start',
							type: 'n8n-nodes-base.start',
							typeVersion: 1,
							position: [100, 300],
						},
						{
							id: 'uuid-2',
							parameters: {
								values: {
									number: [
										{
											name: 'value1',
											value: 1,
										},
									],
								},
							},
							name: 'Set',
							type: 'n8n-nodes-base.set',
							typeVersion: 1,
							position: [280, 300],
						},
					],
					connections: {
						Start: {
							main: [
								[
									{
										node: 'Set',
										type: 'main',
										index: 0,
									},
								],
							],
						},
					},
				},
			},
			output: {
				nodeExecutionOrder: ['Start', 'Set'],
				nodeData: {
					Set: [
						[
							{
								value1: 1,
							},
						],
					],
				},
			},
		},

		{
			description: 'should set multiple values',
			input: {
				workflowData: {
					nodes: [
						{
							id: 'uuid-1',
							parameters: {},
							name: 'Start',
							type: 'n8n-nodes-base.start',
							typeVersion: 1,
							position: [100, 300],
						},
						{
							id: 'uuid-2',
							parameters: {
								values: {
									number: [
										{
											name: 'value1',
											value: 1,
										},
									],
									boolean: [
										{
											name: 'value2',
											value: true,
										},
									],
								},
							},
							name: 'Set',
							type: 'n8n-nodes-base.set',
							typeVersion: 1,
							position: [280, 300],
						},
						{
							id: 'uuid-3',
							parameters: {
								values: {
									number: [
										{
											name: 'value1',
											value: 2,
										},
									],
									boolean: [
										{
											name: 'value2',
											value: false,
										},
									],
								},
							},
							name: 'Set1',
							type: 'n8n-nodes-base.set',
							typeVersion: 1,
							position: [280, 300],
						},
					],
					connections: {
						Start: {
							main: [
								[
									{
										node: 'Set',
										type: 'main',
										index: 0,
									},
								],
							],
						},
						Set: {
							main: [
								[
									{
										node: 'Set1',
										type: 'main',
										index: 0,
									},
								],
							],
						},
					},
				},
			},
			output: {
				nodeExecutionOrder: ['Start', 'Set'],
				nodeData: {
					Set: [
						[
							{
								value1: 1,
								value2: true,
							},
						],
					],
					Set1: [
						[
							{
								value1: 2,
								value2: false,
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
			// execute workflow
			const { result } = await executeWorkflow(testData, nodeTypes);

			// check if result node data matches expected test data
			const resultNodeData = Helpers.getResultNodeData(result, testData);
			resultNodeData.forEach(({ nodeName, resultData }) =>
				expect(resultData).toEqual(testData.output.nodeData[nodeName]),
			);

			// Check if other data has correct value
			expect(result.finished).toEqual(true);
			expect(result.data.executionData!.contextData).toEqual({});
			expect(result.data.executionData!.nodeExecutionStack).toEqual([]);
		});
	}
});
