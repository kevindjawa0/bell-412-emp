const utilizationData = window.UTILIZATION_DATA || {
  aircraft: [],
  dailyByAircraft: [],
  validDates: [],
  window: { start: "", end: "", calendarDays: 0 }
};

const heavyCheckData = window.HEAVY_CHECK_DATA || {
  sourceFile: "",
  sourceSheet: "CONTROL SHEET - CTRL TASK CARD",
  sheets: [],
  tasks: []
};

const basicInspectionData = window.BASIC_INSPECTION_DATA || {
  model: "BELL 412",
  methodology: "",
  parentTasks: [],
  totals: { childTasks: 0, manHours: 0 }
};

const maintenanceSchedule = [
  {
    model: "BELL 412",
    checkType: "Daily / Pre-flight Inspection",
    intervalHours: "Before flight",
    nextDue: "Next operating day"
  },
  {
    model: "BELL 412",
    checkType: "25-Hour Inspection",
    intervalHours: "25 Flight Hours",
    nextDue: "Based on active utilization"
  },
  {
    model: "BELL 412",
    checkType: "100-Hour Inspection",
    intervalHours: "100 Flight Hours",
    nextDue: "Based on active utilization"
  },
  {
    model: "BELL 412",
    checkType: "300-Hour Inspection",
    intervalHours: "300 Flight Hours",
    nextDue: "Based on active utilization"
  },
  {
    model: "BELL 412",
    checkType: "600-Hour Inspection",
    intervalHours: "600 Flight Hours",
    nextDue: "Based on active utilization"
  },
  {
    model: "BELL 412",
    checkType: "5000-Hour Inspection",
    intervalHours: "5000 Flight Hours or 5 Years",
    nextDue: "Based on active utilization"
  }
];

const equalizedPrograms = {
  "50": {
    title: "Equalized 50%",
    spreadRatio: 0.5,
    redistributionMode: "staged",
    equalizedBlockKeys: ["300-hour", "600-hour", "5000-hour"],
    description: "Moves 50% of the 300-hour, 600-hour, and 5000-hour workload into earlier simulation periods."
  },
  "75": {
    title: "Equalized 75%",
    spreadRatio: 0.75,
    redistributionMode: "staged",
    equalizedBlockKeys: ["300-hour", "600-hour", "5000-hour"],
    description: "Moves 75% of the 300-hour, 600-hour, and 5000-hour workload into earlier simulation periods."
  },
  "100": {
    title: "Equalized 100%",
    spreadRatio: 1,
    equalizedBlockKeys: "all",
    description: "Spreads the full baseline workload evenly across the 5-year simulation."
  }
};

const baselineIntervalKeys = ["25-hour", "100-hour", "300-hour", "600-hour", "5000-hour"];
const manualTaskCardIntervalKeys = ["5000-hour"];

function getBell412BaselineTasks() {
  const sourceTasks =
    Array.isArray(basicInspectionData.aircraftPrograms) && basicInspectionData.aircraftPrograms.length
      ? basicInspectionData.aircraftPrograms[0].parentTasks || []
      : basicInspectionData.parentTasks || [];

  return baselineIntervalKeys
    .map((intervalKey) => sourceTasks.find((task) => task.parentPackage === intervalKey))
    .filter(Boolean)
    .map((task) => ({
      ...task,
      applicability: ["BELL 412"],
      applicabilityLabel: "BELL 412"
    }));
}

const bell412BaselineTasks = getBell412BaselineTasks();
const maintenancePrograms = [
  {
    key: "BELL412",
    registration: "BELL 412",
    model: "BELL 412",
    parentTasks: bell412BaselineTasks,
    totals: {
      childTasks: bell412BaselineTasks.reduce((total, task) => total + (Number(task.childTasks) || 0), 0),
      manHours: 0
    }
  }
];

const state = {
  section: "data-source",
  equalized: "100",
  simulationView: "quarterly",
  showEqualizedComparison: false,
  activeDatePicker: null,
  calendarMonth: null,
  selectedRegistrations: [],
  aircraftChoiceCompleted: false,
  aircraftRevealPending: false,
  selectedMaintenanceProgram: maintenancePrograms[0]?.key || "BELL412",
  manualIntervalManHours: Object.fromEntries(baselineIntervalKeys.map((intervalKey) => [intervalKey, ""])),
  manualIntervalTaskCards: Object.fromEntries(manualTaskCardIntervalKeys.map((intervalKey) => [intervalKey, ""])),
  baseModelStarted: false,
  baseModelLoading: false,
  equalizationLoading: false,
  heavyCheckTab: "upload",
  heavyCheckStatusFilter: "all",
  heavyCheckSearch: "",
  maintenancePlanCreated: false,
  equalizationStarted: false,
  ganttCreated: false,
  ganttGenerated: false,
  ganttDetailLevel: "phase",
  reviewFilters: {
    ata: "all",
    phase: "all",
    trade: "all",
    taskCode: "all",
    movability: "all",
    confidence: "all",
    package: "all",
    reviewStatus: "all",
    search: ""
  },
  selectedReviewTaskUids: [],
  heavyCheckDraftTasks: heavyCheckData.tasks || [],
  approvedTaskMaster: [],
  reviewedTaskMaster: [],
  selectedGanttPackage: "P1",
  manualPackageAssignments: {},
  latestEqualizationScenario: null,
  ganttInputs: {
    totalTechnicians: "",
    shifts: 1,
    hoursPerShift: 8,
    productivityFactor: 0.82,
    tradeCapacity: {
      AP: 4,
      REI: 2,
      SM: 2,
      P: 1,
      PAINTER: 1,
      "AP / REI": 2,
      "AP / SM": 2,
      "AP / P": 2,
      OTHER: 1
    }
  },
  charts: {}
};

const utilizationFilter = {
  startDate: utilizationData.validDates[0] || utilizationData.window.start,
  endDate: utilizationData.validDates[utilizationData.validDates.length - 1] || utilizationData.window.end
};

const sectionTitles = {
  "data-source": "Aircraft Utilization",
  "basic-inspection": "Baseline Heavy Check",
  "equalized-inspection": "Equalization Planning",
  "inspection-chart": "Inspection Gantt & Ground Time"
};

const chartColors = {
  yellow: "#0C528A",
  yellowDark: "#05192E",
  yellowSoft: "rgba(77, 105, 136, 0.36)",
  slate: "#05192E",
  muted: "#4D6988",
  grid: "rgba(77, 105, 136, 0.14)",
  aircraftPalette: ["#0C528A", "#05192E", "#4D6988", "#8C98A7", "#123F63"]
};

const simulationMonths = 60;
const simulationDaysPerMonth = 365.25 / 12;
const simulationViews = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly"
};
const baselineBlockColors = {
  "25-hour": "#F59E0B",
  "100-hour": "#2563EB",
  "300-hour": "#16A34A",
  "600-hour": "#DC2626",
  "5000-hour": "#7C3AED"
};

const modelBarColors = {
  ...baselineBlockColors,
  "CSSD 25-hour": "#0891B2",
  "CSSD 100-hour": "#BE123C"
};

function formatBarLabelValue(value, decimals = 1) {
  const numericValue = Number(value) || 0;
  if (Math.abs(numericValue) < 0.05) {
    return "";
  }

  return decimals === 0 ? formatNumber(Math.round(numericValue)) : formatDecimal(numericValue, decimals);
}

function drawBarLabelBadge(ctx, chartArea, label, x, y, options) {
  if (!label) {
    return;
  }

  const fontSize = options.fontSize || 11;
  const paddingX = options.paddingX || 5;
  const paddingY = options.paddingY || 3;
  const labelWidth = ctx.measureText(label).width + paddingX * 2;
  const labelHeight = fontSize + paddingY * 2;
  const clampedX = Math.max(chartArea.left + labelWidth / 2, Math.min(x, chartArea.right - labelWidth / 2));
  const top = Math.max(chartArea.top + 2, y - labelHeight);
  const left = clampedX - labelWidth / 2;

  ctx.fillStyle = options.backgroundColor || "rgba(255, 255, 255, 0.86)";
  ctx.fillRect(left, top, labelWidth, labelHeight);
  ctx.fillStyle = options.color || chartColors.slate;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, clampedX, top + labelHeight / 2);
}

function getVisibleBarElement(chart, dataIndex, includeLegendHidden = false) {
  for (let datasetIndex = 0; datasetIndex < chart.data.datasets.length; datasetIndex += 1) {
    const dataset = chart.data.datasets[datasetIndex];
    const datasetType = dataset.type || chart.config.type;
    const meta = chart.getDatasetMeta(datasetIndex);
    if (datasetType !== "bar" || meta.hidden || (dataset.legendHidden && !includeLegendHidden)) {
      continue;
    }

    const element = meta.data[dataIndex];
    if (element) {
      return element;
    }
  }

  return null;
}

function calculateVisibleStackTotal(chart, dataIndex, includeLegendHidden = false) {
  return chart.data.datasets.reduce((total, dataset, datasetIndex) => {
    const datasetType = dataset.type || chart.config.type;
    const meta = chart.getDatasetMeta(datasetIndex);
    if (datasetType !== "bar" || meta.hidden || (dataset.legendHidden && !includeLegendHidden)) {
      return total;
    }

    return total + (Number(dataset.data[dataIndex]) || 0);
  }, 0);
}

const barValueLabelPlugin = {
  id: "barValueLabels",
  afterDatasetsDraw(chart, _args, options) {
    if (!options?.enabled) {
      return;
    }

    const yScale = chart.scales[options.yScaleID || "y"];
    if (!yScale) {
      return;
    }

    const ctx = chart.ctx;
    const chartArea = chart.chartArea;
    const fontSize = options.fontSize || 11;
    const offset = options.offset ?? 7;

    ctx.save();
    ctx.font = `${options.fontWeight || 700} ${fontSize}px Montserrat, Helvetica Neue, Arial, sans-serif`;

    if (options.mode === "stackTotal") {
      const dataCount = chart.data.labels.length;
      for (let dataIndex = 0; dataIndex < dataCount; dataIndex += 1) {
        const value = Array.isArray(options.values)
          ? Number(options.values[dataIndex]) || 0
          : calculateVisibleStackTotal(chart, dataIndex, options.includeLegendHidden);
        const label = formatBarLabelValue(value, options.decimals ?? 1);
        const element = getVisibleBarElement(chart, dataIndex, options.includeLegendHidden);

        if (!label || !element) {
          continue;
        }

        drawBarLabelBadge(ctx, chartArea, label, element.x, yScale.getPixelForValue(value) - offset, {
          ...options,
          fontSize
        });
      }
    } else {
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const datasetType = dataset.type || chart.config.type;
        const meta = chart.getDatasetMeta(datasetIndex);
        if (datasetType !== "bar" || meta.hidden || dataset.legendHidden) {
          return;
        }

        meta.data.forEach((element, dataIndex) => {
          const value = Number(dataset.data[dataIndex]) || 0;
          const label = formatBarLabelValue(value, options.decimals ?? 1);
          const barTop = Number.isFinite(element.base) ? Math.min(element.y, element.base) : element.y;
          if (!label) {
            return;
          }

          drawBarLabelBadge(ctx, chartArea, label, element.x, barTop - offset, {
            ...options,
            fontSize
          });
        });
      });
    }

    ctx.restore();
  }
};

const quarterYearAxisPlugin = {
  id: "quarterYearAxis",
  afterDraw(chart, _args, options) {
    const periods = options?.periods || [];
    if (!options?.enabled || !periods.length || !chart.scales.x) {
      return;
    }

    const years = new Map();
    periods.forEach((period, index) => {
      if (!years.has(period.year)) {
        years.set(period.year, { start: index, end: index });
      } else {
        years.get(period.year).end = index;
      }
    });

    const { ctx, chartArea, scales } = chart;
    ctx.save();
    ctx.fillStyle = "rgba(100, 116, 139, 0.58)";
    ctx.font = "600 11px Montserrat, Helvetica Neue, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    years.forEach((range, year) => {
      const startX = scales.x.getPixelForTick(range.start);
      const endX = scales.x.getPixelForTick(range.end);
      const centerX = (startX + endX) / 2;
      ctx.fillText(`Year ${year}`, centerX, chartArea.bottom + 42);
    });

    ctx.restore();
  }
};

const content = document.getElementById("content");
const pageTitle = document.getElementById("pageTitle");
const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menuButton");
const imageLightbox = document.getElementById("imageLightbox");
const imageLightboxImage = document.getElementById("imageLightboxImage");
const imageLightboxCaption = document.getElementById("imageLightboxCaption");
const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const passwordVisibilityButton = document.getElementById("passwordVisibilityButton");
const passwordEyeImage = document.getElementById("passwordEyeImage");
const loginError = document.getElementById("loginError");
const dashboardApp = document.getElementById("dashboardApp");
const userMenu = document.querySelector(".user-menu");
const userMenuButton = document.getElementById("userMenuButton");
const authLogoutButton = document.getElementById("authLogoutButton");
const loginVisualImage = document.querySelector(".login-aircraft-image");
const allowedUsername = "airfastindo";
const allowedPasswordHash = "e3a0234acef9ed1bc8a6f7959321392f60ed7bd259c43d94a9efa564de9b3c41";
const passwordEyeOpenSource = "assets/eye_open.png";
const passwordEyeClosedSource = "assets/eye_closed.png";
let dashboardStarted = false;

function getDefaultSelectedRegistrations() {
  return utilizationData.aircraft.map((aircraft) => aircraft.registration).filter(Boolean);
}

function resetUtilizationState() {
  state.selectedRegistrations = [];
  state.aircraftChoiceCompleted = false;
  state.aircraftRevealPending = false;
  utilizationFilter.startDate = utilizationData.validDates[0] || utilizationData.window.start;
  utilizationFilter.endDate = utilizationData.validDates[utilizationData.validDates.length - 1] || utilizationData.window.end;
  state.activeDatePicker = null;
  state.calendarMonth = null;
}

function afterNextPaint(callback) {
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
    return;
  }

  window.setTimeout(callback, 0);
}

function syncCurrentViewAfterLayout() {
  if (state.section === "data-source" && document.getElementById("utilizationKpis")) {
    updateUtilizationSection();
    return;
  }

  Object.values(state.charts).forEach((chart) => {
    chart.resize();
    chart.update("none");
  });
}

