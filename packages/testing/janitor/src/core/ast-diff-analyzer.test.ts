import { Project } from 'ts-morph';
import { describe, it, expect } from 'vitest';

/**
 * Tests for AST-based method extraction and diffing logic.
 *
 * Note: We can't easily test the full diffFileMethods() function in unit tests
 * because it relies on git. Instead, we test the core extraction logic by
 * recreating the method extraction in isolation.
 */

// Helper to extract methods from a source file (mirrors the internal function)
function extractMethods(sourceFile: ReturnType<Project['createSourceFile']>): Map<string, string> {
	const methods = new Map<string, string>();

	for (const classDecl of sourceFile.getClasses()) {
		const className = classDecl.getName() ?? 'AnonymousClass';

		for (const method of classDecl.getMethods()) {
			const methodName = method.getName();
			const key = `${className}.${methodName}`;
			const bodyText = method.getText();
			methods.set(key, bodyText);
		}
	}

	return methods;
}

// Helper to diff two method maps
function diffMethods(
	baseMethods: Map<string, string>,
	currentMethods: Map<string, string>,
): Array<{ className: string; methodName: string; changeType: 'added' | 'removed' | 'modified' }> {
	const changes: Array<{
		className: string;
		methodName: string;
		changeType: 'added' | 'removed' | 'modified';
	}> = [];

	// Check for modified or removed methods
	for (const [key, baseText] of baseMethods) {
		const currentText = currentMethods.get(key);
		const [className, methodName] = key.split('.');

		if (currentText === undefined) {
			changes.push({ className, methodName, changeType: 'removed' });
		} else if (currentText !== baseText) {
			changes.push({ className, methodName, changeType: 'modified' });
		}
	}

	// Check for added methods
	for (const [key] of currentMethods) {
		if (!baseMethods.has(key)) {
			const [className, methodName] = key.split('.');
			changes.push({ className, methodName, changeType: 'added' });
		}
	}

	return changes;
}

