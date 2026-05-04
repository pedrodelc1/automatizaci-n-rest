# CLAUDE.md — Contexto del proyecto

## Approach
- Think before acting. Read existing files before writing code.
- Be concise in output but thorough in reasoning.
- Prefer editing over rewriting whole files.
- Test your code before declaring done.
- No sycophantic openers or closing fluff.
- Keep solutions simple and direct.
- User instructions always override this file.

---

## ¿Qué es este proyecto?
Sistema de pedidos online para restaurantes, construido para ser vendido como producto a diferentes restaurantes (modelo SaaS con un deploy por cliente — Opción A).

El dueño del proyecto es Pedro. Habla español. Responderle siempre en español.

---

## Stack tecnológico
- **Frontend/Backend:** Next.js 14 con App Router + TypeScript estricto
- **Estilos:** Tailwind CSS + fuentes Plus Jakarta Sans + Playfair Display
- **Base de datos:** PostgreSQL en Railway + Prisma ORM v7
- **Pagos:** MercadoPago SDK (Argentina) y/o Stripe — detectado automáticamente por `src/lib/pagos.ts`
- **Impresión:** node-thermal-printer (ESC/POS por red TCP/IP)
- **Notificaciones:** N8N con WAHA para WhatsApp
- **Deploy:** Railway (DB + app + N8N + WAHA)

## Decisiones importantes de Prisma v7
- El `schema.prisma` NO tiene `url` en el datasource — se configura en `prisma.config.ts`
- El cliente Prisma REQUIERE adapter explícito: `PrismaPg` de `@prisma/adapter-pg`
- Ver implementación en `src/lib/prisma.ts`
- Zod v4 usa `.issues` en lugar de `.errors` en los errores de validación

---

## Estructura del proyecto
```
src/
  app/
    page.tsx                        ← Menú público (/)
    carrito/page.tsx                ← Carrito y formulario de pedido
    checkout/[pedidoId]/page.tsx    ← Redirección a MercadoPago/Stripe
    confirmacion/[pedidoId]/page.tsx← Pantalla de éxito post-pedido
    admin/
      login/page.tsx                ← Login con contraseña
      pedidos/page.tsx              ← Panel de pedidos (polling 15s)
      menu/page.tsx                 ← CRUD de productos y categorías
    api/
      menu/route.ts                 ← GET menú público
      pedidos/route.ts              ← POST crear pedido / GET listar (admin)
      pedidos/[id]/route.ts         ← GET pedido / POST reimprimir
      pedidos/[id]/estado/route.ts  ← PATCH cambiar estado
      checkout/route.ts             ← POST crear preference MP o session Stripe
      webhooks/mercadopago/route.ts ← POST webhook de pago MP
      webhooks/stripe/route.ts      ← POST webhook de pago Stripe
      admin/login/route.ts          ← POST login admin
      admin/logout/route.ts         ← POST logout admin
      admin/productos/route.ts      ← GET/POST productos
      admin/productos/[id]/route.ts ← PATCH/DELETE producto
      admin/categorias/route.ts     ← GET/POST categorías
      admin/categorias/[id]/route.ts← PATCH/DELETE categoría
  lib/
    prisma.ts        ← Singleton del cliente con PrismaPg adapter
    printer.ts       ← Servicio impresión térmica + cola de reintentos
    notificaciones.ts← Envío de eventos a N8N vía webhook
    admin-auth.ts    ← `esAdminAutorizado(req)` — verifica header O cookie httpOnly
    pagos.ts         ← `getPaymentProvider()` — detecta MP o Stripe por env vars
  components/
    menu/TarjetaProducto.tsx
    ui/BotonCarrito.tsx
    ui/AccesoAdmin.tsx   ← Ícono ⚙ discreto en header para acceder al admin
    ui/Spinner.tsx
    admin/AdminNav.tsx
    admin/PedidosCliente.tsx
    admin/MenuAdmin.tsx
  context/
    CarritoContext.tsx  ← Estado global del carrito con localStorage
  types/index.ts

prisma/
  schema.prisma   ← Modelos: Categoria, Producto, Pedido, ItemPedido + enums
  seed.ts         ← 4 categorías, 11 productos de ejemplo
  migrations/

n8n/
  workflow-whatsapp-cliente.json      ← Mensajes al cliente por cambios de estado
  workflow-alerta-dueno.json          ← Alertas al dueño (Pedro: 5493416600928)
  workflow-respuesta-automatica.json  ← Bot respuesta automática a mensajes entrantes

scripts/
  nuevo-restaurante.sh  ← Script para onboarding de nuevo cliente restaurante
```

---

