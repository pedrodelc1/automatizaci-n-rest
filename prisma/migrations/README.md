# Migraciones

Para aplicar las migraciones en producción:

```bash
# Desarrollo (crea migración + aplica)
npm run db:migrate

# Producción (solo aplica migraciones pendientes)
npx prisma migrate deploy

# Cargar datos de ejemplo
npm run db:seed
```
