// ==================================
// Lấy phần tử DOM
// ==================================
const menuScreen = document.getElementById('menu-screen');
const playScreen = document.getElementById('play-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const notificationScreen = document.getElementById('notification-screen');

const startButton = document.getElementById('start-button');
const retryButton = document.getElementById('retry-button');

const scoreDisplay = document.getElementById('score');
const capacityDisplay = document.getElementById('capacity');
const missedDisplay = document.getElementById('missed-count');
const livesDisplay = document.getElementById('lives');
const upgradeCostDisplay = document.getElementById('upgrade-cost'); // NEW

const finalScoreDisplay = document.getElementById('final-score');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');

const notificationScore = document.getElementById('notification-score');
const notificationMessage = document.getElementById('notification-message');

const gameWorld = document.getElementById('game-world');
const playerBoat = document.getElementById('player-boat');
const leftBank = document.getElementById('left-bank');
const rightBank = document.getElementById('right-bank');
const safeZoneLeft = document.getElementById('safe-zone-left');
const safeZoneRight = document.getElementById('safe-zone-right');

// ==================================
// Trạng thái game
// ==================================
let score = 0;
let boatCapacity = 0;
let maxCapacity = 3;          // NEW: thay cho hằng số
let missedCount = 0;
let lives = 3;

let isGameOver = false;
let isPaused = false;

let playerPos = { x: 0, y: 0 };
let playerSpeed = 0;
const keysPressed = Object.create(null);

let entities = [];
let gameSpeed = 0.8;          // khởi đầu chậm
let spawnRate = 1500;         // khởi đầu thưa
let scoreToNextLevel = 10;
let obstacleChance = 0.35;

let upgradeCost = 5;          // NEW: giá nâng đầu tiên
let rafId = null;
let spawnInterval = null;

const humaneMessages = [
  "Thương người như thể thương thân.",
  "Một miếng khi đói bằng một gói khi no.",
  "Nhiễu điều phủ lấy giá gương, người trong một nước phải thương nhau cùng.",
  "Bầu ơi thương lấy bí cùng, tuy rằng khác giống nhưng chung một giàn.",
  "Cứu một mạng người hơn xây bảy tòa tháp.",
  "Giúp đỡ nhau vượt qua khó khăn!",
  "Tắt lửa tối đèn có nhau.",
];
const BOAT_IMG   = 'assets/boat.jpeg';
const VICTIM_IMG = 'assets/victim.jpeg';
const OBSTACLE_IMGS = [
  'assets/wood.jpeg',
  'assets/wood1.jpeg',
  'assets/rock.jpeg'
];
// ==================================
function bounds() {
  return {
    w: gameWorld.clientWidth,
    h: gameWorld.clientHeight,
    bankW: leftBank.clientWidth,
    boatW: playerBoat.clientWidth,
    boatH: playerBoat.clientHeight,
    entitySize: Math.max(1, Math.floor(gameWorld.clientWidth * 0.05)),
  };
}

// ==================================
function showScreen(screen) {
  [menuScreen, playScreen, gameOverScreen, notificationScreen]
    .forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

// ==================================
function startGame() {
  isGameOver = false;
  isPaused = false;

  score = 0;
  boatCapacity = 0;
  maxCapacity = 3;    // reset
  missedCount = 0;
  lives = 3;

  gameSpeed = 0.8;
  spawnRate = 1500;
  scoreToNextLevel = 10;
  obstacleChance = 0.35;

  upgradeCost = 5;    // reset chi phí nâng

  entities.forEach(e => e.el.remove());
  entities = [];

  showScreen(playScreen);

  requestAnimationFrame(() => {
    const B = bounds();

    const sp = Math.round(B.w * 0.006);
    playerSpeed = Math.min(4.5, Math.max(2.5, sp));

    playerPos.x = Math.round(B.w / 2 - B.boatW / 2);
    playerPos.y = Math.round(B.h - B.boatH - B.h * 0.02);

    drawPlayer();
    updateHUD();
    startLoops();
  });
}

function endGame(title, extraMsg) {
  isGameOver = true;
  stopLoops();

  resultTitle.textContent = title;
  let base = "";
  if (score < 10) base = "Dù khó khăn, mỗi nỗ lực đều đáng quý. Hãy tiếp tục!";
  else if (score < 30) base = `Bạn đã cứu được ${score} người! Tinh thần tương trợ của bạn thật tuyệt.`;
  else base = `Bạn là người hùng! ${score} người đã an toàn nhờ bạn.`;

  resultMessage.textContent = extraMsg ? `${extraMsg} ${base}` : base;
  finalScoreDisplay.textContent = score;
  showScreen(gameOverScreen);
}

// ==================================
function tick() {
  if (!isGameOver && !isPaused) gameLoop();
  rafId = requestAnimationFrame(tick);
}
function startLoops() {
  cancelAnimationFrame(rafId);
  clearInterval(spawnInterval);
  spawnInterval = setInterval(spawnEntity, spawnRate);
  rafId = requestAnimationFrame(tick);
}
function stopLoops() {
  cancelAnimationFrame(rafId);
  clearInterval(spawnInterval);
}
function gameLoop() {
  movePlayer();
  moveEntities();
  handleCollisions();
  drawPlayer();
}

// ==================================
function updateHUD() {
  scoreDisplay.textContent = score;
  capacityDisplay.textContent = `${boatCapacity} / ${maxCapacity}`; // NEW
  missedDisplay.textContent = `${missedCount} / 3`;
  livesDisplay.textContent = lives;
  upgradeCostDisplay.textContent = upgradeCost; // NEW

  capacityDisplay.classList.toggle('full', boatCapacity >= maxCapacity);
  missedDisplay.classList.toggle('danger', missedCount > 0);
}
function showFeedbackText(text, color, x, y) {
  const el = document.createElement('div');
  el.className = 'feedback-text';
  el.textContent = text;
  el.style.color = color;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  gameWorld.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

// tăng độ khó
function increaseDifficulty() {
  gameSpeed += 0.1;
  spawnRate = Math.max(600, Math.floor(spawnRate * 0.92));
  obstacleChance = Math.min(0.7, obstacleChance + 0.05);

  clearInterval(spawnInterval);
  spawnInterval = setInterval(spawnEntity, spawnRate);

  const B = bounds();
  showFeedbackText('NGUY HIỂM HƠN!', '#ff3b30', B.w / 2, B.h * 0.35);
}

// ==================================
function movePlayer() {
  const B = bounds();
  let nx = playerPos.x, ny = playerPos.y;

  if (keysPressed['arrowup'] || keysPressed['w']) ny -= playerSpeed;
  if (keysPressed['arrowdown'] || keysPressed['s']) ny += playerSpeed;
  if (keysPressed['arrowleft'] || keysPressed['a']) nx -= playerSpeed;
  if (keysPressed['arrowright'] || keysPressed['d']) nx += playerSpeed;

  const leftLimit = B.bankW;
  const rightLimit = B.w - B.bankW - B.boatW;

  if (ny < 0) ny = 0;
  if (ny > B.h - B.boatH) ny = B.h - B.boatH;
  if (nx < leftLimit) nx = leftLimit;
  if (nx > rightLimit) nx = rightLimit;

  playerPos.x = nx;
  playerPos.y = ny;
}
function drawPlayer() {
  playerBoat.style.transform = `translate(${playerPos.x}px, ${playerPos.y}px)`;
}

// ==================================
function spawnEntity() {
  if (isGameOver || isPaused) return;
  const B = bounds();
  const isVictim = Math.random() > obstacleChance;

  const el = document.createElement('div');
  el.className = 'entity';
  const e = { type: isVictim ? 'victim' : 'obstacle', x: 0, y: 0, speed: 0, el };

  if (isVictim) {
    el.textContent = '🧍';
    e.speed = (1.5 + Math.random() * 1.5) * gameSpeed;
  } else {
    el.textContent = Math.random() > 0.5 ? '🪨' : '🌳';
    e.speed = (2.0 + Math.random() * 2.0) * gameSpeed;
  }

  const minX = B.bankW, maxX = B.w - B.bankW - B.entitySize;
  e.x = Math.floor(minX + Math.random() * (maxX - minX));
  e.y = -B.entitySize;

  el.style.transform = `translate(${e.x}px, ${e.y}px)`;
  gameWorld.appendChild(el);
  entities.push(e);
}

function moveEntities() {
  const B = bounds();
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];
    e.y += e.speed;
    e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
    if (e.y > B.h) {
      e.el.remove();
      entities.splice(i, 1);
      if (e.type === 'victim') {
        missedCount++;
        updateHUD();
        if (missedCount >= 3)
          endGame("Nhiệm vụ thất bại!", "Bạn đã để lỡ quá nhiều người.");
      }
    }
  }
}

// ==================================
function rectsOverlap(a, b) {
  return (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
}

// Nâng cấp sức chứa (Space): trừ điểm, +1 maxCapacity, tăng giá +3
function tryUpgradeCapacity() {
  if (isGameOver || isPaused) return;
  if (score >= upgradeCost) {
    score -= upgradeCost;
    maxCapacity += 1;
    upgradeCost += 3;
    updateHUD();
    const B = bounds();
    showFeedbackText(`Nâng sức chứa: ${maxCapacity}`, '#00e676', B.w/2, B.h*0.2);
  } else {
    const B = bounds();
    showFeedbackText(`Không đủ điểm (cần ${upgradeCost})`, '#ff5252', B.w/2, B.h*0.2);
  }
}

function handleCollisions() {
  const B = bounds();
  const playerRect = { x: playerPos.x, y: playerPos.y, w: B.boatW, h: B.boatH };
  const leftIcon  = { x: safeZoneLeft.offsetLeft,  y: safeZoneLeft.offsetTop,  w: safeZoneLeft.offsetWidth,  h: safeZoneLeft.offsetHeight };
  const rightIcon = { x: safeZoneRight.offsetLeft, y: safeZoneRight.offsetTop, w: safeZoneRight.offsetWidth, h: safeZoneRight.offsetHeight };

  const extend = Math.round(B.bankW * 0.55);
  const leftHit  = { x: B.bankW, y: leftIcon.y, w: extend, h: leftIcon.h };
  const rightHit = { x: B.w - B.bankW - extend, y: rightIcon.y, w: extend, h: rightIcon.h };

  const touchLeft = rectsOverlap(playerRect, leftHit);
  const touchRight = rectsOverlap(playerRect, rightHit);

  if (boatCapacity > 0 && (touchLeft || touchRight)) {
    const rescued = boatCapacity;
    score += rescued;
    boatCapacity = 0;
    updateHUD();
    const bx = touchLeft ? (leftHit.x + leftHit.w / 2) : (rightHit.x + rightHit.w / 2);
    const by = (touchLeft ? leftIcon : rightIcon).y + 8;
    showFeedbackText(`+${rescued} an toàn!`, '#2ecc71', bx, by);
    if (score >= scoreToNextLevel) showNotification();
  }

  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];
    const eRect = { x: e.x, y: e.y, w: e.el.clientWidth, h: e.el.clientHeight };
    if (rectsOverlap(playerRect, eRect)) {
      if (e.type === 'victim') {
        if (boatCapacity < maxCapacity) { // dùng maxCapacity
          boatCapacity++;
          updateHUD();
          e.el.remove(); entities.splice(i, 1);
          if (boatCapacity === maxCapacity)
            showFeedbackText('Đã đầy! Về căn cứ!', '#ffcc00', playerRect.x, Math.max(8, playerRect.y - 12));
        }
      } else {
        lives--; updateHUD();
        e.el.remove(); entities.splice(i, 1);
        gameWorld.classList.add('shake');
        setTimeout(() => gameWorld.classList.remove('shake'), 280);
        if (lives <= 0) {
          endGame("Nhiệm vụ thất bại!", "Thuyền đã hỏng do va chạm!");
          return;
        }
      }
    }
  }
}

// ==================================
function showNotification() {
  isPaused = true;
  stopLoops();
  notificationScore.textContent = score;
  notificationMessage.textContent =
    humaneMessages[Math.floor(Math.random()*humaneMessages.length)];
  scoreToNextLevel += 10;
  showScreen(notificationScreen);
  setTimeout(() => {
    if (isGameOver) return;
    isPaused = false;
    showScreen(playScreen);
    increaseDifficulty();
    startLoops();
    updateHUD();
  }, 2600);
}

// ==================================
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); tryUpgradeCapacity(); return; }    // NEW: Space
  if (k === 'spacebar') { e.preventDefault(); tryUpgradeCapacity(); return; } // IE legacy
  keysPressed[k] = true;
});
window.addEventListener('keyup', (e) => {
  keysPressed[e.key.toLowerCase()] = false;
});
document.addEventListener('DOMContentLoaded', () => {
  startButton.addEventListener('click', startGame);
  retryButton.addEventListener('click', startGame);
  showScreen(menuScreen);
});
