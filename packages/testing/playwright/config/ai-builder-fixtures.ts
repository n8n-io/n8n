import type { TestRequirements } from '../Types';

/**
 * Requirements for enabling the AI workflow builder feature.
 * These tests use the real Anthropic API for workflow generation,
 * requiring N8N_AI_ANTHROPIC_KEY to be set in the environment.
 */
export const workflowBuilderEnabledRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
			aiBuilder: { enabled: true, setup: true },
		},
		features: {
			aiAssistant: true,
			aiBuilder: true,
		},
	},
};
