import * as THREE from 'three';

export class ForceVectorVisualizer {
  constructor(scene) {
    this.scene = scene;
    this.arrowHelpers = [];
    
    this.colors = {
      lateral: 0xff0000,      // Red
      longitudinal: 0x0000ff, // Blue
      vertical: 0x00ff00,     // Green
      resultant: 0xffffff,    // White
      downforce: 0x00ffff,    // Cyan
      drag: 0xff00ff          // Magenta
    };
    
    this.scaleFactors = {
      display: 0.001,         // Convert N to display units
      logarithmic: true,      // Use log scale for large forces
      minLength: 0.1,         // Minimum arrow length
      maxLength: 5.0          // Maximum arrow length
    };
    
    this.visibility = {
      lateral: true,
      longitudinal: true,
      vertical: false,
      resultant: true,
      downforce: true,
      drag: true,
      wheelForces: true,
      aeroForces: true
    };
    
    this.group = new THREE.Group();
    this.group.name = 'ForceVectors';
    scene.add(this.group);
    
    this.initializeArrows();
  }
  
  initializeArrows() {
    // Wheel force arrows (4 wheels)
    this.wheelArrows = [];
    for (let i = 0; i < 4; i++) {
      const arrows = {
        lateral: this.createArrow(this.colors.lateral),
        longitudinal: this.createArrow(this.colors.longitudinal),
        resultant: this.createArrow(this.colors.resultant)
      };
      this.wheelArrows.push(arrows);
    }
    
    // Chassis force arrows
    this.chassisArrows = {
      downforce: this.createArrow(this.colors.downforce),
      drag: this.createArrow(this.colors.drag),
      totalLateral: this.createArrow(this.colors.lateral),
      totalLongitudinal: this.createArrow(this.colors.longitudinal)
    };
    
    // Legend
    this.createLegend();
  }
  
  createArrow(color) {
    const origin = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3(0, 1, 0);
    const length = 1;
    const arrow = new THREE.ArrowHelper(direction, origin, length, color, length * 0.2, length * 0.1);
    arrow.visible = false;
    this.group.add(arrow);
    return arrow;
  }
  
  updateForceVectors(vehicle, forces) {
    // Get vehicle position safely
    const vehiclePosition = vehicle.getPosition ? vehicle.getPosition() : new THREE.Vector3(0, 0, 0);
    
    // Update wheel forces
    if (this.visibility.wheelForces && forces.wheels) {
      forces.wheels.forEach((wheelForce, index) => {
        // Use wheel position if available, otherwise use vehicle position with offset
        const wheelPos = vehicle.wheels && vehicle.wheels[index] && vehicle.wheels[index].position 
          ? vehicle.wheels[index].position 
          : vehiclePosition.clone().add(new THREE.Vector3(index % 2 === 0 ? -1 : 1, 0, index < 2 ? 1 : -1));
        this.updateWheelForce(index, wheelForce, wheelPos);
      });
    }
    
    // Update aerodynamic forces
    if (this.visibility.aeroForces && forces.aero) {
      this.updateAeroForces(forces.aero, vehiclePosition);
    }
    
    // Update total forces
    if (forces.total) {
      this.updateTotalForces(forces.total, vehiclePosition);
    }
  }
  
  updateWheelForce(wheelIndex, force, position) {
    const arrows = this.wheelArrows[wheelIndex];
    
    // Lateral force
    if (this.visibility.lateral && force.lateral) {
      this.updateArrow(
        arrows.lateral,
        position,
        new THREE.Vector3(force.lateral, 0, 0),
        this.getUtilizationColor(force.lateralUtilization)
      );
    }
    
    // Longitudinal force
    if (this.visibility.longitudinal && force.longitudinal) {
      this.updateArrow(
        arrows.longitudinal,
        position,
        new THREE.Vector3(0, 0, force.longitudinal),
        this.getUtilizationColor(force.longitudinalUtilization)
      );
    }
    
    // Resultant force
    if (this.visibility.resultant && (force.lateral || force.longitudinal)) {
      const resultant = new THREE.Vector3(force.lateral || 0, 0, force.longitudinal || 0);
      this.updateArrow(
        arrows.resultant,
        position,
        resultant,
        this.colors.resultant
      );
    }
  }
  
  updateAeroForces(aeroForces, vehiclePosition) {
    // Downforce
    if (this.visibility.downforce && aeroForces.downforce) {
      const totalDownforce = aeroForces.downforce.front + aeroForces.downforce.rear;
      this.updateArrow(
        this.chassisArrows.downforce,
        vehiclePosition.clone().add(new THREE.Vector3(0, 1, 0)),
        new THREE.Vector3(0, -totalDownforce, 0),
        this.colors.downforce
      );
    }
    
    // Drag
    if (this.visibility.drag && aeroForces.drag) {
      this.updateArrow(
        this.chassisArrows.drag,
        vehiclePosition.clone().add(new THREE.Vector3(0, 1, -2)),
        new THREE.Vector3(0, 0, -aeroForces.drag),
        this.colors.drag
      );
    }
  }
  
