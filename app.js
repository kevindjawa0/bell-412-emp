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
    model: "BELL 412 SP",
    checkType: "Daily / Pre-flight Inspection",
    intervalHours: "Before flight",
    nextDue: "Next operating day"
  },
  {
    model: "BELL 412 SP",
    checkType: "50-Hour Inspection",
    intervalHours: "50 Flight Hours",
    nextDue: "PK-AFH at 1,900 Flight Hours"
  },
  {
    model: "BELL 412 SP",
    checkType: "100-Hour Inspection",
    intervalHours: "100 Flight Hours",
    nextDue: "PK-AFI at 1,800 Flight Hours"
  },
  {
    model: "BELL 412 SP",
    checkType: "300-Hour Inspection",
    intervalHours: "300 Flight Hours",
    nextDue: "PK-AFH at 2,100 Flight Hours"
  },
  {
    model: "BELL 412 SP",
    checkType: "600-Hour Inspection",
    intervalHours: "600 Flight Hours",
    nextDue: "PK-AFI at 2,400 Flight Hours"
  },
  {
    model: "BELL 412 EP",
    checkType: "Daily / Pre-flight Inspection",
    intervalHours: "Before flight",
    nextDue: "Next operating day"
  },
  {
    model: "BELL 412 EP",
    checkType: "50-Hour Inspection",
    intervalHours: "50 Flight Hours",
    nextDue: "PK-AFJ at 2,150 Flight Hours"
  },
  {
    model: "BELL 412 EP",
    checkType: "150-Hour Inspection",
    intervalHours: "150 Flight Hours",
    nextDue: "PK-AFK at 2,400 Flight Hours"
  },
  {
    model: "BELL 412 EP",
    checkType: "300-Hour Inspection",
    intervalHours: "300 Flight Hours",
    nextDue: "PK-AFJ at 2,400 Flight Hours"
  },
  {
    model: "BELL 412 EP",
    checkType: "600-Hour Inspection",
    intervalHours: "600 Flight Hours",
    nextDue: "PK-AFK at 2,700 Flight Hours"
  }
];

const equalizedPrograms = {
  "50": {
    title: "Equalized 50%",
    spreadRatio: 0.5,
    redistributionMode: "staged",
    equalizedBlockKeys: ["5000-hour"],
    description:
      "Attempts to redistribute approximately 50% of engineer-approved movable 5000-hour workload. Core, locked, and unreviewed tasks remain in Core."
  },
  "75": {
    title: "Equalized 75%",
    spreadRatio: 0.75,
    redistributionMode: "staged",
    equalizedBlockKeys: ["5000-hour"],
    description:
      "Attempts to redistribute approximately 75% of engineer-approved movable 5000-hour workload without splitting approved groups."
  },
  "100": {
    title: "Equalized 100%",
    spreadRatio: 1,
    equalizedBlockKeys: ["5000-hour"],
    description:
      "Attempts to redistribute all engineer-approved movable 5000-hour workload. Work that is Core, locked, conditional without a group, or unreviewed remains in Core."
  }
};

const maintenancePrograms =
  Array.isArray(basicInspectionData.aircraftPrograms) && basicInspectionData.aircraftPrograms.length
    ? basicInspectionData.aircraftPrograms
    : [
        {
          key: "OCA",
          registration: "PK-OCA",
          model: "BELL 412 SP",
          parentTasks: basicInspectionData.parentTasks || [],
          totals: basicInspectionData.totals || { childTasks: 0, manHours: 0 }
        },
        {
          key: "OCD",
          registration: "PK-OCD",
          model: "BELL 412 EP",
          parentTasks: basicInspectionData.parentTasks || [],
          totals: basicInspectionData.totals || { childTasks: 0, manHours: 0 }
        }
      ];

