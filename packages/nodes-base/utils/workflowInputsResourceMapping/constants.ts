// The input contract's vocabulary lives in n8n-workflow, where its several
// readers (this node, MCP, the run surfaces) can all reach it.
export {
	INPUT_SOURCE,
	WORKFLOW_INPUTS,
	VALUES,
	JSON_EXAMPLE,
	PASSTHROUGH,
	TYPE_OPTIONS,
} from 'n8n-workflow';

export const FALLBACK_DEFAULT_VALUE = null;
