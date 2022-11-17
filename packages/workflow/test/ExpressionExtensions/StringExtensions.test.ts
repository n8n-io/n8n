/**
 * @jest-environment jsdom
 */

import { stringExtensions } from '@/Extensions/StringExtensions';
import { dateExtensions } from '@/Extensions/DateExtensions';
import { evaluate } from './Helpers';

describe('Data Transformation Functions', () => {
	describe('String Data Transformation Functions', () => {
		test('.isBlank() should work correctly on a string that is not empty', () => {
			expect(evaluate('={{"NotBlank".isBlank()}}')).toEqual(false);
		});

		test('.isBlank() should work correctly on a string that is empty', () => {
			expect(evaluate('={{"".isBlank()}}')).toEqual(true);
		});

		test('.getOnlyFirstCharacters() should work correctly on a string', () => {
			expect(evaluate('={{"myNewField".getOnlyFirstCharacters(5)}}')).toEqual('myNew');

			expect(evaluate('={{"myNewField".getOnlyFirstCharacters(10)}}')).toEqual('myNewField');

			expect(
				evaluate('={{"myNewField".getOnlyFirstCharacters(5).length >= "myNewField".length}}'),
			).toEqual(false);

			expect(evaluate('={{DateTime.now().toLocaleString().getOnlyFirstCharacters(2)}}')).toEqual(
				stringExtensions.functions.getOnlyFirstCharacters(
					// @ts-ignore
					dateExtensions.functions.toLocaleString(new Date(), []),
					[2],
				),
			);
		});

		test('.sayHi() should work correctly on a string', () => {
			expect(evaluate('={{ "abc".sayHi() }}')).toEqual('hi abc');
		});

		test('.encrypt() should work correctly on a string', () => {
			expect(evaluate('={{ "12345".encrypt("sha256") }}')).toEqual(
				stringExtensions.functions.encrypt('12345', ['sha256']),
			);

			expect(evaluate('={{ "12345".encrypt("sha256") }}')).not.toEqual(
				stringExtensions.functions.encrypt('12345', ['MD5']),
			);

			expect(evaluate('={{ "12345".encrypt("MD5") }}')).toEqual(
				stringExtensions.functions.encrypt('12345', ['MD5']),
			);

			expect(evaluate('={{ "12345".hash("sha256") }}')).toEqual(
				'5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5',
			);
		});

		test('.hash() alias should work correctly on a string', () => {
			expect(evaluate('={{ "12345".hash("sha256") }}')).toEqual(
				'5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5',
			);
		});

		test('.urlDecode should work correctly on a string', () => {
			expect(evaluate('={{ "string%20with%20spaces".urlDecode(false) }}')).toEqual(
				'string with spaces',
			);
		});

		test('.urlEncode should work correctly on a string', () => {
			expect(evaluate('={{ "string with spaces".urlEncode(false) }}')).toEqual(
				'string%20with%20spaces',
			);
		});

		test('.stripTags should work correctly on a string', () => {
			expect(evaluate('={{ "<html><head>test</head></html>".stripTags() }}')).toEqual('test');
		});

		test('.removeMarkdown should work correctly on a string', () => {
			expect(evaluate('={{ "<html><head>test</head></html>".removeMarkdown() }}')).toEqual('test');
		});

		test('.toLowerCase should work correctly on a string', () => {
			expect(evaluate('={{ "TEST".toLowerCase() }}')).toEqual('test');
		});

		test('.toDate should work correctly on a date string', () => {
			expect(evaluate('={{ "2022-09-01T19:42:28.164Z".toDate() }}')).toEqual(
				new Date('2022-09-01T19:42:28.164Z'),
			);
		});

		test('.toBoolean should work correctly on a string', () => {
			const validTrue = ['y', 'yes', 't', 'true', '1', 'YES'];
			for (const v of validTrue) {
				expect(evaluate(`={{ "${v}".toBoolean() }}`)).toEqual(true);
			}

			const validFalse = ['n', 'no', 'f', 'false', '0', 'NO'];
			for (const v of validFalse) {
				expect(evaluate(`={{ "${v}".toBoolean() }}`)).toEqual(false);
			}

			expect(evaluate('={{ "maybe".toBoolean() }}')).toEqual(false);
		});

		test('.isTrue should work correctly on a string', () => {
			const validTrue = ['y', 'yes', 't', 'true', '1', 'YES'];
			for (const v of validTrue) {
				expect(evaluate(`={{ "${v}".isTrue() }}`)).toEqual(true);
			}

			const validFalse = ['n', 'no', 'f', 'false', '0', 'NO'];
			for (const v of validFalse) {
				expect(evaluate(`={{ "${v}".isTrue() }}`)).toEqual(false);
			}

			expect(evaluate('={{ "maybe".isTrue() }}')).toEqual(false);
		});

		test('.isFalse should work correctly on a string', () => {
			const validTrue = ['y', 'yes', 't', 'true', '1', 'YES'];
			for (const v of validTrue) {
				expect(evaluate(`={{ "${v}".isFalse() }}`)).toEqual(false);
			}

			const validFalse = ['n', 'no', 'f', 'false', '0', 'NO'];
			for (const v of validFalse) {
				expect(evaluate(`={{ "${v}".isFalse() }}`)).toEqual(true);
			}

			expect(evaluate('={{ "maybe".isFalse() }}')).toEqual(false);
		});

		test('.toFloat should work correctly on a string', () => {
			expect(evaluate('={{ "1.1".toFloat() }}')).toEqual(1.1);
			expect(evaluate('={{ "1.1".toDecimalNumber() }}')).toEqual(1.1);
		});

		test('.toInt should work correctly on a string', () => {
			expect(evaluate('={{ "1.1".toInt() }}')).toEqual(1);
			expect(evaluate('={{ "1.1".toWholeNumber() }}')).toEqual(1);
			expect(evaluate('={{ "1.5".toInt() }}')).toEqual(1);
			expect(evaluate('={{ "1.5".toWholeNumber() }}')).toEqual(1);
		});

		test('.quote should work correctly on a string', () => {
			expect(evaluate('={{ "test".quote() }}')).toEqual('"test"');
			expect(evaluate('={{ "\\"test\\"".quote() }}')).toEqual('"\\"test\\""');
		});

		test('.isNumeric should work correctly on a string', () => {
			console.log(1);
			expect(evaluate('={{ "".isNumeric() }}')).toEqual(false);
			console.log(2);
			expect(evaluate('={{ "asdf".isNumeric() }}')).toEqual(false);
			console.log(3);
			expect(evaluate('={{ "1234".isNumeric() }}')).toEqual(true);
			console.log(4);
			expect(evaluate('={{ "4e4".isNumeric() }}')).toEqual(true);
			expect(evaluate('={{ "4.4".isNumeric() }}')).toEqual(true);
		});
	});
});
