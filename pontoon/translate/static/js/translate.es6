/**
 * Simple dispatcher to make triggering actions within the tree of
 * components easier.
 */
let Dispatcher = {
  actions: {},

  register: function(action, handler) {
    if (!(action in this.actions)) {
      this.actions[action] = [];
    }

    this.actions[action].push(handler);
  },

  dispatch: function(action) {
    let handlerArguments = Array.from(arguments).slice(1);
    for (let handler of this.actions[action]) {
      handler.apply(undefined, handlerArguments);
    }
  }
}

/**
 * Model for Entities, which represent a single string to be translated.
 */
class Entity {
  constructor(data) {
    $.extend(this, data);
  }

  /**
   * Return the first approved translation in this.translations, or null
   * if there are none.
   */
  get approved_translation() {
    for (let translation of this.translations) {
      if (translation.approved) {
        return translation;
      }
    }

    return null;
  }

  /**
   * Return the current translation status.
   */
  get status() {
    if (this.approved_translation) {
      return 'approved';
    } else if (this.translations.some((t) => t.fuzzy)) {
      return 'fuzzy'
    } else if (this.translations.length > 0) {
      return 'translated';
    } else {
      return '';
    }
  }

  /**
   * Fetch all the entities for the given project and locale.
   */
  static fetchAll(projectSlug, localeCode) {
    let url = `/project/${projectSlug}/locale/${localeCode}/entities`;
    return $.get(url).then((entities) => {
      return entities.map((data) => new Entity(data));
    });
  }
}


/**
 * Base class for React Components.
 */
class PontoonComponent extends React.Component {
  constructor(props) {
    super(props);

    // Functions returned by this.handlers are auto-registered with the
    // Dispatcher.
    if (this.handlers) {
      let handlers = this.handlers();
      for (let action in handlers) {
        Dispatcher.register(action, handlers[action].bind(this));
      }
    }
  }

  /** Shorthand for getting a jQuery object for a ref. */
  $ref(refName) {
    return $(React.findDOMNode(this.refs[refName]));
  }
}


/**
 * Root Component for the entire translation editor.
 */
class TranslationEditor extends PontoonComponent {
  constructor(props) {
    super(props)
    this.state = {
      loaded: false,
      entities: [],
      selectedEntity: {},
    };
  }

  componentDidMount() {
    Entity.fetchAll(this.props.project.slug, this.props.locale.code).then((entities) => {
      this.setState({
        loaded: true,
        entities: entities,
        selectedEntity: {},
      });
    });
  }

  render() {
    if (!this.state.loaded) {
      return this.loadingIndicator();
    }

    return (
      <div id="translation-editor">
        <aside id="sidebar" ref="sidebar">
          <EntityList entities={this.state.entities} project={this.props.project} />
          <div id="drag" draggable="true"></div>
        </aside>
      </div>
    );
  }

  /** Hide iframe if no project URL is specified. */
  iframe() {
    if (this.props.project.url) {
      return (
        <div>
          <iframe id="source"></iframe>
          <div id="iframe-cover"></div>
        </div>
      );
    } else {
      return '';
    }
  }

  /** Project loading indicator. */
  loadingIndicator() {
    return (
      <div id="project-load">
        <div className="inner">
          <div className="animation">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <div className="text">"640K ought to be enough for anybody."</div>
        </div>
      </div>
    );
  }

  handlers() {return {
    toggleSidebar() {
      this.$ref('sidebar').toggle();
    }
  }}
}


/**
 * List of entities that appears in the sidebar.
 */
class EntityList extends PontoonComponent {
  render() {
    let entities = this.props.entities;
    let listBody = <h3 className="no-match"><div>ఠ_ఠ</div>No results</h3>;

    if (entities.length > 1) {
      let editableEntities = entities.filter(entity => entity.body);
      let uneditableEntities = entities.filter(entity => !entity.body);

      // Only show page mesage if we're showing an iframe.
      let notOnPageMessage = '';
      if (this.props.project.url) {
        notOnPageMessage = <h2 id="not-on-page">Not on the current page</h2>;
      }

      listBody = (
        <div className="wrapper">
          <ul className="editables">
            {editableEntities.map(EntityItem.fromEntity)}
          </ul>
          {notOnPageMessage}
          <ul className="uneditables">
            {uneditableEntities.map(EntityItem.fromEntity)}
          </ul>
        </div>
      );
    }

    return (
      <div id="entitylist">
        <EntitySearch />
        {listBody}
      </div>
    );
  }
}


/**
 * Search input above the list of entities in the sidebar.
 */
class EntitySearch extends PontoonComponent {
  render() {
    return (
      <div className="search-wrapper clearfix">
        <div className="icon fa fa-search"></div>
        <input id="search" type="search" placeholder="Search" />
        <div id="filter" className="select">
          <div className="button selector all">
            <span className="status fa"></span>
            <span className="title">All</span>
          </div>
          <div className="menu">
            <ul>
              <li className="all"><span className="status fa"></span>All</li>
              <li className="untranslated"><span className="status fa"></span>Untranslated</li>
              <li className="fuzzy"><span className="status fa"></span>Needs work</li>
              <li className="translated"><span className="status fa"></span>Unapproved</li>
              <li className="approved"><span className="status fa"></span>Approved</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
}


/**
 * Individual entity in the sidebar list.
 */
class EntityItem extends PontoonComponent {
  static fromEntity(entity) {
    return <EntityItem key={entity.pk} entity={entity} />;
  }

  render() {
    let entity = this.props.entity;
    let translationString = '';
    if (entity.approved_translation) {
      translationString = entity.approved_translation.string;
    } else if (entity.translations.length > 0) {
      translationString = entity.translations[0].string;
    }

    return (
      <li className={classNames('entity', 'limited', entity.status)}>
        <span className="status fa"></span>
        <p className="string-wrapper">
          <span className="source-string">{entity.marked}</span>
          <span className="translation-string">{translationString}</span>
        </p>
        <span className="arrow fa fa-chevron-right fa-lg"></span>
      </li>
    );
  }
}


/**
 *
 */


/* Main code */
$(function() {
  let $server = $('#server');
  let project = $server.data('project');
  let locale = $server.data('locale');

  let editor = React.render(
    <TranslationEditor project={project} locale={locale} />,
    document.getElementById('translation-editor-container')
  );

  // Event handlers outside of the main React tree.
  let $doc = $(document.documentElement);

  // Toggle the sidebar.
  $doc.on('click', '#switch', (e) => {
    e.preventDefault();

    $(e.target).toggleClass('opened');
    Dispatcher.dispatch('toggleSidebar');
  });
});
