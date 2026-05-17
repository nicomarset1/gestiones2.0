import { useCallback, useEffect, useMemo, useState } from "react";

const APP_KEY = "nexo-management-v1";
const ACCOUNTS_KEY = `${APP_KEY}:accounts`;
const SESSION_KEY = `${APP_KEY}:session`;
const THEME_KEY = `${APP_KEY}:theme`;
const LANGUAGE_KEY = `${APP_KEY}:language`;
const FEEDBACK_EMAIL = "nexomanagementt@gmail.com";

const emptyData = {
  profile: {
    name: "",
    surname: "",
    taxId: "",
    phone: "",
    email: "",
    photoURL: "",
  },
  business: {
    name: "",
    category: "",
    address: "",
    cuit: "",
    businessType: "services",
    enabledModules: {
      clients: true,
      budgets: true,
      orders: true,
      monthly: true,
      products: false,
      sales: false,
      inventory: false,
      expenses: false,
      suppliers: false,
      cash: false,
      reports: false,
    },
  },
  clients: [],
  budgets: [],
  orders: [],
  products: [],
  sales: [],
  expenses: [],
  suppliers: [],
  cashSessions: [],
  stockMovements: [],
  frequentServices: [],
  history: [],
};

const BUSINESS_PRESETS = {
  services: {
    label: "Servicios básico",
    description: "Clientes, presupuestos, trabajos, pagos y resumen mensual. La experiencia más simple.",
    modules: {
      clients: true,
      budgets: true,
      orders: true,
      monthly: true,
      products: false,
      sales: false,
      inventory: false,
      expenses: false,
      suppliers: false,
      cash: false,
      reports: false,
    },
  },
  servicesPlus: {
    label: "Servicios completo",
    description: "Suma gastos, caja simple y reportes sin meterse en ventas masivas ni stock.",
    modules: {
      clients: true,
      budgets: true,
      orders: true,
      monthly: true,
      products: false,
      sales: false,
      inventory: false,
      expenses: true,
      suppliers: false,
      cash: true,
      reports: true,
    },
  },
  workshop: {
    label: "Taller / service",
    description: "Para trabajos con insumos, proveedores, gastos, caja y seguimiento de cobros.",
    modules: {
      clients: true,
      budgets: true,
      orders: true,
      monthly: true,
      products: false,
      sales: false,
      inventory: false,
      expenses: true,
      suppliers: true,
      cash: true,
      reports: true,
    },
  },
  custom: {
    label: "Personalizado",
    description: "Activa solo los apartados que realmente usás en tu negocio.",
    modules: {
      clients: true,
      budgets: true,
      orders: true,
      monthly: true,
      products: false,
      sales: false,
      inventory: false,
      expenses: false,
      suppliers: false,
      cash: false,
      reports: false,
    },
  },
};

const DEFAULT_MODULES = BUSINESS_PRESETS.services.modules;

function createEmptyData(overrides = {}) {
  const business = {
    ...emptyData.business,
    ...(overrides.business || {}),
  };
  business.enabledModules = {
    ...DEFAULT_MODULES,
    ...(business.enabledModules || {}),
  };

  return {
    profile: { ...emptyData.profile, ...(overrides.profile || {}) },
    business,
    clients: [...(overrides.clients || [])],
    budgets: [...(overrides.budgets || [])],
    orders: [...(overrides.orders || [])],
    products: [...(overrides.products || [])],
    sales: [...(overrides.sales || [])],
    expenses: [...(overrides.expenses || [])],
    suppliers: [...(overrides.suppliers || [])],
    cashSessions: [...(overrides.cashSessions || [])],
    stockMovements: [...(overrides.stockMovements || [])],
    frequentServices: [...(overrides.frequentServices || [])],
    history: [...(overrides.history || [])],
  };
}

function normalizeStoredData(data, account = {}) {
  return createEmptyData({
    ...data,
    profile: {
      ...(data?.profile || {}),
      email: data?.profile?.email || account.email || "",
    },
  });
}

function cloudDocId(email) {
  return normalizeEmail(email).replaceAll("/", "_");
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "DB", always: true },
  { id: "clients", label: "Clientes", icon: "CL", module: "clients" },
  { id: "budgets", label: "Presupuestos", icon: "PR", module: "budgets" },
  { id: "orders", label: "Ordenes y Pagos", icon: "OP", module: "orders" },
  { id: "expenses", label: "Gastos", icon: "GS", module: "expenses" },
  { id: "suppliers", label: "Proveedores", icon: "PV", module: "suppliers" },
  { id: "cash", label: "Caja diaria", icon: "CJ", module: "cash" },
  { id: "monthly", label: "Resumen Mensual", icon: "RM", module: "monthly" },
  { id: "reports", label: "Reportes", icon: "RP", module: "reports" },
  { id: "history", label: "Historial", icon: "HT", always: true },
  { id: "settings", label: "Configuracion", icon: "CF", always: true },
];

const ORDER_STATUS = ["Pendiente", "Terminado"];
const PAYMENT_STATUS = ["Pendiente", "Pago parcial", "Pagado"];
const BUDGET_STATUS = ["Pendiente", "Convertido", "Rechazado"];
const ORDER_OVERDUE_DAYS = 7;

