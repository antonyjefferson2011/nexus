/* =========================================================
   NEXAR SAAS FACTORY — versão de teste
   Credenciais expostas propositalmente nesta versão.
   ========================================================= */

const GROQ_API_KEY = "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";
const OPENROUTER_API_KEY = "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";

const firebaseConfig = {
  apiKey: "AIzaSyBzqQmGpMz-7AYM7_Mpt2owpmf6BXjW1yk",
  authDomain: "nucisz.firebaseapp.com",
  databaseURL: "https://nucisz-default-rtdb.firebaseio.com",
  projectId: "nucisz",
  storageBucket: "nucisz.firebasestorage.app",
  messagingSenderId: "90824519141",
  appId: "1:90824519141:web:8ec5d6686c07cbbf94930c",
  measurementId: "G-BZ4S7Q3NM2"
};

const IMGBB_API_KEY = "86427cccd2a94fb42a0754ffd7f19e79";

/* ---------- Estado global ---------- */
const state = {
  project: null,       // { name, description, analysis, files: { "index.html": "...", ... } }
  currentFile: null,
  firebaseUser: null
};

/* ---------- Utilidades ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showError(msg, tech) {
  const box = $("#errorBox");
  box.classList.remove("hidden");
  box.textContent = "❌ " + msg + (tech ? "\n\nDetalhe técnico: " + tech : "");
  if (tech) console.error("[NEXAR]", tech);
}
function clearError() { $("#errorBox").classList.add("hidden"); }

/* ---------- Navegação ---------- */
$$(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".nav-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    $$(".view").forEach(v => v.classList.remove("active"));
    $("#view-" + btn.dataset.view).classList.add("active");
  });
});

/* ---------- Progresso animado ---------- */
const STEPS = [
  "🧠 Analisando ideia...",
  "📐 Criando arquitetura...",
  "💻 Gerando código...",
  "🔍 Analisando código...",
  "🎨 Preparando interface...",
  "🚀 SaaS pronto!"
];
let progressTimer = null;

function startProgress() {
  const box = $("#progress");
  const line = $("#progressLine");
  const fill = $("#progressFill");
  box.classList.remove("hidden");
  let i = 0;
  line.textContent = STEPS[0];
  fill.style.width = "5%";
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    i++;
    if (i >= STEPS.length) { clearInterval(progressTimer); return; }
    line.textContent = STEPS[i];
    fill.style.width = Math.min(95, 5 + i * 18) + "%";
    if (i === STEPS.length - 1) fill.style.width = "100%";
  }, 1400);
}
function stopProgress() {
  clearInterval(progressTimer);
  $("#progressLine").textContent = STEPS[STEPS.length - 1];
  $("#progressFill").style.width = "100%";
  setTimeout(() => $("#progress").classList.add("hidden"), 900);
}

/* ---------- IA: chamada Groq ---------- */
async function callGroq(messages, model = "llama-3.3-70b-versatile") {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + GROQ_API_KEY
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 6000
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Groq HTTP " + res.status + ": " + errText.slice(0, 400));
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callOpenRouter(messages) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + OPENROUTER_API_KEY
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages
    })
  });
  if (!res.ok) throw new Error("OpenRouter HTTP " + res.status);
  const data = await res.json();
  return data.choices[0].message.content;
}

