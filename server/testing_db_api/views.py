from rest_framework import viewsets
from .models import TestScript, Test, Tester, BugReport
from .serializers import TestScriptSerializer, TestSerializer, TesterSerializer, BugReportSerializer

class TestScriptViewSet(viewsets.ModelViewSet):
  queryset = TestScript.objects.all()
  serializer_class = TestScriptSerializer
  
class TestViewSet(viewsets.ModelViewSet):
  queryset = Test.objects.all()
  serializer_class = TestSerializer
  
class TesterViewSet(viewsets.ModelViewSet):
  queryset = Tester.objects.all()
  serializer_class = TesterSerializer

class BugReportViewSet(viewsets.ModelViewSet):
  queryset = BugReport.objects.all()
  serializer_class = BugReportSerializer


