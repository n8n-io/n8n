import { NodeTestHarness } from '@nodes-testing/node-test-harness';

const credentials = {
	jwtAuth: {
		keyType: 'passphrase',
		secret: 'baz',
		algorithm: 'HS256',
	},
};

describe('Test Jwt Node', () => {
	new NodeTestHarness().setupTests({ credentials });
});
