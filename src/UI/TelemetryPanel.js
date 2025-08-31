export class TelemetryPanel {
  constructor() {
    this.panel = document.getElementById('telemetry-panel');
    this.refreshRate = 60; // Hz
    this.lastUpdate = 0;
    
    // Data elements
    this.elements = {
      speed: document.getElementById('speed'),
      lateralG: document.getElementById('lateral-g'),
      longG: document.getElementById('long-g'),
      steering: document.getElementById('steering'),
      brake: document.getElementById('brake'),
      throttle: document.getElementById('throttle'),
      flLoad: document.getElementById('fl-load'),
      frLoad: document.getElementById('fr-load'),
      rlLoad: document.getElementById('rl-load'),
      rrLoad: document.getElementById('rr-load')
    };
    
    // Data history for graphs
    this.dataHistory = {
      speed: [],
      lateralG: [],
      longG: [],
      maxLength: 300 // 5 seconds at 60fps
    };
    
    this.visible = false;
  }
  
  update(vehicleState, currentTime) {
    // Throttle updates to refresh rate
    if (currentTime - this.lastUpdate < 1000 / this.refreshRate) {
      return;
    }
    this.lastUpdate = currentTime;
    
    if (!this.visible) return;
    
    // Update displayed values
    this.updateElement('speed', (vehicleState.speed * 3.6).toFixed(0), 'km/h');
    this.updateElement('lateralG', vehicleState.lateralG.toFixed(2), 'g');
    this.updateElement('longG', vehicleState.longitudinalG.toFixed(2), 'g');
    this.updateElement('steering', (vehicleState.steering * 180 / Math.PI).toFixed(1), '°');
    this.updateElement('brake', (vehicleState.brake * 100).toFixed(0), '%');
    this.updateElement('throttle', (vehicleState.throttle * 100).toFixed(0), '%');
    
    // Update wheel loads
    if (vehicleState.wheelLoads) {
      this.updateElement('flLoad', (vehicleState.wheelLoads[0] / 9.81).toFixed(0), 'kg');
      this.updateElement('frLoad', (vehicleState.wheelLoads[1] / 9.81).toFixed(0), 'kg');
      this.updateElement('rlLoad', (vehicleState.wheelLoads[2] / 9.81).toFixed(0), 'kg');
      this.updateElement('rrLoad', (vehicleState.wheelLoads[3] / 9.81).toFixed(0), 'kg');
    }
    
    // Update data history
    this.updateDataHistory(vehicleState);
    
    // Color code values based on limits
    this.applyColorCoding(vehicleState);
  }
  
  updateElement(elementId, value, unit = '') {
    const element = this.elements[elementId];
    if (element) {
      element.textContent = `${value} ${unit}`;
    }
  }
  
  updateDataHistory(vehicleState) {
    // Add current values to history
    this.dataHistory.speed.push(vehicleState.speed * 3.6);
    this.dataHistory.lateralG.push(Math.abs(vehicleState.lateralG));
    this.dataHistory.longG.push(Math.abs(vehicleState.longitudinalG));
    
    // Trim history to max length
    Object.keys(this.dataHistory).forEach(key => {
      if (key !== 'maxLength' && this.dataHistory[key].length > this.dataHistory.maxLength) {
        this.dataHistory[key].shift();
      }
    });
  }
  
  applyColorCoding(vehicleState) {
    // Color code G-forces
    this.colorCodeGForce('lateralG', Math.abs(vehicleState.lateralG), 1.0);
    this.colorCodeGForce('longG', Math.abs(vehicleState.longitudinalG), 1.0);
    
    // Color code wheel loads
    const avgLoad = (vehicleState.wheelLoads?.reduce((a, b) => a + b, 0) || 0) / 4;
    vehicleState.wheelLoads?.forEach((load, index) => {
      const wheelIds = ['flLoad', 'frLoad', 'rlLoad', 'rrLoad'];
      this.colorCodeWheelLoad(wheelIds[index], load, avgLoad);
    });
    
    // Color code speed (relative to vehicle maximum)
    const speedKmh = vehicleState.speed * 3.6;
    const maxSpeed = vehicleState.vehicle?.maxSpeed || 200;
    this.colorCodeValue('speed', speedKmh, maxSpeed * 0.9, maxSpeed);
  }
  
  colorCodeGForce(elementId, value, warningThreshold) {
    const element = this.elements[elementId];
    if (!element) return;
    
    if (value > warningThreshold) {
      element.style.color = '#ff0000'; // Red for high G
    } else if (value > warningThreshold * 0.8) {
      element.style.color = '#ffff00'; // Yellow for moderate G
    } else {
      element.style.color = '#ffffff'; // White for normal
    }
  }
  
  colorCodeWheelLoad(elementId, load, avgLoad) {
    const element = this.elements[elementId];
    if (!element) return;
    
    const ratio = load / avgLoad;
    
    if (ratio > 1.3) {
      element.style.color = '#ff0000'; // Red for high load
    } else if (ratio > 1.1) {
      element.style.color = '#ffff00'; // Yellow for elevated load
    } else if (ratio < 0.7) {
      element.style.color = '#00ffff'; // Cyan for light load
    } else {
      element.style.color = '#00ff00'; // Green for normal load
    }
  }
  
  colorCodeValue(elementId, value, yellowThreshold, redThreshold) {
    const element = this.elements[elementId];
    if (!element) return;
    
    if (value > redThreshold) {
      element.style.color = '#ff0000';
    } else if (value > yellowThreshold) {
      element.style.color = '#ffff00';
    } else {
      element.style.color = '#ffffff';
    }
  }
  
  setVisibility(visible) {
    this.visible = visible;
    if (this.panel) {
      this.panel.style.display = visible ? 'block' : 'none';
    }
  }
  
  createMiniGraphs() {
    // Add mini graphs for key parameters
    const graphContainer = document.createElement('div');
    graphContainer.style.marginTop = '10px';
    graphContainer.style.borderTop = '1px solid rgba(255, 255, 255, 0.2)';
    graphContainer.style.paddingTop = '10px';
    
    // Speed graph
    const speedCanvas = this.createMiniGraph('Speed', '#00ff00');
    graphContainer.appendChild(speedCanvas);
    
    // G-force graph
    const gForceCanvas = this.createMiniGraph('G-Forces', '#ff0000');
    graphContainer.appendChild(gForceCanvas);
    
    if (this.panel) {
      this.panel.appendChild(graphContainer);
    }
    
    this.miniGraphs = {
      speed: speedCanvas,
      gForce: gForceCanvas
    };
  }
  
  createMiniGraph(title, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 60;
    canvas.style.margin = '5px 0';
    canvas.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    canvas.style.borderRadius = '4px';
    
    const ctx = canvas.getContext('2d');
    
    // Draw title
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.fillText(title, 5, 12);
    
    return canvas;
  }
  
  updateMiniGraphs() {
    if (!this.miniGraphs) return;
    
    // Update speed graph
    this.drawGraph(
      this.miniGraphs.speed,
      this.dataHistory.speed,
      '#00ff00',
      0,
      Math.max(200, Math.max(...this.dataHistory.speed))
    );
    
    // Update G-force graph
    const allGForces = [...this.dataHistory.lateralG, ...this.dataHistory.longG];
    this.drawGraph(
      this.miniGraphs.gForce,
      allGForces,
      '#ff0000',
      0,
      Math.max(2, Math.max(...allGForces))
    );
  }
  
  drawGraph(canvas, data, color, minValue, maxValue) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height - 20; // Leave space for title
    
    // Clear graph area
    ctx.clearRect(0, 15, width, height);
    
    if (data.length < 2) return;
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = 15 + (i / 4) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw data line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const step = width / (this.dataHistory.maxLength - 1);
    const range = maxValue - minValue;
    
    for (let i = 0; i < data.length; i++) {
      const x = i * step;
      const normalizedValue = (data[i] - minValue) / range;
      const y = 15 + height - (normalizedValue * height);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    
    // Draw max value label
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(maxValue.toFixed(1), width - 2, 25);
  }
  
  resetMaxValues() {
    // Reset stored maximum values for color coding
    this.maxValues = {
      speed: 0,
      lateralG: 0,
      longG: 0
    };
    
    // Clear history
    Object.keys(this.dataHistory).forEach(key => {
      if (key !== 'maxLength') {
        this.dataHistory[key] = [];
      }
    });
  }
  
  exportTelemetryData() {
    // Export telemetry data as JSON
    const exportData = {
      timestamp: new Date().toISOString(),
      vehicle: this.currentVehicle,
      corner: this.currentCorner,
      data: this.dataHistory
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry_${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}