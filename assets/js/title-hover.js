(function(){
  const lc = ['#a855f7','#9333ea','#7c3aed','#6366f1','#3b82f6','#0ea5e9','#06b6d4','#14b8a6','#10b981','#22c55e','#84cc16','#eab308','#f97316','#ef4444','#ec4899','#d946ef'];

  function tint(letter) {
    const col = lc[Math.floor(Math.random() * lc.length)];
    letter.style.color = col;
    letter.style.textShadow = `0 2px 20px ${col}aa`;
  }

  function splitTitle(el){
    if (el.dataset.splitDone || el.children.length > 0) return;
    el.dataset.splitDone = '1';
    const text = el.textContent;
    el.textContent = '';
    for (const ch of text) {
      const s = document.createElement('span');
      if (ch === ' ') {
        s.className = 'letter-hover space';
        s.innerHTML = '&nbsp;';
      } else {
        s.className = 'letter-hover';
        s.textContent = ch;
        s.addEventListener('mouseenter', () => tint(s));
      }
      el.appendChild(s);
    }
  }

  // Touch support: as the finger drags across the page, tint any letter-hover
  // it passes over. Each letter can be re-tinted once the finger leaves and
  // returns, so a slow drag along a word gives every letter a colour.
  let lastTouched = null;
  function handleTouch(e) {
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (el && el.classList && el.classList.contains('letter-hover') && !el.classList.contains('space') && el !== lastTouched) {
        tint(el);
        lastTouched = el;
      } else if (!el || !el.classList || !el.classList.contains('letter-hover')) {
        lastTouched = null;
      }
    }
  }
  document.addEventListener('touchstart', handleTouch, { passive: true });
  document.addEventListener('touchmove', handleTouch, { passive: true });
  document.addEventListener('touchend', () => { lastTouched = null; }, { passive: true });

  function init(){
    const sel = '.page-title, .card-title, .feat-title, .project-hero h1, .project-section h2, .full-section h2, .about-name, .stub-wrap h1, .site-nav .logo, .art-nav .logo, .rect-title, .art-title, .hero h1, .chapter h2, .sub-title';
    document.querySelectorAll(sel).forEach(splitTitle);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