const state = {
  section: "data-source",
  equalized: "100",
  simulationView: "quarterly",
  showEqualizedComparison: false,
  activeDatePicker: null,
  calendarMonth: null,
  selectedRegistrations: utilizationData.aircraft.map((aircraft) => aircraft.registration),
  selectedMaintenanceProgram: maintenancePrograms[0]?.key || "OCA",
  heavyCheckTab: "upload",
  heavyCheckStatusFilter: "all",
  heavyCheckSearch: "",
  reviewFilters: {
    ata: "all",
    phase: "all",
    trade: "all",
    taskCode: "all",
    movability: "all",
    reviewStatus: "all",
    search: ""
  },
  selectedReviewTaskUids: [],
  heavyCheckDraftTasks: heavyCheckData.tasks || [],
  approvedTaskMaster: [],
  reviewedTaskMaster: [],
  selectedGanttPackage: "Core",
  manualPackageAssignments: {},
  latestEqualizationScenario: null,
  ganttInputs: {
    startDate: new Date().toISOString().slice(0, 10),
    workingDaysPerWeek: 5,
    weekendWork: false,
    shifts: 1,
    hoursPerShift: 8,
    productivityFactor: 0.82,
    tradeCapacity: {
      AP: 4,
      REI: 2,
      SM: 2,
      PAINTER: 1,
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
  "data-source": "Data Source & Heavy Check Setup",
  "basic-inspection": "Baseline Heavy Check & Engineering Review",
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
  state.selectedRegistrations = getDefaultSelectedRegistrations();
  utilizationFilter.startDate = utilizationData.validDates[0] || utilizationData.window.start;
  utilizationFilter.endDate = utilizationData.validDates[utilizationData.validDates.length - 1] || utilizationData.window.end;
  state.activeDatePicker = null;
  state.calendarMonth = null;
  normalizeDateRangeForSelectedAircraft();
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

function toggleAircraftSelection(registration) {
  const isSelected = state.selectedRegistrations.includes(registration);

  if (isSelected && state.selectedRegistrations.length === 1) {
    return;
  }

  if (isSelected) {
    state.selectedRegistrations = state.selectedRegistrations.filter((item) => item !== registration);
  } else {
    state.selectedRegistrations = [...state.selectedRegistrations, registration];
  }

  normalizeDateRangeForSelectedAircraft();

  const filterContainer = document.getElementById("aircraftFilterControls");
  if (filterContainer) {
    filterContainer.innerHTML = renderAircraftSelector();
    bindAircraftFilterControls();
  }

  updateUtilizationSection();
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
  const summary = getValidationSummary();
  const workbookInfo = state.heavyCheckWorkbookInfo || {
    sourceFile: heavyCheckData.sourceFile,
    sourceSheet: heavyCheckData.sourceSheet,
    sheets: heavyCheckData.sheets || []
  };
  const blockingErrors = state.heavyCheckDraftTasks.filter((task) => task.validationStatus === "error" && !task.excluded).length;

  return `
    <article class="card workflow-card" id="heavyCheckSetup">
      <div class="section-header">
        <div>
          <p class="card-kicker">5000H Workbook Upload</p>
          <h3>Heavy Check Task Master</h3>
        </div>
        <div class="inspection-total">
          <span>Approved Task Master</span>
          <strong>${formatNumber(state.approvedTaskMaster.length)} Tasks</strong>
        </div>
      </div>

      <div class="scope-notice">
        Beta equalization scope: 5000-hour / 5-year heavy inspection only. The smaller inspection intervals remain visible as maintenance context and are not used by the task-level equalization algorithm.
      </div>

      <div class="upload-panel">
        <label class="file-upload-label">
          <span>Upload 5000-hour / 5-year workbook</span>
          <input id="heavyCheckWorkbookInput" type="file" accept=".xlsx,.xlsm,.xls" />
        </label>
        <div>
          <strong>Master sheet required:</strong>
          <span>${heavyCheckMasterSheetName}</span>
          <small>Other phase sheets are listed for information only and are not concatenated into the master.</small>
        </div>
      </div>

      ${state.heavyCheckUploadMessage ? `<p class="data-note">${escapeHtml(state.heavyCheckUploadMessage)}</p>` : ""}
      ${
        workbookInfo.sourceFile
          ? `<p class="data-note">Source: ${escapeHtml(workbookInfo.sourceFile)} / Sheet: ${escapeHtml(
              workbookInfo.sourceSheet || heavyCheckMasterSheetName
            )}</p>`
          : ""
      }
      ${
        workbookInfo.sheets?.length
          ? `<details class="soft-details"><summary>Workbook sheets found</summary><p>${escapeHtml(
              workbookInfo.sheets.join(", ")
            )}</p></details>`
          : ""
      }

      ${renderMetricStrip([
        { label: "Imported Tasks", value: formatNumber(summary.totalTasks) },
        { label: "Valid Tasks", value: formatNumber(summary.validTasks) },
        { label: "Tasks With Errors", value: formatNumber(summary.tasksWithErrors) },
        { label: "Tasks With Warnings", value: formatNumber(summary.tasksWithWarnings) },
        { label: "Missing Man-Hours", value: formatNumber(summary.missingManHours) },
        { label: "Known OCA Man-Hours", value: formatDecimal(summary.knownManHours, 1) },
        { label: "Known Workload Coverage", value: `${formatDecimal(summary.workloadCoverage, 1)}%` }
      ])}

      <div class="toolbar-row">
        <label>
          <span>Status</span>
          <select id="heavyCheckStatusFilter">
            ${["all", "valid", "warning", "error", "excluded"]
              .map((status) => `<option value="${status}" ${state.heavyCheckStatusFilter === status ? "selected" : ""}>${status}</option>`)
              .join("")}
          </select>
        </label>
        <label class="grow">
          <span>Search task cards, descriptions, ATA, trade, or validation messages</span>
          <input id="heavyCheckSearch" type="search" value="${escapeHtml(state.heavyCheckSearch)}" placeholder="Search 5000H task master" />
        </label>
        <button class="secondary-button" data-heavy-revalidate type="button">Revalidate</button>
        <button class="secondary-button danger-action" data-heavy-exclude-errors type="button" ${!blockingErrors ? "disabled" : ""}>
          Exclude All Errors
        </button>
        <button class="secondary-button" data-heavy-clear-exclusions type="button" ${
          state.heavyCheckDraftTasks.some((task) => task.excluded) ? "" : "disabled"
        }>
          Clear Exclusions
        </button>
        <button class="primary-button" data-heavy-approve type="button" ${!summary.totalTasks ? "disabled" : ""}>
          Approve Task Master
        </button>
      </div>

      ${
        blockingErrors
          ? `<div class="warning-box">${formatNumber(
              blockingErrors
            )} blocking task error(s) must be corrected or explicitly excluded before approval.</div>`
          : ""
      }

      <div class="table-wrap tall-table">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Exclude</th>
              <th>Task Card No</th>
              <th>ATA</th>
              <th>Trade</th>
              <th>Phase</th>
              <th>Seq</th>
              <th>OCA Man-Hours</th>
              <th>Description</th>
              <th>Validation Message</th>
            </tr>
          </thead>
          <tbody>${renderHeavyCheckValidationRows()}</tbody>
        </table>
      </div>
      <p class="data-note">Showing up to 80 filtered rows for readability. Use search/status filters to narrow the editable review set.</p>
    </article>
  `;
}

function bindHeavyCheckSetupControls() {
  document.getElementById("heavyCheckWorkbookInput")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) {
      importHeavyCheckWorkbook(file);
    }
  });

  document.getElementById("heavyCheckStatusFilter")?.addEventListener("change", (event) => {
    state.heavyCheckStatusFilter = event.target.value;
    render();
  });

  document.getElementById("heavyCheckSearch")?.addEventListener("input", (event) => {
    state.heavyCheckSearch = event.target.value;
    render();
  });

  document.querySelectorAll("[data-heavy-task]").forEach((input) => {
    input.addEventListener("change", () => {
      const taskUid = input.dataset.heavyTask;
      const field = input.dataset.heavyField;
      if (field === "excluded") {
        state.heavyCheckDraftTasks = state.heavyCheckDraftTasks.map((task) =>
          task.taskUid === taskUid ? { ...task, excluded: input.checked } : task
        );
      } else {
        updateHeavyCheckTaskField(taskUid, field, input.value);
      }
    });
  });

  document.querySelector("[data-heavy-revalidate]")?.addEventListener("click", revalidateHeavyCheckDraft);
  document.querySelector("[data-heavy-exclude-errors]")?.addEventListener("click", bulkExcludeHeavyCheckErrors);
  document.querySelector("[data-heavy-clear-exclusions]")?.addEventListener("click", clearHeavyCheckExclusions);
  document.querySelector("[data-heavy-approve]")?.addEventListener("click", approveHeavyCheckTaskMaster);
}

function renderDataSource() {
  normalizeDateRangeForSelectedAircraft();
  const initialSummary = calculateUtilizationWindow();

  content.innerHTML = `
    <section class="view-grid">
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

      ${renderHeavyCheckSetupSection()}
    </section>
  `;

  document.querySelectorAll("[data-date-picker]").forEach((button) => {
    button.addEventListener("click", () => openDateCalendar(button.dataset.datePicker));
  });
  bindAircraftFilterControls();
  bindAircraftImagePreview();
  document.getElementById("dateCalendar").addEventListener("click", (event) => {
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

function importHeavyCheckWorkbook(file) {
  if (!window.XLSX) {
    state.heavyCheckUploadMessage = "Excel parser is unavailable. Check the XLSX CDN connection.";
    render();
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const workbook = XLSX.read(new Uint8Array(event.target.result), { type: "array" });
      const sheetName = workbook.SheetNames.find((name) => name.trim().toUpperCase() === heavyCheckMasterSheetName);
      if (!sheetName) {
        state.heavyCheckUploadMessage = `Master sheet "${heavyCheckMasterSheetName}" was not found. No phase sheets were imported.`;
        state.heavyCheckDraftTasks = [];
        render();
        return;
      }

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "", blankrows: false });
      const headerRowIndex = findHeavyCheckHeaderRow(rows);
      if (headerRowIndex < 0) {
        state.heavyCheckUploadMessage = "Could not identify the task-card header row in the master sheet.";
        state.heavyCheckDraftTasks = [];
        render();
        return;
      }

      const headers = rows[headerRowIndex].map((header) => heavyCheckFieldMap[normalizeHeaderKey(header)] || null);
      const importedTasks = rows.slice(headerRowIndex + 1).flatMap((row, rowIndex) => {
        const raw = {};
        headers.forEach((field, index) => {
          if (field) {
            raw[field] = row[index];
          }
        });

        if (!Object.values(raw).some((value) => normalizeBlank(value))) {
          return [];
        }

        return normalizeHeavyCheckTask(raw, {
          sourceFile: file.name,
          sourceSheet: sheetName,
          sourceRow: headerRowIndex + rowIndex + 2
        });
      });

      state.heavyCheckDraftTasks = validateHeavyCheckTasks(importedTasks);
      state.approvedTaskMaster = [];
      state.reviewedTaskMaster = [];
      state.manualPackageAssignments = {};
      state.latestEqualizationScenario = null;
      state.heavyCheckUploadMessage = `Imported ${formatNumber(importedTasks.length)} task rows from ${sheetName}. Other sheets were listed only and were not duplicated.`;
      state.heavyCheckWorkbookInfo = {
        sourceFile: file.name,
        sourceSheet: sheetName,
        sheets: workbook.SheetNames
      };
      render();
    } catch (error) {
      state.heavyCheckUploadMessage = `Workbook import failed: ${error.message}`;
      render();
    }
  };
  reader.readAsArrayBuffer(file);
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
  state.heavyCheckStatusFilter = "excluded";
  state.heavyCheckUploadMessage = `Excluded ${formatNumber(errorTasks.length)} validation-error row(s). Review the Excluded filter before approving the task master.`;
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
  state.heavyCheckStatusFilter = "all";
  state.heavyCheckUploadMessage = `Restored ${formatNumber(excludedTasks.length)} excluded row(s).`;
  render();
}

