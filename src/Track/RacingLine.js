import * as THREE from 'three';

export const RACING_LINES = {
  IDEAL: {
    name: "Ideal/Optimal",
    apexOffset: 1.0,
    entryPoint: "outside",
    exitPoint: "outside", 
    brakePoint: "normal",
    description: "Maximizes corner radius for highest speed",
    color: 0x00ff00
  },
  
  DEFENSIVE: {
    name: "Defensive",
    apexOffset: 0.7,
    entryPoint: "inside",
    exitPoint: "middle",
    brakePoint: "early",
    description: "Blocks inside, sacrifices exit speed",
    color: 0xffff00
  },
  
  OVERTAKING: {
    name: "Aggressive/Overtaking", 
    apexOffset: 1.3,
    entryPoint: "outside_late",
    exitPoint: "outside",
    brakePoint: "late",
    description: "Late braking, better exit for passing",
    color: 0xff00ff
  }
};

export const BRAKING_STYLES = {
  THRESHOLD: {
    name: "Threshold",
    maxBrakeForce: 1.0,
    releaseProfile: "immediate",
    description: "Maximum braking to threshold of lock-up"
  },
  
  TRAIL: {
    name: "Trail Braking",
    maxBrakeForce: 0.85,
    releaseProfile: "gradual",
    trailPercentage: 0.15,
    description: "Gradual release while turning"
  },
  
  EARLY: {
    name: "Early/Safe",
    maxBrakeForce: 0.7,
    releaseProfile: "complete",
    safetyMargin: 1.2,
    description: "Complete braking before turn-in"
  }
};

export class RacingLine {
  constructor() {
    this.resolution = 100; // Points per racing line
    this.smoothingFactor = 0.3;
  }
  
  calculateOptimalLine(corner, vehicle, conditions = {}) {
    const points = [];
    const cornerConfig = corner.config;
    
    // Adjust for vehicle characteristics
    const vehicleFactors = this.getVehicleFactors(vehicle);
    
    // Adjust for conditions (wet, tire wear, etc.)
    const conditionFactors = this.getConditionFactors(conditions);
    
    // Calculate key points
    const brakePoint = this.calculateBrakePoint(cornerConfig, vehicle, vehicleFactors, conditionFactors);
    const turnInPoint = this.calculateTurnInPoint(cornerConfig, brakePoint, vehicleFactors);
    const apexPoint = this.calculateApexPoint(cornerConfig, vehicleFactors);
    const exitPoint = this.calculateExitPoint(cornerConfig, vehicleFactors);
    
    // Generate smooth path through key points
    const path = this.generateSmoothPath([
      corner.entryPoint,
      brakePoint,
      turnInPoint,
      apexPoint,
      exitPoint,
      corner.exitPoint
    ]);
    
    return {
      points: path,
      brakePoint,
      turnInPoint,
      apexPoint,
      exitPoint,
      speedProfile: this.calculateSpeedProfile(path, cornerConfig, vehicle)
    };
  }
  
  calculateRacingLine(corner, lineType = 'IDEAL', vehicle = null) {
    const lineConfig = RACING_LINES[lineType];
    const cornerConfig = corner.config;
    
    // Get track width and boundaries
    const trackWidth = 12; // meters
    const trackLimits = this.getTrackLimits(corner);
    
    // Calculate line based on type
    let points = [];
    
    switch (lineType) {
      case 'IDEAL':
        points = this.calculateIdealLine(corner, trackLimits);
        break;
      case 'DEFENSIVE':
        points = this.calculateDefensiveLine(corner, trackLimits);
        break;
      case 'OVERTAKING':
        points = this.calculateOvertakingLine(corner, trackLimits);
        break;
    }
    
    // Apply vehicle-specific adjustments if provided
    if (vehicle) {
      points = this.adjustForVehicle(points, vehicle, cornerConfig);
    }
    
    // Smooth the line
    const smoothedPoints = this.smoothPath(points, this.smoothingFactor);
    
    // Calculate additional data
    const lineData = {
      points: smoothedPoints,
      color: lineConfig.color,
      speeds: this.calculateSpeedAtPoints(smoothedPoints, cornerConfig, vehicle),
      forces: this.calculateForcesAtPoints(smoothedPoints, cornerConfig, vehicle),
      ...this.findKeyPoints(smoothedPoints, cornerConfig)
    };
    
    return lineData;
  }
  
