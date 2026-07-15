/* =========================================================
   components.js — UI helpers, gráficos SVG, modales, toasts
   ========================================================= */
(function (global) {
  'use strict';
  const F = global.Finance;

  // ---- DOM helpers ----
  const el = (sel, root = document) => root.querySelector(sel);
  const els = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Paleta para gráficos (coherente con la marca)
  const PALETTE = ['#C24E76', '#7C6BAF', '#2FA37C', '#E0952B', '#3E8FC9', '#D64550', '#B4779E', '#5CA9A0'];

  // ---------------------------------------------------------
  //  Toasts
  // ---------------------------------------------------------
  function toast(msg, type = '') {
    const root = el('#toast-root');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    root.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2600);
    setTimeout(() => t.remove(), 3000);
  }

  // ---------------------------------------------------------
  //  Modal
  // ---------------------------------------------------------
  function modal({ title, body, footer, size = '' }) {
    const root = el('#modal-root');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${size}">
        <div class="modal-head"><h3>${esc(title)}</h3><button class="modal-close" aria-label="Cerrar">×</button></div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
      </div>`;
    root.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.modal-close').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    return { overlay, close, el: (s) => overlay.querySelector(s), els: (s) => Array.from(overlay.querySelectorAll(s)) };
  }

  function confirm(msg, onYes, { danger = false, yes = 'Confirmar' } = {}) {
    const m = modal({
      title: 'Confirmar', size: 'sm',
      body: `<p style="margin:0">${esc(msg)}</p>`,
      footer: `<button class="btn btn-ghost" data-x>Cancelar</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-y>${esc(yes)}</button>`
    });
    m.el('[data-x]').onclick = m.close;
    m.el('[data-y]').onclick = () => { m.close(); onYes(); };
  }

  // ---------------------------------------------------------
  //  Métricas / tarjetas
  // ---------------------------------------------------------
  function metric({ label, value, sub, cls = '', badge = '', spark }) {
    return `<div class="metric card ${cls}">
      ${badge ? `<span class="m-badge">${badge}</span>` : ''}
      <div class="m-label">${esc(label)}</div>
      <div class="m-value">${value}</div>
      ${sub ? `<div class="m-sub">${sub}</div>` : ''}
      ${spark ? `<div class="spark">${spark}</div>` : ''}
    </div>`;
  }

  // ---------------------------------------------------------
  //  Gráficos SVG (sin librerías)
  // ---------------------------------------------------------
  function barChart(data, { height = 180, valueFmt = (v) => v, colorByIndex = false } = {}) {
    if (!data.length) return emptyChart();
    const max = Math.max(...data.map(d => d.value), 1);
    const w = 100 / data.length;
    const bars = data.map((d, i) => {
      const h = (d.value / max) * 78;
      const x = i * w + w * 0.18;
      const bw = w * 0.64;
      const color = colorByIndex ? PALETTE[i % PALETTE.length] : (d.color || PALETTE[0]);
      return `<g>
        <rect x="${x}" y="${88 - h}" width="${bw}" height="${h}" rx="1.6" fill="${color}"><title>${esc(d.label)}: ${valueFmt(d.value)}</title></rect>
        <text x="${x + bw / 2}" y="${86 - h - 1}" text-anchor="middle" font-size="3.4" fill="#8A8290">${valueFmt(d.value)}</text>
        <text x="${x + bw / 2}" y="97" text-anchor="middle" font-size="3.2" fill="#8A8290">${esc(trim(d.label, 10))}</text>
      </g>`;
    }).join('');
    return `<svg viewBox="0 0 100 100" class="chart-svg" style="max-height:${height}px" preserveAspectRatio="none">${bars}</svg>`;
  }

  function groupedBarChart(labels, series, { height = 200, valueFmt = (v) => v } = {}) {
    if (!labels.length) return emptyChart();
    const allVals = series.flatMap(s => s.data);
    const max = Math.max(...allVals, 1);
    const gW = 100 / labels.length;
    const n = series.length;
    let bars = '';
    labels.forEach((lb, i) => {
      series.forEach((s, j) => {
        const v = s.data[i] || 0;
        const h = (v / max) * 78;
        const bw = (gW * 0.7) / n;
        const x = i * gW + gW * 0.15 + j * bw;
        bars += `<rect x="${x}" y="${88 - h}" width="${bw * 0.9}" height="${h}" rx="1" fill="${s.color}"><title>${esc(s.name)} — ${esc(lb)}: ${valueFmt(v)}</title></rect>`;
      });
      bars += `<text x="${i * gW + gW / 2}" y="97" text-anchor="middle" font-size="3" fill="#8A8290">${esc(trim(lb, 9))}</text>`;
    });
    const legend = series.map(s => `<span class="lg-item"><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</span>`).join('');
    return `<svg viewBox="0 0 100 100" class="chart-svg" style="max-height:${height}px" preserveAspectRatio="none">${bars}</svg>
      <div class="legend">${legend}</div>`;
  }

  function lineChart(labels, series, { height = 200, valueFmt = (v) => v } = {}) {
    if (!labels.length) return emptyChart();
    const allVals = series.flatMap(s => s.data);
    const max = Math.max(...allVals, 1), min = Math.min(...allVals, 0);
    const rng = (max - min) || 1;
    const xStep = labels.length > 1 ? 92 / (labels.length - 1) : 0;
    const y = v => 88 - ((v - min) / rng) * 76;
    let paths = '';
    series.forEach(s => {
      const pts = s.data.map((v, i) => `${4 + i * xStep},${y(v)}`).join(' ');
      paths += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/>`;
      paths += s.data.map((v, i) => `<circle cx="${4 + i * xStep}" cy="${y(v)}" r="1.2" fill="${s.color}"><title>${esc(s.name)} ${esc(labels[i])}: ${valueFmt(v)}</title></circle>`).join('');
    });
    const xlabels = labels.map((lb, i) => `<text x="${4 + i * xStep}" y="97" text-anchor="middle" font-size="2.8" fill="#8A8290">${esc(trim(lb, 8))}</text>`).join('');
    const legend = series.map(s => `<span class="lg-item"><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</span>`).join('');
    return `<svg viewBox="0 0 100 100" class="chart-svg" style="max-height:${height}px" preserveAspectRatio="none">${paths}${xlabels}</svg>
      <div class="legend">${legend}</div>`;
  }

  function donutChart(data, { valueFmt = (v) => v } = {}) {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    let acc = 0; const R = 15.9, C = 2 * Math.PI * R;
    const segs = data.map((d, i) => {
      const frac = d.value / total;
      const dash = frac * C;
      const seg = `<circle cx="21" cy="21" r="${R}" fill="none" stroke="${d.color || PALETTE[i % PALETTE.length]}" stroke-width="6"
        stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-acc * C}" transform="rotate(-90 21 21)"><title>${esc(d.label)}: ${valueFmt(d.value)} (${Math.round(frac * 100)}%)</title></circle>`;
      acc += frac; return seg;
    }).join('');
    const legend = data.map((d, i) => `<span class="lg-item"><span class="dot" style="background:${d.color || PALETTE[i % PALETTE.length]}"></span>${esc(d.label)} · ${valueFmt(d.value)}</span>`).join('');
    return `<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <svg viewBox="0 0 42 42" style="width:130px;height:130px">${segs}
        <text x="21" y="20" text-anchor="middle" font-size="4" font-weight="700" fill="#2B2530">${valueFmt(total)}</text>
        <text x="21" y="25" text-anchor="middle" font-size="2.6" fill="#8A8290">Total</text>
      </svg>
      <div class="legend" style="flex-direction:column;gap:6px">${legend}</div></div>`;
  }

  function sparkline(values, color = '#C24E76') {
    if (!values || values.length < 2) return '';
    const max = Math.max(...values), min = Math.min(...values), rng = (max - min) || 1;
    const step = 100 / (values.length - 1);
    const pts = values.map((v, i) => `${i * step},${20 - ((v - min) / rng) * 18}`).join(' ');
    return `<svg viewBox="0 0 100 22" preserveAspectRatio="none" style="width:100%;height:26px"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function emptyChart() { return `<div class="empty small">Sin datos para mostrar</div>`; }
  function chartCard(title, sub, svg) {
    return `<div class="card chart-card"><h4>${esc(title)}</h4>${sub ? `<p class="c-sub">${esc(sub)}</p>` : ''}${svg}</div>`;
  }

  // ---------------------------------------------------------
  //  Tabla genérica
  // ---------------------------------------------------------
  function table(cols, rows, { rowAttr } = {}) {
    if (!rows.length) return `<div class="table-wrap"><div class="empty"><div class="big">📭</div>No hay registros todavía</div></div>`;
    const head = cols.map(c => `<th class="${c.num ? 'num' : ''}">${esc(c.label)}</th>`).join('');
    const body = rows.map(r => {
      const attr = rowAttr ? rowAttr(r) : '';
      const tds = cols.map(c => {
        const v = typeof c.get === 'function' ? c.get(r) : r[c.key];
        return `<td class="${c.num ? 'num' : ''}">${v == null ? '' : v}</td>`;
      }).join('');
      return `<tr ${attr}>${tds}</tr>`;
    }).join('');
    return `<div class="table-wrap"><table class="data"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function pill(text, cls) { return `<span class="pill ${cls}">${esc(text)}</span>`; }
  function statePill(state) {
    const map = { 'disponible': 'g', 'poco inventario': 'w', 'agotado': 'd', 'descontinuado': 'n' };
    return pill(state, map[state] || 'n');
  }

  // ---------------------------------------------------------
  //  Exportar CSV / abrir para imprimir a PDF
  // ---------------------------------------------------------
  function toCSV(cols, rows) {
    const head = cols.map(c => `"${c.label}"`).join(',');
    const lines = rows.map(r => cols.map(c => {
      let v = typeof c.raw === 'function' ? c.raw(r) : r[c.key];
      v = v == null ? '' : String(v).replace(/"/g, '""');
      return `"${v}"`;
    }).join(','));
    return head + '\n' + lines.join('\n');
  }
  function download(filename, content, mime = 'text/csv;charset=utf-8') {
    const blob = new Blob(['﻿' + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function printHTML(title, innerHTML) {
    const w = window.open('', '_blank');
    if (!w) { toast('Permite ventanas emergentes para exportar PDF', 'w'); return; }
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>body{font-family:Segoe UI,system-ui,sans-serif;color:#2B2530;padding:26px;max-width:900px;margin:auto}
      h1{color:#9B3D5E} table{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0}
      th,td{border:1px solid #ddd;padding:7px 9px;text-align:left} th{background:#F7E7EE}
      .k{color:#888} .metric{display:inline-block;border:1px solid #eee;border-radius:10px;padding:10px 14px;margin:4px}
      @media print{.noprint{display:none}}</style></head><body>${innerHTML}
      <p class="noprint" style="margin-top:20px"><button onclick="window.print()">Imprimir / Guardar PDF</button></p>
      </body></html>`);
    w.document.close();
  }

  // ---- utilidades ----
  function trim(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function quality(stars) { const n = Math.round(stars || 0); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }
  function avatar(name) { return (name || '?').trim().charAt(0).toUpperCase(); }

  global.UI = {
    el, els, esc, PALETTE, toast, modal, confirm, metric,
    barChart, groupedBarChart, lineChart, donutChart, sparkline, chartCard, emptyChart,
    table, pill, statePill, toCSV, download, printHTML, trim, quality, avatar,
  };
})(window);
