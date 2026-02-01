import { NodeTestHarness } from '@nodes-testing/node-test-harness';

describe('Test Read PDF Node', () => {
	new NodeTestHarness().setupTests({ assertBinaryData: true });
});
