# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17-alpine AS build

WORKDIR /app

# Cache dependencies separately from source (layer cache optimisation)
COPY pom.xml .
RUN mvn --batch-mode dependency:go-offline -q

# Copy source and build
COPY src ./src
RUN mvn --batch-mode package -DskipTests -q

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine AS runtime

# Security: run as non-root
RUN addgroup --system sacco && adduser --system --ingroup sacco sacco

WORKDIR /app

# Copy built JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Ensure the sacco user owns the working directory
RUN chown -R sacco:sacco /app

USER sacco

EXPOSE 8080

# JVM tuning: container-aware heap, use G1GC, crash on OOM
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-XX:+UseG1GC", \
    "-XX:+ExitOnOutOfMemoryError", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "app.jar"]