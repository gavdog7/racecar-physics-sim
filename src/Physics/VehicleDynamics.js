import * as THREE from 'three';
import { PHYSICS_CONFIG } from '../Core/PhysicsEngine.js';

export class VehicleDynamics {
  constructor(config, physicsEngine) {
    this.config = config;
    this.physicsEngine = physicsEngine;
    
    // Create physics body
    const vehicleData = physicsEngine.createVehicleBody(config);
    this.body = vehicleData.body;
    this.wheels = vehicleData.wheels;
    
    // State tracking
    this.state = {
      rpm: config.idleRPM,
      gear: 1,
      speed: 0,
      throttle: 0,
      brake: 0,
      steering: 0,
      handbrake: false,
      clutch: 0,
      drsActive: false,
      ersDeployment: 0,
      wheelLoads: [0, 0, 0, 0],
      tireTemps: [20, 20, 20, 20],
      brakeTemps: [20, 20, 20, 20],
      fuelLoad: 100,
      lateralG: 0,
      longitudinalG: 0,
      yawRate: 0
    };
    
    // Performance tracking
    this.telemetry = {
      maxSpeed: 0,
      maxLateralG: 0,
      maxBrakingG: 0,
      maxAccelerationG: 0,
      lapTime: 0,
      distance: 0
    };
    
    // Initialize position
    this.resetPosition();
  }
  
  update(controls, deltaTime) {
    // Update control inputs
    this.state.throttle = controls.throttle;
    this.state.brake = controls.brake;
    this.state.steering = controls.steeringAngle;
    this.state.handbrake = controls.handbrake;
    
    // Calculate current speed
    const velocity = this.body.velocity;
    this.state.speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    
    // Update RPM based on wheel speed and gear
    this.updateEngine(deltaTime);
    
    // Calculate forces
    const wheelForces = this.calculateWheelForces(deltaTime);
    const aeroForces = this.calculateAerodynamicForces();
    
    // Apply forces
    this.physicsEngine.applyWheelForces({ body: this.body, wheels: this.wheels }, wheelForces);
    this.applyAerodynamicForces(aeroForces);
    
    // Update telemetry
    this.updateTelemetry(deltaTime);
    
    // Update temperatures
    this.updateTemperatures(deltaTime);
  }
  
  calculateWheelForces(deltaTime) {
    const forces = [];
    
    this.wheels.forEach((wheel, index) => {
      // Calculate wheel load (simplified - should use suspension compression)
      const staticLoad = this.getStaticWheelLoad(index);
      const dynamicLoad = this.calculateDynamicLoad(index);
      const totalLoad = staticLoad + dynamicLoad;
      this.state.wheelLoads[index] = totalLoad;
      
      // Calculate slip angle and slip ratio
      const slipAngle = this.calculateSlipAngle(wheel, index);
      const slipRatio = this.calculateSlipRatio(wheel, index);
      
      // Calculate tire forces using Pacejka model
      const tireForce = this.calculateTireForce(slipAngle, slipRatio, totalLoad, index);
      
      // Apply brake force
      if (this.state.brake > 0 || this.state.handbrake) {
        const brakeForce = this.calculateBrakeForce(index);
        tireForce.longitudinal -= brakeForce;
      }
      
      // Apply throttle force (rear wheels only for RWD)
      if (index >= 2 && this.state.throttle > 0) {
        const driveForce = this.calculateDriveForce();
        tireForce.longitudinal += driveForce / 2; // Split between rear wheels
      }
      
      forces.push(tireForce);
    });
    
    return forces;
  }
  
  getStaticWheelLoad(wheelIndex) {
    const totalWeight = this.config.mass * PHYSICS_CONFIG.gravity;
    const frontWeight = totalWeight * this.config.weightDistribution.front;
    const rearWeight = totalWeight * this.config.weightDistribution.rear;
    
    // Distribute weight to each wheel
    if (wheelIndex < 2) {
      return frontWeight / 2;
    } else {
      return rearWeight / 2;
    }
  }
  
  calculateDynamicLoad(wheelIndex) {
    // Simplified dynamic load transfer
    const lateralTransfer = this.calculateLateralWeightTransfer();
    const longitudinalTransfer = this.calculateLongitudinalWeightTransfer();
    
    let dynamicLoad = 0;
    
    // Lateral transfer
    if (wheelIndex === 0 || wheelIndex === 2) { // Left wheels
      dynamicLoad -= lateralTransfer;
    } else { // Right wheels
      dynamicLoad += lateralTransfer;
    }
    
    // Longitudinal transfer
    if (wheelIndex < 2) { // Front wheels
      dynamicLoad += longitudinalTransfer;
    } else { // Rear wheels
      dynamicLoad -= longitudinalTransfer;
    }
    
    return dynamicLoad;
  }
  
  calculateLateralWeightTransfer() {
    const lateralAccel = this.state.lateralG * PHYSICS_CONFIG.gravity;
    const totalWeight = this.config.mass * PHYSICS_CONFIG.gravity;
    const avgTrackWidth = (this.config.trackWidth.front + this.config.trackWidth.rear) / 2;
    
    return (totalWeight * lateralAccel * this.config.cgHeight) / avgTrackWidth;
  }
  
