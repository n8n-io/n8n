// Supports both database entries and frontend api responses
export interface ITag {
	id: string | number;
	name: string;
	createdAt?: string | Date;
	updatedAt?: string | Date;
}

// Set tag ids to use existing tags, creates a new tag if no matching tag could be found
export async function setTagsForImport(
	workflow: { tags: ITag[] },
	tagsEntities: ITag[],
	createTag: (name: string) => Promise<ITag>,
): Promise<void> {
	const findOrCreateTag = async (importTag: ITag) => {
		// Assume tag is identical if createdAt date is the same to preserve a changed tag name
		const identicalMatch = tagsEntities.find(
			(existingTag) =>
				existingTag.id.toString() === importTag.id.toString() &&
				existingTag.createdAt &&
				importTag.createdAt &&
				new Date(existingTag.createdAt) === new Date(importTag.createdAt),
		);
		if (identicalMatch) {
			return identicalMatch;
		}

		// Find tag with identical name
		const nameMatch = tagsEntities.find((existingTag) => existingTag.name === importTag.name);
		if (nameMatch) {
			return nameMatch;
		}

		// Create new Tag
		const createdTag = await createTag(importTag.name);
		// add new tag to available tags
		tagsEntities.push(createdTag);
		return createdTag;
	};
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	const workflowTags = workflow.tags;
	if (!workflowTags || !Array.isArray(workflowTags) || workflowTags.length === 0) {
		return;
	}
	for (let i = 0; i < workflowTags.length; i++) {
		// eslint-disable-next-line no-await-in-loop
		const tag = await findOrCreateTag(workflowTags[i]);
		workflowTags[i] = {
			id: tag.id,
			name: tag.name,
		};
	}
}
