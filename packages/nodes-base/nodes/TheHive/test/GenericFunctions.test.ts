import { parseAnalyzers } from '../GenericFunctions';

describe('Test TheHive, parseAnalyzers', () => {
	it('should map an array of "analyzerId::cortexId" entries', () => {
		const result = parseAnalyzers(['analyzer-1::cortex-1', 'analyzer-2::cortex-2']);

		expect(result).toEqual([
			{ analyzerId: 'analyzer-1', cortexId: 'cortex-1' },
			{ analyzerId: 'analyzer-2', cortexId: 'cortex-2' },
		]);
	});

	it('should map a comma-joined string (expression coercion case)', () => {
		const result = parseAnalyzers('analyzer-1::cortex-1, analyzer-2::cortex-2');

		expect(result).toEqual([
			{ analyzerId: 'analyzer-1', cortexId: 'cortex-1' },
			{ analyzerId: 'analyzer-2', cortexId: 'cortex-2' },
		]);
	});

	it('should handle a single analyzer provided as a string', () => {
		const result = parseAnalyzers('analyzer-1::cortex-1');

		expect(result).toEqual([{ analyzerId: 'analyzer-1', cortexId: 'cortex-1' }]);
	});

	it('should drop empty entries from a comma-joined string', () => {
		const result = parseAnalyzers('analyzer-1::cortex-1,, analyzer-2::cortex-2,');

		expect(result).toEqual([
			{ analyzerId: 'analyzer-1', cortexId: 'cortex-1' },
			{ analyzerId: 'analyzer-2', cortexId: 'cortex-2' },
		]);
	});

	it('should return an empty array for an empty string', () => {
		expect(parseAnalyzers('')).toEqual([]);
	});
});
