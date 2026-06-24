"""
Multi-Provider LLM Client — Automatic Fallback Chain

Tries each configured provider in order. When one hits a rate limit or quota error,
it automatically falls through to the next provider.

Provider priority:
  1. Gemini (multiple models)
  2. Groq
  3. OpenRouter
  4. Cerebras
  5. Cohere
"""
import asyncio
import logging
from typing import Optional

from app.config.settings import settings

logger = logging.getLogger(__name__)


class RateLimitError(Exception):
    """Raised when a provider returns a rate-limit / quota error."""


class AllProvidersExhaustedError(Exception):
    """Raised when every provider in the chain has failed."""


# ── Gemini Text Models (ordered by preference) ──────────────────
GEMINI_TEXT_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview",
]

# Gemini voice / TTS models (reserved for future audio pipelines)
GEMINI_VOICE_MODELS = [
    "gemini-3.1-flash-live-preview",
    "gemini-3.1-flash-tts-preview",
    "gemini-2.5-flash-native-audio-preview-12-2025",
    "gemini-2.5-flash-preview-tts",
    "gemini-2.5-pro-preview-tts",
]


# ── Provider Implementations ────────────────────────────────────

async def _call_gemini(prompt: str, temperature: Optional[float] = None) -> str:
    """Try each Gemini text model in order."""
    from google import genai
    from google.genai.errors import ClientError

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    for model_name in GEMINI_TEXT_MODELS:
        try:
            config = {}
            if temperature is not None:
                config["temperature"] = temperature

            response = await asyncio.to_thread(
                client.models.generate_content,
                model=model_name,
                contents=prompt,
                **({"config": config} if config else {}),
            )
            logger.info(f"LLM OK: Gemini/{model_name}")
            return response.text
        except ClientError as e:
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err or "quota" in err.lower():
                logger.warning(f"LLM rate-limited: Gemini/{model_name}")
                continue  # try next Gemini model
            # Non-rate-limit error (e.g. model not found) — skip this model
            logger.warning(f"LLM error Gemini/{model_name}: {err}")
            continue
        except Exception as e:
            logger.warning(f"LLM error Gemini/{model_name}: {e}")
            continue

    raise RateLimitError("All Gemini models exhausted")


async def _call_groq(prompt: str, temperature: Optional[float] = None) -> str:
    """Call Groq API."""
    if not settings.GROQ_API_KEY:
        raise RateLimitError("GROQ_API_KEY not set")

    from groq import Groq, RateLimitError as GroqRateLimit, APIStatusError

    client = Groq(api_key=settings.GROQ_API_KEY)

    groq_models = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "gemma2-9b-it",
        "mixtral-8x7b-32768",
    ]

    for model_name in groq_models:
        try:
            kwargs = {
                "model": model_name,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 4096,
            }
            if temperature is not None:
                kwargs["temperature"] = temperature

            response = await asyncio.to_thread(
                client.chat.completions.create,
                **kwargs,
            )
            text = response.choices[0].message.content
            logger.info(f"LLM OK: Groq/{model_name}")
            return text
        except GroqRateLimit:
            logger.warning(f"LLM rate-limited: Groq/{model_name}")
            continue
        except APIStatusError as e:
            if e.status_code == 429:
                logger.warning(f"LLM rate-limited: Groq/{model_name}")
                continue
            logger.warning(f"LLM error Groq/{model_name}: {e}")
            continue
        except Exception as e:
            logger.warning(f"LLM error Groq/{model_name}: {e}")
            continue

    raise RateLimitError("All Groq models exhausted")


async def _call_openrouter(prompt: str, temperature: Optional[float] = None) -> str:
    """Call OpenRouter API (OpenAI-compatible)."""
    if not settings.OPENROUTER_API_KEY:
        raise RateLimitError("OPENROUTER_API_KEY not set")

    from openai import OpenAI

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.OPENROUTER_API_KEY,
    )

    openrouter_models = [
        "meta-llama/llama-3.3-70b-instruct:free",
        "mistralai/mistral-7b-instruct:free",
        "google/gemma-2-9b-it:free",
    ]

    for model_name in openrouter_models:
        try:
            kwargs = {
                "model": model_name,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 4096,
            }
            if temperature is not None:
                kwargs["temperature"] = temperature

            response = await asyncio.to_thread(
                client.chat.completions.create,
                **kwargs,
            )
            text = response.choices[0].message.content
            logger.info(f"LLM OK: OpenRouter/{model_name}")
            return text
        except Exception as e:
            err = str(e)
            if "429" in err or "rate" in err.lower() or "limit" in err.lower():
                logger.warning(f"LLM rate-limited: OpenRouter/{model_name}")
                continue
            logger.warning(f"LLM error OpenRouter/{model_name}: {e}")
            continue

    raise RateLimitError("All OpenRouter models exhausted")