  calculateIdealLine(corner, trackLimits) {
    const points = [];
    const config = corner.config;
    
    // Entry - use full track width
    const entryOffset = -trackLimits.width / 2 + 1; // 1m from edge
    
    // Calculate geometric apex
    const geometricApex = this.calculateGeometricApex(config);
    
    // Late apex for better exit
    const racingApex = {
      ...geometricApex,
      position: geometricApex.position * 1.1 // 10% later
    };
    
    // Generate points
    for (let i = 0; i <= this.resolution; i++) {
      const t = i / this.resolution;
      const point = this.interpolateRacingLine(
        corner.entryPoint,
        racingApex,
        corner.exitPoint,
        t,
        entryOffset,
        0, // Apex at inside edge
        -trackLimits.width / 2 + 1 // Exit wide
      );
      points.push(point);
    }
    
    return points;
  }
  
  calculateDefensiveLine(corner, trackLimits) {
    const points = [];
    const config = corner.config;
    
    // Entry - protect inside
    const entryOffset = trackLimits.width / 2 - 3; // Leave minimal space
    
    // Early apex
    const defensiveApex = {
      position: config.apexPosition * 0.7,
      radius: config.radius * 0.85
    };
    
    // Exit - compromise for position
    const exitOffset = 0; // Middle of track
    
    // Generate points
    for (let i = 0; i <= this.resolution; i++) {
      const t = i / this.resolution;
      const point = this.interpolateRacingLine(
        corner.entryPoint,
        defensiveApex,
        corner.exitPoint,
        t,
        entryOffset,
        2, // Apex slightly off inside
        exitOffset
      );
      points.push(point);
    }
    
    return points;
  }
  
  calculateOvertakingLine(corner, trackLimits) {
    const points = [];
    const config = corner.config;
    
    // Entry - stay wide for late braking
    const entryOffset = -trackLimits.width / 2 + 1;
    
    // Very late apex for better exit
    const overtakingApex = {
      position: config.apexPosition * 1.3,
      radius: config.radius * 1.1
    };
    
    // Exit - use full width for acceleration
    const exitOffset = -trackLimits.width / 2 + 0.5;
    
    // Generate points with late braking zone
    for (let i = 0; i <= this.resolution; i++) {
      const t = i / this.resolution;
      const point = this.interpolateRacingLine(
        corner.entryPoint,
        overtakingApex,
        corner.exitPoint,
        t,
        entryOffset,
        -1, // Slightly wide at apex
        exitOffset
      );
      points.push(point);
    }
    
    return points;
  }
  
  calculateBrakePoint(cornerConfig, vehicle, vehicleFactors, conditionFactors) {
    // Base braking distance calculation
    const entrySpeed = cornerConfig.entrySpeed[vehicle.type] || 100; // km/h
    const cornerSpeed = this.calculateCornerSpeed(cornerConfig, vehicle);
    
    const speedDiff = (entrySpeed - cornerSpeed) / 3.6; // m/s
    const deceleration = vehicle.maxBrakingG * 9.81 * conditionFactors.grip;
    
    const brakingDistance = (speedDiff * speedDiff) / (2 * deceleration);
    
    // Add safety margin
    const safetyMargin = vehicleFactors.brakingConfidence * conditionFactors.visibility;
    const adjustedDistance = brakingDistance * safetyMargin;
    
    // Calculate position before corner entry
    const brakePoint = corner.entryPoint.clone();
    brakePoint.x -= adjustedDistance;
    
    return brakePoint;
  }
  
  calculateTurnInPoint(cornerConfig, brakePoint, vehicleFactors) {
    // Turn-in happens after initial braking
    const turnInDistance = 10 * vehicleFactors.turnInAggressiveness;
    
    const turnInPoint = brakePoint.clone();
    turnInPoint.x += turnInDistance;
    
    return turnInPoint;
  }
  
  calculateApexPoint(cornerConfig, vehicleFactors) {
    const angleRad = (cornerConfig.angle * Math.PI) / 180;
    const apexAngle = angleRad * cornerConfig.apexPosition * vehicleFactors.apexTiming;
    
    const x = Math.sin(apexAngle) * cornerConfig.radius;
    const z = (1 - Math.cos(apexAngle)) * cornerConfig.radius;
    
    return new THREE.Vector3(x, 0, z);
  }
  
  calculateExitPoint(cornerConfig, vehicleFactors) {
    const angleRad = (cornerConfig.angle * Math.PI) / 180;
    const exitRadius = cornerConfig.radius * vehicleFactors.exitLine;
    
    const x = Math.sin(angleRad) * exitRadius;
    const z = (1 - Math.cos(angleRad)) * exitRadius;
    
    // Add track-out distance
    const trackOutDistance = 20 * vehicleFactors.exitAggressiveness;
    x += trackOutDistance * Math.cos(angleRad);
    z += trackOutDistance * Math.sin(angleRad);
    
    return new THREE.Vector3(x, 0, z);
  }
  
