/* =========================================================
   views.js — Vistas de cada sección de la plataforma
   ========================================================= */
(function (global) {
  'use strict';
  const S = global.Store, F = global.Finance, UI = global.UI;
  const fmt = F.fmt, esc = UI.esc;

  // estado de filtros del dashboard (persistente en memoria)
  let dashState = { range: 'month', channel: '', method: '', supplier: '', category: '', audience: '' };

  const Views = {};

  // Helper: page header
  function head(title, sub, actions) {
    return `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>
      <div class="page-actions">${actions || ''}</div></div>`;
  }
  function optionList(arr, sel) { return arr.map(o => `<option value="${esc(o)}" ${o === sel ? 'selected' : ''}>${esc(o)}</option>`).join(''); }
  function supplierName(id) { const s = S.find('suppliers', id); return s ? s.name : '—'; }

  // =========================================================
  //  DASHBOARD
  // =========================================================
  Views.dashboard = function (c) {
    const range = F.rangeFromKey(dashState.range);
    const filters = { channel: dashState.channel, method: dashState.method, supplier: dashState.supplier, category: dashState.category, audience: dashState.audience };
    const s = F.summary(range, filters);
    const ranks = F.productRankings();
    const supRanks = F.supplierRankings().sort((a, b) => b.profit - a.profit);
    const bestSupplier = supRanks[0];

    // ventas de hoy/semana/mes (siempre, sin filtro de rango)
    const today = F.summary(F.rangeFromKey('today'), filters);
    const week = F.summary(F.rangeFromKey('week'), filters);
    const month = F.summary(F.rangeFromKey('month'), filters);

    const rates = S.db.rates;
    const eq = F.equivalents(1, rates.bcv, rates.usdt);

    // --- Filtros ---
    const rangeChips = [['today', 'Hoy'], ['week', 'Esta semana'], ['month', 'Este mes'], ['all', 'Todo']]
      .map(([k, l]) => `<button class="chip-toggle ${dashState.range === k ? 'active' : ''}" data-range="${k}">${l}</button>`).join('');

    const filterBar = `<div class="filters">
      ${rangeChips}
      <span style="width:8px"></span>
      <select data-f="category"><option value="">Categoría: todas</option>${optionList(S.CATEGORIES, dashState.category)}</select>
      <select data-f="audience"><option value="">Público: todos</option>${optionList(S.AUDIENCES, dashState.audience)}</select>
      <select data-f="supplier"><option value="">Proveedor: todos</option>${S.db.suppliers.map(x => `<option value="${x.id}" ${dashState.supplier === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
      <select data-f="channel"><option value="">Canal: todos</option>${optionList(S.CHANNELS, dashState.channel)}</select>
      <select data-f="method"><option value="">Pago: todos</option>${optionList(S.PAY_METHODS, dashState.method)}</select>
    </div>`;

    // --- Tarjetas prioritarias (entendibles en <10s) ---
    const primary = `<div class="cards">
      ${UI.metric({ label: 'Ventas del período', value: fmt.usd(s.revenue), sub: `${s.salesCount} ventas · ${s.unitsSold} unidades`, cls: 'hero', badge: '🛍️' })}
      ${UI.metric({ label: 'Ganancia real (sostenible)', value: fmt.usd(s.sustainable), sub: `Contable: ${fmt.usd(s.accProfit)}`, cls: s.sustainable >= 0 ? 'good' : 'bad', badge: '💚' })}
      ${UI.metric({ label: 'Dinero disponible (caja)', value: fmt.usd(s.funds.disponible), sub: 'Ganancia libre para usar', cls: 'accent', badge: '💵' })}
      ${UI.metric({ label: 'Para reposición', value: fmt.usd(s.funds.reposicion), sub: 'Reservado para reponer mercancía', cls: 'warn', badge: '🔄' })}
      ${UI.metric({ label: 'Valor del inventario', value: fmt.usd(s.inventoryValueCost), sub: `A precio de venta: ${fmt.usd(s.inventoryValueSale)}`, badge: '📦' })}
      ${UI.metric({ label: 'Fondo publicidad', value: fmt.usd(s.funds.publicidad), sub: `Gastado en ads: ${fmt.usd(s.adsSpend)}`, cls: 'accent', badge: '📣' })}
    </div>`;

    // --- Segunda fila de métricas ---
    const secondary = `<div class="section-title">Resumen financiero <span class="hint">del período seleccionado</span></div>
    <div class="cards">
      ${UI.metric({ label: 'Ingresos totales', value: fmt.usd(s.totalIncome), badge: '⬆️' })}
      ${UI.metric({ label: 'Egresos totales', value: fmt.usd(s.expenses), badge: '⬇️' })}
      ${UI.metric({ label: 'Ganancia bruta', value: fmt.usd(s.grossProfit) })}
      ${UI.metric({ label: 'Ganancia neta', value: fmt.usd(s.netProfit), cls: s.netProfit >= 0 ? 'good' : 'bad' })}
      ${UI.metric({ label: 'Invertido en inventario', value: fmt.usd(s.invested), badge: '🏦' })}
      ${UI.metric({ label: 'Costo de reposición', value: fmt.usd(s.repoCostTotal), badge: '♻️' })}
      ${UI.metric({ label: 'Reserva / emergencia', value: fmt.usd(s.funds.reserva), badge: '🛟' })}
      ${UI.metric({ label: 'Erosión cambiaria', value: fmt.usd(s.erosion), sub: 'Ganancia perdida por brecha BCV-USDT', cls: 'warn', badge: '⚠️' })}
    </div>`;

    // --- Inventario rápido ---
    const inv = `<div class="section-title">Inventario</div>
    <div class="cards">
      ${UI.metric({ label: 'Productos disponibles', value: fmt.num(s.availableCount), badge: '✅' })}
      ${UI.metric({ label: 'Unidades vendidas', value: fmt.num(s.unitsSold), badge: '🧾' })}
      ${UI.metric({ label: 'Poco inventario', value: fmt.num(s.lowStock.length), sub: '≤ ' + S.db.config.lowStockThreshold + ' unidades', cls: s.lowStock.length ? 'warn' : '', badge: '🔔' })}
      ${UI.metric({ label: 'Agotados', value: fmt.num(s.outStock.length), cls: s.outStock.length ? 'bad' : '', badge: '🚫' })}
    </div>`;

    // --- Alertas ---
    const alerts = buildDashAlerts(s, ranks);

    // --- Gráficos ---
    const monthly = monthlySeries();
    const chartSales = UI.chartCard('Ventas por mes', 'Últimos 6 meses (USD)', UI.barChart(monthly.map(m => ({ label: m.label, value: Math.round(m.revenue) })), { valueFmt: v => '$' + v, colorByIndex: false }));
    const chartIE = UI.chartCard('Ingresos vs Egresos', 'USD por mes', UI.groupedBarChart(monthly.map(m => m.label), [
      { name: 'Ingresos', color: UI.PALETTE[2], data: monthly.map(m => Math.round(m.revenue)) },
      { name: 'Egresos', color: UI.PALETTE[5], data: monthly.map(m => Math.round(m.expenses)) },
    ], { valueFmt: v => '$' + v }));

    const byCat = groupBy(S.db.sales, saleToCategory, s => saleProfit(s));
    const chartCat = UI.chartCard('Ganancia por categoría', 'USD acumulado', UI.barChart(byCat, { valueFmt: v => '$' + Math.round(v), colorByIndex: true }));

    const bySupplier = supRanks.filter(x => x.sold > 0).map(x => ({ label: x.sup.name, value: Math.round(x.profit) }));
    const chartSup = UI.chartCard('Ganancia por proveedor', 'USD', UI.barChart(bySupplier, { valueFmt: v => '$' + v, colorByIndex: true }));

    const byChannel = groupBy(S.db.sales, s => s.channel, s => F.saleAnalysis(s).revenueUSD);
    const chartChan = UI.chartCard('Ventas por canal', 'USD', UI.donutChart(byChannel.map((d, i) => ({ label: d.label, value: Math.round(d.value), color: UI.PALETTE[i % UI.PALETTE.length] })), { valueFmt: v => '$' + v }));

    const rateHist = S.db.rateHistory.slice(-8);
    const chartRates = UI.chartCard('Evolución de tasas', 'Bs por USD', UI.lineChart(rateHist.map(r => fmt.date(r.date).slice(0, 6)), [
      { name: 'BCV', color: UI.PALETTE[4], data: rateHist.map(r => r.bcv) },
      { name: 'USDT', color: UI.PALETTE[0], data: rateHist.map(r => r.usdt) },
    ], { valueFmt: v => v + ' Bs' }));

    const invRecovered = UI.chartCard('Invertido vs Recuperado', 'USD', UI.groupedBarChart(['Total'], [
      { name: 'Invertido', color: UI.PALETTE[3], data: [Math.round(s.invested)] },
      { name: 'Recuperado (ventas)', color: UI.PALETTE[2], data: [Math.round(F.summary(F.rangeFromKey('all'), {}).revenue)] },
    ], { valueFmt: v => '$' + v }));

    // --- Rankings ---
    const topSold = ranks.bySold.slice(0, 5).filter(r => r.sold > 0);
    const topMargin = ranks.byMargin.filter(r => r.price > 0).slice(0, 5);
    const lowMargin = ranks.byMargin.filter(r => r.price > 0).slice(-5).reverse();

    const rankTable = (rows, valGet, valLabel) => UI.table(
      [{ label: 'Producto', get: r => `${r.p.photo || '📦'} ${esc(UI.trim(r.p.name, 22))}` }, { label: valLabel, num: true, get: valGet }],
      rows
    );

    const rankings = `<div class="section-title">Rankings</div>
    <div class="three-col">
      <div class="card card-pad"><h4 style="margin:0 0 10px">🔥 Más vendidos</h4>${rankTable(topSold, r => fmt.num(r.sold) + ' u.', 'Vendidas')}</div>
      <div class="card card-pad"><h4 style="margin:0 0 10px">💎 Mayor margen</h4>${rankTable(topMargin, r => fmt.pct(r.margin), 'Margen')}</div>
      <div class="card card-pad"><h4 style="margin:0 0 10px">📉 Menor margen</h4>${rankTable(lowMargin, r => fmt.pct(r.margin), 'Margen')}</div>
    </div>
    ${bestSupplier ? `<div class="alert g" style="margin-top:14px"><span class="ai">🏆</span><div><b>Proveedor más rentable:</b> ${esc(bestSupplier.sup.name)} — ${fmt.usd(bestSupplier.profit)} de ganancia generada, margen promedio ${fmt.pct(bestSupplier.avgMargin)}.</div></div>` : ''}`;

    c.innerHTML = head('Panel principal', 'Todo tu negocio de un vistazo · Tasa BCV ' + fmt.num(rates.bcv) + ' · USDT ' + fmt.num(rates.usdt) + ' (brecha ' + fmt.pct(eq.gapPct) + ')',
      `<button class="btn btn-ghost btn-sm" data-goto="reportes">📄 Reportes</button>`)
      + filterBar + primary + alerts + secondary + inv
      + `<div class="section-title">Gráficos</div>
         <div class="two-col">${chartSales}${chartIE}</div>
         <div class="two-col" style="margin-top:16px">${chartCat}${chartSup}</div>
         <div class="two-col" style="margin-top:16px">${chartChan}${chartRates}</div>
         <div class="two-col" style="margin-top:16px">${invRecovered}${marginTrendChart(monthly)}</div>`
      + rankings;

    // eventos filtros
    UI.els('[data-range]', c).forEach(b => b.onclick = () => { dashState.range = b.dataset.range; Views.dashboard(c); });
    UI.els('[data-f]', c).forEach(sel => sel.onchange = () => { dashState[sel.dataset.f] = sel.value; Views.dashboard(c); });
    UI.els('[data-goto]', c).forEach(b => b.onclick = () => global.App.go(b.dataset.goto));
  };

  function marginTrendChart(monthly) {
    return UI.chartCard('Margen de ganancia mensual', '%', UI.lineChart(monthly.map(m => m.label),
      [{ name: 'Margen', color: UI.PALETTE[1], data: monthly.map(m => m.revenue ? Math.round((m.profit / m.revenue) * 100) : 0) }],
      { valueFmt: v => v + '%' }));
  }

  function buildDashAlerts(s, ranks) {
    const items = [];
    if (s.outStock.length) items.push({ t: 'd', m: `${s.outStock.length} producto(s) agotado(s): ${s.outStock.slice(0, 3).map(p => p.name).join(', ')}${s.outStock.length > 3 ? '…' : ''}` });
    if (s.lowStock.length) items.push({ t: 'w', m: `${s.lowStock.length} producto(s) con poco inventario (≤${S.db.config.lowStockThreshold} u.)` });
    const belowTarget = ranks.rows.filter(r => r.price > 0 && r.margin < S.db.config.profitTargetLow);
    if (belowTarget.length) items.push({ t: 'w', m: `${belowTarget.length} producto(s) con margen por debajo del ${S.db.config.profitTargetLow}%` });
    const underRepo = ranks.rows.filter(r => r.price > 0 && r.price < r.repoCost);
    if (underRepo.length) items.push({ t: 'd', m: `${underRepo.length} producto(s) con precio por debajo del costo de reposición` });
    if (s.erosion > 1) items.push({ t: 'w', m: `La brecha BCV-USDT te ha restado ${fmt.usd(s.erosion)} de ganancia. Revisa precios de ventas cobradas a tasa BCV.` });
    if (!items.length) items.push({ t: 'g', m: 'Todo en orden: sin alertas críticas de inventario ni precios.' });
    return `<div class="section-title">Alertas</div>` + items.map(a => `<div class="alert ${a.t}"><span class="ai">${a.t === 'd' ? '⛔' : a.t === 'w' ? '⚠️' : '✅'}</span><div>${esc(a.m)}</div></div>`).join('');
  }

  // ---- helpers de agregación ----
  function monthlySeries() {
    const map = {};
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = d.getFullYear() + '-' + (d.getMonth() + 1);
      const label = d.toLocaleDateString('es-VE', { month: 'short' });
      map[key] = { label, revenue: 0, expenses: 0, profit: 0 };
      months.push(key);
    }
    S.db.sales.forEach(s => {
      const d = new Date(s.datetime); const key = d.getFullYear() + '-' + (d.getMonth() + 1);
      if (map[key]) { const a = F.saleAnalysis(s); map[key].revenue += a.revenueUSD; map[key].profit += a.accountingProfit; }
    });
    S.db.movements.forEach(m => {
      if (m.type !== 'expense') return;
      const d = new Date(m.date); const key = d.getFullYear() + '-' + (d.getMonth() + 1);
      if (map[key]) map[key].expenses += F.movementUSD(m);
    });
    return months.map(k => map[k]);
  }
  function groupBy(items, keyFn, valFn) {
    const map = {};
    items.forEach(it => { const k = keyFn(it) || '—'; map[k] = (map[k] || 0) + (valFn(it) || 0); });
    return Object.keys(map).map(k => ({ label: k, value: map[k] })).sort((a, b) => b.value - a.value);
  }
  function saleToCategory(s) { const it = (s.items || [])[0]; if (!it) return '—'; const p = S.find('products', it.productId); return p ? p.category : '—'; }
  function saleProfit(s) { return F.saleAnalysis(s).accountingProfit; }

  // =========================================================
  //  PRODUCTOS
  // =========================================================
  Views.productos = function (c) {
    const ranks = F.productRankings();
    let list = ranks.rows;
    const cols = [
      { label: '', get: r => `<div class="thumb">${r.p.photo || '📦'}</div>` },
      { label: 'Producto', get: r => `<b>${esc(r.p.name)}</b><br><span class="small muted">${esc(r.p.sku)} · ${esc(r.p.category)}</span>` },
      { label: 'Público', get: r => UI.pill(r.p.audience, 'a') },
      { label: 'Disp.', num: true, get: r => fmt.num(r.p.qtyAvailable) },
      { label: 'Vend.', num: true, get: r => fmt.num(r.p.qtySold) },
      { label: 'Costo real', num: true, get: r => fmt.usd(r.realUnitCost) },
      { label: 'Precio', num: true, get: r => fmt.usd(r.price) },
      { label: 'Margen', num: true, get: r => `<span class="${r.margin < S.db.config.profitTargetLow ? 'neg' : 'pos'}">${fmt.pct(r.margin)}</span>` },
      { label: 'Estado', get: r => UI.statePill(productState(r.p)) },
    ];
    c.innerHTML = head('Productos', `${list.length} productos en catálogo`,
      `<button class="btn btn-primary" data-new>＋ Nuevo producto</button>`)
      + `<div class="filters">
          <input type="search" data-search placeholder="Buscar por nombre o SKU…" style="min-width:220px">
          <select data-fcat><option value="">Todas las categorías</option>${optionList(S.CATEGORIES)}</select>
          <select data-fstate><option value="">Todos los estados</option>${optionList(S.PRODUCT_STATES)}</select>
        </div>`
      + `<div id="prod-table">${UI.table(cols, list, { rowAttr: r => `class="row-click" data-id="${r.p.id}"` })}</div>`;

    const render = () => {
      const q = (UI.el('[data-search]', c).value || '').toLowerCase();
      const fc = UI.el('[data-fcat]', c).value, fs = UI.el('[data-fstate]', c).value;
      let rows = ranks.rows.filter(r =>
        (!q || (r.p.name + r.p.sku).toLowerCase().includes(q)) &&
        (!fc || r.p.category === fc) &&
        (!fs || productState(r.p) === fs));
      UI.el('#prod-table', c).innerHTML = UI.table(cols, rows, { rowAttr: r => `class="row-click" data-id="${r.p.id}"` });
      bindRows();
    };
    const bindRows = () => UI.els('[data-id]', UI.el('#prod-table', c)).forEach(tr => tr.onclick = () => productDetail(tr.dataset.id));
    UI.el('[data-search]', c).oninput = render;
    UI.el('[data-fcat]', c).onchange = render;
    UI.el('[data-fstate]', c).onchange = render;
    UI.el('[data-new]', c).onclick = () => productForm();
    bindRows();
  };

  function productState(p) {
    if (p.status === 'descontinuado') return 'descontinuado';
    if (p.qtyAvailable <= 0) return 'agotado';
    if (p.qtyAvailable <= S.db.config.lowStockThreshold) return 'poco inventario';
    return 'disponible';
  }

  function productForm(id) {
    const p = id ? S.find('products', id) : {};
    const isEdit = !!id;
    const supOpts = S.db.suppliers.map(x => `<option value="${x.id}" ${p.supplierId === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    const body = `
      <div class="steps"><div class="step active">1 · Identificación</div><div class="step">2 · Costos</div><div class="step">3 · Precio</div></div>
      <div class="form-grid">
        <label class="field full"><span>Nombre del producto *</span><input data-k="name" value="${esc(p.name || '')}"></label>
        <label class="field"><span>Código / SKU</span><input data-k="sku" value="${esc(p.sku || '')}"></label>
        <label class="field"><span>Emoji / Foto</span><input data-k="photo" value="${esc(p.photo || '')}" placeholder="👚 o URL de imagen"></label>
        <label class="field full"><span>Descripción</span><input data-k="description" value="${esc(p.description || '')}"></label>
        <label class="field"><span>Categoría</span><select data-k="category">${optionList(S.CATEGORIES, p.category)}</select></label>
        <label class="field"><span>Subcategoría</span><input data-k="subcategory" value="${esc(p.subcategory || '')}"></label>
        <label class="field"><span>Público</span><select data-k="audience">${optionList(S.AUDIENCES, p.audience)}</select></label>
        <label class="field"><span>Talla</span><input data-k="size" value="${esc(p.size || '')}"></label>
        <label class="field"><span>Color</span><input data-k="color" value="${esc(p.color || '')}"></label>
        <label class="field"><span>Estampado / modelo</span><input data-k="print" value="${esc(p.print || '')}"></label>
        <label class="field"><span>Material</span><input data-k="material" value="${esc(p.material || '')}"></label>
        <label class="field"><span>Proveedor</span><select data-k="supplierId"><option value="">—</option>${supOpts}</select></label>
        <label class="field"><span>Plataforma</span><select data-k="platform">${optionList(S.PLATFORMS, p.platform)}</select></label>
        <label class="field full"><span>Enlace original</span><input data-k="sourceLink" value="${esc(p.sourceLink || '')}" placeholder="https://…"></label>
        <label class="field"><span>Fecha de compra</span><input type="date" data-k="purchaseDate" value="${(p.purchaseDate || S.now()).slice(0, 10)}"></label>
      </div>
      <div class="section-title">Costos (USD) — incluye TODO lo asociado</div>
      <div class="form-grid three">
        <label class="field"><span>Cantidad comprada</span><input type="number" data-k="qtyBought" value="${p.qtyBought || 0}" data-calc></label>
        <label class="field"><span>Cantidad vendida</span><input type="number" data-k="qtySold" value="${p.qtySold || 0}" data-calc></label>
        <label class="field"><span>Costo unitario compra</span><input type="number" step="0.01" data-k="purchaseUnitCost" value="${p.purchaseUnitCost || 0}" data-calc></label>
        <label class="field"><span>Envío internacional</span><input type="number" step="0.01" data-k="intlShipping" value="${p.intlShipping || 0}" data-calc></label>
        <label class="field"><span>Envío nacional</span><input type="number" step="0.01" data-k="nationalShipping" value="${p.nationalShipping || 0}" data-calc></label>
        <label class="field"><span>Comisión de compra</span><input type="number" step="0.01" data-k="buyCommission" value="${p.buyCommission || 0}" data-calc></label>
        <label class="field"><span>Empaque</span><input type="number" step="0.01" data-k="packaging" value="${p.packaging || 0}" data-calc></label>
        <label class="field"><span>Otros costos</span><input type="number" step="0.01" data-k="otherCosts" value="${p.otherCosts || 0}" data-calc></label>
      </div>
      <div class="calc-box" data-costbox></div>
      <div class="section-title">Precio de venta</div>
      <div class="form-grid">
        <label class="field"><span>Precio de venta actual (USD)</span><input type="number" step="0.01" data-k="currentPrice" value="${p.currentPrice || 0}" data-calc></label>
        <label class="field"><span>Estado</span><select data-k="status">${optionList(S.PRODUCT_STATES, p.status || 'disponible')}</select></label>
      </div>
      <div class="calc-box" data-pricebox></div>
    `;
    const m = UI.modal({
      title: isEdit ? 'Editar producto' : 'Nuevo producto', size: 'lg', body,
      footer: `<button class="btn btn-ghost" data-cancel>Cancelar</button><button class="btn btn-primary" data-save>${isEdit ? 'Guardar' : 'Crear producto'}</button>`
    });
    const val = k => m.el(`[data-k="${k}"]`).value;
    const num = k => +val(k) || 0;
    const recalc = () => {
      const cost = num('purchaseUnitCost') + num('intlShipping') + num('nationalShipping') + num('buyCommission') + num('packaging') + num('otherCosts');
      const price = num('currentPrice');
      m.el('[data-costbox]').innerHTML = `
        <div class="calc-row"><span>Costo real unitario (todo incluido)</span><b>${fmt.usd(cost)}</b></div>
        <div class="calc-row"><span>Inversión total (${num('qtyBought')} u.)</span><b>${fmt.usd(cost * num('qtyBought'))}</b></div>`;
      const target = S.db.config.profitTargetLow, target2 = S.db.config.profitTargetHigh;
      const margin = F.marginOf(price, cost);
      m.el('[data-pricebox]').innerHTML = `
        <div class="calc-row"><span>Precio con 30% de recargo</span><b>${fmt.usd(F.priceByMarkup(cost, 30))}</b></div>
        <div class="calc-row"><span>Precio con 35% de recargo</span><b>${fmt.usd(F.priceByMarkup(cost, 35))}</b></div>
        <div class="calc-row"><span>Precio para 30% de margen real</span><b>${fmt.usd(F.priceByMargin(cost, 30))}</b></div>
        <div class="calc-row"><span>Precio para 35% de margen real</span><b>${fmt.usd(F.priceByMargin(cost, 35))}</b></div>
        <div class="calc-row" style="border-top:1px solid var(--border-2);margin-top:6px;padding-top:8px"><span>Margen actual</span><b class="${margin < target ? 'neg' : 'pos'}">${fmt.pct(margin)} ${margin < target ? '⚠️ bajo' : '✓'}</b></div>
        <div class="calc-row"><span>Ganancia por unidad</span><b>${fmt.usd(price - cost)} · ${fmt.bs((price - cost) * S.db.rates.usdt)}</b></div>`;
    };
    m.els('[data-calc]').forEach(i => i.oninput = recalc);
    recalc();
    m.el('[data-cancel]').onclick = m.close;
    m.el('[data-save]').onclick = () => {
      if (!val('name').trim()) return UI.toast('El nombre es obligatorio', 'w');
      const data = {};
      ['name', 'sku', 'photo', 'description', 'category', 'subcategory', 'audience', 'size', 'color', 'print', 'material', 'supplierId', 'platform', 'sourceLink', 'purchaseDate', 'status'].forEach(k => data[k] = val(k));
      ['qtyBought', 'qtySold', 'purchaseUnitCost', 'intlShipping', 'nationalShipping', 'buyCommission', 'packaging', 'otherCosts', 'currentPrice'].forEach(k => data[k] = num(k));
      data.qtyAvailable = data.qtyBought - data.qtySold;
      data.rateBCV = S.db.rates.bcv; data.rateUSDT = S.db.rates.usdt;
      if (isEdit) { S.update('products', id, data); UI.toast('Producto actualizado', 'g'); }
      else { S.add('products', data); UI.toast('Producto creado', 'g'); }
      m.close(); global.App.refresh();
    };
  }

  function productDetail(id) {
    const p = S.find('products', id);
    if (!p) return;
    const a = F.productAnalysis(p);
    const alerts = F.priceAlerts(p);
    const canEdit = S.isAdmin();
    const dl = (k, v) => `<div class="dt">${k}</div><div class="dd">${v}</div>`;
    const body = `
      <div class="row" style="margin-bottom:14px">
        <div class="thumb" style="width:64px;height:64px;font-size:30px">${p.photo && p.photo.startsWith('http') ? `<img src="${esc(p.photo)}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">` : (p.photo || '📦')}</div>
        <div><h3 style="margin:0">${esc(p.name)}</h3><div class="muted small">${esc(p.sku)} · ${esc(p.category)} · ${esc(p.audience)}</div>${UI.statePill(productState(p))}</div>
      </div>
      ${alerts.map(al => `<div class="alert ${al.t}"><span class="ai">${al.t === 'd' ? '⛔' : '⚠️'}</span><div>${esc(al.msg)}</div></div>`).join('')}
      <div class="dl">
        ${dl('Proveedor', esc(supplierName(p.supplierId)))}
        ${dl('Plataforma', esc(p.platform || '—'))}
        ${dl('Material', esc(p.material || '—'))}
        ${dl('Color / Estampado', esc((p.color || '—') + ' · ' + (p.print || '—')))}
        ${dl('Comprado / Disponible / Vendido', `${p.qtyBought} / ${p.qtyAvailable} / ${p.qtySold}`)}
        ${dl('Fecha de compra', fmt.date(p.purchaseDate))}
        ${dl('Tasa usada (costo)', `BCV ${fmt.num(p.rateBCV)} · USDT ${fmt.num(p.rateUSDT)}`)}
      </div>
      <div class="section-title">Costo y rentabilidad</div>
      <div class="calc-box">
        <div class="calc-row"><span>Costo real unitario (todo incluido)</span><b>${fmt.usd(a.realUnitCost)}</b></div>
        <div class="calc-row"><span>Precio de venta actual</span><b>${fmt.usd(a.price)}</b></div>
        <div class="calc-row"><span>Ganancia por unidad</span><b>${fmt.usd(a.profitUnit)} · ${fmt.bs(a.profitBs_USDT)}</b></div>
        <div class="calc-row"><span>Margen / Recargo</span><b>${fmt.pct(a.margin)} / ${fmt.pct(a.markup)}</b></div>
        <div class="calc-row"><span>Ganancia total generada</span><b>${fmt.usd(a.profitUnit * p.qtySold)}</b></div>
      </div>
      <div class="section-title">Precios sugeridos</div>
      <div class="calc-box">
        <div class="calc-row"><span>30% recargo / 35% recargo</span><b>${fmt.usd(a.price30markup)} / ${fmt.usd(a.price35markup)}</b></div>
        <div class="calc-row"><span>30% margen / 35% margen</span><b>${fmt.usd(a.price30margin)} / ${fmt.usd(a.price35margin)}</b></div>
        <div class="calc-row"><span>Recomendado (cubre reposición)</span><b>${fmt.usd(a.recommended)}</b></div>
      </div>`;
    const m = UI.modal({
      title: 'Ficha del producto', size: 'lg', body,
      footer: `${canEdit ? `<button class="btn btn-danger" data-del>Eliminar</button>` : ''}<button class="btn btn-ghost" data-close>Cerrar</button>${canEdit ? `<button class="btn btn-primary" data-edit>Editar</button>` : ''}`
    });
    m.el('[data-close]').onclick = m.close;
    if (canEdit) {
      m.el('[data-edit]').onclick = () => { m.close(); productForm(id); };
      m.el('[data-del]').onclick = () => UI.confirm('¿Eliminar este producto?', () => { S.remove('products', id); m.close(); UI.toast('Producto eliminado', 'g'); global.App.refresh(); }, { danger: true, yes: 'Eliminar' });
    }
  }

  // =========================================================
  //  COMPRAS POR LOTES / PACAS
  // =========================================================
  Views.pacas = function (c) {
    const rows = S.db.batches.map(b => ({ b, a: F.batchAnalysis(b) }));
    const cols = [
      { label: 'Lote', get: r => `<b>${esc(r.b.name)}</b><br><span class="small muted">${fmt.date(r.b.date)} · ${esc(supplierName(r.b.supplierId))}</span>` },
      { label: 'Inversión', num: true, get: r => fmt.usd(r.a.totalInvest) },
      { label: 'Unidades', num: true, get: r => `${r.a.bought} <span class="muted small">(-${r.a.damaged + r.a.gifts})</span>` },
      { label: 'Vendibles', num: true, get: r => fmt.num(r.a.sellable) },
      { label: 'Costo/unidad naive', num: true, get: r => fmt.usd(r.a.naiveUnit) },
      { label: 'Costo/unidad real', num: true, get: r => `<b>${fmt.usd(r.a.realUnit)}</b>` },
    ];
    c.innerHTML = head('Compras por lotes (pacas)', 'Divide el costo total entre las unidades realmente vendibles',
      `<button class="btn btn-primary" data-new>＋ Registrar lote</button>`)
      + `<div class="alert i"><span class="ai">💡</span><div>El costo de las unidades dañadas, incompletas o usadas para regalos/contenido se reparte entre las que sí puedes vender, para obtener el costo real por unidad.</div></div>`
      + UI.table(cols, rows, { rowAttr: r => `class="row-click" data-id="${r.b.id}"` });
    UI.els('[data-id]', c).forEach(tr => tr.onclick = () => batchForm(tr.dataset.id));
    UI.el('[data-new]', c).onclick = () => batchForm();
  };

  function batchForm(id) {
    const b = id ? S.find('batches', id) : { additionalCosts: [{ label: 'Envío internacional', amount: 0 }] };
    const isEdit = !!id;
    const supOpts = S.db.suppliers.map(x => `<option value="${x.id}" ${b.supplierId === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    const addRows = (b.additionalCosts || []).map((ac, i) => addCostRow(ac, i)).join('');
    const body = `
      <div class="form-grid">
        <label class="field full"><span>Nombre del lote / paca *</span><input data-k="name" value="${esc(b.name || '')}" placeholder="Paca de pijamas"></label>
        <label class="field"><span>Proveedor</span><select data-k="supplierId"><option value="">—</option>${supOpts}</select></label>
        <label class="field"><span>Fecha</span><input type="date" data-k="date" value="${(b.date || S.now()).slice(0, 10)}"></label>
        <label class="field"><span>Costo total del lote (USD) *</span><input type="number" step="0.01" data-k="totalCost" value="${b.totalCost || 0}" data-calc></label>
        <label class="field"><span>Unidades recibidas *</span><input type="number" data-k="unitsBought" value="${b.unitsBought || 0}" data-calc></label>
        <label class="field"><span>Unidades dañadas / no vendibles</span><input type="number" data-k="damagedUnits" value="${b.damagedUnits || 0}" data-calc></label>
        <label class="field"><span>Unidades para regalo / contenido</span><input type="number" data-k="giftUnits" value="${b.giftUnits || 0}" data-calc></label>
      </div>
      <div class="section-title">Gastos adicionales <button class="btn btn-sm btn-soft" data-addcost>＋ Agregar</button></div>
      <div data-costs>${addRows}</div>
      <div class="calc-box" data-result></div>
      <label class="field"><span>Notas</span><textarea data-k="notes">${esc(b.notes || '')}</textarea></label>`;
    const m = UI.modal({
      title: isEdit ? 'Editar lote' : 'Registrar lote / paca', size: 'lg', body,
      footer: `<button class="btn btn-ghost" data-cancel>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>`
    });
    const num = k => +m.el(`[data-k="${k}"]`).value || 0;
    const collectCosts = () => m.els('[data-cost-row]').map(r => ({ label: r.querySelector('[data-cl]').value, amount: +r.querySelector('[data-ca]').value || 0 }));
    const recalc = () => {
      const tmp = { totalCost: num('totalCost'), unitsBought: num('unitsBought'), damagedUnits: num('damagedUnits'), giftUnits: num('giftUnits'), additionalCosts: collectCosts() };
      const a = F.batchAnalysis(tmp);
      m.el('[data-result]').innerHTML = `
        <div class="calc-row"><span>Inversión total (con gastos)</span><b>${fmt.usd(a.totalInvest)}</b></div>
        <div class="calc-row"><span>Unidades vendibles</span><b>${a.sellable} de ${a.bought}</b></div>
        <div class="calc-row"><span>Costo si repartes entre todas</span><b>${fmt.usd(a.naiveUnit)}</b></div>
        <div class="calc-row" style="border-top:1px solid var(--border-2);margin-top:6px;padding-top:8px"><span>✅ Costo real por unidad vendible</span><b>${fmt.usd(a.realUnit)}</b></div>`;
    };
    const bindCostRows = () => { m.els('[data-cost-row] input').forEach(i => i.oninput = recalc); m.els('[data-cost-row] [data-rm]').forEach(x => x.onclick = () => { x.closest('[data-cost-row]').remove(); recalc(); }); };
    m.el('[data-addcost]').onclick = () => { m.el('[data-costs]').insertAdjacentHTML('beforeend', addCostRow({ label: '', amount: 0 }, Date.now())); bindCostRows(); };
    m.els('[data-calc]').forEach(i => i.oninput = recalc);
    bindCostRows(); recalc();
    m.el('[data-cancel]').onclick = m.close;
    m.el('[data-save]').onclick = () => {
      const name = m.el('[data-k="name"]').value.trim();
      if (!name) return UI.toast('El nombre es obligatorio', 'w');
      const data = { name, supplierId: m.el('[data-k="supplierId"]').value, date: m.el('[data-k="date"]').value, totalCost: num('totalCost'), unitsBought: num('unitsBought'), damagedUnits: num('damagedUnits'), giftUnits: num('giftUnits'), additionalCosts: collectCosts(), notes: m.el('[data-k="notes"]').value, rateBCV: S.db.rates.bcv, rateUSDT: S.db.rates.usdt };
      if (isEdit) { S.update('batches', id, data); UI.toast('Lote actualizado', 'g'); }
      else { S.add('batches', data); UI.toast('Lote registrado', 'g'); }
      m.close(); global.App.refresh();
    };
  }
  function addCostRow(ac, i) {
    return `<div class="row" data-cost-row style="margin-bottom:8px">
      <input data-cl placeholder="Concepto" value="${esc(ac.label || '')}" style="flex:2;border:1px solid var(--border-2);border-radius:10px;padding:8px 10px">
      <input data-ca type="number" step="0.01" placeholder="USD" value="${ac.amount || 0}" style="flex:1;border:1px solid var(--border-2);border-radius:10px;padding:8px 10px">
      <button class="btn btn-sm btn-danger" data-rm>✕</button></div>`;
  }

  // =========================================================
  //  PROVEEDORES
  // =========================================================
  Views.proveedores = function (c) {
    const ranks = F.supplierRankings();
    const cols = [
      { label: 'Proveedor', get: r => `<b>${esc(r.sup.name)}</b><br><span class="small muted">${esc(r.sup.country || '')} · ${esc(r.sup.platform || '')}</span>` },
      { label: 'Compras', num: true, get: r => fmt.num(r.productCount) },
      { label: 'Invertido', num: true, get: r => fmt.usd(r.invested) },
      { label: 'Ganancia', num: true, get: r => `<span class="pos">${fmt.usd(r.profit)}</span>` },
      { label: 'Margen prom.', num: true, get: r => fmt.pct(r.avgMargin) },
      { label: 'Envío prom.', num: true, get: r => fmt.usd(r.avgShipping) },
      { label: 'Entrega', num: true, get: r => r.deliveryDays + ' días' },
      { label: 'Calidad', get: r => `<span title="${r.quality}/5">${UI.quality(r.quality)}</span>` },
    ];
    // "más conveniente": mejor margen con buena calidad y pocos defectos
    const best = ranks.slice().sort((a, b) => (b.profit) - (a.profit))[0];
    const cheapest = ranks.slice().sort((a, b) => a.avgShipping - b.avgShipping)[0];
    const fastest = ranks.slice().sort((a, b) => a.deliveryDays - b.deliveryDays)[0];
    const bestQuality = ranks.slice().sort((a, b) => b.quality - a.quality)[0];
    const bestMargin = ranks.slice().sort((a, b) => b.avgMargin - a.avgMargin)[0];

    c.innerHTML = head('Proveedores', `${ranks.length} proveedores registrados`,
      `<button class="btn btn-primary" data-new>＋ Nuevo proveedor</button>`)
      + `<div class="cards" style="margin-bottom:8px">
          ${UI.metric({ label: 'Más rentable', value: best ? esc(best.sup.name) : '—', sub: best ? fmt.usd(best.profit) : '', cls: 'good', badge: '🏆' })}
          ${UI.metric({ label: 'Mejor margen', value: bestMargin ? esc(bestMargin.sup.name) : '—', sub: bestMargin ? fmt.pct(bestMargin.avgMargin) : '', cls: 'accent', badge: '💎' })}
          ${UI.metric({ label: 'Envío más barato', value: cheapest ? esc(cheapest.sup.name) : '—', sub: cheapest ? fmt.usd(cheapest.avgShipping) : '', badge: '💸' })}
          ${UI.metric({ label: 'Entrega más rápida', value: fastest ? esc(fastest.sup.name) : '—', sub: fastest ? fastest.deliveryDays + ' días' : '', badge: '⚡' })}
          ${UI.metric({ label: 'Mejor calidad', value: bestQuality ? esc(bestQuality.sup.name) : '—', sub: bestQuality ? UI.quality(bestQuality.quality) : '', badge: '⭐' })}
        </div>`
      + UI.table(cols, ranks, { rowAttr: r => `class="row-click" data-id="${r.sup.id}"` });
    UI.els('[data-id]', c).forEach(tr => tr.onclick = () => supplierForm(tr.dataset.id));
    UI.el('[data-new]', c).onclick = () => supplierForm();
  };

  function supplierForm(id) {
    const s = id ? S.find('suppliers', id) : {};
    const isEdit = !!id;
    const body = `<div class="form-grid">
      <label class="field full"><span>Nombre *</span><input data-k="name" value="${esc(s.name || '')}"></label>
      <label class="field"><span>País</span><input data-k="country" value="${esc(s.country || '')}"></label>
      <label class="field"><span>Plataforma</span><select data-k="platform">${optionList(S.PLATFORMS, s.platform)}</select></label>
      <label class="field"><span>Contacto</span><input data-k="contact" value="${esc(s.contact || '')}"></label>
      <label class="field"><span>Enlace de la tienda</span><input data-k="storeLink" value="${esc(s.storeLink || '')}"></label>
      <label class="field"><span>Días promedio de entrega</span><input type="number" data-k="avgDeliveryDays" value="${s.avgDeliveryDays || 0}"></label>
      <label class="field"><span>Costo promedio de envío (USD)</span><input type="number" step="0.01" data-k="avgShippingUsd" value="${s.avgShippingUsd || 0}"></label>
      <label class="field"><span>Calidad percibida (1-5)</span><input type="number" min="1" max="5" data-k="quality" value="${s.quality || 3}"></label>
      <label class="field"><span>Productos defectuosos recibidos</span><input type="number" data-k="defective" value="${s.defective || 0}"></label>
      <label class="field full"><span>Notas internas</span><textarea data-k="notes">${esc(s.notes || '')}</textarea></label>
    </div>`;
    const m = UI.modal({ title: isEdit ? 'Editar proveedor' : 'Nuevo proveedor', body, footer: `${isEdit && S.isAdmin() ? '<button class="btn btn-danger" data-del>Eliminar</button>' : ''}<button class="btn btn-ghost" data-cancel>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>` });
    m.el('[data-cancel]').onclick = m.close;
    if (isEdit && S.isAdmin()) m.el('[data-del]').onclick = () => UI.confirm('¿Eliminar proveedor?', () => { S.remove('suppliers', id); m.close(); global.App.refresh(); }, { danger: true, yes: 'Eliminar' });
    m.el('[data-save]').onclick = () => {
      const v = k => m.el(`[data-k="${k}"]`).value;
      if (!v('name').trim()) return UI.toast('El nombre es obligatorio', 'w');
      const data = { name: v('name'), country: v('country'), platform: v('platform'), contact: v('contact'), storeLink: v('storeLink'), avgDeliveryDays: +v('avgDeliveryDays') || 0, avgShippingUsd: +v('avgShippingUsd') || 0, quality: +v('quality') || 3, defective: +v('defective') || 0, notes: v('notes') };
      if (isEdit) S.update('suppliers', id, data); else S.add('suppliers', data);
      UI.toast('Proveedor guardado', 'g'); m.close(); global.App.refresh();
    };
  }

  // =========================================================
  //  VENTAS
  // =========================================================
  Views.ventas = function (c) {
    const sales = S.db.sales.slice().sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    const cols = [
      { label: 'Pedido', get: s => `<b>${esc(s.orderNumber)}</b><br><span class="small muted">${fmt.datetime(s.datetime)}</span>` },
      { label: 'Cliente', get: s => esc(s.customer || '—') },
      { label: 'Productos', get: s => (s.items || []).map(it => { const p = S.find('products', it.productId); return `${it.qty}× ${esc(p ? UI.trim(p.name, 16) : '?')}`; }).join('<br>') },
      { label: 'Canal', get: s => UI.pill(s.channel, 'b') },
      { label: 'Pago', get: s => `<span class="small">${esc(s.paymentMethod)}</span>` },
      { label: 'Total', num: true, get: s => fmt.usd(F.saleAnalysis(s).revenueUSD) },
      { label: 'Ganancia', num: true, get: s => { const a = F.saleAnalysis(s); return `<span class="${a.sustainableProfit < 0 ? 'neg' : 'pos'}">${fmt.usd(a.sustainableProfit)}</span>`; } },
      { label: 'Estado', get: s => UI.pill(s.status, s.status === 'entregado' ? 'g' : 'w') },
    ];
    c.innerHTML = head('Ventas', `${sales.length} ventas registradas`,
      `<button class="btn btn-ghost" data-export>⬇️ CSV</button><button class="btn btn-primary" data-new>＋ Nueva venta</button>`)
      + `<div class="filters"><select data-fchan><option value="">Todos los canales</option>${optionList(S.CHANNELS)}</select>
         <select data-fmethod><option value="">Todos los métodos</option>${optionList(S.PAY_METHODS)}</select></div>`
      + `<div id="sales-table">${UI.table(cols, sales, { rowAttr: s => `class="row-click" data-id="${s.id}"` })}</div>`;
    const render = () => {
      const fc = UI.el('[data-fchan]', c).value, fm = UI.el('[data-fmethod]', c).value;
      let rows = sales.filter(s => (!fc || s.channel === fc) && (!fm || s.paymentMethod === fm));
      UI.el('#sales-table', c).innerHTML = UI.table(cols, rows, { rowAttr: s => `class="row-click" data-id="${s.id}"` });
      UI.els('[data-id]', UI.el('#sales-table', c)).forEach(tr => tr.onclick = () => saleDetail(tr.dataset.id));
    };
    UI.el('[data-fchan]', c).onchange = render;
    UI.el('[data-fmethod]', c).onchange = render;
    UI.el('[data-new]', c).onclick = () => saleForm();
    UI.el('[data-export]', c).onclick = () => {
      const cols2 = [{ label: 'Pedido', key: 'orderNumber' }, { label: 'Fecha', raw: s => fmt.datetime(s.datetime) }, { label: 'Cliente', key: 'customer' }, { label: 'Canal', key: 'channel' }, { label: 'Pago', key: 'paymentMethod' }, { label: 'Total USD', raw: s => F.saleAnalysis(s).revenueUSD.toFixed(2) }, { label: 'Ganancia USD', raw: s => F.saleAnalysis(s).sustainableProfit.toFixed(2) }];
      UI.download('ventas.csv', UI.toCSV(cols2, sales));
    };
    UI.els('[data-id]', c).forEach(tr => tr.onclick = () => saleDetail(tr.dataset.id));
  };

  function saleForm() {
    const rates = S.db.rates;
    const prodOpts = S.db.products.filter(p => p.qtyAvailable > 0).map(p => `<option value="${p.id}" data-optprice="${p.currentPrice}">${esc(p.name)} (${p.qtyAvailable} disp · ${fmt.usd(p.currentPrice)})</option>`).join('');
    const body = `
      <div class="form-grid">
        <label class="field"><span>Cliente</span><input data-k="customer" placeholder="Nombre"></label>
        <label class="field"><span>Fecha y hora</span><input type="datetime-local" data-k="datetime" value="${new Date().toISOString().slice(0, 16)}"></label>
        <label class="field"><span>Canal de venta</span><select data-k="channel">${optionList(S.CHANNELS)}</select></label>
        <label class="field"><span>Método de pago</span><select data-k="paymentMethod">${optionList(S.PAY_METHODS)}</select></label>
        <label class="field"><span>Tasa BCV</span><input type="number" data-k="rateBCV" value="${rates.bcv}" data-calc></label>
        <label class="field"><span>Tasa USDT</span><input type="number" data-k="rateUSDT" value="${rates.usdt}" data-calc></label>
        <label class="field"><span>Descuento total (USD)</span><input type="number" step="0.01" data-k="discount" value="0" data-calc></label>
        <label class="field"><span>Costo de delivery (USD)</span><input type="number" step="0.01" data-k="deliveryCost" value="0" data-calc></label>
        <label class="field"><span>¿Quién asume el delivery?</span><select data-k="deliveryPaidBy" data-calc><option>Cliente</option><option>Negocio</option></select></label>
        <label class="field"><span>Estado del pedido</span><select data-k="status"><option>pendiente</option><option>en camino</option><option selected>entregado</option></select></label>
      </div>
      <div class="section-title">Productos <button class="btn btn-sm btn-soft" data-additem>＋ Agregar</button></div>
      <div data-items></div>
      <label class="field"><span>Notas</span><textarea data-k="notes"></textarea></label>
      <div class="calc-box" data-result></div>`;
    const m = UI.modal({ title: 'Nueva venta', size: 'lg', body, footer: `<button class="btn btn-ghost" data-cancel>Cancelar</button><button class="btn btn-primary" data-save>Registrar venta</button>` });
    const itemRow = () => `<div class="row" data-item style="margin-bottom:8px">
      <select data-pid style="flex:2;border:1px solid var(--border-2);border-radius:10px;padding:8px"><option value="">— producto —</option>${prodOpts}</select>
      <input data-qty type="number" min="1" value="1" style="width:70px;border:1px solid var(--border-2);border-radius:10px;padding:8px" title="Cantidad">
      <input data-price type="number" step="0.01" value="0" style="width:90px;border:1px solid var(--border-2);border-radius:10px;padding:8px" title="Precio unitario">
      <button class="btn btn-sm btn-danger" data-rm>✕</button></div>`;
    const num = k => +m.el(`[data-k="${k}"]`).value || 0;
    const collectItems = () => m.els('[data-item]').map(r => ({ productId: r.querySelector('select[data-pid]').value, qty: +r.querySelector('input[data-qty]').value || 0, unitPrice: +r.querySelector('input[data-price]').value || 0 })).filter(i => i.productId && i.qty > 0);
    const recalc = () => {
      const sale = { items: collectItems(), discount: num('discount'), deliveryCost: num('deliveryCost'), deliveryPaidBy: m.el('[data-k="deliveryPaidBy"]').value, paymentMethod: m.el('[data-k="paymentMethod"]').value, rateBCV: num('rateBCV'), rateUSDT: num('rateUSDT') };
      const a = F.saleAnalysis(sale);
      const eq = F.equivalents(a.revenueUSD, num('rateBCV'), num('rateUSDT'));
      let warn = '';
      if (a.accountingProfit > 0 && a.sustainableProfit < 0) warn = `<div class="alert d" style="margin:8px 0 0"><span class="ai">⛔</span><div>Esta venta parece rentable, pero <b>no permite reponer</b> el producto a la tasa actual. Erosión: ${fmt.usd(a.erosion)}.</div></div>`;
      else if (num('discount') > 0 && a.accountingProfit < 0) warn = `<div class="alert d" style="margin:8px 0 0"><span class="ai">⛔</span><div>El descuento genera pérdida.</div></div>`;
      m.el('[data-result]').innerHTML = `
        <div class="calc-row"><span>Total de la venta</span><b>${fmt.usd(a.revenueUSD)}</b></div>
        <div class="calc-row"><span>Equivalente en Bs (BCV / USDT)</span><b>${fmt.bs(eq.bsBCV)} / ${fmt.bs(eq.bsUSDT)}</b></div>
        <div class="calc-row"><span>Ganancia contable</span><b>${fmt.usd(a.accountingProfit)}</b></div>
        <div class="calc-row"><span>Ganancia sostenible (permite reponer)</span><b class="${a.sustainableProfit < 0 ? 'neg' : 'pos'}">${fmt.usd(a.sustainableProfit)}</b></div>${warn}`;
    };
    const bindItems = () => { m.els('[data-item]').forEach(r => { const pid = r.querySelector('select[data-pid]'); pid.onchange = () => { const opt = pid.selectedOptions[0]; if (opt && opt.dataset.optprice) r.querySelector('input[data-price]').value = opt.dataset.optprice; recalc(); }; r.querySelectorAll('input').forEach(i => i.oninput = recalc); r.querySelector('[data-rm]').onclick = () => { r.remove(); recalc(); }; }); };
    const addItem = () => { m.el('[data-items]').insertAdjacentHTML('beforeend', itemRow()); bindItems(); };
    m.el('[data-additem]').onclick = addItem;
    m.els('[data-calc]').forEach(i => i.oninput = recalc);
    addItem(); recalc();
    m.el('[data-cancel]').onclick = m.close;
    m.el('[data-save]').onclick = () => {
      const items = collectItems();
      if (!items.length) return UI.toast('Agrega al menos un producto', 'w');
      // validar stock
      for (const it of items) { const p = S.find('products', it.productId); if (p && it.qty > p.qtyAvailable) return UI.toast(`Stock insuficiente de ${p.name}`, 'w'); }
      const v = k => m.el(`[data-k="${k}"]`).value;
      const sale = {
        orderNumber: 'V-' + (1000 + S.db.sales.length + 1),
        datetime: new Date(v('datetime')).toISOString(), customer: v('customer'), items,
        discount: num('discount'), paymentMethod: v('paymentMethod'), channel: v('channel'),
        rateBCV: num('rateBCV'), rateUSDT: num('rateUSDT'),
        deliveryCost: num('deliveryCost'), deliveryPaidBy: v('deliveryPaidBy'),
        status: v('status'), notes: v('notes'), mixed: null,
      };
      S.add('sales', sale);
      // descontar inventario
      items.forEach(it => { const p = S.find('products', it.productId); if (p) { S.update('products', p.id, { qtySold: (p.qtySold || 0) + it.qty, qtyAvailable: (p.qtyAvailable || 0) - it.qty }); S.add('inventory', { productId: p.id, type: 'salida', qty: it.qty, date: sale.datetime, note: 'Venta ' + sale.orderNumber }); } });
      UI.toast('Venta registrada · inventario actualizado', 'g'); m.close(); global.App.refresh();
    };
  }

  function saleDetail(id) {
    const s = S.find('sales', id);
    if (!s) return;
    const a = F.saleAnalysis(s);
    const eq = F.equivalents(a.revenueUSD, s.rateBCV, s.rateUSDT);
    const dl = (k, v) => `<div class="dt">${k}</div><div class="dd">${v}</div>`;
    const items = (s.items || []).map(it => { const p = S.find('products', it.productId); return `<div class="calc-row"><span>${it.qty}× ${esc(p ? p.name : '?')}</span><b>${fmt.usd(it.unitPrice * it.qty)}</b></div>`; }).join('');
    const body = `<div class="dl">
        ${dl('Pedido', esc(s.orderNumber))}${dl('Fecha', fmt.datetime(s.datetime))}
        ${dl('Cliente', esc(s.customer || '—'))}${dl('Canal', esc(s.channel))}
        ${dl('Método de pago', esc(s.paymentMethod))}${dl('Estado', esc(s.status))}
        ${dl('Tasa BCV / USDT', `${fmt.num(s.rateBCV)} / ${fmt.num(s.rateUSDT)}`)}${dl('Delivery', `${fmt.usd(s.deliveryCost)} (${s.deliveryPaidBy})`)}
      </div>
      <div class="section-title">Productos</div><div class="calc-box">${items}
        <div class="calc-row" style="border-top:1px solid var(--border-2);margin-top:6px;padding-top:8px"><span>Descuento</span><b>-${fmt.usd(s.discount)}</b></div>
        <div class="calc-row"><span>Total</span><b>${fmt.usd(a.revenueUSD)}</b></div></div>
      <div class="section-title">Equivalencias y ganancia</div><div class="calc-box">
        <div class="calc-row"><span>Total en USD</span><b>${fmt.usd(eq.usd)}</b></div>
        <div class="calc-row"><span>En Bs a tasa BCV</span><b>${fmt.bs(eq.bsBCV)}</b></div>
        <div class="calc-row"><span>En Bs a tasa USDT</span><b>${fmt.bs(eq.bsUSDT)}</b></div>
        <div class="calc-row"><span>Equivalente en euros</span><b>${fmt.eur(eq.eur)}</b></div>
        <div class="calc-row"><span>Diferencia entre tasas</span><b>${fmt.bs(eq.gapBs)} (${fmt.pct(eq.gapPct)})</b></div>
        <div class="calc-row" style="border-top:1px solid var(--border-2);margin-top:6px;padding-top:8px"><span>Ganancia contable</span><b>${fmt.usd(a.accountingProfit)}</b></div>
        <div class="calc-row"><span>Ganancia sostenible</span><b class="${a.sustainableProfit < 0 ? 'neg' : 'pos'}">${fmt.usd(a.sustainableProfit)}</b></div>
      </div>${s.notes ? `<p class="muted small">📝 ${esc(s.notes)}</p>` : ''}`;
    const m = UI.modal({ title: 'Detalle de venta', size: 'lg', body, footer: `${S.isAdmin() ? '<button class="btn btn-danger" data-del>Eliminar</button>' : ''}<button class="btn btn-ghost" data-close>Cerrar</button>` });
    m.el('[data-close]').onclick = m.close;
    if (S.isAdmin()) m.el('[data-del]').onclick = () => UI.confirm('¿Eliminar venta? El inventario NO se restaura automáticamente.', () => { S.remove('sales', id); m.close(); global.App.refresh(); }, { danger: true, yes: 'Eliminar' });
  }

  // =========================================================
  //  INGRESOS Y EGRESOS
  // =========================================================
  Views.finanzas = function (c) {
    const movs = S.db.movements.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const toUSD = m => F.movementUSD(m);
    const totalIn = movs.filter(m => m.type === 'income').reduce((s, m) => s + toUSD(m), 0);
    const totalOut = movs.filter(m => m.type === 'expense').reduce((s, m) => s + toUSD(m), 0);
    const cols = [
      { label: 'Fecha', get: m => fmt.date(m.date) },
      { label: 'Tipo', get: m => UI.pill(m.type === 'income' ? 'Ingreso' : 'Egreso', m.type === 'income' ? 'g' : 'd') },
      { label: 'Categoría', get: m => esc(m.category) },
      { label: 'Descripción', get: m => esc(m.description || '—') },
      { label: 'Monto', num: true, get: m => `${m.type === 'income' ? '+' : '-'}${fmt.usd(toUSD(m))}` },
    ];
    c.innerHTML = head('Ingresos y egresos', 'Movimientos financieros del negocio',
      `<button class="btn btn-soft" data-in>＋ Ingreso</button><button class="btn btn-primary" data-out>＋ Egreso</button>`)
      + `<div class="cards" style="margin-bottom:8px">
          ${UI.metric({ label: 'Total ingresos', value: fmt.usd(totalIn), cls: 'good', badge: '⬆️' })}
          ${UI.metric({ label: 'Total egresos', value: fmt.usd(totalOut), cls: 'bad', badge: '⬇️' })}
          ${UI.metric({ label: 'Balance', value: fmt.usd(totalIn - totalOut), cls: (totalIn - totalOut) >= 0 ? 'good' : 'bad', badge: '⚖️' })}
        </div>`
      + UI.table(cols, movs, { rowAttr: m => `class="row-click" data-id="${m.id}"` });
    UI.el('[data-in]', c).onclick = () => movForm('income');
    UI.el('[data-out]', c).onclick = () => movForm('expense');
    UI.els('[data-id]', c).forEach(tr => tr.onclick = () => { if (S.isAdmin()) movForm(null, tr.dataset.id); });
  };

  function movForm(type, id) {
    const m0 = id ? S.find('movements', id) : { type, currency: 'USD' };
    type = m0.type;
    const cats = type === 'income' ? S.db.config.incomeCats : S.db.config.expenseCats;
    const body = `<div class="form-grid">
      <label class="field"><span>Tipo</span><input value="${type === 'income' ? 'Ingreso' : 'Egreso'}" disabled></label>
      <label class="field"><span>Categoría</span><select data-k="category">${optionList(cats, m0.category)}</select></label>
      <label class="field"><span>Monto</span><input type="number" step="0.01" data-k="amount" value="${m0.amount || 0}"></label>
      <label class="field"><span>Moneda</span><select data-k="currency"><option ${m0.currency === 'USD' ? 'selected' : ''}>USD</option><option ${m0.currency === 'USDT' ? 'selected' : ''}>USDT</option><option ${m0.currency === 'EUR' ? 'selected' : ''}>EUR</option><option ${m0.currency === 'Bs' ? 'selected' : ''}>Bs</option></select></label>
      <label class="field"><span>Tasa (Bs por unidad, para Bs/€)</span><input type="number" data-k="rate" value="${m0.rate || (m0.currency === 'EUR' ? S.db.rates.eur : S.db.rates.usdt)}"></label>
      <label class="field"><span>Fecha</span><input type="date" data-k="date" value="${(m0.date || S.now()).slice(0, 10)}"></label>
      <label class="field full"><span>Descripción</span><input data-k="description" value="${esc(m0.description || '')}"></label>
    </div>`;
    const m = UI.modal({ title: (id ? 'Editar ' : 'Nuevo ') + (type === 'income' ? 'ingreso' : 'egreso'), body, footer: `${id && S.isAdmin() ? '<button class="btn btn-danger" data-del>Eliminar</button>' : ''}<button class="btn btn-ghost" data-cancel>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>` });
    const curSel = m.el('[data-k="currency"]'), rateInp = m.el('[data-k="rate"]');
    curSel.onchange = () => { if (curSel.value === 'EUR') rateInp.value = S.db.rates.eur; else if (curSel.value === 'Bs' || curSel.value === 'USDT') rateInp.value = S.db.rates.usdt; };
    m.el('[data-cancel]').onclick = m.close;
    if (id && S.isAdmin()) m.el('[data-del]').onclick = () => UI.confirm('¿Eliminar movimiento?', () => { S.remove('movements', id); m.close(); global.App.refresh(); }, { danger: true, yes: 'Eliminar' });
    m.el('[data-save]').onclick = () => {
      const v = k => m.el(`[data-k="${k}"]`).value;
      const data = { type, category: v('category'), amount: +v('amount') || 0, currency: v('currency'), rate: +v('rate') || S.db.rates.usdt, rateBCV: S.db.rates.bcv, date: v('date'), description: v('description') };
      if (id) S.update('movements', id, data); else S.add('movements', data);
      UI.toast('Movimiento guardado', 'g'); m.close(); global.App.refresh();
    };
  }

  // =========================================================
  //  PRECIOS Y RENTABILIDAD
  // =========================================================
  Views.precios = function (c) {
    const rows = F.productRankings().rows;
    const cfg = S.db.config;
    const cols = [
      { label: 'Producto', get: r => `${r.p.photo || '📦'} <b>${esc(UI.trim(r.p.name, 20))}</b>` },
      { label: 'Costo real', num: true, get: r => fmt.usd(r.realUnitCost) },
      { label: 'Precio actual', num: true, get: r => fmt.usd(r.price) },
      { label: '30% recargo', num: true, get: r => fmt.usd(r.price30markup) },
      { label: '35% recargo', num: true, get: r => fmt.usd(r.price35markup) },
      { label: '30% margen', num: true, get: r => fmt.usd(r.price30margin) },
      { label: '35% margen', num: true, get: r => fmt.usd(r.price35margin) },
      { label: 'Margen real', num: true, get: r => `<span class="${r.margin < cfg.profitTargetLow ? 'neg' : 'pos'}">${fmt.pct(r.margin)}</span>` },
      { label: 'Alerta', get: r => { const al = F.priceAlerts(r.p); return al.length ? UI.pill('⚠️ ' + al.length, 'd') : UI.pill('✓', 'g'); } },
    ];
    const flagged = rows.filter(r => F.priceAlerts(r.p).length);
    c.innerHTML = head('Precios y rentabilidad', `Objetivo de rentabilidad: ${cfg.profitTargetLow}%–${cfg.profitTargetHigh}%`)
      + `<div class="alert i"><span class="ai">📌</span><div>La rentabilidad se calcula con el <b>costo real</b> (compra + envíos + comisiones + empaque + otros), nunca solo con el costo de compra.</div></div>`
      + (flagged.length ? `<div class="alert w"><span class="ai">⚠️</span><div><b>${flagged.length} producto(s)</b> requieren revisión de precio (margen bajo o no cubren reposición).</div></div>` : '')
      + UI.table(cols, rows, { rowAttr: r => `class="row-click" data-id="${r.p.id}"` });
    UI.els('[data-id]', c).forEach(tr => tr.onclick = () => productDetail(tr.dataset.id));
  };

  // =========================================================
  //  FONDOS (reposición y publicidad)
  // =========================================================
  Views.fondos = function (c) {
    const s = F.summary(F.rangeFromKey('all'), {});
    const f = S.db.config.funds;
    const net = Math.max(0, s.netProfit);
    const adsSpend = s.adsSpend;
    const adsBudget = s.funds.publicidad;
    // ROAS: ventas de campañas (aprox: ventas por canal Instagram + campañas) — simplificado
    const campaignSales = S.db.sales.filter(x => /Instagram|Facebook|Marketplace/.test(x.channel)).reduce((a, x) => a + F.saleAnalysis(x).revenueUSD, 0);
    const roas = adsSpend ? campaignSales / adsSpend : 0;
    const salesCount = S.db.sales.length;
    const cps = salesCount ? adsSpend / salesCount : 0;

    const fundBar = `<div class="fund-bar" style="margin:14px 0">
      <span style="width:${f.reposicion}%;background:${UI.PALETTE[3]}" title="Reposición ${f.reposicion}%"></span>
      <span style="width:${f.disponible}%;background:${UI.PALETTE[2]}" title="Disponible ${f.disponible}%"></span>
      <span style="width:${f.publicidad}%;background:${UI.PALETTE[1]}" title="Publicidad ${f.publicidad}%"></span>
      <span style="width:${f.reserva}%;background:${UI.PALETTE[4]}" title="Reserva ${f.reserva}%"></span>
    </div>
    <div class="legend">
      <span class="lg-item"><span class="dot" style="background:${UI.PALETTE[3]}"></span>Reposición ${f.reposicion}%</span>
      <span class="lg-item"><span class="dot" style="background:${UI.PALETTE[2]}"></span>Disponible ${f.disponible}%</span>
      <span class="lg-item"><span class="dot" style="background:${UI.PALETTE[1]}"></span>Publicidad ${f.publicidad}%</span>
      <span class="lg-item"><span class="dot" style="background:${UI.PALETTE[4]}"></span>Reserva ${f.reserva}%</span>
    </div>`;

    c.innerHTML = head('Fondos: reposición y publicidad', 'Distribución automática de la ganancia neta')
      + `<div class="card card-pad">
          <h4 style="margin:0 0 4px">Distribución de la ganancia neta (${fmt.usd(net)})</h4>
          <p class="muted small" style="margin:0">Los porcentajes se editan en Configuración.</p>${fundBar}
        </div>`
      + `<div class="cards" style="margin-top:16px">
          ${UI.metric({ label: 'Fondo de reposición', value: fmt.usd(s.funds.reposicion), sub: 'Para reponer inventario', cls: 'warn', badge: '🔄' })}
          ${UI.metric({ label: 'Ganancia disponible', value: fmt.usd(s.funds.disponible), sub: 'Dinero libre', cls: 'good', badge: '💵' })}
          ${UI.metric({ label: 'Reserva / emergencia', value: fmt.usd(s.funds.reserva), badge: '🛟' })}
          ${UI.metric({ label: 'Fondo de publicidad', value: fmt.usd(s.funds.publicidad), cls: 'accent', badge: '📣' })}
        </div>`
      + `<div class="section-title">Publicidad (Facebook / Instagram)</div>
        <div class="cards">
          ${UI.metric({ label: 'Presupuesto para ads', value: fmt.usd(adsBudget), badge: '💳' })}
          ${UI.metric({ label: 'Gastado en ads', value: fmt.usd(adsSpend), badge: '📤' })}
          ${UI.metric({ label: 'Ventas de campañas (aprox)', value: fmt.usd(campaignSales), badge: '🛒' })}
          ${UI.metric({ label: 'ROAS (retorno)', value: (roas ? roas.toFixed(1) + '×' : '—'), sub: 'Ingreso por $ invertido', cls: roas >= 2 ? 'good' : 'warn', badge: '📈' })}
          ${UI.metric({ label: 'Costo por venta', value: fmt.usd(cps), badge: '🎯' })}
          ${UI.metric({ label: 'Ganancia después de ads', value: fmt.usd(net - adsSpend), cls: (net - adsSpend) >= 0 ? 'good' : 'bad', badge: '✅' })}
        </div>
        <div class="alert i" style="margin-top:14px"><span class="ai">💡</span><div>Recomendación inicial: recuperar primero el 100% del costo del producto y reservar entre 5% y 10% de la ganancia neta para publicidad.</div></div>`;
  };

  // =========================================================
  //  INVENTARIO
  // =========================================================
  Views.inventario = function (c) {
    const cfg = S.db.config;
    const products = S.db.products;
    const low = products.filter(p => p.qtyAvailable > 0 && p.qtyAvailable <= cfg.lowStockThreshold);
    const out = products.filter(p => p.qtyAvailable <= 0);
    const stale = products.filter(p => p.qtyAvailable > 0 && daysSince(p.purchaseDate) > cfg.staleDays && (p.qtySold || 0) === 0);
    const moves = S.db.inventory.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 40);

    const prodCols = [
      { label: 'Producto', get: p => `${p.photo || '📦'} <b>${esc(UI.trim(p.name, 22))}</b>` },
      { label: 'Comprado', num: true, get: p => fmt.num(p.qtyBought) },
      { label: 'Vendido', num: true, get: p => fmt.num(p.qtySold) },
      { label: 'Disponible', num: true, get: p => `<b>${fmt.num(p.qtyAvailable)}</b>` },
      { label: 'Estado', get: p => UI.statePill(productState(p)) },
      { label: '', get: p => `<button class="btn btn-sm btn-soft" data-move="${p.id}">Movimiento</button>` },
    ];
    const moveCols = [
      { label: 'Fecha', get: m => fmt.datetime(m.date) },
      { label: 'Producto', get: m => { const p = S.find('products', m.productId); return esc(p ? p.name : '?'); } },
      { label: 'Tipo', get: m => UI.pill(m.type, moveClass(m.type)) },
      { label: 'Cantidad', num: true, get: m => fmt.num(m.qty) },
      { label: 'Nota', get: m => esc(m.note || '—') },
    ];

    let alerts = '';
    if (out.length) alerts += `<div class="alert d"><span class="ai">🚫</span><div><b>Agotados:</b> ${out.map(p => esc(p.name)).join(', ')}</div></div>`;
    if (low.length) alerts += `<div class="alert w"><span class="ai">🔔</span><div><b>Poco inventario (≤${cfg.lowStockThreshold}):</b> ${low.map(p => `${esc(p.name)} (${p.qtyAvailable})`).join(', ')}</div></div>`;
    if (stale.length) alerts += `<div class="alert w"><span class="ai">🐢</span><div><b>Sin venderse hace +${cfg.staleDays} días:</b> ${stale.map(p => esc(p.name)).join(', ')}</div></div>`;
    if (!alerts) alerts = `<div class="alert g"><span class="ai">✅</span><div>Inventario saludable.</div></div>`;

    c.innerHTML = head('Inventario', 'Entradas, salidas, ajustes y movimientos',
      `<button class="btn btn-primary" data-move="">＋ Registrar movimiento</button>`)
      + alerts
      + `<div class="section-title">Existencias</div>` + UI.table(prodCols, products)
      + `<div class="section-title">Historial de movimientos</div>` + UI.table(moveCols, moves);
    UI.els('[data-move]', c).forEach(b => b.onclick = () => invMoveForm(b.dataset.move));
  };
  function moveClass(t) { return { entrada: 'g', salida: 'b', ajuste: 'a', 'devolución': 'w', dañado: 'd', reservado: 'n', entregado: 'g', contenido: 'a' }[t] || 'n'; }
  function daysSince(iso) { return Math.floor((Date.now() - new Date(iso)) / 86400000); }

  function invMoveForm(pid) {
    const prodOpts = S.db.products.map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)} (${p.qtyAvailable} disp)</option>`).join('');
    const body = `<div class="form-grid">
      <label class="field full"><span>Producto</span><select data-k="productId">${prodOpts}</select></label>
      <label class="field"><span>Tipo de movimiento</span><select data-k="type">${optionList(S.INV_MOVES)}</select></label>
      <label class="field"><span>Cantidad</span><input type="number" data-k="qty" value="1"></label>
      <label class="field full"><span>Nota</span><input data-k="note" placeholder="Motivo del movimiento"></label>
    </div>
    <div class="alert i"><span class="ai">ℹ️</span><div>Entrada/devolución suman al disponible; salida/dañado/entregado restan; ajuste fija el valor.</div></div>`;
    const m = UI.modal({ title: 'Movimiento de inventario', body, footer: `<button class="btn btn-ghost" data-cancel>Cancelar</button><button class="btn btn-primary" data-save>Registrar</button>` });
    m.el('[data-cancel]').onclick = m.close;
    m.el('[data-save]').onclick = () => {
      const v = k => m.el(`[data-k="${k}"]`).value;
      const p = S.find('products', v('productId')); if (!p) return;
      const qty = +v('qty') || 0, type = v('type');
      let avail = p.qtyAvailable || 0;
      if (['entrada', 'devolución'].includes(type)) avail += qty;
      else if (['salida', 'dañado', 'entregado', 'contenido'].includes(type)) avail -= qty;
      else if (type === 'ajuste') avail = qty;
      const patch = { qtyAvailable: Math.max(0, avail) };
      if (type === 'entrada') patch.qtyBought = (p.qtyBought || 0) + qty;
      S.update('products', p.id, patch);
      S.add('inventory', { productId: p.id, type, qty, date: S.now(), note: v('note') });
      UI.toast('Movimiento registrado', 'g'); m.close(); global.App.refresh();
    };
  }

  // =========================================================
  //  SIMULADOR FINANCIERO
  // =========================================================
  Views.simulador = function (c) {
    const r = S.db.rates;
    c.innerHTML = head('Simulador financiero', 'Prueba escenarios antes de comprar o poner precios')
      + `<div class="two-col">
        <div class="card card-pad">
          <div class="form-grid">
            <label class="field"><span>Tasa BCV</span><input type="number" data-s="rateBCV" value="${r.bcv}"></label>
            <label class="field"><span>Tasa USDT</span><input type="number" data-s="rateUSDT" value="${r.usdt}"></label>
            <label class="field"><span>Costo del producto (USD)</span><input type="number" step="0.01" data-s="productCost" value="5"></label>
            <label class="field"><span>Costo de envío (USD total)</span><input type="number" step="0.01" data-s="shipping" value="10"></label>
            <label class="field"><span>Cantidad de unidades</span><input type="number" data-s="units" value="20"></label>
            <label class="field"><span>Precio de venta (USD)</span><input type="number" step="0.01" data-s="price" value="0" placeholder="0 = usar margen"></label>
            <label class="field"><span>Margen deseado (%)</span><input type="number" data-s="marginTarget" value="30"></label>
            <label class="field"><span>Descuento (%)</span><input type="number" data-s="discount" value="0"></label>
            <label class="field"><span>Publicidad (% del precio)</span><input type="number" data-s="adsPct" value="8"></label>
          </div>
        </div>
        <div class="card card-pad" data-out></div>
      </div>`;
    const inputs = UI.els('[data-s]', c);
    const run = () => {
      const inp = {}; inputs.forEach(i => inp[i.dataset.s] = +i.value || 0);
      const s = F.simulate(inp);
      UI.el('[data-out]', c).innerHTML = `
        <h4 style="margin:0 0 10px">Resultado del escenario</h4>
        <div class="calc-box">
          <div class="calc-row"><span>Inversión total</span><b>${fmt.usd(s.invest)}</b></div>
          <div class="calc-row"><span>Costo unitario (con envío)</span><b>${fmt.usd(s.unitCost)}</b></div>
          <div class="calc-row"><span>Precio recomendado (margen ${inp.marginTarget}%)</span><b>${fmt.usd(s.recommended)}</b></div>
          <div class="calc-row"><span>Precio de venta usado</span><b>${fmt.usd(s.netPrice)}</b></div>
          <div class="calc-row"><span>Margen real</span><b class="${s.margin < 30 ? 'neg' : 'pos'}">${fmt.pct(s.margin)}</b></div>
        </div>
        <div class="calc-box">
          <div class="calc-row"><span>Ganancia por unidad</span><b>${fmt.usd(s.profitUnit)}</b></div>
          <div class="calc-row"><span>Ganancia total (${s.units} u.)</span><b>${fmt.usd(s.profitTotal)}</b></div>
          <div class="calc-row"><span>Punto de equilibrio</span><b>${s.breakeven === Infinity ? '∞' : s.breakeven + ' unidades'}</b></div>
        </div>
        <div class="section-title">Efecto de la tasa cambiaria</div>
        <div class="calc-box">
          <div class="calc-row"><span>Brecha BCV-USDT</span><b>${fmt.pct(s.gapPct)}</b></div>
          <div class="calc-row"><span>USD efectivo si cobras a tasa BCV</span><b>${fmt.usd(s.usdEffectiveBCV)}</b></div>
          <div class="calc-row"><span>Ganancia/unidad vendiendo a BCV</span><b class="${s.profitIfBCV < 0 ? 'neg' : 'pos'}">${fmt.usd(s.profitIfBCV)}</b></div>
          ${s.profitIfBCV < s.profitUnit ? `<div class="calc-row"><span>⚠️ Pérdida por vender a BCV</span><b class="neg">${fmt.usd((s.profitUnit - s.profitIfBCV) * s.units)}</b></div>` : ''}
        </div>
        <div class="section-title">Distribución de la ganancia</div>
        <div class="calc-box">
          <div class="calc-row"><span>Para reposición</span><b>${fmt.usd(s.funds.reposicion)}</b></div>
          <div class="calc-row"><span>Publicidad</span><b>${fmt.usd(s.funds.publicidad)}</b></div>
          <div class="calc-row"><span>Reserva</span><b>${fmt.usd(s.funds.reserva)}</b></div>
          <div class="calc-row"><span>Ganancia disponible</span><b>${fmt.usd(s.funds.disponible)}</b></div>
        </div>`;
    };
    inputs.forEach(i => i.oninput = run);
    run();
  };

  // =========================================================
  //  REPORTES
  // =========================================================
  Views.reportes = function (c) {
    const range = F.rangeFromKey('month');
    const s = F.summary(range, {});
    const ranks = F.productRankings();
    const supRanks = F.supplierRankings().sort((a, b) => b.profit - a.profit);
    c.innerHTML = head('Reportes', 'Resumen mensual del negocio',
      `<button class="btn btn-ghost" data-csv>⬇️ CSV</button><button class="btn btn-primary" data-pdf>📄 PDF / Imprimir</button>`)
      + `<div class="cards">
          ${UI.metric({ label: 'Ventas del mes', value: fmt.usd(s.revenue), sub: s.salesCount + ' ventas' })}
          ${UI.metric({ label: 'Ganancia bruta', value: fmt.usd(s.grossProfit) })}
          ${UI.metric({ label: 'Ganancia neta', value: fmt.usd(s.netProfit), cls: 'good' })}
          ${UI.metric({ label: 'Egresos', value: fmt.usd(s.expenses) })}
          ${UI.metric({ label: 'Gastos en ads', value: fmt.usd(s.adsSpend) })}
          ${UI.metric({ label: 'Inventario restante', value: fmt.usd(s.inventoryValueCost) })}
          ${UI.metric({ label: 'Disponible', value: fmt.usd(s.funds.disponible), cls: 'good' })}
          ${UI.metric({ label: 'Comprometido reposición', value: fmt.usd(s.funds.reposicion), cls: 'warn' })}
        </div>
        <div class="two-col" style="margin-top:16px">
          <div class="card card-pad"><h4 style="margin:0 0 10px">Productos más rentables</h4>
            ${UI.table([{ label: 'Producto', get: r => esc(UI.trim(r.p.name, 24)) }, { label: 'Ganancia', num: true, get: r => fmt.usd(r.totalProfit) }], ranks.byProfit.slice(0, 6))}</div>
          <div class="card card-pad"><h4 style="margin:0 0 10px">Rendimiento por proveedor</h4>
            ${UI.table([{ label: 'Proveedor', get: r => esc(r.sup.name) }, { label: 'Ganancia', num: true, get: r => fmt.usd(r.profit) }, { label: 'Margen', num: true, get: r => fmt.pct(r.avgMargin) }], supRanks)}</div>
        </div>
        <div class="alert i" style="margin-top:14px"><span class="ai">📊</span><div>Diferencia cambiaria (erosión BCV-USDT) del mes: <b>${fmt.usd(s.erosion)}</b>. Flujo de caja disponible: <b>${fmt.usd(s.funds.disponible)}</b>.</div></div>`;
    UI.el('[data-csv]', c).onclick = () => {
      const rows = ranks.rows;
      const cols = [{ label: 'Producto', key: 'name', raw: r => r.p.name }, { label: 'SKU', raw: r => r.p.sku }, { label: 'Vendidas', raw: r => r.sold }, { label: 'Costo real', raw: r => r.realUnitCost.toFixed(2) }, { label: 'Precio', raw: r => r.price.toFixed(2) }, { label: 'Margen %', raw: r => r.margin.toFixed(1) }, { label: 'Ganancia total', raw: r => r.totalProfit.toFixed(2) }];
      UI.download('reporte_productos.csv', UI.toCSV(cols, rows));
    };
    UI.el('[data-pdf]', c).onclick = () => {
      const html = `<h1>Reporte mensual · Descanso</h1><p class="k">Generado el ${fmt.datetime(S.now())}</p>
        <div class="metric"><b>Ventas:</b> ${fmt.usd(s.revenue)}</div>
        <div class="metric"><b>Ganancia neta:</b> ${fmt.usd(s.netProfit)}</div>
        <div class="metric"><b>Egresos:</b> ${fmt.usd(s.expenses)}</div>
        <div class="metric"><b>Disponible:</b> ${fmt.usd(s.funds.disponible)}</div>
        <div class="metric"><b>Reposición:</b> ${fmt.usd(s.funds.reposicion)}</div>
        <h2>Productos</h2><table><tr><th>Producto</th><th>Vendidas</th><th>Precio</th><th>Margen</th><th>Ganancia</th></tr>
        ${ranks.byProfit.map(r => `<tr><td>${esc(r.p.name)}</td><td>${r.sold}</td><td>${fmt.usd(r.price)}</td><td>${fmt.pct(r.margin)}</td><td>${fmt.usd(r.totalProfit)}</td></tr>`).join('')}</table>
        <h2>Proveedores</h2><table><tr><th>Proveedor</th><th>Invertido</th><th>Ganancia</th><th>Margen</th></tr>
        ${supRanks.map(r => `<tr><td>${esc(r.sup.name)}</td><td>${fmt.usd(r.invested)}</td><td>${fmt.usd(r.profit)}</td><td>${fmt.pct(r.avgMargin)}</td></tr>`).join('')}</table>`;
      UI.printHTML('Reporte mensual', html);
    };
  };

  // =========================================================
  //  CONFIGURACIÓN (tasas, fondos, usuarios, catálogos)
  // =========================================================
  Views.configuracion = function (c) {
    if (!S.isAdmin()) { c.innerHTML = head('Configuración') + `<div class="alert w"><span class="ai">🔒</span><div>Solo el Administrador puede modificar la configuración.</div></div>`; return; }
    const r = S.db.rates, cfg = S.db.config;
    const eq = F.equivalents(1, r.bcv, r.usdt);
    const hist = S.db.rateHistory.slice().reverse().slice(0, 10);
    c.innerHTML = head('Configuración', 'Tasas, fondos, usuarios y catálogos')
      + `<div class="two-col">
        <div class="card card-pad">
          <h4 style="margin:0 0 4px">💱 Tasas cambiarias</h4>
          <p class="muted small" style="margin:0 0 12px">Actualizadas: ${fmt.datetime(r.updatedAt)}</p>
          <div class="form-grid three">
            <label class="field"><span>Tasa BCV (Bs/USD)</span><input type="number" step="0.01" data-r="bcv" value="${r.bcv}"></label>
            <label class="field"><span>Tasa USDT (Bs/USD)</span><input type="number" step="0.01" data-r="usdt" value="${r.usdt}"></label>
            <label class="field"><span>Tasa EUR (Bs/€)</span><input type="number" step="0.01" data-r="eur" value="${r.eur}"></label>
          </div>
          <div class="calc-box"><div class="calc-row"><span>Diferencia entre tasas (BCV vs USDT)</span><b>${fmt.bs(eq.gapBs)} (${fmt.pct(eq.gapPct)})</b></div>
          <div class="calc-row"><span>1 € equivale a</span><b>${fmt.usd(r.usdt ? r.eur / r.usdt : 0)} · ${fmt.bs(r.eur)}</b></div>
          <div class="calc-row muted small"><span>Referencia: USDT ~866-868 Bs · EUR editable</span><b></b></div></div>
          <button class="btn btn-primary btn-block" data-saverates>Guardar tasas</button>
          <div class="section-title">Historial de tasas</div>
          ${UI.table([{ label: 'Fecha', get: h => fmt.datetime(h.date) }, { label: 'BCV', num: true, get: h => fmt.num(h.bcv) }, { label: 'USDT', num: true, get: h => fmt.num(h.usdt) }, { label: 'EUR', num: true, get: h => fmt.num(h.eur || 0) }, { label: 'Brecha', num: true, get: h => fmt.pct(((h.usdt - h.bcv) / h.bcv) * 100) }], hist)}
        </div>
        <div class="card card-pad">
          <h4 style="margin:0 0 12px">🎯 Rentabilidad y fondos</h4>
          <div class="form-grid">
            <label class="field"><span>Objetivo mínimo (%)</span><input type="number" data-c="profitTargetLow" value="${cfg.profitTargetLow}"></label>
            <label class="field"><span>Objetivo máximo (%)</span><input type="number" data-c="profitTargetHigh" value="${cfg.profitTargetHigh}"></label>
          </div>
          <p class="muted small">Distribución de la ganancia neta (debe sumar 100%):</p>
          <div class="form-grid">
            <label class="field"><span>Reposición %</span><input type="number" data-f="reposicion" value="${cfg.funds.reposicion}"></label>
            <label class="field"><span>Disponible %</span><input type="number" data-f="disponible" value="${cfg.funds.disponible}"></label>
            <label class="field"><span>Publicidad %</span><input type="number" data-f="publicidad" value="${cfg.funds.publicidad}"></label>
            <label class="field"><span>Reserva %</span><input type="number" data-f="reserva" value="${cfg.funds.reserva}"></label>
          </div>
          <div class="form-grid">
            <label class="field"><span>Umbral poco inventario</span><input type="number" data-c="lowStockThreshold" value="${cfg.lowStockThreshold}"></label>
            <label class="field"><span>Días sin venta (alerta)</span><input type="number" data-c="staleDays" value="${cfg.staleDays}"></label>
          </div>
          <button class="btn btn-primary btn-block" data-saveconfig>Guardar configuración</button>
        </div>
      </div>
      <div class="section-title">👥 Usuarios y accesos</div>
      <div class="card card-pad">
        ${UI.table([{ label: 'Usuario', get: u => `<b>${esc(u.name)}</b>` }, { label: 'Rol', get: u => UI.pill(u.role, u.role === 'Administrador' ? 'b' : 'a') }, { label: 'Permisos', get: u => u.role === 'Administrador' ? 'Control total' : 'Registra ventas, pedidos e inventario' }], S.db.users)}
        <p class="muted small" style="margin-top:10px">El colaborador no puede modificar tasas, eliminar movimientos financieros ni ver información sensible sin autorización.</p>
      </div>
      <div class="section-title">➕ Categorías de gastos (escalable)</div>
      <div class="card card-pad">
        <div class="row" style="margin-bottom:10px">${cfg.expenseCats.map(x => UI.pill(x, 'n')).join(' ')}</div>
        <div class="row"><input id="newcat" placeholder="Nueva categoría de gasto (ej: Impuestos, Empleados…)" style="flex:1;border:1px solid var(--border-2);border-radius:10px;padding:9px 11px">
        <button class="btn btn-soft" data-addcat>Agregar</button></div>
        <p class="muted small">Podrás agregar impuestos, empleados o servicios profesionales cuando el negocio crezca, sin rehacer el sistema.</p>
      </div>
      <div class="section-title">🗂️ Datos</div>
      <div class="card card-pad row">
        <button class="btn btn-ghost" data-export>⬇️ Exportar respaldo (JSON)</button>
        <button class="btn btn-danger" data-reset>♻️ Restablecer datos de ejemplo</button>
      </div>`;

    UI.el('[data-saverates]', c).onclick = () => { const bcv = +UI.el('[data-r="bcv"]', c).value, usdt = +UI.el('[data-r="usdt"]', c).value, eur = +UI.el('[data-r="eur"]', c).value; if (!bcv || !usdt || !eur) return UI.toast('Tasas inválidas', 'w'); S.setRates(bcv, usdt, eur); UI.toast('Tasas actualizadas', 'g'); global.App.refresh(); };
    UI.el('[data-saveconfig]', c).onclick = () => {
      const f = {}; ['reposicion', 'disponible', 'publicidad', 'reserva'].forEach(k => f[k] = +UI.el(`[data-f="${k}"]`, c).value || 0);
      const sum = f.reposicion + f.disponible + f.publicidad + f.reserva;
      if (sum !== 100) return UI.toast('Los fondos deben sumar 100% (actual: ' + sum + '%)', 'w');
      cfg.funds = f;
      ['profitTargetLow', 'profitTargetHigh', 'lowStockThreshold', 'staleDays'].forEach(k => cfg[k] = +UI.el(`[data-c="${k}"]`, c).value || 0);
      S.log('config', 'editar', 'fondos/objetivos', '', JSON.stringify(f)); S.save(); UI.toast('Configuración guardada', 'g'); global.App.refresh();
    };
    UI.el('[data-addcat]', c).onclick = () => { const v = UI.el('#newcat', c).value.trim(); if (!v) return; cfg.expenseCats.push(v); S.log('config', 'crear', 'categoría gasto', '', v); S.save(); Views.configuracion(c); };
    UI.el('[data-export]', c).onclick = () => UI.download('respaldo_descanso.json', JSON.stringify(S.db, null, 2), 'application/json');
    UI.el('[data-reset]', c).onclick = () => UI.confirm('¿Restablecer TODOS los datos a los de ejemplo? Se perderán tus cambios.', () => { S.reset(); UI.toast('Datos restablecidos', 'g'); global.App.refresh(); }, { danger: true, yes: 'Restablecer' });
  };

  // =========================================================
  //  BITÁCORA / SEGURIDAD (historial de cambios)
  // =========================================================
  Views.historial = function (c) {
    const logs = S.db.changelog;
    const cols = [
      { label: 'Cuándo', get: l => fmt.datetime(l.when) },
      { label: 'Usuario', get: l => `${esc(l.user)} <span class="muted small">(${esc(l.role)})</span>` },
      { label: 'Acción', get: l => UI.pill(l.action, l.action === 'eliminar' ? 'd' : l.action === 'crear' ? 'g' : 'n') },
      { label: 'Entidad', get: l => esc(l.entity) },
      { label: 'Campo', get: l => esc(l.field || '—') },
      { label: 'Antes → Después', get: l => `${esc(UI.trim(l.oldValue, 20) || '—')} → <b>${esc(UI.trim(l.newValue, 20) || '—')}</b>` },
    ];
    c.innerHTML = head('Historial de cambios', 'Auditoría: qué, quién, cuándo, valor anterior y nuevo')
      + UI.table(cols, logs.slice(0, 200));
  };

  global.Views = Views;
})(window);
