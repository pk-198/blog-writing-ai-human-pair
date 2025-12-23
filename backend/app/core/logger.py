"""
Centralized logging configuration for Blog Creation System.
Provides consistent logging across all services with proper formatting and levels.
Enhanced with color output and detailed progress tracking.
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional

# ANSI color codes for terminal output
class Colors:
    """ANSI color codes for colored console output."""
    RESET = '\033[0m'
    BOLD = '\033[1m'

    # Colors
    BLACK = '\033[30m'
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    MAGENTA = '\033[35m'
    CYAN = '\033[36m'
    WHITE = '\033[37m'

    # Bright colors
    BRIGHT_RED = '\033[91m'
    BRIGHT_GREEN = '\033[92m'
    BRIGHT_YELLOW = '\033[93m'
    BRIGHT_BLUE = '\033[94m'
    BRIGHT_MAGENTA = '\033[95m'
    BRIGHT_CYAN = '\033[96m'


class ColoredFormatter(logging.Formatter):
    """Custom formatter that adds colors to console output."""

    COLORS = {
        'DEBUG': Colors.CYAN,
        'INFO': Colors.GREEN,
        'WARNING': Colors.YELLOW,
        'ERROR': Colors.RED,
        'CRITICAL': Colors.BRIGHT_RED + Colors.BOLD,
    }

    def format(self, record):
        # Add color to level name
        levelname = record.levelname
        if levelname in self.COLORS:
            record.levelname = f"{self.COLORS[levelname]}{levelname}{Colors.RESET}"

        # Color specific message types
        if 'STEP_START' in record.getMessage():
            record.msg = f"{Colors.BRIGHT_BLUE}▶ {record.msg}{Colors.RESET}"
        elif 'STEP_COMPLETE' in record.getMessage():
            record.msg = f"{Colors.BRIGHT_GREEN}✓ {record.msg}{Colors.RESET}"
        elif 'STEP_ERROR' in record.getMessage():
            record.msg = f"{Colors.BRIGHT_RED}✗ {record.msg}{Colors.RESET}"
        elif 'STEP_SKIPPED' in record.getMessage():
            record.msg = f"{Colors.YELLOW}⊘ {record.msg}{Colors.RESET}"
        elif 'API_CALL' in record.getMessage():
            record.msg = f"{Colors.MAGENTA}⇄ {record.msg}{Colors.RESET}"

        return super().format(record)

# Create logs directory if it doesn't exist
LOGS_DIR = Path(__file__).parent.parent.parent.parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# Log file path with date
LOG_FILE = LOGS_DIR / f"blog_system_{datetime.now().strftime('%Y%m%d')}.log"


def setup_logger(
    name: str,
    level: int = logging.DEBUG,
    log_to_file: bool = True,
    log_to_console: bool = True
) -> logging.Logger:
    """
    Set up a logger with consistent formatting.

    Args:
        name: Logger name (typically __name__ from calling module)
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_to_file: Whether to log to file
        log_to_console: Whether to log to console

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Prevent duplicate handlers
    if logger.handlers:
        return logger

    # Create formatters
    file_formatter = logging.Formatter(
        fmt='%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    console_formatter = ColoredFormatter(
        fmt='%(asctime)s | %(levelname)-8s | %(message)s',
        datefmt='%H:%M:%S'
    )

    # Console handler with colors
    if log_to_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)

    # File handler without colors
    if log_to_file:
        file_handler = logging.FileHandler(LOG_FILE, encoding='utf-8')
        file_handler.setLevel(level)
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)

    return logger


def log_step_start(logger: logging.Logger, session_id: str, step_number: int, step_name: str):
    """Log the start of a workflow step."""
    session_short = session_id[:8] if len(session_id) > 8 else session_id
    logger.info(f"STEP_START | {session_short}... | Step {step_number:02d}: {step_name}")
    print(f"\n{'='*80}")
    print(f"{Colors.BRIGHT_BLUE}{Colors.BOLD}>>> STARTING STEP {step_number}: {step_name}{Colors.RESET}")
    print(f"{'='*80}\n")


def log_step_complete(logger: logging.Logger, session_id: str, step_number: int, duration_seconds: float):
    """Log the completion of a workflow step."""
    session_short = session_id[:8] if len(session_id) > 8 else session_id
    logger.info(f"STEP_COMPLETE | {session_short}... | Step {step_number:02d} | Duration: {duration_seconds:.2f}s")
    print(f"\n{Colors.BRIGHT_GREEN}{Colors.BOLD}✓ STEP {step_number} COMPLETED in {duration_seconds:.2f}s{Colors.RESET}")
    print(f"{'-'*80}\n")


def log_step_skip(logger: logging.Logger, session_id: str, step_number: int, reason: str):
    """Log when a step is skipped."""
    logger.warning(f"STEP_SKIPPED | Session: {session_id} | Step {step_number} | Reason: {reason}")


def log_step_error(logger: logging.Logger, session_id: str, step_number: int, error: Exception):
    """Log when a step encounters an error."""
    session_short = session_id[:8] if len(session_id) > 8 else session_id
    logger.error(f"STEP_ERROR | {session_short}... | Step {step_number:02d} | Error: {str(error)}", exc_info=True)
    print(f"\n{Colors.BRIGHT_RED}{Colors.BOLD}✗ STEP {step_number} FAILED: {str(error)}{Colors.RESET}")
    print(f"{'-'*80}\n")


def log_api_call(logger: logging.Logger, service: str, endpoint: str, duration_ms: float, status: str = "success"):
    """Log external API calls."""
    status_color = Colors.GREEN if status == "success" else Colors.RED
    logger.info(f"API_CALL | {service:10s} | {endpoint:50s} | {duration_ms:6.0f}ms | {status_color}{status}{Colors.RESET}")


def log_data_validation(logger: logging.Logger, step_number: int, field: str, valid: bool, message: Optional[str] = None):
    """Log data validation results."""
    status = "VALID" if valid else "INVALID"
    msg = f"VALIDATION | Step {step_number} | Field: {field} | Status: {status}"
    if message:
        msg += f" | {message}"

    if valid:
        logger.debug(msg)
    else:
        logger.warning(msg)


# Create application-wide logger instance
app_logger = setup_logger("blog_system", level=logging.DEBUG)
