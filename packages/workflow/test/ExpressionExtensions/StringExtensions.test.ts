/**
 * @jest-environment jsdom
 */

import { stringExtensions } from '@/Extensions/StringExtensions';
import { dateExtensions } from '@/Extensions/DateExtensions';
import { evaluate } from './Helpers';

describe('Data Transformation Functions', () => {
	describe('String Data Transformation Functions', () => {
		test('.isEmpty() should work correctly on a string that is not empty', () => {
			expect(evaluate('={{"NotBlank".isEmpty()}}')).toEqual(false);
		});

		test('.isEmpty() should work correctly on a string that is empty', () => {
			expect(evaluate('={{"".isEmpty()}}')).toEqual(true);
		});

		test('.hash() should work correctly on a string', () => {
			expect(evaluate('={{ "12345".hash("sha256") }}')).toEqual(
				stringExtensions.functions.hash('12345', ['sha256']),
			);

			expect(evaluate('={{ "12345".hash("sha256") }}')).not.toEqual(
				stringExtensions.functions.hash('12345', ['MD5']),
			);

			expect(evaluate('={{ "12345".hash("MD5") }}')).toEqual(
				stringExtensions.functions.hash('12345', ['MD5']),
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

		test('.removeTags should work correctly on a string', () => {
			expect(evaluate('={{ "<html><head>test</head></html>".removeTags() }}')).toEqual('test');
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
			expect(evaluate('={{ "".isNumeric() }}')).toEqual(false);
			expect(evaluate('={{ "asdf".isNumeric() }}')).toEqual(false);
			expect(evaluate('={{ "1234".isNumeric() }}')).toEqual(true);
			expect(evaluate('={{ "4e4".isNumeric() }}')).toEqual(true);
			expect(evaluate('={{ "4.4".isNumeric() }}')).toEqual(true);
		});

		test('.isUrl should work on a string', () => {
			expect(evaluate('={{ "https://example.com/".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "example.com".isUrl() }}')).toEqual(false);
		});

		test('.isDomain should work on a string', () => {
			expect(evaluate('={{ "example.com".isDomain() }}')).toEqual(true);
			expect(evaluate('={{ "asdf".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "https://example.com/".isDomain() }}')).toEqual(false);
		});

		test('.toSnakeCase should work on a string', () => {
			expect(evaluate('={{ "I am a test!".toSnakeCase() }}')).toEqual('i_am_a_test');
			expect(evaluate('={{ "i_am_a_test".toSnakeCase() }}')).toEqual('i_am_a_test');
		});

		test('.toSentenceCase should work on a string', () => {
			expect(
				evaluate(
					'={{ "i am a test! i have multiple types of Punctuation. or do i?".toSentenceCase() }}',
				),
			).toEqual('I am a test! I have multiple types of punctuation. Or do i?');
			expect(evaluate('={{ "i am a test!".toSentenceCase() }}')).toEqual('I am a test!');
			expect(evaluate('={{ "i am a test".toSentenceCase() }}')).toEqual('I am a test');
		});

		test('.extractUrl should work on a string', () => {
			expect(
				evaluate(
					'={{ "I am a test with a url: https://example.net/ and I am a test with an email: test@example.org".extractUrl() }}',
				),
			).toEqual('https://example.net/');
		});

		test('.extractDomain should work on a string', () => {
			expect(evaluate('={{ "test@example.org".extractDomain() }}')).toEqual('example.org');
			expect(evaluate('={{ "https://example.org/".extractDomain() }}')).toEqual('example.org');
		});

		test('.extractEmail should work on a string', () => {
			expect(
				evaluate(
					'={{ "I am a test with a url: https://example.net/ and I am a test with an email: test@example.org".extractEmail() }}',
				),
			).toEqual('test@example.org');
		});

		test('.isEmail should work on a string', () => {
			expect(evaluate('={{ "test@example.com".isEmail() }}')).toEqual(true);
			expect(evaluate('={{ "aaaaaaaa".isEmail() }}')).toEqual(false);
			expect(evaluate('={{ "test @ n8n".isEmail() }}')).toEqual(false);
		});
	});
});
