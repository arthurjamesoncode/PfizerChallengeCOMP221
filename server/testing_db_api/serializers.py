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
    model = Tester
    fields = ['id', 'first_name', 'last_name']
    read_only_fields = ['id']
    # Testers can be imported with a single-word name ("Steve"), which arrives
    # as first_name="Steve", last_name="". The column allows '' already.
    extra_kwargs = {'last_name': {'allow_blank': True}}
    
class BugReportSerializer(serializers.ModelSerializer):
  class Meta:
    model = BugReport
    fields = ['id', 'test', 'report_text', 'submitted_by']
    read_only_fields = ['id']
  