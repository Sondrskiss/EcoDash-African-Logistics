const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menu = document.getElementById("menu");
const gameScreen = document.getElementById("gameScreen");
const pauseScreen = document.getElementById("pauseScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const scoreText = document.getElementById("score");
const batteryText = document.getElementById("battery");
const distanceText = document.getElementById("distance");
const efficiencyText = document.getElementById("efficiency");
const weatherText = document.getElementById("weather");
const powerText = document.getElementById("powerStatus");
const highScoreText = document.getElementById("highScore");
const message = document.getElementById("message");

const keys = {};
let animationId;
let lastTime = 0;
let gameState = "menu";
let score = 0;
let distance = 0;
let startBattery = 100;
let collisionPenalty = 0;
let missionTime = 0;
let weatherTime = 0;
let weather = "Clear";
let loadShedding = false;
let audioContext = null;
let lastCollisionSound = 0;

class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  add(vector) { this.x += vector.x; this.y += vector.y; }
  multiply(value) { this.x *= value; this.y *= value; }
}

class Player {
  constructor() {
    this.width = 42;
    this.height = 28;
    this.acceleration = 0.23;
    this.maxSpeed = 4.4;
    this.drag = 0.89;
    this.reset();
  }

  reset() {
    this.position = new Vector2(90, 270);
    this.velocity = new Vector2(0, 0);
    this.angle = 0;
    this.battery = 100;
  }

  update(dt) {
    const direction = new Vector2(0, 0);
    if (keys.ArrowUp || keys.w) direction.y -= 1;
    if (keys.ArrowDown || keys.s) direction.y += 1;
    if (keys.ArrowLeft || keys.a) direction.x -= 1;
    if (keys.ArrowRight || keys.d) direction.x += 1;

    if (direction.x !== 0 || direction.y !== 0) {
      const length = Math.hypot(direction.x, direction.y);
      direction.x /= length;
      direction.y /= length;

      // The Vector direction -> angle -> horizontal/vertical acceleration.
      this.angle = Math.atan2(direction.y, direction.x);
      this.velocity.x += Math.cos(this.angle) * this.acceleration;
      this.velocity.y += Math.sin(this.angle) * this.acceleration;
    }

    // The wind changes the velocity direction and makes the simulation less predictable.
    if (weather === "Windy") {
      this.velocity.x += 0.018 * dt;
      this.velocity.y += Math.sin(missionTime * 2) * 0.012 * dt;
    }

    this.velocity.multiply(this.drag);

    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    if (speed > this.maxSpeed) {
      this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
      this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;
    }

    this.position.add(new Vector2(this.velocity.x * dt, this.velocity.y * dt));
    this.position.x = Math.max(15, Math.min(canvas.width - this.width - 15, this.position.x));
    this.position.y = Math.max(55, Math.min(canvas.height - this.height - 15, this.position.y));

    if (speed > 0.1) {
      const weatherMultiplier = weather === "Windy" ? 1.18 : weather === "Rainy" ? 1.08 : 1;
      this.battery -= 0.018 * speed * dt * weatherMultiplier;
      distance += speed * dt * 0.08;
    }
    this.battery = Math.max(0, this.battery);
  }

  draw() {
    ctx.save();
    ctx.translate(this.position.x + this.width / 2, this.position.y + this.height / 2);
    ctx.rotate(this.angle);

    ctx.fillStyle = "#f5cf4a";
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.fillStyle = "#23352a";
    ctx.fillRect(-11, -8, 22, 16);
    ctx.fillStyle = "#9bdcff";
    ctx.fillRect(-7, -5, 14, 7);
    ctx.fillStyle = "#23352a";
    ctx.fillRect(-22, -13, 5, 4);
    ctx.fillRect(17, -13, 5, 4);
    ctx.restore();
  }

  getRect() {
    return { x: this.position.x, y: this.position.y, width: this.width, height: this.height };
  }
}

class Obstacle {
  constructor(x, y, width, height, type) {
    this.x = x; this.y = y; this.width = width; this.height = height; this.type = type;
  }

  draw() {
    if (this.type === "pothole") {
      ctx.fillStyle = "#3a2b25";
      ctx.beginPath();
      ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === "tree") {
      ctx.fillStyle = "#68442a";
      ctx.fillRect(this.x + this.width / 2 - 7, this.y + 15, 14, this.height - 15);
      ctx.fillStyle = "#2e6b38";
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + 18, Math.min(this.width, this.height) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#5a9fc0";
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.strokeStyle = "#d9f1ff";
      for (let y = this.y + 12; y < this.y + this.height; y += 18) {
        ctx.beginPath(); ctx.moveTo(this.x, y); ctx.lineTo(this.x + this.width, y); ctx.stroke();
      }
    }
  }

  getRect() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }
}

class SolarZone {
  constructor(x, y, radius) { this.x = x; this.y = y; this.radius = radius; }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = loadShedding ? "rgba(120,120,120,.30)" : "rgba(255,220,70,.32)";
    ctx.fill();
    ctx.strokeStyle = loadShedding ? "#6d6d6d" : "#b18b00";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#342d10";
    ctx.textAlign = "center";
    ctx.font = "bold 13px Arial";
    ctx.fillText(loadShedding ? "POWER OFF" : "SOLAR", this.x, this.y + 4);
  }
}

