import { useCallback, useEffect, useMemo, useState } from "react";

const APP_KEY = "nexo-management-v1";
const ACCOUNTS_KEY = `${APP_KEY}:accounts`;
const SESSION_KEY = `${APP_KEY}:session`;

const emptyData = {
  profile: {
    name: "",
    surname: "",
    taxId: "",
    phone: "",
    email: "",
  },
  business: {
    name: "",
    category: "",
    address: "",
    cuit: "",
  },
  clients: [],
  budgets: [],
  orders: [],
  frequentServices: [],
  history: [],
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "clients", label: "Clientes", icon: "◉" },
  { id: "budgets", label: "Presupuestos", icon: "◇" },
  { id: "orders", label: "Órdenes y Pagos", icon: "▤" },
  { id: "monthly", label: "Resumen Mensual", icon: "▧" },
  { id: "history", label: "Historial", icon: "≡" },
  { id: "settings", label: "Configuración", icon: "⚙" },
];

const ORDER_STATUS = ["Pendiente", "Terminado"];
const PAYMENT_STATUS = ["Pendiente", "Pago parcial", "Pagado"];
const BUDGET_STATUS = ["Pendiente", "Convertido", "Rechazado"];
const ORDER_OVERDUE_DAYS = 7;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function dataKey(email) {
  return `${APP_KEY}:data:${email}`;
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function onlyDigits(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function toTitleCase(value) {
  return String(value || "")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatFullName(profile) {
  return [profile?.name, profile?.surname].filter(Boolean).join(" ").trim();
}

function isValidPhone(phone) {
  const digits = onlyDigits(phone);
  return digits.length >= 8 && digits.length <= 15;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function formatARSInput(value) {
  const digits = onlyDigits(value);
  if (!digits) return "";
  return Number(digits).toLocaleString("es-AR");
}

function parseARS(value) {
  return Number(onlyDigits(value)) || 0;
}

function currency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function dateLabel(value) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isValidISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && value === date.toISOString().slice(0, 10);
}

function dateTimeLabel(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-AR");
}

function monthKey(value) {
  return value ? value.slice(0, 7) : "";
}

function currentMonthLabel() {
  return new Date().toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function statusTone(status) {
  if (["Terminado", "Pagado"].includes(status)) return "green";
  if (["Pendiente", "Pago parcial"].includes(status)) return "amber";
  return "neutral";
}

function getPaidAmount(order) {
  const total = Math.max(Number(order?.total || 0), 0);
  if (order?.payment === "Pagado") return total;
  if (order?.payment === "Pago parcial") return Math.min(Math.max(Number(order?.paidAmount || 0), 0), total);
  return 0;
}

function getPendingAmount(order) {
  return Math.max(Number(order?.total || 0) - getPaidAmount(order), 0);
}

function isOrderOverdue(order) {
  if (order?.status !== "Pendiente" || !isValidISODate(order.date)) return false;
  const created = new Date(`${order.date}T12:00:00`);
  const limit = new Date();
  limit.setHours(12, 0, 0, 0);
  limit.setDate(limit.getDate() - ORDER_OVERDUE_DAYS);
  return created < limit;
}

function normalizeOrderPayment(payment, total, paidAmount) {
  if (payment === "Pagado") return { payment, paidAmount: total };
  if (payment === "Pago parcial") return { payment, paidAmount: Math.min(paidAmount, total) };
  return { payment: "Pendiente", paidAmount: 0 };
}

function findDuplicateClient(clients, form, editingId = null) {
  const name = normalizeText(form.name);
  const phone = onlyDigits(form.phone);
  const email = normalizeEmail(form.email);

  return clients.find((client) => {
    if (client.id === editingId) return false;
    if (normalizeText(client.name) === name) return true;
    if (phone && onlyDigits(client.phone) === phone) return true;
    if (email && normalizeEmail(client.email) === email) return true;
    return false;
  });
}

function notify(message) {
  window.dispatchEvent(new CustomEvent("nm-toast", { detail: message }));
}

function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function handleToast(event) {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message: event.detail }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 2800);
    }

    window.addEventListener("nm-toast", handleToast);
    return () => window.removeEventListener("nm-toast", handleToast);
  }, []);

  return (
    <div className="fixed right-5 top-5 z-[100] space-y-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="min-w-72 rounded-2xl border border-white/10 bg-zinc-950/95 px-5 py-3 text-sm text-zinc-200 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function confirmAction(message) {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent("nm-confirm", { detail: { message, resolve } }));
  });
}

function ConfirmHost() {
  const [request, setRequest] = useState(null);

  useEffect(() => {
    function handleConfirm(event) {
      setRequest(event.detail);
    }

    window.addEventListener("nm-confirm", handleConfirm);
    return () => window.removeEventListener("nm-confirm", handleConfirm);
  }, []);

  if (!request) return null;

  function answer(value) {
    request.resolve(value);
    setRequest(null);
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/70">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-600">Confirmación</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">¿Estás seguro?</h2>
        <p className="mt-3 leading-7 text-zinc-400">{request.message}</p>
        <div className="mt-7 flex justify-end gap-3">
          <SecondaryButton onClick={() => answer(false)} className="px-4 py-2.5 text-sm">Cancelar</SecondaryButton>
          <PrimaryButton onClick={() => answer(true)}>Confirmar</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function addHistory(data, type, title, description) {
  return {
    ...data,
    history: [
      {
        id: createId("HIS"),
        type,
        title,
        description,
        date: new Date().toISOString(),
      },
      ...(data.history || []),
    ],
  };
}

function getClient(data, name) {
  return data.clients.find((client) => client.name === name);
}

function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "border-white/10 bg-white/[0.06] text-zinc-300",
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  };

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5 ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Panel({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-zinc-950/70 shadow-2xl shadow-black/30 backdrop-blur-xl sm:rounded-3xl ${className}`}>
      {children}
    </div>
  );
}

function MobileField({ label, value, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">{label}</p>
      <div className="mt-1 break-words text-sm text-zinc-300">{children || value || "—"}</div>
    </div>
  );
}

function PageHeader({ label, title, text }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-[0.24em] text-zinc-600 sm:tracking-[0.35em]">{label}</p>
      <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">{title}</h1>
      {text && <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500 sm:text-base sm:leading-7">{text}</p>}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-500">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-white/25 focus:bg-white/[0.06]"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-zinc-950">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ClientPicker({ label = "Cliente", value, onChange, clients }) {
  const listId = `clientes-${label.replaceAll(" ", "-").toLowerCase()}`;

  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-500">{label}</span>
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribí o elegí un cliente"
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-white/25 focus:bg-white/[0.06]"
      />
      <datalist id={listId}>
        {clients.map((client) => (
          <option key={client.id} value={client.name} />
        ))}
      </datalist>
    </label>
  );
}

function PrimaryButton({ children, type = "button", onClick, className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-2xl border border-white/10 bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-zinc-200 ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, type = "button", onClick, className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-medium leading-4 text-zinc-300 transition hover:border-white/25 hover:text-white ${className}`}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] font-mono text-zinc-500">—</div>
      <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">{text}</p>
    </div>
  );
}

