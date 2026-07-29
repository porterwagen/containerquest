# teach: Third language, same three moves. But Python cannot ship a single
# teach: static binary the way Go and C can — it needs its interpreter and all
# teach: of site-packages at runtime. That is the whole reason this image is
# teach: ~100x larger than the C one, and it is a property of the language,
# teach: not of Docker.

FROM python:3.13-slim AS build

# teach: A virtualenv gives us one self-contained directory to copy forward.
# teach: Without it, pip scatters files across /usr/lib and /usr/local and the
# teach: second stage becomes guesswork.
ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /app
# teach: Requirements before source, so an edit to main.py does not re-run pip.
COPY requirements.txt .
# teach: --no-cache-dir stops pip caching wheels into a layer we would then
# teach: ship. The cache is useless at runtime and costs tens of megabytes.
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.13-slim

# teach: ARG exists only during the build; ENV persists into the running
# teach: container. Promoting one to the other is how a container can report
# teach: which commit it was built from — the basis of the version badge you
# teach: watch move during a rolling deploy.
ARG GIT_SHA=dev
ARG BUILD_TIME=unknown
ENV GIT_SHA=$GIT_SHA BUILD_TIME=$BUILD_TIME

# teach: Create an unprivileged user. Containers run as root unless told
# teach: otherwise, and root in the container is uid 0 on the host kernel.
RUN useradd --create-home --uid 10001 quest

ENV VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
# teach: PYTHONUNBUFFERED is not cosmetic. Without it Python buffers stdout when
# teach: it is a pipe rather than a terminal, so `docker logs` shows nothing
# teach: until the buffer flushes — and a crashing container appears silent.

COPY --from=build /opt/venv /opt/venv
WORKDIR /app
COPY --chown=quest:quest main.py .

USER quest
EXPOSE 8000

# teach: Exec form (a JSON array), not shell form. Shell form wraps the process
# teach: in /bin/sh, which does not forward SIGTERM — so Kubernetes waits the
# teach: full 30s grace period and then SIGKILLs every pod on every deploy.
ENTRYPOINT ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
