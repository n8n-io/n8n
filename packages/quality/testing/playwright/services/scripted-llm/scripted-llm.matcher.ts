import {
	DEFAULT_FALLBACK_TEXT,
	FALLBACK_RULE_ID,
	type LastToolResult,
	type MessagesRequest,
	type RequestContentBlock,
	type RequestContext,
	type RequestMessage,
	type Script,
	type ScriptRule,
	type SelectedReply,
} from './scripted-llm.types';

type TextBlock = { type: 'text'; text: string };
type ToolUseBlock = { type: 'tool_use'; id: string; name: string };
type ToolResultBlock = {
	type: 'tool_result';
	tool_use_id: string;
	content?: string | Array<{ type: string }>;
	is_error?: boolean;
};

function isTextBlock(block: { type: string }): block is TextBlock {
	return block.type === 'text' && 'text' in block && typeof block.text === 'string';
}

function isToolUseBlock(block: RequestContentBlock): block is ToolUseBlock {
	return (
		block.type === 'tool_use' &&
		'id' in block &&
		typeof block.id === 'string' &&
		'name' in block &&
		typeof block.name === 'string'
	);
}

function isToolResultBlock(block: RequestContentBlock): block is ToolResultBlock {
	return (
		block.type === 'tool_result' && 'tool_use_id' in block && typeof block.tool_use_id === 'string'
	);
}

function blocksOf(content: RequestMessage['content']): RequestContentBlock[] {
	return typeof content === 'string' ? [{ type: 'text', text: content }] : content;
}

/** Map each tool call id in the assistant messages to its tool name. Later calls win. */
function toolNamesById(messages: RequestMessage[]): Map<string, string> {
	const names = new Map<string, string>();
	for (const message of messages) {
		if (message.role !== 'assistant' || typeof message.content === 'string') continue;
		for (const block of message.content.filter(isToolUseBlock)) names.set(block.id, block.name);
	}
	return names;
}

function toolResultText(content: ToolResultBlock['content']): string {
	if (content === undefined) return '';
	if (typeof content === 'string') return content;
	return content
		.filter(isTextBlock)
		.map((block) => block.text)
		.join('\n');
}

function toLastToolResult(block: ToolResultBlock, names: Map<string, string>): LastToolResult {
	return {
		toolName: names.get(block.tool_use_id),
		text: toolResultText(block.content),
		isError: block.is_error === true,
	};
}

function systemTextOf(system: MessagesRequest['system']): string {
	if (system === undefined) return '';
	if (typeof system === 'string') return system;
	return system
		.filter(isTextBlock)
		.map((block) => block.text)
		.join('\n');
}

/**
 * Collect the facts about a request that the rules can match. Only the latest message
 * counts, and only when it is a user message. A message with only tool results has no user text.
 */
export function describeRequest(request: MessagesRequest): RequestContext {
	const last = request.messages.at(-1);
	const latest = last?.role === 'user' ? blocksOf(last.content) : [];
	const toolResult = latest.filter(isToolResultBlock).at(-1);
	return {
		lastUserText: latest.filter(isTextBlock).at(-1)?.text,
		lastToolResult: toolResult && toLastToolResult(toolResult, toolNamesById(request.messages)),
		systemText: systemTextOf(request.system),
		toolNames: new Set((request.tools ?? []).map((tool) => tool.name)),
	};
}

/** True when every `when` field that the rule sets matches the request. */
export function ruleMatches(rule: ScriptRule, context: RequestContext): boolean {
	const { userText, afterTool, systemIncludes, toolAvailable } = rule.when;
	const checks = [
		userText === undefined ||
			(context.lastUserText !== undefined && new RegExp(userText, 'i').test(context.lastUserText)),
		afterTool === undefined || context.lastToolResult?.toolName === afterTool,
		systemIncludes === undefined || new RegExp(systemIncludes).test(context.systemText),
		toolAvailable === undefined || context.toolNames.has(toolAvailable),
	];
	return checks.every(Boolean);
}

export function isUsedUp(rule: ScriptRule, usage: ReadonlyMap<string, number>): boolean {
	return rule.times !== undefined && (usage.get(rule.id) ?? 0) >= rule.times;
}

/**
 * Pick the reply for a request: the first rule, in order, that matches and is not used up.
 * The function does not change `usage`. The caller counts the use.
 */
export function selectReply(
	script: Script,
	request: MessagesRequest,
	usage: ReadonlyMap<string, number>,
): SelectedReply {
	const context = describeRequest(request);
	const fallbackText = script.fallback?.text ?? DEFAULT_FALLBACK_TEXT;
	const rule = script.rules.find((r) => !isUsedUp(r, usage) && ruleMatches(r, context));

	if (!rule) {
		return {
			ruleId: FALLBACK_RULE_ID,
			text: fallbackText,
			toolCalls: [],
			skippedTools: [],
			context,
		};
	}

	// A model never calls a tool that the request does not offer.
	const requested = rule.reply.toolCalls ?? [];
	const toolCalls = requested.filter((call) => context.toolNames.has(call.name));
	const skippedTools = requested
		.filter((call) => !context.toolNames.has(call.name))
		.map((call) => call.name);
	const text = rule.reply.text ?? (toolCalls.length === 0 ? fallbackText : undefined);

	return { ruleId: rule.id, text, toolCalls, skippedTools, context };
}

/** Count one use of a rule. The fallback has no budget, so it is not counted. */
export function recordUse(usage: Map<string, number>, ruleId: string): void {
	if (ruleId === FALLBACK_RULE_ID) return;
	usage.set(ruleId, (usage.get(ruleId) ?? 0) + 1);
}
