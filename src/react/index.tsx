import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import '../component/main';

export interface CodeEditorHandle {
  getValue(): string;
  setValue(value: string): void;
}

interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  title?: string;
  freeze?: boolean;
  frozenLines?: number[];
  className?: string;
  style?: React.CSSProperties;
}

type EditorElement = HTMLElement & CodeEditorHandle;

function createWrapper(tagName: string) {
  return forwardRef<CodeEditorHandle, CodeEditorProps>(function EditorWrapper(
    { value, onChange, title, freeze, frozenLines, className, style },
    ref
  ) {
    const innerRef = useRef<EditorElement>(null);

    useImperativeHandle(ref, () => ({
      getValue: () => innerRef.current?.getValue() ?? '',
      setValue: (v: string) => innerRef.current?.setValue(v),
    }));

    useEffect(() => {
      if (innerRef.current && value !== undefined) {
        const current = innerRef.current.getValue();
        if (current !== value) {
          innerRef.current.setValue(value);
        }
      }
    }, [value]);

    useEffect(() => {
      const el = innerRef.current;
      if (!el || !onChange) return;
      const handler = () => onChange(el.getValue());
      el.addEventListener('change', handler);
      return () => el.removeEventListener('change', handler);
    }, [onChange]);

    return React.createElement(tagName, {
      ref: innerRef,
      title,
      freeze: freeze ? '' : undefined,
      frozenLines: frozenLines && frozenLines.length > 0 ? frozenLines.join(',') : undefined,
      class: className,
      style,
    });
  });
}

export const CodeEditor = createWrapper('code-editor');
export const JavaEditor = createWrapper('java-editor');
export const JavaScriptEditor = createWrapper('javascript-editor');

CodeEditor.displayName = 'CodeEditor';
JavaEditor.displayName = 'JavaEditor';
JavaScriptEditor.displayName = 'JavaScriptEditor';
