import logging
from contextvars import ContextVar


request_id_context = ContextVar("request_id", default="none")


class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id_context.get()
        operation, separator, metadata = record.msg.partition(" ")
        record.msg = f"{operation} request_id={record.request_id}{separator}{metadata}"
        return True

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger("community-events")
logger.addFilter(RequestIdFilter())
