import { testWorkflows, getWorkflowFilenames } from '../../../../../test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

describe('Hubspot v2 -> Test Workflow', () => testWorkflows(workflows));
