import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

type Page = "dashboard" | "schedule" | "consumption" | "history" | "alerts";
type ScheduleType = "Food" | "Water" | "Food & water";
type Recurrence = "Once" | "Every Day" | "Weekdays" | "Weekends" | "Custom Days";
type DayName = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
type Schedule = {
  id: number;
  name: string;
  time: string;
  type: ScheduleType;
  amount: number;
  enabled: boolean;
  recurrence: Recurrence;
  days: DayName[];
  startDate: string;
  endDate: string;
};
type AlertItem = {
  id: number;
  title: string;
  detail: string;
  time: string;
  category: "Supply" | "Schedule" | "Device";
  level: "Attention" | "Notice";
  unread: boolean;
};
type HistoryRecord = {
  id: number;
  date: string;
  time: string;
  type: "Food" | "Water";
  amount: number;
  unit: "g" | "ml";
  status: "Successful" | "Failed";
  schedule: string;
  method?: "Automatic" | "Manual";
};

const navItems: { id: Page; label: string; icon: IconName }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "schedule", label: "Feeding schedule", icon: "calendar" },
  { id: "consumption", label: "Consumption", icon: "chart" },
  { id: "history", label: "History", icon: "history" },
  { id: "alerts", label: "Alerts", icon: "bell" },
];

const initialSchedules: Schedule[] = [
  {
    id: 1,
    name: "Breakfast",
    time: "07:30",
    type: "Food & water",
    amount: 85,
    enabled: true,
    recurrence: "Every Day",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    startDate: dateInputValue(12),
    endDate: "",
  },
  {
    id: 2,
    name: "Midday portion",
    time: "13:00",
    type: "Food",
    amount: 55,
    enabled: true,
    recurrence: "Weekdays",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    startDate: dateInputValue(8),
    endDate: "",
  },
  {
    id: 3,
    name: "Dinner",
    time: "18:30",
    type: "Food & water",
    amount: 85,
    enabled: true,
    recurrence: "Every Day",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    startDate: dateInputValue(12),
    endDate: "",
  },
  {
    id: 4,
    name: "Evening water",
    time: "22:00",
    type: "Water",
    amount: 0,
    enabled: false,
    recurrence: "Weekends",
    days: ["Sat", "Sun"],
    startDate: dateInputValue(5),
    endDate: dateInputValue(-40),
  },
];

const historyRecords: HistoryRecord[] = [
  {
    id: 1,
    date: dateInputValue(0),
    time: "07:31",
    type: "Food",
    amount: 85,
    unit: "g",
    status: "Successful",
    schedule: "Breakfast",
  },
  {
    id: 2,
    date: dateInputValue(0),
    time: "07:30",
    type: "Water",
    amount: 240,
    unit: "ml",
    status: "Successful",
    schedule: "Breakfast",
  },
  {
    id: 3,
    date: dateInputValue(1),
    time: "18:31",
    type: "Food",
    amount: 85,
    unit: "g",
    status: "Successful",
    schedule: "Dinner",
  },
  {
    id: 4,
    date: dateInputValue(1),
    time: "18:30",
    type: "Water",
    amount: 220,
    unit: "ml",
    status: "Successful",
    schedule: "Dinner",
  },
  {
    id: 5,
    date: dateInputValue(1),
    time: "13:02",
    type: "Food",
    amount: 0,
    unit: "g",
    status: "Failed",
    schedule: "Midday portion",
  },
  {
    id: 6,
    date: dateInputValue(2),
    time: "07:30",
    type: "Food",
    amount: 85,
    unit: "g",
    status: "Successful",
    schedule: "Breakfast",
  },
  {
    id: 7,
    date: dateInputValue(3),
    time: "18:30",
    type: "Food",
    amount: 85,
    unit: "g",
    status: "Successful",
    schedule: "Dinner",
  },
  {
    id: 8,
    date: dateInputValue(4),
    time: "13:00",
    type: "Food",
    amount: 55,
    unit: "g",
    status: "Successful",
    schedule: "Midday portion",
  },
  {
    id: 9,
    date: dateInputValue(6),
    time: "22:01",
    type: "Water",
    amount: 260,
    unit: "ml",
    status: "Successful",
    schedule: "Evening water",
  },
  {
    id: 10,
    date: dateInputValue(9),
    time: "07:34",
    type: "Water",
    amount: 0,
    unit: "ml",
    status: "Failed",
    schedule: "Breakfast",
  },
  {
    id: 11,
    date: dateInputValue(14),
    time: "18:30",
    type: "Food",
    amount: 85,
    unit: "g",
    status: "Successful",
    schedule: "Dinner",
  },
  {
    id: 12,
    date: dateInputValue(25),
    time: "13:00",
    type: "Food",
    amount: 55,
    unit: "g",
    status: "Successful",
    schedule: "Midday portion",
  },
];

const initialAlerts: AlertItem[] = [
  {
    id: 1,
    title: "Food supply is running low",
    detail: "The hopper is estimated at 18%. Refill it before the next scheduled feeding.",
    time: "Today, 9:42 AM",
    category: "Supply",
    level: "Attention",
    unread: true,
  },
  {
    id: 2,
    title: "Scheduled feeding completed",
    detail: "The 7:30 AM feeding completed with the configured 85 g portion.",
    time: "Today, 7:31 AM",
    category: "Schedule",
    level: "Notice",
    unread: true,
  },
  {
    id: 3,
    title: "Water level is below 30%",
    detail: "The reservoir may need a refill later today.",
    time: "Yesterday, 6:18 PM",
    category: "Supply",
    level: "Attention",
    unread: false,
  },
  {
    id: 4,
    title: "Device reconnected",
    detail: "Petwatch restored its connection after being offline for 4 minutes.",
    time: "Yesterday, 2:04 PM",
    category: "Device",
    level: "Notice",
    unread: false,
  },
  {
    id: 5,
    title: "Dispensing issue resolved",
    detail: "The dispenser completed its retry successfully. No action is needed.",
    time: "Jun 16, 1:02 PM",
    category: "Device",
    level: "Notice",
    unread: false,
  },
];

