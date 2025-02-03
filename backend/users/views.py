from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser, MenstrualData
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


logger = logging.getLogger(__name__)

# CSRF Token View (GET Request)
@ensure_csrf_cookie
@api_view(['GET'])
@permission_classes([])  # Allow unauthenticated access
def get_csrf_token(request):
    """
    View to set a CSRF token. Used to ensure CSRF protection is active for the frontend.
    """
    return Response({"message": "CSRF cookie set"}, status=status.HTTP_200_OK)


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


class MenstrualDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = MenstrualData.objects.filter(user=user).order_by('-start_date')
        serializer = MenstrualDataSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
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

        try:
            MenstrualData.objects.create(
                user=user,
                start_date=start_date,
                end_date=end_date,
                period_length=period_length,
                cycle_length=28  # Default cycle length
            )
            return Response({"message": "Period data saved successfully"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error saving period data: {str(e)}")
            return Response({"message": "Internal Server Error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
class PredictNextCycleView(APIView):
    """
    View to predict the user's next cycle.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = MenstrualData.objects.filter(user=user).order_by('-start_date')

        if not data.exists():
            # Provide a default estimated cycle for new users
            return Response({
                "message": "No data available for predictions",
                "next_period_start": None,
                "next_period_end": None,
                "fertile_window_start": None,
                "fertile_window_end": None,
                "suggestion": "Log your first period to start tracking predictions."
            }, status=200)

        avg_cycle_length = round(data.aggregate(Avg('cycle_length'))['cycle_length__avg'] or 28)
        avg_period_length = round(data.aggregate(Avg('period_length'))['period_length__avg'] or 5)

        last_cycle = data.first()
        next_start_date = last_cycle.start_date + timedelta(days=avg_cycle_length)
        next_end_date = next_start_date + timedelta(days=avg_period_length)
        fertile_window_start = next_start_date - timedelta(days=14)
        fertile_window_end = fertile_window_start + timedelta(days=5)

        return Response({
            "next_period_start": next_start_date,
            "next_period_end": next_end_date,
            "fertile_window_start": fertile_window_start,
            "fertile_window_end": fertile_window_end,
        }, status=200)