import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function mindeeApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	body: any = {},
	qs: IDataObject = {},
	option = {},
): Promise<any> {
	const resource = this.getNodeParameter('resource', 0);

	let service;

	if (resource === 'receipt') {
		service = 'mindeeReceiptApi';
	} else {
		service = 'mindeeInvoiceApi';
	}

	const version = this.getNodeParameter('apiVersion', 0) as number;
	// V1 of mindee is deprecated, we are keeping it for now but now V3 is active
	const url =
		version === 1
			? `https://api.mindee.net/products${path}`
			: `https://api.mindee.net/v1/products/mindee${path}`;

	const options: IRequestOptions = {
		headers: {},
		method,
		body,
		qs,
		uri: url,
		json: true,
	};
	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		if (Object.keys(option).length !== 0) {
			Object.assign(options, option);
		}

		return await this.helpers.requestWithAuthentication.call(this, service, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export function cleanDataPreviousApiVersions(predictions: IDataObject[]) {
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
			newData.currency = data.currency;
			//@ts-ignore
			newData.locale = data.value;
		} else {
			newData[key] =
				//@ts-ignore
				data.value || data.name || data.raw || data.degrees || data.amount || data.iban;
		}
	}

	return newData;
}

export function cleanData(document: IDataObject) {
	// @ts-ignore
	const prediction = document.inference.prediction as IDataObject;
	const newData: IDataObject = {};
	newData.id = document.id;
	newData.name = document.name;
	newData.number_of_pages = document.n_pages;
	for (const key of Object.keys(prediction)) {
		const data = prediction[key] as IDataObject | IDataObject[];

		if (key === 'taxes' && data.length) {
			newData[key] = {
				amount: (data as IDataObject[])[0].amount,
				rate: (data as IDataObject[])[0].rate,
			};
		} else if (key === 'locale') {
			//@ts-ignore
			newData.currency = data.currency;
			//@ts-ignore
			newData.locale = data.value;
		} else if (key === 'line_items') {
			const lineItems: IDataObject[] = [];
			for (const lineItem of data as IDataObject[]) {
				lineItems.push({
					description: lineItem.description,
					product_code: lineItem.product_code,
					quantity: lineItem.quantity,
					tax_amount: lineItem.tax_amount,
					tax_rate: lineItem.tax_rate,
					total_amount: lineItem.total_amount,
					unit_price: lineItem.unit_price,
				});
			}
			newData[key] = lineItems;
		} else {
			newData[key] =
				//@ts-ignore
				data.value || data.name || data.raw || data.degrees || data.amount || data.iban;
		}
	}

	return newData;
}
