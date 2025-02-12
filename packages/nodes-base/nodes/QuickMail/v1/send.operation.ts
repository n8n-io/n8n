import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { createUtmCampaignLink, updateDisplayOptions } from '@utils/utilities';

import { toEmailProperty } from './descriptions';
import { configureTransport, type EmailSendOptions } from './utils';
import { appendAttributionOption } from '../../../utils/descriptions';

const properties: INodeProperties[] = [
	toEmailProperty,

	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		placeholder: 'My subject line',
		description: 'Subject line of the email',
	},
	{
		displayName: 'Email Format',
		name: 'emailFormat',
		type: 'options',
		options: [
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'HTML',
				value: 'html',
			},
			{
				name: 'Both',
				value: 'both',
			},
		],
		default: 'text',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		default: '',
		description: 'Plain text message of email',
		displayOptions: {
			show: {
				emailFormat: ['text', 'both'],
			},
		},
	},
	{
		displayName: 'HTML',
		name: 'html',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		default: '',
		description: 'HTML text message of email',
		displayOptions: {
			show: {
				emailFormat: ['html', 'both'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				...appendAttributionOption,
				description:
					'Whether to include the phrase “This email was sent automatically with n8n” to the end of the email',
			},
			{
				displayName: 'Attachments',
				name: 'attachments',
				type: 'string',
				default: '',
				description:
					'Name of the binary properties that contain data to add to email as attachment. Multiple ones can be comma-separated. Reference embedded images or other content within the body of an email message, e.g. &lt;img src="cid:image_1"&gt;',
			},
			{
				displayName: 'Ignore SSL Issues (Insecure)',
				name: 'allowUnauthorizedCerts',
				type: 'boolean',
				default: false,
				description: 'Whether to connect even if SSL certificate validation is not possible',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['email'],
		operation: ['send'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const nodeVersion = this.getNode().typeVersion;
	const instanceId = this.getInstanceId();

	const returnData: INodeExecutionData[] = [];
	let item: INodeExecutionData;

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			item = items[itemIndex];

			// TODO: Check env options and throw an error if not set

			const fromEmail = this.getNodeParameter('fromEmail', itemIndex) as string; // TODO: Replace with Env Option
			const toEmail = this.getNodeParameter('toEmail', itemIndex) as string;
			const subject = this.getNodeParameter('subject', itemIndex) as string;
			const emailFormat = this.getNodeParameter('emailFormat', itemIndex) as string;
			const options = this.getNodeParameter('options', itemIndex, {}) as EmailSendOptions;

			const transporter = configureTransport(options);

			const mailOptions: IDataObject = {
				from: fromEmail,
				to: toEmail,
				subject,
			};

			if (emailFormat === 'text' || emailFormat === 'both') {
				mailOptions.text = this.getNodeParameter('text', itemIndex, '');
			}

			if (emailFormat === 'html' || emailFormat === 'both') {
				mailOptions.html = this.getNodeParameter('html', itemIndex, '');
			}

			let appendAttribution = options.appendAttribution;
			if (appendAttribution === undefined) {
				appendAttribution = nodeVersion >= 1;
			}

			if (appendAttribution) {
				const attributionText = 'This email was sent automatically with ';
				const link = createUtmCampaignLink('n8n-nodes-base.emailSend', instanceId);
				if (emailFormat === 'html' || (emailFormat === 'both' && mailOptions.html)) {
					mailOptions.html = `
					${mailOptions.html}
					<br>
					<br>
					---
					<br>
					<em>${attributionText}<a href="${link}" target="_blank">n8n</a></em>
					`;
				} else {
					mailOptions.text = `${mailOptions.text}\n\n---\n${attributionText}n8n\n${'https://n8n.io'}`;
				}
			}

			if (options.attachments && item.binary) {
				const attachments = [];
				const attachmentProperties: string[] = options.attachments
					.split(',')
					.map((propertyName) => {
						return propertyName.trim();
					});

				for (const propertyName of attachmentProperties) {
					const binaryData = this.helpers.assertBinaryData(itemIndex, propertyName);
					attachments.push({
						filename: binaryData.fileName || 'unknown',
						content: await this.helpers.getBinaryDataBuffer(itemIndex, propertyName),
						cid: propertyName,
					});
				}

				if (attachments.length) {
					mailOptions.attachments = attachments;
				}
			}

			const info = await transporter.sendMail(mailOptions);

			returnData.push({
				json: info as unknown as IDataObject,
				pairedItem: {
					item: itemIndex,
				},
			});
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: error.message,
					},
					pairedItem: {
						item: itemIndex,
					},
				});
				continue;
			}
			delete error.cert;
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}

	return [returnData];
}
