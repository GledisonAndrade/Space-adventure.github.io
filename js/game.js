// Configuração inicial
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameRunning = false;
let score = 0;
let phase = 1;
let lives = 3;
let gameSpeed = 3;

// Configuração do canvas
function setupCanvas() {
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        player.x = canvas.width / 2;
        player.y = canvas.height - 100;
    }
    
    window.addEventListener('resize', resize);
    resize();
}

// Objetos do jogo
const player = {
    x: 0, y: 0,
    width: 50, height: 50,
    speed: 8,
    color: '#3498db',
    lasers: [],
    lastShot: 0,
    shootDelay: 500,
    moveLeft: false,
    moveRight: false
};

let enemies = [];
let asteroids = [];
let explosions = [];
let lifeBonuses = [];

// Funções de criação de objetos
function createEnemy() {
    const size = 30 + Math.random() * 20;
    return {
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size, height: size,
        speed: 1 + Math.random() * gameSpeed,
        color: `hsl(${Math.random() * 60 + 330}, 100%, 50%)`,
        health: phase
    };
}

function createAsteroid() {
    const size = 30 + Math.random() * 40;
    return {
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size, height: size,
        speed: 1 + Math.random() * gameSpeed,
        color: '#8e44ad',
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.1
    };
}

function createLifeBonus() {
    return {
        x: Math.random() * (canvas.width - 30),
        y: -30,
        width: 30, height: 30,
        speed: 2 + Math.random() * 2
    };
}

function createExplosion(x, y, size) {
    return {
        x: x,
        y: y,
        size: size,
        particles: Array(15).fill().map(() => ({
            x: 0,
            y: 0,
            speed: Math.random() * 3 + 1,
            angle: Math.random() * Math.PI * 2,
            life: 30 + Math.random() * 20,
            color: `hsl(${Math.random() * 60 + 10}, 100%, 50%)`
        })),
        life: 50
    };
}

// Funções de desenho
function drawPlayer() {
    ctx.save();
    ctx.fillStyle = player.color;
    
    // Nave do jogador
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.height / 2);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height / 2);
    ctx.lineTo(player.x - player.width / 2, player.y + player.height / 2);
    ctx.closePath();
    ctx.fill();
    
    // Efeito do motor
    if (gameRunning) {
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.moveTo(player.x - player.width / 4, player.y + player.height / 2);
        ctx.lineTo(player.x, player.y + player.height / 2 + 10 + Math.random() * 10);
        ctx.lineTo(player.x + player.width / 4, player.y + player.height / 2);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}

function drawLaser(laser) {
    ctx.save();
    ctx.fillStyle = laser.isEnemy ? '#ff0000' : '#f1c40f';
    ctx.fillRect(laser.x - 2, laser.y, 4, 10);
    ctx.restore();
}

function drawEnemy(enemy) {
    ctx.save();
    ctx.fillStyle = enemy.color;
    
    // Nave inimiga
    ctx.beginPath();
    ctx.moveTo(enemy.x + enemy.width / 2, enemy.y);
    ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
    ctx.lineTo(enemy.x, enemy.y + enemy.height);
    ctx.closePath();
    ctx.fill();
    
    // Cabine
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 3, enemy.width / 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function drawAsteroid(asteroid) {
    ctx.save();
    ctx.translate(asteroid.x + asteroid.width / 2, asteroid.y + asteroid.height / 2);
    ctx.rotate(asteroid.rotation);
    
    ctx.fillStyle = asteroid.color;
    ctx.beginPath();
    
    // Forma irregular
    const points = 8;
    const radius = Math.min(asteroid.width, asteroid.height) / 2;
    
    for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const distance = radius * (0.7 + Math.random() * 0.3);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawLifeBonus(bonus) {
    ctx.save();
    ctx.fillStyle = '#ff0000';
    
    // Coração
    const x = bonus.x + bonus.width/2;
    const y = bonus.y + bonus.height/2;
    const size = Math.min(bonus.width, bonus.height) / 2;
    
    ctx.beginPath();
    ctx.moveTo(x, y - size/2);
    ctx.bezierCurveTo(x + size, y - size/2, x + size, y + size/2, x, y + size);
    ctx.bezierCurveTo(x - size, y + size/2, x - size, y - size/2, x, y - size/2);
    ctx.fill();
    
    ctx.restore();
}

function drawExplosion(explosion) {
    ctx.save();
    ctx.translate(explosion.x, explosion.y);
    
    explosion.particles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(
            Math.cos(particle.angle) * particle.speed * (50 - explosion.life),
            Math.sin(particle.angle) * particle.speed * (50 - explosion.life),
            2, 0, Math.PI * 2
        );
        ctx.fill();
    });
    
    ctx.restore();
}

