# ─────────────────────────────────────────────────────────────
# Stage 1 — Build
# ─────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17-alpine AS build

WORKDIR /app

# Copy Maven descriptor first for dependency caching
COPY pom.xml .

RUN mvn -B dependency:go-offline

# Copy application source
COPY src ./src

# Build application
RUN mvn -B clean package -DskipTests

# ─────────────────────────────────────────────────────────────
# Stage 2 — Runtime
# ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

# Create non-root user
RUN addgroup -S sacco && adduser -S -G sacco sacco

WORKDIR /app

# Copy application with correct ownership
COPY --from=build --chown=sacco:sacco /app/target/*.jar app.jar

USER sacco

EXPOSE 8080

ENTRYPOINT [
    "java",
    "-XX:+UseContainerSupport",
    "-XX:MaxRAMPercentage=75.0",
    "-XX:+UseG1GC",
    "-XX:+ExitOnOutOfMemoryError",
    "-Djava.security.egd=file:/dev/./urandom",
    "-jar",
    "app.jar"
]
