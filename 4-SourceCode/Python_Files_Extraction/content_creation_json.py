import json
import re
import requests
import math

API_KEY = "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"
BASE_URL = "https://openrouter.ai/api/v1"

def call_deepseek_api_for_questions(extracted_text: str) -> dict:
    # Calculate number of questions: 1 per 50 characters (minimum 1)
    num_questions = max(1, math.ceil(len(extracted_text) / 50))

    prompt = f"""
    Create exactly {num_questions} quiz questions based on the following content.
   Return strictly valid JSON only, no extra text, no comments, only json, no introductions, no endings, no any other things. strictly json only:
    {{
        "questions": [
            {{
                "question": "question text",
                "options": ["option1", "option2", "option3", "option4"],
                "answer": "correct option"
            }}
        ]
    }}
    Content: {extracted_text}
    """

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "Quiz AI Generator"
    }

    data = {
        "model": "deepseek/deepseek-chat",
        "messages": [
            {"role": "system", "content": "You are a quiz generator AI."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 1500
    }

    try:
        response = requests.post(f"{BASE_URL}/chat/completions", headers=headers, json=data)
        response.raise_for_status()

        response_json = response.json()
        content = response_json["choices"][0]["message"]["content"]

        json_match = re.search(r"\{.*\}", content, re.DOTALL)
        if not json_match:
            raise ValueError(f"No JSON found in response:\n{content}")

        return json.loads(json_match.group())

    except requests.exceptions.HTTPError as http_err:
        raise ValueError(f"HTTP error: {response.status_code} - {response.text}")
    except Exception as e:
        raise ValueError(f"DeepSeek API error: {e}")
