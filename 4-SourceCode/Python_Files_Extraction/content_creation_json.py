import aiohttp
import asyncio
import json
import os
import re

API_KEY = os.getenv("OPENROUTER_API_KEY")  # <---- SAFER
BASE_URL = "https://openrouter.ai/api/v1"

# ---------------- CLEAN JSON ---------------- #

def clean_json_like_text(text: str) -> str:
    # Remove Markdown fences
    text = re.sub(r"```json|```", "", text).strip()
    # Remove trailing commas
    text = re.sub(r",\s*([}\]])", r"\1", text)
    return text


# ---------------- MCQ FUNCTION ---------------- #

async def get_clean_question(session: aiohttp.ClientSession, content: str):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    json_schema = {
        "question": "Your question text here",
        "type": "mcq",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "answer": "Correct option",
        "section": "Relevant section",
        "rate": "good",
        "suggestion": "None if good; otherwise improved version"
    }

    payload = {
        "model": "deepseek/deepseek-chat",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a quiz generator AI.\n"
                    "Return ONLY a JSON array containing EXACTLY 3 quiz objects.\n"
                    "Each quiz object MUST match this format:\n"
                    + json.dumps(json_schema, indent=2)
                )
            },
            {
                "role": "user",
                "content": f"Generate 3 MCQ quiz questions from the following text:\n{content}"
            }
        ],
        "temperature": 0.3,
        "max_tokens": 1200
    }

    async with session.post(f"{BASE_URL}/chat/completions", headers=headers, json=payload) as resp:
        resp_json = await resp.json()

        try:
            assistant_text = resp_json["choices"][0]["message"]["content"]
        except (KeyError, IndexError):
            return {"error": "API response invalid", "raw_response": resp_json}

        cleaned = clean_json_like_text(assistant_text)

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return {"error": "JSON parsing failed", "raw_response": cleaned}


# ---------------- CHUNKING ---------------- #

def chunk_text(text: str, max_chars: int = 500):
    return [text[i:i+max_chars] for i in range(0, len(text), max_chars)]


async def generate_quiz_from_text(text: str):
    chunks = chunk_text(text)
    async with aiohttp.ClientSession() as session:
        tasks = [get_clean_question(session, chunk) for chunk in chunks]
        results = await asyncio.gather(*tasks)
    return results


# ---------------- TRUE/FALSE FUNCTION ---------------- #

async def get_tf_question(session: aiohttp.ClientSession, content: str):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    json_schema = {
        "question": "Your question text here",
        "type": "tf",
        "options": ["True", "False"],
        "answer": "Correct option",
        "section": "Relevant section",
        "rate": "good",
        "suggestion": "None if good; otherwise improved version"
    }

    payload = {
        "model": "deepseek/deepseek-chat",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a quiz generator AI.\n"
                    "Return ONLY a JSON array containing EXACTLY 3 quiz objects.\n"
                    "Each quiz object MUST match this format:\n"
                    + json.dumps(json_schema, indent=2)
                )
            },
            {
                "role": "user",
                "content": f"Generate 3 true/false quiz questions from the following text:\n{content}"
            }
        ],
        "temperature": 0.3,
        "max_tokens": 1200
    }

    async with session.post(f"{BASE_URL}/chat/completions", headers=headers, json=payload) as resp:
        resp_json = await resp.json()

        try:
            assistant_text = resp_json["choices"][0]["message"]["content"]
        except (KeyError, IndexError):
            return {"error": "API response invalid", "raw_response": resp_json}

        cleaned = clean_json_like_text(assistant_text)

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return {"error": "JSON parsing failed", "raw_response": cleaned}


async def generate_tf_quiz_from_text(text: str):
    chunks = chunk_text(text)
    async with aiohttp.ClientSession() as session:
        tasks = [get_tf_question(session, chunk) for chunk in chunks]
        return await asyncio.gather(*tasks)

