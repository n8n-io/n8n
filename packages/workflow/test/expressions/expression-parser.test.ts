import { splitExpression, joinExpression } from '../../src/extensions/expression-parser';

describe('expression-parser', () => {
	describe('splitExpression', () => {
		it('should parse simple expression', () => {
			const result = splitExpression('hello {{ $json.name }} world');
			expect(result).toEqual([
				{ type: 'text', text: 'hello ' },
				{ type: 'code', text: ' $json.name ', hasClosingBrackets: true },
				{ type: 'text', text: ' world' },
			]);
		});

		it('should handle expression with single quotes containing }}', () => {
			const result = splitExpression("{{ $jmespath($json, '{a: b}') }}");
			expect(result).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: " $jmespath($json, '{a: b}') ", hasClosingBrackets: true },
			]);
		});

		it('should handle JMESPath with nested braces (issue #22264)', () => {
			const result = splitExpression(
				"{{ $jmespath($json, '{reviewers: values[*].{uuid: user.uuid}}') }}",
			);
			expect(result).toEqual([
				{ type: 'text', text: '' },
				{
					type: 'code',
					text: " $jmespath($json, '{reviewers: values[*].{uuid: user.uuid}}') ",
					hasClosingBrackets: true,
				},
			]);
		});

		it('should handle double quotes containing }}', () => {
			const result = splitExpression('{{ "test}}value" }}');
			expect(result).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' "test}}value" ', hasClosingBrackets: true },
			]);
		});

		it('should handle backticks containing }}', () => {
			const result = splitExpression('{{ `template}}string` }}');
			expect(result).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' `template}}string` ', hasClosingBrackets: true },
			]);
		});

		it('should handle escaped quotes inside strings', () => {
			const result = splitExpression("{{ 'test\\'s}}value' }}");
			expect(result).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: " 'test\\'s}}value' ", hasClosingBrackets: true },
			]);
		});

		it('should handle multiple expressions with strings containing }}', () => {
			const result = splitExpression("prefix {{ '{a}}' }} middle {{ '{b}}' }} suffix");
			expect(result).toEqual([
				{ type: 'text', text: 'prefix ' },
				{ type: 'code', text: " '{a}}' ", hasClosingBrackets: true },
				{ type: 'text', text: ' middle ' },
				{ type: 'code', text: " '{b}}' ", hasClosingBrackets: true },
				{ type: 'text', text: ' suffix' },
			]);
		});

		it('should handle }} outside of strings correctly', () => {
			const result = splitExpression('{{ $json.a }} }} extra');
			expect(result).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' $json.a ', hasClosingBrackets: true },
				{ type: 'text', text: ' }} extra' },
			]);
		});

		it('should handle expression without closing brackets', () => {
			const result = splitExpression('{{ $json.name');
			expect(result).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' $json.name', hasClosingBrackets: false },
			]);
		});

		it('should handle escaped closing brackets', () => {
			const result = splitExpression('{{ $json.name \\}} }}');
			expect(result).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' $json.name }} ', hasClosingBrackets: true },
			]);
		});
	});

	describe('joinExpression', () => {
		it('should join simple expression', () => {
			const result = joinExpression([
				{ type: 'text', text: 'hello ' },
				{ type: 'code', text: ' $json.name ', hasClosingBrackets: true },
				{ type: 'text', text: ' world' },
			]);
			expect(result).toBe('hello {{ $json.name }} world');
		});

		it('should handle strings containing }} without escaping them', () => {
			const result = joinExpression([
				{ type: 'text', text: '' },
				{ type: 'code', text: " '{a}}' ", hasClosingBrackets: true },
				{ type: 'text', text: '' },
			]);
			// }} inside the string should NOT be escaped
			expect(result).toBe("{{ '{a}}' }}");
		});

		it('should handle code without closing brackets', () => {
			const result = joinExpression([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' $json.name', hasClosingBrackets: false },
			]);
			expect(result).toBe('{{ $json.name');
		});
	});

	describe('roundtrip', () => {
		const testCases = [
			'hello {{ $json.name }} world',
			"{{ $jmespath($json, '{a: b}') }}",
			"{{ $jmespath($json, '{reviewers: values[*].{uuid: user.uuid}}') }}",
			'{{ "test}}value" }}',
			'{{ `template}}string` }}',
			"prefix {{ '{a}}' }} middle {{ '{b}}' }} suffix",
		];

		for (const testCase of testCases) {
			it(`should roundtrip: ${testCase}`, () => {
				const parsed = splitExpression(testCase);
				const rejoined = joinExpression(parsed);
				// The rejoined expression may have extra spaces, but parsing it again should be equivalent
				const reparsed = splitExpression(rejoined);
				expect(reparsed).toEqual(parsed);
			});
		}
	});
});
