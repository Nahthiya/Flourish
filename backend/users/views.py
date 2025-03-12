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
import uuid
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from .models import MenstrualData
from .serializers import MenstrualDataSerializer
from .models import ChatSession, Message
from users.models import Article, Category
from .serializers import ArticleSerializer, CategorySerializer
from django.db.models import Q

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
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception as e:
            pass
        
        response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
        response.delete_cookie("csrftoken")
        return response


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
                "cycle_progress": 0,
                "suggestion": "Log your first period to start tracking predictions."
            }, status=200)

        # Dynamically calculate cycle lengths from past periods
        cycle_lengths = []
        period_lengths = []
        previous_entry = None

        for entry in data:
            if previous_entry:
                cycle_length = (previous_entry.start_date - entry.start_date).days
                cycle_lengths.append(cycle_length)
            period_lengths.append(entry.period_length)
            previous_entry = entry

        # Use average cycle length if multiple periods exist
        if cycle_lengths:
            avg_cycle_length = round(sum(cycle_lengths) / len(cycle_lengths))
        else:
            avg_cycle_length = 28  # Default if only one record exists

        avg_period_length = round(sum(period_lengths) / len(period_lengths))

        # Predict from last cycle's end date
        last_cycle = data.first()
        next_start_date = last_cycle.end_date + timedelta(days=avg_cycle_length)
        next_end_date = next_start_date + timedelta(days=avg_period_length)
        fertile_window_start = next_start_date - timedelta(days=14)
        fertile_window_end = fertile_window_start + timedelta(days=5)

        # Calculate cycle progress
        today = datetime.now().date()
        days_since_last_period = (today - last_cycle.end_date).days
        cycle_progress = (days_since_last_period / avg_cycle_length) * 100

        return Response({
            "next_period_start": next_start_date,
            "next_period_end": next_end_date,
            "fertile_window_start": fertile_window_start,
            "fertile_window_end": fertile_window_end,
            "cycle_progress": min(cycle_progress, 100),
        }, status=200)



