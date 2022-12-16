import {
	createDeferredPromise,
	IRun,
	Workflow,
	ILogger,
	LoggerProxy,
} from 'n8n-workflow';
import { WorkflowExecute } from '../../../../core/dist';
import * as Helpers from '../Helpers';
import { WorkflowTestData } from '../types';
import { readFileSync } from 'fs';

import { ManualTrigger } from '../../../nodes/ManualTrigger/ManualTrigger.node';
import { Set } from '../../../nodes/Set/Set.node';
import { If } from '../../../nodes/If/If.node';
import { NoOp } from '../../../nodes/NoOp/NoOp.node';
import { Code } from '../../../nodes/Code/Code.node';


describe('Node', () => {
	describe('If', () => {
		const tests: Array<WorkflowTestData> = [
			{
				description: 'IF node true/false boolean',
				input: {
					workflowData: JSON.parse(readFileSync('test/nodes/If/workflow.json', 'utf-8')),
				},
				output: {
					nodeData: {
						"On True": [
							[
								{
									value: true,
								},
							],
						],
						"On False": [
							[
								{
									value: false,
								},
							],
						],
					},
				},
			},
		];

		const fakeLogger = {
			log: () => { },
			debug: () => { },
			verbose: () => { },
			info: () => { },
			warn: () => { },
			error: () => { },
		} as ILogger;

		const executionMode = 'manual';
		Helpers.NodeTypes().addNode('n8n-nodes-base.manualTrigger', new ManualTrigger());
		Helpers.NodeTypes().addNode('n8n-nodes-base.code', new Code());
		Helpers.NodeTypes().addNode('n8n-nodes-base.set', new Set());
		Helpers.NodeTypes().addNode('n8n-nodes-base.if', new If());
		Helpers.NodeTypes().addNode('n8n-nodes-base.noOp', new NoOp());

		const nodeTypes = Helpers.NodeTypes();
		LoggerProxy.init(fakeLogger);

		for (const testData of tests) {
			test(testData.description, async () => {
				const workflowInstance = new Workflow({
					id: 'test',
					nodes: testData.input.workflowData.nodes,
					connections: testData.input.workflowData.connections,
					active: false,
					nodeTypes,
				});

				const waitPromise = await createDeferredPromise<IRun>();
				const nodeExecutionOrder: string[] = [];
				const additionalData = Helpers.WorkflowExecuteAdditionalData(
					waitPromise,
					nodeExecutionOrder,
				);

				const workflowExecute = new WorkflowExecute(additionalData, executionMode);

				const executionData = await workflowExecute.run(workflowInstance);
				const result = await waitPromise.promise();

				// Check if the data from WorkflowExecute is identical to data received
				// by the webhooks
				// Check if the output data of the nodes is correct
				for (const nodeName of Object.keys(testData.output.nodeData)) {
					if (result.data.resultData.runData[nodeName] === undefined) {
						throw new Error(`Data for node "${nodeName}" is missing!`);
					}

					const resultData = result.data.resultData.runData[nodeName].map((nodeData) => {
						if (nodeData.data === undefined) {
							return null;
						}
						return nodeData.data.main[0]!.map((entry) => entry.json);
					});
					// expect(resultData).toEqual(testData.output.nodeData[nodeName]);
					expect(resultData).toEqual(testData.output.nodeData[nodeName]);
				}

				// Check if other data has correct value
				expect(result.finished).toEqual(true);
			});
		}
	});
});
