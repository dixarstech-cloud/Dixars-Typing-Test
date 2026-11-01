"use strict";

(function () {
  const app = window.DixarsApp;
  const $ = app.$;
  const PROGRESS_KEY = "dixars_progress_v1";
  let currentUser = null;
  let installPrompt = null;
  let accountLoad = Promise.resolve();
  let developerOffset = 0;
  let developerProgram = null;
  let developerInitialized = false;
  let developerText = "";
  let developerTyped = [];
  let developerIndex = 0;
  let developerErrors = 0;
  let developerStartedAt = 0;
  let developerClock = null;

  function readProgress() {
    try {
      const data = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      return data && typeof data === "object" ? data : {};
    } catch {
      return {};
    }
  }

  function writeProgress(data) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  }

  function localDateKey(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")].join("-");
  }

  function recordTest(result) {
    const progress = readProgress();
    const day = localDateKey(new Date(result.at));
    const record = progress[day] || { count: 0, best: 0, total: 0, modes: {} };
    record.count += 1;
    record.best = Math.max(record.best, result.wpm);
    record.total += result.wpm;
    record.modes = record.modes || {};
    record.modes[result.mode] = Math.max(record.modes[result.mode] || 0, result.wpm);
    progress[day] = record;
    writeProgress(progress);
  }

  function renderProgress() {
    const progress = readProgress();
    const goalInput = $("wpmGoal");
    const goal = Math.max(1, Math.min(300, Number(app.S.goalWpm) || 40));
    if (goalInput) goalInput.value = goal;
    const days = [];
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = localDateKey(date);
      const item = progress[key] || { count: 0, best: 0, total: 0, modes: {} };
      days.push({
        label: date.toLocaleDateString(undefined, { weekday: "short" }),
        count: Number(item.count) || 0,
        best: Number(item.best) || 0,
        average: item.count ? Math.round(item.total / item.count) : 0,
        modes: item.modes || {}
      });
    }
    const activeDays = days.filter(day => day.count > 0).length;
    const maxWpm = Math.max(goal, ...days.map(day => day.best), 1);
    $("weeklySummary").textContent = activeDays + " active days · goal " + goal + " WPM · " +
      days.reduce((total, day) => total + day.count, 0) + " tests this week";
    const chart = $("weeklyChart");
    chart.replaceChildren();
    days.forEach(day => {
      const column = document.createElement("div");
      column.className = "week-day";
      const bar = document.createElement("div");
      bar.className = "week-bar";
      bar.style.height = Math.max(3, Math.round(day.best / maxWpm * 54)) + "px";
      bar.title = day.count ? day.best + " WPM best, " + day.count + " tests" : "No tests";
      if (day.best >= goal) bar.classList.add("goal-met");
      const label = document.createElement("span");
      label.textContent = day.label;
      column.append(bar, label);
      chart.append(column);
    });
    let modeRecords = chart.nextElementSibling;
    if (!modeRecords || !modeRecords.classList.contains("mode-records")) {
      modeRecords = document.createElement("div");
      modeRecords.className = "mode-records";
      chart.after(modeRecords);
    }
    modeRecords.replaceChildren();
    const bestByMode = {};
    app.store.history.forEach(item => {
      if (item.mode) bestByMode[item.mode] = Math.max(bestByMode[item.mode] || 0, item.wpm || 0);
    });
    Object.entries(bestByMode).sort((a, b) => a[0].localeCompare(b[0])).forEach(([mode, best]) => {
      const tag = document.createElement("span");
      tag.textContent = mode + ": " + best + " WPM";
      modeRecords.append(tag);
    });
  }

  function handleShortcut(event) {
    if (event.key === "Escape" && app.currentScreen === "test" && !event.target.matches("textarea")) {
      app.go("home");
      return true;
    }
    if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || !/^[1-5]$/.test(event.key)) return false;
    const screens = ["home", "test", "race", "developer", "account"];
    event.preventDefault();
    app.go(screens[Number(event.key) - 1]);
    return true;
  }

  async function api(path, options) {
    const response = await fetch(path, {
      credentials: "same-origin",
      headers: { "content-type": "application/json", ...(options && options.headers) },
      ...options
    });
    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error("The server returned an unreadable response.");
    }
    if (!response.ok) throw new Error(body.error || "The request could not be completed.");
    return body;
  }

  function setAccountStatus(text, isError) {
    $("accountStatus").textContent = text;
    $("accountStatus").classList.toggle("error", Boolean(isError));
  }

  function renderSignedIn() {
    $("accountForm").hidden = Boolean(currentUser);
    $("editProfileBtn").hidden = !currentUser;
    $("signedInActions").hidden = !currentUser;
    $("accountTitle").textContent = currentUser
      ? currentUser.displayName + " · @" + currentUser.username
      : "Player profile";
    if (currentUser) {
      $("accountUsername").value = currentUser.username;
      $("accountDisplayName").value = currentUser.displayName;
      $("wpmGoal").value = currentUser.goalWpm;
      app.S.goalWpm = currentUser.goalWpm;
      app.S.playerName = currentUser.displayName;
      app.store.settings = app.S;
      $("raceName").value = currentUser.displayName;
      $("raceName").readOnly = true;
      setAccountStatus("Signed in. Your completed live-race scores are saved to your public profile.", false);
    } else {
      $("raceName").readOnly = false;
      setAccountStatus("Accounts are stored on this race server. Local practice remains available without an account.", false);
    }
  }

  async function loadAccount() {
    accountLoad = api("/api/me").then(({ user }) => {
      currentUser = user || null;
      renderSignedIn();
      return Promise.all([loadLeaderboard(), loadRaceIdentity()]);
    }).catch(error => {
      currentUser = null;
      renderSignedIn();
      setAccountStatus("Account service unavailable: " + error.message, true);
    });
    return accountLoad;
  }

  async function loadRaceIdentity() {
    if (currentUser) return;
    if (!$("raceName").value) {
      $("raceName").value = app.S.playerName || localStorage.getItem("dixars_player_name") || "";
    }
  }

  async function submitAccount(path) {
    const username = $("accountUsername").value.trim();
    const password = $("accountPassword").value;
    const displayName = $("accountDisplayName").value.trim();
    if (path === "/api/register" && !displayName) {
      setAccountStatus("Enter a display name to create your account.", true);
      $("accountDisplayName").focus();
      return;
    }
    $("registerBtn").disabled = true;
    $("loginBtn").disabled = true;
    setAccountStatus("Connecting to the account service...", false);
    try {
      const result = await api(path, {
        method: "POST",
        body: JSON.stringify({ username, password, displayName })
      });
      currentUser = result.user;
      $("accountPassword").value = "";
      renderSignedIn();
      await loadLeaderboard();
    } catch (error) {
      setAccountStatus(error.message, true);
    } finally {
      $("registerBtn").disabled = false;
      $("loginBtn").disabled = false;
    }
  }

  async function saveProfile() {
    if (!currentUser) return;
    try {
      const result = await api("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: $("accountDisplayName").value.trim(),
          goalWpm: Number($("wpmGoal").value)
        })
      });
      currentUser = result.user;
      renderSignedIn();
      $("profileEditActions").hidden = true;
      $("accountPassword").closest("label").hidden = false;
      setAccountStatus("Profile and WPM goal saved.", false);
    } catch (error) {
      setAccountStatus(error.message, true);
    }
  }

  async function signOut() {
    try {
      await api("/api/logout", { method: "POST", body: "{}" });
      currentUser = null;
      renderSignedIn();
      await loadLeaderboard();
    } catch (error) {
      setAccountStatus(error.message, true);
    }
  }

  async function loadLeaderboard(period) {
    const selected = period || "all";
    const container = $("leaderboardList");
    if (!container) return;
    container.replaceChildren();
    try {
      const result = await api("/api/leaderboard?period=" + selected);
      const controls = document.createElement("div");
      controls.className = "leaderboard-controls";
      [["all", "All time"], ["week", "This week"]].forEach(([value, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.className = "btn ghostb";
        button.setAttribute("aria-pressed", String(value === selected));
        button.addEventListener("click", () => loadLeaderboard(value));
        controls.append(button);
      });
      container.append(controls);
      if (!result.players.length) {
        const empty = document.createElement("p");
        empty.className = "account-status";
        empty.textContent = "No completed account races yet. Finish a live race to appear here.";
        container.append(empty);
      }
      result.players.forEach((player, index) => {
        const row = document.createElement("div");
        row.className = "leaderboard-row";
        const rank = document.createElement("span");
        rank.textContent = "#" + (index + 1);
        const profile = document.createElement("button");
        profile.type = "button";
        profile.className = "profile-link";
        profile.textContent = player.display_name + " · @" + player.username;
        profile.addEventListener("click", () => showPublicProfile(player.username));
        const score = document.createElement("span");
        score.textContent = player.best_wpm + " WPM";
        row.append(rank, profile, score);
        container.append(row);
      });
    } catch (error) {
      const status = document.createElement("p");
      status.className = "account-status error";
      status.textContent = "Leaderboard unavailable: " + error.message;
      container.append(status);
    }
  }

  async function showPublicProfile(username) {
    try {
      const { profile } = await api("/api/profile/" + encodeURIComponent(username));
      setAccountStatus("@" + profile.username + " · " + profile.best_wpm +
        " WPM best · " + profile.races + " completed races · member since " +
        new Date(profile.created_at).toLocaleDateString(), false);
    } catch (error) {
      setAccountStatus(error.message, true);
    }
  }

  function initializeDeveloperScreen() {
    const catalog = window.DixarsDeveloperPrograms;
    if (!catalog || !Array.isArray(catalog.programs) || !catalog.programs.length) {
      $("developerDescription").textContent = "The developer program catalog could not be loaded.";
      return;
    }
    const language = $("developerLanguage");
    const programSelect = $("developerProgram");
    if (!developerInitialized) {
      developerInitialized = true;
      catalog.languages.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        language.append(option);
      });
      language.addEventListener("change", () => {
        fillDeveloperPrograms();
        developerOffset = 0;
        startDeveloperRound();
      });
      programSelect.addEventListener("change", () => {
        const saved = readProgress().developer || {};
        developerOffset = saved[programSelect.value] || 0;
        startDeveloperRound();
      });
      $("developerStart").addEventListener("click", () => startDeveloperRound());
      $("developerPrev").addEventListener("click", () => {
        developerOffset = Math.max(0, developerOffset - Number($("developerSize").value));
        startDeveloperRound();
      });
      $("developerNext").addEventListener("click", () => {
        developerOffset = Math.min(450, developerOffset + Number($("developerSize").value));
        startDeveloperRound();
      });
      $("developerSize").addEventListener("change", () => startDeveloperRound());
      $("developerCode").addEventListener("click", () => $("developerInput").focus());
      $("developerInput").addEventListener("keydown", handleDeveloperKey);
      $("developerInput").addEventListener("paste", event => event.preventDefault());
      fillDeveloperPrograms();
    }
  }

  function fillDeveloperPrograms() {
    const catalog = window.DixarsDeveloperPrograms;
    const language = $("developerLanguage").value || catalog.languages[0];
    const select = $("developerProgram");
    select.replaceChildren();
    catalog.programs.filter(program => program.language === language).forEach(program => {
      const option = document.createElement("option");
      option.value = program.id;
      option.textContent = program.title;
      select.append(option);
    });
  }

  function startDeveloperRound() {
    const catalog = window.DixarsDeveloperPrograms;
    if (!catalog) return;
    clearInterval(developerClock);
    const selectedId = $("developerProgram").value;
    developerProgram = catalog.programs.find(program => program.id === selectedId) ||
      catalog.programs.find(program => program.language === $("developerLanguage").value);
    if (!developerProgram) return;
    const linesPerRound = Number($("developerSize").value) || 50;
    developerOffset = Math.min(500 - linesPerRound, Math.max(0, developerOffset));
    const end = Math.min(500, developerOffset + linesPerRound);
    developerText = developerProgram.lines.slice(developerOffset, end).join("\n");
    developerTyped = new Array(developerText.length).fill(null);
    developerIndex = 0;
    developerErrors = 0;
    developerStartedAt = 0;
    $("developerDescription").textContent = developerProgram.purpose + " · " + developerProgram.language;
    $("developerProgress").textContent = "Lines " + (developerOffset + 1) + "–" + end + " of 500";
    $("developerTime").textContent = "0";
    $("developerWpm").textContent = "0";
    $("developerAccuracy").textContent = "100%";
    $("developerPrev").disabled = developerOffset === 0;
    $("developerNext").disabled = end >= 500;
    renderDeveloperCode();
    $("developerInput").value = "";
  }

  function renderDeveloperCode() {
    const element = $("developerCode");
    element.replaceChildren();
    for (let index = 0; index < developerText.length; index++) {
      const span = document.createElement("span");
      span.textContent = developerText[index];
      span.classList.toggle("current", index === developerIndex);
      if (developerTyped[index] !== null) {
        span.classList.add(developerTyped[index] === developerText[index] ? "done" : "bad");
      }
      element.append(span);
    }
    const active = element.children[developerIndex];
    if (active) active.scrollIntoView({ block: "nearest" });
  }

  function handleDeveloperKey(event) {
    if (event.key === "Tab" || event.key === "Enter" && event.ctrlKey) return;
    if (event.key === "Backspace") {
      event.preventDefault();
      if (developerIndex > 0) {
        developerIndex--;
        if (developerTyped[developerIndex] !== null &&
            developerTyped[developerIndex] !== developerText[developerIndex]) developerErrors--;
        developerTyped[developerIndex] = null;
        renderDeveloperCode();
        updateDeveloperStats();
      }
      return;
    }
    if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    if (developerIndex >= developerText.length) return;
    if (!developerStartedAt) {
      developerStartedAt = Date.now();
      developerClock = setInterval(updateDeveloperStats, 250);
    }
    developerTyped[developerIndex] = event.key;
    if (event.key !== developerText[developerIndex]) developerErrors++;
    developerIndex++;
    renderDeveloperCode();
    updateDeveloperStats();
    if (developerIndex >= developerText.length) completeDeveloperRound();
  }

  function updateDeveloperStats() {
    const elapsedMs = developerStartedAt ? Date.now() - developerStartedAt : 0;
    const correct = developerTyped.reduce((count, value, index) =>
      count + (value === developerText[index] ? 1 : 0), 0);
    const total = developerTyped.filter(value => value !== null).length;
    const elapsedMin = Math.max(elapsedMs / 60_000, 1 / 60);
    $("developerTime").textContent = Math.floor(elapsedMs / 1000) + "s";
    $("developerWpm").textContent = String(Math.round(correct / 5 / elapsedMin));
    $("developerAccuracy").textContent = (total ? Math.round((total - developerErrors) / total * 100) : 100) + "%";
  }

  function completeDeveloperRound() {
    clearInterval(developerClock);
    const completedEnd = developerOffset + developerText.split("\n").length;
    const progress = readProgress();
    progress.developer = progress.developer || {};
    progress.developer[developerProgram.id] = Math.max(progress.developer[developerProgram.id] || 0, Math.min(500, completedEnd));
    writeProgress(progress);
    $("developerProgress").textContent = "Round complete · " + Math.min(500, completedEnd) + " lines practiced";
    if (completedEnd < 500) {
      developerOffset = completedEnd;
      setTimeout(() => startDeveloperRound(), 500);
    }
  }

  function handleRaceMessage(message) {
    if (Number.isFinite(message.duration)) {
      app.race.duration = message.type === "race-start"
        ? Math.round(message.duration / 1000)
        : message.duration;
      $("raceDuration").value = String(app.race.duration);
    }
    if (Array.isArray(message.rematchVotes)) {
      app.race.rematchVotes = message.rematchVotes;
      renderRematchVotes();
    }
    if (message.type === "chat") {
      app.race.chat = app.race.chat || [];
      app.race.chat.push(message);
      if (app.race.chat.length > 100) app.race.chat.shift();
      renderRaceChat();
    } else if (message.type === "room-state" || message.type === "race-end" || message.type === "race-start") {
      renderRematchVotes();
      if (message.type === "room-state" && Array.isArray(message.chat)) {
        app.race.chat = message.chat;
        renderRaceChat();
      }
    }
    $("raceDuration").disabled = app.race.hostId !== app.race.playerId || app.race.phase !== "waiting";
    $("raceDurationField").hidden = !app.race.roomCode || app.race.phase !== "waiting";
    $("raceChatForm").hidden = !app.race.roomCode;
    $("raceChat").hidden = !app.race.roomCode;
    $("startRaceBtn").textContent = app.race.phase === "results"
      ? "start " + app.race.duration + "-second race"
      : "start " + app.race.duration + "-second race";
  }

  function renderRaceChat() {
    const container = $("raceChatMessages");
    if (!container) return;
    container.replaceChildren();
    (app.race.chat || []).slice(-40).forEach(message => {
      const line = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = message.name + ": ";
      const text = document.createElement("span");
      text.textContent = message.text;
      line.append(name, text);
      container.append(line);
    });
    container.scrollTop = container.scrollHeight;
  }

  function renderRematchVotes() {
    const element = $("raceRematch");
    const votes = app.race.rematchVotes || [];
    if (!app.race.roomCode || app.race.phase !== "results") {
      element.hidden = true;
      element.replaceChildren();
      return;
    }
    element.hidden = false;
    element.replaceChildren();
    const label = document.createElement("span");
    label.textContent = votes.length + " rematch vote" + (votes.length === 1 ? "" : "s") +
      " — vote yes to restart (" + Math.ceil(app.race.players.length / 2) + " needed). ";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn primary";
    button.textContent = votes.includes(app.race.playerId) ? "vote recorded" : "vote for rematch";
    button.disabled = votes.includes(app.race.playerId);
    button.addEventListener("click", () => app.raceSend({ type: "vote-rematch" }));
    element.append(label, button);
  }

  function initializeRaceFeatures() {
    $("raceName").value = app.S.playerName || localStorage.getItem("dixars_player_name") || "";
    $("raceName").addEventListener("input", () => {
      if (currentUser) return;
      const name = $("raceName").value.trim().slice(0, 18);
      app.S.playerName = name;
      app.store.settings = app.S;
      localStorage.setItem("dixars_player_name", name);
    });
    $("raceDuration").addEventListener("change", () => {
      const duration = Number($("raceDuration").value);
      app.raceSend({ type: "set-duration", duration });
    });
    $("raceChatForm").addEventListener("submit", event => {
      event.preventDefault();
      const input = $("raceChatInput");
      const text = input.value.trim();
      if (!text) return;
      if (app.raceSend({ type: "chat", text })) input.value = "";
      else app.setRaceStatus("Connect to a room before sending chat.", true);
    });
    $("copyRaceInvite").addEventListener("click", async () => {
      if (!app.race.roomCode) return;
      const link = new URL(location.pathname, location.href);
      link.searchParams.set("room", app.race.roomCode);
      try {
        await navigator.clipboard.writeText(link.href);
        app.setRaceStatus("Invite link copied. Send it to your friends.");
      } catch {
        app.setRaceStatus("Invite link: " + link.href);
      }
    });
    document.querySelectorAll("#nav button").forEach(button => {
      button.addEventListener("click", () => {
        if (button.dataset.s === "account") loadAccount();
        if (button.dataset.s === "developer") initializeDeveloperScreen();
      });
    });
  }

  function initializeProgressFeatures() {
    $("saveGoal").addEventListener("click", async () => {
      const goal = Number($("wpmGoal").value);
      if (!Number.isInteger(goal) || goal < 1 || goal > 300) {
        $("weeklySummary").textContent = "Choose a daily goal from 1 to 300 WPM.";
        return;
      }
      app.S.goalWpm = goal;
      app.store.settings = app.S;
      renderProgress();
      if (currentUser) await saveProfile();
    });
    $("lessonSelect").addEventListener("change", () => {
      app.S.lesson = $("lessonSelect").value;
      app.store.settings = app.S;
      app.applySettings();
      if (app.currentScreen === "test") app.reset();
    });
    $("specialModeSelect").addEventListener("change", () => {
      app.S.mode = $("specialModeSelect").value;
      app.store.settings = app.S;
      app.applySettings();
      if (app.currentScreen === "test") app.reset();
    });
    $("installApp").addEventListener("click", async () => {
      if (!installPrompt) return;
      await installPrompt.prompt();
      installPrompt = null;
      $("installApp").hidden = true;
    });
  }

  function initializeAccountFeatures() {
    $("registerBtn").addEventListener("click", () => submitAccount("/api/register"));
    $("loginBtn").addEventListener("click", () => submitAccount("/api/login"));
    $("logoutBtn").addEventListener("click", signOut);
    $("editProfileBtn").addEventListener("click", () => {
      $("accountForm").hidden = false;
      $("editProfileBtn").hidden = true;
      $("profileEditActions").hidden = false;
      $("accountUsername").disabled = true;
      $("accountPassword").closest("label").hidden = true;
      $("accountDisplayName").focus();
    });
    $("saveProfileBtn").addEventListener("click", saveProfile);
    $("cancelProfileBtn").addEventListener("click", () => {
      renderSignedIn();
      $("profileEditActions").hidden = true;
      $("accountPassword").closest("label").hidden = false;
    });
    $("accountPassword").addEventListener("keydown", event => {
      if (event.key === "Enter") submitAccount("/api/login");
    });
    loadAccount();
  }

  function initializePwa() {
    if (!("serviceWorker" in navigator) || !["http:", "https:"].includes(location.protocol)) return;
    navigator.serviceWorker.register("/service-worker.js").catch(error => {
      console.error("Could not register the Dixars offline app shell:", error);
    });
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      installPrompt = event;
      $("installApp").hidden = false;
    });
    window.addEventListener("appinstalled", () => {
      installPrompt = null;
      $("installApp").hidden = true;
    });
  }

  initializeRaceFeatures();
  initializeProgressFeatures();
  initializeAccountFeatures();
  initializePwa();
  renderProgress();
  const inviteRoom = new URLSearchParams(location.search).get("room");
  if (inviteRoom) app.go("race");
  window.DixarsEnhancements = { recordTest, renderProgress, handleShortcut, handleRaceMessage };
})();
