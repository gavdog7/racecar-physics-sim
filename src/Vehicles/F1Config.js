export const F1_CONFIG = {
  name: "Formula 1",
  type: "race",
  
  // Mass Properties
  mass: 798,
  wheelbase: 3.600,
  trackWidth: {
    front: 2.000,
    rear: 2.000
  },
  cgHeight: 0.280,
  weightDistribution: {
    front: 0.455,
    rear: 0.545
  },
  
  // Dimensions (for physics body)
  dimensions: {
    length: 5.500,
    width: 2.000,
    height: 0.950
  },
  
  // Suspension (F1 is extremely stiff)
  springRate: {
    front: 200000,     // N/m
    rear: 150000       // N/m
  },
  damperRate: {
    bump: 8000,        // N·s/m
    rebound: 12000     // N·s/m
  },
  suspensionRestLength: 0.15,
  maxSuspensionTravel: 0.05,
  
  // Tire Model (F1 specific)
  tire: {
    radius: 0.330,
    width: 0.305,
    rearWidth: 0.405,
    peakMu: 1.8,
    loadSensitivity: 0.7,
    pacejka: {
      B: 12,
      C: 1.8,
      D: 1.8,
      E: 0.95
    }
  },
  
  // Performance Limits
  maxSpeed: 350,
  maxLateralG: 5.0,
  maxBrakingG: 5.5,
  maxAccelerationG: 3.5,
  
  // Engine
  power: 750000,
  torqueCurve: [
    {rpm: 8000, torque: 500},
    {rpm: 10000, torque: 650},
    {rpm: 12000, torque: 700},
    {rpm: 15000, torque: 600}
  ],
  maxRPM: 15000,
  idleRPM: 4000,
  
  // Transmission (8-speed)
  gearRatios: [3.500, 2.618, 2.150, 1.778, 1.500, 1.267, 1.050, 0.850],
  finalDrive: 3.900,
  
  // Aerodynamics (critical for F1)
  dragCoefficient: 0.7,
  frontalArea: 1.5,
  downforceCoefficient: {
    front: 1.5,
    rear: 2.0
  },
  downforceBalance: 0.4,
  groundEffectMultiplier: 1.5,
  
  // DRS (Drag Reduction System)
  drs: {
    enabled: true,
    dragReduction: 0.15,
    downforceReduction: 0.25,
    activationDelay: 0.5
  },
  
  // Brakes (carbon-carbon)
  brakeForce: {
    front: 12000,
    rear: 8000
  },
  brakeBias: 0.58,
  brakeTemperature: {
    optimal: 400,
    max: 1000,
    coolingRate: 50
  },
  
  // Wheels
  wheelMass: 12,
  wheelMomentOfInertia: 0.5,
  
  // Energy Recovery System (ERS)
  ers: {
    kersMaxPower: 60000,        // 60kW
    kersCapacity: 4000000,      // 4MJ
    mguHPower: 90000,           // 90kW
    deploymentModes: ['qualify', 'race', 'overtake']
  },
  
  // Visual model
  modelPath: 'assets/models/f1.glb',
  color: 0x0066ff,
  
  // Sound
  engineSound: 'assets/audio/f1_engine.mp3',
  
  // Telemetry display
  telemetryName: "F1",
  telemetryColor: "#0066ff"
};