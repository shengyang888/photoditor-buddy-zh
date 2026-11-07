import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PhotoEditor } from '@photoditor-buddy/ui';

/** Iframe entry point used by the SDK. Same editor, plus the postMessage bridge. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PhotoEditor embed />
  </StrictMode>,
);
