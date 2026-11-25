'use strict';

const byId = id => document.getElementById(id);
const scene = byId('scene');
const fridge = byId('fridge');
const door = byId('door');
const shelves = byId('shelves');
const catLayer = byId('cat-layer');
const cat = byId('cat');
const shadow = byId('cat-shadow');
const carriedFood = byId('carried-food');
const effects = byId('effects');
const turn = byId('turn');
const prompt = byId('prompt');
const hint = byId('hint');
const answerImage = byId('answer-image');
const progressText = byId('progress-text');
const progressTrack = byId('progress-track');
const play = byId('play');
const reset = byId('reset');
const sound = byId('sound');
const musicButton = byId('music');
const music = byId('music-track');
const full = byId('fullscreen');
const modeButtons = [...document.querySelectorAll('.mode')];
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const hoverPreference = matchMedia('(any-hover: hover)');
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

const asset = item => './assets/food-' + item.id + '.webp';
const phrase = item => (item.amount ?? 'a') + ' ' + item.name;
const missingSentence = item => "We haven’t got " + (item.amount === 'some' ? 'any ' + item.name : phrase(item)) + '.';
const shelfY = [38.4, 61.8, 85.5];
const itemsPerShelf = 4;
let mode = 'grammar';
let busy = true;
let labelledSlot = null;

function newRound(items) {
  const deck = [...items];
  for (let i = deck.length - 1; i > 0; i--) {
    const chosen = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[chosen]] = [deck[chosen], deck[i]];
  }
  return { deck, removed: new Set(), target: null, phase: 'look' };
}

const rounds = {
  grammar: newRound(FOOD.grammar),
  containers: newRound(FOOD.containers),
};
const currentRound = () => rounds[mode];
const catPerch = () => Number.parseFloat(getComputedStyle(scene).getPropertyValue('--cat-perch')) || 79;

function setIcon(element, name) {
  element.setAttribute('href', '#i-' + name);
}

function showFoodLabel(slot = null) {
  if (slot && (shelves.inert || slot.disabled)) return;
  labelledSlot?.classList.remove('show-label');
  labelledSlot = slot;
  if (!slot) return;

  const image = slot.firstElementChild;
  if (image.naturalWidth) {
    const fittedHeight = Math.min(image.clientHeight, image.clientWidth * image.naturalHeight / image.naturalWidth);
    slot.style.setProperty('--food-art-height', 100 * fittedHeight / slot.clientHeight + '%');
  }
  slot.classList.add('show-label');
}

function updateShelfInteraction() {
  shelves.inert = busy || shelves.getAttribute('aria-hidden') === 'true';
  if (shelves.inert) showFoodLabel();
}

function setBusy(value) {
  busy = value;
  updateShelfInteraction();
  for (const control of [play, reset, ...modeButtons]) {
    control.setAttribute('aria-disabled', String(value));
  }
}

function setTurn(title, detail, icon, action, actionIcon, phase, answer) {
  turn.dataset.phase = phase;
  prompt.textContent = title;
  hint.textContent = detail;
  setIcon(byId('turn-icon'), icon);
  setIcon(byId('action-icon'), actionIcon);
  byId('action-text').textContent = action;
  answerImage.hidden = !answer;
  if (answer) answerImage.src = asset(answer);
}

function showProgress(round) {
  const total = FOOD[mode].length;
  const count = round.removed.size;
  progressText.textContent = count ? count + ' of ' + total + ' missing' : total + ' in the fridge';
  progressTrack.replaceChildren(...Array.from({ length: total }, (_, i) => {
    const mark = document.createElement('span');
    if (i < count) mark.classList.add('done');
    return mark;
  }));
}

