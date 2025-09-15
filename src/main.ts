import {EditorView, highlightActiveLineGutter, keymap, lineNumbers} from "@codemirror/view";
import {EditorState, Extension} from "@codemirror/state";
import {java} from "@codemirror/lang-java";
import {autocompletion, Completion, CompletionContext, CompletionResult} from "@codemirror/autocomplete";
import {HighlightStyle, syntaxHighlighting, TagStyle} from "@codemirror/language";
import {tags} from "@lezer/highlight";
import javaLabels from "./java-label.json";
import {history, defaultKeymap, historyKeymap, indentWithTab} from "@codemirror/commands";

export interface JavaLabel {
  class?: string[],
  keyword?: string[],
  typeName?: string[],
  operator?: string[],
  atom?: string[],
  punctuation?: string[]
}

export interface JavaHighlightStyle {
  tag: string,
  [key: string]: any
}

export default class Main extends HTMLElement {
  private editorView?: EditorView;

  connectedCallback(): void {
    this.initEditor();
  }

  disconnectedCallback(): void {
    if (this.editorView) {
      this.editorView.destroy();
    }
  }

  private initEditor(): void {
    if (this.editorView) {
      return;
    }

    Promise.all([
      this.readFile("initTextSrc"),
      this.readFile("autoCompletionSrc"),
      this.readFile("highlightStyleSrc"),
      this.readFile("themeSrc")
    ]).then(contents => this.createEditor(contents));
  }

  /**
   * @param fileSourceAttribute
   *     component attribute for the file source to read
   * @return the text content if it successfully read, otherwise undefined on missing attribute
   * @thrown ReferenceError on false URI given
   */
  private readFile = async (fileSourceAttribute: string) => {
    const url = this.getAttribute(fileSourceAttribute);
    if (!url) {
      return;
    }

    const content = await fetch(url);
    const ct = content.headers.get("content-type");
    if (ct?.includes("html")) {
      throw new ReferenceError(`Wrong reference or corrupt content on attribute "${fileSourceAttribute}" while reading the file: ${url}`);
    }

    return await content.text();
  };

  private createEditor(contents: (string | undefined)[]) {
    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      java(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab
      ])
    ];

    this.addExtension(extensions, contents[1], this.createAutoCompletion);
    this.addExtension(extensions, contents[2], this.createHighlightStyle);
    this.addExtension(extensions, contents[3], this.createTheme);

    this.editorView = new EditorView({
      state: EditorState.create({
        doc: contents[0]!,
        extensions: extensions,
      }),
      parent: this,
    });
  }

  private createAutoCompletion(completeDefinition: string): Extension {
    const convertedCompleteDefinition: JavaLabel = JSON.parse(completeDefinition);

    const definitionComplete = (javaLabel: JavaLabel) => Object.entries(javaLabel)
      .flatMap(([type, labels]) => labels.map((label: string) => ({label, type})));

    let completionDefinition = definitionComplete(javaLabels);
    if (convertedCompleteDefinition) {
      const definition = definitionComplete(convertedCompleteDefinition);

      completionDefinition = completionDefinition.concat(definition);
    }

    return autocompletion({
      override: [context => this.autoComplete(context, completionDefinition)],
    });
  }

  private createHighlightStyle(highlightStyles: string): Extension {
    const styles: JavaHighlightStyle[] = JSON.parse(highlightStyles);
    const mappedStyles: TagStyle[] = styles.map(({ tag, ...style }) => ({
      tag: this.resolveTag(tag),
      ...style
    }));

    return syntaxHighlighting(HighlightStyle.define(mappedStyles));
  }

  private resolveTag(tagString: string): any {
    // parse e.g. "function(variableName)" or just the key like "keyword"
    const nested = tagString.match(/^(\w+)\((.+)\)$/);
    if (nested) {
      const outer = nested[1]; // "method"
      const inner = nested[2]; // "variableName"

      return (tags as any) [outer] (this.resolveTag(inner));
    }

    // Otherwise just e.g. "keyword"
    return (tags as any) [tagString];
  }

  private createTheme(theme: string) {
    const convertedTheme = JSON.parse(theme);
    return EditorView.theme(convertedTheme);
  }

  private async autoComplete(context: CompletionContext, autoCompletionOptions: Completion[]): Promise<CompletionResult> {
    const before = context.matchBefore(/\w+/);

    return {
      from: before ? before.from : context.pos,
      options: autoCompletionOptions,
      validFor: /^\w*$/,
    };
  }

  private addExtension(extensions: Extension[], contentElement: string | undefined, extensionFunction: (completeDefinition: string) => Extension) {
    if (contentElement) {
      const apply = extensionFunction.call(this, contentElement);

      extensions.push(apply);
    }
  }
}

customElements.define("java-code-editor", Main);
