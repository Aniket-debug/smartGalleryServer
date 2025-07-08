from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List
from PIL import Image
import torch
import clip
import io

app = FastAPI()

# Load CLIP model at startup
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# Input model for caption embedding
class CaptionRequest(BaseModel):
    caption: str

# Output model for response
class EmbeddingResponse(BaseModel):
    embedding: List[float]

@app.get("/")
def read_root():
    return {"msg":"This is Embedding Service"}

# Endpoint: Get image embedding
@app.post("/embed/image", response_model=EmbeddingResponse)
async def embed_image(file: UploadFile = File(...)):
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image_tensor = preprocess(image).unsqueeze(0).to(device)

    with torch.no_grad():
        image_embedding = model.encode_image(image_tensor)
        image_embedding /= image_embedding.norm(dim=-1, keepdim=True)

    embedding_list = image_embedding[0].cpu().tolist()
    embedding_size = len(embedding_list)

    return {
        "size": embedding_size,
        "embedding": embedding_list
    }

# Endpoint: Get caption embedding
@app.post("/embed/caption", response_model=EmbeddingResponse)
async def embed_caption(req: CaptionRequest):
    text = clip.tokenize([req.caption]).to(device)

    with torch.no_grad():
        text_embedding = model.encode_text(text)
        text_embedding /= text_embedding.norm(dim=-1, keepdim=True)

    embedding_list = text_embedding[0].cpu().tolist()
    embedding_size = len(embedding_list)

    return {
        "size": embedding_size,
        "embedding": embedding_list
    }


# uvicorn app:app --reload --port 8000
