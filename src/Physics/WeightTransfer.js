import { PHYSICS_CONFIG } from '../Core/PhysicsEngine.js';

export class WeightTransfer {
  constructor() {
    // Store previous values for smoothing
    this.previousWeights = {
      FL: 0, FR: 0, RL: 0, RR: 0
    };
    
    // Damping factor for weight transfer (prevents oscillations)
    this.dampingFactor = 0.8;
  }
  
  // Calculate lateral weight transfer during cornering
  calculateLateral(vehicle, lateralG, trackWidth = null) {
    const totalWeight = vehicle.mass * PHYSICS_CONFIG.gravity;
    const avgTrackWidth = trackWidth || (vehicle.trackWidth.front + vehicle.trackWidth.rear) / 2;
    
    // Weight transfer = (Total Weight × Lateral G × CG Height) / Track Width
    const transfer = (totalWeight * lateralG * vehicle.cgHeight) / avgTrackWidth;
    
    // Distribute static weight
    const frontWeight = totalWeight * vehicle.weightDistribution.front;
    const rearWeight = totalWeight * vehicle.weightDistribution.rear;
    
    return {
      frontLeft: (frontWeight / 2) - (transfer * vehicle.weightDistribution.front),
      frontRight: (frontWeight / 2) + (transfer * vehicle.weightDistribution.front),
      rearLeft: (rearWeight / 2) - (transfer * vehicle.weightDistribution.rear),
      rearRight: (rearWeight / 2) + (transfer * vehicle.weightDistribution.rear),
      totalTransfer: Math.abs(transfer)
    };
  }
  
  // Calculate longitudinal weight transfer during braking/acceleration
  calculateLongitudinal(vehicle, longitudinalG) {
    const totalWeight = vehicle.mass * PHYSICS_CONFIG.gravity;
    
    // Weight transfer = (Total Weight × Longitudinal G × CG Height) / Wheelbase
    const transfer = (totalWeight * longitudinalG * vehicle.cgHeight) / vehicle.wheelbase;
    
    // Positive longitudinalG = acceleration (weight to rear)
    // Negative longitudinalG = braking (weight to front)
    return {
      frontAxle: (totalWeight * vehicle.weightDistribution.front) - transfer,
      rearAxle: (totalWeight * vehicle.weightDistribution.rear) + transfer,
      totalTransfer: Math.abs(transfer)
    };
  }
  
  // Calculate combined weight transfer for all four wheels
  calculateCombined(vehicle, lateralG, longitudinalG, rollAngle = 0, pitchAngle = 0) {
    const totalWeight = vehicle.mass * PHYSICS_CONFIG.gravity;
    
    // Calculate transfer amounts
    const latTransferFront = (totalWeight * vehicle.weightDistribution.front * lateralG * vehicle.cgHeight) / vehicle.trackWidth.front;
    const latTransferRear = (totalWeight * vehicle.weightDistribution.rear * lateralG * vehicle.cgHeight) / vehicle.trackWidth.rear;
    const longTransfer = (totalWeight * longitudinalG * vehicle.cgHeight) / vehicle.wheelbase;
    
    // Static weight distribution
    const staticFront = totalWeight * vehicle.weightDistribution.front;
    const staticRear = totalWeight * vehicle.weightDistribution.rear;
    
    // Dynamic front/rear distribution
    const dynamicFront = staticFront - longTransfer;
    const dynamicRear = staticRear + longTransfer;
    
    // Calculate individual wheel loads
    const weights = {
      FL: (dynamicFront / 2) - latTransferFront,
      FR: (dynamicFront / 2) + latTransferFront,
      RL: (dynamicRear / 2) - latTransferRear,
      RR: (dynamicRear / 2) + latTransferRear
    };
    
    // Apply roll effect if provided
    if (rollAngle !== 0) {
      const rollEffect = this.calculateRollEffect(vehicle, rollAngle);
      weights.FL += rollEffect.FL;
      weights.FR += rollEffect.FR;
      weights.RL += rollEffect.RL;
      weights.RR += rollEffect.RR;
    }
    
    // Apply pitch effect if provided
    if (pitchAngle !== 0) {
      const pitchEffect = this.calculatePitchEffect(vehicle, pitchAngle);
      weights.FL += pitchEffect.front;
      weights.FR += pitchEffect.front;
      weights.RL += pitchEffect.rear;
      weights.RR += pitchEffect.rear;
    }
    
    // Ensure no negative weights
    Object.keys(weights).forEach(key => {
      weights[key] = Math.max(0, weights[key]);
    });
    
    return weights;
  }
  