/* ---------- IA: gerar SaaS ---------- */
const SYSTEM_ARCHITECT = `Você é o NEXAR, um arquiteto e programador de SaaS.
Dado um briefing, você gera um SaaS COMPLETO em HTML/CSS/JS puro (sem frameworks, sem build).
Você SEMPRE responde em JSON válido com a seguinte estrutura EXATA:

{
  "name": "Nome do SaaS",
  "description": "Descrição curta",
  "audience": "Público-alvo",
  "features": ["feature 1", "feature 2"],
  "pages": ["página 1", "página 2"],
  "database": "Descrição do banco de dados necessário",
  "auth": "Descrição do sistema de autenticação",
  "admin": "Descrição do painel administrativo",
  "stack": ["Tecnologia 1", "Tecnologia 2"],
  "structure": "📁 nome-saas\\n├── index.html\\n├── style.css\\n└── script.js",
  "files": {
    "index.html": "<!DOCTYPE html>...(código completo)...",
    "style.css": "...(código completo)...",
    "script.js": "...(código completo)..."
  }
}

REGRAS OBRIGATÓRIAS:
- Responda SOMENTE com o JSON, sem markdown, sem texto antes ou depois.
- Os arquivos em "files" devem ser código COMPLETO e funcional.
- Use HTML/CSS/JS puro. Nada de React, Vue, Next, TypeScript, etc.
- O index.html deve referenciar style.css e script.js.
- O SaaS gerado deve funcionar abrindo o index.html direto.
- Use localStorage para persistir dados no SaaS gerado.
- Interface moderna, dark, responsiva.
- NÃO use placeholders como "adicionar aqui".`;

function extractJson(text) {
  // Remove cercas de markdown se houver
  let t = text.trim();
  t = t.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("Resposta da IA não contém JSON.");
  const slice = t.slice(first, last + 1);
  return JSON.parse(slice);
}

async function generateSaas(idea) {
  clearError();
  $("#createBtn").disabled = true;
  startProgress();
  hideResultSections();

  try {
    const raw = await callGroq([
      { role: "system", content: SYSTEM_ARCHITECT },
      { role: "user", content: "Crie um SaaS completo com base nesta ideia:\n\n" + idea }
    ]);

    let project;
    try {
      project = extractJson(raw);
    } catch (e) {
      // fallback: pedir correção
      const raw2 = await callGroq([
        { role: "system", content: "Corrija o JSON abaixo para que seja válido. Responda SOMENTE com o JSON." },
        { role: "user", content: raw }
      ]);
      project = extractJson(raw2);
    }

    if (!project.files || !project.files["index.html"]) {
      throw new Error("IA não retornou arquivos válidos.");
    }

    state.project = project;
    state.currentFile = "index.html";

    renderAnalysis(project);
    renderFiles(project);
    renderPreview(project);
    setupChat();
    saveProjectLocal(project);

    $("#analysisSection").classList.remove("hidden");
    $("#filesSection").classList.remove("hidden");
    $("#previewSection").classList.remove("hidden");
    $("#chatSection").classList.remove("hidden");

    stopProgress();
  } catch (err) {
    stopProgress();
    console.error(err);
    showError("Erro ao conectar com a IA.", err.message);
  } finally {
    $("#createBtn").disabled = false;
  }
}

function hideResultSections() {
  ["#analysisSection", "#filesSection", "#previewSection", "#chatSection"]
    .forEach(s => $(s).classList.add("hidden"));
}

/* ---------- Render ---------- */
function renderAnalysis(p) {
  const el = $("#analysisContent");
  const list = (arr) => Array.isArray(arr) ? arr.map(i => "• " + i).join("\n") : (arr || "—");
  el.textContent =
`🏷️ NOME
${p.name || "—"}

📝 DESCRIÇÃO
${p.description || "—"}

🎯 PÚBLICO-ALVO
${p.audience || "—"}

⚙️ FUNCIONALIDADES
${list(p.features)}

📄 PÁGINAS
${list(p.pages)}

🗄️ BANCO DE DADOS
${p.database || "—"}

🔐 AUTENTICAÇÃO
${p.auth || "—"}

🛠️ PAINEL ADMINISTRATIVO
${p.admin || "—"}

💻 TECNOLOGIAS
${list(p.stack)}

📁 ESTRUTURA
${p.structure || "—"}`;
}

