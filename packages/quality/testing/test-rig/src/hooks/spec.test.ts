import { INVALID_SPECS, VALID_SPECS } from './spec-fixtures';
import { parseHookSpecs } from './spec';

describe('parseHookSpecs', () => {
	it('accepts every valid spec', () => {
		expect(parseHookSpecs(VALID_SPECS)).toHaveLength(VALID_SPECS.length);
	});

	it.each(INVALID_SPECS)('rejects an invalid $field', ({ spec, field }) => {
		expect(() => parseHookSpecs([spec])).toThrow(RegExp(`: ${field}[:.]|'${field}'`));
	});

	it('names the point of the invalid spec', () => {
		expect(() => parseHookSpecs([INVALID_SPECS[4].spec])).toThrow(/^hook bad-kind: kind:/);
	});

	it('names the index when the point is missing', () => {
		expect(() => parseHookSpecs([{ file: 'f', target: '', method: 'm' }])).toThrow(
			/^hook #0: point:/,
		);
	});

	it('rejects a duplicate point', () => {
		expect(() => parseHookSpecs([VALID_SPECS[0], VALID_SPECS[0]])).toThrow(
			'hook minimal: duplicate point',
		);
	});
});
