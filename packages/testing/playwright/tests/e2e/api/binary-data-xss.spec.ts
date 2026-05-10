import flatted from 'flatted';
import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { workflow, trigger, node } from '../../../../../@n8n/workflow-sdk/src';
import { N8N_AUTH_COOKIE } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

const TRIGGER_NAME = 'Manual Trigger';
const CODE_NODE_NAME = 'HTML Binary Producer';

/**
 * Creates a workflow with a Code node that produces HTML binary data
 * WITHOUT a fileName (the XSS attack vector from ADO-4922).
 *
 * The HTML contains a script that sets document.title to a known marker.
 * If the browser renders the HTML inline and executes the script,
 * the title change proves same-origin JavaScript execution.
 */
function createHtmlBinaryWorkflow(): IWorkflowBase {
	const manualTrigger = trigger({
		type: 'n8n-nodes-base.manualTrigger',
		version: 1,
		config: {
			name: TRIGGER_NAME,
			parameters: {},
		},
	});

	const codeNode = node({
		type: 'n8n-nodes-base.code',
		version: 1,
		config: {
			name: CODE_NODE_NAME,
			parameters: {
				mode: 'runOnceForAllItems',
				// The script sets document.title to a marker we can detect.
				// Passing undefined as filePath means no fileName in metadata,
				// which causes the server to skip Content-Disposition: attachment.
				jsCode: `
const html = '<html><head><title>safe</title></head><body><script>document.title="xss_executed";<\\/script></body></html>';
const data = await this.helpers.prepareBinaryData(
  Buffer.from(html, 'utf8'),
  undefined,
  'text/html'
);
return [{ json: { binaryDataId: data.id }, binary: { data } }];
`,
			},
		},
	});

	const wf = workflow(nanoid(), `Binary XSS test ${nanoid()}`).add(manualTrigger.to(codeNode));

	const json = wf.toJSON() as IWorkflowBase;
	json.settings = { executionOrder: 'v1' };

	return json;
}

test.describe(
	'Binary data endpoint XSS prevention @capability:task-runner',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should not execute inline JavaScript when serving HTML binary data', async ({
			n8n,
			api,
			backendUrl,
		}) => {
			const page = n8n.page;

			// Ensure auth cookie is also set for backend domain (needed when
			// frontend and backend run on different ports/hosts)
			const { cookies } = await api.request.storageState();
			const authCookie = cookies.find((c) => c.name === N8N_AUTH_COOKIE)!;
			await page
				.context()
				.addCookies([{ name: authCookie.name, value: authCookie.value, url: backendUrl }]);

			// 1. Create and execute workflow that produces HTML binary data without fileName
			const { workflowId } = await api.workflows.createWorkflowFromDefinition(
				createHtmlBinaryWorkflow(),
			);

			await api.workflows.runManually(workflowId, TRIGGER_NAME);
			const execution = await api.workflows.waitForExecution(workflowId, 15_000, 'manual');
			expect(execution.status).toBe('success');

			// 2. Extract binary data ID from execution results
			const fullExecution = await api.workflows.getExecution(execution.id);
			const executionData = flatted.parse(fullExecution.data);
			const codeNodeOutput = executionData.resultData.runData[CODE_NODE_NAME];
			const binaryDataId: string = codeNodeOutput[0].data.main[0][0].binary.data.id;
			expect(binaryDataId).toBeDefined();

			// 3. Navigate the browser to the binary data endpoint (the attack URL)
			const attackUrl = `${backendUrl}/rest/binary-data?id=${encodeURIComponent(binaryDataId)}&action=download`;
			await page.goto(attackUrl, { waitUntil: 'load', timeout: 10_000 }).catch(() => {});

			// 4. If the HTML rendered inline and the script executed,
			//    document.title would be changed to 'xss_executed'.
			//    If Content-Disposition: attachment triggered a download, or
			//    CSP blocked the script, the title will be something else.
			const title = await page.title();
			expect(title).not.toBe('xss_executed');
		});
	},
);
