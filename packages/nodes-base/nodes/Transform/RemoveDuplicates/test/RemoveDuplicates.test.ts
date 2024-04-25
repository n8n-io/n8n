import { testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

describe('Test Remove Duplicates Node', () => testWorkflows(workflows));
