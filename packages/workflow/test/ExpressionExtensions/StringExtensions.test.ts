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
			expect(evaluate('={{ "http://example.com/".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "ftp://example.com/".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "example.com".isUrl() }}')).toEqual(false);
			expect(evaluate('={{ "www.example.com".isUrl() }}')).toEqual(false);
			expect(evaluate('={{ "https://www.example.com/".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "https://example.com/path".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "https://example.com/path?query=1".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "https://example.com/path#fragment".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "https://example.com:8080".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "https://example.com?query=1".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "https://example.com#fragment".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "example.com/path".isUrl() }}')).toEqual(false);
			expect(evaluate('={{ "http:///".isUrl() }}')).toEqual(false);
			expect(evaluate('={{ "https://".isUrl() }}')).toEqual(false);
			expect(evaluate('={{ "example".isUrl() }}')).toEqual(false);
			expect(evaluate('={{ "".isUrl() }}')).toEqual(false);
		});

		test('.isDomain should work on a string', () => {
			expect(evaluate('={{ "example.com".isDomain() }}')).toEqual(true);
			expect(evaluate('={{ "asdf".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "https://example.com/".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "www.example.com".isDomain() }}')).toEqual(true);
			expect(evaluate('={{ "subdomain.example.com".isDomain() }}')).toEqual(true);
			expect(evaluate('={{ "example.co.uk".isDomain() }}')).toEqual(true);
			expect(evaluate('={{ "example".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "example.".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ ".com".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "example..com".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "example_com".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "example/com".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "example com".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "www.example..com".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "123.com".isDomain() }}')).toEqual(true);
			expect(evaluate('={{ "xn--80aswg.xn--p1ai".isDomain() }}')).toEqual(true); // Punycode domain
			expect(evaluate('={{ "example.com:8080".isDomain() }}')).toEqual(true);
			expect(evaluate('={{ "".isDomain() }}')).toEqual(false);
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
			expect(evaluate('={{ "Check this out: https://subdomain.example.com:3000/path?q=1#hash".extractUrl() }}')).toEqual('https://subdomain.example.com:3000/path?q=1#hash');
			expect(evaluate('={{ "Invalid URL: http:///example.com".extractUrl() }}')).toEqual(undefined);
			expect(evaluate('={{ "Mixed content: https://www.example.com and http://www.example.org".extractUrl() }}')).toEqual('https://www.example.com');
			expect(evaluate('={{ "Text without URL: This is just a simple text".extractUrl() }}')).toEqual(undefined);
			expect(evaluate('={{ "URL with Unicode: http://www.xn--80aswg.xn--j1amh".extractUrl() }}')).toEqual('http://www.xn--80aswg.xn--j1amh');
			expect(evaluate('={{ "Localhost URL: http://localhost:8080/test?x=1".extractUrl() }}')).toEqual('http://localhost:8080/test?x=1');
			expect(evaluate('={{ "IP URL: http://192.168.1.1:8000/path?q=value#frag".extractUrl() }}')).toEqual('http://192.168.1.1:8000/path?q=value#frag');
		});

		test('.extractDomain should work on a string', () => {
			expect(evaluate('={{ "test@example.org".extractDomain() }}')).toEqual('example.org');
			expect(evaluate('={{ "https://example.org/".extractDomain() }}')).toEqual('example.org');
			expect(evaluate('={{ "https://www.google.com".extractDomain() }}')).toEqual('www.google.com');
			expect(evaluate('={{ "http://example.org".extractDomain() }}')).toEqual('example.org');
			expect(evaluate('={{ "ftp://ftp.example.com".extractDomain() }}')).toEqual('ftp.example.com');
			expect(evaluate('={{ "google.com".extractDomain() }}')).toEqual('google.com');
			expect(evaluate('={{ "www.example.net".extractDomain() }}')).toEqual('www.example.net');
			expect(evaluate('={{ "//example.com".extractDomain() }}')).toEqual('example.com');
			expect(evaluate('={{ "mailto:john.doe@example.com".extractDomain() }}')).toEqual('example.com');
			expect(evaluate('={{ "tel:+1-555-123-4567".extractDomain() }}')).toEqual(undefined);
			expect(evaluate('={{ "jane.doe@example.org".extractDomain() }}')).toEqual('example.org');
			expect(evaluate('={{ "name+tag@example.com".extractDomain() }}')).toEqual('example.com');
			expect(evaluate('={{ "first.last@example.co.uk".extractDomain() }}')).toEqual('example.co.uk');
			expect(evaluate('={{ "user@subdomain.example.com".extractDomain() }}')).toEqual('subdomain.example.com');
			expect(evaluate('={{ "www.example.net?test=1213".extractDomain() }}')).toEqual('www.example.net');
			expect(evaluate('={{ "www.example.net?test".extractDomain() }}')).toEqual('www.example.net');
			expect(evaluate('={{ "www.example.net#tesdt123".extractDomain() }}')).toEqual('www.example.net');
			expect(evaluate('={{ "https://www.example.net?test=1213".extractDomain() }}')).toEqual('www.example.net');
			expect(evaluate('={{ "https://www.example.net?test".extractDomain() }}')).toEqual('www.example.net');
			expect(evaluate('={{ "https://www.example.net#tesdt123".extractDomain() }}')).toEqual('www.example.net');
			expect(evaluate('={{ "https://192.168.1.1".extractDomain() }}')).toEqual('192.168.1.1');
			expect(evaluate('={{ "http://www.xn--80aswg.xn--j1amh".extractDomain() }}')).toEqual('www.xn--80aswg.xn--j1amh');
			expect(evaluate('={{ "https://localhost".extractDomain() }}')).toEqual('localhost');
			expect(evaluate('={{ "https://localhost?test=123".extractDomain() }}')).toEqual('localhost');
			expect(evaluate('={{ "https://www.example_with_underscore.com".extractDomain() }}')).toEqual('www.example_with_underscore.com');
			expect(evaluate('={{ "https://www.example.com:8080".extractDomain() }}')).toEqual('www.example.com');
			expect(evaluate('={{ "https://example.space".extractDomain() }}')).toEqual('example.space');
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
