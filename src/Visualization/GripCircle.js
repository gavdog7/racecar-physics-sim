import * as THREE from 'three';

export class GripCircle {
  constructor(tirePosition, wheelName = '', containerElement = null) {
    this.tirePosition = tirePosition;
    this.wheelName = wheelName;
    this.containerElement = containerElement;
    
    // Circle properties
    this.radius = 100; // pixels
    this.maxForce = 10000; // N, will be updated based on tire
    
    // Canvas for 2D rendering
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.radius * 2 + 40;
    this.canvas.height = this.radius * 2 + 40;
    this.ctx = this.canvas.getContext('2d');
    
    // Current force state
    this.currentForces = {
      lateral: 0,
      longitudinal: 0,
      maximum: 0,
      utilization: 0
    };
    
    // Visual elements
    this.setupCanvas();
    this.addToContainer();
  }
  
  setupCanvas() {
    this.canvas.style.position = 'absolute';
    this.canvas.style.background = 'rgba(0, 0, 0, 0.8)';
    this.canvas.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    this.canvas.style.borderRadius = '8px';
    this.canvas.style.backdropFilter = 'blur(10px)';
    
    // Position based on tire location
    if (this.wheelName.includes('F')) {
      this.canvas.style.top = '20px';
    } else {
      this.canvas.style.bottom = '240px';
    }
    
    if (this.wheelName.includes('L')) {
      this.canvas.style.left = '440px';
    } else {
      this.canvas.style.right = '20px';
    }
  }
  
  addToContainer() {
    const container = document.createElement('div');
    container.className = 'grip-circle-container';
    container.appendChild(this.canvas);
    
    const label = document.createElement('div');
    label.className = 'grip-circle-label';
    label.textContent = this.wheelName;
    container.appendChild(label);
    
    document.body.appendChild(container);
    this.container = container;
  }
  
  update(lateralForce, longitudinalForce, maxForce, temperature = 20, utilization = 0) {
    this.currentForces.lateral = lateralForce;
    this.currentForces.longitudinal = longitudinalForce;
    this.currentForces.maximum = maxForce;
    this.currentForces.utilization = utilization;
    
    this.maxForce = maxForce;
    
    this.draw(temperature);
  }
  
  draw(temperature) {
    const ctx = this.ctx;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw grip circle background
    this.drawGripCircle(ctx, centerX, centerY);
    
    // Draw force vector
    this.drawForceVector(ctx, centerX, centerY);
    
    // Draw utilization indicators
    this.drawUtilizationRings(ctx, centerX, centerY);
    
    // Draw labels and values
    this.drawLabelsAndValues(ctx, temperature);
  }
  
