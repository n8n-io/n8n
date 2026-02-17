import { Workflow } from '../src/workflow';
import { WorkflowExpression } from '../src/workflow-expression';

describe('WorkflowExpression', () => {
	describe('constructor', () => {
		it('should create instance with workflow timezone', () => {
			const workflow = new Workflow({
				id: 'test',
				nodes: [],
				connections: {},
				active: false,
				nodeTypes: {} as any,
				settings: { timezone: 'America/New_York' },
			});

			const workflowExpression = new WorkflowExpression(workflow);

			expect(workflowExpression).toBeInstanceOf(WorkflowExpression);
		});
	});
});
