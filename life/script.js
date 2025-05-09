const canvas = document.getElementById('smokeCanvas');
const ctx = canvas.getContext('2d');

let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

const simplex = new SimplexNoise();
let time = 0;
let globalHue = 0; // Para el ciclo de colores RGB

const particles = [];
const MAX_PARTICLES = 600; // Aumentado para más fuentes
const PARTICLE_LIFESPAN = 200;
const FIXED_SPAWN_RATE = 1; // Partículas por frame para cada fuente fija
const MOUSE_SPAWN_RATE = 1;

// Fuentes de Humo Fijas (Offsets desde los bordes o centro)
const SOURCE_EDGE_OFFSET_Y = 30;
const SOURCE_EDGE_OFFSET_X = 30;

let smokeSources = [
    { x: () => width / 2, y: () => height - SOURCE_EDGE_OFFSET_Y, type: 'bottom' },
    { x: () => width / 2, y: () => SOURCE_EDGE_OFFSET_Y, type: 'top' },
    { x: () => SOURCE_EDGE_OFFSET_X, y: () => height / 2, type: 'left' },
    { x: () => width - SOURCE_EDGE_OFFSET_X, y: () => height / 2, type: 'right' }
];

let mouseX = width / 2;
let mouseY = height / 2;
let isMouseOverCanvas = false;

const MOUSE_INTERACTION_RADIUS = 80;
const MOUSE_REPEL_STRENGTH = 1.2;

const NOISE_SCALE_XY = 0.007;
const NOISE_SCALE_T = 0.0008;
const NOISE_STRENGTH = 1.0;
const BASE_RISE_FACTOR = 0.8; // Factor para la velocidad de ascenso/dispersión inicial

// Parámetros de color "Gaming"
const HUE_SHIFT_SPEED = 0.3; // Grados de hue por frame
const HUE_VARIATION = 20; // Variación aleatoria de hue por partícula (en grados)
const SATURATION = 100; // %
const INITIAL_LIGHTNESS = 65; // %
const FINAL_LIGHTNESS_FACTOR = 0.7; // La luminosidad final será INITIAL_LIGHTNESS * este factor

class Particle {
    constructor(x, y, sourceDirection = null, isMouseSource = false) {
        this.x = x + (Math.random() - 0.5) * 10;
        this.y = y + (Math.random() - 0.5) * 10;

        // Velocidad inicial basada en la dirección de la fuente
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;

        if (sourceDirection) {
            switch (sourceDirection) {
                case 'bottom': this.vy -= BASE_RISE_FACTOR + Math.random() * 0.3; break;
                case 'top':    this.vy += BASE_RISE_FACTOR + Math.random() * 0.3; break;
                case 'left':   this.vx += BASE_RISE_FACTOR + Math.random() * 0.3; break;
                case 'right':  this.vx -= BASE_RISE_FACTOR + Math.random() * 0.3; break;
            }
        } else { // Fuente del ratón o por defecto (si no se especifica dirección)
            this.vy -= (BASE_RISE_FACTOR * 0.5) + Math.random() * 0.2; // Sube un poco
        }
        
        this.initialLife = PARTICLE_LIFESPAN + Math.random() * (PARTICLE_LIFESPAN * 0.4);
        this.life = this.initialLife;
        
        this.initialSize = (isMouseSource ? 7 : 12) + Math.random() * (isMouseSource ? 8 : 18);
        this.size = this.initialSize;
        
        this.alpha = 0.01;
        this.maxAlpha = (isMouseSource ? 0.25 : 0.35) + Math.random() * 0.1; // Ligeramente más opacas para colores vivos

        // Color
        this.hue = (globalHue + (Math.random() - 0.5) * HUE_VARIATION);
        while (this.hue < 0) this.hue += 360;
        this.hue %= 360;
    }

