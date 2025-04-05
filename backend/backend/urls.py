from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from users.views import chatbot_response
from users.views import get_csrf_token, AuthStatusView
from django.conf.urls.static import static
from django.conf import settings

urlpatterns = [
    path('admin/', admin.site.urls),  
    path('api/users/', include('users.urls')),  
    path('accounts/', include('allauth.urls')),  
    path('', TemplateView.as_view(template_name="index.html")), 
    path('api/chatbot/', chatbot_response, name='chatbot'),
    path('api/csrf-token/', get_csrf_token, name='csrf-token'),
    path('users/auth-status/', AuthStatusView.as_view(), name='auth-status'),
    path('api/', include('users.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)