function approveHeavyCheckTaskMaster() {
  const blockingTasks = state.heavyCheckDraftTasks.filter((task) => task.validationStatus === "error" && !task.excluded);
  if (blockingTasks.length) {
    state.heavyCheckUploadMessage = `${formatNumber(blockingTasks.length)} blocking task error(s) must be corrected or explicitly excluded before approval.`;
    render();
    return;
  }

  state.approvedTaskMaster = state.heavyCheckDraftTasks.filter((task) => !task.excluded);
  state.reviewedTaskMaster = ensureEngineeringFields(state.approvedTaskMaster);
  state.manualPackageAssignments = {};
  state.latestEqualizationScenario = null;
  state.heavyCheckUploadMessage = `Approved ${formatNumber(state.approvedTaskMaster.length)} 5000-hour task-master rows.`;
  render();
}

function ensureEngineeringFields(tasks) {
  return tasks.map((task) => ({
    ...task,
    movability: task.movability || "UNREVIEWED",
    approvedGroupId: task.approvedGroupId || "",
    accessGroup: task.accessGroup || "",
    packageLock: Boolean(task.packageLock),
    reviewNotes: task.reviewNotes || "",
    reviewedBy: task.reviewedBy || "",
    reviewStatus: task.reviewStatus || "PENDING",
    candidateGroupId: task.candidateGroupId || "",
    candidateReason: task.candidateReason || "",
    candidateConfidence: task.candidateConfidence || ""
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

function getApprovedHeavyCheckSummary() {
  const tasks = state.approvedTaskMaster;
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

function filterReviewTasks(tasks = getReviewedTasks()) {
  const filters = state.reviewFilters;
  const search = filters.search.trim().toUpperCase();
  return tasks.filter((task) => {
    return (
      (filters.ata === "all" || task.ata === filters.ata) &&
      (filters.phase === "all" || task.phase === filters.phase) &&
      (filters.trade === "all" || task.trade === filters.trade) &&
      (filters.taskCode === "all" || task.taskCode === filters.taskCode) &&
      (filters.movability === "all" || task.movability === filters.movability) &&
      (filters.reviewStatus === "all" || task.reviewStatus === filters.reviewStatus) &&
      (!search || [task.taskCardNo, task.description, task.refMm, task.refDmc].join(" ").toUpperCase().includes(search))
    );
  });
}

function updateReviewTask(taskUid, field, value) {
  state.reviewedTaskMaster = getReviewedTasks().map((task) => {
    if (task.taskUid !== taskUid) {
      return task;
    }

    return {
      ...task,
      [field]: field === "packageLock" ? value === "true" || value === true : value
    };
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
      ? {
          ...task,
          [field]: field === "packageLock" ? value === "true" || value === true : value
        }
      : task
  );
  state.latestEqualizationScenario = null;
  render();
}

function suggestCandidateGroups() {
  state.reviewedTaskMaster = getReviewedTasks().map((task) => {
    const dmcFamily = task.refDmc ? task.refDmc.split(/[-.\s]/).slice(0, 4).join("-") : "";
    const mmFamily = task.refMm ? task.refMm.split(/[-.\s]/).slice(0, 3).join("-") : "";
    const componentMatch = task.description.match(/\b(?:REMOVE|INSPECT|INSTALL|TEST|CHECK|REPLACE)\b\s+(.{4,36})/i);
    const component = componentMatch ? componentMatch[1].replace(/[^A-Z0-9 ]/gi, "").trim().slice(0, 24) : "";
    const family = dmcFamily || mmFamily || `${task.ata}-${component || task.taskCode || task.phase}`;
    const candidateGroupId = family ? `CAND-${family.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "")}` : "";
    const candidateReason = dmcFamily
      ? "Same REF DMC family"
      : mmFamily
      ? "Same REF MM family"
      : component
      ? "Similar component wording"
      : "Same ATA / task-code family";

    return {
      ...task,
      candidateGroupId,
      candidateReason,
      candidateConfidence: dmcFamily || mmFamily ? "Medium" : "Low"
    };
  });
  render();
}

function getTaskItemKey(task) {
  return task.approvedGroupId ? `group:${task.approvedGroupId}` : `task:${task.taskUid}`;
}

function buildEqualizationScenarioFromTasks(percentKey = state.equalized) {
  const tasks = getReviewedTasks();
  const ratio = Number(percentKey) / 100;
  const baselineWorkload = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, Core: tasks.reduce((sum, task) => sum + (Number(task.plannedMh) || 0), 0) };
  const eligibleMap = new Map();
  const register = [];
  const assignments = new Map();

  tasks.forEach((task) => {
    const plannedMh = Number(task.plannedMh) || 0;
    const isApproved = task.reviewStatus === "APPROVED";
    const isLocked = Boolean(task.packageLock);
    const isMovable = task.movability === "MOVABLE" && isApproved && !isLocked;
    const isConditional = task.movability === "CONDITIONAL" && isApproved && task.approvedGroupId && !isLocked;
    const eligible = isMovable || isConditional;
    const itemKey = eligible ? getTaskItemKey(task) : "";

    if (eligible) {
      const existing = eligibleMap.get(itemKey) || {
        itemKey,
        approvedGroupId: task.approvedGroupId,
        tasks: [],
        manHours: 0
      };
      existing.tasks.push(task);
      existing.manHours += plannedMh;
      eligibleMap.set(itemKey, existing);
    }
  });

  const eligibleItems = Array.from(eligibleMap.values()).sort((a, b) => b.manHours - a.manHours);
  const eligibleManHours = eligibleItems.reduce((sum, item) => sum + item.manHours, 0);
  const targetManHours = eligibleManHours * ratio;
  const packageWorkload = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, Core: baselineWorkload.Core };
  let redistributedManHours = 0;

  eligibleItems.forEach((item) => {
    const manualPackage = state.manualPackageAssignments[item.itemKey];
    if (!manualPackage && redistributedManHours >= targetManHours && ratio < 1) {
      return;
    }

    const targetPackage =
      manualPackage ||
      ["P1", "P2", "P3", "P4", "P5"].reduce((lowest, pkg) =>
        packageWorkload[pkg] < packageWorkload[lowest] ? pkg : lowest
      );

    assignments.set(item.itemKey, targetPackage);
    if (targetPackage !== "Core") {
      packageWorkload.Core -= item.manHours;
      packageWorkload[targetPackage] += item.manHours;
      redistributedManHours += item.manHours;
    }
  });

  tasks.forEach((task) => {
    const itemKey = getTaskItemKey(task);
    const proposedPackage = assignments.get(itemKey) || "Core";
    const reason =
      proposedPackage !== "Core"
        ? state.manualPackageAssignments[itemKey]
          ? "Manual package override"
          : `${percentKey}% greedy load balancing of approved movable workload`
        : task.packageLock
        ? "Package locked"
        : task.movability === "CORE" || task.movability === "UNREVIEWED"
        ? `${task.movability} tasks remain in Core`
        : task.movability === "CONDITIONAL" && !task.approvedGroupId
        ? "Conditional task has no approved group"
        : "Retained in Core after target workload was reached";

    register.push({
      taskUid: task.taskUid,
      itemKey,
      taskCardNo: task.taskCardNo,
      description: task.description,
      plannedMh: Number(task.plannedMh) || 0,
      ata: task.ata,
      trade: task.trade,
      phase: task.phase,
      sequence: task.sequence,
      movability: task.movability,
      approvedGroupId: task.approvedGroupId,
      originalPackage: "Core",
      proposedPackage,
      movementReason: reason,
      reviewStatus: task.reviewStatus,
      manualOverride: state.manualPackageAssignments[itemKey] || ""
    });
  });

  const packageSummaries = heavyCheckPackages.map((pkg) => {
    const rows = register.filter((row) => row.proposedPackage === pkg);
    return {
      package: pkg,
      tasks: rows.length,
      manHours: rows.reduce((sum, row) => sum + row.plannedMh, 0),
      byAta: summarizeWorkload(rows, "ata"),
      byTrade: summarizeWorkload(rows, "trade"),
      byPhase: summarizeWorkload(rows, "phase")
    };
  });
  const achievedPercent = eligibleManHours ? (redistributedManHours / eligibleManHours) * 100 : 0;
  const workloads = packageSummaries.map((item) => item.manHours);
  const average = workloads.reduce((sum, value) => sum + value, 0) / (workloads.length || 1);
  const variance = workloads.reduce((sum, value) => sum + (value - average) ** 2, 0) / (workloads.length || 1);

  return {
    percentKey,
    requestedPercent: Number(percentKey),
    eligibleManHours,
    targetManHours,
    redistributedManHours,
    achievedPercent,
    baselineWorkload,
    packageSummaries,
    movementRegister: register,
    movedTasks: register.filter((row) => row.proposedPackage !== "Core").length,
    movedGroups: new Set(register.filter((row) => row.proposedPackage !== "Core" && row.approvedGroupId).map((row) => row.approvedGroupId)).size,
    coreTasks: register.filter((row) => row.proposedPackage === "Core").length,
    unreviewedTasks: tasks.filter((task) => task.movability === "UNREVIEWED").length,
    workloadStdDev: Math.sqrt(variance),
    peakBefore: baselineWorkload.Core,
    peakAfter: Math.max(...workloads, 0)
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

function addWorkingDays(startDate, days, inputs) {
  const date = new Date(`${startDate}T00:00:00`);
  let remaining = Math.max(1, Math.ceil(days));
  while (remaining > 0) {
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    if (inputs.weekendWork || !isWeekend) {
      remaining -= 1;
    }
    if (remaining > 0) {
      date.setDate(date.getDate() + 1);
    }
  }
  return date.toISOString().slice(0, 10);
}

function generateGanttSchedule(scenario, packageName = state.selectedGanttPackage) {
  const inputs = state.ganttInputs;
  const rows = scenario.movementRegister.filter((row) => row.proposedPackage === packageName);
  const groups = new Map();
  rows.forEach((row) => {
    const key = row.approvedGroupId || `${row.phase || "UNPHASED"}::${row.taskUid}`;
    const existing = groups.get(key) || {
      label: row.approvedGroupId || row.taskCardNo || key,
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

  let currentDate = inputs.startDate;
  const productiveHoursPerDay = Math.max(0, Number(inputs.shifts) || 0) * Math.max(0, Number(inputs.hoursPerShift) || 0);
  const schedule = Array.from(groups.values())
    .sort((a, b) => getPhaseRank(a.phase) - getPhaseRank(b.phase) || a.sequence - b.sequence)
    .map((group, index) => {
      const capacityKey = group.trade.includes("/") ? "OTHER" : group.trade;
      const personnel = Number(inputs.tradeCapacity[capacityKey] ?? inputs.tradeCapacity.OTHER ?? 0);
      const denominator = personnel * productiveHoursPerDay * Math.max(0, Number(inputs.productivityFactor) || 0);
      const durationDays = denominator > 0 ? Math.max(1, group.plannedMh / denominator) : 0;
      const finishDate = durationDays ? addWorkingDays(currentDate, durationDays, inputs) : currentDate;
      const row = {
        id: index + 1,
        package: packageName,
        label: group.label,
        phase: group.phase,
        trade: group.trade,
        startDate: currentDate,
        finishDate,
        durationDays,
        plannedMh: group.plannedMh,
        assignedPersonnel: personnel,
        sequence: group.sequence === Number.MAX_SAFE_INTEGER ? "" : group.sequence,
        tasks: group.tasks,
        validationMessage: denominator > 0 ? "" : `No personnel/productive hours available for ${group.trade || "OTHER"}`
      };
      currentDate = addWorkingDays(finishDate, 1, inputs);
      return row;
    });

  return schedule;
}

function getSelectedMaintenanceProgram() {
  return (
    maintenancePrograms.find((program) => program.key === state.selectedMaintenanceProgram) ||
    maintenancePrograms[0] || {
      key: "OCA",
      registration: "PK-OCA",
      model: "BELL 412 SP",
      parentTasks: [],
      totals: { childTasks: 0, manHours: 0 }
    }
  );
}

function getSelectedInspectionTasks() {
  return getSelectedMaintenanceProgram().parentTasks || [];
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
      render();
    });
  });
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
  const selectedProgram = getSelectedMaintenanceProgram();
  const utilizationAircraft = utilizationData.aircraft.find(
    (aircraft) => aircraft.registration === selectedProgram.registration
  );

  if (utilizationAircraft) {
    const aircraft = utilizationAircraft;
      const averageFlightHoursPerDay =
        aircraft.avgFHPerDay ||
        (utilizationData.window.calendarDays ? aircraft.totalFH / utilizationData.window.calendarDays : 0);

      return [
        {
        registration: aircraft.registration,
        model: aircraft.model,
        averageFlightHoursPerMonth: averageFlightHoursPerDay * simulationDaysPerMonth
        }
      ];
  }

  return [
    {
      registration: selectedProgram.registration || selectedProgram.key,
      model: selectedProgram.model || "Bell 412",
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
  return `
    <article class="mini-panel">
      <h4>${escapeHtml(title)}</h4>
      <div class="table-wrap compact-table">
        <table>
          <thead>
            <tr>
              <th>Category</th>
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
                          <td>${escapeHtml(row.label)}</td>
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
        <div class="warning-box">No approved 5000-hour task master is available yet. Page 2 is showing the existing 700 man-hour context assumption until a workbook is uploaded, validated, and approved on Page 1.</div>
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
  return options.map((option) => `<option value="${option}" ${option === selected ? "selected" : ""}>${option}</option>`).join("");
}

function renderEngineeringReviewRows() {
  const rows = filterReviewTasks().sort((a, b) => (Number(b.plannedMh) || 0) - (Number(a.plannedMh) || 0)).slice(0, 100);
  if (!rows.length) {
    return `<tr><td colspan="14">No engineering-review tasks match the current filters.</td></tr>`;
  }

  const selected = new Set(state.selectedReviewTaskUids);
  return rows
    .map(
      (task) => `
        <tr>
          <td><input type="checkbox" data-review-select="${task.taskUid}" ${selected.has(task.taskUid) ? "checked" : ""} /></td>
          <td><strong>${escapeHtml(task.taskCardNo)}</strong><div class="tail-note">${escapeHtml(task.sourceSheet)} row ${task.sourceRow}</div></td>
          <td>${escapeHtml(task.ata)}</td>
          <td>${escapeHtml(task.trade)}</td>
          <td>${escapeHtml(task.phase)}</td>
          <td>${escapeHtml(task.taskCode)}</td>
          <td>${formatDecimal(task.plannedMh, 1)}</td>
          <td>
            <select data-review-task="${task.taskUid}" data-review-field="movability">
              ${renderReviewOptions(movableOptions, task.movability)}
            </select>
          </td>
          <td><input class="table-input" data-review-task="${task.taskUid}" data-review-field="approvedGroupId" value="${escapeHtml(task.approvedGroupId)}" placeholder="GROUP-001" /></td>
          <td><input class="table-input" data-review-task="${task.taskUid}" data-review-field="accessGroup" value="${escapeHtml(task.accessGroup)}" placeholder="Access group" /></td>
          <td>
            <select data-review-task="${task.taskUid}" data-review-field="reviewStatus">
              ${renderReviewOptions(reviewStatusOptions, task.reviewStatus)}
            </select>
          </td>
          <td><input class="table-input" data-review-task="${task.taskUid}" data-review-field="reviewedBy" value="${escapeHtml(task.reviewedBy)}" placeholder="Reviewer" /></td>
          <td><input class="table-input" data-review-task="${task.taskUid}" data-review-field="reviewNotes" value="${escapeHtml(task.reviewNotes)}" placeholder="Review notes" /></td>
          <td>
            <small><strong>${escapeHtml(task.candidateGroupId || "-")}</strong><br>${escapeHtml(task.candidateReason || "No suggestion")}</small>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderEngineeringReviewSection() {
  const tasks = getReviewedTasks();
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

  return `
    <article class="card workflow-card">
      <div class="section-header">
        <div>
          <p class="card-kicker">Engineering Review</p>
          <h3>Classify 5000H Tasks and Approved Groups</h3>
        </div>
        <div class="inspection-total">
          <span>Reviewed / Approved</span>
          <strong>${formatNumber(tasks.filter((task) => task.reviewStatus !== "PENDING").length)} / ${formatNumber(tasks.length)}</strong>
        </div>
      </div>
      <div class="scope-notice">
        Conservative rule: UNREVIEWED and CORE tasks remain in Core. MOVABLE tasks require engineering approval. CONDITIONAL tasks move only with an approved group. Candidate groups are suggestions only.
      </div>

      <div class="filter-grid">
        ${renderReviewFilter("ata", "ATA", uniqueValues(tasks, "ata"))}
        ${renderReviewFilter("phase", "Phase", uniqueValues(tasks, "phase"))}
        ${renderReviewFilter("trade", "Trade", uniqueValues(tasks, "trade"))}
        ${renderReviewFilter("taskCode", "Task Code", uniqueValues(tasks, "taskCode"))}
        ${renderReviewFilter("movability", "Movability", movableOptions)}
        ${renderReviewFilter("reviewStatus", "Review Status", reviewStatusOptions)}
        <label class="wide">
          <span>Search</span>
          <input data-review-filter="search" type="search" value="${escapeHtml(state.reviewFilters.search)}" placeholder="Task card, description, MM, DMC" />
        </label>
      </div>

      <div class="toolbar-row">
        <button class="secondary-button" data-review-suggest type="button">Suggest Candidate Groups</button>
        <select data-bulk-field="movability">${renderReviewOptions(movableOptions, "MOVABLE")}</select>
        <button class="secondary-button" data-bulk-apply="movability" type="button">Bulk Movability</button>
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
              <th>ATA</th>
              <th>Trade</th>
              <th>Phase</th>
              <th>Task Code</th>
              <th>MH</th>
              <th>Movability</th>
              <th>Approved Group</th>
              <th>Access Group</th>
              <th>Status</th>
              <th>Reviewed By</th>
              <th>Notes</th>
              <th>Candidate Group</th>
            </tr>
          </thead>
          <tbody>${renderEngineeringReviewRows()}</tbody>
        </table>
      </div>
      <p class="data-note">Showing up to 100 filtered tasks sorted by largest man-hours for efficient review.</p>
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

function renderBasicInspection() {
  const selectedProgram = getSelectedMaintenanceProgram();
  const primaryTasks = getPrimaryInspectionTasks();
  const totalChildTasks = primaryTasks.reduce((total, item) => total + item.childTasks, 0);
  const totalManHours = primaryTasks.reduce((total, item) => total + item.manHours, 0);
  const baselineSimulation = buildBaselineSimulation();

  content.innerHTML = `
    <section class="view-grid">
      <div class="section-header">
        <div>
          <p class="section-kicker">Page 2</p>
          <h2>Baseline Heavy Check & Engineering Review</h2>
        </div>
      </div>

      <div class="maintenance-program-sticky">
        <span>Maintenance Program</span>
        ${renderMaintenanceProgramSelector()}
      </div>

      <article class="card">
        <div class="chart-toolbar">
          <div>
            <h3>Modeling Inspection Interval</h3>
            <p class="card-kicker">${selectedProgram.model} / ${selectedProgram.registration}</p>
          </div>
          <div class="inspection-total" aria-label="Basic inspection model totals">
            <span>${formatNumber(totalChildTasks)} Child Tasks</span>
            <strong>${formatDecimal(totalManHours, 1)} Man Hours</strong>
          </div>
        </div>
        <p class="inspection-method">${basicInspectionData.methodology}</p>
        <div class="scope-notice">Beta equalization scope: 5000-hour / 5-year heavy inspection only. Smaller inspection intervals are operational context and are not included in the task-distribution algorithm.</div>
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
          Simulation uses the current average utilization rate of
          ${formatDecimal(baselineSimulation.averageFlightHoursPerMonth, 1)} Flight Hours per month for
          ${selectedProgram.model} / ${selectedProgram.registration};
          the 25-hour block is already equalized evenly across the simulation, while 100-hour, 300-hour,
          600-hour, and 5000-hour blocks remain stacked when their intervals fall due.
          The 5000-hour package also uses its 5-year calendar limit so it appears at the end of this simulation.
        </p>
        <div class="chart-frame simulation-chart">
          <canvas id="baselineStackedChart" aria-label="Five-year stacked maintenance workload simulation" role="img"></canvas>
        </div>
      </article>

      <article class="card">
        <div class="section-header">
          <div>
            <p class="card-kicker">Source Table</p>
            <h3>Parent Task Workload Model</h3>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Inspection Interval</th>
                <th>Task Card</th>
                <th>Child Tasks</th>
                <th>Average Man Hours per Task</th>
                <th>Man Hours</th>
                <th>Applicability</th>
                <th>Current Note</th>
              </tr>
            </thead>
            <tbody>
              ${renderBasicInspectionRows()}
            </tbody>
          </table>
        </div>
      </article>

      ${renderHeavyCheckBaselineSection()}
      ${renderEngineeringReviewSection()}
    </section>
  `;

  bindMaintenanceProgramSelector();
  document.querySelectorAll("[data-simulation-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.simulationView = button.dataset.simulationView;
      render();
    });
  });

  renderIntervalChart();
  renderBaselineStackedChart(baselineSimulation);
  bindEngineeringReviewControls();
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
          <td>${formatDecimal(item.averageManHoursPerTask, 2)}</td>
          <td><strong>${formatDecimal(item.manHours, 1)}</strong></td>
          <td>${item.applicabilityLabel || getSelectedMaintenanceProgram().key}</td>
          <td>${item.currentNote}</td>
        </tr>
      `
    )
    .join("");
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
          <td>${formatNumber(item.tasks)}</td>
          <td>${formatDecimal(item.manHours, 1)}</td>
          <td>${item.byTrade.slice(0, 3).map((row) => `${escapeHtml(row.label)} (${formatDecimal(row.manHours, 1)} MH)`).join("<br>")}</td>
        </tr>
      `
    )
    .join("");
}

function renderMovementRegisterRows(scenario) {
  const grouped = new Map();
  scenario.movementRegister.forEach((row) => {
    const current = grouped.get(row.itemKey) || {
      itemKey: row.itemKey,
      taskCardNo: row.approvedGroupId || row.taskCardNo,
      description: row.approvedGroupId ? `Approved group ${row.approvedGroupId}` : row.description,
      plannedMh: 0,
      movability: row.movability,
      approvedGroupId: row.approvedGroupId,
      proposedPackage: row.proposedPackage,
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
          <td>${escapeHtml(row.description)}</td>
          <td>${formatDecimal(row.plannedMh, 1)}</td>
          <td>${escapeHtml(row.movability)}</td>
          <td>${escapeHtml(row.approvedGroupId || "-")}</td>
          <td>Core</td>
          <td>
            <select data-package-override="${escapeHtml(row.itemKey)}">
              ${heavyCheckPackages.map((pkg) => `<option value="${pkg}" ${row.proposedPackage === pkg ? "selected" : ""}>${pkg}</option>`).join("")}
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
  const values = scenario.packageSummaries.map((item) => item.manHours);
  const maxValue = Math.max(...values, 0);
  state.charts.taskEqualized = new Chart(context, {
    type: "bar",
    plugins: [barValueLabelPlugin],
    data: {
      labels,
      datasets: [
        {
          label: "Task-Level Man-Hours",
          data: values,
          backgroundColor: ["#1D4ED8", "#059669", "#D97706", "#DC2626", "#7C3AED", "#64748B"],
          borderColor: ["#1D4ED8", "#059669", "#D97706", "#DC2626", "#7C3AED", "#64748B"],
          borderWidth: 1,
          borderRadius: 5
        }
      ]
    },
    options: {
      ...defaults,
      layout: { padding: { top: 28 } },
      plugins: {
        ...defaults.plugins,
        legend: { display: false },
        barValueLabels: { enabled: true, decimals: 1 },
        tooltip: {
          ...defaults.plugins.tooltip,
          callbacks: {
            afterLabel: (context) => {
              const item = scenario.packageSummaries[context.dataIndex];
              return [`Tasks: ${formatNumber(item.tasks)}`, `Package: ${item.package}`];
            }
          }
        }
      },
      scales: {
        x: defaults.scales.x,
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

function renderEqualizedInspection() {
  const program = equalizedPrograms[state.equalized];
  const selectedProgram = getSelectedMaintenanceProgram();
  const reviewedTasks = getReviewedTasks();
  const hasTaskMaster = reviewedTasks.length > 0;
  const scenario = hasTaskMaster ? buildEqualizationScenarioFromTasks(state.equalized) : buildEqualizedInspectionScenario(program);
  if (hasTaskMaster) {
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

      <article class="card">
        <div class="chart-toolbar">
          <div>
            <p class="card-kicker">Workload Distribution Scenario</p>
            <h3>${program.title}</h3>
            <p class="card-kicker">${selectedProgram.model} / ${selectedProgram.registration}</p>
          </div>
          <div class="simulation-toolbar-actions">
            <div class="tabs compact-tabs" role="tablist" aria-label="Equalized workload options">
              ${Object.keys(equalizedPrograms)
                .map(
                  (key) => `
                    <button class="${key === state.equalized ? "active" : ""}" data-equalized="${key}" type="button">
                      Equalized ${key}%
                    </button>
                  `
                )
                .join("")}
            </div>
            <div class="tabs compact-tabs" role="tablist" aria-label="Equalized simulation detail level">
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
            ${
              hasTaskMaster
                ? ""
                : `<button class="comparison-toggle ${state.showEqualizedComparison ? "active" : ""}" data-equalized-comparison type="button" aria-pressed="${state.showEqualizedComparison}">
                    <span class="comparison-toggle-track" aria-hidden="true">
                      <span></span>
                    </span>
                    <span class="comparison-toggle-text">Base comparison ${state.showEqualizedComparison ? "On" : "Off"}</span>
                  </button>`
            }
            <div class="inspection-total" aria-label="Equalized simulation totals">
              <span>${hasTaskMaster ? "Task-Level Scenario" : `${simulationMonths}-Month Context`}</span>
              <strong>${formatDecimal(hasTaskMaster ? scenario.redistributedManHours : scenario.totalManHours, 1)} Man-Hours</strong>
            </div>
          </div>
        </div>
        ${
          hasTaskMaster
            ? `
              <p class="inspection-method" data-equalized-method>${program.description} This beta uses transparent greedy load balancing of approved movable items only; it is not an approved maintenance program.</p>
              ${renderMetricStrip([
                { label: "Approved Movable Workload", value: `${formatDecimal(scenario.eligibleManHours, 1)} MH` },
                { label: "Requested Equalization", value: `${scenario.requestedPercent}%` },
                { label: "Actual Achieved", value: `${formatDecimal(scenario.achievedPercent, 1)}%` },
                { label: "Moved Tasks", value: formatNumber(scenario.movedTasks) },
                { label: "Moved Groups", value: formatNumber(scenario.movedGroups) },
                { label: "Core Tasks", value: formatNumber(scenario.coreTasks) },
                { label: "Unreviewed Tasks", value: formatNumber(scenario.unreviewedTasks) },
                { label: "Peak Before / After", value: `${formatDecimal(scenario.peakBefore, 1)} / ${formatDecimal(scenario.peakAfter, 1)} MH` },
                { label: "Workload Std Dev", value: formatDecimal(scenario.workloadStdDev, 1) }
              ])}
              <div class="chart-frame simulation-chart equalized-chart-frame comparison-off">
                <canvas id="taskEqualizedChart" aria-label="Task-level equalized package workload chart" role="img"></canvas>
              </div>
            `
            : `
              <div class="warning-box">No approved 5000-hour task master is available. Showing the previous interval-level chart as fallback context only.</div>
              <p class="inspection-method" data-equalized-method>${getEqualizedComparisonText(program, selectedProgram)}</p>
              <div class="chart-frame simulation-chart equalized-chart-frame ${state.showEqualizedComparison ? "comparison-on" : "comparison-off"}">
                <canvas id="equalizedChart" aria-label="Equalized maintenance workload chart" role="img"></canvas>
              </div>
            `
        }
      </article>

      ${
        hasTaskMaster
          ? `
            <article class="card">
              <div class="section-header">
                <div>
                  <p class="card-kicker">Package Outputs</p>
                  <h3>P1-P5 and Core Summary</h3>
                </div>
                <button class="secondary-button" data-reset-equalization type="button">Reset to Algorithm</button>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Tasks</th>
                      <th>Man-Hours</th>
                      <th>Top Trades</th>
                    </tr>
                  </thead>
                  <tbody>${renderPackageSummaryRows(scenario)}</tbody>
                </table>
              </div>
            </article>

            <article class="card workflow-card">
              <div class="section-header">
                <div>
                  <p class="card-kicker">Task Movement Register</p>
                  <h3>Manual Package Correction</h3>
                </div>
                <button class="secondary-button" data-download-movement type="button">Download Movement CSV</button>
              </div>
              <div class="scope-notice">Approved groups are indivisible. Changing the package for a grouped item moves every task in that group together.</div>
              <div class="table-wrap tall-table">
                <table>
                  <thead>
                    <tr>
                      <th>Task / Group</th>
                      <th>Description</th>
                      <th>MH</th>
                      <th>Movability</th>
                      <th>Approved Group</th>
                      <th>Original</th>
                      <th>Proposed</th>
                      <th>Movement Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>${renderMovementRegisterRows(scenario)}</tbody>
                </table>
              </div>
            </article>
          `
          : ""
      }
    </section>
  `;

  bindMaintenanceProgramSelector();
  document.querySelectorAll("[data-equalized]").forEach((button) => {
    button.addEventListener("click", () => {
      state.equalized = button.dataset.equalized;
      render();
    });
  });

  document.querySelectorAll("[data-simulation-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.simulationView = button.dataset.simulationView;
      render();
    });
  });

  document.querySelector("[data-equalized-comparison]")?.addEventListener("click", (event) => {
    state.showEqualizedComparison = !state.showEqualizedComparison;
    const button = event.currentTarget;
    const frame = document.querySelector(".equalized-chart-frame");
    const method = document.querySelector("[data-equalized-method]");
    const label = button.querySelector(".comparison-toggle-text");

    button.classList.toggle("active", state.showEqualizedComparison);
    button.setAttribute("aria-pressed", String(state.showEqualizedComparison));

    if (label) {
      label.textContent = `Base comparison ${state.showEqualizedComparison ? "On" : "Off"}`;
    }

    if (method) {
      method.textContent = getEqualizedComparisonText(program, selectedProgram);
    }

    if (frame) {
      frame.classList.toggle("comparison-on", state.showEqualizedComparison);
      frame.classList.toggle("comparison-off", !state.showEqualizedComparison);
      frame.classList.remove("is-rescaling");
      void frame.offsetWidth;
      frame.classList.add("is-rescaling");
      window.setTimeout(() => frame.classList.remove("is-rescaling"), 680);
    }

    renderEqualizedChart(scenario, program);
  });

  document.querySelectorAll("[data-package-override]").forEach((select) => {
    select.addEventListener("change", () => {
      state.manualPackageAssignments[select.dataset.packageOverride] = select.value;
      render();
    });
  });

  document.querySelector("[data-reset-equalization]")?.addEventListener("click", () => {
    state.manualPackageAssignments = {};
    render();
  });

  document.querySelector("[data-download-movement]")?.addEventListener("click", () => {
    downloadTextFile("task-movement-register.csv", toCsv(state.latestEqualizationScenario?.movementRegister || []));
  });

  if (hasTaskMaster) {
    renderTaskEqualizationChart(scenario);
  } else {
    renderEqualizedChart(scenario, program);
  }
}

function getScenarioForGantt() {
  if (state.latestEqualizationScenario) {
    return state.latestEqualizationScenario;
  }

  if (getReviewedTasks().length) {
    state.latestEqualizationScenario = buildEqualizationScenarioFromTasks(state.equalized);
    return state.latestEqualizationScenario;
  }

  return null;
}

function getTradesForScenarioPackage(scenario, packageName) {
  const trades = uniqueValues(
    scenario.movementRegister.filter((row) => row.proposedPackage === packageName),
    "trade"
  );
  return trades.length ? trades : ["OTHER"];
}

function renderGanttInputs(scenario) {
  const trades = getTradesForScenarioPackage(scenario, state.selectedGanttPackage);
  return `
    <div class="form-grid gantt-input-grid">
      <label>
        <span>Inspection Start Date</span>
        <input data-gantt-input="startDate" type="date" value="${escapeHtml(state.ganttInputs.startDate)}" />
      </label>
      <label>
        <span>Working Days / Week</span>
        <input data-gantt-input="workingDaysPerWeek" type="number" min="1" max="7" step="1" value="${state.ganttInputs.workingDaysPerWeek}" />
      </label>
      <label>
        <span>Weekend Work</span>
        <select data-gantt-input="weekendWork">
          <option value="false" ${!state.ganttInputs.weekendWork ? "selected" : ""}>Off</option>
          <option value="true" ${state.ganttInputs.weekendWork ? "selected" : ""}>On</option>
        </select>
      </label>
      <label>
        <span>Number of Shifts</span>
        <input data-gantt-input="shifts" type="number" min="0" step="1" value="${state.ganttInputs.shifts}" />
      </label>
      <label>
        <span>Hours / Shift</span>
        <input data-gantt-input="hoursPerShift" type="number" min="0" step="0.5" value="${state.ganttInputs.hoursPerShift}" />
      </label>
      <label>
        <span>Productivity Factor</span>
        <input data-gantt-input="productivityFactor" type="number" min="0" max="1.5" step="0.01" value="${state.ganttInputs.productivityFactor}" />
      </label>
      ${trades
        .map(
          (trade) => `
            <label>
              <span>${escapeHtml(trade)} Personnel</span>
              <input data-gantt-trade="${escapeHtml(trade)}" type="number" min="0" step="1" value="${
                state.ganttInputs.tradeCapacity[trade] ?? state.ganttInputs.tradeCapacity.OTHER ?? 0
              }" />
            </label>
          `
        )
        .join("")}
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
          <td>${escapeHtml(row.trade)}</td>
          <td>${escapeHtml(row.startDate)}</td>
          <td>${escapeHtml(row.finishDate)}</td>
          <td>${formatDecimal(row.durationDays, 1)}</td>
          <td>${formatDecimal(row.plannedMh, 1)}</td>
          <td>${row.validationMessage ? statusBadge("warning", row.validationMessage) : formatNumber(row.assignedPersonnel)}</td>
        </tr>
      `
    )
    .join("");
}

function renderInspectionGantt() {
  const scenario = getScenarioForGantt();
  const schedule = scenario ? generateGanttSchedule(scenario, state.selectedGanttPackage) : [];
  const totalManHours = schedule.reduce((sum, row) => sum + row.plannedMh, 0);
  const totalTasks = schedule.reduce((sum, row) => sum + row.tasks, 0);
  const estimatedGroundTime = schedule.length
    ? Math.max(...schedule.map((row) => dateToUtc(row.finishDate))) - dateToUtc(state.ganttInputs.startDate)
    : 0;
  const estimatedDays = estimatedGroundTime ? Math.max(1, Math.ceil(estimatedGroundTime / (24 * 60 * 60 * 1000)) + 1) : 0;
  const peakPersonnel = schedule.reduce((peak, row) => Math.max(peak, Number(row.assignedPersonnel) || 0), 0);
  const byTrade = summarizeWorkload(
    schedule.map((row) => ({ trade: row.trade, plannedMh: row.plannedMh })),
    "trade"
  );

  content.innerHTML = `
    <section class="view-grid">
      <div class="section-header">
        <div>
          <p class="section-kicker">Page 4</p>
          <h2>Inspection Gantt & Ground Time</h2>
        </div>
      </div>

      ${
        scenario
          ? `
            <article class="card workflow-card">
              <div class="section-header">
                <div>
                  <p class="card-kicker">Preliminary Planning Estimate</p>
                  <h3>Package Ground-Time Model</h3>
                </div>
                <div class="tabs compact-tabs" role="tablist" aria-label="Gantt package selector">
                  ${heavyCheckPackages
                    .map(
                      (pkg) => `<button class="${state.selectedGanttPackage === pkg ? "active" : ""}" data-gantt-package="${pkg}" type="button">${pkg}</button>`
                    )
                    .join("")}
                </div>
              </div>
              <div class="scope-notice">Preliminary planning estimate based on entered manpower, shifts, productivity, and task-master data. This is not an approved production schedule.</div>
              ${renderGanttInputs(scenario)}
              ${renderMetricStrip([
                { label: "Selected Package", value: state.selectedGanttPackage },
                { label: "Package Tasks", value: formatNumber(totalTasks) },
                { label: "Package Man-Hours", value: `${formatDecimal(totalManHours, 1)} MH` },
                { label: "Estimated Ground Time", value: `${formatNumber(estimatedDays)} days` },
                { label: "Working Days / Week", value: formatNumber(state.ganttInputs.workingDaysPerWeek) },
                { label: "Peak Personnel Input", value: formatNumber(peakPersonnel) },
                { label: "Earliest Start", value: schedule[0]?.startDate || "-" },
                { label: "Estimated Finish", value: schedule[schedule.length - 1]?.finishDate || "-" }
              ])}
              <div class="plot-frame" id="ganttChart"></div>
            </article>

            <article class="card">
              <div class="section-header">
                <div>
                  <p class="card-kicker">Schedule Data</p>
                  <h3>Phase / Approved-Group Schedule</h3>
                </div>
                <div class="toolbar-row compact-toolbar">
                  <button class="secondary-button" data-export="task-master" type="button">Task Master CSV</button>
                  <button class="secondary-button" data-export="review" type="button">Review CSV</button>
                  <button class="secondary-button" data-export="assignments" type="button">Assignments CSV</button>
                  <button class="secondary-button" data-export="gantt" type="button">Gantt CSV</button>
                  <button class="secondary-button" data-export="summary" type="button">Scenario Summary CSV</button>
                </div>
              </div>
              <div class="breakdown-grid">
                ${renderWorkloadBreakdownTable("Workload by Trade", byTrade)}
              </div>
              <div class="table-wrap tall-table">
                <table>
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Task Group / Phase Item</th>
                      <th>Phase</th>
                      <th>Trade</th>
                      <th>Start</th>
                      <th>Finish</th>
                      <th>Duration</th>
                      <th>MH</th>
                      <th>Personnel / Warning</th>
                    </tr>
                  </thead>
                  <tbody>${renderGanttRows(schedule)}</tbody>
                </table>
              </div>
            </article>
          `
          : `<article class="card"><div class="warning-box">No equalization result exists yet. Complete Page 1 task-master approval, Page 2 engineering review, and Page 3 equalization planning before generating a Gantt schedule.</div></article>`
      }
    </section>
  `;

  bindGanttControls(schedule, scenario);
  if (scenario) {
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

  document.querySelectorAll("[data-gantt-input]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.dataset.ganttInput;
      state.ganttInputs[key] = key === "weekendWork" ? input.value === "true" : input.type === "number" ? Number(input.value) : input.value;
      render();
    });
  });

  document.querySelectorAll("[data-gantt-trade]").forEach((input) => {
    input.addEventListener("change", () => {
      state.ganttInputs.tradeCapacity[input.dataset.ganttTrade] = Number(input.value);
      render();
    });
  });

  document.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.export;
      if (kind === "task-master") downloadTextFile("validated-5000h-task-master.csv", toCsv(state.approvedTaskMaster));
      if (kind === "review") downloadTextFile("engineering-review-register.csv", toCsv(getReviewedTasks()));
      if (kind === "assignments") downloadTextFile("equalized-package-assignments.csv", toCsv(scenario?.movementRegister || []));
      if (kind === "gantt") downloadTextFile("inspection-gantt-schedule.csv", toCsv(schedule));
      if (kind === "summary")
        downloadTextFile(
          "scenario-summary.csv",
          toCsv([
            {
              requestedPercent: scenario?.requestedPercent,
              achievedPercent: scenario?.achievedPercent,
              eligibleManHours: scenario?.eligibleManHours,
              redistributedManHours: scenario?.redistributedManHours,
              limitations:
                "Preliminary beta decision-support output only. Not an approved maintenance program or production schedule."
            }
          ])
        );
    });
  });
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
    x: [row.startDate, row.finishDate],
    y: [`${row.id}. ${row.label}`, `${row.id}. ${row.label}`],
    name: row.trade,
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
      `Trade: ${escapeHtml(row.trade)}<br>` +
      `Phase: ${escapeHtml(row.phase)}<br>` +
      `Start: ${escapeHtml(row.startDate)}<br>` +
      `Finish: ${escapeHtml(row.finishDate)}<br>` +
      `Duration: ${formatDecimal(row.durationDays, 1)} days<br>` +
      `MH: ${formatDecimal(row.plannedMh, 1)}<extra></extra>`,
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
      xaxis: { title: "Calendar Date", type: "date", gridcolor: chartColors.grid },
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
                `Child Tasks: ${formatNumber(item.childTasks)}`,
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
