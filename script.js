// --- SOCKET.IO CONFIGURATION ---
const socket = typeof io !== 'undefined' ? io() : null;


// --- ASSETS & ELEMENTS ---
const characters = [
    { closed: 'chara/cat1.png', open: 'chara/cat2.png' },
    { closed: 'chara/balil1.png', open: 'chara/balil2.png' },
    { closed: 'chara/pigai1.png', open: 'chara/pigai2.png' },
    { closed: 'chara/saroni1.png', open: 'chara/saroni2.png' },
    { closed: 'chara/zulhas1.png', open: 'chara/zulhas2.png' },
    { closed: 'chara/arie1.webp', open: 'chara/arie2.webp' },
    { closed: 'chara/gplate1.png', open: 'chara/gplate2.png' },
    { closed: 'chara/sambo1.png', open: 'chara/sambo2.png' },
    { closed: 'chara/erick1.webp', open: 'chara/erick2.webp' },
    { closed: 'chara/yaqut1.webp', open: 'chara/yaqut2.webp' },
    { closed: 'chara/luhut1.webp', open: 'chara/luhut2.webp' },
    { closed: 'chara/fafafa1.webp', open: 'chara/fafafa2.webp' },
    { closed: 'chara/meutya1.webp', open: 'chara/meutya2.webp' },
    { closed: 'chara/zon1.webp', open: 'chara/zon2.webp' },
];

// Preload all images
characters.forEach(char => {
    new Image().src = char.closed;
    new Image().src = char.open;
});

let currentCharIndex = Math.floor(Math.random() * characters.length);

let IMG_CLOSED = characters[currentCharIndex].closed;
let IMG_OPEN = characters[currentCharIndex].open;
const SOUND_POP = 'popp.mp3';

let isAnimatingCharacter = false;

function changeCharacter(direction) {
    if (isAnimatingCharacter) return;
    isAnimatingCharacter = true;

    const outClass = direction === 'right' ? 'slide-right-out' : 'slide-left-out';
    const inClass = direction === 'right' ? 'slide-left-in' : 'slide-right-in';

    characterEl.classList.add(outClass);

    setTimeout(() => {
        if (direction === 'right') {
            currentCharIndex = (currentCharIndex + 1) % characters.length;
        } else if (direction === 'left') {
            currentCharIndex = (currentCharIndex - 1 + characters.length) % characters.length;
        }
        IMG_CLOSED = characters[currentCharIndex].closed;
        IMG_OPEN = characters[currentCharIndex].open;
        characterEl.src = IMG_CLOSED;

        characterEl.classList.remove(outClass);
        characterEl.classList.add(inClass);

        setTimeout(() => {
            characterEl.classList.remove(inClass);
            isAnimatingCharacter = false;
        }, 150);
    }, 150);
}

const scoreEl = document.getElementById('score');
const scoreContainer = document.getElementById('score-container');
const characterEl = document.getElementById('character');
characterEl.src = IMG_CLOSED;

// Set random background
const bgs = ['images/bg1.jpg', 'images/bg2.jpg', 'images/bg3.jpg', 'images/bg4.webp'];
const randomBg = bgs[Math.floor(Math.random() * bgs.length)];
document.getElementById('game-container').style.backgroundImage = `url('${randomBg}')`;

const loginOverlay = document.getElementById('login-overlay');
const usernameInput = document.getElementById('username-input');
const startBtn = document.getElementById('start-btn');
const displayUsername = document.getElementById('display-username');
const leaderboardList = document.getElementById('leaderboard-list');
const leaderboardContainer = document.getElementById('leaderboard-container');

// --- QRIS & DONATE ---
const donateBtn = document.getElementById('donate-btn');
const qrisOverlay = document.getElementById('qris-overlay');
const closeQrisBtn = document.getElementById('close-qris-btn');

donateBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    qrisOverlay.classList.remove('hidden');
});

closeQrisBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    qrisOverlay.classList.add('hidden');
});

qrisOverlay.addEventListener('mousedown', (e) => e.stopPropagation());
qrisOverlay.addEventListener('touchstart', (e) => e.stopPropagation());

// --- NEWS POPUP ---
const newsOverlay = document.getElementById('news-overlay');
const closeNewsBtn = document.getElementById('close-news-btn');
const newsContent = document.getElementById('news-content');

if (closeNewsBtn) {
    closeNewsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        newsOverlay.classList.add('hidden');
    });
}

if (newsOverlay) {
    newsOverlay.addEventListener('mousedown', (e) => e.stopPropagation());
    newsOverlay.addEventListener('touchstart', (e) => e.stopPropagation());
}

if (socket) {
    socket.on('newsUpdate', (newsText) => {
        if (newsContent) {
            newsContent.textContent = newsText;
        }
    });
}

// Show news popup on load
if (newsOverlay) {
    newsOverlay.classList.remove('hidden');
}

// --- LEADERBOARD TOGGLE ---
leaderboardContainer.addEventListener('mousedown', (e) => e.stopPropagation());
leaderboardContainer.addEventListener('touchstart', (e) => e.stopPropagation());
leaderboardContainer.addEventListener('click', (e) => {
    e.stopPropagation();
    leaderboardContainer.classList.toggle('active');
});

const popSound = new Audio(SOUND_POP);
popSound.preload = 'auto';

// --- STATE ---
let count = 0;
let username = localStorage.getItem('popUsername') || '';
let userId = localStorage.getItem('popUserId') || '';
if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('popUserId', userId);
}

// --- INITIALIZATION ---
if (username) {
    loginOverlay.classList.add('hidden');
    displayUsername.textContent = username;
    initGame();
}

