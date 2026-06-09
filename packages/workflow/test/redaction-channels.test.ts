import type { WorkflowSettings } from '../src/interfaces';
import { channelsToPolicy, policyToChannels } from '../src/redaction-channels';

describe('redaction-channels', () => {
	describe('policyToChannels', () => {
		it.each([
			['none', { production: false, manual: false }],
			['non-manual', { production: true, manual: false }],
			['manual-only', { production: false, manual: true }],
			['all', { production: true, manual: true }],
		] as Array<[WorkflowSettings.RedactionPolicy, { production: boolean; manual: boolean }]>)(
			'maps %s → %o',
			(policy, channels) => {
				expect(policyToChannels(policy)).toEqual(channels);
			},
		);
	});

	describe('channelsToPolicy', () => {
		it('maps both channels on → all', () => {
			expect(channelsToPolicy({ production: true, manual: true })).toBe('all');
		});

		it('maps production only → non-manual', () => {
			expect(channelsToPolicy({ production: true, manual: false })).toBe('non-manual');
		});

		it('maps neither channel → none', () => {
			expect(channelsToPolicy({ production: false, manual: false })).toBe('none');
		});

		it('maps the unreachable manual-without-production up to all (fail strict)', () => {
			expect(channelsToPolicy({ production: false, manual: true })).toBe('all');
		});
	});

	describe('round-trip for invariant-respecting policies', () => {
		it.each(['none', 'non-manual', 'all'] as const)('policy %s survives a round-trip', (policy) => {
			expect(channelsToPolicy(policyToChannels(policy))).toBe(policy);
		});
	});
});
