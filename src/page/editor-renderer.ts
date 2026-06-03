import editorContainers from './editors.json';

interface EditorContainer {
  name: string;
  left: EditorConfig;
  right: EditorConfig;
}

interface EditorConfig {
  textSrc: string;
  tag: string
}

function createEditorColumn(editorConfig: EditorConfig, left: boolean) {
  const editor = document.createElement(editorConfig.tag);
  editor.setAttribute('textSrc', `8-language/${editorConfig.textSrc}`);
  editor.className = 'column';

  if (left) {
    editor.setAttribute('title', 'index.html');
    editor.setAttribute('freeze', '');
  }

  return editor;
}

function renderEditorBlock(index: number) {
  const container: EditorContainer = editorContainers[index];

  const area = document.getElementById('editor-area')!;
  area.innerHTML = '';

  const pairDiv = document.createElement('div');
  pairDiv.className = 'editor-pair';

  let editorColumn = createEditorColumn(container.left, true);
  pairDiv.appendChild(editorColumn);

  editorColumn = createEditorColumn(container.right, false);
  pairDiv.appendChild(editorColumn);

  area.appendChild(pairDiv);
}

const select = document.getElementById('editor-select')!;
select.innerHTML = editorContainers.map((editor, name) =>
  `<option value="${name}">${editor.name}</option>`
).join();

select.addEventListener('change', e => renderEditorBlock(Number((e.target as HTMLSelectElement).value)));

renderEditorBlock(0);