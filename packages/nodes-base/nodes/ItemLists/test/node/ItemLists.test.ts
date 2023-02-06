import { testWorkflows } from '../../../../test/nodes/Helpers';

const workflows = [
	'nodes/ItemLists/test/node/workflow.limit.json',
	'nodes/ItemLists/test/node/workflow.aggregateItems.json',
	'nodes/ItemLists/test/node/workflow.removeDuplicates.json',
];

describe('Test ItemLists Node', () => testWorkflows(workflows));
