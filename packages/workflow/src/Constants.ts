export const BINARY_ENCODING = 'base64';
export const WAIT_TIME_UNLIMITED = '3000-01-01T00:00:00.000Z';

export const LOG_LEVELS = ['silent', 'error', 'warn', 'info', 'debug', 'verbose'] as const;

export const CODE_LANGUAGES = ['javaScript', 'python'] as const;
export const CODE_EXECUTION_MODES = ['runOnceForAllItems', 'runOnceForEachItem'] as const;

/**
 * Nodes whose parameter values may refer to other nodes without expressions.
 * Their content may need to be updated when the referenced node is renamed.
 */
export const NODES_WITH_RENAMABLE_CONTENT = new Set([
	'n8n-nodes-base.code',
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
]);

// Arbitrary value to represent an empty credential value
export const CREDENTIAL_EMPTY_VALUE =
	'__n8n_EMPTY_VALUE_7b1af746-3729-4c60-9b9b-e08eb29e58da' as const;

export const FORM_TRIGGER_PATH_IDENTIFIER = 'n8n-form';

export const NODE_TYPES = {
	EXECUTE_WORKFLOW_TRIGGER: 'n8n-nodes-base.executeWorkflowTrigger',
	START: 'n8n-nodes-base.start',
	MANUAL_TRIGGER: 'n8n-nodes-base.manualTrigger',
	MANUAL_CHAT_TRIGGER: '@n8n/n8n-nodes-langchain.manualChatTrigger',
};

export const SUBWORKFLOW_STARTER_NODES = [
	NODE_TYPES.EXECUTE_WORKFLOW_TRIGGER,
	NODE_TYPES.MANUAL_CHAT_TRIGGER,
	NODE_TYPES.START,
	NODE_TYPES.MANUAL_TRIGGER,
];

export const STARTERS_TO_IGNORE_IN_REGULAR_EXECUTION = SUBWORKFLOW_STARTER_NODES.filter(
	(node) => node !== NODE_TYPES.EXECUTE_WORKFLOW_TRIGGER,
);
