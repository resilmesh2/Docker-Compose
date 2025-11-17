#!/bin/bash
nohup python3 /home/app/subscriber.py &
nohup /home/app/.local/bin/watchmedo shell-command --patterns="*.ndjson" --command='python3 /home/app/ipv4_publisher.py "${watch_src_path}" "${watch_event_type}"' /home/app/events/outbound/ipv4s &
nohup /home/app/.local/bin/watchmedo shell-command --patterns="*.ndjson" --command='python3 /home/app/ipv6_publisher.py "${watch_src_path}" "${watch_event_type}"' /home/app/events/outbound/ipv6s &
nohup /home/app/.local/bin/watchmedo shell-command --patterns="*.ndjson" --command='python3 /home/app/domain_publisher.py "${watch_src_path}" "${watch_event_type}"' /home/app/events/outbound/domains &
tail -f /home/app/publisher.log