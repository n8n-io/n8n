import set from 'lodash.set';
import { IDataObject, IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

export async function addTemplateComponents(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) {
	const comps = this.getNodeParameter('templateComponents') as IDataObject;
	if (!comps.component) {
		return requestOptions;
	}
	const components = (comps.component as IDataObject[]).map((v) => {
		return {
			type: v.type,
			parameters: (v.parameters as IDataObject).parameter,
		};
	});
	if (!requestOptions.body) {
		requestOptions.body = {};
	}
	set(requestOptions.body as object, 'template.components', components);
	return requestOptions;
}