function openDocumentWindow({
  type,
  id,
  data,
  clientName,
  service,
  observations,
  amount,
  orderStatus = "Pendiente",
  paymentStatus = "Pendiente",
  paidAmount = 0,
}) {
  const businessName = data.business.name || "Nexo Management";
  const client = getClient(data, clientName);
  const total = Number(amount || 0);
  const paid = Number(paidAmount || 0);
  const remaining = Math.max(total - paid, 0);
  const responsible = formatFullName(data.profile) || "—";
  const generatedDate = new Date().toLocaleDateString("es-AR");
  const isBudget = type === "Presupuesto";

  const html = `<!doctype html>
<html>
<head>
<meta charset="UTF-8" />
<title>${type} ${id}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f3f4f6;color:#111827;font-family:Arial,Helvetica,sans-serif}.page{width:794px;min-height:1123px;margin:24px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.12);border:1px solid #e5e7eb}.topbar{height:10px;background:linear-gradient(90deg,#111827,#4b5563)}.content{padding:56px 68px 36px;min-height:1113px;display:flex;flex-direction:column}.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:34px;border-bottom:1px solid #e5e7eb}.brandWrap{display:flex;gap:18px;align-items:center}.logo{width:62px;height:58px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:#111827;color:white;font-size:22px;font-weight:900;box-shadow:0 10px 25px rgba(17,24,39,.25)}.business{font-size:26px;font-weight:900;color:#111827}.muted{color:#6b7280;font-size:12px;line-height:1.6}.docType{font-size:12px;letter-spacing:4px;font-weight:900;color:#374151;text-align:right}.docNumber{margin-top:10px;font-size:31px;font-weight:900;color:#111827;text-align:right}.date{margin-top:10px;text-align:right;color:#6b7280;font-size:12px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:30px}.box{border:1px solid #d1d5db;border-radius:16px;padding:20px;min-height:138px;background:#f9fafb}.boxTitle{font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:900;color:#374151;margin-bottom:14px}.line{font-size:14px;line-height:1.9;color:#111827}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:30px;overflow:hidden;border-radius:16px;border:1px solid #d1d5db}th{background:#111827;color:white;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding:15px;text-align:left}td{padding:17px 15px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827}tr:last-child td{border-bottom:none}.summary{margin-top:26px;margin-left:auto;width:345px;border:1px solid #d1d5db;background:#f9fafb;border-radius:16px;padding:22px}.summaryRow{display:flex;align-items:center;justify-content:space-between;margin:13px 0;font-size:15px;font-weight:800}.summaryTotal{font-size:30px;font-weight:900;color:#111827}.paid,.remaining{color:#111827;font-weight:900}.validity{margin-top:22px;border:1px solid #d1d5db;background:#f9fafb;border-radius:14px;padding:15px 18px;font-size:13px;font-weight:900;color:#111827}.legal{margin-top:22px;border:1px solid #e5e7eb;border-radius:14px;padding:20px;color:#4b5563;font-size:12px;line-height:1.8}.footer{margin-top:auto;padding-top:22px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;color:#6b7280;font-size:11px}.printBtn{position:fixed;right:24px;bottom:24px;border:0;border-radius:14px;padding:14px 18px;background:#111827;color:white;font-weight:800;cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.25)}@media print{body{background:white}.page{margin:0;width:100%;min-height:100vh;box-shadow:none;border:none;border-radius:0}.printBtn{display:none}}
</style>
</head>
<body>
<main class="page"><div class="topbar"></div><div class="content">
<section class="header"><div class="brandWrap"><div class="logo">NM</div><div><div class="business">${businessName}</div><div class="muted">${data.business.address || ""}</div><div class="muted">${data.profile.phone || ""}</div></div></div><div><div class="docType">${type.toUpperCase()}</div><div class="docNumber">${id}</div><div class="date">Fecha: ${generatedDate}</div></div></section>
<section class="grid2"><div class="box"><div class="boxTitle">Cliente</div><div class="line"><strong>${clientName}</strong></div>${client?.phone ? `<div class="line">Teléfono: ${client.phone}</div>` : ""}${!isBudget ? `<div class="line">Estado de orden: ${orderStatus.toLowerCase()}</div>` : ""}</div><div class="box"><div class="boxTitle">Datos del ${isBudget ? "presupuesto" : "documento"}</div><div class="line"><strong>Número:</strong> ${id}</div><div class="line"><strong>Fecha de emisión:</strong> ${generatedDate}</div><div class="line"><strong>Estado de pago:</strong> ${paymentStatus}</div><div class="line"><strong>Responsable:</strong> ${responsible}</div>${data.profile.taxId ? `<div class="line"><strong>CUIT/CUIL:</strong> ${data.profile.taxId}</div>` : ""}</div></section>
<table><thead><tr><th>#</th><th>Servicio</th><th>Precio</th><th>Cant.</th><th>Total</th></tr></thead><tbody><tr><td>1</td><td>${service}</td><td>${currency(total)}</td><td>1</td><td>${currency(total)}</td></tr></tbody></table>
${!isBudget ? `<section class="summary"><div class="summaryRow"><span>Total presupuestado</span><span class="summaryTotal">${currency(total)}</span></div><div class="summaryRow"><span>Pagado</span><span class="paid">${currency(paid)}</span></div><div class="summaryRow"><span>Resta a pagar</span><span class="remaining">${currency(remaining)}</span></div></section>` : ""}
${isBudget ? `<div class="validity">Presupuesto válido por 7 días desde la fecha de emisión.</div>` : ""}
<section class="legal">${observations ? `<strong>Observaciones:</strong> ${observations}<br><br>` : ""}Este presupuesto detalla los servicios solicitados y sus importes correspondientes. Los valores indicados corresponden al servicio/trabajo presupuestado. No incluyen repuestos, materiales, insumos especiales ni costos adicionales, salvo que estén expresamente detallados en este documento. Los importes pueden estar sujetos a cambios si se agregan trabajos adicionales o modificaciones solicitadas posteriormente.</section>
<footer class="footer"><span>Generado con Nexo Management</span><span>${id}</span></footer>
</div></main><button class="printBtn" onclick="window.print()">Imprimir / Guardar PDF</button>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) {
    notify("El navegador bloqueó la apertura del documento. Permití ventanas emergentes.");
    return;
  }
  win.document.write(html);
  win.document.close();
}

function openClientsListDocument({ data, clients }) {
  const businessName = data.business.name || "Nexo Management";
  const generatedDate = new Date().toLocaleDateString("es-AR");

  const rows = clients.length
    ? clients
        .map(
          (client, index) => `
            <tr>
              <td>${index + 1}</td>
              <td><strong>${client.name}</strong><br><span>${client.id}</span></td>
              <td>${client.phone || "—"}</td>
              <td>${client.email || "—"}</td>
              <td>${client.notes || "—"}</td>
            </tr>`
        )
        .join("")
    : `<tr><td colspan="5">Sin clientes registrados.</td></tr>`;

  const html = `<!doctype html>
<html>
<head>
<meta charset="UTF-8" />
<title>Lista de clientes</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f3f4f6;color:#111827;font-family:Arial,Helvetica,sans-serif}.page{width:794px;min-height:1123px;margin:24px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.12);border:1px solid #e5e7eb}.topbar{height:10px;background:linear-gradient(90deg,#111827,#4b5563)}.content{padding:56px 68px 36px;min-height:1113px;display:flex;flex-direction:column}.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:34px;border-bottom:1px solid #e5e7eb}.brandWrap{display:flex;gap:18px;align-items:center}.logo{width:62px;height:58px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:#111827;color:white;font-size:22px;font-weight:900;box-shadow:0 10px 25px rgba(17,24,39,.25)}.business{font-size:26px;font-weight:900;color:#111827}.muted{color:#6b7280;font-size:12px;line-height:1.6}.docType{font-size:12px;letter-spacing:4px;font-weight:900;color:#374151;text-align:right}.docNumber{margin-top:10px;font-size:31px;font-weight:900;color:#111827;text-align:right}.date{margin-top:10px;text-align:right;color:#6b7280;font-size:12px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:30px}.card{border:1px solid #d1d5db;border-radius:16px;background:#f9fafb;padding:16px}.card span{display:block;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:800}.card strong{display:block;margin-top:8px;font-size:22px;color:#111827}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:30px;overflow:hidden;border-radius:16px;border:1px solid #d1d5db}th{background:#111827;color:white;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding:13px;text-align:left}td{padding:13px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#111827;vertical-align:top}td span{color:#6b7280;font-size:11px}tr:last-child td{border-bottom:none}.footer{margin-top:auto;padding-top:22px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;color:#6b7280;font-size:11px}.printBtn{position:fixed;right:24px;bottom:24px;border:0;border-radius:14px;padding:14px 18px;background:#111827;color:white;font-weight:800;cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.25)}@media print{body{background:white}.page{margin:0;width:100%;min-height:100vh;box-shadow:none;border:none;border-radius:0}.printBtn{display:none}}
</style>
</head>
<body>
<main class="page">
  <div class="topbar"></div>
  <div class="content">
    <section class="header">
      <div class="brandWrap">
        <div class="logo">NM</div>
        <div>
          <div class="business">${businessName}</div>
          <div class="muted">Lista completa de clientes registrados</div>
          <div class="muted">${data.business.address || ""}</div>
        </div>
      </div>
      <div>
        <div class="docType">CLIENTES</div>
        <div class="docNumber">${clients.length}</div>
        <div class="date">Fecha: ${generatedDate}</div>
      </div>
    </section>

    <section class="summary">
      <div class="card"><span>Total clientes</span><strong>${clients.length}</strong></div>
      <div class="card"><span>Con teléfono</span><strong>${clients.filter((c) => c.phone).length}</strong></div>
      <div class="card"><span>Con email</span><strong>${clients.filter((c) => c.email).length}</strong></div>
    </section>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Cliente</th>
          <th>Teléfono</th>
          <th>Email</th>
          <th>Notas</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <footer class="footer">
      <span>Generado con Nexo Management</span>
      <span>Lista de clientes</span>
    </footer>
  </div>
</main>
<button class="printBtn" onclick="window.print()">Imprimir / Guardar PDF</button>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    notify("El navegador bloqueó la apertura de la lista. Permití ventanas emergentes.");
    return;
  }
  win.document.write(html);
  win.document.close();
}

function openClientRecord({ data, client }) {
  const orders = data.orders.filter((order) => order.client === client.name);
  const businessName = data.business.name || "Nexo Management";

  const html = `<!doctype html><html><head><meta charset="UTF-8"><title>Registro ${client.name}</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f4f6;color:#111827;font-family:Arial,Helvetica,sans-serif}.page{width:794px;min-height:1123px;margin:24px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.12);border:1px solid #e5e7eb}.topbar{height:10px;background:linear-gradient(90deg,#111827,#4b5563)}.content{padding:56px 68px 36px;min-height:1113px;display:flex;flex-direction:column}.header{display:flex;justify-content:space-between;padding-bottom:30px;border-bottom:1px solid #e5e7eb}.logo{width:62px;height:58px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:#111827;color:white;font-size:22px;font-weight:900}.brand{display:flex;gap:18px;align-items:center}h1{margin:0;font-size:28px}.muted{color:#6b7280;font-size:12px}.label{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#374151;font-weight:900}.box{border:1px solid #d1d5db;border-radius:16px;padding:20px;background:#f9fafb;margin-top:24px}table{width:100%;border-collapse:separate;border-spacing:0;margin-top:18px;border-radius:16px;overflow:hidden;border:1px solid #d1d5db}th{background:#111827;color:white;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding:14px;text-align:left}td{padding:14px;border-bottom:1px solid #e5e7eb;font-size:13px}tr:last-child td{border-bottom:none}.footer{margin-top:auto;padding-top:22px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;color:#6b7280;font-size:11px}.printBtn{position:fixed;right:24px;bottom:24px;border:0;border-radius:14px;padding:14px 18px;background:#111827;color:white;font-weight:800;cursor:pointer}@media print{body{background:white}.page{margin:0;width:100%;box-shadow:none;border:none}.printBtn{display:none}}</style></head><body><main class="page"><div class="topbar"></div><div class="content"><section class="header"><div class="brand"><div class="logo">NM</div><div><h1>${businessName}</h1><div class="muted">Registro completo de cliente</div></div></div><div style="text-align:right"><div class="label">Cliente</div><h1>${client.name}</h1><div class="muted">Generado: ${new Date().toLocaleDateString("es-AR")}</div></div></section><section class="box"><div class="label">Datos del cliente</div><p><strong>Nombre:</strong> ${client.name}</p><p><strong>Teléfono:</strong> ${client.phone || "—"}</p><p><strong>Email:</strong> ${client.email || "—"}</p><p><strong>Notas:</strong> ${client.notes || "—"}</p></section><section class="box"><div class="label">Órdenes / visitas</div><table><thead><tr><th>Orden</th><th>Servicio</th><th>Estado</th><th>Pago</th><th>Total</th></tr></thead><tbody>${orders.length ? orders.map((order) => `<tr><td>${order.id}</td><td>${order.service}</td><td>${order.status}</td><td>${order.payment}</td><td>${currency(order.total)}</td></tr>`).join("") : `<tr><td colspan="5">Sin órdenes registradas.</td></tr>`}</tbody></table></section><footer class="footer"><span>Generado con Nexo Management</span><span>${client.id}</span></footer></div></main><button class="printBtn" onclick="window.print()">Imprimir / Guardar PDF</button></body></html>`;

  const win = window.open("", "_blank");
  if (!win) {
    notify("El navegador bloqueó la apertura del registro. Permití ventanas emergentes.");
    return;
  }
  win.document.write(html);
  win.document.close();
}

