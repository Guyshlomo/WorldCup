const APPS_SCRIPT_URL = "https://script.google.com/u/0/home/projects/12LXmMAU3iFsptgIQ5irKKfRe9rebqB9p4BMYHsxmXHUbxorTWHz69GHX/edit";

let dashboardData = {
  standings: [],
  games: [],
  exactHits: [],
  lastUpdated: ""
};

let currentGamesFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
  initEvents();
  loadDashboardData();
});

function initEvents() {
  document.getElementById("refreshBtn").addEventListener("click", loadDashboardData);

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      currentGamesFilter = btn.dataset.filter;
      renderGames(dashboardData.games);
    });
  });
}

async function loadDashboardData() {
  try {
    setLoadingState();

    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("שים_כאן")) {
      renderEmptyDashboard("חסר קישור ל־Apps Script");
      return;
    }

    const response = await fetch(APPS_SCRIPT_URL);

    if (!response.ok) {
      throw new Error("לא הצלחנו למשוך נתונים מה־Apps Script");
    }

    const data = await response.json();

    dashboardData = {
      standings: data.standings || [],
      games: data.games || [],
      exactHits: data.exactHits || [],
      lastUpdated: data.lastUpdated || ""
    };

    renderDashboard(dashboardData);
    showToast("הנתונים נטענו מה־Google Sheets");
  } catch (error) {
    console.error(error);
    renderEmptyDashboard("שגיאה בטעינת הנתונים מה־Google Sheets");
  }
}

function renderDashboard(data) {
  renderHeader(data);
  renderStats(data);
  renderPodium(data.standings);
  renderStandings(data.standings);
  renderExactHits(data.exactHits);
  renderGames(data.games);
}

function renderHeader(data) {
  const standings = data.standings || [];
  const hasRealScore = hasAnyScore(standings);
  const leader = hasRealScore ? standings[0] : null;

  document.getElementById("lastUpdated").textContent = data.lastUpdated || "עדיין לא בוצע סנכרון";

  document.getElementById("leaderName").textContent = leader
    ? getValue(leader, ["שם", "friend", "name"])
    : "אין עדיין ניקוד";

  document.getElementById("leaderPoints").textContent = leader
    ? getValue(leader, ["נקודות", "points"], 0)
    : 0;
}

function renderStats(data) {
  const standings = data.standings || [];
  const games = data.games || [];
  const exactHits = data.exactHits || [];

  const totalPoints = standings.reduce((sum, row) => {
    return sum + Number(getValue(row, ["נקודות", "points"], 0));
  }, 0);

  const calculatedGames = standings.length
    ? Math.max(...standings.map((row) => Number(getValue(row, ["משחקים שחושבו", "משחקים", "calculatedGames"], 0))))
    : 0;

  const participantsCount = standings.length;

  document.getElementById("participantsCount").textContent = participantsCount;
  document.getElementById("exactHitsCount").textContent = exactHits.length;
  document.getElementById("calculatedGamesCount").textContent = calculatedGames;
  document.getElementById("totalPointsCount").textContent = totalPoints;

  if (totalPoints === 0 && calculatedGames === 0) {
    document.getElementById("totalPointsCount").textContent = "—";
    document.getElementById("calculatedGamesCount").textContent = "0";
  }
}

