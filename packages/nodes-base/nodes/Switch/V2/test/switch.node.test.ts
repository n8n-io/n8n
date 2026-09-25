import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { matchesRegex } from '../SwitchV2.node';

describe('Execute Switch Node', () => {
	new NodeTestHarness().setupTests();

	it('matches slash-delimited regex rules', () => {
		expect(matchesRegex('alpha-123', '/^alpha-\\d+$/')).toBe(true);
		expect(matchesRegex('beta', '/^alpha-\\d+$/')).toBe(false);
	});
});
