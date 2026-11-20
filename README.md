# Suscripciones

Aplicación self-hosted para registrar suscripciones y consultar cuánto cuestan, cuándo se cobran y cómo se reparte el gasto.

## Primera versión

- Crear, consultar, editar y archivar suscripciones.
- Guardar nombre, importe, moneda, categoría, frecuencia, próximo cobro y estado.
- Mostrar gasto mensual y anual estimado.
- Mostrar próximos cobros ordenados por fecha.
- Mostrar gasto agrupado por categoría.

## Arquitectura acordada

- **Backend:** Spring Boot, API REST y lógica de negocio.
- **Frontend:** React con TypeScript; se compila y Spring Boot sirve los archivos estáticos.
- **Base de datos:** PostgreSQL en un contenedor separado.
- **Ejecución local:** Docker Compose para levantar la app y PostgreSQL.
- **Distribución:** una imagen Docker para la aplicación (backend + frontend compilado).

## Ruta de aprendizaje

1. Acordar el alcance y el modelo de una suscripción.
2. Crear la estructura del proyecto y levantar una primera API.
3. Persistir suscripciones en PostgreSQL con migraciones.
4. Añadir cálculos y endpoints para resúmenes y próximos cobros.
5. Construir la interfaz React/TypeScript.
6. Probar la persistencia con Testcontainers.
7. Crear la imagen Docker de la app y configurar Docker Compose.

En cada etapa explicaremos las decisiones y el código antes de avanzar a la siguiente.

## Desarrollo local

La API vive en `backend/`. Requiere Java 25, Maven y Docker Desktop con el motor iniciado.

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
cd backend
mvn spring-boot:run
```

Para desarrollar la interfaz en otra terminal:

```powershell
cd frontend
npm install
npm run dev
```

Vite sirve la interfaz en `http://localhost:5173` y reenvía las peticiones `/api` a Spring Boot en `http://localhost:8080`.

Con el servidor en marcha, `GET http://localhost:8080/api/health` devuelve `{"status":"ok"}`.
`GET http://localhost:8080/api/subscriptions` devuelve las suscripciones ordenadas por próximo cobro; al principio devuelve `[]`.
`POST http://localhost:8080/api/subscriptions` crea una suscripción; `GET /api/subscriptions/{id}` consulta una por su identificador.
`PUT /api/subscriptions/{id}` actualiza sus datos, `PATCH /api/subscriptions/{id}/archive` la archiva sin eliminarla y `PATCH /api/subscriptions/{id}/restore` la restaura.
`GET http://localhost:8080/api/summary` devuelve los totales mensuales y anuales estimados, agrupados por moneda y categoría; solo cuenta suscripciones activas.
`GET http://localhost:8080/api/subscriptions/upcoming` devuelve los próximos cobros de 30 días; `?days=90` amplía la ventana hasta 90 días.

Ejemplo de petición para crear una suscripción desde PowerShell:

```powershell
$body = @'
{
  "name": "Servicio de ejemplo",
  "amount": 9.99,
  "currency": "EUR",
  "billingPeriod": "MONTHLY",
  "category": "Entretenimiento",
  "nextChargeDate": "2026-12-20"
}
'@

Invoke-RestMethod -Uri "http://localhost:8080/api/subscriptions" -Method Post -ContentType "application/json" -Body $body
```

PostgreSQL conserva sus datos en el volumen Docker `postgres_data`. Las credenciales de `.env` son solo para desarrollo local; `.env` está excluido de Git.

## Pruebas de persistencia

El test `SubscriptionRepositoryTest` inicia una instancia temporal de PostgreSQL con Testcontainers, aplica la migración de Flyway y comprueba que JPA guarda y recupera una suscripción. No usa ni modifica la base de datos de desarrollo. Para ejecutarlo, inicia Docker Desktop y ejecuta desde `backend/`:

```powershell
mvn test
```

Si Docker no está disponible, Testcontainers omite este test; en ese caso, revisa que Docker Desktop esté iniciado y vuelve a ejecutar el comando.

Las reglas del modelo, los cálculos del resumen y los próximos cobros se prueban sin Docker en `SubscriptionTest`, `SubscriptionSummaryServiceTest`, `UpcomingChargeServiceTest` y `UpcomingChargeControllerTest`. El resumen verifica la normalización mensual/anual y mantiene separadas las monedas; los tests de servicios usan un repositorio simulado. El test del controlador comprueba que la API acepta entre 1 y 365 días y rechaza los valores exteriores. Para ejecutar solo las pruebas que no necesitan Docker desde `backend/`:

```powershell
mvn "-Dtest=SubscriptionTest,SubscriptionSummaryServiceTest,UpcomingChargeServiceTest,UpcomingChargeControllerTest" test
```

## Persistencia

`Subscription` es el modelo de negocio. `SubscriptionEntity` lo traduce a la tabla SQL `subscriptions`, y `SubscriptionRepository` hereda de Spring Data JPA las operaciones habituales de lectura y escritura. Flyway aplica los cambios de esquema desde `backend/src/main/resources/db/migration`.

## Modelo inicial de suscripción

Cada suscripción tendrá:

- `id`: identificador único.
- `name`: nombre del servicio.
- `amount`: importe por cobro, guardado con precisión decimal.
- `currency`: código de moneda (por ejemplo, EUR).
- `billingPeriod`: mensual o anual en la primera versión.
- `category`: categoría elegida por el usuario.
- `nextChargeDate`: fecha del próximo cobro.
- `active`: indica si sigue activa.

En Java, estos datos se representan con el `record` inmutable `Subscription`; `BillingPeriod` limita la frecuencia a `MONTHLY` o `YEARLY`. El importe usa `BigDecimal` para evitar los errores de precisión de `float` o `double` con dinero. El modelo comprueba sus datos obligatorios al crearse.

Los totales mensuales y anuales serán estimaciones normalizadas: una suscripción mensual cuenta 12 veces al año; una anual cuenta una vez al año y su equivalente mensual será el importe anual dividido entre 12. La primera versión asumirá una sola moneda por instalación para que los totales no mezclen monedas incompatibles.
