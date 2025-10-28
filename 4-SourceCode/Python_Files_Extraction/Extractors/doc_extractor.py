import os
import win32com.client
from .docx_extractor import extract_text_from_docx

def extract_text_from_doc(file_path):
    word = win32com.client.Dispatch("Word.Application")
    #word.Visible = False
    doc = word.Documents.Open(file_path)

    temp_docx = file_path + "_temp.docx"
    doc.SaveAs(temp_docx, FileFormat=16)  # save as docx
    doc.Close()
    word.Quit()

    # Use your existing function
    text = extract_text_from_docx(temp_docx)

    # Delete temporary file
    os.remove(temp_docx)
    return text