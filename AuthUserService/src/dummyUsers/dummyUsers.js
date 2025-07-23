const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// CONFIGURATION
const BASE_URL = 'http://localhost:8001'; // Update this if your server runs elsewhere
const TOTAL_USERS = 10;
const IMAGES_PER_USER = 1000;

const COCO_DIR = './coco-2017/data';  // COCO images
const FLICKR_DIR = './flickr_5000';   // Flickr images

// Create dummy users
const USERS = Array.from({ length: TOTAL_USERS }, (_, i) => ({
  fullname: `sampleuser${i + 1}`,
  email: `sample${i + 1}@example.com`,
  password: 'password123',
}));

// Register and login a user, return JWT token
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

// Get shuffled list of images (Flickr + COCO)
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

// Upload a single image for a user
async function uploadImage(token, imagePath, user) {
  const form = new FormData();
  form.append('images', fs.createReadStream(imagePath));

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

// Main script
(async () => {
  const totalImagesNeeded = USERS.length * IMAGES_PER_USER;
  const allShuffledImages = getShuffledImages(totalImagesNeeded);

  for (let i = 0; i < USERS.length; i++) {
    const user = USERS[i];
    console.log(`\n👤 Creating user: ${user.fullname}`);
    const token = await registerAndLoginUser(user);

    if (!token) {
      console.warn(`⚠️ Skipping uploads for ${user.email} due to missing token`);
      continue;
    }

    const start = i * IMAGES_PER_USER;
    const end = (i + 1) * IMAGES_PER_USER;
    const userImages = allShuffledImages.slice(start, end);

    console.log(`📦 Uploading ${userImages.length} images for ${user.email}...`);
    for (const imagePath of userImages) {
      await uploadImage(token, imagePath, user);
      await new Promise(r => setTimeout(r, 50));
    }

    console.log(`✅ Completed uploads for ${user.email}`);
  }

  console.log('\n🎉 All users created and images uploaded.');
})();