  drawGripCircle(ctx, centerX, centerY) {
    // Main circle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Utilization zones
    const zones = [
      { radius: this.radius * 0.7, color: '#00ff00', alpha: 0.1 },
      { radius: this.radius * 0.9, color: '#ffff00', alpha: 0.1 },
      { radius: this.radius, color: '#ff0000', alpha: 0.1 }
    ];
    
    zones.forEach(zone => {
      ctx.fillStyle = zone.color + Math.round(255 * zone.alpha).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(centerX, centerY, zone.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(centerX - this.radius, centerY);
    ctx.lineTo(centerX + this.radius, centerY);
    ctx.stroke();
    
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - this.radius);
    ctx.lineTo(centerX, centerY + this.radius);
    ctx.stroke();
    
    // Axis labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    
    ctx.fillText('Brake', centerX, centerY - this.radius - 5);
    ctx.fillText('Accel', centerX, centerY + this.radius + 15);
    
    ctx.textAlign = 'left';
    ctx.fillText('Left', centerX + this.radius + 5, centerY);
    
    ctx.textAlign = 'right';
    ctx.fillText('Right', centerX - this.radius - 5, centerY);
  }
  
  drawForceVector(ctx, centerX, centerY) {
    const lateral = this.currentForces.lateral;
    const longitudinal = this.currentForces.longitudinal;
    const maxForce = this.currentForces.maximum;
    
    if (maxForce === 0) return;
    
    // Scale forces to circle radius
    const lateralPx = (lateral / maxForce) * this.radius;
    const longitudinalPx = (longitudinal / maxForce) * this.radius;
    
    const endX = centerX + lateralPx;
    const endY = centerY - longitudinalPx; // Negative Y for forward direction
    
    // Draw force vector line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Draw arrow head
    const angle = Math.atan2(endY - centerY, endX - centerX);
    const arrowLength = 10;
    const arrowAngle = 0.5;
    
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowLength * Math.cos(angle - arrowAngle),
      endY - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowLength * Math.cos(angle + arrowAngle),
      endY - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.stroke();
    
    // Draw utilization point
    const utilization = this.currentForces.utilization;
    const pointColor = this.getUtilizationColor(utilization);
    
    ctx.fillStyle = pointColor;
    ctx.beginPath();
    ctx.arc(endX, endY, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Outline for visibility
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  
  drawUtilizationRings(ctx, centerX, centerY) {
    // Draw rings at 70%, 90%, and 100% utilization
    const rings = [0.7, 0.9, 1.0];
    const colors = ['#00ff00', '#ffff00', '#ff0000'];
    
    rings.forEach((ring, index) => {
      const ringRadius = this.radius * ring;
      ctx.strokeStyle = colors[index];
      ctx.lineWidth = index === 2 ? 2 : 1;
      ctx.setLineDash(index < 2 ? [5, 5] : []);
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    });
    
    ctx.setLineDash([]); // Reset line dash
  }
  
  drawLabelsAndValues(ctx, temperature) {
    // Draw force values
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    
    const lateral = this.currentForces.lateral;
    const longitudinal = this.currentForces.longitudinal;
    const utilization = this.currentForces.utilization;
    
    // Force values
    const yStart = 15;
    const lineHeight = 14;
    
    ctx.fillText(`Lat: ${lateral.toFixed(0)}N`, 5, yStart);
    ctx.fillText(`Lng: ${longitudinal.toFixed(0)}N`, 5, yStart + lineHeight);
    ctx.fillText(`Util: ${(utilization * 100).toFixed(1)}%`, 5, yStart + lineHeight * 2);
    ctx.fillText(`Temp: ${temperature.toFixed(0)}°C`, 5, yStart + lineHeight * 3);
    
    // Utilization warning
    if (utilization > 0.95) {
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SLIDING', this.canvas.width / 2, this.canvas.height - 10);
    } else if (utilization > 0.85) {
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NEAR LIMIT', this.canvas.width / 2, this.canvas.height - 10);
    }
  }
  
  getUtilizationColor(utilization) {
    // Smooth color transition based on utilization
    if (utilization < 0.7) {
      // Green to yellow
      const t = utilization / 0.7;
      return this.interpolateColor('#00ff00', '#ffff00', t);
    } else if (utilization < 0.9) {
      // Yellow to orange
      const t = (utilization - 0.7) / 0.2;
      return this.interpolateColor('#ffff00', '#ff8800', t);
    } else {
      // Orange to red
      const t = (utilization - 0.9) / 0.1;
      return this.interpolateColor('#ff8800', '#ff0000', t);
    }
  }
  
  interpolateColor(color1, color2, factor) {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    
    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
    
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  
  setVisibility(visible) {
    if (this.container) {
      this.container.style.display = visible ? 'block' : 'none';
    }
  }
  
  setPosition(x, y) {
    if (this.container) {
      this.container.style.left = x + 'px';
      this.container.style.top = y + 'px';
    }
  }
  
  dispose() {
    if (this.container) {
      this.container.remove();
    }
  }
}

// Grip circle manager for all four wheels
export class GripCircleManager {
  constructor() {
    this.circles = [];
    this.wheelNames = ['FL', 'FR', 'RL', 'RR'];
    
    this.initializeCircles();
  }
  
  initializeCircles() {
    this.wheelNames.forEach((name, index) => {
      const circle = new GripCircle(null, name);
      this.circles.push(circle);
    });
  }
  
  updateAll(wheelForces, wheelTemperatures) {
    this.circles.forEach((circle, index) => {
      const force = wheelForces[index];
      const temp = wheelTemperatures[index];
      
      if (force) {
        circle.update(
          force.lateral || 0,
          force.longitudinal || 0,
          force.maximum || 10000,
          temp || 20,
          force.utilization || 0
        );
      }
    });
  }
  
  setVisibility(visible) {
    this.circles.forEach(circle => circle.setVisibility(visible));
  }
  
  dispose() {
    this.circles.forEach(circle => circle.dispose());
    this.circles = [];
  }
}