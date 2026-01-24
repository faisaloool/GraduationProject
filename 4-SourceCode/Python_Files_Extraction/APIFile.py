from fastapi import FastAPI, UploadFile, File, HTTPException, Query
import os
from Extractors.content_extractor_all import extract_file_text
from content_creation_json import generate_mcq_quiz_from_text, generate_tf_quiz_from_text
import requests
import httpx
import asyncio
from docx import Document

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






# def send_to_lm_studio(prompt: str) -> str:
#     """Send a prompt to LM Studio and return the AI response."""
#     url = "http://127.0.0.1:1234/v1/chat/completions"
#     payload = {
#         "model": "local-model",
#         "messages": [{"role": "user", "content": prompt}],
#         "temperature": 0.5,
#         "max_tokens": 1200
#     }
#     headers = {"Content-Type": "application/json"}

#     try:
#         response = requests.post(url, json=payload, headers=headers)
#         response.raise_for_status()
#         return response.json()["choices"][0]["message"]["content"]
#     except Exception as e:
#         return f"Error communicating with LM Studio: {e}"

# async def send_to_lm_studio_async(prompt: str) -> str:
#     """Send a prompt to LM Studio asynchronously and return the AI response."""
#     url = "http://26.152.59.249:1234/v1/chat/completions"
#     payload = {
#         "model": "local-model",
#         "messages": [{"role": "user", "content": prompt}],
#         "temperature": 0.5,
#         "max_tokens": 1200
#     }
#     headers = {"Content-Type": "application/json"}

#     async with httpx.AsyncClient() as client:
#         resp = await client.post(url, json=payload, headers=headers, timeout=None)
#         resp.raise_for_status()
#         data = resp.json()
#         return data["choices"][0]["message"]["content"]


LM_STUDIO_URL = "http://26.152.59.249:1234/v1/chat/completions"
LM_TIMEOUT = httpx.Timeout(240.0)

async def send_to_lm_studio(prompt: str) -> str:
    payload = {
        "model": "local-model",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.5,
        "max_tokens": 1200
    }

    async with httpx.AsyncClient(timeout=LM_TIMEOUT) as client:
        try:
            resp = await client.post(LM_STUDIO_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"LM Studio unreachable: {e}")
        except KeyError:
            raise HTTPException(status_code=500, detail="Invalid response from AI model")




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

#     with open(temp_path, "wb") as f:
#         f.write(await file.read())

#     try:
#         text = extract_file_text(temp_path, file.filename)
#         if not text.strip():
#             raise HTTPException(status_code=400, detail="No text found in file")

#         # Build prompts
#         mcq_prompt = build_mcq_prompt(text, mcq_count, file.filename)
#         tf_prompt = build_tf_prompt(text, tf_count, file.filename)

#         # Send two requests to LM Studio
#         mcq_result = send_to_lm_studio_async(mcq_prompt)
#         tf_result = send_to_lm_studio_async(tf_prompt)

#         return {
#             "filename": file.filename,
#             "mcq_questions": mcq_result,
#             "true_false_questions": tf_result,
#             "total_questions": mcq_count + tf_count
#         }

#     finally:
#         if os.path.exists(temp_path):
#             os.remove(temp_path)





# @app.post("/ask_ai_model")
# async def ask_ai_model(file: UploadFile = File(...), mcq_count: int = 20, tf_count: int = 20):
#     temp_path = f"temp_{file.filename}" # Safer temp naming

#     # Save uploaded file
#     content = await file.read()
#     with open(temp_path, "wb") as f:
#         f.write(content)

#     try:
#         text = extract_file_text(temp_path, file.filename)
#         if not text.strip():
#             raise HTTPException(status_code=400, detail="No text found in file")

#         tasks = []
#         # Keep track of which order tasks are added
#         task_types = []

#         if mcq_count > 0:
#             mcq_prompt = build_mcq_prompt(text, mcq_count, file.filename)
#             tasks.append(send_to_lm_studio_async(mcq_prompt))
#             task_types.append("mcq")
        
#         if tf_count > 0:
#             tf_prompt = build_tf_prompt(text, tf_count, file.filename)
#             tasks.append(send_to_lm_studio_async(tf_prompt))
#             task_types.append("tf")

#         # Run concurrently
#         responses = await asyncio.gather(*tasks)
        