function renderFiles(p) {
  const tabs = $("#fileTabs");
  tabs.innerHTML = "";
  Object.keys(p.files).forEach(fname => {
    const b = document.createElement("button");
    b.className = "tab" + (fname === state.currentFile ? " active" : "");
    b.textContent = "📄 " + fname;
    b.addEventListener("click", () => {
      state.currentFile = fname;
      $$("#fileTabs .tab").forEach(t => t.classList.remove("active"));
      b.classList.add("active");
      $("#currentFileName").textContent = fname;
      $("#codeView").textContent = p.files[fname];
    });
    tabs.appendChild(b);
  });
  $("#currentFileName").textContent = state.currentFile;
  $("#codeView").textContent = p.files[state.currentFile];
}

function buildPreviewHtml(p) {
  let html = p.files["index.html"] || "";
  // Inline CSS
  const css = p.files["style.css"] || "";
  const js = p.files["script.js"] || "";
  html = html.replace(/<link[^>]*href=["']style\.css["'][^>]*>/i, `<style>${css}</style>`);
  html = html.replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/i, `<script>${js}<\/script>`);
  return html;
}

function renderPreview(p) {
  const frame = $("#previewFrame");
  frame.srcdoc = buildPreviewHtml(p);
}

$("#refreshPreview").addEventListener("click", () => {
  if (state.project) renderPreview(state.project);
});

/* ---------- Copiar / Baixar ---------- */
$("#copyBtn").addEventListener("click", async () => {
  if (!state.project) return;
  try {
    await navigator.clipboard.writeText(state.project.files[state.currentFile]);
    $("#copyBtn").textContent = "COPIADO!";
    setTimeout(() => $("#copyBtn").textContent = "COPIAR", 1200);
  } catch (e) {
    showError("Não foi possível copiar.", e.message);
  }
});

$("#downloadBtn").addEventListener("click", () => {
  if (!state.project) return;
  const content = state.project.files[state.currentFile];
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = state.currentFile;
  a.click();
  URL.revokeObjectURL(url);
});

/* ---------- Chat com IA ---------- */
function setupChat() {
  const log = $("#chatLog");
  log.innerHTML = "";
  addMsg("ai", "Projeto gerado! Peça alterações, ex: 'deixe o tema escuro' ou 'adicione login'.");
}

function addMsg(role, text) {
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.textContent = text;
  $("#chatLog").appendChild(div);
  $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
}

$("#chatSend").addEventListener("click", sendChat);
$("#chatInput").addEventListener("keydown", e => { if (e.key === "Enter") sendChat(); });

async function sendChat() {
  const input = $("#chatInput");
  const text = input.value.trim();
  if (!text || !state.project) return;
  input.value = "";
  addMsg("user", text);

  const p = state.project;
  const systemMsg = `Você é o NEXAR, programador do SaaS "${p.name}".
Você recebe o código atual e uma solicitação do usuário.
Retorne SOMENTE um JSON válido no formato:
{
  "reply": "mensagem curta explicando a alteração",
  "files": { "index.html": "...", "style.css": "...", "script.js": "..." }
}
Se um arquivo não mudar, inclua-o mesmo assim com o conteúdo atual.
Nada de markdown, nada de texto fora do JSON.`;

  const userMsg = `CÓDIGO ATUAL:
--- index.html ---
${p.files["index.html"]}
--- style.css ---
${p.files["style.css"] || ""}
--- script.js ---
${p.files["script.js"] || ""}

SOLICITAÇÃO DO USUÁRIO:
${text}`;

  addMsg("ai", "⏳ Pensando...");
  const last = $("#chatLog").lastChild;

  try {
    const raw = await callGroq([
      { role: "system", content: systemMsg },
      { role: "user", content: userMsg }
    ]);
    let parsed;
    try {
      parsed = extractJson(raw);
    } catch (e) {
      parsed = { reply: raw, files: p.files };
    }
    last.textContent = parsed.reply || "Feito.";

    if (parsed.files) {
      state.project.files = Object.assign({}, p.files, parsed.files);
      renderFiles(state.project);
      renderPreview(state.project);
      saveProjectLocal(state.project);
    }
  } catch (err) {
    console.error(err);
    last.textContent = "❌ Erro ao conectar com a IA: " + err.message;
  }
}

/* ---------- localStorage (projetos) ---------- */
const LS_KEY = "nexar_projects";

function saveProjectLocal(project) {
  const all = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  const idx = all.findIndex(p => p.name === project.name);
  if (idx >= 0) all[idx] = project; else all.push(project);
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  renderProjects();
}

function renderProjects() {
  const all = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  const el = $("#projectsList");
  el.innerHTML = "";
  if (!all.length) { el.innerHTML = "<p class='muted'>Nenhum projeto salvo.</p>"; return; }
  all.forEach(p => {
    const c = document.createElement("div");
    c.className = "project-card";
    c.innerHTML = `<h4>${p.name || "Sem nome"}</h4><p>${(p.description || "").slice(0,120)}</p>`;
    c.addEventListener("click", () => {
      state.project = p;
      state.currentFile = "index.html";
      renderAnalysis(p);
      renderFiles(p);
      renderPreview(p);
      setupChat();
      $$(".nav-item").forEach(b => b.classList.remove("active"));
      document.querySelector('[data-view="novo"]').classList.add("active");
      $$(".view").forEach(v => v.classList.remove("active"));
      $("#view-novo").classList.add("active");
      ["#analysisSection","#filesSection","#previewSection","#chatSection"]
        .forEach(s => $(s).classList.remove("hidden"));
    });
    el.appendChild(c);
  });
}

/* ---------- Botão principal ---------- */
$("#createBtn").addEventListener("click", () => {
  const idea = $("#ideaInput").value.trim();
  if (!idea) { showError("Descreva a ideia do SaaS antes de continuar."); return; }
  generateSaas(idea);
});

/* ---------- Upload ImgBB ---------- */
$("#imageInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  $("#uploadError").classList.add("hidden");
  $("#uploadResult").classList.add("hidden");

  const form = new FormData();
  form.append("image", file);

  try {
    const res = await fetch("https://api.imgbb.com/1/upload?key=" + IMGBB_API_KEY, {
      method: "POST",
      body: form
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || "Falha no upload.");
    const url = data.data.url;
    $("#uploadPreview").src = url;
    $("#uploadUrl").value = url;
    $("#uploadResult").classList.remove("hidden");
  } catch (err) {
    console.error(err);
    const box = $("#uploadError");
    box.classList.remove("hidden");
    box.textContent = "❌ Erro ao enviar imagem: " + err.message;
  }
});

$("#copyUrl").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("#uploadUrl").value);
    $("#copyUrl").textContent = "COPIADO!";
    setTimeout(() => $("#copyUrl").textContent = "COPIAR URL", 1200);
  } catch (e) { console.error(e); }
});

