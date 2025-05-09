class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.5; // Initial small horizontal drift
        this.vy = -Math.random() * 1 - 1;    // Upwards
        this.life = 100 + Math.random() * 100; // Lifespan
        this.initialLife = this.life;
        this.size = 10 + Math.random() * 20;
        this.alpha = 0.8;
        // color? maybe grayscale
    }

    update(noise) {
        // Apply noise to velocity (turbulence)
        let noiseValX = noise.noise3D(this.x * 0.01, this.y * 0.01, time * 0.001);
        let noiseValY = noise.noise3D(this.x * 0.01 + 100, this.y * 0.01 + 100, time * 0.001); // Offset for different noise pattern
        this.vx += noiseValX * 0.1;
        this.vy += noiseValY * 0.1 - 0.02; // Slight upward bias

        this.x += this.vx;
        this.y += this.vy;

        this.life--;
        this.alpha = (this.life / this.initialLife) * 0.8; // Fade out
        this.size *= 0.99; // Shrink slightly
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 180, 180, ${this.alpha})`; // Light gray smoke
        ctx.fill();
    }
}