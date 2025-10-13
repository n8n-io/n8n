import { nanoid } from 'nanoid';

import { test, expect } from '../../fixtures/base';

test.describe('Workflow tags - Tag creation', () => {
	test('should create and attach tags inline, then add more incrementally', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();

		const tag1 = `tag-${nanoid(6)}`;
		const tag2 = `tag-${nanoid(6)}`;
		const tag3 = `tag-${nanoid(6)}`;

		await n8n.canvas.clickCreateTagButton();
		await n8n.canvas.typeInTagInput(tag1);
		await n8n.canvas.pressEnterToCreateTag();

		await n8n.canvas.typeInTagInput(tag2);
		await n8n.canvas.pressEnterToCreateTag();

		await expect(n8n.canvas.getTagPills()).toHaveCount(2);

		await n8n.canvas.clickNthTagPill(0);
		await n8n.canvas.getVisibleDropdown().waitFor();
		await n8n.canvas.typeInTagInput(tag3);
		await n8n.canvas.pressEnterToCreateTag();

		await n8n.canvas.clickOutsideModal();

		await expect(n8n.canvas.getTagPills()).toHaveCount(3);

		// Pills should be rendered individually, not collapsed as "+3"
		const tagsContainer = n8n.page.getByTestId('workflow-tags-container');
		await expect(tagsContainer).not.toHaveText(/\+\d+/);

		await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');
	});

	test('should create tags via modal without attaching them', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();

		const tag1 = `modal-${nanoid(6)}`;
		const tag2 = `modal-${nanoid(6)}`;

		await n8n.canvas.openTagManagerModal();

		await n8n.canvas.tagsManagerModal.clickAddNewButton();
		await n8n.canvas.tagsManagerModal.getTagInputInModal().fill(tag1);
		await n8n.canvas.pressEnterToCreateTag();
		await n8n.canvas.tagsManagerModal.getTable().getByText(tag1).waitFor();

		await n8n.canvas.tagsManagerModal.clickAddNewButton();
		await n8n.canvas.tagsManagerModal.getTagInputInModal().fill(tag2);
		await n8n.canvas.pressEnterToCreateTag();
		await n8n.canvas.tagsManagerModal.getTable().getByText(tag2).waitFor();

		await n8n.canvas.tagsManagerModal.clickDoneButton();

		await n8n.canvas.clickCreateTagButton();

		await expect(n8n.canvas.getTagItemInDropdownByName(tag1)).toBeVisible();
		await expect(n8n.canvas.getTagItemInDropdownByName(tag2)).toBeVisible();
		await expect(n8n.canvas.getTagPills()).toHaveCount(0);

		await n8n.canvas.getTagItemInDropdownByName(tag1).click();
		await expect(n8n.canvas.getTagPills()).toHaveCount(1);
	});
});

test.describe('Workflow tags - Tag operations', () => {
	test('should delete all tags via modal with confirmation', async ({ n8n, api }) => {
		const tags = await Promise.all([
			api.tags.create(`del-${nanoid(6)}`),
			api.tags.create(`del-${nanoid(6)}`),
			api.tags.create(`del-${nanoid(6)}`),
			api.tags.create(`del-${nanoid(6)}`),
			api.tags.create(`del-${nanoid(6)}`),
		]);

		await n8n.start.fromBlankCanvas();
		await n8n.canvas.openTagManagerModal();

		for (let i = 0; i < 5; i++) {
			await n8n.canvas.tagsManagerModal.getFirstTagRow().hover();
			await n8n.canvas.tagsManagerModal.getDeleteTagButton().first().click();
			await n8n.canvas.tagsManagerModal.getDeleteTagConfirmButton().click();
			await expect(n8n.canvas.tagsManagerModal.getDeleteConfirmationMessage()).toBeHidden();
		}

		await n8n.canvas.tagsManagerModal.clickDoneButton();
		await n8n.canvas.clickCreateTagButton();

		await expect(n8n.canvas.getTagItemsInDropdown()).toHaveCount(0);

		for (const tag of tags) {
			await expect(n8n.canvas.getTagItemInDropdownByName(tag.name)).not.toBeAttached();
		}

		await expect(n8n.canvas.getTagPills()).toHaveCount(0);
	});

	test('should detach tag by clicking X in dropdown', async ({ n8n, api }) => {
		const tags = await Promise.all([
			api.tags.create(`detach-x-${nanoid(6)}`),
			api.tags.create(`detach-x-${nanoid(6)}`),
			api.tags.create(`detach-x-${nanoid(6)}`),
			api.tags.create(`detach-x-${nanoid(6)}`),
			api.tags.create(`detach-x-${nanoid(6)}`),
		]);

		await n8n.start.fromBlankCanvas();

		await n8n.canvas.clickCreateTagButton();
		for (const tag of tags) {
			await n8n.canvas.getTagItemInDropdownByName(tag.name).click();
		}
		await expect(n8n.canvas.getTagPills()).toHaveCount(5);

		await n8n.canvas.clickNthTagPill(0);

		// Click X on tag pill inside the workflow-tags-dropdown component
		await n8n.page.getByTestId('workflow-tags-dropdown').locator('.el-tag__close').first().click();

		await n8n.canvas.clickOutsideModal();
		await n8n.canvas.clickWorkflowTagsArea();

		await expect(n8n.canvas.getTagPills()).toHaveCount(4);
	});

	test('should detach tag by clicking selected item in dropdown', async ({ n8n, api }) => {
		const tags = await Promise.all([
			api.tags.create(`toggle-${nanoid(6)}`),
			api.tags.create(`toggle-${nanoid(6)}`),
			api.tags.create(`toggle-${nanoid(6)}`),
			api.tags.create(`toggle-${nanoid(6)}`),
			api.tags.create(`toggle-${nanoid(6)}`),
		]);

		await n8n.start.fromBlankCanvas();

		await n8n.canvas.clickCreateTagButton();
		for (const tag of tags) {
			await n8n.canvas.getTagItemInDropdownByName(tag.name).click();
		}
		await expect(n8n.canvas.getTagPills()).toHaveCount(5);

		await n8n.canvas.clickWorkflowTagsContainer();
		await n8n.canvas.getSelectedTagItems().first().click();

		await n8n.canvas.clickOutsideModal();
		await n8n.canvas.clickWorkflowTagsArea();

		await expect(n8n.canvas.getTagPills()).toHaveCount(4);
	});

	test('should not show non-existing tag as selectable option', async ({ n8n, api }) => {
		const tags = await Promise.all([
			api.tags.create(`exist-${nanoid(6)}`),
			api.tags.create(`exist-${nanoid(6)}`),
			api.tags.create(`exist-${nanoid(6)}`),
			api.tags.create(`exist-${nanoid(6)}`),
			api.tags.create(`exist-${nanoid(6)}`),
		]);
		const nonExisting = `nonexist-${nanoid(6)}`;

		await n8n.start.fromBlankCanvas();

		await n8n.canvas.clickCreateTagButton();
		for (const tag of tags) {
			await n8n.canvas.getTagItemInDropdownByName(tag.name).click();
		}
		await expect(n8n.canvas.getTagPills()).toHaveCount(5);

		await n8n.canvas.clickOutsideModal();
		await n8n.canvas.clickWorkflowTagsArea();
		await n8n.canvas.typeInTagInput(nonExisting);

		const dropdownItems = n8n.canvas.getVisibleDropdown().locator('li');

		await expect(dropdownItems).toHaveCount(2);
		await expect(n8n.canvas.getTagItemsInDropdown()).toHaveCount(0);
	});
});
