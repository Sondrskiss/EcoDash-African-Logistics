# African Context Report: EcoDash

## 1. Problem Context
Rural clinics across Africa often depend on long, damaged roads, seasonal flooding and an unreliable electricity supply. Load-shedding in South Africa, for example, interrupts power at charging points and cold-chain storage. EcoDash models a medical-supply delivery where the driver must manage battery energy, avoid road hazards and use a solar microgrid whose power can be switched off. [ADD A SPECIFIC REAL-WORLD EXAMPLE AND CITE IT, e.g. (Author, Year)]

## 2. Physics Mapping
- **Direction and trigonometry:** key input becomes a vector; `Math.atan2` gives the heading and `Math.cos`/`Math.sin` turn it into horizontal and vertical acceleration.
- **Drag and terrain:** velocity decays each frame (`drag ** dt`); floodwater adds extra drag.
- **Crosswind:** wind adds a force along a random `windAngle`, with a sine-based gust.
- **Battery curve:** drain is proportional to speed and is multiplied in wind and rain.
- **Collisions:** AABB overlap for obstacles; circular distance for the solar zone.

## 3. Africanisation
The setting is a rural village, clinic, gravel road, river/flood area and solar microgrid. It is a simplified educational scenario, not a model of one specific community.

## 4. Limitations
Weather, load-shedding timing and obstacle positions are simplified to demonstrate programming concepts, not real logistics data.

## 5. References
- STADIO (2025) Web Animation Scripting (WA22): Study guide. 1st edn. Johannesburg: STADIO Higher Education.
- Balakrishnan, J. M. and Chavan, S. M. (2021) 'Communication in the design process of web animation based on scripting language: programmers' perspectives', Amwewrican Journal of Art and Design, 6(2), pp. 38-46. Available at; Science Publishing Group (Accessed: 28 September 2026).
