# Sistema De Gestión De Pagos

Sistema backend para registrar transacciones manuales y generar liquidaciones
por merchant. Está compuesto por un API Gateway en Express.js, un servicio de
pagos en NestJS y PostgreSQL 15.

## Funcionalidades

- Autenticación dual mediante API key o JWT.
- Registro administrativo de merchants con API keys generadas de forma segura.
- Creación, consulta, filtrado y cambio de estado de transacciones.
- Generación atómica de liquidaciones agrupadas por moneda.
- Aislamiento de datos por merchant.
- Rate limiting de 100 solicitudes por minuto y API key.
- Circuit breaker para proteger las llamadas hacia Payment Service.
- Health check de Payment Service con verificación real de PostgreSQL.
- Dockerfiles multi-stage y ejecución completa mediante Docker Compose.

La explicación detallada de arquitectura, decisiones y escalabilidad se
encuentra en [ARCHITECTURE.md](ARCHITECTURE.md).

## Tecnologías

- Node.js 20
- TypeScript
- Express.js
- NestJS
- Prisma ORM
- PostgreSQL 15
- Docker y Docker Compose

## Estructura

```text
prueba-tecnica-backend/
├── api-gateway/          # Entrada pública, autenticación, rate limit y proxy
├── payment-service/      # Dominio de merchants, transacciones y liquidaciones
├── docs/                 # Enunciado original de la prueba
├── docker-compose.yml
├── ARCHITECTURE.md
└── README.md
```

## Inicio Rápido

### Requisitos

- Docker Desktop con Docker Compose.
- Puertos `3000`, `3001` y `5432` disponibles.

### Levantar El Proyecto

Desde la raíz:

```bash
docker compose up --build -d
```

El comando:

1. Inicia PostgreSQL y espera su health check.
2. Ejecuta las migraciones Prisma pendientes.
3. Inicia Payment Service.
4. Inicia API Gateway.

Verificar contenedores:

```bash
docker compose ps
```

Verificar servicios desde Bruno, Postman u otro cliente HTTP:

| Método | URL                            | Resultado esperado                     |
| ------ | ------------------------------ | -------------------------------------- |
| `GET`  | `http://localhost:3000/health` | Estado del API Gateway                 |
| `GET`  | `http://localhost:3001/health` | Estado de Payment Service y PostgreSQL |

El API Gateway estará disponible en:

```text
http://localhost:3000
```

Payment Service se publica en `http://localhost:3001` para facilitar pruebas,
pero el punto de entrada recomendado es API Gateway.

## Variables De Entorno

Docker Compose permite sobrescribir las siguientes variables:

| Variable               | Valor por defecto                           | Descripción                         |
| ---------------------- | ------------------------------------------- | ----------------------------------- |
| `POSTGRES_USER`        | `postgres`                                  | Usuario de PostgreSQL               |
| `POSTGRES_PASSWORD`    | `postgres`                                  | Contraseña de PostgreSQL            |
| `POSTGRES_DB`          | `payments`                                  | Base de datos                       |
| `POSTGRES_PORT`        | `5432`                                      | Puerto publicado de PostgreSQL      |
| `PAYMENT_DATABASE_URL` | Conexión interna a `postgres:5432/payments` | Conexión Prisma                     |
| `PAYMENT_SERVICE_PORT` | `3001`                                      | Puerto publicado de Payment Service |
| `ADMIN_API_KEY`        | `PRUEBA_TECNICA_ADMIN_KEY`                  | Protege la creación de merchants    |
| `GATEWAY_DATABASE_URL` | Conexión interna a `postgres:5432/payments` | Autenticación del Gateway           |
| `API_GATEWAY_PORT`     | `3000`                                      | Puerto publicado del Gateway        |
| `JWT_SECRET`           | `PRUEBA_TECNICA_SECRET_KEY`                 | Firma y validación JWT HS256        |
| `PROXY_TIMEOUT_MS`     | `5000`                                      | Timeout hacia Payment Service       |

Los valores por defecto son exclusivamente para desarrollo. No deben utilizarse
como secretos reales.

Ejemplo para sobrescribirlos en PowerShell:

```powershell
$env:ADMIN_API_KEY="admin-key-segura"
$env:JWT_SECRET="jwt-secret-seguro"
docker compose up --build -d
```

## Primer Merchant

La base de datos inicia sin seed. En Bruno o Postman crea una petición con:

```text
Método: POST
URL: http://localhost:3000/api/v1/merchants
```

Headers:

