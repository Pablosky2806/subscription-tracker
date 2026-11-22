# Suscripciones

Aplicación self-hosted para registrar suscripciones y consultar cuánto cuestan, cuándo se cobran y cómo se reparte el gasto.

## Primera versión

- Crear, consultar, editar y archivar suscripciones.
- Guardar nombre, importe, moneda, categoría, frecuencia, próximo cobro y estado.
- Mostrar gasto mensual y anual estimado.
- Mostrar próximos cobros ordenados por fecha.
- Mostrar gasto agrupado por categoría.
- Registrar gastos e ingresos manualmente con fecha, concepto, importe y categoría.
- Editar y borrar movimientos ya registrados.
- Vincular un movimiento con una suscripción para identificar el cobro real de ese servicio.
- Consultar los cargos reales vinculados a suscripciones en el resumen del mes.
- Buscar y filtrar movimientos por mes, tipo y categoría.
- Importar gastos e ingresos desde CSV con vista previa y detección de posibles duplicados; el archivo se procesa localmente en el navegador.
- Exportar e importar copias JSON de suscripciones y movimientos; la restauración conserva los datos existentes y omite registros con el mismo identificador. También admite copias antiguas de la versión 1, que solo contenían suscripciones.

## Arquitectura acordada

- **Backend:** Spring Boot, API REST y lógica de negocio.
- **Frontend:** React con TypeScript; se compila y Spring Boot sirve los archivos estáticos.
- **Base de datos:** PostgreSQL en un contenedor separado.
- **Ejecución local:** Docker Compose levanta la app y PostgreSQL en contenedores separados.
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

## Integración continua

GitHub Actions ejecuta la compilación de React/TypeScript y `mvn test` al subir cambios a `main` o abrir una pull request contra `main`. La suite incluye el test de integración con Testcontainers, que usa el Docker disponible en el runner de GitHub.

## Desarrollo local

La forma habitual de iniciar la aplicación completa es con Docker Desktop. Compose construye una imagen para Spring Boot más el frontend React compilado, y ejecuta PostgreSQL en un contenedor separado:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

Abre `http://localhost:8080`. Si los puertos 5432 o 8080 ya están ocupados, cambia `POSTGRES_PORT` o `APP_PORT` en `.env` (por ejemplo, 5433 y 8081). Para ver el estado de los contenedores:

```powershell
docker compose ps
```

Para consultar los logs de la aplicación:

```powershell
docker compose logs -f app
```

Para detener los contenedores sin eliminar los datos:

```powershell
docker compose down
```

PostgreSQL guarda sus datos en el volumen `postgres_data`. `docker compose down -v` también borraría ese volumen y los datos almacenados.

### Desarrollo con recarga rápida

Para modificar el backend o el frontend sin reconstruir la imagen, se pueden ejecutar por separado. Este modo requiere Java 25, Maven, Node.js y Docker Desktop con el motor iniciado:

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
`GET http://localhost:8080/api/movements` lista los gastos e ingresos guardados; `POST /api/movements` registra uno, `PUT /api/movements/{id}` lo actualiza y `DELETE /api/movements/{id}` lo borra.
La pantalla de movimientos permite importar un CSV con las columnas `Fecha`, `Descripción`, `Importe` y `Moneda`; `Tipo` y `Categoría` son opcionales. Para el extracto personal habitual de Revolut reconoce `Started Date`, `Completed Date`, `Description`, `Amount`, `Fee`, `Currency`, `State` y `Type`: usa la fecha de liquidación, interpreta importes negativos como gastos, omite filas que no estén completadas y cambios entre divisas, y crea un movimiento separado para las comisiones. La vista previa marca posibles suscripciones por el nombre del servicio; el usuario debe seleccionarlas para guardar la vinculación. Revisa también los posibles duplicados antes de importar. El archivo se procesa en el navegador y no se envía a ningún servicio externo.

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

El test `SubscriptionApplicationIntegrationTest` inicia una instancia temporal de PostgreSQL con Testcontainers, aplica la migración de Flyway y comprueba la persistencia, las consultas y los recorridos HTTP de crear, leer, editar, archivar y restaurar. También verifica que la API rechaza datos inválidos. No usa ni modifica la base de datos de desarrollo. Para ejecutarlo, inicia Docker Desktop y ejecuta desde `backend/`:

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
- `billingPeriod`: mensual, anual o cada una cantidad concreta de días.
- `intervalDays`: número de días entre cobros cuando `billingPeriod` es `EVERY_N_DAYS`.
- `category`: categoría elegida por el usuario.
- `nextChargeDate`: fecha del próximo cobro.
- `active`: indica si sigue activa.

En Java, estos datos se representan con el `record` inmutable `Subscription`; `BillingPeriod` admite `MONTHLY`, `YEARLY` o `EVERY_N_DAYS`, cuyo intervalo se guarda en `intervalDays`. El importe usa `BigDecimal` para evitar los errores de precisión de `float` o `double` con dinero. El modelo comprueba sus datos obligatorios al crearse.

Los totales mensuales y anuales son estimaciones normalizadas: una suscripción mensual cuenta 12 veces al año; una anual cuenta una vez al año y su equivalente mensual es el importe anual dividido entre 12. Para intervalos por días se usa un año medio de 365,25 días. La primera versión asumirá una sola moneda por instalación para que los totales no mezclen monedas incompatibles.