const EN_TRANSLATIONS = {
  "Servicios básico": "Basic services",
  "Clientes, presupuestos, trabajos, pagos y resumen mensual. La experiencia más simple.": "Clients, estimates, jobs, payments, and monthly summary. The simplest experience.",
  "Servicios completo": "Complete services",
  "Suma gastos, caja simple y reportes sin meterse en ventas masivas ni stock.": "Adds expenses, simple cash control, and reports without mass sales or stock.",
  "Taller / service": "Workshop / service",
  "Para trabajos con insumos, proveedores, gastos, caja y seguimiento de cobros.": "For jobs with supplies, vendors, expenses, cash control, and payment tracking.",
  "Personalizado": "Custom",
  "Activa solo los apartados que realmente usás en tu negocio.": "Enable only the sections you actually use in your business.",
  "Ordenes y Pagos": "Orders and Payments",
  "Gastos": "Expenses",
  "Proveedores": "Vendors",
  "Caja diaria": "Daily Cash",
  "Reportes": "Reports",
  "Configuracion": "Settings",
  "Buscar clientes, trabajos, gastos, pagos...": "Search clients, jobs, expenses, payments...",
  "Egresos del negocio": "Business expenses",
  "Registra alquiler, insumos, compras, publicidad y cualquier salida de dinero.": "Record rent, supplies, purchases, ads, and any money going out.",
  "Gastos del mes": "Monthly expenses",
  "Categorias": "Categories",
  "Orden de egresos": "Expense organization",
  "Nuevo gasto": "New expense",
  "Descripcion": "Description",
  "Categoria": "Category",
  "Ej: insumos, alquiler": "E.g. supplies, rent",
  "Proveedor": "Vendor",
  "Sin proveedor": "No vendor",
  "Metodo de pago": "Payment method",
  "Efectivo": "Cash",
  "Transferencia": "Bank transfer",
  "Mercado Pago": "Mercado Pago",
  "Tarjeta": "Card",
  "Registrar gasto": "Record expense",
  "Gastos recientes": "Recent expenses",
  "Sin gastos": "No expenses",
  "Los egresos registrados van a aparecer aca.": "Recorded expenses will appear here.",
  "Sin categoria": "No category",
  "Contactos de compra": "Purchasing contacts",
  "Guarda mayoristas, distribuidores y servicios vinculados a compras o gastos.": "Save wholesalers, distributors, and services linked to purchases or expenses.",
  "Nuevo proveedor": "New vendor",
  "Telefono": "Phone",
  "Agregar proveedor": "Add vendor",
  "Proveedores registrados": "Registered vendors",
  "Sin proveedores": "No vendors",
  "Carga proveedores para vincularlos con gastos y compras.": "Add vendors to link them with expenses and purchases.",
  "Control del dia": "Daily control",
  "Abre y cierra caja para comparar efectivo esperado contra dinero real.": "Open and close cash to compare expected cash with actual cash.",
  "Saldo inicial": "Opening balance",
  "Caja abierta": "Cash open",
  "Sin caja abierta": "No open cash",
  "Gastos hoy": "Expenses today",
  "Egresos del dia": "Daily outflows",
  "Esperado": "Expected",
  "Saldo calculado": "Calculated balance",
  "Cerrar caja": "Close cash",
  "Dinero real al cierre": "Actual cash at close",
  "Abrir caja": "Open cash",
  "Cierres anteriores": "Previous closings",
  "Sin cajas": "No cash sessions",
  "Cuando abras y cierres caja, el historial aparecera aca.": "When you open and close cash, the history will appear here.",
  "Cerrada": "Closed",
  "Abierta": "Open",
  "Activa": "Active",
  "Lectura del negocio": "Business overview",
  "Una vista compacta de trabajos, cobros, gastos y resultado operativo.": "A compact view of jobs, payments, expenses, and operating result.",
  "Servicios": "Services",
  "Ordenes del mes": "Monthly orders",
  "Egresos del mes": "Monthly outflows",
  "Resultado bruto": "Gross result",
  "Ingresos menos gastos": "Income minus expenses",
  "Cobros hoy": "Payments today",
  "Ingresos del dia": "Daily income",
  "Clientes con saldo abierto": "Clients with open balance",
  "Gastos por categoria": "Expenses by category",
  "Sin gastos registrados": "No recorded expenses",
  "Cuando registres gastos, vas a ver el total por categoría.": "When you record expenses, you will see the total by category.",
  "Gasto registrado": "Expense recorded",
  "Proveedor creado": "Vendor created",
  "Caja cerrada": "Cash closed",
  "Diferencia:": "Difference:",
  "Completa descripcion e importe.": "Complete description and amount.",
  "Completa el nombre del proveedor.": "Complete the vendor name.",
  "Ya hay una caja abierta.": "There is already an open cash session.",
  "Tipo de negocio y modulos": "Business type and modules",
  "Elegí un perfil para que la app muestre solo lo necesario. Después podés ajustar cada módulo manualmente.": "Choose a profile so the app only shows what is needed. You can adjust each module manually later.",
  "Sistema web de gestión operativa": "Operations management web system",
  "Centralizá clientes, presupuestos, órdenes, pagos, historial y resumen mensual desde una interfaz profesional, clara y funcional.": "Centralize clients, estimates, orders, payments, history, and monthly summaries from a professional, clear, functional interface.",
  "Primeros pasos": "First steps",
  "Configurá la app en pocos minutos y empezá a usarla con datos reales.": "Set up the app in a few minutes and start using it with real data.",
  "Completá tu negocio": "Complete your business",
  "Agregá datos para que presupuestos y órdenes salgan completos.": "Add details so estimates and orders are complete.",
  "Ir a configuración": "Go to settings",
  "Cargá tu primer cliente": "Load your first client",
  "Los clientes son la base para presupuestos, órdenes y pagos.": "Clients are the base for estimates, orders, and payments.",
  "Ir a clientes": "Go to clients",
  "Creá un presupuesto": "Create an estimate",
  "Armá una propuesta y dejala lista para convertirla en orden.": "Build a proposal and leave it ready to convert into an order.",
  "Ir a presupuestos": "Go to estimates",
  "Registrá una orden": "Register an order",
  "Controlá estado de trabajo, cobros y saldos pendientes.": "Track work status, collections, and outstanding balances.",
  "Ir a órdenes": "Go to orders",
  "Iniciar sesión": "Sign in",
  "Crear cuenta": "Create account",
  "Entrá a tu espacio": "Enter your workspace",
  "Creá tu espacio de trabajo": "Create your workspace",
  "Recuperá tu contraseña": "Recover your password",
  "Te enviamos un enlace oficial de Firebase para crear una nueva contraseña.": "We send you an official Firebase link to create a new password.",
  "Recuperar acceso": "Recover access",
  "Nombre": "First name",
  "Apellido": "Last name",
  "CUIT / CUIL": "Tax ID",
  "Teléfono": "Phone",
  "Nombre del negocio": "Business name",
  "Contraseña": "Password",
  "¿Olvidaste tu contraseña?": "Forgot your password?",
  "Enviar email de recuperación": "Send recovery email",
  "Volver": "Back",
  "← Volver": "← Back",
  "Volver al inicio de sesión": "Back to sign in",
  "Continuar con Google": "Continue with Google",
  "Entrar como anónimo": "Enter as guest",
  "Foto de perfil": "Profile photo",
  "Cambiar foto": "Change photo",
  "Quitar foto": "Remove photo",
  "Configuración inicial": "Initial setup",
  "Completá tus datos": "Complete your details",
  "Para usar tu espacio necesitamos completar los datos personales y del negocio. Estos datos se usan en órdenes, presupuestos y documentos.": "To use your workspace, we need to complete your personal and business details. These details are used in orders, estimates, and documents.",
  "Guardar y entrar": "Save and enter",
  "No tengo cuenta, crear una": "I do not have an account, create one",
  "Ya tengo cuenta, iniciar sesión": "I already have an account, sign in",
  "Solo números: 8 a 15 dígitos": "Numbers only: 8 to 15 digits",
  "Dashboard": "Dashboard",
  "Clientes": "Clients",
  "Presupuestos": "Estimates",
  "Órdenes y Pagos": "Orders and Payments",
  "Resumen Mensual": "Monthly Summary",
  "Historial": "History",
  "Configuración": "Settings",
  "Sistema activo": "System active",
  "Buscar clientes, presupuestos, órdenes, pagos...": "Search clients, estimates, orders, payments...",
  "Menú": "Menu",
  "Abrir menú": "Open menu",
  "Cerrar menú": "Close menu",
  "Cambiar a modo claro": "Switch to light mode",
  "Cambiar a modo oscuro": "Switch to dark mode",
  "Cambiar a inglés": "Switch to English",
  "Cambiar a español": "Switch to Spanish",
  "Cerrar sesión": "Sign out",
  "Enviar feedback": "Send feedback",
  "Confirmación": "Confirmation",
  "¿Estás seguro?": "Are you sure?",
  "Cancelar": "Cancel",
  "Confirmar": "Confirm",
  "Ingresos del mes": "Monthly revenue",
  "Facturación registrada": "Registered billing",
  "Órdenes": "Orders",
  "Movimientos del mes": "Monthly activity",
  "Cobranzas": "Collections",
  "Pagos completados": "Completed payments",
  "Pendiente": "Pending",
  "Saldo por cobrar": "Outstanding balance",
  "Ingresos mensuales": "Monthly revenue",
  "Evolución visual basada en órdenes reales.": "Visual trend based on real orders.",
  "Estado de cobro": "Payment status",
  "Pagado real vs pendiente real.": "Actual paid vs outstanding.",
  "Pagado": "Paid",
  "Pago parcial": "Partial payment",
  "Terminado": "Finished",
  "Atrasada": "Overdue",
  "Convertido": "Converted",
  "Rechazado": "Rejected",
  "Cobrado": "Collected",
  "Gestión de clientes": "Client management",
  "Registro simple de clientes para asociarlos a presupuestos, órdenes y pagos.": "Simple client records to link with estimates, orders, and payments.",
  "Descargar listado de clientes": "Download client list",
  "Nuevo cliente": "New client",
  "Editar cliente": "Edit client",
  "Empresa / Cliente": "Company / Client",
  "Notas": "Notes",
  "Agregar cliente": "Add client",
  "Guardar cambios": "Save changes",
  "Clientes registrados": "Registered clients",
  "resultados visibles": "visible results",
  "Buscar cliente, teléfono, email o nota...": "Search client, phone, email, or note...",
  "Más reciente": "Newest",
  "Más antiguo": "Oldest",
  "Alfabético": "Alphabetical",
  "Sin clientes cargados": "No clients loaded",
  "Agregá tu primer cliente para empezar.": "Add your first client to get started.",
  "Registro": "Record",
  "Ver registro": "View record",
  "Editar": "Edit",
  "Eliminar": "Delete",
  "Anterior": "Previous",
  "Siguiente": "Next",
  "Servicio": "Service",
  "Importe": "Amount",
  "Estado": "Status",
  "Acciones": "Actions",
  "Nuevo presupuesto": "New estimate",
  "Editar presupuesto": "Edit estimate",
  "Presupuestos registrados": "Registered estimates",
  "Lista compacta de presupuestos generados.": "Compact list of generated estimates.",
  "Buscar presupuesto, cliente o servicio...": "Search estimate, client, or service...",
  "Sin presupuestos": "No estimates",
  "A orden": "To order",
  "Abrir": "Open",
  "Abrir presupuesto": "Open estimate",
  "Convertir a orden": "Convert to order",
  "Nueva orden": "New order",
  "Editar orden": "Edit order",
  "Órdenes recientes": "Recent orders",
  "Control operativo y estado de cobro.": "Operational control and payment status.",
  "Buscar orden, cliente, servicio o estado...": "Search order, client, service, or status...",
  "Orden": "Order",
  "Pago": "Payment",
  "Total": "Total",
  "Resta": "Remaining",
  "Terminar": "Finish",
  "Pagada": "Paid",
  "Abrir orden": "Open order",
  "Resumen mensual": "Monthly summary",
  "Análisis operativo": "Operational analysis",
  "Hacé click en un mes para abrir/descargar su registro mensual.": "Click a month to open/download its monthly record.",
  "Historial mensual": "Monthly history",
  "Resumen comparativo de rendimiento.": "Comparative performance summary.",
  "Sin datos mensuales": "No monthly data",
  "Cuando cargues órdenes, el resumen se calculará automáticamente.": "When you load orders, the summary will be calculated automatically.",
  "Mes": "Month",
  "Ingresos": "Revenue",
  "Saldo pendiente": "Outstanding balance",
  "Historial general": "General history",
  "Actividad del sistema": "System activity",
  "Registro filtrable de acciones importantes.": "Filterable log of important actions.",
  "Todo": "All",
  "Sistema": "System",
  "Cliente": "Client",
  "Presupuesto": "Estimate",
  "Sin actividad": "No activity",
  "Las acciones aparecerán acá.": "Actions will appear here.",
  "Datos personales y negocio": "Personal and business details",
  "Configurá la información principal del usuario, del negocio y los servicios frecuentes.": "Configure the main user, business, and frequent service information.",
  "Datos personales": "Personal details",
  "Email": "Email",
  "Datos del negocio": "Business details",
  "Rubro": "Category",
  "Dirección": "Address",
  "CUIT / Identificación": "Tax ID / Identification",
  "Guardar configuración": "Save settings",
  "Exportar datos": "Export data",
  "Restaurar datos": "Restore data",
  "Servicios frecuentes guardados": "Saved frequent services",
  "Editá o eliminá los servicios que aparecen en el menú de órdenes.": "Edit or delete the services shown in the orders menu.",
  "Nombre del servicio": "Service name",
  "Precio sugerido": "Suggested price",
  "Opcional": "Optional",
  "Guardar servicio": "Save service",
  "Agregar servicio": "Add service",
  "Sin servicios frecuentes": "No frequent services",
  "Cuando guardes servicios desde órdenes, van a aparecer acá.": "When you save services from orders, they will appear here.",
  "Sin precio": "No price",
  "Resumen general": "General summary",
  "Base comercial": "Client base",
  "Órdenes pendientes": "Pending orders",
  "Trabajos pendientes del mes": "Pending jobs this month",
  "Atrasadas": "Overdue",
  "Por cobrar": "Receivables",
  "Pendientes +7 días": "Pending +7 days",
  "Acciones prioritarias": "Priority actions",
  "Órdenes atrasadas o con saldo pendiente para resolver primero.": "Overdue orders or open balances to resolve first.",
  "Sin pendientes críticos": "No critical pending items",
  "No hay órdenes atrasadas ni saldos abiertos para priorizar.": "There are no overdue orders or open balances to prioritize.",
  "Cobro pendiente": "Payment pending",
  "Marcar pagada": "Mark as paid",
  "Pendientes": "Pending",
  "Generador de presupuestos": "Estimate generator",
  "Creá presupuestos simples para clientes, sin mezclarlos con órdenes reales.": "Create simple client estimates without mixing them with real orders.",
  "Primero cargá un cliente": "Load a client first",
  "Los presupuestos necesitan un cliente asociado.": "Estimates need an associated client.",
  "Crear presupuesto": "Create estimate",
        "Cuando crees presupuestos, van a aparecer en esta lista.": "When you create estimates, they will appear in this list.",
  "Cuando crees presupuestos, van a aparecer en esta lista. Usá el formulario de la izquierda para cargar el primero.": "When you create estimates, they will appear in this list. Use the form on the left to load the first one.",
  "Observaciones": "Notes",
  "Servicios frecuentes": "Frequent services",
  "Órdenes y pagos": "Orders and payments",
  "Flujo operativo": "Operations workflow",
  "Órdenes reales de trabajo o compra, con estado de avance y cobro.": "Real work or purchase orders with progress and payment status.",
  "Las órdenes necesitan un cliente asociado.": "Orders need an associated client.",
  "Crear orden": "Create order",
  "Sin órdenes cargadas": "No orders loaded",
  "Cuando crees órdenes, van a aparecer en esta tabla.": "When you create orders, they will appear in this table.",
  "Cuando crees órdenes, van a aparecer en esta tabla. Usá el formulario superior para registrar el primer trabajo.": "When you create orders, they will appear in this table. Use the top form to register the first job.",
  "Monto pagado": "Paid amount",
  "Marcar como terminado": "Mark as finished",
  "Marcar como pagado": "Mark as paid",
  "No hay información para mostrar en este apartado.": "There is no information to show in this section.",
  "Sin datos": "No data",
  "Sin clientes": "No clients",
  "Todavía no hay clientes registrados.": "There are no registered clients yet.",
  "Saldos pendientes del mes": "Outstanding balances this month",
  "Órdenes con dinero pendiente de cobro durante el mes actual.": "Orders with money pending collection during the current month.",
  "Órdenes pendientes con más de 7 días abiertas.": "Pending orders open for more than 7 days.",
  "Cobros pendientes": "Pending collections",
  "Presupuesto actualizado": "Estimate updated",
  "Presupuesto creado": "Estimate created",
  "Presupuesto eliminado": "Estimate deleted",
  "Presupuesto convertido en orden": "Estimate converted to order",
  "Orden terminada": "Order finished",
  "Orden pagada": "Order paid",
  "Orden actualizada": "Order updated",
  "Orden creada": "Order created",
  "Orden eliminada": "Order deleted",
  "Cliente actualizado": "Client updated",
  "Cliente creado": "Client created",
  "Cliente eliminado": "Client deleted",
  "Configuración actualizada": "Settings updated",
  "Perfil completado": "Profile completed",
  "Se completaron los datos obligatorios de la cuenta.": "The required account details were completed.",
  "Datos exportados": "Data exported",
  "Datos restaurados": "Data restored",
  "Cuenta creada. Te enviamos un link de verificación al email. Confirmalo y después iniciá sesión.": "Account created. We sent a verification link to your email. Confirm it, then sign in.",
  "Email de verificación enviado.": "Verification email sent.",
  "Tenés que verificar tu email antes de iniciar sesión. Revisá tu bandeja de entrada y spam.": "You need to verify your email before signing in. Check your inbox and spam folder.",
  "Cuenta creada con Google": "Account created with Google",
  "Se creó el espacio de trabajo usando inicio de sesión con Google.": "The workspace was created using Google sign-in.",
  "Sesión anónima creada": "Guest session created",
  "Se cargaron datos demo para visualizar la aplicación.": "Demo data was loaded to preview the application.",
  "Clientes demo cargados": "Demo clients loaded",
  "Clientes anónimos disponibles para recorrer el sistema.": "Guest clients are available to explore the system.",
  "Órdenes demo cargadas": "Demo orders loaded",
  "Órdenes anónimas con estados de pago variados.": "Guest orders with varied payment statuses.",
  "Servicio frecuente actualizado": "Frequent service updated",
  "Servicio frecuente creado": "Frequent service created",
  "Servicio frecuente eliminado": "Frequent service deleted",
  "Se actualizaron datos personales o del negocio.": "Personal or business details were updated.",
  "Se descargó una copia JSON.": "A JSON copy was downloaded.",
  "Se restauraron los datos operativos.": "Operational data was restored.",
  "Página": "Page",
  "de": "of",
  "Guardar servicio frecuente": "Save frequent service",
  "Incluir precio sugerido": "Include suggested price",
  "Elegí un servicio guardado para cargarlo rápido.": "Choose a saved service to load it quickly.",
  "No hay servicios frecuentes guardados.": "There are no saved frequent services.",
  "Lista completa de clientes registrados": "Complete list of registered clients",
  "Total clientes": "Total clients",
  "Con teléfono": "With phone",
  "Con email": "With email",
  "Lista de clientes": "Client list",
  "Fecha": "Date",
  "Precio": "Price",
  "Cant.": "Qty.",
  "Total presupuestado": "Estimated total",
  "Resta a pagar": "Remaining to pay",
  "Presupuesto válido por 7 días desde la fecha de emisión.": "Estimate valid for 7 days from the issue date.",
  "Este presupuesto detalla los servicios solicitados y sus importes correspondientes. Los valores indicados corresponden al servicio/trabajo presupuestado. No incluyen repuestos, materiales, insumos especiales ni costos adicionales, salvo que estén expresamente detallados en este documento. Los importes pueden estar sujetos a cambios si se agregan trabajos adicionales o modificaciones solicitadas posteriormente.": "This estimate details the requested services and their corresponding amounts. The listed values apply to the estimated service/work. They do not include spare parts, materials, special supplies, or additional costs unless expressly detailed in this document. Amounts may change if additional work or later requested changes are added.",
  "Generado con Nexo Management": "Generated with Nexo Management",
  "Imprimir / Guardar PDF": "Print / Save PDF",
  "Datos del cliente": "Client details",
  "Datos del presupuesto": "Estimate details",
  "Datos del documento": "Document details",
  "Número": "Number",
  "Fecha de emisión": "Issue date",
  "Estado de pago": "Payment status",
  "Responsable": "Responsible",
  "Registro completo de cliente": "Complete client record",
  "Generado": "Generated",
  "Órdenes / visitas": "Orders / visits",
  "Sin clientes registrados.": "No registered clients.",
  "Sin órdenes registradas.": "No registered orders.",
  "Sin órdenes en este mes.": "No orders this month.",
  "Total facturado": "Total billed",
  "Facturado": "Billed",
  "Búsqueda": "Search",
  "Resultados globales": "Global results",
  "coincidencias para": "matches for",
  "Ver sección": "View section",
  "Sin resultados": "No results",
  "No hay coincidencias para esta sección.": "There are no matches for this section.",
  "Filtrar": "Filter",
  "Filtrar búsqueda": "Filter search",
};

