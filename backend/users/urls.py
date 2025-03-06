from django.urls import path
from .views import RegisterUserView, LoginView, get_csrf_token, LogoutView
from .views import MenstrualDataView, PredictNextCycleView, SymptomLogView, SymptomLogListCreateView, UpdateBotNameView
from users.views import chatbot_response, get_chat_history, start_new_chat, delete_chat, ArticleListView, CategoryListView, AuthStatusView


urlpatterns = [
    path('register/', RegisterUserView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('csrf-token/', get_csrf_token, name='csrf_token'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('menstrual-data/', MenstrualDataView.as_view(), name='menstrual-data'),
    path('predict-cycle/', PredictNextCycleView.as_view(), name='predict-cycle'),
    path('symptoms/', SymptomLogView.as_view(), name='symptom-log'),
    path("symptom-logs/", SymptomLogListCreateView.as_view(), name="symptom-logs"),
    path('chatbot-response/', chatbot_response, name='chatbot-response'),
    path('get-chat-history/', get_chat_history, name='get-chat-history'),
    path('start-new-chat/', start_new_chat, name='start-new-chat'),
    path('delete-chat/<str:session_id>/', delete_chat, name='delete-chat'),
    path("articles/", ArticleListView.as_view(), name="article-list"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path('users/auth-status/', AuthStatusView.as_view(), name='auth-status'),
    path('update-bot-name/', UpdateBotNameView.as_view(), name='update-bot-name'),
]
