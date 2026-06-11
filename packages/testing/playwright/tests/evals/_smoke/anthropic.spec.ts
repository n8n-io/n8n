// eslint-disable-next-line @typescript-eslint/naming-convention
import Anthropic from '@anthropic-ai/sdk';

import { test, expect } from '../../../fixtures/eval-base';

const HAS_KEY = !!process.env.ANTHROPIC_API_KEY;

test.describe('real anthropic call wrapped in traced()', () => {
	test.skip(!HAS_KEY, 'ANTHROPIC_API_KEY not set');

	test('completes a tiny prompt and captures it in LangSmith', async ({ traced }) => {
		const client = new Anthropic();

		const result = await traced('anthropic/two-plus-two', async () => {
			const message = await client.messages.create({
				model: 'claude-haiku-4-5-20251001',
				max_tokens: 32,
				messages: [{ role: 'user', content: 'What is 2 + 2? Answer with just the number.' }],
			});
			const text = message.content
				.filter((block): block is Anthropic.TextBlock => block.type === 'text')
				.map((block) => block.text)
				.join('');
			return {
				text,
				inputTokens: message.usage.input_tokens,
				outputTokens: message.usage.output_tokens,
			};
		});

		expect(result.text).toMatch(/4/);
		expect(result.inputTokens).toBeGreaterThan(0);
		expect(result.outputTokens).toBeGreaterThan(0);
	});
});
