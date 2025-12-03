import type { IN8nAiMessage } from './interfaces';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObject = Record<string, any>;
export type N8nMemoryInput = AnyObject;
export type N8nMemoryOutput = AnyObject;
export type N8nMemoryVariables = AnyObject;

/**
 * Base class for all chat message histories. All chat message histories
 * should extend this class.
 */
export interface N8NBaseChatMessageHistory {
	getMessages(): Promise<IN8nAiMessage[]>;
	addMessage(message: IN8nAiMessage): Promise<void>;
	addMessages(messages: IN8nAiMessage[]): Promise<void>;
	clear(): Promise<void>;
}

export interface N8nMemory {
	chatHistory: N8NBaseChatMessageHistory;
	returnMessages: boolean;
	inputKey?: string;
	outputKey?: string;
	get memoryKeys(): string[];
	/**
	 * Abstract method that should take an object of input values and return a
	 * Promise that resolves with an object of memory variables. The
	 * implementation of this method should load the memory variables from the
	 * provided input values.
	 * @param values An object of input values.
	 * @returns Promise that resolves with an object of memory variables.
	 */
	loadMemoryVariables(values: N8nMemoryInput): Promise<N8nMemoryVariables>;
	/**
	 * Abstract method that should take two objects, one of input values and
	 * one of output values, and return a Promise that resolves when the
	 * context has been saved. The implementation of this method should save
	 * the context based on the provided input and output values.
	 * @param inputValues An object of input values.
	 * @param outputValues An object of output values.
	 * @returns Promise that resolves when the context has been saved.
	 */
	saveContext(inputValues: N8nMemoryInput, outputValues: N8nMemoryOutput): Promise<void>;

	clear(): Promise<void>;
}

/**
 * Simplified memory interface with presets such as bufferWindow or buffer.
 */
export type N8nSimpleMemory = {
	chatHistory: N8NBaseChatMessageHistory;
	returnMessages: boolean;
	inputKey?: string;
	outputKey?: string;
} & (
	| {
			type: 'bufferWindow';
			humanPrefix?: string;
			aiPrefix?: string;
			memoryKey?: string;
			k?: number;
	  }
	| {
			type: 'buffer';
			chatHistory: N8NBaseChatMessageHistory;
			humanPrefix?: string;
			aiPrefix?: string;
			memoryKey?: string;
	  }
);
