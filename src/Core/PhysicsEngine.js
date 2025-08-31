import * as CANNON from 'cannon-es';

export const PHYSICS_CONFIG = {
  gravity: 9.81,
  timeStep: 1/60,
  maxSubSteps: 3,
  airDensity: 1.225,
  rollingResistance: 0.015,
  tireOptimalTemp: {
    street: 50,
    racing: 100
  }
};

export class PhysicsEngine {
  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -PHYSICS_CONFIG.gravity, 0),
      broadphase: new CANNON.SAPBroadphase(new CANNON.World()),
      allowSleep: true
    });
    
    // Configure solver
    this.world.solver.iterations = 10;
    this.world.solver.tolerance = 0.0001;
    
    // Contact materials
    this.materials = {
      ground: new CANNON.Material('ground'),
      tire: new CANNON.Material('tire'),
      chassis: new CANNON.Material('chassis')
    };
    
    this.setupContactMaterials();
    
    // Time tracking
    this.lastTime = 0;
    this.accumulator = 0;
    
    // Debug bodies array
    this.debugBodies = [];
  }
  
  setupContactMaterials() {
    // Tire-ground contact
    const tireGroundContact = new CANNON.ContactMaterial(
      this.materials.tire,
      this.materials.ground,
      {
        friction: 1.0,
        restitution: 0.1,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3
      }
    );
    this.world.addContactMaterial(tireGroundContact);
    
    // Chassis-ground contact (for scraping)
    const chassisGroundContact = new CANNON.ContactMaterial(
      this.materials.chassis,
      this.materials.ground,
      {
        friction: 0.4,
        restitution: 0.2,
        contactEquationStiffness: 1e7,
        contactEquationRelaxation: 3
      }
    );
    this.world.addContactMaterial(chassisGroundContact);
  }
  
  createGround(size = 400) {
    const groundShape = new CANNON.Box(new CANNON.Vec3(size/2, 0.1, size/2));
    const groundBody = new CANNON.Body({
      mass: 0,
      shape: groundShape,
      material: this.materials.ground,
      position: new CANNON.Vec3(0, -0.1, 0)
    });
    
    this.world.addBody(groundBody);
    return groundBody;
  }
  
  createVehicleBody(config) {
    // Main chassis body
    const chassisShape = new CANNON.Box(new CANNON.Vec3(
      config.dimensions.width / 2,
      config.dimensions.height / 2,
      config.dimensions.length / 2
    ));
    
    const chassisBody = new CANNON.Body({
      mass: config.mass,
      shape: chassisShape,
      material: this.materials.chassis,
      position: new CANNON.Vec3(0, config.dimensions.height, 0)
    });
    
    // Set center of gravity offset
    chassisBody.shapeOffsets[0] = new CANNON.Vec3(0, -config.cgHeight + config.dimensions.height/2, 0);
    
    // Calculate inertia tensor
    const inertia = this.calculateInertia(config);
    chassisBody.inertia.set(inertia.x, inertia.y, inertia.z);
    chassisBody.invInertia.set(1/inertia.x, 1/inertia.y, 1/inertia.z);
    
    this.world.addBody(chassisBody);
    
    return {
      body: chassisBody,
      wheels: this.createWheels(config, chassisBody)
    };
  }
  
  createWheels(config, chassisBody) {
    const wheels = [];
    
    // Wheel positions relative to chassis center
    const wheelPositions = [
      new CANNON.Vec3(-config.trackWidth.front/2, -config.suspensionRestLength, config.wheelbase/2), // FL
      new CANNON.Vec3(config.trackWidth.front/2, -config.suspensionRestLength, config.wheelbase/2),  // FR
      new CANNON.Vec3(-config.trackWidth.rear/2, -config.suspensionRestLength, -config.wheelbase/2), // RL
      new CANNON.Vec3(config.trackWidth.rear/2, -config.suspensionRestLength, -config.wheelbase/2)   // RR
    ];
    
    wheelPositions.forEach((position, index) => {
      const wheelShape = new CANNON.Sphere(config.tire.radius);
      const wheelBody = new CANNON.Body({
        mass: config.wheelMass || 20,
        shape: wheelShape,
        material: this.materials.tire
      });
      
      // Create suspension constraint
      const constraint = new CANNON.PointToPointConstraint(
        chassisBody,
        position,
        wheelBody,
        new CANNON.Vec3()
      );
      
      this.world.addBody(wheelBody);
      this.world.addConstraint(constraint);
      
      wheels.push({
        body: wheelBody,
        constraint: constraint,
        position: position,
        radius: config.tire.radius,
        suspensionRestLength: config.suspensionRestLength,
        suspensionStiffness: index < 2 ? config.springRate.front : config.springRate.rear,
        dampingCompression: config.damperRate.bump,
        dampingRelaxation: config.damperRate.rebound,
        frictionSlip: config.tire.peakMu * 1000, // Cannon uses different units
        rollInfluence: 0.1,
        maxSuspensionTravel: config.maxSuspensionTravel || 0.2,
        maxSuspensionForce: 100000
      });
    });
    
    return wheels;
  }
  
  calculateInertia(config) {
    // Simplified box inertia calculation
    const m = config.mass;
    const w = config.dimensions.width;
    const h = config.dimensions.height;
    const l = config.dimensions.length;
    
    return {
      x: (m / 12) * (h * h + l * l),
      y: (m / 12) * (w * w + l * l),
      z: (m / 12) * (w * w + h * h)
    };
  }
  
  applyWheelForces(vehicle, wheelForces) {
    vehicle.wheels.forEach((wheel, index) => {
      const force = wheelForces[index];
      if (!force) return;
      
      // Apply forces at wheel contact point
      const worldPoint = wheel.body.position;
      const worldForce = new CANNON.Vec3(
        force.lateral,
        force.vertical,
        force.longitudinal
      );
      
      // Transform to world coordinates based on vehicle orientation
      const quaternion = vehicle.body.quaternion;
      quaternion.vmult(worldForce, worldForce);
      
      // Apply force to wheel body
      wheel.body.applyForce(worldForce, worldPoint);
      
      // Apply equal and opposite force to chassis
      const chassisPoint = vehicle.body.position.vadd(wheel.position);
      vehicle.body.applyForce(worldForce.negate(), chassisPoint);
    });
  }
  
  applyAerodynamicForces(vehicle, velocity, aeroConfig) {
    const v2 = velocity.lengthSquared();
    const q = 0.5 * PHYSICS_CONFIG.airDensity * v2;
    
    // Drag force (always opposes motion)
    const dragMagnitude = q * aeroConfig.dragCoefficient * aeroConfig.frontalArea;
    const dragForce = velocity.clone().normalize().scale(-dragMagnitude);
    vehicle.body.applyForce(dragForce, vehicle.body.position);
    
    // Downforce (if applicable)
    if (aeroConfig.downforceCoefficient) {
      const totalDownforce = q * (aeroConfig.downforceCoefficient.front + 
                                  aeroConfig.downforceCoefficient.rear) * 
                                  aeroConfig.frontalArea;
      
      // Apply ground effect multiplier
      const groundEffect = velocity.length() > 13.9 ? (aeroConfig.groundEffectMultiplier || 1) : 1;
      
      // Front downforce
      const frontDownforce = new CANNON.Vec3(0, -totalDownforce * aeroConfig.downforceBalance * groundEffect, 0);
      const frontPoint = vehicle.body.position.clone();
      frontPoint.z += vehicle.wheelbase / 2;
      vehicle.body.applyForce(frontDownforce, frontPoint);
      
      // Rear downforce
      const rearDownforce = new CANNON.Vec3(0, -totalDownforce * (1 - aeroConfig.downforceBalance) * groundEffect, 0);
      const rearPoint = vehicle.body.position.clone();
      rearPoint.z -= vehicle.wheelbase / 2;
      vehicle.body.applyForce(rearDownforce, rearPoint);
    }
  }
  
  update(deltaTime) {
    // Fixed timestep with interpolation
    this.accumulator += deltaTime;
    
    while (this.accumulator >= PHYSICS_CONFIG.timeStep) {
      this.world.step(PHYSICS_CONFIG.timeStep, deltaTime, PHYSICS_CONFIG.maxSubSteps);
      this.accumulator -= PHYSICS_CONFIG.timeStep;
    }
    
    // Interpolation factor for smooth rendering
    const alpha = this.accumulator / PHYSICS_CONFIG.timeStep;
    return alpha;
  }
  
  addDebugBody(body, color = 0xff0000) {
    this.debugBodies.push({ body, color });
  }
  
  getDebugData() {
    return this.debugBodies.map(({ body, color }) => ({
      position: body.position.clone(),
      quaternion: body.quaternion.clone(),
      shapes: body.shapes,
      color
    }));
  }
  
  reset() {
    // Reset all body positions and velocities
    this.world.bodies.forEach(body => {
      if (body.mass > 0) {
        body.position.set(0, 2, 0);
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
        body.quaternion.set(0, 0, 0, 1);
      }
    });
  }
  
  dispose() {
    // Clear world
    while (this.world.bodies.length > 0) {
      this.world.removeBody(this.world.bodies[0]);
    }
    while (this.world.constraints.length > 0) {
      this.world.removeConstraint(this.world.constraints[0]);
    }
  }
}