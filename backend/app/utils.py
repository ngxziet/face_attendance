"""
Utility functions
"""
from datetime import datetime, timezone, timedelta

# GMT+7 timezone
GMT7 = timezone(timedelta(hours=7))


def now_gmt7() -> datetime:
    """
    Get current datetime in GMT+7 timezone
    """
    return datetime.now(GMT7)


def utc_to_gmt7(utc_dt: datetime) -> datetime:
    """
    Convert UTC datetime to GMT+7
    """
    if utc_dt.tzinfo is None:
        # Assume UTC if no timezone info
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    return utc_dt.astimezone(GMT7)


def gmt7_to_utc(gmt7_dt: datetime) -> datetime:
    """
    Convert GMT+7 datetime to UTC
    """
    if gmt7_dt.tzinfo is None:
        # Assume GMT+7 if no timezone info
        gmt7_dt = gmt7_dt.replace(tzinfo=GMT7)
    return gmt7_dt.astimezone(timezone.utc)
