import { PHYSICS_CONFIG } from '../Core/PhysicsEngine.js';

export class TireModel {
  constructor() {
    // Friction circle parameters
    this.frictionCircleResolution = 0.01;
    
    // Temperature model parameters
    this.heatGenerationRate = 0.5;
    this.coolingRate = 0.1;
    this.ambientTemp = 20;
  }
  
  // Pacejka Magic Formula implementation
  calculateForce(slip, load, tireConfig) {
    // Normalize load (250kg nominal load per tire)
    const normalizedLoad = load / (9.81 * 250);
    
    // Load sensitivity (tire force doesn't scale linearly with load)
    const loadFactor = Math.pow(normalizedLoad, tireConfig.loadSensitivity);
    
    // Pacejka formula parameters
    const B = tireConfig.pacejka.B; // Stiffness factor
    const C = tireConfig.pacejka.C; // Shape factor
    const D = tireConfig.pacejka.D * load * loadFactor; // Peak factor
    const E = tireConfig.pacejka.E; // Curvature factor
    
    // Magic formula: F = D * sin(C * atan(B*slip - E*(B*slip - atan(B*slip))))
    const Bx = B * slip;
    const y = D * Math.sin(C * Math.atan(Bx - E * (Bx - Math.atan(Bx))));
    
    return y;
  }
  
  // Combined slip calculation (friction circle/ellipse)
  calculateCombinedForce(slipLateral, slipLongitudinal, load, tireConfig) {
    const maxForce = load * tireConfig.peakMu;
    
    // Calculate combined slip magnitude
    const combinedSlip = Math.sqrt(slipLateral * slipLateral + slipLongitudinal * slipLongitudinal);
    
    if (combinedSlip < 0.001) {
      return { lateral: 0, longitudinal: 0 };
    }
    
    // Calculate force magnitude using Pacejka formula
    const totalForce = this.calculateForce(combinedSlip, load, tireConfig);
    
    // Distribute force based on slip components
    const ratio = totalForce / combinedSlip;
    
    return {
      lateral: slipLateral * ratio,
      longitudinal: slipLongitudinal * ratio,
      combinedSlip: combinedSlip,
      utilizationRatio: totalForce / maxForce
    };
  }
  
  // Calculate slip angle from velocities
  calculateSlipAngle(lateralVelocity, longitudinalVelocity, steeringAngle = 0) {
    // Prevent division by zero
    if (Math.abs(longitudinalVelocity) < 0.1) {
      return 0;
    }
    
    // Slip angle is the angle between tire heading and velocity vector
    const slipAngle = Math.atan2(lateralVelocity, Math.abs(longitudinalVelocity)) - steeringAngle;
    
    // Clamp to reasonable range
    return Math.max(-Math.PI/2, Math.min(Math.PI/2, slipAngle));
  }
  
  // Calculate slip ratio from wheel and vehicle speeds
  calculateSlipRatio(wheelAngularVelocity, vehicleVelocity, wheelRadius, isBraking = false) {
    const wheelLinearVelocity = wheelAngularVelocity * wheelRadius;
    
    // Prevent division by zero
    if (Math.abs(vehicleVelocity) < 0.1 && Math.abs(wheelLinearVelocity) < 0.1) {
      return 0;
    }
    
    let slipRatio;
    
    if (isBraking || wheelLinearVelocity < vehicleVelocity) {
      // Braking slip (negative)
      if (Math.abs(vehicleVelocity) < 0.1) {
        slipRatio = -1; // Locked wheel
      } else {
        slipRatio = (wheelLinearVelocity - vehicleVelocity) / Math.abs(vehicleVelocity);
      }
    } else {
      // Acceleration slip (positive)
      if (Math.abs(wheelLinearVelocity) < 0.1) {
        slipRatio = 0;
      } else {
        slipRatio = (wheelLinearVelocity - vehicleVelocity) / Math.abs(wheelLinearVelocity);
      }
    }
    
    // Clamp to reasonable range
    return Math.max(-1, Math.min(1, slipRatio));
  }
  
  // Temperature effect on grip
  calculateTemperatureEffect(currentTemp, optimalTemp, tempRange = 30) {
    const tempDiff = Math.abs(currentTemp - optimalTemp);
    
    // Quadratic falloff from optimal temperature
    const effect = Math.max(0.7, 1.0 - Math.pow(tempDiff / tempRange, 2));
    
    return effect;
  }
  
  // Calculate tire temperature change
  updateTireTemperature(currentTemp, slip, load, speed, deltaTime) {
    // Heat generation from slip
    const slipMagnitude = Math.abs(slip);
    const heatGeneration = slipMagnitude * load * speed * this.heatGenerationRate * 0.0001;
    
    // Cooling from air flow
    const coolingFactor = 1 + speed * 0.01; // More cooling at higher speeds
    const cooling = (currentTemp - this.ambientTemp) * this.coolingRate * coolingFactor * deltaTime;
    
    // Update temperature
    const newTemp = currentTemp + (heatGeneration - cooling) * deltaTime;
    
    // Clamp to reasonable range
    return Math.max(this.ambientTemp, Math.min(150, newTemp));
  }
  
  // Get grip level based on all factors
  getGripLevel(load, temperature, tireConfig, wearLevel = 0) {
    // Base grip from tire config
    let grip = tireConfig.peakMu;
    
    // Temperature effect
    const tempEffect = this.calculateTemperatureEffect(
      temperature,
      PHYSICS_CONFIG.tireOptimalTemp[tireConfig.type || 'street']
    );
    grip *= tempEffect;
    
    // Wear effect (0 = new, 1 = completely worn)
    grip *= (1 - wearLevel * 0.3);
    
    // Load sensitivity (grip doesn't scale linearly with load)
    const normalizedLoad = load / (9.81 * 250);
    const loadEffect = Math.pow(normalizedLoad, tireConfig.loadSensitivity);
    grip *= loadEffect;
    
    return grip;
  }
  
  // Calculate optimal slip for maximum force
  getOptimalSlip(tireConfig) {
    // For Pacejka model, optimal slip is approximately where derivative = 0
    // This is a simplified approximation
    const B = tireConfig.pacejka.B;
    const E = tireConfig.pacejka.E;
    
    // Optimal slip angle in radians (typically 8-12 degrees)
    const optimalSlipAngle = 0.15; // ~8.6 degrees
    
    // Optimal slip ratio (typically 10-15%)
    const optimalSlipRatio = 0.12;
    
    return {
      angle: optimalSlipAngle,
      ratio: optimalSlipRatio
    };
  }
  
  // Visualize friction circle/ellipse
  getFrictionCirclePoints(maxLateralForce, maxLongitudinalForce, resolution = 32) {
    const points = [];
    
    for (let i = 0; i <= resolution; i++) {
      const angle = (i / resolution) * Math.PI * 2;
      const x = Math.cos(angle) * maxLateralForce;
      const y = Math.sin(angle) * maxLongitudinalForce;
      points.push({ x, y });
    }
    
    return points;
  }
  
  // Get current force utilization
  getForceUtilization(lateralForce, longitudinalForce, maxForce) {
    const totalForce = Math.sqrt(lateralForce * lateralForce + longitudinalForce * longitudinalForce);
    return {
      magnitude: totalForce,
      angle: Math.atan2(lateralForce, longitudinalForce),
      utilization: totalForce / maxForce,
      lateral: lateralForce / maxForce,
      longitudinal: longitudinalForce / maxForce
    };
  }
}