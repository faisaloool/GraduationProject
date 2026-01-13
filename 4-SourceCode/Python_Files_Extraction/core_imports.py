#import whisper              # pip install openai-whisper
import torch                # pip install torch
# Whisper requires ffmpeg to be installed in the system PATH:
# Windows: https://ffmpeg.org/download.html

from Extractors.docx_extractor import extract_text_from_docx
from Extractors.pptx_extractor import extract_text_from_pptx
from Extractors.audio_extractor import extract_text_from_audio
from Extractors.doc_extractor import extract_text_from_doc
from Extractors.pdf_extractor import extract_text_from_pdf
from Extractors.ppt_extractor import extract_text_from_ppt

import os
import win32com.client  # if this isn't working, run: pip install pywin32

from docx import Document  # if this isn't working, run: pip install python-docx

import fitz  # if this isn't working, run: pip install PyMuPDF

import comtypes.client  # if this isn't working, run: pip install comtypes
from pptx import Presentation  # if this isn't working, run: pip install python-pptx

from fastapi import FastAPI, UploadFile, File, HTTPException  # if this isn't working, run: pip install fastapi
from Extractors.content_extractor_all import extract_file_text
import content_creation_json

import json
import re
from openai import OpenAI  # if this isn't working, run: pip install openai
