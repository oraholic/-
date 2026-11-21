'use strict';

/* ============================================================
   오라홀릭 예약 확정서 — confirmation.js
   순수 Canvas 2D로 그리는 오프라인 확정서 (외부 CDN/폰트 없음)
   ============================================================ */

(function () {
  const W = 900;
  const H = 1780;
  const NAVY = '#0f2744';
  const NAVY_SOFT = '#1d3b5e';
  const LINE = '#d7e3f2';
  const PANEL = '#f3f7fc';
  const HEAD = '#e8f1fb';
  const INK = '#1b2430';
  const SUB = '#5b6b80';
  const MUTED = '#8a97a8';
  const RED = '#d93a2b';
  const BLUE = '#2f6fb5';
  const GREEN = '#1f7a4d';

  const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR","NanumGothic","Noto Sans CJK KR",sans-serif';
  const HAND = '"Segoe Script","Bradley Hand","Snell Roundhand","Apple SD Gothic Neo",cursive';

  const DOW = ['일', '월', '화', '수', '목', '금', '토'];

  /* ---------- 날짜/금액 ---------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function parse(s) { const p = String(s || '').split('-').map(Number); return new Date(p[0], (p[1] || 1) - 1, p[2] || 1); }
  function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function dots(s) { const d = parse(s); return d.getFullYear() + '. ' + pad2(d.getMonth() + 1) + '. ' + pad2(d.getDate()); }
  function dotsDow(s, time) {
    const d = parse(s);
    return dots(s) + ' (' + DOW[d.getDay()] + ') ' + (time || '');
  }
  function nights(ci, co) { if (!ci || !co) return 0; return Math.max(0, Math.round((parse(co) - parse(ci)) / 86400000)); }
  function money(n) { return '₩ ' + Number(n || 0).toLocaleString('en-US'); }

  /* ---------- 모델 ---------- */
  function buildModel(booking, overrides) {
    const b = booking || {};
    const o = overrides || {};
    const h = (window.__GH && window.__GH.HOUSES || []).find((x) => x.id === b.house) || { name: (b.house || 'A') + '하우스', rooms: 3, baseGuests: 6 };
    const ci = o.start || b.checkIn || new Date().toISOString().slice(0, 10);
    const co = o.end || b.checkOut || ci;
    const n = nights(ci, co);
    const people = Math.max(1, Number(b.baseGuests || h.baseGuests) + Number(b.extraGuests || 0));
    const guestName = o.guestName != null ? o.guestName : (b.guestName || '');
    const payer = o.payer != null ? o.payer : (b.payer || '');
    const guestsLine = o.guestsLine != null ? o.guestsLine : (function () {
      const names = String((o.guestNames != null ? o.guestNames : b.guestNames) || '')
        .split(/[,、\n]/).map((x) => x.trim()).filter(Boolean);
      const lead = guestName || names[0] || '';
      let rest;
      if (!names.length) rest = [];
      else if (guestName && names.indexOf(guestName) >= 0) rest = names.filter((n) => n !== guestName);
      else rest = names.slice(1);
      if (rest.length) return lead + ' 외 ' + rest.length + '인';
      if (lead && people > 1) return lead + ' 외 ' + (people - 1) + '인';
      if (lead) return lead;
      return people > 1 ? '총 ' + people + '인' : '';
    })();
    const companions = o.companions != null ? o.companions : (function () {
      const names = String(b.guestNames || '').split(/[,、\n]/).map((x) => x.trim()).filter(Boolean);
      if (!names.length) return '';
      if (guestName && names.indexOf(guestName) >= 0) return names.filter((n) => n !== guestName).join(', ');
      return names.slice(1).join(', ');
    })();
    const stayAmt = o.stayAmount != null ? Number(o.stayAmount) : Number(b.totalAmount || 0);
    const ateAmt = Number(o.ateAmount || 0);
    const pickupAmt = Number(o.pickupAmount || 0);
    const etcAmt = Number(o.etcAmount || 0);
    const sum = stayAmt + ateAmt + pickupAmt + etcAmt;
    const total = o.total != null ? Number(o.total) : sum;
    const ad = b.addons || {};
    return {
      guestName: guestName,
      payer: payer,
      guestLine: guestName + (payer ? ' (' + '입금자: ' + payer + ')' : ''),
      guestsLine: guestsLine,
      companions: companions,
      startISO: ci,
      endISO: co,
      stayLine: dots(ci) + '  ~  ' + dots(co),
      staySub: '(총 ' + n + '박 ' + (n + 1) + '일)',
      season: o.season || '성수기',
      room: o.room != null ? o.room : (h.name + ' (' + h.rooms + '룸)'),
      roomsLabel: (o.roomsLabel || (h.rooms + '룸')),
      status: o.status || '예약확정',
      total: total,
      airline: o.airline != null ? o.airline : [b.airline, b.flightNo].filter(Boolean).join(' '),
      arrive: o.arrive != null ? o.arrive : (b.arriveDate ? dotsDow(b.arriveDate, b.arriveTime) : dotsDow(ci, b.checkInTime || '15:00')),
      depart: o.depart != null ? o.depart : (b.departDate ? dotsDow(b.departDate, b.departTime) : dotsDow(co, b.checkOutTime || '11:00')),
      stayAmount: stayAmt,
      ateAmount: ateAmt,
      pickupAmount: pickupAmt,
      etcAmount: etcAmt,
      sumAmount: sum,
      nights: n,
      addonDetail: {
        mattress: o.mattressDetail != null ? o.mattressDetail : (Number(b.mattress || 0) > 0 ? '×' + b.mattress : ''),
        setting: o.settingDetail != null ? o.settingDetail : (ad.tutor ? '튜터' : ad.babysitter ? '베이비시터' : ''),
        pickup: o.pickupDetail != null ? o.pickupDetail : (b.pickup ? '픽업' : b.dropoff ? '샌딩' : (b.pickup && b.dropoff ? '픽업·샌딩' : '')),
        ate: o.ateDetail != null ? o.ateDetail : (ad.ate ? (ad.ateName ? ad.ateName : '신청') : '')
      }
    };
  }

  function filenameFor(model) {
    const name = String(model.guestName || '예약자').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '').replace(/\(.*?\)/g, '').trim() || '예약자';
    return name + String(model.startISO || '').replace(/-/g, '.') + '.png';
  }

  /* ---------- 그리기 유틸 ---------- */
  function rr(ctx, x, y, w, h, r) {
    const rad = Math.min(r || 0, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }
  function box(ctx, x, y, w, h, r, fill, stroke, sw) {
    rr(ctx, x, y, w, h, r || 0);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw || 1; ctx.stroke(); }
  }
  function setFont(ctx, size, weight, family) {
    ctx.font = (weight || 400) + ' ' + size + 'px ' + (family || FONT);
  }
  function text(ctx, str, x, y, opt) {
    const o = opt || {};
    setFont(ctx, o.size || 15, o.weight || 400, o.family);
    ctx.fillStyle = o.color || INK;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'alphabetic';
    if (o.spacing && ctx.letterSpacing !== undefined) {
      try { ctx.letterSpacing = o.spacing + 'px'; } catch (e) {}
    }
    ctx.fillText(String(str == null ? '' : str), x, y);
    if (o.spacing && ctx.letterSpacing !== undefined) {
      try { ctx.letterSpacing = '0px'; } catch (e) {}
    }
  }
  function wrap(ctx, str, maxW, size, weight) {
    setFont(ctx, size, weight || 400);
    const words = String(str || '').split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach((w) => {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
      else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }
  function chunkNames(ctx, str, maxW, size) {
    setFont(ctx, size, 500);
    const parts = String(str || '').split(',').map((s) => s.trim()).filter(Boolean);
    const lines = [];
    let line = '';
    parts.forEach((p) => {
      const t = line ? line + ', ' + p : p;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = p; }
      else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }
  function wrapText(ctx, str, x, y, maxW, opt) {
    const o = opt || {};
    const size = o.size || 13;
    const lh = o.lh || size * 1.55;
    const lines = wrap(ctx, str, maxW, size, o.weight);
    lines.forEach((ln, i) => text(ctx, ln, x, y + i * lh, Object.assign({}, o, { size: size })));
    return lines.length;
  }
  function line(ctx, x1, y1, x2, y2, color, w) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = w || 1; ctx.stroke();
  }
  function dashed(ctx, x1, y, x2, color) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    line(ctx, x1, y, x2, y, color, 1);
    ctx.restore();
  }

  /* ---------- 아이콘 (외부 폰트 없이 직접 그림) ---------- */
  function icon(ctx, kind, cx, cy, color, scale) {
    const s = scale || 1;
    ctx.save();
    ctx.strokeStyle = color || '#3d5a80';
    ctx.fillStyle = color || '#3d5a80';
    ctx.lineWidth = 1.7 * s;
    ctx.lineCap = 'round';
    const dot = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    if (kind === 'person') {
      dot(cx, cy - 6 * s, 3.6 * s);
      ctx.beginPath(); ctx.arc(cx, cy + 9 * s, 8 * s, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
    } else if (kind === 'people') {
      dot(cx - 3 * s, cy - 6 * s, 3.2 * s);
      dot(cx + 6 * s, cy - 5 * s, 2.8 * s);
      ctx.beginPath(); ctx.arc(cx - 3 * s, cy + 9 * s, 7 * s, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 6 * s, cy + 9 * s, 6 * s, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    } else if (kind === 'calendar') {
      box(ctx, cx - 8 * s, cy - 8 * s, 16 * s, 16 * s, 2.5 * s, null, color, 1.6 * s);
      line(ctx, cx - 8 * s, cy - 3 * s, cx + 8 * s, cy - 3 * s, color, 1.5 * s);
      dot(cx - 4 * s, cy + 2 * s, 1.4 * s); dot(cx + 2 * s, cy + 2 * s, 1.4 * s);
      line(ctx, cx - 4 * s, cy - 11 * s, cx - 4 * s, cy - 7 * s, color, 1.5 * s);
      line(ctx, cx + 4 * s, cy - 11 * s, cx + 4 * s, cy - 7 * s, color, 1.5 * s);
    } else if (kind === 'tag') {
      ctx.beginPath();
      ctx.moveTo(cx - 8 * s, cy - 8 * s);
      ctx.lineTo(cx + 1 * s, cy - 8 * s);
      ctx.lineTo(cx + 8 * s, cy);
      ctx.lineTo(cx, cy + 8 * s);
      ctx.lineTo(cx - 8 * s, cy);
      ctx.closePath(); ctx.stroke();
      dot(cx - 3 * s, cy - 3 * s, 1.5 * s);
    } else if (kind === 'house') {
      ctx.beginPath();
      ctx.moveTo(cx - 9 * s, cy - 1 * s); ctx.lineTo(cx, cy - 9 * s); ctx.lineTo(cx + 9 * s, cy - 1 * s);
      ctx.stroke();
      ctx.strokeRect(cx - 7 * s, cy - 1 * s, 14 * s, 9 * s);
      ctx.fillRect(cx - 2 * s, cy + 4 * s, 3 * s, 4 * s);
    } else if (kind === 'check') {
      ctx.beginPath(); ctx.arc(cx, cy, 8 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 4 * s, cy); ctx.lineTo(cx - 1 * s, cy + 3 * s); ctx.lineTo(cx + 4.5 * s, cy - 3.5 * s); ctx.stroke();
    } else if (kind === 'won') {
      ctx.font = '700 ' + 17 * s + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('₩', cx, cy + 0.5 * s);
    } else if (kind === 'plane') {
      ctx.beginPath();
      ctx.moveTo(cx - 9 * s, cy + 2 * s);
      ctx.lineTo(cx + 8 * s, cy - 5 * s);
      ctx.lineTo(cx + 1 * s, cy + 6 * s);
      ctx.lineTo(cx - 1 * s, cy + 1 * s);
      ctx.closePath(); ctx.stroke();
      line(ctx, cx - 1 * s, cy + 1 * s, cx + 4 * s, cy + 1.5 * s, color, 1.3 * s);
    } else if (kind === 'gift') {
      box(ctx, cx - 9 * s, cy - 3 * s, 18 * s, 12 * s, 2 * s, null, color, 1.5 * s);
      line(ctx, cx, cy - 3 * s, cx, cy + 9 * s, color, 1.4 * s);
      line(ctx, cx - 9 * s, cy + 1 * s, cx + 9 * s, cy + 1 * s, color, 1.4 * s);
      ctx.beginPath(); ctx.arc(cx - 4 * s, cy - 6 * s, 3 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 4 * s, cy - 6 * s, 3 * s, 0, Math.PI * 2); ctx.stroke();
    } else if (kind === 'clipboard') {
      box(ctx, cx - 8 * s, cy - 9 * s, 16 * s, 19 * s, 2.5 * s, null, color, 1.5 * s);
      box(ctx, cx - 4 * s, cy - 12 * s, 8 * s, 5 * s, 1.5 * s, '#ffffff', color, 1.4 * s);
      line(ctx, cx - 4 * s, cy - 1 * s, cx + 4 * s, cy - 1 * s, color, 1.3 * s);
      line(ctx, cx - 4 * s, cy + 3 * s, cx + 2 * s, cy + 3 * s, color, 1.3 * s);
    }
    ctx.restore();
  }

  /* ---------- 헤더 장식 ---------- */
  function leaf(ctx, x, y, len, angle, color, flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const dir = flip ? -1 : 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(dir * len * 0.5, -len * 0.18, dir * len, 0);
    ctx.stroke();
    for (let i = 1; i <= 6; i++) {
      const t = i / 7;
      const px = dir * len * t;
      const py = -Math.sin(t * Math.PI) * len * 0.1;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + dir * len * 0.07, py - len * 0.13, px + dir * len * 0.16, py - len * 0.16);
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + dir * len * 0.07, py + len * 0.13, px + dir * len * 0.16, py + len * 0.16);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  }

  function logo(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 2.4;
    // palm trunk
    ctx.beginPath();
    ctx.moveTo(0, 34); ctx.quadraticCurveTo(-2, 12, -6, 0);
    ctx.stroke();
    // fronds
    [[-6, 0, -26, -8], [-6, 0, -18, -20], [-6, 0, 6, -22], [-6, 0, 18, -10]].forEach((f) => {
      ctx.beginPath();
      ctx.moveTo(f[0], f[1]);
      ctx.quadraticCurveTo((f[0] + f[2]) / 2, (f[1] + f[3]) / 2 - 4, f[2], f[3]);
      ctx.stroke();
    });
    // house
    ctx.beginPath();
    ctx.moveTo(-30, 40); ctx.lineTo(-12, 22); ctx.lineTo(6, 40);
    ctx.stroke();
    ctx.strokeRect(-27, 40, 30, 20);
    ctx.fillRect(-18, 46, 7, 14);
    // sun
    ctx.beginPath(); ctx.arc(16, 18, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function houseArt(ctx, x, y, w, h) {
    ctx.save();
    ctx.translate(x, y);
    // ground
    ctx.fillStyle = '#e7f0f7';
    rr(ctx, 0, h - 12, w, 12, 6); ctx.fill();
    // house body
    ctx.fillStyle = '#e9eef6';
    rr(ctx, w * 0.18, h * 0.42, w * 0.5, h * 0.44, 4); ctx.fill();
    // roof
    ctx.fillStyle = NAVY_SOFT;
    ctx.beginPath();
    ctx.moveTo(w * 0.12, h * 0.44);
    ctx.lineTo(w * 0.43, h * 0.13);
    ctx.lineTo(w * 0.74, h * 0.44);
    ctx.closePath(); ctx.fill();
    // door/windows
    ctx.fillStyle = NAVY;
    rr(ctx, w * 0.39, h * 0.62, w * 0.1, h * 0.24, 2); ctx.fill();
    ctx.fillStyle = '#bcd3ea';
    rr(ctx, w * 0.23, h * 0.55, w * 0.1, h * 0.1, 2); ctx.fill();
    rr(ctx, w * 0.53, h * 0.55, w * 0.1, h * 0.1, 2); ctx.fill();
    // palm
    ctx.strokeStyle = '#5d7a52';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w * 0.79, h * 0.88);
    ctx.quadraticCurveTo(w * 0.83, h * 0.5, w * 0.86, h * 0.36);
    ctx.stroke();
    ctx.fillStyle = '#6f9a5e';
    [[-1, -0.12], [-0.75, 0.03], [-0.35, -0.02], [0.2, -0.1]].forEach((d) => {
      ctx.beginPath();
      ctx.ellipse(w * 0.86 + d[0] * w * 0.1, h * 0.36 + d[1] * h, w * 0.11, h * 0.035, d[0], 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  /* ---------- 표 ---------- */
  function infoRow(ctx, x, y, w, h, labelW, iconKind, label, lines) {
    box(ctx, x, y, w, h, 0, '#ffffff');
    box(ctx, x, y, labelW, h, 0, PANEL);
    icon(ctx, iconKind, x + 22, y + h / 2, '#3d5a80', 1);
    text(ctx, label, x + 42, y + h / 2 + 5, { size: 14.5, weight: 700, color: '#33465c' });
    const gaps = lines.map((l) => l.gap || 20);
    const total = gaps.reduce((a, b) => a + b, 0);
    let ly = y + h / 2 - total / 2 + 14;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + labelW + 4, y + 2, w - labelW - 10, h - 4);
    ctx.clip();
    lines.forEach((ln, i) => {
      text(ctx, ln.t, x + labelW + 16, ly, { size: ln.size || 15.5, weight: ln.weight || 600, color: ln.color || INK });
      ly += gaps[i];
    });
    ctx.restore();
    line(ctx, x, y, x + w, y, LINE, 1);
    line(ctx, x, y + h, x + w, y + h, LINE, 1);
  }

  function table(ctx, x, y, w, cols, head, rows, opt) {
    const o = opt || {};
    const headH = o.headH || 30;
    let cy = y;
    if (head) {
      box(ctx, x, cy, w, headH, 0, NAVY);
      text(ctx, head, x + w / 2, cy + headH / 2 + 5, { size: 14.5, weight: 800, color: '#fff', align: 'center' });
      cy += headH;
    }
    // column header
    box(ctx, x, cy, w, 30, 0, HEAD);
    let cx = x;
    cols.forEach((c) => {
      text(ctx, c.label, cx + c.w / 2, cy + 20, { size: 12.5, weight: 800, color: '#28415c', align: 'center' });
      line(ctx, cx, cy, cx, cy + 30, LINE);
      cx += c.w;
    });
    line(ctx, x, cy + 30, x + w, cy + 30, LINE);
    cy += 30;
    rows.forEach((row) => {
      const rh = row.h || o.rowH || 42;
      box(ctx, x, cy, w, rh, 0, row.bg || '#fff');
      let rx = x;
      row.cells.forEach((cell, i) => {
        const cw = cols[i].w;
        const val = typeof cell === 'string' ? cell : (cell && cell.t != null ? cell.t : '');
        const copt = typeof cell === 'string' ? {} : (cell || {});
        if (copt.multi) {
          val.split('\n').forEach((ln, k) => {
            text(ctx, ln, rx + cw / 2, cy + rh / 2 - 6 + k * 16, {
              size: copt.size || 12.5, weight: copt.weight || 600,
              color: copt.colors && copt.colors[k] ? copt.colors[k] : (copt.color || INK), align: 'center'
            });
          });
        } else {
          text(ctx, val, rx + cw / 2, cy + rh / 2 + 5, {
            size: copt.size || 12.8, weight: copt.weight || 600,
            color: copt.color || INK, align: copt.align || 'center'
          });
        }
        line(ctx, rx, cy, rx, cy + rh, LINE);
        rx += cw;
      });
      line(ctx, x, cy + rh, x + w, cy + rh, LINE);
      cy += rh;
    });
    // outer
    ctx.strokeStyle = LINE; ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, cy - y);
    return cy;
  }

  /* ---------- 렌더 ---------- */
  function render(ctx, m, scale, height) {
    const S = scale || 2;
    const HT = height || 2000;
    const canvas = ctx.canvas;
    canvas.width = W * S;
    canvas.height = HT * S;
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.clearRect(0, 0, W, HT);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, HT);

    /* 헤더 */
    box(ctx, 20, 16, W - 40, 142, 16, NAVY);
    ctx.save();
    ctx.globalAlpha = 0.25;
    leaf(ctx, 55, 96, 120, 0, '#b9cbe2', false);
    leaf(ctx, W - 55, 96, 120, 0, '#b9cbe2', true);
    ctx.restore();
    logo(ctx, 278, 50, 1);
    text(ctx, 'ORAHOLIC', 344, 94, { size: 50, weight: 800, color: '#fff', spacing: 1 });
    text(ctx, 'Reservation Confirmation', 344, 122, { size: 19, weight: 500, color: '#c9d8ea', spacing: 3.2 });

    /* 좌측 정보 표 */
    const LX = 36, LW = 552, LABW = 150;
    let ly = 186;
    const nameLines = m.companions ? chunkNames(ctx, m.companions, LW - LABW - 34, 12.6) : [];
    const guestLines = [{ t: m.guestsLine, size: 15.5, weight: 600 }];
    nameLines.forEach((ln, i) => guestLines.push({
      t: (i === 0 ? '(' : ' ') + ln + (i === nameLines.length - 1 ? ')' : ''),
      size: 12.6, weight: 500, color: SUB, gap: 17
    }));
    const guestRowH = Math.max(58, 24 + guestLines.length * 19);
    const rows = [
      { icon: 'person', label: '예약자', h: m.payer ? 62 : 52, lines: [{ t: m.guestLine, size: 15.5, weight: 600 }] },
      { icon: 'people', label: '숙박인', h: guestRowH, lines: guestLines },
      { icon: 'calendar', label: '숙박기간', h: 64, lines: [{ t: m.stayLine, size: 15.5, weight: 600 }, { t: m.staySub, size: 14, weight: 700, color: RED, gap: 20 }] },
      { icon: 'tag', label: '시즌', h: 46, lines: [{ t: m.season, size: 15.5, weight: 600 }] },
      { icon: 'house', label: '객실', h: 50, lines: [{ t: m.room, size: 15.5, weight: 600 }] },
      { icon: 'check', label: '예약상태', h: 46, lines: [{ t: m.status, size: 15.5, weight: 700, color: GREEN }] },
      { icon: 'won', label: '총 금액', h: 66, lines: [{ t: money(m.total), size: 27, weight: 800 }, { t: '(상세 내역 확인)', size: 12, weight: 600, color: RED, gap: 18 }] }
    ];
    rows.forEach((r) => {
      infoRow(ctx, LX, ly, LW, r.h, LABW, r.icon, r.label, r.lines);
      ly += r.h;
    });
    ctx.strokeStyle = LINE; ctx.lineWidth = 1;
    ctx.strokeRect(LX, 186, LW, ly - 186);

    /* 항공편 박스 */
    let fy = ly + 14;
    box(ctx, LX, fy, LW, 128, 6, '#f7fbff', '#b9cfe8', 1.2);
    text(ctx, '추가 정보 (항공편)', LX + 14, fy + 24, { size: 14, weight: 800, color: '#28415c' });
    const flight = [['항공사', m.airline || '-'], ['세부 도착', m.arrive || '-'], ['세부 출발', m.depart || '-']];
    let fy2 = fy + 38;
    flight.forEach((f) => {
      icon(ctx, 'plane', LX + 24, fy2 + 6, '#3d5a80', 0.85);
      text(ctx, f[0], LX + 46, fy2 + 11, { size: 12.5, weight: 700, color: '#33465c' });
      text(ctx, f[1], LX + 128, fy2 + 11, { size: 12.8, weight: 600, color: INK });
      line(ctx, LX + 14, fy2 + 21, LX + LW - 14, fy2 + 21, '#e6eef8', 1);
      fy2 += 27;
    });
    text(ctx, '* 항공 일정은 변경 시 사전 연락 부탁드립니다.', LX + 14, fy + 118, { size: 11.5, weight: 700, color: RED });

    /* 우측 카드 */
    const RX = 604, RW = 260;
    let ry = 186;
    const cardH = 500;
    box(ctx, RX, ry, RW, cardH, 8, '#ffffff', LINE, 1.2);
    houseArt(ctx, RX + 55, ry + 20, 150, 118);
    const thanks = wrap(ctx, '오라홀릭을 선택해 주셔서 감사합니다.', RW - 40, 14, 600);
    thanks.forEach((t, i) => text(ctx, t, RX + RW / 2, ry + 172 + i * 21, { size: 14, weight: 600, color: '#23384f', align: 'center' }));
    dashed(ctx, RX + 18, ry + 210, RX + RW - 18, '#c9d8ea');
    text(ctx, '이용 안내', RX + RW / 2, ry + 238, { size: 15, weight: 800, color: '#1f3a56', align: 'center' });
    const rules = [
      '체크인/체크아웃 시간은 안내를 참고해 주세요.',
      '입실일 오후 3시 이후부터 입실 가능하며, 퇴실일 오전 11시까지 퇴실해주세요.',
      '당일 출입은 등록된 인원만 가능합니다.',
      '파손·분실 시 세부 비용이 청구될 수 있으며, 분실 시 재구매 비용이 청구됩니다.',
      '추가 서비스(아떼, 픽업/드랍, 룰/반찬 등)는 사전 신청 가능합니다.'
    ];
    let by = ry + 258;
    rules.forEach((r) => {
      icon(ctx, 'check', RX + 26, by + 5, '#2d6aa8', 0.62);
      const n = wrapText(ctx, r, RX + 40, by + 10, RW - 58, { size: 11.8, lh: 17, weight: 500, color: '#3f5168' });
      by += n * 17 + 12;
    });

    /* 1. 숙박 요금 안내 */
    let sy = Math.max(ly + 160, ry + cardH) + 26;
    text(ctx, '1. 숙박 요금 안내 (' + m.roomsLabel + ')', 36, sy, { size: 17, weight: 800, color: '#16283d' });
    sy += 14;
    const colW = [118, 96, 86, 114];
    const lowRows = [
      [{ t: '2주 미만' }, { t: '90,000' }, { t: '-' }, { t: '아떼 포함\n전기세 포함', multi: true }],
      [{ t: '2주 이상' }, { t: '72,000' }, { t: '20% 할인' }, { t: '아떼 포함\n전기세 포함', multi: true }],
      [{ t: '4주(29박 30일)' }, { t: '66,000' }, { t: '약 30% 할인' }, { t: '아떼 포함\n전기세 포함', multi: true, colors: [RED, RED] }]
    ];
    const highRows = [
      [{ t: '2주 미만' }, { t: '110,000' }, { t: '-' }, { t: '아떼 포함\n전기세 포함', multi: true }],
      [{ t: '2주 이상' }, { t: '88,000' }, { t: '약 20% 할인' }, { t: '아떼 포함\n전기세 포함', multi: true }],
      [{ t: '4주(29박 30일)' }, { t: '80,000' }, { t: '약 30% 할인' }, { t: '아떼 포함\n전기세 포함', multi: true }]
    ];
    const cols = [
      { label: '숙박 일수(박)', w: colW[0] }, { label: '1박 금액(원)', w: colW[1] },
      { label: '할인율', w: colW[2] }, { label: '비고', w: colW[3] }
    ];
    const t1 = ymdTable(ctx, 36, sy, 420, cols, '비수기 숙박 비용', lowRows, 64);
    const t2 = ymdTable(ctx, 474, sy, 420, cols, '성수기 숙박 비용', highRows, 64);
    sy = Math.max(t1, t2) + 16;
    text(ctx, '* 아떼; 집안일 도우미   |   * 1일 : 1~10일 숙박시 적용율 이상의 전기세부과', 36, sy, { size: 11.5, weight: 600, color: '#46586d' });
    sy += 22;

    /* 2. 이번 예약 금액 안내 */
    text(ctx, '2. 이번 예약 금액 안내', 36, sy + 14, { size: 17, weight: 800, color: '#16283d' });
    sy += 28;
    const moneyRows = [
      [{ t: '숙박기간', align: 'center' }, { t: m.stayLine + '\n(총 ' + m.nights + '박 ' + (m.nights + 1) + '일 / ' + m.season + ')', multi: true, size: 11.8, align: 'center' }, { t: money(m.stayAmount) }],
      [{ t: '객실' }, { t: m.room }, { t: '-' }],
      [{ t: '숙박 요금' }, { t: m.nights + '박 ' + (m.nights + 1) + '일' }, { t: money(m.stayAmount) }],
      [{ t: '아떼 추가 (선택)' }, { t: m.ateAmount ? money(m.ateAmount) : '-' }, { t: m.ateAmount ? money(m.ateAmount) : '-' }],
      [{ t: '픽업드랍 신청' }, { t: m.pickupAmount ? money(m.pickupAmount) : '-' }, { t: m.pickupAmount ? money(m.pickupAmount) : '-' }],
      [{ t: '총 금액', weight: 800 }, { t: '' }, { t: money(m.total), weight: 800 }]
    ];
    const mcols = [{ label: '구분', w: 120 }, { label: '내용', w: 250 }, { label: '금액', w: 150 }];
    const mEnd = table(ctx, 36, sy, 520, mcols, null, moneyRows.map((r, i) => ({ cells: r, h: i === 0 ? 50 : 34 })), {});
    // 추가 서비스 박스
    const ax = 572, aw = 322;
    let ah = 34 + 4 * 40 + 18;
    box(ctx, ax, sy, aw, ah, 6, '#f7fbff', '#b9cfe8', 1.2);
    text(ctx, '추가 서비스', ax + aw / 2, sy + 26, { size: 14.5, weight: 800, color: '#28415c', align: 'center' });
    icon(ctx, 'gift', ax + aw / 2 - 52, sy + 21, '#2d6aa8', 0.7);
    const addons = [
      ['추가 매트리스', m.addonDetail.mattress],
      ['세팅 / 튜터 / 베이비시터', m.addonDetail.setting],
      ['공항 픽드랍', m.addonDetail.pickup],
      ['아떼 서비스', m.addonDetail.ate]
    ];
    let ay = sy + 48;
    addons.forEach((a) => {
      line(ctx, ax + 14, ay + 8, ax + aw - 14, ay + 8, '#e6eef8', 1);
      text(ctx, a[0], ax + aw / 2, ay + 22, { size: 12.3, weight: 600, color: '#33465c', align: 'center' });
      if (a[1]) text(ctx, a[1], ax + aw - 18, ay + 22, { size: 11, weight: 700, color: BLUE, align: 'right' });
      ay += 40;
    });
    sy = Math.max(mEnd, sy + ah) + 22;

    /* 3. 양도 및 취소 규정 */
    text(ctx, '3. 양도 및 취소 규정', 36, sy + 14, { size: 17, weight: 800, color: '#16283d' });
    sy += 26;
    const leftRows = [
      [{ t: '양도 가능 여부' }, { t: '허용', color: '#1f7a4d', weight: 800 }],
      [{ t: '양도비' }, { t: '50,000원' }],
      [{ t: '무단 양도' }, { t: '예약자가 통보하지 않을 시\n양도로 2배, 양도비 부과', multi: true, size: 11.8 }]
    ];
    const rightRows = [
      [{ t: '취소시 기준' }, { t: '환불' }],
      [{ t: '체크인 7일 전까지 취소' }, { t: '50% 환불', color: '#1f7a4d', weight: 800 }],
      [{ t: '체크인 7일 이내' }, { t: '환불 불가', color: RED, weight: 800 }]
    ];
    const lEnd = table(ctx, 36, sy, 420, [{ label: '양도 규정', w: 140 }, { label: '내용', w: 280 }], '양도 규정', leftRows.map((r) => ({ cells: r, h: 42 })), {});
    const rEnd = table(ctx, 474, sy, 420, [{ label: '취소시 기준', w: 200 }, { label: '환불', w: 220 }], '취소 환불 규정', rightRows.map((r) => ({ cells: r, h: 42 })), {});
    sy = Math.max(lEnd, rEnd) + 20;
    text(ctx, '** 단, 프로모션으로 구매한 내용은 양도 및 취소 불가하며', 36, sy, { size: 11.5, weight: 700, color: RED });
    text(ctx, '취소에 따른 환불이 불가함을 알려드립니다.', 36, sy + 16, { size: 11.5, weight: 700, color: RED });
    sy += 36;

    /* 4. 입/퇴실 안내 */
    text(ctx, '4. 입/퇴실 안내', 36, sy + 14, { size: 17, weight: 800, color: '#16283d' });
    sy += 26;
    const ioRows = [
      [{ t: '체크인 시간' }, { t: '오후 3:00 이후' }, { t: '사전에 미리 연락 주시 체크인 불가' }],
      [{ t: '체크아웃 시간' }, { t: '오전 11:00까지' }, { t: '사전 연락 없이 늦은 체크아웃 불가' }],
      [{ t: '입/퇴실 안내' }, { t: '입실 안내를 참고해 주세요.' }, { t: '기 분실 시 재구매 비용 청구' }],
      [{ t: '추가 비용' }, { t: '추가 비용 발생' }, { t: '전기세, 수도, 서비스 항목 등' }]
    ];
    sy = table(ctx, 36, sy, 828, [{ label: '항목', w: 140 }, { label: '내용', w: 300 }, { label: '비고', w: 388 }], null, ioRows.map((r) => ({ cells: r, h: 34 })), {});
    sy += 12;

    /* 하단 마무리 */
    box(ctx, 36, sy, 828, 66, 6, '#f7fbff', '#b9cfe8', 1.2);
    icon(ctx, 'clipboard', 60, sy + 33, '#2d6aa8', 0.9);
    text(ctx, '위 내용 숙지 후 오라홀릭 숙박을 편안하게 즐기셨으면 좋겠습니다.', 84, sy + 26, { size: 12.8, weight: 600, color: '#33465c' });
    text(ctx, '문의사항이 있으시면 매트 언제든 연락처 연락주세요.', 84, sy + 46, { size: 12.8, weight: 600, color: '#33465c' });
    text(ctx, 'Thank you! ♥', 640, sy + 44, { size: 26, weight: 700, color: '#2f4a68', family: HAND });
    sy += 66;

    return sy;
  }

  function ymdTable(ctx, x, y, w, cols, head, rows, rowH) {
    return table(ctx, x, y, w, cols, head, rows.map((r) => ({ cells: r, h: rowH })), {});
  }

  function renderTo(canvas, model, scale) {
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return false;
    const S = scale || 2;
    // 1차: 넉넉한 높이로 그려 실제 필요한 높이를 구한다.
    const bottom = render(ctx, model, S, 2400);
    const height = Math.max(1200, Math.ceil(bottom + 28));
    // 2차: 실제 높이에 맞춰 다시 그린다.
    render(ctx, model, S, height);
    return true;
  }

  function toBlob(canvas) {
    return new Promise((resolve) => {
      if (canvas.toBlob) canvas.toBlob((b) => resolve(b), 'image/png');
      else resolve(null);
    });
  }

  window.ORA_CONFIRM = {
    W: W, H: H, buildModel: buildModel, filenameFor: filenameFor,
    renderTo: renderTo, render: render, toBlob: toBlob, money: money
  };
})();
