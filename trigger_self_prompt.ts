import fetch from 'node-fetch'; // Standard available in n8n environment? Or need native?
// npx tsx handles native fetch in Node 18+. relying on that.

async function runSelfPrompt() {
	console.log('🤖 Initiating Antigravity Self-Prompt Sequence...');

	const webhookUrl = 'http://localhost:5678/webhook/universal-kernel';
	const testWebhookUrl = 'http://localhost:5678/webhook-test/universal-kernel';

	const promptPayload = {
		message: "/compile 'Cyberpunk Cat Barista' --mode=self_optimization",
	};

	console.log(`\n📡 Transmitting Directive: "${promptPayload.message}"`);

	try {
		// Try Production Webhook first
		console.log(`   Attempting Connection to: ${webhookUrl}`);
		let response = await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(promptPayload),
		});

		if (!response.ok) {
			console.log('   (Prod Webhook not active. Trying Test Webhook...)');
			response = await fetch(testWebhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(promptPayload),
			});
		}

		if (response.ok) {
			const data = await response.text(); // Agent might return text or JSON
			console.log('\n✅ KERNEL RESPONSE RECEIVED:');
			console.log('==================================================');
			console.log(data);
			console.log('==================================================');
			console.log('\n✨ Verification: The System is thinking.');
		} else {
			console.error(`\n❌ Connection Refused: ${response.status} ${response.statusText}`);
			console.log(
				"   Diagnostic: Ensure the 'PRZ_ANTIGRAVITY_PRIME_Agent' workflow is ACTIVE in n8n.",
			);
		}
	} catch (error) {
		console.error(`\n❌ Network Error: Is n8n running?`);
		const err = error as Error;
		console.error(`   ${err.message}`);
	}
}

runSelfPrompt();