  updateTotalForces(totalForces, vehiclePosition) {
    // Total lateral force
    if (this.visibility.lateral && totalForces.lateral) {
      this.updateArrow(
        this.chassisArrows.totalLateral,
        vehiclePosition,
        new THREE.Vector3(totalForces.lateral, 0, 0),
        this.colors.lateral
      );
    }
    
    // Total longitudinal force
    if (this.visibility.longitudinal && totalForces.longitudinal) {
      this.updateArrow(
        this.chassisArrows.totalLongitudinal,
        vehiclePosition,
        new THREE.Vector3(0, 0, totalForces.longitudinal),
        this.colors.longitudinal
      );
    }
  }
  
  updateArrow(arrow, position, force, color) {
    if (!arrow || force.length() < 0.01) {
      arrow.visible = false;
      return;
    }
    
    const scaledLength = this.scaleForce(force.length());
    
    if (scaledLength < this.scaleFactors.minLength) {
      arrow.visible = false;
      return;
    }
    
    arrow.visible = true;
    arrow.position.copy(position);
    arrow.setDirection(force.normalize());
    arrow.setLength(
      Math.min(scaledLength, this.scaleFactors.maxLength),
      scaledLength * 0.2,
      scaledLength * 0.1
    );
    
    if (color) {
      arrow.setColor(color);
    }
  }
  
  scaleForce(forceMagnitude) {
    if (this.scaleFactors.logarithmic) {
      return Math.log10(forceMagnitude / 1000 + 1) * 2;
    }
    return forceMagnitude * this.scaleFactors.display;
  }
  
  getUtilizationColor(utilization) {
    // Green -> Yellow -> Red based on utilization
    if (utilization < 0.7) {
      return this.interpolateColor(0x00ff00, 0xffff00, utilization / 0.7);
    } else {
      return this.interpolateColor(0xffff00, 0xff0000, (utilization - 0.7) / 0.3);
    }
  }
  
  interpolateColor(color1, color2, factor) {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;
    
    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;
    
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    return (r << 16) | (g << 8) | b;
  }
  
  createLegend() {
    // Create HTML legend element
    const legend = document.createElement('div');
    legend.className = 'force-legend';
    legend.innerHTML = `
      <div class="force-legend-item">
        <div class="force-legend-color" style="background: #ff0000;"></div>
        <span>Lateral Force</span>
      </div>
      <div class="force-legend-item">
        <div class="force-legend-color" style="background: #0000ff;"></div>
        <span>Longitudinal Force</span>
      </div>
      <div class="force-legend-item">
        <div class="force-legend-color" style="background: #ffffff;"></div>
        <span>Resultant Force</span>
      </div>
      <div class="force-legend-item">
        <div class="force-legend-color" style="background: #00ffff;"></div>
        <span>Downforce</span>
      </div>
      <div class="force-legend-item">
        <div class="force-legend-color" style="background: #ff00ff;"></div>
        <span>Drag</span>
      </div>
    `;
    
    document.body.appendChild(legend);
    this.legendElement = legend;
  }
  
  setVisibility(forceType, visible) {
    this.visibility[forceType] = visible;
    
    // Hide arrows if visibility is turned off
    if (!visible) {
      switch (forceType) {
        case 'lateral':
          this.wheelArrows.forEach(arrows => arrows.lateral.visible = false);
          this.chassisArrows.totalLateral.visible = false;
          break;
        case 'longitudinal':
          this.wheelArrows.forEach(arrows => arrows.longitudinal.visible = false);
          this.chassisArrows.totalLongitudinal.visible = false;
          break;
        case 'resultant':
          this.wheelArrows.forEach(arrows => arrows.resultant.visible = false);
          break;
        case 'downforce':
          this.chassisArrows.downforce.visible = false;
          break;
        case 'drag':
          this.chassisArrows.drag.visible = false;
          break;
      }
    }
  }
  
  setScaleFactor(factor) {
    this.scaleFactors.display = factor;
  }
  
  setLogarithmicScale(enabled) {
    this.scaleFactors.logarithmic = enabled;
  }
  
  showLegend(visible) {
    if (this.legendElement) {
      this.legendElement.style.display = visible ? 'block' : 'none';
    }
  }
  
  dispose() {
    // Remove all arrows
    this.group.traverse((child) => {
      if (child instanceof THREE.ArrowHelper) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
    
    this.scene.remove(this.group);
    
    // Remove legend
    if (this.legendElement) {
      this.legendElement.remove();
    }
  }
}