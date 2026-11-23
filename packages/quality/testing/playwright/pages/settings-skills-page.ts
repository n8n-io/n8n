import { BasePage } from './BasePage';

export class SettingsSkillsPage extends BasePage {
	async goto(skillId?: string) {
		const query = skillId ? `?${new URLSearchParams({ skillId })}` : '';
		await this.page.goto(`/settings/context/skills${query}`);
	}

	getSkillDialog() {
		return this.page.getByRole('dialog').filter({
			has: this.page.locator('[data-testid="agent-skill-viewer"]'),
		});
	}

	async openVersion(version: number) {
		await this.getSkillDialog().getByRole('button', { name: 'Show versions' }).click();
		await this.getSkillDialog().locator(`[data-testid="skill-version-row-${version}"]`).click();
	}

	async selectSkillFile(name: string) {
		await this.getSkillDialog().getByRole('button', { name, exact: true }).click();
	}

	getSkillDiagram(name: string) {
		return this.getSkillDialog().getByRole('img', { name, exact: true });
	}

	getPendingDiagramFrames() {
		return this.page.locator('iframe[srcdoc][sandbox="allow-scripts"]');
	}

	getSkillCodeBlock(source: string) {
		return this.getSkillDialog().locator('pre > code').filter({ hasText: source });
	}

	async connect(url: string) {
		await this.page.getByTestId('skills-create-menu-button').click();
		await this.page.getByTestId('skills-create-github').click();
		await this.page.getByTestId('skill-source-repository-select').getByRole('combobox').fill(url);
		await this.page.getByRole('option', { name: url }).click();
		await this.page.getByTestId('skill-source-next').click();
		await this.page.getByTestId('skill-source-import').click();
	}

	async checkForUpdates(sourceId: string) {
		await this.page
			.getByRole('row')
			.filter({ has: this.page.locator(`#skill-source-${sourceId}`) })
			.getByTestId('skill-group-actions')
			.getByRole('button')
			.click();
		await this.page.getByTestId('action-checkNow').click();
	}

	getUpdateBadge(sourceId: string) {
		return this.page
			.getByRole('row')
			.filter({ has: this.page.locator(`#skill-source-${sourceId}`) })
			.getByTestId('skill-group-updates');
	}

	getUpdateDialog() {
		return this.page.getByTestId('skill-source-updates-dialog');
	}

	getDiff() {
		return this.getUpdateDialog().getByTestId('skill-source-preview');
	}

	getAcceptButton() {
		return this.page.getByTestId('skill-updates-accept');
	}

	getUpdateCheckbox(name: string) {
		return this.getUpdateDialog().getByRole('checkbox', { name, exact: true });
	}
}
