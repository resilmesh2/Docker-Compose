FROM timberio/vector:nightly-debian AS vector
LABEL authors="jorgeley@silentpush.com"

RUN apt -y update
COPY etc/vector/vector.yaml /etc/vector/vector.yaml
COPY ../datasets /etc/vector/datasets
COPY ../sources /etc/vector/sources
COPY ../transforms /etc/vector/transforms
COPY ../sinks /etc/vector/sinks
RUN useradd vector --system
RUN chown -R vector:nogroup /var/lib/vector/
RUN chown -R vector:nogroup /etc/vector
USER vector