function translateText(value, language) {
  if (language !== "en") return value;
  const text = String(value);
  if (EN_TRANSLATIONS[text]) return EN_TRANSLATIONS[text];
  const trimmed = text.trim();
  if (trimmed && EN_TRANSLATIONS[trimmed]) {
    return text.replace(trimmed, EN_TRANSLATIONS[trimmed]);
  }

  const visibleResults = text.match(/^(\d+)\s+resultados visibles$/);
  if (visibleResults) return `${visibleResults[1]} visible results`;

  const page = text.match(/^Página\s+(\d+)\s+de\s+(\d+)$/);
  if (page) return `Page ${page[1]} of ${page[2]}`;

  const matches = text.match(/^(\d+)\s+coincidencias para "(.+)"\.$/);
  if (matches) return `${matches[1]} matches for "${matches[2]}".`;

  const movements = text.match(/^(\d+)\s+movimientos$/);
  if (movements) return `${movements[1]} movements`;

  const monthlyView = text.match(/^Vista mensual del estado operativo, financiero y comercial de (.+)\.$/);
  if (monthlyView) return `Monthly view of operational, financial, and commercial status for ${translateText(monthlyView[1], language)}.`;

  const pendingDays = text.match(/^Pendientes \+(\d+) días$/);
  if (pendingDays) return `Pending +${pendingDays[1]} days`;

  const overdueDays = text.match(/^Órdenes pendientes con más de (\d+) días abiertas\.$/);
  if (overdueDays) return `Pending orders open for more than ${overdueDays[1]} days.`;

  const months = {
    enero: "January",
    febrero: "February",
    marzo: "March",
    abril: "April",
    mayo: "May",
    junio: "June",
    julio: "July",
    agosto: "August",
    septiembre: "September",
    octubre: "October",
    noviembre: "November",
    diciembre: "December",
    ene: "Jan",
    feb: "Feb",
    mar: "Mar",
    abr: "Apr",
    may: "May",
    jun: "Jun",
    jul: "Jul",
    ago: "Aug",
    sep: "Sep",
    oct: "Oct",
    nov: "Nov",
    dic: "Dec",
  };
  const translatedMonth = text.replace(
    /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\b(\s+de\s+(\d{4}))?/gi,
    (match, month, _yearChunk, year) => {
      const translated = months[month.toLowerCase()] || month;
      return year ? `${translated} ${year}` : translated;
    }
  );
  if (translatedMonth !== text) return translatedMonth;

  return text
    .replaceAll("Presupuesto", "Estimate")
    .replaceAll("presupuesto", "estimate")
    .replaceAll("Presupuestos", "Estimates")
    .replaceAll("presupuestos", "estimates")
    .replaceAll("Órdenes", "Orders")
    .replaceAll("Ordenes", "Orders")
    .replaceAll("órdenes", "orders")
    .replaceAll("ordenes", "orders")
    .replaceAll("Orden", "Order")
    .replaceAll("orden", "order")
    .replaceAll("Cliente", "Client")
    .replaceAll("cliente", "client")
    .replaceAll("Gastos", "Expenses")
    .replaceAll("Gasto", "Expense")
    .replaceAll("gastos", "expenses")
    .replaceAll("gasto", "expense")
    .replaceAll("Proveedor", "Vendor")
    .replaceAll("proveedor", "vendor")
    .replaceAll("Caja", "Cash")
    .replaceAll("Pendiente", "Pending")
    .replaceAll("pendiente", "pending")
    .replaceAll("Pagado", "Paid")
    .replaceAll("pagada", "paid")
    .replaceAll("pagado", "paid")
    .replaceAll("Terminado", "Finished")
    .replaceAll("terminada", "finished")
    .replaceAll("eliminada", "deleted")
    .replaceAll("eliminado", "deleted")
    .replaceAll("creada", "created")
    .replaceAll("creado", "created")
    .replaceAll("actualizada", "updated")
    .replaceAll("actualizado", "updated")
    .replaceAll("convertido en", "converted to")
    .replaceAll("sin cliente", "no client");
}

function applyLanguage(root, language) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE"].includes(node.parentElement?.tagName)) return NodeFilter.FILTER_REJECT;
      if (node.parentElement?.closest("[data-nm-no-translate]")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    if (!node.nmOriginalText || (language === "en" && node.nodeValue !== translateText(node.nmOriginalText, language))) {
      node.nmOriginalText = node.nodeValue;
    }
    const original = node.nmOriginalText;
    node.nodeValue = translateText(original, language);
  });

  root.querySelectorAll("[placeholder], [title], [aria-label]").forEach((node) => {
    if (node.closest("[data-nm-no-translate]")) return;
    ["placeholder", "title", "aria-label"].forEach((attribute) => {
      if (!node.hasAttribute(attribute)) return;
      const key = `nmOriginal${attribute.replace(/(^|-)([a-z])/g, (_, __, letter) => letter.toUpperCase())}`;
      if (!node.dataset[key]) node.dataset[key] = node.getAttribute(attribute);
      node.setAttribute(attribute, translateText(node.dataset[key], language));
    });
  });
}

function currentLanguage() {
  return document.documentElement.lang === "en" ? "en" : "es";
}

function translateGeneratedHtml(html) {
  if (currentLanguage() !== "en") return html;
  let translated = html;
  Object.entries(EN_TRANSLATIONS)
    .filter(([from]) => !["de", "Página"].includes(from))
    .sort((a, b) => b[0].length - a[0].length)
    .forEach(([from, to]) => {
      translated = translated.replaceAll(from, to);
    });
  return translateText(translated, "en");
}

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

async function loadCloudWorkspace(email) {
  try {
    const [{ db }, { doc, getDoc }] = await Promise.all([
      import("./firebase"),
      import("firebase/firestore"),
    ]);
    const snapshot = await getDoc(doc(db, "workspaces", cloudDocId(email)));
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    console.warn("No se pudo leer Firestore:", error);
    return null;
  }
}