    update() {
        const noiseX = simplex.noise3D(this.x * NOISE_SCALE_XY, this.y * NOISE_SCALE_XY, time * NOISE_SCALE_T);
        const noiseY = simplex.noise3D(this.x * NOISE_SCALE_XY + 100, this.y * NOISE_SCALE_XY + 100, time * NOISE_SCALE_T + 50);

        this.vx += noiseX * NOISE_STRENGTH * 0.12;
        this.vy += noiseY * NOISE_STRENGTH * 0.12;

        if (isMouseOverCanvas) {
            const dx = this.x - mouseX;
            const dy = this.y - mouseY;
            const distSq = dx * dx + dy * dy;
            const interactionRadiusSq = MOUSE_INTERACTION_RADIUS * MOUSE_INTERACTION_RADIUS;

            if (distSq < interactionRadiusSq && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const force = (1 - (dist / MOUSE_INTERACTION_RADIUS)) * MOUSE_REPEL_STRENGTH;
                this.vx += (dx / dist) * force;
                this.vy += (dy / dist) * force;
            }
        }
        
        // Limitar velocidad para mantener algo de cohesión, pero permitir que se dispersen
        this.vx = Math.max(-2, Math.min(2, this.vx));
        this.vy = Math.max(-2, Math.min(2, this.vy));

        this.x += this.vx;
        this.y += this.vy;

        this.life--;

        const lifeRatio = Math.max(0, this.life / this.initialLife);
        
        if (lifeRatio > 0.6) { // Fase de "encendido"
            this.alpha = Math.min(this.maxAlpha, this.alpha + 0.01);
        } else { // Fase de desvanecimiento
            this.alpha = lifeRatio * this.maxAlpha;
        }
        
        // Encogerse al final
        if (lifeRatio < 0.5) {
            this.size = this.initialSize * (lifeRatio / 0.5);
        }
        this.size = Math.max(0.5, this.size); // Tamaño mínimo muy pequeño
    }

    draw() {
        if (this.alpha <= 0 || this.size <= 0) return;

        const lifeRatio = Math.max(0, this.life / this.initialLife);
        const currentLightness = INITIAL_LIGHTNESS * (FINAL_LIGHTNESS_FACTOR + (1 - FINAL_LIGHTNESS_FACTOR) * lifeRatio); // Se oscurece al envejecer

        ctx.beginPath();
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        
        // Color del núcleo de la partícula
        gradient.addColorStop(0, `hsla(${this.hue}, ${SATURATION}%, ${currentLightness}%, ${this.alpha * 0.9})`);
        // Color del borde, ligeramente más oscuro y transparente
        gradient.addColorStop(0.6, `hsla(${this.hue}, ${SATURATION}%, ${currentLightness * 0.85}%, ${this.alpha * 0.5})`);
        gradient.addColorStop(1, `hsla(${this.hue}, ${SATURATION}%, ${currentLightness * 0.7}%, 0)`);

        ctx.fillStyle = gradient;
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function spawnParticles() {
    // Fuentes fijas
    smokeSources.forEach(source => {
        for (let i = 0; i < FIXED_SPAWN_RATE; i++) {
            if (particles.length < MAX_PARTICLES) {
                particles.push(new Particle(source.x(), source.y(), source.type));
            }
        }
    });

    // Fuente del ratón
    if (isMouseOverCanvas) {
        for (let i = 0; i < MOUSE_SPAWN_RATE; i++) {
            if (particles.length < MAX_PARTICLES) {
                particles.push(new Particle(mouseX, mouseY, null, true));
            }
        }
    }
}

function animate() {
    // Limpiar canvas (totalmente, sin estelas para colores más puros)
    ctx.clearRect(0, 0, width, height);

    globalHue = (globalHue + HUE_SHIFT_SPEED) % 360; // Actualizar el HUE global

    spawnParticles();

    // 'lighter' puede crear efectos de mezcla de color interesantes, pero también puede "quemar" a blanco
    // Si los colores se ven demasiado blancos, prueba 'source-over'.
    ctx.globalCompositeOperation = 'lighter'; 

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        if (p.life <= 0 || p.alpha <= 0 || p.size <= 0.1) { // Condición de eliminación más estricta
            particles.splice(i, 1);
        } else {
            p.draw();
        }
    }
    
    ctx.globalCompositeOperation = 'source-over'; // Restaurar

    time += 1;
    requestAnimationFrame(animate);
}

// Event Listeners
window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    // Las posiciones de las fuentes se actualizan dinámicamente con funciones
});

canvas.addEventListener('mousemove', (event) => {
    isMouseOverCanvas = true;
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
});

canvas.addEventListener('mouseenter', () => { isMouseOverCanvas = true; });
canvas.addEventListener('mouseleave', () => { isMouseOverCanvas = false; });

// Iniciar
animate();