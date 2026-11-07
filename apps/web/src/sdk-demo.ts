import { mountPhotoditorBuddy } from '@photoditor-buddy/sdk';

/** Demo host page: embeds the editor from this same origin and receives exports. */
const result = document.getElementById('result')!;
const editor = mountPhotoditorBuddy({
  container: '#editor',
  editorUrl: new URL('./embed.html', window.location.href).toString(),
  returnResult: true,
  doneLabel: '发送到网站',
  onReady: () => {
    result.textContent = '编辑器已就绪。';
  },
  onExport: ({ dataUrl, width, height, fileName }) => {
    result.innerHTML = '';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = fileName;
    const label = document.createElement('span');
    label.textContent = `已收到 ${fileName}（${width}×${height}）`;
    label.setAttribute('data-testid', 'sdk-received');
    result.append(img, label);
  },
  onError: (message) => {
    result.textContent = `出错：${message}`;
  },
});

document.getElementById('load-sample')!.addEventListener('click', () => {
  editor.loadImage(new URL('./sample.jpg', window.location.href).toString(), 'sample.jpg');
});
document.getElementById('export')!.addEventListener('click', () => editor.requestExport());
