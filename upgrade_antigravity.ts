import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const KERNEL_FILE = path.join(
	__dirname,
	'packages',
	'nodes-base',
	'assets',
	'ai_marketing_blueprints',
	'PRZ_UNIVERSAL_KERNEL_n8n_agent.json',
);
const OUTPUT_FILE = path.join(
	__dirname,
	'packages',
	'nodes-base',
	'assets',
	'ai_marketing_blueprints',
	'PRZ_ANTIGRAVITY_PRIME_GOOGLE_AGENT.json',
);

function upgradeKernel() {
	console.log('🚀 Upgrading Kernel to Antigravity Prime (Google Core)...');

	if (!fs.existsSync(KERNEL_FILE)) {
		console.error('Kernel Agent JSON not found.');
		return;
	}

	const workflow = JSON.parse(fs.readFileSync(KERNEL_FILE, 'utf8'));

	// 1. Rename Workflow
	workflow.name = 'PRZ_ANTIGRAVITY_PRIME_Agent';
	workflow.versionId = crypto.randomUUID();

	// 2. Locate Brain Node (Chain LLM)
	const brainNode = workflow.nodes.find((n: any) => n.id === 'universal_kernel_brain');

	if (brainNode) {
		// 3. Rename Node
		brainNode.name = 'Antigravity Prime (Gemini 2.0 Ultra)';

		// 4. Update System Prompt (Injecting "Dev Level" and "Google Veo" Awareness)
		let systemPrompt = brainNode.parameters.options.systemMessage;

		// Enhance Header
		systemPrompt = systemPrompt.replace(
			'Version: PRZ-AUTO-UNIVERSAL-KERNEL v1.0',
			'Version: PRZ-ANTIGRAVITY-PRIME v2.0 (Google Core)\nDev Level: SUPER-ADMIN',
		);

		// Inject Veo/Gemini Specifics
		const googleDirectives = `
\n*** GOOGLE ANTIGRAVITY UPGRADE ACTIVE ***
You are running on Gemini 2.0 Ultra.
You have direct orchestrational control over the 'PRZ_GOOGLE_VEO_STUDIO' pipeline.
- When compiled prompts are ready, you do not just 'output' them; you AUTHORIZE the Veo render job.
- You must leverage Gemini's native multimodal understanding for all 'Vision Analysis' tasks.
- Your 'Trend Fusion' is now powered by real-time Google Grounding (if enabled).
`;
		systemPrompt += googleDirectives;

		brainNode.parameters.options.systemMessage = systemPrompt;

		// 5. Swap Model Configuration
		// Note: In n8n, swapping the provider usually involves changing the 'type' of a sub-node if using chains,
		// or just changing parameters if using a specific node.
		// The current node type is `@n8n/n8n-nodes-langchain.chainLlm`.
		// This node typically connects to a Model *Input*.
		// However, the JSON from the conversion (Step 567) put the model config *inside* the parameters (`modelId: { value: 'gpt-4' }`).
		// This suggests it's a basic LLM node, not a full LangChain chain with separate model node inputs.
		// Let's switch it to use the Google Gemini Chat Model.

		// To do this strictly correctly in n8n, we usually attach a Model Node (e.g., Google Vertex AI Chat Model) to the Chain Node.
		// But since we are hacking the JSON directly:
		// We will try to simulate a 'Google Vertex AI' configuration if the node supports it, or simply update the text.
		// If this is a `chainLlm` node (Basic LLM Chain), it expects a Connected Model.
		// The previous JSON (Step 567) didn't actually have a *connected* model node; it just had `modelId` as a parameter.
		// This suggests it might be an older or simplified node type in the user's n8n version or a misunderstanding of the node schema.

		// BETTER APPROACH for "Dev Level":
		// We will convert this strictly to an n8n AI Agent structure with a proper Model Sub-Node.
		// But that's complex to generate blindly.
		// SAFE APPROACH: Update the existing node metadata to reflect "Gemini" intent,
		// but assume the USER must physically wire the 'Google Vertex AI' model node in the UI
		// because the 'chainLlm' node REQUIRES a model input connection (it doesn't accept modelId as a simple param usually).

		// Wait, looking at lines 20-26 of `run_migration.ps1` (actually `view_file` output):
		// "modelId": { "__rl": true, "value": "gpt-4" ... }
		// This looks like the `n8n-nodes-base.openAi` node parameters, NOT `chainLlm`.
		// BUT the type IS `@n8n/n8n-nodes-langchain.chainLlm`.
		// If it's `chainLlm`, the `modelId` param is likely invalid or ignored if not connected.

		// DECISION:
		// I will rename the node to "Antigravity (Connect Google Model Here)"
		// and update the system prompt. Integrating a complex sub-node graph purely via JSON
		// without knowing the exact n8n version's ID for "Google Vertex Model" is risky.
		// I will set the expectation that the user connects the Google Model node in the editor.

		brainNode.notes =
			"ACTION REQUIRED: Connect a 'Google Gemini Chat Model' node to the 'Model' input of this node.";
	}

	fs.writeFileSync(OUTPUT_FILE, JSON.stringify(workflow, null, 2));
	console.log(`✅ Antigravity Prime Upgrade Complete: ${OUTPUT_FILE}`);
}

upgradeKernel();
