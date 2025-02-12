import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { toEmailProperty } from './descriptions';
import { configureTransport } from './utils';
import { createEmailBody } from '../../../utils/sendAndWait/email-templates';
import {
	configureWaitTillDate,
	createButton,
	getSendAndWaitConfig,
	getSendAndWaitProperties,
} from '../../../utils/sendAndWait/utils';

export const description: INodeProperties[] = getSendAndWaitProperties([toEmailProperty], 'email');

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const fromEmail = this.getNodeParameter('fromEmail', 0) as string; // TODO: Get from ENV options
	const toEmail = this.getNodeParameter('toEmail', 0) as string;

	// TODO: Check env options and throw an error if not set

	const config = getSendAndWaitConfig(this);
	const buttons: string[] = [];
	for (const option of config.options) {
		buttons.push(createButton(config.url, option.label, option.value, option.style));
	}

	const instanceId = this.getInstanceId();

	const htmlBody = createEmailBody(config.message, buttons.join('\n'), instanceId);

	const mailOptions: IDataObject = {
		from: fromEmail,
		to: toEmail,
		subject: config.title,
		html: htmlBody,
	};

	const transporter = configureTransport({});

	await transporter.sendMail(mailOptions);

	const waitTill = configureWaitTillDate(this);

	await this.putExecutionToWait(waitTill);
	return [this.getInputData()];
}
