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

  dispatch: function(action, ...args) {
    let handlers = this.actions[action] || [];
    for (let handler of handlers) {
      handler(...args);
    }
  }
}

/** Shorthand for dispatching actions in JSX event attributes. */
function dispatch(...args) {
  return (e) => {
    e.preventDefault();
    Dispatcher.dispatch(...args);
  };
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
  get approvedTranslation() {
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
    if (this.approvedTranslation) {
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
      selectedIndex: 0,
    };
  }

  componentDidMount() {
    Entity.fetchAll(this.props.project.slug, this.props.locale.code).then((entities) => {
      this.setState({
        loaded: true,
        entities: entities,
      });
    });
  }

  render() {
    if (!this.state.loaded) {
      return this.loadingIndicator();
    }

    return (
      <div id="translation-editor">
        <aside id="sidebar" className="advanced" ref="sidebar">
          <EntityList entities={this.state.entities}
                      project={this.props.project}
                      selectedIndex={this.state.selectedIndex} />
          <EntityEditor entities={this.state.entities}
                        selectedIndex={this.state.selectedIndex}
                        user={this.props.user} />
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
    },

    selectEntity(entityKey) {
      let index = this.state.entities.findIndex((e) => e.pk === entityKey);
      if (index !== -1) {
        this.setState({
          selectedIndex: index,
        });
      }
    },

    selectNextEntity() {
      if (this.state.selectedIndex < this.state.entities.length - 1) {
        this.setState({
          selectedIndex: this.state.selectedIndex + 1,
        });
      }
    },

    selectPreviousEntity() {
      if (this.state.selectedIndex > 0) {
        this.setState({
          selectedIndex: this.state.selectedIndex - 1,
        });
      }
    },
  }}
}


/**
 * List of entities that appears in the sidebar.
 */