function mountShelves() {
  showFoodLabel();
  const items = FOOD[mode];
  const lastShelf = shelfY.length - 1;
  shelves.replaceChildren(...items.map((item, index) => {
    const shelf = Math.min(Math.floor(index / itemsPerShelf), lastShelf);
    const shelfStart = shelf * itemsPerShelf;
    const columns = shelf === lastShelf ? items.length - shelfStart : itemsPerShelf;
    const column = index - shelfStart;
    const centre = 7.3 + (column + 0.5) * 85.4 / columns;

    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot';
    slot.dataset.item = item.id;
    slot.style.setProperty('--x', centre + '%');
    slot.style.setProperty('--y', shelfY[shelf] + '%');
    slot.style.setProperty('--slot-width', 84 / columns + '%');
    slot.style.setProperty('--size', item.width + '%');
    const image = new Image();
    image.src = asset(item);
    image.alt = item.name;
    image.draggable = false;
    const label = document.createElement('span');
    label.className = 'food-label';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = item.name;
    slot.append(image, label);

    slot.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') showFoodLabel(slot);
    });
    slot.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'touch' && labelledSlot === slot && !slot.matches(':focus-visible')) {
        showFoodLabel();
      }
    });
    slot.addEventListener('focus', () => {
      if (slot.matches(':focus-visible')) showFoodLabel(slot);
    });
    slot.addEventListener('blur', () => {
      if (labelledSlot === slot) showFoodLabel();
    });
    slot.addEventListener('click', event => {
      const tap = event.pointerType === 'touch' || (!event.pointerType && !hoverPreference.matches);
      if (tap || event.detail === 0) showFoodLabel(labelledSlot === slot ? null : slot);
    });

    return slot;
  }));
}

function showShelves(round, latest = null) {
  for (const slot of shelves.children) {
    const id = slot.dataset.item;
    const removed = round.removed.has(id);
    slot.disabled = removed;
    slot.firstElementChild.hidden = removed;
    slot.classList.toggle('latest', id === latest);
  }
}

function coverFridge(covered) {
  shelves.setAttribute('aria-hidden', String(covered));
  scene.dataset.covered = String(covered);
  updateShelfInteraction();
}

function placeCat({ x, y = 92.3, opacity = 1 }) {
  cat.style.left = x + '%';
  cat.style.top = y + '%';
  cat.style.opacity = opacity;
  shadow.style.left = x + '%';
  shadow.style.opacity = opacity;
}

function showLook() {
  setTurn(
    'What’s in the fridge?',
    mode === 'grammar' ? 'Look closely. Say what you can see.' : 'Look closely. Name each container and its food.',
    'eye',
    'Let the cat in!',
    'paw',
    'look',
  );
  if (mode === 'grammar') {
    const frame = document.createElement('strong');
    frame.textContent = ' We’ve got …';
    hint.append(frame);
  }
}

function showGuess() {
  setTurn(
    'What’s missing?',
    mode === 'grammar' ? 'Say your guess. Try “We haven’t got …”' : 'Say the full phrase. Name the container and the food.',
    'guess',
    'Open the fridge',
    'fridge',
    'guess',
  );
}

function showAnswer(round) {
  const item = round.target;
  const empty = round.deck.length === 0;
  const sentence = mode === 'grammar' ? missingSentence(item) : 'The cat took ' + phrase(item) + '.';
  setTurn(
    phrase(item),
    sentence + (empty ? ' The fridge is empty!' : ''),
    'fridge',
    empty ? 'Refill the fridge' : 'One more!',
    empty ? 'refill' : 'paw',
    'reveal',
    item,
  );
}

function renderRound() {
  const round = currentRound();
  mountShelves();
  showShelves(round, round.phase === 'reveal' ? round.target.id : null);
  showProgress(round);

  const guessing = round.phase === 'guess';
  door.dataset.position = guessing ? 'closed' : 'open';
  coverFridge(guessing);
  scene.dataset.beat = round.phase;
  carriedFood.hidden = true;
  cat.dataset.direction = 'left';
  cat.dataset.pose = 'sit';
  placeCat({ x: catPerch(), opacity: round.phase === 'look' ? 1 : 0 });

  if (guessing) showGuess();
  else if (round.phase === 'reveal') showAnswer(round);
  else showLook();
}

async function moveCat(frames, duration, easing = 'linear') {
  const actorFrames = frames.map(frame => ({
    left: frame.x + '%',
    top: (frame.y ?? 92.3) + '%',
    opacity: frame.opacity ?? 1,
    offset: frame.offset,
  }));
  const shadowFrames = frames.map(frame => ({
    left: frame.x + '%',
    opacity: frame.shadow ?? frame.opacity ?? 1,
    scale: frame.shadowScale ?? 1,
    offset: frame.offset,
  }));
  const actorAnimation = cat.animate(actorFrames, { duration, easing, fill: 'forwards' });
  const shadowAnimation = shadow.animate(shadowFrames, { duration, easing, fill: 'forwards' });
  await actorAnimation.finished;
  placeCat(frames.at(-1));
  actorAnimation.cancel();
  shadowAnimation.cancel();
}

function showPose(pose) {
  cat.dataset.pose = pose;
}

