import * as THREE from 'three';
import { Renderer } from './Core/Renderer.js';
import { PhysicsEngine } from './Core/PhysicsEngine.js';
import { InputManager } from './Core/InputManager.js';
import { VehicleDynamics } from './Physics/VehicleDynamics.js';
import { TireModel } from './Physics/TireModel.js';
import { WeightTransfer } from './Physics/WeightTransfer.js';
import { CornerGenerator, CORNER_TYPES } from './Track/CornerGenerator.js';
import { RacingLine, RACING_LINES, BRAKING_STYLES } from './Track/RacingLine.js';
import { ForceVectorVisualizer } from './Visualization/ForceVectors.js';
import { WeightDistributionDisplay } from './Visualization/WeightDisplay.js';
import { GripCircleManager } from './Visualization/GripCircle.js';
import { ControlPanel } from './UI/ControlPanel.js';
import { TelemetryPanel } from './UI/TelemetryPanel.js';
import { RX8_CONFIG } from './Vehicles/RX8Config.js';
import { F1_CONFIG } from './Vehicles/F1Config.js';
import { debugLog } from './debug.js';

export class RacingSimulation {
  constructor(container) {
    this.container = container;
    
    // Core systems
    this.renderer = null;
    this.physics = null;
    this.input = null;
    
    // Simulation objects
    this.vehicle = null;
    this.track = null;
    this.currentCorner = null;
    
    // Physics models
    this.tireModel = new TireModel();
    this.weightTransfer = new WeightTransfer();
    
    // Visualization systems
    this.forceVectors = null;
    this.weightDisplay = null;
    this.gripCircles = null;
    
    // UI systems
    this.controlPanel = null;
    this.telemetryPanel = null;
    
    // State
    this.paused = false;
    this.playbackSpeed = 1.0;
    this.currentTime = 0;
    this.totalTime = 30; // 30 second sequences
    this.recording = false;
    
    // Settings
    this.currentVehicleType = 'RX8';
    this.currentCornerType = 'HAIRPIN';
    this.currentRacingLine = 'IDEAL';
    this.currentBrakingStyle = 'THRESHOLD';
    
    // Callbacks
    this.onTimeUpdate = null;
  }
  
  async init(progressCallback) {
    try {
      debugLog('RacingSimulation', 'Starting init');
      
      // Initialize renderer
      debugLog('RacingSimulation', 'Creating renderer');
      this.renderer = new Renderer(this.container);
      progressCallback?.(10);
      
      // Initialize physics
      debugLog('RacingSimulation', 'Creating physics engine');
      this.physics = new PhysicsEngine();
      this.physics.createGround();
      progressCallback?.(20);
      
      // Initialize input
      this.input = new InputManager();
      progressCallback?.(30);
      
      // Create initial vehicle
      debugLog('RacingSimulation', 'Creating vehicle', this.currentVehicleType);
      await this.createVehicle(this.currentVehicleType);
      progressCallback?.(40);
      
      // Create initial track
      debugLog('RacingSimulation', 'Creating track', this.currentCornerType);
      await this.createTrack(this.currentCornerType);
      progressCallback?.(50);
      
      // Initialize visualization systems
      this.forceVectors = new ForceVectorVisualizer(this.renderer.scene);
      this.weightDisplay = new WeightDistributionDisplay(this.renderer.scene);
      this.gripCircles = new GripCircleManager();
      progressCallback?.(60);
      
      // Initialize UI (defer DOM access)
      this.controlPanel = new ControlPanel(this);
      this.telemetryPanel = new TelemetryPanel();
      progressCallback?.(70);
      
      // Load assets (mock for now)
      await this.loadAssets();
      progressCallback?.(80);
      
      // Create simple vehicle representation
      this.createVehicleVisual();
      progressCallback?.(90);
      
      // Final setup
      this.setupInitialState();
      
      // Initialize UI DOM elements after everything else is ready
      this.controlPanel.init();
      this.telemetryPanel.init();
      progressCallback?.(100);
      
      console.log('Racing simulation initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize simulation:', error);
      throw error;
    }
  }
  
