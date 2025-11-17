from nats.aio.errors import ErrSlowConsumer


async def error_cb(e):
    from subscriber import logger

    logger.error(f"error_cb: {e}")
    if type(e) is ErrSlowConsumer:
        logger.error(f"Slow consumer error: {e}")
        # logger.error(f"Pending messages {subscriberState.queue.pending_msgs}")
        # await subscriberState.queue.unsubscribe(e.sid)
        # await asyncio.sleep(10)
        # logger.info("Restarting subscription")
        # subscriberState.queue = await nc.subscribe(
        #     SUBSCRIBE_SUBJECT,
        #     queue=SUBSCRIBE_QUEUE,
        #     cb=save_events
        # )


async def closed_cb():
    from subscriber import logger

    logger.error(f"Closed connection")
    # logger.error(f"Pending messages {subscriberState.queue.pending_msgs}")


async def disconnected_cb():
    from subscriber import logger

    logger.error(f"Disconnected")
    # logger.error(f"Pending messages {subscriberState.queue.pending_msgs}")


async def reconnected_cb():
    from subscriber import logger

    logger.error(f"Reconnected")
    # logger.warning(f"Pending messages {subscriberState.queue.pending_msgs}")
