from django.urls import path
from .views import RegisterUserView, LoginView, get_csrf_token, LogoutView

urlpatterns = [
    path('register/', RegisterUserView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('csrf-token/', get_csrf_token, name='csrf_token'),
    path('logout/', LogoutView.as_view(), name='logout'),
]