async function saveCloudWorkspace(email, account, data) {
  try {
    const [{ db }, { doc, serverTimestamp, setDoc }] = await Promise.all([
      import("./firebase"),
      import("firebase/firestore"),
    ]);
    await setDoc(
      doc(db, "workspaces", cloudDocId(email)),
      {
        account,
        data,
        email: normalizeEmail(email),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn("No se pudo guardar en Firestore:", error);
    return false;
  }
}

function dataKey(email) {
  return `${APP_KEY}:data:${email}`;
}

function demoDate(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function createAnonymousDemoData(email = "demo@anonymous.local") {
  return createEmptyData({
    profile: {
      name: "Usuario",
      surname: "Anónimo",
      email,
    },
    business: {
      name: "Negocio Demo",
      category: "Servicios generales",
      address: "Dirección demo 123",
      cuit: "00000000000",
    },
    clients: [
      {
        id: "CLI-DEMO-001",
        name: "Cliente Anónimo Norte",
        phone: "1122334455",
        email: "cliente.norte@demo.com",
        notes: "Cliente demo para visualizar órdenes activas.",
        lastContact: demoDate(2),
      },
      {
        id: "CLI-DEMO-002",
        name: "Cliente Anónimo Centro",
        phone: "1144556677",
        email: "cliente.centro@demo.com",
        notes: "Cliente demo con presupuesto pendiente.",
        lastContact: demoDate(5),
      },
      {
        id: "CLI-DEMO-003",
        name: "Cliente Anónimo Sur",
        phone: "1166778899",
        email: "cliente.sur@demo.com",
        notes: "Cliente demo con pagos parciales.",
        lastContact: demoDate(9),
      },
    ],
    budgets: [
      {
        id: "PRE-DEMO-001",
        client: "Cliente Anónimo Centro",
        service: "Presupuesto demo de mantenimiento",
        amount: 145000,
        observations: "Ejemplo de presupuesto pendiente para mostrar el flujo.",
        status: "Pendiente",
        date: demoDate(1),
      },
      {
        id: "PRE-DEMO-002",
        client: "Cliente Anónimo Norte",
        service: "Instalación demo",
        amount: 220000,
        observations: "Ejemplo ya convertido en orden.",
        status: "Convertido",
        convertedOrderId: "ORD-DEMO-001",
        date: demoDate(8),
      },
    ],
    orders: [
      {
        id: "ORD-DEMO-001",
        client: "Cliente Anónimo Norte",
        service: "Instalación demo",
        total: 220000,
        paidAmount: 220000,
        observations: "Orden demo terminada y pagada.",
        status: "Terminado",
        payment: "Pagado",
        date: demoDate(4),
        sourceBudgetId: "PRE-DEMO-002",
      },
      {
        id: "ORD-DEMO-002",
        client: "Cliente Anónimo Sur",
        service: "Reparación demo",
        total: 180000,
        paidAmount: 80000,
        observations: "Orden demo con pago parcial.",
        status: "Pendiente",
        payment: "Pago parcial",
        date: demoDate(3),
      },
      {
        id: "ORD-DEMO-003",
        client: "Cliente Anónimo Centro",
        service: "Servicio mensual demo",
        total: 95000,
        paidAmount: 0,
        observations: "Orden demo pendiente para visualizar alertas.",
        status: "Pendiente",
        payment: "Pendiente",
        date: demoDate(10),
      },
    ],
    frequentServices: [
      { id: "SER-DEMO-001", name: "Mantenimiento demo", suggestedPrice: 95000 },
      { id: "SER-DEMO-002", name: "Instalación demo", suggestedPrice: 220000 },
      { id: "SER-DEMO-003", name: "Reparación demo", suggestedPrice: 180000 },
    ],
    history: [
      {
        id: "HIS-DEMO-001",
        type: "Sistema",
        title: "Sesión anónima creada",
        description: "Se cargaron datos demo para visualizar la aplicación.",
        date: new Date().toISOString(),
      },
      {
        id: "HIS-DEMO-002",
        type: "Cliente",
        title: "Clientes demo cargados",
        description: "Clientes anónimos disponibles para recorrer el sistema.",
        date: new Date().toISOString(),
      },
      {
        id: "HIS-DEMO-003",
        type: "Orden",
        title: "Órdenes demo cargadas",
        description: "Órdenes anónimas con estados de pago variados.",
        date: new Date().toISOString(),
      },
    ],
  });
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

function profileInitials(profile, fallback = "NM") {
  const fullName = formatFullName(profile);
  return fullName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || fallback;
}

function isWorkspaceProfileComplete(data) {
  return Boolean(
    data?.profile?.name?.trim() &&
      data?.profile?.surname?.trim() &&
      data?.profile?.taxId?.trim() &&
      isValidPhone(data?.profile?.phone) &&
      isValidEmail(data?.profile?.email) &&
      data?.business?.name?.trim() &&
      data?.business?.category?.trim() &&
      data?.business?.address?.trim() &&
      data?.business?.cuit?.trim()
  );
}

function feedbackHref(account, data) {
  const email = data?.profile?.email || account?.email || "";
  const subject = encodeURIComponent("Feedback Nexo Management");
  const body = encodeURIComponent(
    [
      "Hola, quiero dejar feedback sobre Nexo Management.",
      "",
      `Cuenta: ${email || "sin email"}`,
      `Negocio: ${data?.business?.name || "sin negocio configurado"}`,
      "",
      "Comentario:",
    ].join("\n")
  );
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(FEEDBACK_EMAIL)}&su=${subject}&body=${body}`;
}

function authErrorMessage(error) {
  const code = error?.code || "";
  const messages = {
    "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase Auth. Agregá el dominio actual en Firebase Console > Authentication > Settings > Authorized domains.",
    "auth/operation-not-allowed": "El inicio con Google no está habilitado en Firebase. Activá Google en Authentication > Sign-in method.",
    "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Voy a intentar con redirección.",
    "auth/popup-closed-by-user": "Se cerró la ventana de Google antes de completar el inicio.",
    "auth/cancelled-popup-request": "Se canceló una ventana de Google anterior. Volvé a intentar.",
    "auth/account-exists-with-different-credential": "Ya existe una cuenta con este email usando otro método de ingreso.",
    "auth/network-request-failed": "No se pudo conectar con Firebase. Revisá la conexión e intentá de nuevo.",
  };
  return messages[code] || error?.message || "No se pudo iniciar sesión con Google.";
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

function getEnabledModules(data) {
  return {
    ...DEFAULT_MODULES,
    ...(data?.business?.enabledModules || {}),
    products: false,
    sales: false,
    inventory: false,
  };
}

function isModuleEnabled(data, module) {
  return Boolean(getEnabledModules(data)[module]);
}

function getVisibleNavItems(data) {
  const enabled = getEnabledModules(data);
  return navItems.filter((item) => item.always || enabled[item.module]);
}

function productStock(product) {
  return Number(product?.stock || 0);
}

function stockTone(product) {
  if (!product?.tracksStock) return "neutral";
  const stock = productStock(product);
  const min = Number(product.minStock || 0);
  if (stock <= 0) return "danger";
  if (stock <= min) return "warning";
  return "success";
}

function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "border-white/10 bg-white/[0.06] text-zinc-300",
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    warning: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    danger: "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5 ${tones[tone] || tones.neutral}`}>
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

function ProfilePhotoInput({ photoURL, initials, onChange }) {
  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Elegí una imagen válida para la foto de perfil.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <p className="mb-3 text-sm text-zinc-500">Foto de perfil</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] font-mono text-lg text-white">
          {photoURL ? (
            <img src={photoURL} alt="Foto de perfil" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            initials
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.08]">
            Cambiar foto
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />
          </label>
          {photoURL && (
            <button type="button" onClick={() => onChange("")} className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm text-zinc-400 transition hover:border-white/25 hover:text-white">
              Quitar foto
            </button>
          )}
        </div>
      </div>
    </div>
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
          <option key={typeof option === "string" ? option : option.value} value={typeof option === "string" ? option : option.value} className="bg-zinc-950">
            {typeof option === "string" ? option : option.label}
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

function EmptyState({ title, text, children }) {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] font-mono text-zinc-500">—</div>
      <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">{text}</p>
      {children && <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>}
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
  win.document.write(translateGeneratedHtml(html));
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
  win.document.write(translateGeneratedHtml(html));
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
  win.document.write(translateGeneratedHtml(html));
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
  win.document.write(translateGeneratedHtml(html));
  win.document.close();
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "es");
  const [form, setForm] = useState({
    name: "",
    surname: "",
    taxId: "",
    phone: "",
    email: "",
    password: "",
    business: "",
  });

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    const root = document.getElementById("root");
    applyLanguage(root, language);
    const observer = new MutationObserver(() => applyLanguage(root, language));
    if (root) observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  const toggleLanguage = () => setLanguage((value) => value === "es" ? "en" : "es");

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    let accounts = readJSON(ACCOUNTS_KEY, []);

    if (mode === "reset") {
      if (!isValidEmail(email)) {
        setError("Ingresá un email válido para recuperar la contraseña.");
        return;
      }
      try {
        const [{ auth }, { sendPasswordResetEmail }] = await Promise.all([
          import("./firebase"),
          import("firebase/auth"),
        ]);
        await sendPasswordResetEmail(auth, email, {
          url: window.location.origin,
          handleCodeInApp: false,
        });
        setMessage("Te enviamos un email para restablecer tu contraseña. Revisá tu bandeja de entrada y spam.");
        notify("Email de recuperación enviado.");
      } catch (error) {
        setError(error.code || error.message || "No se pudo enviar el email de recuperación.");
      }
      return;
    }

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

      try {
        const [{ auth }, { createUserWithEmailAndPassword, sendEmailVerification }] = await Promise.all([
          import("./firebase"),
          import("firebase/auth"),
        ]);
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(result.user, {
          url: window.location.origin,
          handleCodeInApp: false,
        });
      } catch (error) {
        setError(error.code || error.message || "No se pudo crear la cuenta.");
        return;
      }

      const account = {
        name: toTitleCase(form.name),
        surname: toTitleCase(form.surname),
        taxId: onlyDigits(form.taxId),
        phone: onlyDigits(form.phone),
        email,
        password,
        emailVerified: false,
        createdAt: new Date().toISOString(),
      };
      const data = createEmptyData({
        profile: {
          name: account.name,
          surname: account.surname,
          taxId: account.taxId,
          phone: account.phone,
          email,
          photoURL: "",
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
      });
      writeJSON(ACCOUNTS_KEY, [account, ...accounts]);
      writeJSON(dataKey(email), data);
      await saveCloudWorkspace(email, account, data);
      try {
        const [{ auth }, { signOut }] = await Promise.all([
          import("./firebase"),
          import("firebase/auth"),
        ]);
        await signOut(auth);
      } catch {
        // The app session is still kept closed locally until the email is verified.
      }
      setMessage("Cuenta creada. Te enviamos un link de verificación al email. Confirmalo y después iniciá sesión.");
      notify("Email de verificación enviado.");
      setMode("login");
      return;
    }

    let account = accounts.find((item) => item.email === email && item.password === password);
    let cloudWorkspace = null;
    try {
      const [{ auth }, { signInWithEmailAndPassword, signOut }] = await Promise.all([
        import("./firebase"),
        import("firebase/auth"),
      ]);
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      await user.reload();
      if (!user.emailVerified) {
        await signOut(auth);
        setError("Tenés que verificar tu email antes de iniciar sesión. Revisá tu bandeja de entrada y spam.");
        return;
      }
      cloudWorkspace = await loadCloudWorkspace(email);
      account =
        account ||
        cloudWorkspace?.account || {
          name: toTitleCase(user.displayName?.split(" ")[0] || "Usuario"),
          surname: toTitleCase(user.displayName?.split(" ").slice(1).join(" ") || ""),
          taxId: "",
          phone: "",
          email,
          password,
          provider: "password",
          emailVerified: true,
          createdAt: new Date().toISOString(),
        };
      account = { ...account, emailVerified: true };
      if (!accounts.some((item) => item.email === email)) {
        accounts = [account, ...accounts];
        writeJSON(ACCOUNTS_KEY, accounts);
      } else {
        accounts = accounts.map((item) => item.email === email ? account : item);
        writeJSON(ACCOUNTS_KEY, accounts);
      }
    } catch {
      // Fallback for workspaces created before Firebase email/password auth was enabled.
    }
    if (account?.emailVerified === false) {
      setError("Tenés que verificar tu email antes de iniciar sesión. Revisá tu bandeja de entrada y spam.");
      return;
    }
    if (!account) {
      cloudWorkspace = await loadCloudWorkspace(email);
      if (cloudWorkspace?.account?.password === password) {
        account = cloudWorkspace.account;
        if (account.emailVerified === false) {
          setError("Tenés que verificar tu email antes de iniciar sesión. Revisá tu bandeja de entrada y spam.");
          return;
        }
        accounts = [account, ...accounts.filter((item) => item.email !== email)];
        writeJSON(ACCOUNTS_KEY, accounts);
      }
    }
    if (!account) {
      setError("Email o contraseña incorrectos.");
      return;
    }
    cloudWorkspace = cloudWorkspace || await loadCloudWorkspace(email);
    const localData = normalizeStoredData(readJSON(dataKey(email), createEmptyData()), account);
    const data = normalizeStoredData(cloudWorkspace?.data || localData, account);
    writeJSON(dataKey(email), data);
    if (!cloudWorkspace?.data || cloudWorkspace?.account?.emailVerified === false) await saveCloudWorkspace(email, account, data);
    writeJSON(SESSION_KEY, { email });
    notify("Sesión iniciada correctamente.");
    onLogin(account, data);
  }

  const finishProviderLogin = useCallback(async (result) => {
    const label = "Google";
    const user = result.user;
    const email = user.email?.toLowerCase();
    if (!email) return notify(`No se pudo obtener el email de ${label}.`);

    const accounts = readJSON(ACCOUNTS_KEY, []);
    let account = accounts.find((item) => item.email === email);
    const cloudWorkspace = await loadCloudWorkspace(email);
    let data = cloudWorkspace?.data || readJSON(dataKey(email), null);

    if (!account) {
      account = cloudWorkspace?.account;
    }

    if (!account) {
      const parts = (user.displayName || `Usuario ${label}`).split(" ");
      account = {
        name: toTitleCase(parts[0] || "Usuario"),
        surname: toTitleCase(parts.slice(1).join(" ") || label),
        taxId: "",
        phone: "",
        email,
        password: "google-auth",
        provider: "google",
        photoURL: user.photoURL || "",
        createdAt: new Date().toISOString(),
      };

      data = createEmptyData({
        profile: {
          name: account.name,
          surname: account.surname,
          taxId: "",
          phone: "",
          email,
          photoURL: user.photoURL || "",
        },
        history: [
          {
            id: createId("HIS"),
            type: "Sistema",
            title: `Cuenta creada con ${label}`,
            description: `Se creó el espacio de trabajo usando inicio de sesión con ${label}.`,
            date: new Date().toISOString(),
          },
        ],
      });

      writeJSON(ACCOUNTS_KEY, [account, ...accounts]);
    } else if (!accounts.some((item) => item.email === email)) {
      writeJSON(ACCOUNTS_KEY, [account, ...accounts]);
    }

    data = normalizeStoredData(data || createEmptyData(), account);
    if (!data.profile.photoURL && user.photoURL) {
      data = {
        ...data,
        profile: {
          ...data.profile,
          photoURL: user.photoURL,
        },
      };
    }
    writeJSON(dataKey(email), data);
    await saveCloudWorkspace(email, account, data);

    writeJSON(SESSION_KEY, { email });
    notify(`Sesión iniciada con ${label}.`);
    onLogin(account, data || emptyData);
  }, [onLogin]);

  useEffect(() => {
    let cancelled = false;
    async function completeRedirectLogin() {
      try {
        const [{ auth }, { getRedirectResult }] = await Promise.all([
          import("./firebase"),
          import("firebase/auth"),
        ]);
        const result = await getRedirectResult(auth);
        if (!result || cancelled) return;
        await finishProviderLogin(result);
      } catch (error) {
        if (!cancelled) {
          console.error("Error OAuth redirect:", error);
          notify(authErrorMessage(error));
        }
      }
    }
    completeRedirectLogin();
    return () => {
      cancelled = true;
    };
  }, [finishProviderLogin]);

  async function loginWithGoogle() {
    async function startRedirect() {
      const [{ auth, googleProvider }, { browserLocalPersistence, setPersistence, signInWithRedirect }] = await Promise.all([
        import("./firebase"),
        import("firebase/auth"),
      ]);
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, googleProvider);
    }

    try {
      const [{ auth, googleProvider }, { browserLocalPersistence, setPersistence, signInWithPopup }] = await Promise.all([
        import("./firebase"),
        import("firebase/auth"),
      ]);

      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, googleProvider);
      await finishProviderLogin(result);
    } catch (error) {
      const shouldRedirect = [
        "auth/popup-blocked",
        "auth/cancelled-popup-request",
        "auth/internal-error",
        "auth/web-storage-unsupported",
        "auth/network-request-failed",
      ].includes(error.code);
      if (shouldRedirect) {
        try {
          notify(authErrorMessage(error));
          await startRedirect();
          return;
        } catch (redirectError) {
          console.error("Error Google redirect:", redirectError);
          notify(authErrorMessage(redirectError));
          return;
        }
      }

      console.error("Error Google Auth:", error);
      notify(authErrorMessage(error));
    }
  }

  function loginAnonymously() {
    const email = "anonymous-demo@local.preview";
    const account = {
      name: "Usuario",
      surname: "Anónimo",
      taxId: "",
      phone: "",
      email,
      password: "anonymous-local",
      provider: "anonymous",
      isAnonymous: true,
      createdAt: new Date().toISOString(),
    };
    const data = createAnonymousDemoData(email);
    const accounts = readJSON(ACCOUNTS_KEY, []);
    writeJSON(ACCOUNTS_KEY, [account, ...accounts.filter((item) => item.email !== email)]);
    writeJSON(dataKey(email), data);
    writeJSON(SESSION_KEY, { email });
    notify("Ingresaste como anónimo con datos demo.");
    onLogin(account, data);
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
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-600">{mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear cuenta" : "Recuperar acceso"}</p>
              <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{mode === "login" ? "Entrá a tu espacio" : mode === "register" ? "Creá tu espacio de trabajo" : "Recuperá tu contraseña"}</h2>
            </div>
            <button
              type="button"
              onClick={toggleLanguage}
              data-nm-no-translate
              className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:border-white/20 hover:bg-white/[0.09]"
              aria-label={language === "es" ? "Cambiar a inglés" : "Switch to Spanish"}
              title={language === "es" ? "English" : "Español"}
            >
              {language === "es" ? "ES" : "EN"}
            </button>
          </div>
          {mode === "reset" && <p className="mt-3 text-sm leading-6 text-zinc-500">Te enviamos un enlace oficial de Firebase para crear una nueva contraseña.</p>}
          <form onSubmit={submit} className={`${mode === "reset" ? "mt-6" : ""} space-y-4`}>
            {mode === "reset" && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-400 transition hover:border-white/25 hover:text-white"
              >
                ← Volver
              </button>
            )}
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
            {mode !== "reset" && <Input label="Contraseña" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />}
            {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm text-red-300">{error}</div>}
            {message && <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-300">{message}</div>}
            {mode === "reset" && message && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.08]"
              >
                Iniciar sesión
              </button>
            )}
            {mode === "login" && (
              <button
                type="button"
                onClick={() => switchMode("reset")}
                className="w-full text-right text-sm text-zinc-500 transition hover:text-zinc-200"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
            {mode !== "reset" && (
              <>
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.08]"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-black">G</span>
                  Continuar con Google
                </button>
                <button
                  type="button"
                  onClick={loginAnonymously}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/25 hover:bg-white/[0.07]"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[10px] font-bold text-white">AN</span>
                  Entrar como anónimo
                </button>
              </>
            )}
            <PrimaryButton type="submit" className="w-full">{mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear cuenta" : "Enviar email de recuperación"}</PrimaryButton>
          </form>
          <button onClick={() => switchMode(mode === "login" ? "register" : "login")} className="mt-5 w-full text-center text-sm text-zinc-500 transition hover:text-zinc-200">
            {mode === "login" ? "No tengo cuenta, crear una" : mode === "register" ? "Ya tengo cuenta, iniciar sesión" : "Volver al inicio de sesión"}
          </button>
        </Panel>
      </div>
    </main>
  );
}