  calculateCornerSpeed(cornerConfig, vehicle) {
    // v = sqrt(μ * g * r)
    const mu = vehicle.tire.peakMu;
    const g = 9.81;
    const r = cornerConfig.radius;
    
    const maxSpeed = Math.sqrt(mu * g * r) * 3.6; // km/h
    
    // Apply vehicle-specific limits
    return Math.min(maxSpeed, vehicle.maxSpeed);
  }
  
  calculateSpeedProfile(path, cornerConfig, vehicle) {
    const speeds = [];
    const distances = this.calculateDistances(path);
    
    for (let i = 0; i < path.length; i++) {
      const distance = distances[i];
      const curvature = this.calculateCurvature(path, i);
      
      // Speed based on curvature
      const radiusAtPoint = 1 / Math.max(curvature, 0.001);
      const maxSpeedAtPoint = Math.sqrt(vehicle.maxLateralG * 9.81 * radiusAtPoint) * 3.6;
      
      // Consider acceleration/braking constraints
      let speed = maxSpeedAtPoint;
      
      if (i > 0) {
        const prevSpeed = speeds[i - 1];
        const distanceDiff = distances[i] - distances[i - 1];
        
        // Maximum speed change based on acceleration/braking
        const maxAccel = vehicle.maxAccelerationG * 9.81;
        const maxBrake = vehicle.maxBrakingG * 9.81;
        
        const maxSpeedIncrease = Math.sqrt(prevSpeed * prevSpeed + 2 * maxAccel * distanceDiff);
        const maxSpeedDecrease = Math.sqrt(Math.max(0, prevSpeed * prevSpeed - 2 * maxBrake * distanceDiff));
        
        speed = Math.max(maxSpeedDecrease, Math.min(maxSpeedIncrease, speed));
      }
      
      speeds.push(speed);
    }
    
    // Backward pass to ensure we can slow down in time
    for (let i = speeds.length - 2; i >= 0; i--) {
      const nextSpeed = speeds[i + 1];
      const distanceDiff = distances[i + 1] - distances[i];
      const maxBrake = vehicle.maxBrakingG * 9.81;
      
      const maxSpeed = Math.sqrt(nextSpeed * nextSpeed + 2 * maxBrake * distanceDiff);
      speeds[i] = Math.min(speeds[i], maxSpeed);
    }
    
    return speeds;
  }
  
  calculateSpeedAtPoints(points, cornerConfig, vehicle) {
    if (!vehicle) {
      // Default speeds based on corner type
      return points.map(() => cornerConfig.entrySpeed.RX8);
    }
    
    return this.calculateSpeedProfile(points, cornerConfig, vehicle);
  }
  
  calculateForcesAtPoints(points, cornerConfig, vehicle) {
    if (!vehicle) return [];
    
    const forces = [];
    const speeds = this.calculateSpeedAtPoints(points, cornerConfig, vehicle);
    
    for (let i = 0; i < points.length; i++) {
      const speed = speeds[i] / 3.6; // m/s
      const curvature = this.calculateCurvature(points, i);
      
      // Lateral force
      const lateralAccel = speed * speed * curvature;
      const lateralG = lateralAccel / 9.81;
      
      // Longitudinal force
      let longitudinalG = 0;
      if (i > 0 && i < points.length - 1) {
        const speedChange = (speeds[i + 1] - speeds[i - 1]) / 3.6;
        const distance = points[i + 1].distanceTo(points[i - 1]);
        const time = distance / speed;
        longitudinalG = (speedChange / time) / 9.81;
      }
      
      forces.push({
        lateral: lateralG,
        longitudinal: longitudinalG,
        combined: Math.sqrt(lateralG * lateralG + longitudinalG * longitudinalG)
      });
    }
    
    return forces;
  }
  
  interpolateRacingLine(entry, apex, exit, t, entryOffset, apexOffset, exitOffset) {
    // Bezier curve interpolation through racing line
    if (t < 0.5) {
      // Entry to apex
      const localT = t * 2;
      const p0 = entry.clone();
      p0.z += entryOffset;
      
      const p1 = apex.position;
      const control = new THREE.Vector3(
        p0.x + (p1.x - p0.x) * 0.5,
        0,
        p0.z
      );
      
      return this.bezierPoint(p0, control, p1, localT);
    } else {
      // Apex to exit
      const localT = (t - 0.5) * 2;
      const p0 = apex.position;
      const p1 = exit.clone();
      p1.z += exitOffset;
      
      const control = new THREE.Vector3(
        p0.x + (p1.x - p0.x) * 0.5,
        0,
        p1.z
      );
      
      return this.bezierPoint(p0, control, p1, localT);
    }
  }
  