class EntityList extends PontoonComponent {
  render() {
    let listBody = <h3 className="no-match"><div>ఠ_ఠ</div>No results</h3>;

    if (this.props.entities.length > 0) {
      let entities = [];
      for (let k = 0; k < this.props.entities.length; k++) {
        let entity = this.props.entities[k];
        let selected = k == this.props.selectedIndex;

        entities.push(
          <EntityItem key={entity.pk} entity={entity} selected={selected} />
        );
      }

      // Only show page mesage if we're showing an iframe.
      let notOnPageMessage = '';
      if (this.props.project.url) {
        notOnPageMessage = <h2 id="not-on-page">Not on the current page</h2>;
      }

      listBody = (
        <div className="wrapper">
          <ul className="editables">
            {entities}
          </ul>
          {notOnPageMessage}
          <ul className="uneditables"></ul>
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
  render() {
    let entity = this.props.entity;
    let translationString = '';
    if (entity.approvedTranslation) {
      translationString = entity.approvedTranslation.string;
    } else if (entity.translations.length > 0) {
      translationString = entity.translations[0].string;
    }

    let liClassname = classNames('entity', 'limited', entity.status, {
      'hovered': this.props.selected
    })
    return (
      <li className={liClassname}
          onClick={dispatch('selectEntity', entity.pk)}>
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
 * Editor for individual Entities.
 */
class EntityEditor extends PontoonComponent {
  constructor(props) {
    super(props);

    this.state = {
      'showAll': false
    };
  }

  render() {
    let entity = this.selectedEntity;
    return (
      <div id="editor">
        <div id="drag-1" draggable="true"></div>

        <div id="topbar" className="clearfix">
          <a id="back" href="#back">
            <span className="fa fa-chevron-left fa-lg"></span>
            Back to list
          </a>
          <a id="next" href="#next" onClick={dispatch('selectNextEntity')}>
            <span className="fa fa-chevron-down fa-lg"></span>
            Next
          </a>
          <a id="previous" href="#previous" onClick={dispatch('selectPreviousEntity')}>
            <span className="fa fa-chevron-up fa-lg"></span>
            Previous
          </a>
        </div>

        <div id="source-pane">
            {this.metadata()}
            <p id="original">{entity.marked}</p>
        </div>

        <textarea id="translation"
                  placeholder="Enter translation"
                  defaultValue="">
        </textarea>

        <menu>
          <div id="translation-length">
            0 / {entity.string.length}
          </div>
          <button id="copy">Copy</button>
          <button id="clear">Clear</button>
          <button id="cancel">Cancel</button>
          <button id="save">Save</button>
        </menu>

        <EditorHelpers entity={entity} user={this.props.user} />
      </div>
    );
  }

  metadata() {
    let metadata = [];
    let entity = this.selectedEntity;

    if (entity.comment) {
      metadata.push(<span id="comment">{entity.comment}</span>);
    }

    if (entity.source || entity.path || entity.key) {
      if (this.state.showAll) {
        metadata.push(
          <a href="#" className="details" onClick={dispatch('showMetadata', false)}>
            Less details
          </a>
        );
      } else {
        metadata.push(
          <a href="#" className="details" onClick={dispatch('showMetadata', true)}>
            More details
          </a>
        );
      }
    }

    if (entity.source) {
      if (typeof(entity.source) === 'object') {
        for (let source of entity.source) {
          metadata.push(<span>#: {source.join(':')}</span>);
        }
      } else {
        metadata.push(<span>{entity.source}</span>);
      }
    }

    if (entity.path) {
      metadata.push(<span>{entity.path}</span>);
    }

    if (entity.key) {
      metadata.push(<span>Key: {entity.key}</span>);
    }

    return (
      <p id="metadata" className={classNames({'show-all': this.state.showAll})} ref="metadata">
        {metadata}
      </p>
    );
  }

  get selectedEntity() {
    return this.props.entities[this.props.selectedIndex];
  }

  handlers() {return {
    showMetadata(showAll) {
      this.setState({
        'showAll': showAll,
      });
    },
  }}
}


/**
 * Tabs at the bottom of the editor containing helper components.
 */
class EditorHelpers extends PontoonComponent {
  constructor(props) {
    super(props);

    this.state = {
      activeTab: 'history',
    };
  }

  render() {
    let entity = this.props.entity;

    return (
      <div id="helpers" ref="helpers">
        <nav>
          <ul>
            <HelperTab id="history" activeTab={this.state.activeTab}>
              History
            </HelperTab>
            <HelperTab id="machinery" activeTab={this.state.activeTab}>
              Machinery
            </HelperTab>
            <HelperTab id="otherLocales" activeTab={this.state.activeTab}>
              Locales
            </HelperTab>
            <HelperTab id="machinerySearch" activeTab={this.state.activeTab}>
              Search
            </HelperTab>
          </ul>
        </nav>

        <HelperContent id="history" activeTab={this.state.activeTab}>
          <EntityHistoryList translations={this.props.entity.translations}
                             user={this.props.user} />
        </HelperContent>
      </div>
    )
  }

  handlers() {return {
    openHelper(id) {
      this.setState({
        activeTab: id,
      });
    },
  }}
}


class HelperTab extends PontoonComponent {
  render() {
    let id = this.props.id;
    return (
      <li className={classNames({'active': this.props.activeTab == id})}>
        <a href={`#${id}`} onClick={dispatch('openHelper', id)}>
          <span>
            {this.props.children}
            <span className="fa fa-cog fa-lg fa-spin spinner"></span>
          </span>
        </a>
      </li>
    );
  }
}


class HelperContent extends PontoonComponent {
  render() {
    let className = classNames('helper-content', {
      'active': this.props.activeTab == this.props.id
    });

    return (
      <section className={className}>
        {this.props.children}
      </section>
    )
  }
}


class EntityHistoryList extends PontoonComponent {
  render() {
    let historyItems = [];
    if (this.props.translations.length < 1) {
      historyItems.push(
        <li className="disabled"><p>No translations available.</p></li>
      )
    } else {
      historyItems = this.props.translations.map(translation => (
        <EntityHistoryItem key={translation.id} translation={translation} user={this.props.user}></EntityHistoryItem>
      ));
    }

    return (
      <ul>
        {historyItems}
      </ul>
    );
  }
}


class EntityHistoryItem extends PontoonComponent {
  render() {
    let translation = this.props.translation;
    return (
      <li data-id={translation.id}
          className={classNames({approved: translation.approved})}
          title="Click to copy">
        <header className={classNames('clearfix', this.headerClass())}>
          <div className="info">
            {this.localizerName()}
            <time className="stress" dateTime={translation.date_iso}>{translation.date}</time>
          </div>
          <menu className="toolbar">
            <button className="approve fa" title={this.approveTitle()}></button>
            <button className="delete fa" title="Delete"></button>
          </menu>
        </header>
        <p className="translation">
          {translation.string}
        </p>
      </li>
    );
  }

  headerClass() {
    let translation = this.props.translation;
    if (this.props.user.can_translate) {
      return 'localizer';
    } else if (this.props.user.email == translation.user.email && !translation.approved) {
      return 'own'
    } else {
      return '';
    }
  }

  localizerName() {
    let translation = this.props.translation;
    if (translation.user.email) {
      let href = 'contributors/' + translation.user.email;
      return <a href={href}>{translation.user.name}</a>;
    } else {
      return translation.user.name;
    }
  }

  approveTitle() {
    let translation = this.props.translation;
    if (!translation.approved) {
      return 'Approved';
    } else if (translation.approved_user) {
      return 'Approved by '+ translation.approved_user;
    } else {
      return '';
    }
  }
}


/* Main code */
$(function() {
  let $server = $('#server');
  let project = $server.data('project');
  let locale = $server.data('locale');
  let user = $server.data('user');

  let editor = React.render(
    <TranslationEditor project={project} locale={locale} user={user} />,
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
