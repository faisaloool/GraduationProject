from fastapi import FastAPI, UploadFile, File, HTTPException, Query
import os
from Extractors.content_extractor_all import extract_file_text
from content_creation_json import generate_mcq_quiz_from_text, generate_tf_quiz_from_text


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

# Run with:
# uvicorn APIFile:app --port 8001
