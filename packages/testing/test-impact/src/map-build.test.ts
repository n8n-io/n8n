import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { forceSpecTn, emitPerSpecLcovs, type EmitPerSpecLcovsOptions } from './map-build.js';

describe('forceSpecTn', () => {
	it('rewrites every record TN to the spec id', () => {
		const lcov = 'TN:wrong\nSF:a.ts\nend_of_record\nTN:also\nSF:b.ts\nend_of_record';
		expect(forceSpecTn(lcov, 'tests/e2e/x.spec.ts').match(/^TN:.*$/gm)).toEqual([
			'TN:tests/e2e/x.spec.ts',
			'TN:tests/e2e/x.spec.ts',
		]);
	});

	it('prepends TN when the lcov has none', () => {
		expect(forceSpecTn('SF:a.ts\nend_of_record', 'spec')).toBe('TN:spec\nSF:a.ts\nend_of_record');
	});
});

describe('emitPerSpecLcovs (scan/skip logic)', () => {
	let root: string;
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), 'mapbuild-'));
	});
	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});
	const opts = (feedRaws: EmitPerSpecLcovsOptions['feedRaws']): EmitPerSpecLcovsOptions => ({
		bySpecDir: join(root, 'by-spec'),
		outDir: join(root, 'out'),
		coverageOptions: {},
		feedRaws,
	});

	it('returns empty stats when bySpecDir is absent', async () => {
		expect(await emitPerSpecLcovs(opts(() => false))).toEqual({
			dirs: 0,
			withMarker: 0,
			withRaw: 0,
			emitted: 0,
		});
	});

	it('counts dirs / markers / raws and skips when feedRaws returns false', async () => {
		const bs = join(root, 'by-spec');
		mkdirSync(join(bs, 'spec_a'), { recursive: true });
		writeFileSync(join(bs, 'spec_a', '.spec'), 'tests/e2e/a.spec.ts');
		writeFileSync(join(bs, 'spec_a', 'raw-1.json'), '{}');
		mkdirSync(join(bs, 'no_marker'), { recursive: true });
		writeFileSync(join(bs, 'no_marker', 'raw-1.json'), '{}');
		mkdirSync(join(bs, 'no_raw'), { recursive: true });
		writeFileSync(join(bs, 'no_raw', '.spec'), 'x');

		const stats = await emitPerSpecLcovs(opts(() => false));
		expect(stats).toEqual({ dirs: 3, withMarker: 2, withRaw: 1, emitted: 0 });
	});
});