  calculateLongitudinalWeightTransfer() {
    const longAccel = this.state.longitudinalG * PHYSICS_CONFIG.gravity;
    const totalWeight = this.config.mass * PHYSICS_CONFIG.gravity;
    
    return (totalWeight * longAccel * this.config.cgHeight) / this.config.wheelbase;
  }
  
  calculateSlipAngle(wheel, index) {
    // Simplified slip angle calculation
    const wheelVelocity = wheel.body.velocity;
    const lateralVel = wheelVelocity.x;
    const longitudinalVel = wheelVelocity.z;
    
    if (Math.abs(longitudinalVel) < 0.1) return 0;
    
    let slipAngle = Math.atan(lateralVel / Math.abs(longitudinalVel));
    
    // Add steering angle for front wheels
    if (index < 2) {
      slipAngle -= this.state.steering;
    }
    
    return slipAngle;
  }
  
  calculateSlipRatio(wheel, index) {
    // Simplified slip ratio calculation
    const wheelRadius = this.config.tire.radius;
    const wheelAngularVel = wheel.body.angularVelocity.x;
    const wheelLinearVel = wheelAngularVel * wheelRadius;
    const vehicleVel = this.state.speed;
    
    if (vehicleVel < 0.1) return 0;
    
    return (wheelLinearVel - vehicleVel) / vehicleVel;
  }
  
  calculateTireForce(slipAngle, slipRatio, load, wheelIndex) {
    // Use simplified tire model for now
    const tire = this.config.tire;
    const lateralForce = -slipAngle * load * tire.peakMu * 10000;
    const longitudinalForce = -slipRatio * load * tire.peakMu * 10000;
    
    return {
      lateral: lateralForce,
      longitudinal: longitudinalForce,
      vertical: 0
    };
  }
  
  calculateBrakeForce(wheelIndex) {
    const maxBrakeForce = wheelIndex < 2 ? 
      this.config.brakeForce.front : 
      this.config.brakeForce.rear;
    
    let brakeInput = this.state.brake;
    if (this.state.handbrake && wheelIndex >= 2) {
      brakeInput = Math.max(brakeInput, 1.0);
    }
    
    return maxBrakeForce * brakeInput;
  }
  
  calculateDriveForce() {
    // Simplified drive force calculation
    const engineTorque = this.getEngineTorque();
    const gearRatio = this.config.gearRatios[this.state.gear - 1];
    const finalDrive = this.config.finalDrive;
    const wheelRadius = this.config.tire.radius;
    
    const wheelTorque = engineTorque * gearRatio * finalDrive;
    const driveForce = wheelTorque / wheelRadius;
    
    return driveForce * this.state.throttle;
  }
  
  getEngineTorque() {
    // Interpolate torque from curve
    const torqueCurve = this.config.torqueCurve;
    const rpm = this.state.rpm;
    
    // Find surrounding points
    let lowerPoint = torqueCurve[0];
    let upperPoint = torqueCurve[torqueCurve.length - 1];
    
    for (let i = 0; i < torqueCurve.length - 1; i++) {
      if (rpm >= torqueCurve[i].rpm && rpm <= torqueCurve[i + 1].rpm) {
        lowerPoint = torqueCurve[i];
        upperPoint = torqueCurve[i + 1];
        break;
      }
    }
    
    // Linear interpolation
    const t = (rpm - lowerPoint.rpm) / (upperPoint.rpm - lowerPoint.rpm);
    return lowerPoint.torque + t * (upperPoint.torque - lowerPoint.torque);
  }
  
  calculateAerodynamicForces() {
    const velocity = this.body.velocity;
    const speed = velocity.length();
    const speedSquared = speed * speed;
    const q = 0.5 * PHYSICS_CONFIG.airDensity * speedSquared;
    
    // Drag force
    const dragForce = q * this.config.dragCoefficient * this.config.frontalArea;
    
    // Downforce (F1 specific)
    let frontDownforce = 0;
    let rearDownforce = 0;
    
    if (this.config.downforceCoefficient) {
      const totalDownforce = q * (this.config.downforceCoefficient.front + 
                                  this.config.downforceCoefficient.rear) * 
                                  this.config.frontalArea;
      
      // Apply ground effect
      const groundEffect = speed > 13.9 ? this.config.groundEffectMultiplier : 1.0;
      
      // Apply DRS if active
      const drsMultiplier = this.state.drsActive ? (1 - this.config.drs.downforceReduction) : 1;
      
      frontDownforce = totalDownforce * this.config.downforceBalance * groundEffect;
      rearDownforce = totalDownforce * (1 - this.config.downforceBalance) * groundEffect * drsMultiplier;
    }
    
    return {
      drag: dragForce,
      frontDownforce,
      rearDownforce
    };
  }
  
