// Dev / playtest harness only. Not part of the production bundle.
import { mountGame } from './mount';

const el = document.getElementById('escape-the-castle-root');
if (el) {
  mountGame(el);
}
