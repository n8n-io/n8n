import type { INodeType } from 'n8n-workflow';

import type { WorkflowTestData } from '../../../../test/nodes/types';

import * as Helpers from '../../../../test/nodes/Helpers';
import { executeWorkflow } from '../../../../test/nodes/ExecuteWorkflow';

import { ManualTrigger } from '../../../ManualTrigger/ManualTrigger.node';
import { Code } from '../../../Code/Code.node';
import { ItemLists } from '../../ItemLists.node';

describe('Execute ItemLists Node', () => {
	const tests: WorkflowTestData[] = [
		{
			description: 'should execute ItemLists limit operation',
			input: {
				workflowData: Helpers.readJsonFileSync('nodes/ItemLists/test/node/workflow.limit.json'),
			},
			output: {
				nodeData: {
					'Item Lists limit first': [
						[
							{
								entry: 1,
							},
						],
					],
					'Item Lists limit last': [
						[
							{
								entry: 5,
							},
						],
					],
				},
			},
		},
		{
			description: 'should execute ItemLists aggregateItems operation',
			input: {
				workflowData: Helpers.readJsonFileSync(
					'nodes/ItemLists/test/node/workflow.aggregateItems.json',
				),
			},
			output: {
				nodeData: {
					'fields aggregate and rename': [
						[
							{
								data: [1, 2, 3, 4, 5],
							},
						],
					],
					'aggregate all fields into list': [
						[
							{
								data: [
									{
										id: 1,
										char: 'a',
									},
									{
										id: 2,
										char: 'b',
									},
									{
										id: 3,
										char: 'c',
									},
									{
										id: 4,
										char: 'd',
									},
									{
										id: 5,
										char: 'e',
									},
								],
							},
						],
					],
					'aggregate selected fields into list': [
						[
							{
								data: [
									{
										id: 1,
									},
									{
										id: 2,
									},
									{
										id: 3,
									},
									{
										id: 4,
									},
									{
										id: 5,
									},
								],
							},
						],
					],
					'aggregate all fields except selected into list': [
						[
							{
								output: [
									{
										id: 1,
									},
									{
										id: 2,
									},
									{
										id: 3,
									},
									{
										id: 4,
									},
									{
										id: 5,
									},
								],
							},
						],
					],
				},
			},
		},
		{
			description: 'should execute ItemLists removeDuplicates operation',
			input: {
				workflowData: Helpers.readJsonFileSync(
					'nodes/ItemLists/test/node/workflow.removeDuplicates.json',
				),
			},
			output: {
				nodeData: {
					'Item Lists remove duplicates': [
						[
							{
								entry: 1,
								data: 'a',
								char: 'a',
							},
							{
								entry: 1,
								data: 'b',
								char: 'a',
							},
							{
								entry: 4,
								data: 'd',
								char: 'a',
							},
							{
								entry: 5,
								data: 'e',
								char: 'a',
							},
						],
					],
					'Item Lists remove duplicates exclude': [
						[
							{
								entry: 1,
								data: 'a',
								char: 'a',
							},
							{
								entry: 4,
								data: 'd',
								char: 'a',
							},
							{
								entry: 5,
								data: 'e',
								char: 'a',
							},
						],
					],
					'Item Lists remove duplicates selected': [
						[
							{
								char: 'a',
							},
						],
					],
				},
			},
		},
	];

	const nodes: INodeType[] = [new ManualTrigger(), new Code(), new ItemLists()];
	const nodeTypes = Helpers.setup(nodes);

	const equalityTest = async (testData: WorkflowTestData) => {
		// execute workflow
		const { result } = await executeWorkflow(testData, nodeTypes);

		// check if result node data matches expected test data
		const resultNodeData = Helpers.getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) =>
			expect(resultData).toEqual(testData.output.nodeData[nodeName]),
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => equalityTest(testData));
	}
});
