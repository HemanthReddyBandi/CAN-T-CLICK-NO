/* A small, dependency-free romantic prank. */
const $ = (selector) => document.querySelector(selector);
const landing = $('#landing'), loading = $('#loading'), question = $('#question'), success = $('#success');
const enterButton = $('#enter-btn'), yesButton = $('#yes-btn'), noButton = $('#no-btn');
const buttonZone = $('#button-zone');
const bubuVideo = $('#bubu-video');
const videoFrame = $('#video-frame');
const message = $('#cute-message'), particles = $('#particle-layer'), confetti = $('#confetti-layer');
const cuteMessages = ["You can't escape loving me ❤️", "I already know your answer 😌", "The No button is shy 🤭", "Nice try 😂", "This is a very serious question (not really) ✨"];
const escapeMessages = [
  '🥺 Are you sure?', '😢 Think again...', '💔 Really?', "😭 Don't break my heart...",
  "🥹 Please don't...", "👉 That's the wrong answer...", '❤️ I know you love me...',
  '🙈 You almost got me...', "🥰 Don't lie...", '😩 Come on...', '😖 Be honest...',
  '🤭 Nice try...', "😂 You'll never catch me...", '😶 Try again...',
  "🥹 Don't make me cry...", '❤️ My heart says Yes.', '😍 Your heart knows the answer.',
  '😚 Just click Yes already.', '🙃 Wrong button!', '🥺 I believe in us.'
];
let escapeCount = 0, lastEscapeMessage = '', lastPosition = null, pendingPointer = null, pointerFrame = 0;
let lastMobileEscape = 0;
const MOBILE_ESCAPE_COOLDOWN = 400;

function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(item => item.classList.remove('active'));
  screen.classList.add('active');
  document.body.classList.toggle('success-mode', screen === success);
}
function showQuestion() {
  showScreen(loading);
  setTimeout(() => {
    showScreen(question);
    resetNoButton();
  }, 1150);
}
enterButton.addEventListener('click', showQuestion);

function resetNoButton() {
  // Return it to the normal button row whenever the question is shown again.
  buttonZone.append(noButton);
  escapeCount = 0;
  lastEscapeMessage = '';
  lastPosition = null;
  lastMobileEscape = 0;
  noButton.dataset.evasive = 'false';
  noButton.style.position = 'relative';
  noButton.style.left = 'auto';
  noButton.style.top = 'auto';
  noButton.style.right = 'auto';
  noButton.style.bottom = 'auto';
  noButton.style.opacity = '1';
  noButton.style.pointerEvents = 'auto';
}

function nextEscapeMessage() {
  if (escapeCount === 2) return '🥺 Are you sure?';
  if (escapeCount === 3) return '😭 Really??';
  if (escapeCount === 4) return "💔 You're hurting me...";
  if (escapeCount === 5) return '🥹 Please click Yes...';
  const choices = escapeMessages.filter((item) => item !== lastEscapeMessage);
  return choices[Math.floor(Math.random() * choices.length)];
}

function overlaps(rectA, rectB, gap = 28) {
  return rectA.left < rectB.right + gap && rectA.right > rectB.left - gap &&
    rectA.top < rectB.bottom + gap && rectA.bottom > rectB.top - gap;
}

function pickEscapePosition(width, height) {
  const padding = 20;
  const maxX = Math.max(padding, window.innerWidth - width - padding);
  const maxY = Math.max(padding, window.innerHeight - height - padding);
  const yesRect = yesButton.getBoundingClientRect();
  let choice = { x: padding, y: padding };

  for (let attempt = 0; attempt < 70; attempt += 1) {
    const x = padding + Math.random() * (maxX - padding);
    const y = padding + Math.random() * (maxY - padding);
    const candidate = { left: x, top: y, right: x + width, bottom: y + height };
    const farFromLast = !lastPosition || Math.hypot(x - lastPosition.x, y - lastPosition.y) > 110;
    if (!overlaps(candidate, yesRect) && farFromLast) return { x, y };
    choice = { x, y };
  }
  return choice;
}

function escapeNoButton(durationOverride) {
  if (!question.classList.contains('active')) return;
  const current = noButton.getBoundingClientRect();
  const width = current.width || noButton.offsetWidth || 145;
  const height = current.height || noButton.offsetHeight || 48;

  if (noButton.dataset.evasive !== 'true') {
    // A glass card clips positioned descendants in some browsers. Moving this
    // element to body makes its fixed coordinates genuinely viewport-relative.
    document.body.append(noButton);
    noButton.dataset.evasive = 'true';
    noButton.style.position = 'fixed';
    noButton.style.left = `${current.left}px`;
    noButton.style.top = `${current.top}px`;
  }

  escapeCount += 1;
  const position = pickEscapePosition(width, height);
  const reaction = nextEscapeMessage();
  lastEscapeMessage = reaction;
  lastPosition = position;
  // This message changes on every escape; force a small re-animation so the
  // update is obvious even while the button is moving.
  message.classList.remove('message-pop');
  message.textContent = reaction;
  // Make each new reaction a little more dramatic without breaking the layout.
  message.style.fontSize = `${Math.min(1.7, 1.04 + escapeCount * 0.06)}rem`;
  message.style.opacity = '1';
  void message.offsetWidth;
  message.classList.add('message-pop');
  const speed = durationOverride ?? (escapeCount === 1 ? 430 : escapeCount === 2 ? 350 : 300);
  noButton.style.transition = `left ${speed}ms cubic-bezier(.18,.88,.25,1), top ${speed}ms cubic-bezier(.18,.88,.25,1), transform 180ms ease, box-shadow 180ms ease`;
  noButton.style.setProperty('--escape-rotation', `${-10 + Math.random() * 20}deg`);
  noButton.classList.remove('is-escaping');
  void noButton.offsetWidth;
  noButton.classList.add('is-escaping');
  requestAnimationFrame(() => {
    noButton.style.left = `${position.x}px`;
    noButton.style.top = `${position.y}px`;
  });
  setTimeout(() => noButton.classList.remove('is-escaping'), speed + 260);
}

