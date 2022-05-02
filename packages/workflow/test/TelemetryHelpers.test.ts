import { v5 as uuidv5, v3 as uuidv3, v4 as uuidv4, v1 as uuidv1 } from 'uuid';
import {
	ANONYMIZATION_CHARACTER as CHAR,
	getDomainBase,
	getDomainPath,
} from '../src/TelemetryHelpers';

describe('getDomainBase should return protocol plus domain', () => {
	test('in valid URLs', () => {
		for (const url of validUrls(numericId)) {
			const { full, protocolPlusDomain } = url;
			expect(getDomainBase(full)).toBe(protocolPlusDomain);
		}
	});

	test('in malformed URLs', () => {
		for (const url of malformedUrls(numericId)) {
			const { full, protocolPlusDomain } = url;
			expect(getDomainBase(full)).toBe(protocolPlusDomain);
		}
	});
});

describe('getDomainPath should return pathname plus query string', () => {
	describe('anonymizing numeric IDs', () => {
		test('in valid URLs', () => {
			for (const url of validUrls(numericId)) {
				const { full, pathnamePlusQs } = url;
				expect(getDomainPath(full)).toBe(pathnamePlusQs);
			}
		});

		test('in malformed URLs', () => {
			for (const url of malformedUrls(numericId)) {
				const { full, pathnamePlusQs } = url;
				expect(getDomainPath(full)).toBe(pathnamePlusQs);
			}
		});
	});

	describe('anonymizing UUIDs', () => {
		test('in valid URLs', () => {
			for (const url of uuidUrls(validUrls)) {
				const { full, pathnamePlusQs } = url;
				expect(getDomainPath(full)).toBe(pathnamePlusQs);
			}
		});

		test('in malformed URLs', () => {
			for (const url of uuidUrls(malformedUrls)) {
				const { full, pathnamePlusQs } = url;
				expect(getDomainPath(full)).toBe(pathnamePlusQs);
			}
		});
	});

	describe('anonymizing emails', () => {
		test('in valid URLs', () => {
			for (const url of validUrls(email)) {
				const { full, pathnamePlusQs } = url;
				expect(getDomainPath(full)).toBe(pathnamePlusQs);
			}
		});

		test('in malformed URLs', () => {
			for (const url of malformedUrls(email)) {
				const { full, pathnamePlusQs } = url;
				expect(getDomainPath(full)).toBe(pathnamePlusQs);
			}
		});
	});
});

function validUrls(idMaker: typeof numericId | typeof email, char = CHAR) {
	const firstId = idMaker();
	const secondId = idMaker();
	const firstIdObscured = char.repeat(firstId.length);
	const secondIdObscured = char.repeat(secondId.length);

	return [
		{
			full: `https://test.com/api/v1/users/${firstId}`,
			protocolPlusDomain: 'https://test.com',
			pathnamePlusQs: `/api/v1/users/${firstIdObscured}`,
		},
		{
			full: `https://test.com/api/v1/users/${firstId}/`,
			protocolPlusDomain: 'https://test.com',
			pathnamePlusQs: `/api/v1/users/${firstIdObscured}/`,
		},
		{
			full: `https://test.com/api/v1/users/${firstId}/posts/${secondId}`,
			protocolPlusDomain: 'https://test.com',
			pathnamePlusQs: `/api/v1/users/${firstIdObscured}/posts/${secondIdObscured}`,
		},
		{
			full: `https://test.com/api/v1/users/${firstId}/posts/${secondId}/`,
			protocolPlusDomain: 'https://test.com',
			pathnamePlusQs: `/api/v1/users/${firstIdObscured}/posts/${secondIdObscured}/`,
		},
		{
			full: `https://test.com/api/v1/users/${firstId}/posts/${secondId}/`,
			protocolPlusDomain: 'https://test.com',
			pathnamePlusQs: `/api/v1/users/${firstIdObscured}/posts/${secondIdObscured}/`,
		},
		{
			full: `https://test.com/api/v1/users?id=${firstId}`,
			protocolPlusDomain: 'https://test.com',
			pathnamePlusQs: `/api/v1/users?id=${firstIdObscured}`,
		},
		{
			full: `https://test.com/api/v1/users?id=${firstId}&post=${secondId}`,
			protocolPlusDomain: 'https://test.com',
			pathnamePlusQs: `/api/v1/users?id=${firstIdObscured}&post=${secondIdObscured}`,
		},
	];
}

function malformedUrls(idMaker: typeof numericId | typeof email, char = CHAR) {
	const firstId = idMaker();
	const secondId = idMaker();
	const firstIdObscured = char.repeat(firstId.length);
	const secondIdObscured = char.repeat(secondId.length);

	return [
		{
			full: `test.com/api/v1/users/${firstId}/posts/${secondId}/`,
			protocolPlusDomain: 'test.com',
			pathnamePlusQs: `/api/v1/users/${firstIdObscured}/posts/${secondIdObscured}/`,
		},
		{
			full: `htp://test.com/api/v1/users/${firstId}/posts/${secondId}/`,
			protocolPlusDomain: 'htp://test.com',
			pathnamePlusQs: `/api/v1/users/${firstIdObscured}/posts/${secondIdObscured}/`,
		},
		{
			full: `test.com/api/v1/users?id=${firstId}`,
			protocolPlusDomain: 'test.com',
			pathnamePlusQs: `/api/v1/users?id=${firstIdObscured}`,
		},
		{
			full: `test.com/api/v1/users?id=${firstId}&post=${secondId}`,
			protocolPlusDomain: 'test.com',
			pathnamePlusQs: `/api/v1/users?id=${firstIdObscured}&post=${secondIdObscured}`,
		},
	];
}

const email = () => encodeURIComponent('test@test.com');

function uuidUrls(
	urlsMaker: typeof validUrls | typeof malformedUrls,
	baseName = 'test',
	namespaceUuid = uuidv4(),
) {
	return [
		...urlsMaker(() => uuidv5(baseName, namespaceUuid)),
		...urlsMaker(uuidv4),
		...urlsMaker(() => uuidv3(baseName, namespaceUuid)),
		...urlsMaker(uuidv1),
	];
}

function digit() {
	return Math.floor(Math.random() * 10);
}

function positiveDigit(): number {
	const d = digit();

	return d === 0 ? positiveDigit() : d;
}

function numericId(length = positiveDigit()) {
	return Array.from({ length }, digit).join('');
}
