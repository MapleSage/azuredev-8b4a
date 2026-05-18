FROM rust:1.85-bookworm AS builder
WORKDIR /src
COPY . .
RUN cargo build --release -p broker-runtime

FROM gcr.io/distroless/cc-debian12:nonroot
WORKDIR /app
COPY --from=builder /src/target/release/broker-runtime /app/broker-runtime
COPY crates/broker-runtime/config /config
USER nonroot:nonroot
EXPOSE 8080
ENV BROKER_CONFIG_DIR=/config BROKER_WORKSPACE=/workspace
ENTRYPOINT ["/app/broker-runtime"]