function openMonthlyReport({ data, month }) {
  const monthOrders = data.orders.filter((order) => monthKey(order.date) === month.key);
  const total = monthOrders.reduce((sum, order) => sum + order.total, 0);
  const paid = monthOrders.reduce((sum, order) => sum + getPaidAmount(order), 0);
  const pending = total - paid;
  const businessName = data.business.name || "Nexo Management";

  const html = `<!doctype html><html><head><meta charset="UTF-8"><title>Resumen ${month.label}</title><style>body{font-family:Arial;margin:40px;color:#111827}.head{border-bottom:2px solid #111827;padding-bottom:20px;display:flex;justify-content:space-between}.label{text-transform:uppercase;letter-spacing:3px;font-size:12px;font-weight:900;color:#374151}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:30px 0}.card{border:1px solid #d1d5db;border-radius:16px;padding:18px;background:#f9fafb}table{width:100%;border-collapse:collapse;margin-top:25px}th{background:#111827;color:white;text-align:left;padding:12px}td{border-bottom:1px solid #e5e7eb;padding:12px}.print{position:fixed;right:24px;bottom:24px;border:0;border-radius:12px;background:#111827;color:white;padding:12px 18px;font-weight:800}@media print{.print{display:none}}</style></head><body><div class="head"><div><div class="label">Resumen mensual</div><h1>${businessName}</h1><p>${month.label}</p></div><div style="text-align:right"><h2>${currency(total)}</h2><p>Total facturado</p></div></div><div class="cards"><div class="card"><strong>Facturado</strong><h2>${currency(total)}</h2></div><div class="card"><strong>Cobrado</strong><h2>${currency(paid)}</h2></div><div class="card"><strong>Pendiente</strong><h2>${currency(pending)}</h2></div></div><table><thead><tr><th>Orden</th><th>Cliente</th><th>Servicio</th><th>Estado</th><th>Pago</th><th>Total</th></tr></thead><tbody>${monthOrders.length ? monthOrders.map((order) => `<tr><td>${order.id}</td><td>${order.client}</td><td>${order.service}</td><td>${order.status}</td><td>${order.payment}</td><td>${currency(order.total)}</td></tr>`).join("") : `<tr><td colspan="6">Sin órdenes en este mes.</td></tr>`}</tbody></table><button class="print" onclick="window.print()">Imprimir / Guardar PDF</button></body></html>`;
  const win = window.open("", "_blank");
  if (!win) {
    notify("El navegador bloqueó la apertura del resumen mensual. Permití ventanas emergentes.");
    return;
  }
  win.document.write(html);
  win.document.close();
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    surname: "",
    taxId: "",
    phone: "",
    email: "",
    password: "",
    business: "",
  });

  function submit(e) {
    e.preventDefault();
    setError("");
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const accounts = readJSON(ACCOUNTS_KEY, []);

    if (!email || !password) {
      setError("Completá email y contraseña.");
      return;
    }

    if (mode === "register") {
      if (!form.name.trim() || !form.surname.trim()) {
        setError("Completá nombre y apellido.");
        return;
      }
      if (!isValidPhone(form.phone)) {
        setError("El teléfono debe tener entre 8 y 15 números.");
        return;
      }
      if (accounts.some((account) => account.email === email)) {
        setError("Ya existe una cuenta con ese email.");
        return;
      }

      const account = {
        name: toTitleCase(form.name),
        surname: toTitleCase(form.surname),
        taxId: onlyDigits(form.taxId),
        phone: onlyDigits(form.phone),
        email,
        password,
        createdAt: new Date().toISOString(),
      };
      const data = {
        ...emptyData,
        profile: {
          name: account.name,
          surname: account.surname,
          taxId: account.taxId,
          phone: account.phone,
          email,
        },
        business: {
          ...emptyData.business,
          name: form.business.trim(),
        },
        history: [
          {
            id: createId("HIS"),
            type: "Sistema",
            title: "Cuenta creada",
            description: "Se creó el espacio de trabajo.",
            date: new Date().toISOString(),
          },
        ],
      };
      writeJSON(ACCOUNTS_KEY, [account, ...accounts]);
      writeJSON(dataKey(email), data);
      writeJSON(SESSION_KEY, { email });
      notify("Cuenta creada correctamente.");
      onLogin(account, data);
      return;
    }

    const account = accounts.find((item) => item.email === email && item.password === password);
    if (!account) {
      setError("Email o contraseña incorrectos.");
      return;
    }
    const data = readJSON(dataKey(email), emptyData);
    writeJSON(SESSION_KEY, { email });
    notify("Sesión iniciada correctamente.");
    onLogin(account, data);
  }

  async function loginWithGoogle() {
    try {
      const [{ auth, googleProvider }, { signInWithPopup }] = await Promise.all([
        import("./firebase"),
        import("firebase/auth"),
      ]);

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const email = user.email?.toLowerCase();
      if (!email) return notify("No se pudo obtener el email de Google.");

      const accounts = readJSON(ACCOUNTS_KEY, []);
      let account = accounts.find((item) => item.email === email);
      let data = readJSON(dataKey(email), null);

      if (!account) {
        const parts = (user.displayName || "Usuario Google").split(" ");
        account = {
          name: toTitleCase(parts[0] || "Usuario"),
          surname: toTitleCase(parts.slice(1).join(" ") || "Google"),
          taxId: "",
          phone: "",
          email,
          password: "google-auth",
          provider: "google",
          createdAt: new Date().toISOString(),
        };

        data = {
          ...emptyData,
          profile: {
            name: account.name,
            surname: account.surname,
            taxId: "",
            phone: "",
            email,
          },
          history: [
            {
              id: createId("HIS"),
              type: "Sistema",
              title: "Cuenta creada con Google",
              description: "Se creó el espacio de trabajo usando inicio de sesión con Google.",
              date: new Date().toISOString(),
            },
          ],
        };

        writeJSON(ACCOUNTS_KEY, [account, ...accounts]);
        writeJSON(dataKey(email), data);
      }

      writeJSON(SESSION_KEY, { email });
      notify("Sesión iniciada con Google.");
      onLogin(account, data || emptyData);
    } catch (error) {
  console.error("Error Google Auth:", error);
  notify(error.code || error.message || "Error al iniciar sesión con Google.");
}
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#080808] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-start gap-8 px-4 py-8 sm:px-5 sm:py-12 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-16">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-400 sm:px-4 sm:text-sm">Sistema web de gestión operativa</div>
          <h1 className="break-words text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-7xl">Nexo Management<span className="text-zinc-600">.</span></h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400 sm:mt-7 sm:text-lg sm:leading-8">Centralizá clientes, presupuestos, órdenes, pagos, historial y resumen mensual desde una interfaz profesional, clara y funcional.</p>
        </div>

        <Panel className="p-4 sm:p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-600">{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{mode === "login" ? "Entrá a tu espacio" : "Creá tu espacio de trabajo"}</h2>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" && (
              <>
                <Input label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: toTitleCase(v) })} />
                <Input label="Apellido" value={form.surname} onChange={(v) => setForm({ ...form, surname: toTitleCase(v) })} />
                <Input label="CUIT / CUIL" value={form.taxId} onChange={(v) => setForm({ ...form, taxId: onlyDigits(v) })} />
                <Input label="Teléfono" placeholder="Solo números: 8 a 15 dígitos" value={form.phone} onChange={(v) => setForm({ ...form, phone: onlyDigits(v) })} />
                <Input label="Nombre del negocio" value={form.business} onChange={(v) => setForm({ ...form, business: v })} />
              </>
            )}
            <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Input label="Contraseña" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
            {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm text-red-300">{error}</div>}
            <button
              type="button"
              onClick={loginWithGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.08]"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-black">G</span>
              Continuar con Google
            </button>
            <PrimaryButton type="submit" className="w-full">{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</PrimaryButton>
          </form>
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="mt-5 w-full text-center text-sm text-zinc-500 transition hover:text-zinc-200">
            {mode === "login" ? "No tengo cuenta, crear una" : "Ya tengo cuenta, iniciar sesión"}
          </button>
        </Panel>
      </div>
    </main>
  );
}

function Sidebar({ active, setActive, data }) {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-white/10 bg-[#090909]/95 p-5 backdrop-blur-xl lg:block">
      <div className="mb-9 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] font-mono text-lg text-white">NM</div>
        <div>
          <p className="font-semibold text-white">{data.business.name || "Nexo Management"}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">Sistema web de gestión operativa</p>
        </div>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setActive(item.id)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm transition ${active === item.id ? "border border-white/10 bg-white/[0.08] text-white" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"}`}>
            <span className="font-mono text-sm">{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function Topbar({ search, setSearch, active, setActive, account, data, onLogout }) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const fullName = formatFullName(data.profile) || `${account.name || ""} ${account.surname || ""}`.trim();
  const initials = fullName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "NM";

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuClosing(true);
    window.setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
    }, 220);
  }

  function openMenu() {
    setMenuClosing(false);
    setMenuOpen(true);
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080808]/75 px-5 py-3 backdrop-blur-xl lg:px-8">
      <div className="flex flex-row items-center gap-3 md:justify-between">
        <button
          onClick={() => {
            if (menuOpen) closeMenu();
            else openMenu();
          }}
          className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border transition lg:hidden ${menuOpen ? "border-white/20 bg-white/[0.1]" : "border-white/10 bg-white/[0.06]"}`}
          aria-label="Abrir menú"
        >
          <span className="h-0.5 w-5 rounded-full bg-zinc-200" />
          <span className="h-0.5 w-5 rounded-full bg-zinc-200" />
          <span className="h-0.5 w-5 rounded-full bg-zinc-200" />
        </button>
        <div className="min-w-0 flex-1 md:max-w-xl">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar clientes, presupuestos, órdenes, pagos..." className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/25" />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-300 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-400" />Sistema activo</div>
          <div className="relative">
            <button onClick={() => { setOpen(!open); if (menuOpen) closeMenu(); }} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] font-mono text-sm text-white">{initials}</button>
            {open && (
              <div className="absolute right-0 top-14 w-[min(18rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-zinc-950 p-3 shadow-2xl shadow-black/60">
                <div className="border-b border-white/10 p-3"><p className="font-medium text-white">{fullName}</p><p className="mt-1 text-sm text-zinc-500">{data.profile.email || account.email}</p></div>
                <button onClick={() => { setActive("settings"); setOpen(false); }} className="mt-3 w-full rounded-2xl px-3 py-2 text-left text-sm text-zinc-400 hover:bg-white/[0.06] hover:text-white">Configuración</button>
                <button onClick={onLogout} className="w-full rounded-2xl px-3 py-2 text-left text-sm text-red-300 hover:bg-red-400/10">Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {menuOpen && (
        <div className={`fixed inset-0 z-[120] bg-black/55 backdrop-blur-md lg:hidden ${menuClosing ? "nm-menu-overlay-out" : "nm-menu-overlay-in"}`} onMouseDown={closeMenu}>
          <aside
            className={`min-h-screen h-dvh w-[min(20rem,86vw)] overflow-y-auto border-r border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/80 ${menuClosing ? "nm-menu-drawer-out" : "nm-menu-drawer-in"}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-7 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] font-mono text-lg text-white">NM</div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{data.business.name || "Nexo Management"}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">Menú</p>
                </div>
              </div>
              <button onClick={closeMenu} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-xl leading-none text-zinc-200">×</button>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActive(item.id);
                    closeMenu();
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${active === item.id ? "border border-white/10 bg-white/[0.1] text-white" : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"}`}
                >
                  <span className="font-mono text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
}

function StatCard({ label, value, meta, icon }) {
  return (
    <Panel className="h-full p-5 transition hover:-translate-y-1 hover:bg-zinc-900/80">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm text-zinc-500">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight text-white">{value}</p><p className="mt-2 text-xs text-zinc-500">{meta}</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] font-mono text-zinc-300">{icon}</div></div>
    </Panel>
  );
}

