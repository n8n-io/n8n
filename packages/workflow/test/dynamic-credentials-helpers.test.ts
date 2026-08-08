import {
	applyDynamicCredentialsUsage,
	attachDynamicCredentialsUsage,
	runDataAttemptedDynamicCredentials,
	runDataUsedDynamicCredentials,
	summarizeDynamicCredentialsUsage,
	takeAttachedDynamicCredentialsUsage,
} from '../src/dynamic-credentials-helpers';
import type { IRunData, ITaskData } from '../src/interfaces';
import type { IRunExecutionData } from '../src/run-execution-data/run-execution-data';

const task = (flags: Partial<ITaskData>): ITaskData =>
	({ startTime: 0, executionTime: 0, ...flags }) as ITaskData;

const executionData = (runData: IRunData, executedByUserId?: string): IRunExecutionData =>
	({
		resultData: { runData },
		...(executedByUserId ? { executionData: { runtimeData: { executedByUserId } } } : {}),
	}) as unknown as IRunExecutionData;

describe('dynamic-credentials-helpers', () => {
	describe('runDataUsedDynamicCredentials', () => {
		it('returns false for undefined or empty run data', () => {
			expect(runDataUsedDynamicCredentials(undefined)).toBe(false);
			expect(runDataUsedDynamicCredentials({})).toBe(false);
		});

		it('returns false when no task used a dynamic credential', () => {
			const runData: IRunData = { node: [task({}), task({ attemptedDynamicCredentials: true })] };
			expect(runDataUsedDynamicCredentials(runData)).toBe(false);
		});

		it('returns true when any task of any node used a dynamic credential', () => {
			const runData: IRunData = {
				A: [task({})],
				B: [task({}), task({ usedDynamicCredentials: true })],
			};
			expect(runDataUsedDynamicCredentials(runData)).toBe(true);
		});
	});

	describe('runDataAttemptedDynamicCredentials', () => {
		it('returns false for undefined or empty run data', () => {
			expect(runDataAttemptedDynamicCredentials(undefined)).toBe(false);
			expect(runDataAttemptedDynamicCredentials({})).toBe(false);
		});

		it('returns true on an attempt even when resolution did not succeed', () => {
			const runData: IRunData = { node: [task({ attemptedDynamicCredentials: true })] };
			expect(runDataAttemptedDynamicCredentials(runData)).toBe(true);
			expect(runDataUsedDynamicCredentials(runData)).toBe(false);
		});

		it('reports both when a credential was used', () => {
			const runData: IRunData = {
				node: [task({ usedDynamicCredentials: true, attemptedDynamicCredentials: true })],
			};
			expect(runDataAttemptedDynamicCredentials(runData)).toBe(true);
			expect(runDataUsedDynamicCredentials(runData)).toBe(true);
		});
	});

	it('ignores null placeholder slots in a node task array', () => {
		// runData arrays can hold null placeholder slots at runtime despite the ITaskData[] type.
		const runData = {
			node: [null, task({ usedDynamicCredentials: true })],
		} as unknown as IRunData;
		expect(runDataUsedDynamicCredentials(runData)).toBe(true);
		expect(runDataAttemptedDynamicCredentials(runData)).toBe(false);
	});

	describe('summarizeDynamicCredentialsUsage', () => {
		it('returns an empty summary for undefined execution data or when nothing was used', () => {
			expect(summarizeDynamicCredentialsUsage(undefined)).toEqual({});
			expect(summarizeDynamicCredentialsUsage(executionData({ node: [task({})] }))).toEqual({});
		});

		it('reports usage and the resolved user when a credential was resolved', () => {
			const usage = summarizeDynamicCredentialsUsage(
				executionData(
					{
						node: [task({ usedDynamicCredentials: true, attemptedDynamicCredentials: true })],
					},
					'resolved-user',
				),
			);
			expect(usage).toEqual({
				usedDynamicCredentials: true,
				attemptedDynamicCredentials: true,
				dynamicCredentialsResolvedUserId: 'resolved-user',
			});
		});

		it('reports only the attempted flag when resolution never succeeded', () => {
			const usage = summarizeDynamicCredentialsUsage(
				executionData({ node: [task({ attemptedDynamicCredentials: true })] }, 'resolved-user'),
			);
			expect(usage).toEqual({ attemptedDynamicCredentials: true });
		});
	});

	describe('attach/takeAttachedDynamicCredentialsUsage', () => {
		it('round-trips a usage summary through an error and strips the marker', () => {
			const error = attachDynamicCredentialsUsage(new Error('boom'), {
				usedDynamicCredentials: true,
				attemptedDynamicCredentials: true,
				dynamicCredentialsResolvedUserId: 'resolved-user',
			});
			expect(takeAttachedDynamicCredentialsUsage(error)).toEqual({
				usedDynamicCredentials: true,
				attemptedDynamicCredentials: true,
				dynamicCredentialsResolvedUserId: 'resolved-user',
			});
			// The marker is transport-only; taking it removes it so the error can persist cleanly.
			expect('dynamicCredentialsUsage' in error).toBe(false);
			expect(takeAttachedDynamicCredentialsUsage(error)).toBeUndefined();
		});

		it('does not attach an empty summary', () => {
			const error = attachDynamicCredentialsUsage(new Error('boom'), {});
			expect('dynamicCredentialsUsage' in error).toBe(false);
			expect(takeAttachedDynamicCredentialsUsage(error)).toBeUndefined();
		});

		it('returns undefined for errors without an attachment and non-error values', () => {
			expect(takeAttachedDynamicCredentialsUsage(new Error('boom'))).toBeUndefined();
			expect(takeAttachedDynamicCredentialsUsage(undefined)).toBeUndefined();
			expect(takeAttachedDynamicCredentialsUsage('boom')).toBeUndefined();
		});

		it('drops malformed attachment fields', () => {
			const error = Object.assign(new Error('boom'), {
				dynamicCredentialsUsage: {
					usedDynamicCredentials: 'yes',
					attemptedDynamicCredentials: true,
					dynamicCredentialsResolvedUserId: 42,
				},
			});
			expect(takeAttachedDynamicCredentialsUsage(error)).toEqual({
				attemptedDynamicCredentials: true,
			});
			expect('dynamicCredentialsUsage' in error).toBe(false);
		});
	});

	describe('applyDynamicCredentialsUsage', () => {
		it('sets flags additively and records the resolved user', () => {
			const target: {
				currentNodeUsedDynamicCredentials?: boolean;
				currentNodeAttemptedDynamicCredentials?: boolean;
				dynamicCredentialsResolvedUserId?: string;
			} = { currentNodeUsedDynamicCredentials: false };

			applyDynamicCredentialsUsage(target, {
				usedDynamicCredentials: true,
				dynamicCredentialsResolvedUserId: 'resolved-user',
			});
			expect(target).toEqual({
				currentNodeUsedDynamicCredentials: true,
				dynamicCredentialsResolvedUserId: 'resolved-user',
			});

			// An attempted-only report must not clear previously set flags.
			applyDynamicCredentialsUsage(target, { attemptedDynamicCredentials: true });
			expect(target).toEqual({
				currentNodeUsedDynamicCredentials: true,
				currentNodeAttemptedDynamicCredentials: true,
				dynamicCredentialsResolvedUserId: 'resolved-user',
			});
		});

		it('does not record a resolved user without a used flag', () => {
			const target: { dynamicCredentialsResolvedUserId?: string } = {};
			applyDynamicCredentialsUsage(target, {
				attemptedDynamicCredentials: true,
				dynamicCredentialsResolvedUserId: 'resolved-user',
			});
			expect(target.dynamicCredentialsResolvedUserId).toBeUndefined();
		});
	});
});
