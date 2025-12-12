/**
 * n8n AI Abstraction Layer
 *
 * This module provides framework-agnostic interfaces for AI functionality.
 * Community nodes should implement these interfaces instead of depending on
 * specific AI frameworks like LangChain.
 */

export * from './interfaces';
export * from './type-guards';
export * from './utils';
