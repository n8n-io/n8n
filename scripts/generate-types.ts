import {
	ArrayLiteralExpression,
	ClassDeclaration,
	ObjectLiteralExpression,
	Project,
	PropertyAssignment,
	ScriptTarget,
	SourceFile,
	SyntaxKind,
} from 'ts-morph';

// const NODES_FOLDER_GLOBE = './packages/nodes-base/nodes/**/*.ts';
const NODES_FOLDER_GLOBE =
	'packages/nodes-base/nodes/Google/CloudStorage/GoogleCloudStorage.node.ts';
const TARGET_FILE = 'packages/nodes-base/nodes/generated-nodes-types.ts';

const project = new Project({
	compilerOptions: {
		target: ScriptTarget.ES2020,
	},
});

const nodesFiles = project.addSourceFilesAtPaths(NODES_FOLDER_GLOBE);
project.resolveSourceFileDependencies();

//-------------------------------------------------------------------------------

const getClasses = (sourceFiles: SourceFile[]) => {
	const returnData: ClassDeclaration[] = [];

	sourceFiles.forEach((file) => {
		const classes = file.getClasses();

		classes.forEach((declaration) => {
			declaration.getImplements().forEach((impl) => {
				if (impl.getText() === 'INodeType') {
					returnData.push(declaration);
				}
			});
		});
	});

	return returnData;
};

const getProperties = (declaration: ClassDeclaration): Record<string, any>[] => {
	const description = declaration.getProperty('description');
	if (!description) return [];

	const initializer = description.getInitializer();
	if (!initializer || !initializer.isKind(SyntaxKind.ObjectLiteralExpression)) return [];

	const propertiesProp = (initializer as ObjectLiteralExpression).getProperty('properties');
	if (!propertiesProp || !propertiesProp.isKind(SyntaxKind.PropertyAssignment)) return [];

	const propValue = (propertiesProp as PropertyAssignment).getInitializer();
	if (!propValue || !propValue.isKind(SyntaxKind.ArrayLiteralExpression)) return [];

	const propertyObjects = (propValue as ArrayLiteralExpression).getElements();

	return propertyObjects
		.filter((element) => element.isKind(SyntaxKind.ObjectLiteralExpression))
		.map((obj) => {
			const result: Record<string, any> = {};
			(obj as ObjectLiteralExpression).getProperties().forEach((prop) => {
				if (prop.isKind(SyntaxKind.PropertyAssignment)) {
					const propAssignment = prop as PropertyAssignment;
					const propName = propAssignment.getName();
					const propValue = propAssignment.getInitializer();
					if (propValue) {
						result[propName] = propValue.getText();
					}
				}
			});
			return result;
		});
};

const propInfo: string[] = [];
const classes = getClasses(nodesFiles);

classes.forEach((declaration) => {
	const propertyObjects = getProperties(declaration);

	propInfo.push(
		`Class ${declaration.getName()} has properties: ${JSON.stringify(propertyObjects)}`,
	);
});

const targetFile = project.createSourceFile(TARGET_FILE, propInfo.join('\n'), { overwrite: true });

targetFile.saveSync();

// END ------------------------------------------------------------------------------
console.log('Nodes types generated');
