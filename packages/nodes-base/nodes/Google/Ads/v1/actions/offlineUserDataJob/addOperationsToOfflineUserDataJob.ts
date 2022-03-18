import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeOperationError,
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

	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `/${resourceName}:addOperations`;

	const userIdentifiersArray: IDataObject[] = [];

	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;
	// add email as userIdentifier
	if (additionalFields.email !== undefined) {
		const normalizedEmail = normalize(additionalFields.email as string);

		const hashedEmail = hash(normalizedEmail);

		userIdentifiersArray.push({
			userIdentifierSource: 'UNSPECIFIED',
			hashedEmail,
		});
	}
	// add phoneNumber as userIdentifier
	if (additionalFields.phoneNumber !== undefined) {

		const hashedPhoneNumber = hash(additionalFields.phoneNumber as string);

		userIdentifiersArray.push({
			userIdentifierSource: 'UNSPECIFIED',
			hashedPhoneNumber,
		});
	}
	// add addressInfo as userIdentifier
	if (additionalFields.addressInfo !== undefined) {
		const addressInfo = (additionalFields.addressInfo as IDataObject).metadataValues as IDataObject;

		const normalizedFirstName = normalize(addressInfo.firstName as string);
		const hashedFirstName = hash(normalizedFirstName);

		const normalizedLastName = normalize(addressInfo.lastName as string);
		const hashedLastName = hash(normalizedLastName);

		const hashedAddressInfo = {
			hashedFirstName,
			hashedLastName,
			countryCode: addressInfo.countryCode,
			postalCode: addressInfo.postalCode,
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
		throw new NodeOperationError(this.getNode(), 'Wrong OfflineUserDataJob operation!');
	}
	return await apiRequest.call(this, requestMethod, endpoint, form, qs);
}
