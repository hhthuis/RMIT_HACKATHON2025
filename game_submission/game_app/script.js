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
let missedCount = 0;
let lives = 3;

let isGameOver = false;
let isPaused = false;

const MAX_CAPACITY = 3;
const MAX_MISSED = 3;

let playerPos = { x: 0, y: 0 };      // tính theo toạ độ nội bộ của gameWorld
let playerSpeed = 0;                  // sẽ set theo kích thước khung để responsive
const keysPressed = Object.create(null);

let entities = [];                    // {type:'victim'|'obstacle', x,y,speed, el}
let gameSpeed = 1.0;
let spawnRate = 1200;
let scoreToNextLevel = 10;
let obstacleChance = 0.4;

let rafId = null;
let spawnInterval = null;

const humaneMessages = [
  "Lòng tốt của bạn sưởi ấm những trái tim.",
  "Hành động nhỏ, ý nghĩa lớn.",
  "Sự sẻ chia làm nên sức mạnh cộng đồng.",
  "Bạn đang viết nên câu chuyện về tình người.",
  "Hy vọng được thắp lên từ những chuyến đò.",
  "Giúp đỡ nhau vượt qua khó khăn!",
  "Mỗi người an toàn là một niềm vui lớn.",
];

// ==================================
// Tiện ích kích thước
// ==================================
function bounds() {
  return {
    w: gameWorld.clientWidth,
    h: gameWorld.clientHeight,
    bankW: leftBank.clientWidth,  // = rightBank.clientWidth
    boatW: playerBoat.clientWidth,
    boatH: playerBoat.clientHeight,
    entitySize: Math.max(1, Math.floor(gameWorld.clientWidth * 0.05)),
  };
}

