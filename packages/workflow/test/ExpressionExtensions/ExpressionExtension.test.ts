/**
 * @jest-environment jsdom
 */

import { extendTransform } from '@/Extensions';
import { joinExpression, splitExpression } from '@/Extensions/ExpressionParser';

describe('Expression Extension Transforms', () => {
	describe('extend() transform', () => {
		test('Basic transform with .isBlank', () => {
			expect(extendTransform('"".isBlank()')!.code).toEqual('extend("", "isBlank", [])');
		});

		test('Chained transform with .sayHi.getOnlyFirstCharacters', () => {
			expect(extendTransform('"".sayHi().getOnlyFirstCharacters(2)')!.code).toEqual(
				'extend(extend("", "sayHi", []), "getOnlyFirstCharacters", [2])',
			);
		});

		test('Chained transform with native functions .sayHi.trim.getOnlyFirstCharacters', () => {
			expect(extendTransform('"aaa ".sayHi().trim().getOnlyFirstCharacters(2)')!.code).toEqual(
				'extend(extend("aaa ", "sayHi", []).trim(), "getOnlyFirstCharacters", [2])',
			);
		});
	});
});

describe('tmpl Expression Parser', () => {
	describe('Compatible splitting', () => {
		test('Lone expression', () => {
			expect(splitExpression('{{ "" }}')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' "" ', hasClosingBrackets: true },
			]);
		});

		test('Multiple expression', () => {
			expect(splitExpression('{{ "test".sayHi() }} you have ${{ (100).format() }}.')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' "test".sayHi() ', hasClosingBrackets: true },
				{ type: 'text', text: ' you have $' },
				{ type: 'code', text: ' (100).format() ', hasClosingBrackets: true },
				{ type: 'text', text: '.' },
			]);
		});

		test('Unclosed expression', () => {
			expect(splitExpression('{{ "test".sayHi() }} you have ${{ (100).format()')).toEqual([
				{ type: 'text', text: '' },
				{ type: 'code', text: ' "test".sayHi() ', hasClosingBrackets: true },
				{ type: 'text', text: ' you have $' },
				{ type: 'code', text: ' (100).format()', hasClosingBrackets: false },
			]);
		});

		test('Escaped opening bracket', () => {
			expect(splitExpression('test \\{{ no code }}')).toEqual([
				{ type: 'text', text: 'test \\{{ no code }}' },
			]);
		});

		test('Escaped closinging bracket', () => {
			expect(splitExpression('test {{ code.test("\\}}") }}')).toEqual([
				{ type: 'text', text: 'test ' },
				{ type: 'code', text: ' code.test("}}") ', hasClosingBrackets: true },
			]);
		});
	});

	describe('Compatible joining', () => {
		test('Lone expression', () => {
			expect(joinExpression(splitExpression('{{ "" }}'))).toEqual('{{ "" }}');
		});

		test('Multiple expression', () => {
			expect(
				joinExpression(splitExpression('{{ "test".sayHi() }} you have ${{ (100).format() }}.')),
			).toEqual('{{ "test".sayHi() }} you have ${{ (100).format() }}.');
		});

		test('Unclosed expression', () => {
			expect(
				joinExpression(splitExpression('{{ "test".sayHi() }} you have ${{ (100).format()')),
			).toEqual('{{ "test".sayHi() }} you have ${{ (100).format()');
		});

		test('Escaped opening bracket', () => {
			expect(joinExpression(splitExpression('test \\{{ no code }}'))).toEqual(
				'test \\{{ no code }}',
			);
		});

		test('Escaped closinging bracket', () => {
			expect(joinExpression(splitExpression('test {{ code.test("\\}}") }}'))).toEqual(
				'test {{ code.test("\\}}") }}',
			);
		});
	});
});
