import { testWorkflows, getWorkflowFilenames } from '../../../test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

describe('Test ReadBinaryFile Node', () => testWorkflows(workflows));
