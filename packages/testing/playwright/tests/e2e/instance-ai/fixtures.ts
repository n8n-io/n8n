import { test as base, expect as baseExpect } from '../../../fixtures/base';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

export const instanceAiTestConfig = {
	timezoneId: 'America/New_York',
	capability: {
		env: {
			N8N_ENABLED_MODULES: 'instance-ai',
			N8N_INSTANCE_AI_MODEL: 'anthropic/claude-sonnet-4-6',
			N8N_INSTANCE_AI_MODEL_API_KEY: ANTHROPIC_API_KEY,
			N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
		},
	},
} as const;

export const test = base;
export const expect = baseExpect;
