// @ts-check

export function buildDistributionGroups(report) {
	if (typeof report !== 'object' || report === null || !Array.isArray(report.profiles)) {
		throw new Error('Playwright returned invalid profile data');
	}

	const bySpec = new Map();
	for (const profile of report.profiles) {
		if (
			typeof profile !== 'object' ||
			profile === null ||
			typeof profile.poolDigest !== 'string' ||
			!Array.isArray(profile.specs)
		) {
			throw new Error('Playwright returned an invalid fixture-pool profile');
		}
		for (const spec of profile.specs) {
			if (typeof spec !== 'string') throw new Error('Playwright returned an invalid spec path');
			const digests = bySpec.get(spec) ?? new Set();
			digests.add(profile.poolDigest);
			bySpec.set(spec, digests);
		}
	}

	return Object.fromEntries(
		[...bySpec.entries()].map(([spec, digests]) => [spec, [...digests].sort()]),
	);
}

export function filterDistributionSpecs(specs, runnableSpecs, quarantinedSpecs) {
	const runnable = new Set(runnableSpecs);
	return specs.filter((spec) => runnable.has(spec) && !quarantinedSpecs.has(spec));
}
