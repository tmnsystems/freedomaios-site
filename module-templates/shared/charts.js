/* ============================================================
   FreedomAIOS Chart Components — charts.js
   Location: module-templates/shared/charts.js
   Self-contained inline SVG charts. No external dependencies,
   no CDNs — safe to embed in GoHighLevel or open from file://.

   Usage: place an element with a chart type and a JSON config:

     <div class="fchart" data-chart="bar" data-config='{...}'></div>

   Types:
     "bar"   { labels:[...], series:[{name, values:[...]}], ymax?, compact? }
     "line"  { labels:[...], series:[{name, values:[...]}], ymax?, compact? }
     "donut" progress: { value, total, center, sub, legend?, compact? }
             segments: { segments:[{name, value}], center, sub, compact? }
     "stat"  { value, label:[lines...], delta?, tone?: good|warn|bad }

   Any type accepts "compact": true for dense multi-across grids:
   smaller geometry, smaller labels (styled via .fchart-compact in
   shared/theme.css).

   All colors come from shared/theme.css classes (fchart-series-1..4),
   so charts follow the light/dark theme automatically.
   ============================================================ */

(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
      }
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function svgText(parent, x, y, content, cls, anchor) {
    var t = el('text', { x: x, y: y, 'class': cls, 'text-anchor': anchor || 'middle' }, parent);
    t.textContent = content;
    return t;
  }

  function niceCeil(v) {
    if (v <= 0) return 1;
    var pow = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / pow;
    var f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return f * pow;
  }

  function seriesClass(i) {
    return 'fchart-series-' + ((i % 4) + 1);
  }

  function addLegend(host, names) {
    if (!names || !names.length) return;
    var div = document.createElement('div');
    div.className = 'fchart-legend';
    names.forEach(function (name, i) {
      var item = document.createElement('span');
      var sw = document.createElement('span');
      sw.className = 'swatch ' + seriesClass(i);
      item.appendChild(sw);
      item.appendChild(document.createTextNode(name));
      div.appendChild(item);
    });
    host.appendChild(div);
  }

  /* Shared axis scaffold for bar and line charts.
     Returns geometry plus the svg node. */
  function axes(host, cfg, maxV) {
    var compact = !!cfg.compact;
    var W = 640, H = compact ? 250 : 340;
    var m = compact ? { t: 20, r: 10, b: 38, l: 38 } : { t: 26, r: 14, b: 46, l: 46 };
    var yMax = cfg.ymax || niceCeil(maxV * 1.15);
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H }, host);
    var plotW = W - m.l - m.r;
    var plotH = H - m.t - m.b;
    var ticks = 4;
    for (var i = 0; i <= ticks; i++) {
      var y = m.t + plotH - (plotH * i / ticks);
      el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, 'class': 'fchart-grid' }, svg);
      svgText(svg, m.l - 8, y + 4, String(Math.round(yMax * i / ticks)), 'fchart-text', 'end');
    }
    el('line', {
      x1: m.l, x2: W - m.r,
      y1: m.t + plotH, y2: m.t + plotH,
      'class': 'fchart-axis'
    }, svg);
    return { svg: svg, W: W, H: H, m: m, plotW: plotW, plotH: plotH, yMax: yMax };
  }

  function maxOf(series) {
    var maxV = 0;
    series.forEach(function (s) {
      (s.values || []).forEach(function (v) { if (v > maxV) maxV = v; });
    });
    return maxV;
  }

  /* ---------- BAR CHART ---------- */

  function renderBar(host, cfg) {
    var labels = cfg.labels || [];
    var series = cfg.series || [];
    if (!labels.length || !series.length) return;
    var g = axes(host, cfg, maxOf(series));
    var n = labels.length;
    var groupW = g.plotW / n;
    var barW = Math.min(28, (groupW * 0.62) / series.length);
    var showValues = series.length * n <= 14;

    series.forEach(function (s, si) {
      (s.values || []).forEach(function (v, li) {
        var cx = g.m.l + groupW * li + groupW / 2;
        var x = cx - (barW * series.length) / 2 + si * barW;
        var h = g.plotH * (v / g.yMax);
        el('rect', {
          x: x.toFixed(1),
          y: (g.m.t + g.plotH - h).toFixed(1),
          width: (barW - 3).toFixed(1),
          height: h.toFixed(1),
          rx: 2,
          'class': seriesClass(si)
        }, g.svg);
        if (showValues) {
          svgText(g.svg, x + (barW - 3) / 2, g.m.t + g.plotH - h - 5, String(v), 'fchart-value');
        }
      });
    });

    labels.forEach(function (lab, li) {
      var cx = g.m.l + groupW * li + groupW / 2;
      svgText(g.svg, cx, g.H - g.m.b + 20, lab, 'fchart-text');
    });

    addLegend(host, series.map(function (s) { return s.name; }));
  }

  /* ---------- LINE / TREND CHART ---------- */

  function renderLine(host, cfg) {
    var labels = cfg.labels || [];
    var series = cfg.series || [];
    if (!labels.length || !series.length) return;
    var g = axes(host, cfg, maxOf(series));
    var n = labels.length;
    var step = g.plotW / Math.max(n - 1, 1);
    var showValues = series.length === 1 && n <= 10;

    series.forEach(function (s, si) {
      var pts = (s.values || []).map(function (v, li) {
        return [
          g.m.l + step * li,
          g.m.t + g.plotH - g.plotH * (v / g.yMax)
        ];
      });
      var ptsAttr = pts.map(function (p) {
        return p[0].toFixed(1) + ',' + p[1].toFixed(1);
      }).join(' ');

      if (series.length === 1) {
        var areaPts = ptsAttr + ' ' +
          (g.m.l + step * (n - 1)).toFixed(1) + ',' + (g.m.t + g.plotH) + ' ' +
          g.m.l.toFixed(1) + ',' + (g.m.t + g.plotH);
        el('polygon', { points: areaPts, 'class': 'fchart-area ' + seriesClass(si) }, g.svg);
      }

      el('polyline', { points: ptsAttr, 'class': 'fchart-line ' + seriesClass(si) }, g.svg);

      pts.forEach(function (p, li) {
        el('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 4, 'class': 'fchart-point ' + seriesClass(si) }, g.svg);
        if (showValues) {
          svgText(g.svg, p[0], p[1] - 10, String(s.values[li]), 'fchart-value');
        }
      });
    });

    labels.forEach(function (lab, li) {
      svgText(g.svg, g.m.l + step * li, g.H - g.m.b + 20, lab, 'fchart-text');
    });

    addLegend(host, series.map(function (s) { return s.name; }));
  }

  /* ---------- DONUT / PROGRESS RING ---------- */

  function renderDonut(host, cfg) {
    var compact = !!cfg.compact;
    var size = compact ? 170 : 240;
    var c = size / 2;
    var r = compact ? 58 : 82;
    var sw = compact ? 22 : 30;
    var C = 2 * Math.PI * r;
    var svg = el('svg', { viewBox: '0 0 ' + size + ' ' + size }, host);

    el('circle', {
      cx: c, cy: c, r: r,
      'stroke-width': sw,
      'class': 'fchart-donut-track'
    }, svg);

    var group = el('g', { transform: 'rotate(-90 ' + c + ' ' + c + ')' }, svg);
    var legendNames = [];
    var offset = 0;

    if (cfg.segments && cfg.segments.length) {
      var total = 0;
      cfg.segments.forEach(function (s) { total += s.value; });
      if (total > 0) {
        cfg.segments.forEach(function (s, i) {
          var len = C * (s.value / total);
          el('circle', {
            cx: c, cy: c, r: r,
            'stroke-width': sw,
            'stroke-dasharray': len.toFixed(2) + ' ' + (C - len).toFixed(2),
            'stroke-dashoffset': (-offset).toFixed(2),
            'class': 'fchart-donut-seg ' + seriesClass(i)
          }, group);
          offset += len;
          legendNames.push(s.name + ' (' + s.value + ')');
        });
      }
    } else {
      var frac = cfg.total > 0 ? Math.min(cfg.value / cfg.total, 1) : 0;
      el('circle', {
        cx: c, cy: c, r: r,
        'stroke-width': sw,
        'stroke-linecap': 'round',
        'stroke-dasharray': (C * frac).toFixed(2) + ' ' + (C * (1 - frac)).toFixed(2),
        'class': 'fchart-donut-seg ' + seriesClass(0)
      }, group);
      if (cfg.legend) legendNames = cfg.legend;
    }

    if (cfg.center !== undefined) {
      svgText(svg, c, c + (compact ? 4 : 6), String(cfg.center), 'fchart-center-big');
    }
    if (cfg.sub) {
      svgText(svg, c, c + (compact ? 20 : 28), cfg.sub, 'fchart-center-sub');
    }

    addLegend(host, legendNames);
  }

  /* ---------- BIG STAT NUMBER WITH DELTA ---------- */

  function renderStat(host, cfg) {
    var num = document.createElement('p');
    num.className = 'big-number' + (cfg.tone ? ' status-' + cfg.tone : '');
    num.textContent = cfg.value;
    host.appendChild(num);

    var label = document.createElement('p');
    label.className = 'big-number-label';
    var lines = Array.isArray(cfg.label) ? cfg.label : [cfg.label || ''];
    lines.forEach(function (line, i) {
      if (i > 0) label.appendChild(document.createElement('br'));
      label.appendChild(document.createTextNode(line));
    });
    if (cfg.delta) {
      var d = document.createElement('span');
      d.className = 'stat-delta' + (cfg.deltaTone ? ' status-' + cfg.deltaTone : ' text-muted');
      d.textContent = cfg.delta;
      label.appendChild(d);
    }
    host.appendChild(label);
  }

  /* ---------- BOOTSTRAP ---------- */

  var renderers = { bar: renderBar, line: renderLine, donut: renderDonut, stat: renderStat };

  function init() {
    var nodes = document.querySelectorAll('[data-chart]');
    for (var i = 0; i < nodes.length; i++) {
      var host = nodes[i];
      var type = host.getAttribute('data-chart');
      var render = renderers[type];
      if (!render) continue;
      var cfg = {};
      try {
        cfg = JSON.parse(host.getAttribute('data-config') || '{}');
      } catch (err) {
        if (window.console && console.warn) {
          console.warn('charts.js: bad data-config JSON on a "' + type + '" chart', err);
        }
        continue;
      }
      if (cfg.compact) host.classList.add('fchart-compact');
      render(host, cfg);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
