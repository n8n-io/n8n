import { INodeType } from 'n8n-workflow';
import * as Helpers from '../Helpers';
import { WorkflowTestData } from '../types';
import { readFileSync } from 'fs';

import { ManualTrigger } from '../../../nodes/ManualTrigger/ManualTrigger.node';
import { Set } from '../../../nodes/Set/Set.node';
import { If } from '../../../nodes/If/If.node';
import { NoOp } from '../../../nodes/NoOp/NoOp.node';
import { Code } from '../../../nodes/Code/Code.node';

import { executeWorkflow } from '../ExecuteWorkflow';

describe('Execute If Node', () => {
	const tests: Array<WorkflowTestData> = [
		{
			description: 'should execute IF node true/false boolean',
			input: {
				workflowData: JSON.parse(readFileSync('test/nodes/If/workflow.json', 'utf-8')),
			},
			output: {
				nodeData: {
					'On True': [
						[
							{
								value: true,
							},
						],
					],
					'On False': [
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

	const nodes: INodeType[] = [new ManualTrigger(), new Code(), new Set(), new If(), new NoOp()];
	const nodeTypes = Helpers.setup(nodes);

	for (const testData of tests) {
		test(testData.description, async () => {
			// execute workflow
			const { executionData, result, nodeExecutionOrder } = await executeWorkflow(
				testData,
				nodeTypes,
			);
			// check if output node data is as expected
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
				expect(resultData).toEqual(testData.output.nodeData[nodeName]);
			}

			expect(result.finished).toEqual(true);
		});
	}
});