class DustParticle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = 155 + Math.random() * 345;
    this.radius = 1 + Math.random() * 2.5;
    this.speed = 0.15 + Math.random() * 0.6;
    this.life = 30 + Math.random() * 80;
  }
  update(dt) {
    this.x += this.speed * dt;
    this.life -= dt;
    if (this.x > canvas.width + 5 || this.life <= 0) this.reset();
  }
  draw() {
    ctx.fillStyle = "rgba(92,72,45,.22)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

const player = new Player();
const obstacles = [
  new Obstacle(275, 120, 70, 50, "pothole"),
  new Obstacle(500, 340, 75, 70, "tree"),
  new Obstacle(650, 100, 105, 55, "flood"),
  new Obstacle(370, 430, 100, 35, "pothole"),
  new Obstacle(760, 305, 65, 75, "tree")
];
const solarZone = new SolarZone(190, 430, 55);
const clinic = { x: 850, y: 205, width: 75, height: 80 };
const dustParticles = Array.from({ length: 55 }, () => new DustParticle());

function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

function playTone(frequency, duration = 0.08) {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = "sine";
  gain.gain.setValueAtTime(0.04, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function checkCollisions() {
  for (const obstacle of obstacles) {
    if (rectanglesOverlap(player.getRect(), obstacle.getRect())) {
      player.velocity.x *= -0.45;
      player.velocity.y *= -0.45;
      player.battery = Math.max(0, player.battery - 4);
      score = Math.max(0, score - 20);
      collisionPenalty++;
      message.textContent = "Hazard hit! Battery and score reduced.";
      if (performance.now() - lastCollisionSound > 500) {
        playTone(120, 0.12);
        lastCollisionSound = performance.now();
      }
    }
  }

  const centreX = player.position.x + player.width / 2;
  const centreY = player.position.y + player.height / 2;
  const solarDistance = Math.hypot(centreX - solarZone.x, centreY - solarZone.y);

  if (solarDistance < solarZone.radius) {
    if (!loadShedding) {
      player.battery = Math.min(100, player.battery + 0.08);
      message.textContent = "Solar Microgrid Zone: battery recharging.";
    } else {
      message.textContent = "Load-shedding: the solar station is temporarily offline.";
    }
  }

  if (rectanglesOverlap(player.getRect(), clinic)) endGame(true);
  if (player.battery <= 0) endGame(false);
}

function updateWeather(dt) {
  weatherTime += dt;
  if (weatherTime > 14) {
    weatherTime = 0;
    const options = ["Clear", "Windy", "Rainy"];
    weather = options[Math.floor(Math.random() * options.length)];
  }

  // A simple repeating power schedule models temporary infrastructure outages.
  loadShedding = Math.floor(missionTime / 12) % 2 === 1;
}

function drawBackground() {
  ctx.fillStyle = "#d8c48f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Savannah ground and road.
  ctx.fillStyle = "#8da35c";
  ctx.fillRect(0, 55, canvas.width, canvas.height - 55);
  ctx.fillStyle = "#756d5c";
  ctx.fillRect(0, 215, canvas.width, 115);
  ctx.fillStyle = "#a99d82";
  for (let x = 0; x < canvas.width; x += 55) ctx.fillRect(x, 268, 30, 5);

  // River / flood area.
  ctx.fillStyle = "#6ba4c1";
  ctx.fillRect(0, 80, 230, 70);

  // Village huts.
  ctx.fillStyle = "#b66e3b";
  ctx.fillRect(35, 370, 90, 50);
  ctx.fillStyle = "#593725";
  ctx.beginPath(); ctx.moveTo(25, 370); ctx.lineTo(80, 330); ctx.lineTo(135, 370); ctx.fill();
  ctx.fillStyle = "#b66e3b";
  ctx.fillRect(145, 385, 75, 40);
  ctx.fillStyle = "#593725";
  ctx.beginPath(); ctx.moveTo(138, 385); ctx.lineTo(182, 352); ctx.lineTo(228, 385); ctx.fill();

  // Clinic destination.
  ctx.fillStyle = "#f2eee2";
  ctx.fillRect(clinic.x, clinic.y, clinic.width, clinic.height);
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(clinic.x + 30, clinic.y + 15, 15, 45);
  ctx.fillRect(clinic.x + 15, clinic.y + 30, 45, 15);
  ctx.fillStyle = "#222";
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "center";
  ctx.fillText("RURAL CLINIC", clinic.x + 38, clinic.y - 8);

  // Direction marker.
  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.fillRect(760, 55, 160, 30);
  ctx.fillStyle = "#26372b";
  ctx.textAlign = "center";
  ctx.font = "12px Arial";
  ctx.fillText("Deliver medical supplies →", 840, 75);

  if (weather === "Rainy") {
    ctx.strokeStyle = "rgba(220,240,255,.45)";
    for (let i = 0; i < 70; i++) {
      const x = (i * 83 + missionTime * 45) % canvas.width;
      const y = 55 + ((i * 47 + missionTime * 90) % (canvas.height - 55));
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 13); ctx.stroke();
    }
  }
}

function drawWeatherOverlay() {
  if (weather === "Windy") {
    ctx.fillStyle = "rgba(255,255,255,.06)";
    ctx.fillRect(0, 55, canvas.width, canvas.height - 55);
  }
  if (weather === "Rainy") {
    ctx.fillStyle = "rgba(40,70,100,.10)";
    ctx.fillRect(0, 55, canvas.width, canvas.height - 55);
  }
}

function drawMiniMap() {
  const x = 805, y = 455, w = 130, h = 65;
  ctx.fillStyle = "rgba(255,255,255,.86)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#26372b";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#6ba4c1";
  ctx.fillRect(x, y + 10, 30, 12);
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(x + 112, y + 25, 10, 10);
  ctx.fillStyle = "#23352a";
  ctx.beginPath();
  ctx.arc(x + (player.position.x / canvas.width) * w, y + (player.position.y / canvas.height) * h, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.font = "10px Arial";
  ctx.textAlign = "left";
  ctx.fillText("MINI-MAP", x + 5, y + h - 5);
}

function updateHUD() {
  scoreText.textContent = Math.round(score);
  batteryText.textContent = `${Math.round(player.battery)}%`;
  distanceText.textContent = `${distance.toFixed(1)} km`;
  const efficiency = Math.max(0, Math.round((player.battery / startBattery) * 100 - collisionPenalty * 3));
  efficiencyText.textContent = `${efficiency}%`;
  weatherText.textContent = weather;
  powerText.textContent = loadShedding ? "OFF" : "ON";
  highScoreText.textContent = localStorage.getItem("ecoDashHighScore") || "0";
}

function update(dt) {
  missionTime += dt / 60;
  updateWeather(dt / 60);
  player.update(dt);
  dustParticles.forEach(particle => particle.update(dt));
  checkCollisions();
  score += 0.03 * dt;
  updateHUD();
}

function draw() {
  drawBackground();
  solarZone.draw();
  obstacles.forEach(obstacle => obstacle.draw());
  dustParticles.forEach(particle => particle.draw());
  player.draw();
  drawWeatherOverlay();
  drawMiniMap();
}

function loop(timestamp) {
  if (gameState !== "playing") return;
  const dt = Math.min((timestamp - lastTime) / 16.67, 2);
  lastTime = timestamp;
  update(dt);
  draw();
  animationId = requestAnimationFrame(loop);
}

function startGame() {
  cancelAnimationFrame(animationId);
  player.reset();
  score = 0;
  distance = 0;
  collisionPenalty = 0;
  startBattery = 100;
  missionTime = 0;
  weatherTime = 0;
  weather = "Clear";
  loadShedding = false;
  gameState = "playing";
  menu.classList.add("hidden");
  pauseScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  message.textContent = "Deliver the medical supplies to the clinic.";
  lastTime = performance.now();
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  playTone(520, 0.08);
  updateHUD();
  draw();
  animationId = requestAnimationFrame(loop);
}

function pauseGame() {
  if (gameState !== "playing") return;
  gameState = "paused";
  cancelAnimationFrame(animationId);
  gameScreen.classList.add("hidden");
  pauseScreen.classList.remove("hidden");
}

function resumeGame() {
  if (gameState !== "paused") return;
  gameState = "playing";
  pauseScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  lastTime = performance.now();
  animationId = requestAnimationFrame(loop);
}

function endGame(success) {
  if (gameState !== "playing") return;
  gameState = "gameover";
  cancelAnimationFrame(animationId);
  gameScreen.classList.add("hidden");
  gameOverScreen.classList.remove("hidden");

  const finalScore = Math.round(score);
  const previous = Number(localStorage.getItem("ecoDashHighScore") || 0);
  if (finalScore > previous) localStorage.setItem("ecoDashHighScore", finalScore);
  playTone(success ? 760 : 160, 0.18);

  document.getElementById("gameOverTitle").textContent = success ? "Mission Complete!" : "Mission Failed";
  document.getElementById("finalStats").textContent =
    `Score: ${finalScore} | Distance: ${distance.toFixed(1)} km | Battery: ${Math.round(player.battery)}% | High Score: ${Math.max(finalScore, previous)}`;
}

document.addEventListener("keydown", event => {
  keys[event.key] = true;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
  if (event.key.toLowerCase() === "p") {
    if (gameState === "playing") pauseGame();
    else if (gameState === "paused") resumeGame();
  }
});

document.addEventListener("keyup", event => keys[event.key] = false);
document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("pauseBtn").addEventListener("click", pauseGame);
document.getElementById("resumeBtn").addEventListener("click", resumeGame);
document.getElementById("restartBtn1").addEventListener("click", startGame);
document.getElementById("restartBtn2").addEventListener("click", startGame);

if (new URLSearchParams(window.location.search).get("demo") === "playing") startGame();
else draw();
