export type ChatHubMessageType = 'human' | 'ai' | 'system' | 'tool' | 'generic';
export type ChatHubMessageStatus = 'success' | 'error' | 'running' | 'cancelled' | 'waiting';
export type ChatHubMemoryRole = 'human' | 'ai' | 'system' | 'tool';

// Structure for storing @langchain/core/messages ToolCall details
export interface IToolCall {
	name: string;
	args: Record<string, unknown>;
}

/**
 * Structure for storing human messages as JSON.
 */
export interface StoredHumanMessage {
	content: string;
}

export function isHumanMessage(content: unknown): content is StoredHumanMessage {
	return (
		typeof content === 'object' &&
		content !== null &&
		'content' in content &&
		typeof content.content === 'string'
	);
}

/**
 * Structure for storing AI messages as JSON.
 * Includes tool_calls array so ToolMessages can be properly matched when reconstructing history.
 */
export interface StoredAIMessage {
	content: string;
	toolCalls: IToolCall[];
}

export function isAIMessage(content: unknown): content is StoredAIMessage {
	return (
		typeof content === 'object' &&
		content !== null &&
		'content' in content &&
		typeof content.content === 'string' &&
		'toolCalls' in content &&
		Array.isArray(content.toolCalls)
	);
}

/**
 * Structure for storing tool messages as JSON.
 */
export interface StoredToolMessage {
	toolCallId: string;
	toolName: string;
	toolInput: unknown;
	toolOutput: unknown;
}

export function isToolMessage(content: unknown): content is StoredToolMessage {
	return (
		typeof content === 'object' &&
		content !== null &&
		'toolCallId' in content &&
		'toolName' in content &&
		'toolInput' in content &&
		'toolOutput' in content
	);
}

export interface StoredSystemMessage {
	content: string;
}

export function isSystemMessage(content: unknown): content is StoredSystemMessage {
	return (
		typeof content === 'object' &&
		content !== null &&
		'content' in content &&
		typeof content.content === 'string'
	);
}

export type StoredMessage =
	| StoredHumanMessage
	| StoredAIMessage
	| StoredToolMessage
	| StoredSystemMessage;

/**
 * Message structure returned from Chat Hub for memory reconstruction.
 * Includes the chain tracking fields for proper history building.
 * Used for building the chat_hub_messages chain.
 */
export interface ChatHubMemoryMessage {
	id: string;
	type: ChatHubMessageType;
	content: string;
	name: string;
	createdAt: Date;
	previousMessageId: string | null;
	retryOfMessageId: string | null;
	revisionOfMessageId: string | null;
	/** Correlation ID linking this message to a specific execution turn */
	turnId: string | null;
}

/**
 * Memory entry structure stored in chat_hub_memory table.
 * Simpler than ChatHubMemoryMessage - no chaining, just linked to parent message.
 */
export interface ChatHubMemoryEntry {
	id: string;
	role: ChatHubMemoryRole;
	content: StoredMessage;
	name: string;
	createdAt: Date;
}

/**
 * Service interface for interacting with chat hub memory for a specific node.
 * Memory is stored separately from chat UI messages, allowing:
 * - Multiple memory nodes in the same workflow to have isolated memory
 * - Proper branching on edit/retry via turnId linking
 */
export interface IChatHubMemoryService {
	/** Get session owner ID (the user who owns the session), or undefined for anonymous sessions */
	getOwnerId(): string | undefined;

	/**
	 * Get memory entries for this node.
	 * Memory is loaded based on the current message chain,
	 * properly handling edit/retry branching.
	 */
	getMemory(): Promise<ChatHubMemoryEntry[]>;

	/**
	 * Add a human message to memory.
	 * Called when recording the user's input that triggered the execution.
	 */
	addHumanMessage(content: string): Promise<void>;

	/**
	 * Add an AI message to memory.
	 * Called when the agent produces a response.
	 */
	addAIMessage(content: string, toolCalls: IToolCall[]): Promise<void>;

	/**
	 * Add a tool call/result message to memory.
	 * Called when a tool is executed by the agent.
	 */
	addToolMessage(
		toolCallId: string,
		toolName: string,
		toolInput: unknown,
		toolOutput: unknown,
	): Promise<void>;

	/**
	 * Clear all memory for this node in this session.
	 */
	clearMemory(): Promise<void>;

	/**
	 * Ensure session exists, creating it if needed.
	 */
	ensureSession(): Promise<void>;
}

// Keep old interface name as alias for backwards compatibility during transition
export type IChatHubSessionService = IChatHubMemoryService;
