from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),  # Django admin
    path('api/users/', include('users.urls')),  # API routes from the `users` app
    path('accounts/', include('allauth.urls')),  # Django-AllAuth for social login
    path('', TemplateView.as_view(template_name="index.html")),  # Serve React app's entry point
]