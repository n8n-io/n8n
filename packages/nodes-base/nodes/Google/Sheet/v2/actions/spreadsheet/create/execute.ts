import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	apiRequest,
} from '../../../transport';

export async function create(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const title = this.getNodeParameter('title', index) as string;
	const sheetsUi = this.getNodeParameter('sheetsUi', index, {}) as IDataObject;

	const body = {
		properties: {
			title,
			autoRecalc: undefined as undefined | string,
			locale: undefined as undefined | string,
		},
		sheets: [] as IDataObject[],
	};

	const options = this.getNodeParameter('options', index, {}) as IDataObject;

	if (Object.keys(sheetsUi).length) {
		const data = [];
		const sheets = sheetsUi.sheetValues as IDataObject[];
		for (const sheet of sheets) {
			const properties = sheet.propertiesUi as IDataObject;
			if (properties) {
				data.push({ properties });
			}
		}
		body.sheets = data;
	}

	body.properties!.autoRecalc = options.autoRecalc ? (options.autoRecalc as string) : undefined;
	body.properties!.locale = options.locale ? (options.locale as string) : undefined;

	const responseData = await apiRequest.call(this, 'POST', `/v4/spreadsheets`, body);
	return this.helpers.returnJsonArray(responseData);
}