async function hashText(value) {
  if (!window.crypto?.subtle) {
    throw new Error("Password hashing is unavailable in this preview mode.");
  }

  const encoded = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function showLoginError(message) {
  if (loginError) {
    loginError.textContent = message;
  }
}

function unlockDashboard() {
  document.body.classList.remove("auth-locked");
  document.body.classList.add("authenticated");
  loginScreen?.setAttribute("aria-hidden", "true");
  dashboardApp?.removeAttribute("aria-hidden");

  if (!dashboardStarted) {
    dashboardStarted = true;
    resetUtilizationState();
    afterNextPaint(() => {
      render();
      afterNextPaint(syncCurrentViewAfterLayout);
    });
  }
}

function lockDashboard() {
  document.body.classList.add("auth-locked");
  document.body.classList.remove("authenticated");
  loginScreen?.removeAttribute("aria-hidden");
  dashboardApp?.setAttribute("aria-hidden", "true");
  destroyCharts();
  content.innerHTML = "";
  dashboardStarted = false;
  showLoginError("");
  loginForm?.reset();
  hidePassword();
  closeUserMenu();
  loginUsername?.focus();
}

function closeUserMenu() {
  userMenu?.classList.remove("open");
  userMenuButton?.setAttribute("aria-expanded", "false");
}

function toggleUserMenu() {
  const isOpen = userMenu?.classList.toggle("open");
  userMenuButton?.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function showPassword() {
  if (!loginPassword || !passwordVisibilityButton || !passwordEyeImage) {
    return;
  }

  loginPassword.type = "text";
  passwordVisibilityButton.classList.add("is-revealing");
  passwordVisibilityButton.setAttribute("aria-pressed", "true");
  passwordVisibilityButton.setAttribute("aria-label", "Hide password");
  passwordEyeImage.setAttribute("src", passwordEyeOpenSource);
}

function hidePassword() {
  if (!loginPassword || !passwordVisibilityButton || !passwordEyeImage) {
    return;
  }

  loginPassword.type = "password";
  passwordVisibilityButton.classList.remove("is-revealing");
  passwordVisibilityButton.setAttribute("aria-pressed", "false");
  passwordVisibilityButton.setAttribute("aria-label", "Show password");
  passwordEyeImage.setAttribute("src", passwordEyeClosedSource);
}

function togglePasswordVisibility() {
  if (loginPassword?.type === "password") {
    showPassword();
  } else {
    hidePassword();
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  showLoginError("");

  const username = loginUsername?.value.trim() || "";
  const password = loginPassword?.value || "";

  try {
    const passwordHash = await hashText(password);
    if (username === allowedUsername && passwordHash === allowedPasswordHash) {
      unlockDashboard();
      return;
    }
  } catch (error) {
    showLoginError("Use a VS Code localhost preview to enable secure login checking.");
    return;
  }

  showLoginError("Incorrect username or password.");
  loginPassword?.focus();
  loginPassword?.select();
}

function initializeAuthGate() {
  document.body.classList.add("auth-locked");
  dashboardApp?.setAttribute("aria-hidden", "true");
  loginUsername?.focus();
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDecimal(value, decimals = 1) {
  return Number(value || 0).toFixed(decimals);
}

function formatDisplayDate(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(dateToUtc(dateString));
}

function formatLegendLabel(label) {
  return String(label)
    .replace(/BELL 412\s*/gi, "")
    .replace(/\s*Block/gi, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/-hour/gi, " hrs")
    .replace(/Flight Hours/gi, "FH")
    .replace(/Flight Cycles/gi, "FC")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeHeaderKey(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function normalizeBlank(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  return /^(?:NA|N\/A|NIL|NONE|-|--|#N\/A)$/i.test(text) ? "" : text;
}

function normalizeText(value, uppercase = false) {
  const text = normalizeBlank(value).replace(/\s+/g, " ");
  return uppercase ? text.toUpperCase() : text;
}

function normalizeAta(value) {
  const text = normalizeText(value, true);
  const numeric = Number(text);
  if (Number.isFinite(numeric) && numeric > 0) {
    return String(Math.trunc(numeric)).padStart(2, "0");
  }

  return text.replace(/^ATA\s*/, "");
}

function normalizeAircraftRegistration(value) {
  const text = normalizeText(value, true);
  if (!text) {
    return "";
  }

  if (text === "OCA" || text === "PKOCA") {
    return "PK-OCA";
  }

  if (text === "OCD" || text === "PKOCD") {
    return "PK-OCD";
  }

  return text.replace(/\s+/g, "").replace(/^PK([A-Z])/, "PK-$1");
}

function normalizePhase(value) {
  return normalizeText(value, true).replace(/^PHASE\s*/, "P");
}

function normalizeTrade(value) {
  return normalizeText(value, true).replace(/\s*\/\s*/g, " / ");
}

function parseNumeric(value) {
  const text = normalizeBlank(value);
  if (!text) {
    return null;
  }

  const numeric = Number(String(text).replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function isHeavyCheckInterval(value) {
  const text = normalizeText(value, true);
  return /5000|5\s*YEAR|5\s*YR|1825/.test(text);
}

function uniqueValues(rows, key) {
  return Array.from(new Set(rows.map((row) => normalizeBlank(row[key])).filter(Boolean))).sort();
}

function statusBadge(status, label = status) {
  return `<span class="status-badge ${status}">${escapeHtml(label)}</span>`;
}

function getTradeDisplayLabel(trade) {
  const normalized = normalizeTrade(trade) || "OTHER";
  return tradeLabels[normalized] || normalized;
}

function getAutomaticMovabilityLabel(value) {
  const labels = {
    LIKELY_MOVABLE: "Can Be Moved",
    CONDITIONAL: "Move Together",
    LIKELY_CORE: "Must Stay in Heavy Check",
    UNCERTAIN: "Needs Engineer Review"
  };
  return labels[value] || "Needs Engineer Review";
}

function getEngineeringDecisionLabel(value) {
  const labels = {
    UNREVIEWED: "Not Reviewed",
    MOVABLE: "Approved to Move",
    CONDITIONAL: "Move Together",
    CORE: "Keep in Core"
  };
  return labels[value] || "Not Reviewed";
}

function statusBadgeForReviewStatus(status) {
  if (status === "APPROVED") {
    return statusBadge("valid", "Approved");
  }
  if (status === "REVIEWED") {
    return statusBadge("warning", "Reviewed");
  }
  return statusBadge("neutral", "Not Reviewed");
}

function statusBadgeForAutoMovability(value) {
  if (value === "LIKELY_MOVABLE") {
    return statusBadge("suggested", getAutomaticMovabilityLabel(value));
  }
  if (value === "CONDITIONAL") {
    return statusBadge("warning", getAutomaticMovabilityLabel(value));
  }
  if (value === "LIKELY_CORE") {
    return statusBadge("error", getAutomaticMovabilityLabel(value));
  }
  return statusBadge("neutral", getAutomaticMovabilityLabel(value));
}

function clampText(value, maxLength = 92) {
  const text = normalizeText(value, false);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function downloadTextFile(fileName, content, mimeType = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const escapeCsv = (value) => {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))].join("\r\n");
}

function withOpacity(hexColor, alpha) {
  const hex = hexColor.replace("#", "");
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function dateToUtc(dateString) {
  return new Date(`${dateString}T00:00:00Z`);
}

function countCalendarDays(startDate, endDate) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor((dateToUtc(endDate) - dateToUtc(startDate)) / oneDay) + 1;
}

function addMonths(dateString, delta) {
  const date = dateToUtc(`${dateString.slice(0, 7)}-01`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}

function getCalendarMonthLabel(monthString) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(dateToUtc(`${monthString}-01`));
}

function getSelectedValidDates() {
  const selected = new Set(state.selectedRegistrations);
  const dates = utilizationData.dailyByAircraft
    .filter((row) => selected.has(row.registration) && (row.flightHours > 0 || row.flightCycles > 0))
    .map((row) => row.date);

  return Array.from(new Set(dates)).sort();
}

function getNearestValidDate(date, validDates, direction) {
  if (direction === "forward") {
    return validDates.find((validDate) => validDate >= date) || validDates[0];
  }

  return [...validDates].reverse().find((validDate) => validDate <= date) || validDates[validDates.length - 1];
}

function normalizeDateRangeForSelectedAircraft() {
  const validDates = getSelectedValidDates();
  if (!validDates.length) {
    return;
  }

  const validSet = new Set(validDates);
  if (!validSet.has(utilizationFilter.startDate)) {
    utilizationFilter.startDate = getNearestValidDate(utilizationFilter.startDate, validDates, "forward");
  }

  if (!validSet.has(utilizationFilter.endDate)) {
    utilizationFilter.endDate = getNearestValidDate(utilizationFilter.endDate, validDates, "backward");
  }

  if (utilizationFilter.startDate > utilizationFilter.endDate) {
    utilizationFilter.startDate = validDates[0];
    utilizationFilter.endDate = validDates[validDates.length - 1];
  }
}

function renderDateButton(kind, label, value) {
  return `
    <label class="date-picker-field">
      <span>${label}</span>
      <button class="date-display-button" data-date-picker="${kind}" type="button" aria-haspopup="dialog">
        ${formatDisplayDate(value)}
      </button>
    </label>
  `;
}

function openDateCalendar(kind) {
  state.activeDatePicker = kind;
  const selectedDate = kind === "start" ? utilizationFilter.startDate : utilizationFilter.endDate;
  state.calendarMonth = selectedDate.slice(0, 7);
  renderDateCalendar();
}

function closeDateCalendar() {
  state.activeDatePicker = null;
  const calendar = document.getElementById("dateCalendar");
  if (calendar) {
    calendar.classList.add("hidden");
    calendar.innerHTML = "";
  }
}

function renderDateCalendar() {
  const calendar = document.getElementById("dateCalendar");
  if (!calendar || !state.activeDatePicker) {
    return;
  }

  const selectedValidDates = getSelectedValidDates();
  const selectedValidDateSet = new Set(selectedValidDates);
  const selectedValidMonths = selectedValidDates.map((date) => date.slice(0, 7));
  const minValidMonth = selectedValidMonths[0] || "";
  const maxValidMonth = selectedValidMonths[selectedValidMonths.length - 1] || "";
  const month = state.calendarMonth || utilizationFilter.startDate.slice(0, 7);
  const firstDay = dateToUtc(`${month}-01`);
  const year = firstDay.getUTCFullYear();
  const monthIndex = firstDay.getUTCMonth();
  const firstWeekday = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const previousMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);
  const canGoPrevious = !minValidMonth || previousMonth >= minValidMonth;
  const canGoNext = !maxValidMonth || nextMonth <= maxValidMonth;
  const leadingCells = Array.from({ length: firstWeekday }, () => `<span class="calendar-cell calendar-empty"></span>`);
  const dayCells = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const isValid = selectedValidDateSet.has(date);
    const isSelected = date === utilizationFilter.startDate || date === utilizationFilter.endDate;
    const isRangeEdge = date === utilizationFilter.startDate || date === utilizationFilter.endDate;

    return `
      <button
        class="calendar-cell ${isSelected ? "selected" : ""} ${isRangeEdge ? "range-edge" : ""}"
        data-calendar-date="${date}"
        type="button"
        ${isValid ? "" : "disabled"}
        aria-label="${formatDisplayDate(date)}"
      >
        ${day}
      </button>
    `;
  });

  calendar.classList.remove("hidden");
  calendar.innerHTML = `
    <div class="calendar-header">
      <button data-calendar-nav="-1" type="button" aria-label="Previous month" ${canGoPrevious ? "" : "disabled"}>‹</button>
      <strong>${getCalendarMonthLabel(month)}</strong>
      <button data-calendar-nav="1" type="button" aria-label="Next month" ${canGoNext ? "" : "disabled"}>›</button>
    </div>
    <div class="calendar-weekdays">
      ${weekdayLabels.map((day) => `<span>${day}</span>`).join("")}
    </div>
    <div class="calendar-grid">
      ${leadingCells.join("")}${dayCells.join("")}
    </div>
  `;
}

function selectCalendarDate(date) {
  if (!new Set(getSelectedValidDates()).has(date)) {
    return;
  }

  if (state.activeDatePicker === "start") {
    utilizationFilter.startDate = date;
    if (utilizationFilter.startDate > utilizationFilter.endDate) {
      utilizationFilter.endDate = date;
    }
  }

  if (state.activeDatePicker === "end") {
    utilizationFilter.endDate = date;
    if (utilizationFilter.endDate < utilizationFilter.startDate) {
      utilizationFilter.startDate = date;
    }
  }

  closeDateCalendar();
  updateUtilizationSection();
}

function destroyCharts() {
  Object.values(state.charts).forEach((chart) => chart.destroy());
  state.charts = {};
}

function getSelectedUtilizationRows() {
  const start = utilizationFilter.startDate;
  const end = utilizationFilter.endDate;
  const selected = new Set(state.selectedRegistrations);

  return utilizationData.dailyByAircraft.filter(
    (row) => selected.has(row.registration) && row.date >= start && row.date <= end
  );
}

function createEmptyMonthlyBucket(dateString) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = Number(dateString.slice(5, 7)) - 1;

  return {
    key: dateString.slice(0, 7),
    month: monthNames[monthIndex],
    aircraftFlightHours: {},
    totalFC: 0
  };
}

function getSelectedAircraftMeta() {
  return utilizationData.aircraft.filter((aircraft) => state.selectedRegistrations.includes(aircraft.registration));
}

function calculateUtilizationWindow() {
  const selectedRows = getSelectedUtilizationRows();
  const calendarDays = countCalendarDays(utilizationFilter.startDate, utilizationFilter.endDate);
  const totalsByDate = new Map();
  const monthly = new Map();

  selectedRows.forEach((row) => {
    const dateTotal = totalsByDate.get(row.date) || { flightHours: 0, flightCycles: 0 };
    dateTotal.flightHours += row.flightHours;
    dateTotal.flightCycles += row.flightCycles;
    totalsByDate.set(row.date, dateTotal);

    const key = row.date.slice(0, 7);
    const bucket = monthly.get(key) || createEmptyMonthlyBucket(row.date);
    bucket.aircraftFlightHours[row.registration] = (bucket.aircraftFlightHours[row.registration] || 0) + row.flightHours;
    bucket.totalFC += row.flightCycles;
    monthly.set(key, bucket);
  });

  const aircraft = getSelectedAircraftMeta().map((aircraftMeta) => {
    const rows = selectedRows.filter((row) => row.registration === aircraftMeta.registration);
    const totalFH = rows.reduce((sum, row) => sum + row.flightHours, 0);
    const totalFC = rows.reduce((sum, row) => sum + row.flightCycles, 0);
    const idleDays = rows.filter((row) => row.isIdleDay).length;

    return {
      ...aircraftMeta,
      totalFH,
      totalFC,
      idleDays,
      activeDays: calendarDays - idleDays,
      avgFHPerDay: totalFH / calendarDays,
      avgFHPerFlightCycle: totalFC ? totalFH / totalFC : 0
    };
  });

  const totalFH = aircraft.reduce((sum, aircraftItem) => sum + aircraftItem.totalFH, 0);
  const totalFC = aircraft.reduce((sum, aircraftItem) => sum + aircraftItem.totalFC, 0);
  const avgFHPerAircraftCalendarDay = aircraft.length
    ? aircraft.reduce((sum, aircraftItem) => sum + aircraftItem.avgFHPerDay, 0) / aircraft.length
    : 0;
  const idleAircraftDays = aircraft.reduce((sum, aircraftItem) => sum + aircraftItem.idleDays, 0);
  const idleCalendarDays = Array.from(totalsByDate.values()).filter(
    (day) => day.flightHours === 0 && day.flightCycles === 0
  ).length;

  return {
    calendarDays,
    aircraft,
    monthly: Array.from(monthly.values()).map((bucket) => ({
      ...bucket,
      aircraftFlightHours: Object.fromEntries(
        Object.entries(bucket.aircraftFlightHours).map(([registration, flightHours]) => [
          registration,
          Number(flightHours.toFixed(1))
        ])
      ),
      totalFC: Math.round(bucket.totalFC)
    })),
    kpis: {
      totalFH,
      totalFC,
      avgFHPerCalendarDay: avgFHPerAircraftCalendarDay,
      avgFHPerFlightCycle: totalFC ? totalFH / totalFC : 0,
      idleAircraftDays,
      idleCalendarDays
    }
  };
}

function renderKpiCards(summary) {
  const { kpis } = summary;

  return `
    <article class="kpi-card">
      <span>Total Flight Hours</span>
      <strong>${formatDecimal(kpis.totalFH, 1)}</strong>
    </article>
    <article class="kpi-card">
      <span>Total Flight Cycles</span>
      <strong>${formatNumber(kpis.totalFC)}</strong>
    </article>
    <article class="kpi-card">
      <span>Average Flight Hours / Aircraft / Day</span>
      <strong>${formatDecimal(kpis.avgFHPerCalendarDay, 2)}</strong>
    </article>
    <article class="kpi-card">
      <span>Average Flight Hours / Flight Cycle</span>
      <strong>${formatDecimal(kpis.avgFHPerFlightCycle, 2)}</strong>
    </article>
    <article class="kpi-card">
      <span>Selected Aircraft Idle Days</span>
      <strong>${formatNumber(kpis.idleAircraftDays)}</strong>
    </article>
  `;
}

function renderAircraftChoiceScreen() {
  return `
    <section class="aircraft-choice-screen" aria-labelledby="aircraftChoiceTitle">
      <div class="aircraft-choice-copy">
        <p class="card-kicker">Aircraft Utilization</p>
        <h2 id="aircraftChoiceTitle">Choose an aircraft</h2>
        <p>Select the aircraft model to open its utilization dashboard.</p>
      </div>
      <div class="aircraft-choice-grid">
        ${utilizationData.aircraft
          .map(
            (aircraft) => `
              <button
                class="aircraft-choice-card"
                data-aircraft-choice="${escapeHtml(aircraft.registration)}"
                type="button"
                aria-label="Open utilization dashboard for ${escapeHtml(aircraft.model)} ${escapeHtml(aircraft.registration)}"
              >
                <img src="${escapeHtml(aircraft.image)}" alt="${escapeHtml(aircraft.model)} ${escapeHtml(aircraft.registration)}" />
                <span class="aircraft-choice-body">
                  <span>
                    <strong>${escapeHtml(aircraft.model)}</strong>
                    <small>${escapeHtml(aircraft.registration)}</small>
                  </span>
                  <span class="choice-action">Open dashboard</span>
                </span>
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderAircraftSelector() {
  return utilizationData.aircraft
    .map((aircraft) => {
      const isSelected = state.selectedRegistrations.includes(aircraft.registration);

      return `
        <button
          class="aircraft-filter-button ${isSelected ? "active" : ""}"
          data-aircraft-filter="${aircraft.registration}"
          type="button"
          aria-pressed="${isSelected}"
        >
          <span>${aircraft.model}</span>
          <small>${aircraft.registration}</small>
        </button>
      `;
    })
    .join("");
}

function chooseAircraftForUtilization(registration) {
  const aircraftExists = utilizationData.aircraft.some((aircraft) => aircraft.registration === registration);
  if (!aircraftExists) {
    return;
  }

  state.selectedRegistrations = [registration];
  state.aircraftChoiceCompleted = true;
  state.aircraftRevealPending = true;
  utilizationFilter.startDate = utilizationData.validDates[0] || utilizationData.window.start;
  utilizationFilter.endDate = utilizationData.validDates[utilizationData.validDates.length - 1] || utilizationData.window.end;
  state.activeDatePicker = null;
  state.calendarMonth = null;
  normalizeDateRangeForSelectedAircraft();
  render();
}

function toggleAircraftSelection(registration) {
  if (state.selectedRegistrations.includes(registration) && state.selectedRegistrations.length === 1) {
    return;
  }

  state.selectedRegistrations = [registration];
  state.aircraftChoiceCompleted = true;
  normalizeDateRangeForSelectedAircraft();

  const filterContainer = document.getElementById("aircraftFilterControls");
  if (filterContainer) {
    filterContainer.innerHTML = renderAircraftSelector();
    bindAircraftFilterControls();
  }

  updateUtilizationSection();
}

function bindAircraftChoiceControls() {
  document.querySelectorAll("[data-aircraft-choice]").forEach((button) => {
    button.addEventListener("click", () => chooseAircraftForUtilization(button.dataset.aircraftChoice));
  });
}

function bindAircraftFilterControls() {
  document.querySelectorAll("[data-aircraft-filter]").forEach((button) => {
    button.addEventListener("click", () => toggleAircraftSelection(button.dataset.aircraftFilter));
  });
}

function openImagePreview(imageSource, imageTitle) {
  if (!imageLightbox || !imageLightboxImage || !imageLightboxCaption || !imageSource) {
    return;
  }

  imageLightboxImage.src = imageSource;
  imageLightboxImage.alt = imageTitle || "Aircraft preview";
  imageLightboxCaption.textContent = imageTitle || "Aircraft preview";
  imageLightbox.classList.remove("hidden");
  imageLightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("image-preview-open");
  imageLightbox.querySelector(".image-lightbox-close")?.focus({ preventScroll: true });
}

function closeImagePreview() {
  if (!imageLightbox || imageLightbox.classList.contains("hidden")) {
    return;
  }

  imageLightbox.classList.add("hidden");
  imageLightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("image-preview-open");
}

function bindAircraftImagePreview() {
  const aircraftCardGrid = document.getElementById("aircraftSummaryCards");
  if (!aircraftCardGrid) {
    return;
  }

  aircraftCardGrid.addEventListener("click", (event) => {
    const previewButton = event.target.closest("[data-image-preview]");
    if (!previewButton) {
      return;
    }

    openImagePreview(previewButton.dataset.imagePreview, previewButton.dataset.imageTitle);
  });
}

function renderAircraftSummaryCards(aircraftRows) {
  return aircraftRows
    .map(
      (aircraft) => `
        <article class="aircraft-summary-card">
          <button
            class="aircraft-image-button"
            type="button"
            data-image-preview="${aircraft.image}"
            data-image-title="${aircraft.model} ${aircraft.registration}"
            aria-label="Open full image for ${aircraft.model} ${aircraft.registration}"
          >
            <img src="${aircraft.image}" alt="${aircraft.model} ${aircraft.registration}" />
          </button>
          <div class="aircraft-summary-body">
            <div>
              <span class="model-pill model-pill-primary">${aircraft.model}</span>
              <p>${aircraft.registration}</p>
            </div>
            <dl>
              <div>
                <dt>Flight Hours</dt>
                <dd>${formatDecimal(aircraft.totalFH, 1)}</dd>
              </div>
              <div>
                <dt>Flight Cycles</dt>
                <dd>${formatNumber(aircraft.totalFC)}</dd>
              </div>
              <div>
                <dt>Idle Days</dt>
                <dd>${formatNumber(aircraft.idleDays)}</dd>
              </div>
            </dl>
          </div>
        </article>
      `
    )
    .join("");
}

function renderUtilizationRows(aircraftRows) {
  return aircraftRows
    .map(
      (aircraft) => `
        <tr>
          <td><span class="model-pill model-pill-primary">${aircraft.model}</span></td>
          <td><span class="tail-note">${aircraft.registration}</span></td>
          <td>${formatDecimal(aircraft.totalFH, 1)} Flight Hours</td>
          <td>${formatNumber(aircraft.totalFC)} Flight Cycles</td>
          <td>${formatDecimal(aircraft.avgFHPerDay, 2)}</td>
          <td>${formatDecimal(aircraft.avgFHPerFlightCycle, 2)}</td>
          <td>${formatNumber(aircraft.idleDays)}</td>
        </tr>
      `
    )
    .join("");
}

function updateUtilizationSection() {
  const summary = calculateUtilizationWindow();
  document.getElementById("utilizationWindowLabel").textContent =
    `${utilizationFilter.startDate} to ${utilizationFilter.endDate} (${summary.calendarDays} calendar days)`;
  document.querySelector("[data-date-picker='start']").textContent = formatDisplayDate(utilizationFilter.startDate);
  document.querySelector("[data-date-picker='end']").textContent = formatDisplayDate(utilizationFilter.endDate);
  document.getElementById("utilizationKpis").innerHTML = renderKpiCards(summary);
  document.getElementById("aircraftSummaryCards").innerHTML = renderAircraftSummaryCards(summary.aircraft);
  document.getElementById("utilizationTableBody").innerHTML = renderUtilizationRows(summary.aircraft);
  renderMonthlyUtilizationChart(summary);
}

function renderMaintenanceRows() {
  return maintenanceSchedule
    .map(
      (item) => `
        <tr>
          <td><span class="model-pill">${item.model}</span></td>
          <td><strong>${item.checkType}</strong></td>
          <td>${item.intervalHours}</td>
          <td>${item.nextDue}</td>
        </tr>
      `
    )
    .join("");
}

function renderMetricStrip(metrics) {
  return `
    <div class="metric-strip">
      ${metrics
        .map(
          (metric) => `
            <article>
              <span>${escapeHtml(metric.label)}</span>
              <strong>${escapeHtml(metric.value)}</strong>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderHeavyCheckValidationRows() {
  const rows = getFilteredHeavyCheckTasks().slice(0, 80);
  if (!rows.length) {
    return `<tr><td colspan="10">No task rows match the current validation filters.</td></tr>`;
  }

  return rows
    .map(
      (task) => `
        <tr>
          <td>${statusBadge(task.validationStatus, task.validationStatus)}</td>
          <td>
            <input class="table-input" data-heavy-task="${task.taskUid}" data-heavy-field="excluded" type="checkbox" ${
              task.excluded ? "checked" : ""
            } aria-label="Exclude ${escapeHtml(task.taskCardNo)}" />
          </td>
          <td>
            <input class="table-input" data-heavy-task="${task.taskUid}" data-heavy-field="taskCardNo" value="${escapeHtml(
              task.taskCardNo
            )}" />
          </td>
          <td><input class="table-input short" data-heavy-task="${task.taskUid}" data-heavy-field="ata" value="${escapeHtml(task.ata)}" /></td>
          <td><input class="table-input short" data-heavy-task="${task.taskUid}" data-heavy-field="trade" value="${escapeHtml(task.trade)}" /></td>
          <td><input class="table-input short" data-heavy-task="${task.taskUid}" data-heavy-field="phase" value="${escapeHtml(task.phase)}" /></td>
          <td><input class="table-input short" data-heavy-task="${task.taskUid}" data-heavy-field="sequence" value="${
            task.sequence ?? ""
          }" /></td>
          <td><input class="table-input short" data-heavy-task="${task.taskUid}" data-heavy-field="plannedMh" value="${
            task.plannedMh ?? ""
          }" /></td>
          <td>${escapeHtml(task.description)}</td>
          <td><small>${escapeHtml(task.validationMessage || "Ready")}</small></td>
        </tr>
      `
    )
    .join("");
}

function renderHeavyCheckSetupSection() {
  return "";
}

function bindHeavyCheckSetupControls() {
  return;
}

function renderDataSource() {
  if (!state.aircraftChoiceCompleted || !state.selectedRegistrations.length) {
    pageTitle.textContent = "Choose an aircraft";
    content.innerHTML = renderAircraftChoiceScreen();
    bindAircraftChoiceControls();
    bindHeavyCheckSetupControls();
    return;
  }

  normalizeDateRangeForSelectedAircraft();
  const initialSummary = calculateUtilizationWindow();
  const revealClass = state.aircraftRevealPending ? " utilization-dashboard-reveal" : "";

  content.innerHTML = `
    <section class="view-grid${revealClass}">
      <div class="utilization-header">
        <h2>AIRCRAFT UTILIZATION</h2>
        <div class="date-filter-panel" aria-label="Utilization date range picker">
          ${renderDateButton("start", "Start Date", utilizationFilter.startDate)}
          ${renderDateButton("end", "End Date", utilizationFilter.endDate)}
          <div class="date-calendar hidden" id="dateCalendar" role="dialog" aria-label="Select analysis date"></div>
        </div>
      </div>

      <article class="card utilization-section">
        <div>
          <p class="max-w-4xl">
            Flight hours represent actual aircraft operating exposure and are used to trigger hour-based inspection
            thresholds. Calendar days represent time in service and capture age, environment, and compliance limits
            that continue to apply even when aircraft utilization is low.
          </p>
          <p class="data-note" id="utilizationWindowLabel">
            ${utilizationFilter.startDate} to ${utilizationFilter.endDate} (${initialSummary.calendarDays} calendar days)
          </p>
        </div>

        <div class="aircraft-filter-panel">
          <div>
            <p class="card-kicker">Aircraft Selection</p>
            <h3>Choose Aircraft to Analyze</h3>
          </div>
          <div class="aircraft-filter-controls" id="aircraftFilterControls">
            ${renderAircraftSelector()}
          </div>
        </div>

        <div class="kpi-grid" id="utilizationKpis">${renderKpiCards(initialSummary)}</div>
        <div class="aircraft-card-grid" id="aircraftSummaryCards">${renderAircraftSummaryCards(initialSummary.aircraft)}</div>

        <article class="chart-panel">
          <div class="chart-toolbar">
            <div>
              <p class="card-kicker">Monthly Trend Chart</p>
              <h3>Flight Hours and Flight Cycles</h3>
            </div>
          </div>
          <div class="chart-frame utilization-chart">
            <canvas id="utilizationTrendChart" aria-label="Monthly utilization trend chart" role="img"></canvas>
          </div>
        </article>

        <div>
          <p class="card-kicker">Utilization Table</p>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Tail Number</th>
                  <th>Total Flight Hours</th>
                  <th>Total Flight Cycles</th>
                  <th>Average Flight Hours / Day</th>
                  <th>Average Flight Hours / Flight Cycle</th>
                  <th>Idle Days</th>
                </tr>
              </thead>
              <tbody id="utilizationTableBody">${renderUtilizationRows(initialSummary.aircraft)}</tbody>
            </table>
          </div>
        </div>
      </article>
    </section>
  `;

  document.querySelectorAll("[data-date-picker]").forEach((button) => {
    button.addEventListener("click", () => openDateCalendar(button.dataset.datePicker));
  });
  bindAircraftFilterControls();
  bindAircraftImagePreview();
  document.getElementById("dateCalendar")?.addEventListener("click", (event) => {
    const navButton = event.target.closest("[data-calendar-nav]");
    const dateButton = event.target.closest("[data-calendar-date]");

    if (navButton) {
      state.calendarMonth = addMonths(state.calendarMonth, Number(navButton.dataset.calendarNav));
      renderDateCalendar();
    }

    if (dateButton) {
      selectCalendarDate(dateButton.dataset.calendarDate);
    }
  });
  renderMonthlyUtilizationChart(initialSummary);
  bindHeavyCheckSetupControls();
  state.aircraftRevealPending = false;
}

function renderMonthlyUtilizationChart(summary) {
  if (!window.Chart) {
    showChartFallback("utilizationTrendChart");
    return;
  }

  if (state.charts.utilizationTrend) {
    state.charts.utilizationTrend.destroy();
    delete state.charts.utilizationTrend;
  }

  const defaults = chartDefaults();
  const labels = summary.monthly.map((item) => item.month);
  const context = document.getElementById("utilizationTrendChart");
  const selectedAircraft = getSelectedAircraftMeta();
  const monthlyFlightHourTotals = summary.monthly.map((item) =>
    Object.values(item.aircraftFlightHours).reduce((total, flightHours) => total + flightHours, 0)
  );
  const maxMonthlyFlightHours = Math.max(...monthlyFlightHourTotals, 0);
  const aircraftDatasets = selectedAircraft.map((aircraft, index) => {
    const color = chartColors.aircraftPalette[index % chartColors.aircraftPalette.length];

    return {
      label: `${aircraft.model} Flight Hours`,
      data: summary.monthly.map((item) => item.aircraftFlightHours[aircraft.registration] || 0),
      backgroundColor: color,
      borderColor: color,
      borderWidth: 1,
      borderRadius: 4,
      stack: "flight-hours"
    };
  });

  state.charts.utilizationTrend = new Chart(context, {
    type: "bar",
    plugins: [barValueLabelPlugin],
    data: {
      labels,
      datasets: [
        ...aircraftDatasets,
        {
          type: "line",
          label: "Total Flight Cycles",
          data: summary.monthly.map((item) => item.totalFC),
          borderColor: chartColors.yellowDark,
          backgroundColor: "rgba(200, 145, 0, 0.12)",
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: "#FFFFFF",
          pointBorderColor: chartColors.yellowDark,
          pointBorderWidth: 2,
          tension: 0.3,
          yAxisID: "y1"
        }
      ]
    },
    options: {
      ...defaults,
      layout: {
        padding: {
          top: 26
        }
      },
      plugins: {
        ...defaults.plugins,
        barValueLabels: {
          enabled: true,
          mode: "stackTotal",
          values: monthlyFlightHourTotals,
          decimals: 1
        }
      },
      scales: {
        x: {
          ...defaults.scales.x,
          stacked: true
        },
        y: {
          ...defaults.scales.y,
          stacked: true,
          suggestedMax: maxMonthlyFlightHours ? maxMonthlyFlightHours * 1.18 : undefined,
          title: {
            display: true,
            text: "Flight Hours",
            color: chartColors.muted,
            font: {
              family: "Montserrat",
              weight: "700"
            }
          }
        },
        y1: {
          beginAtZero: true,
          position: "right",
          border: {
            display: false
          },
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: chartColors.muted,
            padding: 10,
            font: {
              family: "Montserrat"
            }
          },
          title: {
            display: true,
            text: "Flight Cycles",
            color: chartColors.muted,
            font: {
              family: "Montserrat",
              weight: "700"
            }
          }
        }
      }
    }
  });
}

const heavyCheckMasterSheetName = "CONTROL SHEET - CTRL TASK CARD";
const heavyCheckFieldMap = {
  NO: "sourceNo",
  TASKCARDNO: "taskCardNo",
  ATA: "ata",
  TRADE: "trade",
  QTY: "quantity",
  PHASE: "phase",
  TASKCODE: "taskCode",
  SEQ: "sequence",
  OCAMHR: "plannedMh",
  ACTUALMHR: "actualMh",
  FILL1IFCLOSED: "closedFlag",
  REFMM: "refMm",
  REFDMC: "refDmc",
  TASKSTS: "taskStatus",
  TASKDESCRIPTION: "description",
  INTERVAL: "interval",
  ACREG: "aircraftRegistration"
};
const heavyCheckPackages = ["P1", "P2", "P3", "P4", "P5", "Core"];
const movableOptions = ["UNREVIEWED", "MOVABLE", "CONDITIONAL", "CORE"];
const reviewStatusOptions = ["PENDING", "REVIEWED", "APPROVED"];
const automaticMovabilityOptions = ["LIKELY_MOVABLE", "CONDITIONAL", "LIKELY_CORE", "UNCERTAIN"];
const confidenceOptions = ["HIGH", "MEDIUM", "LOW"];
const assignmentModes = {
  automatic: "Automatic Suggestion",
  approved: "Final Approved Plan"
};
const chartBreakdownOptions = {
  total: "Total Man-Hours",
  trade: "Trade",
  ata: "ATA",
  phase: "Phase"
};
const tradeLabels = {
  AP: "AP - Airframe & Powerplant",
  REI: "REI - Radio, Electrical & Instrument",
  SM: "SM - Sheet Metal",
  P: "P - Painter",
  PAINTER: "P - Painter",
  "AP / REI": "AP / REI - Joint AP and REI",
  "AP / SM": "AP / SM - Joint AP and Sheet Metal",
  "AP / P": "AP / P - Joint AP and Painter",
  OTHER: "Other / Unspecified"
};
const phaseOrder = [
  "INDUCTION",
  "DISASSEMBLY",
  "PRE-INSPECTION",
  "PRE INSPECTION",
  "INSPECTION",
  "REFURBISHMENT",
  "REASSEMBLY",
  "SERVICING",
  "TEST",
  "GROUND RUN",
  "WEIGHT AND BALANCE",
  "COMPASS SWING",
  "FLIGHT TEST",
  "RELEASE TO SERVICE"
];

function findHeavyCheckHeaderRow(rows) {
  return rows.findIndex((row) => {
    const normalized = row.map(normalizeHeaderKey);
    return normalized.includes("TASKCARDNO") && normalized.includes("ATA") && normalized.includes("TASKDESCRIPTION");
  });
}

function normalizeHeavyCheckTask(raw, context) {
  const quantity = parseNumeric(raw.quantity);
  const plannedMh = parseNumeric(raw.plannedMh);
  const actualMh = parseNumeric(raw.actualMh);
  const sequence = parseNumeric(raw.sequence);
  const taskCardNo = normalizeText(raw.taskCardNo, true);
  const sourceNo = normalizeText(raw.sourceNo, false);

  return {
    taskUid: `${context.sourceFile}::${context.sourceSheet}::${context.sourceRow}::${taskCardNo || sourceNo || "TASK"}`,
    sourceFile: context.sourceFile,
    sourceSheet: context.sourceSheet,
    sourceRow: context.sourceRow,
    sourceNo,
    taskCardNo,
    ata: normalizeAta(raw.ata),
    trade: normalizeTrade(raw.trade),
    quantity,
    phase: normalizePhase(raw.phase),
    taskCode: normalizeText(raw.taskCode, true),
    sequence,
    plannedMh,
    actualMh,
    closedFlag: normalizeText(raw.closedFlag, true),
    refMm: normalizeText(raw.refMm, true),
    refDmc: normalizeText(raw.refDmc, true),
    taskStatus: normalizeText(raw.taskStatus, true),
    description: normalizeText(raw.description, false),
    interval: normalizeText(raw.interval, true),
    aircraftRegistration: normalizeAircraftRegistration(raw.aircraftRegistration),
    excluded: false,
    autoMovability: "",
    autoConfidence: "",
    autoReason: "",
    autoGroupId: "",
    autoGroupReason: "",
    autoGroupConfidence: "",
    proposedPackage: "Core",
    engineeringDecision: "UNREVIEWED",
    finalPackage: "Core",
    movability: "UNREVIEWED",
    approvedGroupId: "",
    accessGroup: "",
    packageLock: false,
    reviewNotes: "",
    reviewedBy: "",
    reviewStatus: "PENDING",
    candidateGroupId: "",
    candidateReason: "",
    candidateConfidence: "",
    manualOverride: "",
    validationStatus: "valid",
    validationMessage: "",
    errors: [],
    warnings: []
  };
}

function validateHeavyCheckTasks(tasks) {
  const cardCounts = new Map();
  const allowedTrades = new Set(["AP", "REI", "SM", "P", "PAINTER", "AP / REI", "AP / SM", "AP / P", "OTHER"]);
  tasks.forEach((task) => {
    if (task.taskCardNo) {
      cardCounts.set(task.taskCardNo, (cardCounts.get(task.taskCardNo) || 0) + 1);
    }
  });

  return tasks.map((task) => {
    const errors = [];
    const warnings = [];

    if (!task.taskCardNo) errors.push("Missing task-card number");
    if (!task.ata) errors.push("Missing ATA chapter");
    if (!task.description) errors.push("Missing task description");
    if (!task.phase) errors.push("Missing phase");
    if (!task.trade) errors.push("Missing trade");
    if (task.sequence == null) errors.push("Missing sequence");
    if (task.plannedMh == null) errors.push("Missing or invalid OCA man-hours");
    if (Number(task.plannedMh) < 0) errors.push("Negative man-hours");
    if (!task.interval || !isHeavyCheckInterval(task.interval)) errors.push("Invalid heavy-check interval");

    if (task.plannedMh === 0) warnings.push("Zero man-hours");
    if (!task.refMm) warnings.push("Missing maintenance-manual reference");
    if (!task.refDmc) warnings.push("Missing DMC reference");
    if (task.trade === "APP") warnings.push("Trade APP may be inconsistent; review and correct to AP if intended");
    if (task.trade && task.trade !== "APP" && !allowedTrades.has(task.trade)) warnings.push(`Unknown trade value: ${task.trade}`);
    if (task.trade.includes("/") || task.trade.includes("&")) warnings.push("Combined trade");
    if (/SUMMARY|GENERAL|INSPECTION PROGRAM/i.test(task.description)) warnings.push("Possible summary inspection task");
    if (cardCounts.get(task.taskCardNo) > 1) {
      warnings.push("Duplicate task-card number requires review");
    }

    const validationStatus = errors.length ? "error" : warnings.length ? "warning" : "valid";
    return {
      ...task,
      errors,
      warnings,
      validationStatus,
      validationMessage: [...errors, ...warnings].join("; ")
    };
  });
}

function importHeavyCheckWorkbook() {
  state.heavyCheckUploadMessage = "Workbook upload has been removed from this dashboard workflow.";
}

function getValidationSummary(tasks = state.heavyCheckDraftTasks) {
  const totalTasks = tasks.length;
  const validTasks = tasks.filter((task) => task.validationStatus === "valid").length;
  const tasksWithErrors = tasks.filter((task) => task.validationStatus === "error").length;
  const tasksWithWarnings = tasks.filter((task) => task.validationStatus === "warning").length;
  const missingManHours = tasks.filter((task) => task.plannedMh == null).length;
  const knownManHours = tasks.reduce((sum, task) => sum + (task.plannedMh == null ? 0 : Number(task.plannedMh)), 0);
  const knownCount = tasks.filter((task) => task.plannedMh != null).length;

  return {
    totalTasks,
    validTasks,
    tasksWithErrors,
    tasksWithWarnings,
    missingManHours,
    knownManHours,
    workloadCoverage: totalTasks ? (knownCount / totalTasks) * 100 : 0
  };
}

function getFilteredHeavyCheckTasks() {
  const status = state.heavyCheckStatusFilter;
  const search = state.heavyCheckSearch.trim().toUpperCase();
  return state.heavyCheckDraftTasks.filter((task) => {
    const statusMatch = status === "all" || task.validationStatus === status || (status === "excluded" && task.excluded);
    const searchMatch =
      !search ||
      [task.taskCardNo, task.ata, task.trade, task.phase, task.taskCode, task.description, task.validationMessage]
        .join(" ")
        .toUpperCase()
        .includes(search);
    return statusMatch && searchMatch;
  });
}

function updateHeavyCheckTaskField(taskUid, field, value) {
  state.heavyCheckDraftTasks = state.heavyCheckDraftTasks.map((task) => {
    if (task.taskUid !== taskUid) {
      return task;
    }

    const updated = {
      ...task,
      [field]: field === "plannedMh" || field === "sequence" || field === "quantity" ? parseNumeric(value) : value
    };
    if (field === "ata") updated.ata = normalizeAta(value);
    if (field === "trade") updated.trade = normalizeTrade(value);
    if (field === "phase") updated.phase = normalizePhase(value);
    if (field === "taskCode") updated.taskCode = normalizeText(value, true);
    if (field === "aircraftRegistration") updated.aircraftRegistration = normalizeAircraftRegistration(value);
    return updated;
  });
}

function revalidateHeavyCheckDraft() {
  state.heavyCheckDraftTasks = validateHeavyCheckTasks(state.heavyCheckDraftTasks);
  state.maintenancePlanCreated = false;
  state.equalizationStarted = false;
  state.equalizationLoading = false;
  state.ganttCreated = false;
  state.ganttGenerated = false;
  state.latestEqualizationScenario = null;
  state.heavyCheckUploadMessage = "Task master revalidated.";
  render();
}

function bulkExcludeHeavyCheckErrors() {
  const errorTasks = state.heavyCheckDraftTasks.filter((task) => task.validationStatus === "error" && !task.excluded);
  if (!errorTasks.length) {
    state.heavyCheckUploadMessage = "There are no unexcluded validation-error rows to bulk exclude.";
    render();
    return;
  }

  state.heavyCheckDraftTasks = state.heavyCheckDraftTasks.map((task) =>
    task.validationStatus === "error" ? { ...task, excluded: true } : task
  );
  state.maintenancePlanCreated = false;
  state.equalizationStarted = false;
  state.equalizationLoading = false;
  state.ganttCreated = false;
  state.ganttGenerated = false;
  state.latestEqualizationScenario = null;
  state.heavyCheckStatusFilter = "excluded";
  state.heavyCheckUploadMessage = `Excluded ${formatNumber(errorTasks.length)} validation-error row(s). Review the Excluded filter before creating the maintenance plan.`;
  render();
}

function clearHeavyCheckExclusions() {
  const excludedTasks = state.heavyCheckDraftTasks.filter((task) => task.excluded);
  if (!excludedTasks.length) {
    state.heavyCheckUploadMessage = "There are no excluded rows to restore.";
    render();
    return;
  }

  state.heavyCheckDraftTasks = state.heavyCheckDraftTasks.map((task) => ({ ...task, excluded: false }));
  state.maintenancePlanCreated = false;
  state.equalizationStarted = false;
  state.equalizationLoading = false;
  state.ganttCreated = false;
  state.ganttGenerated = false;
  state.latestEqualizationScenario = null;
  state.heavyCheckStatusFilter = "all";
  state.heavyCheckUploadMessage = `Restored ${formatNumber(excludedTasks.length)} excluded row(s).`;
  render();
}

function approveHeavyCheckTaskMaster() {
  const blockingTasks = state.heavyCheckDraftTasks.filter((task) => task.validationStatus === "error" && !task.excluded);
  if (blockingTasks.length) {
    state.heavyCheckUploadMessage = `${formatNumber(blockingTasks.length)} blocking task error(s) must be corrected or explicitly excluded before creating the maintenance plan.`;
    render();
    return;
  }

  state.approvedTaskMaster = state.heavyCheckDraftTasks.filter((task) => !task.excluded);
  state.reviewedTaskMaster = state.approvedTaskMaster.map((task) => ({
    ...task,
    trade: normalizeTrade(task.trade === "APP" ? "AP" : task.trade)
  }));
  state.manualPackageAssignments = {};
  state.latestEqualizationScenario = null;
  state.maintenancePlanCreated = true;
  state.equalizationStarted = false;
  state.equalizationLoading = false;
  state.ganttCreated = false;
  state.ganttGenerated = false;
  state.selectedGanttPackage = "P1";
  state.section = "equalized-inspection";
  state.heavyCheckUploadMessage = `Maintenance plan created from ${formatNumber(state.approvedTaskMaster.length)} cleaned 5000-hour task rows.`;
  render();
}

function getTaskActionWords(task) {
  const text = `${task.description || ""} ${task.taskCode || ""}`.toUpperCase();
  const actions = ["REMOVE", "REMOVAL", "INSPECT", "CHECK", "TEST", "REPAIR", "INSTALL", "REASSEMBLE", "CLEAN", "SERVICE", "LUBRICATE", "REPLACE", "CLOSE", "CLOSURE"];
  return actions.filter((word) => new RegExp(`\\b${word}\\b`, "i").test(text));
}

function getReferenceFamily(value, tokenCount = 4) {
  const text = normalizeText(value, true);
  if (!text) {
    return "";
  }

  return text
    .split(/[-.\s/]+/)
    .filter(Boolean)
    .slice(0, tokenCount)
    .join("-");
}

function getTaskCodeFamily(value) {
  const text = normalizeText(value, true);
  if (!text) {
    return "";
  }

  return text
    .replace(/[^A-Z0-9]+/g, "-")
    .split("-")
    .filter(Boolean)
    .slice(0, 2)
    .join("-");
}

function extractComponentTerms(task) {
  const ignored = new Set([
    "THE",
    "AND",
    "FOR",
    "WITH",
    "FROM",
    "THIS",
    "THAT",
    "TASK",
    "CARD",
    "SYSTEM",
    "CHECK",
    "TEST",
    "INSPECT",
    "INSPECTION",
    "REMOVE",
    "REMOVAL",
    "INSTALL",
    "INSTALLATION",
    "REPLACE",
    "REPAIR",
    "CLEAN",
    "SERVICE",
    "SERVICING",
    "LUBRICATE",
    "VERIFY",
    "VISUAL",
    "GENERAL",
    "AIRCRAFT",
    "HELICOPTER",
    "BELL"
  ]);
  const words = `${task.description || ""} ${task.refMm || ""} ${task.refDmc || ""}`
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]+/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^-|-$/g, ""))
    .filter((word) => word.length >= 4 && !ignored.has(word) && !/^\d+$/.test(word));

  return Array.from(new Set(words)).slice(0, 5);
}

function classifyHeavyCheckTask(task) {
  const description = normalizeText(task.description, true);
  const phase = normalizeText(task.phase, true);
  const taskCode = normalizeText(task.taskCode, true);
  const referencesAvailable = Boolean(task.refDmc || task.refMm);
  const plannedMh = Number(task.plannedMh) || 0;
  const actionWords = getTaskActionWords(task);
  const hasFinalDependency =
    /FINAL\s+(?:GROUND\s+RUN|FUNCTIONAL|REASSEMBLY|ASSEMBLY|CLOSURE|CLOSE|INSPECTION|TEST)/.test(description) ||
    /\b(?:GROUND\s+RUN|WEIGHT\s+AND\s+BALANCE|COMPASS\s+SWING|FLIGHT\s+TEST|RELEASE\s+TO\s+SERVICE|RETURN\s+TO\s+SERVICE)\b/.test(
      `${description} ${phase}`
    );
  const dependencyWords = /\b(?:ALIGNMENT|CALIBRATION|RIGGING|OPERATIONAL\s+TEST|FUNCTIONAL\s+TEST|LEAK\s+TEST|PRESSURE\s+TEST|FINAL|CLOSURE|CLOSE)\b/.test(
    `${description} ${phase}`
  );
  const standaloneWords = /\b(?:VISUAL|GENERAL|DETAILED|INSPECT|CHECK|CLEAN|CLEANING|SERVICE|SERVICING|LUBRICATE|DRAIN|REPLENISH|FILTER|MINOR)\b/.test(
    `${description} ${taskCode}`
  );
  const chainWords = actionWords.filter((word) => ["REMOVE", "REMOVAL", "INSTALL", "REASSEMBLE", "REPAIR", "TEST"].includes(word));

  if (hasFinalDependency) {
    return {
      autoMovability: "LIKELY_CORE",
      autoConfidence: "HIGH",
      autoReason: "Suggested to stay in the heavy check because it appears to be a final test, closure, release, or aircraft-level verification task."
    };
  }

  if (!description || task.plannedMh == null || plannedMh <= 0) {
    return {
      autoMovability: "UNCERTAIN",
      autoConfidence: "LOW",
      autoReason: "Needs engineer review because the task has incomplete description or man-hour information."
    };
  }

  if (dependencyWords && chainWords.length >= 1) {
    return {
      autoMovability: "CONDITIONAL",
      autoConfidence: referencesAvailable ? "MEDIUM" : "LOW",
      autoReason: "Suggested to move together because it appears connected to testing, closure, alignment, or reassembly work."
    };
  }

  if (chainWords.length >= 2) {
    return {
      autoMovability: "CONDITIONAL",
      autoConfidence: referencesAvailable ? "MEDIUM" : "LOW",
      autoReason: "Suggested to move together because the wording includes a remove, repair, install, or test chain."
    };
  }

  if (standaloneWords && !dependencyWords) {
    return {
      autoMovability: "LIKELY_MOVABLE",
      autoConfidence: referencesAvailable ? "HIGH" : "MEDIUM",
      autoReason: "Suggested to move because it appears to be a standalone inspection, cleaning, servicing, or minor maintenance task."
    };
  }

  if (plannedMh >= 40 && !referencesAvailable) {
    return {
      autoMovability: "UNCERTAIN",
      autoConfidence: "LOW",
      autoReason: "Needs engineer review because this is a high man-hour task without enough reference information to confirm dependencies."
    };
  }

  return {
    autoMovability: "UNCERTAIN",
    autoConfidence: referencesAvailable ? "MEDIUM" : "LOW",
    autoReason: "Needs engineer review because the spreadsheet does not contain enough dependency information for a reliable automatic decision."
  };
}

function buildAutomaticGroupKey(task) {
  const dmcFamily = getReferenceFamily(task.refDmc, 5);
  const mmFamily = getReferenceFamily(task.refMm, 4);
  const taskCodeFamily = getTaskCodeFamily(task.taskCode);
  const component = extractComponentTerms(task).slice(0, 3).join("-");
  const ataSubsystem = normalizeText(task.ata, true).slice(0, 3);
  const phaseFamily = getPhaseRank(task.phase);
  const trade = normalizeTrade(task.trade);

  if (dmcFamily && component) {
    return {
      key: `${dmcFamily}::${component}::${trade}`,
      reason: "Same DMC family, component wording, and compatible trade",
      confidence: "HIGH"
    };
  }

  if (mmFamily && component) {
    return {
      key: `${mmFamily}::${component}::${trade}`,
      reason: "Same maintenance-manual family, component wording, and compatible trade",
      confidence: "MEDIUM"
    };
  }

  if (component && taskCodeFamily) {
    return {
      key: `${ataSubsystem}::${taskCodeFamily}::${component}::${phaseFamily}::${trade}`,
      reason: "Same task-code family, component wording, phase, and trade",
      confidence: "MEDIUM"
    };
  }

  return {
    key: "",
    reason: "",
    confidence: ""
  };
}

function buildAutomaticReviewModel(tasks) {
  const classifiedTasks = tasks.map((task) => {
    const classification = classifyHeavyCheckTask(task);
    const existingDecision = task.engineeringDecision || task.movability || "UNREVIEWED";

    return {
      ...task,
      ...classification,
      candidateGroupId: task.candidateGroupId || task.autoGroupId || "",
      candidateReason: task.candidateReason || task.autoGroupReason || "",
      candidateConfidence: task.candidateConfidence || task.autoGroupConfidence || "",
      engineeringDecision: existingDecision,
      movability: task.movability || existingDecision,
      finalPackage: task.finalPackage || "Core",
      proposedPackage: task.proposedPackage || "Core",
      reviewStatus: task.reviewStatus || "PENDING"
    };
  });

  const groupingBuckets = new Map();
  classifiedTasks.forEach((task) => {
    if (!["LIKELY_MOVABLE", "CONDITIONAL"].includes(task.autoMovability)) {
      return;
    }

    const grouping = buildAutomaticGroupKey(task);
    if (!grouping.key) {
      return;
    }

    const bucket = groupingBuckets.get(grouping.key) || {
      key: grouping.key,
      tasks: [],
      reason: grouping.reason,
      confidence: grouping.confidence
    };
    bucket.tasks.push(task);
    groupingBuckets.set(grouping.key, bucket);
  });

  const groups = Array.from(groupingBuckets.values())
    .filter((bucket) => bucket.tasks.length > 1 && bucket.tasks.length <= 18)
    .sort((a, b) => b.tasks.reduce((sum, task) => sum + (Number(task.plannedMh) || 0), 0) - a.tasks.reduce((sum, task) => sum + (Number(task.plannedMh) || 0), 0));
  const groupIdByTask = new Map();

  groups.forEach((group, index) => {
    const groupId = `AUTO-GRP-${String(index + 1).padStart(3, "0")}`;
    group.tasks.forEach((task) => {
      groupIdByTask.set(task.taskUid, {
        groupId,
        reason: group.reason,
        confidence: group.confidence
      });
    });
  });

  return classifiedTasks.map((task) => {
    const group = groupIdByTask.get(task.taskUid);
    return {
      ...task,
      autoGroupId: group?.groupId || "",
      autoGroupReason: group?.reason || "",
      autoGroupConfidence: group?.confidence || "",
      candidateGroupId: task.candidateGroupId || group?.groupId || "",
      candidateReason: task.candidateReason || group?.reason || "",
      candidateConfidence: task.candidateConfidence || group?.confidence || ""
    };
  });
}

function ensureEngineeringFields(tasks) {
  return buildAutomaticReviewModel(tasks).map((task) => ({
    ...task,
    movability: task.movability || "UNREVIEWED",
    engineeringDecision: task.engineeringDecision || task.movability || "UNREVIEWED",
    approvedGroupId: task.approvedGroupId || "",
    accessGroup: task.accessGroup || "",
    packageLock: Boolean(task.packageLock),
    reviewNotes: task.reviewNotes || "",
    reviewedBy: task.reviewedBy || "",
    reviewStatus: task.reviewStatus || "PENDING",
    candidateGroupId: task.candidateGroupId || "",
    candidateReason: task.candidateReason || "",
    candidateConfidence: task.candidateConfidence || "",
    finalPackage: task.finalPackage || "Core",
    proposedPackage: task.proposedPackage || "Core"
  }));
}

function getReviewedTasks() {
  if (state.reviewedTaskMaster.length) {
    return state.reviewedTaskMaster;
  }

  if (state.approvedTaskMaster.length) {
    state.reviewedTaskMaster = ensureEngineeringFields(state.approvedTaskMaster);
  }

  return state.reviewedTaskMaster;
}

function getReviewedTasksForSelectedProgram() {
  const program = getSelectedMaintenanceProgram();
  return getReviewedTasks().filter((task) => heavyCheckTaskAppliesToSelectedProgram(task, program));
}

function getApprovedHeavyCheckSummary() {
  const tasks = getApprovedHeavyCheckWorkloadForSelectedProgram().tasks;
  return {
    tasks,
    taskCount: tasks.length,
    knownManHours: tasks.reduce((sum, task) => sum + (Number(task.plannedMh) || 0), 0),
    missingManHourTasks: tasks.filter((task) => task.plannedMh == null).length,
    byAta: summarizeWorkload(tasks, "ata"),
    byTrade: summarizeWorkload(tasks, "trade"),
    byPhase: summarizeWorkload(tasks, "phase"),
    byTaskCode: summarizeWorkload(tasks, "taskCode")
  };
}

function summarizeWorkload(tasks, key) {
  const summary = new Map();
  tasks.forEach((task) => {
    const label = normalizeBlank(task[key]) || "Unspecified";
    const current = summary.get(label) || { label, tasks: 0, manHours: 0 };
    current.tasks += 1;
    current.manHours += Number(task.plannedMh) || 0;
    summary.set(label, current);
  });

  return Array.from(summary.values()).sort((a, b) => b.manHours - a.manHours);
}

function filterReviewTasks(tasks = getReviewedTasksForSelectedProgram()) {
  const filters = state.reviewFilters;
  const search = filters.search.trim().toUpperCase();
  return tasks.filter((task) => {
    return (
      (filters.ata === "all" || task.ata === filters.ata) &&
      (filters.phase === "all" || task.phase === filters.phase) &&
      (filters.trade === "all" || task.trade === filters.trade) &&
      (filters.taskCode === "all" || task.taskCode === filters.taskCode) &&
      (filters.movability === "all" || task.autoMovability === filters.movability || task.movability === filters.movability) &&
      (filters.confidence === "all" || task.autoConfidence === filters.confidence || task.autoGroupConfidence === filters.confidence) &&
      (filters.package === "all" || task.proposedPackage === filters.package || task.finalPackage === filters.package) &&
      (filters.reviewStatus === "all" || task.reviewStatus === filters.reviewStatus) &&
      (!search || [task.taskCardNo, task.description, task.refMm, task.refDmc, task.autoGroupId, task.approvedGroupId].join(" ").toUpperCase().includes(search))
    );
  });
}

function updateReviewTask(taskUid, field, value) {
  state.reviewedTaskMaster = getReviewedTasks().map((task) => {
    if (task.taskUid !== taskUid) {
      return task;
    }

    const updated = {
      ...task,
      [field]: field === "packageLock" ? value === "true" || value === true : value
    };
    if (field === "movability" || field === "engineeringDecision") {
      updated.movability = value;
      updated.engineeringDecision = value;
    }
    if (field === "finalPackage" && value !== "Core") {
      updated.reviewStatus = updated.reviewStatus === "PENDING" ? "REVIEWED" : updated.reviewStatus;
    }
    return updated;
  });
  state.latestEqualizationScenario = null;
}

function applyBulkReviewUpdate(field, value) {
  const selected = new Set(state.selectedReviewTaskUids);
  if (!selected.size) {
    return;
  }

  state.reviewedTaskMaster = getReviewedTasks().map((task) =>
    selected.has(task.taskUid)
      ? (() => {
          const updated = {
            ...task,
            [field]: field === "packageLock" ? value === "true" || value === true : value
          };
          if (field === "movability" || field === "engineeringDecision") {
            updated.movability = value;
            updated.engineeringDecision = value;
          }
          return updated;
        })()
      : task
  );
  state.latestEqualizationScenario = null;
  render();
}

function suggestCandidateGroups() {
  state.reviewedTaskMaster = buildAutomaticReviewModel(getReviewedTasks());
  state.latestEqualizationScenario = null;
  render();
}

function getTaskItemKey(task, mode = state.equalizationAssignmentMode) {
  if (mode === "approved" && task.approvedGroupId) {
    return `approved-group:${task.approvedGroupId}`;
  }
  if (mode === "automatic" && task.autoGroupId) {
    return `auto-group:${task.autoGroupId}`;
  }
  return `task:${task.taskUid}`;
}

function getPackageFieldForMode(mode) {
  return mode === "approved" ? "finalPackage" : "proposedPackage";
}

function normalizePlanTrade(trade) {
  const normalized = normalizeTrade(trade === "APP" ? "AP" : trade);
  if (normalized === "PAINTER") {
    return "P";
  }
  return normalized || "OTHER";
}

function getGanttTechnicianCount(inputs = state.ganttInputs) {
  const value = Number(inputs.totalTechnicians);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function hasCompleteGanttInputs() {
  return (
    getGanttTechnicianCount() > 0 &&
    Number(state.ganttInputs.hoursPerShift) > 0 &&
    Number(state.ganttInputs.productivityFactor) > 0
  );
}

function estimateGroundDaysForRows(rows, inputs = state.ganttInputs) {
  if (!rows.length) {
    return 0;
  }

  const productiveHoursPerDay =
    Math.max(0, Number(inputs.shifts) || 0) *
    Math.max(0, Number(inputs.hoursPerShift) || 0) *
    Math.max(0, Number(inputs.productivityFactor) || 0);
  const totalTechnicians = getGanttTechnicianCount(inputs);
  if (totalTechnicians > 0 && productiveHoursPerDay > 0) {
    const totalManHours = rows.reduce((sum, row) => sum + (Number(row.plannedMh) || 0), 0);
    return totalManHours / (totalTechnicians * productiveHoursPerDay);
  }

  const byTrade = summarizeWorkload(rows, "trade");
  const tradeDurations = byTrade.map((tradeRow) => {
    const trade = normalizePlanTrade(tradeRow.label);
    const personnel = Number(inputs.tradeCapacity[trade] ?? inputs.tradeCapacity.OTHER ?? 0);
    const denominator = personnel * productiveHoursPerDay;
    return denominator > 0 ? tradeRow.manHours / denominator : 0;
  });

  return tradeDurations.length ? Math.max(...tradeDurations, 0) : 0;
}

function getCleanMaintenanceTasks() {
  return getReviewedTasksForSelectedProgram().map((task) => ({
    ...task,
    trade: normalizePlanTrade(task.trade),
    plannedMh: Number(task.plannedMh) || 0
  }));
}

function createTradeGroups(tasks, packageLimit = Infinity) {
  const byTrade = new Map();
  tasks.forEach((task) => {
    const trade = normalizePlanTrade(task.trade);
    const group = byTrade.get(trade) || { trade, tasks: [], manHours: 0 };
    group.tasks.push(task);
    group.manHours += Number(task.plannedMh) || 0;
    byTrade.set(trade, group);
  });

  return Array.from(byTrade.values())
    .sort((a, b) => b.manHours - a.manHours)
    .flatMap((tradeGroup) => splitOversizedTradeGroup(tradeGroup, packageLimit));
}

function splitOversizedTradeGroup(tradeGroup, packageLimit = Infinity) {
  if (!Number.isFinite(packageLimit) || tradeGroup.manHours <= packageLimit || packageLimit <= 0) {
    return [
      {
        id: tradeGroup.trade,
        trade: tradeGroup.trade,
        tasks: tradeGroup.tasks,
        manHours: tradeGroup.manHours,
        split: false,
        oversizedTask: false
      }
    ];
  }

  const chunks = [];
  const sortedTasks = [...tradeGroup.tasks].sort((a, b) => (Number(b.plannedMh) || 0) - (Number(a.plannedMh) || 0));
  sortedTasks.forEach((task) => {
    const taskMh = Number(task.plannedMh) || 0;
    const bestChunk = chunks
      .filter((chunk) => chunk.manHours + taskMh <= packageLimit)
      .sort((a, b) => a.manHours - b.manHours)[0];

    if (bestChunk) {
      bestChunk.tasks.push(task);
      bestChunk.manHours += taskMh;
    } else {
      chunks.push({
        trade: tradeGroup.trade,
        tasks: [task],
        manHours: taskMh,
        oversizedTask: taskMh > packageLimit
      });
    }
  });

  return chunks.map((chunk, index) => ({
    ...chunk,
    id: `${tradeGroup.trade}-${index + 1}`,
    split: true
  }));
}

function getPackagePlanConfig(percentKey = state.equalized) {
  return equalizedPrograms[percentKey] || equalizedPrograms["100"];
}

function calculateStdDev(values) {
  if (!values.length) {
    return 0;
  }
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function scorePackageTotals(totals, groups) {
  const highest = Math.max(...totals, 0);
  const lowest = Math.min(...totals, 0);
  const emptyPackages = totals.filter((total) => total <= 0).length;
  const splitCount = groups.filter((group) => group.split).length;
  return {
    range: highest - lowest,
    stdDev: calculateStdDev(totals),
    emptyPackages,
    splitCount
  };
}

function isBetterPackageScore(candidate, best) {
  if (!best) return true;
  if (candidate.range !== best.range) return candidate.range < best.range;
  if (candidate.stdDev !== best.stdDev) return candidate.stdDev < best.stdDev;
  if (candidate.emptyPackages !== best.emptyPackages) return candidate.emptyPackages < best.emptyPackages;
  return candidate.splitCount < best.splitCount;
}

function greedyPackageAssignment(groups, packageNames, packageLimit = Infinity) {
  const packages = packageNames.map((name) => ({ name, groups: [], manHours: 0 }));
  groups
    .slice()
    .sort((a, b) => b.manHours - a.manHours)
    .forEach((group) => {
      const candidates = packages
        .filter((pkg) => !Number.isFinite(packageLimit) || pkg.manHours + group.manHours <= packageLimit || group.oversizedTask)
        .sort((a, b) => a.manHours - b.manHours);
      const target = candidates[0] || packages.slice().sort((a, b) => a.manHours - b.manHours)[0];
      target.groups.push(group);
      target.manHours += group.manHours;
    });
  return packages;
}

function optimizePackageAssignment(groups, packageNames, packageLimit = Infinity) {
  const sortedGroups = groups.slice().sort((a, b) => b.manHours - a.manHours);
  const packageCount = packageNames.length;
  const current = Array.from({ length: packageCount }, (_, index) => ({
    name: packageNames[index],
    groups: [],
    manHours: 0
  }));
  let bestPackages = null;
  let bestScore = null;
  let explored = 0;
  const maxExplored = 220000;

  function snapshotPackages() {
    return current.map((pkg) => ({
      name: pkg.name,
      groups: [...pkg.groups],
      manHours: pkg.manHours
    }));
  }

  function search(index) {
    if (explored > maxExplored) {
      return;
    }
    explored += 1;

    if (index >= sortedGroups.length) {
      const totals = current.map((pkg) => pkg.manHours);
      const score = scorePackageTotals(totals, sortedGroups);
      if (isBetterPackageScore(score, bestScore)) {
        bestScore = score;
        bestPackages = snapshotPackages();
      }
      return;
    }

    const group = sortedGroups[index];
    const triedTotals = new Set();

    for (let packageIndex = 0; packageIndex < packageCount; packageIndex += 1) {
      const pkg = current[packageIndex];
      const roundedTotal = Math.round(pkg.manHours * 100) / 100;
      if (triedTotals.has(roundedTotal)) {
        continue;
      }
      triedTotals.add(roundedTotal);

      if (Number.isFinite(packageLimit) && pkg.manHours + group.manHours > packageLimit && !group.oversizedTask) {
        continue;
      }

      pkg.groups.push(group);
      pkg.manHours += group.manHours;
      search(index + 1);
      pkg.manHours -= group.manHours;
      pkg.groups.pop();
    }
  }

  search(0);
  const packages = bestPackages || greedyPackageAssignment(sortedGroups, packageNames, packageLimit);
  return {
    packages,
    optimized: Boolean(bestPackages),
    explored,
    stoppedEarly: explored > maxExplored
  };
}

function applyManualAssignments(packages, packageNames, tasks = getCleanMaintenanceTasks()) {
  const packageMap = new Map(packageNames.map((name) => [name, { name, groups: [], manHours: 0 }]));
  const groupMap = new Map();
  packages.forEach((pkg) => {
    pkg.groups.forEach((group) => {
      const manualPackage = state.manualPackageAssignments[`group:${group.id}`] || pkg.name;
      const targetPackage = packageMap.get(manualPackage) ? manualPackage : pkg.name;
      groupMap.set(group.id, { ...group, assignedPackage: targetPackage });
    });
  });

  tasks.forEach((task) => {
    const manualPackage = state.manualPackageAssignments[`task:${task.taskUid}`];
    if (!manualPackage || !packageMap.has(manualPackage)) {
      return;
    }
    const currentGroup = Array.from(groupMap.values()).find((group) =>
      group.tasks.some((groupTask) => groupTask.taskUid === task.taskUid)
    );
    if (currentGroup) {
      currentGroup.tasks = currentGroup.tasks.filter((groupTask) => groupTask.taskUid !== task.taskUid);
      currentGroup.manHours = currentGroup.tasks.reduce((sum, groupTask) => sum + (Number(groupTask.plannedMh) || 0), 0);
    }
    const taskGroupId = `TASK-${task.taskUid}`;
    groupMap.set(taskGroupId, {
      id: taskGroupId,
      trade: normalizePlanTrade(task.trade),
      tasks: [task],
      manHours: Number(task.plannedMh) || 0,
      split: true,
      manualTaskMove: true,
      assignedPackage: manualPackage
    });
  });

  Array.from(groupMap.values())
    .filter((group) => group.tasks.length)
    .forEach((group) => {
      const target = packageMap.get(group.assignedPackage) || packageMap.get(packageNames[0]);
      target.groups.push(group);
      target.manHours += group.manHours;
    });

  return packageNames.map((name) => packageMap.get(name));
}

function buildEqualizationScenarioFromTasks(percentKey = state.equalized) {
  const config = getPackagePlanConfig(percentKey);
  const packageNames = config.packages;
  const tasks = getCleanMaintenanceTasks();
  const totalManHours = tasks.reduce((sum, task) => sum + (Number(task.plannedMh) || 0), 0);
  const packageLimit = percentKey === "100" ? totalManHours / 3 : Infinity;
  const tradeGroups = createTradeGroups(tasks, packageLimit);
  const optimization = optimizePackageAssignment(tradeGroups, packageNames, packageLimit);
  const packages = applyManualAssignments(optimization.packages, packageNames, tasks);
  const packageTotals = packages.map((pkg) => pkg.manHours);
  const highestPackageManHours = Math.max(...packageTotals, 0);
  const lowestPackageManHours = Math.min(...packageTotals, 0);
  const limitExceeded = percentKey === "100" && packages.some((pkg) => pkg.manHours > packageLimit + 0.0001);
  const oversizedTaskGroups = tradeGroups.filter((group) => group.oversizedTask);
  const movementRegister = packages.flatMap((pkg) =>
    pkg.groups.flatMap((group) =>
      group.tasks.map((task) => ({
        taskUid: task.taskUid,
        taskCardNo: task.taskCardNo,
        description: task.description,
        shortDescription: clampText(task.description, 80),
        plannedMh: Number(task.plannedMh) || 0,
        ata: task.ata,
        trade: normalizePlanTrade(task.trade),
        tradeLabel: getTradeDisplayLabel(normalizePlanTrade(task.trade)),
        tradeGroupId: group.id,
        phase: task.phase,
        taskCode: task.taskCode,
        sequence: task.sequence,
        finalPackage: pkg.name
      }))
    )
  );
  const packageSummaries = packages.map((pkg) => {
    const rows = movementRegister.filter((row) => row.finalPackage === pkg.name);
    return {
      package: pkg.name,
      includedTradeGroups: pkg.groups.map((group) => group.id).join(", ") || "-",
      includedTrades: Array.from(new Set(pkg.groups.map((group) => group.trade))).join(", ") || "-",
      tasks: rows.length,
      manHours: rows.reduce((sum, row) => sum + row.plannedMh, 0),
      estimatedGroundDays: estimateGroundDaysForRows(rows),
      byTrade: summarizeWorkload(rows, "trade"),
      byPhase: summarizeWorkload(rows, "phase")
    };
  });

  return {
    percentKey,
    title: config.title,
    packages: packageNames,
    packageCount: packageNames.length,
    packageLimit,
    totalTasks: tasks.length,
    totalManHours,
    tradeGroups,
    packageSummaries,
    movementRegister,
    highestPackageManHours,
    lowestPackageManHours,
    differenceManHours: highestPackageManHours - lowestPackageManHours,
    standardDeviation: calculateStdDev(packageTotals),
    optimized: optimization.optimized,
    exploredCombinations: optimization.explored,
    stoppedEarly: optimization.stoppedEarly,
    limitExceeded,
    oversizedTaskGroups,
    packageField: "finalPackage"
  };
}

function getPhaseRank(phase) {
  const normalized = normalizeText(phase, true);
  const exactIndex = phaseOrder.indexOf(normalized);
  if (exactIndex >= 0) {
    return exactIndex;
  }

  const fuzzyIndex = phaseOrder.findIndex((item) => normalized.includes(item));
  return fuzzyIndex >= 0 ? fuzzyIndex : phaseOrder.length;
}

function generateGanttSchedule(scenario, packageName = state.selectedGanttPackage) {
  const inputs = state.ganttInputs;
  const packageField = scenario.packageField || "finalPackage";
  const rows = scenario.movementRegister.filter((row) => row[packageField] === packageName);
  const groups = new Map();
  rows.forEach((row) => {
    const key =
      state.ganttDetailLevel === "group"
        ? row.autoGroupId || row.approvedGroupId || `${row.phase || "UNPHASED"}::${row.trade || "OTHER"}::${row.sequence || "SEQ"}`
        : row.phase || "UNPHASED";
    const existing = groups.get(key) || {
      label:
        state.ganttDetailLevel === "group" && (row.autoGroupId || row.approvedGroupId)
          ? row.autoGroupId || row.approvedGroupId
          : row.phase || row.taskCardNo || key,
      phase: row.phase || "UNPHASED",
      trade: row.trade || "OTHER",
      sequence: Number.MAX_SAFE_INTEGER,
      plannedMh: 0,
      tasks: 0,
      rows: []
    };
    existing.sequence = Math.min(existing.sequence, row.sequence || Number.MAX_SAFE_INTEGER);
    existing.plannedMh += Number(row.plannedMh) || 0;
    existing.tasks += 1;
    existing.rows.push(row);
    groups.set(key, existing);
  });

  const productiveHoursPerPersonPerDay =
    Math.max(0, Number(inputs.shifts) || 0) *
    Math.max(0, Number(inputs.hoursPerShift) || 0) *
    Math.max(0, Number(inputs.productivityFactor) || 0);
  const totalTechnicians = getGanttTechnicianCount(inputs);
  const sortedGroups = Array.from(groups.values()).sort(
    (a, b) => a.sequence - b.sequence || getPhaseRank(a.phase) - getPhaseRank(b.phase) || a.label.localeCompare(b.label)
  );
  const sequenceFinish = new Map();
  const schedule = [];

  sortedGroups.forEach((group) => {
    const sequence = group.sequence === Number.MAX_SAFE_INTEGER ? 9999 : group.sequence;
    const previousSequences = Array.from(sequenceFinish.entries())
      .filter(([seq]) => Number(seq) < sequence)
      .map(([, finish]) => finish);
    const startDay = previousSequences.length ? Math.max(...previousSequences) : 0;
    const byTrade = summarizeWorkload(group.rows, "trade");
    const mainTrade = normalizePlanTrade(byTrade[0]?.label || group.trade);
    const denominator = totalTechnicians * productiveHoursPerPersonPerDay;
    const durationDays = denominator > 0 ? Math.max(0.1, group.plannedMh / denominator) : 0;
    const warning = denominator > 0 ? "" : "Enter technician count and productive working hours before generating the Gantt chart";
    const endDay = startDay + durationDays;
    sequenceFinish.set(sequence, Math.max(sequenceFinish.get(sequence) || 0, endDay));
    schedule.push({
      id: schedule.length + 1,
      package: packageName,
      label: group.label,
      phase: group.phase,
      trade: mainTrade,
      tradeLabel: getTradeDisplayLabel(mainTrade),
      startDay,
      endDay,
      durationDays,
      plannedMh: group.plannedMh,
      assignedPersonnel: totalTechnicians,
      productiveHoursPerPersonPerDay,
      sequence: group.sequence === Number.MAX_SAFE_INTEGER ? "" : group.sequence,
      tasks: group.tasks,
      validationMessage: warning
    });
  });

  return schedule;
}

function getSelectedMaintenanceProgram() {
  return (
    maintenancePrograms.find((program) => program.key === state.selectedMaintenanceProgram) ||
    maintenancePrograms[0] || {
      key: "BELL412",
      registration: "BELL 412",
      model: "BELL 412",
      parentTasks: [],
      totals: { childTasks: 0, manHours: 0 }
    }
  );
}

function heavyCheckTaskAppliesToSelectedProgram(task, program = getSelectedMaintenanceProgram()) {
  const registration = normalizeText(task.aircraftRegistration || task.aircraft_registration, true);
  if (!registration) {
    return true;
  }

  return registration.includes(program.registration) || registration.includes(program.key);
}

function getApprovedHeavyCheckWorkloadForSelectedProgram() {
  const program = getSelectedMaintenanceProgram();
  const tasks = state.approvedTaskMaster.filter((task) => heavyCheckTaskAppliesToSelectedProgram(task, program));
  const knownManHours = tasks.reduce((sum, task) => sum + (Number(task.plannedMh ?? task.planned_mh) || 0), 0);

  return {
    tasks,
    taskCount: tasks.length,
    knownManHours,
    missingManHourTasks: tasks.filter((task) => (task.plannedMh ?? task.planned_mh) == null).length
  };
}

function applyApprovedHeavyCheckWorkload(parentTasks) {
  return parentTasks;
}

function getManualIntervalManHours(intervalKey) {
  const rawValue = state.manualIntervalManHours?.[intervalKey];
  if (rawValue === "" || rawValue == null) {
    return 0;
  }

  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
}

function isManualTaskCardInterval(intervalKey) {
  return manualTaskCardIntervalKeys.includes(intervalKey);
}

function getManualIntervalTaskCards(intervalKey) {
  const rawValue = state.manualIntervalTaskCards?.[intervalKey];
  if (rawValue === "" || rawValue == null) {
    return 0;
  }

  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : 0;
}

function getMissingBaselineManHourIntervals() {
  return baselineIntervalKeys.filter((intervalKey) => getManualIntervalManHours(intervalKey) <= 0);
}

function getMissingBaselineTaskCardIntervals() {
  return manualTaskCardIntervalKeys.filter((intervalKey) => getManualIntervalTaskCards(intervalKey) <= 0);
}

function getMissingBaselineInputItems() {
  return [
    ...getMissingBaselineManHourIntervals().map((intervalKey) => `${intervalKey.replace("-hour", " hrs")} man-hours`),
    ...getMissingBaselineTaskCardIntervals().map((intervalKey) => `${intervalKey.replace("-hour", " hrs")} task-card count`)
  ];
}

function hasCompleteBaselineManHours() {
  return getMissingBaselineManHourIntervals().length === 0 && getMissingBaselineTaskCardIntervals().length === 0;
}

function getManualBaselineTotalManHours() {
  return baselineIntervalKeys.reduce((total, intervalKey) => total + getManualIntervalManHours(intervalKey), 0);
}

function getBaselineInputSnapshot() {
  return JSON.stringify({
    manHours: state.manualIntervalManHours,
    taskCards: state.manualIntervalTaskCards
  });
}

function clearGeneratedPlanningState() {
  state.equalizationStarted = false;
  state.equalizationLoading = false;
  state.ganttCreated = false;
  state.ganttGenerated = false;
  state.latestEqualizationScenario = null;
}

function clearBaselineModelState() {
  state.baseModelStarted = false;
  state.baseModelLoading = false;
  clearGeneratedPlanningState();
}

function getSelectedInspectionTasks() {
  return (getSelectedMaintenanceProgram().parentTasks || []).map((item) => {
    const manHours = baselineIntervalKeys.includes(item.parentPackage) ? getManualIntervalManHours(item.parentPackage) : Number(item.manHours) || 0;
    const sourceChildTasks = Number(item.childTasks) || Number(item.totalChildTasks) || 0;
    const childTasks = isManualTaskCardInterval(item.parentPackage) ? getManualIntervalTaskCards(item.parentPackage) : sourceChildTasks;

    return {
      ...item,
      childTasks,
      totalChildTasks: childTasks,
      averageManHoursPerTask: childTasks ? manHours / childTasks : 0,
      manHours,
      manHoursInputValue: state.manualIntervalManHours?.[item.parentPackage] ?? "",
      taskCardsInputValue: state.manualIntervalTaskCards?.[item.parentPackage] ?? "",
      currentNote: baselineIntervalKeys.includes(item.parentPackage) ? "Manual baseline input" : item.currentNote
    };
  });
}

function getPrimaryInspectionTasks() {
  return getSelectedInspectionTasks().filter((item) => !item.parentPackage.includes("CSSD"));
}

function renderMaintenanceProgramSelector() {
  return `
    <div class="tabs compact-tabs maintenance-program-tabs" role="tablist" aria-label="Maintenance aircraft program">
      ${maintenancePrograms
        .map(
          (program) => `
            <button
              class="${program.key === state.selectedMaintenanceProgram ? "active" : ""}"
              data-maintenance-program="${program.key}"
              type="button"
            >
              ${program.model}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function bindMaintenanceProgramSelector() {
  document.querySelectorAll("[data-maintenance-program]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedMaintenanceProgram = button.dataset.maintenanceProgram;
      clearGeneratedPlanningState();
      state.manualPackageAssignments = {};
      render();
    });
  });
}

function getInspectionMethodologyText() {
  return (
    "Enter the planned man-hours for each BELL 412 inspection interval before generating the baseline model. " +
    "For the 5000-hour interval, enter the task-card count as well because it is not supplied by the current datasource. " +
    "The same interval values are then reused by the equalization planning chart."
  );
}

function getBaselineInspectionBlocks() {
  const intervals = new Set([25, 100, 300, 600, 5000]);

  return getPrimaryInspectionTasks()
    .filter((item) => intervals.has(item.intervalFlightHours))
    .sort((a, b) => a.intervalFlightHours - b.intervalFlightHours)
    .map((item) => ({
      key: item.parentPackage,
      label: `${item.parentPackage} Block${item.parentPackage === "25-hour" ? " (Equalized)" : ""}`,
      intervalFlightHours: item.intervalFlightHours,
      calendarLimitDays: item.calendarLimitDays,
      manHours: item.manHours,
      color: baselineBlockColors[item.parentPackage] || chartColors.yellow
    }));
}

function getSimulationAircraft() {
  const aircraftRows = Array.isArray(utilizationData.aircraft) ? utilizationData.aircraft : [];
  const utilizationRates = aircraftRows
    .map((aircraft) => aircraft.avgFHPerDay || (utilizationData.window.calendarDays ? aircraft.totalFH / utilizationData.window.calendarDays : 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (utilizationRates.length) {
    const averageFlightHoursPerDay = utilizationRates.reduce((total, value) => total + value, 0) / utilizationRates.length;
    return [
      {
        registration: "BELL 412",
        model: "BELL 412",
        averageFlightHoursPerMonth: averageFlightHoursPerDay * simulationDaysPerMonth
      }
    ];
  }

  return [
    {
      registration: "BELL 412",
      model: "BELL 412",
      averageFlightHoursPerMonth: 20
    }
  ];
}

function buildBaselineSimulation() {
  const blocks = getBaselineInspectionBlocks();
  const aircraft = getSimulationAircraft();
  const aircraftState = aircraft.map((item) => ({
    ...item,
    cumulativeFlightHours: 0
  }));

  const months = Array.from({ length: simulationMonths }, (_, index) => {
    const monthNumber = index + 1;
    const month = {
      label: `Y${Math.floor(index / 12) + 1} M${(index % 12) + 1}`,
      monthNumber,
      flightHours: 0,
      totalManHours: 0,
      blocks: Object.fromEntries(blocks.map((block) => [block.key, 0])),
      events: Object.fromEntries(blocks.map((block) => [block.key, 0]))
    };

    aircraftState.forEach((aircraftItem) => {
      const previousFlightHours = aircraftItem.cumulativeFlightHours;
      const nextFlightHours = previousFlightHours + aircraftItem.averageFlightHoursPerMonth;
      month.flightHours += aircraftItem.averageFlightHoursPerMonth;

      blocks.forEach((block) => {
        const previousDueCount = Math.floor(previousFlightHours / block.intervalFlightHours);
        const nextDueCount = Math.floor(nextFlightHours / block.intervalFlightHours);
        const flightHourDueCount = nextDueCount - previousDueCount;
        const calendarDueCount =
          block.intervalFlightHours === 5000 && block.calendarLimitDays
            ? Math.floor((month.monthNumber * simulationDaysPerMonth) / block.calendarLimitDays) -
              Math.floor(((month.monthNumber - 1) * simulationDaysPerMonth) / block.calendarLimitDays)
            : 0;
        const dueCount = Math.max(flightHourDueCount, calendarDueCount);

        if (dueCount > 0) {
          const workload = dueCount * block.manHours;
          month.blocks[block.key] += workload;
          month.events[block.key] += dueCount;
          month.totalManHours += workload;
        }
      });

      aircraftItem.cumulativeFlightHours = nextFlightHours;
    });

    return month;
  });
  const equalizedBlocks = equalizeSimulationBlock(months, "25-hour");

  return {
    blocks,
    aircraft,
    months,
    equalizedBlocks,
    totalFlightHours: months.reduce((total, month) => total + month.flightHours, 0),
    totalManHours: months.reduce((total, month) => total + month.totalManHours, 0),
    averageFlightHoursPerMonth: aircraft.reduce(
      (total, aircraftItem) => total + aircraftItem.averageFlightHoursPerMonth,
      0
    )
  };
}

function equalizeSimulationBlock(months, blockKey) {
  const totalManHours = months.reduce((total, month) => total + (month.blocks[blockKey] || 0), 0);
  const totalEvents = months.reduce((total, month) => total + (month.events[blockKey] || 0), 0);

  if (!totalManHours || !months.length) {
    return {};
  }

  const monthlyManHours = totalManHours / months.length;
  months.forEach((month) => {
    month.totalManHours = month.totalManHours - (month.blocks[blockKey] || 0) + monthlyManHours;
    month.blocks[blockKey] = monthlyManHours;
    month.events[blockKey] = 0;
  });

  return {
    [blockKey]: {
      totalManHours,
      totalEvents,
      monthlyManHours
    }
  };
}

function cloneSimulation(simulation) {
  return {
    blocks: simulation.blocks.map((block) => ({ ...block })),
    aircraft: simulation.aircraft.map((aircraft) => ({ ...aircraft })),
    months: simulation.months.map((month) => ({
      ...month,
      blocks: { ...month.blocks },
      events: { ...month.events }
    })),
    equalizedBlocks: Object.fromEntries(
      Object.entries(simulation.equalizedBlocks || {}).map(([key, value]) => [key, { ...value }])
    ),
    totalFlightHours: simulation.totalFlightHours,
    totalManHours: simulation.totalManHours,
    averageFlightHoursPerMonth: simulation.averageFlightHoursPerMonth
  };
}

function redistributeSimulationBlock(simulation, blockKey, spreadRatio) {
  const totalManHours = simulation.months.reduce((total, month) => total + (month.blocks[blockKey] || 0), 0);
  const existingEqualizedBlock = simulation.equalizedBlocks?.[blockKey];
  const totalEvents =
    simulation.months.reduce((total, month) => total + (month.events[blockKey] || 0), 0) ||
    existingEqualizedBlock?.totalEvents ||
    0;
  const redistributedManHours = totalManHours * spreadRatio;
  const evenlySpreadManHours = redistributedManHours / simulation.months.length;

  simulation.months.forEach((month) => {
    const originalManHours = month.blocks[blockKey] || 0;
    const retainedManHours = originalManHours * (1 - spreadRatio);
    const revisedManHours = retainedManHours + evenlySpreadManHours;

    month.totalManHours = month.totalManHours - originalManHours + revisedManHours;
    month.blocks[blockKey] = revisedManHours;

    if (spreadRatio === 1) {
      month.events[blockKey] = 0;
    }
  });

  simulation.equalizedBlocks[blockKey] = {
    totalManHours,
    totalEvents,
    redistributedManHours,
    evenlySpreadManHours,
    spreadRatio
  };
}

function stageSimulationBlockByInterval(simulation, blockKey, spreadRatio) {
  const dueMonths = simulation.months
    .map((month, index) => ({
      index,
      manHours: month.blocks[blockKey] || 0,
      events: month.events[blockKey] || 0
    }))
    .filter((month) => month.manHours > 0 && month.events > 0);

  const totalManHours = dueMonths.reduce((total, month) => total + month.manHours, 0);
  const totalEvents = dueMonths.reduce((total, month) => total + month.events, 0);
  const redistributedManHours = totalManHours * spreadRatio;
  const stageCount = Math.round(spreadRatio / (1 - spreadRatio));

  if (!totalManHours || !stageCount) {
    return;
  }

  dueMonths.forEach((dueMonth, dueIndex) => {
    const previousDueIndex = dueIndex > 0 ? dueMonths[dueIndex - 1].index : -1;
    const redistributedFromDue = dueMonth.manHours * spreadRatio;
    const stagedManHours = redistributedFromDue / stageCount;
    const due = simulation.months[dueMonth.index];

    due.blocks[blockKey] -= redistributedFromDue;
    due.totalManHours -= redistributedFromDue;

    for (let stage = 1; stage <= stageCount; stage += 1) {
      const targetIndex = Math.max(
        0,
        Math.min(
          dueMonth.index - 1,
          previousDueIndex + Math.round(((dueMonth.index - previousDueIndex) * stage) / (stageCount + 1))
        )
      );
      const target = simulation.months[targetIndex];
      target.blocks[blockKey] += stagedManHours;
      target.totalManHours += stagedManHours;
    }
  });

  simulation.equalizedBlocks[blockKey] = {
    totalManHours,
    totalEvents,
    redistributedManHours,
    stageCount,
    spreadRatio,
    mode: "staged"
  };
}

function recalculateSimulationTotals(simulation) {
  simulation.totalManHours = simulation.months.reduce((total, month) => total + month.totalManHours, 0);
  return simulation;
}

function buildEqualizedInspectionScenario(program) {
  const scenario = cloneSimulation(buildBaselineSimulation());
  scenario.title = program.title;
  scenario.program = program;
  scenario.percentKey = state.equalized;
  const blockKeys =
    program.equalizedBlockKeys === "all"
      ? scenario.blocks.map((block) => block.key)
      : program.equalizedBlockKeys;

  blockKeys.forEach((blockKey) => {
    if (program.redistributionMode === "staged") {
      stageSimulationBlockByInterval(scenario, blockKey, program.spreadRatio);
      return;
    }

    redistributeSimulationBlock(scenario, blockKey, program.spreadRatio);
  });

  scenario.blocks = scenario.blocks.map((block) => {
    const equalizedBlock = scenario.equalizedBlocks[block.key];
    if (!equalizedBlock || equalizedBlock.spreadRatio == null) {
      return block;
    }

    const percent = Math.round(equalizedBlock.spreadRatio * 100);
    return {
      ...block,
      label: `${block.key} Block (${percent}% Equalized)`
    };
  });

  return recalculateSimulationTotals(scenario);
}

function aggregateBaselineSimulation(simulation, view) {
  const groupSize = view === "yearly" ? 12 : view === "quarterly" ? 3 : 1;
  const periodName = simulationViews[view] || simulationViews.quarterly;
  const periods = [];

  for (let index = 0; index < simulation.months.length; index += groupSize) {
    const months = simulation.months.slice(index, index + groupSize);
    const firstMonth = months[0];
    const periodIndex = Math.floor(index / groupSize);
    const year = Math.floor((firstMonth.monthNumber - 1) / 12) + 1;
    const quarter = Math.floor(((firstMonth.monthNumber - 1) % 12) / 3) + 1;
    const label =
      view === "yearly"
        ? `Year ${year}`
        : view === "quarterly"
          ? `Q${quarter}`
          : firstMonth.label;

    periods.push({
      label,
      year,
      quarter,
      periodName,
      periodNumber: periodIndex + 1,
      monthRange:
        months.length === 1
          ? firstMonth.label
          : `${months[0].label} - ${months[months.length - 1].label}`,
      flightHours: months.reduce((total, month) => total + month.flightHours, 0),
      totalManHours: months.reduce((total, month) => total + month.totalManHours, 0),
      blocks: Object.fromEntries(
        simulation.blocks.map((block) => [
          block.key,
          months.reduce((total, month) => total + month.blocks[block.key], 0)
        ])
      ),
      events: Object.fromEntries(
        simulation.blocks.map((block) => [
          block.key,
          months.reduce((total, month) => total + month.events[block.key], 0)
        ])
      )
    });
  }

  return periods;
}

function getSimulationMaxPeriodTotal(simulation, view) {
  const periods = aggregateBaselineSimulation(simulation, view);
  return Math.max(...periods.map((period) => period.totalManHours), 0);
}

function renderWorkloadBreakdownTable(title, rows) {
  const visibleRows = rows.slice(0, 12);
  const firstColumnLabel = /trade/i.test(title) ? "Trade" : /ata/i.test(title) ? "ATA" : /phase/i.test(title) ? "Phase" : "Group";
  return `
    <article class="mini-panel">
      <h4>${escapeHtml(title)}</h4>
      <div class="table-wrap compact-table">
        <table>
          <thead>
            <tr>
              <th>${firstColumnLabel}</th>
              <th>Tasks</th>
              <th>Man-Hours</th>
            </tr>
          </thead>
          <tbody>
            ${
              visibleRows.length
                ? visibleRows
                    .map(
                      (row) => `
                        <tr>
                          <td>${escapeHtml(/trade/i.test(title) ? getTradeDisplayLabel(row.label) : row.label)}</td>
                          <td>${formatNumber(row.tasks)}</td>
                          <td><strong>${formatDecimal(row.manHours, 1)}</strong></td>
                        </tr>
                      `
                    )
                    .join("")
                : `<tr><td colspan="3">No approved task-master data available.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderHeavyCheckBaselineSection() {
  const summary = getApprovedHeavyCheckSummary();
  if (!summary.taskCount) {
    return `
      <article class="card">
        <div class="section-header">
          <div>
            <p class="card-kicker">5000H Heavy Check Breakdown</p>
            <h3>Heavy Check Baseline</h3>
        </div>
      </div>
      <div class="warning-box">No approved 5000-hour task master is available yet for the selected aircraft program. The 5000-hour block is not using an assumed man-hour value; upload, validate, and approve the datasource workbook on Page 1.</div>
    </article>
  `;
}

  return `
    <article class="card">
      <div class="section-header">
        <div>
          <p class="card-kicker">5000H Heavy Check Breakdown</p>
          <h3>Baseline Core Workload</h3>
        </div>
        <div class="inspection-total">
          <span>Core Baseline</span>
          <strong>${formatDecimal(summary.knownManHours, 1)} Man-Hours</strong>
        </div>
      </div>
      <div class="scope-notice">
        Baseline condition: P1 = 0 MH, P2 = 0 MH, P3 = 0 MH, P4 = 0 MH, P5 = 0 MH, Core = all approved 5000-hour tasks.
      </div>
      ${renderMetricStrip([
        { label: "5000H Tasks", value: formatNumber(summary.taskCount) },
        { label: "Known Planned Man-Hours", value: formatDecimal(summary.knownManHours, 1) },
        { label: "Missing Man-Hour Tasks", value: formatNumber(summary.missingManHourTasks) },
        { label: "P1-P5 Baseline", value: "0.0 MH" },
        { label: "Core Workload", value: `${formatDecimal(summary.knownManHours, 1)} MH` }
      ])}
      <div class="breakdown-grid">
        ${renderWorkloadBreakdownTable("Workload by ATA", summary.byAta)}
        ${renderWorkloadBreakdownTable("Workload by Trade", summary.byTrade)}
        ${renderWorkloadBreakdownTable("Workload by Phase", summary.byPhase)}
        ${renderWorkloadBreakdownTable("Workload by Task Code", summary.byTaskCode)}
      </div>
    </article>
  `;
}

function renderReviewOptions(options, selected) {
  return options
    .map((option) => {
      const label = movableOptions.includes(option)
        ? getEngineeringDecisionLabel(option)
        : automaticMovabilityOptions.includes(option)
        ? getAutomaticMovabilityLabel(option)
        : option;
      return `<option value="${option}" ${option === selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function renderEngineeringReviewRows() {
  const rows = filterReviewTasks().sort((a, b) => (Number(b.plannedMh) || 0) - (Number(a.plannedMh) || 0)).slice(0, 100);
  if (!rows.length) {
    return `<tr><td colspan="12">No engineering-review tasks match the current filters.</td></tr>`;
  }

  const selected = new Set(state.selectedReviewTaskUids);
  return rows
    .map(
      (task) => `
        <tr>
          <td><input type="checkbox" data-review-select="${task.taskUid}" ${selected.has(task.taskUid) ? "checked" : ""} /></td>
          <td><strong>${escapeHtml(task.taskCardNo)}</strong><div class="tail-note">${escapeHtml(task.sourceSheet)} row ${task.sourceRow}</div></td>
          <td>${escapeHtml(clampText(task.description, 76))}</td>
          <td>${escapeHtml(task.ata)}</td>
          <td>${escapeHtml(getTradeDisplayLabel(task.trade))}</td>
          <td>${escapeHtml(task.phase)}</td>
          <td>${formatDecimal(task.plannedMh, 1)}</td>
          <td>
            ${statusBadgeForAutoMovability(task.autoMovability)}
            <div class="tail-note">${escapeHtml(task.autoConfidence || "LOW")} confidence</div>
          </td>
          <td><strong>${escapeHtml(task.autoGroupId || "-")}</strong><div class="tail-note">${escapeHtml(task.autoGroupReason || "No move-together group")}</div></td>
          <td>
            <select data-review-task="${task.taskUid}" data-review-field="movability">
              ${renderReviewOptions(movableOptions, task.movability)}
            </select>
          </td>
          <td>
            <select data-review-task="${task.taskUid}" data-review-field="finalPackage">
              ${heavyCheckPackages.map((pkg) => `<option value="${pkg}" ${task.finalPackage === pkg ? "selected" : ""}>${pkg}</option>`).join("")}
            </select>
          </td>
          <td>
            <select data-review-task="${task.taskUid}" data-review-field="reviewStatus">
              ${renderReviewOptions(reviewStatusOptions, task.reviewStatus)}
            </select>
            <input class="table-input" data-review-task="${task.taskUid}" data-review-field="approvedGroupId" value="${escapeHtml(task.approvedGroupId)}" placeholder="Approved group" />
          </td>
          <td><input class="table-input" data-review-task="${task.taskUid}" data-review-field="reviewNotes" value="${escapeHtml(task.reviewNotes)}" placeholder="Review notes" /></td>
        </tr>
      `
    )
    .join("");
}

function renderEngineeringReviewSection() {
  const tasks = getReviewedTasksForSelectedProgram();
  if (!tasks.length) {
    return `
      <article class="card">
        <div class="section-header">
          <div>
            <p class="card-kicker">Engineering Review</p>
            <h3>Task Classification</h3>
          </div>
        </div>
        <div class="warning-box">Upload, validate, and approve the 5000-hour task master on Page 1 before engineering review.</div>
      </article>
    `;
  }
  const autoGroups = buildCandidateGroupSummaries(tasks);
  const approvedCount = tasks.filter((task) => task.reviewStatus === "APPROVED").length;
  const needsReview = tasks.filter((task) => task.autoMovability === "UNCERTAIN" || task.autoConfidence === "LOW").length;

  return `
    <article class="card workflow-card">
      <div class="section-header">
        <div>
          <p class="card-kicker">Engineering Review</p>
          <h3>Check Automatic Task Suggestions</h3>
        </div>
        <div class="inspection-total">
          <span>Approved / Total</span>
          <strong>${formatNumber(approvedCount)} / ${formatNumber(tasks.length)}</strong>
        </div>
      </div>
      <div class="scope-notice">
        This page gives a first-pass suggestion for each 5000-hour task. Engineers can approve, keep in Core, change the package, or add notes before the final plan is used.
      </div>
      ${renderMetricStrip([
        { label: "Can Be Moved", value: formatNumber(tasks.filter((task) => task.autoMovability === "LIKELY_MOVABLE").length) },
        { label: "Move Together", value: formatNumber(tasks.filter((task) => task.autoMovability === "CONDITIONAL").length) },
        { label: "Must Stay in Core", value: formatNumber(tasks.filter((task) => task.autoMovability === "LIKELY_CORE").length) },
        { label: "Needs Engineer Review", value: formatNumber(needsReview) },
        { label: "Candidate Groups", value: formatNumber(autoGroups.length) }
      ])}

      <div class="filter-grid">
        ${renderReviewFilter("ata", "ATA", uniqueValues(tasks, "ata"))}
        ${renderReviewFilter("phase", "Phase", uniqueValues(tasks, "phase"))}
        ${renderReviewFilter("trade", "Trade", uniqueValues(tasks, "trade"))}
        ${renderReviewFilter("movability", "Suggested Decision", automaticMovabilityOptions)}
        ${renderReviewFilter("confidence", "Confidence", confidenceOptions)}
        ${renderReviewFilter("package", "Package", heavyCheckPackages)}
        ${renderReviewFilter("reviewStatus", "Review Status", reviewStatusOptions)}
        <label class="wide">
          <span>Search</span>
          <input data-review-filter="search" type="search" value="${escapeHtml(state.reviewFilters.search)}" placeholder="Task card, description, MM, DMC" />
        </label>
      </div>

      <div class="toolbar-row">
        <button class="secondary-button" data-review-suggest type="button">Refresh Automatic Suggestions</button>
        <select data-bulk-field="movability">${renderReviewOptions(movableOptions, "MOVABLE")}</select>
        <button class="secondary-button" data-bulk-apply="movability" type="button">Bulk Decision</button>
        <input class="table-input" data-bulk-value="approvedGroupId" placeholder="GROUP-001" />
        <button class="secondary-button" data-bulk-apply="approvedGroupId" type="button">Bulk Group</button>
        <input class="table-input" data-bulk-value="reviewedBy" placeholder="Reviewer" />
        <button class="secondary-button" data-bulk-apply="reviewedBy" type="button">Bulk Reviewer</button>
        <button class="secondary-button" data-download-review type="button">Download Review CSV</button>
      </div>

      <div class="table-wrap tall-table">
        <table>
          <thead>
                    <tr>
                      <th>Select</th>
                      <th>Task Card</th>
                      <th>Short Description</th>
                      <th>ATA</th>
                      <th>Trade</th>
                      <th>Phase</th>
                      <th>Man-Hours</th>
                      <th>Automatic Suggestion</th>
                      <th>Move-Together Group</th>
                      <th>Engineer Decision</th>
                      <th>Final Package</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
          </thead>
                  <tbody>${renderEngineeringReviewRows()}</tbody>
        </table>
      </div>
      <details class="soft-details">
        <summary>Technical Details</summary>
        <p class="data-note">Automatic fields are recommendations only. Candidate groups use DMC/MM family, component wording, compatible phase/sequence, trade, ATA subsystem, and task-code family. Showing up to 100 filtered tasks sorted by largest man-hours.</p>
      </details>
    </article>
  `;
}

function renderReviewFilter(key, label, values) {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <select data-review-filter="${key}">
        <option value="all" ${state.reviewFilters[key] === "all" ? "selected" : ""}>All</option>
        ${values.map((value) => `<option value="${escapeHtml(value)}" ${state.reviewFilters[key] === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
      </select>
    </label>
  `;
}

function bindEngineeringReviewControls() {
  document.querySelectorAll("[data-review-filter]").forEach((input) => {
    input.addEventListener("change", () => {
      state.reviewFilters[input.dataset.reviewFilter] = input.value;
      render();
    });
    input.addEventListener("input", () => {
      if (input.type === "search") {
        state.reviewFilters[input.dataset.reviewFilter] = input.value;
        render();
      }
    });
  });

  document.querySelectorAll("[data-review-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const taskUid = checkbox.dataset.reviewSelect;
      if (checkbox.checked && !state.selectedReviewTaskUids.includes(taskUid)) {
        state.selectedReviewTaskUids = [...state.selectedReviewTaskUids, taskUid];
      } else if (!checkbox.checked) {
        state.selectedReviewTaskUids = state.selectedReviewTaskUids.filter((item) => item !== taskUid);
      }
    });
  });

  document.querySelectorAll("[data-review-task]").forEach((input) => {
    input.addEventListener("change", () => {
      updateReviewTask(input.dataset.reviewTask, input.dataset.reviewField, input.value);
    });
  });

  document.querySelector("[data-review-suggest]")?.addEventListener("click", suggestCandidateGroups);
  document.querySelectorAll("[data-bulk-apply]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.dataset.bulkApply;
      const value =
        field === "movability"
          ? document.querySelector("[data-bulk-field='movability']")?.value
          : document.querySelector(`[data-bulk-value='${field}']`)?.value || "";
      applyBulkReviewUpdate(field, value);
    });
  });

  document.querySelector("[data-download-review]")?.addEventListener("click", () => {
    downloadTextFile("engineering-review-register.csv", toCsv(getReviewedTasks()));
  });
}

function renderBaselineManHourWarning() {
  const missing = getMissingBaselineInputItems();
  if (!missing.length) {
    return "";
  }

  return `
    <div class="warning-box" data-baseline-warning>
      Complete ${missing.join(", ")} before generating the baseline and equalized charts.
    </div>
  `;
}

function renderBaselineInputCards() {
  return getSelectedInspectionTasks()
    .map((item) => {
      const requiresTaskCards = isManualTaskCardInterval(item.parentPackage);
      return `
        <div class="baseline-input-block ${requiresTaskCards ? "baseline-input-block-wide" : ""}">
          <span class="baseline-input-interval">${escapeHtml(item.parentPackage.replace("-hour", " hrs"))}</span>
          <span class="baseline-input-meta" data-interval-task-meta="${escapeHtml(item.parentPackage)}">${
            requiresTaskCards && !item.childTasks ? "Task-card count required" : `${formatNumber(item.childTasks)} task cards`
          }</span>
          <label class="baseline-subfield">
            <span class="baseline-input-unit">Man-Hours</span>
            <input
              data-interval-mh="${escapeHtml(item.parentPackage)}"
              type="number"
              min="0"
              step="0.1"
              inputmode="decimal"
              value="${escapeHtml(item.manHoursInputValue)}"
              placeholder="0.0"
              aria-label="${escapeHtml(item.parentPackage.replace("-hour", " hour"))} man-hours"
            />
          </label>
          ${
            requiresTaskCards
              ? `
                <label class="baseline-subfield">
                  <span class="baseline-input-unit">Task Cards</span>
                  <input
                    data-interval-task-cards="${escapeHtml(item.parentPackage)}"
                    type="number"
                    min="1"
                    step="1"
                    inputmode="numeric"
                    value="${escapeHtml(item.taskCardsInputValue)}"
                    placeholder="0"
                    aria-label="${escapeHtml(item.parentPackage.replace("-hour", " hour"))} task-card count"
                  />
                </label>
              `
              : ""
          }
        </div>
      `;
    })
    .join("");
}

function renderBaselineInputSummaryRows() {
  return getSelectedInspectionTasks()
    .map(
      (item) => `
        <tr>
          <td><strong>${escapeHtml(item.parentPackage.replace("-hour", " hrs"))}</strong></td>
          <td>${escapeHtml(item.taskCard)}</td>
          <td>${formatNumber(item.childTasks)}</td>
          <td>${formatDecimal(item.manHours, 1)}</td>
          <td>${formatDecimal(item.averageManHoursPerTask, 2)}</td>
        </tr>
      `
    )
    .join("");
}

function renderBaseModelLoadingCard() {
  return `
    <article class="card baseline-loading-card" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <div>
        <p class="card-kicker">Generating Baseline</p>
        <h3>Building Base Model Chart</h3>
        <p class="data-note">Calculating the 5-year BELL 412 workload simulation from the entered man-hours.</p>
      </div>
    </article>
  `;
}

function renderEqualizationLoadingCard() {
  const program = equalizedPrograms[state.equalized] || equalizedPrograms["100"];
  return `
    <article class="card baseline-loading-card equalization-loading-card" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <div>
        <p class="card-kicker">Generating Equalization</p>
        <h3>Loading ${escapeHtml(program.title)}</h3>
        <p class="data-note">Applying the selected plan to the generated BELL 412 base model.</p>
      </div>
    </article>
  `;
}

function renderBaselineContinueCard() {
  return `
    <article class="card workflow-card equalization-launch-card">
      <div class="section-header">
        <div>
          <p class="card-kicker">Next Step</p>
          <h3>Continue to Equalization Planning</h3>
        </div>
      </div>
      <p class="inspection-method">Use this generated base model as the source for equalization planning.</p>
      <div class="toolbar-row">
        <button class="primary-button" data-continue-equalization type="button">Continue to Equalization Plan</button>
      </div>
    </article>
  `;
}

function renderBasicInspection() {
  const selectedProgram = getSelectedMaintenanceProgram();
  const primaryTasks = getPrimaryInspectionTasks();
  const totalChildTasks = primaryTasks.reduce((total, item) => total + item.childTasks, 0);
  const totalManHours = primaryTasks.reduce((total, item) => total + item.manHours, 0);
  const baselineReady = hasCompleteBaselineManHours();
  const baseModelGenerating = baselineReady && state.baseModelLoading;
  const baseModelStarted = baselineReady && state.baseModelStarted;
  const baselineSimulation = baseModelStarted ? buildBaselineSimulation() : null;
  const workflowStep = baseModelStarted ? "choose" : "start-base";

  content.innerHTML = `
    <section class="view-grid">
      <div class="section-header">
        <div>
          <p class="section-kicker">Page 2</p>
          <h2>Baseline Heavy Check</h2>
        </div>
      </div>

      <div class="maintenance-program-sticky">
        <span>Maintenance Program</span>
        ${renderMaintenanceProgramSelector()}
      </div>

      ${renderWorkflowSteps(workflowStep)}

      <article class="card baseline-input-card ${baseModelGenerating || baseModelStarted ? "baseline-complete" : ""}">
        <div class="section-header">
          <div>
            <p class="card-kicker">Baseline Input</p>
            <h3>Enter BELL 412 Man-Hours</h3>
          </div>
          <div class="inspection-total" aria-label="Manual baseline total">
            <span data-baseline-task-total>${formatNumber(totalChildTasks)} Task Cards</span>
            <strong>${formatDecimal(totalManHours, 1)} Man Hours</strong>
          </div>
        </div>
        <p class="inspection-method">${getInspectionMethodologyText()}</p>
        ${renderBaselineManHourWarning()}
        <div class="baseline-input-grid">
          ${renderBaselineInputCards()}
        </div>
        <div class="toolbar-row baseline-action-row">
          <button class="primary-button" data-start-base-model type="button" ${baseModelGenerating || baseModelStarted ? "disabled" : ""}>${
            baseModelGenerating ? "Generating..." : baseModelStarted ? "Base Model Created" : "Start Base Model"
          }</button>
          <span class="data-note" data-baseline-action-note>${
            baseModelGenerating
              ? "Generating baseline model..."
              : baseModelStarted
              ? "Baseline model is ready for equalization planning."
              : baselineReady
              ? "Ready to generate baseline model."
              : "Complete all baseline inputs to continue."
          }</span>
        </div>
      </article>

      ${state.baseModelLoading ? renderBaseModelLoadingCard() : ""}

      ${
        baseModelStarted
          ? `
            <div class="baseline-model-reveal">
              <article class="card">
                <div class="chart-toolbar">
                  <div>
                    <h3>Modeling Inspection Interval</h3>
                    <p class="card-kicker">${selectedProgram.model}</p>
                  </div>
                  <div class="inspection-total" aria-label="Basic inspection model totals">
                    <span>Manual Baseline</span>
                    <strong>${formatDecimal(getManualBaselineTotalManHours(), 1)} Man Hours</strong>
                  </div>
                </div>
                <div class="chart-frame">
                  <canvas id="intervalChart" aria-label="BELL 412 parent package man-hours chart" role="img"></canvas>
                </div>
              </article>

              <article class="card">
                <div class="chart-toolbar">
                  <div>
                    <p class="card-kicker">Baseline Equalizing Start Point</p>
                    <h3>5-Year Stacked Inspection Workload</h3>
                  </div>
                  <div class="simulation-toolbar-actions">
                    <div class="tabs compact-tabs" role="tablist" aria-label="Simulation chart detail level">
                      ${Object.entries(simulationViews)
                        .map(
                          ([key, label]) => `
                            <button class="${key === state.simulationView ? "active" : ""}" data-simulation-view="${key}" type="button">
                              ${label}
                            </button>
                          `
                        )
                        .join("")}
                    </div>
                    <div class="inspection-total" aria-label="Five-year baseline simulation totals">
                      <span>${simulationMonths}-Month Simulation</span>
                      <strong>${formatDecimal(baselineSimulation.totalManHours, 1)} Man Hours</strong>
                    </div>
                  </div>
                </div>
                <p class="inspection-method">
                  Simulation uses the average BELL 412 utilization rate of
                  ${formatDecimal(baselineSimulation.averageFlightHoursPerMonth, 1)} Flight Hours per month.
                  The 25-hour block is already equalized evenly across the simulation, while 100-hour, 300-hour,
                  600-hour, and 5000-hour blocks remain stacked when their intervals fall due.
                </p>
                <div class="chart-frame simulation-chart">
                  <canvas id="baselineStackedChart" aria-label="Five-year stacked maintenance workload simulation" role="img"></canvas>
                </div>
              </article>

              <article class="card">
                <div class="section-header">
                  <div>
                    <p class="card-kicker">Baseline Detail</p>
                    <h3>Entered Man-Hour Summary</h3>
                  </div>
                </div>
                <div class="table-wrap compact-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Inspection Interval</th>
                        <th>Task Card</th>
                        <th>Task Cards</th>
                        <th>Man-Hours</th>
                        <th>Average Man-Hours per Task</th>
                      </tr>
                    </thead>
                    <tbody>${renderBaselineInputSummaryRows()}</tbody>
                  </table>
                </div>
              </article>

              ${renderBaselineContinueCard()}
            </div>
          `
          : ""
      }
    </section>
  `;

  bindMaintenanceProgramSelector();
  bindBaselineManHourInputs();
  document.querySelector("[data-start-base-model]")?.addEventListener("click", () => {
    if (state.baseModelLoading || state.baseModelStarted) {
      return;
    }

    syncBaselineManHourInputsFromDom();
    if (!hasCompleteBaselineManHours()) {
      state.baseModelStarted = false;
      state.baseModelLoading = false;
      render();
      return;
    }

    clearGeneratedPlanningState();
    state.baseModelStarted = false;
    state.baseModelLoading = true;
    const baselineSnapshot = getBaselineInputSnapshot();
    render();
    window.setTimeout(() => {
      if (!state.baseModelLoading || getBaselineInputSnapshot() !== baselineSnapshot) {
        return;
      }
      state.baseModelLoading = false;
      state.baseModelStarted = true;
      render();
      window.requestAnimationFrame(() => {
        document.querySelector(".baseline-model-reveal")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }, 720);
  });
  document.querySelector("[data-continue-equalization]")?.addEventListener("click", () => {
    state.equalizationStarted = false;
    state.equalizationLoading = false;
    state.ganttCreated = false;
    state.ganttGenerated = false;
    state.latestEqualizationScenario = null;
    state.section = "equalized-inspection";
    render();
  });
  document.querySelectorAll("[data-simulation-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.simulationView = button.dataset.simulationView;
      render();
    });
  });
  if (baseModelStarted) {
    renderIntervalChart();
    renderBaselineStackedChart(baselineSimulation);
  }
}

function renderBasicInspectionRows() {
  return getSelectedInspectionTasks()
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${item.parentPackage}</strong>
            <div class="tail-note">${item.intervalText}</div>
          </td>
          <td>${item.taskCard}</td>
          <td>${formatNumber(item.childTasks)}</td>
          <td>
            <input
              class="table-input short man-hour-input"
              data-interval-mh="${escapeHtml(item.parentPackage)}"
              type="number"
              min="0"
              step="0.1"
              value="${escapeHtml(item.manHoursInputValue)}"
              placeholder="Enter MH"
            />
          </td>
          <td>${formatDecimal(item.averageManHoursPerTask, 2)}</td>
          <td>${item.applicabilityLabel || getSelectedMaintenanceProgram().key}</td>
          <td>${item.currentNote}</td>
        </tr>
      `
    )
    .join("");
}

function bindBaselineManHourInputs() {
  document.querySelectorAll("[data-interval-mh], [data-interval-task-cards]").forEach((input) => {
    const syncInput = () => {
      const value = Number(input.value);
      if (input.dataset.intervalMh) {
        state.manualIntervalManHours[input.dataset.intervalMh] =
          input.value === "" || !Number.isFinite(value) || value < 0 ? "" : input.value;
      }
      if (input.dataset.intervalTaskCards) {
        state.manualIntervalTaskCards[input.dataset.intervalTaskCards] =
          input.value === "" || !Number.isFinite(value) || value <= 0 ? "" : String(Math.floor(value));
        if (input.value !== state.manualIntervalTaskCards[input.dataset.intervalTaskCards]) {
          input.value = state.manualIntervalTaskCards[input.dataset.intervalTaskCards];
        }
      }
      clearBaselineModelState();
      refreshBaselineActionStateInDom();
    };

    input.addEventListener("input", syncInput);
    input.addEventListener("change", syncInput);
  });
}

function refreshBaselineActionStateInDom() {
  document.querySelector(".baseline-input-card")?.classList.remove("baseline-complete");
  document.querySelector(".baseline-model-reveal")?.remove();
  document.querySelector(".baseline-loading-card")?.remove();

  const missing = getMissingBaselineInputItems();
  const warning = document.querySelector("[data-baseline-warning]");
  if (warning && !missing.length) {
    warning.remove();
  } else if (warning) {
    warning.textContent = `Complete ${missing.join(", ")} before generating the baseline and equalized charts.`;
  } else if (missing.length) {
    document
      .querySelector(".baseline-input-grid")
      ?.insertAdjacentHTML(
        "beforebegin",
        `<div class="warning-box" data-baseline-warning>Complete ${missing.join(", ")} before generating the baseline and equalized charts.</div>`
      );
  }

  const button = document.querySelector("[data-start-base-model]");
  if (button) {
    button.disabled = false;
    button.textContent = "Start Base Model";
  }

  const note = document.querySelector("[data-baseline-action-note]");
  if (note) {
    note.textContent = missing.length ? "Complete all baseline inputs to continue." : "Ready to generate baseline model.";
  }

  const primaryTasks = getPrimaryInspectionTasks();
  const taskTotal = primaryTasks.reduce((total, item) => total + item.childTasks, 0);
  const taskTotalElement = document.querySelector("[data-baseline-task-total]");
  if (taskTotalElement) {
    taskTotalElement.textContent = `${formatNumber(taskTotal)} Task Cards`;
  }

  document.querySelectorAll("[data-interval-task-meta]").forEach((meta) => {
    const item = primaryTasks.find((task) => task.parentPackage === meta.dataset.intervalTaskMeta);
    if (!item) {
      return;
    }

    meta.textContent =
      isManualTaskCardInterval(item.parentPackage) && !item.childTasks
        ? "Task-card count required"
        : `${formatNumber(item.childTasks)} task cards`;
  });
}

function syncBaselineManHourInputsFromDom() {
  document.querySelectorAll("[data-interval-mh]").forEach((input) => {
    const value = Number(input.value);
    state.manualIntervalManHours[input.dataset.intervalMh] =
      input.value === "" || !Number.isFinite(value) || value < 0 ? "" : input.value;
  });
  document.querySelectorAll("[data-interval-task-cards]").forEach((input) => {
    const value = Number(input.value);
    state.manualIntervalTaskCards[input.dataset.intervalTaskCards] =
      input.value === "" || !Number.isFinite(value) || value <= 0 ? "" : String(Math.floor(value));
  });
}

function getEqualizedComparisonText(program, selectedProgram) {
  if (state.showEqualizedComparison) {
    return `${program.description} Faded stacked bars show the selected ${selectedProgram.model} Basic Inspection base model for direct comparison.`;
  }

  return `${program.description} Base model comparison is hidden, so the equalized workload uses a clearer scale and wider bars.`;
}

function renderPackageSummaryRows(scenario) {
  return scenario.packageSummaries
    .map(
      (item) => `
        <tr>
          <td><strong>${item.package}</strong></td>
          <td>${formatNumber(item.groups)}</td>
          <td>${formatNumber(item.tasks)}</td>
          <td>${formatDecimal(item.manHours, 1)}</td>
          <td>${formatDecimal(item.estimatedGroundDays, 1)}</td>
          <td>${formatDecimal(item.reviewCompletion, 0)}%</td>
        </tr>
      `
    )
    .join("");
}

function renderMovementRegisterRows(scenario) {
  const grouped = new Map();
  const packageField = scenario.packageField || getPackageFieldForMode(scenario.mode);
  scenario.movementRegister.forEach((row) => {
    const current = grouped.get(row.itemKey) || {
      itemKey: row.itemKey,
      taskCardNo: row.autoGroupId || row.approvedGroupId || row.taskCardNo,
      description: row.autoGroupId || row.approvedGroupId ? `Move-together group ${row.autoGroupId || row.approvedGroupId}` : row.description,
      plannedMh: 0,
      movability: row.autoMovabilityLabel,
      confidence: row.autoConfidence,
      approvedGroupId: row.approvedGroupId,
      autoGroupId: row.autoGroupId,
      packageName: row[packageField],
      movementReason: row.movementReason,
      reviewStatus: row.reviewStatus,
      taskCount: 0
    };
    current.plannedMh += Number(row.plannedMh) || 0;
    current.taskCount += 1;
    grouped.set(row.itemKey, current);
  });

  return Array.from(grouped.values())
    .sort((a, b) => b.plannedMh - a.plannedMh)
    .slice(0, 100)
    .map(
      (row) => `
        <tr>
          <td><strong>${escapeHtml(row.taskCardNo)}</strong><div class="tail-note">${formatNumber(row.taskCount)} task(s)</div></td>
          <td>${escapeHtml(clampText(row.description, 100))}</td>
          <td>${formatDecimal(row.plannedMh, 1)}</td>
          <td>${escapeHtml(row.movability)}<div class="tail-note">${escapeHtml(row.confidence || "LOW")}</div></td>
          <td>${escapeHtml(row.autoGroupId || row.approvedGroupId || "-")}</td>
          <td>Core</td>
          <td>
            <select data-package-override="${escapeHtml(row.itemKey)}">
              ${heavyCheckPackages.map((pkg) => `<option value="${pkg}" ${row.packageName === pkg ? "selected" : ""}>${pkg}</option>`).join("")}
            </select>
          </td>
          <td>${escapeHtml(row.movementReason)}</td>
          <td>${escapeHtml(row.reviewStatus)}</td>
        </tr>
      `
    )
    .join("");
}

function renderTaskEqualizationChart(scenario) {
  if (!window.Chart) {
    showChartFallback("taskEqualizedChart");
    return;
  }

  if (state.charts.taskEqualized) {
    state.charts.taskEqualized.destroy();
  }

  const defaults = chartDefaults();
  const context = document.getElementById("taskEqualizedChart");
  const labels = scenario.packageSummaries.map((item) => item.package);
  const packageField = scenario.packageField || getPackageFieldForMode(scenario.mode);
  const breakdownKey =
    state.equalizationBreakdown === "trade"
      ? "trade"
      : state.equalizationBreakdown === "ata"
      ? "ata"
      : state.equalizationBreakdown === "phase"
      ? "phase"
      : "";
  const palette = ["#1D4ED8", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0F766E", "#9333EA", "#EA580C", "#64748B"];
  const baseDataset = state.showEqualizedComparison
    ? [
        {
          label: "Base model",
          data: heavyCheckPackages.map((pkg) => (pkg === "Core" ? scenario.peakBefore : 0)),
          backgroundColor: "rgba(100, 116, 139, 0.16)",
          borderColor: "rgba(100, 116, 139, 0.28)",
          borderWidth: 1,
          borderRadius: 5,
          stack: "base",
          order: 2,
          legendHidden: true
        }
      ]
    : [];
  const valueLookup = new Map(scenario.packageSummaries.map((item) => [item.package, item.manHours]));
  const datasets = breakdownKey
    ? Array.from(new Set(scenario.movementRegister.map((row) => normalizeBlank(row[breakdownKey]) || "Unspecified")))
        .map((category) => ({
          label: category,
          total: scenario.movementRegister
            .filter((row) => (normalizeBlank(row[breakdownKey]) || "Unspecified") === category)
            .reduce((sum, row) => sum + row.plannedMh, 0)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)
        .map((category, index) => ({
          label: category.label,
          data: labels.map((pkg) =>
            scenario.movementRegister
              .filter((row) => row[packageField] === pkg && (normalizeBlank(row[breakdownKey]) || "Unspecified") === category.label)
              .reduce((sum, row) => sum + row.plannedMh, 0)
          ),
          backgroundColor: palette[index % palette.length],
          borderColor: palette[index % palette.length],
          borderWidth: 1,
          borderRadius: 4,
          stack: "equalized",
          order: 1
        }))
    : [
        {
          label: "Man-Hours",
          data: labels.map((pkg) => valueLookup.get(pkg) || 0),
          backgroundColor: ["#1D4ED8", "#059669", "#D97706", "#DC2626", "#7C3AED", "#64748B"],
          borderColor: ["#1D4ED8", "#059669", "#D97706", "#DC2626", "#7C3AED", "#64748B"],
          borderWidth: 1,
          borderRadius: 5,
          stack: "equalized",
          order: 1
        }
      ];
  const values = labels.map((pkg) =>
    scenario.movementRegister.filter((row) => row[packageField] === pkg).reduce((sum, row) => sum + row.plannedMh, 0)
  );
  const maxValue = Math.max(...values, state.showEqualizedComparison ? scenario.peakBefore : 0);
  state.charts.taskEqualized = new Chart(context, {
    type: "bar",
    plugins: [barValueLabelPlugin],
    data: {
      labels,
      datasets: [...baseDataset, ...datasets]
    },
    options: {
      ...defaults,
      animation: { duration: 640, easing: "easeOutQuart" },
      layout: { padding: { top: 28 } },
      plugins: {
        ...defaults.plugins,
        legend: breakdownKey ? defaults.plugins.legend : { display: false },
        barValueLabels: { enabled: true, mode: breakdownKey ? "stackTotal" : "default", values, decimals: 1 },
        tooltip: {
          ...defaults.plugins.tooltip,
          filter: (context) => !context.dataset.legendHidden,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatDecimal(context.parsed.y || 0, 1)} Man-Hours`,
            afterLabel: (context) => {
              const item = scenario.packageSummaries[context.dataIndex];
              return [`Tasks: ${formatNumber(item.tasks)}`, `Estimated Days: ${formatDecimal(item.estimatedGroundDays, 1)}`];
            }
          }
        }
      },
      scales: {
        x: { ...defaults.scales.x, stacked: true },
        y: {
          ...defaults.scales.y,
          stacked: true,
          suggestedMax: maxValue ? maxValue * 1.18 : undefined,
          title: {
            display: true,
            text: "Man-Hours",
            color: chartColors.muted,
            font: { family: "Montserrat", weight: "700" }
          }
        }
      }
    }
  });
}

function renderWorkflowSteps(activeStep) {
  const steps = [
    ["start-base", "Start Base Model"],
    ["choose", "Choose Equalization"],
    ["equalize", "Start Equalization"],
    ["chart", "View Equalized Chart"],
    ["gantt-button", "Create Gantt Charts"],
    ["gantt", "View Gantt"]
  ];
  const activeIndex = Math.max(
    steps.findIndex(([key]) => key === activeStep),
    0
  );

  return `
    <div class="workflow-steps" aria-label="Planning workflow">
      ${steps
        .map(([key, label], index) => {
          const status = index < activeIndex ? "complete" : index === activeIndex ? "active" : "pending";
          return `<span class="${status}"><strong>${index + 1}</strong>${escapeHtml(label)}</span>`;
        })
        .join("")}
    </div>
  `;
}

function renderEqualizationControls(scenario) {
  return `
    <div class="toolbar-row equalization-control-row">
      <div class="tabs compact-tabs" role="tablist" aria-label="Equalized workload options">
        ${Object.keys(equalizedPrograms)
          .map(
            (key) => `
              <button class="${key === state.equalized ? "active" : ""}" data-equalized="${key}" type="button">
                ${key}% <span>${key === "50" ? "Move some eligible work" : key === "75" ? "Move most eligible work" : "Move all eligible work"}</span>
              </button>
            `
          )
          .join("")}
      </div>
      <div class="tabs compact-tabs" role="tablist" aria-label="Assignment source">
        ${Object.entries(assignmentModes)
          .map(
            ([key, label]) => `
              <button class="${key === state.equalizationAssignmentMode ? "active" : ""}" data-assignment-mode="${key}" type="button">
                ${escapeHtml(label)}
              </button>
            `
          )
          .join("")}
      </div>
      <button class="comparison-toggle ${state.showEqualizedComparison ? "active" : ""}" data-equalized-comparison type="button" aria-pressed="${state.showEqualizedComparison}">
        <span class="comparison-toggle-track" aria-hidden="true"><span></span></span>
        <span class="comparison-toggle-text">Base comparison ${state.showEqualizedComparison ? "On" : "Off"}</span>
      </button>
      <button class="secondary-button" data-reset-equalization type="button">Reset Manual Packages</button>
    </div>
    <p class="data-note">These percentages apply only to tasks that the system considers eligible to move. Tasks that must stay in Core are not included.</p>
    ${
      scenario.unreviewedTasks
        ? `<div class="warning-box">${formatNumber(scenario.unreviewedTasks)} task(s) are still not approved. Final exports will clearly mark them as unapproved.</div>`
        : ""
    }
  `;
}

function renderPackageOverviewRows(scenario) {
  return scenario.packageSummaries
    .map(
      (row) => `
        <tr>
          <td><strong>${escapeHtml(row.package)}</strong></td>
          <td>${formatNumber(row.groups)}</td>
          <td>${formatNumber(row.tasks)}</td>
          <td>${formatDecimal(row.manHours, 1)}</td>
          <td>${formatDecimal(row.estimatedGroundDays, 1)}</td>
          <td>${formatDecimal(row.reviewCompletion, 0)}%</td>
        </tr>
      `
    )
    .join("");
}

function renderFullTaskRegisterRows(scenario) {
  const packageField = scenario.packageField || getPackageFieldForMode(scenario.mode);
  return scenario.movementRegister
    .sort((a, b) => b.plannedMh - a.plannedMh)
    .slice(0, 300)
    .map(
      (row) => `
        <tr>
          <td><strong>${escapeHtml(row.taskCardNo)}</strong></td>
          <td>${escapeHtml(row.shortDescription)}</td>
          <td>${escapeHtml(row.ata)}</td>
          <td>${escapeHtml(getTradeDisplayLabel(row.trade))}</td>
          <td>${escapeHtml(row.phase)}</td>
          <td>${formatDecimal(row.plannedMh, 1)}</td>
          <td>${escapeHtml(row.autoMovabilityLabel)}</td>
          <td>${escapeHtml(row.autoGroupId || "-")}</td>
          <td>${escapeHtml(row.proposedPackage)}</td>
          <td>${escapeHtml(row.engineeringDecisionLabel)}</td>
          <td>${escapeHtml(row[packageField])}</td>
          <td>${escapeHtml(row.reviewStatus)}</td>
        </tr>
      `
    )
    .join("");
}

function getReviewQueueItems(scenario) {
  const packageField = scenario.packageField || getPackageFieldForMode(scenario.mode);
  const groups = new Map();
  scenario.movementRegister.forEach((row) => {
    const current = groups.get(row.itemKey) || {
      itemKey: row.itemKey,
      taskCardNo: row.autoGroupId || row.approvedGroupId || row.taskCardNo,
      description: row.autoGroupId || row.approvedGroupId ? `Move-together group ${row.autoGroupId || row.approvedGroupId}` : row.description,
      rows: [],
      tasks: 0,
      manHours: 0,
      ata: new Set(),
      trade: new Set(),
      phase: new Set(),
      refs: new Set(),
      autoMovability: row.autoMovability,
      autoMovabilityLabel: row.autoMovabilityLabel,
      autoConfidence: row.autoConfidence,
      autoReason: row.autoReason,
      autoGroupId: row.autoGroupId,
      autoGroupReason: row.autoGroupReason,
      suggestedPackage: row.proposedPackage,
      finalPackage: row.finalPackage,
      packageName: row[packageField],
      movementReason: row.movementReason,
      reviewStatus: row.reviewStatus,
      engineeringDecisionLabel: row.engineeringDecisionLabel
    };
    current.rows.push(row);
    current.tasks += 1;
    current.manHours += row.plannedMh;
    if (row.ata) current.ata.add(row.ata);
    if (row.trade) current.trade.add(row.trade);
    if (row.phase) current.phase.add(row.phase);
    if (row.refMm) current.refs.add(row.refMm);
    if (row.refDmc) current.refs.add(row.refDmc);
    if (row.autoConfidence === "LOW") current.autoConfidence = "LOW";
    if (row.reviewStatus === "PENDING") current.reviewStatus = "PENDING";
    groups.set(row.itemKey, current);
  });

  const filters = state.reviewFilters;
  return Array.from(groups.values())
    .filter((item) => {
      const ataValues = Array.from(item.ata);
      const tradeValues = Array.from(item.trade);
      const phaseValues = Array.from(item.phase);
      return (
        (filters.ata === "all" || ataValues.includes(filters.ata)) &&
        (filters.trade === "all" || tradeValues.includes(filters.trade)) &&
        (filters.phase === "all" || phaseValues.includes(filters.phase)) &&
        (filters.movability === "all" || item.autoMovability === filters.movability) &&
        (filters.confidence === "all" || item.autoConfidence === filters.confidence) &&
        (filters.package === "all" || item.packageName === filters.package || item.suggestedPackage === filters.package) &&
        (filters.reviewStatus === "all" || item.reviewStatus === filters.reviewStatus)
      );
    })
    .sort((a, b) => {
      const confidenceRank = { LOW: 0, MEDIUM: 1, HIGH: 2 };
      return (confidenceRank[a.autoConfidence] ?? 0) - (confidenceRank[b.autoConfidence] ?? 0) || b.manHours - a.manHours;
    });
}

function renderReviewQueueCard(scenario) {
  const items = getReviewQueueItems(scenario);
  if (!items.length) {
    return `<div class="warning-box">No review items match the current filters.</div>`;
  }

  state.reviewQueueIndex = Math.max(0, Math.min(state.reviewQueueIndex, items.length - 1));
  const item = items[state.reviewQueueIndex];
  const taskList = item.rows.slice(0, 8).map((row) => `<li>${escapeHtml(row.taskCardNo)} - ${escapeHtml(row.shortDescription)}</li>`).join("");
  const moreCount = Math.max(0, item.rows.length - 8);

  return `
    <div class="review-card">
      <div class="review-card-header">
        <div>
          <p class="card-kicker">Review ${formatNumber(state.reviewQueueIndex + 1)} of ${formatNumber(items.length)}</p>
          <h3>${escapeHtml(item.taskCardNo || "Task Group")}</h3>
        </div>
        <div class="review-card-status">
          ${statusBadgeForAutoMovability(item.autoMovability)}
          ${statusBadgeForReviewStatus(item.reviewStatus)}
        </div>
      </div>
      <div class="review-question">Can this task or group be completed separately from the main 5000-hour heavy check?</div>
      <div class="review-card-grid">
        <div>
          <span>Description</span>
          <strong>${escapeHtml(clampText(item.description, 140))}</strong>
        </div>
        <div>
          <span>Planned Man-Hours</span>
          <strong>${formatDecimal(item.manHours, 1)}</strong>
        </div>
        <div>
          <span>Suggested Package</span>
          <strong>${escapeHtml(item.suggestedPackage)}</strong>
        </div>
        <div>
          <span>Confidence</span>
          <strong>${escapeHtml(item.autoConfidence || "LOW")}</strong>
        </div>
      </div>
      <div class="scope-notice">${escapeHtml(item.autoReason || "Needs engineer review.")}</div>
      ${item.autoGroupId ? `<div class="scope-notice">Suggested to move together: ${escapeHtml(item.autoGroupReason || "Related tasks should be reviewed as one group.")}</div>` : ""}
      <ul class="review-task-list">${taskList}${moreCount ? `<li>+ ${formatNumber(moreCount)} more task(s)</li>` : ""}</ul>
      <div class="toolbar-row">
        <label>
          <span>Final Package</span>
          <select data-review-card-package>
            ${heavyCheckPackages.map((pkg) => `<option value="${pkg}" ${item.suggestedPackage === pkg ? "selected" : ""}>${pkg}</option>`).join("")}
          </select>
        </label>
        <label class="grow">
          <span>Review Notes</span>
          <input data-review-card-note type="text" placeholder="Optional notes" />
        </label>
      </div>
      <div class="review-actions">
        <button class="primary-button" data-review-action="approve" type="button">Yes, Move It</button>
        <button class="secondary-button" data-review-action="keep" type="button">No, Keep in Core</button>
        <button class="secondary-button" data-review-action="conditional" type="button">These Tasks Move Together</button>
        <button class="secondary-button" data-review-action="unsure" type="button">I Am Not Sure</button>
        <button class="secondary-button" data-review-action="reject-group" type="button">Reject Grouping</button>
      </div>
      <div class="review-pager">
        <button class="secondary-button" data-review-action="previous" type="button">Previous</button>
        <button class="secondary-button" data-review-action="skip" type="button">Skip for Later</button>
        <button class="secondary-button" data-review-action="next" type="button">Next</button>
      </div>
      <details class="soft-details">
        <summary>Technical Details</summary>
        <p class="data-note">
          ATA: ${escapeHtml(Array.from(item.ata).join(", ") || "-")} |
          Trade: ${escapeHtml(Array.from(item.trade).map(getTradeDisplayLabel).join(", ") || "-")} |
          Phase: ${escapeHtml(Array.from(item.phase).join(", ") || "-")} |
          References: ${escapeHtml(Array.from(item.refs).slice(0, 4).join(", ") || "-")}
        </p>
      </details>
    </div>
  `;
}

function applyReviewQueueAction(action, scenario) {
  const items = getReviewQueueItems(scenario);
  if (!items.length) {
    return;
  }

  state.reviewQueueIndex = Math.max(0, Math.min(state.reviewQueueIndex, items.length - 1));
  const item = items[state.reviewQueueIndex];
  const packageValue = document.querySelector("[data-review-card-package]")?.value || item.suggestedPackage || "Core";
  const note = document.querySelector("[data-review-card-note]")?.value || "";
  const taskUids = new Set(item.rows.map((row) => row.taskUid));

  if (action === "previous") {
    state.reviewQueueIndex = Math.max(0, state.reviewQueueIndex - 1);
    render();
    return;
  }
  if (action === "next" || action === "skip") {
    state.reviewQueueIndex = Math.min(items.length - 1, state.reviewQueueIndex + 1);
    render();
    return;
  }

  state.reviewedTaskMaster = getReviewedTasks().map((task) => {
    if (!taskUids.has(task.taskUid)) {
      return task;
    }

    if (action === "approve") {
      const grouped = Boolean(item.autoGroupId || task.autoGroupId || task.approvedGroupId);
      return {
        ...task,
        movability: grouped ? "CONDITIONAL" : "MOVABLE",
        engineeringDecision: grouped ? "CONDITIONAL" : "MOVABLE",
        approvedGroupId: grouped ? task.approvedGroupId || task.autoGroupId || item.autoGroupId : task.approvedGroupId || "",
        finalPackage: packageValue,
        reviewStatus: "APPROVED",
        reviewNotes: note || "Approved automatic suggestion."
      };
    }

    if (action === "keep") {
      return {
        ...task,
        movability: "CORE",
        engineeringDecision: "CORE",
        finalPackage: "Core",
        reviewStatus: "APPROVED",
        reviewNotes: note || "Engineer kept this work in Core."
      };
    }

    if (action === "conditional") {
      return {
        ...task,
        movability: "CONDITIONAL",
        engineeringDecision: "CONDITIONAL",
        approvedGroupId: task.approvedGroupId || task.autoGroupId || item.autoGroupId || `MANUAL-${item.itemKey.replace(/[^A-Z0-9]+/gi, "-").slice(0, 18)}`,
        finalPackage: packageValue,
        reviewStatus: "REVIEWED",
        reviewNotes: note || "Engineer marked this as a move-together item."
      };
    }

    if (action === "reject-group") {
      return {
        ...task,
        approvedGroupId: "",
        finalPackage: "Core",
        reviewStatus: "REVIEWED",
        reviewNotes: note || "Automatic grouping rejected. Review as an individual task."
      };
    }

    return {
      ...task,
      movability: "UNREVIEWED",
      engineeringDecision: "UNREVIEWED",
      finalPackage: "Core",
      reviewStatus: "REVIEWED",
      reviewNotes: note || "Engineer marked this item for further review."
    };
  });

  state.latestEqualizationScenario = null;
  state.reviewQueueIndex = Math.min(items.length - 1, state.reviewQueueIndex + 1);
  render();
}

function bindExportControls(scenario, schedule = []) {
  document.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.export;
      const rows = scenario?.movementRegister || [];
      const packageField = scenario?.packageField || getPackageFieldForMode(scenario?.mode || state.equalizationAssignmentMode);

      if (kind === "task-master") downloadTextFile("validated-5000h-task-master.csv", toCsv(state.approvedTaskMaster));
      if (kind === "review") downloadTextFile("engineering-review-decisions.csv", toCsv(getReviewedTasks()));
      if (kind === "classification") downloadTextFile("automatic-classification.csv", toCsv(rows));
      if (kind === "groups") downloadTextFile("candidate-groups.csv", toCsv(scenario?.candidateGroups || []));
      if (kind === "assignments") downloadTextFile("package-assignments.csv", toCsv(rows));
      if (kind === "movable") downloadTextFile("movable-tasks.csv", toCsv(rows.filter((row) => row[packageField] !== "Core")));
      if (kind === "core") downloadTextFile("core-tasks.csv", toCsv(rows.filter((row) => row[packageField] === "Core")));
      if (kind === "unreviewed") downloadTextFile("unreviewed-tasks.csv", toCsv(rows.filter((row) => row.reviewStatus !== "APPROVED")));
      if (kind === "gantt") downloadTextFile("relative-day-gantt-schedule.csv", toCsv(schedule));
      if (kind === "ground-assumptions")
        downloadTextFile(
          "ground-time-assumptions.csv",
          toCsv([
            {
              techniciansAssigned: getGanttTechnicianCount(),
              shiftsPerDay: state.ganttInputs.shifts,
              hoursPerShift: state.ganttInputs.hoursPerShift,
              productivityFactor: state.ganttInputs.productivityFactor,
              schedulingBasis: "Total technicians assigned to selected package"
            }
          ])
        );
      if (kind === "summary")
        downloadTextFile(
          "scenario-summary.csv",
          toCsv([
            {
              assignmentMode: scenario?.modeLabel,
              requestedPercent: scenario?.requestedPercent,
              achievedPercent: scenario?.achievedPercent,
              eligibleManHours: scenario?.eligibleManHours,
              redistributedManHours: scenario?.redistributedManHours,
              coreBeforeDays: scenario?.coreBeforeDays,
              coreAfterDays: scenario?.coreAfterDays,
              limitations:
              "Preliminary beta decision-support output only. Automatic recommendations are separate from final approved results."
            }
          ])
        );
    });
  });
}

function renderEqualizationOptionButtons() {
  return `
    <div class="plan-option-grid" role="radiogroup" aria-label="Equalization plan">
      ${Object.entries(equalizedPrograms)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(
          ([key, program]) => `
            <button class="plan-option ${state.equalized === key ? "active" : ""}" data-equalized="${key}" type="button" aria-pressed="${
            state.equalized === key
          }">
              <strong>${escapeHtml(program.title)}</strong>
              <span>${escapeHtml(program.description)}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderEqualizedQuickPlanTabs() {
  return `
    <div class="tabs compact-tabs" role="tablist" aria-label="Quick equalization plan selector">
      ${Object.keys(equalizedPrograms)
        .sort((a, b) => Number(a) - Number(b))
        .map(
          (key) => `
            <button class="${key === state.equalized ? "active" : ""}" data-equalized-quick="${key}" type="button">
              ${key}%
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSimplePackageRows(scenario) {
  return scenario.packageSummaries
    .map(
      (row) => `
        <tr>
          <td><strong>${escapeHtml(row.package)}</strong></td>
          <td>${escapeHtml(row.includedTradeGroups)}</td>
          <td>${formatNumber(row.tasks)}</td>
          <td>${formatDecimal(row.manHours, 1)}</td>
        </tr>
      `
    )
    .join("");
}

function renderEqualizedBaselineChart(scenario) {
  const context = document.getElementById("equalizedBaselineChart");
  if (!context) {
    return;
  }

  if (!window.Chart) {
    showChartFallback("equalizedBaselineChart");
    return;
  }

  if (state.charts.equalizedBaseline) {
    state.charts.equalizedBaseline.destroy();
    delete state.charts.equalizedBaseline;
  }

  const defaults = chartDefaults();
  const labels = scenario.packageSummaries.map((item) => item.package);
  const values = scenario.packageSummaries.map((item) => Number(item.manHours) || 0);
  const maxValue = Math.max(...values, 0);
  const colors = ["#0C528A", "#D97706", "#0F766E", "#7C3AED", "#DC2626", "#2563EB"];

  state.charts.equalizedBaseline = new Chart(context, {
    type: "bar",
    plugins: [barValueLabelPlugin],
    data: {
      labels,
      datasets: [
        {
          label: "Equalized Man-Hours",
          data: values,
          backgroundColor: labels.map((_, index) => colors[index % colors.length]),
          borderColor: labels.map((_, index) => colors[index % colors.length]),
          borderWidth: 1,
          borderRadius: 5
        }
      ]
    },
    options: {
      ...defaults,
      animation: { duration: 640, easing: "easeOutQuart" },
      layout: { padding: { top: 28 } },
      plugins: {
        ...defaults.plugins,
        legend: { display: false },
        barValueLabels: { enabled: true, decimals: 1 },
        tooltip: {
          ...defaults.plugins.tooltip,
          callbacks: {
            label: (context) => `Man-Hours: ${formatDecimal(context.parsed.y || 0, 1)}`,
            afterLabel: (context) => {
              const item = scenario.packageSummaries[context.dataIndex];
              return [`Tasks: ${formatNumber(item.tasks)}`, `Trade Groups: ${item.includedTradeGroups}`];
            }
          }
        }
      },
      scales: {
        x: {
          ...defaults.scales.x,
          title: {
            display: true,
            text: "Equalized Package",
            color: chartColors.muted,
            font: { family: "Montserrat", weight: "700" }
          }
        },
        y: {
          ...defaults.scales.y,
          suggestedMax: maxValue ? maxValue * 1.18 : undefined,
          title: {
            display: true,
            text: "Man-Hours",
            color: chartColors.muted,
            font: { family: "Montserrat", weight: "700" }
          }
        }
      }
    }
  });
}

function renderPackageTaskRows(scenario) {
  return scenario.movementRegister
    .slice()
    .sort((a, b) => a.finalPackage.localeCompare(b.finalPackage) || a.trade.localeCompare(b.trade) || a.sequence - b.sequence)
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.finalPackage)}</td>
          <td>${escapeHtml(getTradeDisplayLabel(row.trade))}</td>
          <td>${escapeHtml(row.tradeGroupId)}</td>
          <td><strong>${escapeHtml(row.taskCardNo)}</strong></td>
          <td>${escapeHtml(row.shortDescription)}</td>
          <td>${formatDecimal(row.plannedMh, 1)}</td>
        </tr>
      `
    )
    .join("");
}

function renderManualTradeGroupRows(scenario) {
  return scenario.tradeGroups
    .map((group) => {
      const currentPackage =
        state.manualPackageAssignments[`group:${group.id}`] ||
        scenario.packageSummaries.find((pkg) => pkg.includedTradeGroups.split(", ").includes(group.id))?.package ||
        scenario.packages[0];
      return `
        <tr>
          <td><strong>${escapeHtml(group.id)}</strong></td>
          <td>${escapeHtml(getTradeDisplayLabel(group.trade))}</td>
          <td>${formatNumber(group.tasks.length)}</td>
          <td>${formatDecimal(group.manHours, 1)}</td>
          <td>
            <select data-manual-group="${escapeHtml(group.id)}">
              ${scenario.packages.map((pkg) => `<option value="${pkg}" ${currentPackage === pkg ? "selected" : ""}>${pkg}</option>`).join("")}
            </select>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderManualTaskRows(scenario) {
  return scenario.movementRegister
    .slice()
    .sort((a, b) => b.plannedMh - a.plannedMh)
    .slice(0, 160)
    .map(
      (row) => `
        <tr>
          <td><strong>${escapeHtml(row.taskCardNo)}</strong></td>
          <td>${escapeHtml(row.tradeGroupId)}</td>
          <td>${escapeHtml(row.finalPackage)}</td>
          <td>${formatDecimal(row.plannedMh, 1)}</td>
          <td>${escapeHtml(row.shortDescription)}</td>
          <td>
            <select data-manual-task="${escapeHtml(row.taskUid)}">
              <option value="">Use group package</option>
              ${scenario.packages.map((pkg) => `<option value="${pkg}" ${state.manualPackageAssignments[`task:${row.taskUid}`] === pkg ? "selected" : ""}>${pkg}</option>`).join("")}
            </select>
          </td>
        </tr>
      `
    )
    .join("");
}

function startEqualizationWithLoading(percentKey = state.equalized) {
  if (!hasCompleteBaselineManHours() || !state.baseModelStarted || state.equalizationLoading) {
    return;
  }

  state.equalized = percentKey;
  state.equalizationStarted = false;
  state.equalizationLoading = true;
  state.ganttCreated = false;
  state.ganttGenerated = false;
  state.latestEqualizationScenario = null;
  state.manualPackageAssignments = {};
  const selectedPlanSnapshot = percentKey;
  const baselineSnapshot = getBaselineInputSnapshot();
  render();

  window.setTimeout(() => {
    if (
      !state.equalizationLoading ||
      state.equalized !== selectedPlanSnapshot ||
      getBaselineInputSnapshot() !== baselineSnapshot
    ) {
      return;
    }

    state.equalizationLoading = false;
    state.equalizationStarted = true;
    state.latestEqualizationScenario = buildEqualizedInspectionScenario(equalizedPrograms[state.equalized] || equalizedPrograms["100"]);
    render();
  }, 720);
}

function renderEqualizedInspection() {
  const program = equalizedPrograms[state.equalized] || equalizedPrograms["100"];
  const selectedProgram = getSelectedMaintenanceProgram();
  const baselineInputsReady = hasCompleteBaselineManHours();
  const baseModelReady = baselineInputsReady && state.baseModelStarted;
  const baselineSimulation = baseModelReady ? buildBaselineSimulation() : null;
  const equalizationLoading = baseModelReady && state.equalizationLoading;
  const scenario = baseModelReady && state.equalizationStarted && !equalizationLoading ? buildEqualizedInspectionScenario(program) : null;
  const baselinePeak = baselineSimulation ? getSimulationMaxPeriodTotal(baselineSimulation, state.simulationView) : 0;
  const equalizedPeak = scenario ? getSimulationMaxPeriodTotal(scenario, state.simulationView) : 0;
  if (scenario) {
    state.latestEqualizationScenario = scenario;
  }

  content.innerHTML = `
    <section class="view-grid">
      <div class="section-header">
        <div>
          <p class="section-kicker">Page 3</p>
          <h2>Equalization Planning</h2>
        </div>
      </div>

      <div class="maintenance-program-sticky">
        <span>Maintenance Program</span>
        ${renderMaintenanceProgramSelector()}
      </div>

      ${renderWorkflowSteps(scenario ? "chart" : equalizationLoading ? "equalize" : baseModelReady ? "choose" : "start-base")}

      ${
        !baseModelReady
          ? `
            <article class="card">
              <div class="warning-box">${
                baselineInputsReady
                  ? "Start the base model on Page 2 before choosing an equalization plan."
                  : "Complete the BELL 412 baseline inputs on Page 2 before starting equalization."
              }</div>
              <div class="toolbar-row">
                <button class="primary-button" data-go-baseline type="button">Go to Baseline Heavy Check</button>
              </div>
            </article>
          `
          : equalizationLoading
          ? renderEqualizationLoadingCard()
          : !scenario
          ? `
            <article class="card workflow-card">
              <div class="section-header">
                <div>
                  <p class="card-kicker">Step 2 - Choose Equalization</p>
                  <h3>Select Equalization Plan</h3>
                  <p class="data-note">${selectedProgram.model}</p>
                </div>
                <div class="inspection-total">
                  <span>Manual Baseline</span>
                  <strong>${formatDecimal(getManualBaselineTotalManHours(), 1)} MH</strong>
                </div>
              </div>
              <p class="inspection-method">The equalized chart uses the exact interval man-hour values entered in the Baseline Heavy Check page.</p>
              ${renderEqualizationOptionButtons()}
              <div class="toolbar-row">
                <button class="primary-button" data-start-equalization type="button">Start Equalization</button>
              </div>
            </article>
          `
          : ""
      }

      ${
        scenario
          ? `
            <article class="card">
              <div class="chart-toolbar">
                <div>
                  <p class="card-kicker">Step 4 - Equalized Chart</p>
                  <h3>${escapeHtml(scenario.title)}</h3>
                </div>
                <div class="simulation-toolbar-actions">
                  ${renderEqualizedQuickPlanTabs()}
                  <div class="tabs compact-tabs" role="tablist" aria-label="Simulation chart detail level">
                    ${Object.entries(simulationViews)
                      .map(
                        ([key, label]) => `
                          <button class="${key === state.simulationView ? "active" : ""}" data-simulation-view="${key}" type="button">
                            ${label}
                          </button>
                        `
                      )
                      .join("")}
                  </div>
                  <button class="comparison-toggle ${state.showEqualizedComparison ? "active" : ""}" data-equalized-comparison type="button" aria-pressed="${state.showEqualizedComparison}">
                    <span class="comparison-toggle-track" aria-hidden="true"><span></span></span>
                    <span class="comparison-toggle-text">Base comparison ${state.showEqualizedComparison ? "On" : "Off"}</span>
                  </button>
                </div>
              </div>
              <p class="inspection-method">${getEqualizedComparisonText(program, selectedProgram)}</p>
              ${renderMetricStrip([
                { label: "Equalization Plan", value: program.title },
                { label: "Manual Baseline Inputs", value: `${formatDecimal(getManualBaselineTotalManHours(), 1)} MH` },
                { label: "5-Year Baseline Workload", value: `${formatDecimal(baselineSimulation.totalManHours, 1)} MH` },
                { label: "5-Year Equalized Workload", value: `${formatDecimal(scenario.totalManHours, 1)} MH` },
                { label: "Peak Baseline Period", value: `${formatDecimal(baselinePeak, 1)} MH` },
                { label: "Peak Equalized Period", value: `${formatDecimal(equalizedPeak, 1)} MH` }
              ])}
              <div class="chart-frame equalized-chart-frame ${state.showEqualizedComparison ? "comparison-on" : "comparison-off"}">
                <canvas id="equalizedChart" aria-label="Equalized maintenance workload simulation chart" role="img"></canvas>
              </div>
              <div class="toolbar-row">
                <button class="primary-button" data-create-gantt type="button">Create Gantt Charts</button>
              </div>
            </article>
          `
          : ""
      }
    </section>
  `;

  bindMaintenanceProgramSelector();
  document.querySelector("[data-go-baseline]")?.addEventListener("click", () => {
    state.section = "basic-inspection";
    render();
  });
  document.querySelectorAll("[data-equalized]").forEach((button) => {
    button.addEventListener("click", () => {
      state.equalized = button.dataset.equalized;
      state.equalizationStarted = false;
      state.equalizationLoading = false;
      state.ganttCreated = false;
      state.ganttGenerated = false;
      state.latestEqualizationScenario = null;
      state.manualPackageAssignments = {};
      render();
    });
  });
  document.querySelectorAll("[data-equalized-quick]").forEach((button) => {
    button.addEventListener("click", () => {
      startEqualizationWithLoading(button.dataset.equalizedQuick);
    });
  });

  document.querySelector("[data-start-equalization]")?.addEventListener("click", () => {
    startEqualizationWithLoading(state.equalized);
  });

  document.querySelectorAll("[data-simulation-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.simulationView = button.dataset.simulationView;
      render();
    });
  });

  document.querySelector("[data-equalized-comparison]")?.addEventListener("click", () => {
    state.showEqualizedComparison = !state.showEqualizedComparison;
    render();
  });

  document.querySelector("[data-create-gantt]")?.addEventListener("click", () => {
    state.ganttCreated = true;
    state.ganttGenerated = false;
    state.latestEqualizationScenario = scenario;
    state.section = "inspection-chart";
    render();
  });

  if (scenario) {
    renderEqualizedChart(scenario, program);
  }
}

function getScenarioForGantt() {
  if (!state.ganttCreated || !state.equalizationStarted) {
    return null;
  }

  if (state.latestEqualizationScenario?.percentKey === state.equalized) {
    return normalizeScenarioForGantt(state.latestEqualizationScenario);
  }

  if (getCleanMaintenanceTasks().length) {
    state.latestEqualizationScenario = buildEqualizationScenarioFromTasks(state.equalized);
    return normalizeScenarioForGantt(state.latestEqualizationScenario);
  }

  return null;
}

function normalizeScenarioForGantt(scenario) {
  if (!scenario) {
    return null;
  }

  if (Array.isArray(scenario.movementRegister) && Array.isArray(scenario.packages)) {
    return scenario;
  }

  if (Array.isArray(scenario.months) && Array.isArray(scenario.blocks)) {
    return buildGanttScenarioFromSimulation(scenario);
  }

  return null;
}

function buildGanttScenarioFromSimulation(simulation) {
  const packageName = simulation.title || "Equalized Workload";
  const movementRegister = simulation.blocks
    .map((block, index) => {
      const plannedMh = simulation.months.reduce((sum, month) => sum + (Number(month.blocks[block.key]) || 0), 0);
      return {
        taskUid: `simulation-${block.key}`,
        taskCardNo: block.key.replace("-hour", " hrs"),
        description: `${block.label || block.key} workload from the selected equalization simulation`,
        shortDescription: `${block.key.replace("-hour", " hrs")} workload`,
        plannedMh,
        ata: "-",
        trade: "AP",
        tradeLabel: getTradeDisplayLabel("AP"),
        tradeGroupId: block.key,
        phase: block.key.replace("-hour", " hrs"),
        taskCode: block.key,
        sequence: index + 1,
        finalPackage: packageName
      };
    })
    .filter((row) => row.plannedMh > 0);

  return {
    ...simulation,
    packages: [packageName],
    packageField: "finalPackage",
    movementRegister,
    packageSummaries: [
      {
        package: packageName,
        includedTradeGroups: movementRegister.map((row) => row.tradeGroupId).join(", ") || "-",
        includedTrades: "AP",
        tasks: movementRegister.length,
        manHours: movementRegister.reduce((sum, row) => sum + row.plannedMh, 0),
        estimatedGroundDays: estimateGroundDaysForRows(movementRegister),
        byTrade: summarizeWorkload(movementRegister, "trade"),
        byPhase: summarizeWorkload(movementRegister, "phase")
      }
    ]
  };
}

function getTradesForScenarioPackage(scenario, packageName, packageField = scenario.packageField || "finalPackage") {
  const trades = uniqueValues(
    scenario.movementRegister.filter((row) => row[packageField] === packageName),
    "trade"
  );
  return trades.length ? trades : ["AP", "REI", "SM", "P", "PAINTER", "AP / REI", "AP / SM", "AP / P", "OTHER"];
}

function renderGanttInputs(scenario) {
  return `
    <div class="form-grid gantt-input-grid">
      <label class="gantt-technician-input">
        <span>Technicians Assigned</span>
        <input data-gantt-input="totalTechnicians" type="number" min="1" step="1" inputmode="numeric" value="${escapeHtml(
          state.ganttInputs.totalTechnicians
        )}" placeholder="Enter technician count" />
      </label>
      <label>
        <span>Working Hours / Day</span>
        <input data-gantt-input="hoursPerShift" type="number" min="0" step="0.5" value="${state.ganttInputs.hoursPerShift}" />
      </label>
      <label>
        <span>Productivity Factor</span>
        <input data-gantt-input="productivityFactor" type="number" min="0" max="1.5" step="0.01" value="${state.ganttInputs.productivityFactor}" />
      </label>
    </div>
  `;
}

function renderGanttRows(schedule) {
  if (!schedule.length) {
    return `<tr><td colspan="9">No tasks are assigned to the selected package.</td></tr>`;
  }

  return schedule
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.package)}</td>
          <td><strong>${escapeHtml(row.label)}</strong><div class="tail-note">${formatNumber(row.tasks)} task(s)</div></td>
          <td>${escapeHtml(row.phase)}</td>
          <td>${escapeHtml(row.tradeLabel || getTradeDisplayLabel(row.trade))}</td>
          <td>Day ${formatDecimal(row.startDay, 1)}</td>
          <td>Day ${formatDecimal(row.endDay, 1)}</td>
          <td>${formatDecimal(row.durationDays, 1)}</td>
          <td>${formatDecimal(row.plannedMh, 1)}</td>
          <td>${row.validationMessage ? statusBadge("warning", row.validationMessage) : formatNumber(row.assignedPersonnel)}</td>
        </tr>
      `
    )
    .join("");
}

function renderGanttTaskRows(scenario) {
  return scenario.movementRegister
    .filter((row) => row.finalPackage === state.selectedGanttPackage)
    .sort((a, b) => getPhaseRank(a.phase) - getPhaseRank(b.phase) || a.sequence - b.sequence)
    .map(
      (row) => `
        <tr>
          <td><strong>${escapeHtml(row.taskCardNo)}</strong></td>
          <td>${escapeHtml(row.phase || "-")}</td>
          <td>${escapeHtml(getTradeDisplayLabel(row.trade))}</td>
          <td>${escapeHtml(row.tradeGroupId)}</td>
          <td>${formatDecimal(row.plannedMh, 1)}</td>
          <td>${escapeHtml(row.shortDescription)}</td>
        </tr>
      `
    )
    .join("");
}

function buildResourceLoadingRows(schedule) {
  const maxDay = Math.ceil(Math.max(...schedule.map((row) => row.endDay), 0));
  const rows = [];
  for (let day = 0; day <= maxDay; day += 1) {
    const activeRows = schedule.filter((row) => row.startDay < day + 1 && row.endDay > day);
    const byTrade = new Map();
    activeRows.forEach((row) => {
      byTrade.set(row.trade, Math.max(byTrade.get(row.trade) || 0, Number(row.assignedPersonnel) || 0));
    });
    byTrade.forEach((personnel, trade) => {
      rows.push({ day, trade, personnel });
    });
  }
  return rows;
}

function getPackageGroundDayComparison(scenario) {
  return scenario.packages.map((pkg) => {
    const schedule = generateGanttSchedule(scenario, pkg);
    const days = schedule.length ? Math.max(...schedule.map((row) => row.endDay), 0) : 0;
    return {
      package: pkg,
      estimatedDays: days,
      tasks: schedule.reduce((sum, row) => sum + row.tasks, 0),
      manHours: schedule.reduce((sum, row) => sum + row.plannedMh, 0)
    };
  });
}

function renderGroundDayComparisonRows(rows) {
  return rows
    .map(
      (row) => `
        <tr>
          <td><strong>${escapeHtml(row.package)}</strong></td>
          <td>${formatNumber(row.tasks)}</td>
          <td>${formatDecimal(row.manHours, 1)}</td>
          <td>${formatDecimal(row.estimatedDays, 1)}</td>
        </tr>
      `
    )
    .join("");
}

function renderPlotlyResourceLoading(schedule) {
  const target = document.getElementById("resourceChart");
  if (!target || !window.Plotly) {
    return;
  }

  const rows = buildResourceLoadingRows(schedule);
  if (!rows.length) {
    target.innerHTML = `<div class="chart-empty"><strong>No resource load.</strong><p>Enter personnel for the required trades.</p></div>`;
    return;
  }

  const trades = Array.from(new Set(rows.map((row) => row.trade)));
  const maxDay = Math.max(...rows.map((row) => row.day), 0);
  const days = Array.from({ length: maxDay + 1 }, (_, index) => index);
  const colors = ["#1D4ED8", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0F766E", "#64748B"];
  const traces = trades.map((trade, index) => ({
    type: "bar",
    name: getTradeDisplayLabel(trade),
    x: days,
    y: days.map((day) => rows.find((row) => row.day === day && row.trade === trade)?.personnel || 0),
    marker: { color: colors[index % colors.length] },
    hovertemplate: `Day %{x}<br>${escapeHtml(getTradeDisplayLabel(trade))}: %{y} personnel<extra></extra>`
  }));

  Plotly.newPlot(
    target,
    traces,
    {
      barmode: "stack",
      margin: { l: 54, r: 18, t: 20, b: 42 },
      paper_bgcolor: "#FFFFFF",
      plot_bgcolor: "#FFFFFF",
      font: { family: "Montserrat, Helvetica Neue, Arial, sans-serif", color: chartColors.slate },
      xaxis: { title: "Inspection Day", gridcolor: chartColors.grid, tickprefix: "Day " },
      yaxis: { title: "Personnel Demand", gridcolor: chartColors.grid },
      legend: { orientation: "h", y: -0.28 },
      hovermode: "closest"
    },
    { responsive: true, displayModeBar: false }
  );
}

function renderInspectionGantt() {
  const scenario = getScenarioForGantt();
  if (scenario && !scenario.packages.includes(state.selectedGanttPackage)) {
    state.selectedGanttPackage = scenario.packages[0];
  }
  const ganttInputsReady = hasCompleteGanttInputs();
  const shouldShowGantt = Boolean(scenario && state.ganttGenerated && ganttInputsReady);
  const schedule = shouldShowGantt ? generateGanttSchedule(scenario, state.selectedGanttPackage) : [];
  const totalManHours = schedule.reduce((sum, row) => sum + row.plannedMh, 0);
  const totalTasks = schedule.reduce((sum, row) => sum + row.tasks, 0);
  const estimatedDays = schedule.length ? Math.max(...schedule.map((row) => row.endDay), 0) : 0;
  const byTrade = summarizeWorkload(
    schedule.map((row) => ({ trade: row.trade, plannedMh: row.plannedMh })),
    "trade"
  );
  const largestTrade = byTrade[0]?.label ? `${getTradeDisplayLabel(byTrade[0].label)} (${formatDecimal(byTrade[0].manHours, 1)} MH)` : "-";
  const zeroCapacityWarnings = schedule.filter((row) => row.validationMessage);
  const packageDayComparison = shouldShowGantt ? getPackageGroundDayComparison(scenario) : [];

  content.innerHTML = `
    <section class="view-grid">
      <div class="section-header">
        <div>
          <p class="section-kicker">Page 4</p>
          <h2>Inspection Gantt & Ground Time</h2>
        </div>
      </div>

      <div class="maintenance-program-sticky">
        <span>Maintenance Program</span>
        ${renderMaintenanceProgramSelector()}
      </div>

      ${renderWorkflowSteps(shouldShowGantt ? "gantt" : scenario ? "gantt-button" : "start-base")}

      ${
        scenario
          ? `
            <article class="card workflow-card gantt-setup-card ${shouldShowGantt ? "gantt-setup-complete" : ""}">
              <div class="section-header">
                <div>
                  <p class="card-kicker">${shouldShowGantt ? "Technician Assumption" : "Step 6 - Set Technician Capacity"}</p>
                  <h3>${shouldShowGantt ? "Gantt Inputs Confirmed" : "Enter Technician Count Before Generating"}</h3>
                </div>
                <div class="tabs compact-tabs" role="tablist" aria-label="Gantt package selector">
                  ${scenario.packages
                    .map(
                      (pkg) => `<button class="${state.selectedGanttPackage === pkg ? "active" : ""}" data-gantt-package="${pkg}" type="button">${pkg}</button>`
                    )
                    .join("")}
                </div>
              </div>
              <div class="scope-notice">Enter the number of technicians assigned to the selected package. The Gantt chart uses total man-hours divided by available productive technician-hours per day.</div>
              ${renderGanttInputs(scenario)}
              ${ganttInputsReady ? "" : `<div class="warning-box" data-gantt-warning>Enter technician count, working hours, and productivity factor before generating the Gantt chart.</div>`}
              <div class="toolbar-row gantt-action-row">
                <button class="primary-button" data-generate-gantt type="button" ${ganttInputsReady ? "" : "disabled"}>
                  ${shouldShowGantt ? "Regenerate Gantt Chart" : "Generate Gantt Chart"}
                </button>
                <button class="secondary-button" data-back-to-equalization type="button">Back to Equalization Planning</button>
              </div>
            </article>

            ${
              shouldShowGantt
                ? `
                  <div class="gantt-generated-reveal">
                    <article class="card">
                      <div class="section-header">
                        <div>
                          <p class="card-kicker">Step 7 - Generated Gantt</p>
                          <h3>Relative-Day Gantt Chart</h3>
                        </div>
                      </div>
                      ${zeroCapacityWarnings.length ? `<div class="warning-box">${formatNumber(zeroCapacityWarnings.length)} schedule item(s) cannot calculate duration because technician count or productive hours are missing.</div>` : ""}
                      ${renderMetricStrip([
                        { label: "Selected Package", value: state.selectedGanttPackage },
                        { label: "Technicians Assigned", value: formatNumber(getGanttTechnicianCount()) },
                        { label: "Total Tasks", value: formatNumber(totalTasks) },
                        { label: "Total Man-Hours", value: `${formatDecimal(totalManHours, 1)} MH` },
                        { label: "Estimated Days", value: `${formatDecimal(estimatedDays, 1)} days` },
                        { label: "Largest Trade Workload", value: largestTrade }
                      ])}
                      <div class="plot-frame" id="ganttChart"></div>
                    </article>

                    <article class="card">
                      <div class="section-header">
                        <div>
                          <p class="card-kicker">Package Comparison</p>
                          <h3>Estimated Ground Days</h3>
                        </div>
                      </div>
                      <div class="table-wrap compact-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Package</th>
                              <th>Tasks</th>
                              <th>Man-Hours</th>
                              <th>Estimated Days</th>
                            </tr>
                          </thead>
                          <tbody>${renderGroundDayComparisonRows(packageDayComparison)}</tbody>
                        </table>
                      </div>
                    </article>

                    <article class="card">
                      <div class="section-header">
                        <div>
                          <p class="card-kicker">Schedule Data</p>
                          <h3>${state.ganttDetailLevel === "group" ? "Task-Group Schedule" : "Phase-Level Schedule"}</h3>
                        </div>
                        <div class="toolbar-row compact-toolbar">
                          <button class="secondary-button" data-export="assignments" type="button">Assignments CSV</button>
                          <button class="secondary-button" data-export="gantt" type="button">Gantt CSV</button>
                          <button class="secondary-button" data-export="ground-assumptions" type="button">Assumptions CSV</button>
                        </div>
                      </div>
                      <details class="soft-details">
                        <summary>View Detailed Tasks</summary>
                        <div class="table-wrap tall-table">
                          <table>
                            <thead>
                              <tr>
                                <th>Task Card</th>
                                <th>Phase</th>
                                <th>Trade</th>
                                <th>Trade Group</th>
                                <th>Man-Hours</th>
                                <th>Description</th>
                              </tr>
                            </thead>
                            <tbody>${renderGanttTaskRows(scenario)}</tbody>
                          </table>
                        </div>
                      </details>
                    </article>
                  </div>
                `
                : ""
            }
          `
          : `<article class="card"><div class="warning-box">Create the Gantt chart from Page 3 first. Select an equalization option, click Start Equalization, then click Create Gantt Chart.</div></article>`
      }
    </section>
  `;

  bindGanttControls(schedule, scenario);
  if (shouldShowGantt) {
    renderPlotlyGantt(schedule);
  }
}

function bindGanttControls(schedule, scenario) {
  document.querySelectorAll("[data-gantt-package]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedGanttPackage = button.dataset.ganttPackage;
      render();
    });
  });

  document.querySelectorAll("[data-gantt-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      state.ganttDetailLevel = button.dataset.ganttDetail;
      render();
    });
  });

  document.querySelectorAll("[data-gantt-input]").forEach((input) => {
    const syncInput = () => {
      syncGanttInputElement(input);
      if (state.ganttGenerated) {
        state.ganttGenerated = false;
        render();
        return;
      }
      refreshGanttGenerateStateInDom();
    };

    input.addEventListener("input", syncInput);
    input.addEventListener("change", syncInput);
  });

  document.querySelectorAll("[data-gantt-trade]").forEach((input) => {
    input.addEventListener("change", () => {
      state.ganttInputs.tradeCapacity[input.dataset.ganttTrade] = Number(input.value);
      render();
    });
  });

  document.querySelector("[data-generate-gantt]")?.addEventListener("click", () => {
    syncGanttInputsFromDom();
    if (!hasCompleteGanttInputs()) {
      state.ganttGenerated = false;
      render();
      return;
    }

    state.ganttGenerated = true;
    render();
    window.requestAnimationFrame(() => {
      document.querySelector(".gantt-generated-reveal")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelector("[data-back-to-equalization]")?.addEventListener("click", () => {
    state.section = "equalized-inspection";
    render();
  });

  bindExportControls(scenario, schedule);
}

function syncGanttInputElement(input) {
  const key = input.dataset.ganttInput;
  if (!key) {
    return;
  }

  const value = Number(input.value);
  if (key === "totalTechnicians") {
    state.ganttInputs.totalTechnicians = input.value === "" || !Number.isFinite(value) || value <= 0 ? "" : String(Math.floor(value));
    if (input.value !== state.ganttInputs.totalTechnicians) {
      input.value = state.ganttInputs.totalTechnicians;
    }
    return;
  }

  state.ganttInputs[key] = input.type === "number" ? (Number.isFinite(value) ? value : 0) : input.value;
}

function syncGanttInputsFromDom() {
  document.querySelectorAll("[data-gantt-input]").forEach(syncGanttInputElement);
}

function refreshGanttGenerateStateInDom() {
  const ready = hasCompleteGanttInputs();
  const button = document.querySelector("[data-generate-gantt]");
  if (button) {
    button.disabled = !ready;
    button.textContent = "Generate Gantt Chart";
  }

  const warning = document.querySelector("[data-gantt-warning]");
  if (warning && ready) {
    warning.remove();
  } else if (!warning && !ready) {
    document
      .querySelector(".gantt-action-row")
      ?.insertAdjacentHTML("beforebegin", `<div class="warning-box" data-gantt-warning>Enter technician count, working hours, and productivity factor before generating the Gantt chart.</div>`);
  }
}

function renderPlotlyGantt(schedule) {
  const target = document.getElementById("ganttChart");
  if (!target || !window.Plotly) {
    if (target) {
      target.innerHTML = `<div class="chart-empty"><strong>Plotly is not available.</strong><p>Check the Plotly CDN connection.</p></div>`;
    }
    return;
  }

  if (!schedule.length) {
    target.innerHTML = `<div class="chart-empty"><strong>No package tasks.</strong><p>Select another package or review package assignments.</p></div>`;
    return;
  }

  const tradeColors = ["#1D4ED8", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0F766E", "#64748B"];
  const traces = schedule.map((row, index) => ({
    type: "scatter",
    mode: "lines+markers",
    x: [row.startDay, row.endDay],
    y: [`${row.id}. ${row.label}`, `${row.id}. ${row.label}`],
    name: row.tradeLabel || getTradeDisplayLabel(row.trade),
    line: {
      color: tradeColors[index % tradeColors.length],
      width: 16
    },
    marker: {
      size: 6,
      color: tradeColors[index % tradeColors.length]
    },
    hovertemplate:
      `<b>${escapeHtml(row.label)}</b><br>` +
      `Package: ${escapeHtml(row.package)}<br>` +
      `Trade: ${escapeHtml(row.tradeLabel || getTradeDisplayLabel(row.trade))}<br>` +
      `Phase: ${escapeHtml(row.phase)}<br>` +
      `Start: Day ${formatDecimal(row.startDay, 1)}<br>` +
      `Finish: Day ${formatDecimal(row.endDay, 1)}<br>` +
      `Duration: ${formatDecimal(row.durationDays, 1)} days<br>` +
      `MH: ${formatDecimal(row.plannedMh, 1)}<br>` +
      `Personnel: ${formatNumber(row.assignedPersonnel)}<br>` +
      `Tasks: ${formatNumber(row.tasks)}<extra></extra>`,
    showlegend: index === schedule.findIndex((item) => item.trade === row.trade)
  }));

  Plotly.newPlot(
    target,
    traces,
    {
      margin: { l: 220, r: 24, t: 24, b: 44 },
      paper_bgcolor: "#FFFFFF",
      plot_bgcolor: "#FFFFFF",
      font: { family: "Montserrat, Helvetica Neue, Arial, sans-serif", color: chartColors.slate },
      xaxis: { title: "Inspection Day", type: "linear", gridcolor: chartColors.grid, tickprefix: "Day " },
      yaxis: { autorange: "reversed", automargin: true },
      legend: { orientation: "h", y: -0.2 },
      hovermode: "closest"
    },
    { responsive: true, displayModeBar: false }
  );
}

function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index"
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: chartColors.slate,
          boxWidth: 12,
          boxHeight: 12,
          useBorderRadius: true,
          borderRadius: 3,
          padding: 18,
          generateLabels: (chart) =>
            Chart.defaults.plugins.legend.labels
              .generateLabels(chart)
              .filter((item) => !chart.data.datasets[item.datasetIndex]?.legendHidden)
              .map((item) => ({
                ...item,
                text: formatLegendLabel(item.text)
              })),
          font: {
            family: "Montserrat",
            size: 12,
            weight: "700"
          }
        }
      },
      tooltip: {
        backgroundColor: "#05192E",
        titleColor: "#FFFFFF",
        bodyColor: "#F5F7FA",
        borderColor: chartColors.yellow,
        borderWidth: 1,
        padding: 12,
        displayColors: true
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: chartColors.slate,
          font: {
            family: "Montserrat",
            weight: "700"
          }
        }
      },
      y: {
        beginAtZero: true,
        border: {
          display: false
        },
        grid: {
          color: chartColors.grid,
          drawTicks: false
        },
        ticks: {
          color: chartColors.muted,
          padding: 10,
          font: {
            family: "Montserrat"
          }
        }
      }
    }
  };
}

function renderIntervalChart() {
  if (!window.Chart) {
    showChartFallback("intervalChart");
    return;
  }

  const defaults = chartDefaults();
  const context = document.getElementById("intervalChart");
  const parentTasks = getPrimaryInspectionTasks();
  const maxManHours = Math.max(...parentTasks.map((item) => item.manHours), 0);

  state.charts.interval = new Chart(context, {
    type: "bar",
    plugins: [barValueLabelPlugin],
    data: {
      labels: parentTasks.map((item) => item.parentPackage),
      datasets: [
        {
          label: "Man Hours",
          data: parentTasks.map((item) => item.manHours),
          backgroundColor: parentTasks.map((item) => modelBarColors[item.parentPackage] || chartColors.yellow),
          borderColor: parentTasks.map((item) => modelBarColors[item.parentPackage] || chartColors.yellowDark),
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      ...defaults,
      layout: {
        padding: {
          top: 28
        }
      },
      plugins: {
        ...defaults.plugins,
        legend: {
          display: false
        },
        barValueLabels: {
          enabled: true,
          decimals: 1
        },
        tooltip: {
          ...defaults.plugins.tooltip,
          callbacks: {
            afterLabel: (context) => {
              const item = parentTasks[context.dataIndex];
              return [
                `Task Cards: ${formatNumber(item.childTasks)}`,
                `Average: ${formatDecimal(item.averageManHoursPerTask, 2)} Man Hours per task`,
                `Note: ${item.currentNote}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          ...defaults.scales.x,
          title: {
            display: true,
            text: "Inspection Interval",
            color: chartColors.muted,
            font: {
              family: "Montserrat",
              weight: "700"
            }
          }
        },
        y: {
          ...defaults.scales.y,
          suggestedMax: maxManHours ? maxManHours * 1.18 : undefined,
          title: {
            display: true,
            text: "Man Hours",
            color: chartColors.muted,
            font: {
              family: "Montserrat",
              weight: "700"
            }
          }
        }
      }
    }
  });
}

function renderBaselineStackedChart(simulation) {
  if (!window.Chart) {
    showChartFallback("baselineStackedChart");
    return;
  }

  const defaults = chartDefaults();
  const context = document.getElementById("baselineStackedChart");
  const periods = aggregateBaselineSimulation(simulation, state.simulationView);
  const viewLabel = simulationViews[state.simulationView] || simulationViews.quarterly;
  const maxPeriodTotal = getSimulationMaxPeriodTotal(simulation, state.simulationView);

  state.charts.baselineStacked = new Chart(context, {
    type: "bar",
    plugins: [quarterYearAxisPlugin, barValueLabelPlugin],
    data: {
      labels: periods.map((period) => period.label),
      datasets: simulation.blocks.map((block) => ({
        label: block.label,
        blockKey: block.key,
        data: periods.map((period) => period.blocks[block.key]),
        backgroundColor: block.color,
        borderColor: block.color,
        borderWidth: 1,
        borderRadius: state.simulationView === "yearly" ? 5 : 3,
        categoryPercentage: state.simulationView === "monthly" ? 0.92 : 0.72,
        barPercentage: state.simulationView === "monthly" ? 0.88 : 0.7,
        stack: "baseline"
      }))
    },
    options: {
      ...defaults,
      layout: {
        padding: {
          top: 30,
          bottom: state.simulationView === "quarterly" ? 28 : 0
        }
      },
      plugins: {
        ...defaults.plugins,
        legend: {
          ...defaults.plugins.legend,
          position: "top",
          align: "start",
          labels: {
            ...defaults.plugins.legend.labels,
            padding: 14
          }
        },
        quarterYearAxis: {
          enabled: state.simulationView === "quarterly",
          periods
        },
        barValueLabels: {
          enabled: true,
          mode: "stackTotal",
          values: periods.map((period) => period.totalManHours),
          decimals: 1,
          fontSize: state.simulationView === "monthly" ? 9 : 11
        },
        tooltip: {
          ...defaults.plugins.tooltip,
          callbacks: {
            label: (context) => {
              const value = context.parsed.y || 0;
              return `${context.dataset.label}: ${formatDecimal(value, 1)} Man Hours`;
            },
            afterLabel: (context) => {
              const period = periods[context.dataIndex];
              const equalizedBlock = simulation.equalizedBlocks?.[context.dataset.blockKey];
              if (equalizedBlock) {
                return `Equalized from ${formatNumber(equalizedBlock.totalEvents)} due events over 5 years`;
              }

              const events = period.events[context.dataset.blockKey] || 0;
              return events ? `${events} due event${events > 1 ? "s" : ""}` : "";
            },
            footer: (items) => {
              const period = periods[items[0].dataIndex];
              return [
                `${viewLabel} total: ${formatDecimal(period.totalManHours, 1)} Man Hours`,
                `Months: ${period.monthRange}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          ...defaults.scales.x,
          stacked: true,
          ticks: {
            ...defaults.scales.x.ticks,
            autoSkip: false,
            maxRotation: 0,
            padding: state.simulationView === "quarterly" ? 8 : 10,
            callback: function (_value, index) {
              const period = periods[index];
              if (!period) {
                return "";
              }

              if (state.simulationView === "monthly") {
                return index % 6 === 0 || index === periods.length - 1 ? period.label : "";
              }

              return period.label;
            }
          },
          title: {
            display: state.simulationView !== "quarterly",
            text: `${viewLabel} Simulation Period`,
            color: chartColors.muted,
            font: {
              family: "Montserrat",
              weight: "700"
            }
          }
        },
        y: {
          ...defaults.scales.y,
          stacked: true,
          suggestedMax: maxPeriodTotal ? maxPeriodTotal * 1.2 : undefined,
          title: {
            display: true,
            text: "Stacked Man Hours",
            color: chartColors.muted,
            font: {
              family: "Montserrat",
              weight: "700"
            }
          }
        }
      }
    }
  });
}

function renderEqualizedChart(scenario, program) {
  if (!window.Chart) {
    showChartFallback("equalizedChart");
    return;
  }

  const defaults = chartDefaults();
  const context = document.getElementById("equalizedChart");
  const periods = aggregateBaselineSimulation(scenario, state.simulationView);
  const baselineSimulation = buildBaselineSimulation();
  const baselinePeriods = aggregateBaselineSimulation(baselineSimulation, state.simulationView);
  const viewLabel = simulationViews[state.simulationView] || simulationViews.quarterly;
  const baselineMaxPeriodTotal = getSimulationMaxPeriodTotal(baselineSimulation, state.simulationView);
  const equalizedMaxPeriodTotal = getSimulationMaxPeriodTotal(scenario, state.simulationView);
  const maxPeriodTotal = state.showEqualizedComparison
    ? Math.max(baselineMaxPeriodTotal, equalizedMaxPeriodTotal)
    : equalizedMaxPeriodTotal;

  if (state.charts.equalized) {
    state.charts.equalized.destroy();
    state.charts.equalized = null;
  }

  const baselineDatasets = state.showEqualizedComparison
    ? baselineSimulation.blocks.map((block) => ({
        label: `Base ${block.label}`,
        legendHidden: true,
        blockKey: block.key,
        data: baselinePeriods.map((period) => period.blocks[block.key]),
        backgroundColor: withOpacity(block.color, 0.16),
        borderColor: withOpacity(block.color, 0.28),
        borderWidth: 1,
        borderRadius: state.simulationView === "yearly" ? 5 : 3,
        categoryPercentage: state.simulationView === "monthly" ? 0.98 : 0.84,
        barPercentage: state.simulationView === "monthly" ? 0.96 : 0.84,
        grouped: false,
        stack: "base",
        order: 3
      }))
    : [];

  const equalizedCategoryPercentage = state.showEqualizedComparison
    ? state.simulationView === "monthly"
      ? 0.78
      : 0.58
    : state.simulationView === "monthly"
    ? 0.92
    : 0.78;
  const equalizedBarPercentage = state.showEqualizedComparison
    ? state.simulationView === "monthly"
      ? 0.74
      : 0.58
    : state.simulationView === "monthly"
    ? 0.9
    : 0.74;

  state.charts.equalized = new Chart(context, {
    type: "bar",
    plugins: [quarterYearAxisPlugin, barValueLabelPlugin],
    data: {
      labels: periods.map((period) => period.label),
      datasets: [
        ...baselineDatasets,
        ...scenario.blocks.map((block) => ({
          label: block.label,
          blockKey: block.key,
          data: periods.map((period) => period.blocks[block.key]),
          backgroundColor: block.color,
          borderColor: block.color,
          borderWidth: 1,
          borderRadius: state.simulationView === "yearly" ? 5 : 3,
          categoryPercentage: equalizedCategoryPercentage,
          barPercentage: equalizedBarPercentage,
          grouped: false,
          stack: "equalized",
          order: 2
        }))
      ]
    },
    options: {
      ...defaults,
      animation: {
        duration: 620,
        easing: "easeOutQuart"
      },
      transitions: {
        active: {
          animation: {
            duration: 620
          }
        },
        show: {
          animations: {
            y: {
              from: 0
            }
          }
        },
        hide: {
          animations: {
            y: {
              to: 0
            }
          }
        }
      },
      layout: {
        padding: {
          top: 30,
          bottom: state.simulationView === "quarterly" ? 28 : 0
        }
      },
      plugins: {
        ...defaults.plugins,
        legend: {
          ...defaults.plugins.legend,
          position: "top",
          align: "start",
          labels: {
            ...defaults.plugins.legend.labels,
            padding: 14
          }
        },
        quarterYearAxis: {
          enabled: state.simulationView === "quarterly",
          periods
        },
        barValueLabels: {
          enabled: true,
          mode: "stackTotal",
          values: periods.map((period) => period.totalManHours),
          decimals: 1,
          fontSize: state.simulationView === "monthly" ? 9 : 11
        },
        tooltip: {
          ...defaults.plugins.tooltip,
          filter: (context) => !context.dataset.legendHidden,
          callbacks: {
            label: (context) => {
              const value = context.parsed.y || 0;
              return `${context.dataset.label}: ${formatDecimal(value, 1)} Man Hours`;
            },
            afterLabel: (context) => {
              const period = periods[context.dataIndex];
              const equalizedBlock = scenario.equalizedBlocks?.[context.dataset.blockKey];
              const lines = [];

              if (equalizedBlock?.spreadRatio != null) {
                const percent = Math.round(equalizedBlock.spreadRatio * 100);
                const action =
                  equalizedBlock.mode === "staged"
                    ? `staged into ${equalizedBlock.stageCount} earlier quarter${
                        equalizedBlock.stageCount > 1 ? "s" : ""
                      }`
                    : "spread evenly";
                lines.push(
                  `${percent}% ${action}: ${formatDecimal(equalizedBlock.redistributedManHours, 1)} Man Hours`
                );
              } else if (equalizedBlock) {
                lines.push(`Already equalized from ${formatNumber(equalizedBlock.totalEvents)} due events`);
              }

              const events = period.events[context.dataset.blockKey] || 0;
              if (events) {
                lines.push(`${events} residual due event${events > 1 ? "s" : ""}`);
              }

              return lines;
            },
            footer: (items) => {
              const period = periods[items[0].dataIndex];
              const baselinePeriod = baselinePeriods[items[0].dataIndex];
              const lines = [
                `${program.title} ${viewLabel.toLowerCase()} total: ${formatDecimal(
                  period.totalManHours,
                  1
                )} Man Hours`,
                `Months: ${period.monthRange}`
              ];

              if (state.showEqualizedComparison) {
                lines.splice(1, 0, `Base model total: ${formatDecimal(baselinePeriod.totalManHours, 1)} Man Hours`);
              }

              return lines;
            }
          }
        }
      },
      scales: {
        x: {
          ...defaults.scales.x,
          stacked: true,
          ticks: {
            ...defaults.scales.x.ticks,
            autoSkip: false,
            maxRotation: 0,
            padding: state.simulationView === "quarterly" ? 8 : 10,
            callback: function (_value, index) {
              const period = periods[index];
              if (!period) {
                return "";
              }

              if (state.simulationView === "monthly") {
                return index % 6 === 0 || index === periods.length - 1 ? period.label : "";
              }

              return period.label;
            }
          },
          title: {
            display: state.simulationView !== "quarterly",
            text: `${viewLabel} Simulation Period`,
            color: chartColors.muted,
            font: {
              family: "Montserrat",
              weight: "700"
            }
          }
        },
        y: {
          ...defaults.scales.y,
          stacked: true,
          suggestedMax: maxPeriodTotal ? maxPeriodTotal * 1.2 : undefined,
          title: {
            display: true,
            text: state.showEqualizedComparison ? "Equalized vs Base Man Hours" : "Equalized Man Hours",
            color: chartColors.muted,
            font: {
              family: "Montserrat",
              weight: "700"
            }
          }
        }
      }
    }
  });
}

function showChartFallback(canvasId) {
  const canvas = document.getElementById(canvasId);
  const frame = canvas.parentElement;
  frame.innerHTML = `
    <div class="chart-empty">
      <div>
        <strong>Chart.js is not available.</strong>
        <p>Check the CDN connection or replace the CDN with a local Chart.js bundle.</p>
      </div>
    </div>
  `;
}

function setActiveNav() {
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === state.section);
  });
}

function closeSidebar() {
  sidebar.classList.remove("open");
  document.body.classList.remove("sidebar-visible");
}

function render() {
  destroyCharts();
  setActiveNav();
  pageTitle.textContent = sectionTitles[state.section];

  if (state.section === "data-source") {
    renderDataSource();
  }

  if (state.section === "basic-inspection") {
    renderBasicInspection();
  }

  if (state.section === "equalized-inspection") {
    renderEqualizedInspection();
  }

  if (state.section === "inspection-chart") {
    renderInspectionGantt();
  }

  content.focus({ preventScroll: true });
}

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => {
    state.section = button.dataset.section;
    closeSidebar();
    render();
  });
});

menuButton.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  document.body.classList.toggle("sidebar-visible", sidebar.classList.contains("open"));
});

document.querySelectorAll("[data-close-image-preview]").forEach((button) => {
  button.addEventListener("click", closeImagePreview);
});

loginForm?.addEventListener("submit", handleLoginSubmit);

passwordVisibilityButton?.addEventListener("click", togglePasswordVisibility);

userMenuButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleUserMenu();
});

authLogoutButton?.addEventListener("click", lockDashboard);

loginVisualImage?.addEventListener("error", () => {
  loginVisualImage.closest(".login-visual")?.classList.add("image-missing");
});

document.addEventListener("click", (event) => {
  const clickedOutsideSidebar = !sidebar.contains(event.target);
  const clickedOutsideButton = !menuButton.contains(event.target);
  const dateFilterPanel = document.querySelector(".date-filter-panel");
  const clickedOutsideUserMenu = !userMenu?.contains(event.target);

  if (clickedOutsideSidebar && clickedOutsideButton && sidebar.classList.contains("open")) {
    closeSidebar();
  }

  if (state.activeDatePicker && dateFilterPanel && !dateFilterPanel.contains(event.target)) {
    closeDateCalendar();
  }

  if (clickedOutsideUserMenu) {
    closeUserMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSidebar();
    closeDateCalendar();
    closeImagePreview();
    closeUserMenu();
  }
});

initializeAuthGate();
