import {EditorView, highlightActiveLineGutter, keymap, lineNumbers} from "@codemirror/view";
import {EditorState, Extension} from "@codemirror/state";
import {autocompletion, Completion, CompletionContext, CompletionResult} from "@codemirror/autocomplete";
import {HighlightStyle, LanguageSupport, syntaxHighlighting, TagStyle} from "@codemirror/language";
import {tags} from "@lezer/highlight";
import {history, defaultKeymap, historyKeymap, indentWithTab} from "@codemirror/commands";

export interface Label {
  class?: string[],
  keyword?: string[],
  typeName?: string[],
  operator?: string[],
  atom?: string[],
  punctuation?: string[]
}

export interface LanguageHighlightStyle {
  tag: string,
  [key: string]: any
}

export default class CodeEditor extends HTMLElement {
  private readonly editorContainer: HTMLDivElement;
  private readonly header: HTMLDivElement;
  private editorView?: EditorView;

  static get observedAttributes() {
    return ['title', 'editor-class'];
  }

  constructor(private labels?: Label, private language?: LanguageSupport) {
    super();

    this.header = document.createElement('div');
    this.header.setAttribute('part', 'header');
    this.header.textContent = this.getAttribute('title');
    this.header.className = 'title';

    this.editorContainer = document.createElement('div');
    this.editorContainer.className = 'code-editor'

    const shadow = this.attachShadow({ mode: 'open' });
    shadow.append(this.header, this.editorContainer);
  }

  connectedCallback(): void {
    this.initEditor();
  }

  disconnectedCallback(): void {
    if (this.editorView) {
      this.editorView.destroy();
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    switch (name) {
      case "title":
        this.header.textContent = newValue;
        return;
      case "editor-class":
        this.initEditor();
        return;
    }
  }

  private initEditor(): void {
    if (this.editorView) {
      return;
    }

    Promise.all([
      this.readFile("textSrc"),
      this.readFile("autoCompletionSrc"),
      this.readFile("highlightSrc"),
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
    let url = this.getAttribute(fileSourceAttribute);
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
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab
      ])
    ];

    this.language && extensions.push(this.language);

    this.addExtension(extensions, contents[1], this.createAutoCompletion);
    this.addExtension(extensions, contents[2], this.createHighlight);
    this.addExtension(extensions, contents[3], this.createTheme);
    this.addExtension(extensions, this.hasAttribute("freeze"), this.freezeEditor);

    const initContent = this.createContent(contents[0]);

    this.editorView = new EditorView({
      state: EditorState.create({
        doc: initContent,
        extensions: extensions,
      }),
      parent: this.editorContainer,
    });
  }

  private createAutoCompletion(completeDefinition?: string): Extension {
    const convertedCompleteDefinition: Label = completeDefinition ? JSON.parse(completeDefinition) : this.labels;

    let completionDefinition = this.labels ? this.definitionComplete(this.labels) : [];
    if (convertedCompleteDefinition) {
      const definition = this.definitionComplete(convertedCompleteDefinition);

      completionDefinition = completionDefinition.concat(definition);
    }

    return autocompletion({
      override: [context => this.autoComplete(context, completionDefinition)],
    });
  }

  private definitionComplete = (label: Label) => Object.entries(label)
    .flatMap(([type, labels]) => labels.map((label: string) => ({label, type})));

  private createHighlight(highlightStyles?: string): Extension | undefined {
    if (!highlightStyles) {
      return;
    }

    const styles: LanguageHighlightStyle[] = JSON.parse(highlightStyles);
    const mappedStyles: TagStyle[] = styles.map(({tag, ...style}) => ({
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

      return (tags as any) [outer](this.resolveTag(inner));
    }

    // Otherwise just e.g. "keyword"
    return (tags as any) [tagString];
  }

  private createTheme(theme?: string) {
    if (!theme) {
      return;
    }

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

  private addExtension<T>(extensions: Extension[], contentElement: T | undefined,
                          extensionFunction: (completeDefinition: T | undefined) => Extension | undefined) {
    const apply = extensionFunction.call(this, contentElement);

    if (apply) {
      extensions.push(apply);
    }
  }

  private createContent(content?: string): string {
    if (!content) {
      content = this.innerHTML;
      this.innerHTML = "";
    }

    return content;
  }

  private freezeEditor(freeze?: boolean) {
    return EditorView.editable.of(!freeze)
  }
}