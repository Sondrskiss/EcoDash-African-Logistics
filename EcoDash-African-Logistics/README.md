# EcoDash-African-Logistics

## EcoDash: African Digital Logistics & Infrastructure Simulator

EcoDash is an HTML5 Canvas simulation for WAS262. The player controls a solar-powered delivery vehicle carrying medical supplies to a rural clinic. The simulation models movement, energy use, environmental hazards and infrastructure conditions in an African-inspired setting.

## Technologies
- HTML5 Canvas
- CSS3
- Vanilla JavaScript (ES6+)
- Local Storage
- Web Audio API for simple sound effects
- GitHub / GitHub Pages

## Setup
1. Clone or download the repository.
2. Open the folder in Visual Studio Code.
3. Open `index.html` with Live Server or a modern browser.
4. Use WASD or Arrow Keys to move.
5. Press **P** or **Pause** to pause.
6. Reach the rural clinic without running out of battery.

## Main Features
- Smooth vector-based movement
- Acceleration, velocity and drag
- `Math.atan2()`, `Math.sin()` and `Math.cos()` calculations
- Dynamic battery consumption
- Solar Microgrid charging zone
- Temporary load-shedding that disables charging
- Potholes, flood areas and fallen trees
- AABB collision detection
- Dynamic clear/windy/rainy weather states
- Dust-particle environment animation
- Web Audio feedback for start, collision and mission results
- African-inspired rural village and clinic environment
- Professional HUD with score, battery, distance, efficiency, weather and power status
- Mini-map
- High scores using `localStorage`
- Start, pause, game-over and restart states
- Responsive interface

## Mathematical Model
The vehicle direction is represented by an x/y vector. `Math.atan2(y, x)` determines the direction angle. `Math.cos(angle)` and `Math.sin(angle)` convert the angle into horizontal and vertical acceleration. Velocity is limited by a maximum speed and drag gradually reduces movement. Battery consumption increases with speed and environmental conditions. AABB rectangle overlap is used for obstacle and clinic collision detection. `Math.hypot()` is used for vector magnitude and distance calculations.

## African Context
The simulation focuses on the movement of essential medical supplies to a rural clinic while representing infrastructure and energy constraints identified in the assessment brief. The environment includes a rural village, road, flood area, potholes, fallen trees and a renewable-energy charging zone.

## Original Feature Requirement
The assignment requires at least one feature to be designed and implemented independently without Generative AI. The current project contains a **candidate dust-particle effect** and dynamic environment behaviour. Because this repository was developed with AI assistance, the student must independently re-implement or materially develop the selected original feature and document that personal process before claiming it as the required non-AI feature.

## AI Usage Disclosure
AI was used as a learning and development support tool for explanations, debugging suggestions, structure ideas and code review. The student must understand, test and modify all submitted code and must retain evidence of the actual prompts/responses used during development. The AI Reflection Log contains the evidence structure; only real prompts and responses should be entered.

## Project Structure
```text
EcoDash-African-Logistics/
├── index.html
├── styles.css
├── game.js
├── README.md
├── African_Context_Report.md
├── AI_Reflection_Log.md
├── Wireframe.svg
└── screenshots/
```

## GitHub Commit Plan
The brief requires at least eight meaningful commits on different days. Do not create fake history. Make genuine commits as you complete real development stages, for example:
1. Initial Canvas project structure
2. Basic player movement
3. Physics and battery system
4. Obstacles and collision detection
5. HUD and game states
6. African environment and solar zone
7. Weather/load-shedding and sound
8. Final testing and documentation

## Testing Checklist
- Start mission works without refreshing.
- WASD and arrow-key movement works.
- Pothole/tree/flood collisions reduce battery and score.
- Solar zone recharges when power is available.
- Load-shedding temporarily disables charging.
- Weather changes during the mission.
- Pause/resume works.
- Reaching the clinic completes the mission.
- Battery reaching zero ends the mission.
- High score persists through `localStorage`.
- Restart works without refreshing.

## References
Insert the two academic references retrieved from the STADIO Library before final submission. Do not invent library references. STADIO provides access to online academic databases through its library services (STADIO, 2026).
