# 📸 smartGallery Backend API

This is the backend API for **smartGallery**.


## 📚 API Endpoints

### 🔐 Authentication

| Method | Endpoint     | Description           |
|--------|--------------|-----------------------|
| POST   | `/signup`    | Create a new user     |
| POST   | `/login`     | Log in a user         |
| POST   | `/logout`    | Log out (clear token) |

### 👤 User

| Method | Endpoint       | Description             |
|--------|----------------|-------------------------|
| GET    | `/user/me`     | Get current user data   |
| PATCH  | `/user/update` | Update user profile     |
| DELETE | `/user/delete` | Delete user profile     |

### 🖼️ Gallery

| Method | Endpoint                 | Description                     |
|--------|--------------------------|---------------------------------|
| POST   | `/gallery/upload`        | Upload an image                 |
| GET    | `/gallery/my-images`     | Get all uploaded images of user |
| DELETE | `/gallery/:id`           | Delete an image by ID           |
| POST   | `/gallery/search`        | Search images using caption     |

---
