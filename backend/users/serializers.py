from rest_framework import serializers
from .models import CustomUser
from .models import MenstrualData
from .models import SymptomLog
from .models import Article, Category, ContactSubmission

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'preferred_bot_name']

class MenstrualDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenstrualData
        fields = ['id', 'start_date', 'end_date', 'cycle_length', 'period_length']

class SymptomLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SymptomLog
        exclude = ['user']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]

class ArticleSerializer(serializers.ModelSerializer):
    categories = CategorySerializer(many=True)

    class Meta:
        model = Article
        fields = "__all__"

class ContactSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSubmission
        fields = ['name', 'email', 'message']