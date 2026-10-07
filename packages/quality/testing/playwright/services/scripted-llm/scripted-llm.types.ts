import { UserError } from 'n8n-workflow';
import { z } from 'zod';

export const DEFAULT_FALLBACK_TEXT = 'Done.';

/** The `ruleId` that `requests()` shows when no rule matched. */
export const FALLBACK_RULE_ID = 'fallback';

function isValidRegexSource(source: string): boolean {
	try {
		new RegExp(source);
		return true;
	} catch {
		return false;
	}
}

const regexSourceSchema = z
	.string()
	.min(1)
	.refine(isValidRegexSource, { message: 'Must be a valid regular expression source' });

const toolCallSchema = z
	.object({
		name: z.string().min(1),
		input: z.record(z.unknown()),
	})
	.strict();

const whenSchema = z
	.object({
		userText: regexSourceSchema.optional(),
		afterTool: z.string().min(1).optional(),
		systemIncludes: regexSourceSchema.optional(),
		toolAvailable: z.string().min(1).optional(),
	})
	.strict();

const replySchema = z
	.object({
		text: z.string().min(1).optional(),
		toolCalls: z.array(toolCallSchema).optional(),
	})
	.strict()
	.refine((reply) => reply.text !== undefined || (reply.toolCalls?.length ?? 0) > 0, {
		message: 'A reply needs text or at least one tool call',
	});

const ruleSchema = z
	.object({
		id: z
			.string()
			.min(1)
			.refine((id) => id !== FALLBACK_RULE_ID, {
				message: `"${FALLBACK_RULE_ID}" is reserved for the fallback reply`,
			}),
		when: whenSchema,
		reply: replySchema,
		times: z.number().int().positive().optional(),
	})
	.strict();

export const scriptSchema = z
	.object({
		rules: z.array(ruleSchema),
		fallback: z
			.object({ text: z.string().min(1) })
			.strict()
			.optional(),
	})
	.strict()
	.superRefine((script, ctx) => {
		// Usage counts are kept per rule id, so two rules with one id would share a budget.
		const seen = new Set<string>();
		script.rules.forEach((rule, index) => {
			if (seen.has(rule.id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['rules', index, 'id'],
					message: `Duplicate rule id "${rule.id}"`,
				});
			}
			seen.add(rule.id);
		});
	});

export type Script = z.infer<typeof scriptSchema>;
export type ScriptInput = z.input<typeof scriptSchema>;
export type ScriptRule = Script['rules'][number];
export type ScriptToolCall = z.infer<typeof toolCallSchema>;

/** Validate a script. Throw a `UserError` that lists every problem. */
export function parseScript(input: unknown): Script {
	const result = scriptSchema.safeParse(input);
	if (result.success) return result.data;

	const problems = result.error.issues
		.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
		.join('; ');
	throw new UserError(`Invalid scripted LLM script: ${problems}`);
}

// The Anthropic Messages request. The schema is lenient: it reads only the fields
// that the matcher needs and keeps all other fields.
const textBlockSchema = z.object({ type: z.literal('text'), text: z.string() }).passthrough();

const toolUseBlockSchema = z
	.object({ type: z.literal('tool_use'), id: z.string(), name: z.string(), input: z.unknown() })
	.passthrough();

const toolResultBlockSchema = z
	.object({
		type: z.literal('tool_result'),
		tool_use_id: z.string(),
		content: z
			.union([z.string(), z.array(z.object({ type: z.string() }).passthrough())])
			.optional(),
		is_error: z.boolean().optional(),
	})
	.passthrough();

const otherBlockSchema = z.object({ type: z.string() }).passthrough();

const contentBlockSchema = z.union([
	textBlockSchema,
	toolUseBlockSchema,
	toolResultBlockSchema,
	otherBlockSchema,
]);

const messageSchema = z
	.object({
		role: z.enum(['user', 'assistant']),
		content: z.union([z.string(), z.array(contentBlockSchema)]),
	})
	.passthrough();

export const messagesRequestSchema = z
	.object({
		model: z.string().min(1),
		messages: z.array(messageSchema),
		system: z.union([z.string(), z.array(z.object({ type: z.string() }).passthrough())]).optional(),
		tools: z.array(z.object({ name: z.string() }).passthrough()).optional(),
		stream: z.boolean().optional(),
	})
	.passthrough();

export type MessagesRequest = z.infer<typeof messagesRequestSchema>;
export type RequestMessage = MessagesRequest['messages'][number];
export type RequestContentBlock = z.infer<typeof contentBlockSchema>;

/** The facts about one request that the rules can match. */
export type RequestContext = {
	lastUserText?: string;
	lastToolResult?: LastToolResult;
	systemText: string;
	toolNames: Set<string>;
};

export type LastToolResult = {
	/** Name of the `tool_use` that the result answers. Undefined when no earlier assistant message has that id. */
	toolName?: string;
	text: string;
	isError: boolean;
};

export type SelectedReply = {
	ruleId: string;
	text?: string;
	toolCalls: ScriptToolCall[];
	/** Tool calls that the rule asked for but that the request did not offer. */
	skippedTools: string[];
	context: RequestContext;
};

/** One entry of `requests()`. Tests assert on these. */
export type ScriptedLlmRequestRecord = {
	ruleId: string;
	stream: boolean;
	model: string;
	lastUserText?: string;
	lastToolResult?: LastToolResult;
	skippedTools: string[];
};
