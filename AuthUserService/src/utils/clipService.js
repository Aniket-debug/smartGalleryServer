const axios = require('axios');
const FormData = require('form-data');

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL;

async function getImageEmbedding(imageUrl) {

  const imageResponse = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
  });

  const form = new FormData();
  form.append('file', imageResponse.data, {
    filename: 'image.jpg',
    contentType: 'image/jpeg',
  });

  const response = await axios.post(`${EMBEDDING_SERVICE_URL}/embed/image`, form, {
    headers: form.getHeaders(),
  });

  return response.data.embedding;
}

async function getCaptionEmbedding(caption) {
  const response = await axios.post(`${EMBEDDING_SERVICE_URL}/embed/caption`, { caption });
  return response.data.embedding;
}

function cosineSim(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}

module.exports = {
  getImageEmbedding,
  getCaptionEmbedding,
  cosineSim
};