describe('AST Diff Analyzer', () => {
	describe('Method Extraction', () => {
		it('extracts methods from a class', () => {
			const project = new Project({ useInMemoryFileSystem: true });
			const file = project.createSourceFile(
				'test.ts',
				`
export class CanvasPage {
  async addNode(name: string) {
    await this.click(name);
  }

  async connectNodes(from: string, to: string) {
    await this.drag(from, to);
  }

  get container() {
    return this.page.getByTestId('canvas');
  }
}
`,
			);

			const methods = extractMethods(file);

			expect(methods.size).toBe(2); // Only methods, not getters
			expect(methods.has('CanvasPage.addNode')).toBe(true);
			expect(methods.has('CanvasPage.connectNodes')).toBe(true);
		});

		it('extracts methods from multiple classes', () => {
			const project = new Project({ useInMemoryFileSystem: true });
			const file = project.createSourceFile(
				'test.ts',
				`
export class PageA {
  methodA() { return 'a'; }
}

export class PageB {
  methodB() { return 'b'; }
}
`,
			);

			const methods = extractMethods(file);

			expect(methods.size).toBe(2);
			expect(methods.has('PageA.methodA')).toBe(true);
			expect(methods.has('PageB.methodB')).toBe(true);
		});

		it('handles empty class', () => {
			const project = new Project({ useInMemoryFileSystem: true });
			const file = project.createSourceFile(
				'test.ts',
				`
export class EmptyPage {
}
`,
			);

			const methods = extractMethods(file);

			expect(methods.size).toBe(0);
		});
	});

	describe('Method Diffing', () => {
		it('detects added methods', () => {
			const project = new Project({ useInMemoryFileSystem: true });

			const baseFile = project.createSourceFile(
				'base.ts',
				`
export class CanvasPage {
  async addNode() {}
}
`,
			);

			const currentFile = project.createSourceFile(
				'current.ts',
				`
export class CanvasPage {
  async addNode() {}
  async deleteNode() {}
}
`,
			);

			const baseMethods = extractMethods(baseFile);
			const currentMethods = extractMethods(currentFile);
			const changes = diffMethods(baseMethods, currentMethods);

			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				className: 'CanvasPage',
				methodName: 'deleteNode',
				changeType: 'added',
			});
		});

		it('detects removed methods', () => {
			const project = new Project({ useInMemoryFileSystem: true });

			const baseFile = project.createSourceFile(
				'base.ts',
				`
export class CanvasPage {
  async addNode() {}
  async deleteNode() {}
}
`,
			);

			const currentFile = project.createSourceFile(
				'current.ts',
				`
export class CanvasPage {
  async addNode() {}
}
`,
			);

			const baseMethods = extractMethods(baseFile);
			const currentMethods = extractMethods(currentFile);
			const changes = diffMethods(baseMethods, currentMethods);

			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				className: 'CanvasPage',
				methodName: 'deleteNode',
				changeType: 'removed',
			});
		});

		it('detects modified methods', () => {
			const project = new Project({ useInMemoryFileSystem: true });

			const baseFile = project.createSourceFile(
				'base.ts',
				`
export class CanvasPage {
  async addNode() {
    await this.click('add');
  }
}
`,
			);

			const currentFile = project.createSourceFile(
				'current.ts',
				`
export class CanvasPage {
  async addNode() {
    await this.click('add');
    await this.waitForAnimation();
  }
}
`,
			);

			const baseMethods = extractMethods(baseFile);
			const currentMethods = extractMethods(currentFile);
			const changes = diffMethods(baseMethods, currentMethods);

			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				className: 'CanvasPage',
				methodName: 'addNode',
				changeType: 'modified',
			});
		});

		it('detects no changes when methods are identical', () => {
			const project = new Project({ useInMemoryFileSystem: true });

			const baseFile = project.createSourceFile(
				'base.ts',
				`
export class CanvasPage {
  async addNode() {
    await this.click('add');
  }
}
`,
			);

			const currentFile = project.createSourceFile(
				'current.ts',
				`
export class CanvasPage {
  async addNode() {
    await this.click('add');
  }
}
`,
			);

			const baseMethods = extractMethods(baseFile);
			const currentMethods = extractMethods(currentFile);
			const changes = diffMethods(baseMethods, currentMethods);

			expect(changes).toHaveLength(0);
		});

		it('detects multiple changes', () => {
			const project = new Project({ useInMemoryFileSystem: true });

			const baseFile = project.createSourceFile(
				'base.ts',
				`
export class CanvasPage {
  async addNode() { return 'old'; }
  async deleteNode() {}
  async oldMethod() {}
}
`,
			);

			const currentFile = project.createSourceFile(
				'current.ts',
				`
export class CanvasPage {
  async addNode() { return 'new'; }
  async deleteNode() {}
  async newMethod() {}
}
`,
			);

			const baseMethods = extractMethods(baseFile);
			const currentMethods = extractMethods(currentFile);
			const changes = diffMethods(baseMethods, currentMethods);

			expect(changes).toHaveLength(3);

			const added = changes.find((c) => c.changeType === 'added');
			const removed = changes.find((c) => c.changeType === 'removed');
			const modified = changes.find((c) => c.changeType === 'modified');

			expect(added?.methodName).toBe('newMethod');
			expect(removed?.methodName).toBe('oldMethod');
			expect(modified?.methodName).toBe('addNode');
		});

		it('handles class rename as remove + add', () => {
			const project = new Project({ useInMemoryFileSystem: true });

			const baseFile = project.createSourceFile(
				'base.ts',
				`
export class OldPage {
  async doSomething() {}
}
`,
			);

			const currentFile = project.createSourceFile(
				'current.ts',
				`
export class NewPage {
  async doSomething() {}
}
`,
			);

			const baseMethods = extractMethods(baseFile);
			const currentMethods = extractMethods(currentFile);
			const changes = diffMethods(baseMethods, currentMethods);

			expect(changes).toHaveLength(2);

			const added = changes.find((c) => c.changeType === 'added');
			const removed = changes.find((c) => c.changeType === 'removed');

			expect(added).toEqual({
				className: 'NewPage',
				methodName: 'doSomething',
				changeType: 'added',
			});
			expect(removed).toEqual({
				className: 'OldPage',
				methodName: 'doSomething',
				changeType: 'removed',
			});
		});
	});
});