// ==================================
// Màn hình
// ==================================
function showScreen(screen) {
  [menuScreen, playScreen, gameOverScreen, notificationScreen]
    .forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

// ==================================
// Khởi tạo & reset
// ==================================
function startGame() {
  isGameOver = false;
  isPaused = false;
  score = 0;
  boatCapacity = 0;
  missedCount = 0;
  lives = 3;

  gameSpeed = 1.0;
  spawnRate = 1200;
  scoreToNextLevel = 10;
  obstacleChance = 0.4;

  // dọn entity cũ
  entities.forEach(e => e.el.remove());
  entities = [];

  // 1) show trước để đo kích thước chính xác
  showScreen(playScreen);

  // 2) đợi 1 frame rồi set vị trí/tham số
  requestAnimationFrame(() => {
    const B = bounds();

    // GIẢM TỐC THUYỀN (êm tay hơn)
    const sp = Math.round(B.w * 0.008);           // trước là 0.012
    playerSpeed = Math.min(6, Math.max(3, sp));   // kẹp 3..6

    // đặt giữa đáy
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
// Vòng lặp
// ==================================
function tick() {
  if (!isGameOver && !isPaused) {
    gameLoop();
  }
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
// HUD & Feedback
// ==================================
function updateHUD() {
  scoreDisplay.textContent = score;
  capacityDisplay.textContent = `${boatCapacity} / ${MAX_CAPACITY}`;
  missedDisplay.textContent = `${missedCount} / ${MAX_MISSED}`;
  livesDisplay.textContent = lives;

  capacityDisplay.classList.toggle('full', boatCapacity >= MAX_CAPACITY);
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
  gameSpeed += 0.12;
  spawnRate = Math.max(450, Math.floor(spawnRate * 0.9));
  obstacleChance = Math.min(0.72, obstacleChance + 0.05);

  clearInterval(spawnInterval);
  spawnInterval = setInterval(spawnEntity, spawnRate);

  showFeedbackText('NGUY HIỂM HƠN!', '#ff3b30', bounds().w / 2, bounds().h * 0.35);
}

// ==================================
// Di chuyển & Vẽ
// ==================================
function movePlayer() {
  const B = bounds();
  let nx = playerPos.x;
  let ny = playerPos.y;

  if (keysPressed['arrowup'] || keysPressed['w']) ny -= playerSpeed;
  if (keysPressed['arrowdown'] || keysPressed['s']) ny += playerSpeed;
  if (keysPressed['arrowleft'] || keysPressed['a']) nx -= playerSpeed;
  if (keysPressed['arrowright'] || keysPressed['d']) nx += playerSpeed;

  // giới hạn trong sông
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
// Entities
// ==================================
function spawnEntity() {
  if (isGameOver || isPaused) return;

  const B = bounds();
  const isVictim = Math.random() > obstacleChance;

  const el = document.createElement('div');
  el.className = 'entity';
  const e = {
    type: isVictim ? 'victim' : 'obstacle',
    x: 0, y: 0,
    speed: 0,
    el
  };

  if (isVictim) {
    el.textContent = '🧑‍🤝‍🧑';
    e.speed = (2 + Math.random() * 2) * gameSpeed;
  } else {
    el.textContent = Math.random() > 0.5 ? '🪨' : '🌳';
    e.speed = (3 + Math.random() * 3) * gameSpeed;
  }

  // spawn trong lòng sông giữa hai bờ
  const minX = B.bankW;
  const maxX = B.w - B.bankW - B.entitySize;
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
        if (missedCount >= MAX_MISSED) {
          endGame("Nhiệm vụ thất bại!", "Bạn đã để lỡ quá nhiều người.");
        }
      }
    }
  }
}

// ==================================
// Va chạm
// ==================================
function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function handleCollisions() {
  const B = bounds();
  const playerRect = { x: playerPos.x, y: playerPos.y, w: B.boatW, h: B.boatH };

  // Chạm căn cứ → thả người
  const leftRect = {
    x: safeZoneLeft.offsetLeft, y: safeZoneLeft.offsetTop,
    w: safeZoneLeft.offsetWidth, h: safeZoneLeft.offsetHeight
  };
  const rightRect = {
    x: safeZoneRight.offsetLeft, y: safeZoneRight.offsetTop,
    w: safeZoneRight.offsetWidth, h: safeZoneRight.offsetHeight
  };

  const touchingBase = rectsOverlap(playerRect, leftRect) || rectsOverlap(playerRect, rightRect);
  if (boatCapacity > 0 && touchingBase) {
    const rescued = boatCapacity;
    score += rescued;
    boatCapacity = 0;
    updateHUD();

    const bx = touchingBase && rectsOverlap(playerRect, leftRect)
      ? leftRect.x + leftRect.w / 2
      : rightRect.x + rightRect.w / 2;
    const by = leftRect.y + 8;

    showFeedbackText(`+${rescued} an toàn!`, '#2ecc71', bx, by);

    if (score >= scoreToNextLevel) {
      showNotification(); // ✅ đã sửa đúng hàm
    }
  }

  // Chạm với victim/obstacle
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];
    const eRect = { x: e.x, y: e.y, w: e.el.clientWidth, h: e.el.clientHeight };

    if (rectsOverlap(playerRect, eRect)) {
      if (e.type === 'victim') {
        if (boatCapacity < MAX_CAPACITY) {
          boatCapacity++;
          updateHUD();
          e.el.remove();
          entities.splice(i, 1);
          if (boatCapacity === MAX_CAPACITY) {
            showFeedbackText('Đã đầy! Về căn cứ!', '#ffcc00', playerRect.x, Math.max(8, playerRect.y - 12));
          }
        }
      } else { // obstacle
        // tách mạng thuyền khỏi missed người
        lives--;
        updateHUD();
        e.el.remove();
        entities.splice(i, 1);

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
// Notification & tăng độ khó
// ==================================
function showNotification() {
  isPaused = true;
  stopLoops();

  notificationScore.textContent = score;
  notificationMessage.textContent =
    humaneMessages[Math.floor(Math.random()*humaneMessages.length)];

  // mốc tiếp theo
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
// Input
// ==================================
window.addEventListener('keydown', (e) => {
  keysPressed[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
  keysPressed[e.key.toLowerCase()] = false;
});

document.addEventListener('DOMContentLoaded', () => {
  startButton.addEventListener('click', startGame);
  retryButton.addEventListener('click', startGame);
  showScreen(menuScreen);
});
