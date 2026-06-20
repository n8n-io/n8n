import type { Locator } from '@playwright/test';

/**
 * Page object for the Assignment Collection surface.
 *
 * Rooted at one Vue component
 * (`packages/frontend/editor-ui/src/features/ndv/parameters/components/AssignmentCollection/AssignmentCollection.vue`,
 * `data-test-id="assignment-collection-${parameter.name}"`). All selectors are
 * scoped to that root inside the hosting NDV container.
 *
 * @example
 * // Inside a hosting page object
 * readonly assignmentCollection = new AssignmentCollection(this.container);
 *
 * // Inside a test
 * await n8n.ndv.getAssignmentCollectionAdd('assignments').click();
 */
export class AssignmentCollection {
	constructor(private readonly root: Locator) {}

	/** In-NDV root for a given assignment-collection parameter. */
	getContainer(paramName: string): Locator {
		return this.root.getByTestId(`assignment-collection-${paramName}`);
	}

	getDropArea(paramName: string): Locator {
		return this.getContainer(paramName).getByTestId('assignment-collection-drop-area');
	}

	getAdd(paramName: string): Locator {
		return this.getDropArea(paramName);
	}

	async clickDropArea(paramName: string): Promise<void> {
		await this.getDropArea(paramName).click();
	}

	getAssignments(paramName: string): Locator {
		return this.getContainer(paramName).getByTestId('assignment');
	}

	getAssignmentValue(paramName: string): Locator {
		return this.getContainer(paramName).getByTestId('assignment-value');
	}

	getAssignmentValueAt(paramName: string, index = 0): Locator {
		return this.getAssignments(paramName).nth(index).getByTestId('assignment-value');
	}

	getAssignmentTypeSelectAt(paramName: string, index = 0): Locator {
		return this.getAssignments(paramName).nth(index).getByTestId('assignment-type-select');
	}

	getExpressionToggle(paramName: string): Locator {
		return this.getAssignmentValue(paramName).getByText('Expression');
	}

	async clickExpressionToggle(paramName: string): Promise<void> {
		await this.getExpressionToggle(paramName).click();
	}

	getAssignmentName(paramName: string, index = 0): Locator {
		return this.getAssignments(paramName).nth(index).getByTestId('assignment-name');
	}

	getAssignmentNameTextbox(paramName: string, index = 0): Locator {
		return this.getAssignmentName(paramName, index).getByRole('textbox');
	}
}