async def _call_cerebras(prompt: str, temperature: Optional[float] = None) -> str:
    """Call Cerebras API."""
    if not settings.CEREBRAS_API_KEY:
        raise RateLimitError("CEREBRAS_API_KEY not set")

    from cerebras.cloud.sdk import Cerebras, APIStatusError

    client = Cerebras(api_key=settings.CEREBRAS_API_KEY)

    cerebras_models = [
        "llama-3.3-70b",
        "llama-4-scout-17b-16e",
    ]

    for model_name in cerebras_models:
        try:
            kwargs = {
                "model": model_name,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 4096,
            }
            if temperature is not None:
                kwargs["temperature"] = temperature

            response = await asyncio.to_thread(
                client.chat.completions.create,
                **kwargs,
            )
            text = response.choices[0].message.content
            logger.info(f"LLM OK: Cerebras/{model_name}")
            return text
        except APIStatusError as e:
            if e.status_code == 429:
                logger.warning(f"LLM rate-limited: Cerebras/{model_name}")
                continue
            logger.warning(f"LLM error Cerebras/{model_name}: {e}")
            continue
        except Exception as e:
            err = str(e)
            if "429" in err or "rate" in err.lower():
                logger.warning(f"LLM rate-limited: Cerebras/{model_name}")
                continue
            logger.warning(f"LLM error Cerebras/{model_name}: {e}")
            continue

    raise RateLimitError("All Cerebras models exhausted")


async def _call_cohere(prompt: str, temperature: Optional[float] = None) -> str:
    """Call Cohere API."""
    if not settings.COHERE_API_KEY:
        raise RateLimitError("COHERE_API_KEY not set")

    import cohere

    client = cohere.Client(api_key=settings.COHERE_API_KEY)

    try:
        kwargs = {
            "model": "command-r",
            "message": prompt,
            "max_tokens": 4096,
        }
        if temperature is not None:
            kwargs["temperature"] = temperature

        response = await asyncio.to_thread(
            client.chat,
            **kwargs,
        )
        text = response.text
        logger.info("LLM OK: Cohere/command-r")
        return text
    except Exception as e:
        err = str(e)
        if "429" in err or "rate" in err.lower() or "limit" in err.lower():
            logger.warning(f"LLM rate-limited: Cohere/command-r")
            raise RateLimitError(f"Cohere rate limited: {err}")
        logger.warning(f"LLM error Cohere/command-r: {e}")
        raise RateLimitError(f"Cohere error: {err}")


# ── Main Entry Point ────────────────────────────────────────────

# Ordered list of provider callables
_PROVIDERS = [
    ("Gemini", _call_gemini),
    ("Groq", _call_groq),
    ("OpenRouter", _call_openrouter),
    ("Cerebras", _call_cerebras),
    ("Cohere", _call_cohere),
]


async def generate_text(prompt: str, temperature: Optional[float] = None) -> str:
    """
    Try each configured LLM provider in order.
    Falls through on rate-limit errors.
    Returns the generated text from whichever provider succeeds first.
    """
    errors = []

    for provider_name, provider_fn in _PROVIDERS:
        try:
            result = await provider_fn(prompt, temperature)
            return result
        except RateLimitError as e:
            errors.append(f"{provider_name}: {e}")
            logger.warning(f"Provider {provider_name} exhausted, trying next...")
            continue

    error_summary = " | ".join(errors)
    logger.error(f"All LLM providers exhausted: {error_summary}")
    raise AllProvidersExhaustedError(
        f"All LLM providers hit rate limits. Errors: {error_summary}"
    )
