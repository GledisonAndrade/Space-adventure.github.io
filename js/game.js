// Configuração inicial do jogo
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameRunning = false;
let score = 0;
let phase = 1;
let lives = 3;
let gameSpeed = 3;
let lastFrameTime = 0;

// Configuração do canvas responsivo
function setupCanvas() {
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        player.x = canvas.width / 2;
        player.y = canvas.height - 100;
        
        // Ajusta o tamanho dos elementos baseado na tela
        const baseSize = Math.min(canvas.width, canvas.height) * 0.05;
        player.width = baseSize * 1.5;
        player.height = baseSize * 1.5;
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
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

// Funções de criação de objetos otimizadas
function createEnemy() {
    const size = 30 + Math.random() * 20 * (canvas.width / 400);
    return {
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        speed: 1 + Math.random() * gameSpeed,
        color: `hsl(${Math.random() * 60 + 330}, 100%, 50%)`,
        health: phase
    };
}

function createAsteroid() {
    const size = 30 + Math.random() * 40 * (canvas.width / 400);
    return {
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        speed: 1 + Math.random() * gameSpeed * 0.7,
        color: '#8e44ad',
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.1
    };
}

function createLifeBonus() {
    const size = 30 * (canvas.width / 400);
    return {
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
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

// Sistema de desenho otimizado
function drawPlayer() {
    ctx.save();
    ctx.fillStyle = player.color;
    
    // Desenho da nave do jogador
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.height / 2);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height / 2);
    ctx.lineTo(player.x - player.width / 2, player.y + player.height / 2);
    ctx.closePath();
    ctx.fill();
    
    // Efeito de propulsão
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
    const laserWidth = 4 * (canvas.width / 400);
    const laserHeight = 10 * (canvas.width / 400);
    ctx.fillRect(laser.x - laserWidth/2, laser.y, laserWidth, laserHeight);
    ctx.restore();
}

function drawEnemy(enemy) {
    ctx.save();
    ctx.fillStyle = enemy.color;
    
    ctx.beginPath();
    ctx.moveTo(enemy.x + enemy.width / 2, enemy.y);
    ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
    ctx.lineTo(enemy.x, enemy.y + enemy.height);
    ctx.closePath();
    ctx.fill();
    
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
    
    const points = 8;
    const radius = Math.min(asteroid.width, asteroid.height) / 2;
    
    for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const distance = radius * (0.7 + Math.random() * 0.3);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawLifeBonus(bonus) {
    ctx.save();
    ctx.fillStyle = '#ff0000';
    
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
            2 * (canvas.width / 400), 0, Math.PI * 2
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
        const size = Math.random() * 2 * (canvas.width / 400);
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

function drawJupiter() {
    ctx.save();
    
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height * 1.5, canvas.width * 0.1,
        canvas.width / 2, canvas.height * 1.5, canvas.width * 0.6
    );
    gradient.addColorStop(0, 'rgba(200, 150, 50, 0.8)');
    gradient.addColorStop(1, 'rgba(100, 50, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height * 1.5, canvas.width * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Lógica do jogo otimizada
function spawnEnemies() {
    if (Math.random() < 0.02 * (1 + phase/4) && enemies.length < 5 + phase) {
        enemies.push(createEnemy());
    }
}

function spawnAsteroids() {
    if (Math.random() < 0.01 * (1 + phase/3) && asteroids.length < 3 + phase) {
        asteroids.push(createAsteroid());
    }
}

function spawnLifeBonus() {
    if (Math.random() < 0.003 && lifeBonuses.length < 1 && lives < 5) {
        lifeBonuses.push(createLifeBonus());
    }
}

function updatePlayer(deltaTime) {
    if (player.moveLeft && player.x > player.width / 2) {
        player.x -= player.speed * (deltaTime / 16);
    }
    if (player.moveRight && player.x < canvas.width - player.width / 2) {
        player.x += player.speed * (deltaTime / 16);
    }
    
    player.lasers = player.lasers.filter(laser => 
        laser.y > -20 && laser.y < canvas.height + 20
    );
    
    const laserSpeed = 10 * (canvas.width / 400);
    player.lasers.forEach(laser => {
        laser.y += laser.isEnemy ? laserSpeed * (deltaTime / 16) : -laserSpeed * (deltaTime / 16);
    });
}

function updateGameObjects(deltaTime) {
    // Atualiza inimigos
    enemies = enemies.filter(enemy => enemy.y < canvas.height + enemy.height);
    enemies.forEach(enemy => {
        enemy.y += enemy.speed * (deltaTime / 16);
        
        if (phase >= 2 && Math.random() < 0.005) {
            player.lasers.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height,
                width: 4 * (canvas.width / 400),
                height: 10 * (canvas.width / 400),
                isEnemy: true
            });
        }
    });
    
    // Atualiza asteroides
    asteroids = asteroids.filter(asteroid => asteroid.y < canvas.height + asteroid.height);
    asteroids.forEach(asteroid => {
        asteroid.y += asteroid.speed * (deltaTime / 16);
        asteroid.rotation += asteroid.rotationSpeed * (deltaTime / 16);
    });
    
    // Atualiza bônus de vida
    lifeBonuses = lifeBonuses.filter(bonus => bonus.y < canvas.height + bonus.height);
    lifeBonuses.forEach(bonus => {
        bonus.y += bonus.speed * (deltaTime / 16);
    });
    
    // Atualiza explosões
    explosions = explosions.filter(explosion => explosion.life > 0);
    explosions.forEach(explosion => explosion.life--);
}

function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

function checkCollisions() {
    // Colisões de lasers
    player.lasers.forEach((laser, laserIndex) => {
        if (laser.isEnemy) {
            if (checkCollision(laser, player)) {
                player.lasers.splice(laserIndex, 1);
                loseLife();
            }
        } else {
            // Com inimigos
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
            
            // Com asteroides
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
    
    // Colisões do jogador
    enemies.forEach((enemy, enemyIndex) => {
        if (checkCollision(player, enemy)) {
            enemies.splice(enemyIndex, 1);
            loseLife();
        }
    });
    
    asteroids.forEach((asteroid, asteroidIndex) => {
        if (checkCollision(player, asteroid)) {
            asteroids.splice(asteroidIndex, 1);
            loseLife();
        }
    });
    
    // Colisões com bônus
    lifeBonuses.forEach((bonus, bonusIndex) => {
        if (checkCollision(player, bonus)) {
            lifeBonuses.splice(bonusIndex, 1);
            lives = Math.min(lives + 1, 5);
            explosions.push(createExplosion(
                bonus.x + bonus.width/2,
                bonus.y + bonus.height/2,
                bonus.width
            ));
            updateUI();
        }
    });
}

function loseLife() {
    lives--;
    explosions.push(createExplosion(player.x, player.y, player.width));
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

// Loop do jogo com deltaTime
function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawStarfield();
    drawJupiter();
    
    updatePlayer(deltaTime);
    updateGameObjects(deltaTime);
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

// Sistema de controles otimizado para mobile
function setupControls() {
    const leftButton = document.getElementById('leftButton');
    const rightButton = document.getElementById('rightButton');
    const fireButton = document.getElementById('fireButton');
    
    // Feedback visual para toque
    function addTouchFeedback(button) {
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            button.style.transform = 'scale(0.9)';
            button.style.opacity = '0.8';
        });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            button.style.transform = 'scale(1)';
            button.style.opacity = '1';
        });
    }
    
    addTouchFeedback(leftButton);
    addTouchFeedback(rightButton);
    addTouchFeedback(fireButton);
    
    // Controles de movimento
    leftButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        player.moveLeft = true;
    });
    
    leftButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        player.moveLeft = false;
    });
    
    rightButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        player.moveRight = true;
    });
    
    rightButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        player.moveRight = false;
    });
    
    fireButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        shootLaser();
    });
    
    // Controles de teclado para teste
    document.addEventListener('keydown', (e) => {
        if (!gameRunning) return;
        
        if (e.key === 'ArrowLeft') player.moveLeft = true;
        else if (e.key === 'ArrowRight') player.moveRight = true;
        else if (e.key === ' ') shootLaser();
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft') player.moveLeft = false;
        else if (e.key === 'ArrowRight') player.moveRight = false;
    });
}