from django.utils.timezone import now
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
        """Log symptoms for a specific date, combining with existing entry if duplicate."""
        user = request.user
        data = request.data

     # Extract and validate data
        date = data.get("date")
        symptoms = data.get("symptoms", [])
        if not date or not isinstance(symptoms, list) or len(symptoms) == 0:
            return Response({"message": "Date and symptoms are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
        # Parse the date
            date = datetime.strptime(date, "%Y-%m-%d").date()
            logger.info(f"Parsed date from request: {date}")
        except ValueError:
            return Response({"message": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

    # Query for the last period that occurred before or on the symptom log date
        last_period = MenstrualData.objects.filter(
             user=user,
            start_date__lte=date
        ).order_by('-start_date').first()
        logger.info(f"Query filter: user={user.id}, start_date__lte={date}, raw query: {MenstrualData.objects.filter(user=user, start_date__lte=date).query}")

    # Calculate cycle_day if a period is found
        cycle_day = None
        if last_period:
            cycle_day = (date - last_period.start_date).days + 1
            logger.info(f"Calculated cycle_day: {cycle_day} based on last_period.start_date: {last_period.start_date}")
            if cycle_day < 1:
                logger.warning(f"Invalid cycle_day ({cycle_day}) calculated, setting to None")
                cycle_day = None
        else:
            logger.warning("No last period found for the user")

    # Check for existing symptom log for the same user and date
        existing_log = SymptomLog.objects.filter(user=user, date=date).first()

        try:
            if existing_log:
            # Combine symptoms (remove duplicates by converting to set)
                existing_symptoms = existing_log.symptoms
                combined_symptoms = list(set(existing_symptoms + symptoms))
                existing_log.symptoms = combined_symptoms
                existing_log.cycle_day = cycle_day  # Update cycle_day in case it changed
                existing_log.save()
                logger.info(f"Updated existing symptom log for {date} with cycle_day: {cycle_day}, combined symptoms: {combined_symptoms}")
                return Response({
                    "message": "Symptoms updated successfully for existing date",
                    "cycle_day": cycle_day,
                    "combined_symptoms": combined_symptoms
                }, status=status.HTTP_200_OK)
            else:
            # Create a new symptom log
                symptom_log = SymptomLog.objects.create(
                    user=user,
                    date=date,
                    cycle_day=cycle_day,
                    symptoms=symptoms
                )
                logger.info(f"Symptom log saved with cycle_day: {symptom_log.cycle_day}")
                return Response({
                    "message": "Symptoms logged successfully",
                    "cycle_day": cycle_day
                }, status=status.HTTP_201_CREATED)
        except Exception as e:
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_new_chat(request):
    """Creates a new chat session and returns session_id."""
    user = request.user  # Ensure user is logged in

    try:
        session_id = str(uuid.uuid4())  # Generate a unique session ID
        chat_session = ChatSession.objects.create(user=user, session_id=session_id)

        # ✅ Debugging: Check if the session is actually created
        if chat_session:
            print(f"✅ New chat session created: {chat_session.session_id} for user {user}")
        else:
            print("❌ Chat session creation failed.")

        return JsonResponse({"session_id": session_id})  # ✅ Ensure session_id is returned

    except Exception as e:
        print(f"❌ Error creating chat session: {str(e)}")
        return JsonResponse({"error": "Failed to create session"}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_chat_history(request):
    """Fetches the last 10 chat sessions for the logged-in user."""
    user = request.user
    chats = ChatSession.objects.filter(user=user).order_by("-created_at")[:10]
    
    chat_data = []
    for chat in chats:
        messages = chat.messages.order_by("timestamp").values("sender", "text", "timestamp")
        chat_data.append({"session_id": chat.session_id, "messages": list(messages)})

    return JsonResponse({"chats": chat_data if chat_data else []}) 


@api_view(['DELETE'])
def delete_chat(request, session_id):
    try:
        chat = ChatSession.objects.get(session_id=session_id)
        chat.delete()
        return Response({"message": "Chat deleted successfully"}, status=status.HTTP_200_OK)
    except ChatSession.DoesNotExist:
        return Response({"error": "Chat not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chatbot_response(request):
    """Handles chatbot response & stores messages in DB."""
    user = request.user
    data = json.loads(request.body)
    user_message = data.get("message", "")
    session_id = data.get("session_id")

    if not session_id:
        return JsonResponse({"error": "No session ID provided"}, status=400)

    # Ensure session exists
    chat_session, _ = ChatSession.objects.get_or_create(user=user, session_id=session_id)

    # Store user message
    Message.objects.create(chat=chat_session, sender="user", text=user_message)

    # Send message to Dialogflow
    session_client = dialogflow.SessionsClient(credentials=credentials)
    session = session_client.session_path(DIALOGFLOW_PROJECT_ID, session_id)
    text_input = dialogflow.TextInput(text=user_message, language_code="en")
    query_input = dialogflow.QueryInput(text=text_input)
    response = session_client.detect_intent(request={"session": session, "query_input": query_input})

    bot_reply = response.query_result.fulfillment_text or "I didn't understand that."

    # Fallback to GPT-3.5 if Dialogflow fails
    if USE_GPT_FALLBACK and bot_reply in ["I don't understand", ""]:
        bot_reply = get_gpt_response(user_message)

    # Store bot response
    Message.objects.create(chat=chat_session, sender="bot", text=bot_reply)

    return JsonResponse({"response": bot_reply})


def get_gpt_response(user_message):
    """Fallback to OpenAI GPT-3.5 if Dialogflow fails."""
    if not OPENAI_API_KEY or not USE_GPT_FALLBACK:
        return "I'm sorry, but I cannot respond at the moment."

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "system", "content": "You are a helpful AI assistant."},
                      {"role": "user", "content": user_message}]
        )
        return response["choices"][0]["message"]["content"]

    except Exception as e:
        return "I'm having trouble responding right now."
    
class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]  # Enforce authentication

class ArticleListView(generics.ListAPIView):
    serializer_class = ArticleSerializer
    permission_classes = [IsAuthenticated]  # Enforce authentication

    def get_queryset(self):
        queryset = Article.objects.all()
        category = self.request.query_params.get("category")
        search = self.request.query_params.get("search")

        if category:
            queryset = queryset.filter(categories__name__iexact=category)
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(content__icontains=search))

        return queryset
    
class AuthStatusView(APIView):
    """
    View to check authentication status.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "authenticated": True,
            "user_id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
            "preferred_bot_name": request.user.preferred_bot_name,
        }, status=status.HTTP_200_OK)
    
class UpdateBotNameView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        new_bot_name = request.data.get("bot_name")

        if not new_bot_name:
            return Response({"message": "Assistant name is required"}, status=status.HTTP_400_BAD_REQUEST)

        user.preferred_bot_name = new_bot_name
        user.save()

        return Response({"message": "Assistant name updated successfully"}, status=status.HTTP_200_OK)