// Configuración centralizada del restaurante — todo sale de variables de entorno.
// Para un nuevo cliente: solo cambiar el .env en Railway, sin tocar código.

export const restaurante = {
  nombre:          process.env.RESTAURANTE_NOMBRE          ?? "El Restaurante",
  emoji:           process.env.RESTAURANTE_EMOJI           ?? "🍽️",
  direccion:       process.env.RESTAURANTE_DIRECCION       ?? "Corrientes 1234",
  telefono:        process.env.RESTAURANTE_TELEFONO        ?? "",
  tiempoDelivery:  process.env.TIEMPO_ESTIMADO_DELIVERY    ?? "45",
  tiempoRetiro:    process.env.TIEMPO_ESTIMADO_RETIRO      ?? "20",
  horarioApertura: process.env.RESTAURANTE_HORARIO_APERTURA ?? "09:00",
  horarioCierre:   process.env.RESTAURANTE_HORARIO_CIERRE  ?? "23:00",
  timezone:        process.env.RESTAURANTE_TIMEZONE        ?? "America/Argentina/Buenos_Aires",
};

export interface EstadoHorario {
  abierto: boolean;
  etiqueta: string;
}

export function getEstadoHorario(): EstadoHorario {
  const ahora = new Date();
  const localStr = ahora.toLocaleString("en-US", { timeZone: restaurante.timezone });
  const local = new Date(localStr);

  const [aH, aM] = restaurante.horarioApertura.split(":").map(Number);
  const [cH, cM] = restaurante.horarioCierre.split(":").map(Number);

  const minActual  = local.getHours() * 60 + local.getMinutes();
  const minApertura = aH * 60 + aM;
  const minCierre   = cH * 60 + cM;

  const abierto = minActual >= minApertura && minActual < minCierre;
  return {
    abierto,
    etiqueta: abierto
      ? `Cierra a las ${restaurante.horarioCierre}`
      : `Abre a las ${restaurante.horarioApertura}`,
  };
}