async function posesDuring(cues) {
  let previous = 0;
  for (const [time, pose] of cues) {
    await sleep(time - previous);
    showPose(pose);
    previous = time;
  }
}

function dust(x, y) {
  for (let i = 0; i < 4; i++) {
    const cloud = document.createElement('i');
    cloud.className = 'puff';
    cloud.style.setProperty('--puff-x', x - i * .68 + '%');
    cloud.style.setProperty('--puff-y', y + i * .32 + '%');
    cloud.style.setProperty('--puff-size', 1.8 + i * .51 + 'cqh');
    effects.append(cloud);
    const drift = cloud.animate([
      { transform: 'translate(0, 0) scale(.42)', opacity: .12 },
      { transform: 'translate(-.45rem, -.31rem) scale(.88)', opacity: .82, offset: .26 },
      { transform: 'translate(-1.4rem, -.78rem) scale(1.25)', opacity: 0 },
    ], { duration: 410 + i * 48, delay: i * 25, easing: 'ease-out' });
    drift.finished.then(() => cloud.remove());
  }
}

function twinkle() {
  for (const [x, y, delay] of [[44, 18, 10], [65, 24, 100], [67, 38, 155]]) {
    const star = document.createElement('i');
    star.className = 'spark';
    star.style.setProperty('--spark-x', x + '%');
    star.style.setProperty('--spark-y', y + '%');
    effects.append(star);
    const glint = star.animate([
      { opacity: 0, scale: .25, transform: 'translateY(.65rem) rotate(1deg)' },
      { opacity: 1, scale: 1.1, offset: .4 },
      { opacity: 0, scale: .75, transform: 'translateY(-1.1rem) rotate(26deg)' },
    ], { duration: 530, delay, easing: 'ease-out' });
    glint.finished.then(() => star.remove());
  }
}

async function enterFridge() {
  const returning = cat.style.opacity === '0';
  const perch = catPerch();
  cat.dataset.direction = 'left';
  if (returning) {
    showPose('reach');
    await Promise.all([
      moveCat([{ x: 112 }, { x: perch }], 410, 'ease-out'),
      posesDuring([[115, 'tuck'], [224, 'stretch'], [335, 'crouch']]),
    ]);
  }
  playSound('sneak');
  showPose('crouch');
  await moveCat([{ x: perch }, { x: 72, y: 92.1 }], 485, 'cubic-bezier(.2,.55,.37,1)');
  await sleep(95);

  playSound('jump');
  showPose('leap');
  dust(71, 91);
  const closeAtLanding = sleep(290).then(() => {
    door.dataset.position = 'closed';
  });
  await Promise.all([
    moveCat([
      { x: 72, y: 92.1, shadow: 1 },
      { x: 68, y: 68, shadow: .5, shadowScale: .7, offset: .31 },
      { x: 62, y: 53, shadow: .27, shadowScale: .55, offset: .63 },
      { x: 54, y: 59, opacity: 0, shadow: 0 },
    ], 580, 'cubic-bezier(.37,.43,.45,1)'),
    closeAtLanding,
  ]);
  playSound('thump');
  await sleep(330);
  coverFridge(true);
}

async function rattleFridge() {
  playSound('rattle');
  await fridge.animate([
    { transform: 'translateX(0) rotate(0deg)' },
    { transform: 'translateX(-5px) rotate(-2deg)', offset: .13 },
    { transform: 'translateX(7px) rotate(2.8deg)', offset: .26 },
    { transform: 'translateX(-6px) rotate(-2.4deg)', offset: .4 },
    { transform: 'translateX(5px) rotate(2deg)', offset: .53 },
    { transform: 'translateX(-4px) rotate(-1.4deg)', offset: .68 },
    { transform: 'translateX(3px) rotate(.9deg)', offset: .82 },
    { transform: 'translateX(0) rotate(0deg)' },
  ], { duration: 600, easing: 'ease-in-out' }).finished;
}

function prepareEscape(item) {
  const sceneBounds = scene.getBoundingClientRect();
  const edge = (fridge.getBoundingClientRect().right - sceneBounds.left) / sceneBounds.width * 100;
  const catWidth = cat.getBoundingClientRect().width / sceneBounds.width * 100;
  // The cabinet hides the cat and its food until they pass the right edge.
  catLayer.style.clipPath = `inset(0 0 0 ${edge}%)`;
  carriedFood.src = asset(item);
  carriedFood.hidden = false;
  cat.dataset.direction = 'right';
  showPose('stretch');
  return { edge, catWidth };
}