function drawStarfield() {
    ctx.save();
    ctx.fillStyle = '#fff';
    
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = (Math.random() * canvas.height + (Date.now() * 0.05 * gameSpeed)) % canvas.height;
        const size = Math.random() * 2;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

function drawJupiter() {
    ctx.save();
    
    // Júpiter no fundo
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height * 1.5, 50,
        canvas.width / 2, canvas.height * 1.5, 300
    );
    gradient.addColorStop(0, 'rgba(200, 150, 50, 0.8)');
    gradient.addColorStop(1, 'rgba(100, 50, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height * 1.5, 300, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Lógica do jogo
function spawnEnemies() {
    if (Math.random() < 0.02 && enemies.length < 5 + phase) {
        enemies.push(createEnemy());
    }
}

function spawnAsteroids() {
    if (Math.random() < 0.01 && asteroids.length < 3 + phase) {
        asteroids.push(createAsteroid());
    }
}

function spawnLifeBonus() {
    if (Math.random() < 0.003 && lifeBonuses.length < 1 && lives < 5) {
        lifeBonuses.push(createLifeBonus());
    }
}

function updatePlayer() {
    if (player.moveLeft && player.x > player.width / 2) {
        player.x -= player.speed;
    }
    if (player.moveRight && player.x < canvas.width - player.width / 2) {
        player.x += player.speed;
    }
    
    // Atualizar lasers
    player.lasers = player.lasers.filter(laser => laser.y > -10 && laser.y < canvas.height + 10);
    player.lasers.forEach(laser => laser.isEnemy ? (laser.y += 8) : (laser.y -= 10));
}

function updateEnemies() {
    enemies = enemies.filter(enemy => enemy.y < canvas.height + enemy.height);
    
    enemies.forEach(enemy => {
        enemy.y += enemy.speed;
        
        // Inimigos atiram a partir da fase 2
        if (phase >= 2 && Math.random() < 0.005) {
            player.lasers.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height,
                width: 4,
                height: 10,
                isEnemy: true
            });
        }
    });
}

function updateAsteroids() {
    asteroids = asteroids.filter(asteroid => asteroid.y < canvas.height + asteroid.height);
    
    asteroids.forEach(asteroid => {
        asteroid.y += asteroid.speed;
        asteroid.rotation += asteroid.rotationSpeed;
    });
}

function updateLifeBonuses() {
    lifeBonuses = lifeBonuses.filter(bonus => bonus.y < canvas.height + bonus.height);
    lifeBonuses.forEach(bonus => bonus.y += bonus.speed);
}

function updateExplosions() {
    explosions = explosions.filter(explosion => explosion.life > 0);
    explosions.forEach(explosion => explosion.life--);
}

function checkCollision(obj1, obj2) {
    return obj1.x + obj1.width / 2 > obj2.x &&
           obj1.x - obj1.width / 2 < obj2.x + obj2.width &&
           obj1.y + obj1.height / 2 > obj2.y &&
           obj1.y - obj1.height / 2 < obj2.y + obj2.height;
}

function checkCollisions() {
    // Lasers do jogador atingem inimigos
    player.lasers.forEach((laser, laserIndex) => {
        if (laser.isEnemy) {
            // Laser inimigo atinge jogador
            if (checkCollision(laser, player)) {
                player.lasers.splice(laserIndex, 1);
                loseLife();
            }
        } else {
            // Laser do jogador atinge inimigos
            enemies.forEach((enemy, enemyIndex) => {
                if (checkCollision(laser, enemy)) {
                    player.lasers.splice(laserIndex, 1);
                    enemy.health--;
                    
                    if (enemy.health <= 0) {
                        enemies.splice(enemyIndex, 1);
                        addScore(10);
                        explosions.push(createExplosion(
                            enemy.x + enemy.width / 2,
                            enemy.y + enemy.height / 2,
                            enemy.width
                        ));
                        checkPhaseAdvance();
                    }
                }
            });
            
            // Laser do jogador atinge asteroides
            asteroids.forEach((asteroid, asteroidIndex) => {
                if (checkCollision(laser, asteroid)) {
                    player.lasers.splice(laserIndex, 1);
                    asteroids.splice(asteroidIndex, 1);
                    addScore(5);
                    explosions.push(createExplosion(
                        asteroid.x + asteroid.width / 2,
                        asteroid.y + asteroid.height / 2,
                        asteroid.width
                    ));
                    checkPhaseAdvance();
                }
            });
        }
    });
    
    // Colisão do jogador com inimigos ou asteroides
    enemies.forEach(enemy => {
        if (checkCollision(player, enemy)) {
            loseLife();
            enemies.splice(enemies.indexOf(enemy), 1);
        }
    });
    
    asteroids.forEach(asteroid => {
        if (checkCollision(player, asteroid)) {
            loseLife();
            asteroids.splice(asteroids.indexOf(asteroid), 1);
        }
    });
    
    // Colisão com bônus de vida
    lifeBonuses.forEach((bonus, index) => {
        if (checkCollision(player, bonus)) {
            lifeBonuses.splice(index, 1);
            lives = Math.min(lives + 1, 5);
            explosions.push(createExplosion(
                bonus.x + bonus.width/2,
                bonus.y + bonus.height/2,
                20
            ));
            updateUI();
        }
    });
}

