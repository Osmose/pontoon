Pontoon - Translate the Web. In Place.
======================================

Pontoon is a web interface for translating text into other languages. Pontoon
specializes in translating websites in-place, but can handle any project that
uses one of the file formats it supports:

- Gettext PO files
- XLIFF
- Property files
- DTD
- INI
- .lang files

Pontoon pulls strings it needs to translate from an external source, and writes
them back periodically. Typically these external sources are version control
repositories that store the strings for an application. Supported external
sources include:

- Git
- Mercurial
- Subversion
- Remote file (pull only)
- Transifex (pull only)

Contents
--------
.. toctree::
   :maxdepth: 2

   admin/deployment
