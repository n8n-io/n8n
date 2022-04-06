import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';

export async function mindeeApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, path: string, body: any = {}, qs: IDataObject = {}, option = {}): Promise<any> { // tslint:disable-line:no-any

	const resource = this.getNodeParameter('resource', 0) as string;

	let credentials;

	if (resource === 'receipt') {
		credentials = await this.getCredentials('mindeeReceiptApi') as IDataObject;
	} else {
		credentials = await this.getCredentials('mindeeInvoiceApi') as IDataObject;
	}

	const options: OptionsWithUri = {
		headers: {
			'X-Inferuser-Token': credentials.apiKey,
		},
		method,
		body,
		qs,
		uri: `https://api.mindee.net/products${path}`,
		json: true,
	};
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		if (Object.keys(option).length !== 0) {
			Object.assign(options, option);
		}
		//@ts-ignore
		return await this.helpers.request.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export function cleanData(predictions: IDataObject[]) {

	const newData: IDataObject = {};

	for (const key of Object.keys(predictions[0])) {

		const data = predictions[0][key] as IDataObject | IDataObject[];

		if (key === 'taxes' && data.length) {
			newData[key] = {
				amount: (data as IDataObject[])[0].amount,
				rate: (data as IDataObject[])[0].rate,
			};
		} else if (key === 'locale') {
				//@ts-ignore
				newData['currency'] = data.currency;
				//@ts-ignore
				newData['locale'] = data.value;
		} else {
			//@ts-ignore
			newData[key] = data.value || data.name || data.raw || data.degrees || data.amount || data.iban;
		}
	}

	return newData;
}
