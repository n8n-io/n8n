import type { NodeExecutionHint } from 'n8n-workflow';

import { fieldNotFoundHint } from '../utils/utils';

export class FieldsTracker {
	fields: { [key: string]: boolean } = {};

	add(key: string) {
		if (this.fields[key] === undefined) {
			this.fields[key] = false;
		}
	}

	update(key: string, value: boolean) {
		if (!this.fields[key] && value) {
			this.fields[key] = true;
		}
	}

	getHints() {
		const hints: NodeExecutionHint[] = [];

		for (const [field, value] of Object.entries(this.fields)) {
			if (!value) {
				hints.push(fieldNotFoundHint(field));
			}
		}

		return hints;
	}
}
