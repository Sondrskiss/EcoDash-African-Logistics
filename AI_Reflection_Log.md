# EcoDash AI Reflection Log

## Entry 1: [topic: Collision penalties]
**Prompt used:**
1. Collision penalties (per-hit cooldown)

Problem: the battery and score penalty ran on every frame while overlapping an obstacle, so a brief touch could drain the battery.
Fix: each obstacle has a hitCooldown of 60 frames, so a hit is penalised once.

**AI response (summary or screenshot file name):**
[...]

**Problems I identified:**
2. Different behaviour per hazard, plus push-out

Problem: potholes, trees and floods all behaved the same.
Fix: potholes slow the drone and cost battery, trees and construction are solid, floods add drag and drain the battery, and birds knock the drone back. pushPlayerOut() moves the drone out along the axis with the smallest overlap.

**How I improved or modified the code:**
Frame-rate-independent physics

Problem: acceleration and drag were per frame, so handling differed on faster screens.
Fix: acceleration is multiplied by dt, and drag uses Math.pow(drag, dt).

4. Wind and rain

Problem: wind only pushed one way and rain had no gameplay effect.
Fix: wind uses a random windAngle with Math.cos/Math.sin and a sine-based gust. Rain draws a radial gradient that darkens everything outside a circle around the drone.

6. Drone, birds and construction zone

Problem: the vehicle was a plain rectangle, and the game had no moving hazards.
Fix: a draw() method builds the drone from arcs and lines with spinning rotors, hover bob and lean. MovingObstacle extends Obstacle moves birds along a path with a sine sway, and construction is a new solid type.

7. Objective and timer

Problem: there was no clear goal or time pressure.
Fix: hasSupplies and timeLeft drive the mission. You collect at the depot, deliver at the clinic, and get a bonus for time and battery left. A loaded drone uses 30% more battery.

8. Guide arrow

Fix: Math.atan2 gives the angle to the target, and the arrow is drawn at Math.cos/Math.sin of that angle around the drone.
Be able to explain: it uses the same trigonometry as your movement

## Code Ownership Statement
I can explain the classes, vector movement, `Math.atan2/sin/cos`, drag, battery model, AABB collision and push-out, weather and load-shedding logic, game states and `localStorage` high score.
