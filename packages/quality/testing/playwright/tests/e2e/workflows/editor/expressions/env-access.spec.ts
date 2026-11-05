import { HTTP_REQUEST_NODE_NAME, MANUAL_TRIGGER_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

const URL_PARAMETER_NAME = 'url';
const ENV_ACCESS_DENIED_MESSAGE = 'access to env vars denied';
const RUN_NODE_TO_RESOLVE_MESSAGE = '[not accessible via UI, please run node]';

test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'expression-env-access',
			N8N_BLOCK_ENV_ACCESS_IN_NODE: 'false',
			E2E_ENV_PREVIEW_PROBE: 'probe-value',
		},
	},
});

test.describe(
	'$env in the inline expression preview',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ n8n, n8nContainer }) => {
			test.skip(
				!n8nContainer,
				'container-only: the backend must start with N8N_BLOCK_ENV_ACCESS_IN_NODE set',
			);
			await n8n.start.fromBlankCanvas();
		});

		test('does not report env access as denied when the instance allows it', async ({ n8n }) => {
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.addNode(HTTP_REQUEST_NODE_NAME, { closeNDV: false });

			await n8n.ndv.activateParameterExpressionEditor(URL_PARAMETER_NAME);
			await n8n.ndv.getInlineExpressionEditorInput(URL_PARAMETER_NAME).click();
			await n8n.ndv.clearExpressionEditor(URL_PARAMETER_NAME);
			await n8n.ndv.typeInExpressionEditor('{{ $env.E2E_ENV_PREVIEW_PROBE', URL_PARAMETER_NAME);

			const output = n8n.ndv.getInlineExpressionEditorOutput();
			await expect(output).toHaveText(RUN_NODE_TO_RESOLVE_MESSAGE);
			await expect(output).not.toContainText(ENV_ACCESS_DENIED_MESSAGE);
		});
	},
);
