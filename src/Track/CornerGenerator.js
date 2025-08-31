import * as THREE from 'three';

export const CORNER_TYPES = {
  HAIRPIN: {
    name: "Hairpin",
    radius: 12,
    angle: 180,
    entrySpeed: {
      RX8: 45,
      F1: 65
    },
    apexPosition: 0.65,
    bankAngle: 0,
    description: "Tight 180° turn like Monaco's Fairmont"
  },
  
  FAST_SWEEPER: {
    name: "Fast Sweeper", 
    radius: 130,
    angle: 90,
    entrySpeed: {
      RX8: 120,
      F1: 280
    },
    apexPosition: 0.55,
    bankAngle: 3,
    description: "High-speed corner like Suzuka's 130R"
  },
  
  CHICANE: {
    name: "S-Curve/Chicane",
    radius: [25, -25],
    angle: [45, -45],
    entrySpeed: {
      RX8: 80,
      F1: 150
    },
    apexPosition: [0.5, 0.5],
    bankAngle: 0,
    description: "Quick direction changes like Bus Stop at Spa"
  }
};

export class CornerGenerator {
  constructor() {
    this.trackWidth = 12; // meters
    this.shoulderWidth = 2; // meters each side
    this.curbWidth = 1; // meters
    this.segments = 64; // Resolution for curves
  }
  
