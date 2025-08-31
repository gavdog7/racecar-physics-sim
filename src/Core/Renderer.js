import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';

const M2_OPTIMIZATIONS = {
  renderer: {
    powerPreference: "high-performance",
    antialias: true,
    alpha: false,
    depth: true,
    stencil: false,
    preserveDrawingBuffer: false
  },
  lodDistances: [50, 150, 300],
  textureSize: 2048,
  anisotropy: 8,
  shadows: {
    enabled: true,
    type: THREE.PCFSoftShadowMap,
    resolution: 2048,
    cascades: 2
  }
};

export class Renderer {
  constructor(container) {
    this.container = container;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLights();
    this.initPostProcessing();
    this.initControls();
    this.initHelpers();
    
    this.setupEventListeners();
    this.optimizeForM2();
  }
  
  initRenderer() {
    this.renderer = new THREE.WebGLRenderer(M2_OPTIMIZATIONS.renderer);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = M2_OPTIMIZATIONS.shadows.enabled;
    this.renderer.shadowMap.type = M2_OPTIMIZATIONS.shadows.type;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    this.container.appendChild(this.renderer.domElement);
  }
  
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x111111, 100, 500);
    
    // Sky gradient
    const skyGeometry = new THREE.SphereGeometry(500, 32, 16);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(sky);
  }
  
  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      50,
      this.width / this.height,
      0.1,
      1000
    );
    this.camera.position.set(30, 20, 30);
    this.camera.lookAt(0, 0, 0);
    
    // Camera modes
    this.cameraMode = 'orbit';
    this.cameraOffsets = {
      chase: new THREE.Vector3(0, 5, -15),
      cockpit: new THREE.Vector3(0, 1.2, 0.5),
      helicopter: new THREE.Vector3(0, 50, 0),
      trackside: new THREE.Vector3(40, 10, 0)
    };
  }
  
  initLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    // Main directional light (sun)
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sunLight.position.set(50, 100, 50);
    this.sunLight.castShadow = true;
    
    // Shadow configuration
    this.sunLight.shadow.mapSize.width = M2_OPTIMIZATIONS.shadows.resolution;
    this.sunLight.shadow.mapSize.height = M2_OPTIMIZATIONS.shadows.resolution;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.sunLight.shadow.bias = -0.0005;
    
    this.scene.add(this.sunLight);
    
    // Fill light
    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
    fillLight.position.set(-50, 50, -50);
    this.scene.add(fillLight);
  }
  
  initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    
    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    // FXAA antialiasing pass
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms['resolution'].value.set(1 / this.width, 1 / this.height);
    this.composer.addPass(fxaaPass);
  }
  
  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;
    this.controls.enabled = this.cameraMode === 'orbit';
  }
  
  initHelpers() {
    // Grid helper
    this.gridHelper = new THREE.GridHelper(200, 50, 0x444444, 0x222222);
    this.scene.add(this.gridHelper);
    
    // Axes helper (hidden by default)
    this.axesHelper = new THREE.AxesHelper(5);
    this.axesHelper.visible = false;
    this.scene.add(this.axesHelper);
  }
  
  setupEventListeners() {
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }
  
  onWindowResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(this.width, this.height);
    this.composer.setSize(this.width, this.height);
    
    // Update FXAA resolution
    const fxaaPass = this.composer.passes.find(pass => pass.uniforms && pass.uniforms.resolution);
    if (fxaaPass) {
      fxaaPass.uniforms.resolution.value.set(1 / this.width, 1 / this.height);
    }
  }
  
  optimizeForM2() {
    // Enable GPU instancing for repeated geometry
    this.renderer.capabilities.isWebGL2 = true;
    
    // Set texture anisotropy
    this.renderer.capabilities.getMaxAnisotropy = () => M2_OPTIMIZATIONS.anisotropy;
    
    // Enable frustum culling on all objects
    this.scene.traverse((object) => {
      if (object.isMesh) {
        object.frustumCulled = true;
      }
    });
  }
  
  setCameraMode(mode) {
    this.cameraMode = mode;
    this.controls.enabled = mode === 'orbit';
  }
  
  updateCamera(vehiclePosition, vehicleRotation) {
    if (this.cameraMode === 'orbit') {
      return; // Let OrbitControls handle it
    }
    
    const offset = this.cameraOffsets[this.cameraMode].clone();
    
    if (this.cameraMode === 'chase') {
      // Apply vehicle rotation to offset
      offset.applyQuaternion(vehicleRotation);
      this.camera.position.copy(vehiclePosition).add(offset);
      this.camera.lookAt(vehiclePosition);
    } else if (this.cameraMode === 'cockpit') {
      offset.applyQuaternion(vehicleRotation);
      this.camera.position.copy(vehiclePosition).add(offset);
      const lookAtPoint = vehiclePosition.clone().add(
        new THREE.Vector3(0, 0, 10).applyQuaternion(vehicleRotation)
      );
      this.camera.lookAt(lookAtPoint);
    } else if (this.cameraMode === 'helicopter') {
      this.camera.position.copy(vehiclePosition).add(offset);
      this.camera.lookAt(vehiclePosition);
    } else if (this.cameraMode === 'trackside') {
      // Fixed trackside camera
      this.camera.lookAt(vehiclePosition);
    }
  }
  
  createLODModel(highDetail, mediumDetail, lowDetail) {
    const lod = new THREE.LOD();
    
    if (highDetail) lod.addLevel(highDetail, M2_OPTIMIZATIONS.lodDistances[0]);
    if (mediumDetail) lod.addLevel(mediumDetail, M2_OPTIMIZATIONS.lodDistances[1]);
    if (lowDetail) lod.addLevel(lowDetail, M2_OPTIMIZATIONS.lodDistances[2]);
    
    return lod;
  }
  
  render() {
    if (this.controls.enabled) {
      this.controls.update();
    }
    
    // Use post-processing composer for better quality
    this.composer.render();
  }
  
  dispose() {
    this.renderer.dispose();
    this.controls.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}