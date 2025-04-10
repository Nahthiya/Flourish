from django.urls import path
from .views import RegisterUserView, LoginView, get_csrf_token, LogoutView
from .views import MenstrualDataView, PredictNextCycleView, SymptomLogView, SymptomLogListCreateView, UpdateBotNameView, SymptomReportView, ContactSubmissionView
from users.views import chatbot_response, get_chat_history, start_new_chat, delete_chat, ArticleListView, CategoryListView, AuthStatusView
from .views import UploadAvatarView, UpdateProfileView, ChangePasswordView, DeleteAccountView, DeleteMenstrualDataView,UserDetailView

urlpatterns = [
    path('register/', RegisterUserView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('csrf-token/', get_csrf_token, name='csrf_token'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('menstrual-data/', MenstrualDataView.as_view(), name='menstrual-data'),
    path('predict-cycle/', PredictNextCycleView.as_view(), name='predict-cycle'),
    path('symptoms/', SymptomLogView.as_view(), name='symptom-log'),
    path('symptom-logs/', SymptomLogView.as_view(), name='symptom-log'),
    path('chatbot-response/', chatbot_response, name='chatbot-response'),
    path('get-chat-history/', get_chat_history, name='get-chat-history'),
    path('start-new-chat/', start_new_chat, name='start-new-chat'),
    path('delete-chat/<str:session_id>/', delete_chat, name='delete-chat'),
    path("articles/", ArticleListView.as_view(), name="article-list"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path('users/auth-status/', AuthStatusView.as_view(), name='auth-status'),
    path('update-bot-name/', UpdateBotNameView.as_view(), name='update-bot-name'),
    path('symptom-report/', SymptomReportView.as_view(), name='symptom-report'),
    path('contact/', ContactSubmissionView.as_view(), name='contact-submission'),
    path('upload-avatar/', UploadAvatarView.as_view(), name='upload-avatar'),
    path('update-profile/', UpdateProfileView.as_view(), name='update-profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('delete-account/', DeleteAccountView.as_view(), name='delete-account'),
    path('menstrual-data/<int:id>/', DeleteMenstrualDataView.as_view(), name='delete-menstrual-data'),
    path('me/', UserDetailView.as_view(), name='user-detail'),
]
