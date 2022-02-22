import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import {
	apiRequest
} from '../../transport';

import {
	hash,
	normalize
} from '../../methods';

export async function addOperationsToOfflineUserDataJob(this: IExecuteFunctions, index: number, resourceName: string, operation: string): Promise<IDataObject> {
	// https://developers.google.com/google-ads/api/reference/rpc/v9/AddOfflineUserDataJobOperationsRequest

	const customerId = this.getNodeParameter('customerId', index) as string;
	const devToken = this.getNodeParameter('devToken', index) as string;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `${resourceName}:addOperations`;

	const headers = {
		'developer-token': devToken,
		'login-customer-id': customerId,
	} as IDataObject;

	const userIdentifiersArray: IDataObject[] = [];

	// add email as userIdentifier
	const email = this.getNodeParameter('email', index) as IDataObject;
	if (email.metadataValues !== undefined) {
		const normalizedEmail = normalize((email.metadataValues as IDataObject).email as string);

		const hashedEmail = hash(normalizedEmail);

		userIdentifiersArray.push({
			userIdentifierSource: 'UNSPECIFIED',
			hashedEmail,
		});
	}

	// add phoneNumber as userIdentifier
	const phoneNumber = this.getNodeParameter('phoneNumber', index) as IDataObject;
	if (phoneNumber.metadataValues !== undefined) {

		const hashedPhoneNumber = hash((phoneNumber.metadataValues as IDataObject).phoneNumber as string);

		userIdentifiersArray.push({
			userIdentifierSource: 'UNSPECIFIED',
			hashedPhoneNumber,
		});
	}

	// add addressInfo as userIdentifier
	const addressInfo = this.getNodeParameter('addressInfo', index) as IDataObject;
	if (addressInfo.metadataValues !== undefined) {

		const normalizedFirstName = normalize((addressInfo.metadataValues as IDataObject).firstName as string);
		const hashedFirstName = hash(normalizedFirstName);

		const normalizedLastName = normalize((addressInfo.metadataValues as IDataObject).lastName as string);
		const hashedLastName = hash(normalizedLastName);

		const hashedAddressInfo = {
			hashedFirstName,
			hashedLastName,
			countryCode: (addressInfo.metadataValues as IDataObject).countryCode,
			postalCode: (addressInfo.metadataValues as IDataObject).postalCode,
		};

		userIdentifiersArray.push({
			userIdentifierSource: 'UNSPECIFIED',
			addressInfo: hashedAddressInfo,
		});
	}

	let form;
	if (operation === 'create') {
		form = {
			operations: [
				{
					create: {
						userIdentifiers: userIdentifiersArray,
					},
				},
			],
		} as IDataObject;
	} else if (operation === 'remove') {
		form = {
			operations: [
				{
					remove: {
						userIdentifiers: userIdentifiersArray,
					},
				},
			],
		} as IDataObject;
	} else {

	}

	return await apiRequest.call(this, requestMethod, endpoint, form, qs, undefined, headers);
}
