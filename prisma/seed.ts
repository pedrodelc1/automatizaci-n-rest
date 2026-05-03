import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  console.log("Limpiando datos anteriores...");
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.categoria.deleteMany();

  console.log("Creando categorías...");
  const [entradas, principales, bebidas, postres] = await Promise.all([
    prisma.categoria.create({
      data: { nombre: "Entradas", descripcion: "Para empezar bien", orden: 1 },
    }),
    prisma.categoria.create({
      data: { nombre: "Platos principales", descripcion: "Nuestras especialidades", orden: 2 },
    }),
    prisma.categoria.create({
      data: { nombre: "Bebidas", descripcion: "Frías y calientes", orden: 3 },
    }),
    prisma.categoria.create({
      data: { nombre: "Postres", descripcion: "El dulce final", orden: 4 },
    }),
  ]);

  console.log("Creando productos...");
  await prisma.producto.createMany({
    data: [
      // Entradas
      {
        nombre: "Empanadas (x6)",
        descripcion: "Rellenas de carne cortada a cuchillo, con especias de la casa",
        precio: 2800,
        categoriaId: entradas.id,
        destacado: true,
      },
      {
        nombre: "Tabla de fiambres",
        descripcion: "Jamón cocido, salami, queso cuartirolo y aceitunas",
        precio: 3500,
        categoriaId: entradas.id,
      },
      // Platos principales
      {
        nombre: "Milanesa napolitana",
        descripcion: "Con salsa de tomate, jamón y queso. Acompañada de papas fritas",
        precio: 4200,
        categoriaId: principales.id,
        destacado: true,
      },
      {
        nombre: "Pollo a la plancha",
        descripcion: "Pechuga marinada con limón y hierbas, con ensalada mixta",
        precio: 3800,
        categoriaId: principales.id,
      },
      {
        nombre: "Pasta al fileto",
        descripcion: "Spaghetti con salsa de tomate fresco y albahaca",
        precio: 3200,
        categoriaId: principales.id,
      },
      {
        nombre: "Hamburguesa completa",
        descripcion: "200g de carne, lechuga, tomate, cebolla, cheddar y bacon",
        precio: 3600,
        categoriaId: principales.id,
        destacado: true,
      },
      // Bebidas
      {
        nombre: "Gaseosa 500ml",
        descripcion: "Coca-Cola, Sprite o Fanta",
        precio: 800,
        categoriaId: bebidas.id,
      },
      {
        nombre: "Agua mineral 500ml",
        descripcion: "Con o sin gas",
        precio: 600,
        categoriaId: bebidas.id,
      },
      {
        nombre: "Cerveza artesanal",
        descripcion: "Rubia o roja, 500ml — elaboración propia",
        precio: 1800,
        categoriaId: bebidas.id,
      },
      // Postres
      {
        nombre: "Brownie con helado",
        descripcion: "Brownie tibio de chocolate con 2 bochas de helado de vainilla",
        precio: 2200,
        categoriaId: postres.id,
        destacado: true,
      },
      {
        nombre: "Flan casero",
        descripcion: "Con crema y dulce de leche",
        precio: 1600,
        categoriaId: postres.id,
      },
    ],
  });

  const total = await prisma.producto.count();
  console.log(`✓ Seed completado: ${total} productos creados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
