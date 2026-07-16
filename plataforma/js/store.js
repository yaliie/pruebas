/* =========================================================
   store.js — Capa de datos (localStorage), semilla y bitácora
   ========================================================= */
(function (global) {
  'use strict';

  const KEY = 'descanso_db_v1';

  // ---- Utilidades base ----
  const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
  const now = () => new Date().toISOString();
  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  // ---- Catálogos (editables/escalables) ----
  const CATEGORIES = [
    'Pijamas para mujeres', 'Pijamas para hombres', 'Pijamas para niños',
    'Batas de baño', 'Pantuflas', 'Accesorios para dormir', 'Ropa cómoda', 'Combos y regalos'
  ];
  const AUDIENCES = ['Mujer', 'Hombre', 'Niño', 'Niña', 'Unisex'];
  const CHANNELS = ['Instagram', 'WhatsApp', 'Tienda online', 'Venta presencial', 'Referido', 'Marketplace', 'Otro'];
  const PAY_METHODS = ['Bolívares a tasa BCV', 'Bolívares a tasa USDT', 'Efectivo en dólares', 'Efectivo en euros', 'USDT', 'Pago móvil', 'Transferencia bancaria', 'Zelle', 'Pago mixto'];
  const PLATFORMS = ['SHEIN', 'AliExpress', 'Temu', 'Mayorista local', 'Otro'];
  const PRODUCT_STATES = ['disponible', 'poco inventario', 'agotado', 'descontinuado'];
  const INCOME_CATS = ['Venta de productos', 'Pagos pendientes recibidos', 'Ingresos adicionales', 'Recuperación de inversiones', 'Otros ingresos'];
  const EXPENSE_CATS = ['Compra de mercancía', 'Envíos internacionales', 'Envíos nacionales', 'Delivery', 'Empaques', 'Bolsas', 'Etiquetas', 'Material para fotografías', 'Publicidad en Facebook', 'Publicidad en Instagram', 'Devoluciones', 'Productos dañados', 'Comisiones', 'Otros gastos'];
  const INV_MOVES = ['entrada', 'salida', 'ajuste', 'devolución', 'dañado', 'reservado', 'entregado', 'contenido'];

  // ---------------------------------------------------------
  //  SEMILLA — datos de ejemplo realistas
  // ---------------------------------------------------------
  function seed() {
    const bcv = 853.0, usdt = 866.0, eur = 832.0; // BCV/EUR editables; USDT ~866-868. Brecha realista de pocos %.

    const suppliers = [
      { id: 'sup_shein', name: 'SHEIN Oficial', country: 'China', platform: 'SHEIN', contact: 'app SHEIN', storeLink: 'https://shein.com', avgDeliveryDays: 18, avgShippingUsd: 6, quality: 4, notes: 'Buena relación precio/calidad en pijamas de dama.' },
      { id: 'sup_ali', name: 'CozyHome Store', country: 'China', platform: 'AliExpress', contact: 'chat AliExpress', storeLink: 'https://aliexpress.com', avgDeliveryDays: 25, avgShippingUsd: 4, quality: 3, notes: 'Batas económicas, calidad variable.' },
      { id: 'sup_temu', name: 'Temu Comfort', country: 'China', platform: 'Temu', contact: 'app Temu', storeLink: 'https://temu.com', avgDeliveryDays: 15, avgShippingUsd: 0, quality: 3, notes: 'Envío gratis, pantuflas muy baratas.' },
      { id: 'sup_local', name: 'Mayorista El Bolsón', country: 'Venezuela', platform: 'Mayorista local', contact: '0412-5551122', storeLink: '', avgDeliveryDays: 2, avgShippingUsd: 1, quality: 4, notes: 'Entrega rápida, paga en Bs.' },
    ];

    // productos (algunos vienen de un lote/paca)
    const products = [
      p('Pijama Set Satén Rosa', 'PIJ-M-001', '👚', 'Pijamas para mujeres', 'Conjunto', 'Mujer', 'M', 'Rosa', 'Liso', 'Satén', 'sup_shein', 'SHEIN', 5.5, 30, 12, { intl: 0.9, com: 0.3, pack: 0.4 }, 14.0, bcv, usdt, 8),
      p('Pijama Algodón Nube', 'PIJ-M-002', '🌸', 'Pijamas para mujeres', 'Conjunto', 'Mujer', 'L', 'Celeste', 'Nubes', 'Algodón', 'sup_shein', 'SHEIN', 6.0, 24, 6, { intl: 0.9, com: 0.3, pack: 0.4 }, 15.0, bcv, usdt, 12),
      p('Bata de Baño Felpa', 'BAT-001', '🛁', 'Batas de baño', 'Felpa', 'Unisex', 'Único', 'Blanco', 'Liso', 'Felpa', 'sup_ali', 'AliExpress', 7.2, 15, 5, { intl: 1.2, com: 0.4, pack: 0.5 }, 18.0, bcv, usdt, 20),
      p('Pantufla Oso Peluche', 'PAN-001', '🧸', 'Pantuflas', 'Peluche', 'Mujer', '37-38', 'Beige', 'Oso', 'Peluche', 'sup_temu', 'Temu', 2.1, 40, 22, { intl: 0, com: 0.1, pack: 0.2 }, 6.5, bcv, usdt, 3),
      p('Pantufla Nube Antideslizante', 'PAN-002', '☁️', 'Pantuflas', 'Espuma', 'Unisex', '39-40', 'Rosa', 'Nube', 'Espuma', 'sup_temu', 'Temu', 2.4, 35, 30, { intl: 0, com: 0.1, pack: 0.2 }, 7.0, bcv, usdt, 1),
      p('Pijama Niño Dinosaurio', 'PIJ-N-001', '🦕', 'Pijamas para niños', 'Conjunto', 'Niño', '4', 'Verde', 'Dino', 'Algodón', 'sup_shein', 'SHEIN', 4.0, 20, 9, { intl: 0.8, com: 0.2, pack: 0.3 }, 11.0, bcv, usdt, 6),
      p('Antifaz de Seda + Vincha', 'ACC-001', '😴', 'Accesorios para dormir', 'Antifaz', 'Mujer', 'Único', 'Vino', 'Liso', 'Seda sintética', 'sup_ali', 'AliExpress', 1.3, 50, 18, { intl: 0.3, com: 0.1, pack: 0.15 }, 4.5, bcv, usdt, 5),
      p('Mono Comodísimo Dama', 'ROP-001', '🧘', 'Ropa cómoda', 'Mono', 'Mujer', 'M', 'Gris', 'Liso', 'Algodón french terry', 'sup_local', 'Mayorista local', 8.0, 12, 3, { nat: 0.5, pack: 0.4 }, 19.0, bcv, usdt, 30, true),
    ];

    // lote/paca de ejemplo del que salieron un par de productos
    const batches = [
      {
        id: 'bat_001', name: 'Paca de pijamas de dama (SHEIN)', supplierId: 'sup_shein', platform: 'SHEIN',
        date: daysAgo(40), totalCost: 90, unitsBought: 20, damagedUnits: 1, giftUnits: 1,
        additionalCosts: [{ label: 'Envío internacional', amount: 18 }, { label: 'Comisión de compra', amount: 3 }],
        rateBCV: bcv, rateUSDT: usdt, notes: 'De 20 unidades: 1 vino con mancha (no vendible), 1 usada para fotos/regalo.'
      }
    ];

    // ventas de ejemplo (últimas semanas)
    const sales = [];
    const addSale = (dOffset, items, method, channel, rBCV, rUSDT, delivery = 0, deliveryBy = 'Cliente', discount = 0, customer = 'Cliente') => {
      sales.push({
        id: uid('sale'), orderNumber: 'V-' + (1000 + sales.length + 1),
        datetime: daysAgo(dOffset), customer, items, discount,
        paymentMethod: method, channel, rateBCV: rBCV, rateUSDT: rUSDT,
        deliveryCost: delivery, deliveryPaidBy: deliveryBy, status: 'entregado', notes: '',
        mixed: null,
      });
    };
    const it = (pid, qty, price) => ({ productId: pid, qty, unitPrice: price });
    addSale(0, [it(products[0].id, 1, 14)], 'Bolívares a tasa BCV', 'Instagram', bcv, usdt, 2, 'Cliente', 0, 'María G.');
    addSale(0, [it(products[3].id, 2, 6.5)], 'Pago móvil', 'WhatsApp', bcv, usdt, 0, 'Cliente', 0, 'Luisa P.');
    addSale(1, [it(products[4].id, 1, 7)], 'USDT', 'Instagram', bcv, usdt, 0, 'Negocio', 0, 'Andrea R.');
    addSale(2, [it(products[1].id, 1, 15), it(products[6].id, 1, 4.5)], 'Efectivo en dólares', 'Venta presencial', bcv, usdt, 0, 'Cliente', 1, 'Sofía M.');
    addSale(3, [it(products[2].id, 1, 18)], 'Zelle', 'WhatsApp', bcv, usdt, 3, 'Negocio', 0, 'Carla T.');
    addSale(5, [it(products[3].id, 3, 6.5)], 'Bolívares a tasa USDT', 'Marketplace', bcv, usdt, 0, 'Cliente', 0, 'Gaby L.');
    addSale(8, [it(products[7].id, 1, 19)], 'Transferencia bancaria', 'Referido', bcv - 3, usdt - 2, 0, 'Cliente', 0, 'Rosa V.');
    addSale(12, [it(products[0].id, 2, 14)], 'Bolívares a tasa BCV', 'Instagram', bcv - 5, usdt - 4, 2, 'Negocio', 2, 'Elena D.');
    addSale(18, [it(products[4].id, 4, 7)], 'Pago móvil', 'WhatsApp', bcv - 8, usdt - 6, 0, 'Cliente', 0, 'Vanessa Q.');
    addSale(26, [it(products[5].id, 2, 11)], 'USDT', 'Instagram', bcv - 10, usdt - 6, 0, 'Cliente', 0, 'Paola N.');
    addSale(40, [it(products[6].id, 3, 4.5)], 'Efectivo en dólares', 'Venta presencial', bcv - 15, usdt - 8, 0, 'Cliente', 0, 'Isabel F.');

    // egresos de ejemplo (además de las compras)
    const movements = [
      mov('expense', 'Publicidad en Instagram', 12, 'USD', usdt, daysAgo(6), 'Campaña pijamas dama'),
      mov('expense', 'Publicidad en Facebook', 8, 'USD', usdt, daysAgo(3), 'Reels pantuflas'),
      mov('expense', 'Empaques', 6, 'USD', usdt, daysAgo(10), 'Bolsas y papel de seda'),
      mov('expense', 'Etiquetas', 3, 'USD', usdt, daysAgo(10), 'Etiquetas de marca'),
      mov('income', 'Ingresos adicionales', 5, 'USD', usdt, daysAgo(4), 'Venta de retazos'),
    ];

    const rateHistory = [
      { id: uid('r'), bcv: 840, usdt: 858, eur: 812, date: daysAgo(30) },
      { id: uid('r'), bcv: 845, usdt: 862, eur: 818, date: daysAgo(20) },
      { id: uid('r'), bcv: 849, usdt: 864, eur: 824, date: daysAgo(10) },
      { id: uid('r'), bcv: 851, usdt: 867, eur: 828, date: daysAgo(3) },
      { id: uid('r'), bcv: bcv, usdt: usdt, eur: eur, date: now() },
    ];

    return {
      version: 1,
      rates: { bcv, usdt, eur, updatedAt: now() },
      rateHistory,
      config: {
        profitTargetLow: 30, profitTargetHigh: 35,
        funds: { reposicion: 60, publicidad: 10, reserva: 10, disponible: 20 }, // % de la ganancia neta
        recoverCostFirst: true,
        expenseCats: EXPENSE_CATS.slice(),
        incomeCats: INCOME_CATS.slice(),
        lowStockThreshold: 3,
        staleDays: 45,
      },
      funds: { reposicion: 0, publicidad: 0, reserva: 0, disponible: 0 }, // saldos acumulados (se recalculan)
      users: [
        { id: 'u_admin', name: 'Propietaria', role: 'Administrador', pass: '1234' },
        { id: 'u_colab', name: 'Colaboradora', role: 'Colaborador', pass: '1234' },
      ],
      suppliers, products, batches, sales, movements,
      inventory: [], // movimientos de inventario manuales
      changelog: [],
    };

    // helpers internos de seed
    function p(name, sku, photo, category, subcat, audience, size, color, print, material, supplierId, platform, unitCost, bought, sold, extra, price, rBCV, rUSDT, extraDays, local) {
      const e = extra || {};
      return {
        id: uid('prod'), name, sku, photo, description: name, category, subcategory: subcat,
        audience, size, color, print, material, supplierId, platform,
        sourceLink: '', purchaseDate: daysAgo(extraDays || 30),
        qtyBought: bought, qtySold: sold, qtyAvailable: bought - sold,
        purchaseUnitCost: unitCost, intlShipping: e.intl || 0, nationalShipping: e.nat || 0,
        buyCommission: e.com || 0, packaging: e.pack || 0, otherCosts: e.other || 0,
        currentPrice: price, rateBCV: rBCV, rateUSDT: rUSDT,
        status: 'disponible', batchId: null,
      };
    }
    function mov(type, category, amount, currency, rate, date, description) {
      return { id: uid('mov'), type, category, amount, currency, rate, rateBCV: bcv, rateUSDT: rate, date, description, relatedId: null };
    }
  }

  // ---------------------------------------------------------
  //  Persistencia
  // ---------------------------------------------------------
  let db = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { db = JSON.parse(raw); migrate(); }
      else { db = seed(); save(); }
    } catch (e) {
      db = seed();
    }
    return db;
  }
  function save(opts) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('No se pudo guardar', e); }
    if (!opts || opts.cloud !== false) Store.cloudPush();
  }
  function reset() { db = seed(); save(); return db; }

  // Migración para datos guardados de versiones anteriores (añade campos nuevos).
  function migrate() {
    if (db && db.rates && db.rates.eur == null) db.rates.eur = 832;
    if (db && !db.access) db.access = {};
  }

  // ---------------------------------------------------------
  //  Sincronización en la nube (Supabase) — opcional
  //  Guarda TODO el panel como un documento JSON compartido.
  //  Si no hay configuración/red, el panel sigue funcionando
  //  localmente (localStorage) sin romperse.
  // ---------------------------------------------------------
  const Cloud = {
    enabled: false, client: null, session: null, ws: 'main', status: 'local', onstatus: null,
    init() {
      const cfg = global.DESCANSO_CLOUD;
      if (cfg && cfg.url && cfg.key && global.supabase && global.supabase.createClient) {
        try {
          this.client = global.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true } });
          this.enabled = true; this.status = 'connecting';
        } catch (e) { console.warn('Supabase init falló', e); this.enabled = false; }
      }
      return this.enabled;
    },
    setStatus(s) { this.status = s; if (this.onstatus) this.onstatus(s); },
    async getSession() { if (!this.enabled) return null; const { data } = await this.client.auth.getSession(); this.session = data ? data.session : null; return this.session; },
    async signIn(email, password) { const { data, error } = await this.client.auth.signInWithPassword({ email: (email || '').trim(), password }); if (error) throw error; this.session = data.session; return data.session; },
    async signUp(email, password) { const { data, error } = await this.client.auth.signUp({ email: (email || '').trim(), password }); if (error) throw error; this.session = data.session; return data; },
    async signOut() { if (this.enabled) { try { await this.client.auth.signOut(); } catch (e) {} } this.session = null; },
    async pull() { const { data, error } = await this.client.from('workspace').select('data,updated_at').eq('id', this.ws).maybeSingle(); if (error) throw error; return data; },
    async push(obj) { const ts = new Date().toISOString(); const { error } = await this.client.from('workspace').upsert({ id: this.ws, data: obj, updated_at: ts }); if (error) throw error; return ts; },
  };

  // ---------------------------------------------------------
  //  Bitácora de cambios (historial)
  // ---------------------------------------------------------
  function log(entity, action, field, oldValue, newValue) {
    db.changelog.unshift({
      id: uid('log'), user: Store.currentUser ? Store.currentUser.name : 'Sistema',
      role: Store.currentUser ? Store.currentUser.role : '-',
      when: now(), entity, action, field,
      oldValue: oldValue === undefined ? '' : String(oldValue),
      newValue: newValue === undefined ? '' : String(newValue),
    });
    if (db.changelog.length > 500) db.changelog.length = 500;
  }

  // ---------------------------------------------------------
  //  API pública
  // ---------------------------------------------------------
  const Store = {
    currentUser: null,
    get db() { return db; },
    load, save, reset, log, uid, now,
    CATEGORIES, AUDIENCES, CHANNELS, PAY_METHODS, PLATFORMS, PRODUCT_STATES,
    INCOME_CATS, EXPENSE_CATS, INV_MOVES,

    // colecciones genéricas
    all(coll) { return db[coll] || []; },
    find(coll, id) { return (db[coll] || []).find(x => x.id === id); },
    add(coll, obj) {
      obj.id = obj.id || uid(coll.slice(0, 3));
      db[coll].push(obj); save();
      log(coll, 'crear', '', '', obj.name || obj.orderNumber || obj.id);
      return obj;
    },
    update(coll, id, patch) {
      const item = this.find(coll, id);
      if (!item) return null;
      Object.keys(patch).forEach(k => {
        if (item[k] !== patch[k]) log(coll, 'editar', k, item[k], patch[k]);
        item[k] = patch[k];
      });
      save();
      return item;
    },
    remove(coll, id) {
      const item = this.find(coll, id);
      db[coll] = db[coll].filter(x => x.id !== id);
      save();
      if (item) log(coll, 'eliminar', '', item.name || item.orderNumber || id, '');
    },

    // auth
    login(userId, pass) {
      const u = db.users.find(x => x.id === userId);
      if (u && u.pass === pass) { this.currentUser = u; log('sesión', 'login', '', '', u.name); save(); return u; }
      return null;
    },
    logout() { if (this.currentUser) log('sesión', 'logout', '', this.currentUser.name, ''); this.currentUser = null; },
    isAdmin() { return this.currentUser && this.currentUser.role === 'Administrador'; },

    // tasas
    setRates(bcv, usdt, eur) {
      const old = { ...db.rates };
      if (eur == null) eur = old.eur; // permite actualizar sin tocar EUR
      db.rates = { bcv: +bcv, usdt: +usdt, eur: +eur, updatedAt: now() };
      db.rateHistory.push({ id: uid('r'), bcv: +bcv, usdt: +usdt, eur: +eur, date: now() });
      log('tasas', 'actualizar', 'BCV/USDT/EUR', old.bcv + '/' + old.usdt + '/' + old.eur, bcv + '/' + usdt + '/' + eur);
      save();
    },

    // ---- Nube ----
    cloud: Cloud,
    lastSync: null,
    _pushTimer: null,
    cloudPush() {
      if (!Cloud.enabled || !Cloud.session) return;
      Cloud.setStatus('saving');
      clearTimeout(this._pushTimer);
      this._pushTimer = setTimeout(async () => {
        try { this.lastSync = await Cloud.push(db); Cloud.setStatus('online'); }
        catch (e) { console.warn('cloud push', e); Cloud.setStatus('offline'); }
      }, 700);
    },
    // Aplica un documento remoto sobre el estado local (sin re-empujar a la nube).
    applyRemote(data, ts) {
      if (!data) return;
      db = data; migrate();
      this.lastSync = ts || this.lastSync;
      save({ cloud: false });
    },
    // Tras autenticar: trae el documento remoto (o empuja la semilla local),
    // fija el rol del usuario y deja el panel listo.
    async cloudBootstrap(email) {
      const row = await Cloud.pull(); // puede lanzar error de red/permiso
      if (row && row.data) { db = row.data; migrate(); this.lastSync = row.updated_at; }
      db.access = db.access || {};
      if (Object.keys(db.access).length === 0) db.access[email] = 'Administrador'; // primer usuario = admin
      else if (!db.access[email]) db.access[email] = 'Colaborador';
      this.currentUser = { id: email, name: (email.split('@')[0] || email), email, role: db.access[email] };
      save({ cloud: false });
      try { this.lastSync = await Cloud.push(db); Cloud.setStatus('online'); } catch (e) { Cloud.setStatus('offline'); }
      return this.currentUser;
    },
  };

  global.Store = Store;
})(window);