function renderPodium(standings) {
  const podium = document.getElementById("podium");

  if (!standings || standings.length === 0) {
    podium.innerHTML = `<div class="empty-state">עדיין אין משתתפים להצגה</div>`;
    return;
  }

  if (!hasAnyScore(standings)) {
    podium.innerHTML = `
      <div class="empty-state">
        🏆 הטופ 3 יופיע אחרי שהמשחק הראשון יסתיים ויחושב ניקוד
      </div>
    `;
    return;
  }

  const topThree = standings.slice(0, 3);

  podium.innerHTML = topThree.map((row, index) => {
    const rank = getValue(row, ["מקום", "rank"], index + 1);
    const name = getValue(row, ["שם", "friend", "name"]);
    const points = getValue(row, ["נקודות", "points"], 0);
    const exact = getValue(row, ["פגיעות מדויקות", "exact_hits", "exactHits"], 0);
    const medal = getMedal(rank);

    return `
      <article class="podium-card ${Number(rank) === 1 ? "first" : ""}">
        <div class="podium-rank">${medal}</div>
        <h3>${escapeHtml(name)}</h3>
        <p>מקום ${escapeHtml(rank)} · ${escapeHtml(exact)} פגיעות מדויקות</p>
        <div class="podium-points">${escapeHtml(points)} נקודות</div>
      </article>
    `;
  }).join("");
}

function renderStandings(standings) {
  const tbody = document.getElementById("standingsBody");

  if (!standings || standings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">עדיין אין משתתפים בטבלה</td>
      </tr>
    `;
    return;
  }

  if (!hasAnyScore(standings)) {
    tbody.innerHTML = standings.map((row) => {
      const name = getValue(row, ["שם", "friend", "name"]);

      return `
        <tr>
          <td class="rank-cell">—</td>
          <td>${escapeHtml(name)}</td>
          <td class="points">—</td>
          <td>—</td>
          <td>—</td>
          <td>0</td>
        </tr>
      `;
    }).join("");

    return;
  }

  tbody.innerHTML = standings.map((row, index) => {
    const rank = getValue(row, ["מקום", "rank"], index + 1);
    const name = getValue(row, ["שם", "friend", "name"]);
    const points = getValue(row, ["נקודות", "points"], 0);
    const exact = getValue(row, ["פגיעות מדויקות", "exact_hits", "exactHits"], 0);
    const correct = getValue(row, ["כיוון נכון", "correctResults"], 0);
    const games = getValue(row, ["משחקים שחושבו", "משחקים", "calculatedGames"], 0);

    return `
      <tr>
        <td class="rank-cell">${getMedal(rank)} ${escapeHtml(rank)}</td>
        <td>${escapeHtml(name)}</td>
        <td class="points">${escapeHtml(points)}</td>
        <td>${escapeHtml(exact)}</td>
        <td>${escapeHtml(correct)}</td>
        <td>${escapeHtml(games)}</td>
      </tr>
    `;
  }).join("");
}

function renderExactHits(exactHits) {
  const list = document.getElementById("exactHitsList");

  if (!exactHits || exactHits.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        🎯 עדיין אין פגיעות מדויקות
      </div>
    `;
    return;
  }

  list.innerHTML = exactHits.map((hit) => {
    const name = getValue(hit, ["שם", "friend", "name"]);
    const match = getValue(hit, ["משחק", "match"]);
    const score = getValue(hit, ["תוצאה בפועל", "score"]);
    const points = getValue(hit, ["נקודות", "points"], 3);

    return `
      <article class="info-card">
        <h3>🎯 ${escapeHtml(name)} פגע בול</h3>
        <p>${escapeHtml(match)}</p>
        <div class="info-row">
          <span class="badge finished">תוצאה ${escapeHtml(score)}</span>
          <strong>+${escapeHtml(points)} נק׳</strong>
        </div>
      </article>
    `;
  }).join("");
}

