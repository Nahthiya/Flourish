from rest_framework import serializers
from .models import CustomUser
from .models import MenstrualData
from .models import SymptomLog

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email']

class MenstrualDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenstrualData
        fields = ['id', 'start_date', 'end_date', 'cycle_length', 'period_length']

class SymptomLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SymptomLog
        exclude = ['user']