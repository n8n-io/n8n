import * as crypto from 'crypto';
import * as querystring from 'querystring';

export const HeaderConstants = {
	// Required
	AUTHORIZATION: 'Authorization',
	CONTENT_TYPE: 'Content-Type',
	X_MS_DATE: 'x-ms-date',
	X_MS_VERSION: 'x-ms-version',

	//Required - for session consistency only
	X_MS_SESSION_TOKEN: 'x-ms-session-token',

	// Optional
	IF_MATCH: 'If-Match',
	IF_NONE_MATCH: 'If-None-Match',
	IF_MODIFIED_SINCE: 'If-Modified-Since',
	USER_AGENT: 'User-Agent',
	X_MS_ACTIVITY_ID: 'x-ms-activity-id',
	X_MS_CONSISTENCY_LEVEL: 'x-ms-consistency-level',
	X_MS_CONTINUATION: 'x-ms-continuation',
	X_MS_MAX_ITEM_COUNT: 'x-ms-max-item-count',
	X_MS_DOCUMENTDB_PARTITIONKEY: 'x-ms-documentdb-partitionkey',
	X_MS_DOCUMENTDB_QUERY_ENABLECROSSPARTITION: 'x-ms-documentdb-query-enablecrosspartition',
	A_IM: 'A-IM',
	X_MS_DOCUMENTDB_PARTITIONKEYRANGEID: 'x-ms-documentdb-partitionkeyrangeid',
	X_MS_COSMOS_ALLOW_TENTATIVE_WRITES: 'x-ms-cosmos-allow-tentative-writes',

	PREFIX_FOR_STORAGE: 'x-ms-',
};

export function getAuthorizationTokenUsingMasterKey(
	verb: string,
	resourceType: string,
	resourceLink: string,
	date: string,
	masterKey: string,
): string {
	const key = Buffer.from(masterKey, 'base64');

	const payload =
		`${verb.toLowerCase()}\n` +
		`${resourceType.toLowerCase()}\n` +
		`${resourceLink}\n` +
		`${date.toLowerCase()}\n` +
		'\n';

	const hmacSha256 = crypto.createHmac('sha256', key);
	const hashPayload = hmacSha256.update(payload, 'utf8').digest('base64');

	const authorizationString = querystring.escape(`type=master&ver=1.0&sig=${hashPayload}`);

	return authorizationString;
}
