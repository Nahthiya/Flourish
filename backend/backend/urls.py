from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from users.views import chatbot_response
from users.views import get_csrf_token, AuthStatusView

urlpatterns = [
    path('admin/', admin.site.urls),  # Django admin
    path('api/users/', include('users.urls')),  # API routes for user-related views
    path('accounts/', include('allauth.urls')),  # Django-AllAuth for social login
    path('', TemplateView.as_view(template_name="index.html")),  # Serve React app's entry point
    path('api/chatbot/', chatbot_response, name='chatbot'),
    path('api/csrf-token/', get_csrf_token, name='csrf-token'),
    path('users/auth-status/', AuthStatusView.as_view(), name='auth-status'),
]
