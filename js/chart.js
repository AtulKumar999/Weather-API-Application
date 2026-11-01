/**
 * SkyPulse Weather Application - Lightweight Canvas Chart Engine
 * High-performance, zero-dependency, retina-sharp chart for 24-hour forecast trends.
 */

class WeatherChart {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.data = [];
    this.options = {};
    this.hoverIndex = -1;
    this.resizeObserver = null;

    if (this.canvas) {
      this.initEvents();
    }
  }

  initEvents() {
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: true });
    this.canvas.addEventListener('touchend', () => this.handleMouseLeave());

    if (window.ResizeObserver && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.render();
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    }
  }

  setData(hourlyData, options = {}) {
    this.data = Array.isArray(hourlyData) ? hourlyData.slice(0, 24) : [];
    this.options = {
      isDark: document.documentElement.getAttribute('data-theme') !== 'light',
      tempUnit: options.tempUnit || '°C',
      ...options
    };
    this.render();
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    this.updateHoverFromX(x);
  }

  handleTouchMove(e) {
    if (!e.touches || !e.touches[0]) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    this.updateHoverFromX(x);
  }

  updateHoverFromX(x) {
    if (!this.data.length) return;
    const paddingX = 40;
    const width = this.canvas.clientWidth;
    const chartWidth = width - paddingX * 2;
    const stepX = chartWidth / (this.data.length - 1);

    const relativeX = Math.max(0, Math.min(width - paddingX, x - paddingX));
    const index = Math.round(relativeX / stepX);

    if (index >= 0 && index < this.data.length && index !== this.hoverIndex) {
      this.hoverIndex = index;
      this.render();
    }
  }

  handleMouseLeave() {
    if (this.hoverIndex !== -1) {
      this.hoverIndex = -1;
      this.render();
    }
  }

  render() {
    if (!this.canvas || !this.ctx || !this.data.length) return;

    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.clientWidth || 600;
    const height = this.canvas.clientHeight || 220;

    // Adjust canvas resolution for retina displays
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    const ctx = this.ctx;
    const data = this.data;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    // Styling constants
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const textBright = isDark ? '#f8fafc' : '#0f172a';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const primaryLine = '#38bdf8';
    const precipBarColor = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(37, 99, 235, 0.3)';

    // Layout
    const padTop = 35;
    const padBottom = 40;
    const padX = 35;
    const chartWidth = width - padX * 2;
    const chartHeight = height - padTop - padBottom;

    ctx.clearRect(0, 0, width, height);

    // Find min/max temperature for scaling
    const temps = data.map(d => d.temperature ?? 0);
    let minTemp = Math.floor(Math.min(...temps));
    let maxTemp = Math.ceil(Math.max(...temps));
    if (minTemp === maxTemp) {
      minTemp -= 2;
      maxTemp += 2;
    }
    const tempRange = maxTemp - minTemp;

    // Calculate (x, y) coordinates for each hourly point
    const points = data.map((d, i) => {
      const x = padX + (i / (data.length - 1)) * chartWidth;
      const normalizedTemp = (d.temperature - minTemp) / tempRange;
      const y = padTop + chartHeight - normalizedTemp * (chartHeight * 0.75); // Keep headroom
      return { x, y, temp: d.temperature, item: d };
    });

    // 1. Draw horizontal guide lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = gridColor;
    const numGuides = 3;
    for (let g = 0; g <= numGuides; g++) {
      const gy = padTop + (g / numGuides) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padX, gy);
      ctx.lineTo(width - padX, gy);
      ctx.stroke();
    }

    // 2. Draw precipitation probability bars at bottom
    const barWidth = Math.max(3, (chartWidth / data.length) * 0.45);
    data.forEach((d, i) => {
      const prob = d.precipitationProbability ?? 0;
      if (prob > 0) {
        const x = points[i].x - barWidth / 2;
        const barMaxH = 30;
        const barH = (prob / 100) * barMaxH;
        const y = padTop + chartHeight - barH;

        ctx.fillStyle = precipBarColor;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, barWidth, barH, [3, 3, 0, 0]) : ctx.rect(x, y, barWidth, barH);
        ctx.fill();

        // If rain prob is significant and spacing allows, write percentage
        if (prob >= 30 && i % 3 === 0) {
          ctx.fillStyle = '#38bdf8';
          ctx.font = '10px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${prob}%`, points[i].x, y - 3);
        }
      }
    });

    // 3. Draw smooth spline gradient area under temperature curve
    const areaGrad = ctx.createLinearGradient(0, padTop, 0, padTop + chartHeight);
    areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    areaGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.08)');
    areaGrad.addColorStop(1, 'rgba(56, 189, 248, 0.00)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    const lastP = points[points.length - 1];
    ctx.lineTo(lastP.x, lastP.y);
    ctx.lineTo(lastP.x, padTop + chartHeight);
    ctx.lineTo(points[0].x, padTop + chartHeight);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // 4. Draw smooth temperature curve line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(lastP.x, lastP.y);
    ctx.strokeStyle = primaryLine;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 5. Draw data points and values for every 3rd step or on hover
    points.forEach((p, i) => {
      const isKeyStep = i % 3 === 0 || i === points.length - 1;
      const isHovered = i === this.hoverIndex;

      if (isKeyStep || isHovered) {
        // Dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHovered ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#38bdf8' : (isDark ? '#0f172a' : '#ffffff');
        ctx.fill();
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();

        // Temp Label above dot
        ctx.fillStyle = isHovered ? '#38bdf8' : textBright;
        ctx.font = isHovered ? 'bold 12px Inter, system-ui, sans-serif' : '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(p.temp)}°`, p.x, p.y - 10);
      }

      // X-Axis Time Label (every 3 hours)
      if (i % 3 === 0) {
        const timeStr = this.formatHour(p.item.time);
        ctx.fillStyle = textColor;
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(timeStr, p.x, height - 12);
      }
    });

    // 6. Active hover tooltip card
    if (this.hoverIndex >= 0 && this.hoverIndex < points.length) {
      const hp = points[this.hoverIndex];
      const hItem = hp.item;
      const hourStr = this.formatHour(hItem.time, true);
      const tempStr = `${Math.round(hItem.temperature)}${this.options.tempUnit}`;
      const condStr = hItem.conditionLabel || '';
      const popStr = hItem.precipitationProbability !== null ? `💧 ${hItem.precipitationProbability}%` : '';

      // Draw vertical indicator line
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(hp.x, padTop - 10);
      ctx.lineTo(hp.x, padTop + chartHeight);
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.6)' : 'rgba(37, 99, 235, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      // Tooltip pill at top
      const tipText = `${hourStr} • ${tempStr} • ${condStr} ${popStr}`.trim();
      ctx.font = '11px Inter, system-ui, sans-serif';
      const textWidth = ctx.measureText(tipText).width;
      const tipW = textWidth + 18;
      const tipH = 24;
      let tipX = hp.x - tipW / 2;
      tipX = Math.max(10, Math.min(width - tipW - 10, tipX));
      const tipY = 6;

      ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(tipX, tipY, tipW, tipH, 6) : ctx.rect(tipX, tipY, tipW, tipH);
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow

      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = textBright;
      ctx.textAlign = 'center';
      ctx.fillText(tipText, tipX + tipW / 2, tipY + 16);
    }
  }

  formatHour(isoString, includeMinutes = false) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: includeMinutes ? '2-digit' : undefined, hour12: true });
    } catch {
      return isoString.slice(11, 16);
    }
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeatherChart;
}
