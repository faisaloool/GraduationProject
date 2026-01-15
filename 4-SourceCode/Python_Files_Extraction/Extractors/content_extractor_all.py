import os
from Extractors.docx_extractor import extract_text_from_docx
from Extractors.pptx_extractor import extract_text_from_pptx
# from Extractors.audio_extractor import extract_text_from_audio
from Extractors.doc_extractor import extract_text_from_doc
from Extractors.pdf_extractor import extract_text_from_pdf
from Extractors.ppt_extractor import extract_text_from_ppt

def extract_file_text(file_path: str, filename: str) -> str:
    file_ext = os.path.splitext(filename)[1].lower()

    if file_ext == ".pdf":
        text = extract_text_from_pdf(file_path)
    elif file_ext == ".docx":
        text = extract_text_from_docx(file_path)
    elif file_ext == ".doc":
        text = extract_text_from_doc(file_path)
    elif file_ext == ".pptx":
        text = extract_text_from_pptx(file_path)
    elif file_ext == ".ppt":
        text = extract_text_from_ppt(file_path)
    # elif file_ext in [".mp3", ".wav", ".m4a", ".mp4"]:
    #     text = extract_text_from_audio(file_path)
    else:
        raise ValueError("Unsupported file type")

    return text
