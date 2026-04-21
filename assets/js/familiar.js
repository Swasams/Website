(function(){
  const btn = document.createElement('button');
  btn.className = 'familiar-btn';
  btn.id = 'familiarBtn';
  btn.setAttribute('aria-label', 'Open familiar customizer');
  btn.innerHTML = '<span class="familiar-btn-icon">&#128008;</span><span>Familiar</span>';
  document.body.appendChild(btn);

  const pop = document.createElement('div');
  pop.className = 'familiar-popup';
  pop.id = 'familiarPopup';
  pop.innerHTML = `
    <div class="familiar-header">
      <span class="familiar-title">Choose Your Familiar</span>
      <button class="familiar-close" aria-label="Close">&times;</button>
    </div>
    <div class="familiar-body">
      <div class="familiar-preview">&#128008;</div>
      <div class="familiar-hint">Customizer coming soon.<br>Drag me by the header.</div>
    </div>
  `;
  document.body.appendChild(pop);

  const closeBtn = pop.querySelector('.familiar-close');
  const header = pop.querySelector('.familiar-header');

  btn.addEventListener('click', e => {
    e.stopPropagation();
    pop.classList.toggle('open');
  });
  closeBtn.addEventListener('click', e => {
    e.stopPropagation();
    pop.classList.remove('open');
  });

  // Drag
  let dragging = false, ox = 0, oy = 0;
  header.addEventListener('mousedown', e => {
    if (e.target.closest('.familiar-close')) return;
    dragging = true;
    const rect = pop.getBoundingClientRect();
    ox = e.clientX - rect.left;
    oy = e.clientY - rect.top;
    pop.style.right = 'auto';
    pop.style.bottom = 'auto';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 40;
    const x = Math.max(-pop.offsetWidth + 80, Math.min(maxX, e.clientX - ox));
    const y = Math.max(0, Math.min(maxY, e.clientY - oy));
    pop.style.left = x + 'px';
    pop.style.top = y + 'px';
  });
  document.addEventListener('mouseup', () => { dragging = false; });
})();
