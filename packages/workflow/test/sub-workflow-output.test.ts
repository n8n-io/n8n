import type { ITaskData } from '../src/interfaces';
import { mergeRunsPerBranch } from '../src/sub-workflow-output';

function buildRun(outputBranches: { json: object }[][]): ITaskData {
	return {
		data: {
			main: outputBranches,
		},
	} as unknown as ITaskData;
}

describe('mergeRunsPerBranch', () => {
	it('returns an empty array for no runs', () => {
		expect(mergeRunsPerBranch([])).toEqual([]);
	});

	it('returns a single run unchanged', () => {
		const singleRun = buildRun([[{ json: { id: 1 } }, { json: { id: 2 } }]]);
		const singleRunUnchanged = [[{ json: { id: 1 } }, { json: { id: 2 } }]];

		expect(mergeRunsPerBranch([singleRun])).toEqual(singleRunUnchanged);
	});

	it('concatenates items across runs on the single main branch', () => {
		const firstRun = buildRun([[{ json: { id: 0 } }]]);
		const secondRun = buildRun([[{ json: { id: 1 } }, { json: { id: 2 } }]]);
		const thirdRun = buildRun([[{ json: { id: 3 } }]]);

		const allItemsConcatenatedOnOneBranch = [
			[{ json: { id: 0 } }, { json: { id: 1 } }, { json: { id: 2 } }, { json: { id: 3 } }],
		];

		expect(mergeRunsPerBranch([firstRun, secondRun, thirdRun])).toEqual(
			allItemsConcatenatedOnOneBranch,
		);
	});

	it('preserves multi-output shape and concatenates per branch', () => {
		const firstRun = buildRun([[{ json: { primary: 0 } }], [{ json: { secondary: 0 } }]]);
		const secondRun = buildRun([[{ json: { primary: 1 } }], [{ json: { secondary: 1 } }]]);

		const mergedPrimaryBranch = [{ json: { primary: 0 } }, { json: { primary: 1 } }];
		const mergedSecondaryBranch = [{ json: { secondary: 0 } }, { json: { secondary: 1 } }];

		expect(mergeRunsPerBranch([firstRun, secondRun])).toEqual([
			mergedPrimaryBranch,
			mergedSecondaryBranch,
		]);
	});

	it('tolerates missing branches across runs', () => {
		const runWithPrimaryBranchOnly = buildRun([[{ json: { primary: 0 } }]]);
		const runWithBothBranches = buildRun([
			[{ json: { primary: 1 } }],
			[{ json: { secondary: 1 } }],
		]);
		const mergedPrimaryBranch = [{ json: { primary: 0 } }, { json: { primary: 1 } }];
		const secondaryBranchFromTheOnlyRunThatProducedIt = [{ json: { secondary: 1 } }];

		expect(mergeRunsPerBranch([runWithPrimaryBranchOnly, runWithBothBranches])).toEqual([
			mergedPrimaryBranch,
			secondaryBranchFromTheOnlyRunThatProducedIt,
		]);
	});
});
