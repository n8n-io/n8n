import { Sha256 } from '@aws-crypto/sha256-js';
import type { KafkaJS } from '@confluentinc/kafka-javascript';
import { UserError } from '@n8n/errors';
import { SignatureV4 } from '@smithy/signature-v4';
import type { HttpRequest, QueryParameterBag } from '@smithy/types';

import { getAwsDomain, type AWSRegion } from '../../../../credentials/common/aws/regions';
import { getSystemCredentials } from '../../../../credentials/common/aws/system-credentials-utils';
import type { KafkaCredentials } from '../../utils';

const SIGNING_SERVICE = 'kafka-cluster';
const CONNECT_ACTION = 'kafka-cluster:Connect';
const TOKEN_TTL_SECONDS = 900;
const USER_AGENT = 'n8n-kafka-msk-iam';
// MSK takes the identity from the signed token. librdkafka still rejects an empty principal.
const PRINCIPAL = 'aws-msk-iam';

type AwsCredentialIdentity = {
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken?: string;
};

async function resolveAwsCredentials(
	credentials: KafkaCredentials,
	region: AWSRegion,
): Promise<AwsCredentialIdentity> {
	if (credentials.awsUseSystemCredentials) {
		const systemCredentials = await getSystemCredentials(region);
		if (!systemCredentials) {
			throw new UserError('No AWS system credentials found for AWS MSK IAM authentication', {
				level: 'warning',
				description:
					'Give the n8n host an AWS identity, for example an IAM role for its service account. Or turn off "Use System Credentials" and enter an access key.',
			});
		}
		return systemCredentials;
	}

	const accessKeyId = credentials.awsAccessKeyId?.trim();
	const secretAccessKey = credentials.awsSecretAccessKey?.trim();
	if (!accessKeyId || !secretAccessKey) {
		throw new UserError(
			'AWS MSK IAM authentication needs an access key ID and a secret access key',
			{
				level: 'warning',
			},
		);
	}
	const sessionToken = credentials.awsSessionToken?.trim();
	return { accessKeyId, secretAccessKey, ...(sessionToken ? { sessionToken } : {}) };
}

/** RFC 3986 encoding, as AWS expects in a presigned URL. */
function escapeUri(value: string): string {
	return encodeURIComponent(value).replace(
		/[!'()*]/g,
		(char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
	);
}

function toQueryString(query: QueryParameterBag): string {
	return Object.keys(query)
		.sort()
		.flatMap((key) => {
			const value = query[key];
			const values = Array.isArray(value) ? value : [value];
			return values.map((item) =>
				item === null ? escapeUri(key) : `${escapeUri(key)}=${escapeUri(item)}`,
			);
		})
		.join('&');
}

/**
 * Builds an AWS MSK IAM OAUTHBEARER token: a SigV4-presigned
 * `kafka-cluster:Connect` URL, base64url-encoded. This is the token format of
 * the AWS MSK IAM SASL signer libraries.
 */
export async function generateMskIamToken(
	credentials: KafkaCredentials,
	now: Date = new Date(),
): Promise<KafkaJS.OauthbearerProviderResponse> {
	const region = credentials.awsRegion;
	if (!region) {
		throw new UserError('AWS MSK IAM authentication needs an AWS Region', { level: 'warning' });
	}

	const hostname = `kafka.${region}.${getAwsDomain(region)}`;
	const signer = new SignatureV4({
		service: SIGNING_SERVICE,
		region,
		credentials: await resolveAwsCredentials(credentials, region),
		sha256: Sha256,
		applyChecksum: false,
	});

	const request: HttpRequest = {
		method: 'GET',
		protocol: 'https:',
		hostname,
		path: '/',
		headers: { host: hostname },
		query: { Action: CONNECT_ACTION },
	};
	const signed = await signer.presign(request, {
		expiresIn: TOKEN_TTL_SECONDS,
		signingDate: now,
	});

	const query = { ...signed.query, 'User-Agent': USER_AGENT };
	const url = `https://${hostname}/?${toQueryString(query)}`;

	// SigV4 signs with second precision, so the token expires relative to the whole second.
	const signedAtMs = Math.floor(now.getTime() / 1000) * 1000;

	return {
		value: Buffer.from(url, 'utf-8').toString('base64url'),
		principal: PRINCIPAL,
		lifetime: signedAtMs + TOKEN_TTL_SECONDS * 1000,
	};
}
