import os
import json
from groq import Groq

_client = None


def get_client():
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ["GROQ_API_KEY"], max_retries=0)
    return _client


def ask_groq_json(system_prompt: str, user_prompt: str, fallback: dict, timeout: float = 8.0) -> dict:
    """
    Calls Groq's Llama 3.3 70B, expects strict JSON back, parses it.
    On any failure (timeout, bad JSON, API error), returns `fallback` instead of raising —
    Diagnosis Agent must never crash the pipeline because of an LLM hiccup.
    """
    try:
        client = get_client()
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=300,
            timeout=timeout,
        )
        raw = response.choices[0].message.content.strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(raw)
    except Exception as e:
        fallback = dict(fallback)
        fallback["_llm_error"] = str(e)
        return fallback