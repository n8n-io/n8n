import type { IBinaryData, INodeExecutionData } from 'n8n-workflow';

type PartialBinaryData = Omit<IBinaryData, 'data'>;
const isBinaryUniqueSetup = () => {
	const binaries: PartialBinaryData[] = [];
	return (binary: IBinaryData) => {
		for (const existingBinary of binaries) {
			if (
				existingBinary.mimeType === binary.mimeType &&
				existingBinary.fileType === binary.fileType &&
				existingBinary.fileSize === binary.fileSize &&
				existingBinary.fileExtension === binary.fileExtension
			) {
				return false;
			}
		}

		binaries.push({
			mimeType: binary.mimeType,
			fileType: binary.fileType,
			fileSize: binary.fileSize,
			fileExtension: binary.fileExtension,
		});

		return true;
	};
};

export function addBinariesToItem(
	newItem: INodeExecutionData,
	items: INodeExecutionData[],
	uniqueOnly?: boolean,
) {
	const isBinaryUnique = uniqueOnly ? isBinaryUniqueSetup() : undefined;

	for (const item of items) {
		if (item.binary === undefined) continue;

		for (const key of Object.keys(item.binary)) {
			if (!newItem.binary) newItem.binary = {};
			let binaryKey = key;
			const binary = item.binary[key];

			if (isBinaryUnique && !isBinaryUnique(binary)) {
				continue;
			}

			// If the binary key already exists add a suffix to it
			let i = 1;
			while (newItem.binary[binaryKey] !== undefined) {
				binaryKey = `${key}_${i}`;
				i++;
			}

			newItem.binary[binaryKey] = binary;
		}
	}

	return newItem;
}