async function runAway(item) {
  door.dataset.position = 'ajar';
  playSound('creak');
  await sleep(176);

  const { edge, catWidth } = prepareEscape(item);
  const spaceToRun = 100 - edge;
  playSound('scamper');
  const closeAfterEscape = sleep(595).then(() => {
    door.dataset.position = 'closed';
  });
  const kickUpDust = sleep(375).then(() => dust(edge + spaceToRun * .23, 90));

  await Promise.all([
    moveCat([
      { x: edge - catWidth * .72, y: 77, shadow: 0 },
      { x: edge - catWidth * .20, y: 75.5, shadow: .18, offset: .19 },
      { x: edge + spaceToRun * .11, y: 83, shadow: .42, offset: .34 },
      { x: edge + spaceToRun * .28, y: 92, shadow: 1, offset: .48 },
      { x: edge + spaceToRun * .54, y: 88.5, shadow: .7, offset: .63 },
      { x: edge + spaceToRun * .80, y: 92.4, shadow: 1, offset: .81 },
      { x: 100 + catWidth * .64, y: 89, opacity: 0, shadow: 0 },
    ], 1030, 'cubic-bezier(.34,.52,.52,1)'),
    posesDuring([[210, 'tuck'], [333, 'reach'], [451, 'stretch'], [556, 'tuck'], [660, 'reach'], [772, 'stretch'], [890, 'tuck']]),
    closeAfterEscape,
    kickUpDust,
  ]);
  carriedFood.hidden = true;
}

async function reducedTheft(item) {
  cat.dataset.direction = 'left';
  showPose('leap');
  placeCat({ x: 66, y: 77 });
  await sleep(260);
  placeCat({ x: 58, opacity: 0 });
  door.dataset.position = 'closed';
  coverFridge(true);
  playSound('thump');
  await sleep(340);
  door.dataset.position = 'ajar';
  const { edge, catWidth } = prepareEscape(item);
  placeCat({ x: edge - catWidth * .16, y: 92 });
  await sleep(870);
  placeCat({ x: 111, opacity: 0 });
  carriedFood.hidden = true;
  door.dataset.position = 'closed';
}

async function steal() {
  const round = currentRound();
  round.target = round.deck.pop();
  setBusy(true);
  showShelves(round);
  scene.dataset.beat = 'theft';
  setTurn('Here comes the cat!', 'Watch what it takes.', 'eye', 'Watch the cat', 'paw', 'watch');

  try {
    if (motionPreference.matches) {
      await reducedTheft(round.target);
    } else {
      await enterFridge();
      await rattleFridge();
      await runAway(round.target);
    }
  } finally {
    placeCat({ x: 113, opacity: 0 });
    catLayer.style.removeProperty('clip-path');
    carriedFood.hidden = true;
    door.dataset.position = 'closed';
    coverFridge(true);
    round.phase = 'guess';
    scene.dataset.beat = 'guess';
    showGuess();
    setBusy(false);
  }
}

async function reveal() {
  const round = currentRound();
  setBusy(true);
  round.removed.add(round.target.id);
  showShelves(round, round.target.id);
  door.dataset.position = 'open';
  coverFridge(false);
  playSound('open');
  if (!motionPreference.matches) twinkle();
  await sleep(motionPreference.matches ? 110 : 545);
  round.phase = 'reveal';
  scene.dataset.beat = 'reveal';
  showProgress(round);
  showAnswer(round);
  setBusy(false);
}

function refill() {
  rounds[mode] = newRound(FOOD[mode]);
  renderRound();
  playSound('refill');
}

function getSoundPreference() {
  try { return localStorage.getItem('fridge-bandit-sound') === 'on'; }
  catch { return false; }
}

let soundOn = getSoundPreference();
let audio = null;

function updateSoundControl() {
  sound.setAttribute('aria-pressed', String(soundOn));
  sound.title = soundOn ? 'Turn sound effects off' : 'Turn sound effects on';
  setIcon(sound.querySelector('use'), soundOn ? 'sound' : 'mute');
}

function updateMusicControl() {
  const playing = !music.paused;
  musicButton.setAttribute('aria-pressed', String(playing));
  musicButton.title = playing ? 'Turn music off' : 'Turn music on';
  setIcon(musicButton.querySelector('use'), playing ? 'music' : 'music-off');
}

