import type {
	INode,
	INodeExecutionData,
	IRun,
	ITaskData,
	IWorkflowBase,
} from '../../src/interfaces';
import { createRunExecutionData } from '../../src/run-execution-data-factory';

/** Each page can combine several rows before the next run. */
export const createPairedItemPagination = (pages = 5000, itemsPerPage = 1) => {
	const node = (name: string): INode => ({
		id: name,
		name,
		type: 'test.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	});
	const task = (source: { main: ITaskData['source'] }, main: INodeExecutionData[][]) => ({
		startTime: 0,
		executionTime: 0,
		executionIndex: 0,
		source: source.main,
		data: { main },
	});
	const page: INodeExecutionData = { json: {}, pairedItem: { item: 0 } };
	const rows = Array.from({ length: itemsPerPage }, () => ({ ...page }));
	const aggregate: INodeExecutionData = {
		json: {},
		pairedItem: Array.from({ length: itemsPerPage }, (_, item) => ({ item })),
	};

	const workflow: IWorkflowBase = {
		id: '1',
		name: 'pagination loop',
		active: false,
		activeVersionId: null,
		isArchived: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		nodes: ['Trigger', 'Fetch', 'Has More', 'Process'].map(node),
		connections: {
			Trigger: { main: [[{ node: 'Fetch', type: 'main', index: 0 }]] },
			Fetch: { main: [[{ node: 'Has More', type: 'main', index: 0 }]] },
			'Has More': {
				main: [
					[{ node: 'Fetch', type: 'main', index: 0 }],
					[{ node: 'Process', type: 'main', index: 0 }],
				],
			},
		},
	};
	const run: IRun = {
		mode: 'manual',
		startedAt: new Date(),
		status: 'success',
		storedAt: 'db',
		data: createRunExecutionData({
			resultData: {
				runData: {
					Trigger: [task({ main: [] }, [[{ json: { timestamp: '2024-01-01T08:00:00.000Z' } }]])],
					Fetch: Array.from({ length: pages }, (_, i) =>
						task(
							{
								main: [
									i === 0
										? { previousNode: 'Trigger' }
										: { previousNode: 'Has More', previousNodeRun: i - 1 },
								],
							},
							[rows],
						),
					),
					'Has More': Array.from({ length: pages }, (_, i) =>
						task({ main: [{ previousNode: 'Fetch', previousNodeRun: i }] }, [
							i === pages - 1 ? [] : [aggregate],
							i === pages - 1 ? [aggregate] : [],
						]),
					),
					Process: [
						task(
							{
								main: [
									{ previousNode: 'Has More', previousNodeOutput: 1, previousNodeRun: pages - 1 },
								],
							},
							[[page]],
						),
					],
				},
			},
		}),
	};
	return { workflow, run };
};
