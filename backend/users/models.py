from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Count
from django.contrib.auth.models import User 
from django.conf import settings
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    preferred_bot_name = models.CharField(max_length=100, default="Luna")
    avatar_url = models.URLField(blank=True, null=True)

    # Add related_name to avoid reverse accessor clashes
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_user_set',
        blank=True,
        help_text="The groups this user belongs to.",
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_user_permission_set',
        blank=True,
        help_text="The permissions granted to this user.",
    )

    def __str__(self):
        return self.username


class MenstrualData(models.Model):
    # Use CustomUser directly
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    cycle_length = models.IntegerField(default=28)
    period_length = models.IntegerField(default=5)

    def __str__(self):
        return f"{self.user.username} - {self.start_date} to {self.end_date}"


class SymptomLog(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date = models.DateField()  # Date when symptoms were logged
    cycle_day = models.IntegerField(null=True, blank=True)  # Cycle Day (e.g., Day 1, Day 5)
    symptoms = models.JSONField()  # Store symptoms as a list (e.g., ["Cramps", "Fatigue"])
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.date} - {self.symptoms}"
    
    class Meta:
        unique_together = ('user', 'date')
    
class ChatSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)  # ✅ FIXED: Use dynamic user model
    session_id = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Chat {self.session_id} ({self.user.username})"

    @staticmethod
    def cleanup_old_sessions(user):
        """Keeps only the last 10 chat sessions per user."""
        chat_count = ChatSession.objects.filter(user=user).count()
        if chat_count > 10:
            old_chats = ChatSession.objects.filter(user=user).order_by("created_at")[: chat_count - 10]
            old_chats.delete()


class Message(models.Model):
    chat = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    sender = models.CharField(max_length=10, choices=[("user", "User"), ("bot", "Bot")])
    text = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender} - {self.text[:50]}"
    
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Article(models.Model):
    title = models.CharField(max_length=255)
    source = models.CharField(max_length=100)  # API Source (HealthFinder, MedlinePlus, Wikipedia)
    url = models.URLField()
    categories = models.ManyToManyField(Category, related_name="articles")
    content = models.TextField()
    image_url = models.URLField(blank=True, null=True)  # Optional: Article image
    published_date = models.DateTimeField()
    keywords = models.TextField(help_text="Keywords matched", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
    
class ContactSubmission(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField()
    message = models.TextField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Submission from {self.name} ({self.email})"
    
