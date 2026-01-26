import { test, expect } from '../../../fixtures/base';

test.use({ capability: 'email' });

test('EmailSend node sends via SMTP @capability:email', async ({ api, n8n, n8nContainer }) => {
	// Sign in to use internal APIs for creating credentials and workflows

	// Create SMTP credential targeting Mailpit
	const smtpCredential = await api.credentials.createCredential({
		name: 'SMTP (Test)',
		type: 'smtp',
		data: {
			user: '',
			password: '',
			host: 'mailpit',
			port: 1025,
			secure: false,
			disableStartTls: true,
		},
	});

	// Define a workflow with Manual Trigger -> EmailSend
	const toEmail = 'test@recipient.local';
	const subject = 'Playwright Mailpit SMTP';
	const workflowDefinition = {
		name: 'Mailpit EmailSend Workflow',
		nodes: [
			{
				id: '1',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
			},
			{
				id: '2',
				name: 'Email',
				type: 'n8n-nodes-base.emailSend',
				typeVersion: 2,
				position: [300, 0],
				parameters: {
					fromEmail: 'test@n8n.local',
					toEmail,
					subject,
					emailFormat: 'text',
					text: 'Hello from n8n E2E test',
				},
				credentials: {
					smtp: {
						id: smtpCredential.id,
						name: smtpCredential.name,
					},
				},
			},
		],
		connections: {
			'Manual Trigger': {
				main: [[{ node: 'Email', type: 'main', index: 0 }]],
			},
		},
		active: false,
	} as const;

	const { workflowId } = await api.workflows.createWorkflowFromDefinition(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		workflowDefinition as any,
		{ makeUnique: true },
	);

	// Execute the workflow via UI API endpoint by navigating to the canvas and clicking run
	await n8n.page.goto(`/workflow/${workflowId}`);
	await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
		'Workflow executed successfully',
	);

	const msg = await n8nContainer.services.mailpit.waitForMessage({ to: toEmail, subject });

	expect(msg).toBeTruthy();
});
