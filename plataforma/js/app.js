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
        <span class="rate-chip">Brecha <span class="gap">${F.fmt.pct(eq.gapPct)}</span></span>`;
    },

    renderUser() {
      const u = S.currentUser;
      el('#sidebar-user').innerHTML = `
        <div class="avatar">${UI.avatar(u.name)}</div>
        <div><div class="u-name">${esc(u.name)}</div><div class="u-role">${esc(u.role)}</div></div>
        <span class="logout" title="Cerrar sesión">⏻</span>`;
      el('#sidebar-user .logout').onclick = () => { S.logout(); location.reload(); };
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
  }

  // ---------------------------------------------------------
  //  Init
  // ---------------------------------------------------------
  function init() {
    S.load();
    setupLogin();
    global.App = App;
  }

  global.App = App;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
