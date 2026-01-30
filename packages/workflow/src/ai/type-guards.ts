/**
 * Type Guards for n8n AI Interfaces
 *
 * Runtime type checking utilities to verify objects implement AI interfaces
 */

import type {
	IN8nChatModel,
	IN8nEmbeddings,
	IN8nVectorStore,
	IN8nTool,
	IN8nMemory,
	IN8nOutputParser,
	IN8nAiMessage,
} from './interfaces';
import { N8nAiMessageRole } from './interfaces';

/**
 * Type guard to check if an object implements IN8nChatModel
 * @param obj - Object to check
 * @returns True if obj is a valid chat model
 */
export function isN8nChatModel(obj: unknown): obj is IN8nChatModel {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'invoke' in obj &&
		typeof (obj as IN8nChatModel).invoke === 'function' &&
		'modelName' in obj &&
		typeof (obj as IN8nChatModel).modelName === 'string'
	);
}

/**
 * Type guard to check if an object implements IN8nEmbeddings
 * @param obj - Object to check
 * @returns True if obj is a valid embeddings model
 */
export function isN8nEmbeddings(obj: unknown): obj is IN8nEmbeddings {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'embedQuery' in obj &&
		typeof (obj as IN8nEmbeddings).embedQuery === 'function' &&
		'embedDocuments' in obj &&
		typeof (obj as IN8nEmbeddings).embedDocuments === 'function'
	);
}

/**
 * Type guard to check if an object implements IN8nVectorStore
 * @param obj - Object to check
 * @returns True if obj is a valid vector store
 */
export function isN8nVectorStore(obj: unknown): obj is IN8nVectorStore {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'addDocuments' in obj &&
		typeof (obj as IN8nVectorStore).addDocuments === 'function' &&
		'similaritySearch' in obj &&
		typeof (obj as IN8nVectorStore).similaritySearch === 'function' &&
		'storeType' in obj &&
		typeof (obj as IN8nVectorStore).storeType === 'string'
	);
}

/**
 * Type guard to check if an object implements IN8nTool
 * @param obj - Object to check
 * @returns True if obj is a valid tool
 */
export function isN8nTool(obj: unknown): obj is IN8nTool {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'name' in obj &&
		typeof (obj as IN8nTool).name === 'string' &&
		'description' in obj &&
		typeof (obj as IN8nTool).description === 'string' &&
		'call' in obj &&
		typeof (obj as IN8nTool).call === 'function' &&
		'schema' in obj &&
		typeof (obj as IN8nTool).schema === 'object'
	);
}

/**
 * Type guard to check if an object implements IN8nMemory
 * @param obj - Object to check
 * @returns True if obj is a valid memory store
 */
export function isN8nMemory(obj: unknown): obj is IN8nMemory {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'loadMemory' in obj &&
		typeof (obj as IN8nMemory).loadMemory === 'function' &&
		'saveContext' in obj &&
		typeof (obj as IN8nMemory).saveContext === 'function' &&
		'clear' in obj &&
		typeof (obj as IN8nMemory).clear === 'function'
	);
}

/**
 * Type guard to check if an object implements IN8nOutputParser
 * @param obj - Object to check
 * @returns True if obj is a valid output parser
 */
export function isN8nOutputParser(obj: unknown): obj is IN8nOutputParser {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'parse' in obj &&
		typeof (obj as IN8nOutputParser).parse === 'function' &&
		'getFormatInstructions' in obj &&
		typeof (obj as IN8nOutputParser).getFormatInstructions === 'function'
	);
}

/**
 * Type guard to check if an object is a valid AI message
 * @param obj - Object to check
 * @returns True if obj is a valid AI message
 */
export function isN8nAiMessage(obj: unknown): obj is IN8nAiMessage {
	if (typeof obj !== 'object' || obj === null) return false;

	const msg = obj as Partial<IN8nAiMessage>;

	return (
		typeof msg.role === 'string' &&
		typeof msg.content === 'string' &&
		Object.values<string>(N8nAiMessageRole).includes(msg.role)
	);
}

/**
 * Validate an array of AI messages
 * @param obj - Object to check
 * @returns True if obj is a valid array of AI messages
 */
export function isN8nAiMessageArray(obj: unknown): obj is IN8nAiMessage[] {
	return Array.isArray(obj) && obj.every(isN8nAiMessage);
}

/**
 * Type guard to check if a chat model supports streaming
 * @param model - Chat model to check
 * @returns True if model has stream method
 */
export function supportsStreaming(
	model: IN8nChatModel,
): model is Required<Pick<IN8nChatModel, 'stream'>> & IN8nChatModel {
	return 'stream' in model && typeof model.stream === 'function';
}

/**
 * Type guard to check if a vector store supports deletion
 * @param store - Vector store to check
 * @returns True if store has delete method
 */
export function supportsDeletion(
	store: IN8nVectorStore,
): store is Required<Pick<IN8nVectorStore, 'delete'>> & IN8nVectorStore {
	return 'delete' in store && typeof store.delete === 'function';
}

/**
 * Type guard to check if a vector store supports similarity search with scores
 * @param store - Vector store to check
 * @returns True if store has similaritySearchWithScore method
 */
export function supportsSimilaritySearchWithScore(
	store: IN8nVectorStore,
): store is Required<Pick<IN8nVectorStore, 'similaritySearchWithScore'>> & IN8nVectorStore {
	return (
		'similaritySearchWithScore' in store && typeof store.similaritySearchWithScore === 'function'
	);
}
