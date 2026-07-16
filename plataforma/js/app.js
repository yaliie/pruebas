/* =========================================================
   app.js — Router, navegación, sesión e inicialización
   ========================================================= */
(function (global) {
  'use strict';
  const S = global.Store, F = global.Finance, UI = global.UI, Views = global.Views;
  const el = UI.el, els = UI.els, esc = UI.esc;

  // Menú de navegación (agrupado). role: 'colab' significa visible para colaborador también.
  const NAV = [
    { group: 'Resumen', items: [
      { key: 'dashboard', label: 'Panel principal', ico: '📊', colab: true },
      { key: 'reportes', label: 'Reportes', ico: '📄' },
    ]},
    { group: 'Operación', items: [
      { key: 'ventas', label: 'Ventas', ico: '🛍️', colab: true },
      { key: 'productos', label: 'Productos', ico: '👚', colab: true },
      { key: 'inventario', label: 'Inventario', ico: '📦', colab: true },
      { key: 'pacas', label: 'Lotes / Pacas', ico: '📥' },
      { key: 'proveedores', label: 'Proveedores', ico: '🏭' },
    ]},
    { group: 'Finanzas', items: [
      { key: 'finanzas', label: 'Ingresos y egresos', ico: '💰' },
      { key: 'precios', label: 'Precios y rentabilidad', ico: '🏷️' },
      { key: 'fondos', label: 'Fondos y publicidad', ico: '📣' },
      { key: 'simulador', label: 'Simulador', ico: '🧮', colab: true },
    ]},
    { group: 'Sistema', items: [
      { key: 'configuracion', label: 'Configuración', ico: '⚙️' },
      { key: 'historial', label: 'Historial de cambios', ico: '🕓' },
    ]},
  ];

  const App = {
    current: 'dashboard',

    go(key) {
      const item = flatNav().find(i => i.key === key);
      if (!item) key = 'dashboard';
      // control de acceso: colaborador solo ve items colab
      if (!S.isAdmin() && item && !item.colab) { UI.toast('Sección solo para Administrador', 'w'); return; }
      this.current = key;
      location.hash = key;
      this.renderNav();
      this.renderView();
      closeSidebar();
    },

    refresh() { this.renderView(); this.renderRates(); },

    renderView() {
      const c = el('#view');
      c.scrollTop = 0;
      const fn = Views[this.current] || Views.dashboard;
      try { fn(c); } catch (e) { console.error(e); c.innerHTML = `<div class="alert d"><span class="ai">⛔</span><div>Error al cargar la vista: ${esc(e.message)}</div></div>`; }
      window.scrollTo(0, 0);
    },

    renderNav() {
      const nav = el('#main-nav');
      const admin = S.isAdmin();
      nav.innerHTML = NAV.map(g => {
        const items = g.items.filter(i => admin || i.colab);
        if (!items.length) return '';
        return `<div class="nav-group-title">${g.group}</div>` + items.map(i =>
          `<a data-nav="${i.key}" class="${this.current === i.key ? 'active' : ''}"><span class="ico">${i.ico}</span>${esc(i.label)}</a>`).join('');
      }).join('');
      els('[data-nav]', nav).forEach(a => a.onclick = () => this.go(a.dataset.nav));
    },

    renderRates() {
      const r = S.db.rates;
      const eq = F.equivalents(1, r.bcv, r.usdt);
      el('#topbar-rates').innerHTML = `
        <span class="rate-chip">BCV <b>${F.fmt.num(r.bcv)}</b></span>
        <span class="rate-chip">USDT <b>${F.fmt.num(r.usdt)}</b></span>
        <span class="rate-chip">EUR <b>${F.fmt.num(r.eur)}</b></span>
        <span class="rate-chip">Brecha <span class="gap">${F.fmt.pct(eq.gapPct)}</span></span>
        ${this.syncChip()}`;
    },

    syncChip() {
      if (!S.cloud.enabled) return '';
      const m = { online: ['🟢', 'Sincronizado'], saving: ['🟡', 'Guardando…'], connecting: ['🟡', 'Conectando…'], offline: ['🔴', 'Sin conexión'], local: ['⚪', 'Local'] };
      const [dot, txt] = m[S.cloud.status] || m.local;
      return `<span class="rate-chip" title="Estado de sincronización con la nube">${dot} ${txt}</span>`;
    },
    renderStatus() { if (el('#topbar-rates')) this.renderRates(); },

    renderUser() {
      const u = S.currentUser;
      el('#sidebar-user').innerHTML = `
        <div class="avatar">${UI.avatar(u.name)}</div>
        <div><div class="u-name">${esc(u.name)}</div><div class="u-role">${esc(u.role)}</div></div>
        <span class="logout" title="Cerrar sesión">⏻</span>`;
      el('#sidebar-user .logout').onclick = async () => { try { await S.cloud.signOut(); } catch (e) {} S.logout(); location.reload(); };
    },
  };

  function flatNav() { return NAV.flatMap(g => g.items); }
  function closeSidebar() { el('#sidebar').classList.remove('open'); const b = el('.backdrop'); if (b) b.classList.remove('show'); }

  // ---------------------------------------------------------
  //  Búsqueda global
  // ---------------------------------------------------------
  function setupSearch() {
    const input = el('#global-search'), box = el('#search-results');
    const run = () => {
      const q = (input.value || '').toLowerCase().trim();
      if (!q) { box.classList.add('hidden'); return; }
      const res = [];
      S.db.products.forEach(p => { if ((p.name + p.sku + p.category).toLowerCase().includes(q)) res.push({ type: 'Producto', label: p.name, action: () => { global.Views && global.App.go('productos'); } }); });
      S.db.suppliers.forEach(s => { if (s.name.toLowerCase().includes(q)) res.push({ type: 'Proveedor', label: s.name, action: () => App.go('proveedores') }); });
      S.db.sales.forEach(s => { if ((s.orderNumber + (s.customer || '')).toLowerCase().includes(q)) res.push({ type: 'Venta', label: s.orderNumber + ' · ' + (s.customer || ''), action: () => App.go('ventas') }); });
      box.innerHTML = res.slice(0, 8).map((r, i) => `<div class="sr-item" data-i="${i}"><span>${esc(r.label)}</span><span class="sr-type">${r.type}</span></div>`).join('') || `<div class="sr-item muted">Sin resultados</div>`;
      box.classList.remove('hidden');
      els('.sr-item[data-i]', box).forEach(item => item.onclick = () => { res[+item.dataset.i].action(); box.classList.add('hidden'); input.value = ''; });
    };
    input.oninput = run;
    document.addEventListener('click', e => { if (!e.target.closest('.global-search')) box.classList.add('hidden'); });
  }

  // ---------------------------------------------------------
  //  Login
  // ---------------------------------------------------------
  function setupLogin() {
    const sel = el('#login-user');
    sel.innerHTML = S.db.users.map(u => `<option value="${u.id}">${esc(u.name)} — ${esc(u.role)}</option>`).join('');
    const doLogin = () => {
      const u = S.login(sel.value, el('#login-pass').value);
      if (!u) { UI.toast('Contraseña incorrecta (demo: 1234)', 'd'); return; }
      startApp();
    };
    el('#login-btn').onclick = doLogin;
    el('#login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  }

  // ---------------------------------------------------------
  //  Login en la nube (correo + contraseña, Supabase Auth)
  // ---------------------------------------------------------
  function translateAuthError(e) {
    const msg = (e && e.message ? e.message : String(e)).toLowerCase();
    if (msg.includes('invalid login')) return 'Correo o contraseña incorrectos.';
    if (msg.includes('already registered') || msg.includes('already been registered')) return 'Ese correo ya tiene cuenta. Inicia sesión.';
    if (msg.includes('password') && msg.includes('6')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (msg.includes('email') && msg.includes('confirm')) return 'Confirma tu correo antes de entrar (revisa tu bandeja).';
    if (msg.includes('relation') && msg.includes('workspace')) return 'Falta crear la tabla en Supabase (ejecuta el script SQL).';
    if (msg.includes('permission') || msg.includes('row-level') || msg.includes('policy')) return 'Falta configurar permisos en Supabase (ejecuta el script SQL).';
    if (msg.includes('failed to fetch') || msg.includes('network')) return 'Sin conexión con la nube. Revisa tu internet.';
    return 'No se pudo completar: ' + (e && e.message ? e.message : 'error desconocido');
  }

  function setupCloudLogin() {
    const card = el('.login-card');
    let mode = 'login';
    const render = () => {
      card.innerHTML = `
        <div class="login-brand"><span class="logo-moon">🌙</span> Descanso<span class="logo-dot">.</span></div>
        <p class="login-sub">${mode === 'login' ? 'Entra a tu panel' : 'Crea tu cuenta'}</p>
        <label class="field"><span>Correo</span><input id="cl-email" type="email" autocomplete="username" placeholder="tucorreo@ejemplo.com"></label>
        <label class="field"><span>Contraseña</span><input id="cl-pass" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" placeholder="Mínimo 6 caracteres"></label>
        <button id="cl-go" class="btn btn-primary btn-block">${mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
        <p id="cl-msg" class="login-hint" style="min-height:18px;margin:8px 0 0"></p>
        <p class="login-hint" style="margin-top:6px">${mode === 'login' ? '¿No tienes cuenta? <a id="cl-toggle" style="cursor:pointer;font-weight:700">Créala aquí</a>' : '¿Ya tienes cuenta? <a id="cl-toggle" style="cursor:pointer;font-weight:700">Inicia sesión</a>'}</p>
        <p class="login-hint">Tus datos se guardan en la nube y se ven igual en todos tus dispositivos.</p>`;
      el('#cl-toggle', card).onclick = () => { mode = (mode === 'login' ? 'signup' : 'login'); render(); };
      el('#cl-go', card).onclick = submit;
      el('#cl-pass', card).addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
      el('#cl-email', card).focus();
    };
    const submit = async () => {
      const email = el('#cl-email', card).value.trim(), pass = el('#cl-pass', card).value;
      const msg = el('#cl-msg', card); msg.style.color = 'var(--danger)'; msg.textContent = '';
      if (!email || !pass) { msg.textContent = 'Escribe tu correo y contraseña.'; return; }
      const btn = el('#cl-go', card); const label = btn.textContent; btn.disabled = true; btn.textContent = 'Conectando…';
      try {
        if (mode === 'signup') {
          await S.cloud.signUp(email, pass);
          if (!S.cloud.session) { msg.style.color = 'var(--success)'; msg.textContent = 'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.'; btn.disabled = false; btn.textContent = label; mode = 'login'; return; }
        } else {
          await S.cloud.signIn(email, pass);
        }
        await S.cloudBootstrap(S.cloud.session.user.email);
        startApp();
      } catch (e) {
        console.warn(e); msg.style.color = 'var(--danger)'; msg.textContent = translateAuthError(e);
        btn.disabled = false; btn.textContent = label;
      }
    };
    render();
  }

  // ---------------------------------------------------------
  //  Sincronización periódica (trae cambios de otros dispositivos)
  // ---------------------------------------------------------
  let syncLoopStarted = false;
  async function cloudSyncTick() {
    if (!S.cloud.enabled || !S.cloud.session) return;
    try {
      const row = await S.cloud.pull();
      if (row && row.updated_at && row.updated_at !== S.lastSync) {
        S.applyRemote(row.data, row.updated_at);
        App.renderNav(); App.renderRates(); App.renderView();
      }
      S.cloud.setStatus(S.cloud.status === 'saving' ? 'saving' : 'online');
    } catch (e) { S.cloud.setStatus('offline'); }
  }
  function startCloudSyncLoop() {
    if (syncLoopStarted || !S.cloud.enabled) return;
    syncLoopStarted = true;
    setInterval(cloudSyncTick, 20000);
    window.addEventListener('focus', cloudSyncTick);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) cloudSyncTick(); });
  }

  function startApp() {
    el('#login-screen').classList.add('hidden');
    el('#app').classList.remove('hidden');
    App.renderUser();
    App.renderRates();
    // sidebar móvil
    const backdrop = document.createElement('div'); backdrop.className = 'backdrop'; document.body.appendChild(backdrop);
    el('#menu-toggle').onclick = () => { el('#sidebar').classList.toggle('open'); backdrop.classList.toggle('show'); };
    backdrop.onclick = closeSidebar;
    setupSearch();
    // ruta inicial
    const hash = (location.hash || '').replace('#', '');
    App.current = hash && flatNav().some(i => i.key === hash) ? hash : 'dashboard';
    App.renderNav();
    App.renderView();
    window.addEventListener('hashchange', () => { const h = location.hash.replace('#', ''); if (h && h !== App.current) App.go(h); });
    startCloudSyncLoop();
  }

  // ---------------------------------------------------------
  //  Init
  // ---------------------------------------------------------
  async function init() {
    global.App = App;
    S.load();
    S.cloud.init();
    S.cloud.onstatus = () => App.renderStatus();
    if (S.cloud.enabled) {
      setupCloudLogin(); // prepara la pantalla de correo/contraseña
      let session = null;
      try { session = await S.cloud.getSession(); } catch (e) { console.warn(e); }
      if (session && session.user) {
        try { await S.cloudBootstrap(session.user.email); startApp(); return; }
        catch (e) { console.warn('bootstrap falló, se pedirá login', e); }
      }
      // si no hay sesión válida, se queda en la pantalla de login (ya montada)
    } else {
      setupLogin(); // modo local (sin nube configurada): usuarios demo
    }
  }

  global.App = App;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
