export const DIGITS = '0123456789';
export const UPPERCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const LOWERCASE_LETTERS = UPPERCASE_LETTERS.toLowerCase();
export const ALPHABET = [DIGITS, UPPERCASE_LETTERS, LOWERCASE_LETTERS].join('');

export const BINARY_ENCODING = 'base64';
export const WAIT_INDEFINITELY = new Date('3000-01-01T00:00:00.000Z');

export const LOG_LEVELS = ['silent', 'error', 'warn', 'info', 'debug'] as const;

export const CODE_LANGUAGES = ['javaScript', 'python'] as const;
export const CODE_EXECUTION_MODES = ['runOnceForAllItems', 'runOnceForEachItem'] as const;

// Arbitrary value to represent an empty credential value
export const CREDENTIAL_EMPTY_VALUE = '__n8n_EMPTY_VALUE_7b1af746-3729-4c60-9b9b-e08eb29e58da';

export const FORM_TRIGGER_PATH_IDENTIFIER = 'n8n-form';

export const UNKNOWN_ERROR_MESSAGE = 'There was an unknown issue while executing the node';
export const UNKNOWN_ERROR_DESCRIPTION =
	'Double-check the node configuration and the service it connects to. Check the error details below and refer to the <a href="https://docs.n8n.io" target="_blank">n8n documentation</a> to troubleshoot the issue.';
export const UNKNOWN_ERROR_MESSAGE_CRED = 'UNKNOWN ERROR';

//n8n-nodes-base
export const STICKY_NODE_TYPE = 'n8n-nodes-base.stickyNote';
export const NO_OP_NODE_TYPE = 'n8n-nodes-base.noOp';
export const HTTP_REQUEST_NODE_TYPE = 'n8n-nodes-base.httpRequest';
export const WEBHOOK_NODE_TYPE = 'n8n-nodes-base.webhook';
export const MANUAL_TRIGGER_NODE_TYPE = 'n8n-nodes-base.manualTrigger';
export const ERROR_TRIGGER_NODE_TYPE = 'n8n-nodes-base.errorTrigger';
export const START_NODE_TYPE = 'n8n-nodes-base.start';
export const EXECUTE_WORKFLOW_NODE_TYPE = 'n8n-nodes-base.executeWorkflow';
export const EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE = 'n8n-nodes-base.executeWorkflowTrigger';
export const CODE_NODE_TYPE = 'n8n-nodes-base.code';
export const FUNCTION_NODE_TYPE = 'n8n-nodes-base.function';
export const FUNCTION_ITEM_NODE_TYPE = 'n8n-nodes-base.functionItem';
export const MERGE_NODE_TYPE = 'n8n-nodes-base.merge';
export const AI_TRANSFORM_NODE_TYPE = 'n8n-nodes-base.aiTransform';
export const FORM_NODE_TYPE = 'n8n-nodes-base.form';
export const FORM_TRIGGER_NODE_TYPE = 'n8n-nodes-base.formTrigger';
export const CHAT_TRIGGER_NODE_TYPE = '@n8n/n8n-nodes-langchain.chatTrigger';
export const WAIT_NODE_TYPE = 'n8n-nodes-base.wait';

export const STARTING_NODE_TYPES = [
	MANUAL_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	ERROR_TRIGGER_NODE_TYPE,
	START_NODE_TYPE,
];

export const SCRIPTING_NODE_TYPES = [
	FUNCTION_NODE_TYPE,
	FUNCTION_ITEM_NODE_TYPE,
	CODE_NODE_TYPE,
	AI_TRANSFORM_NODE_TYPE,
];

export const ADD_FORM_NOTICE = 'addFormPage';

/**
 * Nodes whose parameter values may refer to other nodes without expressions.
 * Their content may need to be updated when the referenced node is renamed.
 */
export const NODES_WITH_RENAMABLE_CONTENT = new Set([
	CODE_NODE_TYPE,
	FUNCTION_NODE_TYPE,
	FUNCTION_ITEM_NODE_TYPE,
	AI_TRANSFORM_NODE_TYPE,
]);

//@n8n/n8n-nodes-langchain
export const MANUAL_CHAT_TRIGGER_LANGCHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.manualChatTrigger';
export const AGENT_LANGCHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.agent';
export const CHAIN_LLM_LANGCHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.chainLlm';
export const OPENAI_LANGCHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.openAi';
export const CHAIN_SUMMARIZATION_LANGCHAIN_NODE_TYPE =
	'@n8n/n8n-nodes-langchain.chainSummarization';
export const CODE_TOOL_LANGCHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.toolCode';
export const WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.toolWorkflow';
export const HTTP_REQUEST_TOOL_LANGCHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.toolHttpRequest';

export const LANGCHAIN_CUSTOM_TOOLS = [
	CODE_TOOL_LANGCHAIN_NODE_TYPE,
	WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
	HTTP_REQUEST_TOOL_LANGCHAIN_NODE_TYPE,
];

export const SEND_AND_WAIT_OPERATION = 'sendAndWait';
export const AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT = 'codeGeneratedForPrompt';
export const AI_TRANSFORM_JS_CODE = 'jsCode';