  // Calculate effect of body roll on weight distribution
  calculateRollEffect(vehicle, rollAngle) {
    const totalWeight = vehicle.mass * PHYSICS_CONFIG.gravity;
    const rollMoment = totalWeight * vehicle.cgHeight * Math.sin(rollAngle);
    
    // Distribute roll moment based on roll stiffness
    const frontRollStiffness = vehicle.springRate.front * Math.pow(vehicle.trackWidth.front / 2, 2);
    const rearRollStiffness = vehicle.springRate.rear * Math.pow(vehicle.trackWidth.rear / 2, 2);
    const totalRollStiffness = frontRollStiffness + rearRollStiffness;
    
    const frontRollTransfer = (rollMoment * frontRollStiffness / totalRollStiffness) / vehicle.trackWidth.front;
    const rearRollTransfer = (rollMoment * rearRollStiffness / totalRollStiffness) / vehicle.trackWidth.rear;
    
    return {
      FL: -frontRollTransfer,
      FR: frontRollTransfer,
      RL: -rearRollTransfer,
      RR: rearRollTransfer
    };
  }
  
  // Calculate effect of body pitch on weight distribution
  calculatePitchEffect(vehicle, pitchAngle) {
    const totalWeight = vehicle.mass * PHYSICS_CONFIG.gravity;
    const pitchMoment = totalWeight * vehicle.cgHeight * Math.sin(pitchAngle);
    const pitchTransfer = pitchMoment / vehicle.wheelbase;
    
    return {
      front: -pitchTransfer / 2, // Per wheel
      rear: pitchTransfer / 2    // Per wheel
    };
  }
  
  // Apply damping to prevent oscillations
  applyDamping(currentWeights, deltaTime) {
    const damped = {};
    
    Object.keys(currentWeights).forEach(key => {
      const current = currentWeights[key];
      const previous = this.previousWeights[key] || current;
      const rate = Math.min(1, deltaTime * 10); // Adjust rate based on time step
      
      damped[key] = previous + (current - previous) * rate * this.dampingFactor;
      this.previousWeights[key] = damped[key];
    });
    
    return damped;
  }
  
  // Calculate weight transfer during trail braking
  calculateTrailBraking(vehicle, brakeForce, lateralG, speed) {
    // Trail braking transfers more weight to the front-outside wheel
    const brakingG = (brakeForce / (vehicle.mass * PHYSICS_CONFIG.gravity));
    
    // Calculate base weight transfer
    const weights = this.calculateCombined(vehicle, lateralG, -brakingG);
    
    // Additional transfer to front wheels during trail braking
    const trailEffect = Math.min(0.15, speed / 100) * brakeForce * 0.001;
    
    // Bias transfer to outside front wheel
    if (lateralG > 0) {
      weights.FR += trailEffect;
      weights.FL -= trailEffect * 0.3;
    } else {
      weights.FL += trailEffect;
      weights.FR -= trailEffect * 0.3;
    }
    
    return weights;
  }
  
  // Calculate anti-roll bar effect
  calculateAntiRollEffect(vehicle, lateralG, antiRollStiffness) {
    const rollMoment = vehicle.mass * PHYSICS_CONFIG.gravity * lateralG * vehicle.cgHeight;
    
    // Anti-roll bar resists body roll
    const antiRollForce = rollMoment * antiRollStiffness;
    
    return {
      additionalTransfer: antiRollForce / ((vehicle.trackWidth.front + vehicle.trackWidth.rear) / 2)
    };
  }
  
  // Get weight distribution percentages
  getDistributionPercentages(weights) {
    const total = weights.FL + weights.FR + weights.RL + weights.RR;
    
    return {
      FL: (weights.FL / total) * 100,
      FR: (weights.FR / total) * 100,
      RL: (weights.RL / total) * 100,
      RR: (weights.RR / total) * 100,
      frontTotal: ((weights.FL + weights.FR) / total) * 100,
      rearTotal: ((weights.RL + weights.RR) / total) * 100,
      leftTotal: ((weights.FL + weights.RL) / total) * 100,
      rightTotal: ((weights.FR + weights.RR) / total) * 100
    };
  }
  
  // Calculate center of gravity shift
  calculateCGShift(vehicle, lateralG, longitudinalG) {
    // CG shifts due to chassis roll and pitch
    const rollAngle = Math.atan(lateralG * vehicle.cgHeight / (vehicle.trackWidth.front / 2));
    const pitchAngle = Math.atan(longitudinalG * vehicle.cgHeight / (vehicle.wheelbase / 2));
    
    return {
      lateral: vehicle.cgHeight * Math.sin(rollAngle),
      longitudinal: vehicle.cgHeight * Math.sin(pitchAngle),
      vertical: vehicle.cgHeight * (1 - Math.cos(rollAngle) * Math.cos(pitchAngle))
    };
  }
  
  // Visualize weight transfer as a balance point
  getBalancePoint(weights) {
    const total = weights.FL + weights.FR + weights.RL + weights.RR;
    
    // Calculate normalized position (0-1 range)
    const frontBias = (weights.FL + weights.FR) / total;
    const leftBias = (weights.FL + weights.RL) / total;
    
    return {
      x: (leftBias - 0.5) * 2, // -1 (full right) to 1 (full left)
      y: (frontBias - 0.5) * 2  // -1 (full rear) to 1 (full front)
    };
  }
}