# server/testing_db_api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TestScriptViewSet, TestViewSet, TesterViewSet, BugReportViewSet

router = DefaultRouter()
router.register(r'test_scripts', TestScriptViewSet, basename='test_script')
router.register(r'tests', TestViewSet, basename="test")
router.register(r'testers', TesterViewSet, basename="tester")
router.register(r'bug_reports', BugReportViewSet, basename="bug_report")

urlpatterns = [
    path('', include(router.urls)),
]