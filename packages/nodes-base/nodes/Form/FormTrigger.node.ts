import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

export class FormTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'n8n Form Trigger',
		name: 'formTrigger',
		icon: 'file:form.svg',
		group: ['trigger'],
		version: 1,
		description: 'Runs the flow when an n8n generated webform is submitted',
		defaults: {
			name: 'n8n Form Trigger',
		},
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: 'n8n-form',
				hidden: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'n8n-form',
			},
		],
		eventTriggerDescription: 'Waiting for you to submit the form',
		activationMessage: 'You can now make calls to your production Form URL.',
		triggerPanel: {
			header: 'Pull in a test form submission',
			executionsHelp: {
				inactive:
					"Form Trigger have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the 'listen' button, then fill out the test form that opens in a popup tab. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key=\"activate\">Activate</a> the workflow, then make requests to the production URL. Then every time there's a form submission via the Production Form URL, the workflow will execute. These executions will show up in the executions list, but not in the editor.",
				active:
					"Form Trigger have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the 'listen' button, then fill out the test form that opens in a popup tab. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key=\"activate\">Activate</a> the workflow, then make requests to the production URL. Then every time there's a form submission via the Production Form URL, the workflow will execute. These executions will show up in the executions list, but not in the editor.",
			},
			activationHint:
				'<a data-key="activate">Activate</a> this workflow to have it also run automatically for new form submissions created via the Production URL',
		},
		properties: [
			{
				displayName: 'Form Title',
				name: 'formTitle',
				type: 'string',
				default: '',
				placeholder: 'e.g. Contact us',
				required: true,
				description: 'Shown at the top of the form',
			},
			{
				displayName: 'Form Description',
				name: 'formDescription',
				type: 'string',
				default: '',
				placeholder: "e.g. We'll get back to you soon",
				description:
					'Shown underneath the Form Title. Can be used to prompt the user on how to complete the form.',
			},
			{
				displayName: 'Form Fields',
				name: 'formFields',
				placeholder: 'Add Form Field',
				type: 'fixedCollection',
				default: { values: [{ label: '', fieldType: 'string' }] },
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				options: [
					{
						displayName: 'Values',
						name: 'values',
						values: [
							{
								displayName: 'Field Label',
								name: 'fieldLabel',
								type: 'string',
								default: '',
								description: 'Label appears above the input field',
								required: true,
							},
							{
								displayName: 'Field Type',
								name: 'fieldType',
								type: 'options',
								default: 'text',
								description: 'Field name appears for users, guiding their input',
								options: [
									{
										name: 'String',
										value: 'text',
									},
									{
										name: 'Number',
										value: 'number',
									},
									{
										name: 'Date',
										value: 'date',
									},
									{
										name: 'Dropdown List',
										value: 'dropdown',
									},
								],
								required: true,
							},
							{
								displayName: 'Field Options',
								name: 'fieldOptions',
								placeholder: 'Add Field Option',
								description: 'List of options that can be selected from the dropdown',
								type: 'fixedCollection',
								default: { values: [{ option: '' }] },
								required: true,
								displayOptions: {
									show: {
										fieldType: ['dropdown'],
									},
								},
								typeOptions: {
									multipleValues: true,
									sortable: true,
								},
								options: [
									{
										displayName: 'Values',
										name: 'values',
										values: [
											{
												displayName: 'Option',
												name: 'option',
												type: 'string',
												default: '',
											},
										],
									},
								],
							},
							{
								displayName: 'Required Field',
								name: 'requiredField',
								type: 'boolean',
								default: false,
								description:
									'Whether to require the user to enter a value for this field before submitting the form',
							},
						],
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookName = this.getWebhookName();

		//Show the form on GET request
		if (webhookName === 'setup') {
			const formFields = this.getNodeParameter('formFields.values', []) as unknown as IDataObject[];

			let htmlFields = '';

			for (const field of formFields) {
				const { fieldLabel, fieldType, requiredField } = field;

				const required = requiredField ? 'required' : '';

				htmlFields += '<div class="form-group">';

				if (fieldType === 'dropdown') {
					const fieldOptions = ((field.fieldOptions as IDataObject).values as IDataObject[]) || [];

					htmlFields += `<label for="${fieldLabel}">${fieldLabel}</label>`;
					htmlFields += `<select id="${fieldLabel}" name="${fieldLabel}" ${required}>`;
					for (const entry of fieldOptions) {
						htmlFields += `<option value="${entry.option}">${entry.option}</option>`;
					}
					htmlFields += '</select>';
				} else {
					htmlFields += `<label for="${fieldLabel}">${fieldLabel}</label>`;
					htmlFields += `<input type="${fieldType}" class="form-control" id="${fieldLabel}" name="${fieldLabel}" ${required}/>`;
				}

				htmlFields += '</div>';
			}

			// const cssFile = 'https://joffcom.github.io/style.css';
			const javascript = `$(document).on('submit','#n8n-form',function(e){
	$.post('#', $('#n8n-form').serialize(), function(result) {
		var resp = jQuery.parseJSON(result);
		if (resp.status === 'ok') {
			$("#status").attr('class', 'alert alert-success');
			$("#status").show();
			$('#status-text').text('Form has been submitted.');
		} else {
		$("#status").attr('class', 'alert alert-danger');
		$("#status").show();
		$('#status-text').text('Something went wrong.');
		}
	});
	return false;
});`;

			const formName = 'n8n-form';
			const formId = 'n8n-form';
			const jQuery = 'https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js';
			const bootstrapCss =
				'https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta/css/bootstrap.min.css';

			const formTitle = this.getNodeParameter('formTitle', '') as string;
			const formDescription = this.getNodeParameter('formDescription', '') as string;

			const testForm = `<html>
			<head>
				<title>${formTitle}</title>
				<link rel="stylesheet" href="${bootstrapCss}" crossorigin="anonymous">

				<script src="${jQuery}" type="text/javascript"></script>
				<script type="text/javascript">
					${javascript}
				</script>
				</head>
				<body>
					<div class="container">
						<div class="page">
						<div id="status" style="display: none" class="alert alert-danger">
            <p id="status-text" class="status-text"></p>
          </div>
							<div class="form">
								<h1>${formTitle}</h1>
								<p>${formDescription}</p>
								<form action='#' method='POST' name='${formName}' id='${formId}'>
									<div class="item">
										${htmlFields}
									</div>
									<div class="btn-block">
										<button type="submit">Submit</button>
									</div>
								</form>
							</div>
						</div>
					</div>
				</body>
			</html>`;

			const res = this.getResponseObject();
			res.status(200).send(testForm).end();
			return {
				noWebhookResponse: true,
			};
		}

		const bodyData = this.getBodyData();

		const formUrlType = this.getMode() === 'manual' ? 'test' : 'production';

		bodyData['form url'] = formUrlType;

		return {
			webhookResponse: '{"status": "ok"}',
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
