import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  NgModule,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import '../component/main';

type EditorElement = HTMLElement & {
  getValue(): string;
  setValue(value: string): void;
};

function createEditorComponent(tagName: string, selector: string) {
  @Component({
    selector,
    standalone: true,
    template: `<${tagName} #editorEl [attr.title]="title" [attr.freeze]="freeze ? '' : null" [attr.editor-class]="editorClass"></${tagName}>`,
    providers: [
      {
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => EditorComponent),
        multi: true,
      },
    ],
  })
  class EditorComponent implements ControlValueAccessor, OnInit, OnChanges, OnDestroy {
    @Input() title = '';
    @Input() freeze = false;
    @Input() editorClass?: string;
    @Output() valueChange = new EventEmitter<string>();
    @ViewChild('editorEl') editorEl!: ElementRef<EditorElement>;

    onChange: (v: string) => void = () => {};
    onTouched: () => void = () => {};
    changeHandler = () => {
      const val = this.editorEl?.nativeElement?.getValue() ?? '';
      this.onChange(val);
      this.onTouched();
      this.valueChange.emit(val);
    };

    ngOnInit() {
      this.editorEl?.nativeElement?.addEventListener('change', this.changeHandler);
    }

    ngOnChanges(changes: SimpleChanges) {
      if (changes['freeze'] || changes['title'] || changes['editorClass']) {
        // Attribute binding handles these reactively via [attr.*]
      }
    }

    ngOnDestroy() {
      this.editorEl?.nativeElement?.removeEventListener('change', this.changeHandler);
    }

    writeValue(value: string): void {
      setTimeout(() => this.editorEl?.nativeElement?.setValue(value ?? ''));
    }

    registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
    registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  }

  return EditorComponent;
}

export const CodeEditorComponent = createEditorComponent('code-editor', 'wce-code-editor');
export const JavaEditorComponent = createEditorComponent('java-editor', 'wce-java-editor');
export const JavaScriptEditorComponent = createEditorComponent('javascript-editor', 'wce-javascript-editor');

@NgModule({
  imports: [CodeEditorComponent, JavaEditorComponent, JavaScriptEditorComponent],
  exports: [CodeEditorComponent, JavaEditorComponent, JavaScriptEditorComponent],
})
export class WebCodeEditorModule {}