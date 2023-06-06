import crypto from 'crypto';
import moment from 'moment';
import jwt from 'jsonwebtoken';
import type { IHttpRequestOptions } from 'n8n-workflow';

export const verifyCrmToken = async (
	token: string,
	requestHandler: (opt: IHttpRequestOptions) => Promise<any>,
) => {
	if (!token) throw new Error('Token is missing');
	const signatureWithData = Buffer.from(token, 'base64').toString('utf8');
	const [signature, timestamp, userObjectString] = signatureWithData.split('|');

	const signatureData = `${timestamp}|${userObjectString}`;

	const createdSignature = crypto
		.createHmac('sha1', process.env.ZOHO_CRM_SECRET_KEY!)
		.update(signatureData)
		.digest('base64');
	if (createdSignature !== signature) throw new Error('Token is invalid');
	if (moment(Number(timestamp)).add(10, 'hours').isBefore(moment()))
		throw new Error('Token has expired');

	const blockedTokenUrl = process.env.BLOCKED_TOKEN_TABLE_LIST_URL;
	if (blockedTokenUrl) {
		const response = await requestHandler({
			url: `${blockedTokenUrl}?where=(Token,eq,${token})`,
			method: 'GET',
			headers: {
				'xc-token': process.env.DCS_NOCODB_API_TOKEN,
			},
		});
		if (response?.list?.length) throw new Error('Token is invalid');
	}
	return {
		tokenDetails: {
			token,
			generatedAt: Number(timestamp),
		},
		// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
		zohoUser: JSON.parse(userObjectString),
	};
};

export const verifyPortalToken = async (
	token: string,
	requestHandler: (opt: IHttpRequestOptions) => Promise<any>,
) => {
	if (!token) throw new Error('Token is missing');
	const blockedTokenUrl = process.env.BLOCKED_TOKEN_TABLE_LIST_URL;
	if (blockedTokenUrl) {
		const response = await requestHandler({
			url: `${blockedTokenUrl}?where=(Token,eq,${token})`,
			method: 'GET',
			headers: {
				'xc-token': process.env.DCS_NOCODB_API_TOKEN,
			},
		});
		if (response?.list?.length) throw new Error('Token is invalid');
	}
	return new Promise<Record<string, string>>((resolve, reject) => {
		jwt.verify(token, process.env.JWT_SECRET!, (err, decodedToken: any) => {
			if (err && err.name === 'TokenExpiredError') reject('Token has expired');
			else if (err || !decodedToken.userID) reject('Token is invalid');
			else {
				const response = { ...decodedToken };
				const userTableUrl = process.env.USER_TABLE_FIND_ONE_URL;
				requestHandler({
					url: `${userTableUrl}?where=(Id,eq,${decodedToken.userID})`,
					method: 'GET',
					headers: {
						'xc-token': process.env.DCS_NOCODB_API_TOKEN,
					},
				})
					.finally()
					.then((userRecord) => {
						if (!userRecord?.Id) reject('User does not exist');
						else if (!userRecord.IsActive) reject('The user is not active');
						else {
							response.contactID = userRecord?.Contact?.Id;
							// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
							resolve(response);
						}
					})
					.catch((error) => {
						const message = error?.message || error?.toString();
						reject('Error fetching user details' + (message ? ` : ${message}` : ''));
					});
			}
		});
	});
};
