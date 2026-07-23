import type { WorkflowSettings } from '../src/interfaces';
import {
	channelsToPolicy,
	policyToChannels,
	shouldRedactConsoleOutput,
} from '../src/redaction-channels';

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

	describe('shouldRedactConsoleOutput', () => {
		it.each([
			[{ version: 2, production: true, manual: false }, 'manual', false],
			[{ version: 2, production: true, manual: false }, 'trigger', true],
			[{ version: 2, production: true, manual: true }, 'manual', true],
			[{ version: 2, production: true, manual: true }, 'webhook', true],
			[{ version: 2, production: false, manual: false }, 'manual', false],
			[{ version: 2, production: false, manual: false }, 'trigger', false],
			[{ version: 2, production: false, manual: true }, 'manual', true],
			[{ version: 2, production: false, manual: true }, 'trigger', true],
		] as const)('V2 snapshot %j in mode %s → %s', (redaction, mode, expected) => {
			expect(shouldRedactConsoleOutput(redaction, undefined, mode)).toBe(expected);
		});

		it.each([
			['all', 'manual', true],
			['all', 'trigger', true],
			['non-manual', 'manual', false],
			['non-manual', 'webhook', true],
			['manual-only', 'manual', true],
			['manual-only', 'trigger', false],
			['none', 'manual', false],
			['none', 'trigger', false],
		] as const)('V1 snapshot policy %s in mode %s → %s', (policy, mode, expected) => {
			expect(shouldRedactConsoleOutput({ version: 1, policy }, undefined, mode)).toBe(expected);
		});

		it('falls back to the workflow setting when the snapshot is absent', () => {
			expect(shouldRedactConsoleOutput(undefined, { redactionPolicy: 'all' }, 'trigger')).toBe(
				true,
			);
			expect(shouldRedactConsoleOutput(undefined, { redactionPolicy: 'all' }, 'manual')).toBe(true);
			expect(
				shouldRedactConsoleOutput(undefined, { redactionPolicy: 'non-manual' }, 'manual'),
			).toBe(false);
			expect(shouldRedactConsoleOutput(undefined, {}, 'manual')).toBe(false);
			expect(shouldRedactConsoleOutput(undefined, undefined, 'trigger')).toBe(false);
		});
	});
});
