from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser
from rest_framework.decorators import api_view
from django.views.decorators.csrf import ensure_csrf_cookie  # To set the CSRF cookie
from django.utils.decorators import method_decorator  # To decorate class-based views

# CSRF Token View (GET Request)
@ensure_csrf_cookie
@api_view(['GET'])
def get_csrf_token(request):
    """
    View to set a CSRF token. Used to ensure CSRF protection is active for the frontend.
    """
    return Response({"message": "CSRF cookie set"}, status=status.HTTP_200_OK)


class RegisterUserView(APIView):
    """
    View to handle user registration.
    """
    def post(self, request):
        # Get user data from the request
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')

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
        try:
            user = CustomUser.objects.create_user(username=username, email=email, password=password)
            user.save()
            return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"message": f"Error creating user: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(ensure_csrf_cookie, name='dispatch')
class LoginView(APIView):
    """
    View to handle user login.
    """
    def post(self, request):
        # Retrieve username and password from the request
        username = request.data.get('username')
        password = request.data.get('password')

        # Debugging Logs
        print(f"Login attempt received. Username: {username}, Password: {password}")
        print(f"CSRF Token present in request: {request.META.get('CSRF_COOKIE')}")
        print(f"Request Headers: {request.headers}")

        # Authenticate the user
        user = authenticate(username=username, password=password)
        if user:
            # Debug log for successful authentication
            print(f"User authenticated successfully. User: {user}")

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            update_last_login(None, user)

            # Return successful response
            return Response({
                "refresh": str(refresh),
                "access": str
                
                (refresh.access_token),
                "message": "Login successful"
            }, status=status.HTTP_200_OK)
        else:
            # Debug log for failed authentication
            print(f"Authentication failed. Username: {username}")

            # Return unauthorized response
            return Response({"message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    def post(self, request):
        response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
        response.delete_cookie("accessToken")  # If token is stored in cookies
        return response