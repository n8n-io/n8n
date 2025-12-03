/**
 * n8n AI Abstraction Layer
 *
 * This module provides framework-agnostic interfaces for AI functionality.
 * Community nodes should implement these interfaces instead of depending on
 * specific AI frameworks like LangChain.
 */

export type {
	IN8nAiMessage,
	IN8nChatModel,
	IN8nChatModelConfig,
	IN8nEmbeddings,
	IN8nOutputParser,
	IN8nTool,
	IN8nVectorStore,
	IN8nVectorStoreConfig,
} from './interfaces';
export { N8nAiMessageRole, N8nAiNodeType } from './interfaces';
export type {
	N8NBaseChatMessageHistory,
	N8nSimpleMemory,
	N8nMemory,
} from './memory';
export {
	isN8nSimpleMemory,
	isN8nMemory,
	isN8nChatModel,
	isN8nAiMessage,
	isN8nTool,
	isN8nOutputParser,
	isN8nEmbeddings,
	isN8nVectorStore,
	isN8nAiMessageArray,
	supportsDeletion,
	supportsSimilaritySearchWithScore,
	supportsStreaming,
} from './type-guards';
export {
	createAiMessage,
	createHumanMessage,
	createSystemMessage,
	promptToMessages,
	extractMessageContent,
	filterMessagesByRole,
	getLastMessages,
	trimConversationHistory,
	createToolSchema,
	validateToolInput,
	formatToolSchema,
	formatConversation,
	estimateTokenCount,
} from './utils';