function Sidebar({ active, setActive, data }) {
  const visibleNav = getVisibleNavItems(data);
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col border-r border-white/10 bg-[#090909]/95 p-5 backdrop-blur-xl lg:flex">
      <div className="mb-7 flex shrink-0 items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] font-mono text-lg text-white">NM</div>
        <div>
          <p className="font-semibold text-white">{data.business.name || "Nexo Management"}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">Sistema web de gestión operativa</p>
        </div>
      </div>
      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {visibleNav.map((item) => (
          <button key={item.id} onClick={() => setActive(item.id)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm transition ${active === item.id ? "border border-white/10 bg-white/[0.08] text-white" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"}`}>
            <span className="font-mono text-sm">{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function Topbar({
  search,
  setSearch,
  searchFilter,
  setSearchFilter,
  menuOpen,
  toggleMenu,
  closeMenu,
  account,
  data,
  setActive,
  onLogout,
  theme,
  toggleTheme,
  language,
  toggleLanguage,
}) {
  const [open, setOpen] = useState(false);
  const fullName = formatFullName(data.profile) || `${account.name || ""} ${account.surname || ""}`.trim();
  const initials = profileInitials(data.profile);
  const photoURL = data.profile.photoURL || account.photoURL || "";
  const searchOptions = getVisibleNavItems(data).filter((item) => !["dashboard", "settings"].includes(item.id));

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080808]/75 px-5 py-3 backdrop-blur-xl lg:px-8">
      <div className="flex flex-row items-center gap-3 md:justify-between">
        <button
          onClick={() => {
            toggleMenu();
            setOpen(false);
          }}
          className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] transition hover:border-white/20 hover:bg-white/[0.09] lg:hidden"
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
        >
          <span className="h-0.5 w-5 rounded-full bg-zinc-200" />
          <span className="h-0.5 w-5 rounded-full bg-zinc-200" />
          <span className="h-0.5 w-5 rounded-full bg-zinc-200" />
        </button>
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_5.75rem] gap-2 md:max-w-2xl md:grid-cols-[minmax(0,1fr)_7rem]">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar clientes, trabajos, gastos, pagos..." className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/25" />
          <select aria-label="Filtrar búsqueda" title="Filtrar" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2.5 text-xs font-medium text-zinc-300 outline-none sm:px-3">
            <option className="bg-zinc-950" value="all">Filtrar</option>
            {searchOptions.map((item) => <option key={item.id} className="bg-zinc-950" value={item.id}>{item.label}</option>)}
          </select>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            data-nm-no-translate
            className="nm-theme-toggle hidden h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-lg text-white transition hover:border-white/20 hover:bg-white/[0.09] lg:flex"
            aria-label={
              language === "en"
                ? theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
                : theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
            }
            title={theme === "dark" ? "Light" : "Dark"}
          >
            <span key={theme} className="nm-theme-icon">{theme === "dark" ? "☀" : "☾"}</span>
          </button>
          <button
            type="button"
            onClick={toggleLanguage}
            data-nm-no-translate
            className="hidden h-11 min-w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:border-white/20 hover:bg-white/[0.09] lg:flex"
            aria-label={language === "es" ? "Cambiar a inglés" : "Switch to Spanish"}
            title={language === "es" ? "English" : "Español"}
          >
            {language === "es" ? "ES" : "EN"}
          </button>
          <div className="hidden items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-300 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-400" />Sistema activo</div>
          <div className="relative">
            <button onClick={() => { setOpen(!open); if (menuOpen) closeMenu(); }} className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] font-mono text-sm text-white">
              {photoURL ? <img src={photoURL} alt={fullName || "Perfil"} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initials}
            </button>
            {open && (
              <div className="absolute right-0 top-14 w-[min(18rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-zinc-950 p-3 shadow-2xl shadow-black/60">
                <div className="border-b border-white/10 p-3"><p className="font-medium text-white">{fullName}</p><p className="mt-1 text-sm text-zinc-500">{data.profile.email || account.email}</p></div>
                <button onClick={() => { setActive("settings"); setOpen(false); }} className="mt-3 w-full rounded-2xl px-3 py-2 text-left text-sm text-zinc-400 hover:bg-white/[0.06] hover:text-white">Configuración</button>
                <a href={feedbackHref(account, data)} target="_blank" rel="noopener noreferrer" className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-zinc-400 hover:bg-white/[0.06] hover:text-white">Enviar feedback</a>
                <button onClick={onLogout} className="w-full rounded-2xl px-3 py-2 text-left text-sm text-red-300 hover:bg-red-400/10">Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileMenuDrawer({ open, closing, active, setActive, data, closeMenu, theme, toggleTheme, language, toggleLanguage }) {
  if (!open) return null;
  const visibleNav = getVisibleNavItems(data);

  return (
    <div className={`nm-mobile-drawer-layer fixed inset-0 z-[120] overflow-hidden overscroll-contain bg-black/45 backdrop-blur-xl lg:hidden ${closing ? "nm-menu-overlay-out" : "nm-menu-overlay-in"}`} onClick={closeMenu}>
      <aside
        className={`flex h-dvh max-h-dvh w-[min(20rem,86vw)] flex-col overflow-hidden overscroll-contain border-r border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/80 ${closing ? "nm-menu-drawer-out" : "nm-menu-drawer-in"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-7 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] font-mono text-lg text-white">NM</div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{data.business.name || "Nexo Management"}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">Menú</p>
            </div>
          </div>
          <button onClick={closeMenu} className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] transition hover:border-white/20 hover:bg-white/[0.12]" aria-label="Cerrar menú">
            <span className="nm-close-line-a absolute h-0.5 w-5 rounded-full bg-zinc-100 transition-transform duration-200 group-hover:scale-110" />
            <span className="nm-close-line-b absolute h-0.5 w-5 rounded-full bg-zinc-100 transition-transform duration-200 group-hover:scale-110" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
          {visibleNav.map((item) => (
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
        <div className="shrink-0 border-t border-white/10 bg-zinc-950 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              data-nm-no-translate
              className="nm-theme-toggle flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-lg text-white transition hover:border-white/20 hover:bg-white/[0.09]"
              aria-label={
                language === "en"
                  ? theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
                  : theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
              }
              title={theme === "dark" ? "Light" : "Dark"}
            >
              <span key={theme} className="nm-theme-icon">{theme === "dark" ? "☀" : "☾"}</span>
            </button>
            <button
              type="button"
              onClick={toggleLanguage}
              data-nm-no-translate
              className="flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:border-white/20 hover:bg-white/[0.09]"
              aria-label={language === "es" ? "Cambiar a inglés" : "Switch to Spanish"}
              title={language === "es" ? "English" : "Español"}
            >
              {language === "es" ? "ES" : "EN"}
            </button>
          </div>
        </div>
      </aside>
    </div>
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

function Dashboard({ data, setData, setActive }) {
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
      <OnboardingChecklist data={data} setActive={setActive} />
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

function OnboardingChecklist({ data, setActive }) {
  const steps = [
    {
      title: "Completá tu negocio",
      text: "Agregá datos para que presupuestos y órdenes salgan completos.",
      action: "Ir a configuración",
      target: "settings",
      done: isWorkspaceProfileComplete(data),
    },
    {
      title: "Cargá tu primer cliente",
      text: "Los clientes son la base para presupuestos, órdenes y pagos.",
      action: "Ir a clientes",
      target: "clients",
      done: data.clients.length > 0,
    },
    {
      title: "Creá un presupuesto",
      text: "Armá una propuesta y dejala lista para convertirla en orden.",
      action: "Ir a presupuestos",
      target: "budgets",
      done: data.budgets.length > 0,
    },
    {
      title: "Registrá una orden",
      text: "Controlá estado de trabajo, cobros y saldos pendientes.",
      action: "Ir a órdenes",
      target: "orders",
      done: data.orders.length > 0,
    },
  ];
  const pending = steps.filter((step) => !step.done);
  if (pending.length === 0) return null;

  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-white/10 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-600">Primeros pasos</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Configurá la app en pocos minutos y empezá a usarla con datos reales.</h2>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.title} className={`rounded-2xl border p-4 ${step.done ? "border-emerald-400/20 bg-emerald-400/10" : "border-white/10 bg-white/[0.035]"}`}>
            <div className="mb-5 flex items-center justify-between">
              <span className="font-mono text-sm text-zinc-500">0{index + 1}</span>
              <Badge tone={step.done ? "green" : "neutral"}>{step.done ? "OK" : "Pendiente"}</Badge>
            </div>
            <h3 className="font-semibold text-white">{step.title}</h3>
            <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-500">{step.text}</p>
            {!step.done && (
              <button onClick={() => setActive(step.target)} className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.09]">
                {step.action}
              </button>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
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
  const [form, setForm] = useState({ client: "", service: "", amount: "", observations: "" });
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
    setForm({ client: "", service: "", amount: "", observations: "" });
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
          {filtered.length === 0 ? <EmptyState title="Sin presupuestos" text="Cuando crees presupuestos, van a aparecer en esta lista. Usá el formulario de la izquierda para cargar el primero." /> : (
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
  const [form, setForm] = useState({ client: "", service: "", total: "", paidAmount: "", observations: "", status: "Pendiente", payment: "Pendiente" });
  const filtered = data.orders.filter((o) => [o.id, o.client, o.service, o.status, o.payment, o.observations].join(" ").toLowerCase().includes(search.toLowerCase()));

  function reset() {
    setEditing(null);
    setSaveService(false);
    setIncludeSuggestedPrice(false);
    setShowServices(false);
    setForm({ client: "", service: "", total: "", paidAmount: "", observations: "", status: "Pendiente", payment: "Pendiente" });
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
      {filteredOrders.length === 0 ? <EmptyState title="Sin órdenes cargadas" text="Cuando crees órdenes, van a aparecer en esta tabla. Usá el formulario superior para registrar el primer trabajo." /> : (
        <>
          <div className="grid gap-3 p-4 md:hidden">{visible.map((order) => <div key={order.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-sm text-zinc-300">{order.id}</p><p className="mt-1 text-xs text-zinc-600">{dateLabel(order.date)}</p></div><Badge tone={isOrderOverdue(order) ? "amber" : statusTone(order.status)}>{isOrderOverdue(order) ? "Atrasada" : order.status}</Badge></div><div className="mt-4 grid gap-3"><MobileField label="Cliente" value={order.client} />{!compact && <MobileField label="Servicio" value={order.service} />}<MobileField label="Pago"><Badge tone={statusTone(order.payment)}>{order.payment}</Badge></MobileField><div className="grid grid-cols-2 gap-3"><MobileField label="Total">{currency(order.total)}</MobileField><MobileField label="Resta">{currency(getPendingAmount(order))}</MobileField></div></div><div className="mt-4 grid grid-cols-2 gap-2">{order.status === "Pendiente" && <SecondaryButton onClick={() => onFinish?.(order.id)} className="px-3 py-2.5 text-xs">Terminar</SecondaryButton>}{order.payment !== "Pagado" && <SecondaryButton onClick={() => onPay?.(order.id)} className="px-3 py-2.5 text-xs">Pagada</SecondaryButton>}{!compact && <><SecondaryButton onClick={() => onEdit?.(order)} className="px-3 py-2.5 text-xs">Editar</SecondaryButton><SecondaryButton onClick={() => openDocumentWindow({ type: "Orden", id: order.id, data, clientName: order.client, service: order.service, observations: order.observations, amount: order.total, orderStatus: order.status, paymentStatus: order.payment, paidAmount: getPaidAmount(order) })} className="px-3 py-2.5 text-xs">Abrir</SecondaryButton><SecondaryButton onClick={() => onDelete?.(order.id)} className="col-span-2 px-3 py-2.5 text-xs">Eliminar</SecondaryButton></>}</div></div>)}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[980px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-zinc-600"><tr><th className="px-4 py-2.5">Orden</th><th className="px-4 py-2.5">Cliente</th>{!compact && <th className="px-4 py-2.5">Servicio</th>}<th className="px-4 py-2.5">Estado</th><th className="px-4 py-2.5">Pago</th><th className="px-4 py-2.5">Total</th><th className="px-4 py-2.5">Resta</th>{!compact && <th className="px-4 py-2.5">Acciones</th>}</tr></thead><tbody className="divide-y divide-white/10">{visible.map((order) => <tr key={order.id} className="transition hover:bg-white/[0.035]"><td className="px-4 py-2 font-mono text-zinc-300">{order.id}<p className="mt-1 text-xs text-zinc-600">{dateLabel(order.date)}</p></td><td className="px-4 py-2 font-medium text-white">{order.client}</td>{!compact && <td className="px-4 py-2 text-zinc-500">{order.service}</td>}<td className="px-4 py-1.5"><div className="flex items-center gap-1.5"><Badge tone={isOrderOverdue(order) ? "amber" : statusTone(order.status)}>{isOrderOverdue(order) ? "Atrasada" : order.status}</Badge>{order.status === "Pendiente" && <button onClick={() => onFinish?.(order.id)} title="Marcar como terminado" className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-[10px] text-emerald-300">✓</button>}</div></td><td className="px-4 py-1.5"><div className="flex items-center gap-1.5"><Badge tone={statusTone(order.payment)}>{order.payment}</Badge>{order.payment !== "Pagado" && <button onClick={() => onPay?.(order.id)} title="Marcar como pagado" className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-[10px] text-emerald-300">✓</button>}</div></td><td className="px-4 py-1.5 text-sm font-medium text-zinc-200">{currency(order.total)}</td><td className="px-4 py-1.5 text-sm font-medium text-zinc-200">{currency(getPendingAmount(order))}</td>{!compact && <td className="px-4 py-1.5"><div className="flex flex-nowrap gap-1.5"><SecondaryButton onClick={() => onEdit?.(order)} className="px-2.5 py-1.5">Editar</SecondaryButton><SecondaryButton onClick={() => openDocumentWindow({ type: "Orden", id: order.id, data, clientName: order.client, service: order.service, observations: order.observations, amount: order.total, orderStatus: order.status, paymentStatus: order.payment, paidAmount: getPaidAmount(order) })} className="px-2.5 py-1.5">Abrir orden</SecondaryButton><SecondaryButton onClick={() => onDelete?.(order.id)} className="px-2.5 py-1.5">Eliminar</SecondaryButton></div></td>}</tr>)}</tbody></table></div>
          {!compact && filteredOrders.length > perPage && <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-5"><span>Página {page} de {totalPages}</span><div className="flex gap-2"><SecondaryButton onClick={() => setPage(Math.max(page - 1, 1))}>Anterior</SecondaryButton><SecondaryButton onClick={() => setPage(Math.min(page + 1, totalPages))}>Siguiente</SecondaryButton></div></div>}
        </>
      )}
    </Panel>
  );
}

// Hidden for now: Nexo is focused on services, not POS/inventory.
// eslint-disable-next-line no-unused-vars
function Products({ data, setData, search }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", cost: "", price: "", stock: "", minStock: "", tracksStock: true });
  const query = search.trim().toLowerCase();
  const products = (data.products || []).filter((product) => [product.name, product.category, product.sku].join(" ").toLowerCase().includes(query));

  function reset() {
    setEditing(null);
    setForm({ name: "", category: "", cost: "", price: "", stock: "", minStock: "", tracksStock: true });
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return notify("Completa el nombre del producto.");
    const product = {
      id: editing || createId("PROD"),
      name: form.name.trim(),
      category: form.category.trim(),
      cost: parseARS(form.cost),
      price: parseARS(form.price),
      stock: form.tracksStock ? Number(form.stock || 0) : 0,
      minStock: form.tracksStock ? Number(form.minStock || 0) : 0,
      tracksStock: Boolean(form.tracksStock),
      updatedAt: new Date().toISOString(),
    };
    setData((prev) => {
      const products = editing
        ? (prev.products || []).map((item) => (item.id === editing ? product : item))
        : [product, ...(prev.products || [])];
      const stockMovements = editing || !product.tracksStock ? (prev.stockMovements || []) : [
        { id: createId("STK"), productId: product.id, productName: product.name, type: "Alta inicial", quantity: product.stock, date: todayISO() },
        ...(prev.stockMovements || []),
      ];
      return addHistory({ ...prev, products, stockMovements }, "Producto", editing ? "Producto actualizado" : "Producto creado", product.name);
    });
    notify(editing ? "Producto actualizado." : "Producto creado.");
    reset();
  }

  async function remove(id) {
    if (!(await confirmAction("Seguro que queres eliminar este producto?"))) return;
    setData((prev) => addHistory({ ...prev, products: (prev.products || []).filter((item) => item.id !== id) }, "Producto", "Producto eliminado", id));
  }

  function startEdit(product) {
    setEditing(product.id);
    setForm({
      name: product.name || "",
      category: product.category || "",
      cost: formatARSInput(product.cost || 0),
      price: formatARSInput(product.price || 0),
      stock: String(product.stock || 0),
      minStock: String(product.minStock || 0),
      tracksStock: product.tracksStock !== false,
    });
  }

  const lowStock = products.filter((product) => product.tracksStock && productStock(product) <= Number(product.minStock || 0)).length;

  return (
    <div className="space-y-6">
      <PageHeader label="Productos" title="Catalogo e inventario" text="Carga productos, precios, costos y control de stock solo cuando el negocio lo necesita." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Productos" value={products.length} meta="Catalogo activo" icon="PD" />
        <StatCard label="Con stock" value={products.filter((product) => product.tracksStock).length} meta="Control inventario" icon="ST" />
        <StatCard label="Stock bajo" value={lowStock} meta="Alertas de reposicion" icon="!" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <Panel className="p-5">
          <h3 className="text-xl font-semibold text-white">{editing ? "Editar producto" : "Nuevo producto"}</h3>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <Input label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Input label="Categoria" value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="Opcional" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Costo" value={form.cost} onChange={(v) => setForm({ ...form, cost: formatARSInput(v) })} />
              <Input label="Precio venta" value={form.price} onChange={(v) => setForm({ ...form, price: formatARSInput(v) })} />
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-zinc-300">
              <input type="checkbox" checked={form.tracksStock} onChange={(e) => setForm({ ...form, tracksStock: e.target.checked })} />
              Controlar stock de este producto
            </label>
            {form.tracksStock && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Stock actual" value={form.stock} onChange={(v) => setForm({ ...form, stock: onlyDigits(v) })} />
                <Input label="Stock minimo" value={form.minStock} onChange={(v) => setForm({ ...form, minStock: onlyDigits(v) })} />
              </div>
            )}
            <div className="flex gap-3">
              <PrimaryButton type="submit" className="flex-1">{editing ? "Guardar cambios" : "Agregar producto"}</PrimaryButton>
              {editing && <SecondaryButton onClick={reset}>Cancelar</SecondaryButton>}
            </div>
          </form>
        </Panel>
        <Panel className="overflow-hidden">
          <div className="border-b border-white/10 p-5"><h3 className="text-xl font-semibold text-white">Productos registrados</h3><p className="mt-1 text-sm text-zinc-500">{products.length} resultados visibles</p></div>
          {products.length === 0 ? <EmptyState title="Sin productos" text="Carga el primer producto para empezar a vender o controlar stock." /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-zinc-600"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Costo</th><th className="px-4 py-3">Precio</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Acciones</th></tr></thead>
                <tbody className="divide-y divide-white/10">{products.map((product) => <tr key={product.id} className="hover:bg-white/[0.035]"><td className="px-4 py-3 font-medium text-white">{product.name}<p className="mt-1 text-xs text-zinc-600">{product.id}</p></td><td className="px-4 py-3 text-zinc-400">{product.category || "-"}</td><td className="px-4 py-3 text-zinc-400">{currency(product.cost || 0)}</td><td className="px-4 py-3 text-zinc-200">{currency(product.price || 0)}</td><td className="px-4 py-3"><Badge tone={stockTone(product)}>{product.tracksStock ? product.stock : "Sin stock"}</Badge></td><td className="px-4 py-3"><div className="flex gap-2"><SecondaryButton onClick={() => startEdit(product)}>Editar</SecondaryButton><SecondaryButton onClick={() => remove(product.id)}>Eliminar</SecondaryButton></div></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// Hidden for now: mass sales require a dedicated POS flow.
// eslint-disable-next-line no-unused-vars
function Sales({ data, setData, search }) {
  const [form, setForm] = useState({ productId: "", quantity: "1", amount: "", paymentMethod: "Efectivo", client: "", notes: "" });
  const query = search.trim().toLowerCase();
  const sales = (data.sales || []).filter((sale) => [sale.id, sale.productName, sale.client, sale.paymentMethod, sale.notes].join(" ").toLowerCase().includes(query));
  const selectedProduct = (data.products || []).find((product) => product.id === form.productId);

  function submit(e) {
    e.preventDefault();
    const quantity = Math.max(Number(form.quantity || 1), 1);
    const amount = parseARS(form.amount);
    if (!selectedProduct && amount <= 0) return notify("Carga un producto o un importe de venta.");
    if (selectedProduct?.tracksStock && productStock(selectedProduct) < quantity) return notify("No hay stock suficiente para esta venta.");
    const sale = {
      id: createId("VEN"),
      date: todayISO(),
      productId: selectedProduct?.id || "",
      productName: selectedProduct?.name || "Venta manual",
      quantity,
      amount,
      paymentMethod: form.paymentMethod,
      client: form.client,
      notes: form.notes.trim(),
    };
    setData((prev) => {
      const products = selectedProduct?.tracksStock
        ? (prev.products || []).map((product) => product.id === selectedProduct.id ? { ...product, stock: Math.max(productStock(product) - quantity, 0), updatedAt: new Date().toISOString() } : product)
        : (prev.products || []);
      const stockMovements = selectedProduct?.tracksStock ? [{ id: createId("STK"), productId: selectedProduct.id, productName: selectedProduct.name, type: "Venta", quantity: -quantity, date: todayISO() }, ...(prev.stockMovements || [])] : (prev.stockMovements || []);
      return addHistory({ ...prev, products, stockMovements, sales: [sale, ...(prev.sales || [])] }, "Venta", "Venta registrada", `${sale.productName} - ${currency(sale.amount)}`);
    });
    notify("Venta registrada.");
    setForm({ productId: "", quantity: "1", amount: "", paymentMethod: "Efectivo", client: "", notes: "" });
  }

  const month = new Date().toISOString().slice(0, 7);
  const monthSales = (data.sales || []).filter((sale) => monthKey(sale.date) === month);
  const monthTotal = monthSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader label="Ventas" title="Venta rapida" text="Registra operaciones del dia, descuenta stock cuando corresponde y separa los medios de pago." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Ventas del mes" value={monthSales.length} meta="Operaciones registradas" icon="VT" />
        <StatCard label="Ingresos por ventas" value={currency(monthTotal)} meta="Total mensual" icon="$" />
        <StatCard label="Ticket promedio" value={currency(monthSales.length ? monthTotal / monthSales.length : 0)} meta="Promedio mensual" icon="TP" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <Panel className="p-5">
          <h3 className="text-xl font-semibold text-white">Nueva venta</h3>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <Select label="Producto" value={form.productId} onChange={(v) => {
              const product = (data.products || []).find((item) => item.id === v);
              setForm({ ...form, productId: v, amount: product ? formatARSInput((product.price || 0) * Number(form.quantity || 1)) : form.amount });
            }} options={[{ value: "", label: "Venta manual" }, ...(data.products || []).map((product) => ({ value: product.id, label: `${product.name} - ${currency(product.price || 0)}` }))]} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Cantidad" value={form.quantity} onChange={(v) => {
                const quantity = onlyDigits(v) || "1";
                setForm({ ...form, quantity, amount: selectedProduct ? formatARSInput((selectedProduct.price || 0) * Number(quantity || 1)) : form.amount });
              }} />
              <Input label="Importe" value={form.amount} onChange={(v) => setForm({ ...form, amount: formatARSInput(v) })} />
            </div>
            <Select label="Metodo de pago" value={form.paymentMethod} onChange={(v) => setForm({ ...form, paymentMethod: v })} options={["Efectivo", "Transferencia", "Mercado Pago", "Tarjeta", "Fiado"].map((value) => ({ value, label: value }))} />
            <ClientPicker label="Cliente" value={form.client} onChange={(v) => setForm({ ...form, client: v })} clients={data.clients} />
            <Input label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Opcional" />
            <PrimaryButton type="submit" className="w-full">Registrar venta</PrimaryButton>
          </form>
        </Panel>
        <Panel className="overflow-hidden">
          <div className="border-b border-white/10 p-5"><h3 className="text-xl font-semibold text-white">Ventas recientes</h3><p className="mt-1 text-sm text-zinc-500">{sales.length} resultados visibles</p></div>
          {sales.length === 0 ? <EmptyState title="Sin ventas" text="Las ventas registradas van a aparecer aca." /> : <div className="divide-y divide-white/10">{sales.slice(0, 30).map((sale) => <div key={sale.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center"><div><p className="font-medium text-white">{sale.productName}</p><p className="mt-1 text-sm text-zinc-500">{dateLabel(sale.date)} - {sale.quantity} u. - {sale.paymentMethod}{sale.client ? ` - ${sale.client}` : ""}</p></div><p className="text-lg font-semibold text-white">{currency(sale.amount)}</p></div>)}</div>}
        </Panel>
      </div>
    </div>
  );
}

function Expenses({ data, setData, search }) {
  const [form, setForm] = useState({ description: "", category: "", amount: "", supplier: "", paymentMethod: "Efectivo" });
  const query = search.trim().toLowerCase();
  const expenses = (data.expenses || []).filter((expense) => [expense.description, expense.category, expense.supplier, expense.paymentMethod].join(" ").toLowerCase().includes(query));
  const categoryListId = "expense-categories";
  const categories = [...new Set(["Insumos", "Alquiler", "Servicios", "Publicidad", "Transporte", ...(data.expenses || []).map((expense) => expense.category).filter(Boolean)])];

  function submit(e) {
    e.preventDefault();
    if (!form.description.trim() || parseARS(form.amount) <= 0) return notify("Completa descripcion e importe.");
    const expense = { id: createId("GAS"), date: todayISO(), description: form.description.trim(), category: form.category.trim(), amount: parseARS(form.amount), supplier: form.supplier, paymentMethod: form.paymentMethod };
    setData((prev) => addHistory({ ...prev, expenses: [expense, ...(prev.expenses || [])] }, "Gasto", "Gasto registrado", `${expense.description} - ${currency(expense.amount)}`));
    notify("Gasto registrado.");
    setForm({ description: "", category: "", amount: "", supplier: "", paymentMethod: "Efectivo" });
  }

  const month = new Date().toISOString().slice(0, 7);
  const monthExpenses = expenses.filter((expense) => monthKey(expense.date) === month);
  const total = monthExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader label="Gastos" title="Egresos del negocio" text="Registra alquiler, insumos, compras, publicidad y cualquier salida de dinero." />
      <div className="grid gap-4 md:grid-cols-2"><StatCard label="Gastos del mes" value={currency(total)} meta={`${monthExpenses.length} movimientos`} icon="GS" /><StatCard label="Categorias" value={new Set(expenses.map((expense) => expense.category).filter(Boolean)).size} meta="Orden de egresos" icon="CT" /></div>
      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <Panel className="p-5"><h3 className="text-xl font-semibold text-white">Nuevo gasto</h3><form onSubmit={submit} className="mt-5 space-y-4"><Input label="Descripcion" value={form.description} onChange={(v) => setForm({ ...form, description: v })} /><label className="block"><span className="mb-2 block text-sm text-zinc-500">Categoria</span><input list={categoryListId} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ej: insumos, alquiler" className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-white/25 focus:bg-white/[0.06]" /><datalist id={categoryListId}>{categories.map((category) => <option key={category} value={category} />)}</datalist></label><Input label="Importe" value={form.amount} onChange={(v) => setForm({ ...form, amount: formatARSInput(v) })} /><Select label="Proveedor" value={form.supplier} onChange={(v) => setForm({ ...form, supplier: v })} options={[{ value: "", label: "Sin proveedor" }, ...(data.suppliers || []).map((supplier) => ({ value: supplier.name, label: supplier.name }))]} /><Select label="Metodo de pago" value={form.paymentMethod} onChange={(v) => setForm({ ...form, paymentMethod: v })} options={["Efectivo", "Transferencia", "Mercado Pago", "Tarjeta"].map((value) => ({ value, label: value }))} /><PrimaryButton type="submit" className="w-full">Registrar gasto</PrimaryButton></form></Panel>
        <Panel className="overflow-hidden"><div className="border-b border-white/10 p-5"><h3 className="text-xl font-semibold text-white">Gastos recientes</h3></div>{expenses.length === 0 ? <EmptyState title="Sin gastos" text="Los egresos registrados van a aparecer aca." /> : <div className="divide-y divide-white/10">{expenses.slice(0, 30).map((expense) => <div key={expense.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto]"><div><p className="font-medium text-white">{expense.description}</p><p className="mt-1 text-sm text-zinc-500">{dateLabel(expense.date)} - {expense.category || "Sin categoria"}{expense.supplier ? ` - ${expense.supplier}` : ""}</p></div><p className="font-semibold text-red-300">-{currency(expense.amount)}</p></div>)}</div>}</Panel>
      </div>
    </div>
  );
}

function Suppliers({ data, setData, search }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", category: "", notes: "" });
  const query = search.trim().toLowerCase();
  const suppliers = (data.suppliers || []).filter((supplier) => [supplier.name, supplier.phone, supplier.email, supplier.category, supplier.notes].join(" ").toLowerCase().includes(query));

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return notify("Completa el nombre del proveedor.");
    const supplier = { id: createId("PROV"), ...form, name: form.name.trim(), phone: onlyDigits(form.phone), createdAt: new Date().toISOString() };
    setData((prev) => addHistory({ ...prev, suppliers: [supplier, ...(prev.suppliers || [])] }, "Proveedor", "Proveedor creado", supplier.name));
    notify("Proveedor creado.");
    setForm({ name: "", phone: "", email: "", category: "", notes: "" });
  }

  return (
    <div className="space-y-6">
      <PageHeader label="Proveedores" title="Contactos de compra" text="Guarda mayoristas, distribuidores y servicios vinculados a compras o gastos." />
      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <Panel className="p-5"><h3 className="text-xl font-semibold text-white">Nuevo proveedor</h3><form onSubmit={submit} className="mt-5 space-y-4"><Input label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} /><Input label="Telefono" value={form.phone} onChange={(v) => setForm({ ...form, phone: onlyDigits(v) })} /><Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} /><Input label="Rubro" value={form.category} onChange={(v) => setForm({ ...form, category: v })} /><Input label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} /><PrimaryButton type="submit" className="w-full">Agregar proveedor</PrimaryButton></form></Panel>
        <Panel className="overflow-hidden"><div className="border-b border-white/10 p-5"><h3 className="text-xl font-semibold text-white">Proveedores registrados</h3><p className="mt-1 text-sm text-zinc-500">{suppliers.length} resultados visibles</p></div>{suppliers.length === 0 ? <EmptyState title="Sin proveedores" text="Carga proveedores para vincularlos con gastos y compras." /> : <div className="divide-y divide-white/10">{suppliers.map((supplier) => <div key={supplier.id} className="p-4"><p className="font-medium text-white">{supplier.name}</p><p className="mt-1 text-sm text-zinc-500">{[supplier.phone, supplier.email, supplier.category].filter(Boolean).join(" - ") || supplier.id}</p>{supplier.notes && <p className="mt-2 text-sm text-zinc-600">{supplier.notes}</p>}</div>)}</div>}</Panel>
      </div>
    </div>
  );
}

function Cash({ data, setData }) {
  const openSession = (data.cashSessions || []).find((session) => !session.closedAt);
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const todayIncome = (data.orders || []).filter((order) => order.date === todayISO()).reduce((sum, order) => sum + getPaidAmount(order), 0);
  const todayExpenses = (data.expenses || []).filter((expense) => expense.date === todayISO()).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const expected = Number(openSession?.openingAmount || 0) + todayIncome - todayExpenses;

  function openCash(e) {
    e.preventDefault();
    if (openSession) return notify("Ya hay una caja abierta.");
    const session = { id: createId("CAJ"), date: todayISO(), openingAmount: parseARS(openingAmount), openedAt: new Date().toISOString() };
    setData((prev) => addHistory({ ...prev, cashSessions: [session, ...(prev.cashSessions || [])] }, "Caja", "Caja abierta", currency(session.openingAmount)));
    setOpeningAmount("");
  }

  function closeCash(e) {
    e.preventDefault();
    if (!openSession) return;
    const real = parseARS(closingAmount);
    setData((prev) => addHistory({ ...prev, cashSessions: (prev.cashSessions || []).map((session) => session.id === openSession.id ? { ...session, closedAt: new Date().toISOString(), incomeTotal: todayIncome, expensesTotal: todayExpenses, expectedAmount: expected, closingAmount: real, difference: real - expected } : session) }, "Caja", "Caja cerrada", `Diferencia: ${currency(real - expected)}`));
    setClosingAmount("");
  }

  return (
    <div className="space-y-6">
      <PageHeader label="Caja diaria" title="Control del dia" text="Abre y cierra caja para comparar efectivo esperado contra dinero real." />
      <div className="grid gap-4 md:grid-cols-4"><StatCard label="Saldo inicial" value={currency(openSession?.openingAmount || 0)} meta={openSession ? "Caja abierta" : "Sin caja abierta"} icon="IN" /><StatCard label="Cobros hoy" value={currency(todayIncome)} meta="Ingresos del dia" icon="OK" /><StatCard label="Gastos hoy" value={currency(todayExpenses)} meta="Egresos del dia" icon="GS" /><StatCard label="Esperado" value={currency(expected)} meta="Saldo calculado" icon="CJ" /></div>
      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <Panel className="p-5">{openSession ? <form onSubmit={closeCash} className="space-y-4"><h3 className="text-xl font-semibold text-white">Cerrar caja</h3><Input label="Dinero real al cierre" value={closingAmount} onChange={(v) => setClosingAmount(formatARSInput(v))} /><PrimaryButton type="submit" className="w-full">Cerrar caja</PrimaryButton></form> : <form onSubmit={openCash} className="space-y-4"><h3 className="text-xl font-semibold text-white">Abrir caja</h3><Input label="Saldo inicial" value={openingAmount} onChange={(v) => setOpeningAmount(formatARSInput(v))} /><PrimaryButton type="submit" className="w-full">Abrir caja</PrimaryButton></form>}</Panel>
        <Panel className="overflow-hidden"><div className="border-b border-white/10 p-5"><h3 className="text-xl font-semibold text-white">Cierres anteriores</h3></div>{(data.cashSessions || []).length === 0 ? <EmptyState title="Sin cajas" text="Cuando abras y cierres caja, el historial aparecera aca." /> : <div className="divide-y divide-white/10">{(data.cashSessions || []).map((session) => <div key={session.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto]"><div><p className="font-medium text-white">{dateLabel(session.date)}</p><p className="mt-1 text-sm text-zinc-500">{session.closedAt ? "Cerrada" : "Abierta"} - Esperado {currency(session.expectedAmount || session.openingAmount || 0)}</p></div><Badge tone={session.closedAt && Number(session.difference || 0) !== 0 ? "warning" : "success"}>{session.closedAt ? currency(session.difference || 0) : "Activa"}</Badge></div>)}</div>}</Panel>
      </div>
    </div>
  );
}

function Reports({ data }) {
  const month = new Date().toISOString().slice(0, 7);
  const monthExpenses = (data.expenses || []).filter((expense) => monthKey(expense.date) === month);
  const expensesTotal = monthExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const monthOrders = (data.orders || []).filter((order) => monthKey(order.date) === month);
  const serviceTotal = monthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const collectedTotal = monthOrders.reduce((sum, order) => sum + getPaidAmount(order), 0);
  const pendingTotal = monthOrders.reduce((sum, order) => sum + getPendingAmount(order), 0);
  const expensesByCategory = Object.values(monthExpenses.reduce((acc, expense) => {
    const key = expense.category || "Sin categoria";
    acc[key] = acc[key] || { name: key, amount: 0 };
    acc[key].amount += Number(expense.amount || 0);
    return acc;
  }, {})).sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      <PageHeader label="Reportes" title="Lectura del negocio" text="Una vista compacta de trabajos, cobros, gastos y resultado operativo." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><StatCard label="Servicios" value={currency(serviceTotal)} meta="Ordenes del mes" icon="OP" /><StatCard label="Cobrado" value={currency(collectedTotal)} meta="Ingresos del mes" icon="OK" /><StatCard label="Gastos" value={currency(expensesTotal)} meta="Egresos del mes" icon="GS" /><StatCard label="Resultado bruto" value={currency(collectedTotal - expensesTotal)} meta="Ingresos menos gastos" icon="$" /></div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="overflow-hidden"><div className="border-b border-white/10 p-5"><h3 className="text-xl font-semibold text-white">Cobros pendientes</h3></div><div className="p-5"><p className="text-3xl font-semibold text-white">{currency(pendingTotal)}</p><p className="mt-2 text-sm text-zinc-500">Clientes con saldo abierto</p></div></Panel>
        <Panel className="overflow-hidden"><div className="border-b border-white/10 p-5"><h3 className="text-xl font-semibold text-white">Gastos por categoria</h3></div>{expensesByCategory.length === 0 ? <EmptyState title="Sin gastos registrados" text="Cuando registres gastos, vas a ver el total por categoría." /> : <div className="divide-y divide-white/10">{expensesByCategory.map((item) => <div key={item.name} className="flex items-center justify-between gap-4 p-4"><p className="font-medium text-white">{item.name}</p><p className="font-semibold text-white">{currency(item.amount)}</p></div>)}</div>}</Panel>
      </div>
    </div>
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
  const filters = ["Todo", "Sistema", "Cliente", "Presupuesto", "Orden", "Gasto", "Proveedor", "Caja"];
  const items = data.history.filter((h) => (filter === "Todo" || h.type === filter) && [h.type, h.title, h.description].join(" ").toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6"><PageHeader label="Historial general" title="Actividad del sistema" text="Registro filtrable de acciones importantes." /><Panel className="overflow-hidden"><div className="flex flex-wrap gap-2 border-b border-white/10 p-5">{filters.map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1.5 text-xs ${filter === f ? "border-white/20 bg-white/[0.1] text-white" : "border-white/10 bg-white/[0.035] text-zinc-500"}`}>{f}</button>)}</div>{items.length === 0 ? <EmptyState title="Sin actividad" text="Las acciones aparecerán acá." /> : <div className="divide-y divide-white/10">{items.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 hover:bg-white/[0.035] md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-3"><Badge>{item.type}</Badge><h3 className="font-medium text-white">{item.title}</h3></div><p className="mt-2 text-sm text-zinc-500">{item.description}</p></div><p className="text-sm text-zinc-600">{dateTimeLabel(item.date)}</p></div>)}</div>}</Panel></div>;
}

function GlobalSearchResults({ data, search, filter, setActive, clearSearch }) {
  const query = search.trim().toLowerCase();
  const clients = data.clients.filter((client) => [client.name, client.phone, client.email, client.notes].join(" ").toLowerCase().includes(query)).slice(0, 8);
  const budgets = data.budgets.filter((budget) => [budget.id, budget.client, budget.service, budget.status, budget.observations].join(" ").toLowerCase().includes(query)).slice(0, 8);
  const orders = data.orders.filter((order) => [order.id, order.client, order.service, order.status, order.payment, order.observations].join(" ").toLowerCase().includes(query)).slice(0, 8);
  const expenses = (data.expenses || []).filter((expense) => [expense.description, expense.category, expense.supplier, expense.paymentMethod].join(" ").toLowerCase().includes(query)).slice(0, 8);
  const suppliers = (data.suppliers || []).filter((supplier) => [supplier.name, supplier.phone, supplier.email, supplier.category, supplier.notes].join(" ").toLowerCase().includes(query)).slice(0, 8);
  const history = data.history.filter((item) => [item.type, item.title, item.description].join(" ").toLowerCase().includes(query)).slice(0, 8);
  const groups = [
    { key: "clients", title: "Clientes", section: "clients", items: clients },
    { key: "budgets", title: "Presupuestos", section: "budgets", items: budgets },
    { key: "orders", title: "Órdenes", section: "orders", items: orders },
    { key: "expenses", title: "Gastos", section: "expenses", items: expenses },
    { key: "suppliers", title: "Proveedores", section: "suppliers", items: suppliers },
    { key: "history", title: "Historial", section: "history", items: history },
  ].filter((group) => (group.key === "history" || isModuleEnabled(data, group.key)) && (filter === "all" || group.key === filter));
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  function openSection(section) {
    setActive(section);
    clearSearch();
  }

  function ResultGroup({ title, section, children, empty }) {
    return (
      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <SecondaryButton onClick={() => openSection(section)}>Ver sección</SecondaryButton>
        </div>
        {empty ? <EmptyState title="Sin resultados" text="No hay coincidencias para esta sección." /> : <div className="divide-y divide-white/10">{children}</div>}
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader label="Búsqueda" title="Resultados globales" text={`${total} coincidencias para "${search.trim()}".`} />
      <div className="grid gap-6 xl:grid-cols-2">
        {groups.map((group) => (
          <ResultGroup key={group.key} title={group.title} section={group.section} empty={group.items.length === 0}>
            {group.key === "clients" && group.items.map((client) => <button key={client.id} onClick={() => openSection("clients")} className="block w-full p-4 text-left hover:bg-white/[0.035]"><p className="font-medium text-white">{client.name}</p><p className="mt-1 text-sm text-zinc-500">{[client.phone, client.email].filter(Boolean).join(" · ") || client.id}</p></button>)}
            {group.key === "budgets" && group.items.map((budget) => <button key={budget.id} onClick={() => openSection("budgets")} className="block w-full p-4 text-left hover:bg-white/[0.035]"><p className="font-mono text-sm text-zinc-300">{budget.id}</p><p className="mt-1 font-medium text-white">{budget.client}</p><p className="mt-1 text-sm text-zinc-500">{budget.service} · {currency(budget.amount)}</p></button>)}
            {group.key === "orders" && group.items.map((order) => <button key={order.id} onClick={() => openSection("orders")} className="block w-full p-4 text-left hover:bg-white/[0.035]"><p className="font-mono text-sm text-zinc-300">{order.id}</p><p className="mt-1 font-medium text-white">{order.client}</p><p className="mt-1 text-sm text-zinc-500">{order.service} · {currency(order.total)}</p></button>)}
            {group.key === "expenses" && group.items.map((expense) => <button key={expense.id} onClick={() => openSection("expenses")} className="block w-full p-4 text-left hover:bg-white/[0.035]"><p className="font-medium text-white">{expense.description}</p><p className="mt-1 text-sm text-zinc-500">{expense.category || "Sin categoria"} - {currency(expense.amount || 0)}</p></button>)}
            {group.key === "suppliers" && group.items.map((supplier) => <button key={supplier.id} onClick={() => openSection("suppliers")} className="block w-full p-4 text-left hover:bg-white/[0.035]"><p className="font-medium text-white">{supplier.name}</p><p className="mt-1 text-sm text-zinc-500">{[supplier.phone, supplier.email].filter(Boolean).join(" - ") || supplier.id}</p></button>)}
            {group.key === "history" && group.items.map((item) => <button key={item.id} onClick={() => openSection("history")} className="block w-full p-4 text-left hover:bg-white/[0.035]"><div className="flex items-center gap-3"><Badge>{item.type}</Badge><p className="font-medium text-white">{item.title}</p></div><p className="mt-2 text-sm text-zinc-500">{item.description}</p></button>)}
          </ResultGroup>
        ))}
      </div>
    </div>
  );
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

  function applyBusinessPreset(type) {
    const preset = BUSINESS_PRESETS[type];
    if (!preset) return;
    setBusiness((prev) => ({
      ...prev,
      businessType: type,
      enabledModules: { ...DEFAULT_MODULES, ...preset.modules },
    }));
  }

  function toggleModule(module) {
    setBusiness((prev) => ({
      ...prev,
      enabledModules: {
        ...DEFAULT_MODULES,
        ...(prev.enabledModules || {}),
        [module]: !getEnabledModules({ business: prev })[module],
      },
    }));
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
            <ProfilePhotoInput
              photoURL={profile.photoURL || ""}
              initials={profileInitials(profile)}
              onChange={(photoURL) => setProfile({ ...profile, photoURL })}
            />
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

        <Panel className="p-6 xl:col-span-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Tipo de negocio y modulos</h3>
              <p className="mt-1 text-sm text-zinc-500">Elegí un perfil para que la app muestre solo lo necesario. Después podés ajustar cada módulo manualmente.</p>
            </div>
            <Badge>{BUSINESS_PRESETS[business.businessType]?.label || "Personalizado"}</Badge>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(BUSINESS_PRESETS).map(([type, preset]) => (
              <button
                key={type}
                type="button"
                onClick={() => applyBusinessPreset(type)}
                className={`rounded-2xl border p-4 text-left transition ${business.businessType === type ? "border-white/25 bg-white/[0.08]" : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"}`}
              >
                <p className="font-medium text-white">{preset.label}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{preset.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {navItems.filter((item) => item.module).map((item) => {
              const enabled = getEnabledModules({ business })[item.module];
              return (
                <label key={item.id} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition ${enabled ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/[0.035] text-zinc-400"}`}>
                  <span>{item.label}</span>
                  <input type="checkbox" checked={enabled} onChange={() => toggleModule(item.module)} />
                </label>
              );
            })}
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

function CompleteProfile({ data, setData, account, onLogout }) {
  const [profile, setProfile] = useState(data.profile);
  const [business, setBusiness] = useState(data.business);
  const [error, setError] = useState("");

  function save(e) {
    e.preventDefault();
    setError("");

    if (!profile.name?.trim() || !profile.surname?.trim()) {
      setError("Completá nombre y apellido.");
      return;
    }
    if (!profile.taxId?.trim()) {
      setError("Completá CUIT / CUIL.");
      return;
    }
    if (!isValidPhone(profile.phone)) {
      setError("El teléfono debe tener entre 8 y 15 números.");
      return;
    }
    if (!isValidEmail(profile.email || account.email)) {
      setError("Completá un email válido.");
      return;
    }
    if (!business.name?.trim() || !business.category?.trim() || !business.address?.trim() || !business.cuit?.trim()) {
      setError("Completá todos los datos del negocio.");
      return;
    }

    const nextProfile = {
      ...profile,
      name: toTitleCase(profile.name),
      surname: toTitleCase(profile.surname),
      taxId: onlyDigits(profile.taxId),
      phone: onlyDigits(profile.phone),
      email: normalizeEmail(profile.email || account.email),
    };
    const nextBusiness = {
      ...business,
      name: business.name.trim(),
      category: business.category.trim(),
      address: business.address.trim(),
      cuit: onlyDigits(business.cuit),
    };

    setData((prev) =>
      addHistory(
        { ...prev, profile: nextProfile, business: nextBusiness },
        "Sistema",
        "Perfil completado",
        "Se completaron los datos obligatorios de la cuenta."
      )
    );
    notify("Perfil completado correctamente.");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#080808] text-zinc-100">
      <ToastHost />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 sm:px-6">
        <Panel className="w-full p-5 sm:p-8">
          <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-600">Configuración inicial</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">Completá tus datos</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
                Para usar tu espacio necesitamos completar los datos personales y del negocio. Estos datos se usan en órdenes, presupuestos y documentos.
              </p>
            </div>
            <button type="button" onClick={onLogout} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-400 transition hover:border-white/25 hover:text-white">
              Cerrar sesión
            </button>
          </div>

          <form onSubmit={save} className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Datos personales</h2>
              <ProfilePhotoInput
                photoURL={profile.photoURL || account.photoURL || ""}
                initials={profileInitials(profile)}
                onChange={(photoURL) => setProfile({ ...profile, photoURL })}
              />
              <Input label="Nombre" value={profile.name || ""} onChange={(v) => setProfile({ ...profile, name: toTitleCase(v) })} />
              <Input label="Apellido" value={profile.surname || ""} onChange={(v) => setProfile({ ...profile, surname: toTitleCase(v) })} />
              <Input label="CUIT / CUIL" value={profile.taxId || ""} onChange={(v) => setProfile({ ...profile, taxId: onlyDigits(v) })} />
              <Input label="Teléfono" value={profile.phone || ""} onChange={(v) => setProfile({ ...profile, phone: onlyDigits(v) })} />
              <Input label="Email" type="email" value={profile.email || account.email} onChange={(v) => setProfile({ ...profile, email: v })} />
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Datos del negocio</h2>
              <Input label="Nombre del negocio" value={business.name || ""} onChange={(v) => setBusiness({ ...business, name: v })} />
              <Input label="Rubro" value={business.category || ""} onChange={(v) => setBusiness({ ...business, category: v })} />
              <Input label="Dirección" value={business.address || ""} onChange={(v) => setBusiness({ ...business, address: v })} />
              <Input label="CUIT / Identificación" value={business.cuit || ""} onChange={(v) => setBusiness({ ...business, cuit: onlyDigits(v) })} />
            </div>

            {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm text-red-300 xl:col-span-2">{error}</div>}
            <div className="xl:col-span-2">
              <PrimaryButton type="submit" className="w-full sm:w-auto">Guardar y entrar</PrimaryButton>
            </div>
          </form>
        </Panel>
      </div>
    </main>
  );
}

function AppShell({ account, initialData, onLogout }) {
  const [active, setActive] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState("all");
  const accountEmail = normalizeEmail(account.email);
  const isAnonymousAccount = account.isAnonymous || account.provider === "anonymous";
  const [data, setData] = useState(() => normalizeStoredData(initialData, account));
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark");
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "es");
  const [cloudReady, setCloudReady] = useState(isAnonymousAccount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);
  useEffect(() => {
    const root = document.getElementById("root");
    applyLanguage(root, language);
    const observer = new MutationObserver(() => applyLanguage(root, language));
    if (root) observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);
  useEffect(() => {
    if (isAnonymousAccount) {
      return undefined;
    }
    let cancelled = false;
    loadCloudWorkspace(accountEmail).then((workspace) => {
      if (cancelled) return;
      if (workspace?.data) {
        setData(normalizeStoredData(workspace.data, workspace.account || account));
      }
      setCloudReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [account, accountEmail, isAnonymousAccount]);
  useEffect(() => { writeJSON(dataKey(accountEmail), data); }, [data, accountEmail]);
  useEffect(() => {
    if (isAnonymousAccount) return undefined;
    if (!cloudReady) return undefined;
    const timer = window.setTimeout(() => {
      saveCloudWorkspace(accountEmail, account, data);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [account, accountEmail, cloudReady, data, isAnonymousAccount]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);
  function closeMenu() {
    if (!menuOpen || menuClosing) return;
    setMenuClosing(true);
    window.setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
    }, 220);
  }
  function toggleMenu() {
    if (menuOpen) closeMenu();
    else {
      setMenuClosing(false);
      setMenuOpen(true);
    }
  }
  const exportData = useCallback(() => { const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `nexo-management-${todayISO()}.json`; a.click(); URL.revokeObjectURL(url); setData((prev) => addHistory(prev, "Sistema", "Datos exportados", "Se descargó una copia JSON.")); notify("Datos exportados correctamente."); }, [data]);
  const resetData = useCallback(async () => { if (!(await confirmAction("¿Seguro que querés restaurar clientes, presupuestos y órdenes?"))) return; setData(addHistory(createEmptyData({ profile: data.profile, business: data.business }), "Sistema", "Datos restaurados", "Se restauraron los datos operativos.")); notify("Datos restaurados correctamente."); }, [data.business, data.profile]);
  const needsProfileCompletion = account.provider !== "anonymous" && !account.isAnonymous && !isWorkspaceProfileComplete(data);
  const visibleNav = useMemo(() => getVisibleNavItems(data), [data]);
  const visibleActive = visibleNav.some((item) => item.id === active) ? active : "dashboard";
  const content = useMemo(() => {
    if (search.trim()) return <GlobalSearchResults data={data} search={search} filter={searchFilter} setActive={setActive} clearSearch={() => setSearch("")} />;
    if (visibleActive === "dashboard") return <Dashboard data={data} setData={setData} setActive={setActive} />;
    if (visibleActive === "clients") return <Clients data={data} setData={setData} search={search} />;
    if (visibleActive === "budgets") return <Budgets data={data} setData={setData} search={search} />;
    if (visibleActive === "orders") return <Orders data={data} setData={setData} search={search} />;
    if (visibleActive === "expenses") return <Expenses data={data} setData={setData} search={search} />;
    if (visibleActive === "suppliers") return <Suppliers data={data} setData={setData} search={search} />;
    if (visibleActive === "cash") return <Cash data={data} setData={setData} />;
    if (visibleActive === "monthly") return <Monthly data={data} />;
    if (visibleActive === "reports") return <Reports data={data} />;
    if (visibleActive === "history") return <History data={data} search={search} />;
    return <Settings data={data} setData={setData} account={account} exportData={exportData} resetData={resetData} />;
  }, [visibleActive, data, search, searchFilter, setActive, account, exportData, resetData]);
  const toggleTheme = () => setTheme((value) => value === "dark" ? "light" : "dark");
  const toggleLanguage = () => setLanguage((value) => value === "es" ? "en" : "es");
  if (needsProfileCompletion) return <CompleteProfile data={data} setData={setData} account={account} onLogout={onLogout} />;
  return <main className="min-h-screen overflow-x-hidden bg-[#080808] text-zinc-100"><ToastHost /><ConfirmHost /><MobileMenuDrawer open={menuOpen} closing={menuClosing} active={active} setActive={setActive} data={data} closeMenu={closeMenu} theme={theme} toggleTheme={toggleTheme} language={language} toggleLanguage={toggleLanguage} /><div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" /><Sidebar active={active} setActive={setActive} data={data} /><div className="relative z-10 min-w-0 lg:pl-72"><Topbar search={search} setSearch={setSearch} searchFilter={searchFilter} setSearchFilter={setSearchFilter} menuOpen={menuOpen} toggleMenu={toggleMenu} closeMenu={closeMenu} account={account} data={data} setActive={setActive} onLogout={onLogout} theme={theme} toggleTheme={toggleTheme} language={language} toggleLanguage={toggleLanguage} /><div className="px-4 py-5 sm:px-5 sm:py-8 lg:px-8">{content}</div></div></main>;
}

export default function App() {
  const [account, setAccount] = useState(() => { const session = readJSON(SESSION_KEY, null); if (!session) return null; return readJSON(ACCOUNTS_KEY, []).find((a) => a.email === session.email) || null; });
  const [initialData, setInitialData] = useState(() => { const session = readJSON(SESSION_KEY, null); if (!session) return null; return normalizeStoredData(readJSON(dataKey(session.email), createEmptyData()), { email: session.email }); });
  function login(nextAccount, nextData) { setAccount(nextAccount); setInitialData(nextData); }
  function logout() { localStorage.removeItem(SESSION_KEY); setAccount(null); setInitialData(null); notify("Sesión cerrada."); }
  if (!account || !initialData) return <AuthScreen onLogin={login} />;
  return <AppShell key={account.email} account={account} initialData={initialData} onLogout={logout} />;
}
