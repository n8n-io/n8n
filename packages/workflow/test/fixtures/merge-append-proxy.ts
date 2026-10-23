import * as Helpers from '../helpers';
import {
	NodeConnectionTypes,
	type IExecuteData,
	type INodeExecutionData,
	type ISourceData,
	type ITaskData,
} from '../../src/interfaces';
import { createRunExecutionData } from '../../src/run-execution-data-factory';
import { Workflow } from '../../src/workflow';
import { WorkflowDataProxy } from '../../src/workflow-data-proxy';

const task = (source: ISourceData[], items: INodeExecutionData[]): ITaskData => ({
	startTime: 0,
	executionTime: 0,
	executionIndex: 0,
	source,
	data: { main: [items] },
});

/**
 * Start fans out to Left and Right. Merge appends both inputs, so its first item
 * pairs only to Left and its second item pairs only to Right. End reads both.
 */
export const createMergeAppendProxy = (itemIndex: number) => {
	const names = ['Start', 'Left', 'Right', 'Merge', 'End'];
	const workflow = new Workflow({
		id: '1',
		name: 'merge append',
		nodes: names.map((name, i) => ({
			id: `uuid-${i}`,
			name,
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [i * 100, 0],
			parameters: {},
		})),
		connections: {
			Start: {
				main: [
					[
						{ node: 'Left', type: NodeConnectionTypes.Main, index: 0 },
						{ node: 'Right', type: NodeConnectionTypes.Main, index: 0 },
					],
				],
			},
			Left: { main: [[{ node: 'Merge', type: NodeConnectionTypes.Main, index: 0 }]] },
			Right: { main: [[{ node: 'Merge', type: NodeConnectionTypes.Main, index: 1 }]] },
			Merge: { main: [[{ node: 'End', type: NodeConnectionTypes.Main, index: 0 }]] },
		},
		active: false,
		nodeTypes: Helpers.NodeTypes(),
	});

	const endInput: INodeExecutionData[] = [
		{ json: { value: 'left' }, pairedItem: { item: 0 } },
		{ json: { value: 'right' }, pairedItem: { item: 1 } },
	];

	const runExecutionData = createRunExecutionData({
		resultData: {
			runData: {
				// A trigger has no source.
				Start: [task([], [{ json: {}, pairedItem: { item: 0 } }])],
				Left: [
					task([{ previousNode: 'Start' }], [{ json: { value: 'left' }, pairedItem: { item: 0 } }]),
				],
				Right: [
					task(
						[{ previousNode: 'Start' }],
						[{ json: { value: 'right' }, pairedItem: { item: 0 } }],
					),
				],
				Merge: [
					task(
						[{ previousNode: 'Left' }, { previousNode: 'Right' }],
						[
							{ json: { value: 'left' }, pairedItem: { item: 0, input: 0 } },
							{ json: { value: 'right' }, pairedItem: { item: 0, input: 1 } },
						],
					),
				],
			},
		},
	});

	const executeData: IExecuteData = {
		data: { main: [endInput] },
		node: workflow.getNode('End')!,
		source: { main: [{ previousNode: 'Merge' }] },
	};

	const proxy = new WorkflowDataProxy(
		workflow,
		runExecutionData,
		0,
		itemIndex,
		'End',
		endInput,
		{},
		'manual',
		{},
		executeData,
	).getDataProxy();

	return { workflow, runExecutionData, executeData, endInput, proxy };
};