  async createVehicle(vehicleType) {
    const config = vehicleType === 'F1' ? F1_CONFIG : RX8_CONFIG;
    this.vehicle = new VehicleDynamics(config, this.physics);
    this.currentVehicleType = vehicleType;
    
    // Update weight display for new vehicle
    if (this.weightDisplay) {
      this.weightDisplay.setWheelPositions(config.trackWidth, config.wheelbase);
    }
  }
  
  async createTrack(cornerType) {
    // Remove existing track
    if (this.currentCorner) {
      this.renderer.scene.remove(this.currentCorner.mesh);
    }
    
    // Generate new corner
    const cornerGenerator = new CornerGenerator();
    this.currentCorner = cornerGenerator.generateCorner(cornerType, this.currentRacingLine);
    this.renderer.scene.add(this.currentCorner.mesh);
    
    this.currentCornerType = cornerType;
  }
  
  createVehicleVisual() {
    // Create simple box representation of vehicle for now
    const config = this.vehicle.config;
    
    const geometry = new THREE.BoxGeometry(
      config.dimensions.width,
      config.dimensions.height,
      config.dimensions.length
    );
    
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      metalness: 0.8,
      roughness: 0.2
    });
    
    this.vehicleMesh = new THREE.Mesh(geometry, material);
    this.vehicleMesh.castShadow = true;
    this.vehicleMesh.receiveShadow = true;
    
    // Add wheels
    this.wheelMeshes = [];
    const wheelGeometry = new THREE.CylinderGeometry(
      config.tire.radius,
      config.tire.radius,
      config.tire.width,
      16
    );
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    
    this.vehicle.wheels.forEach((wheel, index) => {
      const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheelMesh.rotation.z = Math.PI / 2;
      wheelMesh.castShadow = true;
      this.wheelMeshes.push(wheelMesh);
      this.renderer.scene.add(wheelMesh);
    });
    
    this.renderer.scene.add(this.vehicleMesh);
  }
  
  async loadAssets() {
    // Mock asset loading - in real implementation would load 3D models, textures, sounds
    return new Promise(resolve => {
      setTimeout(resolve, 500);
    });
  }
  
  setupInitialState() {
    // Position vehicle at track entry
    if (this.currentCorner && this.vehicle) {
      const entryPoint = this.currentCorner.entryPoint;
      this.vehicle.body.position.set(entryPoint.x, 1, entryPoint.z);
    }
    
    // Show UI elements
    this.telemetryPanel.setVisibility(true);
  }
  
  update(deltaTime) {
    if (this.paused) return;
    
    const scaledDeltaTime = deltaTime * this.playbackSpeed;
    this.currentTime += scaledDeltaTime;
    
    // Update input
    this.input.update(scaledDeltaTime);
    const controls = this.input.getControls();
    
    // Update physics
    const alpha = this.physics.update(scaledDeltaTime);
    
    // Update vehicle
    this.vehicle.update(controls, scaledDeltaTime);
    
    // Update visual vehicle position
    this.updateVehicleVisuals();
    
    // Calculate forces for visualization
    const forces = this.calculateDisplayForces();
    
    // Update visualizations
    if (this.forceVectors) {
      this.forceVectors.updateForceVectors(this.vehicle, forces);
    }
    
    if (this.weightDisplay) {
      const weights = this.calculateWeightDistribution();
      const balancePoint = this.weightTransfer.getBalancePoint(weights);
      this.weightDisplay.update(
        Object.values(weights),
        this.vehicle.getPosition(),
        this.vehicle.config.mass * 9.81,
        balancePoint
      );
    }
    
    if (this.gripCircles) {
      const wheelForces = this.calculateWheelDisplayForces();
      this.gripCircles.updateAll(wheelForces, this.vehicle.state.tireTemps);
    }
    
    // Update UI
    this.telemetryPanel.update(this.vehicle.getState(), performance.now());
    
    // Update camera
    this.renderer.updateCamera(this.vehicle.getPosition(), this.vehicle.getRotation());
    
    // Update timeline
    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.currentTime, this.totalTime);
    }
    
    // Auto-restart if sequence completed
    if (this.currentTime >= this.totalTime) {
      this.restart();
    }
  }
  
  updateVehicleVisuals() {
    if (!this.vehicleMesh || !this.vehicle) return;
    
    // Update main body
    const position = this.vehicle.getPosition();
    const rotation = this.vehicle.getRotation();
    
    this.vehicleMesh.position.copy(position);
    this.vehicleMesh.quaternion.copy(rotation);
    
    // Update wheels
    this.vehicle.wheels.forEach((wheel, index) => {
      if (this.wheelMeshes[index]) {
        this.wheelMeshes[index].position.copy(wheel.body.position);
        this.wheelMeshes[index].quaternion.copy(wheel.body.quaternion);
      }
    });
  }
  
  calculateDisplayForces() {
    const vehicleState = this.vehicle.getState();
    
    // Calculate forces for each wheel
    const wheelForces = this.vehicle.wheels.map((wheel, index) => {
      const load = vehicleState.wheelLoads[index];
      const maxForce = load * this.vehicle.config.tire.peakMu;
      
      return {
        lateral: Math.sin(vehicleState.lateralG) * maxForce * 0.8,
        longitudinal: Math.sin(vehicleState.longitudinalG) * maxForce * 0.6,
        vertical: load,
        maxAvailable: maxForce,
        lateralUtilization: Math.abs(vehicleState.lateralG) / this.vehicle.config.maxLateralG,
        longitudinalUtilization: Math.abs(vehicleState.longitudinalG) / this.vehicle.config.maxBrakingG
      };
    });
    
    // Calculate aerodynamic forces
    const speed = vehicleState.speed;
    const aeroForces = {
      drag: 0.5 * 1.225 * speed * speed * this.vehicle.config.dragCoefficient * this.vehicle.config.frontalArea,
      downforce: {
        front: 0,
        rear: 0
      }
    };
    
    if (this.vehicle.config.downforceCoefficient) {
      const q = 0.5 * 1.225 * speed * speed;
      const totalDownforce = q * (this.vehicle.config.downforceCoefficient.front + this.vehicle.config.downforceCoefficient.rear) * this.vehicle.config.frontalArea;
      
      aeroForces.downforce.front = totalDownforce * this.vehicle.config.downforceBalance;
      aeroForces.downforce.rear = totalDownforce * (1 - this.vehicle.config.downforceBalance);
    }
    
    return {
      wheels: wheelForces,
      aero: aeroForces,
      total: {
        lateral: wheelForces.reduce((sum, f) => sum + f.lateral, 0),
        longitudinal: wheelForces.reduce((sum, f) => sum + f.longitudinal, 0)
      }
    };
  }
  
  calculateWeightDistribution() {
    const vehicleState = this.vehicle.getState();
    return this.weightTransfer.calculateCombined(
      this.vehicle.config,
      vehicleState.lateralG,
      vehicleState.longitudinalG
    );
  }
  
  calculateWheelDisplayForces() {
    const vehicleState = this.vehicle.getState();
    
    return this.vehicle.wheels.map((wheel, index) => {
      const load = vehicleState.wheelLoads[index];
      const maxForce = load * this.vehicle.config.tire.peakMu;
      
      // Mock forces for display
      const lateral = Math.sin(vehicleState.lateralG * Math.PI / 2) * maxForce * 0.7;
      const longitudinal = Math.sin(vehicleState.longitudinalG * Math.PI / 2) * maxForce * 0.5;
      
      return {
        lateral,
        longitudinal,
        maximum: maxForce,
        utilization: Math.sqrt(lateral * lateral + longitudinal * longitudinal) / maxForce
      };
    });
  }
  
  render() {
    this.renderer.render();
  }
  
  // Control methods called by UI
  changeVehicle(vehicleType) {
    const type = vehicleType === 'Formula 1' ? 'F1' : 'RX8';
    this.createVehicle(type);
    this.createVehicleVisual();
    console.log(`Switched to ${vehicleType}`);
  }
  
  changeCorner(cornerType) {
    this.createTrack(cornerType);
    this.restart();
    console.log(`Switched to ${CORNER_TYPES[cornerType].name}`);
  }
  
  changeRacingLine(racingLine) {
    this.currentRacingLine = racingLine;
    this.createTrack(this.currentCornerType);
    console.log(`Racing line: ${RACING_LINES[racingLine].name}`);
  }
  
  changeBrakingStyle(brakingStyle) {
    this.currentBrakingStyle = brakingStyle;
    console.log(`Braking style: ${BRAKING_STYLES[brakingStyle].name}`);
  }
  
  setPlaybackSpeed(speed) {
    this.playbackSpeed = speed;
  }
  
  setPaused(paused) {
    this.paused = paused;
  }
  
  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }
  
  restart() {
    this.currentTime = 0;
    if (this.vehicle) {
      this.vehicle.resetPosition();
    }
    console.log('Simulation restarted');
  }
  
  reset() {
    this.restart();
    if (this.physics) {
      this.physics.reset();
    }
  }
  
  pause() {
    this.paused = true;
  }
  
  resume() {
    this.paused = false;
  }
  
  setTimeProgress(progress) {
    this.currentTime = progress * this.totalTime;
    // Would implement scrubbing to specific time in full version
  }
  
  // Visualization toggles
  toggleForceVectors(visible) {
    if (this.forceVectors) {
      this.forceVectors.setVisibility('wheelForces', visible);
    }
  }
  
  toggleWeightDisplay(visible) {
    if (this.weightDisplay) {
      this.weightDisplay.setVisibility(visible);
    }
  }
  
  toggleGripCircles(visible) {
    if (this.gripCircles) {
      this.gripCircles.setVisibility(visible);
    }
  }
  
  toggleRacingLine(visible) {
    // Would toggle racing line visibility
  }
  
  toggleTelemetry(visible) {
    if (this.telemetryPanel) {
      this.telemetryPanel.setVisibility(visible);
    }
  }
  
  setCameraMode(mode) {
    if (this.renderer) {
      this.renderer.setCameraMode(mode);
    }
  }
  
  togglePhysics(enabled) {
    // Would enable/disable physics updates
  }
  
  setGravityScale(scale) {
    if (this.physics) {
      this.physics.world.gravity.y = -9.81 * scale;
    }
  }
  
  setTimeScale(scale) {
    // Would affect physics time scale
  }
  
  toggleExplanations(show) {
    // Would show/hide educational overlays
  }
  
  setTutorialMode(enabled) {
    // Would enable guided tutorial mode
  }
  
  // Vehicle-specific methods
  setDRS(enabled) {
    if (this.vehicle && this.vehicle.config.drs) {
      this.vehicle.state.drsActive = enabled;
    }
  }
  
  setERSMode(mode) {
    if (this.vehicle && this.vehicle.config.ers) {
      this.vehicle.state.ersMode = mode;
    }
  }
  
  setDownforceLevel(level) {
    if (this.vehicle && this.vehicle.config.downforceCoefficient) {
      const scale = level / 50; // 50 is baseline
      this.vehicle.config.downforceCoefficient.front *= scale;
      this.vehicle.config.downforceCoefficient.rear *= scale;
    }
  }
  
  setSuspensionSetup(setup) {
    if (this.vehicle) {
      const config = this.vehicle.config;
      switch (setup) {
        case 'race':
          config.springRate.front = config.springRate.frontRace;
          config.springRate.rear = config.springRate.rearRace;
          break;
        case 'sport':
          config.springRate.front = config.springRate.front * 1.5;
          config.springRate.rear = config.springRate.rear * 1.5;
          break;
        default: // street
          // Use default values
          break;
      }
    }
  }
  
  setTireType(type) {
    if (this.vehicle) {
      const config = this.vehicle.config;
      switch (type) {
        case 'race':
          config.tire.peakMu = config.maxLateralGRace || config.tire.peakMu * 1.1;
          break;
        case 'sport':
          config.tire.peakMu = config.tire.peakMu * 1.05;
          break;
        default: // street
          // Use default values
          break;
      }
    }
  }
  
  dispose() {
    // Clean up all systems
    if (this.renderer) this.renderer.dispose();
    if (this.physics) this.physics.dispose();
    if (this.input) this.input.dispose();
    if (this.forceVectors) this.forceVectors.dispose();
    if (this.weightDisplay) this.weightDisplay.dispose();
    if (this.gripCircles) this.gripCircles.dispose();
    if (this.controlPanel) this.controlPanel.dispose();
    
    console.log('Simulation disposed');
  }
}