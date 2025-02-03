from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)

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
