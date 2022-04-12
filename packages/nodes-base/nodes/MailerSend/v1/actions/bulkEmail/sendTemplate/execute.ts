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

export async function sendTemplate(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	// batchSize is maximum size for the 'to' paramater
	const batchSize = 5;
	let body: IDataObject[];
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'bulk-email';

	// Create a copy of items
	const items: INodeExecutionData[] = this.getInputData().slice();
	const nodeContext = this.getContext('node');
	const returnItems: IDataObject[] = [];

	const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;

	const templateId = this.getNodeParameter('templateId', 0) as string;
	const fromField: IAddressPair = {
		email: this.getNodeParameter('fromEmail', 0) as string
	}

	// TODO do the same for CC, reply_to and bcc
	if (additionalFields.fromName) {
		fromField.name = additionalFields.fromName as string
	}

	const subject = this.getNodeParameter('subject', 0) as string;

	let toField:IAddressPair;

	let maxRunIndex = Math.ceil(items.length / batchSize);
	let currentRunIndex = 0;

	// TODO test for any {$var_name} in subject error if missing from variablesUi
	let variables:ISubstitution[] = [];
	let tmpItems: INodeExecutionData[];
	let currentBatchIndex = 0;
	let j = 0;
	while (currentRunIndex < maxRunIndex) {
		tmpItems = items.splice(0, batchSize);
		body = [];
		currentBatchIndex = (currentRunIndex * batchSize);
		toField = {email: ''}

		for (let i = 0; i < tmpItems.length; i++) {
			// j here is the index on the input elements
			j = (i + currentBatchIndex);
			variables = [];
			const variablesUi = (this.getNodeParameter('variablesUi', j) as IDataObject).variablesValues as IDataObject[] || [];
			for (const variable of variablesUi) {
				variables.push({
					var: (variable.name as string).trim(),
					value: (variable.value as string).trim()
				});
			}

			toField = {
				email: this.getNodeParameter('toEmail', j) as string
			}

			if (this.getNodeParameter('toName', j, '') as string) {
				toField.name = this.getNodeParameter('toName', j, '') as string;
			}

			const emailBody: IMail = {
				from: fromField,
				to: [toField],
				subject: subject,
				template_id: templateId,
			}

			if (variables.length > 0) {
				emailBody.variables = [{
					email: toField.email,
					substitutions: variables.slice()
				}]
			}

			body.push(emailBody as any as IDataObject);
		}  // for loop

		const response = await apiRequest.call(this, requestMethod, endpoint, body, qs);

		returnItems.push({
			json: {
				response
			}
		})

		currentRunIndex += 1;

	}

	return this.helpers.returnJsonArray(returnItems);
}
