import { completeFromList } from "@codemirror/autocomplete";
import { parser } from "./syntax.grammar";
import {
  LRLanguage,
  LanguageSupport,
  foldNodeProp,
  foldInside,
} from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";

export const parserWithMetaData = parser.configure({
  props: [
    foldNodeProp.add({
      Application: foldInside,
    }),
    styleTags({
      OpenMarker: t.brace,
      CloseMarker: t.brace,
      Plaintext: t.content,
      Resolvable: t.string,
      BrokenResolvable: t.className,
    }),
  ],
});

export const n8nLanguage = LRLanguage.define({
  parser: parserWithMetaData,
  languageData: {
    commentTokens: { line: ";" },
  },
});

const completions = n8nLanguage.data.of({
  autocomplete: completeFromList([
    // { label: "test", type: "keyword" }, // to add in future
  ]),
});

export function n8nExpression() {
  return new LanguageSupport(n8nLanguage, [completions]);
}
