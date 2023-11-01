import type { INodeType, INodeTypeDescription, IWebhookFunctions } from 'n8n-workflow';
import { FORM_TRIGGER_PATH_IDENTIFIER } from 'n8n-workflow';
import { formWebhook } from './utils';
import { formNodeDescription } from './description';

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
				isFullPath: true,
				path: `={{$parameter["path"]}}/${FORM_TRIGGER_PATH_IDENTIFIER}`,
				ndvHideUrl: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: '={{$parameter["responseMode"]}}',
				isFullPath: true,
				path: `={{$parameter["path"]}}/${FORM_TRIGGER_PATH_IDENTIFIER}`,
				ndvHideMethod: true,
			},
		],
		eventTriggerDescription: 'Waiting for you to submit the form',
		activationMessage: 'You can now make calls to your production Form URL.',
		triggerPanel: {
			header: 'Pull in a test form submission',
			executionsHelp: {
				inactive:
					"Form Trigger has two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the 'Test Step' button, then fill out the test form that opens in a popup tab. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key=\"activate\">Activate</a> the workflow, then make requests to the production URL. Then every time there's a form submission via the Production Form URL, the workflow will execute. These executions will show up in the executions list, but not in the editor.",
				active:
					"Form Trigger has two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the 'Test Step' button, then fill out the test form that opens in a popup tab. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key=\"activate\">Activate</a> the workflow, then make requests to the production URL. Then every time there's a form submission via the Production Form URL, the workflow will execute. These executions will show up in the executions list, but not in the editor.",
			},
			activationHint: {
				active:
					"This node will also trigger automatically on new form submissions (but those executions won't show up here).",
				inactive:
					'<a data-key="activate">Activate</a> this workflow to have it also run automatically for new form submissions created via the Production URL.',
			},
		},

		properties: formNodeDescription,
	};

	async webhook(this: IWebhookFunctions) {
		return formWebhook(this);
	}
}
