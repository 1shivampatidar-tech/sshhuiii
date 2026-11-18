const story = {
  awakening: {
    location: "station", chapter: 1, title: "You wake to static.",
    text: ["The station is dark, except for the pale square of a control screen.", "On it, a message repeats: <em>DO NOT ANSWER THE SIGNAL.</em>"],
    choices: [
      { text: "Search the control desk", next: "desk" },
      { text: "Follow the green emergency lights", next: "server" }
    ]
  },
  desk: {
    location: "station", chapter: 1, title: "A useful mistake.",
    text: ["Inside the unlocked drawer you find a <em>hand scanner</em> and a photograph of yourself.", "It was taken yesterday. Your hands are red in it. You do not remember yesterday."],
    effect: { add: "Hand scanner" }, choices: [
      { text: "Go to the server room", next: "server" },
      { text: "Enter the observatory", next: "observatory" }
    ]
  },
  server: {
    location: "server", chapter: 2, title: "The machines remember.",
    text: ["Hundreds of cooling fans have stopped. The last active terminal is open to a log dated 03:17.", "The final entry reads: <em>Subject SSHHUIII has opened the channel.</em>"],
    choices: [
      { text: "Read the archive next", next: "archive", requires: "Hand scanner" },
      { text: "Use the terminal's maintenance port", next: "maintenance" },
      { text: "Climb toward the observatory", next: "observatory" }
    ]
  },
  maintenance: {
    location: "server", chapter: 2, title: "A door beneath the noise.",
    text: ["The maintenance port accepts your hand without asking a question.", "A hidden terminal prints a route and one instruction: <em>recover the keycard before the signal wakes.</em>"],
    effect: { add: "Maintenance route" }, choices: [
      { text: "Search the archive", next: "archive" },
      { text: "Return to the main station", next: "awakening" }
    ]
  },
  observatory: {
    location: "observatory", chapter: 3, title: "The sky is watching.",
    text: ["A circular window opens onto a sky full of impossible stars.", "One star blinks. Not every few seconds. It blinks when you do."],
    choices: [
      { text: "Study the telescope controls", next: "telescope" },
      { text: "Descend to the archive", next: "archive" }
    ]
  },
  telescope: {
    location: "observatory", chapter: 3, title: "The message is a map.",
    text: ["The telescope resolves the blinking star into a simple pattern.", "It describes three rooms, a keycard, and the word <em>LISTEN</em>. You find an old <em>red keycard</em> in the lens housing."],
    effect: { add: "Red keycard" }, choices: [
      { text: "Use the keycard in the archive", next: "archive" },
      { text: "Return to the observatory window", next: "observatory" }
    ]
  },
  archive: {
    location: "archive", chapter: 4, title: "You are the experiment.",
    text: ["Rows of vitrines contain objects removed from the station: a blue coat, a radio, an empty photograph frame.", "In the final vitrine, a reel is labeled <em>YOUR ORIGINAL SIGNAL.</em>"],
    choices: [
      { text: "Insert the reel and listen", next: "listen", requires: "Red keycard" },
      { text: "Force the vitrine open", next: "listen" },
      { text: "Go back to the station", next: "awakening" }
    ]
  },
  listen: {
    location: "archive", chapter: 5, title: "There is no outside.",
    text: ["The tape begins with silence. Then your own voice speaks.", "<em>We are trapped inside the signal. The station is only our memory of a place. There is no way out unless the voice becomes its own listener.</em>"],
    effect: { add: "Original tape" }, choices: [
      { text: "Take the tape to the signal chamber", next: "signal" },
      { text: "Review the station log", next: "server" }
    ]
  },
  signal: {
    location: "signal", chapter: 6, title: "The final transmission.",
    text: ["The chamber is made entirely of mirrors. A figure stands beyond every reflection, wearing your face.", "The recorder waits. The figure holds out a hand and asks, <em>Will you listen?</em>"],
    choices: [
      { text: "Play the original tape", next: "endingTruth", requires: "Original tape" },
      { text: "Answer the voice", next: "endingLoop" },
      { text: "Destroy the recorder", next: "endingBreak" }
    ]
  },
  endingTruth: {
    location: "signal", chapter: 7, title: "The silence remembers you.",
    text: ["Your voice fills the chamber. Every copy of you turns toward the speakers.", "The mirrors go dark. Somewhere beyond the station, a door opens.", "<em>ENDING: THE LISTENER</em>"],
    choices: [{ text: "Begin again", next: "awakening", reset: true }]
  },
  endingLoop: {
    location: "signal", chapter: 8, title: "The voice answers itself.",
    text: ["You say hello.", "You hear hello from everywhere.", "A control screen wakes in a dark room. It displays: <em>DO NOT ANSWER THE SIGNAL.</em>", "<em>ENDING: THE ECHO</em>"],
    choices: [{ text: "Begin again", next: "awakening", reset: true }]
  },
  endingBreak: {
    location: "signal", chapter: 8, title: "Static becomes weather.",
    text: ["The recorder cracks. The chamber fills with warm light.", "The mirrors are gone. Only a wide, open sky remains.", "<em>ENDING: THE SILENCE</em>"],
    choices: [{ text: "Begin again", next: "awakening", reset: true }]
  }
};

