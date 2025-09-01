import * as THREE from 'three';

export class WeightDistributionDisplay {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'WeightDistribution';
    scene.add(this.group);
    
    this.wheelLoadBars = [];
    this.centerOfGravityMarker = null;
    this.balanceIndicator = {
      frontRear: new THREE.Group(),
      leftRight: new THREE.Group()
    };
    
    this.wheelLabels = [];
    this.nominalLoad = 0;
    this.totalWeight = 0;
    this.percentageDisplay = null;
    this.initialized = false;
    
    this.maxBarHeight = 3; // meters
    this.barWidth = 0.8;
    this.barDepth = 0.8;
    
    this.initializeDisplay();
  }
  
  initializeDisplay() {
    // Create wheel load bars
    this.createWheelLoadBars();
    
    // Create center of gravity marker
    this.createCGMarker();
    
    // Create balance indicators
    this.createBalanceIndicators();
    
    // Create weight percentages display
    this.createPercentageDisplay();
  }
  
  createWheelLoadBars() {
    const wheelPositions = [
      new THREE.Vector3(-1.5, 0, 2.7/2),   // FL
      new THREE.Vector3(1.5, 0, 2.7/2),    // FR
      new THREE.Vector3(-1.5, 0, -2.7/2),  // RL
      new THREE.Vector3(1.5, 0, -2.7/2)    // RR
    ];
    
    wheelPositions.forEach((position, index) => {
      // Create bar geometry
      const geometry = new THREE.BoxGeometry(this.barWidth, this.maxBarHeight, this.barDepth);
      
      // Create gradient material
      const material = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.8
      });
      
      const bar = new THREE.Mesh(geometry, material);
      bar.position.copy(position);
      bar.position.y = this.maxBarHeight / 2;
      bar.scale.y = 0.1; // Start with minimal height
      
      // Create base
      const baseGeometry = new THREE.CylinderGeometry(this.barWidth * 0.6, this.barWidth * 0.6, 0.1, 8);
      const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.copy(position);
      base.position.y = 0.05;
      
      this.group.add(bar);
      this.group.add(base);
      this.wheelLoadBars.push(bar);
    });
  }
  
  createCGMarker() {
    // CG marker sphere
    const geometry = new THREE.SphereGeometry(0.15, 16, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0x444400,
      transparent: true,
      opacity: 0.9
    });
    
    this.centerOfGravityMarker = new THREE.Mesh(geometry, material);
    this.centerOfGravityMarker.position.set(0, 0.5, 0);
    
    // Add CG lines
    const linesMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, opacity: 0.6, transparent: true });
    
    // X-axis line
    const xLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2, 0, 0),
      new THREE.Vector3(2, 0, 0)
    ]);
    const xLine = new THREE.Line(xLineGeometry, linesMaterial);
    this.centerOfGravityMarker.add(xLine);
    
    // Z-axis line
    const zLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -2),
      new THREE.Vector3(0, 0, 2)
    ]);
    const zLine = new THREE.Line(zLineGeometry, linesMaterial);
    this.centerOfGravityMarker.add(zLine);
    
    this.group.add(this.centerOfGravityMarker);
  }
  
  createBalanceIndicators() {
    // Front-rear balance bar
    const balanceBarGeometry = new THREE.BoxGeometry(0.2, 0.1, 4);
    const balanceBarMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    
    const frontRearBar = new THREE.Mesh(balanceBarGeometry, balanceBarMaterial);
    frontRearBar.position.set(3, 0.05, 0);
    this.balanceIndicator.frontRear.add(frontRearBar);
    
    // Balance marker
    const markerGeometry = new THREE.SphereGeometry(0.1, 8, 6);
    const markerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const frontRearMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    this.balanceIndicator.frontRear.add(frontRearMarker);
    
    // Left-right balance bar
    const leftRightBar = new THREE.Mesh(balanceBarGeometry.clone(), balanceBarMaterial.clone());
    leftRightBar.rotation.y = Math.PI / 2;
    leftRightBar.position.set(0, 0.05, -3);
    this.balanceIndicator.leftRight.add(leftRightBar);
    
    const leftRightMarker = new THREE.Mesh(markerGeometry.clone(), markerMaterial.clone());
    this.balanceIndicator.leftRight.add(leftRightMarker);
    
    this.group.add(this.balanceIndicator.frontRear);
    this.group.add(this.balanceIndicator.leftRight);
  }
  
  createPercentageDisplay() {
    if (typeof document === 'undefined') return;
    
    // Create HTML elements for percentages
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '100px';
    container.style.right = '20px';
    container.style.background = 'rgba(0, 0, 0, 0.8)';
    container.style.color = '#fff';
    container.style.padding = '15px';
    container.style.borderRadius = '8px';
    container.style.fontFamily = 'monospace';
    container.style.fontSize = '14px';
    container.style.backdropFilter = 'blur(10px)';
    container.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    
    container.innerHTML = `
      <h4 style="margin: 0 0 10px 0;">Weight Distribution</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
        <div>FL: <span id="fl-percent">25.0%</span></div>
        <div>FR: <span id="fr-percent">25.0%</span></div>
        <div>RL: <span id="rl-percent">25.0%</span></div>
        <div>RR: <span id="rr-percent">25.0%</span></div>
      </div>
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 10px;">
        <div>Front: <span id="front-total">50.0%</span></div>
        <div>Rear: <span id="rear-total">50.0%</span></div>
        <div>Left: <span id="left-total">50.0%</span></div>
        <div>Right: <span id="right-total">50.0%</span></div>
      </div>
    `;
    
    document.body.appendChild(container);
    this.percentageDisplay = container;
    this.initialized = true;
  }
  
  update(wheelLoads, cgPosition, totalWeight, balancePoint) {
    this.totalWeight = totalWeight;
    this.nominalLoad = totalWeight / 4;
    
    // Update wheel load bars
    this.wheelLoadBars.forEach((bar, index) => {
      const load = wheelLoads[index] || 0;
      const height = (load / (this.nominalLoad * 2)) * this.maxBarHeight;
      
      // Animate height change
      bar.scale.y = Math.max(0.05, Math.min(height, 1));
      
      // Color based on load
      const color = this.getLoadColor(load, this.nominalLoad);
      bar.material.color.setHex(color);
      
      // Adjust position for scaling
      bar.position.y = (bar.scale.y * this.maxBarHeight) / 2;
    });
    
    // Update CG marker position
    if (cgPosition) {
      this.centerOfGravityMarker.position.lerp(cgPosition, 0.1);
    }
    
    // Update balance indicators
    if (balancePoint) {
      this.updateBalanceIndicators(balancePoint);
    }
    
    // Update percentage display
    this.updatePercentageDisplay(wheelLoads, totalWeight);
  }
  
  updateBalanceIndicators(balancePoint) {
    // Front-rear balance
    const frontRearMarker = this.balanceIndicator.frontRear.children.find(child => child.geometry.type === 'SphereGeometry');
    if (frontRearMarker) {
      frontRearMarker.position.z = balancePoint.y * 2; // Scale to fit bar
    }
    
    // Left-right balance  
    const leftRightMarker = this.balanceIndicator.leftRight.children.find(child => child.geometry.type === 'SphereGeometry');
    if (leftRightMarker) {
      leftRightMarker.position.x = balancePoint.x * 2; // Scale to fit bar
    }
  }
  
  updatePercentageDisplay(wheelLoads, totalWeight) {
    if (!this.initialized || !this.percentageDisplay || totalWeight === 0) return;
    
    const percentages = {
      fl: (wheelLoads[0] / totalWeight * 100).toFixed(1),
      fr: (wheelLoads[1] / totalWeight * 100).toFixed(1),
      rl: (wheelLoads[2] / totalWeight * 100).toFixed(1),
      rr: (wheelLoads[3] / totalWeight * 100).toFixed(1)
    };
    
    const frontTotal = ((wheelLoads[0] + wheelLoads[1]) / totalWeight * 100).toFixed(1);
    const rearTotal = ((wheelLoads[2] + wheelLoads[3]) / totalWeight * 100).toFixed(1);
    const leftTotal = ((wheelLoads[0] + wheelLoads[2]) / totalWeight * 100).toFixed(1);
    const rightTotal = ((wheelLoads[1] + wheelLoads[3]) / totalWeight * 100).toFixed(1);
    
    // Update HTML elements
    const updateElement = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value + '%';
    };
    
    updateElement('fl-percent', percentages.fl);
    updateElement('fr-percent', percentages.fr);
    updateElement('rl-percent', percentages.rl);
    updateElement('rr-percent', percentages.rr);
    updateElement('front-total', frontTotal);
    updateElement('rear-total', rearTotal);
    updateElement('left-total', leftTotal);
    updateElement('right-total', rightTotal);
  }
  
  getLoadColor(load, nominal) {
    const ratio = load / nominal;
    
    if (ratio < 0.5) return 0x0000ff;      // Blue - very light
    if (ratio < 0.8) return 0x00ffff;      // Cyan - light
    if (ratio < 1.2) return 0x00ff00;      // Green - optimal
    if (ratio < 1.5) return 0xffff00;      // Yellow - heavy
    return 0xff0000;                        // Red - overloaded
  }
  
  setVisibility(visible) {
    this.group.visible = visible;
    if (this.percentageDisplay) {
      this.percentageDisplay.style.display = visible ? 'block' : 'none';
    }
  }
  
  setWheelPositions(trackWidth, wheelbase) {
    // Update wheel positions based on vehicle
    const positions = [
      new THREE.Vector3(-trackWidth.front/2, 0, wheelbase/2),   // FL
      new THREE.Vector3(trackWidth.front/2, 0, wheelbase/2),    // FR
      new THREE.Vector3(-trackWidth.rear/2, 0, -wheelbase/2),   // RL
      new THREE.Vector3(trackWidth.rear/2, 0, -wheelbase/2)     // RR
    ];
    
    this.wheelLoadBars.forEach((bar, index) => {
      bar.position.x = positions[index].x;
      bar.position.z = positions[index].z;
    });
  }
  
  animateWeightTransfer(fromLoads, toLoads, duration = 1.0) {
    // Smooth animation between weight states
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out animation
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentLoads = fromLoads.map((fromLoad, index) => {
        return fromLoad + (toLoads[index] - fromLoad) * easeProgress;
      });
      
      this.update(currentLoads, null, this.totalWeight, null);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  highlightWheelLoad(wheelIndex, highlight = true) {
    if (wheelIndex < 0 || wheelIndex >= this.wheelLoadBars.length) return;
    
    const bar = this.wheelLoadBars[wheelIndex];
    if (highlight) {
      bar.material.emissive.setHex(0x333333);
      bar.scale.set(1.2, bar.scale.y, 1.2);
    } else {
      bar.material.emissive.setHex(0x000000);
      bar.scale.set(1, bar.scale.y, 1);
    }
  }
  
  createLoadGradient() {
    if (typeof document === 'undefined') return null;
    
    // Create a visual gradient showing load scale
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 20;
    const ctx = canvas.getContext('2d');
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0, '#0000ff');    // Very light
    gradient.addColorStop(0.25, '#00ffff'); // Light
    gradient.addColorStop(0.5, '#00ff00');  // Optimal
    gradient.addColorStop(0.75, '#ffff00'); // Heavy
    gradient.addColorStop(1, '#ff0000');    // Overloaded
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 20);
    
    // Add labels
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText('Light', 5, 15);
    ctx.fillText('Optimal', 110, 15);
    ctx.fillText('Heavy', 220, 15);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
  
  createBalancePoint() {
    // Visual representation of balance point on vehicle outline
    const vehicleOutlineGeometry = new THREE.PlaneGeometry(3, 5);
    const vehicleOutlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    
    const vehicleOutline = new THREE.Mesh(vehicleOutlineGeometry, vehicleOutlineMaterial);
    vehicleOutline.rotation.x = -Math.PI / 2;
    vehicleOutline.position.y = 0.01;
    
    // Balance point marker
    const balanceGeometry = new THREE.SphereGeometry(0.1, 8, 6);
    const balanceMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0x440000
    });
    
    const balanceMarker = new THREE.Mesh(balanceGeometry, balanceMaterial);
    balanceMarker.position.y = 0.15;
    
    this.group.add(vehicleOutline);
    this.group.add(balanceMarker);
    
    this.balanceMarker = balanceMarker;
    return balanceMarker;
  }
  
  updateBalancePoint(balancePoint) {
    if (this.balanceMarker) {
      // Map balance point to vehicle outline coordinates
      this.balanceMarker.position.x = balancePoint.x * 1.5; // Scale to fit outline
      this.balanceMarker.position.z = balancePoint.y * 2.5; // Scale to fit outline
    }
  }
  
  setTransparency(alpha) {
    this.group.traverse((child) => {
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            mat.transparent = alpha < 1;
            mat.opacity = alpha;
          });
        } else {
          child.material.transparent = alpha < 1;
          child.material.opacity = alpha;
        }
      }
    });
  }
  
  dispose() {
    // Clean up geometry and materials
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    
    this.scene.remove(this.group);
    
    // Remove HTML elements
    if (this.percentageDisplay) {
      this.percentageDisplay.remove();
    }
  }
}