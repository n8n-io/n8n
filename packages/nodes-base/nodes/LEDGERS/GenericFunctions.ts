import type { IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
import type { OptionsWithUri } from 'request';

export async function execute(this: IExecuteFunctions) {
	const items = this.getInputData();
	const returnData = [];

	const credentials = await this.getCredentials('ledgersApi');
	const operation = this.getNodeParameter('operation', 0);
	const apiToken = credentials.apiToken;
	const xApiKey = credentials.xApiKey;

	for (let i = 0; i < items.length; i++) {
		const options: OptionsWithUri = {
			method: 'GET',
			uri: '',
			headers: {
				'api-token': apiToken,
				'x-api-key': xApiKey,
				'Content-Type': 'application/json',
			},
			json: true,
		};

		if (operation === 'createContact') {
			const contactName = this.getNodeParameter('contactName', i);
			const additionalFields = this.getNodeParameter('additionalFields', i);
			options.method = 'POST';
			options.uri = 'https://in-api-dev.ledgers.cloud/v3/contact';
			options.body = { contact_name: contactName, ...additionalFields };
		} else if (operation === 'updateContact') {
			const contactId = this.getNodeParameter('contactId', i);
			const updateFields = this.getNodeParameter('additionalFields', i);
			options.method = 'PUT';
			options.uri = 'https://in-api-dev.ledgers.cloud/v3/contact';
			options.body = { contact_id: contactId, ...updateFields };
		} else if (operation === 'getContact') {
			const contactId = this.getNodeParameter('contactId', i);
			options.uri = `https://in-api-dev.ledgers.cloud/v3/contact/${contactId}`;
		} else if (operation === 'getAllContacts') {
			const perPage = this.getNodeParameter('perPage', i);
			options.uri = `https://in-api-dev.ledgers.cloud/v3/contact?perpage=${perPage}`;
		}

		const response = await this.helpers.request(options as IRequestOptions);
		returnData.push({ json: response });
	}

	return [returnData];
}
