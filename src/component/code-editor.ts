import {EditorView, highlightActiveLineGutter, keymap, lineNumbers} from "@codemirror/view";
import {EditorState, Extension, Compartment, Transaction} from "@codemirror/state";
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
  private readonly themeCompartment = new Compartment();

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
    this.editorContainer.className = 'code-editor';

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

  public getValue(): string {
    return this.editorView?.state.doc.toString() ?? '';
  }

  public setValue(value: string): void {
    if (!this.editorView) {
      this.textContent = value;
      return;
    }

    this.editorView.dispatch({
      changes: {
        from: 0,
        to: this.editorView.state.doc.length,
        insert: value
      }
    });
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

  private parseFrozenLines(): Set<number> {
    const attr = this.getAttribute('frozenLines');
    if (!attr) return new Set();
    return new Set(
      attr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0)
    );
  }

  private createEditor(contents: (string | undefined)[]) {
    const themeExtension = this.createTheme(contents[3]);

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab
      ]),
      this.themeCompartment.of(themeExtension ?? [])
    ];

    this.language && extensions.push(this.language);

    this.addExtension(extensions, contents[1], this.createAutoCompletion);
    this.addExtension(extensions, contents[2], this.createHighlight);
    this.addExtension(extensions, this.hasAttribute("freeze"), this.freezeEditor);

    const frozenLines = this.parseFrozenLines();
    if (frozenLines.size > 0) {
      extensions.push(this.freezeLines(frozenLines));
    }

    const initContent = this.createContent(contents[0]);

    this.editorView = new EditorView({
      state: EditorState.create({
        doc: initContent,
        extensions: extensions,
      }),
      parent: this.editorContainer,
    });
  }

  public async updateThemeFrom(url: string | null): Promise<void> {
    if (!this.editorView) {
      return;
    }

    if (!url) {
      this.editorView.dispatch({
        effects: this.themeCompartment.reconfigure([])
      });
      return;
    }

    const content = await fetch(url);
    const ct = content.headers.get("content-type");
    if (ct?.includes("html")) {
      throw new ReferenceError(`Wrong theme reference or corrupt content while reading the file: ${url}`);
    }

    const themeJson = await content.text();
    const themeExtension = this.createTheme(themeJson) ?? [];

    this.editorView.dispatch({
      effects: this.themeCompartment.reconfigure(themeExtension)
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
    const nested = tagString.match(/^(\w+)\((.+)\)$/);
    if (nested) {
      const outer = nested[1];
      const inner = nested[2];
      return (tags as any)[outer](this.resolveTag(inner));
    }
    return (tags as any)[tagString];
  }

  private createTheme(theme?: string) {
    if (!theme) {
      return;
    }
    return EditorView.theme(JSON.parse(theme));
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
    return EditorView.editable.of(!freeze);
  }

  /**
   * Returns a CodeMirror transaction filter that blocks any change
   * whose affected range overlaps one of the given 1-based line numbers.
   */
  private freezeLines(frozenLines: Set<number>): Extension {
    return EditorState.transactionFilter.of((tr: Transaction) => {
      if (!tr.docChanged) return tr;

      let blocked = false;
      tr.changes.iterChangedRanges((fromA) => {
        if (blocked) return;
        const line = tr.startState.doc.lineAt(fromA);
        if (frozenLines.has(line.number)) {
          blocked = true;
        }
      });

      return blocked ? [] : tr;
    });
  }
}