  bezierPoint(p0, p1, p2, t) {
    const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
    const z = (1 - t) * (1 - t) * p0.z + 2 * (1 - t) * t * p1.z + t * t * p2.z;
    return new THREE.Vector3(x, 0, z);
  }
  
  smoothPath(points, factor) {
    const smoothed = [];
    
    for (let i = 0; i < points.length; i++) {
      if (i === 0 || i === points.length - 1) {
        smoothed.push(points[i].clone());
        continue;
      }
      
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      const smoothedPoint = new THREE.Vector3(
        curr.x * (1 - factor) + (prev.x + next.x) * factor * 0.5,
        curr.y,
        curr.z * (1 - factor) + (prev.z + next.z) * factor * 0.5
      );
      
      smoothed.push(smoothedPoint);
    }
    
    return smoothed;
  }
  
  generateSmoothPath(keyPoints) {
    // Catmull-Rom spline through key points
    const curve = new THREE.CatmullRomCurve3(keyPoints);
    const points = curve.getPoints(this.resolution);
    return points;
  }
  
  calculateCurvature(points, index) {
    if (index === 0 || index === points.length - 1) return 0;
    
    const p0 = points[index - 1];
    const p1 = points[index];
    const p2 = points[index + 1];
    
    // Calculate curvature using three points
    const d1 = p1.clone().sub(p0);
    const d2 = p2.clone().sub(p1);
    
    const cross = new THREE.Vector3().crossVectors(d1, d2);
    const denom = d1.length() * d2.length();
    
    if (denom < 0.001) return 0;
    
    return cross.length() / denom;
  }
  
  calculateDistances(points) {
    const distances = [0];
    let totalDistance = 0;
    
    for (let i = 1; i < points.length; i++) {
      totalDistance += points[i].distanceTo(points[i - 1]);
      distances.push(totalDistance);
    }
    
    return distances;
  }
  
  findKeyPoints(points, cornerConfig) {
    // Find brake point, turn-in, apex, and exit
    const curvatures = points.map((_, i) => this.calculateCurvature(points, i));
    
    // Find maximum curvature (apex)
    let maxCurvature = 0;
    let apexIndex = 0;
    
    for (let i = 0; i < curvatures.length; i++) {
      if (curvatures[i] > maxCurvature) {
        maxCurvature = curvatures[i];
        apexIndex = i;
      }
    }
    
    // Find where curvature starts increasing significantly (turn-in)
    let turnInIndex = 0;
    for (let i = 0; i < apexIndex; i++) {
      if (curvatures[i] > maxCurvature * 0.1) {
        turnInIndex = i;
        break;
      }
    }
    
    // Brake point is before turn-in
    const brakeIndex = Math.max(0, turnInIndex - 10);
    
    // Exit is where curvature drops back down
    let exitIndex = points.length - 1;
    for (let i = apexIndex; i < curvatures.length; i++) {
      if (curvatures[i] < maxCurvature * 0.1) {
        exitIndex = i;
        break;
      }
    }
    
    return {
      brakePoint: points[brakeIndex],
      brakeIndex,
      turnInPoint: points[turnInIndex],
      turnInIndex,
      apexPoint: points[apexIndex],
      apexIndex,
      exitPoint: points[exitIndex],
      exitIndex
    };
  }
  
  getVehicleFactors(vehicle) {
    // Adjust racing line based on vehicle characteristics
    const factors = {
      brakingConfidence: 1.0,
      turnInAggressiveness: 1.0,
      apexTiming: 1.0,
      exitLine: 1.0,
      exitAggressiveness: 1.0
    };
    
    if (vehicle.type === 'F1') {
      // F1 can brake later and be more aggressive
      factors.brakingConfidence = 0.85;
      factors.turnInAggressiveness = 1.2;
      factors.exitAggressiveness = 1.3;
    } else {
      // Street car needs more margin
      factors.brakingConfidence = 1.15;
      factors.turnInAggressiveness = 0.9;
      factors.exitAggressiveness = 0.8;
    }
    
    return factors;
  }
  
  getConditionFactors(conditions) {
    return {
      grip: conditions.grip || 1.0,
      visibility: conditions.visibility || 1.0,
      traffic: conditions.traffic || 1.0
    };
  }
  
  getTrackLimits(corner) {
    return {
      width: 12,
      innerLimit: 0,
      outerLimit: 12
    };
  }
  
  calculateGeometricApex(config) {
    return {
      position: config.apexPosition,
      radius: config.radius
    };
  }
  
  adjustForVehicle(points, vehicle, cornerConfig) {
    // Vehicle-specific adjustments
    const adjusted = points.slice();
    
    if (vehicle.type === 'F1') {
      // F1 can use more track width and carry more speed
      // Adjust points outward slightly for better radius
    }
    
    return adjusted;
  }
}