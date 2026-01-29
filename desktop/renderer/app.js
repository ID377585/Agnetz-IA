const chatEl = document.getElementById("chat");
const promptEl = document.getElementById("prompt");
const sendBtn = document.getElementById("send");
const agentFace = document.getElementById("agent-face");
const agentStatus = document.getElementById("agent-status");
const agentDetail = document.getElementById("agent-detail");
const statusAgent = document.getElementById("status-agent");
const statusMcp = document.getElementById("status-mcp");
const taskQueueEl = document.getElementById("task-queue");
const fileInput = document.getElementById("file-input");
const attachList = document.getElementById("attach-list");

const backendUrlEl = document.getElementById("backend-url");
const mcpUrlEl = document.getElementById("mcp-url");
const mcpTokenEl = document.getElementById("mcp-token");
const voiceEnabledEl = document.getElementById("voice-enabled");
const voiceRateEl = document.getElementById("voice-rate");
const saveConfigBtn = document.getElementById("save-config");
const clearQueueBtn = document.getElementById("clear-queue");
const overlay = document.getElementById("working-overlay");
const overlayTerminal = document.getElementById("overlay-terminal");
const overlayTitle = document.getElementById("overlay-title");
const overlaySub = document.getElementById("overlay-sub");
const overlayFace = document.getElementById("overlay-face");

const defaultConfig = {
  backendUrl: "http://localhost:8787",
  mcpUrl: "http://localhost:8788",
  mcpToken: "",
  voiceEnabled: true,
  voiceRate: 1.0,
};

const state = {
  messages: loadStore("agnetz.chat", []),
  tasks: loadStore("agnetz.tasks", []),
  attachments: [],
  config: loadStore("agnetz.config", defaultConfig),
  face: "idle",
};

const personaSnark = [
  "Cara, você é folgado. Mas vamo lá.",
  "Ok, ok… vou fazer. Só dessa vez.",
  "Você pede, eu resolvo. Simples.",
  "Respira. Eu resolvo isso.",
];