function prepareAudio() {
  if (!soundOn) return;
  const Context = window.AudioContext ?? window.webkitAudioContext;
  if (!Context) return;
  try {
    audio ??= new Context();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
  } catch {
    audio = null;
  }
}

function tone({ from, to, volume, length, delay = 0, kind = 'sine' }) {
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const envelope = audio.createGain();
  osc.type = kind;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + length);
  envelope.gain.setValueAtTime(.001, start);
  envelope.gain.linearRampToValueAtTime(volume, start + .018);
  envelope.gain.exponentialRampToValueAtTime(.001, start + length);
  osc.connect(envelope).connect(audio.destination);
  osc.start(start);
  osc.stop(start + length + .01);
}

const sounds = {
  sneak: [{ from: 215, to: 129, volume: .041, length: .13 }, { from: 254, to: 168, volume: .038, length: .12, delay: .17 }],
  jump: [{ from: 225, to: 485, volume: .058, length: .24, kind: 'triangle' }],
  thump: [{ from: 155, to: 48, volume: .15, length: .19, kind: 'triangle' }],
  rattle: [0, .11, .22, .35, .47].map((delay, i) => ({ from: 105 + 19 * (i % 2), to: 55, volume: .096 - i * .009, length: .13, delay, kind: 'triangle' })),
  creak: [{ from: 265, to: 421, volume: .045, length: .14, kind: 'triangle' }],
  scamper: [.09, .21, .34, .48, .63].map((delay, i) => ({ from: 178 + 16 * i, to: 78, volume: .064 - i * .007, length: .09, delay, kind: 'triangle' })),
  open: [{ from: 389, to: 440, volume: .052, length: .22 }, { from: 585, to: 630, volume: .047, length: .27, delay: .12 }],
  refill: [{ from: 370, to: 416, volume: .055, length: .19 }, { from: 496, to: 540, volume: .044, length: .17, delay: .1 }],
};

function playSound(name) {
  if (soundOn && audio?.state === 'running') sounds[name].forEach(tone);
}

document.addEventListener('pointerdown', event => {
  if (labelledSlot && !shelves.contains(event.target)) showFoodLabel();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') showFoodLabel();
});

for (const button of modeButtons) {
  button.addEventListener('click', () => {
    if (busy || mode === button.dataset.mode) return;
    mode = button.dataset.mode;
    for (const option of modeButtons) {
      option.setAttribute('aria-pressed', String(option.dataset.mode === mode));
    }
    renderRound();
  });
}

play.addEventListener('click', async () => {
  if (busy) return;
  prepareAudio();
  const round = currentRound();
  try {
    if (round.phase === 'guess') await reveal();
    else if (round.deck.length) await steal();
    else refill();
  } catch (error) {
    console.error('Could not play the animation.', error);
  }
});

reset.addEventListener('click', () => {
  if (busy) return;
  prepareAudio();
  refill();
});

sound.addEventListener('click', async () => {
  soundOn = !soundOn;
  try { localStorage.setItem('fridge-bandit-sound', soundOn ? 'on' : 'off'); } catch {}
  updateSoundControl();
  if (soundOn) {
    prepareAudio();
    if (audio) await audio.resume().catch(() => {});
    playSound('open');
  } else if (audio?.state === 'running') {
    audio.suspend().catch(() => {});
  }
});

musicButton.addEventListener('click', () => {
  if (music.paused) music.play().catch(updateMusicControl);
  else music.pause();
});
music.addEventListener('play', updateMusicControl);
music.addEventListener('pause', updateMusicControl);

if (!document.fullscreenEnabled) full.hidden = true;
full.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    full.setAttribute('aria-pressed', 'false');
  }
});
document.addEventListener('fullscreenchange', () => {
  const active = Boolean(document.fullscreenElement);
  full.setAttribute('aria-pressed', String(active));
  full.title = active ? 'Exit full screen' : 'Full screen';
  setIcon(full.querySelector('use'), active ? 'exit' : 'full');
});

function preload(path) {
  const image = new Image();
  return new Promise(resolve => {
    image.onload = resolve;
    image.onerror = resolve;
    image.src = path;
  });
}

updateSoundControl();
renderRound();
const actorImages = [...scene.querySelectorAll('img[src]')];
Promise.all([
  ...actorImages.map(image => image.decode().catch(() => {})),
  ...Object.values(FOOD).flat().map(item => preload(asset(item))),
]).then(() => {
  document.querySelector('.game').dataset.ready = 'true';
  setBusy(false);
});