## Flujo de un pedido
1. Cliente arma carrito en `/` → va a `/carrito`
2. Elige modalidad (DELIVERY/RETIRO) y forma de pago (ONLINE/CONTRA_ENTREGA)
3. **Contra entrega:** POST /api/pedidos → estado CONFIRMADO → imprime ticket → notifica N8N
4. **Online:** POST /api/pedidos → estado PENDIENTE → redirect a /checkout/[id] → MP o Stripe → webhook → estado CONFIRMADO → imprime → notifica N8N
5. Admin ve el pedido en `/admin/pedidos` y va cambiando el estado manualmente
6. Cada cambio de estado notifica a N8N que manda WhatsApp al cliente

---

## Autenticación admin — FUNCIONANDO ✓
- Cookie `admin_session` httpOnly con valor = `ADMIN_PASSWORD` del `.env`
- `src/lib/admin-auth.ts` exporta `esAdminAutorizado(req)` que verifica TANTO el header `x-admin-key` COMO la cookie httpOnly (server-side via `cookies()` de `next/headers`)
- Todos los componentes admin (`PedidosCliente`, `MenuAdmin`) usan `credentials: "same-origin"` — NO intentan leer la cookie desde el cliente (es httpOnly, no accesible por JS)
- Todos los route handlers del admin usan `esAdminAutorizado(req)` en lugar de lógica local

---

## Pagos — CONFIGURADO ✓

### Lógica de detección automática (`src/lib/pagos.ts`)
```ts
// Si MP_ACCESS_TOKEN tiene valor real → usa MercadoPago
// Si STRIPE_SECRET_KEY tiene valor real → usa Stripe
// MercadoPago tiene prioridad si ambos están configurados
export function getPaymentProvider(): "mercadopago" | "stripe"
```

### MercadoPago
- `MP_ACCESS_TOKEN` y `MP_PUBLIC_KEY` en `.env`
- `auto_return: "approved"` solo se aplica si `NEXT_PUBLIC_BASE_URL` empieza con `https://` (no funciona en localhost)
- `checkout/[pedidoId]/page.tsx` siempre redirige a `checkoutUrl` (`init_point`) — NO usa `sandboxUrl`
  - **Razón:** con credenciales `APP_USR-` (reales), usar `sandbox_init_point` mezcla una cuenta real con un comprador de prueba y MP lo rechaza
- El webhook en `/api/webhooks/mercadopago` valida firma HMAC si `MP_WEBHOOK_SECRET` está configurado; si no, la omite (útil en dev)
- En producción, configurar la URL del webhook en el panel de MP: `https://tu-dominio.com/api/webhooks/mercadopago`