const personaFinish = [
  "Pronto. Sem drama.",
  "Resolvido. Pode agradecer depois.",
  "Tá feito. Próximo pedido.",
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function applyPersona(text) {
  if (!text) return text;
  const lower = text.toLowerCase();
  if (lower.includes("erro") || lower.includes("falha")) return text;
  return `${pick(personaSnark)}\n${text}\n${pick(personaFinish)}`;
}

function speak(text) {
  if (!state.config.voiceEnabled) return;
  if (!("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const female = voices.find((v) => /female|brasil|portuguese/i.test(v.name)) || voices[0];
  if (female) utter.voice = female;
  utter.lang = "pt-BR";
  utter.rate = Number(state.config.voiceRate || 1);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function setOverlayVisible(visible, title = "Trabalhando…", detail = "") {
  if (visible) {
    overlay.classList.add("show");
    overlayTitle.textContent = title;
    overlaySub.textContent = detail || "Preparando tudo para você.";
    overlayTerminal.innerHTML = "";
    overlayFace.classList.add("working");
  } else {
    overlay.classList.remove("show");
    overlayFace.classList.remove("working");
  }
}

function pushOverlayLog(line) {
  const item = document.createElement("div");
  item.textContent = `> ${line}`;
  overlayTerminal.appendChild(item);
  overlayTerminal.scrollTop = overlayTerminal.scrollHeight;
}

function loadStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setFace(mode) {
  agentFace.className = `cube ${mode}`.trim();
  state.face = mode;
}

function renderChat() {
  chatEl.innerHTML = "";
  state.messages.forEach((msg) => {
    const div = document.createElement("div");
    div.className = `msg ${msg.role}`;
    div.innerHTML = `<div>${msg.content}</div><div class="meta">${msg.time}</div>`;
    chatEl.appendChild(div);
  });
  chatEl.scrollTop = chatEl.scrollHeight;
}

function renderTasks() {
  taskQueueEl.innerHTML = "";
  state.tasks.slice().reverse().forEach((t) => {
    const div = document.createElement("div");
    div.className = "task";
    div.innerHTML = `<strong>${t.type}</strong><span>${t.status}</span><span>${t.time}</span>`;
    taskQueueEl.appendChild(div);
  });
}

function renderAttachments() {
  attachList.innerHTML = "";
  state.attachments.forEach((f, idx) => {
    const chip = document.createElement("div");
    chip.className = "attach-chip";
    chip.textContent = `${f.name} (${Math.round(f.size / 1024)}kb)`;
    chip.onclick = () => {
      state.attachments.splice(idx, 1);
      renderAttachments();
    };
    attachList.appendChild(chip);
  });
}

function applyConfig() {
  backendUrlEl.value = state.config.backendUrl || "";
  mcpUrlEl.value = state.config.mcpUrl || "";
  mcpTokenEl.value = state.config.mcpToken || "";
  voiceEnabledEl.checked = state.config.voiceEnabled;
  voiceRateEl.value = state.config.voiceRate || 1.0;
}

async function ping(url) {
  try {
    const res = await fetch(`${url}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function updateStatus() {
  const backendOk = await ping(`${state.config.backendUrl}/api`);
  const mcpOk = await ping(state.config.mcpUrl);

  statusAgent.textContent = backendOk ? "online" : "offline";
  statusMcp.textContent = mcpOk ? "online" : "offline";

  if (backendOk || mcpOk) {
    agentStatus.textContent = "online";
    agentStatus.classList.add("online");
    agentDetail.textContent = "Agente pronto";
  } else {
    agentStatus.textContent = "offline";
    agentStatus.classList.remove("online");
    agentDetail.textContent = "Aguardando conexão";
  }
}

function addMessage(role, content) {
  const msg = {
    role,
    content: role === "bot" ? applyPersona(content) : content,
    time: new Date().toLocaleTimeString(),
  };
  state.messages.push(msg);
  saveStore("agnetz.chat", state.messages);
  renderChat();
  if (role === "bot") speak(msg.content);
}

function enqueueTask(type, status = "pendente") {
  state.tasks.push({
    type,
    status,
    time: new Date().toLocaleTimeString(),
  });
  saveStore("agnetz.tasks", state.tasks);
  renderTasks();
}

async function runMcpChat(message) {
  const headers = { "Content-Type": "application/json" };
  if (state.config.mcpToken) {
    headers.Authorization = `Bearer ${state.config.mcpToken}`;
  }
  const payload = {
    connector: "ollama",
    action: "chat",
    input: { messages: state.messages.map((m) => ({ role: m.role, content: m.content })) },
  };

  const res = await fetch(`${state.config.mcpUrl}/run`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const json = await res.json();
  const content = json?.output?.message?.content || "(sem resposta)";
  return content;
}

async function uploadAttachments() {
  if (!state.attachments.length) return [];
  if (!state.config.backendUrl) return [];
  const form = new FormData();
  state.attachments.forEach((file) => form.append("files", file));
  const res = await fetch(`${state.config.backendUrl}/api/attachments`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const json = await res.json();
  return json.files || [];
}

sendBtn.addEventListener("click", async () => {
  const content = promptEl.value.trim();
  if (!content) return;

  addMessage("user", content);
  promptEl.value = "";
  setFace("thinking");
  setOverlayVisible(true, "Agnetz em ação", "Executando sua solicitação…");
  pushOverlayLog("Inicializando MCP");
  pushOverlayLog("Carregando contexto");

  if (state.attachments.length) {
    try {
      pushOverlayLog(`Enviando ${state.attachments.length} anexo(s)`);
      const uploaded = await uploadAttachments();
      addMessage("bot", `Anexos enviados: ${uploaded.length}`);
    } catch (err) {
      addMessage("bot", `Falha ao enviar anexos: ${err?.message || err}`);
    }
    state.attachments = [];
    renderAttachments();
  }

  try {
    pushOverlayLog("Chamando modelo local");
    const reply = await runMcpChat(content);
    addMessage("bot", reply);
    setFace("happy");
    setOverlayVisible(false);
    setTimeout(() => setFace("idle"), 1200);
  } catch (err) {
    addMessage("bot", `Erro ao chamar MCP: ${err?.message || err}`);
    setFace("sleep");
    setOverlayVisible(false, "Ops…", "Algo falhou no caminho.");
  }
});

fileInput.addEventListener("change", (event) => {
  const files = Array.from(event.target.files || []);
  state.attachments.push(...files);
  renderAttachments();
  fileInput.value = "";
});

saveConfigBtn.addEventListener("click", () => {
  state.config = {
    backendUrl: backendUrlEl.value.trim() || defaultConfig.backendUrl,
    mcpUrl: mcpUrlEl.value.trim() || defaultConfig.mcpUrl,
    mcpToken: mcpTokenEl.value.trim(),
    voiceEnabled: voiceEnabledEl.checked,
    voiceRate: Number(voiceRateEl.value || 1.0),
  };
  saveStore("agnetz.config", state.config);
  updateStatus();
});

clearQueueBtn.addEventListener("click", () => {
  state.tasks = [];
  saveStore("agnetz.tasks", state.tasks);
  renderTasks();
});

Array.from(document.querySelectorAll("[data-action]")).forEach((btn) => {
  btn.addEventListener("click", async () => {
    const type = btn.dataset.action;
    enqueueTask(type, "pendente");

    if (!state.config.backendUrl) {
      enqueueTask(type, "backend não configurado");
      return;
    }

    try {
      const res = await fetch(`${state.config.backendUrl}/api/actions/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "desktop" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      enqueueTask(type, json?.task?.status || "executado");
    } catch (err) {
      enqueueTask(type, `erro: ${err?.message || err}`);
    }
  });
});

applyConfig();
renderChat();
renderTasks();
renderAttachments();
updateStatus();
setInterval(updateStatus, 15000);
