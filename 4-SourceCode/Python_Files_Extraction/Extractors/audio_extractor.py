# import whisper
# import torch

# def extract_text_from_audio(audio_path, model_size="medium"):
#     """
#     Transcribes an audio/video file using OpenAI Whisper.
#     Auto-selects GPU if available, CPU otherwise.
#     Optimized for Arabic + English mixed speech.
#     """
#     # Select device
#     device = "cuda" if torch.cuda.is_available() else "cpu"

#     # Load model on the chosen device
#     model = whisper.load_model(model_size, device=device)

#     # Transcribe with mixed-language support
#     result = model.transcribe(
#         audio_path,
#         language=None,         # auto-detect Arabic + English
#         fp16=(device == "cuda"),  # use FP16 only if GPU supports it
#         verbose=False,
#         temperature=0.0,        # more deterministic output
#         best_of=5,              # improves accuracy
#         beam_size=5             # better language consistency
#     )

#     return result.get("text", "").strip()