### Stripe
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY` en `.env`
- Webhook en `/api/webhooks/stripe/route.ts`

---

## Variables de entorno (.env)
```
DATABASE_URL           ← PostgreSQL Railway (usar DATABASE_PUBLIC_URL de Railway)
MP_ACCESS_TOKEN        ← MercadoPago access token (APP_USR-... para producción)
MP_PUBLIC_KEY          ← MercadoPago public key
MP_WEBHOOK_SECRET      ← Firma del webhook MP (opcional en dev)
STRIPE_SECRET_KEY      ← Stripe (alternativa a MP, dejar vacío si se usa MP)
STRIPE_PUBLISHABLE_KEY ← Stripe
STRIPE_WEBHOOK_SECRET  ← Stripe webhook
STRIPE_CURRENCY        ← ISO 4217 (ars, usd, etc.)
PRINTER_IP             ← IP local de la impresora térmica
PRINTER_PORT           ← Puerto (default 9100)
ADMIN_PASSWORD         ← Contraseña del panel admin
NEXT_PUBLIC_BASE_URL   ← URL pública de la app (http://localhost:3000 en dev)
TIEMPO_ESTIMADO_DELIVERY / RETIRO
RESTAURANTE_NOMBRE     ← Aparece en los mensajes de WhatsApp y en MP
N8N_WEBHOOK_URL        ← URL webhook N8N para eventos al cliente
N8N_WEBHOOK_DUENO_URL  ← URL webhook N8N para alertas al dueño
```

---

## N8N + WhatsApp — FUNCIONANDO ✓
- WhatsApp via **WAHA NOWEB** desplegado en Railway
- URL WAHA: `https://evolution-api-production-3285.up.railway.app`
- API Key WAHA: `a552c6bf017545aa99fc7153d0aa4960`
- N8N desplegado en Railway: `https://n8n-production-b044.up.railway.app`
- N8N tiene PostgreSQL propio para persistencia
- **Los datos llegan CON wrapper `.body`** — usar `$json.body.evento` y `$json.body.pedido` en los nodos de n8n
- Tres workflows activos:
  1. `workflow-whatsapp-cliente.json` → path `/webhook/restaurante-eventos` → mensajes al cliente por cambios de estado
  2. `workflow-alerta-dueno.json` → path `/webhook/restaurante-alertas` → alertas al dueño (Pedro: 5493416600928)
  3. `workflow-respuesta-automatica.json` → path `/webhook/whatsapp-entrante` → bot respuesta automática
- **Bot respuesta automática:** cuando alguien escribe por WhatsApp, responde con el link al menú. Cooldown de 2 horas por contacto (usando `$getWorkflowStaticData`). Filtra grupos y mensajes propios.
- Para que WAHA reenvíe los mensajes entrantes a N8N, configurar env var en Railway: `WHATSAPP_DEFAULT_WEBHOOK_URL=https://n8n-production-b044.up.railway.app/webhook/whatsapp-entrante`
- Formato teléfono Argentina: `549` + código de área + número sin 0 ni 15 + `@c.us`
- `notificaciones.ts` envía a DOS URLs: `N8N_WEBHOOK_URL` (cliente) y `N8N_WEBHOOK_DUENO_URL` (dueño)

---

## Diseño / UI — REDISEÑADO ✓
- **Tipografía dual:** Plus Jakarta Sans (cuerpo) + Playfair Display (display, precios, títulos) → dupla serif + sans de alta gama
- CSS variable `--font-display` mapeada en Tailwind como `font-display`
- Clases premium en `globals.css`: `.btn-primary` (lift hover), `.card` (sombra cálida dos capas), `.section-title` (Playfair), `.display-price` (Playfair para precios), `.label-caps` (caps tracking abierto), `.category-tab` (underline activo, estilo editorial)
- Colores warm: `cream-50 (#FDFCF8)`, `cream-100 (#F8F4EC)` — fondo más cálido que blanco puro
- Hero con gradiente naranja + overlay grain SVG + chips glassmorphism
- Dark mode automático según preferencia del sistema

---

## Modelo de negocio / comercialización
- Un repo base → un deploy por restaurante (Opción A)
- Script de onboarding: `bash scripts/nuevo-restaurante.sh`
- Cada restaurante tiene su propio Railway project, DB, .env, contraseña admin
- La contraseña admin se genera con `openssl rand -base64 12`
- Para cambiar de MP a Stripe: comentar `MP_ACCESS_TOKEN` en `.env` y descomentar `STRIPE_SECRET_KEY`

## Comandos útiles
```bash
npm run dev          # Desarrollo local
npm run db:push      # Aplicar schema a la DB sin migración
npm run db:seed      # Cargar productos de ejemplo
npm run db:studio    # Ver BD en el navegador
npm run db:migrate   # Crear y aplicar migración formal
```

---

## Pendiente / próximos pasos

### Estado del deploy (actualizado 2026-05-03)
- **App Next.js:** deployada en Railway — `https://automatizaci-n-rest-production.up.railway.app`
- **N8N:** `https://n8n-production-b044.up.railway.app` — workflows "Restaurante — WhatsApp al cliente" y "Restaurante — Alertas al dueño" activos (Published)
- **WAHA:** `https://waha-production-cf74.up.railway.app` — sesión `default` conectada con cuenta WP Business de Pedro
- **Variables Railway necesarias:** `NIXPACKS_NODE_VERSION=22`, `PORT=3000`, `NEXT_PUBLIC_BASE_URL`, `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_DUENO_URL` y resto del .env
- **Problema conocido:** WAHA pierde la sesión al reiniciar — hay que agregar `WAHA_AUTO_START_SESSIONS=default` en variables de Railway del servicio WAHA

### Bloqueantes
- [ ] **Verificar que llegan pedidos a n8n** — la app está en Railway pero hay que confirmar que los webhooks de n8n reciben los eventos correctamente
- [ ] **Actualizar URL en workflow N8N** — `workflow-respuesta-automatica.json` tiene `http://localhost:3000` hardcodeado, cambiarlo a `https://automatizaci-n-rest-production.up.railway.app`
- [ ] **Configurar webhook de MP** — en el panel de MercadoPago configurar `https://automatizaci-n-rest-production.up.railway.app/api/webhooks/mercadopago`

### Importantes
- [ ] **Rediseño UI del admin** — `/admin/login`, `/admin/pedidos`, `/admin/menu` usan estilos básicos, llevarlos al mismo nivel que el menú público
- [ ] **Personalización por restaurante** — nombre, logo, dirección, horario via env vars o `src/config/restaurante.ts`
- [ ] **Horarios de apertura** — "Abierto ahora · Cierra a las 23:00" está hardcodeado en `page.tsx`

### Nice to have
- [ ] Dominio propio por restaurante
- [ ] Configurar impresora térmica real (IP en .env)
- [ ] Test de pago MP con cuenta real (credenciales `APP_USR-` ya configuradas en `.env`)
