from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser, MenstrualData, SymptomLog
from rest_framework.decorators import api_view, permission_classes
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from .serializers import MenstrualDataSerializer
from datetime import timedelta
from django.db.models import Avg
from django.middleware.csrf import get_token
from django.http import JsonResponse
import logging
from datetime import datetime
from .serializers import SymptomLogSerializer
from datetime import timedelta
from rest_framework import generics, permissions
from .models import SymptomLog
from .serializers import SymptomLogSerializer
from django.utils.timezone import now
from rest_framework import serializers
import os
import json
from google.cloud import dialogflow_v2 as dialogflow
from django.conf import settings
from google.auth import default
from google.oauth2 import service_account
import openai

logger = logging.getLogger(__name__)

BASE_DIR = settings.BASE_DIR

# CSRF Token View (GET Request)
@ensure_csrf_cookie
@api_view(['GET'])
@permission_classes([])  # Allow unauthenticated access
def get_csrf_token(request):
    return JsonResponse({'csrfToken': get_token(request)})

class RegisterUserView(APIView):
    """
    View to handle user registration.
    """
    permission_classes = []  # Public endpoint

    def post(self, request):
        try:
            username = request.data.get('username')
            email = request.data.get('email')
            password = request.data.get('password')
            confirm_password = request.data.get('confirm_password')

            # Validate required fields
            if not all([username, email, password, confirm_password]):
                return Response({"message": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)

            # Validate username
            if CustomUser.objects.filter(username=username).exists():
                return Response({"message": "Username already taken"}, status=status.HTTP_400_BAD_REQUEST)

            # Validate email
            if CustomUser.objects.filter(email=email).exists():
                return Response({"message": "Email already taken"}, status=status.HTTP_400_BAD_REQUEST)

            # Validate passwords
            if password != confirm_password:
                return Response({"message": "Passwords do not match"}, status=status.HTTP_400_BAD_REQUEST)

            # Create the user
            user = CustomUser.objects.create_user(username=username, email=email, password=password)
            user.save()
            return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            return Response({"message": f"Error creating user: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(ensure_csrf_cookie, name='dispatch')
class LoginView(APIView):
    """
    View to handle user login.
    """
    permission_classes = []  # Public endpoint

    def post(self, request):
        try:
            username = request.data.get('username')
            password = request.data.get('password')

            if not all([username, password]):
                return Response({"message": "Both username and password are required"}, status=status.HTTP_400_BAD_REQUEST)

            # Authenticate the user
            user = authenticate(username=username, password=password)
            if user:
                refresh = RefreshToken.for_user(user)
                update_last_login(None, user)

                return Response({
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                    },
                    "message": "Login successful"
                }, status=status.HTTP_200_OK)
            else:
                return Response({"message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Error in LoginView: {str(e)}")
            return Response({"message": "An error occurred"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LogoutView(APIView):
    """
    View to handle user logout.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
        response.delete_cookie("accessToken")
        return response


from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime
from .models import MenstrualData
from .serializers import MenstrualDataSerializer
import logging

logger = logging.getLogger(__name__)

class MenstrualDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Retrieves user's logged period data.
        """
        user = request.user
        data = MenstrualData.objects.filter(user=user).order_by('start_date')
        serializer = MenstrualDataSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """
        Logs user's period data and calculates cycle length dynamically.
        """
        user = request.user
        data = request.data

        start_date = data.get("start_date")
        end_date = data.get("end_date")
        period_length = data.get("period_length")

        if not all([start_date, end_date, period_length]):
            return Response({"message": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            return Response({"message": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        if end_date < start_date:
            return Response({"message": "End date cannot be before start date."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            period_length = int(period_length)
            if period_length <= 0:
                raise ValueError
        except ValueError:
            return Response({"message": "Period length must be a positive integer."}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Get previous recorded period
        previous_period = MenstrualData.objects.filter(user=user).order_by('-start_date').first()

        # ✅ Calculate cycle length dynamically
        cycle_length = 28  # Default if no previous data
        if previous_period:
            cycle_length = (start_date - previous_period.start_date).days
            if cycle_length <= 0:  # Handle invalid cycle lengths
                cycle_length = 28

        try:
            MenstrualData.objects.create(
                user=user,
                start_date=start_date,
                end_date=end_date,
                period_length=period_length,
                cycle_length=cycle_length
            )
            return Response({
                "message": "Period data saved successfully",
                "cycle_length": cycle_length  # Send calculated cycle length to frontend
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error saving period data: {str(e)}")
            return Response({"message": "Internal Server Error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    
class PredictNextCycleView(APIView):
    """
    Predicts the user's next cycle based on past cycle lengths.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = MenstrualData.objects.filter(user=user).order_by('-start_date')

        if not data.exists():
            return Response({
                "message": "No data available for predictions",
                "next_period_start": None,
                "next_period_end": None,
                "fertile_window_start": None,
                "fertile_window_end": None,
                "suggestion": "Log your first period to start tracking predictions."
            }, status=200)

        # ✅ Dynamically calculate cycle lengths from past periods
        cycle_lengths = []
        period_lengths = []
        previous_entry = None

        for entry in data:
            if previous_entry:
                cycle_length = (previous_entry.start_date - entry.start_date).days
                cycle_lengths.append(cycle_length)
            period_lengths.append(entry.period_length)
            previous_entry = entry

        # ✅ Use average cycle length if multiple periods exist
        if cycle_lengths:
            avg_cycle_length = round(sum(cycle_lengths) / len(cycle_lengths))
        else:
            avg_cycle_length = 28  # Default if only one record exists

        avg_period_length = round(sum(period_lengths) / len(period_lengths))

        # ✅ Predict from last cycle's **end date**
        last_cycle = data.first()
        next_start_date = last_cycle.end_date + timedelta(days=avg_cycle_length)
        next_end_date = next_start_date + timedelta(days=avg_period_length)
        fertile_window_start = next_start_date - timedelta(days=14)
        fertile_window_end = fertile_window_start + timedelta(days=5)

        return Response({
            "next_period_start": next_start_date,
            "next_period_end": next_end_date,
            "fertile_window_start": fertile_window_start,
            "fertile_window_end": fertile_window_end,
        }, status=200)

from django.utils.timezone import now  # Ensure correct import
import logging

logger = logging.getLogger(__name__)

class SymptomLogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Retrieve user's logged symptoms"""
        user = request.user
        logs = SymptomLog.objects.filter(user=user).order_by('-date')
        serializer = SymptomLogSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """Log symptoms for a specific date"""
        user = request.user
        data = request.data

        # Debugging: Log the received request data
        print("🔍 Received Symptom Log Request:", data)

        # Extract and validate data
        date = data.get("date")
        symptoms = data.get("symptoms", [])
        if not date or not isinstance(symptoms, list) or len(symptoms) == 0:
            print("❌ Invalid Data: Missing Date or Symptoms not a List")
            return Response({"message": "Date and symptoms are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Parse the date
            try:
                date = datetime.strptime(date, "%Y-%m-%d").date()
            except ValueError:
                return Response({"message": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

            # Query for the last period
            last_period = MenstrualData.objects.filter(
                user=user, start_date__lte=date, end_date__gte=date
            ).order_by('-start_date').first()

            # Debugging: Log the query result
            if last_period:
                print(f"🔍 Found Last Period: Start Date = {last_period.start_date}, End Date = {last_period.end_date}")
                cycle_day = (date - last_period.start_date).days + 1
                print(f"✅ Calculated Cycle Day: {cycle_day}")
            else:
                print(f"❌ No matching period found for the given date: {date}")
                cycle_day = None

            # Debugging: Log data before saving
            print(f"Creating SymptomLog with: User = {user}, Date = {date}, Cycle Day = {cycle_day}, Symptoms = {symptoms}")

            # Save the symptom log
            SymptomLog.objects.create(user=user, date=date, cycle_day=cycle_day, symptoms=symptoms)

            # Respond with success and the calculated cycle day
            return Response({
                "message": "Symptoms logged successfully",
                "cycle_day": cycle_day
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            # Enhanced exception handling with detailed logs
            print(f"❌ Exception occurred: {str(e)}")
            logger.error(f"Error logging symptoms: {str(e)}")
            return Response({"message": "Internal Server Error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SymptomLogListCreateView(generics.ListCreateAPIView):
    serializer_class = SymptomLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SymptomLog.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_create(self, serializer):
        try:
            print("Incoming data:", serializer.validated_data)
            serializer.save(user=self.request.user)
        except serializers.ValidationError as e:
            print("Validation Error:", e.detail)
            raise

# Path to your service account JSON key (Make sure this file exists)
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config/dialogflow-key.json")

# Force Django to use explicit credentials
credentials = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_PATH)

# Dialogflow project ID
DIALOGFLOW_PROJECT_ID = 'flourish-448006'  # Replace with your actual project ID

USE_GPT_FALLBACK = False

# Load OpenAI API Key (Only works when activated)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY

def chatbot_response(request):
    """Handles chatbot messages using Dialogflow and falls back to GPT-3.5 if enabled"""
    print("🚀 Headers Sent:", request.headers)

    if request.method == 'POST':
        try:
            data = json.loads(request.body)  # Parse user message from request body
            user_message = data.get('message', '')

            if not user_message:
                return JsonResponse({"error": "No message provided"}, status=400)

            # Setup Dialogflow session
            session_client = dialogflow.SessionsClient(credentials=credentials)
            session = session_client.session_path(DIALOGFLOW_PROJECT_ID, 'unique-session-id')

            text_input = dialogflow.TextInput(text=user_message, language_code='en')
            query_input = dialogflow.QueryInput(text=text_input)

            print("🚀 Sending request to Dialogflow:", {"session": session, "query_input": query_input})

            # Get response from Dialogflow
            response = session_client.detect_intent(request={"session": session, "query_input": query_input})
            bot_reply = response.query_result.fulfillment_text

           # **Fallback to GPT-3.5 if enabled and Dialogflow fails**
            if USE_GPT_FALLBACK and (not bot_reply or "I don't understand" in bot_reply):
                print("⚠️ Fallback to GPT-3.5")
                bot_reply = get_gpt_response(user_message)

            print("✅ Chatbot Response:", bot_reply)
            return JsonResponse({"response": bot_reply})

        except Exception as e:
            print("❌ Error in chatbot_response:", str(e))
            return JsonResponse({"error": "Internal Server Error", "details": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request"}, status=400)


def get_gpt_response(user_message):
    """Fallback to OpenAI's GPT-3.5 if Dialogflow fails"""
    if not OPENAI_API_KEY or not USE_GPT_FALLBACK:
        return "Sorry, I'm not able to provide responses at the moment."

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant."},
                {"role": "user", "content": user_message}
            ]
        )
        return response["choices"][0]["message"]["content"]

    except Exception as e:
        print("❌ OpenAI API Error:", str(e))
        return "I'm experiencing issues. Please try again later."