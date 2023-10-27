import { testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

describe.only('Test IF v2 Node', () => testWorkflows(workflows));
