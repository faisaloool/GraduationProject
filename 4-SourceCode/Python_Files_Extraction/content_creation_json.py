# import requests
# import json
# # from Extractors.content_extractor_all import extract_file_text

# # DEEPSEEK_API_KEY = "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"

# # def call_deepseek_api_for_questions(extracted_text: str) -> dict:
# #     """
# #     Sends extracted text to DeepSeek and asks it to return questions in JSON format.
# #     """
# #     url = "https://openrouter.ai/api/v1/chat/completions"

# #     # Craft prompt to instruct DeepSeek to return JSON questions
# #     prompt = f"""
# #     Create quiz questions based on the following content. Return the result strictly in JSON format:
# #     {{
# #         "questions": [
# #             {{
# #                 "question": "question text",
# #                 "options": ["option1", "option2", "option3", "option4"],
# #                 "answer": "correct option"
# #             }}
# #         ]
# #     }}
# #     Content: {extracted_text}
# #     """

# #     headers = {
# #         "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
# #         "Content-Type": "application/json"
# #     }

# #     payload = {
# #     "model": "deepseek/deepseek-r1:free",
# #     "messages": [
# #         {"role": "user", "content": prompt}
# #     ]
# # }

# #     response = requests.post(url, headers=headers, data=json.dumps(payload))
# #     response.raise_for_status()

# #     try:
# #         result = response.json()
# #         # The real content is inside ['choices'][0]['message']['content']
# #         message_content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
# #         if not message_content:
# #             raise ValueError("Empty response from DeepSeek")

# #         # Try to parse JSON output
# #         questions_json = json.loads(message_content)
# #         return questions_json
# #     except Exception as e:
# #         raise ValueError(f"Failed to parse DeepSeek response: {e}\nRaw response: {response.text}")



# from openai import OpenAI

# client = OpenAI(
#     base_url="https://openrouter.ai/api/v1",
#     api_key="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"
# )

# completion = client.chat.completions.create(
#     model="tngtech/deepseek-r1t2-chimera:free",
#     messages=[
#         {"role": "user", "content": "Test if this model works."}
#     ]
# )
# print(completion.choices[0].message.content)

















import json
import re
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="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"
)

def call_deepseek_api_for_questions(extracted_text: str) -> dict:
    prompt = f"""
    Create quiz questions based on the following content. Return the result strictly in JSON format:
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

    try:
        completion = client.chat.completions.create(
            model="tngtech/deepseek-r1t2-chimera:free",
            messages=[{"role": "user", "content": prompt}]
        )

        message_content = completion.choices[0].message.content.strip()

        # Extract JSON using regex (grab first {...} block)
        json_match = re.search(r"\{.*\}", message_content, re.DOTALL)
        if not json_match:
            raise ValueError(f"No JSON found in response:\n{message_content}")

        questions_json = json.loads(json_match.group())
        return questions_json

    except Exception as e:
        raise ValueError(f"Failed to get/parse DeepSeek Chimera response: {e}")
