# ─────────────────────────────────────────────────────────────
# Stage 1 — Build
# ─────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-26-alpine AS build

WORKDIR /app

# Copy Maven descriptor first for dependency caching
COPY pom.xml .

RUN mvn -B dependency:go-offline

# Copy application source
COPY src ./src

# Build application
RUN mvn -B clean package -DskipTests

# Extract layers for faster subsequent Docker builds
RUN java -Djarmode=layertools -jar target/*.jar extract --destination target/extracted

# ─────────────────────────────────────────────────────────────
# Stage 2 — Runtime
# ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:26-jre-alpine

# Create non-root user
RUN addgroup -S sacco && adduser -S -G sacco sacco

WORKDIR /app

# Copy extracted layers one by one (order matters for caching!)
COPY --from=build --chown=sacco:sacco /app/target/extracted/dependencies/ ./
COPY --from=build --chown=sacco:sacco /app/target/extracted/spring-boot-loader/ ./
COPY --from=build --chown=sacco:sacco /app/target/extracted/snapshot-dependencies/ ./
COPY --from=build --chown=sacco:sacco /app/target/extracted/application/ ./

USER sacco

EXPOSE 8080

ENTRYPOINT ["java","-XX:+UseContainerSupport","-XX:MaxRAMPercentage=75.0","-XX:+UseG1GC","-XX:+ExitOnOutOfMemoryError","-Djava.security.egd=file:/dev/./urandom","org.springframework.boot.loader.launch.JarLauncher"]