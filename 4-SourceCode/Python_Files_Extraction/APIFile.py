from fastapi import FastAPI, UploadFile, File, HTTPException
import os
from Extractors.content_extractor_all import extract_file_text
import content_creation_json

app = FastAPI()

@app.post("/generate_quiz")
async def generate_quiz(file: UploadFile = File(...)):
    file_ext = os.path.splitext(file.filename)[1].lower()
    temp_path = f"temp{file_ext}"

    # Save uploaded file temporarily
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    try:
        # Extract text from the uploaded file
        try:
            extracted_text = extract_file_text(temp_path, file.filename)
            if len(extracted_text) > 5000:
                extracted_text = extracted_text[:5000]
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Call DeepSeek to generate quiz questions in JSON
        try:
            quiz_json = content_creation_json.call_deepseek_api_for_questions(extracted_text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DeepSeek APIIII error: {e}")

        return {"filename": file.filename, "quiz": quiz_json}

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

# To run this API, use the terminal command:
# uvicorn APIFile:app --reload --port 8001
# uvicorn APIFile:app --port 8001