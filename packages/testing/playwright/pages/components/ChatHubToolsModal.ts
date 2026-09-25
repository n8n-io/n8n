import type { Locator } from '@playwright/test';

import { dialogCloseIconIn } from './dialogLocators';
import { NodeCredentials } from './NodeCredentials';

export class ChatHubToolsModal {
	private readonly credentials: NodeCredentials;

	constructor(private root: Locator) {
		this.credentials = new NodeCredentials(root);
	}

	getRoot(): Locator {
		return this.root;
	}

	/** Click "Add" button next to a tool in the available tools list */
	getAddButton(toolDisplayName: string): Locator {
		return this.root
			.locator('[class*="item"]')
			.filter({ hasText: toolDisplayName })
			.getByRole('button', { name: /add/i });
	}

	/** Credential selector rendered by NodeCredentials inside settings view */
	getCredentialSelect(): Locator {
		return this.credentials.getSelect();
	}

	/** Save button in the settings view header */
	getSaveButton(): Locator {
		return this.root.getByRole('button', { name: /save/i });
	}

	/** Get a parameter input by parameter name (e.g. "operation") */
	getParameterInput(parameterName: string): Locator {
		return this.root.getByTestId(`parameter-input-${parameterName}`);
	}

	/** Get the "from AI" override button scoped to a specific parameter */
	getFromAiOverrideButton(parameterName: string): Locator {
		return this.getParameterInput(parameterName).getByTestId('from-ai-override-button');
	}

	/** Close button (X) shown in list view */
	getCloseButton(): Locator {
		return dialogCloseIconIn(this.root);
	}
}
