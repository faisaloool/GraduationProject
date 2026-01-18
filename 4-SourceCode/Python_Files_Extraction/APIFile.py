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

async def send_to_lm_studio_async(prompt: str) -> str:
    """Send a prompt to LM Studio asynchronously and return the AI response."""
    url = "http://26.152.59.249:1234/v1/chat/completions"
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
        return data["choices"][0]["message"]["content"]






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
#         mcq_result = send_to_lm_studio(mcq_prompt)
#         tf_result = send_to_lm_studio(tf_prompt)

#         return {
#             "filename": file.filename,
#             "mcq_questions": mcq_result,
#             "true_false_questions": tf_result,
#             "total_questions": mcq_count + tf_count
#         }

#     finally:
#         if os.path.exists(temp_path):
#             os.remove(temp_path)



<<<<<<< HEAD


# @app.post("/ask_ai_model")
# async def ask_ai_model(file: UploadFile = File(...), mcq_count: int = 20, tf_count: int = 20):
#     temp_path = f"temp_{file.filename}" # Safer temp naming

#     # Save uploaded file
#     content = await file.read()
#     with open(temp_path, "wb") as f:
#         f.write(content)
=======
@app.post("/ask_ai_model")
async def ask_ai_model(file: UploadFile = File(...), mcq_count: int = 20, tf_count: int = 20):
    temp_path = f"temp{os.path.splitext(file.filename)[1]}"

    # Save uploaded file
    with open(temp_path, "wb") as f:
        f.write(await file.read())
>>>>>>> 4f72654b4e1683747bc5814bc19e3cce63cde07c

#     try:
#         text = extract_file_text(temp_path, file.filename)
#         if not text.strip():
#             raise HTTPException(status_code=400, detail="No text found in file")

<<<<<<< HEAD
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
=======
        mcq_prompt = build_mcq_prompt(text, mcq_count, file.filename)
        tf_prompt = build_tf_prompt(text, tf_count, file.filename)

        mcq_task = asyncio.create_task(send_to_lm_studio_async(mcq_prompt))
        tf_task = asyncio.create_task(send_to_lm_studio_async(tf_prompt))
        mcq_result, tf_result = await asyncio.gather(mcq_task, tf_task)
>>>>>>> 4f72654b4e1683747bc5814bc19e3cce63cde07c

#         return {
#             "filename": file.filename,
#             "mcq_questions": mcq_result,
#             "true_false_questions": tf_result,
#             "total_questions": mcq_count + tf_count
#         }

<<<<<<< HEAD
#     except Exception as e:
#         # This helps you see the actual error in your console/logs
#         print(f"Error occurred: {e}")
#         raise HTTPException(status_code=500, detail=str(e))
        
#     finally:
#         if os.path.exists(temp_path):
#             os.remove(temp_path)



#the function that returns static 10 questions: 

@app.post("/ask_ai_model")
async def ask_ai_model(file: UploadFile = File(...), mcq_count: int = 20, tf_count: int = 20):
    return {
        "filename": "Ch1_Introduction.pptx",
        "mcq_questions": {
            "file_name": "Ch1_Introduction.pptx",
            "question_type": "Multiple Choice",
            "questions": [
                {
                    "question": "What are the identified catalysts that enabled products like Samsung Galaxy A2?",
                    "options": [
                        "A) Low-cost computers",
                        "B) High-speed communication networks",
                        "C) Both A and B",
                        "D) None of the above"
                    ],
                    "answer": "C) Both A and B"
                },
                {
                    "question": "Which technology has raised privacy concerns due to location tracking and camera use?",
                    "options": [
                        "A) Email",
                        "B) Cell phones",
                        "C) Social networking sites",
                        "D) Voice over IP services"
                    ],
                    "answer": "B) Cell phones"
                },
                {
                    "question": "According to the text, what is a primary benefit of e-commerce platforms like Amazon.com?",
                    "options": [
                        "A) Increase in physical retail stores",
                        "B) Lower overhead and easier price comparison for consumers",
                        "C) Reducing online privacy concerns",
                        "D) Eliminating need for payment systems"
                    ],
                    "answer": "B) Lower overhead and easier price comparison for consumers"
                },
                {
                    "question": "Which ethical theory emphasizes duties and rules independent of consequences?",
                    "options": [
                        "A) Utilitarianism",
                        "B) Deontological theories",
                        "C) Positive rights",
                        "D) Negative rights"
                    ],
                    "answer": "B) Deontological theories"
                },
                {
                    "question": "In the context of information age, which statement best reflects the dynamic between people and technology?",
                    "options": [
                        "A) Technology is static and unaffected by society",
                        "B) People adopt technology but it does not influence them",
                        "C) Using technology can change people physically and psychologically",
                        "D) Technological changes are irrelevant to social values"
                    ],
                    "answer": "C) Using technology can change people physically and psychologically"
                }
            ]
        },
        "true_false_questions": {
            "file_name": "Ch1_Introduction.pptx",
            "question_type": "True or False",
            "questions": [
                {
                    "question": "The Information Age was primarily driven by high-cost computers and slow communication networks.",
                    "answer": "False"
                },
                {
                    "question": "Smartphones such as the Samsung Galaxy A2 can function as a camera, video recorder, and digital compass.",
                    "answer": "True"
                },
                {
                    "question": "Email messages in the 1980s were typically long and included multimedia attachments.",
                    "answer": "False"
                },
                {
                    "question": "The World Wide Web was first established by physicists in Europe in 1990 to share research with colleagues worldwide.",
                    "answer": "True"
                },
                {
                    "question": "Artificial intelligence is a branch of computer science that focuses on making computers perform tasks normally requiring human intelligence.",
                    "answer": "True"
                }
            ]
        },
        "total_questions": 10
    }




#the version that returns only one static mcq question.
 

# @app.post("/ask_ai_model")
# async def ask_ai_model(file: UploadFile = File(...), mcq_count: int = 20, tf_count: int = 20):
#     return {
#     "filename": "Ch1_Introduction.pptx",
#     "mcq_questions": {
#         "file_name": "Ch1_Introduction.pptx",
#         "question_type": "Multiple Choice",
#         "questions": [
#             {
#                 "question": "Which ethical theory focuses on the outcomes or consequences of actions to determine what is right or wrong?",
#                 "options": [
#                     "A) Deontological theories",
#                     "B) Negative rights",
#                     "C) Utilitarianism",
#                     "D) Professional codes of ethics"
#                 ],
#                 "answer": "C) Utilitarianism"
#             }
#         ]
#     },
#     "true_false_questions": {
#         "file_name": "Ch1_Introduction.pptx",
#         "question_type": "True or False",
#         "questions": []
#     },
#     "total_questions": 1
# }


=======
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)



>>>>>>> 4f72654b4e1683747bc5814bc19e3cce63cde07c




# Run with:
# uvicorn APIFile:app --port 8001
