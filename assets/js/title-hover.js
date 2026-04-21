(function(){
  const lc = ['#a855f7','#9333ea','#7c3aed','#6366f1','#3b82f6','#0ea5e9','#06b6d4','#14b8a6','#10b981','#22c55e','#84cc16','#eab308','#f97316','#ef4444','#ec4899','#d946ef'];

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
        s.addEventListener('mouseenter', () => {
          const col = lc[Math.floor(Math.random() * lc.length)];
          s.style.color = col;
          s.style.textShadow = `0 2px 20px ${col}aa`;
        });
      }
      el.appendChild(s);
    }
  }

  function init(){
    const sel = '.page-title, .card-title, .feat-title, .project-hero h1, .project-section h2, .full-section h2, .about-name, .stub-wrap h1, .site-nav .logo';
    document.querySelectorAll(sel).forEach(splitTitle);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
