import { poll } from '../poller';
import {
	type LResult,
	type LScenario,
	latestFuzz,
	latestTargeted,
	runLatest,
} from './sim/latestHarness';
import { naivePoll } from './sim/naive';

const SEEDS = 300;

const check = async (sc: LScenario) => {
	const real: LResult = await runLatest(poll, sc);
	const naive: LResult = await runLatest(naivePoll, sc);
	const problems = real.violations.map((v) => `${sc.name} seed ${sc.seed}: ${v.g} ${v.msg}`);
	if (real.lost > naive.lost) {
		problems.push(`${sc.name} seed ${sc.seed}: L4 lost ${real.lost} > naive ${naive.lost}`);
	}
	return problems;
};

describe('poll: latest items', () => {
	it.each(latestTargeted(1000).map((sc) => [sc.name, sc] as const))('%s', async (_name, sc) => {
		expect(await check(sc)).toEqual([]);
	});

	it.each(['offset', 'page', 'token'] as const)('fuzz with %s pagination', async (pagination) => {
		const problems: string[] = [];
		for (let seed = 1; seed <= SEEDS; seed++)
			problems.push(...(await check(latestFuzz(seed, pagination))));
		expect(problems).toEqual([]);
	});

	it('caps the seen set at 5000 keys', async () => {
		const items = Array.from({ length: 6000 }, (_, i) => ({ id: `k${i}` }));
		const result = await poll(
			{
				order: 'latest',
				pagination: 'offset',
				pageSize: 6000,
				maxPages: 1,
				maxItems: 6000,
				key: (item) => String(item.id),
				timestamp: () => 0,
				useSince: false,
				sortKeyIsTime: false,
				clock: () => 0,
				skewMs: 0,
				overlap: 1,
				maxStepBack: 0,
				seenLimit: 10_000,
			},
			undefined,
			async () => ({ items, hasMore: false }),
		);
		expect((result.state as { seen: string[] }).seen).toHaveLength(5000);
	});
});