type IconName =
  | "grid"
  | "calendar"
  | "chart"
  | "bell"
  | "chevron"
  | "plus"
  | "clock"
  | "bowl"
  | "drop"
  | "more"
  | "edit"
  | "trash"
  | "check"
  | "arrow"
  | "menu"
  | "x"
  | "info"
  | "history"
  | "search"
  | "thermometer";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        <path d="m3 8 6-5 6 7 6-5" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    thermometer: (
      <>
        <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" />
        <path d="M12 11v6" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    bowl: (
      <>
        <path d="M3 11h18a9 9 0 0 1-18 0Z" />
        <path d="M8 7c0-1 1-2 2-2M14 7c0-1 1-2 2-2" />
      </>
    ),
    drop: <path d="M12 3S5.5 10.5 5.5 15a6.5 6.5 0 0 0 13 0C18.5 10.5 12 3 12 3Z" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    edit: (
      <>
        <path d="m14 4 6 6L8 22H2v-6Z" />
        <path d="m12 6 6 6" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <path d="m5 12 5 5L20 7" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    x: <path d="M6 6l12 12M18 6 6 18" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span className="paw-dot paw-dot-1" />
      <span className="paw-dot paw-dot-2" />
      <span className="paw-dot paw-dot-3" />
      <span className="paw-pad" />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      className={`toggle ${checked ? "on" : ""}`}
      onClick={onChange}
      aria-pressed={checked}
      aria-label={label}
    >
      <span />
    </button>
  );
}

function MiniChart() {
  return (
    <div className="mini-chart" aria-label="Seven day sample consumption trend">
      {[42, 58, 48, 72, 64, 84, 69].map((height, index) => (
        <span key={index} style={{ height: `${height}%` }} className={index === 6 ? "today" : ""} />
      ))}
    </div>
  );
}

