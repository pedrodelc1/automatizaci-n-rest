import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { esAdminAutorizado } from "@/lib/admin-auth";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_SIZE_MB = 5;

export async function POST(req: NextRequest) {
  if (!esAdminAutorizado(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Formato inválido" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ ok: false, error: "No se recibió ningún archivo" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "Solo se permiten imágenes" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: `La imagen no puede superar ${MAX_SIZE_MB}MB` }, { status: 400 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: process.env.RESTAURANTE_NOMBRE ?? "restaurante",
      resource_type: "image",
      transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
    });

    return NextResponse.json({ ok: true, data: { url: result.secure_url } });
  } catch (error) {
    console.error("[POST /api/admin/upload]", error);
    return NextResponse.json({ ok: false, error: "Error al subir la imagen" }, { status: 500 });
  }
}
