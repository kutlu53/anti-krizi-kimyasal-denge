// Klavye + dokunmatik kontroller. axis.x: sağ(+), axis.y: ileri(+).
export class Controls {
  constructor() {
    this.axis = { x: 0, y: 0 };
    this.keys = new Set();
    this._jump = false;
    this._interact = false;
    this.joy = { active: false, id: null, cx: 0, cy: 0, x: 0, y: 0 };
    this.enabled = false;

    this.base = document.getElementById('joy-base');
    this.knob = document.getElementById('joy-knob');
    const left = document.getElementById('touch-left');
    const jumpBtn = document.getElementById('btn-jump');
    const interactBtn = document.getElementById('btn-interact');

    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (k === ' ' || k === 'arrowup' && e.shiftKey) { this._jump = true; e.preventDefault(); }
      if (k === 'e' || k === 'enter') this._interact = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    // Sanal joystick: sol yarıya dokunulan yerde belirir.
    const R = 45;
    left.addEventListener('pointerdown', (e) => {
      if (this.joy.active) return;
      this.joy.active = true; this.joy.id = e.pointerId;
      this.joy.cx = e.clientX; this.joy.cy = e.clientY;
      const r = left.getBoundingClientRect();
      this.base.style.display = 'block';
      this.base.style.left = (e.clientX - r.left - 60) + 'px';
      this.base.style.top = (e.clientY - r.top - 60) + 'px';
      this.base.style.bottom = 'auto';
      this.knob.style.transform = 'translate(0,0)';
      left.setPointerCapture(e.pointerId);
    });
    left.addEventListener('pointermove', (e) => {
      if (!this.joy.active || e.pointerId !== this.joy.id) return;
      let dx = e.clientX - this.joy.cx, dy = e.clientY - this.joy.cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      this.joy.x = dx / R; this.joy.y = -dy / R;
      this.knob.style.transform = `translate(${dx}px,${dy}px)`;
    });
    const end = (e) => {
      if (!this.joy.active || e.pointerId !== this.joy.id) return;
      this.joy.active = false; this.joy.x = 0; this.joy.y = 0;
      this.base.style.display = 'none';
    };
    left.addEventListener('pointerup', end);
    left.addEventListener('pointercancel', end);

    jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this._jump = true; });
    interactBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this._interact = true; });
  }

  update() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) y += 1;
    if (k.has('s') || k.has('arrowdown')) y -= 1;
    if (this.joy.active) { x = this.joy.x; y = this.joy.y; }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    this.axis.x = x; this.axis.y = y;
  }

  consumeJump() { const j = this._jump; this._jump = false; return j; }
  consumeInteract() { const i = this._interact; this._interact = false; return i; }
  clear() { this._jump = false; this._interact = false; this.keys.clear(); }
}
