// Initialize Firebase first
const firebaseConfig = {
    apiKey: "AIzaSyA_JDJHGFJnPh7UXhNE-U5sPJfzwH2Jz_8",
    authDomain: "pattern-pulse-game.firebaseapp.com",
    databaseURL: "https://pattern-pulse-game-default-rtdb.firebaseio.com",
    projectId: "pattern-pulse-game",
    storageBucket: "pattern-pulse-game.appspot.com",
    messagingSenderId: "848383588708",
    appId: "1:848383588708:web:3b9d3e9d9d3e9d9d3e9d9d"
};

let database;
try {
    console.log('Initializing Firebase...');
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Game constants
const INITIAL_SPEED = 1.0;
const INITIAL_SPAWN_INTERVAL = 2000;
const LEVEL_INCREASE_SCORE = 30;
const SPEED_INCREASE = 0.15;
const SPAWN_INTERVAL_DECREASE = 100;
const ASTEROID_SIZE = 40;
const MIN_SPAWN_INTERVAL = 600;

// Game state
let gameStarted = false;
let gameOver = false;
let score = 0;
let level = 1;
let baseSpeed = INITIAL_SPEED;
let spawnInterval = INITIAL_SPAWN_INTERVAL;
let tiles = [];
let particles = [];
let lastSpawnTime = 0;
let currentPlayer = '';

// DOM elements
let canvas, ctx, mainMenu, howToPlayScreen, leaderboardScreen, gameOverScreen, ui, scoreDisplay, levelDisplay, bgMusic;

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing game...');
    try {
        // Get DOM elements
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        mainMenu = document.getElementById('mainMenu');
        howToPlayScreen = document.getElementById('howToPlay');
        leaderboardScreen = document.getElementById('leaderboard');
        gameOverScreen = document.getElementById('gameOver');
        ui = document.getElementById('ui');
        scoreDisplay = document.getElementById('score');
        levelDisplay = document.getElementById('level');
        bgMusic = document.getElementById('bgMusic');
        bgMusic.volume = 0.3;

        console.log('DOM elements initialized:', {
            canvas: !!canvas,
            ctx: !!ctx,
            mainMenu: !!mainMenu,
            howToPlayScreen: !!howToPlayScreen,
            leaderboardScreen: !!leaderboardScreen,
            gameOverScreen: !!gameOverScreen,
            ui: !!ui,
            scoreDisplay: !!scoreDisplay,
            levelDisplay: !!levelDisplay,
            bgMusic: !!bgMusic
        });

        // Set initial display states
        canvas.style.display = 'none';
        ui.style.display = 'none';
        mainMenu.style.display = 'block';
        howToPlayScreen.style.display = 'none';
        leaderboardScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';

        // Add event listeners
        setupEventListeners();
        
        // Initialize canvas size
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Load initial leaderboard
        updateLeaderboard();
        
        console.log('Game initialization complete');
    } catch (error) {
        console.error('Error during game initialization:', error);
    }
});

function setupEventListeners() {
    console.log('Setting up event listeners...');
    try {
        // Menu navigation
        document.getElementById('howToPlayBtn').addEventListener('click', function(e) {
            console.log('How to Play clicked');
            e.preventDefault();
            mainMenu.style.display = 'none';
            howToPlayScreen.style.display = 'block';
        });

        document.getElementById('leaderboardBtn').addEventListener('click', function(e) {
            console.log('Leaderboard clicked');
            e.preventDefault();
            mainMenu.style.display = 'none';
            leaderboardScreen.style.display = 'block';
            updateLeaderboard();
        });

        document.getElementById('playBtn').addEventListener('click', function(e) {
            console.log('Play clicked');
            e.preventDefault();
            const playerName = document.getElementById('playerName').value.trim();
            if (!playerName) {
                document.getElementById('nameError').style.display = 'block';
                return;
            }
            document.getElementById('nameError').style.display = 'none';
            currentPlayer = playerName;
            startGame();
        });

        document.getElementById('restartBtn').addEventListener('click', function(e) {
            console.log('Restart clicked');
            e.preventDefault();
            startGame();
        });

        // Back buttons
        document.querySelectorAll('.back-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                console.log('Back clicked');
                e.preventDefault();
                howToPlayScreen.style.display = 'none';
                leaderboardScreen.style.display = 'none';
                gameOverScreen.style.display = 'none';
                mainMenu.style.display = 'block';
            });
        });

        // Game controls
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('touchstart', handleTouch);
        
        console.log('Event listeners setup complete');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