function DashboardDetailModal({ type, data, orders, onClose }) {
  const [page, setPage] = useState(1);
  const perPage = 8;

  if (!type) return null;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthOrders = orders.filter((order) => monthKey(order.date) === currentMonth);
  const pendingOrders = monthOrders.filter((order) => order.status === "Pendiente");
  const pendingBalances = monthOrders.filter((order) => getPendingAmount(order) > 0);
  const overdueOrders = orders.filter(isOrderOverdue);
  const openBalances = orders.filter((order) => getPendingAmount(order) > 0);

  const config = {
    clients: {
      title: "Clientes registrados",
      text: "Listado general de clientes cargados en el sistema.",
      rows: data.clients,
    },
    pendingOrders: {
      title: "Órdenes pendientes",
      text: "Órdenes del mes que todavía no fueron terminadas.",
      rows: pendingOrders,
    },
    income: {
      title: "Ingresos registrados del mes",
      text: "Órdenes cargadas durante el mes actual.",
      rows: monthOrders,
    },
    pendingBalance: {
      title: "Saldos pendientes del mes",
      text: "Órdenes con dinero pendiente de cobro durante el mes actual.",
      rows: pendingBalances,
    },
    overdueOrders: {
      title: "Órdenes atrasadas",
      text: `Órdenes pendientes con más de ${ORDER_OVERDUE_DAYS} días abiertas.`,
      rows: overdueOrders,
    },
    openBalances: {
      title: "Cobros pendientes",
      text: "Órdenes abiertas o terminadas que todavía tienen saldo por cobrar.",
      rows: openBalances,
    },
  }[type];

  const totalPages = Math.max(Math.ceil(config.rows.length / perPage), 1);
  const visibleRows = config.rows.slice((page - 1) * perPage, page * perPage);

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm lg:pl-72"
      onMouseDown={onClose}
    >
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="max-h-[78vh] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-2xl shadow-black/70"
        >
          <div className="flex items-start justify-between gap-5 border-b border-white/10 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-600">
                Detalle
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {config.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">{config.text}</p>
            </div>

            <button
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-zinc-300 transition hover:text-white"
            >
              Cerrar
            </button>
          </div>

          <div className="max-h-[56vh] overflow-auto p-5">
            {config.rows.length === 0 ? (
              <EmptyState
                title="Sin datos"
                text="No hay información para mostrar en este apartado."
              />
            ) : type === "clients" ? (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-zinc-600">
                  <tr>
                    <th className="px-4 py-2.5">Cliente</th>
                    <th className="px-4 py-2.5">Teléfono</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {visibleRows.map((client) => (
                    <tr key={client.id} className="hover:bg-white/[0.035]">
                      <td className="px-4 py-2.5 font-medium text-white">
                        {client.name}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-400">
                        {client.phone || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500">
                        {client.email || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500">
                        {client.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-zinc-600">
                  <tr>
                    <th className="px-4 py-2.5">Orden</th>
                    <th className="px-4 py-2.5">Cliente</th>
                    <th className="px-4 py-2.5">Servicio</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-4 py-2.5">Pago</th>
                    <th className="px-4 py-2.5">Pagado</th>
                    <th className="px-4 py-2.5">Pendiente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {visibleRows.map((order) => (
                    <tr key={order.id} className="hover:bg-white/[0.035]">
                      <td className="px-4 py-2.5 font-mono text-zinc-300">
                        {order.id}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-white">
                        {order.client}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500">
                        {order.service}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={statusTone(order.status)}>{order.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={statusTone(order.payment)}>{order.payment}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-300">
                        {currency(getPaidAmount(order))}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-300">
                        {currency(getPendingAmount(order))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {config.rows.length > perPage && (
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-sm text-zinc-500">
              <span>
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <SecondaryButton onClick={() => setPage(Math.max(page - 1, 1))}>
                  Anterior
                </SecondaryButton>
                <SecondaryButton onClick={() => setPage(Math.min(page + 1, totalPages))}>
                  Siguiente
                </SecondaryButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ data, setData }) {
  const [detail, setDetail] = useState(null);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthLabel = currentMonthLabel();
  const monthOrders = data.orders.filter((order) => monthKey(order.date) === currentMonth);
  const totalRevenue = monthOrders.reduce((sum, order) => sum + order.total, 0);
  const paidRevenue = monthOrders.reduce((sum, order) => sum + getPaidAmount(order), 0);
  const pendingRevenue = monthOrders.reduce((sum, order) => sum + getPendingAmount(order), 0);
  const paidPercent = totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0;
  const pendingOrders = monthOrders.filter((order) => order.status === "Pendiente").length;
  const overdueOrders = data.orders.filter(isOrderOverdue);
  const openBalances = data.orders.filter((order) => getPendingAmount(order) > 0);
  const totalOpenBalance = openBalances.reduce((sum, order) => sum + getPendingAmount(order), 0);
  const priorityOrders = [...overdueOrders, ...openBalances.filter((order) => !overdueOrders.some((overdue) => overdue.id === order.id))].slice(0, 5);
  const bars = buildMonthlyBars(data.orders);

  return (
    <div className="space-y-6">
      <DashboardDetailModal type={detail} data={data} orders={data.orders} onClose={() => setDetail(null)} />
      <PageHeader label="Dashboard" title="Resumen general" text={`Vista mensual del estado operativo, financiero y comercial de ${monthLabel}.`} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button onClick={() => setDetail("clients")} className="h-full w-full text-left"><StatCard label="Clientes" value={data.clients.length} meta="Base comercial" icon="CL" /></button>
        <button onClick={() => setDetail("pendingOrders")} className="h-full w-full text-left"><StatCard label="Órdenes pendientes" value={pendingOrders} meta="Trabajos pendientes del mes" icon="OR" /></button>
        <button onClick={() => setDetail("overdueOrders")} className="h-full w-full text-left"><StatCard label="Atrasadas" value={overdueOrders.length} meta={`Pendientes +${ORDER_OVERDUE_DAYS} días`} icon="AT" /></button>
        <button onClick={() => setDetail("openBalances")} className="h-full w-full text-left"><StatCard label="Por cobrar" value={currency(totalOpenBalance)} meta="Saldo pendiente total" icon="PG" /></button>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel className="p-6"><div className="mb-8 flex items-center justify-between"><div><h3 className="text-xl font-semibold text-white">Ingresos mensuales</h3><p className="mt-1 text-sm text-zinc-500">Evolución visual basada en órdenes reales.</p></div><Badge>{monthLabel}</Badge></div><div className="flex h-72 items-end gap-3">{bars.map((bar) => <div key={bar.key} className="flex flex-1 flex-col items-center gap-3"><button onClick={() => openMonthlyReport({ data, month: bar })} className="flex h-56 w-full items-end rounded-2xl bg-white/[0.035] p-1 transition hover:bg-white/[0.06]"><div className="w-full rounded-xl bg-gradient-to-t from-zinc-500 to-zinc-100" style={{ height: `${Math.max(bar.percent, 4)}%` }} /></button><span className="text-xs text-zinc-600">{bar.label}</span></div>)}</div></Panel>
        <Panel className="p-6"><div className="flex items-center justify-between gap-4"><div><h3 className="text-xl font-semibold text-white">Estado de cobro</h3><p className="mt-1 text-sm text-zinc-500">Pagado real vs pendiente real.</p></div><Badge>{monthLabel}</Badge></div><div className="mt-8 flex justify-center"><div className="relative flex h-44 w-44 items-center justify-center rounded-full" style={{ background: `conic-gradient(rgb(228 228 231) ${paidPercent}%, rgb(63 63 70) ${paidPercent}% 100%)` }}><div className="flex h-28 w-28 items-center justify-center rounded-full bg-zinc-950 text-center"><div><p className="text-3xl font-semibold text-white">{paidPercent}%</p><p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Cobrado</p></div></div></div></div><div className="mt-8 space-y-3"><PaymentLine label="Pagado" value={paidRevenue} /><PaymentLine label="Pendiente" value={pendingRevenue} /></div></Panel>
      </div>
      <Panel className="overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <h3 className="text-xl font-semibold text-white">Acciones prioritarias</h3>
          <p className="mt-1 text-sm text-zinc-500">Órdenes atrasadas o con saldo pendiente para resolver primero.</p>
        </div>
        {priorityOrders.length === 0 ? (
          <EmptyState title="Sin pendientes críticos" text="No hay órdenes atrasadas ni saldos abiertos para priorizar." />
        ) : (
          <div className="divide-y divide-white/10">
            {priorityOrders.map((order) => (
              <div key={order.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={isOrderOverdue(order) ? "amber" : "neutral"}>{isOrderOverdue(order) ? "Atrasada" : "Cobro pendiente"}</Badge>
                    <span className="font-mono text-sm text-zinc-400">{order.id}</span>
                    <span className="font-medium text-white">{order.client}</span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-500">{order.service} · {dateLabel(order.date)} · resta {currency(getPendingAmount(order))}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.status === "Pendiente" && <SecondaryButton onClick={() => finishOrder(data, setData, order.id)}>Terminar</SecondaryButton>}
                  {order.payment !== "Pagado" && <SecondaryButton onClick={() => markPaid(data, setData, order.id)}>Marcar pagada</SecondaryButton>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <OrdersTable orders={monthOrders.slice(0, 5)} compact data={data} onFinish={(id) => finishOrder(data, setData, id)} onPay={(id) => markPaid(data, setData, id)} />
    </div>
  );
}

function PaymentLine({ label, value }) {
  return <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5"><span className="text-sm text-zinc-300">{label}</span><span className="text-sm font-medium text-white">{currency(value)}</span></div>;
}

function buildMonthlyBars(orders) {
  const now = new Date();
  const months = Array.from({ length: 8 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (7 - i), 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
    const total = orders.filter((o) => monthKey(o.date) === key).reduce((s, o) => s + o.total, 0);
    return { key, label, total };
  });
  const max = Math.max(...months.map((m) => m.total), 1);
  return months.map((m) => ({ ...m, percent: Math.round((m.total / max) * 100) }));
}

function ClientListModal({ data, clients, onClose, onEdit, onDelete, onView }) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const perPage = 8;

  const filteredClients = clients
    .filter((client) =>
      [client.id, client.name, client.phone, client.email, client.notes]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "recent") return String(b.id).localeCompare(String(a.id));
      if (sort === "oldest") return String(a.id).localeCompare(String(b.id));
      if (sort === "az") return String(a.name || "").localeCompare(String(b.name || ""));
      return 0;
    });

  const totalPages = Math.max(Math.ceil(filteredClients.length / perPage), 1);
  const visible = filteredClients.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm lg:pl-72" onMouseDown={onClose}>
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div onMouseDown={(e) => e.stopPropagation()} className="max-h-[78vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-2xl shadow-black/70">
          <div className="flex items-start justify-between gap-5 border-b border-white/10 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-600">Clientes</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Todos los clientes registrados</h2>
              <p className="mt-2 text-sm text-zinc-500">Abrí el registro, editá o eliminá clientes desde este panel.</p>
              <button
                onClick={() => openClientsListDocument({ data, clients: filteredClients })}
                className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.08]"
              >
                Descargar lista de clientes
              </button>
              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar cliente, teléfono, email o nota..."
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-white/25"
                />
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none"
                >
                  <option className="bg-zinc-950" value="recent">Más reciente</option>
                  <option className="bg-zinc-950" value="oldest">Más antiguo</option>
                  <option className="bg-zinc-950" value="az">Alfabético</option>
                </select>
              </div>
            </div>
            <button onClick={onClose} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-zinc-300 transition hover:text-white">Cerrar</button>
          </div>

          <div className="max-h-[56vh] overflow-auto p-5">
            {filteredClients.length === 0 ? (
              <EmptyState title="Sin clientes" text="Todavía no hay clientes registrados." />
            ) : (
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-zinc-600">
                  <tr><th className="px-4 py-2.5">Cliente</th><th className="px-4 py-2.5">Teléfono</th><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5">Notas</th><th className="px-4 py-2.5">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {visible.map((client) => (
                    <tr key={client.id} className="transition hover:bg-white/[0.035]">
                      <td className="px-4 py-2.5"><button onClick={() => onView(client)} className="font-medium text-white hover:underline">{client.name}</button><p className="mt-1 text-xs text-zinc-600">{client.id}</p></td>
                      <td className="px-4 py-2.5 text-zinc-400">{client.phone || "—"}</td>
                      <td className="px-4 py-2.5 text-zinc-500">{client.email || "—"}</td>
                      <td className="px-4 py-2.5 text-zinc-500">{client.notes || "—"}</td>
                      <td className="px-4 py-2.5"><div className="flex flex-nowrap gap-1.5"><SecondaryButton onClick={() => onView(client)}>Registro</SecondaryButton><SecondaryButton onClick={() => onEdit(client)}>Editar</SecondaryButton><SecondaryButton onClick={() => onDelete(client.id)}>Eliminar</SecondaryButton></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {filteredClients.length > perPage && (
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-sm text-zinc-500">
              <span>Página {page} de {totalPages}</span>
              <div className="flex gap-2"><SecondaryButton onClick={() => setPage(Math.max(page - 1, 1))}>Anterior</SecondaryButton><SecondaryButton onClick={() => setPage(Math.min(page + 1, totalPages))}>Siguiente</SecondaryButton></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Clients({ data, setData, search }) {
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [internalSearch, setInternalSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const perPage = 8;
  const filtered = data.clients
    .filter((client) =>
      [client.id, client.name, client.phone, client.email, client.notes]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .filter((client) =>
      [client.id, client.name, client.phone, client.email, client.notes]
        .join(" ")
        .toLowerCase()
        .includes(internalSearch.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "recent") return String(b.id).localeCompare(String(a.id));
      if (sort === "oldest") return String(a.id).localeCompare(String(b.id));
      if (sort === "az") return String(a.name || "").localeCompare(String(b.name || ""));
      return 0;
    });
  const totalPages = Math.max(Math.ceil(filtered.length / perPage), 1);
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  function reset() { setEditing(null); setForm({ name: "", phone: "", email: "", notes: "" }); }
  function startEdit(client) {
    setEditing(client.id);
    setForm({ name: client.name, phone: client.phone || "", email: client.email || "", notes: client.notes || "" });
    setShowAll(false);
  }
  function viewRecord(client) {
    openClientRecord({ data, client });
  }
  function submit(e) {
    e.preventDefault();
    const nextClient = {
      name: form.name.trim().replace(/\s+/g, " "),
      phone: onlyDigits(form.phone),
      email: normalizeEmail(form.email),
      notes: form.notes.trim(),
    };
    if (!nextClient.name) return notify("Completá el nombre del cliente.");
    if (nextClient.phone && !isValidPhone(nextClient.phone)) return notify("El teléfono debe tener entre 8 y 15 números.");
    if (nextClient.email && !isValidEmail(nextClient.email)) return notify("Ingresá un email válido o dejalo vacío.");
    const duplicate = findDuplicateClient(data.clients, nextClient, editing);
    if (duplicate) return notify(`Ya existe un cliente similar: ${duplicate.name}. Revisá nombre, teléfono o email.`);
    if (editing) {
      setData((prev) =>
        addHistory(
          { ...prev, clients: prev.clients.map((c) => (c.id === editing ? { ...c, ...nextClient, lastContact: todayISO() } : c)) },
          "Cliente",
          "Cliente actualizado",
          `${nextClient.name} (${nextClient.phone || nextClient.email || "sin contacto"})`
        )
      );
      notify("Cliente actualizado correctamente.");
      reset();
      return;
    }
    const client = { id: createId("CLI"), ...nextClient, lastContact: todayISO() };
    setData((prev) =>
      addHistory(
        { ...prev, clients: [client, ...prev.clients] },
        "Cliente",
        "Cliente creado",
        `${client.name} (${client.phone || client.email || "sin contacto"})`
      )
    );
    notify("Cliente creado correctamente.");
    reset();
    setPage(1);
  }
  async function remove(id) {
    const client = data.clients.find((c) => c.id === id);
    const relatedOrders = data.orders.filter((order) => order.client === client?.name).length;
    const relatedBudgets = data.budgets.filter((budget) => budget.client === client?.name).length;
    const detail = relatedOrders || relatedBudgets ? ` Tiene ${relatedOrders} órdenes y ${relatedBudgets} presupuestos asociados que no se eliminan.` : "";
    if (!(await confirmAction(`¿Eliminar a ${client?.name || "este cliente"}?${detail}`))) return;
    setData((prev) =>
      addHistory(
        { ...prev, clients: prev.clients.filter((c) => c.id !== id) },
        "Cliente",
        "Cliente eliminado",
        `${client?.name || id}${detail}`
      )
    );
    notify("Cliente eliminado correctamente.");
  }

  return <div className="space-y-6">{showAll && <ClientListModal data={data} clients={filtered} onClose={() => setShowAll(false)} onEdit={startEdit} onDelete={remove} onView={viewRecord} />}<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><PageHeader label="Clientes" title="Gestión de clientes" text="Registro simple de clientes para asociarlos a presupuestos, órdenes y pagos." /><PrimaryButton onClick={() => openClientsListDocument({ data, clients: filtered })}>Descargar listado de clientes</PrimaryButton></div><div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]"><Panel className="p-4 sm:p-6"><h3 className="text-xl font-semibold text-white">{editing ? "Editar cliente" : "Nuevo cliente"}</h3><form onSubmit={submit} className="mt-6 space-y-4"><Input label="Empresa / Cliente" value={form.name} onChange={(v) => setForm({ ...form, name: v })} /><Input label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: onlyDigits(v) })} placeholder="Solo números: 8 a 15 dígitos" /><Input label="Email" placeholder="Opcional" value={form.email} onChange={(v) => setForm({ ...form, email: v })} /><Input label="Notas" placeholder="Opcional" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} /><div className="flex flex-col gap-3 sm:flex-row"><PrimaryButton type="submit" className="flex-1">{editing ? "Guardar cambios" : "Agregar cliente"}</PrimaryButton>{editing && <SecondaryButton onClick={reset} className="px-4 py-2.5 text-sm">Cancelar</SecondaryButton>}</div></form></Panel><Panel className="overflow-hidden"><div className="border-b border-white/10 p-4 sm:p-5"><h3 className="text-xl font-semibold text-white">Clientes registrados</h3><p className="mt-1 text-sm text-zinc-500">{filtered.length} resultados visibles</p><div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]"><input value={internalSearch} onChange={(e) => { setInternalSearch(e.target.value); setPage(1); }} placeholder="Buscar cliente, teléfono, email o nota..." className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-white/25" /><select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none"><option className="bg-zinc-950" value="recent">Más reciente</option><option className="bg-zinc-950" value="oldest">Más antiguo</option><option className="bg-zinc-950" value="az">Alfabético</option></select></div></div>{filtered.length === 0 ? <EmptyState title="Sin clientes cargados" text="Agregá tu primer cliente para empezar." /> : <><div className="grid gap-3 p-4 md:hidden">{visible.map((client) => <div key={client.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><button onClick={() => openClientRecord({ data, client })} className="break-words text-left font-medium text-white">{client.name}</button><p className="mt-1 font-mono text-xs text-zinc-600">{client.id}</p></div></div><div className="mt-4 grid gap-3"><MobileField label="Teléfono" value={client.phone} /><MobileField label="Email" value={client.email} /><MobileField label="Notas" value={client.notes} /></div><div className="mt-4 grid grid-cols-2 gap-2"><SecondaryButton onClick={() => viewRecord(client)} className="px-3 py-2.5 text-xs">Registro</SecondaryButton><SecondaryButton onClick={() => startEdit(client)} className="px-3 py-2.5 text-xs">Editar</SecondaryButton><SecondaryButton onClick={() => remove(client.id)} className="col-span-2 px-3 py-2.5 text-xs">Eliminar</SecondaryButton></div></div>)}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-zinc-600"><tr><th className="px-4 py-2.5">Cliente</th><th className="px-4 py-2.5">Teléfono</th><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5">Notas</th><th className="px-4 py-2.5">Acciones</th></tr></thead><tbody className="divide-y divide-white/10">{visible.map((client) => <tr key={client.id} className="transition hover:bg-white/[0.035]"><td className="px-4 py-2.5"><button onClick={() => openClientRecord({ data, client })} className="font-medium text-white hover:underline">{client.name}</button><p className="mt-1 text-xs text-zinc-600">{client.id}</p></td><td className="px-4 py-2.5 text-zinc-400">{client.phone || "—"}</td><td className="px-4 py-2.5 text-zinc-500">{client.email || "—"}</td><td className="px-4 py-2.5 text-zinc-500">{client.notes || "—"}</td><td className="px-4 py-2.5"><div className="flex flex-wrap gap-2"><SecondaryButton onClick={() => viewRecord(client)}>Ver registro</SecondaryButton><SecondaryButton onClick={() => startEdit(client)}>Editar</SecondaryButton><SecondaryButton onClick={() => remove(client.id)}>Eliminar</SecondaryButton></div></td></tr>)}</tbody></table></div><div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-5"><span>Página {page} de {totalPages}</span><div className="flex gap-2"><SecondaryButton onClick={() => setPage(Math.max(page - 1, 1))}>Anterior</SecondaryButton><SecondaryButton onClick={() => setPage(Math.min(page + 1, totalPages))}>Siguiente</SecondaryButton></div></div></>}</Panel></div></div>;
}

function Budgets({ data, setData, search }) {
  const [editing, setEditing] = useState(null);
  const [showServices, setShowServices] = useState(false);
  const [page, setPage] = useState(1);
  const [internalSearch, setInternalSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [form, setForm] = useState({ client: data.clients[0]?.name || "", service: "", amount: "", observations: "" });
  const perPage = 8;
  const filtered = data.budgets
    .filter((b) =>
      [b.id, b.client, b.service, b.observations]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .filter((b) =>
      [b.id, b.client, b.service, b.observations]
        .join(" ")
        .toLowerCase()
        .includes(internalSearch.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "recent") return String(b.id).localeCompare(String(a.id));
      if (sort === "oldest") return String(a.id).localeCompare(String(b.id));
      if (sort === "az") return String(a.service || "").localeCompare(String(b.service || ""));
      return 0;
    });
  const totalPages = Math.max(Math.ceil(filtered.length / perPage), 1);
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  function reset() {
    setEditing(null);
    setForm({ client: data.clients[0]?.name || "", service: "", amount: "", observations: "" });
  }

  function submit(e) {
    e.preventDefault();
    const amount = parseARS(form.amount);
    const clientName = form.client.trim();
    const serviceName = form.service.trim();
    if (!clientName || !serviceName || !form.amount) return notify("Completá cliente, servicio e importe.");
    if (!getClient(data, form.client)) return notify("Elegí un cliente existente o cargalo primero.");
    if (amount <= 0) return notify("El importe del presupuesto debe ser mayor a cero.");

    if (editing) {
      setData((prev) =>
        addHistory(
          { ...prev, budgets: prev.budgets.map((b) => (b.id === editing ? { ...b, client: clientName, service: serviceName, amount, observations: form.observations.trim() } : b)) },
          "Presupuesto",
          "Presupuesto actualizado",
          `${editing} · ${clientName} · ${currency(amount)}`
        )
      );
      notify("Presupuesto actualizado correctamente.");
      reset();
      return;
    }

    const budget = { id: createId("PRE"), client: clientName, service: serviceName, amount, observations: form.observations.trim(), status: "Pendiente", date: todayISO() };
    setData((prev) => addHistory({ ...prev, budgets: [budget, ...prev.budgets] }, "Presupuesto", "Presupuesto creado", `${budget.id} · ${budget.client}`));
    notify("Presupuesto creado correctamente.");
    reset();
    setPage(1);
  }

  async function remove(id) {
    const budget = data.budgets.find((item) => item.id === id);
    if (!(await confirmAction(`¿Eliminar el presupuesto ${id} de ${budget?.client || "este cliente"}?`))) return;
    setData((prev) => addHistory({ ...prev, budgets: prev.budgets.filter((b) => b.id !== id) }, "Presupuesto", "Presupuesto eliminado", id));
    notify("Presupuesto eliminado correctamente.");
  }

  async function convertToOrder(budget) {
    if ((budget.status || "Pendiente") === "Convertido") {
      return notify("Este presupuesto ya fue convertido en orden.");
    }
    if (!getClient(data, budget.client)) return notify("El cliente del presupuesto ya no existe. Revisá el presupuesto antes de convertirlo.");
    if (Number(budget.amount || 0) <= 0) return notify("El presupuesto no tiene un importe válido para convertir.");
    if (!(await confirmAction(`Convertir ${budget.id} en una orden pendiente por ${currency(budget.amount)}?`))) return;

    const order = {
      id: createId("ORD"),
      client: budget.client,
      service: budget.service,
      total: Number(budget.amount),
      paidAmount: 0,
      observations: budget.observations || "",
      status: "Pendiente",
      payment: "Pendiente",
      date: todayISO(),
      sourceBudgetId: budget.id,
    };

    setData((prev) =>
      addHistory(
        {
          ...prev,
          budgets: prev.budgets.map((item) => (item.id === budget.id ? { ...item, status: "Convertido", convertedOrderId: order.id } : item)),
          orders: [order, ...prev.orders],
        },
        "Orden",
        "Presupuesto convertido en orden",
        `${budget.id} → ${order.id} · ${budget.client} · ${currency(order.total)}`
      )
    );
    notify("Presupuesto convertido en orden.");
  }

  return (
    <div className="space-y-6">
      <PageHeader label="Presupuestos" title="Generador de presupuestos" text="Creá presupuestos simples para clientes, sin mezclarlos con órdenes reales." />
      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <Panel className="p-4 sm:p-6">
          <h3 className="text-xl font-semibold text-white">{editing ? "Editar presupuesto" : "Nuevo presupuesto"}</h3>
          {data.clients.length === 0 ? (
            <EmptyState title="Primero cargá un cliente" text="Los presupuestos necesitan un cliente asociado." />
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <ClientPicker label="Cliente" value={form.client} onChange={(v) => setForm({ ...form, client: v })} clients={data.clients} />
              <div className="relative">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input label="Servicio" value={form.service} onChange={(v) => setForm({ ...form, service: v })} />
                  </div>
                  <button type="button" onClick={() => setShowServices(!showServices)} title="Servicios frecuentes" className="mt-7 h-11 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-zinc-300 transition hover:text-white">⋯</button>
                </div>
                {showServices && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 p-3 shadow-2xl shadow-black/60">
                    <div className="border-b border-white/10 px-3 pb-3">
                      <p className="text-sm font-medium text-white">Servicios frecuentes</p>
                      <p className="mt-1 text-xs text-zinc-500">Elegí un servicio guardado para cargarlo rápido.</p>
                    </div>
                    {(data.frequentServices || []).length === 0 ? (
                      <p className="px-3 py-3 text-sm text-zinc-500">No hay servicios frecuentes guardados.</p>
                    ) : (
                      (data.frequentServices || []).map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => {
                            setForm({
                              ...form,
                              service: service.name,
                              amount: service.suggestedPrice ? formatARSInput(service.suggestedPrice) : form.amount,
                            });
                            setShowServices(false);
                          }}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                        >
                          <span>{service.name}</span>
                          <span className="text-zinc-500">{service.suggestedPrice ? currency(service.suggestedPrice) : "Sin precio"}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <Input label="Importe" value={form.amount} onChange={(v) => setForm({ ...form, amount: formatARSInput(v) })} placeholder="Ej: 80.000" />
              <Input label="Observaciones" value={form.observations} onChange={(v) => setForm({ ...form, observations: v })} placeholder="Opcional" />
              <div className="flex flex-col gap-3 sm:flex-row"><PrimaryButton type="submit" className="flex-1">{editing ? "Guardar cambios" : "Crear presupuesto"}</PrimaryButton>{editing && <SecondaryButton onClick={reset} className="px-4 py-2.5 text-sm">Cancelar</SecondaryButton>}</div>
            </form>
          )}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-white/10 p-5"><h3 className="text-xl font-semibold text-white">Presupuestos registrados</h3><p className="mt-1 text-sm text-zinc-500">Lista compacta de presupuestos generados.</p><div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]"><input value={internalSearch} onChange={(e) => { setInternalSearch(e.target.value); setPage(1); }} placeholder="Buscar presupuesto, cliente o servicio..." className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-white/25" /><select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none"><option className="bg-zinc-950" value="recent">Más reciente</option><option className="bg-zinc-950" value="oldest">Más antiguo</option><option className="bg-zinc-950" value="az">Alfabético</option></select></div></div>
          {filtered.length === 0 ? <EmptyState title="Sin presupuestos" text="Cuando crees presupuestos, van a aparecer en esta lista." /> : (
            <>
              <div className="grid gap-3 p-4 md:hidden">{visible.map((b) => <div key={b.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-sm text-zinc-300">{b.id}</p><p className="mt-1 text-xs text-zinc-600">{dateLabel(b.date)}</p></div><Badge tone={statusTone(b.status || "Pendiente")}>{BUDGET_STATUS.includes(b.status) ? b.status : "Pendiente"}</Badge></div><div className="mt-4 grid gap-3"><MobileField label="Cliente" value={b.client} /><MobileField label="Servicio" value={b.service} /><MobileField label="Importe">{currency(b.amount)}</MobileField></div><div className="mt-4 grid grid-cols-2 gap-2"><SecondaryButton onClick={() => { setEditing(b.id); setForm({ client: b.client, service: b.service, amount: formatARSInput(b.amount), observations: b.observations || "" }); }} className="px-3 py-2.5 text-xs">Editar</SecondaryButton><SecondaryButton onClick={() => convertToOrder(b)} className="px-3 py-2.5 text-xs">A orden</SecondaryButton><SecondaryButton onClick={() => openDocumentWindow({ type: "Presupuesto", id: b.id, data, clientName: b.client, service: b.service, observations: b.observations, amount: b.amount, paymentStatus: "Pendiente" })} className="px-3 py-2.5 text-xs">Abrir</SecondaryButton><SecondaryButton onClick={() => remove(b.id)} className="px-3 py-2.5 text-xs">Eliminar</SecondaryButton></div></div>)}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-zinc-600"><tr><th className="px-4 py-2.5">Presupuesto</th><th className="px-4 py-2.5">Cliente</th><th className="px-4 py-2.5">Servicio</th><th className="px-4 py-2.5">Estado</th><th className="px-4 py-2.5">Importe</th><th className="px-4 py-2.5">Acciones</th></tr></thead><tbody className="divide-y divide-white/10">{visible.map((b) => <tr key={b.id} className="transition hover:bg-white/[0.035]"><td className="px-4 py-2.5 font-mono text-zinc-300">{b.id}<p className="mt-1 text-xs text-zinc-600">{dateLabel(b.date)}</p></td><td className="px-4 py-2.5 font-medium text-white">{b.client}</td><td className="px-4 py-2.5 text-zinc-500">{b.service}</td><td className="px-4 py-2.5"><Badge tone={statusTone(b.status || "Pendiente")}>{BUDGET_STATUS.includes(b.status) ? b.status : "Pendiente"}</Badge></td><td className="px-4 py-2.5 font-medium text-zinc-200">{currency(b.amount)}</td><td className="px-4 py-2.5"><div className="flex flex-wrap gap-2"><SecondaryButton onClick={() => { setEditing(b.id); setForm({ client: b.client, service: b.service, amount: formatARSInput(b.amount), observations: b.observations || "" }); }}>Editar</SecondaryButton><SecondaryButton onClick={() => convertToOrder(b)}>Convertir a orden</SecondaryButton><SecondaryButton onClick={() => openDocumentWindow({ type: "Presupuesto", id: b.id, data, clientName: b.client, service: b.service, observations: b.observations, amount: b.amount, paymentStatus: "Pendiente" })}>Abrir presupuesto</SecondaryButton><SecondaryButton onClick={() => remove(b.id)}>Eliminar</SecondaryButton></div></td></tr>)}</tbody></table></div>
              <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-5"><span>Página {page} de {totalPages}</span><div className="flex gap-2"><SecondaryButton onClick={() => setPage(Math.max(page - 1, 1))}>Anterior</SecondaryButton><SecondaryButton onClick={() => setPage(Math.min(page + 1, totalPages))}>Siguiente</SecondaryButton></div></div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

function finishOrder(data, setData, id) {
  const order = data.orders.find((item) => item.id === id);
  setData((prev) =>
    addHistory(
      { ...prev, orders: prev.orders.map((o) => (o.id === id ? { ...o, status: "Terminado" } : o)) },
      "Orden",
      "Orden terminada",
      `${id} · ${order?.client || "sin cliente"}`
    )
  );
  notify("Orden marcada como terminada.");
}

function markPaid(data, setData, id) {
  const order = data.orders.find((item) => item.id === id);
  setData((prev) =>
    addHistory(
      { ...prev, orders: prev.orders.map((o) => (o.id === id ? { ...o, payment: "Pagado", paidAmount: Number(o.total || 0) } : o)) },
      "Orden",
      "Pago actualizado",
      `${id} · ${order?.client || "sin cliente"} · ${currency(order?.total || 0)}`
    )
  );
  notify("Orden marcada como pagada.");
}

function Orders({ data, setData, search }) {
  const [editing, setEditing] = useState(null);
  const [showServices, setShowServices] = useState(false);
  const [saveService, setSaveService] = useState(false);
  const [includeSuggestedPrice, setIncludeSuggestedPrice] = useState(false);
  const [form, setForm] = useState({ client: data.clients[0]?.name || "", service: "", total: "", paidAmount: "", observations: "", status: "Pendiente", payment: "Pendiente" });
  const filtered = data.orders.filter((o) => [o.id, o.client, o.service, o.status, o.payment, o.observations].join(" ").toLowerCase().includes(search.toLowerCase()));

  function reset() {
    setEditing(null);
    setSaveService(false);
    setIncludeSuggestedPrice(false);
    setShowServices(false);
    setForm({ client: data.clients[0]?.name || "", service: "", total: "", paidAmount: "", observations: "", status: "Pendiente", payment: "Pendiente" });
  }

  function saveFrequentServiceIfNeeded(nextData, serviceName, price) {
    if (!saveService || !serviceName.trim()) return nextData;
    const exists = (nextData.frequentServices || []).some((item) => item.name.toLowerCase() === serviceName.trim().toLowerCase());
    if (exists) return nextData;
    const service = {
      id: createId("SER"),
      name: serviceName.trim(),
      suggestedPrice: includeSuggestedPrice ? Number(price || 0) : 0,
    };
    return { ...nextData, frequentServices: [service, ...(nextData.frequentServices || [])] };
  }

  function submit(e) {
    e.preventDefault();
    const total = parseARS(form.total);
    const partialPaid = parseARS(form.paidAmount);
    const clientName = form.client.trim();
    const serviceName = form.service.trim();
    if (!clientName || !serviceName || !form.total) return notify("Completá cliente, servicio y total.");
    if (!getClient(data, clientName)) return notify("Elegí un cliente existente o cargalo primero.");
    if (total <= 0) return notify("El total de la orden debe ser mayor a cero.");
    if (form.payment === "Pago parcial" && partialPaid <= 0) return notify("Indicá cuánto pagó el cliente.");
    if (form.payment === "Pago parcial" && partialPaid >= total) return notify("Para pagos iguales o mayores al total, usá el estado Pagado.");
    const paymentData = normalizeOrderPayment(form.payment, total, partialPaid);

    if (editing) {
      setData((prev) => {
        let next = {
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === editing
              ? { ...o, client: clientName, service: serviceName, total, paidAmount: paymentData.paidAmount, observations: form.observations.trim(), status: form.status, payment: paymentData.payment }
              : o
          ),
        };
        next = saveFrequentServiceIfNeeded(next, serviceName, total);
        return addHistory(next, "Orden", "Orden actualizada", `${editing} · ${clientName} · ${currency(total)}`);
      });
      notify("Orden actualizada correctamente.");
      reset();
      return;
    }

    const order = { id: createId("ORD"), client: clientName, service: serviceName, total, paidAmount: paymentData.paidAmount, observations: form.observations.trim(), status: form.status, payment: paymentData.payment, date: todayISO() };
    setData((prev) => {
      let next = { ...prev, orders: [order, ...prev.orders] };
      next = saveFrequentServiceIfNeeded(next, serviceName, order.total);
      return addHistory(next, "Orden", "Orden creada", `${order.id} · ${order.client} · ${currency(order.total)}`);
    });
    notify("Orden creada correctamente.");
    reset();
  }

  async function remove(id) {
    const order = data.orders.find((item) => item.id === id);
    if (!(await confirmAction(`¿Eliminar la orden ${id} de ${order?.client || "este cliente"} por ${currency(order?.total || 0)}?`))) return;
    setData((prev) => addHistory({ ...prev, orders: prev.orders.filter((o) => o.id !== id) }, "Orden", "Orden eliminada", `${id} · ${order?.client || "sin cliente"}`));
    notify("Orden eliminada correctamente.");
  }

  function chooseFrequentService(service) {
    setForm({ ...form, service: service.name, total: service.suggestedPrice ? formatARSInput(service.suggestedPrice) : form.total });
    setShowServices(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader label="Órdenes y pagos" title="Flujo operativo" text="Órdenes reales de trabajo o compra, con estado de avance y cobro." />
      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <Panel className="p-4 sm:p-6">
          <h3 className="text-xl font-semibold text-white">{editing ? "Editar orden" : "Nueva orden"}</h3>
          {data.clients.length === 0 ? (
            <EmptyState title="Primero cargá un cliente" text="Las órdenes necesitan un cliente asociado." />
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <ClientPicker label="Cliente" value={form.client} onChange={(v) => setForm({ ...form, client: v })} clients={data.clients} />
              <div className="relative">
                <div className="flex gap-2">
                  <div className="flex-1"><Input label="Servicio" value={form.service} onChange={(v) => setForm({ ...form, service: v })} /></div>
                  <button type="button" onClick={() => setShowServices(!showServices)} title="Servicios frecuentes" className="mt-7 h-11 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-zinc-300 transition hover:text-white">⋯</button>
                </div>
                {showServices && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 p-3 shadow-2xl shadow-black/60">
                    <div className="border-b border-white/10 px-3 pb-3">
                      <p className="text-sm font-medium text-white">Servicios frecuentes</p>
                      <p className="mt-1 text-xs text-zinc-500">Elegí un servicio guardado para cargarlo rápido.</p>
                    </div>
                    {(data.frequentServices || []).length === 0 ? <p className="px-3 py-3 text-sm text-zinc-500">No hay servicios frecuentes guardados.</p> : (data.frequentServices || []).map((service) => (
                      <button key={service.id} type="button" onClick={() => chooseFrequentService(service)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"><span>{service.name}</span><span className="text-zinc-500">{service.suggestedPrice ? currency(service.suggestedPrice) : "Sin precio"}</span></button>
                    ))}
                  </div>
                )}
              </div>
              <Input label="Total" value={form.total} onChange={(v) => setForm({ ...form, total: formatARSInput(v), paidAmount: form.payment === "Pagado" ? formatARSInput(v) : form.paidAmount })} placeholder="Ej: 80.000" />
              <Input label="Observaciones" value={form.observations} onChange={(v) => setForm({ ...form, observations: v })} placeholder="Opcional" />
              <div className="grid gap-3 sm:grid-cols-2"><Select label="Estado" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={ORDER_STATUS} /><Select label="Pago" value={form.payment} onChange={(v) => setForm({ ...form, payment: v, paidAmount: v === "Pagado" ? form.total : v === "Pendiente" ? "" : form.paidAmount })} options={PAYMENT_STATUS} /></div>{form.payment === "Pago parcial" && <Input label="Monto pagado" value={form.paidAmount} onChange={(v) => setForm({ ...form, paidAmount: formatARSInput(v) })} placeholder="Ej: 40.000" />}
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-zinc-300">
                <input type="checkbox" checked={saveService} onChange={(e) => setSaveService(e.target.checked)} />
                Guardar servicio frecuente
              </label>
              {saveService && <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-zinc-300"><input type="checkbox" checked={includeSuggestedPrice} onChange={(e) => setIncludeSuggestedPrice(e.target.checked)} />Incluir precio sugerido</label>}
              <div className="flex flex-col gap-3 sm:flex-row"><PrimaryButton type="submit" className="flex-1">{editing ? "Guardar cambios" : "Crear orden"}</PrimaryButton>{editing && <SecondaryButton onClick={reset} className="px-4 py-2.5 text-sm">Cancelar</SecondaryButton>}</div>
            </form>
          )}
        </Panel>
        <OrdersTable orders={filtered} data={data} onEdit={(o) => { setEditing(o.id); setForm({ client: o.client, service: o.service, total: formatARSInput(o.total), paidAmount: formatARSInput(o.paidAmount || 0), observations: o.observations || "", status: o.status, payment: o.payment }); }} onDelete={remove} onFinish={(id) => finishOrder(data, setData, id)} onPay={(id) => markPaid(data, setData, id)} />
      </div>
    </div>
  );
}

function OrdersTable({ orders, compact = false, data, onEdit, onDelete, onFinish, onPay }) {
  const [page, setPage] = useState(1);
  const [internalSearch, setInternalSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const perPage = 8;

  const filteredOrders = compact
    ? orders
    : orders
        .filter((order) =>
          [order.id, order.client, order.service, order.status, order.payment, order.observations]
            .join(" ")
            .toLowerCase()
            .includes(internalSearch.toLowerCase())
        )
        .sort((a, b) => {
          if (sort === "recent") return String(b.id).localeCompare(String(a.id));
          if (sort === "oldest") return String(a.id).localeCompare(String(b.id));
          if (sort === "az") return String(a.client || "").localeCompare(String(b.client || ""));
          return 0;
        });

  const totalPages = Math.max(Math.ceil(filteredOrders.length / perPage), 1);
  const visible = compact ? filteredOrders : filteredOrders.slice((page - 1) * perPage, page * perPage);

  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-white/10 p-5"><h3 className="text-xl font-semibold text-white">Órdenes recientes</h3><p className="mt-1 text-sm text-zinc-500">Control operativo y estado de cobro.</p>{!compact && <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]"><input value={internalSearch} onChange={(e) => { setInternalSearch(e.target.value); setPage(1); }} placeholder="Buscar orden, cliente, servicio o estado..." className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-white/25" /><select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none"><option className="bg-zinc-950" value="recent">Más reciente</option><option className="bg-zinc-950" value="oldest">Más antiguo</option><option className="bg-zinc-950" value="az">Alfabético</option></select></div>}</div>
      {filteredOrders.length === 0 ? <EmptyState title="Sin órdenes cargadas" text="Cuando crees órdenes, van a aparecer en esta tabla." /> : (
        <>
          <div className="grid gap-3 p-4 md:hidden">{visible.map((order) => <div key={order.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-sm text-zinc-300">{order.id}</p><p className="mt-1 text-xs text-zinc-600">{dateLabel(order.date)}</p></div><Badge tone={isOrderOverdue(order) ? "amber" : statusTone(order.status)}>{isOrderOverdue(order) ? "Atrasada" : order.status}</Badge></div><div className="mt-4 grid gap-3"><MobileField label="Cliente" value={order.client} />{!compact && <MobileField label="Servicio" value={order.service} />}<MobileField label="Pago"><Badge tone={statusTone(order.payment)}>{order.payment}</Badge></MobileField><div className="grid grid-cols-2 gap-3"><MobileField label="Total">{currency(order.total)}</MobileField><MobileField label="Resta">{currency(getPendingAmount(order))}</MobileField></div></div><div className="mt-4 grid grid-cols-2 gap-2">{order.status === "Pendiente" && <SecondaryButton onClick={() => onFinish?.(order.id)} className="px-3 py-2.5 text-xs">Terminar</SecondaryButton>}{order.payment !== "Pagado" && <SecondaryButton onClick={() => onPay?.(order.id)} className="px-3 py-2.5 text-xs">Pagada</SecondaryButton>}{!compact && <><SecondaryButton onClick={() => onEdit?.(order)} className="px-3 py-2.5 text-xs">Editar</SecondaryButton><SecondaryButton onClick={() => openDocumentWindow({ type: "Orden", id: order.id, data, clientName: order.client, service: order.service, observations: order.observations, amount: order.total, orderStatus: order.status, paymentStatus: order.payment, paidAmount: getPaidAmount(order) })} className="px-3 py-2.5 text-xs">Abrir</SecondaryButton><SecondaryButton onClick={() => onDelete?.(order.id)} className="col-span-2 px-3 py-2.5 text-xs">Eliminar</SecondaryButton></>}</div></div>)}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[980px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-zinc-600"><tr><th className="px-4 py-2.5">Orden</th><th className="px-4 py-2.5">Cliente</th>{!compact && <th className="px-4 py-2.5">Servicio</th>}<th className="px-4 py-2.5">Estado</th><th className="px-4 py-2.5">Pago</th><th className="px-4 py-2.5">Total</th><th className="px-4 py-2.5">Resta</th>{!compact && <th className="px-4 py-2.5">Acciones</th>}</tr></thead><tbody className="divide-y divide-white/10">{visible.map((order) => <tr key={order.id} className="transition hover:bg-white/[0.035]"><td className="px-4 py-2 font-mono text-zinc-300">{order.id}<p className="mt-1 text-xs text-zinc-600">{dateLabel(order.date)}</p></td><td className="px-4 py-2 font-medium text-white">{order.client}</td>{!compact && <td className="px-4 py-2 text-zinc-500">{order.service}</td>}<td className="px-4 py-1.5"><div className="flex items-center gap-1.5"><Badge tone={isOrderOverdue(order) ? "amber" : statusTone(order.status)}>{isOrderOverdue(order) ? "Atrasada" : order.status}</Badge>{order.status === "Pendiente" && <button onClick={() => onFinish?.(order.id)} title="Marcar como terminado" className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-[10px] text-emerald-300">✓</button>}</div></td><td className="px-4 py-1.5"><div className="flex items-center gap-1.5"><Badge tone={statusTone(order.payment)}>{order.payment}</Badge>{order.payment !== "Pagado" && <button onClick={() => onPay?.(order.id)} title="Marcar como pagado" className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-[10px] text-emerald-300">✓</button>}</div></td><td className="px-4 py-1.5 text-sm font-medium text-zinc-200">{currency(order.total)}</td><td className="px-4 py-1.5 text-sm font-medium text-zinc-200">{currency(getPendingAmount(order))}</td>{!compact && <td className="px-4 py-1.5"><div className="flex flex-nowrap gap-1.5"><SecondaryButton onClick={() => onEdit?.(order)} className="px-2.5 py-1.5">Editar</SecondaryButton><SecondaryButton onClick={() => openDocumentWindow({ type: "Orden", id: order.id, data, clientName: order.client, service: order.service, observations: order.observations, amount: order.total, orderStatus: order.status, paymentStatus: order.payment, paidAmount: getPaidAmount(order) })} className="px-2.5 py-1.5">Abrir orden</SecondaryButton><SecondaryButton onClick={() => onDelete?.(order.id)} className="px-2.5 py-1.5">Eliminar</SecondaryButton></div></td>}</tr>)}</tbody></table></div>
          {!compact && filteredOrders.length > perPage && <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-5"><span>Página {page} de {totalPages}</span><div className="flex gap-2"><SecondaryButton onClick={() => setPage(Math.max(page - 1, 1))}>Anterior</SecondaryButton><SecondaryButton onClick={() => setPage(Math.min(page + 1, totalPages))}>Siguiente</SecondaryButton></div></div>}
        </>
      )}
    </Panel>
  );
}

function Monthly({ data }) {
  const summary = buildMonthSummary(data.orders);
  const current = new Date().toISOString().slice(0, 7);
  const monthOrders = data.orders.filter((o) => monthKey(o.date) === current);
  const total = monthOrders.reduce((s, o) => s + o.total, 0);
  const paid = monthOrders.reduce((s, o) => s + getPaidAmount(o), 0);
  return <div className="space-y-6"><PageHeader label="Resumen mensual" title="Análisis operativo" text="Hacé click en un mes para abrir/descargar su registro mensual." /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><StatCard label="Ingresos del mes" value={currency(total)} meta="Facturación registrada" icon="$" /><StatCard label="Órdenes" value={monthOrders.length} meta="Movimientos del mes" icon="OR" /><StatCard label="Cobranzas" value={currency(paid)} meta="Pagos completados" icon="OK" /><StatCard label="Pendiente" value={currency(total - paid)} meta="Saldo por cobrar" icon="PG" /></div><Panel className="overflow-hidden"><div className="border-b border-white/10 p-4 sm:p-5"><h3 className="text-xl font-semibold text-white">Historial mensual</h3><p className="mt-1 text-sm text-zinc-500">Resumen comparativo de rendimiento.</p></div>{summary.length === 0 ? <EmptyState title="Sin datos mensuales" text="Cuando cargues órdenes, el resumen se calculará automáticamente." /> : <><div className="grid gap-3 p-4 md:hidden">{summary.map((item) => <button key={item.key} onClick={() => openMonthlyReport({ data, month: item })} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:bg-white/[0.06]"><p className="font-medium capitalize text-white">{item.label}</p><div className="mt-4 grid grid-cols-2 gap-3"><MobileField label="Ingresos">{currency(item.revenue)}</MobileField><MobileField label="Órdenes">{item.orders}</MobileField><MobileField label="Cobranzas">{currency(item.collected)}</MobileField><MobileField label="Pendiente">{currency(item.pending)}</MobileField></div></button>)}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-zinc-600"><tr><th className="px-5 py-3">Mes</th><th className="px-5 py-3">Ingresos</th><th className="px-5 py-3">Órdenes</th><th className="px-5 py-3">Cobranzas</th><th className="px-5 py-3">Saldo pendiente</th></tr></thead><tbody className="divide-y divide-white/10">{summary.map((item) => <tr key={item.key} onClick={() => openMonthlyReport({ data, month: item })} className="cursor-pointer transition hover:bg-white/[0.07]"><td className="px-5 py-3 font-medium capitalize text-white">{item.label}</td><td className="px-5 py-3 text-zinc-300">{currency(item.revenue)}</td><td className="px-5 py-3 text-zinc-500">{item.orders}</td><td className="px-5 py-3 text-zinc-300">{currency(item.collected)}</td><td className="px-5 py-3 text-zinc-300">{currency(item.pending)}</td></tr>)}</tbody></table></div></>}</Panel></div>;
}

function buildMonthSummary(orders) {
  const map = new Map();
  for (const order of orders) {
    const key = monthKey(order.date);
    if (!key) continue;
    if (!map.has(key)) {
      const d = new Date(`${key}-01T12:00:00`);
      map.set(key, { key, label: d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }), revenue: 0, orders: 0, collected: 0, pending: 0 });
    }
    const item = map.get(key);
    item.revenue += order.total;
    item.orders += 1;
    item.collected += getPaidAmount(order);
    item.pending += getPendingAmount(order);
  }
  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
}

function History({ data, search }) {
  const [filter, setFilter] = useState("Todo");
  const filters = ["Todo", "Sistema", "Cliente", "Presupuesto", "Orden"];
  const items = data.history.filter((h) => (filter === "Todo" || h.type === filter) && [h.type, h.title, h.description].join(" ").toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6"><PageHeader label="Historial general" title="Actividad del sistema" text="Registro filtrable de acciones importantes." /><Panel className="overflow-hidden"><div className="flex flex-wrap gap-2 border-b border-white/10 p-5">{filters.map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1.5 text-xs ${filter === f ? "border-white/20 bg-white/[0.1] text-white" : "border-white/10 bg-white/[0.035] text-zinc-500"}`}>{f}</button>)}</div>{items.length === 0 ? <EmptyState title="Sin actividad" text="Las acciones aparecerán acá." /> : <div className="divide-y divide-white/10">{items.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 hover:bg-white/[0.035] md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-3"><Badge>{item.type}</Badge><h3 className="font-medium text-white">{item.title}</h3></div><p className="mt-2 text-sm text-zinc-500">{item.description}</p></div><p className="text-sm text-zinc-600">{dateTimeLabel(item.date)}</p></div>)}</div>}</Panel></div>;
}

function Settings({ data, setData, account, exportData, resetData }) {
  const [profile, setProfile] = useState(data.profile);
  const [business, setBusiness] = useState(data.business);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: "", suggestedPrice: "" });

  useEffect(() => {
    const syncSettings = window.setTimeout(() => {
      setProfile(data.profile);
      setBusiness(data.business);
    }, 0);

    return () => window.clearTimeout(syncSettings);
  }, [data.profile, data.business]);

  function save(e) {
    e.preventDefault();
    setData((prev) =>
      addHistory(
        { ...prev, profile, business },
        "Sistema",
        "Configuración actualizada",
        "Se actualizaron datos personales o del negocio."
      )
    );
    notify("Configuración guardada correctamente.");
  }

  function startEditService(service) {
    setEditingService(service.id);
    setServiceForm({
      name: service.name,
      suggestedPrice: service.suggestedPrice ? formatARSInput(service.suggestedPrice) : "",
    });
  }

  function cancelServiceEdit() {
    setEditingService(null);
    setServiceForm({ name: "", suggestedPrice: "" });
  }

  function saveService(e) {
    e.preventDefault();
    if (!serviceForm.name.trim()) return notify("Completá el nombre del servicio frecuente.");

    setData((prev) => {
      const service = {
        id: editingService || createId("SER"),
        name: serviceForm.name.trim(),
        suggestedPrice: parseARS(serviceForm.suggestedPrice),
      };

      const services = editingService
        ? (prev.frequentServices || []).map((item) => (item.id === editingService ? service : item))
        : [service, ...(prev.frequentServices || [])];

      return addHistory(
        { ...prev, frequentServices: services },
        "Sistema",
        editingService ? "Servicio frecuente actualizado" : "Servicio frecuente creado",
        service.name
      );
    });

    notify(editingService ? "Servicio frecuente actualizado." : "Servicio frecuente creado.");
    cancelServiceEdit();
  }

  async function deleteService(id) {
    if (!(await confirmAction("¿Seguro que querés eliminar este servicio frecuente?"))) return;
    setData((prev) =>
      addHistory(
        { ...prev, frequentServices: (prev.frequentServices || []).filter((item) => item.id !== id) },
        "Sistema",
        "Servicio frecuente eliminado",
        id
      )
    );
    notify("Servicio frecuente eliminado.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        label="Configuración"
        title="Datos personales y negocio"
        text="Configurá la información principal del usuario, del negocio y los servicios frecuentes."
      />

      <form onSubmit={save} className="grid gap-6 xl:grid-cols-2">
        <Panel className="p-6">
          <h3 className="text-xl font-semibold text-white">Datos personales</h3>
          <div className="mt-6 space-y-4">
            <Input label="Nombre" value={profile.name || ""} onChange={(v) => setProfile({ ...profile, name: toTitleCase(v) })} />
            <Input label="Apellido" value={profile.surname || ""} onChange={(v) => setProfile({ ...profile, surname: toTitleCase(v) })} />
            <Input label="CUIT / CUIL" value={profile.taxId || ""} onChange={(v) => setProfile({ ...profile, taxId: onlyDigits(v) })} />
            <Input label="Email" value={profile.email || account.email} onChange={(v) => setProfile({ ...profile, email: v })} />
            <Input label="Teléfono" value={profile.phone || ""} onChange={(v) => setProfile({ ...profile, phone: onlyDigits(v) })} />
          </div>
        </Panel>

        <Panel className="p-6">
          <h3 className="text-xl font-semibold text-white">Datos del negocio</h3>
          <div className="mt-6 space-y-4">
            <Input label="Nombre del negocio" value={business.name || ""} onChange={(v) => setBusiness({ ...business, name: v })} />
            <Input label="Rubro" value={business.category || ""} onChange={(v) => setBusiness({ ...business, category: v })} />
            <Input label="Dirección" value={business.address || ""} onChange={(v) => setBusiness({ ...business, address: v })} />
            <Input label="CUIT / Identificación" value={business.cuit || ""} onChange={(v) => setBusiness({ ...business, cuit: onlyDigits(v) })} />
          </div>
        </Panel>

        <div className="flex flex-wrap gap-3 xl:col-span-2">
          <PrimaryButton type="submit">Guardar configuración</PrimaryButton>
          <SecondaryButton onClick={exportData} className="px-4 py-3 text-sm">Exportar datos</SecondaryButton>
          <button type="button" onClick={resetData} className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">
            Restaurar datos
          </button>
        </div>
      </form>

      <Panel className="overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <h3 className="text-xl font-semibold text-white">Servicios frecuentes guardados</h3>
          <p className="mt-1 text-sm text-zinc-500">Editá o eliminá los servicios que aparecen en el menú de órdenes.</p>
        </div>

        <div className="grid gap-6 p-5 xl:grid-cols-[0.72fr_1.28fr]">
          <form onSubmit={saveService} className="space-y-4">
            <Input label="Nombre del servicio" value={serviceForm.name} onChange={(v) => setServiceForm({ ...serviceForm, name: v })} />
            <Input label="Precio sugerido" value={serviceForm.suggestedPrice} onChange={(v) => setServiceForm({ ...serviceForm, suggestedPrice: formatARSInput(v) })} placeholder="Opcional" />
            <div className="flex gap-3">
              <PrimaryButton type="submit" className="flex-1">{editingService ? "Guardar servicio" : "Agregar servicio"}</PrimaryButton>
              {editingService && <SecondaryButton onClick={cancelServiceEdit}>Cancelar</SecondaryButton>}
            </div>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            {(data.frequentServices || []).length === 0 ? (
              <EmptyState title="Sin servicios frecuentes" text="Cuando guardes servicios desde órdenes, van a aparecer acá." />
            ) : (
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-zinc-600">
                  <tr>
                    <th className="px-4 py-2.5">Servicio</th>
                    <th className="px-4 py-2.5">Precio sugerido</th>
                    <th className="px-4 py-2.5">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {(data.frequentServices || []).map((service) => (
                    <tr key={service.id} className="transition hover:bg-white/[0.035]">
                      <td className="px-4 py-2.5 font-medium text-white">{service.name}</td>
                      <td className="px-4 py-2.5 text-zinc-400">{service.suggestedPrice ? currency(service.suggestedPrice) : "—"}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-nowrap gap-1.5">
                          <SecondaryButton onClick={() => startEditService(service)}>Editar</SecondaryButton>
                          <SecondaryButton onClick={() => deleteService(service.id)}>Eliminar</SecondaryButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function AppShell({ account, initialData, onLogout }) {
  const [active, setActive] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [data, setData] = useState(initialData);
  useEffect(() => { writeJSON(dataKey(account.email), data); }, [data, account.email]);
  const exportData = useCallback(() => { const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `nexo-management-${todayISO()}.json`; a.click(); URL.revokeObjectURL(url); setData((prev) => addHistory(prev, "Sistema", "Datos exportados", "Se descargó una copia JSON.")); notify("Datos exportados correctamente."); }, [data]);
  const resetData = useCallback(async () => { if (!(await confirmAction("¿Seguro que querés restaurar clientes, presupuestos y órdenes?"))) return; setData(addHistory({ ...emptyData, profile: data.profile, business: data.business }, "Sistema", "Datos restaurados", "Se restauraron los datos operativos.")); notify("Datos restaurados correctamente."); }, [data.business, data.profile]);
  const content = useMemo(() => {
    if (active === "dashboard") return <Dashboard data={data} setData={setData} />;
    if (active === "clients") return <Clients data={data} setData={setData} search={search} />;
    if (active === "budgets") return <Budgets data={data} setData={setData} search={search} />;
    if (active === "orders") return <Orders data={data} setData={setData} search={search} />;
    if (active === "monthly") return <Monthly data={data} />;
    if (active === "history") return <History data={data} search={search} />;
    return <Settings data={data} setData={setData} account={account} exportData={exportData} resetData={resetData} />;
  }, [active, data, search, account, exportData, resetData]);
  return <main className="min-h-screen overflow-x-hidden bg-[#080808] text-zinc-100"><ToastHost /><ConfirmHost /><div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" /><Sidebar active={active} setActive={setActive} data={data} /><div className="relative z-10 min-w-0 lg:pl-72"><Topbar search={search} setSearch={setSearch} active={active} setActive={setActive} account={account} data={data} onLogout={onLogout} /><div className="px-4 py-5 sm:px-5 sm:py-8 lg:px-8">{content}</div></div></main>;
}

export default function App() {
  const [account, setAccount] = useState(() => { const session = readJSON(SESSION_KEY, null); if (!session) return null; return readJSON(ACCOUNTS_KEY, []).find((a) => a.email === session.email) || null; });
  const [initialData, setInitialData] = useState(() => { const session = readJSON(SESSION_KEY, null); if (!session) return null; return readJSON(dataKey(session.email), emptyData); });
  function login(nextAccount, nextData) { setAccount(nextAccount); setInitialData(nextData); }
  function logout() { localStorage.removeItem(SESSION_KEY); setAccount(null); setInitialData(null); notify("Sesión cerrada."); }
  if (!account || !initialData) return <AuthScreen onLogin={login} />;
  return <AppShell account={account} initialData={initialData} onLogout={logout} />;
}
