# African Context Report: EcoDash

## 1. Problem Context

EcoDash models the delivery of essential medical supplies to a rural clinic where infrastructure, energy availability, distance and environmental conditions can affect the reliability of transport. The assessment brief identifies poor road infrastructure, long travel distances, load-shedding, unpredictable weather and limited connectivity as relevant African logistics challenges.

The selected scenario combines **medical delivery + renewable energy constraints**. The player must travel from a rural area to a clinic while avoiding potholes, flooding and fallen trees. The vehicle can recharge at a Solar Microgrid Zone, but a temporary load-shedding state can make the charging station unavailable. This makes route planning and energy management part of the simulation rather than simply moving from one point to another.

## 2. Physics and Mathematical Model

### Direction and vectors
The vehicle uses an x/y direction vector. Keyboard input changes the x and y components. The vector is normalised with `Math.hypot()` so diagonal movement does not become artificially faster.

### Trigonometry
The direction angle is calculated with:

`Math.atan2(direction.y, direction.x)`

The angle is then converted into acceleration components with:

`velocity.x += Math.cos(angle) * acceleration`

`velocity.y += Math.sin(angle) * acceleration`

This demonstrates how trigonometry maps a direction into horizontal and vertical movement.

### Velocity, acceleration and drag
Acceleration changes the vehicle's velocity. A maximum speed prevents unlimited acceleration. A drag multiplier gradually reduces velocity when the player stops pressing movement keys, producing smoother movement.

### Battery consumption
Battery decreases according to movement speed. Windy and rainy conditions apply an additional multiplier, representing increased energy demand. The Solar Microgrid Zone restores battery energy when the station is powered.

### Wind
During windy weather, small x/y velocity changes are added to represent crosswind disturbance. This is a simplified educational model rather than a real weather simulation.

### Collision detection
EcoDash uses Axis-Aligned Bounding Box (AABB) collision detection. The player and each obstacle have an x/y position, width and height. The rectangles overlap when their boundaries intersect. A collision reverses part of the player's velocity and reduces battery and score.

### Distance
`Math.hypot(velocity.x, velocity.y)` measures the magnitude of the movement vector. This is used as part of the distance-travelled calculation.

## 3. Africanisation

The simulation uses an African-inspired rural setting rather than a generic space or fantasy environment. It includes a rural village, a clinic, a road, a flood area, potholes, fallen trees and a solar microgrid. The central mission is the delivery of medical supplies, linking the technology to an essential community service.

The design is intentionally simplified and does not claim to represent one specific African community or actual transport network. It is an educational simulation inspired by challenges named in the assignment brief.

## 4. Limitations

The weather, load-shedding schedule, battery model and obstacle locations are simplified. They are designed to demonstrate programming concepts such as vectors, trigonometry, animation, collision detection and resource management rather than to reproduce real operational logistics data.

## 5. References

The final report must include at least two appropriate academic references retrieved from the STADIO Library, with matching in-text citations. The current project does not invent those references; the student should retrieve them through myLibrary/approved databases before submission. STADIO confirms that students have access to online academic databases and research support through its library services (STADIO, 2026).

**STADIO Library:** https://stadio.ac.za/stadio-libraries
