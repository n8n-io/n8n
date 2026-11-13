// Writes N pool keys in a seeded random order (all runnable keys when N is 0).
//   node pick-keys.mjs <pool.jsonl> <n> <seed> > keys.txt
import { rng } from './lib/bundle.mjs';
import { keyOf, readPool } from './lib/poolfile.mjs';

const [file, n, seed] = process.argv.slice(2);
const keys = readPool(file).map((r) => keyOf(r.id));
const rand = rng(Number(seed ?? 7));
for (let i = keys.length - 1; i > 0; i--) {
	const j = Math.floor(rand() * (i + 1));
	[keys[i], keys[j]] = [keys[j], keys[i]];
}
const count = Number(n) || keys.length;
process.stdout.write(`${keys.slice(0, count).join('\n')}\n`);
