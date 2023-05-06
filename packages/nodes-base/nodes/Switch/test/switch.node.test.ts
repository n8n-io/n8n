import { testWorkflows, getWorkflowFilenames } from '../../../test/nodes/Helpers';
const workflows = getWorkflowFilenames(__dirname);

describe('Execute Switch Node', () => testWorkflows(workflows));
