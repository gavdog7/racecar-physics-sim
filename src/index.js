import './styles.css';
import Stats from 'stats.js';
import { RacingSimulation } from './RacingSimulation.js';

// Show loading screen
const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');

let progress = 0;

function updateProgress(amount) {
  progress += amount;
  loadingProgress.style.width = `${Math.min(progress, 100)}%`;
}

// Initialize simulation
async function init() {
  try {
    updateProgress(10);
    
    // Performance monitoring
    const stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);
    stats.dom.id = 'stats';
    
    updateProgress(20);
    
    // Get canvas container
    const container = document.getElementById('canvas-container');
    
    updateProgress(30);
    
    // Create simulation
    const simulation = new RacingSimulation(container);
    
    updateProgress(50);
    
    // Initialize simulation
    await simulation.init((progressPercent) => {
      updateProgress(progressPercent * 0.5); // Use remaining 50% for simulation init
    });
    
    updateProgress(100);
    
    // Hide loading screen
    setTimeout(() => {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }, 500);
    
    // Setup timeline controls
    setupTimelineControls(simulation);
    
    // Main render loop
    function animate(currentTime) {
      stats.begin();
      
      const deltaTime = Math.min((currentTime - (animate.lastTime || currentTime)) / 1000, 1/30);
      animate.lastTime = currentTime;
      
      simulation.update(deltaTime);
      simulation.render();
      
      stats.end();
      requestAnimationFrame(animate);
    }
    
    requestAnimationFrame(animate);
    
    // Global simulation reference for debugging
    window.simulation = simulation;
    
  } catch (error) {
    console.error('Failed to initialize simulation:', error);
    
    // Show error message
    loadingScreen.innerHTML = `
      <h1>Error Loading Simulation</h1>
      <p>Please check the console for details.</p>
      <button onclick="location.reload()">Reload</button>
    `;
  }
}

function setupTimelineControls(simulation) {
  const timelineControl = document.getElementById('timeline-control');
  const playPauseBtn = document.getElementById('play-pause');
  const restartBtn = document.getElementById('restart');
  const timelineScrubber = document.getElementById('timeline-scrubber');
  const timeDisplay = document.getElementById('time-display');
  
  if (!timelineControl) return;
  
  // Show timeline controls
  timelineControl.style.display = 'flex';
  
  // Play/Pause button
  playPauseBtn.addEventListener('click', () => {
    const isPaused = simulation.togglePause();
    playPauseBtn.textContent = isPaused ? 'Play' : 'Pause';
  });
  
  // Restart button
  restartBtn.addEventListener('click', () => {
    simulation.restart();
    timelineScrubber.value = 0;
    timeDisplay.textContent = '0.0s';
  });
  
  // Timeline scrubber
  timelineScrubber.addEventListener('input', (e) => {
    const progress = parseFloat(e.target.value) / 100;
    simulation.setTimeProgress(progress);
    timeDisplay.textContent = `${(progress * 30).toFixed(1)}s`; // 30 second sequence
  });
  
  // Update timeline display
  simulation.onTimeUpdate = (currentTime, totalTime) => {
    const progress = (currentTime / totalTime) * 100;
    timelineScrubber.value = progress;
    timeDisplay.textContent = `${currentTime.toFixed(1)}s`;
  };
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (window.simulation) {
    if (document.hidden) {
      window.simulation.pause();
    } else {
      window.simulation.resume();
    }
  }
});

// Handle window unload
window.addEventListener('beforeunload', () => {
  if (window.simulation) {
    window.simulation.dispose();
  }
});

// Error handling
window.addEventListener('error', (event) => {
  console.error('Runtime error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Start the application
init();