import { NodeTestHarness } from '@n8n/node-test-harness';

describe('Test Read PDF Node', () => {
	new NodeTestHarness().setupTests({ assertBinaryData: true });
});
