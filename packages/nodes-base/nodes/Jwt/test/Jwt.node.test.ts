import { testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

const credentials = {
	jwtAuth: {
		keyType: 'passphrase',
		secret: 'baz',
		algorithm: 'HS256',
	},
};

const workflows = getWorkflowFilenames(__dirname);

describe('Test Jwt Node', () => testWorkflows(workflows, credentials));
