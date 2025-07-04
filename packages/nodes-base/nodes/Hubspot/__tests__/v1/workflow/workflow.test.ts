import { testWorkflows, getWorkflowFilenames } from '../../../../../test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

describe('Hubspot v1 -> Test Workflow', () => testWorkflows(workflows));
