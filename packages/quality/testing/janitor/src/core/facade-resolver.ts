/**
 * Facade Resolver
 *
 * Parses the facade file (e.g., AppPage) to build bidirectional mappings
 * between class names and their property names in the facade.
 *
 * Used by ImpactAnalyzer and MethodUsageAnalyzer to understand the
 * relationship between page object classes and how they're accessed.
 */

import * as path from 'node:path';
import { type Project } from 'ts-morph';

import { getConfig } from '../config.js';
import { getRootDir } from '../utils/paths.js';

export interface FacadeMapping {
	/** Map from class name to property name(s): "CanvasPage" → ["canvas"] */
	classToProperty: Map<string, string[]>;
	/** Map from property name to class name: "canvas" → "CanvasPage" */
	propertyToClass: Map<string, string>;
	/** Absolute path to the facade file */
	facadePath: string;
}

/**
 * Resolves facade mappings between class types and property names.
 * Parses the facade file once and provides both lookup directions.
 */
export class FacadeResolver {
	private mapping: FacadeMapping;

	constructor(private project: Project) {
		this.mapping = this.buildMapping();
	}

	/** Get property name(s) for a class: "CanvasPage" → ["canvas"] */
	getPropertiesForClass(className: string): string[] {
		return this.mapping.classToProperty.get(className) ?? [];
	}

	/** Get class name for a property: "canvas" → "CanvasPage" */
	getClassForProperty(propertyName: string): string | undefined {
		return this.mapping.propertyToClass.get(propertyName);
	}

	/** Get the full property→class mapping as a record */
	getPropertyToClassMap(): Record<string, string> {
		return Object.fromEntries(this.mapping.propertyToClass);
	}

	/** Get the full class→property mapping */
	getClassToPropertyMap(): Map<string, string[]> {
		return this.mapping.classToProperty;
	}

	/** Get the absolute path to the facade file */
	getFacadePath(): string {
		return this.mapping.facadePath;
	}

	/** Check if a path is the facade file */
	isFacade(absolutePath: string): boolean {
		return absolutePath === this.mapping.facadePath;
	}

	private buildMapping(): FacadeMapping {
		const config = getConfig();
		const root = getRootDir();
		const facadePath = path.join(root, config.facade.file);

		const classToProperty = new Map<string, string[]>();
		const propertyToClass = new Map<string, string>();

		const facadeFile = this.project.getSourceFile(facadePath);
		if (!facadeFile) {
			console.warn(`Warning: Could not find facade file at ${facadePath}`);
			return { classToProperty, propertyToClass, facadePath };
		}

		const facadeClass = facadeFile.getClass(config.facade.className);
		if (!facadeClass) {
			console.warn(`Warning: Could not find ${config.facade.className} class`);
			return { classToProperty, propertyToClass, facadePath };
		}

		for (const prop of facadeClass.getProperties()) {
			const propName = prop.getName();
			const propType = prop.getType();
			const typeName = extractTypeName(propType.getText());

			if (typeName && !config.facade.excludeTypes.includes(typeName)) {
				// class → property (one class can have multiple properties)
				const existing = classToProperty.get(typeName) ?? [];
				existing.push(propName);
				classToProperty.set(typeName, existing);

				// property → class (one-to-one)
				propertyToClass.set(propName, typeName);
			}
		}

		return { classToProperty, propertyToClass, facadePath };
	}
}

/**
 * Extract simple type name from potentially complex type string.
 * Removes import() paths: import("./CanvasPage").CanvasPage → CanvasPage
 */
export function extractTypeName(typeText: string): string {
	return typeText.replace(/import\([^)]+\)\./g, '');
}
