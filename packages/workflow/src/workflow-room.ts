/**
 * Workflow Room - Shared persistence logic for CRDT documents
 *
 * This class manages debounced autosaving and change detection for CRDT documents.
 * Used by both:
 * - Server (packages/cli/src/crdt/crdt-websocket.service.ts)
 * - Worker Mode (packages/frontend/editor-ui/src/app/workers/coordinator)
 *
 * The actual save mechanism is provided via a callback, allowing different
 * implementations (database save vs REST API).
 */

import type { CRDTDocLike } from './crdt-workflow-helpers';
import type { Workflow } from './workflow';

// Debounce timing constants
const DEBOUNCE_DELAY_MS = 1500; // 1.5 seconds
const MAX_WAIT_MS = 5000; // 5 seconds max wait

/** Logger interface for room operations */
export interface WorkflowRoomLogger {
	debug(message: string, meta?: Record<string, unknown>): void;
}

/** Default no-op logger */
const noopLogger: WorkflowRoomLogger = {
	debug: () => {},
};

/**
 * A workflow room manages a single CRDT document and its associated workflow.
 * Handles debounced autosaving and change detection.
 *
 * Note: We use a simple "dirty" flag for change detection instead of state vector
 * comparison because Yjs deletions are tombstones that don't increment the deleting
 * client's clock - they just reference existing items. This means state vectors
 * don't change for deletion-only updates.
 */
export class WorkflowRoom {
	private debouncedSave: ReturnType<typeof setTimeout> | null = null;
	private maxWaitTimeout: ReturnType<typeof setTimeout> | null = null;
	private isDirty = false;
	private lastScheduleTime = 0;

	constructor(
		readonly doc: CRDTDocLike,
		readonly workflow: Workflow,
		private readonly unsubscribe: () => void,
		readonly originalVersionId: string,
		private readonly saveCallback: (room: WorkflowRoom) => Promise<void>,
		private readonly logger: WorkflowRoomLogger = noopLogger,
	) {}

	/**
	 * Schedule a debounced save. Call this after each document update.
	 * Marks the room as dirty (has unsaved changes).
	 */
	scheduleSave(): void {
		this.isDirty = true;
		const now = Date.now();

		// Clear existing debounce timeout
		if (this.debouncedSave) {
			clearTimeout(this.debouncedSave);
		}

		// Set up max wait timeout if this is the first schedule in a batch
		if (!this.maxWaitTimeout) {
			this.lastScheduleTime = now;
			this.maxWaitTimeout = setTimeout(() => {
				this.logger.debug('[CRDT] Max wait reached, executing save', { docId: this.doc.id });
				this.executeSave();
			}, MAX_WAIT_MS);
		}

		// Set up debounced save
		this.debouncedSave = setTimeout(() => {
			this.logger.debug('[CRDT] Executing debounced save', { docId: this.doc.id });
			this.executeSave();
		}, DEBOUNCE_DELAY_MS);
	}

	/**
	 * Execute the save and clear timeouts
	 */
	private executeSave(): void {
		this.clearTimeouts();
		void this.saveCallback(this);
	}

	/**
	 * Clear all pending timeouts
	 */
	private clearTimeouts(): void {
		if (this.debouncedSave) {
			clearTimeout(this.debouncedSave);
			this.debouncedSave = null;
		}
		if (this.maxWaitTimeout) {
			clearTimeout(this.maxWaitTimeout);
			this.maxWaitTimeout = null;
		}
	}

	/**
	 * Check if there are unsaved changes.
	 */
	hasUnsavedChanges(): boolean {
		this.logger.debug('[CRDT] Checking unsaved changes', {
			docId: this.doc.id,
			isDirty: this.isDirty,
		});
		return this.isDirty;
	}

	/**
	 * Mark the room as clean (no unsaved changes) after a successful save.
	 */
	markClean(): void {
		this.isDirty = false;
		this.logger.debug('[CRDT] Marked room as clean', { docId: this.doc.id });
	}

	/**
	 * Cancel any pending debounced save and trigger an immediate final save.
	 * Returns a promise that resolves when the save completes.
	 */
	async finalSave(): Promise<void> {
		this.clearTimeouts();
		this.logger.debug('[CRDT] Triggering final save', { docId: this.doc.id });
		await this.saveCallback(this);
	}

	/**
	 * Clean up resources.
	 */
	destroy(): void {
		this.clearTimeouts();
		this.unsubscribe();
	}
}
