import aiohttp
import asyncio
import json
import re

API_KEY = "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"
BASE_URL = "https://openrouter.ai/api/v1"

def clean_json_like_text(text: str) -> str:
    text = re.sub(r'```json', '', text)
    text = re.sub(r'```', '', text)
    text = re.sub(r',\s*([}\]])', r'\1', text)
    text = re.sub(r'\\(?!["\\/bfnrtu])', r'', text)
    text = re.sub(r'[\x00-\x1f\x7f]', '', text)
    return text.strip()

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
                    "You are a quiz generator AI. Respond ONLY with a single JSON object matching this format exactly, "
                    "without any extra fields, headers, or footers:\n" + json.dumps(json_schema, indent=2)
                )
            },
            {"role": "user", "content": f"Generate THREE quiz question from the following content:\n{content}"}
        ],
        "temperature": 0.3,
        "max_tokens": 1200
    }

    async with session.post(f"{BASE_URL}/chat/completions", headers=headers, json=payload) as resp:
        resp_json = await resp.json()
        try:
            assistant_text = resp_json['choices'][0]['message']['content']
        except (KeyError, IndexError):
            return {"error": "Unexpected API response structure", "raw_response": resp_json}

        cleaned = clean_json_like_text(assistant_text)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return {"error": "Could not parse JSON", "raw_response": cleaned}

# Split by characters
def chunk_text(text: str, max_chars: int = 500):
    return [text[i:i+max_chars] for i in range(0, len(text), max_chars)]

async def generate_quiz_from_text(text: str):
    chunks = chunk_text(text)
    async with aiohttp.ClientSession() as session:
        tasks = [get_clean_question(session, chunk) for chunk in chunks]
        quiz_results = await asyncio.gather(*tasks)
    # Only return the list of questions
    return quiz_results
