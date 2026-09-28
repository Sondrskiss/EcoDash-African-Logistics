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
const timerText = document.getElementById("timer");
const objectiveText = document.getElementById("objective");

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
const MISSION_TIME_LIMIT = 40; // seconds - change this to make the mission easier or harder
let timeLeft = MISSION_TIME_LIMIT;
let hasSupplies = false; // false = go to the depot, true = deliver to the clinic
let windAngle = 0; // direction the wind pushes, in radians
let audioContext = null;
let lastCollisionSound = 0;

class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  add(vector) { this.x += vector.x; this.y += vector.y; }
  multiply(value) { this.x *= value; this.y *= value; }
}

class Player {
  constructor() {
    this.width = 36;
    this.height = 36;
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
    this.inFlood = false;
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
      this.velocity.x += Math.cos(this.angle) * this.acceleration * dt;
      this.velocity.y += Math.sin(this.angle) * this.acceleration * dt;
    }

    // Wind pushes along windAngle; a sine term makes the strength gust up and down.
    if (weather === "Windy") {
      const gustStrength = 0.03 * (1 + 0.5 * Math.sin(missionTime * 2));
      this.velocity.x += Math.cos(windAngle) * gustStrength * dt;
      this.velocity.y += Math.sin(windAngle) * gustStrength * dt;
    }

