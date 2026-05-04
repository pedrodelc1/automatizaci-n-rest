import { NextResponse } from "next/server";
import { getEstadoHorario, restaurante } from "@/config/restaurante";

// Endpoint público — el carrito lo consulta para mostrar aviso de cerrado
export async function GET() {
  const horario = getEstadoHorario();
  return NextResponse.json({
    ok: true,
    abierto: horario.abierto,
    etiqueta: horario.etiqueta,
    nombre: restaurante.nombre,
    horarioApertura: restaurante.horarioApertura,
    horarioCierre: restaurante.horarioCierre,
  });
}
