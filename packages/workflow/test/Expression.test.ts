import * as tmpl from 'riot-tmpl';

describe('Expression', () => {
	beforeAll(() => {
		tmpl.brackets.set('{{ }}');
	});

	test('evaluate sum of integers', () => {
		const evaluated = tmpl.tmpl('{{ 1 + 2 }}');
		expect(evaluated).toEqual(3);
	});

	test('evaluate array method with same-line anonymous callback', () => {
		const evaluated = tmpl.tmpl('{{ [1, 2, 3].filter(function (v) { return v > 2 }) }}');
		expect(evaluated).toEqual([3]);
	});

	test('evaluate array method with single-line anonymous callback', () => {
		const evaluated = tmpl.tmpl(`{{ [1, 2, 3].filter(function (v) {
			return v > 2
		}) }}`);
		expect(evaluated).toEqual([3]);
	});

	test('evaluate array method with multi-line anonymous callback', () => {
		const evaluated = tmpl.tmpl(`{{ [1, 2, 3].filter(function (v) {
			const a = 1;
			return v > 2
		}) }}`);
		expect(evaluated).toEqual([3]);
	});

	test('evaluate array method with same-line arrow callback, unbracketed return', () => {
		const evaluated = tmpl.tmpl('{{ [1, 2, 3].filter((v) => v > 2) }}');
		expect(evaluated).toEqual([3]);
	});

	test('evaluate array method with single-line anonymous callback, bracketed return', () => {
		const evaluated = tmpl.tmpl(`{{ [1, 2, 3].filter((v) => { return v > 2 }) }}`);
		expect(evaluated).toEqual([3]);
	});

	test('evaluate array method with single-line arrow callback', () => {
		const evaluated = tmpl.tmpl(`{{ [1, 2, 3].filter((v) => {
			return v > 2
		}) }}`);
		expect(evaluated).toEqual([3]);
	});
});
