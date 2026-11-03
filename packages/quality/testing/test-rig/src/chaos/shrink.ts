import type { ScheduledFault } from './schedule';

export interface ShrinkOptions {
	/** Runs per candidate schedule. */
	repeats: number;
	/** Failed runs out of `repeats` that make a candidate count as failing. */
	minFailures: number;
	/** Most candidate runs in total. */
	maxRuns: number;
	/** Wall-clock budget in ms. */
	budgetMs: number;
	now?: () => number;
}

export interface ShrinkResult {
	schedule: ScheduledFault[];
	runs: number;
	/** True when the budget ran out before no single fault could be removed. */
	exhausted: boolean;
}

/**
 * Removes faults one at a time while the schedule still fails, until no single
 * removal keeps it failing or the budget runs out. A candidate fails when it
 * fails in at least `minFailures` of `repeats` runs, so a flaky outcome does not
 * pick the wrong minimal schedule.
 */
export async function shrink(
	schedule: ScheduledFault[],
	fails: (candidate: ScheduledFault[]) => Promise<boolean>,
	options: ShrinkOptions,
): Promise<ShrinkResult> {
	const now = options.now ?? Date.now;
	const deadline = now() + options.budgetMs;
	let runs = 0;
	const outOfBudget = () => runs >= options.maxRuns || now() >= deadline;

	const stillFails = async (candidate: ScheduledFault[]) => {
		let failures = 0;
		for (let i = 0; i < options.repeats && !outOfBudget(); i++) {
			runs += 1;
			if (await fails(candidate)) failures += 1;
			if (failures >= options.minFailures) return true;
			if (failures + (options.repeats - i - 1) < options.minFailures) return false;
		}
		return false;
	};

	let current = schedule;
	let removed = true;
	while (removed && current.length > 1) {
		removed = false;
		for (let i = 0; i < current.length; i++) {
			if (outOfBudget()) return { schedule: current, runs, exhausted: true };
			const candidate = current.filter((_, index) => index !== i);
			if (await stillFails(candidate)) {
				current = candidate;
				removed = true;
				break;
			}
		}
	}
	return { schedule: current, runs, exhausted: outOfBudget() };
}
