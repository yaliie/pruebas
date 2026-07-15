/* =========================================================
   finance.js — Motor de cálculos financieros
   Conversión de monedas, costo real, márgenes, costo de
   reposición, ganancia sostenible, fondos y simulador.
   ========================================================= */
(function (global) {
  'use strict';
  const S = global.Store;

  // ---- Formateo ----
  const fmt = {
    usd(n) { return '$' + (Math.round((+n || 0) * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
    eur(n) { return '€' + (Math.round((+n || 0) * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
    bs(n) { return (Math.round(+n || 0)).toLocaleString('es-VE') + ' Bs'; },
    usdt(n) { return (Math.round((+n || 0) * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2 }) + ' USDT'; },
    pct(n) { return (Math.round((+n || 0) * 10) / 10).toLocaleString('es-VE') + '%'; },
    num(n) { return (+n || 0).toLocaleString('es-VE'); },
    date(iso) { try { return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return iso; } },
    datetime(iso) { try { return new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } },
  };

  // ---------------------------------------------------------
  //  Conversión de monedas
  //  Una operación guarda su tasa. Convertimos todo a USD y
  //  luego mostramos equivalentes en Bs (BCV y USDT).
  // ---------------------------------------------------------
  function toUSD(amount, currency, rateBCV, rateUSDT) {
    amount = +amount || 0;
    switch (currency) {
      case 'USD':
      case 'Efectivo en dólares':
      case 'Zelle':
      case 'USDT':
        return amount; // valor ya en dólares (USDT ≈ USD 1:1 en valor)
      case 'EUR':
      case 'Efectivo en euros': {
        // Euros → Bs (tasa EUR) → USD (tasa USDT del mercado)
        const e = S.db.rates.eur, u = S.db.rates.usdt;
        return (e && u) ? (amount * e) / u : amount;
      }
      case 'Bs-BCV':
      case 'Bolívares a tasa BCV':
        return rateBCV ? amount / rateBCV : 0;
      case 'Bs-USDT':
      case 'Bolívares a tasa USDT':
      case 'Pago móvil':
      case 'Transferencia bancaria':
        // Bs recibidos por transferencia/pago móvil: se registran a la tasa elegida en la venta.
        return rateUSDT ? amount / rateUSDT : 0;
      default:
        return amount;
    }
  }

  // Equivalentes completos de un monto USD
  function equivalents(usd, rateBCV, rateUSDT, rateEUR) {
    if (rateEUR == null) rateEUR = S.db.rates.eur;
    const bsBCV = usd * rateBCV;
    const bsUSDT = usd * rateUSDT;
    const gapBs = bsUSDT - bsBCV;
    const gapPct = rateBCV ? ((rateUSDT - rateBCV) / rateBCV) * 100 : 0;
    const eur = rateEUR ? (usd * rateUSDT) / rateEUR : 0; // valor en euros según mercado
    return { usd, bsBCV, bsUSDT, gapBs, gapPct, eur };
  }

  // Convierte un movimiento (ingreso/egreso) a USD según su moneda y tasa guardada.
  function movementUSD(m) {
    if (m.currency === 'EUR') {
      const e = m.rate || S.db.rates.eur, u = S.db.rates.usdt;
      return (e && u) ? (m.amount * e) / u : 0;
    }
    return toUSD(m.amount, m.currency === 'Bs' ? 'Bs-USDT' : (m.currency || 'USD'), m.rateBCV || S.db.rates.bcv, m.rate || S.db.rates.usdt);
  }

  // ---------------------------------------------------------
  //  Costo real unitario del producto (incluye TODO)
  // ---------------------------------------------------------
  function productCosts(p) {
    const base = +p.purchaseUnitCost || 0;
    const extras = (+p.intlShipping || 0) + (+p.nationalShipping || 0) +
      (+p.buyCommission || 0) + (+p.packaging || 0) + (+p.otherCosts || 0);
    const realUnitCost = base + extras; // en USD
    return { base, extras, realUnitCost };
  }

  // ---------------------------------------------------------
  //  Precios y rentabilidad
  //  - Recargo (markup) sobre costo:  precio = costo * (1 + r)
  //  - Margen sobre precio de venta:  precio = costo / (1 - m)
  // ---------------------------------------------------------
  function priceByMarkup(cost, markupPct) { return cost * (1 + markupPct / 100); }
  function priceByMargin(cost, marginPct) {
    const m = marginPct / 100;
    return m >= 1 ? Infinity : cost / (1 - m);
  }
  function marginOf(price, cost) { return price > 0 ? ((price - cost) / price) * 100 : 0; }
  function markupOf(price, cost) { return cost > 0 ? ((price - cost) / cost) * 100 : 0; }

  // ---------------------------------------------------------
  //  Costo histórico vs Costo de reposición
  //  Histórico: lo que se pagó (USD). Reposición: mismo costo
  //  USD, pero para reponer hay que comprar divisa a tasa USDT.
  //  Ganancia sostenible descuenta el efecto de la brecha.
  // ---------------------------------------------------------
  function productAnalysis(p) {
    const rates = S.db.rates;
    const { realUnitCost } = productCosts(p);
    const price = +p.currentPrice || 0;

    // Costo histórico (con la tasa guardada del producto)
    const histCost = realUnitCost;
    // Costo de reposición: mismo costo en USD (el proveedor cobra USD).
    // El impacto está en cómo recuperas la divisa (ver ventas).
    const repoCost = realUnitCost;

    const margin = marginOf(price, histCost);
    const markup = markupOf(price, histCost);
    const profitUnit = price - histCost;

    const cfg = S.db.config;
    const target = cfg.profitTargetLow;
    return {
      realUnitCost, histCost, repoCost, price, margin, markup, profitUnit,
      price30markup: priceByMarkup(histCost, 30),
      price35markup: priceByMarkup(histCost, 35),
      price30margin: priceByMargin(histCost, 30),
      price35margin: priceByMargin(histCost, 35),
      recommended: priceByMargin(repoCost, cfg.profitTargetLow), // cubre reposición con margen objetivo
      belowTarget: margin < target,
      profitBs_BCV: profitUnit * rates.bcv,
      profitBs_USDT: profitUnit * rates.usdt,
    };
  }

  // ---------------------------------------------------------
  //  Ganancia de una venta (contable y sostenible)
  //  Contable: precio recibido (USD nominal) - costo histórico.
  //  Sostenible: USD realmente disponible para reponer - costo
  //  de reposición. Si cobras Bs a tasa BCV pero repones a USDT,
  //  el USD efectivo para reponer = Bs / usdt (no / bcv).
  // ---------------------------------------------------------
  function saleAnalysis(sale) {
    const products = S.db.products;
    let revenueUSD = 0;         // ingreso contable en USD (nominal)
    let sustainUSD = 0;         // USD efectivo para reponer
    let cost = 0;               // costo histórico total
    let repoCost = 0;           // costo de reposición total
    const rBCV = sale.rateBCV, rUSDT = sale.rateUSDT;

    (sale.items || []).forEach(it => {
      const p = products.find(x => x.id === it.productId);
      const lineGross = (it.unitPrice || 0) * (it.qty || 0);
      const disc = (sale.discount || 0) / (sale.items.length || 1); // reparto simple del descuento
      const lineNet = Math.max(0, lineGross - disc);
      revenueUSD += lineNet;

      // USD efectivo según método de pago
      if (/BCV/.test(sale.paymentMethod)) {
        // cobrado en Bs a BCV, pero para reponer compras USDT: pierdes la brecha
        sustainUSD += rUSDT ? (lineNet * rBCV) / rUSDT : lineNet;
      } else {
        sustainUSD += lineNet; // dólares, USDT, Bs-USDT: 1:1 aprox para reponer
      }

      if (p) {
        const c = productCosts(p).realUnitCost * (it.qty || 0);
        cost += c;
        repoCost += c; // mismo costo USD para reponer
      }
    });

    const delivery = (sale.deliveryPaidBy === 'Negocio') ? (sale.deliveryCost || 0) : 0;
    const accountingProfit = revenueUSD - cost - delivery;
    const sustainableProfit = sustainUSD - repoCost - delivery;
    return {
      revenueUSD, sustainUSD, cost, repoCost, delivery,
      accountingProfit, sustainableProfit,
      erosion: accountingProfit - sustainableProfit, // cuánto se “come” la brecha cambiaria
      marginPct: revenueUSD ? (accountingProfit / revenueUSD) * 100 : 0,
    };
  }

  // ---------------------------------------------------------
  //  Lote / Paca — distribución de costos
  //  Costo unitario = costo total ÷ unidades útiles.
  //  Las dañadas/regalo se reparten entre las vendibles.
  // ---------------------------------------------------------
  function batchAnalysis(b) {
    const additional = (b.additionalCosts || []).reduce((s, c) => s + (+c.amount || 0), 0);
    const totalInvest = (+b.totalCost || 0) + additional;
    const bought = +b.unitsBought || 0;
    const damaged = +b.damagedUnits || 0;
    const gifts = +b.giftUnits || 0;
    const sellable = Math.max(0, bought - damaged - gifts);
    const naiveUnit = bought ? totalInvest / bought : 0;
    const realUnit = sellable ? totalInvest / sellable : 0; // reparte pérdidas entre vendibles
    return { additional, totalInvest, bought, damaged, gifts, sellable, naiveUnit, realUnit };
  }

  // ---------------------------------------------------------
  //  Distribución de fondos tras una venta
  //  De la ganancia neta se separa: reposición, publicidad,
  //  reserva y ganancia disponible (porcentajes editables).
  // ---------------------------------------------------------
  function distributeFunds(netProfit) {
    const f = S.db.config.funds;
    return {
      reposicion: netProfit * (f.reposicion / 100),
      publicidad: netProfit * (f.publicidad / 100),
      reserva: netProfit * (f.reserva / 100),
      disponible: netProfit * (f.disponible / 100),
    };
  }

  // ---------------------------------------------------------
  //  Agregados globales del negocio (para dashboard/reportes)
  // ---------------------------------------------------------
  function filterByRange(items, getDate, range) {
    if (!range || range.key === 'all') return items;
    const start = range.start ? new Date(range.start) : null;
    const end = range.end ? new Date(range.end) : null;
    return items.filter(x => {
      const d = new Date(getDate(x));
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }

  function rangeFromKey(key) {
    const n = new Date(); const s = new Date();
    if (key === 'today') { s.setHours(0, 0, 0, 0); return { key, start: s, end: n }; }
    if (key === 'week') { s.setDate(s.getDate() - 7); return { key, start: s, end: n }; }
    if (key === 'month') { s.setMonth(s.getMonth() - 1); return { key, start: s, end: n }; }
    return { key: 'all' };
  }

  function summary(range, filters) {
    filters = filters || {};
    const db = S.db;
    let sales = db.sales.slice();
    if (range) sales = filterByRange(sales, s => s.datetime, range);
    if (filters.channel) sales = sales.filter(s => s.channel === filters.channel);
    if (filters.method) sales = sales.filter(s => s.paymentMethod === filters.method);
    if (filters.supplier || filters.category || filters.audience) {
      sales = sales.filter(s => (s.items || []).some(it => {
        const p = db.products.find(x => x.id === it.productId);
        if (!p) return false;
        if (filters.supplier && p.supplierId !== filters.supplier) return false;
        if (filters.category && p.category !== filters.category) return false;
        if (filters.audience && p.audience !== filters.audience) return false;
        return true;
      }));
    }

    let revenue = 0, cost = 0, sustainable = 0, unitsSold = 0, accProfit = 0, erosion = 0;
    sales.forEach(s => {
      const a = saleAnalysis(s);
      revenue += a.revenueUSD; cost += a.cost; accProfit += a.accountingProfit;
      sustainable += a.sustainableProfit; erosion += a.erosion;
      (s.items || []).forEach(it => unitsSold += (it.qty || 0));
    });

    // egresos (gastos) del rango
    let movs = db.movements.slice();
    if (range) movs = filterByRange(movs, m => m.date, range);
    let expenses = 0, extraIncome = 0, adsSpend = 0;
    movs.forEach(m => {
      const usd = movementUSD(m);
      if (m.type === 'expense') { expenses += usd; if (/Publicidad/.test(m.category)) adsSpend += usd; }
      else extraIncome += usd;
    });
    // compras de mercancía (inversión en inventario) — costo de productos comprados
    let invested = 0, inventoryValueCost = 0, inventoryValueSale = 0, repoCostTotal = 0;
    db.products.forEach(p => {
      const c = productCosts(p).realUnitCost;
      invested += c * (p.qtyBought || 0);
      inventoryValueCost += c * (p.qtyAvailable || 0);
      inventoryValueSale += (p.currentPrice || 0) * (p.qtyAvailable || 0);
      repoCostTotal += c * (p.qtyAvailable || 0);
    });

    const grossProfit = revenue - cost;          // ganancia bruta (ventas - costo mercancía)
    const netProfit = grossProfit + extraIncome - (expenses - cost >= 0 ? (expenses - cost) : 0); // aprox
    // ganancia neta = ingresos - egresos totales (incluye publicidad, empaques, etc.)
    const totalIncome = revenue + extraIncome;
    const totalExpenses = expenses; // ya incluye compras si están registradas como movimiento; aquí usamos gastos operativos
    const netProfitClean = accProfit + extraIncome - (expenses); // ganancia neta real

    // fondos
    const funds = distributeFunds(Math.max(0, netProfitClean));

    // productos con estados
    const lowStock = db.products.filter(p => p.qtyAvailable > 0 && p.qtyAvailable <= db.config.lowStockThreshold);
    const outStock = db.products.filter(p => p.qtyAvailable <= 0);
    const available = db.products.filter(p => p.qtyAvailable > 0);

    return {
      sales, salesCount: sales.length,
      revenue, cost, grossProfit, accProfit, sustainable, erosion,
      extraIncome, expenses, adsSpend,
      totalIncome, netProfit: netProfitClean,
      unitsSold, invested, inventoryValueCost, inventoryValueSale, repoCostTotal,
      funds,
      lowStock, outStock, available,
      availableCount: available.length,
    };
  }

  // Ranking de productos por rentabilidad / ventas
  function productRankings() {
    const db = S.db;
    const rows = db.products.map(p => {
      const a = productAnalysis(p);
      // ganancia total generada = ganancia unitaria * vendidas
      const totalProfit = a.profitUnit * (p.qtySold || 0);
      return { p, ...a, sold: p.qtySold || 0, totalProfit };
    });
    return {
      byMargin: rows.slice().sort((x, y) => y.margin - x.margin),
      bySold: rows.slice().sort((x, y) => y.sold - x.sold),
      byProfit: rows.slice().sort((x, y) => y.totalProfit - x.totalProfit),
      rows,
    };
  }

  // Ranking / métricas de proveedores
  function supplierRankings() {
    const db = S.db;
    return db.suppliers.map(sup => {
      const prods = db.products.filter(p => p.supplierId === sup.id);
      let invested = 0, unitsBought = 0, profit = 0, marginSum = 0, marginN = 0, sold = 0;
      prods.forEach(p => {
        const a = productAnalysis(p);
        const c = productCosts(p).realUnitCost;
        invested += c * (p.qtyBought || 0);
        unitsBought += (p.qtyBought || 0);
        sold += (p.qtySold || 0);
        profit += a.profitUnit * (p.qtySold || 0);
        if (p.currentPrice) { marginSum += a.margin; marginN++; }
      });
      return {
        sup, productCount: prods.length, invested, unitsBought, sold, profit,
        avgMargin: marginN ? marginSum / marginN : 0,
        avgShipping: sup.avgShippingUsd || 0, quality: sup.quality || 0,
        deliveryDays: sup.avgDeliveryDays || 0,
      };
    });
  }

  // ---------------------------------------------------------
  //  Simulador financiero
  // ---------------------------------------------------------
  function simulate(inp) {
    const units = +inp.units || 1;
    const unitCost = (+inp.productCost || 0) + (+inp.shipping || 0) / units; // costo + prorrateo de envío
    const invest = unitCost * units;
    const price = +inp.price || priceByMargin(unitCost, +inp.marginTarget || 30);
    const discount = (+inp.discount || 0) / 100;
    const netPrice = price * (1 - discount);
    const adsPerUnit = netPrice * ((+inp.adsPct || 0) / 100);
    const profitUnit = netPrice - unitCost - adsPerUnit;
    const profitTotal = profitUnit * units;
    const margin = marginOf(netPrice, unitCost);

    // punto de equilibrio (unidades para recuperar inversión con ganancia unitaria)
    const breakeven = profitUnit > 0 ? Math.ceil(invest / (netPrice - unitCost)) : Infinity;

    // efectos de tasa
    const rBCV = +inp.rateBCV || S.db.rates.bcv;
    const rUSDT = +inp.rateUSDT || S.db.rates.usdt;
    const gapPct = rBCV ? ((rUSDT - rBCV) / rBCV) * 100 : 0;
    // vender a tasa BCV: USD efectivo para reponer
    const usdEffectiveBCV = rUSDT ? (netPrice * rBCV) / rUSDT : netPrice;
    const profitIfBCV = usdEffectiveBCV - unitCost - adsPerUnit;

    const funds = distributeFunds(Math.max(0, profitTotal));
    return {
      units, unitCost, invest, price, netPrice, margin, profitUnit, profitTotal, breakeven,
      gapPct, usdEffectiveBCV, profitIfBCV, adsPerUnit, funds,
      recommended: priceByMargin(unitCost, +inp.marginTarget || 30),
    };
  }

  // Alertas de precio/rentabilidad para un producto
  function priceAlerts(p) {
    const a = productAnalysis(p);
    const out = [];
    if (a.price <= 0) out.push({ t: 'w', msg: 'Producto sin precio de venta definido.' });
    if (a.price > 0 && a.margin < S.db.config.profitTargetLow) out.push({ t: 'd', msg: `Margen ${fmt.pct(a.margin)} por debajo del objetivo (${S.db.config.profitTargetLow}%).` });
    if (a.price > 0 && a.price < a.repoCost) out.push({ t: 'd', msg: 'El precio no cubre el costo de reposición.' });
    if (a.profitUnit < 0) out.push({ t: 'd', msg: 'Precio por debajo del costo real: vende con pérdida.' });
    return out;
  }

  global.Finance = {
    fmt, toUSD, equivalents, movementUSD, productCosts, priceByMarkup, priceByMargin,
    marginOf, markupOf, productAnalysis, saleAnalysis, batchAnalysis,
    distributeFunds, summary, rangeFromKey, rangeFromKey, filterByRange,
    productRankings, supplierRankings, simulate, priceAlerts,
  };
})(window);
