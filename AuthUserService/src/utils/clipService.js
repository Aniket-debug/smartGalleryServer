const axios = require('axios');
const FormData = require('form-data');

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL;

const getImageEmbedding = async (buffer) => {
  const form = new FormData();
  form.append('file', buffer, {
    filename: 'image.jpg',
    contentType: 'image/jpeg',
  });

  const response = await axios.post(`${EMBEDDING_SERVICE_URL}/embed/image`, form, {
    headers: form.getHeaders(),
  });

  return response.data.embedding;
};

async function getCaptionEmbedding(caption) {
  const response = await axios.post(`${EMBEDDING_SERVICE_URL}/embed/caption`, { caption });
  return response.data.embedding;
}

function dotSim(a, b) {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

module.exports = {
  getImageEmbedding,
  getCaptionEmbedding,
  dotSim
};