function renderGames(games) {
  const list = document.getElementById("gamesList");

  if (!games || games.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        אין עדיין משחקים להצגה מה־Google Sheets
      </div>
    `;
    return;
  }

  const filteredGames = games.filter((game) => {
    const status = getGameStatusGroup(game);

    if (currentGamesFilter === "all") return true;
    return status === currentGamesFilter;
  });

  if (filteredGames.length === 0) {
    list.innerHTML = `<div class="empty-state">אין משחקים בקטגוריה הזו</div>`;
    return;
  }

  list.innerHTML = filteredGames.map((game) => {
    const title = getValue(game, ["משחק בטופס", "title", "match"]);
    const date = getValue(game, ["תאריך", "dateText", "date"], "");
    const score = getValue(game, ["תוצאה", "score"], "");
    const rawStatus = getValue(game, ["סטטוס", "status"], "");
    const statusGroup = getGameStatusGroup(game);

    return `
      <article class="info-card">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(date || "תאריך טרם עודכן")}</p>
        <div class="info-row">
          <span class="badge ${statusGroup}">
            ${getStatusEmoji(statusGroup)} ${escapeHtml(getStatusText(rawStatus))}
          </span>
          <strong>${score ? escapeHtml(score) : "—"}</strong>
        </div>
      </article>
    `;
  }).join("");
}

function renderEmptyDashboard(message) {
  document.getElementById("lastUpdated").textContent = "לא מחובר";
  document.getElementById("leaderName").textContent = "אין נתונים";
  document.getElementById("leaderPoints").textContent = "0";

  document.getElementById("participantsCount").textContent = "0";
  document.getElementById("exactHitsCount").textContent = "0";
  document.getElementById("calculatedGamesCount").textContent = "0";
  document.getElementById("totalPointsCount").textContent = "—";

  document.getElementById("podium").innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;

  document.getElementById("standingsBody").innerHTML = `
    <tr>
      <td colspan="6">${escapeHtml(message)}</td>
    </tr>
  `;

  document.getElementById("exactHitsList").innerHTML = `<div class="empty-state">אין נתונים להצגה</div>`;
  document.getElementById("gamesList").innerHTML = `<div class="empty-state">אין נתונים להצגה</div>`;
}

function hasAnyScore(standings) {
  return standings.some((row) => {
    const points = Number(getValue(row, ["נקודות", "points"], 0));
    const calculatedGames = Number(getValue(row, ["משחקים שחושבו", "משחקים", "calculatedGames"], 0));
    const exact = Number(getValue(row, ["פגיעות מדויקות", "exact_hits", "exactHits"], 0));
    const correct = Number(getValue(row, ["כיוון נכון", "correctResults"], 0));

    return points > 0 || calculatedGames > 0 || exact > 0 || correct > 0;
  });
}

function getGameStatusGroup(game) {
  const status = String(getValue(game, ["סטטוס", "status"], "")).toUpperCase();

  if (["FT", "AET", "PEN"].includes(status)) return "finished";
  if (["1H", "2H", "HT", "ET", "BT", "P", "LIVE"].includes(status)) return "live";
  if (["NS", "TBD"].includes(status)) return "upcoming";
  if (status === "לא נמצא") return "missing";

  return "upcoming";
}

function getStatusText(status) {
  const s = String(status || "").toUpperCase();

  const map = {
    FT: "הסתיים",
    AET: "הסתיים אחרי הארכה",
    PEN: "הסתיים בפנדלים",
    "1H": "מחצית ראשונה",
    "2H": "מחצית שנייה",
    HT: "מחצית",
    ET: "הארכה",
    LIVE: "חי",
    NS: "טרם התחיל",
    TBD: "טרם נקבע",
    "לא נמצא": "לא נמצא"
  };

  return map[s] || status || "לא ידוע";
}

function getStatusEmoji(statusGroup) {
  if (statusGroup === "finished") return "🟢";
  if (statusGroup === "live") return "🟡";
  if (statusGroup === "missing") return "🔴";
  return "⚪";
}

function getMedal(rank) {
  const numberRank = Number(rank);

  if (numberRank === 1) return "🥇";
  if (numberRank === 2) return "🥈";
  if (numberRank === 3) return "🥉";

  return "";
}

function getValue(obj, keys, fallback = "") {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }

  return fallback;
}

function setLoadingState() {
  document.getElementById("lastUpdated").textContent = "טוען...";
  document.getElementById("leaderName").textContent = "טוען...";
  document.getElementById("standingsBody").innerHTML = `
    <tr>
      <td colspan="6">טוען נתונים מה־Google Sheets...</td>
    </tr>
  `;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}