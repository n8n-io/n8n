import { testWorkflows, getWorkflowFilenames } from '../../../../test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

describe('Test Stop and Error Node', () => testWorkflows(workflows));