  applyAerodynamicForces(forces) {
    const velocity = this.body.velocity;
    const velocityNormalized = velocity.clone().normalize();
    
    // Apply drag
    const dragForce = velocityNormalized.scale(-forces.drag);
    this.body.applyForce(dragForce);
    
    // Apply downforce
    if (this.config.downforceCoefficient) {
      // Front downforce
      const frontPoint = new THREE.Vector3(0, 0, this.config.wheelbase / 2);
      const frontDownforceVec = new THREE.Vector3(0, -forces.frontDownforce, 0);
      this.body.applyLocalForce(frontDownforceVec, frontPoint);
      
      // Rear downforce
      const rearPoint = new THREE.Vector3(0, 0, -this.config.wheelbase / 2);
      const rearDownforceVec = new THREE.Vector3(0, -forces.rearDownforce, 0);
      this.body.applyLocalForce(rearDownforceVec, rearPoint);
    }
  }
  
  updateEngine(deltaTime) {
    // Calculate wheel RPM from rear wheel speed
    const wheelRadius = this.config.tire.radius;
    const wheelRPM = (this.state.speed / (2 * Math.PI * wheelRadius)) * 60;
    
    // Calculate engine RPM from wheel RPM
    const gearRatio = this.config.gearRatios[this.state.gear - 1];
    const finalDrive = this.config.finalDrive;
    const targetRPM = wheelRPM * gearRatio * finalDrive;
    
    // Smooth RPM changes
    const rpmDiff = targetRPM - this.state.rpm;
    this.state.rpm += rpmDiff * deltaTime * 5;
    
    // Clamp RPM
    this.state.rpm = Math.max(this.config.idleRPM, Math.min(this.config.maxRPM, this.state.rpm));
    
    // Auto gear shifting (simplified)
    if (this.state.rpm > this.config.maxRPM * 0.95 && this.state.gear < this.config.gearRatios.length) {
      this.state.gear++;
    } else if (this.state.rpm < this.config.maxRPM * 0.5 && this.state.gear > 1) {
      this.state.gear--;
    }
  }
  
  updateTelemetry(deltaTime) {
    // Calculate G-forces
    const acceleration = this.body.force.clone().scale(1 / this.config.mass);
    this.state.lateralG = acceleration.x / PHYSICS_CONFIG.gravity;
    this.state.longitudinalG = acceleration.z / PHYSICS_CONFIG.gravity;
    
    // Update max values
    this.telemetry.maxSpeed = Math.max(this.telemetry.maxSpeed, this.state.speed * 3.6);
    this.telemetry.maxLateralG = Math.max(this.telemetry.maxLateralG, Math.abs(this.state.lateralG));
    this.telemetry.maxBrakingG = Math.max(this.telemetry.maxBrakingG, Math.max(0, -this.state.longitudinalG));
    this.telemetry.maxAccelerationG = Math.max(this.telemetry.maxAccelerationG, Math.max(0, this.state.longitudinalG));
    
    // Update distance
    this.telemetry.distance += this.state.speed * deltaTime;
    
    // Update yaw rate
    this.state.yawRate = this.body.angularVelocity.y;
  }
  
  updateTemperatures(deltaTime) {
    // Update tire temperatures
    this.state.tireTemps.forEach((temp, index) => {
      const load = this.state.wheelLoads[index];
      const slip = Math.abs(this.calculateSlipAngle(this.wheels[index], index));
      
      // Heat generation
      const heatGeneration = slip * load * 0.001;
      
      // Cooling
      const cooling = (temp - 20) * 0.1 * deltaTime;
      
      this.state.tireTemps[index] = temp + heatGeneration - cooling;
    });
    
    // Update brake temperatures
    if (this.state.brake > 0) {
      this.state.brakeTemps.forEach((temp, index) => {
        const brakeForce = this.calculateBrakeForce(index);
        const heatGeneration = brakeForce * this.state.speed * 0.00001;
        const cooling = (temp - 20) * 0.5 * deltaTime;
        
        this.state.brakeTemps[index] = temp + heatGeneration - cooling;
      });
    }
  }
  
  resetPosition() {
    this.body.position.set(0, 2, 0);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.quaternion.set(0, 0, 0, 1);
    
    // Reset wheels
    this.wheels.forEach((wheel, index) => {
      const wheelPos = this.body.position.clone();
      wheelPos.add(wheel.position);
      wheel.body.position.copy(wheelPos);
      wheel.body.velocity.set(0, 0, 0);
      wheel.body.angularVelocity.set(0, 0, 0);
    });
    
    // Reset state
    this.state.rpm = this.config.idleRPM;
    this.state.gear = 1;
    this.state.speed = 0;
    this.state.tireTemps = [20, 20, 20, 20];
    this.state.brakeTemps = [20, 20, 20, 20];
  }
  
  getPosition() {
    return this.body.position.clone();
  }
  
  getRotation() {
    return this.body.quaternion.clone();
  }
  
  getState() {
    return { ...this.state };
  }
  
  getTelemetry() {
    return { ...this.telemetry };
  }
}