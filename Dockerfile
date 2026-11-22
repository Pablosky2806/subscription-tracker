FROM node:24-alpine3.24 AS frontend-build
WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM maven:3.10-eclipse-temurin-25 AS backend-build
WORKDIR /app

COPY backend/pom.xml ./pom.xml
COPY backend/src ./src
COPY --from=frontend-build /frontend/dist ./src/main/resources/static
RUN mvn -B -Dmaven.test.skip=true package

FROM eclipse-temurin:25-jre-alpine-3.24
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app
COPY --from=backend-build --chown=app:app /app/target/subscription-tracker-api-0.1.0-SNAPSHOT.jar ./app.jar
USER app

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
