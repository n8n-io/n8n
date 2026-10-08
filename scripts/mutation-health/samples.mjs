/**
 * Seeded generative checks for the unit tests. CI runs these tests with only
 * the `.github/scripts` dependencies, so fast-check is not available. A fixed
 * seed keeps each run the same, and a failure names the seed and the sample.
 */

// mulberry32: a small 32-bit generator. It gives numbers in [0, 1).
function randomFrom(seed) {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
	};
}

/** Helpers that draw values from one seeded generator. */
export function sampler(seed) {
	const next = randomFrom(seed);
	const int = (min, max) => min + Math.floor(next() * (max - min + 1));
	const pick = (items) => items[int(0, items.length - 1)];
	const string = (alphabet, minLength, maxLength) =>
		Array.from({ length: int(minLength, maxLength) }, () => pick([...alphabet])).join('');
	const array = (minLength, maxLength, draw) =>
		Array.from({ length: int(minLength, maxLength) }, () => draw());
	return { int, pick, string, array };
}

/**
 * Run `check` on `count` samples. Sample `i` comes from `generate` with the
 * seed `seed + i`. A failed check rethrows its error with the seed and the
 * sample added to the message.
 */
export function forEachSample({ count = 200, seed = 1 }, generate, check) {
	for (let i = 0; i < count; i++) {
		const sample = generate(sampler(seed + i));
		try {
			check(sample);
		} catch (error) {
			error.message = `${error.message}\nseed ${seed + i}, sample ${JSON.stringify(sample)}`;
			throw error;
		}
	}
}
