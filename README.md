# Suscripciones

Aplicación personal y autoalojada para controlar suscripciones, movimientos de dinero y próximos cobros. Está construida con Spring Boot, React/TypeScript y PostgreSQL; Docker Compose permite iniciarla en local con una sola imagen para la aplicación y una base de datos aparte.

## Qué puedes hacer

- Crear, editar, archivar y restaurar suscripciones, con cobro mensual, anual o cada cierto número de días.
- Consultar el gasto mensual y anual estimado, los próximos cobros y el reparto por categoría.
- Registrar ingresos y gastos, filtrar movimientos y ver resúmenes por mes, categoría y moneda.
- Importar movimientos desde CSV, incluido el formato personal de extractos de Revolut. El archivo se procesa en el navegador; no hay conexión bancaria directa.
- Vincular movimientos con suscripciones para comparar el importe real con el esperado.
- Exportar y restaurar una copia JSON de los datos.

## Tecnologías

| Parte | Tecnología |
| --- | --- |
| Interfaz | React, TypeScript y Vite |
| API | Java 25, Spring Boot y Spring Data JPA |
| Base de datos | PostgreSQL y Flyway |
| Entorno | Docker Compose; imagen única para API e interfaz |
| Calidad | GitHub Actions, oxlint y pruebas de integración con Testcontainers |

## Iniciar en local

Necesitas Docker Desktop con el motor iniciado. Clona el repositorio y, desde su carpeta, ejecuta:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

Abre <http://localhost:8080>. La aplicación y PostgreSQL solo se publican en el equipo local. Cambia `APP_PORT` o `POSTGRES_PORT` en `.env` si esos puertos ya están ocupados.

Para comprobar el estado y consultar los registros:

```powershell
docker compose ps
docker compose logs -f app
```

Detén los contenedores con `docker compose down`. Los datos permanecen en el volumen `postgres_data`; no uses `docker compose down -v` salvo que quieras borrarlos.

La base de datos no tiene acceso desde otros equipos por defecto. La aplicación aún no incluye usuarios ni autenticación; úsala en local y no la expongas a Internet tal cual.

## Copias de seguridad e importación

Usa las opciones de copia de seguridad de la interfaz para exportar o restaurar suscripciones y movimientos en JSON. Además, puedes importar CSV desde la pantalla de movimientos. Para extractos de Revolut, se utiliza el formato personal con columnas como `Started Date`, `Completed Date`, `Description`, `Amount`, `Fee`, `Currency`, `State` y `Type`. Revisa la vista previa, los duplicados y las suscripciones sugeridas antes de confirmar. El CSV se procesa localmente en el navegador.

## Desarrollo

Para ejecutar API y Vite con recarga rápida, necesitas Java 25, Maven, Node.js 24 y Docker Desktop. En una terminal:

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
cd backend
mvn spring-boot:run
```

En otra terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Vite muestra la interfaz en <http://localhost:5173> y reenvía `/api` al backend en el puerto 8080. Comprobación rápida de la API: `GET http://localhost:8080/api/health`.

## Comprobaciones y CI

GitHub Actions ejecuta `npm run lint`, compila el frontend y ejecuta las pruebas Maven al subir cambios a `main` o abrir una pull request. Las pruebas de integración usan Testcontainers y PostgreSQL temporal.

Comandos locales, desde sus carpetas respectivas:

```powershell
# frontend/
npm ci
npm run lint
npm run build

# backend/
mvn test
```

Las pruebas de integración requieren Docker en marcha. La imagen de producción se construye con `docker compose up --build`.

## Datos y privacidad

Los datos principales viven en PostgreSQL dentro del volumen Docker local. No se necesita cuenta externa ni servicio de pago. La importación bancaria es manual mediante CSV; no se almacenan credenciales bancarias ni se conecta a Revolut.
