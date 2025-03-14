# mini-PLM

A lightweight, web-based Product Lifecycle Management (PLM) tool, built with **Django** (backend) and **React** (frontend). This project is ideal for small teams who need basic file upload, simple metadata handling, and a minimal user interface to manage files.

![mini-PLM Screenshot](docs/mini-plm-banner.png)

> **Note:** This project is still in MVP stage. It demonstrates file uploads, basic metadata, and a minimal UI, rather than a full enterprise PLM solution.

---

## Table of Contents

1. [Features](#features)  
2. [Tech Stack](#tech-stack)  
3. [Project Structure](#project-structure)  
4. [Getting Started](#getting-started)  
5. [Usage](#usage)  
6. [Troubleshooting](#troubleshooting)  
7. [Roadmap](#roadmap)  
8. [License](#license)  

---

## Features

- **File Upload & Storage:**  
  Users can upload files, which are saved to a designated folder on the server (`mpp_files/` by default).

- **Basic Metadata & Ownership:**  
  Each file is linked to a user (owner), with optional JSON metadata.

- **Simple RESTful API:**  
  Built with Django REST Framework for listing, uploading, and retrieving files.

- **Lightweight UI (React):**  
  - **Split Layout (30%/70%)** with independent scrolling columns.  
  - **PDF Preview**: Displays `.pdf` files inline using an `<iframe>` in the right column.  
  - **3D STL Preview**: Uses [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) to show `.stl` files with shadows and a ground plane.  
  - **Code Syntax Highlighting**: For `.js`, `.py`, `.cpp`, `.java`, etc., using [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter).  
  - **Markdown Rendering**: Renders `.md` or `.markdown` files via [react-markdown](https://github.com/remarkjs/react-markdown).  
  - **Images & Other Files**: `.png`, `.jpg`, `.gif` displayed as images; fallback message for unknown file types.

---

## Tech Stack

- **Backend:**  
  - [Django](https://www.djangoproject.com/)  
  - [Django REST Framework](https://www.django-rest-framework.org/)  
  - [django-cors-headers](https://pypi.org/project/django-cors-headers/)  

- **Frontend:**  
  - [React](https://reactjs.org/)  
  - [Axios](https://axios-http.com/)  
  - [React Bootstrap](https://react-bootstrap.github.io/) for styling/layout  
  - [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) + [@react-three/drei](https://github.com/pmndrs/drei) for 3D previews  
  - [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) for code  
  - [react-markdown](https://github.com/remarkjs/react-markdown) for markdown  

- **Database:**  
  - SQLite (default for development)

- **Other:**  
  - Python 3.9+  
  - Node.js 16+  
  - Virtual environment for Python (recommended)

---

## Project Structure

```plaintext
mini-plm/
├── manage.py                 # Django management script
├── mpp_backend/             # Django project settings & URLs
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── files/                   # Django app for file uploads & metadata
│   ├── models.py
│   ├── serializers.py
│   └── views.py
├── mpp_frontend/            # React app folder
│   ├── src/
│   │   └── App.js           # Main React code with previews
│   ├── package.json
│   └── ...
├── venv/                    # Python virtual environment (ignored by Git)
├── mpp_files/               # Uploaded files stored here (ignored by Git)
└── README.md                # This file

```


---

## Getting Started

### 1. Clone the Repository

```bash
git clone http://your-gitea-domain/username/mini-plm.git
cd mini-plm
```

### 2. Set Up the Backend (Django)

1. **Create & Activate a Virtual Environment (Windows example):**
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```
2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   (If you haven’t created a `requirements.txt`, install manually:  
   `pip install django djangorestframework django-cors-headers` etc.)

3. **Run Migrations & Create a Superuser (optional):**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   ```

4. **Start the Django Server:**
   ```bash
   python manage.py runserver
   ```
   The API should now be accessible at [http://127.0.0.1:8000/api/files/](http://127.0.0.1:8000/api/files/).

### 3. Set Up the Frontend (React)

1. **Navigate to the React Folder:**
   ```bash
   cd mpp_frontend
   ```
2. **Install Frontend Dependencies:**
   ```bash
   npm install
   ```
3. **Start the React Development Server:**
   ```bash
   npm start
   ```
   The frontend will be served at [http://localhost:3000](http://localhost:3000).

---

## Usage

1. **Visit the React App** at [http://localhost:3000](http://localhost:3000).  
2. **Upload Files** via the simple form (images, PDFs, STL, code, markdown, etc.).  
3. **Check the Django API** at [http://127.0.0.1:8000/api/files/](http://127.0.0.1:8000/api/files/) to see a JSON list of uploaded files.  
4. **Click a file** in the left column to see its preview (PDF, STL, code, markdown, or image) in the right column.

---

## Troubleshooting

1. **CORS Errors (React → Django)**  
   - Make sure `'corsheaders'` is in `INSTALLED_APPS` and `'corsheaders.middleware.CorsMiddleware'` is the first item in `MIDDLEWARE`.  
   - In `settings.py`, set `CORS_ALLOW_ALL_ORIGINS = True` (for development).

2. **400 Bad Request on Upload**  
   - Verify that your React `FormData` key matches the serializer’s file field name (e.g., `'uploaded_file'`).  
   - Ensure you have at least one user in the database if your `owner` field is not nullable.

3. **IntegrityError: NOT NULL constraint failed**  
   - Add `null=True, blank=True, default=dict` to the `metadata` field in your `File` model.  
   - Run `python manage.py makemigrations && python manage.py migrate`.

4. **No File in Browsable API**  
   - If you only store a path (no `FileField`), the DRF browsable API won’t automatically show a “Choose File” button.  
   - Use a `uploaded_file = serializers.FileField(write_only=True)` in your serializer for easy file uploads.

5. **PDFs Not Displaying in `<iframe>`**  
   - If you see “Refused to display … X-Frame-Options: DENY,” remove or reorder `'django.middleware.clickjacking.XFrameOptionsMiddleware'` in `settings.py` for local dev.  
   - Ensure you’re iFraming the **actual PDF** (`/media/filename.pdf`), not the root site.  
   - Check DevTools → Network tab for 404 or redirect issues.

6. **STL Preview**  
   - If the STL appears too small or only partially visible, ensure you’re using absolute positioning and a proper camera. Check for geometry centering and scaling.

7. **Code/Markdown Preview**  
   - For code, ensure `react-syntax-highlighter` is installed.  
   - For markdown, ensure `react-markdown` is installed.

---

## Roadmap

- [ ] **Authentication & Permissions**: Add real login and role-based access.  
- [ ] **File Versioning**: Store multiple versions of the same file.  
- [ ] **BOM & Metrics**: Extend the model to handle BOM relationships, basic metrics, etc.  
- [ ] **Docker Deployment**: Containerize both Django and React for easy deployment on Synology NAS or any Docker host.

---

## License

[MIT License](LICENSE)  
Feel free to use or modify this project for your own needs. Contributions are welcome!
```