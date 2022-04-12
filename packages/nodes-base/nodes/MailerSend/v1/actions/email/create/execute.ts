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
import { IAddressPair, IMail, ISubstitution, IVariables } from '../../Interfaces';

const options = {
	returnFullResponse: true
}

export async function create(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	// const body = {} as IDataObject;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'email';

	const returnItems: IDataObject[] = [];

	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;

	const emailText = this.getNodeParameter('text', index) as string;
	const emailHtml = this.getNodeParameter('html', index) as string;

	const fromField: IAddressPair = {
		email: this.getNodeParameter('fromEmail', index) as string
	}

	// do the same for CC, reply_to and bcc
	if (additionalFields.fromName) {
		fromField.name = additionalFields.fromName as string
	}

	const subject = this.getNodeParameter('subject', index) as string;

	let variablesList:IVariables[];

	// TODO test for any {$var_name} in emailText and emailHtml or subject error if missing from variablesUi
	let variables:ISubstitution[] = [];
	variablesList = [];
	let toField: IAddressPair;

	variables = [];
	const variablesUi = (this.getNodeParameter('variablesUi', index) as IDataObject).variablesValues as IDataObject[] || [];
	for (const variable of variablesUi) {
		variables.push({
			var: (variable.name as string).trim(),
			value: (variable.value as string).trim()
		});
	}

	toField = {
		email: this.getNodeParameter('toEmail', index) as string
	}

	if (this.getNodeParameter('toName', index, '') as string) {
		toField.name = this.getNodeParameter('toName', index) as string;
	}

	if (variables.length > 0) {
		variablesList.push({
			email: this.getNodeParameter('toEmail', index) as string,
			substitutions: variables.slice()
		})
	}

	const body: IMail = {
		from: fromField,
		to: [toField],
		subject: subject,
		text: emailText,
	}

	if (emailHtml !== '') {
		body.html = emailHtml
	}

	if (variables.length > 0) {
		body.variables = variablesList;
	}

	const response = await apiRequest.call(this, requestMethod, endpoint, body, qs, options);

	returnItems.push({
		json: {
			response: response
		}
	})

	return this.helpers.returnJsonArray(returnItems);
}
