from fastapi import FastAPI, UploadFile, File, HTTPException, Query
import os
from Extractors.content_extractor_all import extract_file_text
from content_creation_json import generate_mcq_quiz_from_text, generate_tf_quiz_from_text
import requests
import httpx
import asyncio
import json

app = FastAPI()

@app.post("/generate_quiz")
async def generate_quiz(
    file: UploadFile = File(...),
    quiz_type: str = Query("mcq", regex="^(mcq|tf)$", description="Type of quiz: mcq or tf")
):
    file_ext = os.path.splitext(file.filename)[1].lower()
    temp_path = f"temp{file_ext}"

    # Save uploaded file temporarily
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    try:
        try:
            extracted_text = extract_file_text(temp_path, file.filename)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))


        if quiz_type == "mcq":
            try:
                quiz_json_list = await generate_mcq_quiz_from_text(file.filename, extracted_text)
            except Exception as e:
                quiz_json_list = [{"error": f"⚠️ DeepSeek API error: {e}"}]
        else:  # quiz_type == "tf"
            try:
                quiz_json_list = await generate_tf_quiz_from_text(file.filename, extracted_text)
            except Exception as e:
                quiz_json_list = [{"error": f"⚠️ DeepSeek API error: {e}"}]




        response_data = {
            "document": file.filename,
            "question_type": quiz_type,
            "output": quiz_json_list
        }

        return response_data

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/extract_text")
async def extract_text_endpoint(file: UploadFile = File(...)):
    file_ext = os.path.splitext(file.filename)[1].lower()
    temp_path = f"temp{file_ext}"

    # Save uploaded file temporarily
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    try:
        try:
            text = extract_file_text(temp_path, file.filename)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        if not text.strip():
            raise HTTPException(status_code=400, detail="No text found in file")

        return {
            "filename": file.filename,
            "text": text
        }

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


async def send_to_lm_studio_async(prompt: str) -> dict:
    """
    Send a prompt to LM Studio asynchronously and return the AI response as a Python dict.
    Parses the AI's JSON string into a dict before returning.
    """
    url = "http://127.0.0.1:1234/v1/chat/completions"
    payload = {
        "model": "local-model",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.5,
        "max_tokens": 1200
    }
    headers = {"Content-Type": "application/json"}

    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, headers=headers, timeout=None)
        resp.raise_for_status()
        data = resp.json()

    ai_text = data["choices"][0]["message"]["content"]

    # Parse AI response into a real dict
    try:
        parsed = json.loads(ai_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON")

    return parsed


def build_mcq_prompt(text: str, count: int, filename: str) -> str:
    return f"""
Generate exactly {count} Multiple Choice Questions.
Return JSON ONLY. No explanations. No markdown.

Rules:
- Answer must contain the FULL correct option text
- Follow the structure EXACTLY

Expected JSON format (example with 2 questions):

{{
  "file_name": "{filename}",
  "question_type": "Multiple Choice",
  "questions": [
    {{
      "question": "What is the main goal of Data Mining?",
      "options": [
        "A) Extracting useful knowledge from data",
        "B) Storing large datasets",
        "C) Designing databases",
        "D) Visualizing data only"
      ],
      "answer": "A) Extracting useful knowledge from data"
    }},
    {{
      "question": "Which task predicts numerical values?",
      "options": [
        "A) Classification",
        "B) Clustering",
        "C) Regression",
        "D) Association Rule Mining"
      ],
      "answer": "C) Regression"
    }}
  ]
}}

Content:
{text}
"""


def build_tf_prompt(text: str, count: int, filename: str) -> str:
    return f"""
Generate exactly {count} True or False Questions.
Return JSON ONLY. No explanations. No markdown.

Rules:
- Follow the structure EXACTLY
- Each question has only "question" and "answer" fields

Expected JSON format (example with 2 questions):

{{
  "file_name": "{filename}",
  "question_type": "True or False",
  "questions": [
    {{
      "question": "Clustering groups data without predefined labels.",
      "answer": "True"
    }},
    {{
      "question": "Regression is used for categorical outputs.",
      "answer": "False"
    }}
  ]
}}

Content:
{text}
"""


# @app.post("/ask_ai_model")
# async def ask_ai_model(file: UploadFile = File(...), mcq_count: int = 20, tf_count: int = 20):
#     temp_path = f"temp{os.path.splitext(file.filename)[1]}"

#     # Save uploaded file temporarily
#     with open(temp_path, "wb") as f:
#         f.write(await file.read())

#     try:
#         # Extract text from the file
#         text = extract_file_text(temp_path, file.filename)
#         if not text.strip():
#             raise HTTPException(status_code=400, detail="No text found in file")

#         # Build prompts only if count > 0
#         tasks = []
#         if mcq_count != 0:
#             mcq_prompt = build_mcq_prompt(text, mcq_count, file.filename)
#             tasks.append(asyncio.create_task(send_to_lm_studio_async(mcq_prompt)))
#         if tf_count != 0:
#             tf_prompt = build_tf_prompt(text, tf_count, file.filename)
#             tasks.append(asyncio.create_task(send_to_lm_studio_async(tf_prompt)))

#         # Run AI calls concurrently
#         results = await asyncio.gather(*tasks)

#         # Map results safely, provide empty defaults if count is 0
#         mcq_result = results[0] if mcq_count != 0 else {
#             "file_name": file.filename, 
#             "question_type": "Multiple Choice", 
#             "questions": []
#         }
#         tf_result = results[1] if tf_count != 0 else {
#             "file_name": file.filename, 
#             "question_type": "True or False", 
#             "questions": []
#         }

#         return {
#             "filename": file.filename,
#             "mcq_questions": mcq_result,
#             "true_false_questions": tf_result,
#             "total_questions": mcq_count + tf_count
#         }

#     finally:
#         if os.path.exists(temp_path):
#             os.remove(temp_path)





@app.post("/ask_ai_model")
async def ask_ai_model(file: UploadFile = File(...), mcq_count: int = 20, tf_count: int = 20):
    return {
        "filename": "Ch1_Introduction.pptx",
        "mcq_questions": {
            "file_name": "Ch1_Introduction.pptx",
            "question_type": "Multiple Choice",
            "questions": [
                {
                    "question": "Which of the following is NOT mentioned as a catalyst for the Information Age?",
                    "options": [
                        "A) Low-cost computers",
                        "B) High-speed communication networks",
                        "C) Advanced nuclear reactors",
                        "D) Smartphones"
                    ],
                    "answer": "C) Advanced nuclear reactors"
                },
                {
                    "question": "Which issue is highlighted in the text regarding cell phone usage?",
                    "options": [
                        "A) Rudeness",
                        "B) Battery life",
                        "C) Screen size",
                        "D) Software updates"
                    ],
                    "answer": "A) Rudeness"
                },
                {
                    "question": "Which statement best describes a positive right in ethical theory?",
                    "options": [
                        "A) Right to act without interference",
                        "B) Obligation to provide something to others",
                        "C) Right to free speech",
                        "D) Right to privacy"
                    ],
                    "answer": "B) Obligation to provide something to others"
                }
            ]
        },
        "true_false_questions": {
            "file_name": "Ch1_Introduction.pptx",
            "question_type": "True or False",
            "questions": []
        },
        "total_questions": 3
    }





# Run with:
# uvicorn APIFile:app --port 8001