/* ---------- Firebase (carregamento dinâmico) ---------- */
let fbAuth = null, fbDb = null, fbReady = false;

async function initFirebase() {
  const statusEl = $("#firebaseStatus");
  const warn = $("#fbWarning");
  try {
    // Importa SDK via CDN módulo
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    const { getDatabase, ref, set, get, child } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js");

    const app = initializeApp(firebaseConfig);
    fbAuth = getAuth(app);
    fbDb = getDatabase(app);

    // helpers globais
    window.__fb = { ref, set, get, child, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, fbAuth };

    onAuthStateChanged(fbAuth, user => {
      state.firebaseUser = user;
      $("#fbUser").textContent = user ? "Autenticado: " + user.email : "Não autenticado.";
    });

    fbReady = true;
    statusEl.textContent = "Firebase: conectado";
    statusEl.style.color = "#28d17c";
  } catch (err) {
    console.warn("Firebase indisponível:", err);
    statusEl.textContent = "Firebase: offline (app funciona normalmente)";
    statusEl.style.color = "#ffc107";
    warn.classList.remove("hidden");
    warn.textContent = "⚠️ Firebase não pôde ser inicializado ao abrir o arquivo diretamente. " +
      "Isso não impede o uso do NEXAR. Para usar login/salvamento em nuvem, sirva via http (ex: python -m http.server) ou use um domínio autorizado.";
  }
}

