import { testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';
const workflows = getWorkflowFilenames(__dirname);

describe('Test Jwt Node', () => testWorkflows(workflows));
