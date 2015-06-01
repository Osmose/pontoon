import json

from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render

from pontoon.base.models import Entity, Project


def index(request, project_slug, locale):
    """Main translation interface."""
    project = get_object_or_404(Project.objects.available(), slug=project_slug)
    locale = get_object_or_404(project.locales, code__iexact=locale)

    return render(request, 'translate/index.html', {
        'project': project,
        'locale': locale,
        'user_json': json.dumps({
            'email': request.user.email,
            'can_translate': request.user.has_perm('base.can_localize'),
        }),
    })


def _user_json(user):
    if user:
        return {
            'email': user.email,
            'name': user.first_name or user.email,
        }
    else:
        return None


def entities(request, project_slug, locale):
    """Return all entities for the given project and locale in JSON."""
    project = get_object_or_404(Project.objects.available(), slug=project_slug)
    locale = get_object_or_404(project.locales, code__iexact=locale)

    entities = Entity.objects.filter(resource__project=project)
    data = [{
        'pk': entity.pk,
        'string': entity.string,
        'marked': entity.marked,
        'key': entity.key,
        'path': entity.resource.path,
        'comment': entity.comment,
        'translations': [{
            'pk': translation.pk,
            'string': translation.string,
            'approved': translation.approved,
            'fuzzy': translation.fuzzy,
            'date': translation.date.strftime('%b %d, %Y %H:%M'),
            'date_iso': translation.date.isoformat(),
            'user': _user_json(translation.user) or {'name': 'Imported'},
            'approved_user': _user_json(translation.approved_user)
        } for translation in entity.translation_set.filter(locale=locale,
                                                           plural_form__isnull=True)],
    } for entity in entities]

    return JsonResponse(data, safe=False)