$("#fbLogin").addEventListener("click", async () => {
  if (!fbReady) return showError("Firebase não disponível.", "SDK não carregado.");
  try {
    await window.__fb.signInWithEmailAndPassword(fbAuth, $("#fbEmail").value, $("#fbPass").value);
    alert("Login OK");
  } catch (e) { showError("Erro no login.", e.message); }
});
$("#fbRegister").addEventListener("click", async () => {
  if (!fbReady) return showError("Firebase não disponível.", "SDK não carregado.");
  try {
    await window.__fb.createUserWithEmailAndPassword(fbAuth, $("#fbEmail").value, $("#fbPass").value);
    alert("Cadastro OK");
  } catch (e) { showError("Erro no cadastro.", e.message); }
});
$("#fbLogout").addEventListener("click", async () => {
  if (!fbReady) return;
  try { await window.__fb.signOut(fbAuth); } catch (e) { console.error(e); }
});

$("#fbSave").addEventListener("click", async () => {
  if (!fbReady) return showError("Firebase não disponível.", "SDK não carregado.");
  if (!state.firebaseUser) return showError("Faça login para salvar na nuvem.");
  if (!state.project) return showError("Nenhum projeto para salvar.");
  try {
    const { ref, set } = window.__fb;
    await set(ref(fbDb, "projects/" + state.firebaseUser.uid + "/" + state.project.name), state.project);
    alert("Projeto salvo na nuvem.");
  } catch (e) { showError("Erro ao salvar.", e.message); }
});

$("#fbLoad").addEventListener("click", async () => {
  if (!fbReady) return showError("Firebase não disponível.", "SDK não carregado.");
  if (!state.firebaseUser) return showError("Faça login para carregar.");
  try {
    const { ref, get } = window.__fb;
    const snap = await get(ref(fbDb, "projects/" + state.firebaseUser.uid));
    const list = snap.val() || {};
    const el = $("#fbProjects");
    el.innerHTML = "";
    Object.values(list).forEach(p => {
      const c = document.createElement("div");
      c.className = "project-card";
      c.innerHTML = `<h4>${p.name}</h4><p>${(p.description||"").slice(0,120)}</p>`;
      c.addEventListener("click", () => {
        state.project = p;
        state.currentFile = "index.html";
        renderAnalysis(p); renderFiles(p); renderPreview(p); setupChat();
        $$(".nav-item").forEach(b => b.classList.remove("active"));
        document.querySelector('[data-view="novo"]').classList.add("active");
        $$(".view").forEach(v => v.classList.remove("active"));
        $("#view-novo").classList.add("active");
        ["#analysisSection","#filesSection","#previewSection","#chatSection"]
          .forEach(s => $(s).classList.remove("hidden"));
      });
      el.appendChild(c);
    });
  } catch (e) { showError("Erro ao carregar.", e.message); }
});

/* ---------- Configurações de chaves (persistência simples) ---------- */
function loadConfig() {
  const cfg = JSON.parse(localStorage.getItem("nexar_cfg") || "{}");
  $("#cfgGroq").value = cfg.groq || GROQ_API_KEY;
  $("#cfgOpenRouter").value = cfg.openrouter || OPENROUTER_API_KEY;
  $("#cfgImgbb").value = cfg.imgbb || IMGBB_API_KEY;
}
$("#saveConfig").addEventListener("click", () => {
  localStorage.setItem("nexar_cfg", JSON.stringify({
    groq: $("#cfgGroq").value.trim(),
    openrouter: $("#cfgOpenRouter").value.trim(),
    imgbb: $("#cfgImgbb").value.trim()
  }));
  alert("Configurações salvas (recarregue para aplicar).");
});

/* ---------- Init ---------- */
renderProjects();
loadConfig();
initFirebase();
