from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from .models import TestScript, Test, Tester, BugReport
from .serializers import TestScriptSerializer, TestSerializer, TesterSerializer, BugReportSerializer

class TestScriptViewSet(viewsets.ModelViewSet):
  queryset = TestScript.objects.all()
  serializer_class = TestScriptSerializer
  
  filter_backends = [DjangoFilterBackend]
  filterset_fields = ['assigned', 'label']
  
class TestViewSet(viewsets.ModelViewSet):
  queryset = Test.objects.all()
  serializer_class = TestSerializer
  
  filter_backends = [DjangoFilterBackend]
  filterset_fields = ['script', 'ordinal', 'description', 'expected']
  
class TesterViewSet(viewsets.ModelViewSet):
  queryset = Tester.objects.all()
  serializer_class = TesterSerializer
  
  filter_backends = [DjangoFilterBackend]
  filterset_fields = ['first_name', 'last_name']

class BugReportViewSet(viewsets.ModelViewSet):
  queryset = BugReport.objects.all()
  serializer_class = BugReportSerializer
  
  filter_backends = [DjangoFilterBackend]
  filterset_fields = ['test', 'report_text', 'submitted_by']


