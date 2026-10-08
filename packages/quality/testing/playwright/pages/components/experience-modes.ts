import type { Locator, Page } from '@playwright/test';

/**
 * The Simple and Power parts of the Assistant: the Interface switch and its collapsed
 * button, the Simple Workspace, the Power chat groups and the composer's + menu.
 * The Assistant page object keeps the chat itself.
 */
export class ExperienceModes {
	constructor(private readonly page: Page) {}

	/** One option of the Interface switch, by its visible label. */
	getModeOption(name: 'Simple' | 'Power'): Locator {
		return this.page
			.getByTestId('experience-mode-switch')
			.getByRole('radio', { name, exact: true });
	}

	/** The one-button mode switch of the collapsed sidebar. Its label names the mode it switches to. */
	getCollapsedModeToggle(): Locator {
		return this.page.getByTestId('experience-mode-toggle');
	}

	/** The button that collapses and expands the main sidebar. */
	getMainSidebarToggle(): Locator {
		return this.page.locator('#toggle-sidebar-button');
	}

	/** Text of a toast that the page shows, for example after a mode switch. */
	getToast(text: string): Locator {
		return this.page.getByText(text, { exact: true });
	}

	/** The Overview entry of the sidebar. */
	getOverviewEntry(): Locator {
		return this.page.getByTestId('project-home-menu-item');
	}

	/** The Personal entry. Simple mode shows it only in the open Workspace. */
	getPersonalEntry(): Locator {
		return this.page.getByTestId('project-personal-menu-item');
	}

	/** The Shared with you entry. Simple mode shows it only in the open Workspace. */
	getSharedEntry(): Locator {
		return this.page.getByTestId('project-shared-menu-item');
	}

	/** The Workspace heading of Simple mode. Its button shows `aria-expanded`. */
	getWorkspaceToggle(): Locator {
		return this.page
			.getByTestId('simple-workspace')
			.getByRole('button', { name: 'Workspace', exact: true });
	}

	/** A section heading of the sidebar, for example Chats, Automations or Favorites. */
	getSidebarButton(name: string): Locator {
		return this.page.getByRole('button', { name, exact: true });
	}

	/** A project row in the Workspace, by its name. */
	getProjectRow(name: string): Locator {
		return this.page.getByTestId('project-menu-item').filter({ hasText: name });
	}

	getChatsSection(): Locator {
		return this.page.getByTestId('instance-ai-sidebar-chats');
	}

	getAutomationsSection(): Locator {
		return this.page.getByTestId('assistant-automations');
	}

	/** One group of the chat list in Power mode. */
	getChatGroup(group: 'needs-you' | 'working' | 'ready' | 'done'): Locator {
		return this.page.getByTestId(`assistant-chat-group-${group}`);
	}

	/** A chat row of one Power group, by its accessible name. */
	getChatGroupItem(group: 'needs-you' | 'working' | 'ready' | 'done', name: string): Locator {
		return this.getChatGroup(group).getByRole('menuitem', { name, exact: true });
	}

	/** The state mark of a chat row in Simple mode. A chat that is done has none. */
	getChatStateMark(threadId: string): Locator {
		return this.page.getByTestId(`instance-ai-thread-state-${threadId}`);
	}

	/** A menu item of the sidebar, by its accessible name. */
	getSidebarMenuItem(name: string): Locator {
		return this.page.getByRole('menuitem', { name, exact: true });
	}

	/** The + button of the composer. */
	getInputMenuTrigger(): Locator {
		return this.page.getByRole('button', {
			name: 'Add context with connectors, files and more',
			exact: true,
		});
	}

	/** The open + menu. Its items have the menu item role. */
	getInputMenu(): Locator {
		return this.page.getByRole('menu');
	}

	/** The items of the open + menu, in order. */
	getInputMenuItems(): Locator {
		return this.getInputMenu().getByRole('menuitem');
	}

	/** One item of the open + menu, by its accessible name. */
	getInputMenuItem(name: string): Locator {
		return this.getInputMenu().getByRole('menuitem', { name, exact: true });
	}
}