startBtn.addEventListener('click', () => {
    const val = usernameInput.value.trim();
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;

    if (val) {
        if (val.length > 15) {
            alert('ユーザー名は最大15文字です!');
            return;
        }
        if (!alphanumericRegex.test(val)) {
            alert('用户名只能是字母和数字！');
            return;
        }
        username = val;
        localStorage.setItem('popUsername', username);
        loginOverlay.classList.add('hidden');
        displayUsername.textContent = username;
        initGame();
    }
});

function initGame() {
    if (!socket) return;

    // Tell the server who we are
    socket.emit('initUser', { id: userId, username: username });

    // Handle username update from server
    socket.on('usernameUpdated', (newUsername) => {
        if (newUsername && newUsername !== username) {
            username = newUsername;
            localStorage.setItem('popUsername', username);
            if (displayUsername) displayUsername.textContent = username;
        }
    });

    // Get initial score
    socket.on('userScore', (score) => {
        count = score;
        scoreEl.textContent = count;
    });

    // Listen for real-time Leaderboard updates
    socket.on('leaderboardUpdate', (players) => {
        updateLeaderboardUI(players);
    });
}

function updateLeaderboardUI(players) {
    if (!players) return;

    // Convert object to array and sort ALL players to calculate rank
    const allPlayers = Object.keys(players)
        .map(key => ({ name: key, score: players[key].score }))
        .sort((a, b) => b.score - a.score);

    // Display Top 100
    const top100 = allPlayers.slice(0, 100);
    leaderboardList.innerHTML = '';
    top100.forEach((p, index) => {
        const item = document.createElement('div');
        const isMe = p.name === username;
        item.className = `leaderboard-item ${isMe ? 'is-me' : ''}`;
        item.innerHTML = `
            <span class="item-name">${index + 1}. ${p.name} ${isMe ? '' : ''}</span>
            <span class="item-score">${p.score.toLocaleString()}</span>
        `;
        leaderboardList.appendChild(item);
    });

    // Update User Rank Display
    if (username) {
        const userIndex = allPlayers.findIndex(p => p.name === username);
        const userRank = userIndex !== -1 ? userIndex + 1 : '-';
        const userScore = players[username] ? players[username].score : 0;

        displayUsername.innerHTML = `${username}`;
        const userInfoEl = document.getElementById('user-info');
        userInfoEl.innerHTML = `
            <div class="user-rank-info">
                Hi, <strong>${username}</strong>!<br>
                Rank: <span class="rank-highlight">#${userRank}</span> / ${allPlayers.length} 
                | Score: <span class="score-highlight">${userScore.toLocaleString()}</span>
            </div>
        `;
    }
}

// --- CORE GAME LOGIC ---
const pop = (event) => {
    // Play sound
    popSound.currentTime = 0;
    popSound.play().catch(() => { });

    // Update Local UI instantly
    count++;
    scoreEl.textContent = count;

    // Update Server
    if (username && socket) {
        socket.emit('pop', userId);
    }

    // Visuals
    characterEl.src = IMG_OPEN;
    characterEl.classList.add('active-pop');
    scoreContainer.classList.remove('pulse');
    void scoreContainer.offsetWidth;
    scoreContainer.classList.add('pulse');
    createPopText(event);
};

const unpop = () => {
    characterEl.src = IMG_CLOSED;
    characterEl.classList.remove('active-pop');
};

// ... (Rest of existing text effects and event listeners)
function createPopText(e) {
    const popText = document.createElement('div');
    popText.className = 'pop-text';
    popText.innerText = '+1';
    const x = e.clientX || (e.touches ? e.touches[0].clientX : window.innerWidth / 2);
    const y = e.clientY || (e.touches ? e.touches[0].clientY : window.innerHeight / 2);
    popText.style.left = `${x - 25}px`;
    popText.style.top = `${y - 120}px`;
    document.body.appendChild(popText);
    setTimeout(() => popText.remove(), 500);
}

let isProcessing = false;
const handleEvent = (e, isStart) => {
    if (isStart) {
        if (e.type === 'touchstart') isProcessing = true;
        if (e.type === 'mousedown' && isProcessing) return;
        pop(e);
    } else {
        if (e.type === 'touchend') setTimeout(() => isProcessing = false, 100);
        unpop();
    }
};

let startX = null;
let startTime = null;

window.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('.glass')) return;
    startX = e.screenX;
    startTime = Date.now();
    if (e.button === 0) handleEvent(e, true);
});

window.addEventListener('mouseup', (e) => {
    if (startX !== null && startTime !== null) {
        const diff = e.screenX - startX;
        const timeDiff = Date.now() - startTime;
        if (Math.abs(diff) > 50 && timeDiff >= 150) {
            if (diff > 0) changeCharacter('right');
            else changeCharacter('left');
        }
        startX = null;
        startTime = null;
    }
    handleEvent(e, false);
});

window.addEventListener('touchstart', (e) => {
    // Enable typing in inputs and clicking buttons
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('.glass')) {
        return;
    }
    startX = e.changedTouches[0].screenX;
    startTime = Date.now();
    if (e.cancelable) e.preventDefault();
    handleEvent(e, true);
}, { passive: false });

window.addEventListener('touchend', (e) => {
    if (startX !== null && startTime !== null) {
        const diff = e.changedTouches[0].screenX - startX;
        const timeDiff = Date.now() - startTime;
        if (Math.abs(diff) > 50 && timeDiff >= 300) {
            if (diff > 0) changeCharacter('right');
            else changeCharacter('left');
        }
        startX = null;
        startTime = null;
    }
    handleEvent(e, false);
});

// Keyboard support
window.addEventListener('keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) pop(e); });
window.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter') unpop(); });
