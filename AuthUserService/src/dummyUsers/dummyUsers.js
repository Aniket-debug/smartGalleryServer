const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { takeCoverage } = require('v8');

// CONFIGURATION
const BASE_URL = 'http://localhost:8001';
const TOTAL_USERS = 5;
const IMAGES_PER_USER = 200;

const COCO_DIR = './coco_500/data';
const FLICKR_DIR = './flickr_500';

const USERS = Array.from({ length: TOTAL_USERS }, (_, i) => ({
  fullname: `dummyuser${i + 1}`,
  email: `dummy${i + 1}@example.com`,
  password: 'password123',
}));

async function registerAndLoginUser(user) {
  try {
    await axios.post(`${BASE_URL}/auth/signup`, user);
    console.log(`🆕 Registered user: ${user.email}`);
  } catch (err) {
    if (err.response?.status === 409) {
      console.log(`ℹ️ User already exists: ${user.email}`);
    } else {
      console.error(`❌ Registration failed for ${user.email}:`, err.message);
    }
  }

  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: user.email,
      password: user.password,
    }, {
      withCredentials: true,
    });

    const token = res.headers['set-cookie']?.[0]?.split(';')[0]?.split('=')[1];
    if (!token) {
      console.warn(`⚠️ Token not found in cookies for ${user.email}`);
      return null;
    }

    console.log(`🔐 Logged in: ${user.email}`);
    return token;
  } catch (err) {
    console.error(`❌ Login failed for ${user.email}:`, err.response?.data || err.message);
    return null;
  }
}

function getShuffledImages(limit) {
  const cocoImages = fs.readdirSync(COCO_DIR).map(f => path.join(COCO_DIR, f));
  const flickrImages = fs.readdirSync(FLICKR_DIR).map(f => path.join(FLICKR_DIR, f));
  const allImages = [...cocoImages, ...flickrImages].filter(img =>
    /\.(jpe?g|png)$/i.test(img)
  );

  return allImages
    .sort(() => 0.5 - Math.random())
    .slice(0, limit);
}


async function uploadImage(token, imagePath) {
  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath));

  try {
    await axios.post(`${BASE_URL}/gallery/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    });
    console.log(`✅ Uploaded: ${path.basename(imagePath)}`);
  } catch (err) {
    console.error(`❌ Upload failed: ${path.basename(imagePath)}`, err.response?.data || err.message);
  }
}

(async () => {
  const totalImagesNeeded = USERS.length * IMAGES_PER_USER;
  const allShuffledImages = getShuffledImages(totalImagesNeeded);

  for (let i = 0; i < USERS.length; i++) {
    const user = USERS[4];
    console.log(`\n👤 Creating user: ${user.fullname}`);
    const token = await registerAndLoginUser(user);

    console.log(token);

    if (!token) continue;

    const start = i * IMAGES_PER_USER + 47;
    const end = (i + 1) * IMAGES_PER_USER;
    const userImages = allShuffledImages.slice(start, end);

    for (const imagePath of userImages) {
      await uploadImage(token, imagePath);
    }
  }

  console.log('\n🎉 All users created and images uploaded.');
})();