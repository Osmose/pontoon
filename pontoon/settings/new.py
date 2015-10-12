from configurations import Configuration

class Base(Configuration):
    pass


class Django(object):
    """Settings that are built-in to Django."""
    DEBUG = True
    DEV = True

    ROOT_URLCONF = 'pontoon.urls'

    INSTALLED_APPS = (
        'pontoon.base',
        'pontoon.administration',
        'pontoon.intro',
        'pontoon.sites',
        'pontoon.sync',

        # Django contrib apps
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.staticfiles',

        # Third-party apps, patches, fixes
        'commonware.response.cookies',
        'django_browserid',
        'django_jinja',
        'django_nose',
        'pipeline',
        'session_csrf',
    )

    MIDDLEWARE_CLASSES = (
        'sslify.middleware.SSLifyMiddleware',
        'raygun4py.middleware.django.Provider',
        'django.middleware.common.CommonMiddleware',
        'django.contrib.sessions.middleware.SessionMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'session_csrf.CsrfMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',
    )

    CONTEXT_PROCESSORS = (
        'django.contrib.auth.context_processors.auth',
        'django.core.context_processors.debug',
        'django.core.context_processors.media',
        'django.core.context_processors.request',
        'session_csrf.context_processor',
        'django.contrib.messages.context_processors.messages',
        'pontoon.base.context_processors.globals',
    )

    def TEMPLATES(self):
        return [
            {
                'BACKEND': 'django_jinja.backend.Jinja2',
                'APP_DIRS': True,
                'OPTIONS': {
                    'match_extension': '',
                    'match_regex': r'^(?!(admin|registration)/).*\.(html|jinja)$',
                    'context_processors': self.CONTEXT_PROCESSORS,
                    'extensions': [
                        'jinja2.ext.do',
                        'jinja2.ext.loopcontrols',
                        'jinja2.ext.with_',
                        'jinja2.ext.i18n',
                        'jinja2.ext.autoescape',
                        'django_jinja.builtins.extensions.CsrfExtension',
                        'django_jinja.builtins.extensions.CacheExtension',
                        'django_jinja.builtins.extensions.TimezoneExtension',
                        'django_jinja.builtins.extensions.UrlsExtension',
                        'django_jinja.builtins.extensions.StaticFilesExtension',
                        'django_jinja.builtins.extensions.DjangoFiltersExtension',
                        'pipeline.templatetags.ext.PipelineExtension',
                    ],
                    'globals': {
                        'browserid_info': 'django_browserid.helpers.browserid_info',
                    }
                }
            },
            {
                'BACKEND': 'django.template.backends.django.DjangoTemplates',
                'DIRS': [],
                'APP_DIRS': True,
                'OPTIONS': {
                    'debug': self.DEBUG,
                    'context_processors': self.CONTEXT_PROCESSORS
                }
            },
        ]

    AUTHENTICATION_BACKENDS = [
        'django_browserid.auth.BrowserIDBackend',
        'django.contrib.auth.backends.ModelBackend',
    ]