#         # Create a mapping to easily retrieve results
#         results_map = dict(zip(task_types, responses))

#         # Build response safely
#         mcq_result = results_map.get("mcq", {
#             "file_name": file.filename, 
#             "question_type": "Multiple Choice", 
#             "questions": []
#         })
        
#         tf_result = results_map.get("tf", {
#             "file_name": file.filename, 
#             "question_type": "True or False", 
#             "questions": []
#         })

#         return {
#             "filename": file.filename,
#             "mcq_questions": mcq_result,
#             "true_false_questions": tf_result,
#             "total_questions": mcq_count + tf_count
#         }

#     except Exception as e:
#         # This helps you see the actual error in your console/logs
#         print(f"Error occurred: {e}")
#         raise HTTPException(status_code=500, detail=str(e))
        
#     finally:
#         if os.path.exists(temp_path):
#             os.remove(temp_path)



# @app.post("/ask_ai_model")
# async def ask_ai_model(
#     file: UploadFile = File(...),
#     mcq_count: int = 20,
#     tf_count: int = 20
# ):
#     temp_path = f"temp_{file.filename}"

#     try:
#         # Save uploaded file
#         with open(temp_path, "wb") as f:
#             f.write(await file.read())

#         # Extract text
#         text = extract_file_text(temp_path, file.filename)
#         if not text.strip():
#             raise HTTPException(status_code=400, detail="No text found in file")

#         tasks = []
#         task_keys = []

#         if mcq_count > 0:
#             tasks.append(send_to_lm_studio(build_mcq_prompt(text, mcq_count, file.filename)))
#             task_keys.append("mcq")

#         if tf_count > 0:
#             tasks.append(send_to_lm_studio(build_tf_prompt(text, tf_count, file.filename)))
#             task_keys.append("tf")

#         # Run AI calls concurrently
#         responses = await asyncio.gather(*tasks)

#         results = dict(zip(task_keys, responses))
#         print(results)
#         return {
#             "filename": file.filename,
#             "mcq_questions": results.get("mcq", {}),
#             "true_false_questions": results.get("tf", {}),
#             "total_questions": mcq_count + tf_count
#         }

#     except HTTPException:
#         raise
#     except Exception as e:
#         print(f"SERVER ERROR: {e}")
#         raise HTTPException(status_code=500, detail="Internal server error")

#     finally:
#         if os.path.exists(temp_path):
#             os.remove(temp_path)
























import os
import json
import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException

app = FastAPI()

@app.post("/ask_ai_model")
async def ask_ai_model(
    file: UploadFile = File(...),
    mcq_count: int = 20,
    tf_count: int = 20
):
    temp_path = f"temp_{file.filename}"

    try:
        # Save uploaded file
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        # Extract text from file
        text = extract_file_text(temp_path, file.filename)
        if not text.strip():
            raise HTTPException(status_code=400, detail="No text found in file")

        tasks = []
        task_keys = []

        if mcq_count > 0:
            tasks.append(send_to_lm_studio(build_mcq_prompt(text, mcq_count, file.filename)))
            task_keys.append("mcq")

        if tf_count > 0:
            tasks.append(send_to_lm_studio(build_tf_prompt(text, tf_count, file.filename)))
            task_keys.append("tf")

        # Run AI calls concurrently
        responses = await asyncio.gather(*tasks)

        # Parse and merge into one JSON
        final_json = {
            "filename": file.filename,
            "questions": {
                "multiple_choice": [],
                "true_false": []
            },
            "summary": {
                "mcq_count": mcq_count,
                "tf_count": tf_count,
                "total_questions": mcq_count + tf_count
            }
        }

        for key, response in zip(task_keys, responses):
            try:
                parsed = json.loads(response)
            except json.JSONDecodeError:
                raise HTTPException(status_code=500, detail=f"AI returned invalid JSON for {key}")

            if key == "mcq":
                final_json["questions"]["multiple_choice"] = parsed.get("questions", [])
            elif key == "tf":
                final_json["questions"]["true_false"] = parsed.get("questions", [])

        print(final_json)
        return final_json

    except HTTPException:
        raise
    except Exception as e:
        print(f"SERVER ERROR: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)










# Run with:
# uvicorn APIFile:app --port 8001
