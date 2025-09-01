import { GUI } from 'dat.gui';
import { CORNER_TYPES } from '../Track/CornerGenerator.js';
import { RACING_LINES, BRAKING_STYLES } from '../Track/RacingLine.js';

export class ControlPanel {
  constructor(simulation) {
    this.simulation = simulation;
    this.initialized = false;
    
    // Control state
    this.controls = {
      // Vehicle selection
      vehicle: 'Mazda RX-8',
      
      // Corner configuration
      cornerType: 'HAIRPIN',
      racingLine: 'IDEAL',
      brakingStyle: 'THRESHOLD',
      
      // Simulation settings
      playbackSpeed: 1.0,
      paused: false,
      reset: () => this.simulation.reset(),
      
      // Visualization options
      showForceVectors: true,
      showWeightDistribution: true,
      showGripCircles: true,
      showRacingLine: true,
      showTelemetry: true,
      
      // Camera
      cameraMode: 'orbit',
      
      // Physics settings
      enablePhysics: true,
      gravityScale: 1.0,
      timeScale: 1.0,
      
      // Educational
      showExplanations: false,
      tutorialMode: false
    };
  }
  
  init() {
    if (this.initialized) return;
    
    this.gui = new GUI({ width: 300 });
    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '20px';
    this.gui.domElement.style.right = '20px';
    
    this.setupGUI();
    this.bindEvents();
    this.initialized = true;
  }
  
  setupGUI() {
    // Vehicle Selection folder
    const vehicleFolder = this.gui.addFolder('Vehicle Selection');
    vehicleFolder.add(this.controls, 'vehicle', ['Mazda RX-8', 'Formula 1'])
      .onChange((value) => this.onVehicleChange(value));
    vehicleFolder.open();
    
    // Corner Configuration folder
    const cornerFolder = this.gui.addFolder('Corner Configuration');
    cornerFolder.add(this.controls, 'cornerType', Object.keys(CORNER_TYPES))
      .name('Corner Type')
      .onChange((value) => this.onCornerTypeChange(value));
    cornerFolder.add(this.controls, 'racingLine', Object.keys(RACING_LINES))
      .name('Racing Line')
      .onChange((value) => this.onRacingLineChange(value));
    cornerFolder.add(this.controls, 'brakingStyle', Object.keys(BRAKING_STYLES))
      .name('Braking Style')
      .onChange((value) => this.onBrakingStyleChange(value));
    cornerFolder.open();
    
    // Simulation Control folder
    const simulationFolder = this.gui.addFolder('Simulation Control');
    simulationFolder.add(this.controls, 'playbackSpeed', 0.1, 5.0, 0.1)
      .name('Playback Speed')
      .onChange((value) => this.onPlaybackSpeedChange(value));
    simulationFolder.add(this.controls, 'paused')
      .name('Pause')
      .onChange((value) => this.onPauseChange(value));
    simulationFolder.add(this.controls, 'reset')
      .name('Reset Simulation');
    simulationFolder.open();
    
    // Visualization Options folder
    const visualFolder = this.gui.addFolder('Visualization Options');
    visualFolder.add(this.controls, 'showForceVectors')
      .name('Show Force Vectors')
      .onChange((value) => this.onForceVectorsToggle(value));
    visualFolder.add(this.controls, 'showWeightDistribution')
      .name('Show Weight Distribution')
      .onChange((value) => this.onWeightDisplayToggle(value));
    visualFolder.add(this.controls, 'showGripCircles')
      .name('Show Grip Circles')
      .onChange((value) => this.onGripCirclesToggle(value));
    visualFolder.add(this.controls, 'showRacingLine')
      .name('Show Racing Line')
      .onChange((value) => this.onRacingLineToggle(value));
    visualFolder.add(this.controls, 'showTelemetry')
      .name('Show Telemetry')
      .onChange((value) => this.onTelemetryToggle(value));
    visualFolder.open();
    
    // Camera folder
    const cameraFolder = this.gui.addFolder('Camera');
    cameraFolder.add(this.controls, 'cameraMode', ['orbit', 'chase', 'cockpit', 'helicopter', 'trackside'])
      .name('Camera Mode')
      .onChange((value) => this.onCameraModeChange(value));
    
    // Physics Settings folder (for advanced users)
    const physicsFolder = this.gui.addFolder('Physics Settings');
    physicsFolder.add(this.controls, 'enablePhysics')
      .name('Enable Physics')
      .onChange((value) => this.onPhysicsToggle(value));
    physicsFolder.add(this.controls, 'gravityScale', 0.1, 2.0, 0.1)
      .name('Gravity Scale')
      .onChange((value) => this.onGravityScaleChange(value));
    physicsFolder.add(this.controls, 'timeScale', 0.1, 3.0, 0.1)
      .name('Time Scale')
      .onChange((value) => this.onTimeScaleChange(value));
    
    // Educational folder
    const educationFolder = this.gui.addFolder('Educational');
    educationFolder.add(this.controls, 'showExplanations')
      .name('Show Explanations')
      .onChange((value) => this.onExplanationsToggle(value));
    educationFolder.add(this.controls, 'tutorialMode')
      .name('Tutorial Mode')
      .onChange((value) => this.onTutorialModeToggle(value));
    
    // Add vehicle-specific controls
    this.setupVehicleSpecificControls();
  }
  
