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
    })


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
        'translations': [translation.serialize() for translation in
                         entity.translation_set.filter(locale=locale)],
    } for entity in entities]

    return JsonResponse(data, safe=False)
