Flourish - README

Overview:
Flourish is a full-stack web application built with Django (backend) and React (frontend). It supports secure user authentication, AI-powered chatbot features via Dialogflow and OpenAI GPT-3.5, symptom tracking, menstrual cycle tracking, and an educational health content hub via APIs like PubMed and Wikipedia.

Features:
The application includes the following key features:
• User Authentication: Register, login, and social authentication options
• Profile Management: Users can update their profile information and preferences
• Symptom Tracker: Log and monitor health symptoms over time
• Menstrual Cycle Tracker: Track periods and related symptoms
• Chatbot Assistant: AI-powered chatbot using Dialogflow and OpenAI GPT-3.5 for health-related questions
• Health Information Hub: Articles and resources from PubMed, Wikipedia, and HealthFinder
• Article Filtering and Search: Retrieve relevant health content tailored to user needs using intelligent keyword-based filtering

====================================
📦 Prerequisites:
- Python 3.8+
- Node.js v14+
- PostgreSQL 12+
- npm (Node Package Manager)
- Git (optional)

====================================
📁 Project Structure:
flourish/
├── backend/
│   ├── config/
│   ├── media/
│   ├── users/
│   ├── backend/ (Django settings)
│   └── manage.py
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── flourish_dump.sql (PostgreSQL dump)
├── requirements.txt (Python dependencies)

====================================
🔧 Backend Setup:

1. Create a virtual environment:
   cd backend
   python -m venv venv

2. Activate the virtual environment:
   - Windows: venv\Scripts\activate
   - macOS/Linux: source venv/bin/activate

3. Create `.env` file in `backend/` with:
   DB_NAME=flourish
   DB_USER=your_db_username
   DB_PASSWORD=your_db_password
   DB_HOST=localhost
   DB_PORT=5432
   OPENAI_API_KEY=your_openai_key

4. Install backend dependencies:
   pip install -r requirements.txt

5. Create the database and restore data:
   createdb flourish
   psql -U your_db_username -d flourish -f flourish_dump.sql

6. Run migrations (if needed):
   python manage.py makemigrations
   python manage.py migrate

7. Create superuser (optional):
   python manage.py createsuperuser

====================================

Article Fetching Setup (Important)

Before using the Educational Hub, you must populate it with articles by running the following command:

   cd backend
   python manage.py fetch_articles

This will fetch and store articles from HealthFinder, PubMed, and Wikipedia.

====================================

Frontend Setup:

1. Create `.env` file in `frontend/`:
   REACT_APP_API_URL=http://localhost:8000/api

2. Install Node modules:
   cd frontend
   npm install

3. (Optional) Build for production:
   npm run build

====================================

Run the Project:

Start backend server:
   cd backend
   source venv/bin/activate
   python manage.py runserver

Start frontend server:
   cd frontend
   npm start

App accessible at: http://localhost:3000

====================================

Chatbot Integration Setup (Dialogflow):

1. Create a project in Google Cloud Console.
2. Enable Dialogflow API.
3. Create service account with "Dialogflow API Client" role.
4. Download the JSON key and place it in: `backend/config/dialogflow-key.json`
5. Ensure `DIALOGFLOW_PROJECT_ID` is set in `settings.py`.

====================================

External API Keys:
- OpenAI: https://platform.openai.com/
- PubMed: https://www.ncbi.nlm.nih.gov/
- HealthFinder: https://health.gov/myhealthfinder/

Add any keys to your `.env` as needed.

====================================

Authentication:

- Uses JWT tokens.
- Login: /api/auth/token/
- Register: /api/users/register/
- Refresh: /api/auth/token/refresh/
- Authorization header format:
  Authorization: Bearer <your_token>

====================================

Troubleshooting:

- DB not connecting? Check credentials and PostgreSQL is running.
- CORS error? Adjust `CORS_ALLOWED_ORIGINS` in backend/settings.py.
- Chatbot not responding? Ensure dialogflow-key.json is valid.
- API not working? Check REACT_APP_API_URL and backend server status.

====================================

Deployment Tips:

- Set `DEBUG = False` and configure `ALLOWED_HOSTS`.
- Use `gunicorn` or `uwsgi` for Django in production.
- Build frontend: `npm run build` and serve via Nginx or Apache.

====================================

🙌 Contributing:

1. Fork this repo: 
2. Create a feature branch
3. Commit your changes
4. Push and create a pull request
