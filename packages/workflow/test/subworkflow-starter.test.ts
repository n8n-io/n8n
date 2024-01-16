import { Workflow } from '@/Workflow';
import { SUBWORKFLOW_STARTER_NODES, type INode, NODE_TYPES } from '@/index';

const startNode: INode = {
	name: 'Start',
	type: 'n8n-nodes-base.start',
	id: '111f1db0-e7be-44c5-9ce9-3e35362490f0',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};

const executeWorkflowTriggerNode: INode = {
	name: 'Execute Workflow Trigger',
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	id: '22263bca-bb6c-4568-948f-8ed9aacb1fe9',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};

const manualTriggerNode: INode = {
	name: 'Manual Trigger',
	type: 'n8n-nodes-base.manualTrigger',
	id: '33363bca-bb6c-4568-948f-8ed9aacb1fe9',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};

const manualChatTrigger: INode = {
	name: 'Manual Chat Trigger',
	id: '0d108483-75bd-42b2-b304-b5fb930ca429',
	type: '@n8n/n8n-nodes-langchain.manualChatTrigger',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};

const starters = {
	[NODE_TYPES.EXECUTE_WORKFLOW_TRIGGER]: executeWorkflowTriggerNode,
	[NODE_TYPES.START]: startNode,
	[NODE_TYPES.MANUAL_TRIGGER]: manualTriggerNode,
	[NODE_TYPES.MANUAL_CHAT_TRIGGER]: manualChatTrigger,
};

const hackerNewsNode: INode = {
	id: '4441b560-bd75-4113-be08-a41d6bd68c32',
	name: 'Hacker News',
	type: 'n8n-nodes-base.hackerNews',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};

describe('Workflow.selectSubworkflowStarter()', () => {
	it('should prioritize Execute Workflow Trigger over other starters', () => {
		const found = Workflow.selectSubworkflowStarter([
			starters[NODE_TYPES.MANUAL_TRIGGER],
			starters[NODE_TYPES.EXECUTE_WORKFLOW_TRIGGER],
		]);

		expect(found).toEqual(starters[NODE_TYPES.EXECUTE_WORKFLOW_TRIGGER]);
	});

	it('should throw if no starter', () => {
		expect(() => Workflow.selectSubworkflowStarter([hackerNewsNode])).toThrow();
	});

	for (const starter of SUBWORKFLOW_STARTER_NODES) {
		it(`should select ${starter} node if only choice`, () => {
			const found = Workflow.selectSubworkflowStarter([starters[starter]]);

			expect(found.type).toEqual(starter);
		});
	}

	for (const starter of SUBWORKFLOW_STARTER_NODES) {
		it(`should favor ${starter} over non-starter`, () => {
			const found = Workflow.selectSubworkflowStarter([starters[starter], hackerNewsNode]);

			expect(found.type).toEqual(starter);
		});
	}
});