let state = { node: "awakening", inventory: [], visited: [], chapterProgress: 0 };

const storyContent = document.getElementById("storyContent");
const choices = document.getElementById("choices");
const locationName = document.getElementById("locationName");
const chapterLabel = document.getElementById("chapterLabel");
const progressLabel = document.getElementById("progressLabel");
const inventoryList = document.getElementById("inventoryList");

function hasItem(item) { return state.inventory.includes(item); }

function render() {
  const scene = story[state.node];
  if (!scene) return;
  if (!state.visited.includes(scene.location)) state.visited.push(scene.location);

  const names = { station: "The Station", server: "Server Room", observatory: "Observatory", archive: "The Archive", signal: "The Signal" };
  locationName.textContent = names[scene.location];
  chapterLabel.textContent = `CHAPTER ${String(scene.chapter).padStart(2, "0")}`;
  progressLabel.textContent = `${Math.min(state.chapterProgress, 8)} / 8`;

  storyContent.innerHTML = `<h2>${scene.title}</h2>${scene.text.map(line => `<p>${line}</p>`).join("")}`;
  choices.innerHTML = "";
  scene.choices.forEach((choice, index) => {
    const locked = choice.requires && !hasItem(choice.requires);
    const button = document.createElement("button");
    button.className = "choice";
    button.dataset.key = String(index + 1).padStart(2, "0");
    button.textContent = locked ? `${choice.text} — missing ${choice.requires}` : choice.text;
    button.disabled = !!locked;
    button.addEventListener("click", () => pick(choice));
    choices.appendChild(button);
  });

  inventoryList.innerHTML = state.inventory.length
    ? state.inventory.map(item => `<span>${item}</span>`).join("")
    : `<span class="empty">Nothing yet</span>`;

  document.querySelectorAll(".node").forEach(node => {
    node.classList.toggle("active", node.dataset.location === scene.location);
    node.classList.toggle("visited", state.visited.includes(node.dataset.location));
  });
}

function pick(choice) {
  if (choice.reset) {
    state = { node: "awakening", inventory: [], visited: [], chapterProgress: 0 };
  } else {
    const next = story[choice.next];
    if (choice.effect?.add && !hasItem(choice.effect.add)) state.inventory.push(choice.effect.add);
    state.node = choice.next;
    state.chapterProgress = Math.max(state.chapterProgress, next.chapter);
  }
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function saveGame(showToast = true) {
  localStorage.setItem("sshhuiii-save", JSON.stringify(state));
  if (showToast) toast("Progress saved");
}

function loadGame() {
  const saved = localStorage.getItem("sshhuiii-save");
  if (saved) {
    try { state = JSON.parse(saved); toast("Progress restored"); } catch (_) {}
  }
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
}

document.querySelectorAll(".node").forEach(node => {
  node.addEventListener("click", () => {
    const locations = { station: "awakening", server: "server", observatory: "observatory", archive: "archive", signal: "signal" };
    const scene = locations[node.dataset.location];
    if (story[scene]) { state.node = scene; render(); }
  });
});

document.getElementById("saveButton").addEventListener("click", () => saveGame());
document.getElementById("restartButton").addEventListener("click", () => {
  state = { node: "awakening", inventory: [], visited: [], chapterProgress: 0 };
  localStorage.removeItem("sshhuiii-save");
  render();
  toast("Journey restarted");
});

document.addEventListener("keydown", event => {
  const number = Number(event.key);
  if (number >= 1 && number <= 9) {
    const button = choices.querySelectorAll(".choice")[number - 1];
    if (button && !button.disabled) button.click();
  }
});

loadGame();
render();