| Header         | Valor                      |
| -------------- | -------------------------- |
| `x-admin-key`  | `PRUEBA_TECNICA_ADMIN_KEY` |
| `Content-Type` | `application/json`         |

Body JSON:

```json
{
  "name": "Merchant Demo",
  "email": "merchant@example.com"
}
```

Respuesta:

```json
{
  "id": "UUID_DEL_MERCHANT",
  "name": "Merchant Demo",
  "email": "merchant@example.com",
  "apiKey": "api_CLAVE_GENERADA",
  "status": "active",
  "createdAt": "2026-06-13T00:00:00.000Z",
  "updatedAt": "2026-06-13T00:00:00.000Z"
}
```

Conserva `id` y `apiKey` para los siguientes ejemplos.

## Autenticación

### API Key

Envía la API key generada:

```http
x-api-key: api_CLAVE_GENERADA
```

### JWT

El Gateway acepta tokens HS256 con un `merchantId` existente. Para generar un
JWT de prueba válido durante una hora:

```bash
docker compose exec api-gateway node -e "console.log(require('jsonwebtoken').sign({ merchantId: 'UUID_DEL_MERCHANT' }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' }))"
```

Utilízalo así:

```http
Authorization: Bearer TOKEN_GENERADO
```

Cuando recibe JWT, el Gateway valida la firma y expiración, consulta el merchant
y reenvía su API key hacia Payment Service.

## Catálogo De Endpoints

| Método  | Ruta                              | Autenticación | Descripción                            |
| ------- | --------------------------------- | ------------- | -------------------------------------- |
| `GET`   | `/health`                         | Pública       | Health básico del Gateway              |
| `GET`   | `http://localhost:3001/health`    | Pública       | Health de Payment Service y PostgreSQL |
| `POST`  | `/api/v1/merchants`               | `x-admin-key` | Crear merchant y generar API key       |
| `POST`  | `/api/v1/transactions`            | API key o JWT | Crear transacción                      |
| `GET`   | `/api/v1/transactions`            | API key o JWT | Listar y filtrar transacciones         |
| `GET`   | `/api/v1/transactions/:id`        | API key o JWT | Obtener transacción                    |
| `PATCH` | `/api/v1/transactions/:id/status` | API key o JWT | Cambiar estado                         |
| `POST`  | `/api/v1/settlements/generate`    | API key o JWT | Generar lote de liquidaciones          |
| `GET`   | `/api/v1/settlements/:id`         | API key o JWT | Obtener lote y subtotales              |

Todas las operaciones autenticadas están aisladas por el merchant identificado.
Si un body contiene `merchant_id`, debe coincidir con el merchant autenticado.

## Transacciones

### Crear

Los montos se reciben y responden como strings decimales para evitar pérdida de
precisión.

```text
Método: POST
URL: http://localhost:3000/api/v1/transactions
```

Headers:

| Header         | Valor                |
| -------------- | -------------------- |
| `x-api-key`    | `api_CLAVE_GENERADA` |
| `Content-Type` | `application/json`   |

Body JSON:

```json
{
  "merchant_id": "UUID_DEL_MERCHANT",
  "amount": "150.25",
  "currency": "USD",
  "type": "payin",
  "metadata": {
    "source": "readme"
  }
}
```

La referencia se genera con formato:

```text
TXN-YYYYMMDD-XXXXXX
```

### Listar Y Filtrar

```text
Método: GET
URL: http://localhost:3000/api/v1/transactions
```

Header:

| Header      | Valor                |
| ----------- | -------------------- |
| `x-api-key` | `api_CLAVE_GENERADA` |

Filtros disponibles:

| Query param | Default | Restricción              |
| ----------- | ------: | ------------------------ |
| `page`      |     `1` | Entero mayor o igual a 1 |
| `limit`     |    `20` | Entre 1 y 100            |
| `status`    |       - | Estado válido            |
| `type`      |       - | `payin` o `payout`       |
| `date_from` |       - | Fecha ISO 8601 inclusiva |
| `date_to`   |       - | Fecha ISO 8601 inclusiva |

### Cambiar Estado

```text
Método: PATCH
URL: http://localhost:3000/api/v1/transactions/UUID_TRANSACCION/status
```

Headers:

| Header         | Valor                |
| -------------- | -------------------- |
| `x-api-key`    | `api_CLAVE_GENERADA` |
| `Content-Type` | `application/json`   |

Body JSON:

```json
{
  "status": "approved"
}
```

Transiciones permitidas:

```text
pending  -> approved
pending  -> rejected
pending  -> failed
approved -> completed
approved -> failed
```

Las demás transiciones responden `422 Unprocessable Entity`.

