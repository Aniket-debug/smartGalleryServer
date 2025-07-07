# 🧠 Smart Gallery - CLIP-Based Image Search

Smart Gallery is a microservices-based web application that lets users upload and search images using natural language captions. It uses OpenAI’s **CLIP** model to generate embeddings for both images and text, enabling semantic search.

---

## 📦 Project Structure

This project has two independent FastAPI services:

### 1. `embedding-service`
- Handles all embedding generation using the **CLIP** model.
- Accepts both image files and text captions.
- Returns normalized embeddings as vectors.
- Calculates **cosine similarity** between caption embeddings and stored image embeddings.
- Used to find and return the **top-K most similar images** for a given caption.

### 2. `auth-user-service`
- Manages user signup, login, and image uploads.
- Stores user images and their CLIP embeddings in MongoDB.
- Calls the `embedding-service` internally to generate embeddings.

---

## 🔁 How Services Communicate

- `auth-service` sends HTTP requests to `embedding-service` to generate embeddings.
- Example flow:
  1. User uploads image with caption to `auth-service`.
  2. `auth-service` forwards the image/caption to `embedding-service`.
  3. `embedding-service` returns an embedding vector.
  4. `auth-service` stores the image + embedding.

---

## 🔍 Example API Calls

### `embedding-service`
```http
POST /embed/caption
{
  "caption": "A dog playing in the park"
}


### `Response`

{
  "embedding": [0.12, -0.05, ..., 0.22],
  "size": 512
}
