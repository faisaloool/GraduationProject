import aiohttp
import asyncio
import json
import re

# ---------------- CONFIG ---------------- #
API_KEY = "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"
BASE_URL = "https://openrouter.ai/api/v1"

# ---------------- CLEAN JSON ---------------- #
def clean_json_like_text(text: str) -> str:
    text = re.sub(r"```json|```", "", text).strip()
    text = re.sub(r",\s*([}\]])", r"\1", text)
    return text

# ---------------- CHUNKING ---------------- #
def chunk_text(text: str, max_chars: int = 500):
    return [text[i:i + max_chars] for i in range(0, len(text), max_chars)]

# ---------------- MCQ (CHUNK LEVEL) ---------------- #
async def get_mcq_questions(session: aiohttp.ClientSession, content: str):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    schema = {
        "question": "Question text",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "answer": "Correct option"
    }

    payload = {
        "model": "deepseek/deepseek-chat",
        "messages": [
            {
                "role": "system",
                "content": (
                    "Return ONLY a JSON array of MCQ objects.\n"
                    "Each object MUST follow this schema:\n"
                    f"{json.dumps(schema, indent=2)}\n"
                    "Rules:\n"
                    "- JSON only\n"
                    "- No markdown\n"
                    "- No explanations"
                )
            },
            {
                "role": "user",
                "content": f"Generate MCQ questions from this text:\n{content}"
            }
        ],
        "temperature": 0.3,
        "max_tokens": 1200
    }

    try:
        async with session.post(
            f"{BASE_URL}/chat/completions",
            headers=headers,
            json=payload
        ) as resp:
            data = await resp.json()
            raw = data["choices"][0]["message"]["content"]
            cleaned = clean_json_like_text(raw)
            parsed = json.loads(cleaned)

            return parsed if isinstance(parsed, list) else []

    except Exception:
        return []

# ---------------- TF (CHUNK LEVEL) ---------------- #
async def get_tf_questions(session: aiohttp.ClientSession, content: str):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    schema = {
        "question": "Question text",
        "answer": "Correct option"
    }

    payload = {
        "model": "deepseek/deepseek-chat",
        "messages": [
            {
                "role": "system",
                "content": (
                    "Return ONLY a JSON array of True/False objects.\n"
                    "Each object MUST follow this schema:\n"
                    f"{json.dumps(schema, indent=2)}\n"
                    "Rules:\n"
                    "- JSON only\n"
                    "- No markdown\n"
                    "- No explanations"
                )
            },
            {
                "role": "user",
                "content": f"Generate True/False questions from this text:\n{content}"
            }
        ],
        "temperature": 0.3,
        "max_tokens": 1200
    }

    try:
        async with session.post(
            f"{BASE_URL}/chat/completions",
            headers=headers,
            json=payload
        ) as resp:
            data = await resp.json()
            raw = data["choices"][0]["message"]["content"]
            cleaned = clean_json_like_text(raw)
            parsed = json.loads(cleaned)

            return parsed if isinstance(parsed, list) else []

    except Exception:
        return []

# ---------------- FINAL MCQ OUTPUT ---------------- #
async def generate_mcq_quiz_from_text(document_name: str, text: str):
    chunks = chunk_text(text)
    all_questions = []

    async with aiohttp.ClientSession() as session:
        tasks = [get_mcq_questions(session, chunk) for chunk in chunks]
        results = await asyncio.gather(*tasks)

    for block in results:
        all_questions.extend(block)

    return {
            "questions": all_questions
    }

# ---------------- FINAL TF OUTPUT ---------------- #
async def generate_tf_quiz_from_text(document_name: str, text: str):
    chunks = chunk_text(text)
    all_questions = []

    async with aiohttp.ClientSession() as session:
        tasks = [get_tf_questions(session, chunk) for chunk in chunks]
        results = await asyncio.gather(*tasks)

    for block in results:
        all_questions.extend(block)

    return {

            "questions": all_questions
        
    }