function loseLife() {
    lives--;
    explosions.push(createExplosion(player.x, player.y, 30));
    updateUI();
    
    if (lives <= 0) {
        gameOver();
    }
}

function addScore(points) {
    score += points;
    updateUI();
    checkPhaseAdvance();
}

function checkPhaseAdvance() {
    if (score >= phase * 100) {
        nextPhase();
    }
}

function nextPhase() {
    phase++;
    gameSpeed += 0.5;
    player.shootDelay = Math.max(200, player.shootDelay - 50);
    player.speed += 1;
    
    // Melhoria visual da nave
    const colors = ['#3498db', '#2ecc71', '#e74c3c', '#9b59b6'];
    player.color = colors[Math.min(phase - 1, colors.length - 1)];
    
    updateUI();
    enemies = [];
    asteroids = [];
}

function updateUI() {
    document.getElementById('scoreDisplay').textContent = score;
    document.getElementById('phaseDisplay').textContent = phase;
    document.getElementById('livesDisplay').textContent = lives;
}

function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = `Pontuação: ${score}`;
    document.getElementById('gameOverScreen').style.display = 'flex';
}

function resetGame() {
    score = 0;
    phase = 1;
    lives = 3;
    gameSpeed = 3;
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    player.color = '#3498db';
    player.speed = 8;
    player.shootDelay = 500;
    player.lasers = [];
    enemies = [];
    asteroids = [];
    explosions = [];
    lifeBonuses = [];
    updateUI();
}

// Loop principal do jogo
function gameLoop() {
    if (!gameRunning) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawStarfield();
    drawJupiter();
    
    updatePlayer();
    updateEnemies();
    updateAsteroids();
    updateLifeBonuses();
    updateExplosions();
    checkCollisions();
    spawnEnemies();
    spawnAsteroids();
    spawnLifeBonus();
    
    drawPlayer();
    player.lasers.forEach(drawLaser);
    enemies.forEach(drawEnemy);
    asteroids.forEach(drawAsteroid);
    lifeBonuses.forEach(drawLifeBonus);
    explosions.forEach(drawExplosion);
    
    requestAnimationFrame(gameLoop);
}

// Controles
function setupControls() {
    // Controles touch
    document.getElementById('leftButton').addEventListener('touchstart', (e) => {
        e.preventDefault();
        player.moveLeft = true;
    });
    
    document.getElementById('leftButton').addEventListener('touchend', (e) => {
        e.preventDefault();
        player.moveLeft = false;
    });
    
    document.getElementById('rightButton').addEventListener('touchstart', (e) => {
        e.preventDefault();
        player.moveRight = true;
    });
    
    document.getElementById('rightButton').addEventListener('touchend', (e) => {
        e.preventDefault();
        player.moveRight = false;
    });
    
    document.getElementById('fireButton').addEventListener('touchstart', (e) => {
        e.preventDefault();
        shootLaser();
    });
    
    // Controles de teclado
    document.addEventListener('keydown', (e) => {
        if (!gameRunning) return;
        
        if (e.key === 'ArrowLeft') {
            player.moveLeft = true;
        } else if (e.key === 'ArrowRight') {
            player.moveRight = true;
        } else if (e.key === ' ') {
            shootLaser();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft') {
            player.moveLeft = false;
        } else if (e.key === 'ArrowRight') {
            player.moveRight = false;
        }
    });
}

function shootLaser() {
    const now = Date.now();
    if (now - player.lastShot > player.shootDelay) {
        player.lasers.push({
            x: player.x,
            y: player.y - player.height / 2,
            width: 4,
            height: 10,
            isEnemy: false
        });
        player.lastShot = now;
    }
}

// Menu
function setupMenu() {
    document.getElementById('startButton').addEventListener('click', () => {
        document.getElementById('menuScreen').style.display = 'none';
        resetGame();
        gameRunning = true;
        gameLoop();
    });
    
    document.getElementById('instructionsButton').addEventListener('click', () => {
        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('instructionsScreen').style.display = 'flex';
    });
    
    document.getElementById('backButton').addEventListener('click', () => {
        document.getElementById('instructionsScreen').style.display = 'none';
        document.getElementById('menuScreen').style.display = 'flex';
    });
    
    document.getElementById('restartButton').addEventListener('click', () => {
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('menuScreen').style.display = 'flex';
    });
}

// Inicialização
function initGame() {
    setupCanvas();
    setupControls();
    setupMenu();
    resetGame();
}

// Inicia quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initGame);