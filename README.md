# Racing Physics Simulation

A 3D racing physics visualization application designed to teach racing dynamics through interactive simulation of a Mazda RX-8 and Formula 1 car. The application demonstrates weight transfer, tire forces, and racing techniques across three corner types with multiple racing lines and braking styles.

## Features

- **Two Vehicle Types**: Mazda RX-8 (street car) and Formula 1 (race car)
- **Three Corner Types**: Hairpin, Fast Sweeper, and Chicane
- **Multiple Racing Lines**: Ideal, Defensive, and Overtaking lines
- **Real-time Physics**: Weight transfer, tire forces, and aerodynamics
- **Interactive Visualizations**: Force vectors, weight distribution, and grip circles
- **Educational Content**: Physics explanations and tutorials

## Technical Stack

- **Rendering**: Three.js with WebGL 2.0
- **Physics**: Cannon-es physics engine
- **UI**: dat.gui control panel
- **Performance**: Optimized for Apple M2 MacBook (60 FPS target)

## Installation

```bash
npm install
```

## Development

```bash
npm start
```

Open [http://localhost:8080](http://localhost:8080) to view the simulation.

## Build

```bash
npm run build
```

## Controls

- **W/↑**: Throttle
- **S/↓**: Brake
- **A/←**: Steer Left
- **D/→**: Steer Right
- **Space**: Handbrake
- **R**: Reset Simulation
- **P**: Pause/Play
- **C**: Cycle Camera Mode
- **V**: Cycle Visualizations
- **H**: Toggle GUI

## Physics Models

### Vehicle Dynamics
- Accurate mass properties and dimensions
- Suspension spring/damper rates
- Center of gravity calculations
- Inertia tensor calculations

### Tire Physics
- Pacejka Magic Formula tire model
- Load sensitivity and temperature effects
- Combined slip (friction circle)
- Realistic grip levels

### Weight Transfer
- Lateral transfer during cornering
- Longitudinal transfer during braking/acceleration
- Combined transfer calculations
- Dynamic center of gravity shifts

### Aerodynamics
- Drag forces
- Downforce (F1 specific)
- Ground effect
- DRS (Drag Reduction System)

## Educational Features

The simulation includes educational content explaining:
- Weight transfer principles
- Trail braking technique
- Optimal racing lines
- Tire grip and friction circles
- Aerodynamic effects

## Performance

Optimized for Apple M2 MacBook:
- 60 FPS at 2560x1600 resolution
- Metal-optimized WebGL2 rendering
- Frustum culling and LOD system
- Maximum 4GB RAM usage

## License

ISC