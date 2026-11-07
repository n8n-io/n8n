import flatted from 'flatted';
import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

const TRIGGER_NAME = 'Manual Trigger';
const INSERT_NAME = 'Insert row';
const GET_NAME = 'Get rows';

const JOINED = '2026-10-27T10:00:00.000Z';

/** A table reference as the node stores it: by id, so the spec can create the table first. */
const tableById = (dataTableId: string) => ({ __rl: true, mode: 'id', value: dataTableId });

/** Manual Trigger -> Data Table (insert one row) -> Data Table (get every row). */
const dataTableWorkflow = (dataTableId: string): Partial<IWorkflowBase> => ({
	name: `Data Table node ${nanoid(8)}`,
	nodes: [
		{
			id: '1',
			name: TRIGGER_NAME,
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: '2',
			name: INSERT_NAME,
			type: 'n8n-nodes-base.dataTable',
			typeVersion: 1.1,
			position: [300, 0],
			parameters: {
				resource: 'row',
				operation: 'insert',
				dataTableId: tableById(dataTableId),
				columns: {
					mappingMode: 'defineBelow',
					value: { name: 'Ada', age: 36, joined: JOINED },
					schema: [],
				},
			},
		},
		{
			id: '3',
			name: GET_NAME,
			type: 'n8n-nodes-base.dataTable',
			typeVersion: 1.1,
			position: [600, 0],
			parameters: {
				resource: 'row',
				operation: 'get',
				dataTableId: tableById(dataTableId),
				returnAll: true,
			},
		},
	],
	connections: {
		[TRIGGER_NAME]: { main: [[{ node: INSERT_NAME, type: 'main', index: 0 }]] },
		[INSERT_NAME]: { main: [[{ node: GET_NAME, type: 'main', index: 0 }]] },
	},
	active: false,
});

/**
 * The Data Table node reaches its tables through helpers the host wires in.
 * On engine v2 the data plane has no control plane database, so the helpers
 * go over the control plane API instead. The same spec covers both engines:
 * on a stack without engine v2 the node uses the in-process service.
 */
test.describe(
	'Data Table node',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('inserts and reads rows of a table in the workflow project @engine:v2', async ({
			api,
		}) => {
			const project = await api.projects.getMyPersonalProject();
			const table = await api.dataTables.create(project.id, {
				name: `people-${nanoid(8)}`,
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'joined', type: 'date' },
				],
			});
			const { workflowId } = await api.workflows.createWorkflowFromDefinition(
				dataTableWorkflow(table.id),
			);

			const { executionId } = await api.workflows.runManually(workflowId, TRIGGER_NAME);
			const execution = await api.workflows.waitForExecutionById(executionId);

			expect(execution.status).toBe('success');

			// The get node read the row the insert node wrote, with the system
			// columns the service adds. The node emits every date as an ISO string.
			const { resultData } = flatted.parse(execution.data);
			const rows = resultData.runData[GET_NAME][0].data.main[0];
			expect(rows).toHaveLength(1);
			expect(rows[0].json).toMatchObject({ name: 'Ada', age: 36, joined: JOINED });
			expect(rows[0].json.id).toEqual(expect.any(Number));
			expect(rows[0].json.createdAt).toEqual(expect.any(String));

			// And the row is in the table for everyone else.
			const stored = await api.dataTables.getRows(project.id, table.id);
			expect(stored.count).toBe(1);
			expect(stored.data[0]).toMatchObject({ name: 'Ada', age: 36 });
		});

		test('reports a table the project does not have with the node message @engine:v2', async ({
			api,
		}) => {
			const { workflowId } = await api.workflows.createWorkflowFromDefinition(
				dataTableWorkflow('nosuchtable'),
			);

			const { executionId } = await api.workflows.runManually(workflowId, TRIGGER_NAME);
			const execution = await api.workflows.waitForExecutionById(executionId);

			expect(execution.status).toBe('error');

			// The same text on both engines: the control plane hands the data plane
			// the node error the in-process proxy throws.
			const { resultData } = flatted.parse(execution.data);
			const messages: string[] = [
				resultData.error?.message,
				...Object.values<Array<{ error?: { message?: string } }>>(resultData.runData ?? {})
					.flat()
					.map((run) => run.error?.message),
			].filter((message): message is string => typeof message === 'string');
			expect(messages.join('\n')).toContain(
				"Data table with ID 'nosuchtable' could not be found in this project",
			);
		});
	},
);
