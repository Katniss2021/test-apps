const GRID_SIZE = 16;
const TICK_MS = 140;
const START_LENGTH = 3;

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function createRng(seed = Date.now() % 2147483647) {
  let value = seed;
  return function rng() {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
}

function samePos(a, b) {
  return a.x === b.x && a.y === b.y;
}

function clampWrap(pos) {
  if (pos.x < 0 || pos.x >= GRID_SIZE || pos.y < 0 || pos.y >= GRID_SIZE) {
    return null;
  }
  return pos;
}

function placeFood(snake, rng) {
  const empty = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const occupied = snake.some((segment) => segment.x === x && segment.y === y);
      if (!occupied) {
        empty.push({ x, y });
      }
    }
  }
  if (empty.length === 0) {
    return null;
  }
  const index = Math.floor(rng() * empty.length);
  return empty[index];
}

function initialSnake() {
  const mid = Math.floor(GRID_SIZE / 2);
  const snake = [];
  for (let i = 0; i < START_LENGTH; i += 1) {
    snake.push({ x: mid - i, y: mid });
  }
  return snake;
}

function createInitialState(seed) {
  const rng = createRng(seed);
  const snake = initialSnake();
  return {
    seed,
    rng,
    snake,
    direction: "right",
    pendingDirection: "right",
    food: placeFood(snake, rng),
    score: 0,
    running: false,
    gameOver: false,
    paused: false,
  };
}

function applyDirection(state, nextDir) {
  if (!nextDir || state.gameOver) return state;
  const current = state.direction;
  if (
    (current === "up" && nextDir === "down") ||
    (current === "down" && nextDir === "up") ||
    (current === "left" && nextDir === "right") ||
    (current === "right" && nextDir === "left")
  ) {
    return state;
  }
  return { ...state, pendingDirection: nextDir };
}

function stepState(state) {
  if (!state.running || state.paused || state.gameOver) return state;

  const direction = state.pendingDirection;
  const delta = DIRECTIONS[direction];
  const head = state.snake[0];
  const next = clampWrap({ x: head.x + delta.x, y: head.y + delta.y });

  if (!next) {
    return { ...state, gameOver: true, running: false };
  }

  const willGrow = state.food && samePos(next, state.food);
  const nextSnake = [next, ...state.snake];
  if (!willGrow) {
    nextSnake.pop();
  }

  const hitSelf = nextSnake.slice(1).some((segment) => samePos(segment, next));
  if (hitSelf) {
    return { ...state, gameOver: true, running: false };
  }

  const food = willGrow ? placeFood(nextSnake, state.rng) : state.food;
  const score = willGrow ? state.score + 1 : state.score;

  return {
    ...state,
    snake: nextSnake,
    direction,
    food,
    score,
  };
}

function createGrid(container) {
  container.innerHTML = "";
  const cells = [];
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    container.appendChild(cell);
    cells.push(cell);
  }
  return cells;
}

function render(state, cells, scoreEl, statusEl) {
  cells.forEach((cell) => {
    cell.className = "cell";
  });

  if (state.food) {
    const foodIndex = state.food.y * GRID_SIZE + state.food.x;
    cells[foodIndex].classList.add("food");
  }

  state.snake.forEach((segment, index) => {
    const cellIndex = segment.y * GRID_SIZE + segment.x;
    cells[cellIndex].classList.add("snake");
    if (index === 0) {
      cells[cellIndex].classList.add("head");
    }
  });

  scoreEl.textContent = String(state.score);

  if (state.gameOver) {
    statusEl.textContent = "Game over. Press Restart or R to play again.";
  } else if (state.paused) {
    statusEl.textContent = "Paused. Press Space to resume.";
  } else if (!state.running) {
    statusEl.textContent = "Press any arrow key to start.";
  } else {
    statusEl.textContent = "";
  }
}

(function init() {
  const gridEl = document.getElementById("grid");
  const scoreEl = document.getElementById("score");
  const statusEl = document.getElementById("status");
  const restartBtn = document.getElementById("restart");
  const controlButtons = document.querySelectorAll("[data-dir]");

  let state = createInitialState();
  const cells = createGrid(gridEl);

  function restart() {
    state = createInitialState();
    render(state, cells, scoreEl, statusEl);
  }

  function startIfNeeded() {
    if (!state.running && !state.gameOver) {
      state = { ...state, running: true };
    }
  }

  function handleDirection(dir) {
    startIfNeeded();
    state = applyDirection(state, dir);
    render(state, cells, scoreEl, statusEl);
  }

  function togglePause() {
    if (state.gameOver) return;
    if (!state.running) {
      state = { ...state, running: true };
    }
    state = { ...state, paused: !state.paused };
    render(state, cells, scoreEl, statusEl);
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["arrowup", "w"].includes(key)) handleDirection("up");
    if (["arrowdown", "s"].includes(key)) handleDirection("down");
    if (["arrowleft", "a"].includes(key)) handleDirection("left");
    if (["arrowright", "d"].includes(key)) handleDirection("right");
    if (key === "r") restart();
    if (key === " ") togglePause();
  });

  restartBtn.addEventListener("click", restart);

  controlButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const dir = button.dataset.dir;
      handleDirection(dir);
    });
  });

  setInterval(() => {
    state = stepState(state);
    render(state, cells, scoreEl, statusEl);
  }, TICK_MS);

  render(state, cells, scoreEl, statusEl);
})();

// Expose logic for potential tests.
window.__snake = {
  createInitialState,
  stepState,
  applyDirection,
  placeFood,
  createRng,
};
