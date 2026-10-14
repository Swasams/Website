// Single embed entry point. On the static site:
//   <link rel="stylesheet" href="escape-the-castle.css">
//   <script src="escape-the-castle.js"></script>
//   <div id="dp"></div>
//   <script>EscapeTheCastle.mountGame(document.getElementById('dp'))</script>
import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Game } from './ui/Game';
import './ui/styles.css';

const roots = new WeakMap<HTMLElement, Root>();

export function mountGame(element: HTMLElement): () => void {
  const root = roots.get(element) ?? createRoot(element);
  roots.set(element, root);
  root.render(
    <StrictMode>
      <Game />
    </StrictMode>
  );
  // Return an unmount handle for callers who want to tear the game down.
  return () => {
    root.unmount();
    roots.delete(element);
  };
}