  setupVehicleSpecificControls() {
    // This will be populated when vehicle changes
    this.vehicleFolder = this.gui.addFolder('Vehicle Settings');
  }
  
  bindEvents() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      switch(event.code) {
        case 'KeyP':
          this.controls.paused = !this.controls.paused;
          this.onPauseChange(this.controls.paused);
          this.updateDisplay('paused');
          break;
        case 'KeyR':
          if (event.shiftKey) {
            this.controls.reset();
          }
          break;
        case 'KeyV':
          this.cycleVisualization();
          break;
        case 'KeyC':
          this.cycleCameraMode();
          break;
        case 'KeyH':
          this.toggleGUI();
          break;
      }
    });
  }
  
  onVehicleChange(vehicle) {
    this.simulation.changeVehicle(vehicle);
    this.updateVehicleSpecificControls(vehicle);
    this.updateCornerInfo();
  }
  
  onCornerTypeChange(cornerType) {
    this.simulation.changeCorner(cornerType);
    this.updateCornerInfo();
  }
  
  onRacingLineChange(racingLine) {
    this.simulation.changeRacingLine(racingLine);
  }
  
  onBrakingStyleChange(brakingStyle) {
    this.simulation.changeBrakingStyle(brakingStyle);
  }
  
  onPlaybackSpeedChange(speed) {
    this.simulation.setPlaybackSpeed(speed);
  }
  
  onPauseChange(paused) {
    this.simulation.setPaused(paused);
    this.updatePlayButton();
  }
  
  onForceVectorsToggle(visible) {
    this.simulation.toggleForceVectors(visible);
  }
  
  onWeightDisplayToggle(visible) {
    this.simulation.toggleWeightDisplay(visible);
  }
  
  onGripCirclesToggle(visible) {
    this.simulation.toggleGripCircles(visible);
  }
  
  onRacingLineToggle(visible) {
    this.simulation.toggleRacingLine(visible);
  }
  
  onTelemetryToggle(visible) {
    this.simulation.toggleTelemetry(visible);
  }
  
  onCameraModeChange(mode) {
    this.simulation.setCameraMode(mode);
    this.updateCameraModeDisplay(mode);
  }
  
  onPhysicsToggle(enabled) {
    this.simulation.togglePhysics(enabled);
  }
  
  onGravityScaleChange(scale) {
    this.simulation.setGravityScale(scale);
  }
  
  onTimeScaleChange(scale) {
    this.simulation.setTimeScale(scale);
  }
  
  onExplanationsToggle(show) {
    this.simulation.toggleExplanations(show);
  }
  
  onTutorialModeToggle(enabled) {
    this.simulation.setTutorialMode(enabled);
  }
  
  updateVehicleSpecificControls(vehicle) {
    // Clear existing vehicle controls
    if (this.vehicleFolder) {
      // Remove all controllers from the folder
      while (this.vehicleFolder.__controllers.length > 0) {
        this.vehicleFolder.remove(this.vehicleFolder.__controllers[0]);
      }
      // Close and hide the old folder
      this.vehicleFolder.close();
      this.vehicleFolder.domElement.style.display = 'none';
    }
    this.vehicleFolder = this.gui.addFolder('Vehicle Settings');
    
    // Add vehicle-specific controls based on type
    if (vehicle === 'Formula 1') {
      this.vehicleFolder.add({ drsEnabled: false }, 'drsEnabled')
        .name('DRS Enabled')
        .onChange((value) => this.simulation.setDRS(value));
      
      this.vehicleFolder.add({ ersMode: 'race' }, 'ersMode', ['qualify', 'race', 'overtake'])
        .name('ERS Mode')
        .onChange((value) => this.simulation.setERSMode(value));
        
      this.vehicleFolder.add({ downforceLevel: 50 }, 'downforceLevel', 0, 100, 1)
        .name('Downforce Level')
        .onChange((value) => this.simulation.setDownforceLevel(value));
    } else {
      this.vehicleFolder.add({ suspensionSetup: 'street' }, 'suspensionSetup', ['street', 'sport', 'race'])
        .name('Suspension Setup')
        .onChange((value) => this.simulation.setSuspensionSetup(value));
        
      this.vehicleFolder.add({ tireType: 'street' }, 'tireType', ['street', 'sport', 'race'])
        .name('Tire Type')
        .onChange((value) => this.simulation.setTireType(value));
    }
  }
  
  updateCornerInfo() {
    if (!this.initialized) return;
    
    const cornerInfo = document.getElementById('corner-info');
    const cornerName = document.getElementById('corner-name');
    const cornerDescription = document.getElementById('corner-description');
    const racingLineInfo = document.getElementById('racing-line-info');
    
    if (cornerInfo && cornerName && cornerDescription && racingLineInfo) {
      const corner = CORNER_TYPES[this.controls.cornerType];
      const line = RACING_LINES[this.controls.racingLine];
      
      cornerName.textContent = corner.name;
      cornerDescription.textContent = corner.description;
      racingLineInfo.textContent = `${line.name}: ${line.description}`;
      
      cornerInfo.style.display = 'block';
    }
  }
  
  updatePlayButton() {
    if (!this.initialized) return;
    
    const playButton = document.getElementById('play-pause');
    if (playButton) {
      playButton.textContent = this.controls.paused ? 'Play' : 'Pause';
    }
  }
  
  updateCameraModeDisplay(mode) {
    if (!this.initialized) return;
    
    let cameraDisplay = document.querySelector('.camera-mode');
    if (!cameraDisplay) {
      cameraDisplay = document.createElement('div');
      cameraDisplay.className = 'camera-mode';
      document.body.appendChild(cameraDisplay);
    }
    
    cameraDisplay.textContent = `Camera: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
  }
  
  cycleCameraMode() {
    const modes = ['orbit', 'chase', 'cockpit', 'helicopter', 'trackside'];
    const currentIndex = modes.indexOf(this.controls.cameraMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    
    this.controls.cameraMode = modes[nextIndex];
    this.onCameraModeChange(this.controls.cameraMode);
    this.updateDisplay('cameraMode');
  }
  
  cycleVisualization() {
    // Toggle through common visualization combinations
    if (this.controls.showForceVectors && this.controls.showWeightDistribution) {
      // Show only force vectors
      this.controls.showWeightDistribution = false;
      this.onWeightDisplayToggle(false);
    } else if (this.controls.showForceVectors) {
      // Show only weight distribution
      this.controls.showForceVectors = false;
      this.controls.showWeightDistribution = true;
      this.onForceVectorsToggle(false);
      this.onWeightDisplayToggle(true);
    } else {
      // Show both
      this.controls.showForceVectors = true;
      this.controls.showWeightDistribution = true;
      this.onForceVectorsToggle(true);
      this.onWeightDisplayToggle(true);
    }
    
    this.updateDisplay('showForceVectors');
    this.updateDisplay('showWeightDistribution');
  }
  
  toggleGUI() {
    const isVisible = this.gui.domElement.style.display !== 'none';
    this.gui.domElement.style.display = isVisible ? 'none' : 'block';
  }
  
  updateDisplay(controlName) {
    // Force GUI to update display
    this.gui.__controllers.forEach(controller => {
      if (controller.property === controlName) {
        controller.updateDisplay();
      }
    });
    
    // Update folder controllers too
    Object.values(this.gui.__folders).forEach(folder => {
      folder.__controllers.forEach(controller => {
        if (controller.property === controlName) {
          controller.updateDisplay();
        }
      });
    });
  }
  
  addCustomControl(folderName, controlName, object, property, min, max, step) {
    let folder = this.gui.__folders[folderName];
    if (!folder) {
      folder = this.gui.addFolder(folderName);
    }
    
    if (typeof min !== 'undefined' && typeof max !== 'undefined') {
      return folder.add(object, property, min, max, step).name(controlName);
    } else {
      return folder.add(object, property).name(controlName);
    }
  }
  
  addVisualizationControl(name, defaultValue, onChange) {
    const visualFolder = this.gui.__folders['Visualization Options'];
    if (visualFolder) {
      const control = { [name]: defaultValue };
      return visualFolder.add(control, name).onChange(onChange);
    }
  }
  
  addEducationalControl(name, defaultValue, onChange) {
    const educationFolder = this.gui.__folders['Educational'];
    if (educationFolder) {
      const control = { [name]: defaultValue };
      return educationFolder.add(control, name).onChange(onChange);
    }
  }
  
  setCornerType(cornerType) {
    this.controls.cornerType = cornerType;
    this.updateDisplay('cornerType');
    this.onCornerTypeChange(cornerType);
  }
  
  setVehicle(vehicle) {
    this.controls.vehicle = vehicle;
    this.updateDisplay('vehicle');
    this.onVehicleChange(vehicle);
  }
  
  setRacingLine(racingLine) {
    this.controls.racingLine = racingLine;
    this.updateDisplay('racingLine');
    this.onRacingLineChange(racingLine);
  }
  
  setPaused(paused) {
    this.controls.paused = paused;
    this.updateDisplay('paused');
    this.onPauseChange(paused);
  }
  
  showMessage(message, duration = 3000) {
    if (!this.initialized) return;
    
    // Create temporary message overlay
    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '50%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translate(-50%, -50%)';
    messageDiv.style.background = 'rgba(0, 0, 0, 0.9)';
    messageDiv.style.color = '#fff';
    messageDiv.style.padding = '20px 30px';
    messageDiv.style.borderRadius = '10px';
    messageDiv.style.fontSize = '18px';
    messageDiv.style.zIndex = '10000';
    messageDiv.style.backdropFilter = 'blur(10px)';
    messageDiv.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    // Fade out and remove
    setTimeout(() => {
      messageDiv.style.transition = 'opacity 0.5s';
      messageDiv.style.opacity = '0';
      setTimeout(() => messageDiv.remove(), 500);
    }, duration);
  }
  
  showEducationalContent(topic) {
    if (!this.initialized) return;
    
    // Display educational overlay with physics explanations
    const overlay = document.createElement('div');
    overlay.className = 'educational-overlay';
    overlay.style.display = 'block';
    
    const content = this.getEducationalContent(topic);
    overlay.innerHTML = `
      <h2>${content.title}</h2>
      <p>${content.description}</p>
      <div style="margin: 15px 0;">
        <strong>Key Points:</strong>
        <ul>
          ${content.keyPoints.map(point => `<li>${point}</li>`).join('')}
        </ul>
      </div>
      <button onclick="this.parentElement.remove()">Close</button>
    `;
    
    document.body.appendChild(overlay);
  }
  
  getEducationalContent(topic) {
    const content = {
      weightTransfer: {
        title: "Weight Transfer Explained",
        description: "When a car accelerates, brakes, or corners, weight shifts between wheels due to inertial forces.",
        keyPoints: [
          "Under 1g cornering, approximately 27% of weight transfers to outside wheels",
          "Lower center of gravity reduces weight transfer",
          "F1 cars minimize transfer with very low CG height (280mm vs 450mm for RX-8)",
          "Weight transfer affects tire grip and handling balance"
        ]
      },
      trailBraking: {
        title: "Trail Braking Technique",
        description: "Maintaining brake pressure while turning increases front tire grip by transferring weight forward.",
        keyPoints: [
          "Transfers weight forward for more front grip",
          "Uses the friction circle efficiently",
          "Requires precise brake modulation",
          "Can reduce understeer in entry phase"
        ]
      },
      racingLine: {
        title: "Optimal Racing Line",
        description: "The fastest path through a corner maximizes radius and exit speed.",
        keyPoints: [
          "Late apex maximizes exit speed onto straights",
          "Sacrifice entry speed for better exit",
          "Defensive line blocks inside but compromises speed",
          "Overtaking line uses late braking"
        ]
      }
    };
    
    return content[topic] || { title: "Information", description: "No content available", keyPoints: [] };
  }
  
  dispose() {
    this.gui.destroy();
    
    // Remove event listeners
    document.removeEventListener('keydown', this.bindEvents);
  }
}