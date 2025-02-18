from django.urls import path
from .views import RegisterUserView, LoginView, get_csrf_token, LogoutView
from .views import MenstrualDataView, PredictNextCycleView, SymptomLogView, SymptomLogListCreateView
from users.views import chatbot_response


urlpatterns = [
    path('register/', RegisterUserView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('csrf-token/', get_csrf_token, name='csrf_token'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('menstrual-data/', MenstrualDataView.as_view(), name='menstrual-data'),
    path('predict-cycle/', PredictNextCycleView.as_view(), name='predict-cycle'),
    path('symptoms/', SymptomLogView.as_view(), name='symptom-log'),
    path("symptom-logs/", SymptomLogListCreateView.as_view(), name="symptom-logs"),
    path('api/chatbot/', chatbot_response, name='chatbot'),
]
