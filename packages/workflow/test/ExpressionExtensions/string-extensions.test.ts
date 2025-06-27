// @vitest-environment jsdom
import { DateTime } from 'luxon';

import { evaluate } from './helpers';
import { ExpressionExtensionError } from '../../src/errors';

describe('Data Transformation Functions', () => {
	describe('String Data Transformation Functions', () => {
		describe('.isEmpty', () => {
			test('should work correctly on a string that is not empty', () => {
				expect(evaluate('={{"NotBlank".isEmpty()}}')).toEqual(false);
			});

			test('should work correctly on a string that is empty', () => {
				expect(evaluate('={{"".isEmpty()}}')).toEqual(true);
			});
		});

		describe('.isNotEmpty', () => {
			test('should work correctly on a string that is not empty', () => {
				expect(evaluate('={{"NotBlank".isNotEmpty()}}')).toEqual(true);
			});

			test('should work correctly on a string that is empty', () => {
				expect(evaluate('={{"".isNotEmpty()}}')).toEqual(false);
			});
		});

		test('.length should return the string length', () => {
			expect(evaluate('={{"String".length()}}')).toEqual(6);
		});

		describe('.hash()', () => {
			test.each([
				['base64', 'MTIzNDU='],
				['md5', '827ccb0eea8a706c4c34a16891f84e7b'],
				['sha1', '8cb2237d0679ca88db6464eac60da96345513964'],
				['sha224', 'a7470858e79c282bc2f6adfd831b132672dfd1224c1e78cbf5bcd057'],
				['sha256', '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5'],
				[
					'sha384',
					'0fa76955abfa9dafd83facca8343a92aa09497f98101086611b0bfa95dbc0dcc661d62e9568a5a032ba81960f3e55d4a',
				],
				[
					'sha512',
					'3627909a29c31381a071ec27f7c9ca97726182aed29a7ddd2e54353322cfb30abb9e3a6df2ac2c20fe23436311d678564d0c8d305930575f60e2d3d048184d79',
				],
				[
					'sha3',
					'0a2a1719bf3ce682afdbedf3b23857818d526efbe7fcb372b31347c26239a0f916c398b7ad8dd0ee76e8e388604d0b0f925d5e913ad2d3165b9b35b3844cd5e6',
				],
			])('should work for %p', (hashFn, hashValue) => {
				expect(evaluate(`={{ "12345".hash("${hashFn}") }}`)).toEqual(hashValue);
				expect(evaluate(`={{ "12345".hash("${hashFn.toLowerCase()}") }}`)).toEqual(hashValue);
			});

			test('should throw on invalid algorithm', () => {
				expect(() => evaluate('={{ "12345".hash("invalid") }}')).toThrow('Unknown algorithm');
			});
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

		describe('.toDate', () => {
			test('should work correctly on a date string', () => {
				expect(evaluate('={{ "2022-09-01T19:42:28.164Z".toDate() }}')).toEqual(
					new Date('2022-09-01T19:42:28.164Z'),
				);
			});

			test('should throw on invalid date', () => {
				expect(() => evaluate('={{ "2022-09-32T19:42:28.164Z".toDate() }}')).toThrow(
					'cannot convert to date',
				);
			});
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
			expect(
				evaluate(
					'={{ "Check this out: https://subdomain.example.com:3000/path?q=1#hash".extractUrl() }}',
				),
			).toEqual('https://subdomain.example.com:3000/path?q=1#hash');
			expect(evaluate('={{ "Invalid URL: http:///example.com".extractUrl() }}')).toEqual(undefined);
			expect(
				evaluate(
					'={{ "Mixed content: https://www.example.com and http://www.example.org".extractUrl() }}',
				),
			).toEqual('https://www.example.com');
			expect(
				evaluate('={{ "Text without URL: This is just a simple text".extractUrl() }}'),
			).toEqual(undefined);
			expect(
				evaluate('={{ "URL with Unicode: http://www.xn--80aswg.xn--j1amh".extractUrl() }}'),
			).toEqual('http://www.xn--80aswg.xn--j1amh');
			expect(
				evaluate('={{ "Localhost URL: http://localhost:8080/test?x=1".extractUrl() }}'),
			).toEqual('http://localhost:8080/test?x=1');
			expect(
				evaluate('={{ "IP URL: http://192.168.1.1:8000/path?q=value#frag".extractUrl() }}'),
			).toEqual('http://192.168.1.1:8000/path?q=value#frag');
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
			expect(evaluate('={{ "mailto:john.doe@example.com".extractDomain() }}')).toEqual(
				'example.com',
			);
			expect(evaluate('={{ "tel:+1-555-123-4567".extractDomain() }}')).toEqual(undefined);
			expect(evaluate('={{ "jane.doe@example.org".extractDomain() }}')).toEqual('example.org');
			expect(evaluate('={{ "name+tag@example.com".extractDomain() }}')).toEqual('example.com');
			expect(evaluate('={{ "first.last@example.co.uk".extractDomain() }}')).toEqual(
				'example.co.uk',
			);
			expect(evaluate('={{ "user@subdomain.example.com".extractDomain() }}')).toEqual(
				'subdomain.example.com',
			);
			expect(evaluate('={{ "www.example.net?test=1213".extractDomain() }}')).toEqual(
				'www.example.net',
			);
			expect(evaluate('={{ "www.example.net?test".extractDomain() }}')).toEqual('www.example.net');
			expect(evaluate('={{ "www.example.net#tesdt123".extractDomain() }}')).toEqual(
				'www.example.net',
			);
			expect(evaluate('={{ "https://www.example.net?test=1213".extractDomain() }}')).toEqual(
				'www.example.net',
			);
			expect(evaluate('={{ "https://www.example.net?test".extractDomain() }}')).toEqual(
				'www.example.net',
			);
			expect(evaluate('={{ "https://www.example.net#tesdt123".extractDomain() }}')).toEqual(
				'www.example.net',
			);
			expect(evaluate('={{ "https://192.168.1.1".extractDomain() }}')).toEqual('192.168.1.1');
			expect(evaluate('={{ "http://www.xn--80aswg.xn--j1amh".extractDomain() }}')).toEqual(
				'www.xn--80aswg.xn--j1amh',
			);
			expect(evaluate('={{ "https://localhost".extractDomain() }}')).toEqual('localhost');
			expect(evaluate('={{ "https://localhost?test=123".extractDomain() }}')).toEqual('localhost');
			expect(evaluate('={{ "https://www.example_with_underscore.com".extractDomain() }}')).toEqual(
				'www.example_with_underscore.com',
			);
			expect(evaluate('={{ "https://www.example.com:8080".extractDomain() }}')).toEqual(
				'www.example.com',
			);
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

		test('.toDateTime should work on a variety of formats', () => {
			expect(evaluate('={{ "Wed, 21 Oct 2015 07:28:00 GMT".toDateTime() }}')).toBeInstanceOf(
				DateTime,
			);
			expect(evaluate('={{ "2008-11-11".toDateTime() }}')).toBeInstanceOf(DateTime);
			expect(evaluate('={{ "1-Feb-2024".toDateTime() }}')).toBeInstanceOf(DateTime);
			expect(evaluate('={{ "1713976144063".toDateTime("ms") }}')).toBeInstanceOf(DateTime);
			expect(evaluate('={{ "31-01-2024".toDateTime("dd-MM-yyyy") }}')).toBeInstanceOf(DateTime);

			vi.useFakeTimers({ now: new Date() });
			expect(() => evaluate('={{ "hi".toDateTime() }}')).toThrow(
				new ExpressionExtensionError('cannot convert to Luxon DateTime'),
			);
			vi.useRealTimers();
		});

		test('.extractUrlPath should work on a string', () => {
			expect(
				evaluate('={{ "https://example.com/orders/1/detail#hash?foo=bar".extractUrlPath() }}'),
			).toEqual('/orders/1/detail');
			expect(evaluate('={{ "hi".extractUrlPath() }}')).toBeUndefined();
		});

		test('.parseJson should work on a string', () => {
			expect(evaluate('={{ \'{"test1":1,"test2":"2"}\'.parseJson() }}')).toEqual({
				test1: 1,
				test2: '2',
			});
		});

		test('.parseJson should throw on invalid JSON', () => {
			expect(() => evaluate("={{ \"{'test1':1,'test2':'2'}\".parseJson() }}")).toThrowError(
				"Parsing failed. Check you're using double quotes",
			);
			expect(() => evaluate('={{ "No JSON here".parseJson() }}')).toThrowError('Parsing failed');
		});

		test('.toJsonString should work on a string', () => {
			expect(evaluate('={{ "test".toJsonString() }}')).toEqual(JSON.stringify('test'));
			expect(evaluate('={{ "The \\"best\\" colours: red\\nbrown".toJsonString() }}')).toEqual(
				JSON.stringify('The "best" colours: red\nbrown'),
			);
			expect(evaluate('={{ "".toJsonString() }}')).toEqual(JSON.stringify(''));
		});

		test('.toBoolean should work on a string', () => {
			expect(evaluate('={{ "False".toBoolean() }}')).toBe(false);
			expect(evaluate('={{ "".toBoolean() }}')).toBe(false);
			expect(evaluate('={{ "0".toBoolean() }}')).toBe(false);
			expect(evaluate('={{ "no".toBoolean() }}')).toBe(false);
			expect(evaluate('={{ "TRUE".toBoolean() }}')).toBe(true);
			expect(evaluate('={{ "hello".toBoolean() }}')).toBe(true);
		});

		test('.base64Encode should work on a string', () => {
			expect(evaluate('={{ "n8n test".base64Encode() }}')).toBe('bjhuIHRlc3Q=');
		});

		test('.base64Decode should work on a string', () => {
			expect(evaluate('={{ "bjhuIHRlc3Q=".base64Decode() }}')).toBe('n8n test');
		});
	});
});
