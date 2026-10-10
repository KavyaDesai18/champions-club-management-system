# =========================================================================
# Stage 1: Build Application with Maven and Eclipse Temurin 21 JDK
# =========================================================================
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# 1. Cache Maven dependencies first
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# 2. Copy source and compile production artifact
COPY src ./src
RUN mvn clean package -DskipTests -B

# =========================================================================
# Stage 2: Minimal Production Runtime with Eclipse Temurin 21 JRE Alpine
# =========================================================================
FROM eclipse-temurin:21-jre-alpine

LABEL maintainer="Champions Club Engineering <engineering@championsclub.com>"
LABEL description="Champions Club Sports Facility Management System Backend"

# Security: Create non-root system user and group
RUN addgroup -S champions && adduser -S champions -G champions

WORKDIR /app

# JVM Optimization flags for containerized microservice deployments
ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"
ENV SERVER_PORT=8081
ENV SPRING_PROFILES_ACTIVE=prod

# Copy built JAR from builder stage
COPY --from=builder --chown=champions:champions /build/target/champions-club-backend-*.jar app.jar

# Install wget for healthcheck probe
RUN apk add --no-cache wget

USER champions

EXPOSE 8081

# Liveness and Readiness probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8081/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
