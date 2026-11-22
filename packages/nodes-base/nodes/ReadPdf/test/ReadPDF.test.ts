import { NodeTestHarness } from '@nodes-testing/node-test-harness';

jest.setTimeout(20_000);

describe('Test Read PDF Node', () => {
	new NodeTestHarness().setupTests({ assertBinaryData: true });
});
