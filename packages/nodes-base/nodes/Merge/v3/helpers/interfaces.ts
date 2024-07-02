type MultipleMatches = 'all' | 'first';

export type MatchFieldsOptions = {
	joinMode: MatchFieldsJoinMode;
	outputDataFrom: MatchFieldsOutput;
	multipleMatches: MultipleMatches;
	disableDotNotation: boolean;
	fuzzyCompare?: boolean;
};

type ClashMergeMode = 'deepMerge' | 'shallowMerge';
type ClashResolveMode = 'addSuffix' | 'preferInput1' | 'preferLast';

export type ClashResolveOptions = {
	resolveClash: ClashResolveMode;
	mergeMode: ClashMergeMode;
	overrideEmpty: boolean;
};

export type MatchFieldsOutput = 'both' | 'input1' | 'input2';

export type MatchFieldsJoinMode =
	| 'keepEverything'
	| 'keepMatches'
	| 'keepNonMatches'
	| 'enrichInput2'
	| 'enrichInput1';
