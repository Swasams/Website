(function(){
  console.log('[familiar] script v=23 loaded');
  const SPINE_CDN = 'https://cdn.jsdelivr.net/gh/EsotericSoftware/spine-runtimes@3.8.95/spine-ts/build/spine-webgl.js';
  const ACCENTS = ['#000000','#f4a0a0','#e07070','#c45050','#8b3a3a','#5c2d2d'];
  // Primary = lighter shade, Secondary = darker shade — same position is a coordinated cat duo.
  //              white,    grey,     ginger,   brown,    cream,    purple,   blue
  const PRIMARIES   = ['#ffffff','#d4d4d4','#f3c593','#b08968','#f7ecd5','#c4a8f0','#a8ccdf'];
  const SECONDARIES = ['#000000','#4a4a4a','#d9884a','#6b4a2b','#e8d0a8','#8b5cf6','#5d9dc8'];

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
      <div class="familiar-stage">
        <canvas class="familiar-canvas" id="familiarCanvas"></canvas>
        <div class="familiar-loading" id="familiarLoading">Loading cat&hellip;</div>
      </div>
      <div class="familiar-controls">
        <div class="fc-row">
          <label>Style</label>
          <div class="fc-segmented" id="fcStyleToggle" role="group" aria-label="Style">
            <button type="button" class="fc-seg active" data-style="normal">Normal</button>
            <button type="button" class="fc-seg" data-style="fluffy">Fluffy</button>
          </div>
        </div>
        <div class="fc-row fc-row-colors">
          <label>Primary</label>
          <div class="fc-color-group">
            <div class="fc-swatches" id="fcPrimarySwatches"></div>
            <input type="color" id="fcPrimary" value="#ffffff" title="Custom primary colour" />
          </div>
        </div>
        <div class="fc-row fc-row-colors">
          <label>Secondary</label>
          <div class="fc-color-group">
            <div class="fc-swatches" id="fcSecondarySwatches"></div>
            <input type="color" id="fcSecondary" value="#000000" title="Custom secondary colour" />
          </div>
        </div>
        <div class="fc-row fc-row-colors">
          <label>Accent</label>
          <div class="fc-color-group">
            <div class="fc-swatches" id="fcSwatches"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(pop);

  function renderSwatches(host, colors, activeHex) {
    colors.forEach((hex) => {
      const s = document.createElement('button');
      s.type = 'button';
      s.className = 'fc-swatch' + (hex.toLowerCase() === (activeHex || '').toLowerCase() ? ' active' : '');
      s.dataset.color = hex;
      s.style.background = hex;
      s.setAttribute('aria-label', hex);
      host.appendChild(s);
    });
  }
  const primarySwatchHost = pop.querySelector('#fcPrimarySwatches');
  const secondarySwatchHost = pop.querySelector('#fcSecondarySwatches');
  const swatchHost = pop.querySelector('#fcSwatches');
  renderSwatches(primarySwatchHost, PRIMARIES, '#ffffff');
  renderSwatches(secondarySwatchHost, SECONDARIES, '#000000');
  renderSwatches(swatchHost, ACCENTS, ACCENTS[3]);

  const closeBtn = pop.querySelector('.familiar-close');
  const header = pop.querySelector('.familiar-header');

  const PANEL_DEFAULT = 1280;
  const BUFFER = 48;
  function panelWidth() {
    const panel = document.querySelector('.portfolio-panel');
    return panel ? panel.getBoundingClientRect().width : PANEL_DEFAULT;
  }
  function sideWidth() {
    const side = (window.innerWidth - panelWidth()) / 2 - BUFFER;
    return Math.max(280, Math.min(560, Math.floor(side)));
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (pop.classList.contains('open')) { pop.classList.remove('open'); return; }
    pop.style.width = sideWidth() + 'px';
    pop.style.left = '24px';
    pop.classList.add('open');
    ensureCat();
  });
  closeBtn.addEventListener('click', e => {
    e.stopPropagation();
    pop.classList.remove('open');
  });

  // Drag
  let dragging = false, ox = 0, oy = 0;
  header.addEventListener('mousedown', e => {
    if (e.target.closest('.familiar-close')) return;
    if (pop.classList.contains('next-to-quiz')) return;
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

  // When the home page slides the popup next to the quiz, init the cat too.
  const obs = new MutationObserver(() => {
    if (pop.classList.contains('open')) ensureCat();
  });
  obs.observe(pop, { attributes: true, attributeFilter: ['class'] });

  // ---------- Cat customizer ----------
  let spineLoading = null;
  function loadSpine() {
    if (window.spine) return Promise.resolve();
    if (spineLoading) return spineLoading;
    spineLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SPINE_CDN;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load spine-webgl'));
      document.head.appendChild(s);
    });
    return spineLoading;
  }

  let catReady = false, skeleton = null, animState = null, isFluffy = false;
  let stableBounds = null;

  function setStatus(msg) {
    const l = document.getElementById('familiarLoading');
    if (l) l.textContent = msg;
    console.log('[familiar]', msg);
  }

  function ensureCat() {
    if (catReady) return;
    catReady = true;
    setStatus('Loading runtime…');
    loadSpine().then(() => {
      setStatus('Runtime loaded, init…');
      initCat();
    }).catch(err => {
      setStatus('Could not load Spine runtime');
      console.error(err);
    });
  }

  function hexToSpineColor(hex) {
    const r = parseInt(hex.slice(1,3), 16) / 255;
    const g = parseInt(hex.slice(3,5), 16) / 255;
    const b = parseInt(hex.slice(5,7), 16) / 255;
    return { r, g, b };
  }
  function getSkelBoundsRect(skel) {
    // Spine 3.8: skeleton.getBounds(offset, size) writes into Vector2-like out params
    const offset = new spine.Vector2();
    const size = new spine.Vector2();
    skel.getBounds(offset, size, []);
    return { x: offset.x, y: offset.y, width: size.x, height: size.y };
  }

  function tintByNameFragment(skel, fragment, hex) {
    if (!skel) return;
    const { r, g, b } = hexToSpineColor(hex);
    skel.slots.forEach(slot => {
      if (slot.data.name.includes(fragment)) {
        // Preserve current alpha so hidden slots stay hidden
        slot.color.set(r, g, b, slot.color.a);
      }
    });
  }

  function initCat() {
    const canvas = document.getElementById('familiarCanvas');
    const loading = document.getElementById('familiarLoading');

    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width));
    canvas.height = Math.max(1, Math.floor(rect.height));

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true });
    if (!gl) {
      setStatus('WebGL unavailable');
      return;
    }

    const am = new spine.webgl.AssetManager(gl, 'assets/cat/');
    // Spoof the 3.8.75 version string in cat.json so the 3.8.95 runtime accepts it
    am.loadText('cat.json');
    am.loadTextureAtlas('cat.atlas');

    const renderer = new spine.webgl.SceneRenderer(canvas, gl);

    let lastFrame = performance.now();

    function pollLoading() {
      if (am.hasErrors()) {
        const errs = am.getErrors();
        const msgs = [];
        for (const k in errs) msgs.push(k + ': ' + errs[k]);
        loading.innerHTML = 'Failed to load cat<br><span style="font-size:10px;opacity:0.7">' +
          (msgs.join('<br>') || 'unknown error') + '</span>';
        console.error('[familiar] asset errors:', errs);
        return;
      }
      const loaded = am.getLoaded(), toLoad = am.getToLoad();
      const total = loaded + toLoad;
      if (total > 0 && loading && loading.style.display !== 'none') {
        loading.textContent = 'Loading cat… ' + Math.round((loaded / total) * 100) + '%';
      }
      if (am.isLoadingComplete()) {
        startCat();
      } else {
        requestAnimationFrame(pollLoading);
      }
    }

    function startCat() {
      try {
        const atlas = am.get('cat.atlas');
        let jsonText = am.get('cat.json');
        // Spoof version: 3.8.75 → 3.8.95 to bypass the runtime's hard reject
        jsonText = jsonText.replace(/"spine"\s*:\s*"3\.8\.75"/, '"spine":"3.8.95"');
        const atlasLoader = new spine.AtlasAttachmentLoader(atlas);
        const skelJson = new spine.SkeletonJson(atlasLoader);
        const skelData = skelJson.readSkeletonData(JSON.parse(jsonText));
        skeleton = new spine.Skeleton(skelData);
        skeleton.setToSetupPose();
        skeleton.updateWorldTransform();
        stableBounds = getSkelBoundsRect(skeleton);
        const stateData = new spine.AnimationStateData(skelData);
        animState = new spine.AnimationState(stateData);
        const animName = skelData.findAnimation('Fluffy') ? 'Fluffy'
                       : (skelData.animations[0] && skelData.animations[0].name);
        if (animName) animState.setAnimation(0, animName, true);
        applyStyleVisibility(false);
        if (loading) loading.style.display = 'none';
        applyDefaults();
        console.log('[familiar] stable bounds:', stableBounds, 'anim:', animName);
        requestAnimationFrame(loop);
      } catch (err) {
        console.error('[familiar] startCat error:', err);
        setStatus('Spine init error: ' + (err && err.message ? err.message : err));
      }
    }

    function loop(now) {
      try {
        const delta = (now - lastFrame) / 1000;
        lastFrame = now;
        if (skeleton && animState) {
          animState.update(delta);
          animState.apply(skeleton);
          skeleton.updateWorldTransform();
        }

        const dpr = window.devicePixelRatio || 1;
        const w = Math.round(canvas.clientWidth * dpr);
        const h = Math.round(canvas.clientHeight * dpr);
        if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
          canvas.width = w;
          canvas.height = h;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const aspect = (w || 1) / (h || 1);
        const b = stableBounds;
        const cam = renderer.camera;
        const bw = (b && b.width > 0) ? b.width : 2000;
        const bh = (b && b.height > 0) ? b.height : 2000;
        const cx = (b && b.width > 0) ? (b.x + b.width / 2) : 0;
        const cy = (b && b.height > 0) ? (b.y + b.height / 2) : 0;
        cam.zoom = 1;
        cam.position.x = cx;
        cam.position.y = cy;
        const skelAspect = bw / bh;
        let viewW, viewH;
        if (skelAspect > aspect) {
          viewW = bw * 1.15;
          viewH = viewW / aspect;
        } else {
          viewH = bh * 1.15;
          viewW = viewH * aspect;
        }
        cam.viewportWidth = viewW;
        cam.viewportHeight = viewH;
        cam.update();
        if (!window.__catDbg) {
          window.__catDbg = true;
          console.log('[familiar] view:', viewW, 'x', viewH, 'pos:', cx, cy, 'canvas px:', w, 'x', h);
        }
        renderer.begin();
        renderer.drawSkeleton(skeleton, true);  // textures are premultiplied (Spine default)
        renderer.end();
      } catch (err) {
        if (!window.__catRenderErr) {
          window.__catRenderErr = true;
          console.error('[familiar] render error:', err);
        }
      }
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(pollLoading);
  }

  function applyStyleVisibility(fluffy) {
    if (!skeleton) return;
    const slots = skeleton.slots;
    const namesWithFluffyTwin = new Set();
    slots.forEach(s => {
      const n = s.data.name;
      if (n.endsWith('_Fluffy')) namesWithFluffyTwin.add(n.slice(0, -'_Fluffy'.length));
    });
    slots.forEach(slot => {
      const n = slot.data.name;
      const isFluffyVariant = n.includes('Fluffy');
      let visible;
      if (fluffy) {
        // Fluffy: show Fluffy variants + slots with no Fluffy twin
        visible = isFluffyVariant || !namesWithFluffyTwin.has(n);
      } else {
        // Normal: hide every Fluffy slot
        visible = !isFluffyVariant;
      }
      slot.color.a = visible ? 1.0 : 0.0;
    });
    applyAllTints();
  }

  function setStyle(fluffy) {
    isFluffy = fluffy;
    applyStyleVisibility(fluffy);
    const segs = document.querySelectorAll('#fcStyleToggle .fc-seg');
    segs.forEach(s => s.classList.toggle('active', s.dataset.style === (fluffy ? 'fluffy' : 'normal')));
  }

  function applyAllTints() {
    const p = document.getElementById('fcPrimary').value;
    const s = document.getElementById('fcSecondary').value;
    const activeAccent = swatchHost.querySelector('.fc-swatch.active');
    const a = activeAccent ? activeAccent.dataset.color : ACCENTS[3];
    tintByNameFragment(skeleton, '_1', p);
    tintByNameFragment(skeleton, '_2', s);
    tintByNameFragment(skeleton, '_3', a);
  }

  function applyDefaults() { applyAllTints(); }

  document.getElementById('fcStyleToggle').addEventListener('click', e => {
    const seg = e.target.closest('.fc-seg');
    if (!seg) return;
    setStyle(seg.dataset.style === 'fluffy');
  });

  function wireColor(swatchEl, pickerEl, fragment) {
    if (swatchEl) {
      swatchEl.addEventListener('click', e => {
        const sw = e.target.closest('.fc-swatch');
        if (!sw) return;
        swatchEl.querySelectorAll('.fc-swatch').forEach(x => x.classList.remove('active'));
        sw.classList.add('active');
        if (pickerEl) pickerEl.value = sw.dataset.color;
        tintByNameFragment(skeleton, fragment, sw.dataset.color);
      });
    }
    if (pickerEl) {
      pickerEl.addEventListener('input', e => {
        if (swatchEl) swatchEl.querySelectorAll('.fc-swatch').forEach(x => x.classList.remove('active'));
        tintByNameFragment(skeleton, fragment, e.target.value);
      });
    }
  }
  wireColor(primarySwatchHost, document.getElementById('fcPrimary'), '_1');
  wireColor(secondarySwatchHost, document.getElementById('fcSecondary'), '_2');
  wireColor(swatchHost, null, '_3');
})();