function shootLaser() {
    const now = Date.now();
    if (now - player.lastShot > player.shootDelay) {
        player.lasers.push({
            x: player.x,
            y: player.y - player.height / 2,
            width: 4 * (canvas.width / 400),
            height: 10 * (canvas.width / 400),
            isEnemy: false
        });
        player.lastShot = now;
    }
}

// Menu do jogo
function setupMenu() {
    document.getElementById('startButton').addEventListener('click', () => {
        document.getElementById('menuScreen').style.display = 'none';
        resetGame();
        gameRunning = true;
        lastFrameTime = performance.now();
        requestAnimationFrame(gameLoop);
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

// Ajuste dos controles para mobile
function adjustControlsForMobile() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        const controls = document.getElementById('controls');
        controls.style.bottom = '15vh';
        controls.style.gap = '20px';
        controls.style.padding = '0 5%';
        
        const controlButtons = document.querySelectorAll('.controlButton');
        const buttonSize = Math.min(canvas.width, canvas.height) * 0.12;
        
        controlButtons.forEach(button => {
            button.style.width = `${buttonSize}px`;
            button.style.height = `${buttonSize}px`;
            button.style.fontSize = `${buttonSize * 0.4}px`;
        });
        
        // Ajuste especial para o botão de tiro
        const fireButton = document.getElementById('fireButton');
        fireButton.style.marginRight = '5%';
    }
}

// Inicialização completa do jogo
function initGame() {
    setupCanvas();
    setupControls();
    setupMenu();
    adjustControlsForMobile();
    resetGame();
}

// Inicia o jogo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initGame);
