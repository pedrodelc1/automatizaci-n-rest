#!/bin/bash

# ============================================================
# Script para crear un nuevo proyecto por restaurante
# Uso: bash scripts/nuevo-restaurante.sh
# ============================================================

set -e

VERDE="\033[0;32m"
AMARILLO="\033[1;33m"
CYAN="\033[0;36m"
ROJO="\033[0;31m"
RESET="\033[0m"
NEGRITA="\033[1m"

echo ""
echo -e "${NEGRITA}${CYAN}╔══════════════════════════════════════════╗${RESET}"
echo -e "${NEGRITA}${CYAN}║     Nuevo restaurante — Configuración    ║${RESET}"
echo -e "${NEGRITA}${CYAN}╚══════════════════════════════════════════╝${RESET}"
echo ""

# ── 1. Datos del restaurante ──────────────────────────────────

read -p "$(echo -e ${AMARILLO}Nombre del restaurante:${RESET} )" NOMBRE_REST
read -p "$(echo -e ${AMARILLO}Slug/carpeta \(sin espacios, ej: la-pizzeria\):${RESET} )" SLUG
read -p "$(echo -e ${AMARILLO}Color principal en hex \(ej: #f97316 para naranja\):${RESET} )" COLOR
read -p "$(echo -e ${AMARILLO}Tiempo estimado delivery \(minutos, ej: 45\):${RESET} )" TIEMPO_DELIVERY
read -p "$(echo -e ${AMARILLO}Tiempo estimado retiro \(minutos, ej: 20\):${RESET} )" TIEMPO_RETIRO
read -p "$(echo -e ${AMARILLO}IP de la impresora térmica \(ej: 192.168.1.100\):${RESET} )" PRINTER_IP

echo ""

# ── 2. Generar contraseña segura ──────────────────────────────

ADMIN_PASS=$(openssl rand -base64 12 | tr -d '/+=')
echo -e "${VERDE}✓ Contraseña generada:${RESET} ${NEGRITA}${ADMIN_PASS}${RESET}"

# ── 3. Crear directorio del proyecto ─────────────────────────

DESTINO="$HOME/restaurantes/$SLUG"

if [ -d "$DESTINO" ]; then
  echo -e "${ROJO}Error: ya existe la carpeta $DESTINO${RESET}"
  exit 1
fi

mkdir -p "$HOME/restaurantes"
cp -r "$(dirname "$0")/.." "$DESTINO"
echo -e "${VERDE}✓ Proyecto copiado en:${RESET} $DESTINO"

# ── 4. Limpiar lo que no debe copiarse ───────────────────────

rm -rf "$DESTINO/node_modules"
rm -rf "$DESTINO/.next"
rm -f "$DESTINO/.env"

# ── 5. Generar .env ──────────────────────────────────────────

cat > "$DESTINO/.env" << EOF
# ─── Generado automáticamente el $(date '+%d/%m/%Y %H:%M') ───
# Restaurante: ${NOMBRE_REST}

DATABASE_URL=""

MP_ACCESS_TOKEN=""
MP_PUBLIC_KEY=""
MP_WEBHOOK_SECRET=""

PRINTER_IP="${PRINTER_IP}"
PRINTER_PORT="9100"

ADMIN_PASSWORD="${ADMIN_PASS}"

NEXT_PUBLIC_BASE_URL="http://localhost:3000"

TIEMPO_ESTIMADO_DELIVERY="${TIEMPO_DELIVERY}"
TIEMPO_ESTIMADO_RETIRO="${TIEMPO_RETIRO}"
EOF

echo -e "${VERDE}✓ Archivo .env creado${RESET}"

# ── 6. Generar config del restaurante ────────────────────────

cat > "$DESTINO/src/config/restaurante.ts" << EOF
// Configuración específica de: ${NOMBRE_REST}
// Generado el $(date '+%d/%m/%Y')

export const config = {
  nombre: "${NOMBRE_REST}",
  descripcion: "Delivery y retiro en local",
  colorPrimario: "${COLOR}",
  logo: null as string | null,
  tiempoEstimadoDelivery: ${TIEMPO_DELIVERY},
  tiempoEstimadoRetiro: ${TIEMPO_RETIRO},
  costoEnvio: 0,
  moneda: "ARS",
  whatsapp: null as string | null,
} as const;
EOF

mkdir -p "$DESTINO/src/config"
echo -e "${VERDE}✓ Configuración del restaurante creada${RESET}"

# ── 7. Instalar dependencias ──────────────────────────────────

echo ""
echo -e "${CYAN}Instalando dependencias...${RESET}"
cd "$DESTINO" && npm install --silent
echo -e "${VERDE}✓ Dependencias instaladas${RESET}"

# ── 8. Resumen final ─────────────────────────────────────────

echo ""
echo -e "${NEGRITA}${VERDE}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${NEGRITA}${VERDE}║              ✓ Proyecto creado                  ║${RESET}"
echo -e "${NEGRITA}${VERDE}╚══════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${NEGRITA}Restaurante:${RESET}  ${NOMBRE_REST}"
echo -e "  ${NEGRITA}Carpeta:${RESET}      ~/restaurantes/${SLUG}"
echo -e "  ${NEGRITA}Contraseña:${RESET}   ${ROJO}${NEGRITA}${ADMIN_PASS}${RESET}  ← guardala ahora"
echo ""
echo -e "${AMARILLO}Próximos pasos:${RESET}"
echo -e "  1. Crear DB en Railway y pegar DATABASE_URL en .env"
echo -e "  2. Pegar credenciales de MercadoPago en .env"
echo -e "  3. cd ~/restaurantes/${SLUG} && npm run db:push && npm run db:seed"
echo -e "  4. Desplegar en Railway"
echo ""

# Guardar resumen en archivo para no perder la contraseña
RESUMEN="$HOME/restaurantes/${SLUG}_credenciales.txt"
cat > "$RESUMEN" << EOF
Restaurante: ${NOMBRE_REST}
Fecha: $(date '+%d/%m/%Y %H:%M')
Carpeta: ~/restaurantes/${SLUG}
Contraseña admin: ${ADMIN_PASS}
Color: ${COLOR}
Impresora IP: ${PRINTER_IP}
EOF

echo -e "${VERDE}✓ Credenciales guardadas en:${RESET} ~/restaurantes/${SLUG}_credenciales.txt"
echo ""
