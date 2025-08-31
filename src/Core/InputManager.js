export class InputManager {
  constructor() {
    this.keys = {};
    this.gamepadIndex = null;
    this.mousePosition = { x: 0, y: 0 };
    this.mouseDelta = { x: 0, y: 0 };
    this.mouseButtons = {};
    
    // Input state
    this.controls = {
      throttle: 0,
      brake: 0,
      steering: 0,
      handbrake: false,
      clutch: 0,
      gearUp: false,
      gearDown: false,
      reset: false,
      pause: false,
      cameraNext: false,
      cameraPrev: false
    };
    
    // Steering settings
    this.steeringSettings = {
      sensitivity: 1.0,
      deadzone: 0.05,
      maxSteeringAngle: 35, // degrees
      steeringSpeed: 3.0, // How fast steering responds
      returnSpeed: 5.0 // How fast steering returns to center
    };
    
    // Current steering value (smoothed)
    this.currentSteering = 0;
    
    this.setupEventListeners();
    this.checkGamepad();
  }
  
  setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // Mouse events
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Gamepad events
    window.addEventListener('gamepadconnected', this.onGamepadConnected.bind(this));
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected.bind(this));
    
    // Prevent context menu on right click
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  onKeyDown(event) {
    this.keys[event.code] = true;
    
    // Prevent default for arrow keys and space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  }
  
  onKeyUp(event) {
    this.keys[event.code] = false;
  }
  
  onMouseMove(event) {
    this.mouseDelta.x = event.movementX;
    this.mouseDelta.y = event.movementY;
    this.mousePosition.x = event.clientX;
    this.mousePosition.y = event.clientY;
  }
  
  onMouseDown(event) {
    this.mouseButtons[event.button] = true;
  }
  
  onMouseUp(event) {
    this.mouseButtons[event.button] = false;
  }
  
  onGamepadConnected(event) {
    console.log('Gamepad connected:', event.gamepad.id);
    this.gamepadIndex = event.gamepad.index;
  }
  
  onGamepadDisconnected(event) {
    console.log('Gamepad disconnected');
    if (this.gamepadIndex === event.gamepad.index) {
      this.gamepadIndex = null;
    }
  }
  
  checkGamepad() {
    requestAnimationFrame(this.checkGamepad.bind(this));
    
    if (this.gamepadIndex === null) return;
    
    const gamepad = navigator.getGamepads()[this.gamepadIndex];
    if (!gamepad) return;
    
    // Update controls from gamepad
    // Assuming Xbox/PlayStation controller layout
    this.controls.throttle = this.applyDeadzone(gamepad.buttons[7].value); // RT
    this.controls.brake = this.applyDeadzone(gamepad.buttons[6].value); // LT
    
    const steeringInput = this.applyDeadzone(gamepad.axes[0]); // Left stick X
    this.controls.steering = steeringInput;
    
    this.controls.handbrake = gamepad.buttons[0].pressed; // A/X button
    this.controls.gearUp = gamepad.buttons[5].pressed; // RB
    this.controls.gearDown = gamepad.buttons[4].pressed; // LB
    this.controls.reset = gamepad.buttons[8].pressed; // Select/Share
    this.controls.pause = gamepad.buttons[9].pressed; // Start/Options
  }
  
  applyDeadzone(value) {
    if (Math.abs(value) < this.steeringSettings.deadzone) {
      return 0;
    }
    
    // Apply deadzone and rescale
    const sign = Math.sign(value);
    const magnitude = Math.abs(value);
    const adjustedMagnitude = (magnitude - this.steeringSettings.deadzone) / 
                             (1 - this.steeringSettings.deadzone);
    
    return sign * adjustedMagnitude;
  }
  
  update(deltaTime) {
    // Update keyboard controls
    if (this.gamepadIndex === null) {
      // Throttle/Brake
      this.controls.throttle = this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0;
      this.controls.brake = this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0;
      
      // Steering
      let steeringInput = 0;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) steeringInput -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) steeringInput += 1;
      this.controls.steering = steeringInput * this.steeringSettings.sensitivity;
      
      // Other controls
      this.controls.handbrake = this.keys['Space'] || false;
      this.controls.gearUp = this.keys['KeyE'] || false;
      this.controls.gearDown = this.keys['KeyQ'] || false;
      this.controls.reset = this.keys['KeyR'] || false;
      this.controls.pause = this.keys['Escape'] || false;
      this.controls.cameraNext = this.keys['KeyC'] || false;
      this.controls.cameraPrev = this.keys['KeyV'] || false;
    }
    
    // Smooth steering input
    const targetSteering = this.controls.steering;
    const steeringDiff = targetSteering - this.currentSteering;
    
    if (Math.abs(steeringDiff) > 0.001) {
      const speed = targetSteering !== 0 ? 
        this.steeringSettings.steeringSpeed : 
        this.steeringSettings.returnSpeed;
      
      this.currentSteering += steeringDiff * speed * deltaTime;
      this.currentSteering = Math.max(-1, Math.min(1, this.currentSteering));
    } else {
      this.currentSteering = targetSteering;
    }
    
    // Reset mouse delta
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
  }
  
  getControls() {
    return {
      ...this.controls,
      steering: this.currentSteering,
      steeringAngle: this.currentSteering * this.steeringSettings.maxSteeringAngle * Math.PI / 180
    };
  }
  
  isKeyPressed(keyCode) {
    return this.keys[keyCode] || false;
  }
  
  isMouseButtonPressed(button) {
    return this.mouseButtons[button] || false;
  }
  
  getMousePosition() {
    return { ...this.mousePosition };
  }
  
  getMouseDelta() {
    return { ...this.mouseDelta };
  }
  
  setSteeringSensitivity(value) {
    this.steeringSettings.sensitivity = Math.max(0.1, Math.min(2.0, value));
  }
  
  dispose() {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('mousedown', this.onMouseDown.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    window.removeEventListener('gamepadconnected', this.onGamepadConnected.bind(this));
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected.bind(this));
  }
}