## Liquidaciones Multimoneda

Una solicitud crea un `SettlementBatch` general. Las transacciones aprobadas,
no liquidadas y pertenecientes al rango se agrupan en un subtotal independiente
por moneda.

```text
Método: POST
URL: http://localhost:3000/api/v1/settlements/generate
```

Headers:

| Header         | Valor                |
| -------------- | -------------------- |
| `x-api-key`    | `api_CLAVE_GENERADA` |
| `Content-Type` | `application/json`   |

Body JSON:

```json
{
  "merchant_id": "UUID_DEL_MERCHANT",
  "period_start": "2026-01-01T00:00:00Z",
  "period_end": "2026-12-31T23:59:59Z"
}
```

Respuesta resumida:

```json
{
  "id": "UUID_BATCH",
  "merchantId": "UUID_DEL_MERCHANT",
  "transactionCount": 3,
  "status": "pending",
  "settlements": [
    {
      "currency": "COP",
      "totalAmount": "200000",
      "transactionCount": 1
    },
    {
      "currency": "USD",
      "totalAmount": "150",
      "transactionCount": 2
    }
  ]
}
```

No existe un total general que sume monedas diferentes. La operación completa
se ejecuta en una transacción Prisma con aislamiento serializable y cada
transacción solo puede pertenecer a una liquidación.

## Respuestas De Error Relevantes

| Código | Caso                                                      |
| -----: | --------------------------------------------------------- |
|  `400` | DTO, fecha, UUID o paginación inválida                    |
|  `401` | Credenciales ausentes o inválidas                         |
|  `403` | Merchant inactivo o `merchant_id` diferente               |
|  `404` | Recurso o transacciones elegibles no encontradas          |
|  `409` | Email duplicado, conflicto concurrente o colisión agotada |
|  `422` | Transición de estado inválida                             |
|  `429` | Más de 100 solicitudes por minuto y API key               |
|  `502` | Error inesperado al comunicarse con Payment Service       |
|  `503` | Servicio no disponible o circuit breaker abierto          |
|  `504` | Timeout de Payment Service                                |

## Decisiones De Diseño

- PostgreSQL utiliza nombres `snake_case`; Prisma expone propiedades
  `camelCase`.
- Los importes utilizan `Decimal`, nunca `Float`.
- Las referencias y API keys se generan criptográficamente y se reintentan ante
  colisiones.
- El Gateway consulta PostgreSQL únicamente para autenticar merchants.
- Payment Service vuelve a validar la API key mediante `ApiKeyGuard`.
- Las consultas y operaciones se aíslan por merchant autenticado.
- Las liquidaciones se agrupan por moneda para evitar totales financieros
  inválidos.
- El rate limiter limpia entradas expiradas periódicamente.
- El circuit breaker abre después de cinco fallos y prueba recuperación después
  de treinta segundos.

## Limitaciones Conocidas

- El rate limiter y circuit breaker viven en memoria y no comparten estado entre
  múltiples réplicas.
- El Gateway accede directamente a PostgreSQL para autenticación.
- Las API keys se almacenan en texto plano; una evolución recomendada es
  almacenarlas mediante hash y permitir rotación.
- No existe un endpoint de inicio de sesión o emisión de JWT; el comando
  documentado genera tokens únicamente para pruebas.
- No existe seed automático. Los merchants se crean mediante el endpoint
  administrativo.
- `SettlementBatch` y sus liquidaciones hijas repiten algunos datos para
  facilitar consultas; deben mantenerse consistentes.

## Desarrollo Local

Instalar dependencias:

```bash
cd payment-service
npm install

cd ../api-gateway
npm install
```

Para ejecutar servicios localmente y PostgreSQL mediante Docker:

```bash
docker compose stop payment-service api-gateway
docker compose up -d postgres
```

En terminales separadas:

```bash
cd payment-service
npm run start:dev
```

```bash
cd api-gateway
npm run dev
```

Evita ejecutar simultáneamente servicios locales y contenedores utilizando los
mismos puertos.

## Verificación

```bash
cd payment-service
npm run build
npm test -- --runInBand

cd ../api-gateway
npm run typecheck
npm run build

cd ..
docker compose up --build -d
docker compose ps
```

Para detener el proyecto conservando los datos:

```bash
docker compose down
```

Para eliminar también los datos persistidos:

```bash
docker compose down -v
```

## Documentación Original

- [Requisitos del perfil](docs/01-requisitos-perfil.md)
- [Prueba práctica](docs/02-prueba-practica.md)
- [Instrucciones de entrega](docs/03-instrucciones-entrega.md)
