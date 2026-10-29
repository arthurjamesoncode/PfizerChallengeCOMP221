from rest_framework import serializers
from .models import TestScript, Test, Tester, BugReport

class TestScriptSerializer(serializers.ModelSerializer):
  class Meta:
    model = TestScript
    fields = ['id', 'label', 'assigned']
    read_only_fields = ['id']
    
class TestSerializer(serializers.ModelSerializer):
  class Meta:
    model = Test
    fields = ['id', 'script', 'ordinal', 'description', 'expected']
    read_only_fields = ['id']
    
class TesterSerializer(serializers.ModelSerializer):
  class Meta:
    model = TestScript
    fields = ['id', 'label', 'assigned']
    read_only_fields = ['id']
    
class BugReportSerializer(serializers.ModelSerializer):
  class Meta:
    model = TestScript
    fields = ['id', 'test', 'report_text', 'submitted_by']
    read_only_fields = ['id']
  