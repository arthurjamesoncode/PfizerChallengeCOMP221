# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class Bugreports(models.Model):
    test = models.ForeignKey('Tests', models.DO_NOTHING, db_column='test')
    report_text = models.TextField(blank=True, null=True)
    submitted_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='submitted_by')

    class Meta:
        managed = False
        db_table = 'bugreports'


class Tests(models.Model):
    script = models.ForeignKey('Testscripts', models.DO_NOTHING)
    ordinal = models.IntegerField()
    description = models.TextField(blank=True, null=True)
    expected = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tests'


class Testscripts(models.Model):
    label = models.CharField(max_length=255)
    assigned = models.ForeignKey('Users', models.DO_NOTHING, db_column='assigned', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'testscripts'


class Users(models.Model):
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)

    class Meta:
        managed = False
        db_table = 'users'
