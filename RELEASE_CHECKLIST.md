# Release checklist

## Configuracion

- [ ] Variables `VITE_FIREBASE_*` configuradas en el entorno de deploy.
- [ ] Dominio productivo autorizado en Firebase Authentication.
- [ ] `.env.local` no versionado y `.env.example` actualizado.
- [ ] `npm install` ejecuta sin vulnerabilidades criticas reportadas.
- [ ] `npm run lint` pasa sin errores.
- [ ] `npm run build` pasa y genera `dist/`.
- [ ] `npm run preview` revisado antes de publicar.

## Pruebas manuales criticas

- [ ] Registro local de cuenta nueva.
- [ ] Login local con email y contrasena.
- [ ] Login con Google y manejo claro de error si Firebase no esta configurado.
- [ ] Logout y recuperacion de sesion.
- [ ] Alta, edicion, busqueda y eliminacion de clientes.
- [ ] Alta, edicion y cambio de estado de presupuestos.
- [ ] Alta, edicion y cambio de estado de ordenes.
- [ ] Pagos: pendiente, pago parcial y pagado.
- [ ] Resumen mensual con datos del mes actual.
- [ ] Historial de acciones relevantes.
- [ ] Exportacion JSON desde Configuracion.
- [ ] Reset de datos con confirmacion.
- [ ] Persistencia en `localStorage` despues de refrescar la pagina.
- [ ] Responsive en mobile, tablet y desktop.

## Seguridad y datos

- [ ] Confirmar que no haya credenciales privadas en el bundle ni en el repositorio.
- [ ] Validar reglas y proveedores de Firebase para el alcance real de produccion.
- [ ] Aclarar al usuario que los datos operativos son locales al navegador.
- [ ] Probar recuperacion usando archivo exportado antes de publicar.

## Criterios de salida

- [ ] Build publicado revisado en URL final.
- [ ] Favicon, titulo y metadata visibles correctamente.
- [ ] Errores de consola revisados en flujos principales.
- [ ] Riesgos conocidos documentados antes del go/no-go.