  generateCorner(cornerType, racingLine = 'ideal') {
    const config = CORNER_TYPES[cornerType];
    
    if (!config) {
      throw new Error(`Unknown corner type: ${cornerType}`);
    }
    
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.1
    });
    
    let trackMesh;
    
    if (cornerType === 'CHICANE') {
      trackMesh = this.generateChicane(config);
    } else {
      trackMesh = this.generateSingleCorner(config);
    }
    
    // Add track markings
    const markings = this.generateTrackMarkings(config, cornerType);
    trackMesh.add(markings);
    
    // Add curbs
    const curbs = this.generateCurbs(config, cornerType);
    trackMesh.add(curbs);
    
    // Add racing line
    const racingLineGeometry = this.generateRacingLine(config, racingLine, cornerType);
    trackMesh.add(racingLineGeometry);
    
    return {
      mesh: trackMesh,
      config: config,
      entryPoint: this.getEntryPoint(config),
      exitPoint: this.getExitPoint(config, cornerType),
      apexPoints: this.getApexPoints(config, cornerType)
    };
  }
  
  generateSingleCorner(config) {
    const group = new THREE.Group();
    
    // Create track surface
    const shape = new THREE.Shape();
    const innerRadius = config.radius - this.trackWidth / 2;
    const outerRadius = config.radius + this.trackWidth / 2;
    const angleRad = (config.angle * Math.PI) / 180;
    
    // Straight entry section
    const entryLength = 50;
    shape.moveTo(-entryLength, -this.trackWidth / 2);
    shape.lineTo(0, -this.trackWidth / 2);
    
    // Outer curve
    const outerPoints = [];
    for (let i = 0; i <= this.segments; i++) {
      const angle = (i / this.segments) * angleRad;
      const x = Math.sin(angle) * outerRadius;
      const y = (1 - Math.cos(angle)) * outerRadius - this.trackWidth / 2;
      outerPoints.push(new THREE.Vector2(x, y));
    }
    outerPoints.forEach(p => shape.lineTo(p.x, p.y));
    
    // Straight exit section
    const exitAngle = angleRad;
    const exitX = Math.sin(exitAngle) * config.radius;
    const exitY = (1 - Math.cos(exitAngle)) * config.radius;
    shape.lineTo(exitX + 50 * Math.cos(exitAngle), exitY + this.trackWidth / 2);
    shape.lineTo(exitX + 50 * Math.cos(exitAngle), exitY - this.trackWidth / 2);
    
    // Inner curve (reverse order)
    for (let i = this.segments; i >= 0; i--) {
      const angle = (i / this.segments) * angleRad;
      const x = Math.sin(angle) * innerRadius;
      const y = (1 - Math.cos(angle)) * innerRadius + this.trackWidth / 2;
      shape.lineTo(x, y);
    }
    
    // Close the shape
    shape.lineTo(0, this.trackWidth / 2);
    shape.lineTo(-entryLength, this.trackWidth / 2);
    shape.closePath();
    
    // Extrude to create 3D track
    const extrudeSettings = {
      depth: 0.1,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    
    // Apply banking if specified
    if (config.bankAngle > 0) {
      const bankRad = (config.bankAngle * Math.PI) / 180;
      mesh.rotation.z = bankRad;
    }
    
    group.add(mesh);
    return group;
  }
  
  generateChicane(config) {
    const group = new THREE.Group();
    
    // Create S-curve track surface
    const shape = new THREE.Shape();
    const points = [];
    
    // Entry straight
    points.push(new THREE.Vector2(-50, -this.trackWidth / 2));
    points.push(new THREE.Vector2(0, -this.trackWidth / 2));
    
    // First curve (left)
    const radius1 = Math.abs(config.radius[0]);
    const angle1 = (config.angle[0] * Math.PI) / 180;
    
    for (let i = 0; i <= this.segments / 2; i++) {
      const t = i / (this.segments / 2);
      const angle = t * angle1;
      const x = Math.sin(angle) * radius1;
      const y = (1 - Math.cos(angle)) * radius1 - this.trackWidth / 2;
      points.push(new THREE.Vector2(x, y));
    }
    
    // Transition
    const transitionX = Math.sin(angle1) * radius1;
    const transitionY = (1 - Math.cos(angle1)) * radius1;
    
    // Second curve (right)
    const radius2 = Math.abs(config.radius[1]);
    const angle2 = (Math.abs(config.angle[1]) * Math.PI) / 180;
    
    for (let i = 0; i <= this.segments / 2; i++) {
      const t = i / (this.segments / 2);
      const angle = angle1 - t * angle2;
      const x = transitionX + Math.sin(angle) * radius2;
      const y = transitionY - (1 - Math.cos(angle)) * radius2 - this.trackWidth / 2;
      points.push(new THREE.Vector2(x, y));
    }
    
    // Exit straight
    const exitX = transitionX + Math.sin(angle1 - angle2) * radius2;
    const exitY = transitionY - (1 - Math.cos(angle1 - angle2)) * radius2;
    points.push(new THREE.Vector2(exitX + 50, exitY - this.trackWidth / 2));
    points.push(new THREE.Vector2(exitX + 50, exitY + this.trackWidth / 2));
    
    // Create the other side (mirror with offset)
    const otherSide = points.slice().reverse().map(p => 
      new THREE.Vector2(p.x, p.y + this.trackWidth)
    );
    
    points.forEach(p => shape.lineTo(p.x, p.y));
    otherSide.forEach(p => shape.lineTo(p.x, p.y));
    shape.closePath();
    
    // Extrude
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    
    group.add(mesh);
    return group;
  }
  
  generateTrackMarkings(config, cornerType) {
    const group = new THREE.Group();
    
    // White lines
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lineWidth = 0.2;
    const lineHeight = 0.01;
    
    // Center line (dashed)
    const dashLength = 3;
    const gapLength = 3;
    
    if (cornerType === 'CHICANE') {
      // Simplified center line for chicane
      // Would need complex path following for accurate representation
    } else {
      // Single corner center line
      const radius = config.radius;
      const angleRad = (config.angle * Math.PI) / 180;
      
      for (let i = 0; i < this.segments; i += 2) {
        const angle1 = (i / this.segments) * angleRad;
        const angle2 = ((i + 1) / this.segments) * angleRad;
        
        const lineGeometry = new THREE.BoxGeometry(
          dashLength,
          lineHeight,
          lineWidth
        );
        
        const x = (Math.sin(angle1) + Math.sin(angle2)) / 2 * radius;
        const y = ((1 - Math.cos(angle1)) + (1 - Math.cos(angle2))) / 2 * radius;
        
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.set(x, lineHeight / 2, y);
        line.rotation.y = (angle1 + angle2) / 2;
        
        group.add(line);
      }
    }
    
    return group;
  }
  
  generateCurbs(config, cornerType) {
    const group = new THREE.Group();
    
    const curbMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      roughness: 0.6,
      metalness: 0.2
    });
    
    const curbHeight = 0.05;
    const curbPattern = [0xff0000, 0xffffff]; // Red and white
    
    // Generate curbs based on corner type
    // Simplified for now - would need proper path following
    
    return group;
  }
  
  generateRacingLine(config, lineType, cornerType) {
    const group = new THREE.Group();
    
    const lineMaterial = new THREE.MeshBasicMaterial({ 
      color: this.getRacingLineColor(lineType),
      opacity: 0.8,
      transparent: true
    });
    
    const lineWidth = 0.5;
    const lineHeight = 0.02;
    
    // Generate racing line points based on line type
    const points = this.calculateRacingLinePoints(config, lineType, cornerType);
    
    // Create line segments
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      const distance = p1.distanceTo(p2);
      const lineGeometry = new THREE.BoxGeometry(distance, lineHeight, lineWidth);
      
      const midpoint = new THREE.Vector3().lerpVectors(p1, p2, 0.5);
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      
      line.position.copy(midpoint);
      line.position.y = lineHeight / 2;
      
      // Rotate to align with direction
      const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
      line.lookAt(line.position.clone().add(direction));
      
      group.add(line);
    }
    
    return group;
  }
  
  calculateRacingLinePoints(config, lineType, cornerType) {
    const points = [];
    const segments = 32;
    
    if (cornerType === 'CHICANE') {
      // Chicane racing line calculation
      // Simplified - would need proper optimization
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = t * 100 - 50;
        const y = Math.sin(t * Math.PI) * 5 * (lineType === 'ideal' ? 1 : 0.7);
        points.push(new THREE.Vector3(x, 0, y));
      }
    } else {
      // Single corner racing line
      const radius = config.radius;
      const angleRad = (config.angle * Math.PI) / 180;
      const apexPosition = this.getApexPositionForLine(config.apexPosition, lineType);
      
      // Entry phase
      for (let i = 0; i <= segments * 0.3; i++) {
        const t = i / (segments * 0.3);
        const x = -50 + t * 50;
        const y = this.getLineOffset(lineType, 'entry') * (1 - t);
        points.push(new THREE.Vector3(x, 0, y));
      }
      
      // Corner phase
      const cornerSegments = segments * 0.5;
      const lineRadius = this.getLineRadius(radius, lineType);
      
      for (let i = 0; i <= cornerSegments; i++) {
        const t = i / cornerSegments;
        const angle = t * angleRad * apexPosition;
        const x = Math.sin(angle) * lineRadius;
        const y = (1 - Math.cos(angle)) * lineRadius + this.getLineOffset(lineType, 'apex');
        points.push(new THREE.Vector3(x, 0, y));
      }
      
      // Exit phase
      const exitAngle = angleRad * apexPosition;
      const exitX = Math.sin(exitAngle) * lineRadius;
      const exitY = (1 - Math.cos(exitAngle)) * lineRadius;
      
      for (let i = 0; i <= segments * 0.2; i++) {
        const t = i / (segments * 0.2);
        const x = exitX + t * 50 * Math.cos(exitAngle);
        const y = exitY + t * this.getLineOffset(lineType, 'exit');
        points.push(new THREE.Vector3(x, 0, y));
      }
    }
    
    return points;
  }
  
  getRacingLineColor(lineType) {
    switch (lineType) {
      case 'ideal': return 0x00ff00;
      case 'defensive': return 0xffff00;
      case 'overtaking': return 0xff00ff;
      default: return 0x00ff00;
    }
  }
  
  getApexPositionForLine(baseApex, lineType) {
    switch (lineType) {
      case 'ideal': return baseApex;
      case 'defensive': return baseApex * 0.7;
      case 'overtaking': return baseApex * 1.3;
      default: return baseApex;
    }
  }
  
  getLineRadius(baseRadius, lineType) {
    switch (lineType) {
      case 'ideal': return baseRadius;
      case 'defensive': return baseRadius * 0.85;
      case 'overtaking': return baseRadius * 1.1;
      default: return baseRadius;
    }
  }
  
  getLineOffset(lineType, phase) {
    const offsets = {
      ideal: { entry: -4, apex: 0, exit: -4 },
      defensive: { entry: 2, apex: 2, exit: 0 },
      overtaking: { entry: -5, apex: -2, exit: -5 }
    };
    
    return offsets[lineType][phase] || 0;
  }
  
  getEntryPoint(config) {
    return new THREE.Vector3(-50, 0, 0);
  }
  
  getExitPoint(config, cornerType) {
    if (cornerType === 'CHICANE') {
      return new THREE.Vector3(100, 0, 0);
    } else {
      const angleRad = (config.angle * Math.PI) / 180;
      const x = Math.sin(angleRad) * config.radius + 50 * Math.cos(angleRad);
      const y = (1 - Math.cos(angleRad)) * config.radius;
      return new THREE.Vector3(x, 0, y);
    }
  }
  
  getApexPoints(config, cornerType) {
    if (cornerType === 'CHICANE') {
      return [
        new THREE.Vector3(25, 0, 5),
        new THREE.Vector3(75, 0, -5)
      ];
    } else {
      const angleRad = (config.angle * Math.PI) / 180;
      const apexAngle = angleRad * config.apexPosition;
      const x = Math.sin(apexAngle) * config.radius;
      const y = (1 - Math.cos(apexAngle)) * config.radius;
      return [new THREE.Vector3(x, 0, y)];
    }
  }
}