function pointerIsClose(x, y) {
  const rect = noButton.getBoundingClientRect();
  const nearestX = Math.max(rect.left, Math.min(x, rect.right));
  const nearestY = Math.max(rect.top, Math.min(y, rect.bottom));
  return Math.hypot(x - nearestX, y - nearestY) <= 120;
}

function watchPointer(event) {
  // Touch browsers can synthesize mouse events after a tap; ignore those so
  // mobile movement is controlled solely by the debounced touch handlers.
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (!question.classList.contains('active')) return;
  pendingPointer = { x: event.clientX, y: event.clientY };
  if (pointerFrame) return;
  pointerFrame = requestAnimationFrame(() => {
    pointerFrame = 0;
    if (pendingPointer && pointerIsClose(pendingPointer.x, pendingPointer.y)) escapeNoButton();
  });
}

function watchTouch(event) {
  const touch = event.touches?.[0];
  if (!touch || !question.classList.contains('active')) return;
  if (performance.now() - lastMobileEscape < MOBILE_ESCAPE_COOLDOWN) return;
  if (pointerIsClose(touch.clientX, touch.clientY)) {
    lastMobileEscape = performance.now();
    escapeNoButton(360);
  }
}

document.addEventListener('mousemove', watchPointer, { passive: true });
document.addEventListener('touchstart', watchTouch, { passive: true });
document.addEventListener('touchmove', watchTouch, { passive: true });
noButton.addEventListener('mouseenter', () => {
  if (!window.matchMedia('(pointer: coarse)').matches) escapeNoButton();
});
noButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  if (event.pointerType === 'touch') {
    if (performance.now() - lastMobileEscape < MOBILE_ESCAPE_COOLDOWN) return;
    lastMobileEscape = performance.now();
    escapeNoButton(360);
    return;
  }
  escapeNoButton();
});
noButton.addEventListener('click', (event) => {
  event.preventDefault();
  if (window.matchMedia('(pointer: coarse)').matches) {
    if (performance.now() - lastMobileEscape >= MOBILE_ESCAPE_COOLDOWN) {
      lastMobileEscape = performance.now();
      escapeNoButton(360);
    }
    return;
  }
  escapeNoButton();
});
window.addEventListener('resize', () => { if (question.classList.contains('active') && noButton.dataset.evasive === 'true') escapeNoButton(); });

function createBackgroundHearts() {
  const layer = $('.hearts-bg');
  for (let i = 0; i < 18; i++) { const heart = document.createElement('span'); heart.className = 'bg-heart'; heart.textContent = i % 4 === 0 ? '♡' : '♥'; heart.style.left = `${Math.random() * 100}%`; heart.style.fontSize = `${14 + Math.random() * 24}px`; heart.style.animationDuration = `${8 + Math.random() * 10}s`; heart.style.animationDelay = `${-Math.random() * 18}s`; layer.append(heart); }
}
function makeParticle(x, y) { const heart = document.createElement('span'); heart.className = 'particle'; heart.textContent = Math.random() > .28 ? '♥' : '✦'; heart.style.left = `${x}px`; heart.style.top = `${y}px`; heart.style.setProperty('--x', `${(Math.random() - .5) * 46}px`); heart.style.setProperty('--y', `${-16 - Math.random() * 46}px`); particles.append(heart); setTimeout(() => heart.remove(), 900); }
let lastParticle = 0;
document.addEventListener('pointermove', (event) => { if (performance.now() - lastParticle > 55) { makeParticle(event.clientX, event.clientY); lastParticle = performance.now(); } }, { passive:true });
function launchConfetti() { const colors = ['#ff5d93','#b899ff','#ffd166','#ffffff','#7be0d6']; for (let i = 0; i < 125; i++) { const bit = document.createElement('i'); bit.className = 'confetti'; bit.style.left = `${Math.random() * 100}%`; bit.style.background = colors[i % colors.length]; bit.style.animationDuration = `${2.8 + Math.random() * 2.3}s`; bit.style.animationDelay = `${Math.random() * .75}s`; confetti.append(bit); setTimeout(() => bit.remove(), 6000); } }
yesButton.addEventListener('click', () => {
  noButton.style.opacity = '0';
  noButton.style.pointerEvents = 'none';
  showScreen(success);
  bubuVideo.currentTime = 0;
  bubuVideo.play().catch(() => {});
  launchConfetti();
  for (let i = 0; i < 34; i++) setTimeout(() => makeParticle(window.innerWidth / 2 + (Math.random()-.5)*240, window.innerHeight / 2 + (Math.random()-.5)*110), i * 28);
});
bubuVideo.addEventListener('loadedmetadata', () => {
  // The frame is 8% shorter than the original video, neatly trimming its top.
  videoFrame.style.setProperty('--video-ratio', `${bubuVideo.videoWidth / bubuVideo.videoHeight / 0.92}`);
});
createBackgroundHearts();
