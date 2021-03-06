# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


def add_tagalog_locale(apps, schema_editor):
    Locale = apps.get_model('base', 'Locale')
    locale = Locale.objects.create(
        code='tl',
        name='Tagalog',
        nplurals=2,
        plural_rule='(n > 3) && (n%10 == 4 || n%10 == 6 || n%10 == 9)',
        cldr_plurals='1,5'
    )

    Project = apps.get_model('base', 'Project')
    project = Project.objects.get(slug="pontoon-intro")
    project.locales.add(locale)


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0015_remove_project_last_synced'),
    ]

    operations = [
        migrations.RunPython(add_tagalog_locale)
    ]
