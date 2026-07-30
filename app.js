const utilizationData = window.UTILIZATION_DATA || {
  aircraft: [],
  dailyByAircraft: [],
  validDates: [],
  window: { start: "", end: "", calendarDays: 0 }
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
    equalizedBlockKeys: ["300-hour", "600-hour", "5000-hour"],
    description:
      "Cuts 50% of each 300-hour, 600-hour, and 5000-hour due-period workload and moves that portion into the midpoint quarter between the previous due point and the next due point."
  },
  "75": {
    title: "Equalized 75%",
    spreadRatio: 0.75,
    redistributionMode: "staged",
    equalizedBlockKeys: ["300-hour", "600-hour", "5000-hour"],
    description:
      "Cuts 75% of each 300-hour, 600-hour, and 5000-hour due-period workload and stages it into three equally spaced quarters before the original due quarter."
  },
  "100": {
    title: "Equalized 100%",
    spreadRatio: 1,
    equalizedBlockKeys: "all",
    description:
      "Spreads every interval block evenly across the full 5-year simulation, creating a fully level task and Man Hours profile."
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
  charts: {}
};

const utilizationFilter = {
  startDate: utilizationData.validDates[0] || utilizationData.window.start,
  endDate: utilizationData.validDates[utilizationData.validDates.length - 1] || utilizationData.window.end
};

const sectionTitles = {
  "data-source": "Aircraft Utilization",
  "basic-inspection": "Basic Inspection",
  "equalized-inspection": "Equalized Inspection"
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
    render();
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
          <p class="section-kicker">Section 2</p>
          <h2>Basic Inspection</h2>
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

function renderEqualizedInspection() {
  const program = equalizedPrograms[state.equalized];
  const selectedProgram = getSelectedMaintenanceProgram();
  const scenario = buildEqualizedInspectionScenario(program);

  content.innerHTML = `
    <section class="view-grid">
      <div class="section-header">
        <div>
          <p class="section-kicker">Section 3</p>
          <h2>Equalized Inspection</h2>
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
            <button class="comparison-toggle ${state.showEqualizedComparison ? "active" : ""}" data-equalized-comparison type="button" aria-pressed="${state.showEqualizedComparison}">
              <span class="comparison-toggle-track" aria-hidden="true">
                <span></span>
              </span>
              <span class="comparison-toggle-text">Base comparison ${state.showEqualizedComparison ? "On" : "Off"}</span>
            </button>
            <div class="inspection-total" aria-label="Equalized simulation totals">
              <span>${simulationMonths}-Month Scenario</span>
              <strong>${formatDecimal(scenario.totalManHours, 1)} Man Hours</strong>
            </div>
          </div>
        </div>
        <p class="inspection-method" data-equalized-method>${getEqualizedComparisonText(program, selectedProgram)}</p>
        <div class="chart-frame simulation-chart equalized-chart-frame ${
          state.showEqualizedComparison ? "comparison-on" : "comparison-off"
        }">
          <canvas id="equalizedChart" aria-label="Equalized maintenance workload chart" role="img"></canvas>
        </div>
      </article>
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

  renderEqualizedChart(scenario, program);
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
