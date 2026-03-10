/**
 * Calming Interactive Starfield
 * Creates a serene starfield that responds to mouse gestures
 * Stars drift gently and react to cursor movement
 */

class Starfield {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        this.options = {
            starCount: options.starCount || 150,
            starSize: options.starSize || 2,
            starColor: options.starColor || 'rgba(255, 255, 255, 0.8)',
            speed: options.speed || 0.05,
            mouseInfluence: options.mouseInfluence || 0.1,
            depth: options.depth || 400,
            ...options
        };
        
        this.canvas = null;
        this.ctx = null;
        this.stars = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.animationId = null;
        
        this.init();
    }
    
    init() {
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'starfield-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 9999;
        `;
        
        // Insert as first child of container or body
        if (this.container) {
            this.container.insertBefore(this.canvas, this.container.firstChild);
        } else {
            document.body.insertBefore(this.canvas, document.body.firstChild);
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        console.log('[Starfield] Canvas created, size:', this.canvas.width, 'x', this.canvas.height);
        
        // Initialize stars
        this.createStars();
        
        // Event listeners
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        
        // Start animation
        this.animate();
    }
    
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Re-center stars on resize
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
    }
    
    createStars() {
        this.stars = [];
        
        for (let i = 0; i < this.options.starCount; i++) {
            this.stars.push({
                x: Math.random() * this.width - this.width / 2,
                y: Math.random() * this.height - this.height / 2,
                z: Math.random() * this.options.depth,
                originalX: 0,
                originalY: 0,
                size: Math.random() * this.options.starSize + 0.5,
                brightness: Math.random() * 0.5 + 0.5,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinklePhase: Math.random() * Math.PI * 2
            });
            
            // Store original position for parallax
            this.stars[i].originalX = this.stars[i].x;
            this.stars[i].originalY = this.stars[i].y;
        }
    }
    
    handleMouseMove(e) {
        this.targetX = (e.clientX - this.centerX) * this.options.mouseInfluence;
        this.targetY = (e.clientY - this.centerY) * this.options.mouseInfluence;
    }
    
    handleTouchMove(e) {
        if (e.touches.length > 0) {
            this.targetX = (e.touches[0].clientX - this.centerX) * this.options.mouseInfluence;
            this.targetY = (e.touches[0].clientY - this.centerY) * this.options.mouseInfluence;
        }
    }
    
    update() {
        // Smooth mouse following
        this.mouseX += (this.targetX - this.mouseX) * this.options.speed;
        this.mouseY += (this.targetY - this.mouseY) * this.options.speed;
        
        // Update star positions
        this.stars.forEach(star => {
            // Apply parallax based on depth (z position)
            const factor = this.options.depth / (star.z + 1);
            
            // Calculate position with mouse influence
            star.x = star.originalX + this.mouseX * factor * 0.1;
            star.y = star.originalY + this.mouseY * factor * 0.1;
            
            // Gentle drift
            star.originalX += Math.sin(Date.now() * 0.0001 + star.twinklePhase) * 0.1;
            star.originalY += Math.cos(Date.now() * 0.0001 + star.twinklePhase) * 0.1;
            
            // Keep stars in bounds with wrapping
            if (star.x > this.width / 2) star.x -= this.width;
            if (star.x < -this.width / 2) star.x += this.width;
            if (star.y > this.height / 2) star.y -= this.height;
            if (star.y < -this.height / 2) star.y += this.height;
            
            // Update twinkle
            star.twinklePhase += star.twinkleSpeed;
        });
    }
    
    draw() {
        // Clear with transparent - let HTML background show through
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Sort stars by depth for proper rendering
        const sortedStars = [...this.stars].sort((a, b) => b.z - a.z);
        
        sortedStars.forEach(star => {
            // Calculate 3D to 2D projection
            const factor = this.options.depth / (star.z + 1);
            const x = star.x * factor + this.centerX;
            const y = star.y * factor + this.centerY;
            
            // Calculate size based on depth
            const size = star.size * factor * 0.5;
            
            // Calculate brightness with twinkle
            const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
            const alpha = star.brightness * twinkle * factor * 1.5;
            
            // Draw star
            this.ctx.beginPath();
            this.ctx.arc(x, y, Math.max(size, 0.5), 0, Math.PI * 2);
            
            // Create gradient for glow effect (sun-like: yellow/orange)
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size * 3);
            gradient.addColorStop(0, `rgba(255, 240, 180, ${alpha})`);
            gradient.addColorStop(0.3, `rgba(255, 200, 100, ${alpha * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            // Draw bright center
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 200, ${alpha * 1.5})`;
            this.ctx.fill();
        });
    }
    
    animate() {
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    // Add a shooting star occasionally
    shoot() {
        if (Math.random() > 0.98) {
            const startX = Math.random() * this.width;
            const startY = Math.random() * this.height * 0.5;
            
            this.createShootingStar(startX, startY);
        }
    }
    
    createShootingStar(startX, startY) {
        const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.5;
        const velocity = 15 + Math.random() * 10;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        let x = startX;
        let y = startY;
        let alpha = 1;
        
        const shoot = () => {
            x += vx;
            y += vy;
            alpha -= 0.02;
            
            if (alpha > 0 && x < this.width && y < this.height) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x - vx * 2, y - vy * 2);
                this.ctx.strokeStyle = `rgba(200, 220, 255, ${alpha})`;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                requestAnimationFrame(shoot);
            }
        };
        
        shoot();
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        window.removeEventListener('resize', () => this.resize());
        document.removeEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.removeEventListener('touchmove', (e) => this.handleTouchMove(e));
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

// Auto-initialize if DOM is ready
function initStarfield() {
    const starfieldContainer = document.querySelector('[data-starfield]');
    console.log('[Starfield] Looking for container:', starfieldContainer);
    if (starfieldContainer) {
        console.log('[Starfield] Creating starfield...');
        new Starfield(starfieldContainer);
        console.log('[Starfield] Starfield created!');
    } else {
        console.log('[Starfield] Container not found - no data-starfield attribute on body');
    }
}

// Check if DOM is already loaded
if (document.readyState === 'loading') {
    console.log('[Starfield] DOM still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', initStarfield);
} else {
    // DOM already loaded, initialize immediately
    console.log('[Starfield] DOM already ready, initializing...');
    initStarfield();
}

// Export for manual initialization
window.Starfield = Starfield;
