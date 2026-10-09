import type { Locator, Page } from '@playwright/test';

// The sidebar root (MainSidebar.vue). Its sections and the Workspace are inside it.
const SIDEBAR_ROOT = '#side-menu';
// The composer's + button names the menu that it opens. Reka labels the menu with its trigger.
const INPUT_MENU_NAME = 'Add context with connectors, files and more';

/**
 * The Simple and Power parts of the Assistant: the Interface switch and its collapsed
 * button, the Simple Workspace, the Power chat groups and the composer's + menu.
 * The Assistant page object keeps the chat itself.
 */
export class ExperienceModes {
	constructor(private readonly page: Page) {}

	private getSidebar(): Locator {
		return this.page.locator(SIDEBAR_ROOT);
	}

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
		return this.getSidebar().getByRole('button', { name, exact: true });
	}

	/** A project row in the Workspace, by its name. */
	getProjectRow(name: string): Locator {
		return this.getSidebar().getByTestId('project-menu-item').filter({ hasText: name });
	}

	getChatsSection(): Locator {
		return this.page.getByTestId('instance-ai-sidebar-chats');
	}

	getAutomationsSection(): Locator {
		return this.page.getByTestId('assistant-automations');
	}

	/** A row of the Automations section, by its accessible name: the workflow name and its status. */
	getAutomationRow(name: string): Locator {
		return this.getAutomationsSection().getByRole('menuitem', { name, exact: true });
	}

	/** The card that offers to keep a built workflow and turn it on. It shows in the chat. */
	getProposalCard(): Locator {
		return this.page.getByTestId('automation-proposal-card');
	}

	/** The "Turn it on" button of the proposal card. */
	getProposalTurnOnButton(): Locator {
		return this.page.getByTestId('automation-proposal-turn-on');
	}

	/** The answered proposal card. It says what happened to the workflow. */
	getProposalResolved(): Locator {
		return this.page.getByTestId('automation-proposal-resolved');
	}

	/** The status line of the answered proposal card. Its `data-status` names the outcome. */
	getProposalResolvedStatus(): Locator {
		return this.page.getByTestId('automation-proposal-resolved-status');
	}

	/** One group of the chat list in Power mode. */
	getChatGroup(group: 'needs-you' | 'working' | 'ready' | 'done'): Locator {
		return this.page.getByTestId(`assistant-chat-group-${group}`);
	}

	/** The title of one chat group. The group list is labelled by it. */
	getChatGroupHeading(group: 'needs-you' | 'working' | 'ready' | 'done'): Locator {
		return this.getChatGroup(group).getByRole('heading');
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
		return this.getSidebar().getByRole('menuitem', { name, exact: true });
	}

	/** The + button of the composer. */
	getInputMenuTrigger(): Locator {
		return this.page.getByRole('button', { name: INPUT_MENU_NAME, exact: true });
	}

	/** The open + menu, by the name of the trigger that labels it. Its items have the menu item role. */
	getInputMenu(): Locator {
		return this.page.getByRole('menu', { name: INPUT_MENU_NAME, exact: true });
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
