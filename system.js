// Beju Creative systems page: scroll progress drives the system rig through CSS variables.
// ?demo=<0..1> jumps the system to that progress; ?go=<id> jumps to a section (both for screenshots).
(() => {
  const root = document.documentElement, body = document.body;
  const Q = new URLSearchParams(location.search);
  const demo = Q.has('demo') || Q.has('go');
  if (demo) root.classList.add('demo');
  const sy = () => demo ? body.scrollTop : scrollY;
  const scroller = demo ? body : window;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // waveform bars for the moment map (deterministic, so every visit looks the same)
  document.querySelectorAll('[data-wave]').forEach(w => {
    let x = 7, h = '';
    for (let i = 0, n = +w.dataset.wave; i < n; i++) {
      x = (x * 9301 + 49297) % 233280;
      const env = .3 + .7 * Math.abs(Math.sin(i * .21) * Math.cos(i * .047));
      h += `<i style="--a:${(.12 + .88 * (x / 233280) * env).toFixed(2)}"></i>`;
    }
    w.innerHTML = h;
  });

  // hero visual: a fixed 560×620 drawing, scaled to its box
  const hv = document.querySelector('.hero-vis'), hcv = hv && hv.querySelector('.hv-cv');
  const fitHero = () => { if (hcv) hcv.style.setProperty('--hfit', (hv.clientWidth / 560).toFixed(4)); };

  // ---- the system rig
  const rig = document.getElementById('rig');
  let measure = () => {}, update = () => {};
  if (rig) {
    const cv = rig.querySelector('.cv'), box = rig.querySelector('.rig-box'), map = rig.querySelector('.map');
    const devs = [...rig.querySelectorAll('.dev-in')];
    const steps = [...document.querySelectorAll('.st')], N = steps.length;
    const scenes = [...rig.querySelectorAll('.scr')].map(el => ({
      el, k: +el.dataset.k - 1, hops: +el.dataset.hops || 0, h: -1,
      ats: [...el.querySelectorAll('[data-at]')].map(e => ({ e, a: +e.dataset.at, b: e.dataset.to ? +e.dataset.to : 9, on: null }))
    }));
    const nodes = [...rig.querySelectorAll('.map-nodes li')];
    const rcN = rig.querySelector('.rc-n'), rcT = rig.querySelector('.rc-t'), rt = rig.querySelector('.rt');
    const mq = matchMedia('(max-width:899px)');
    let tops = [], dens = [], thr = 0, cur = -1, start0 = 0;

    // a scene at local progress s: items appear at data-at, leave at data-to; cards hop between columns
    const apply = (o, s) => {
      o.el.style.setProperty('--s', s.toFixed(4));
      for (const t of o.ats) { const on = s >= t.a && s < t.b; if (t.on !== on) { t.on = on; t.e.classList.toggle('in', on); } }
      if (o.hops) { const h = Math.min(o.hops, Math.floor(s * (o.hops + 1))); if (o.h !== h) { o.h = h; o.el.style.setProperty('--hop', h); } }
    };
    const setStep = i => {
      cur = i; const st = steps[i];
      rig.dataset.step = i + 1; rig.dataset.lead = st.dataset.lead; rig.style.setProperty('--step', i);
      steps.forEach((s, k) => s.classList.toggle('on', k === i));
      scenes.forEach(o => { o.el.classList.toggle('on', o.k === i); o.el.classList.toggle('past', o.k < i); if (o.k !== i) apply(o, o.k < i ? 1 : 0); });
      nodes.forEach((n, k) => { n.classList.toggle('lit', k < i); n.classList.toggle('cur', k === i); });
      rcN.textContent = String(i + 1).padStart(2, '0'); rcT.textContent = st.dataset.name;
      if (rt) { rt.firstElementChild.textContent = st.querySelector('h3').textContent; rt.lastElementChild.textContent = st.querySelector('.st-next').textContent; }
      rig.classList.remove('tick'); void rig.offsetWidth; rig.classList.add('tick');
    };
    measure = () => {
      const vh = innerHeight, y = sy(), rh = rig.offsetHeight;
      // the line a step's words must cross to take over the stage
      thr = mq.matches ? rh + (vh - rh) * .45 : vh * .5;
      tops = steps.map(s => s.getBoundingClientRect().top + y);
      dens = steps.map((s, i) => Math.max(1, i === N - 1 ? Math.min(s.offsetHeight * .72, s.offsetHeight - (vh - thr)) : s.offsetHeight * .72));
      // step 1 starts only once the stage is pinned, and finishes just before step 2 takes over
      start0 = mq.matches ? rh : 0;
      dens[0] = Math.max(1, (start0 - thr + steps[0].offsetHeight) * .9);
      rig.style.setProperty('--fit', Math.min(box.clientWidth / cv.offsetWidth, box.clientHeight / cv.offsetHeight).toFixed(4));
    };
    update = () => {
      const y = sy(); let i = 0;
      for (let k = 0; k < N; k++) if (tops[k] - y <= thr) i = k;
      const s = clamp(((i ? thr : start0) - (tops[i] - y)) / dens[i], 0, 1);
      if (i !== cur) setStep(i);
      scenes.forEach(o => { if (o.k === i) apply(o, s); });
      devs.forEach(d => d.style.setProperty('--sl', s.toFixed(3)));
      map.style.setProperty('--mp', clamp((i + s) / (N - 1), 0, 1).toFixed(4));
      map.style.setProperty('--loop', i === N - 1 ? clamp((s - .35) * 4, 0, 1).toFixed(3) : 0);
    };

    if (Q.has('demo')) {
      const go = () => {
        measure();
        const v = clamp(+Q.get('demo') || 0, 0, 1); let i = Math.min(N - 1, Math.floor(v * N)), s = v * N - i;
        if (v >= 1) { i = N - 1; s = 1; }
        body.scrollTop = tops[i] - (i ? thr : start0) + s * dens[i] + .5; update();
      };
      addEventListener('load', () => { go(); setTimeout(go, 250); setTimeout(go, 800); });
      addEventListener('resize', go);
    }
  }

  // ---- engagement timeline: the line draws as you scroll past it
  const eng = document.getElementById('eng');
  const drawEng = () => { if (!eng) return; const r = eng.getBoundingClientRect(); eng.style.setProperty('--e', clamp((innerHeight * .7 - r.top) / r.height, 0, 1).toFixed(3)); };

  let raf = 0;
  const frame = () => { raf = 0; update(); drawEng(); };
  const req = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const all = () => { fitHero(); measure(); frame(); };
  scroller.addEventListener('scroll', req, { passive: true });
  addEventListener('resize', all);
  if ('ResizeObserver' in window) new ResizeObserver(all).observe(document.querySelector('main'));
  if (document.fonts) document.fonts.ready.then(all);
  all();

  if (Q.has('go')) {
    const go = () => { const el = document.getElementById(Q.get('go')); if (el) { body.scrollTop = el.getBoundingClientRect().top + body.scrollTop; frame(); } };
    addEventListener('load', () => { go(); setTimeout(go, 250); setTimeout(go, 800); });
    addEventListener('resize', go);
  }
})();
