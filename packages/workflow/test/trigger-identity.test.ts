import {
	CHAT_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_CHAT_TRIGGER_LANGCHAIN_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	MCP_TRIGGER_NODE_TYPE,
} from '../src/constants';
import { classifyTriggerIdentity } from '../src/trigger-identity';

const hooksParameters = {
	executionsHooksVersion: 1,
	contextEstablishmentHooks: { hooks: [{ hookName: 'credentials.bearerToken' }] },
};

describe('classifyTriggerIdentity', () => {
	it.each([MANUAL_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_LANGCHAIN_NODE_TYPE])(
		'classifies %s as providing the n8n identity only',
		(type) => {
			expect(classifyTriggerIdentity(type, {})).toEqual({
				providesN8nIdentity: true,
				providesExternalIdentity: false,
			});
		},
	);

	it('classifies a sub-workflow trigger as providing both identities', () => {
		expect(classifyTriggerIdentity(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, {})).toEqual({
			providesN8nIdentity: true,
			providesExternalIdentity: true,
		});
	});

	describe('Chat Trigger', () => {
		it('provides both identities when availableInChat is true', () => {
			expect(classifyTriggerIdentity(CHAT_TRIGGER_NODE_TYPE, { availableInChat: true })).toEqual({
				providesN8nIdentity: true,
				providesExternalIdentity: true,
			});
		});

		it('provides the n8n identity only when availableInChat is not set', () => {
			expect(classifyTriggerIdentity(CHAT_TRIGGER_NODE_TYPE, {})).toEqual({
				providesN8nIdentity: true,
				providesExternalIdentity: false,
			});
		});
	});

	describe('MCP Trigger', () => {
		it('provides both identities when authentication is n8nOAuth2', () => {
			expect(
				classifyTriggerIdentity(MCP_TRIGGER_NODE_TYPE, { authentication: 'n8nOAuth2' }),
			).toEqual({ providesN8nIdentity: true, providesExternalIdentity: true });
		});

		it('provides the n8n identity only for other authentication modes', () => {
			expect(
				classifyTriggerIdentity(MCP_TRIGGER_NODE_TYPE, { authentication: 'bearerAuth' }),
			).toEqual({ providesN8nIdentity: true, providesExternalIdentity: false });
		});
	});

	describe('other triggers', () => {
		it('provides the external identity only when a context establishment hook is configured', () => {
			expect(classifyTriggerIdentity('n8n-nodes-base.webhook', hooksParameters)).toEqual({
				providesN8nIdentity: false,
				providesExternalIdentity: true,
			});
		});

		it('provides no identity without hooks', () => {
			expect(classifyTriggerIdentity('n8n-nodes-base.scheduleTrigger', {})).toEqual({
				providesN8nIdentity: false,
				providesExternalIdentity: false,
			});
		});

		it('provides no identity when parameters are undefined', () => {
			expect(classifyTriggerIdentity('n8n-nodes-base.webhook', undefined)).toEqual({
				providesN8nIdentity: false,
				providesExternalIdentity: false,
			});
		});
	});
});
