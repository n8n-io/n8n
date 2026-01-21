import basicAuth from 'basic-auth';
import { rm } from 'fs/promises';
import * as jose from 'jose';
import jwt from 'jsonwebtoken';
import { WorkflowConfigurationError } from 'n8n-workflow';
import type {
	IWebhookFunctions,
	INodeExecutionData,
	IDataObject,
	ICredentialDataDecryptedObject,
	MultiPartFormData,
	INode,
} from 'n8n-workflow';
import * as a from 'node:assert';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { BlockList } from 'node:net';

import { WebhookAuthorizationError } from './error';
import { isOidcDiscoveryDocument, type OidcDiscoveryDocument } from './oidc.typeguards';
import { formatPrivateKey } from '../../utils/utilities';

// OIDC cache for performance - stores JWKS clients and discovery documents per URL
const oidcJwksCache = new Map<string, jose.JWTVerifyGetKey>();
const oidcDiscoveryCache = new Map<string, { doc: OidcDiscoveryDocument; expires: number }>();
const DISCOVERY_CACHE_TTL = 3600000; // 1 hour

/**
 * Fetches and caches OIDC discovery document
 */
async function getDiscoveryDocument(discoveryUrl: string): Promise<OidcDiscoveryDocument> {
	const cached = oidcDiscoveryCache.get(discoveryUrl);
	if (cached && cached.expires > Date.now()) {
		return cached.doc;
	}

	const response = await fetch(discoveryUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch OIDC discovery document: ${response.statusText}`);
	}

	const data: unknown = await response.json();
	if (!isOidcDiscoveryDocument(data)) {
		throw new Error('Invalid OIDC discovery document structure');
	}

	oidcDiscoveryCache.set(discoveryUrl, { doc: data, expires: Date.now() + DISCOVERY_CACHE_TTL });
	return data;
}

/**
 * Fetches and caches JWKS for OIDC token validation
 */
async function getOidcJwks(discoveryUrl: string): Promise<jose.JWTVerifyGetKey> {
	if (!oidcJwksCache.has(discoveryUrl)) {
		const discovery = await getDiscoveryDocument(discoveryUrl);
		oidcJwksCache.set(discoveryUrl, jose.createRemoteJWKSet(new URL(discovery.jwks_uri)));
	}
	return oidcJwksCache.get(discoveryUrl)!;
}

export type WebhookParameters = {
	httpMethod: string | string[];
	responseMode: string;
	responseData: string;
	responseCode?: number; //typeVersion <= 1.1
	options?: {
		responseData?: string;
		responseCode?: {
			values?: {
				responseCode: number;
				customCode?: number;
			};
		};
		noResponseBody?: boolean;
	};
};

export const getResponseCode = (parameters: WebhookParameters) => {
	if (parameters.responseCode) {
		return parameters.responseCode;
	}
	const responseCodeOptions = parameters.options;
	if (responseCodeOptions?.responseCode?.values) {
		const { responseCode, customCode } = responseCodeOptions.responseCode.values;

		if (customCode) {
			return customCode;
		}

		return responseCode;
	}
	return 200;
};

export const getResponseData = (parameters: WebhookParameters) => {
	const { responseData, responseMode, options } = parameters;
	if (responseData) return responseData;

	if (responseMode === 'onReceived') {
		const data = options?.responseData;
		if (data) return data;
	}

	if (options?.noResponseBody) return 'noData';

	return undefined;
};

export const configuredOutputs = (parameters: WebhookParameters) => {
	const httpMethod = parameters.httpMethod;

	if (!Array.isArray(httpMethod))
		return [
			{
				type: 'main',
				displayName: httpMethod,
			},
		];

	const outputs = httpMethod.map((method) => {
		return {
			type: 'main',
			displayName: method,
		};
	});

	return outputs;
};

export const setupOutputConnection = (
	ctx: IWebhookFunctions,
	method: string,
	additionalData: {
		jwtPayload?: IDataObject;
	},
) => {
	const httpMethod = ctx.getNodeParameter('httpMethod', []) as string[] | string;
	let webhookUrl = ctx.getNodeWebhookUrl('default') as string;
	const executionMode = ctx.getMode() === 'manual' ? 'test' : 'production';

	if (executionMode === 'test') {
		webhookUrl = webhookUrl.replace('/webhook/', '/webhook-test/');
	}

	// multi methods could be set in settings of node, so we need to check if it's an array
	if (!Array.isArray(httpMethod)) {
		return (outputData: INodeExecutionData): INodeExecutionData[][] => {
			outputData.json.webhookUrl = webhookUrl;
			outputData.json.executionMode = executionMode;
			if (additionalData?.jwtPayload) {
				outputData.json.jwtPayload = additionalData.jwtPayload;
			}
			return [[outputData]];
		};
	}

	const outputIndex = httpMethod.indexOf(method.toUpperCase());
	const outputs: INodeExecutionData[][] = httpMethod.map(() => []);

	return (outputData: INodeExecutionData): INodeExecutionData[][] => {
		outputData.json.webhookUrl = webhookUrl;
		outputData.json.executionMode = executionMode;
		if (additionalData?.jwtPayload) {
			outputData.json.jwtPayload = additionalData.jwtPayload;
		}
		outputs[outputIndex] = [outputData];
		return outputs;
	};
};

export const isIpWhitelisted = (
	whitelist: string | string[] | undefined,
	ips: string[],
	ip?: string,
) => {
	if (whitelist === undefined || whitelist === '') {
		return true;
	}

	if (!Array.isArray(whitelist)) {
		whitelist = whitelist.split(',').map((entry) => entry.trim());
	}

	const allowList = getAllowList(whitelist);

	if (allowList.check(ip ?? '')) {
		return true;
	}

	if (ips.some((ipEntry) => allowList.check(ipEntry))) {
		return true;
	}

	return false;
};

const getAllowList = (whitelist: string[]) => {
	const allowList = new BlockList();

	for (const entry of whitelist) {
		try {
			allowList.addAddress(entry);
		} catch {
			// Ignore invalid entries
		}
	}

	return allowList;
};

export const checkResponseModeConfiguration = (context: IWebhookFunctions) => {
	const responseMode = context.getNodeParameter('responseMode', 'onReceived') as string;
	const connectedNodes = context.getChildNodes(context.getNode().name);

	const isRespondToWebhookConnected = connectedNodes.some(
		(node) => node.type === 'n8n-nodes-base.respondToWebhook',
	);

	if (!isRespondToWebhookConnected && responseMode === 'responseNode') {
		throw new WorkflowConfigurationError(
			context.getNode(),
			new Error('No Respond to Webhook node found in the workflow'),
			{
				description:
					'Insert a Respond to Webhook node to your workflow to respond to the webhook or choose another option for the “Respond” parameter',
			},
		);
	}

	if (isRespondToWebhookConnected && !['responseNode', 'streaming'].includes(responseMode)) {
		throw new WorkflowConfigurationError(
			context.getNode(),
			new Error('Unused Respond to Webhook node found in the workflow'),
			{
				description:
					'Set the “Respond” parameter to “Using Respond to Webhook Node” or remove the Respond to Webhook node',
			},
		);
	}
};

export async function validateWebhookAuthentication(
	ctx: IWebhookFunctions,
	authPropertyName: string,
) {
	const authentication = ctx.getNodeParameter(authPropertyName) as string;
	if (authentication === 'none') return;

	const req = ctx.getRequestObject();
	const headers = ctx.getHeaderData();

	if (authentication === 'basicAuth') {
		// Basic authorization is needed to call webhook
		let expectedAuth: ICredentialDataDecryptedObject | undefined;
		try {
			expectedAuth = await ctx.getCredentials<ICredentialDataDecryptedObject>('httpBasicAuth');
		} catch {}

		if (expectedAuth === undefined || !expectedAuth.user || !expectedAuth.password) {
			// Data is not defined on node so can not authenticate
			throw new WebhookAuthorizationError(500, 'No authentication data defined on node!');
		}

		const providedAuth = basicAuth(req);
		// Authorization data is missing
		if (!providedAuth) {
			const authToken = headers['x-auth-token'];
			if (!authToken) {
				throw new WebhookAuthorizationError(401);
			}

			const expectedAuthToken = generateBasicAuthToken(ctx.getNode(), expectedAuth);
			if (
				!expectedAuthToken ||
				typeof authToken !== 'string' ||
				expectedAuthToken.length !== authToken.length ||
				!timingSafeEqual(Buffer.from(expectedAuthToken), Buffer.from(authToken))
			) {
				throw new WebhookAuthorizationError(403);
			}
		} else if (
			providedAuth.name !== expectedAuth.user ||
			providedAuth.pass !== expectedAuth.password
		) {
			// Provided authentication data is wrong
			throw new WebhookAuthorizationError(403);
		}
	} else if (authentication === 'bearerAuth') {
		let expectedAuth: ICredentialDataDecryptedObject | undefined;
		try {
			expectedAuth = await ctx.getCredentials<ICredentialDataDecryptedObject>('httpBearerAuth');
		} catch {}

		const expectedToken = expectedAuth?.token as string;
		if (!expectedToken) {
			throw new WebhookAuthorizationError(500, 'No authentication data defined on node!');
		}

		if (headers.authorization !== `Bearer ${expectedToken}`) {
			throw new WebhookAuthorizationError(403);
		}
	} else if (authentication === 'headerAuth') {
		// Special header with value is needed to call webhook
		let expectedAuth: ICredentialDataDecryptedObject | undefined;
		try {
			expectedAuth = await ctx.getCredentials<ICredentialDataDecryptedObject>('httpHeaderAuth');
		} catch {}

		if (expectedAuth === undefined || !expectedAuth.name || !expectedAuth.value) {
			// Data is not defined on node so can not authenticate
			throw new WebhookAuthorizationError(500, 'No authentication data defined on node!');
		}
		const headerName = (expectedAuth.name as string).toLowerCase();
		const expectedValue = expectedAuth.value as string;

		if (
			!headers.hasOwnProperty(headerName) ||
			(headers as IDataObject)[headerName] !== expectedValue
		) {
			// Provided authentication data is wrong
			throw new WebhookAuthorizationError(403);
		}
	} else if (authentication === 'jwtAuth') {
		let expectedAuth;

		try {
			expectedAuth = await ctx.getCredentials<{
				keyType: 'passphrase' | 'pemKey';
				publicKey: string;
				secret: string;
				algorithm: jwt.Algorithm;
			}>('jwtAuth');
		} catch {}

		if (expectedAuth === undefined) {
			// Data is not defined on node so can not authenticate
			throw new WebhookAuthorizationError(500, 'No authentication data defined on node!');
		}

		const authHeader = req.headers.authorization;
		const token = authHeader?.split(' ')[1];

		if (!token) {
			throw new WebhookAuthorizationError(401, 'No token provided');
		}

		let secretOrPublicKey;

		if (expectedAuth.keyType === 'passphrase') {
			secretOrPublicKey = expectedAuth.secret;
		} else {
			secretOrPublicKey = formatPrivateKey(expectedAuth.publicKey, true);
		}

		try {
			return jwt.verify(token, secretOrPublicKey, {
				algorithms: [expectedAuth.algorithm],
			}) as IDataObject;
		} catch (error) {
			throw new WebhookAuthorizationError(403, error.message);
		}
	} else if (authentication === 'oidcAuth') {
		// OIDC authentication - validate Bearer token using IdP's JWKS
		let oidcConfig: {
			discoveryUrl: string;
			clientId?: string;
			issuer?: string;
			audience?: string;
		};

		try {
			oidcConfig = await ctx.getCredentials<{
				discoveryUrl: string;
				clientId?: string;
				issuer?: string;
				audience?: string;
			}>('oidcWebhookAuth');
		} catch {
			throw new WebhookAuthorizationError(500, 'No OIDC authentication data defined on node!');
		}

		if (!oidcConfig?.discoveryUrl) {
			throw new WebhookAuthorizationError(500, 'OIDC configuration incomplete - Discovery URL required');
		}

		const authHeader = req.headers.authorization;
		const token = authHeader?.split(' ')[1];

		if (!token) {
			throw new WebhookAuthorizationError(401, 'No Bearer token provided');
		}

		try {
			// Fetch discovery document and JWKS
			const discovery = await getDiscoveryDocument(oidcConfig.discoveryUrl);
			const jwks = await getOidcJwks(oidcConfig.discoveryUrl);

			// Build verification options with fallbacks from discovery document
			const verifyOptions: jose.JWTVerifyOptions = {
				// Use configured issuer or fall back to discovery document issuer
				issuer: oidcConfig.issuer || discovery.issuer,
				// Use configured audience or fall back to clientId
				audience: oidcConfig.audience || oidcConfig.clientId,
			};

			const { payload } = await jose.jwtVerify(token, jwks, verifyOptions);
			// Convert JWTPayload to IDataObject - only include JSON-safe values
			const result: IDataObject = {};
			for (const [key, value] of Object.entries(payload)) {
				if (value === undefined) continue;
				// JWT claims are JSON values: string, number, boolean, object, array, or null
				if (
					typeof value === 'string' ||
					typeof value === 'number' ||
					typeof value === 'boolean' ||
					value === null ||
					typeof value === 'object'
				) {
					result[key] = value;
				}
			}
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Token validation failed';
			throw new WebhookAuthorizationError(403, errorMessage);
		}
	}
}

export async function handleFormData(
	context: IWebhookFunctions,
	prepareOutput: (data: INodeExecutionData) => INodeExecutionData[][],
) {
	const req = context.getRequestObject() as MultiPartFormData.Request;
	a.ok(req.contentType === 'multipart/form-data', 'Expected multipart/form-data');
	const options = context.getNodeParameter('options', {}) as IDataObject;
	const { data, files } = req.body;

	const returnItem: INodeExecutionData = {
		json: {
			headers: req.headers,
			params: req.params,
			query: req.query,
			body: data,
		},
	};

	if (files && Object.keys(files).length) {
		returnItem.binary = {};
	}

	let count = 0;

	for (const key of Object.keys(files)) {
		const processFiles: MultiPartFormData.File[] = [];
		let multiFile = false;
		if (Array.isArray(files[key])) {
			processFiles.push.apply(processFiles, files[key]);
			multiFile = true;
		} else {
			processFiles.push(files[key]);
		}

		let fileCount = 0;
		for (const file of processFiles) {
			let binaryPropertyName = key;
			if (binaryPropertyName.endsWith('[]')) {
				binaryPropertyName = binaryPropertyName.slice(0, -2);
			}
			if (!binaryPropertyName.trim().length) {
				binaryPropertyName = `data${count}`;
			} else if (multiFile) {
				binaryPropertyName += fileCount++;
			}
			if (options.binaryPropertyName) {
				binaryPropertyName = `${options.binaryPropertyName}${count}`;
			}

			returnItem.binary![binaryPropertyName] = await context.nodeHelpers.copyBinaryFile(
				file.filepath,
				file.originalFilename ?? file.newFilename,
				file.mimetype,
			);

			// Delete original file to prevent tmp directory from growing too large
			await rm(file.filepath, { force: true });

			count += 1;
		}
	}

	return { workflowData: prepareOutput(returnItem) };
}

export async function generateFormPostBasicAuthToken(
	context: IWebhookFunctions,
	authPropertyName: string,
) {
	const node = context.getNode();

	const authentication = context.getNodeParameter(authPropertyName);
	if (authentication === 'none') return;

	let credentials: ICredentialDataDecryptedObject | undefined;

	try {
		credentials = await context.getCredentials<ICredentialDataDecryptedObject>('httpBasicAuth');
	} catch {}

	return generateBasicAuthToken(node, credentials);
}

export function generateBasicAuthToken(
	node: INode,
	credentials: ICredentialDataDecryptedObject | undefined,
) {
	if (!credentials || !credentials.user || !credentials.password) {
		return;
	}

	const token = createHmac('sha256', `${credentials.user}:${credentials.password}`)
		.update(`${node.id}-${node.webhookId}`)
		.digest('hex');

	return token;
}
