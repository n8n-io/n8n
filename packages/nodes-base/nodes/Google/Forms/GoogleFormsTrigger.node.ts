import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { googleApiRequestAllItems } from './GenericFunctions';

import moment from 'moment';

export class GoogleFormsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Forms Trigger',
		name: 'googleFormsTrigger',
		icon: 'file:googleForms.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["formId"]}}',
		description: 'Starts the workflow when Google Forms response is submitted',
		defaults: {
			name: 'Google Forms Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['serviceAccount'],
					},
				},
			},
			{
				name: 'googleFormsOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		polling: true,
		properties: [
			{
				displayName: 'Credential Type',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'OAuth2 (Recommended)',
						value: 'oAuth2',
					},
					{
						name: 'Service Account',
						value: 'serviceAccount',
					},
				],
				default: 'oAuth2',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				// We only render this property in order to let user understand when this event will triger
				// but atm there's only one option
				default: 'formSubmission',
				options: [
					{
						name: 'New Form Submission',
						value: 'formSubmission',
					},
				],
			},
			{
				displayName: 'Form Name or ID',
				name: 'formId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getForms',
				},
				default: '',
			},
		],
	};

	methods = {
		loadOptions: {
			async getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// Google stores form responses on the drive with special mimeType(`application/vnd.google-apps.form`)
				// so we query all of them in order to show them for formId selection
				const forms = await googleApiRequestAllItems.call(
					this,
					'files',
					'GET',
					'/drive/v3/files',
					{},
					{
						"pageSize": 50,
						"orderBy": "modifiedTime",
						"fields": "nextPageToken, files(id, name)",
						"spaces": "",
						"q": "mimeType = 'application/vnd.google-apps.form'",
						"includeItemsFromAllDrives": true,
						"supportsAllDrives": true,
					}, 'https://www.googleapis.com',
				);

				return (forms || []).map(({ id, name }: { id: string, name: string }) => ({
					name,
					value: id,
				}));
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const poolTimes = this.getNodeParameter('pollTimes.item', []) as IDataObject[];
		const formId = this.getNodeParameter('formId') as string;
		const webhookData = this.getWorkflowStaticData('node');

		if (poolTimes.length === 0) {
			throw new NodeOperationError(this.getNode(), 'Please set a poll time');
		}

		if (formId === '') {
			throw new NodeOperationError(this.getNode(), 'Please select a form');
		}

		const now = moment().utc().format();

		const startDate = (webhookData.lastTimeChecked as string) || now;

		const endDate = now;

		const qs: IDataObject = {};

		let formResponses;

		Object.assign(qs, {
			filter: `timestamp > ${moment(startDate).startOf('second').utc().format()}`,
		});

		if (this.getMode() === 'manual') {
			console.log('Mode manual');
			delete qs.filter;

			formResponses = await googleApiRequestAllItems.call(
				this,
				'responses',
				'GET',
				`/v1/forms/${formId}/responses`,
				{},
				qs,
			);
		} else {
			formResponses = await googleApiRequestAllItems.call(
				this,
				'responses',
				'GET',
				`/v1/forms/${formId}/responses`,
				{},
				qs,
			);
		}
		webhookData.lastTimeChecked = endDate;

		if (Array.isArray(formResponses) && formResponses.length) {
			return [this.helpers.returnJsonArray(formResponses)];
		}

		if (this.getMode() === 'manual') {
			throw new NodeApiError(this.getNode(), {
				message: 'No data with the current filter could be found',
			});
		}

		return null;
	}
}
