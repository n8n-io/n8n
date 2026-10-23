import { NodeApiError, type INode } from 'n8n-workflow';

import {
	isFormulaFilter,
	isFormulaOfUnknownTypeError,
	matchesFormulaFilter,
} from '../../v3/actions/databasePage/FormulaFilterFallback';

function page(formula: Record<string, unknown>) {
	return { id: 'page-id', properties: { Score: { type: 'formula', formula } } };
}

describe('Notion V3 formula filter fallback', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-15T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('detects the Notion formula-of-unknown-type error', () => {
		const node = { name: 'Notion', type: 'n8n-nodes-base.notion', typeVersion: 3 } as INode;
		const formulaError = new NodeApiError(node, {
			response: {
				status: 400,
				data: { message: 'Unable to filter based on a formula of unknown type.' },
			},
		});
		const otherError = new NodeApiError(node, {
			response: { status: 400, data: { message: 'body.filter is invalid' } },
		});

		expect(isFormulaOfUnknownTypeError(formulaError)).toBe(true);
		expect(isFormulaOfUnknownTypeError(otherError)).toBe(false);
		expect(isFormulaOfUnknownTypeError(undefined)).toBe(false);
	});

	it('only treats formula properties as formula filters', () => {
		expect(isFormulaFilter({ key: 'Score|formula' })).toBe(true);
		expect(isFormulaFilter({ key: 'Name|title' })).toBe(false);
		expect(isFormulaFilter({})).toBe(false);
	});

	it.each([
		[
			'checkbox equals',
			{ type: 'boolean', boolean: true },
			{ returnType: 'checkbox', condition: 'equals', checkboxValue: true },
			true,
		],
		[
			'checkbox does not equal',
			{ type: 'boolean', boolean: true },
			{ returnType: 'checkbox', condition: 'does_not_equal', checkboxValue: true },
			false,
		],
		[
			'string contains',
			{ type: 'string', string: 'Ready to ship' },
			{ returnType: 'string', condition: 'contains', richTextValue: 'ship' },
			true,
		],
		[
			'string starts with',
			{ type: 'string', string: 'Ready' },
			{ returnType: 'string', condition: 'starts_with', richTextValue: 'Not' },
			false,
		],
		[
			'string is empty',
			{ type: 'string', string: '' },
			{ returnType: 'string', condition: 'is_empty' },
			true,
		],
		[
			'number greater than',
			{ type: 'number', number: 12 },
			{ returnType: 'number', condition: 'greater_than', numberValue: 10 },
			true,
		],
		[
			'number is empty',
			{ type: 'number', number: null },
			{ returnType: 'number', condition: 'is_empty' },
			true,
		],
		[
			'date before',
			{ type: 'date', date: { start: '2026-07-01' } },
			{ returnType: 'date', condition: 'before', dateValue: '2026-07-02' },
			true,
		],
		[
			'date equals same day',
			{ type: 'date', date: { start: '2026-07-01T09:30:00.000Z' } },
			{ returnType: 'date', condition: 'equals', dateValue: '2026-07-01' },
			true,
		],
		[
			'date relative value',
			{ type: 'date', date: { start: '2026-07-16' } },
			{ returnType: 'date', condition: 'equals', dateValue: 'tomorrow' },
			true,
		],
		[
			'date past week',
			{ type: 'date', date: { start: '2026-07-10' } },
			{ returnType: 'date', condition: 'past_week' },
			true,
		],
		[
			'date next week',
			{ type: 'date', date: { start: '2026-07-10' } },
			{ returnType: 'date', condition: 'next_week' },
			false,
		],
		[
			'date is not empty',
			{ type: 'date', date: null },
			{ returnType: 'date', condition: 'is_not_empty' },
			false,
		],
		[
			'other type counts as empty',
			{ type: 'string', string: '' },
			{ returnType: 'date', condition: 'is_empty' },
			true,
		],
		[
			'other type does not match',
			{ type: 'string', string: 'yes' },
			{ returnType: 'checkbox', condition: 'equals', checkboxValue: true },
			false,
		],
	])('evaluates %s', (_name, formula, filter, expected) => {
		expect(matchesFormulaFilter(page(formula), { key: 'Score|formula', ...filter }, 'UTC')).toBe(
			expected,
		);
	});

	it('does not match pages without the formula property', () => {
		expect(
			matchesFormulaFilter(
				{ id: 'page-id', properties: {} },
				{ key: 'Score|formula', returnType: 'checkbox', condition: 'equals', checkboxValue: true },
				'UTC',
			),
		).toBe(false);
	});
});
