# Nexo Management

Aplicacion React/Vite para gestionar clientes, presupuestos, ordenes, pagos, historial operativo y resumen mensual desde el navegador.

## Requisitos

- Node.js compatible con Vite 8.
- npm.
- Proyecto Firebase configurado para Google Auth si se usa inicio de sesion con Google.

## Instalacion

```bash
npm install
cp .env.example .env.local
```

Completar `.env.local` con la configuracion web de Firebase. Las variables deben empezar con `VITE_` para que Vite las exponga al frontend.

## Desarrollo

```bash
npm run dev
```

El comando levanta Vite con hot reload. La aplicacion persiste datos en `localStorage`, por lo que cada navegador y origen tiene su propia base local.

## Validaciones

```bash
npm run lint
npm run build
npm run preview
```

`npm run build` genera `dist/`. `npm run preview` sirve esa salida para una revision cercana a produccion.

## Variables de entorno

| Variable | Requerida | Uso |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Si | Firebase Web API key. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Si | Dominio de autenticacion. |
| `VITE_FIREBASE_PROJECT_ID` | Si | ID del proyecto Firebase. |
| `VITE_FIREBASE_STORAGE_BUCKET` | Si | Bucket asociado al proyecto. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Si | Sender ID del proyecto. |
| `VITE_FIREBASE_APP_ID` | Si | App ID web. |
| `VITE_FIREBASE_MEASUREMENT_ID` | No | Measurement ID de Analytics, si aplica. |

Si faltan variables requeridas, el build no se interrumpe, pero el modulo de Firebase informa el nombre exacto de las variables faltantes cuando se intenta usar Google Auth.

## Datos y almacenamiento

- Las cuentas, sesiones y datos operativos se guardan en `localStorage`.
- Las claves usan el prefijo `nexo-management-v1`.
- El login con email y contrasena es local al navegador; no sincroniza con Firebase.
- El login con Google usa Firebase Auth, pero los datos de gestion siguen en `localStorage`.
- Antes de limpiar datos del navegador, exportar una copia JSON desde Configuracion.

## Flujo recomendado de deploy

1. Crear `.env.local` o configurar variables equivalentes en el proveedor de hosting.
2. Ejecutar `npm install`.
3. Ejecutar `npm run lint` y resolver errores antes de aprobar release.
4. Ejecutar `npm run build`.
5. Revisar `npm run preview` con pruebas manuales criticas.
6. Publicar el contenido de `dist/` en el hosting elegido.
7. Confirmar en Firebase que el dominio productivo este autorizado para Google Auth.

## Notas de mantenimiento

- Evitar guardar secretos reales en archivos versionados. Usar `.env.local` o variables del entorno de deploy.
- Mantener cambios funcionales grandes concentrados en ramas separadas para reducir conflictos con `src/App.jsx`.
- Revisar el checklist de lanzamiento antes de publicar.
