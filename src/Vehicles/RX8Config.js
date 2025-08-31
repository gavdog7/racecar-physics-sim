export const RX8_CONFIG = {
  name: "Mazda RX-8",
  type: "street",
  
  // Mass Properties
  mass: 1390,
  wheelbase: 2.700,
  trackWidth: {
    front: 1.500,
    rear: 1.505
  },
  cgHeight: 0.450,
  weightDistribution: {
    front: 0.50,
    rear: 0.50
  },
  
  // Dimensions (for physics body)
  dimensions: {
    length: 4.435,
    width: 1.770,
    height: 1.340
  },
  
  // Suspension
  springRate: {
    front: 27500,      // N/m (stock)
    rear: 20000,       // N/m (stock)
    frontRace: 78800,  // N/m (racing)
    rearRace: 49000    // N/m (racing)
  },
  damperRate: {
    bump: 3000,        // N·s/m
    rebound: 4500      // N·s/m
  },
  suspensionRestLength: 0.3,
  maxSuspensionTravel: 0.15,
  
  // Tire Model (Pacejka coefficients)
  tire: {
    radius: 0.323,
    width: 0.245,
    peakMu: 1.15,
    loadSensitivity: 0.8,
    pacejka: {
      B: 10,
      C: 1.5,
      D: 1.15,
      E: 0.97
    }
  },
  
  // Performance Limits
  maxSpeed: 235,
  maxLateralG: 0.92,
  maxLateralGRace: 1.03,
  maxBrakingG: 1.0,
  
  // Engine
  power: 175000,
  torqueCurve: [
    {rpm: 3000, torque: 200},
    {rpm: 5500, torque: 216},
    {rpm: 8500, torque: 180},
    {rpm: 9000, torque: 160}
  ],
  maxRPM: 9000,
  idleRPM: 850,
  
  // Transmission
  gearRatios: [3.815, 2.260, 1.640, 1.177, 1.000, 0.832],
  finalDrive: 4.444,
  
  // Aerodynamics
  dragCoefficient: 0.31,
  frontalArea: 2.0,
  liftCoefficient: 0.02,
  
  // Brakes
  brakeForce: {
    front: 3500,
    rear: 2000
  },
  brakeBias: 0.65,
  
  // Wheels
  wheelMass: 20,
  wheelMomentOfInertia: 0.8,
  
  // Visual model
  modelPath: 'assets/models/rx8.glb',
  color: 0xff0000,
  
  // Sound
  engineSound: 'assets/audio/rx8_engine.mp3',
  
  // Telemetry display
  telemetryName: "RX-8",
  telemetryColor: "#ff0000"
};