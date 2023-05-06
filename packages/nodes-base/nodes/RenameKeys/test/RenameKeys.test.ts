import { testWorkflows, getWorkflowFilenames } from '../../../test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

describe('Test Rename Keys Node', () => testWorkflows(workflows));
