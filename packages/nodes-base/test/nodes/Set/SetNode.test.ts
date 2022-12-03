import {
	INode,
	IConnections,
	createDeferredPromise,
	IRun,
	Workflow,
	ILogger,
	LoggerProxy,
} from 'n8n-workflow';
import { WorkflowExecute } from '../../../../core/dist';
import * as Helpers from '../Helpers';
import { Start } from '../../../nodes/Start/Start.node';
import { Set } from '../../../nodes/Set/Set.node';
import { executeWorkflow } from '../ExecuteWorkflow';

describe('ExecuteNode', () => {
	describe('run', () => {
		const tests: Array<{
			description: string;
			input: {
				workflowData: {
					nodes: INode[];
					connections: IConnections;
				};
			};
			output: {
				nodeExecutionOrder: string[];
				nodeData: {
					[key: string]: any[][];
				};
			};
		}> = [
			{
				description: 'should run basic two node workflow',
				input: {
					// Leave the workflowData in regular JSON to be able to easily
					// copy it from/in the UI
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
				description: 'should run basic two node workflow',
				input: {
					// Leave the workflowData in regular JSON to be able to easily
					// copy it from/in the UI
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
												value: 1,
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
								},
							],
						],
					},
				},
			},
		];
		const codexBase: string = 'n8n-nodes-base.';
		const fakeLogger = {
			log: () => {},
			debug: () => {},
			verbose: () => {},
			info: () => {},
			warn: () => {},
			error: () => {},
		} as ILogger;

		Helpers.NodeTypes().addNode(codexBase + 'start', new Start());
		Helpers.NodeTypes().addNode(codexBase + 'set', new Set());
		const nodeTypes = Helpers.NodeTypes();
		LoggerProxy.init(fakeLogger);

		for (const testData of tests) {
			test(testData.description, async () => {
				const { executionData, result, nodeExecutionOrder } = await executeWorkflow(
					testData,
					nodeTypes,
				);
				console.log(Helpers.extractOutputData(testData, result));
				console.log('ExecutionData', executionData, 'Result', result);
				expect(result.finished).toEqual(true);
				expect(result.data.executionData!.contextData).toEqual({});
				expect(result.data.executionData!.nodeExecutionStack).toEqual([]);
			});
		}
	});
});