    // Drag raised to the power dt keeps handling the same at any frame rate.
    // Wading through floodwater adds extra drag.
    const floodDrag = this.inFlood ? 0.93 : 1;
    this.velocity.multiply(Math.pow(this.drag * floodDrag, dt));

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
      const carryMultiplier = hasSupplies ? 1.3 : 1; // a loaded drone uses more energy
      this.battery -= 0.018 * speed * dt * weatherMultiplier * carryMultiplier;
      distance += speed * dt * 0.08;
    }
    this.battery = Math.max(0, this.battery);
  }

  draw() {
    const centreX = this.position.x + this.width / 2;
    const centreY = this.position.y + this.height / 2;
    const hoverOffset = Math.sin(missionTime * 6) * 2;   // gentle hovering bob
    const lean = Math.max(-0.4, Math.min(0.4, this.velocity.x * 0.08)); // tilt into the direction of travel

    // Shadow on the ground.
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath();
    ctx.ellipse(centreX + 6, centreY + 20, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(centreX, centreY + hoverOffset);
    ctx.rotate(lean);

    // Arms.
    ctx.strokeStyle = "#23352a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-15, -15); ctx.lineTo(15, 15);
    ctx.moveTo(15, -15); ctx.lineTo(-15, 15);
    ctx.stroke();

    // Four spinning rotors.
    const rotorSpin = missionTime * 40;
    for (const [rotorX, rotorY] of [[-15, -15], [15, -15], [-15, 15], [15, 15]]) {
      ctx.fillStyle = "rgba(210,225,235,.45)";
      ctx.beginPath();
      ctx.arc(rotorX, rotorY, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#23352a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rotorX + Math.cos(rotorSpin) * 9, rotorY + Math.sin(rotorSpin) * 9);
      ctx.lineTo(rotorX - Math.cos(rotorSpin) * 9, rotorY - Math.sin(rotorSpin) * 9);
      ctx.stroke();
    }

    // Body with solar panel.
    ctx.fillStyle = "#f5cf4a";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b4a7a";
    ctx.fillRect(-8, -4, 16, 8);
    ctx.fillStyle = "#9bdcff";
    ctx.fillRect(-6, -3, 5, 6);

    // Medical crate hanging underneath once collected.
    if (hasSupplies) {
      ctx.fillStyle = "#f2eee2";
      ctx.fillRect(-6, 8, 12, 10);
      ctx.fillStyle = "#c0392b";
      ctx.fillRect(-1, 9, 2, 8);
      ctx.fillRect(-4, 12, 8, 2);
    }
    ctx.restore();
  }

  getRect() {
    return { x: this.position.x, y: this.position.y, width: this.width, height: this.height };
  }
}

class Obstacle {
  constructor(x, y, width, height, type) {
    this.x = x; this.y = y; this.width = width; this.height = height; this.type = type;
    this.hitCooldown = 0; // frames before this obstacle can penalise the player again
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
    } else if (this.type === "construction") {
      ctx.fillStyle = "#f28c1b";
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.fillStyle = "#ffffff";
      for (let stripeY = this.y; stripeY < this.y + this.height; stripeY += 20) {
        ctx.fillRect(this.x, stripeY, this.width, 8);
      }
      ctx.fillStyle = "#222";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("WORKS", this.x + this.width / 2, this.y - 4);
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

// Wildlife: birds fly back and forth along a path with a sine-wave sway.
class MovingObstacle extends Obstacle {
  constructor(x, y, width, height, type, path) {
    super(x, y, width, height, type);
    this.axis = path.axis;   // "x" = flies left/right, "y" = flies up/down
    this.min = path.min;
    this.max = path.max;
    this.speed = path.speed;
    this.sway = path.sway;
    this.baseX = x;
    this.baseY = y;
  }

  update(dt) {
    if (this.axis === "x") {
      this.x += this.speed * dt;
      if (this.x < this.min || this.x > this.max) this.speed *= -1;
      this.y = this.baseY + Math.sin(this.x * 0.03) * this.sway;
    } else {
      this.y += this.speed * dt;
      if (this.y < this.min || this.y > this.max) this.speed *= -1;
      this.x = this.baseX + Math.sin(this.y * 0.03) * this.sway;
    }
  }

  draw() {
    const centreX = this.x + this.width / 2;
    const centreY = this.y + this.height / 2;
    const flap = Math.sin(missionTime * 14) * 8; // wing flapping
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centreX - 16, centreY - flap);
    ctx.lineTo(centreX, centreY);
    ctx.lineTo(centreX + 16, centreY - flap);
    ctx.stroke();
    ctx.fillStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.arc(centreX, centreY, 4, 0, Math.PI * 2);
    ctx.fill();
  }
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
  new Obstacle(760, 305, 65, 75, "tree"),
  new Obstacle(600, 215, 45, 100, "construction"),
  new MovingObstacle(300, 190, 34, 22, "bird", { axis: "x", min: 280, max: 700, speed: 1.6, sway: 25 }),
  new MovingObstacle(650, 400, 34, 22, "bird", { axis: "x", min: 250, max: 680, speed: -1.9, sway: 20 }),
  new MovingObstacle(720, 300, 34, 22, "bird", { axis: "y", min: 90, max: 480, speed: 1.3, sway: 20 })
];
const solarZone = new SolarZone(190, 430, 55);
const clinic = { x: 850, y: 205, width: 75, height: 80 };
const depot = { x: 420, y: 245, width: 55, height: 45 }; // where the medical supplies are collected
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

// Pushes the player out of an obstacle along the axis with the smallest overlap.
function pushPlayerOut(obstacle) {
  const p = player.getRect();
  const overlapLeft = p.x + p.width - obstacle.x;
  const overlapRight = obstacle.x + obstacle.width - p.x;
  const overlapTop = p.y + p.height - obstacle.y;
  const overlapBottom = obstacle.y + obstacle.height - p.y;
  const smallest = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
  if (smallest === overlapLeft) player.position.x -= overlapLeft;
  else if (smallest === overlapRight) player.position.x += overlapRight;
  else if (smallest === overlapTop) player.position.y -= overlapTop;
  else player.position.y += overlapBottom;
  if (smallest === overlapLeft || smallest === overlapRight) player.velocity.x *= -0.45;
  else player.velocity.y *= -0.45;
}

function checkCollisions(dt) {
  player.inFlood = false;
  for (const obstacle of obstacles) {
    obstacle.hitCooldown = Math.max(0, obstacle.hitCooldown - dt);
    if (!rectanglesOverlap(player.getRect(), obstacle.getRect())) continue;

    if (obstacle.type === "flood") {
      // Floodwater: no bounce, but extra drag and steady battery drain.
      player.inFlood = true;
      player.battery = Math.max(0, player.battery - 0.05 * dt);
      message.textContent = "Flooded road! Speed reduced and battery draining.";
      continue;
    }

    let batteryPenalty = 3, scorePenalty = 15;
    if (obstacle.type === "tree" || obstacle.type === "construction") {
      // Fallen tree: solid barrier, bigger penalty.
      pushPlayerOut(obstacle);
      batteryPenalty = 4; scorePenalty = 20;
    } else if (obstacle.type === "bird") {
      // Bird strike: knocks the drone backwards.
      player.velocity.multiply(-0.6);
    } else {
      // Pothole: jolts the vehicle but does not block it.
      player.velocity.multiply(0.5);
    }

    // The penalty applies once per hit, not once per frame.
    if (obstacle.hitCooldown === 0) {
      obstacle.hitCooldown = 60;
      player.battery = Math.max(0, player.battery - batteryPenalty);
      score = Math.max(0, score - scorePenalty);
      collisionPenalty++;
      const hitMessages = {
        tree: "Fallen tree! Find another route.",
        construction: "Construction zone! Fly around it.",
        bird: "Bird strike! Battery and score reduced.",
        pothole: "Pothole dust cloud! Battery and score reduced."
      };
      message.textContent = hitMessages[obstacle.type];
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

  // Objective step 1: collect the supplies at the depot.
  if (!hasSupplies && rectanglesOverlap(player.getRect(), depot)) {
    hasSupplies = true;
    score += 100;
    message.textContent = "Supplies loaded! Fly to the rural clinic.";
    playTone(660, 0.12);
  }

  // Objective step 2: deliver them to the clinic.
  if (rectanglesOverlap(player.getRect(), clinic)) {
    if (hasSupplies) {
      score += Math.round(timeLeft) * 5 + Math.round(player.battery) * 2; // speed and energy bonus
      endGame(true);
    } else {
      message.textContent = "You need the medical supplies first - collect them at the depot!";
    }
  }
  if (player.battery <= 0) endGame(false, "Battery empty!");
}

function updateWeather(dt) {
  weatherTime += dt;
  if (weatherTime > 14) {
    weatherTime = 0;
    const options = ["Clear", "Windy", "Rainy"];
    weather = options[Math.floor(Math.random() * options.length)];
    windAngle = Math.random() * Math.PI * 2;
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
  ctx.fillText(hasSupplies ? "Deliver to the clinic →" : "Collect supplies at depot", 840, 75);

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
    // Reduced visibility: clear circle around the vehicle, darker further away.
    const centreX = player.position.x + player.width / 2;
    const centreY = player.position.y + player.height / 2;
    const visibility = ctx.createRadialGradient(centreX, centreY, 120, centreX, centreY, 300);
    visibility.addColorStop(0, "rgba(30,50,75,0)");
    visibility.addColorStop(1, "rgba(30,50,75,.6)");
    ctx.fillStyle = visibility;
    ctx.fillRect(0, 55, canvas.width, canvas.height - 55);
  }
}

function drawDepot() {
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(depot.x, depot.y, depot.width, depot.height);
  ctx.fillStyle = "#5d3a1a";
  ctx.fillRect(depot.x - 4, depot.y - 8, depot.width + 8, 10);
  if (!hasSupplies) {
    ctx.fillStyle = "#f2eee2";
    ctx.fillRect(depot.x + 18, depot.y + 14, 20, 18);
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(depot.x + 26, depot.y + 16, 4, 14);
    ctx.fillRect(depot.x + 21, depot.y + 21, 14, 4);
  }
  ctx.fillStyle = "#222";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(hasSupplies ? "DEPOT (EMPTY)" : "SUPPLY DEPOT", depot.x + depot.width / 2, depot.y - 14);
}

// Arrow around the drone pointing at the current target. atan2 gives the angle to it.
function drawTargetArrow() {
  const target = hasSupplies ? clinic : depot;
  const droneX = player.position.x + player.width / 2;
  const droneY = player.position.y + player.height / 2;
  const angleToTarget = Math.atan2(target.y + target.height / 2 - droneY, target.x + target.width / 2 - droneX);
  ctx.save();
  ctx.translate(droneX + Math.cos(angleToTarget) * 40, droneY + Math.sin(angleToTarget) * 40);
  ctx.rotate(angleToTarget);
  ctx.fillStyle = hasSupplies ? "#c0392b" : "#e08a1e";
  ctx.beginPath();
  ctx.moveTo(8, 0); ctx.lineTo(-6, -6); ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
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
  if (!hasSupplies) {
    ctx.fillStyle = "#e08a1e";
    ctx.fillRect(x + (depot.x / canvas.width) * w - 3, y + (depot.y / canvas.height) * h - 3, 6, 6);
  }
  ctx.fillStyle = "#23352a";
  ctx.beginPath();
  ctx.arc(x + (player.position.x / canvas.width) * w, y + (player.position.y / canvas.height) * h, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.font = "10px Arial";
  ctx.textAlign = "left";
  ctx.fillText("MINI-MAP", x + 5, y + h - 5);
}

function getEfficiency() {
  return Math.max(0, Math.round((player.battery / startBattery) * 100 - collisionPenalty * 3));
}

function updateHUD() {
  scoreText.textContent = Math.round(score);
  batteryText.textContent = `${Math.round(player.battery)}%`;
  distanceText.textContent = `${distance.toFixed(1)} km`;
  timerText.textContent = `${Math.ceil(Math.max(0, timeLeft))}s`;
  objectiveText.textContent = hasSupplies ? "Deliver to clinic" : "Collect supplies";
  efficiencyText.textContent = `${getEfficiency()}%`;
  weatherText.textContent = weather;
  powerText.textContent = loadShedding ? "OFF" : "ON";
  highScoreText.textContent = localStorage.getItem("ecoDashHighScore") || "0";
}

function update(dt) {
  missionTime += dt / 60;
  timeLeft -= dt / 60;
  updateWeather(dt / 60);
  player.update(dt);
  dustParticles.forEach(particle => particle.update(dt));
  obstacles.forEach(obstacle => { if (obstacle.update) obstacle.update(dt); });
  checkCollisions(dt);
  if (timeLeft <= 0) endGame(false, "Out of time!");
  score += 0.03 * dt;
  updateHUD();
}

function draw() {
  drawBackground();
  solarZone.draw();
  drawDepot();
  obstacles.forEach(obstacle => obstacle.draw());
  dustParticles.forEach(particle => particle.draw());
  player.draw();
  drawTargetArrow();
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
  timeLeft = MISSION_TIME_LIMIT;
  hasSupplies = false;
  obstacles.forEach(obstacle => obstacle.hitCooldown = 0);
  missionTime = 0;
  weatherTime = 0;
  weather = "Clear";
  windAngle = 0;
  loadShedding = false;
  gameState = "playing";
  menu.classList.add("hidden");
  pauseScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  message.textContent = "Fly to the supply depot and collect the medical supplies.";
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

function endGame(success, reason = "") {
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
    `${reason ? reason + " | " : ""}Score: ${finalScore} | Distance: ${distance.toFixed(1)} km | Battery: ${Math.round(player.battery)}% | Efficiency: ${getEfficiency()}% | High Score: ${Math.max(finalScore, previous)}`;
}

document.addEventListener("keydown", event => {
  keys[event.key.length === 1 ? event.key.toLowerCase() : event.key] = true;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
  if (event.key.toLowerCase() === "p") {
    if (gameState === "playing") pauseGame();
    else if (gameState === "paused") resumeGame();
  }
});

document.addEventListener("keyup", event => keys[event.key.length === 1 ? event.key.toLowerCase() : event.key] = false);
window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("pauseBtn").addEventListener("click", pauseGame);
document.getElementById("resumeBtn").addEventListener("click", resumeGame);
document.getElementById("restartBtn1").addEventListener("click", startGame);
document.getElementById("restartBtn2").addEventListener("click", startGame);

if (new URLSearchParams(window.location.search).get("demo") === "playing") startGame();
else draw();