function ConsumptionChart({
  mode,
  range,
}: {
  mode: "Line" | "Bar";
  range: "Today" | "7 Days" | "30 Days";
}) {
  const food = range === "Today" ? [18, 0, 24, 0, 18, 0, 25] : [68, 82, 72, 94, 78, 88, 80];
  const water = range === "Today" ? [36, 22, 45, 28, 50, 34, 52] : [58, 64, 52, 73, 62, 78, 69];
  const labels =
    range === "Today"
      ? ["6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM", "12 AM"]
      : range === "7 Days"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        : ["May 20", "May 25", "May 30", "Jun 4", "Jun 9", "Jun 14", "Jun 18"];
  const toPoints = (values: number[]) =>
    values.map((v, i) => `${60 + i * 92},${230 - v * 1.75}`).join(" ");

  return (
    <div className="chart-wrap">
      <div className="y-label">Consumption (g / ml)</div>
      <svg
        className="large-chart"
        viewBox="0 0 660 270"
        role="img"
        aria-label={`${mode} chart of sample food and water consumption`}
      >
        {[55, 100, 145, 190, 235].map((y, i) => (
          <g key={y}>
            <line x1="52" y1={y} x2="635" y2={y} className="grid-line" />
            <text x="41" y={y + 4} textAnchor="end">
              {100 - i * 25}
            </text>
          </g>
        ))}
        {mode === "Line" ? (
          <>
            <polyline points={toPoints(food)} className="line food-line" />
            <polyline points={toPoints(water)} className="line water-line" />
            {food.map((v, i) => (
              <circle
                key={`f${i}`}
                cx={60 + i * 92}
                cy={230 - v * 1.75}
                r="4"
                className="food-dot"
              />
            ))}
            {water.map((v, i) => (
              <circle
                key={`w${i}`}
                cx={60 + i * 92}
                cy={230 - v * 1.75}
                r="4"
                className="water-dot"
              />
            ))}
          </>
        ) : (
          <>
            {food.map((v, i) => (
              <rect
                key={`f${i}`}
                x={48 + i * 92}
                y={230 - v * 1.75}
                width="22"
                height={v * 1.75}
                rx="4"
                className="food-bar"
              />
            ))}
            {water.map((v, i) => (
              <rect
                key={`w${i}`}
                x={72 + i * 92}
                y={230 - v * 1.75}
                width="22"
                height={v * 1.75}
                rx="4"
                className="water-bar"
              />
            ))}
          </>
        )}
        {labels.map((label, i) => (
          <text key={label} x={60 + i * 92} y="258" textAnchor="middle" className="axis-label">
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [now, setNow] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [amount, setAmount] = useState("85");
  const [savedAmount, setSavedAmount] = useState(85);
  const [historyEntries, setHistoryEntries] = useState(historyRecords);
  const [toast, setToast] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formTime, setFormTime] = useState("08:00");
  const [formType, setFormType] = useState<ScheduleType>("Food & water");
  const [formAmount, setFormAmount] = useState("85");
  const [formRecurrence, setFormRecurrence] = useState<Recurrence>("Every Day");
  const [formDays, setFormDays] = useState<DayName[]>([
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ]);
  const [formStartDate, setFormStartDate] = useState(dateInputValue(0));
  const [formEndDate, setFormEndDate] = useState("");
  const [formError, setFormError] = useState("");
  const [chartMode, setChartMode] = useState<"Line" | "Bar">("Line");
  const [dateRange, setDateRange] = useState<"Today" | "7 Days" | "30 Days">("7 Days");
  const [alertFilter, setAlertFilter] = useState<"All" | "Unread" | "Supply" | "Device">("All");
  const [historyRange, setHistoryRange] = useState<
    "Today" | "Last 7 Days" | "Last 30 Days" | "Custom"
  >("Last 30 Days");
  const [historyType, setHistoryType] = useState<"All" | "Food" | "Water">("All");
  const [historyStatus, setHistoryStatus] = useState<"All" | "Successful" | "Failed">("All");
  const [historySearch, setHistorySearch] = useState("");
  const [customFrom, setCustomFrom] = useState(dateInputValue(7));
  const [customTo, setCustomTo] = useState(dateInputValue(0));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const loadSchedules = async () => {
      setSchedulesLoading(true);

      const { data, error } = await supabase
        .from("pet_schedules")
        .select("*")
        .order("time", { ascending: true });

      if (error) {
        console.error("Error loading schedules:", error.message);
        setToast("Unable to load schedules");
        setSchedulesLoading(false);
        return;
      }

      const formattedSchedules: Schedule[] = (data ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        time: item.time.slice(0, 5),
        type: item.type as ScheduleType,
        amount: Number(item.amount),
        enabled: item.enabled,
        recurrence: item.recurrence as Recurrence,
        days: item.days as DayName[],
        startDate: item.start_date,
        endDate: item.end_date ?? "",
      }));

      setSchedules(formattedSchedules);
      setSchedulesLoading(false);
    };

    loadSchedules();
  }, []);
  const navigate = (next: Page) => {
    setPage(next);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openNewSchedule = () => {
    setEditingId(null);
    setFormName("");
    setFormTime("08:00");
    setFormType("Food & water");
    setFormAmount(String(savedAmount));
    setFormRecurrence("Every Day");
    setFormDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    setFormStartDate(dateInputValue(0));
    setFormEndDate("");
    setFormError("");
    setEditorOpen(true);
  };

  const openEditSchedule = (schedule: Schedule) => {
    setEditingId(schedule.id);
    setFormName(schedule.name);
    setFormTime(schedule.time);
    setFormType(schedule.type);
    setFormAmount(String(schedule.amount || savedAmount));
    setFormRecurrence(schedule.recurrence);
    setFormDays(schedule.days);
    setFormStartDate(schedule.startDate);
    setFormEndDate(schedule.endDate);
    setFormError("");
    setEditorOpen(true);
  };

  const selectRecurrence = (recurrence: Recurrence) => {
    setFormRecurrence(recurrence);
    if (recurrence === "Every Day") {
      setFormDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    } else if (recurrence === "Weekdays") {
      setFormDays(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    } else if (recurrence === "Weekends") {
      setFormDays(["Sat", "Sun"]);
    } else {
      setFormDays([]);
    }
    setFormError("");
  };

  const saveSchedule = async () => {
    const parsedFoodAmount = Number(formAmount);

    if (!formTime) {
      setFormError("Choose a feeding time.");
      return;
    }

    if (!formStartDate) {
      setFormError("Choose a start date.");
      return;
    }

    if (formEndDate && formEndDate < formStartDate) {
      setFormError("End date must be on or after the start date.");
      return;
    }

    if (formRecurrence !== "Once" && formDays.length === 0) {
      setFormError("Select at least one day for this recurring schedule.");
      return;
    }

    if (
      formType !== "Water" &&
      (!formAmount ||
        !Number.isFinite(parsedFoodAmount) ||
        parsedFoodAmount < 20 ||
        parsedFoodAmount > 150)
    ) {
      setFormError("Food amount must be between 20 g and 150 g.");
      return;
    }

    const scheduleData = {
      name: formName.trim() || `${formType} routine`,
      time: formTime,
      type: formType,
      amount: formType === "Water" ? 0 : parsedFoodAmount,
      enabled: true,
      recurrence: formRecurrence,
      days: formRecurrence === "Once" ? [] : formDays,
      start_date: formStartDate,
      end_date: formEndDate || null,
    };

    let error;

    if (editingId !== null) {
      const result = await supabase
        .from("pet_schedules")
        .update(scheduleData)
        .eq("id", editingId);

      error = result.error;
    } else {
      const result = await supabase
        .from("pet_schedules")
        .insert(scheduleData);

      error = result.error;
    }

    if (error) {
      console.error("Error saving schedule:", error.message);
      setFormError("Could not save schedule. Please try again.");
      return;
    }

    // Reload schedules from Supabase after saving.
    const { data, error: loadError } = await supabase
      .from("pet_schedules")
      .select("*")
      .order("time", { ascending: true });

    if (loadError) {
      console.error("Error refreshing schedules:", loadError.message);
      setToast("Saved, but could not refresh the schedule list");
      setEditorOpen(false);
      return;
    }

    setSchedules(
      (data ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        time: item.time.slice(0, 5),
        type: item.type as ScheduleType,
        amount: Number(item.amount),
        enabled: item.enabled,
        recurrence: item.recurrence as Recurrence,
        days: item.days as DayName[],
        startDate: item.start_date,
        endDate: item.end_date ?? "",
      })),
    );

    setEditorOpen(false);
    setToast(editingId !== null ? "Schedule updated successfully" : "Schedule saved successfully");
  };

  const applyAmount = () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 20 || parsedAmount > 150) {
      const boundedAmount = Number.isFinite(parsedAmount) ? parsedAmount : 20;
      setAmount(String(Math.min(150, Math.max(20, boundedAmount))));
      setToast("Food amount must be between 20 g and 150 g");
      return;
    }
    setSavedAmount(parsedAmount);
    setToast(`Food amount set to ${parsedAmount} g`);
  };

  const dispenseManually = () => {
    const timestamp = new Date();
    setHistoryEntries((entries) => [
      {
        id: Date.now(),
        date: dateInputValue(0),
        time: `${String(timestamp.getHours()).padStart(2, "0")}:${String(
          timestamp.getMinutes(),
        ).padStart(2, "0")}`,
        type: "Food",
        amount: savedAmount,
        unit: "g",
        status: "Successful",
        schedule: "Manual dispense",
        method: "Manual",
      },
      ...entries,
    ]);
    setToast(`${savedAmount} g dispensed manually`);
  };

  const unreadCount = alerts.filter((alert) => alert.unread).length;
  const filteredAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        if (alertFilter === "Unread") return alert.unread;
        if (alertFilter === "Supply") return alert.category === "Supply";
        if (alertFilter === "Device") return alert.category === "Device";
        return true;
      }),
    [alerts, alertFilter],
  );
  const filteredHistory = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return historyEntries.filter((record) => {
      const recordDate = parseLocalDate(record.date);
      const age = Math.floor((today.getTime() - recordDate.getTime()) / 86400000);
      const inRange =
        historyRange === "Today"
          ? age === 0
          : historyRange === "Last 7 Days"
            ? age >= 0 && age < 7
            : historyRange === "Last 30 Days"
              ? age >= 0 && age < 30
              : record.date >= customFrom && record.date <= customTo;
      const matchesType = historyType === "All" || record.type === historyType;
      const matchesStatus = historyStatus === "All" || record.status === historyStatus;
      const query = historySearch.trim().toLowerCase();
      const matchesSearch =
        !query ||
        [
          record.date,
          formatHistoryDate(record.date),
          record.time,
          record.type,
          `${record.amount} ${record.unit}`,
          record.status === "Failed" ? "Not dispensed" : "",
          record.schedule,
          record.status,
          record.method ?? "Automatic",
        ].some((field) => field.toLowerCase().includes(query));
      return inRange && matchesType && matchesStatus && matchesSearch;
    });
  }, [historyEntries, historyRange, historyType, historyStatus, historySearch, customFrom, customTo]);

  const historySummary = useMemo(
    () => ({
      food: filteredHistory
        .filter((record) => record.type === "Food" && record.status === "Successful")
        .reduce((total, record) => total + record.amount, 0),
      water: filteredHistory
        .filter((record) => record.type === "Water" && record.status === "Successful")
        .reduce((total, record) => total + record.amount, 0),
      successful: filteredHistory.filter((record) => record.status === "Successful").length,
      failed: filteredHistory.filter((record) => record.status === "Failed").length,
    }),
    [filteredHistory],
  );

  const headerTitle =
    page === "dashboard"
      ? "Good morning, Jamie"
      : page === "schedule"
        ? "Feeding schedule"
        : page === "consumption"
          ? "Consumption"
          : page === "history"
            ? "Dispensing history"
            : "Alerts";
  const headerSubtitle =
    page === "dashboard"
      ? "Here’s what’s happening with Milo today."
      : page === "schedule"
        ? "Create and manage automatic feeding routines."
        : page === "consumption"
          ? "Review food and water usage over time."
          : page === "history"
            ? "Review previous food and water dispensing activity."
            : "Review updates from your Petwatch device.";

  return (
    <div className="app-shell">

      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <div className="brand">
          <BrandMark />
          <span>petwatch</span>
        </div>
        <button
          className="mobile-close"
          onClick={() => setMobileNav(false)}
          aria-label="Close menu"
        >
          <Icon name="x" />
        </button>
        <nav aria-label="Main navigation">
          <p className="nav-label">Menu</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "alerts" && unreadCount > 0 && (
                <span className="nav-badge">{unreadCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="device-card">
            <div className="device-row">
              <span className="device-icon">
                <BrandMark />
              </span>
              <div>
                <strong>Kitchen feeder</strong>
                <span>
                  <i /> Online · Sample
                </span>
              </div>
            </div>
            <button onClick={() => setToast("Device details are sample data")}>
              Device details <Icon name="chevron" size={15} />
            </button>
          </div>
          <div className="profile">
            <span className="avatar">JM</span>
            <div>
              <strong>Jamie Morris</strong>
              <span>Milo’s human</span>
            </div>
            <Icon name="more" />
          </div>
        </div>
      </aside>
      {mobileNav && (
        <button className="nav-scrim" aria-label="Close menu" onClick={() => setMobileNav(false)} />
      )}

      <main className="main-content">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <div>
            <h1>{headerTitle}</h1>
            <p>{headerSubtitle}</p>
          </div>
          <div className="topbar-actions">
            <span className="sample-pill">
              <Icon name="info" size={15} /> Illustrative sample data
            </span>
            <button
              className="notification-button"
              onClick={() => navigate("alerts")}
              aria-label={`${unreadCount} unread alerts`}
            >
              <Icon name="bell" />
              {unreadCount > 0 && <span>{unreadCount}</span>}
            </button>
            <span className="top-avatar">JM</span>
          </div>
        </header>

        {page === "dashboard" && (
          <div className="page dashboard-page">
            <section className="dashboard-hero">
              <div>
                <span className="eyebrow">Next feeding</span>
                <div className="next-time">
                  <span>1:00</span> PM
                </div>
                <p>
                  <Icon name="bowl" size={18} /> Food · 55 g
                </p>
                <button className="text-button" onClick={() => navigate("schedule")}>
                  View schedule <Icon name="chevron" size={16} />
                </button>
              </div>
              <div className="hero-divider" />
              <div className="live-time">
                <span className="eyebrow">Local time</span>
                <strong>
                  {now.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </strong>
                <p>
                  {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
              <div className="pet-orbit" aria-hidden="true">
                <div className="pet-avatar">M</div>
                <span className="orbit-one" />
                <span className="orbit-two" />
              </div>
            </section>

            <div className="dashboard-grid">
              <section className="card status-card">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Device status</span>
                    <h2>Supply levels</h2>
                  </div>
                  <span className="updated">Updated 2 min ago</span>
                </div>
                <div className="level-list">
                  <div className="level-item">
                    <span className="metric-icon food">
                      <Icon name="bowl" />
                    </span>
                    <div className="level-copy">
                      <div>
                        <strong>Food</strong>
                        <span>18%</span>
                      </div>
                      <div className="progress">
                        <span style={{ width: "18%" }} />
                      </div>
                      <small>Low · about 2 servings left</small>
                    </div>
                  </div>
                  <div className="level-item">
                    <span className="metric-icon water">
                      <Icon name="drop" />
                    </span>
                    <div className="level-copy">
                      <div>
                        <strong>Water</strong>
                        <span>64%</span>
                      </div>
                      <div className="progress water-progress">
                        <span style={{ width: "64%" }} />
                      </div>
                      <small>Good · approximately 820 ml</small>
                    </div>
                  </div>
                </div>
              </section>

              <section className="card temperature-card">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Food storage</span>
                    <h2>Temperature monitor</h2>
                  </div>
                  <span className="temperature-status">In range</span>
                </div>
                <div className="temperature-reading">
                  <span className="metric-icon neutral">
                    <Icon name="thermometer" />
                  </span>
                  <strong>
                    32<small>°C</small>
                  </strong>
                </div>
                <div className="temperature-track" aria-hidden="true">
                  <span />
                </div>
                <p>Ideal food storage range: 26–38 °C</p>
              </section>

              <section className="card manual-dispense-card">
                <span className="metric-icon food">
                  <Icon name="bowl" />
                </span>
                <span className="eyebrow">Manual control</span>
                <h2>Dispense food now</h2>
                <p>
                  Serve the current portion size of {savedAmount} g. This action will be saved in
                  history.
                </p>
                <button className="primary-button full" onClick={dispenseManually}>
                  <Icon name="plus" size={17} /> Dispense {savedAmount} g
                </button>
              </section>

              <section className="card daily-card">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Today</span>
                    <h2>Daily consumption</h2>
                  </div>
                  <button className="icon-more" aria-label="More options">
                    <Icon name="more" />
                  </button>
                </div>
                <div className="daily-content">
                  <div className="daily-stats">
                    <div>
                      <span>Food</span>
                      <strong>
                        140 <small>g</small>
                      </strong>
                      <em>of 225 g planned</em>
                    </div>
                    <div>
                      <span>Water</span>
                      <strong>
                        480 <small>ml</small>
                      </strong>
                      <em>Daily total</em>
                    </div>
                  </div>
                  <MiniChart />
                </div>
                <button className="text-button" onClick={() => navigate("consumption")}>
                  View consumption <Icon name="chevron" size={16} />
                </button>
              </section>

              <section className="card upcoming-card">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Routine</span>
                    <h2>Today’s schedule</h2>
                  </div>
                  <button className="small-add" onClick={openNewSchedule}>
                    <Icon name="plus" size={16} /> Add
                  </button>
                </div>
                <div className="compact-schedules">
                  {schedules
                    .filter((schedule) => schedule.enabled)
                    .slice(0, 3)
                    .map((schedule, index) => (
                      <div key={schedule.id} className={`compact-row ${index === 1 ? "next" : ""}`}>
                        <span className="schedule-time">{formatTime(schedule.time)}</span>
                        <span
                          className={`schedule-dot ${schedule.type === "Water" ? "water" : ""}`}
                        />
                        <div>
                          <strong>{schedule.type}</strong>
                          <span>
                            {schedule.type === "Water"
                              ? "Reservoir refresh"
                              : `${schedule.amount} g portion`}
                          </span>
                        </div>
                        {index === 1 && <span className="next-badge">Next</span>}
                      </div>
                    ))}
                </div>
                <button className="text-button" onClick={() => navigate("schedule")}>
                  Manage schedule <Icon name="chevron" size={16} />
                </button>
              </section>

              <section className="card recent-alerts">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Updates</span>
                    <h2>Recent alerts</h2>
                  </div>
                  <button className="view-all" onClick={() => navigate("alerts")}>
                    View all
                  </button>
                </div>
                <div className="alert-preview-list">
                  {alerts.slice(0, 3).map((alert) => (
                    <button
                      key={alert.id}
                      className="alert-preview"
                      onClick={() => {
                        setAlerts((items) =>
                          items.map((item) =>
                            item.id === alert.id ? { ...item, unread: false } : item,
                          ),
                        );
                        navigate("alerts");
                      }}
                    >
                      <span
                        className={`alert-symbol ${alert.level === "Attention" ? "attention" : ""}`}
                      >
                        <Icon
                          name={
                            alert.category === "Supply"
                              ? "info"
                              : alert.category === "Schedule"
                                ? "check"
                                : "bell"
                          }
                          size={18}
                        />
                      </span>
                      <div>
                        <strong>{alert.title}</strong>
                        <span>{alert.time}</span>
                      </div>
                      {alert.unread && <i className="unread-dot" />}
                      <Icon name="chevron" size={17} />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {page === "schedule" && (
          <div className="page">
            <div className="page-actions">
              <div className="sample-note">
                <Icon name="info" size={17} />
                <span>
                  Schedules below are sample configurations and do not control connected hardware.
                </span>
              </div>
              <button className="primary-button" onClick={openNewSchedule}>
                <Icon name="plus" size={18} /> Add schedule
              </button>
            </div>
            <div className="schedule-layout">
              <section className="card schedule-list-card">
                <div className="section-heading list-header">
                  <div>
                    <span className="eyebrow">Automatic routine</span>
                    <h2>Recurring schedules</h2>
                  </div>
                  <span className="schedule-count">
                    {schedules.filter((item) => item.enabled).length} active
                  </span>
                </div>
                <div className="schedule-list">
                  {schedulesLoading ? (
                    <p>Loading schedules...</p>
                  ) : schedules.length === 0 ? (
                    <p>No schedules saved yet. Click "Add schedule" to create one.</p>
                  ) : (
                    schedules.map((schedule) => (
                      <div
                        className={`schedule-row ${!schedule.enabled ? "disabled" : ""}`}
                        key={schedule.id}
                      >
                        <div className="schedule-clock">
                          <Icon name="clock" />
                          <strong>{formatTime(schedule.time)}</strong>
                        </div>
                        <div className="schedule-details">
                          <strong>{schedule.name}</strong>
                          <span>
                            {schedule.type}
                            {schedule.type !== "Water" ? ` · ${schedule.amount} g` : ""}
                          </span>
                          <em>{formatRecurrence(schedule)}</em>
                        </div>
                        <span className="run-time">
                          {schedule.enabled ? `Next · ${getNextRun(schedule)}` : "Paused"}
                        </span>
                        <Toggle
                          checked={schedule.enabled}
                          onChange={async () => {
                            const newEnabled = !schedule.enabled;

                            const { error } = await supabase
                              .from("pet_schedules")
                              .update({ enabled: newEnabled })
                              .eq("id", schedule.id);

                            if (error) {
                              console.error("Error updating schedule:", error.message);
                              setToast("Unable to update schedule");
                              return;
                            }

                            setSchedules((items) =>
                              items.map((item) =>
                                item.id === schedule.id
                                  ? { ...item, enabled: newEnabled }
                                  : item,
                              ),
                            );

                            setToast(newEnabled ? "Schedule enabled" : "Schedule paused");
                          }}
                          label={`${schedule.enabled ? "Disable" : "Enable"} ${schedule.name} schedule`}
                        />
                        <button
                          className="row-action"
                          onClick={() => openEditSchedule(schedule)}
                          aria-label={`Edit ${schedule.name} schedule`}
                        >
                          <Icon name="edit" size={18} />
                        </button>
                        <button
                          className="row-action delete"
                          onClick={async () => {
                            const { error } = await supabase
                              .from("pet_schedules")
                              .delete()
                              .eq("id", schedule.id);

                            if (error) {
                              console.error("Error deleting schedule:", error.message);
                              setToast("Unable to delete schedule");
                              return;
                            }

                            setSchedules((items) =>
                              items.filter((item) => item.id !== schedule.id),
                            );

                            setToast("Schedule deleted successfully");
                          }}
                          aria-label={`Delete ${schedule.name} schedule`}
                        >
                          <Icon name="trash" size={18} />
                        </button>
                      </div>
                    )
                  ))}
                </div>
              </section>

              <aside className="card dispense-card">
                <span className="metric-icon food">
                  <Icon name="bowl" />
                </span>
                <span className="eyebrow">Food dispensing</span>
                <h2>Portion amount</h2>
                <p>Set the default amount used when you create a new food schedule.</p>
                <div className="configured-row">
                  <span>Current setting</span>
                  <strong>{savedAmount} g</strong>
                </div>
                <label htmlFor="food-amount">Editable amount</label>
                <div className="stepper">
                  <button
                    onClick={() => setAmount(String(Math.max(20, (Number(amount) || 20) - 5)))}
                    aria-label="Decrease by 5 grams"
                  >
                    −
                  </button>
                  <div>
                    <input
                      id="food-amount"
                      type="number"
                      min="20"
                      max="150"
                      step="1"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      onBlur={() => {
                        if (!amount) return;
                        const parsedAmount = Number(amount);
                        if (Number.isFinite(parsedAmount)) {
                          setAmount(String(Math.min(150, Math.max(20, parsedAmount))));
                        }
                      }}
                    />
                    <span>g</span>
                  </div>
                  <button
                    onClick={() => setAmount(String(Math.min(150, (Number(amount) || 20) + 5)))}
                    aria-label="Increase by 5 grams"
                  >
                    +
                  </button>
                </div>
                <input
                  className="amount-slider"
                  type="range"
                  min="20"
                  max="150"
                  step="5"
                  value={Math.min(150, Math.max(20, Number(amount) || 20))}
                  onChange={(event) => setAmount(event.target.value)}
                  aria-label="Food amount in grams"
                />
                <div className="range-labels">
                  <span>20 g min</span>
                  <span>150 g max</span>
                </div>
                <button
                  className="primary-button full"
                  onClick={applyAmount}
                  disabled={Number(amount) === savedAmount}
                >
                  Apply amount
                </button>
                <small className="hardware-note">
                  <Icon name="info" size={15} /> Sample setting only; no hardware command is sent.
                </small>
              </aside>
            </div>
          </div>
        )}

        {page === "consumption" && (
          <div className="page">
            <div className="analytics-summary">
              <div className="summary-card">
                <span className="metric-icon food">
                  <Icon name="bowl" />
                </span>
                <div>
                  <span>Food this week</span>
                  <strong>
                    562 <small>g</small>
                  </strong>
                  <em>4% less than last week</em>
                </div>
              </div>
              <div className="summary-card">
                <span className="metric-icon water">
                  <Icon name="drop" />
                </span>
                <div>
                  <span>Water this week</span>
                  <strong>
                    3.2 <small>L</small>
                  </strong>
                  <em>8% more than last week</em>
                </div>
              </div>
              <div className="summary-card">
                <span className="metric-icon neutral">
                  <Icon name="calendar" />
                </span>
                <div>
                  <span>Completed feedings</span>
                  <strong>
                    18 <small>/ 21</small>
                  </strong>
                  <em>86% schedule completion</em>
                </div>
              </div>
            </div>
            <section className="card chart-card">
              <div className="chart-header">
                <div>
                  <span className="eyebrow">History</span>
                  <h2>Food & water consumption</h2>
                  <p>Illustrative sample data</p>
                </div>
                <div className="chart-controls">
                  <div className="segment-control" aria-label="Date range">
                    {(["Today", "7 Days", "30 Days"] as const).map((range) => (
                      <button
                        key={range}
                        className={dateRange === range ? "active" : ""}
                        onClick={() => setDateRange(range)}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                  <div className="segment-control mode-control" aria-label="Chart type">
                    {(["Line", "Bar"] as const).map((mode) => (
                      <button
                        key={mode}
                        className={chartMode === mode ? "active" : ""}
                        onClick={() => setChartMode(mode)}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="chart-legend">
                <span>
                  <i className="legend-food" /> Food (g)
                </span>
                <span>
                  <i className="legend-water" /> Water (ml)
                </span>
              </div>
              <ConsumptionChart mode={chartMode} range={dateRange} />
              <p className="chart-footnote">
                <Icon name="info" size={15} /> Values are sample readings for interface
                demonstration.
              </p>
            </section>
          </div>
        )}

        {page === "history" && (
          <div className="page">
            <div className="history-summary">
              <div className="history-stat">
                <span className="metric-icon food">
                  <Icon name="bowl" />
                </span>
                <div>
                  <span>Total food dispensed</span>
                  <strong>
                    {historySummary.food} <small>g</small>
                  </strong>
                </div>
              </div>
              <div className="history-stat">
                <span className="metric-icon water">
                  <Icon name="drop" />
                </span>
                <div>
                  <span>Total water dispensed</span>
                  <strong>
                    {historySummary.water} <small>ml</small>
                  </strong>
                </div>
              </div>
              <div className="history-stat">
                <span className="history-status-icon success">
                  <Icon name="check" size={18} />
                </span>
                <div>
                  <span>Successful operations</span>
                  <strong>{historySummary.successful}</strong>
                </div>
              </div>
              <div className="history-stat">
                <span className="history-status-icon failed">
                  <Icon name="info" size={18} />
                </span>
                <div>
                  <span>Failed operations</span>
                  <strong>{historySummary.failed}</strong>
                </div>
              </div>
            </div>

            <section className="card history-card">
              <div className="history-card-header">
                <div>
                  <span className="eyebrow">Activity log</span>
                  <h2>Dispensing records</h2>
                  <p>Newest activity is shown first · Illustrative sample data</p>
                </div>
                <div className="history-search">
                  <Icon name="search" size={17} />
                  <input
                    type="text"
                    role="searchbox"
                    inputMode="search"
                    aria-label="Search dispensing history"
                    placeholder="Search date, amount, schedule or status"
                    autoComplete="off"
                    value={historySearch}
                    onChange={(event) => setHistorySearch(event.target.value)}
                  />
                  {historySearch && (
                    <button onClick={() => setHistorySearch("")} aria-label="Clear search">
                      <Icon name="x" size={15} />
                    </button>
                  )}
                </div>
              </div>
              <div className="history-filters">
                <label>
                  <span>Date range</span>
                  <select
                    value={historyRange}
                    onChange={(event) =>
                      setHistoryRange(
                        event.target.value as "Today" | "Last 7 Days" | "Last 30 Days" | "Custom",
                      )
                    }
                  >
                    <option>Today</option>
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                    <option>Custom</option>
                  </select>
                </label>
                {historyRange === "Custom" && (
                  <div className="custom-date-filter">
                    <label>
                      <span>From</span>
                      <input
                        type="date"
                        value={customFrom}
                        max={customTo}
                        onChange={(event) => setCustomFrom(event.target.value)}
                      />
                    </label>
                    <label>
                      <span>To</span>
                      <input
                        type="date"
                        value={customTo}
                        min={customFrom}
                        max={dateInputValue(0)}
                        onChange={(event) => setCustomTo(event.target.value)}
                      />
                    </label>
                  </div>
                )}
                <label>
                  <span>Dispensing type</span>
                  <select
                    value={historyType}
                    onChange={(event) =>
                      setHistoryType(event.target.value as "All" | "Food" | "Water")
                    }
                  >
                    <option>All</option>
                    <option>Food</option>
                    <option>Water</option>
                  </select>
                </label>
                <label>
                  <span>Status</span>
                  <select
                    value={historyStatus}
                    onChange={(event) =>
                      setHistoryStatus(event.target.value as "All" | "Successful" | "Failed")
                    }
                  >
                    <option>All</option>
                    <option>Successful</option>
                    <option>Failed</option>
                  </select>
                </label>
                {(historyRange !== "Last 30 Days" ||
                  historyType !== "All" ||
                  historyStatus !== "All" ||
                  historySearch) && (
                    <button
                      className="clear-filters"
                      onClick={() => {
                        setHistoryRange("Last 30 Days");
                        setHistoryType("All");
                        setHistoryStatus("All");
                        setHistorySearch("");
                      }}
                    >
                      Clear filters
                    </button>
                  )}
              </div>

              {filteredHistory.length ? (
                <div className="history-table-wrap">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Date & time</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Related schedule</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((record) => (
                        <tr key={record.id}>
                          <td data-label="Date & time">
                            <strong>{formatHistoryDate(record.date)}</strong>
                            <span>{formatTime(record.time)}</span>
                          </td>
                          <td data-label="Type">
                            <span className={`record-type ${record.type.toLowerCase()}`}>
                              <Icon name={record.type === "Food" ? "bowl" : "drop"} size={16} />
                              {record.type}
                            </span>
                          </td>
                          <td data-label="Amount">
                            <strong className={record.status === "Failed" ? "failed-amount" : ""}>
                              {record.status === "Failed"
                                ? "Not dispensed"
                                : `${record.amount} ${record.unit}`}
                            </strong>
                          </td>
                          <td data-label="Related schedule">
                            <span className="schedule-reference">
                              <Icon name="calendar" size={15} />
                              {record.schedule}
                            </span>
                          </td>
                          <td data-label="Status">
                            <div className="history-status-cell">
                              <span className={`operation-status ${record.status.toLowerCase()}`}>
                                <i />
                                {record.status}
                              </span>
                              <span
                                className={`dispense-method ${(record.method ?? "Automatic").toLowerCase()}`}
                              >
                                {record.method ?? "Automatic"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state history-empty">
                  <span>
                    <Icon name="history" size={26} />
                  </span>
                  <h3>No dispensing records found</h3>
                  <p>Try changing the selected date, type, status, or search term.</p>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setHistoryRange("Last 30 Days");
                      setHistoryType("All");
                      setHistoryStatus("All");
                      setHistorySearch("");
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              )}
              <div className="history-footer">
                Showing {filteredHistory.length} of {historyEntries.length} records
              </div>
            </section>
          </div>
        )}

        {page === "alerts" && (
          <div className="page">
            <div className="alerts-toolbar">
              <div className="filter-pills">
                {(["All", "Unread", "Supply", "Device"] as const).map((filter) => (
                  <button
                    key={filter}
                    className={alertFilter === filter ? "active" : ""}
                    onClick={() => setAlertFilter(filter)}
                  >
                    {filter}
                    {filter === "Unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
                  </button>
                ))}
              </div>
              <button
                className="secondary-button"
                disabled={unreadCount === 0}
                onClick={() => {
                  setAlerts((items) => items.map((item) => ({ ...item, unread: false })));
                  setToast("All alerts marked as read");
                }}
              >
                <Icon name="check" size={17} /> Mark all as read
              </button>
            </div>
            <section className="card alerts-card">
              <div className="section-heading alerts-heading">
                <div>
                  <span className="eyebrow">Notification history</span>
                  <h2>{alertFilter === "All" ? "All alerts" : alertFilter}</h2>
                </div>
                <span>
                  {filteredAlerts.length} sample {filteredAlerts.length === 1 ? "alert" : "alerts"}
                </span>
              </div>
              {filteredAlerts.length > 0 ? (
                <div className="full-alert-list">
                  {filteredAlerts.map((alert) => (
                    <article
                      className={`full-alert ${alert.unread ? "unread" : ""}`}
                      key={alert.id}
                    >
                      <span
                        className={`alert-symbol large ${alert.level === "Attention" ? "attention" : ""}`}
                      >
                        <Icon
                          name={
                            alert.category === "Supply"
                              ? "info"
                              : alert.category === "Schedule"
                                ? "check"
                                : "bell"
                          }
                        />
                      </span>
                      <div className="full-alert-copy">
                        <div className="alert-title-line">
                          <strong>{alert.title}</strong>
                          {alert.unread && <span className="unread-label">Unread</span>}
                        </div>
                        <p>{alert.detail}</p>
                        <div>
                          <span
                            className={`category-tag ${alert.level === "Attention" ? "attention" : ""}`}
                          >
                            {alert.category} · {alert.level}
                          </span>
                          <time>{alert.time}</time>
                        </div>
                      </div>
                      {alert.unread ? (
                        <button
                          className="secondary-button compact"
                          onClick={() =>
                            setAlerts((items) =>
                              items.map((item) =>
                                item.id === alert.id ? { ...item, unread: false } : item,
                              ),
                            )
                          }
                        >
                          <Icon name="check" size={16} /> Mark as read
                        </button>
                      ) : (
                        <span className="read-state">
                          <Icon name="check" size={16} /> Read
                        </span>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span>
                    <Icon name="check" size={26} />
                  </span>
                  <h3>You’re all caught up</h3>
                  <p>No sample alerts match this filter.</p>
                  <button className="secondary-button" onClick={() => setAlertFilter("All")}>
                    View all alerts
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {editorOpen && (
        <div
          className="modal-layer"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setEditorOpen(false)}
        >
          <section
            className="modal schedule-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-modal-title"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">{editingId ? "Update routine" : "New routine"}</span>
                <h2 id="schedule-modal-title">
                  {editingId ? "Edit schedule" : "Add a feeding schedule"}
                </h2>
              </div>
              <button
                className="modal-close"
                onClick={() => setEditorOpen(false)}
                aria-label="Close"
              >
                <Icon name="x" />
              </button>
            </div>
            <div className="schedule-form-grid">
              <div className="form-field">
                <label htmlFor="schedule-name">
                  Schedule name <span>Optional</span>
                </label>
                <input
                  className="text-input"
                  id="schedule-name"
                  type="text"
                  placeholder="e.g. Breakfast"
                  value={formName}
                  maxLength={40}
                  onChange={(event) => {
                    setFormName(event.target.value);
                    setFormError("");
                  }}
                />
              </div>
              <div className="form-field">
                <label htmlFor="feeding-time">Dispensing time</label>
                <div className="input-with-icon">
                  <Icon name="clock" size={18} />
                  <input
                    id="feeding-time"
                    type="time"
                    value={formTime}
                    onChange={(event) => {
                      setFormTime(event.target.value);
                      setFormError("");
                    }}
                  />
                </div>
              </div>
            </div>
            <fieldset>
              <legend>What should be dispensed?</legend>
              <div className="type-options">
                {(["Food", "Water", "Food & water"] as const).map((type) => (
                  <button
                    type="button"
                    key={type}
                    className={formType === type ? "selected" : ""}
                    onClick={() => {
                      setFormType(type);
                      setFormError("");
                    }}
                  >
                    <Icon name={type === "Water" ? "drop" : "bowl"} size={19} />
                    <span>{type}</span>
                    {formType === type && (
                      <i>
                        <Icon name="check" size={13} />
                      </i>
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
            {formType !== "Water" && (
              <div className="form-field">
                <label htmlFor="schedule-amount">Food amount</label>
                <div className="amount-input">
                  <input
                    id="schedule-amount"
                    type="number"
                    min="20"
                    max="150"
                    value={formAmount}
                    onChange={(event) => {
                      setFormAmount(event.target.value);
                      setFormError("");
                    }}
                  />
                  <span>grams</span>
                </div>
                <small>Choose between 20 g and 150 g.</small>
              </div>
            )}
            <fieldset className="recurrence-fieldset">
              <legend>Repeat</legend>
              <div className="recurrence-options">
                {(["Once", "Every Day", "Weekdays", "Weekends", "Custom Days"] as const).map(
                  (recurrence) => (
                    <button
                      type="button"
                      key={recurrence}
                      className={formRecurrence === recurrence ? "selected" : ""}
                      onClick={() => selectRecurrence(recurrence)}
                    >
                      {recurrence}
                    </button>
                  ),
                )}
              </div>
              {formRecurrence === "Custom Days" && (
                <div className="day-picker" aria-label="Select recurring days">
                  {(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as DayName[]).map((day) => {
                    const selected = formDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        className={selected ? "selected" : ""}
                        aria-pressed={selected}
                        onClick={() => {
                          setFormDays((days) =>
                            selected ? days.filter((item) => item !== day) : [...days, day],
                          );
                          setFormError("");
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              )}
              {formRecurrence !== "Once" && formRecurrence !== "Custom Days" && (
                <p className="recurrence-hint">
                  <Icon name="check" size={14} />
                  {formRecurrence === "Every Day"
                    ? "All seven days selected"
                    : formRecurrence === "Weekdays"
                      ? "Monday through Friday selected"
                      : "Saturday and Sunday selected"}
                </p>
              )}
            </fieldset>
            <div className="schedule-form-grid date-grid">
              <div className="form-field">
                <label htmlFor="start-date">Start date</label>
                <input
                  className="text-input"
                  id="start-date"
                  type="date"
                  value={formStartDate}
                  onChange={(event) => {
                    setFormStartDate(event.target.value);
                    setFormError("");
                  }}
                />
              </div>
              <div className="form-field">
                <label htmlFor="end-date">
                  End date <span>Optional</span>
                </label>
                <input
                  className="text-input"
                  id="end-date"
                  type="date"
                  min={formStartDate}
                  value={formEndDate}
                  onChange={(event) => {
                    setFormEndDate(event.target.value);
                    setFormError("");
                  }}
                />
                <small>Leave blank to continue until disabled.</small>
              </div>
            </div>
            {formError && (
              <div className="form-error">
                <Icon name="info" size={17} /> {formError}
              </div>
            )}
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setEditorOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={saveSchedule}>
                <Icon name="check" size={17} /> {editingId ? "Save changes" : "Save schedule"}
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <span>
            <Icon name="check" size={16} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateInputValue(daysAgo: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatHistoryDate(value: string) {
  if (value === dateInputValue(0)) return "Today";
  if (value === dateInputValue(1)) return "Yesterday";
  return parseLocalDate(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRecurrence(schedule: Schedule) {
  if (schedule.recurrence === "Once") {
    return `Once · ${parseLocalDate(schedule.startDate).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    })}`;
  }
  if (schedule.recurrence === "Custom Days") return schedule.days.join(", ");
  return schedule.recurrence;
}

function getNextRun(schedule: Schedule) {
  const now = new Date();
  const dayNames: DayName[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const start = parseLocalDate(schedule.startDate);
  const end = schedule.endDate ? parseLocalDate(schedule.endDate) : null;
  if (end) end.setHours(23, 59, 59, 999);

  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    const [hours, minutes] = schedule.time.split(":").map(Number);
    candidate.setHours(hours, minutes, 0, 0);
    if (candidate < now || candidate < start || (end && candidate > end)) continue;
    const isStartDate = candidate.toDateString() === start.toDateString();
    if (
      (schedule.recurrence === "Once" && isStartDate) ||
      (schedule.recurrence !== "Once" && schedule.days.includes(dayNames[candidate.getDay()]))
    ) {
      const dayLabel =
        offset === 0
          ? "Today"
          : offset === 1
            ? "Tomorrow"
            : candidate.toLocaleDateString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
      return `${dayLabel}, ${formatTime(schedule.time)}`;
    }
  }
  return "No upcoming run";
}

export default App;