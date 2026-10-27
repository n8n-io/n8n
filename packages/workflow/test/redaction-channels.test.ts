import type { IExecutionContext } from '../src/execution-context';
import type { WorkflowSettings } from '../src/interfaces';
import {
	attachSubWorkflowRedaction,
	channelsToPolicy,
	effectiveRedactionChannels,
	escalateSubWorkflowRedaction,
	mergeRedactionChannels,
	policyToChannels,
	redactionSettingToChannels,
	shouldRedactConsoleOutput,
	summarizeSubWorkflowRedaction,
	takeAttachedSubWorkflowRedaction,
} from '../src/redaction-channels';
import type { IRunExecutionData } from '../src/run-execution-data/run-execution-data';

const context = (fields: Partial<IExecutionContext> = {}): IExecutionContext => ({
	version: 1,
	establishedAt: 0,
	source: 'integrated',
	...fields,
});

const runWith = (runtimeData: IExecutionContext | undefined): IRunExecutionData =>
	({ resultData: { runData: {} }, executionData: { runtimeData } }) as unknown as IRunExecutionData;

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

	describe('redactionSettingToChannels', () => {
		it('returns no redaction for an absent snapshot', () => {
			expect(redactionSettingToChannels(undefined)).toEqual({ production: false, manual: false });
		});

		it('reads V2 per-channel booleans directly', () => {
			expect(redactionSettingToChannels({ version: 2, production: true, manual: false })).toEqual({
				production: true,
				manual: false,
			});
		});

		it('projects a V1 policy enum onto channels', () => {
			expect(redactionSettingToChannels({ version: 1, policy: 'all' })).toEqual({
				production: true,
				manual: true,
			});
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

		it.each([
			[{ production: true, manual: false }, 'trigger', true],
			[{ production: true, manual: false }, 'manual', false],
			[{ production: true, manual: true }, 'manual', true],
			// Manual without production is clamped up, like a V2 snapshot.
			[{ production: false, manual: true }, 'trigger', true],
		] as const)(
			'combines the sub-workflow channels %j in mode %s → %s',
			(subWorkflowRedaction, mode, expected) => {
				expect(
					shouldRedactConsoleOutput(
						{ version: 2, production: false, manual: false },
						undefined,
						mode,
						subWorkflowRedaction,
					),
				).toBe(expected);
			},
		);

		it('combines the sub-workflow channels with the workflow-setting fallback', () => {
			expect(
				shouldRedactConsoleOutput(undefined, { redactionPolicy: 'none' }, 'trigger', {
					production: true,
					manual: false,
				}),
			).toBe(true);
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

	describe('mergeRedactionChannels', () => {
		it('combines the channels, strictest per channel', () => {
			expect(
				mergeRedactionChannels(
					{ production: true, manual: false },
					{ production: false, manual: true },
				),
			).toEqual({ production: true, manual: true });
		});

		it('returns the first set when the second is absent', () => {
			const a = { production: true, manual: false };
			expect(mergeRedactionChannels(a, undefined)).toBe(a);
		});
	});

	describe('effectiveRedactionChannels', () => {
		it('returns no redaction for an absent context', () => {
			expect(effectiveRedactionChannels(undefined)).toEqual({ production: false, manual: false });
		});

		it('combines the start snapshot with the sub-workflow channels', () => {
			expect(
				effectiveRedactionChannels({
					redaction: { version: 2, production: true, manual: false },
					subWorkflowRedaction: { production: false, manual: true },
				}),
			).toEqual({ production: true, manual: true });
		});

		it('reads a V1 snapshot', () => {
			expect(
				effectiveRedactionChannels({
					redaction: { version: 1, policy: 'non-manual' },
					subWorkflowRedaction: { production: false, manual: false },
				}),
			).toEqual({ production: true, manual: false });
		});
	});

	describe('summarizeSubWorkflowRedaction', () => {
		it('reports the own snapshot when includeOwn is true', () => {
			const run = runWith(context({ redaction: { version: 2, production: true, manual: false } }));
			expect(summarizeSubWorkflowRedaction(run, { includeOwn: true })).toEqual({
				production: true,
				manual: false,
			});
		});

		it('reports the own snapshot combined with the received channels', () => {
			const run = runWith(
				context({
					redaction: { version: 2, production: true, manual: false },
					subWorkflowRedaction: { production: true, manual: true },
				}),
			);
			expect(summarizeSubWorkflowRedaction(run, { includeOwn: true })).toEqual({
				production: true,
				manual: true,
			});
		});

		it('reports only the received channels when includeOwn is false', () => {
			const run = runWith(
				context({
					redaction: { version: 2, production: true, manual: true },
					subWorkflowRedaction: { production: true, manual: false },
				}),
			);
			expect(summarizeSubWorkflowRedaction(run, { includeOwn: false })).toEqual({
				production: true,
				manual: false,
			});
		});

		it('returns undefined when no channel is redacted', () => {
			const run = runWith(context({ redaction: { version: 2, production: false, manual: false } }));
			expect(summarizeSubWorkflowRedaction(run, { includeOwn: true })).toBeUndefined();
			expect(summarizeSubWorkflowRedaction(run, { includeOwn: false })).toBeUndefined();
		});

		it('returns undefined when the run has no context', () => {
			expect(
				summarizeSubWorkflowRedaction(runWith(undefined), { includeOwn: true }),
			).toBeUndefined();
			expect(summarizeSubWorkflowRedaction(undefined, { includeOwn: true })).toBeUndefined();
		});
	});

	describe('escalateSubWorkflowRedaction', () => {
		it('sets the channels on a context that has none', () => {
			const runtimeData = context();
			escalateSubWorkflowRedaction(runtimeData, { production: true, manual: false });
			expect(runtimeData.subWorkflowRedaction).toEqual({ production: true, manual: false });
		});

		it('never lowers a channel', () => {
			const runtimeData = context({ subWorkflowRedaction: { production: true, manual: true } });
			escalateSubWorkflowRedaction(runtimeData, { production: true, manual: false });
			expect(runtimeData.subWorkflowRedaction).toEqual({ production: true, manual: true });
		});

		it('assigns a new object and leaves the existing one unchanged', () => {
			const shared = { production: true, manual: false };
			const runtimeData = context({ subWorkflowRedaction: shared });
			escalateSubWorkflowRedaction(runtimeData, { production: false, manual: true });
			expect(runtimeData.subWorkflowRedaction).toEqual({ production: true, manual: true });
			expect(runtimeData.subWorkflowRedaction).not.toBe(shared);
			expect(shared).toEqual({ production: true, manual: false });
		});

		it('does nothing without channels, or when no channel is redacted', () => {
			const runtimeData = context();
			escalateSubWorkflowRedaction(runtimeData, undefined);
			escalateSubWorkflowRedaction(runtimeData, { production: false, manual: false });
			expect(runtimeData).not.toHaveProperty('subWorkflowRedaction');
		});

		it('does nothing without a context', () => {
			expect(() =>
				escalateSubWorkflowRedaction(undefined, { production: true, manual: true }),
			).not.toThrow();
		});
	});

	describe('attachSubWorkflowRedaction / takeAttachedSubWorkflowRedaction', () => {
		it('round-trips the channels and strips the marker', () => {
			const error = attachSubWorkflowRedaction(new Error('boom'), {
				production: true,
				manual: false,
			});
			expect(takeAttachedSubWorkflowRedaction(error)).toEqual({ production: true, manual: false });
			expect(error).not.toHaveProperty('subWorkflowRedaction');
			expect(takeAttachedSubWorkflowRedaction(error)).toBeUndefined();
		});

		it('attaches nothing when no channel is redacted', () => {
			const error = attachSubWorkflowRedaction(new Error('boom'), {
				production: false,
				manual: false,
			});
			expect(error).not.toHaveProperty('subWorkflowRedaction');
			expect(attachSubWorkflowRedaction(new Error('boom'), undefined)).not.toHaveProperty(
				'subWorkflowRedaction',
			);
		});

		it('returns the same error instance', () => {
			const error = new Error('boom');
			expect(attachSubWorkflowRedaction(error, { production: true, manual: true })).toBe(error);
		});

		it.each([null, undefined, 'error', 42])('returns undefined for a non-object %p', (error) => {
			expect(takeAttachedSubWorkflowRedaction(error)).toBeUndefined();
		});

		it('ignores and strips a malformed marker', () => {
			const error = Object.assign(new Error('boom'), { subWorkflowRedaction: 'all' });
			expect(takeAttachedSubWorkflowRedaction(error)).toBeUndefined();
			expect(error).not.toHaveProperty('subWorkflowRedaction');
		});

		it('reads only boolean true channel values', () => {
			const error = Object.assign(new Error('boom'), {
				subWorkflowRedaction: { production: 'yes', manual: true },
			});
			expect(takeAttachedSubWorkflowRedaction(error)).toEqual({ production: false, manual: true });
		});
	});
});
