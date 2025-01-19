from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    add_fieldsets = UserAdmin.add_fieldsets  # Keep default add fieldsets
    fieldsets = UserAdmin.fieldsets  # Use default fieldsets

admin.site.register(CustomUser, CustomUserAdmin)