function handleClick(e) {
    console.log('Click event:', e.clientX, e.clientY);
    if (!gameStarted || gameOver) {
        console.log('Game not active, ignoring click');
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    checkAsteroidHit(x, y);
}

function handleTouch(e) {
    console.log('Touch event');
    e.preventDefault();
    if (!gameStarted || gameOver) {
        console.log('Game not active, ignoring touch');
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    
    checkAsteroidHit(x, y);
}

function checkAsteroidHit(x, y) {
    console.log('Checking asteroid hit at:', x, y);
    for (let i = tiles.length - 1; i >= 0; i--) {
        const tile = tiles[i];
        const dx = x - tile.x;
        const dy = y - tile.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < ASTEROID_SIZE) {
            console.log('Hit asteroid at:', tile.x, tile.y);
            createParticles(tile.x, tile.y);
            tiles.splice(i, 1);
            score += 10;
            scoreDisplay.textContent = 'Score: ' + score;
            
            if (score >= level * LEVEL_INCREASE_SCORE) {
                level++;
                levelDisplay.textContent = 'Level: ' + level;
                baseSpeed += SPEED_INCREASE;
                spawnInterval = Math.max(MIN_SPAWN_INTERVAL, spawnInterval - SPAWN_INTERVAL_DECREASE);
                console.log('Level up:', level, 'Speed:', baseSpeed, 'Interval:', spawnInterval);
            }
            break;
        }
    }
}

function startGame() {
    console.log('Starting game...');
    try {
        // Reset game state
        gameStarted = true;
        gameOver = false;
        score = 0;
        level = 1;
        baseSpeed = INITIAL_SPEED;
        spawnInterval = INITIAL_SPAWN_INTERVAL;
        tiles = [];
        particles = [];
        lastSpawnTime = Date.now();
        
        // Update UI
        mainMenu.style.display = 'none';
        gameOverScreen.style.display = 'none';
        canvas.style.display = 'block';
        ui.style.display = 'block';
        scoreDisplay.textContent = 'Score: 0';
        levelDisplay.textContent = 'Level: 1';
        
        // Start music
        bgMusic.currentTime = 0;
        bgMusic.play().catch(console.error);
        
        // Start game loop
        console.log('Starting game loop');
        requestAnimationFrame(updateGame);
    } catch (error) {
        console.error('Error starting game:', error);
    }
}

function showGameOver() {
    console.log('Game over');
    try {
        gameStarted = false;
        gameOver = true;
        
        // Fade out music
        const fadeInterval = setInterval(() => {
            if (bgMusic.volume > 0.02) {
                bgMusic.volume -= 0.02;
            } else {
                bgMusic.pause();
                bgMusic.volume = 0.3;
                clearInterval(fadeInterval);
            }
        }, 100);
        
        // Save score to Firebase
        database.ref('scores').push({
            playerName: currentPlayer,
            score: score,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            console.log('Score saved');
            updateLeaderboard();
        }).catch(error => {
            console.error('Error saving score:', error);
        });
        
        // Show game over screen
        document.getElementById('finalScore').textContent = score;
        canvas.style.display = 'none';
        ui.style.display = 'none';
        gameOverScreen.style.display = 'block';
    } catch (error) {
        console.error('Error showing game over:', error);
    }
}

function updateLeaderboard() {
    console.log('Updating leaderboard...');
    database.ref('scores')
        .orderByChild('score')
        .limitToLast(10)
        .once('value')
        .then((snapshot) => {
            const scores = [];
            snapshot.forEach((childSnapshot) => {
                scores.push(childSnapshot.val());
            });
            scores.sort((a, b) => b.score - a.score);
            
            const list = document.getElementById('leaderboardList');
            list.innerHTML = '';
            scores.forEach((entry, index) => {
                const li = document.createElement('li');
                li.textContent = `${index + 1}. ${entry.playerName}: ${entry.score}`;
                list.appendChild(li);
            });
            console.log('Leaderboard updated with', scores.length, 'entries');
        })
        .catch(error => {
            console.error('Error updating leaderboard:', error);
            const list = document.getElementById('leaderboardList');
            list.innerHTML = '<li>Error loading leaderboard</li>';
        });
}

function resizeCanvas() {
    console.log('Resizing canvas');
    try {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        console.log('Canvas size:', canvas.width, canvas.height);
    } catch (error) {
        console.error('Error resizing canvas:', error);
    }
}

function createParticles(x, y) {
    for (let i = 0; i < 15; i++) {
        const angle = (i / 15) * Math.PI * 2;
        const speed = 3 + Math.random() * 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            color: '#FFD700'
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life *= 0.95;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0');
        ctx.fill();
        
        if (p.life < 0.01) particles.splice(i, 1);
    }
}

function updateGame() {
    if (!gameStarted || gameOver) {
        console.log('Game not active, stopping game loop');
        return;
    }

    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Spawn new asteroids
        const now = Date.now();
        if (now - lastSpawnTime > spawnInterval) {
            const x = Math.random() * (canvas.width - ASTEROID_SIZE) + ASTEROID_SIZE/2;
            tiles.push({
                x: x,
                y: -ASTEROID_SIZE,
                rotation: Math.random() * Math.PI * 2
            });
            lastSpawnTime = now;
            console.log('Spawned asteroid at:', x);
        }

        // Update and draw asteroids
        for (let i = tiles.length - 1; i >= 0; i--) {
            const tile = tiles[i];
            tile.y += baseSpeed;
            tile.rotation += 0.02;
            
            if (tile.y > canvas.height + ASTEROID_SIZE) {
                console.log('Asteroid reached bottom, game over');
                showGameOver();
                return;
            }

            // Draw asteroid
            ctx.save();
            ctx.translate(tile.x, tile.y);
            ctx.rotate(tile.rotation);
            ctx.beginPath();
            ctx.arc(0, 0, ASTEROID_SIZE/2, 0, Math.PI * 2);
            ctx.fillStyle = '#8B4513';
            ctx.fill();
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // Update and draw particles
        updateParticles();

        requestAnimationFrame(updateGame);
    } catch (error) {
        console.error('Error in game loop:', error);
    }
}
