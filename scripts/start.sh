#!/bin/bash
cd frontend && npm start &
cd backend && python manage.py runserver
