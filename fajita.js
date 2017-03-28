(function () {
'use strict';

/*import _ from "underscore";*/
/*import Backbone from "backbone";*/

var Model = Backbone.Model.extend({

  initialize: function initialize(options) {
    if (typeof URLSearchParams !== "undefined") {
      this.query = new URLSearchParams(window.location.search);
    }

    //new
    this.structure = {};

    this.parentModels = [];
    this.init();
  },
  init: function init() {},

  get: function get(attr) {

    //Todo: error check when attr has "->" but doesn't start with ->

    if (_.isString(attr)) {
      var props = attr.split("->");
      if (props.length > 1) {
        var model = this;
        props.slice(1).forEach(function (prop) {
          if (model.structure[prop]) model = model.structure[prop];
        });
        return model;
      }
    }
    var get = Backbone.Model.prototype.get.apply(this, arguments);
    if (!_.isUndefined(get)) return get;
  },
  toggle: function toggle(key, val1, val2) {
    if (this.get(key) == val2) {
      this.set(key, val1);
    } else this.set(key, val2);
  },
  set: function set(attr, val, options) {

    /*
    get code...I want set code to mirror get code
    */
    if (_.isString(attr)) {
      var props = attr.split("->");
      if (props.length > 1) {
        var model = this;
        props.slice(1).forEach(function (prop, i, props) {
          if (model.structure[prop]) model = model.structure[prop];else {
            var newModel;
            if (i < props.length - 1) {
              newModel = new Fajita.Model();
            } else {
              newModel = _.isArray(val) ? new Fajita.Collection(val) : new Fajita.Model(val);
            }
            newModel.parentModels.push(model);
            model.structure[prop] = newModel;
            model.listenTo(newModel, "change add", function (newModel, options) {
              this.trigger("change");

              /* TODO: invent entire system for traversing and firing events. Probably not worth the effort for now.
              Object.keys(model.changedAttributes()).forEach(function(key){
                this.trigger("change:"+prop+"."+key)
              }.bind(this));
              */
            });
          }
        });
        return model;
      }
    } else {
      return Backbone.Model.prototype.set.apply(this, arguments);
    }
  }
  //Note: there is still no listener for a submodel of a collection changing, triggering the parent. I think that's useful.
});

/*import _ from "underscore";*/
/*import Backbone from "backbone";*/
var Collection = Backbone.Collection.extend({
    model: Model, //problem: Model relies on collection as well causing error
    initialize: function initialize() {
        this.parentModels = [];
        //trigger "update" when submodel changes
        this.on("add", function (model) {
            this.listenTo(model, "change", function () {
                this.trigger("update");
            });
        });
    }
});

/*import Backbone from "backbone";*/

var Directive = Backbone.View.extend({
    name: null,
    build: null,
    render: null,
    initialize: function initialize(options) {
        if (!this.name) console.error("Error: Directive requires a name in the prototype.");
        this.val = options.val;

        //view is the view that implements this directive.
        if (!options.view) console.error("Error: Directive requires a view passed as an option.");
        this.view = options.view;
        if (!this.childInit) console.error("Error: Directive requires childInit in prototype.");
        this.childInit();
        this.build();
    },
    childInit: function childInit() {

        this.updateResult();
        this.listenTo(this.view.viewModel, "change:" + this.val, function () {
            this.updateResult();
            this.render();
        });
    },
    updateResult: function updateResult() {
        var result = this.view.get(this.val);
        if (_.isFunction(result)) this.result = result.call(this.view);else this.result = result;
    }
});

var DirectiveContent = Directive.extend({
    name: "content",
    build: function build() {
        if (this.$el.prop("tagName") == "IMG") this.el.setAttribute("title", this.result);else this.el.innerHTML = this.result;
    },
    render: function render() {
        this.build();
    },
    test: function test(value) {
        var pass = false;
        if (this.$el.prop("tagName") == "IMG") {
            if (this.el.getAttribute("title") == value + "") pass = true;
        } else if (this.el.innerHTML == value + "") pass = true;

        return pass;
    }
});

//Why does underscore work here?

var DirectiveEnable = Directive.extend({
    name: "enable",
    build: function build() {
        if (!this.result) $(this.el).prop("disabled", true);else $(this.el).prop("disabled", "");
    },
    render: function render() {
        if (!this.result) $(this.el).prop("disabled", true);else $(this.el).prop("disabled", "");
    },
    test: function test(value) {
        return $(this.el).prop("disabled") != value;
    }
});

//Why does underscore work here?

var DirectiveDisable = Directive.extend({
    name: "disable",
    build: function build() {
        if (this.result) $(this.el).prop("disabled", true);else $(this.el).prop("disabled", "");
    },
    render: function render() {
        if (this.result) $(this.el).prop("disabled", true);else $(this.el).prop("disabled", "");
    },
    test: function test(value) {
        return $(this.el).prop("disabled") == value;
    }
});

var DirectiveHref = Directive.extend({
    name: "href",

    build: function build() {
        if (this.$el.prop("tagName") == "A") this.$el.attr("href", this.result);else {
            var a = document.createElement("a");
            a.classList.add("wrapper-a");
            a.setAttribute("href", this.result);
            this.wrapperA = a;
            this.el.parentNode.replaceChild(this.wrapperA, this.el);
            //can't simply use this.$el.wrap(a);
            //http://stackoverflow.com/questions/5707328/wrap-one-element-with-another-retaining-reference-to-wrapper
            this.wrapperA.appendChild(this.el);
        }
        window.wrapperA = this.wrapperA;
    },
    render: function render() {
        if (this.$el.prop("tagName") == "A") $(this.el).attr("href", this.result);else {
            this.wrapperA.setAttribute("href", this.result);
        }
    },
    test: function test(value) {
        if (this.$el.prop("tagName") == "A") return $(this.el).attr("href") == value;else {
            return $(this.el).parent().prop("tagName") == "A" && $(this.el).parent().attr("href") == value;
        }
    }
});

var AbstractSubview = Directive.extend({
    name: "abstractsubview",
    _initializeBackboneObject: function _initializeBackboneObject() {
        var args = this.val.split(":");
        this.subViewName = args[0];
        if (args[1]) {
            this.subModelName = args[1];
            var model = this.view.get(this.subViewName); //changed from subModelName.
            if (model instanceof Backbone.Model) this.subModel = model;else if (model instanceof Backbone.Collection) this.subCollection = model;

            //console.log((model instanceof Backbone.Model),(model instanceof Backbone.Collection),this.subCollection)
            //debugger;
        }
    },
    _initializeChildMappings: function _initializeChildMappings() {
        //The JSON object to pass as "mappings" to the subview or the item in the subCollection.
        //Do not shorten to view.get. view.get gets from the viewModel which contains props and values...not view props and app props
        this.childMappings = this.view.mappings && this.view.mappings[this.subViewName];
    },
    _initializeOverrideSubviewDefaultsHash: function _initializeOverrideSubviewDefaultsHash() {
        //Not shortened to view.get because I'm not sure if it is useful to do so.
        //view.get gets the app value mapped to the default value, and if not then it gets the default value.
        //I think you're just overriding defaults with defaults, and nothing fancier than that.
        //this.overrideSubviewDefaultsHash = this.view.defaults && this.view.defaults[this.subViewName];
        //Nevermind it is useful to use .get because if there are nested nested views, you can't just go to the defaults of that view. They might be overridden.

        this.overrideSubviewDefaultsHash = this.view.get(this.subViewName);
    },

    _initializeChildViews: function _initializeChildViews() {}
});

/*import Backbone from "backbone";*/
var DirectiveMap = AbstractSubview.extend({
    name: "map",
    _initializeChildViews: function _initializeChildViews() {

        this.listenTo(this.subCollection, "add", function () {
            this.renderAdd();
        });

        this.listenTo(this.subCollection, "reset", function () {
            this.renderReset();
        });

        this.listenTo(this.subCollection, "remove", function () {
            this.renderRemove();
        });

        this.listenTo(this.subCollection, "sort", function () {
            this.renderSort();
        });

        //Map models to childView instances with their mappings
        this.ChildView = this.view.childViewImports[this.subViewName];
        this.childViewOptions = {
            mappings: this.childMappings,
            collection: this.subCollection,
            tagName: this.view.childViewImports[this.subViewName].prototype.tagName || "subitem",
            overrideSubviewDefaultsHash: this.overrideSubviewDefaultsHash
        };

        this.childViews = this.subCollection.map(function (childModel, i) {

            var childViewOptions = _.extend({}, this.childViewOptions, {
                model: childModel,
                index: i,
                lastIndex: this.subCollection.length - i - 1,
                overrideSubviewDefaultsHash: this.overrideSubviewDefaultsHash && this.overrideSubviewDefaultsHash.models[i] && this.overrideSubviewDefaultsHash.models[i].attributes
            });

            var childview = new this.ChildView(childViewOptions);
            //childview._setAttributes(_.extend({}, _.result(childview, 'attributes')));
            return childview;
        }.bind(this));
    },
    childInit: function childInit() {
        this._initializeBackboneObject();
        this._initializeChildMappings();
        this._initializeOverrideSubviewDefaultsHash();
        this._initializeChildViews();
    },
    build: function build() {
        if (!this.subCollection) {
            this.$el.replaceWith(this.subView.el);
        } else {
            var $children = $();
            this.childViews.forEach(function (childView, i) {
                $children = $children.add(childView.el);
                childView.index = i;
            }.bind(this));
            if ($children.length) {
                this.$el.replaceWith($children);
                this.childViews.forEach(function (childView, i) {
                    childView.delegateEvents();
                });
                this.$parent = $children.parent();
            } else {
                this.$parent = this.$el.parent();
            }
            this.$children = $children;
        }
    },
    renderAdd: function renderAdd() {
        var children = [];
        this.subCollection.each(function (model, i) {
            var existingChildView = this.childViews.filter(function (childView) {
                return childView.model == model;
            })[0];
            if (existingChildView) {
                children.push(existingChildView.el);
                //var attributes = _.extend({}, _.result(existingChildView, 'attributes'))
                //existingChildView._setAttributes(attributes);
            } else {
                var newChildView = new this.ChildView({
                    model: model,
                    mappings: this.childMappings,
                    index: i,
                    lastIndex: this.subCollection.length - i - 1,
                    collection: this.subCollection,
                    data: this.view.get(this.val.split(":")[0])[i]
                });
                this.childViews.push(newChildView);
                children.push(newChildView.el);
            }
        }.bind(this));
        this.$parent.empty();
        children.forEach(function (child) {
            this.$parent.append(child);
        }.bind(this));
        this.$children = $(children);

        this.childViews.forEach(function (childView, i) {
            childView.delegateEvents();
        });
    },
    renderReset: function renderReset() {
        this.$parent.empty();
    },
    renderRemove: function renderRemove() {
        this.$children.last().remove();
        this.childViews.splice(-1, 1);
        this.$children = this.$parent.children();
    },
    renderSort: function renderSort() {

        //Don't need this (now). Models will already be sorted on add with collection.comparator = xxx;
    },
    test: function test() {
        //this.view is instance of the view that contains the subview directive.
        //this.subView is instance of the subview
        //this is the directive.

        if (this.subView) {
            //why parentNode?
            return this.view.el.contains(this.subView.el.parentNode);
        } else {
            var pass = true;
            var el = this.view.el;
            this.$children.each(function () {
                if (!el.contains(this)) pass = false;
            });
            return pass;
        }
    }
});

/*import $ from "jquery";*/
var DirectiveOptional = Directive.extend({
    name: "optional",

    build: function build() {
        if (!this.result) $(this.el).hide();else $(this.el).css("display", "");
    },
    render: function render() {
        if (!this.result) $(this.el).hide();else $(this.el).css("display", "");
    },
    test: function test(value) {
        if (!document.body.contains(this.el)) throw Error("element has to be in the DOM in order to test");
        return $(this.el).is(":visible") == value;
    }
});

var DirectiveOptionalWrap = Directive.extend({
    name: "optionalwrap",
    childInit: function childInit() {
        Directive.prototype.childInit.call(this, arguments);

        this.wrapper = this.el;
        this.childNodes = [].slice.call(this.el.childNodes, 0);
    },
    build: function build() {
        if (!this.result) $(this.childNodes).unwrap();
    },
    render: function render() {
        if (!this.result) {
            $(this.childNodes).unwrap();
        } else {
            if (!document.body.contains(this.childNodes[0])) {
                console.error("First child has to be in DOM");
                //solution: add a dummy text node at beginning
            } else if (!document.body.contains(this.wrapper)) {
                this.childNodes[0].parentNode.insertBefore(this.wrapper, this.childNodes[0]);
            }
            for (var i = 0; i < this.childNodes.length; i++) {
                this.wrapper.appendChild(this.childNodes[i]);
            }
        }
    },
    test: function test(value) {

        return this.childNodes[0].parentNode == this.wrapper == value;
    }
});

var DirectiveSrc = Directive.extend({
    name: "src",
    build: function build() {
        this.$el.attr("src", this.result);
    },
    render: function render() {
        this.$el.attr("src", this.result);
    },
    test: function test(value) {
        return this.$el.attr("src") === value;
    }
});

/*import Backbone from "backbone";*/
var DirectiveSubview = AbstractSubview.extend({
    name: "subview",
    _initializeChildViews: function _initializeChildViews() {
        if (this.view.subViewImports[this.subViewName].prototype instanceof Backbone.View) this.ChildConstructor = this.view.subViewImports[this.subViewName];else this.ChildConstructor = this.view.subViewImports[this.subViewName]; /*.call(this.view);*/

        var options = {};

        if (this.overrideSubviewDefaultsHash) {
            _.extend(options, { overrideSubviewDefaultsHash: this.overrideSubviewDefaultsHash });
        }

        if (this.childMappings) {
            _.extend(options, {
                mappings: this.childMappings
                //,el:this.el The el of the directive should belong to the directive but not the subview itself
            });
        }

        var subModel = this.subModel || this.view.model;
        if (subModel) {
            _.extend(options, { model: subModel });
        }

        if (!this.subCollection) {
            this.subView = new this.ChildConstructor(options);
            var classes = _.result(this.subView, "className");
            if (classes) {
                classes.split(" ").forEach(function (cl) {
                    this.subView.el.classList.add(cl);
                }.bind(this));
            }

            var attributes = _.result(this.subView, "attributes");
            if (attributes) {
                _.each(attributes, function (val, name) {
                    this.subView.el.setAttribute(name, val);
                }.bind(this));
            }

            this.subView.parent = this.view;
            this.subView.parentDirective = this;
        }
        this.optionsSentToSubView = options;
    },
    childInit: function childInit() {
        //this.val, this.view

        this._initializeBackboneObject();
        this._initializeChildMappings();
        this._initializeOverrideSubviewDefaultsHash();
        this._initializeChildViews();

        if (this.subCollection) {
            this.listenTo(this.subCollection, "add", function () {
                this.renderAdd();
            });

            this.listenTo(this.subCollection, "reset", function () {
                this.renderReset();
            });

            this.listenTo(this.subCollection, "remove", function () {
                this.renderRemove();
            });

            this.listenTo(this.subCollection, "sort", function () {
                this.renderSort();
            });

            //Map models to childView instances with their mappings
            this.ChildView = this.view.childViewImports[this.subViewName];
            this.childViewOptions = {
                mappings: this.childMappings,
                collection: this.subCollection,
                tagName: this.view.childViewImports[this.subViewName].prototype.tagName || "subitem",
                overrideSubviewDefaultsHash: this.overrideSubviewDefaultsHash
            };
            this.childViews = this.subCollection.map(function (childModel, i) {

                var childViewOptions = _.extend({}, this.childViewOptions, {
                    model: childModel,
                    index: i,
                    lastIndex: this.subCollection.length - i - 1,
                    overrideSubviewDefaultsHash: this.overrideSubviewDefaultsHash && this.overrideSubviewDefaultsHash.models[i] && this.overrideSubviewDefaultsHash.models[i].attributes
                });

                var childview = new this.ChildView(childViewOptions);
                //childview._setAttributes(_.extend({}, _.result(childview, 'attributes')));
                return childview;
            }.bind(this));
        }

        if (!this.subCollection) {
            if (this.view.subViewImports[this.subViewName].prototype instanceof Backbone.View) this.ChildConstructor = this.view.subViewImports[this.subViewName];else this.ChildConstructor = this.view.subViewImports[this.subViewName]; /*.call(this.view);*/
        }

        var options = {};

        if (this.overrideSubviewDefaultsHash) {
            _.extend(options, { overrideSubviewDefaultsHash: this.overrideSubviewDefaultsHash });
        }

        if (this.childMappings) {
            _.extend(options, {
                mappings: this.childMappings
                //,el:this.el The el of the directive should belong to the directive but not the subview itself
            });
        }

        var subModel = this.subModel || this.view.model;
        if (subModel) {
            _.extend(options, { model: subModel });
        }

        if (!this.subCollection) {
            this.subView = new this.ChildConstructor(options);
            var classes = _.result(this.subView, "className");
            if (classes) {
                classes.split(" ").forEach(function (cl) {
                    this.subView.el.classList.add(cl);
                }.bind(this));
            }

            var attributes = _.result(this.subView, "attributes");
            if (attributes) {
                _.each(attributes, function (val, name) {
                    this.subView.el.setAttribute(name, val);
                }.bind(this));
            }

            this.subView.parent = this.view;
            this.subView.parentDirective = this;
        }
        this.optionsSentToSubView = options;
    },
    build: function build() {
        if (!this.subCollection) {
            this.$el.replaceWith(this.subView.el);
        } else {
            var $children = $();
            this.childViews.forEach(function (childView, i) {
                $children = $children.add(childView.el);
                childView.index = i;
            }.bind(this));
            if ($children.length) {
                this.$el.replaceWith($children);
                this.childViews.forEach(function (childView, i) {
                    childView.delegateEvents();
                });
                this.$parent = $children.parent();
            } else {
                this.$parent = this.$el.parent();
            }
            this.$children = $children;
        }
    },
    renderAdd: function renderAdd() {
        var children = [];
        this.subCollection.each(function (model, i) {
            var existingChildView = this.childViews.filter(function (childView) {
                return childView.model == model;
            })[0];
            if (existingChildView) {
                children.push(existingChildView.el);
                //var attributes = _.extend({}, _.result(existingChildView, 'attributes'))
                //existingChildView._setAttributes(attributes);
            } else {
                var newChildView = new this.ChildView({
                    model: model,
                    mappings: this.childMappings,
                    index: i,
                    lastIndex: this.subCollection.length - i - 1,
                    collection: this.subCollection,
                    data: this.view.get(this.val.split(":")[0])[i]
                });
                this.childViews.push(newChildView);
                children.push(newChildView.el);
            }
        }.bind(this));
        this.$parent.empty();
        children.forEach(function (child) {
            this.$parent.append(child);
        }.bind(this));
        this.$children = $(children);

        this.childViews.forEach(function (childView, i) {
            childView.delegateEvents();
        });
    },
    renderReset: function renderReset() {
        this.$parent.empty();
    },
    renderRemove: function renderRemove() {
        this.$children.last().remove();
        this.childViews.splice(-1, 1);
        this.$children = this.$parent.children();
    },
    renderSort: function renderSort() {

        //Don't need this (now). Models will already be sorted on add with collection.comparator = xxx;
    },
    test: function test() {
        //this.view is instance of the view that contains the subview directive.
        //this.subView is instance of the subview
        //this is the directive.

        if (this.subView) {
            //why parentNode?
            return this.view.el.contains(this.subView.el.parentNode);
        } else {
            var pass = true;
            var el = this.view.el;
            this.$children.each(function () {
                if (!el.contains(this)) pass = false;
            });
            return pass;
        }
    }
});

/*import _ from "underscore";*/
var DirectiveData = Directive.extend({
    name: "data",
    childInit: function childInit() {
        this.content = this.view.viewModel.get(this.val);
        this.listenTo(this.view.viewModel, "change:" + this.val, function () {
            this.content = this.view.viewModel.get(this.val);
            this.render();
        });
    },
    build: function build() {
        _.each(this.content, function (val, prop) {
            if (_.isFunction(val)) val = val.bind(this.view);
            this.$el.attr("data-" + prop, val);
        }.bind(this));
    },
    render: function render() {
        _.each(this.content, function (val, prop) {
            if (_.isFunction(val)) val = val.bind(this.view);
            this.$el.attr("data-" + prop, val);
        }.bind(this));
    }
});

var registry = {
    Content: DirectiveContent,
    Enable: DirectiveEnable,
    Disable: DirectiveDisable,
    Href: DirectiveHref,
    Map: DirectiveMap,
    Optional: DirectiveOptional,
    OptionalWrap: DirectiveOptionalWrap,
    Src: DirectiveSrc,
    Subview: DirectiveSubview,
    Data: DirectiveData
};

/*import $ from "jquery";*/
/*import _ from "underscore";*/
/*import Backbone from "backbone";*/
var backboneViewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];
var additionalViewOptions = ['mappings', 'templateString', 'childViewImports', 'subViewImports', 'index', 'lastIndex', 'overrideSubviewDefaultsHash'];
var View = Backbone.View.extend({
    textNodesUnder: function textNodesUnder() {
        //http://stackoverflow.com/questions/10730309/find-all-text-nodes-in-html-page
        var n,
            a = [],
            walk = document.createTreeWalker(this.el, NodeFilter.SHOW_TEXT, null, false);
        while (n = walk.nextNode()) {
            a.push(n);
        }return a;
    },
    constructor: function constructor(options) {
        //debugger;

        //Make options hash "strict". Only allow certain options to be passed in.
        _.each(_.difference(_.keys(options), _.union(backboneViewOptions, additionalViewOptions)), function (prop) {
            console.warn("Warning! Unknown property " + prop);
        });

        if (!this.jst && !this.templateString) throw new Error("You need a template");
        if (!this.jst) {
            this.jst = _.template(this.templateString);
        }

        _.extend(this, _.pick(options, backboneViewOptions.concat(additionalViewOptions)));

        //Add this here so that it's available in className function
        if (!this.defaults) {
            console.error("You need defaults for your view");
        }

        _.each(this.defaults, function (def) {
            if (_.isFunction(def)) console.warn("Defaults should usually be primitive values");
        });

        //data is passed in on subviews
        // comes from this.view.viewModel.get(this.val);, 
        //so if the directive is nm-subview="Menu", then this.data should be...what?
        //Aha! data is to override default values for subviews being part of a parent view. 
        //But it is not meant to override mappings I don't think.
        this.overrideSubviewDefaultsHash = options && options.overrideSubviewDefaultsHash;

        var attrs = _.extend(_.clone(this.defaults), options && options.overrideSubviewDefaultsHash || {});
        console.log(this.overrideSubviewDefaultsHash, attrs);
        this.viewModel = new Backbone.Model(attrs);

        //mappings contain mappings of view variables to model variables.
        //strings are references to model variables. Functions are for when a view variable does
        //not match perfectly with a model variable. These are updated each time the model changes.
        this.propMap = {};
        this.funcs = {};

        _.each(this.mappings, function (modelVar, templateVar) {
            if (typeof modelVar == "string") this.propMap[templateVar] = modelVar;else if (typeof modelVar == "function") this.funcs[templateVar] = modelVar;
        }.bind(this));

        //Problem: if you update the model it updates for every subview (not efficient).
        //And it does not update for submodels. Perhaps there are many different solutions for this.
        //You can have each submodel trigger change event.

        //Whenever the model changes, update the viewModel by mapping properties of the model to properties of the view (assigned in mappings)
        //Also, the attributes change. This can be done more elegantly
        if (this.model) {
            this.listenTo(this.model, "change", this.updateContextObject);
            this.listenTo(this.model, "change", function () {
                this._setAttributes(_.extend({}, _.result(this, 'attributes')));
            });

            this.updateContextObject(this.model);
        }

        var attrs = this.viewModel.attributes;
        var keys = Object.keys(this.viewModel.attributes);
        keys.forEach(function (key) {
            if (key === "definitions" && !this.viewModel.attributes[key]) {
                //problem is that propMap (seems to be mappings with functions filtered out) is 
                //{definitions:"definitions"}. Comes from article_article.js
                debugger;
            }
        }.bind(this));

        this._ensureElement();
        this.buildInnerHTML();

        this.initDirectives(); //init simple directives...the ones that just manipulate an element
        this.delegateEvents();

        this.childNodes = [].slice.call(this.el.childNodes, 0);

        this.initialize.apply(this, arguments);
    },

    initialize: function initialize(options) {
        //attach options to view (model, propMap, subViews, events)
        options = options || {};
        _.extend(this, options);
    },
    getModelAttr: function getModelAttr(attr) {
        //quickly grab a models attribute by a view variable. Useful in classname function.
        if (typeof this.mappings[attr] == "string") return this.model.get(this.mappings[attr]);else return this.mappings[attr].call(this);
    },
    updateContextObject: function updateContextObject(model) {

        var obj = {};

        //Change templateVars->modelVars to templateVars->model.get("modelVar"), and set on the model
        _.extend(obj, _.mapObject(this.propMap, function (modelVar) {

            return this.model.get(modelVar);
        }.bind(this)));

        _.extend(obj, _.mapObject(this.funcs, function (func) {
            var ret = func.call(this);
            return ret;
            //func.call makes it work but only once
        }.bind(this)));

        this.viewModel.set(obj);
    },
    buildInnerHTML: function buildInnerHTML() {
        if (this.$el) this.$el.html(this.renderedTemplate());else {
            var dummydiv = document.createElement("div");
            dummydiv.innerHTML = this.renderedTemplate();
            while (dummydiv.childNodes.length) {
                this.el.appendChild(dummydiv.childNodes[0]);
            }
            //maybe less hackish solution http://stackoverflow.com/a/25214113/1763217
        }
    },
    initDirectives: function initDirectives() {

        //Init directives involving {{}}

        this._initialTextNodes = this.textNodesUnder();
        this._subViewElements = [];
        this._initialTextNodes.forEach(function (fullTextNode) {
            //http://stackoverflow.com/a/21311670/1763217 textContent seems right

            var re = /\{\{(.+?)\}\}/g;
            var match;

            var matches = [];
            while ((match = re.exec(fullTextNode.textContent)) != null) {
                matches.push(match);
            }

            var currentTextNode = fullTextNode;
            var currentString = fullTextNode.textContent;
            var prevNodesLength = 0;

            matches.forEach(function (match) {
                var varNode = currentTextNode.splitText(match.index - prevNodesLength);
                var entireMatch = match[0];
                varNode.match = match[1];
                this._subViewElements.push(varNode);
                currentTextNode = varNode.splitText(entireMatch.length);
                currentString = currentTextNode.textContent;

                prevNodesLength = match.index + entireMatch.length; //Note: This works accidentally. Might be wrong.
            }.bind(this));
        }.bind(this));

        this.directive = {};

        for (var directiveName in registry) {
            var __proto = registry[directiveName].prototype;
            if (__proto instanceof Directive) {
                //because foreach will get more than just other directives
                var name = __proto.name;
                if (name !== "subview" && name !== "map") {
                    var elements = this.$el ? $.makeArray(this.$el.find("[nm-" + name + "]")) : $.makeArray($(this.el.querySelectorAll("[nm-" + name + "]")));

                    if (elements.length) {
                        this.directive[name] = elements.map(function (element, i, elements) {
                            //on the second go-around for nm-map, directiveName somehow is called "SubView"
                            return new registry[directiveName]({
                                view: this,
                                el: element,
                                val: element.getAttribute("nm-" + name)
                            });
                        }.bind(this));
                    }
                } else {
                    /*
                    this.directive["subview"] = this._subViewElements.map(function(subViewElement,i,subViewElements){
                        return new DirectiveRegistry["Subview"]({
                            view:this,
                            el:subViewElement
                        });
                    }.bind(this)); */
                }
            }
        }

        this._subViewElements.forEach(function (subViewElement) {
            var args = subViewElement.match.split(":");
            if (args.length == 1) {
                if (!this.directive["subview"]) this.directive["subview"] = [];
                this.directive["subview"].push(new registry["Subview"]({
                    view: this,
                    el: subViewElement,
                    val: subViewElement.match
                }));
            } else {
                if (!this.directive["map"]) this.directive["map"] = [];
                this.directive["map"].push(new registry["Map"]({
                    view: this,
                    el: subViewElement,
                    val: subViewElement.match
                }));
            }
        }.bind(this));

        /*
        this._subViewElements.forEach(function(subViewElement){
            var args = subViewElement.match.split(":");
            if (args.length==1){
                //subview with no context obj
            }else{
                //Check for collection or model passed.
            }
              var element = document.createElement("span");
            element.style.background="yellow";
            element.innerHTML = subViewElement.match;
            subViewElement.parentNode.replaceChild(element,subViewElement);
        })*/
    },
    renderedTemplate: function renderedTemplate() {
        if (this.jst) {
            window._ = _;
            return this.jst(this.viewModel.attributes);
        } else return _.template(this.templateString)(this.viewModel.attributes);
    },
    delegateEvents: function delegateEvents(events) {
        //http://stackoverflow.com/a/12193069/1763217
        var delegateEventSplitter = /^(\S+)\s*(.*)$/;
        events || (events = _.result(this, 'events'));
        if (!events) return this;
        this.undelegateEvents();
        for (var key in events) {
            var method = events[key];
            if (!_.isFunction(method)) method = this[events[key]];
            if (!method) throw new Error('Method "' + events[key] + '" does not exist');
            var match = key.match(delegateEventSplitter);
            var eventTypes = match[1].split(','),
                selector = match[2];
            method = _.bind(method, this);
            var self = this;
            _(eventTypes).each(function (eventName) {
                eventName += '.delegateEvents' + self.cid;
                if (selector === '') {
                    self.$el.bind(eventName, method);
                } else {
                    self.$el.delegate(selector, eventName, method);
                }
            });
        }
    },
    render: function render() {},

    tagName: undefined, //don't want a tagName to be div by default. Rather, make it a documentfragment'
    subViewImports: {},
    childViewImports: {},
    _ensureElement: function _ensureElement() {
        //Overriding this to support document fragments
        if (!this.el) {
            if (this.attributes || this.id || this.className || this.tagName) {
                //if you have any of these backbone properties, do backbone behavior
                var attrs = _.extend({}, _.result(this, 'attributes'));
                if (this.id) attrs.id = _.result(this, 'id');
                if (this.className) attrs['class'] = _.result(this, 'className');
                this.setElement(this._createElement(_.result(this, 'tagName') || 'div'));
                this._setAttributes(attrs);
            } else {
                //however, default to this.el being a documentfragment (makes this.el named improperly but whatever)
                this.el = document.createDocumentFragment();
            }
        } else {
            this.setElement(_.result(this, 'el'));
        }
    },
    set: function set(obj) {
        this.viewModel.set(obj);
    },
    get: function get(prop) {
        return this.viewModel.get(prop);
    }
});

//Same model, collection in same file for now because these modules rely on each other.

/*import _ from "underscore";*/
/*import Backbone from "backbone";*/
var Fajita$1 = { Model: Model, Collection: Collection, View: View, DirectiveRegistry: registry };
Fajita$1["🌮"] = "0.0.0";

if (typeof window !== "undefined") window.Fajita = Fajita$1;
if (typeof global !== "undefined") global.Fajita = Fajita$1;

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFqaXRhLmpzIiwic291cmNlcyI6WyJNb2RlbC5qcyIsIkNvbGxlY3Rpb24uanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1jb250ZW50LmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1lbmFibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRpc2FibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWhyZWYuanMiLCJkaXJlY3RpdmUvYWJzdHJhY3Qtc3Vidmlldy5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtbWFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1vcHRpb25hbC5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtb3B0aW9uYWx3cmFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1zcmMuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLXN1YnZpZXcuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRhdGEuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnkuanMiLCJWaWV3LmpzIiwiQmFzZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5cblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgXG4gIGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgaWYgKCB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSBcInVuZGVmaW5lZFwiICl7XG4gICAgICB0aGlzLnF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICB9XG5cbiAgIFxuXG4gICAgLy9uZXdcbiAgICB0aGlzLnN0cnVjdHVyZSA9IHt9O1xuXG4gICAgdGhpcy5wYXJlbnRNb2RlbHMgPSBbXTtcbiAgICB0aGlzLmluaXQoKTtcbiAgfSxcbiAgaW5pdDpmdW5jdGlvbigpe30sXG4gIFxuICBnZXQ6ZnVuY3Rpb24oYXR0cil7XG5cbiAgICAvL1RvZG86IGVycm9yIGNoZWNrIHdoZW4gYXR0ciBoYXMgXCItPlwiIGJ1dCBkb2Vzbid0IHN0YXJ0IHdpdGggLT5cblxuICAgIGlmIChfLmlzU3RyaW5nKGF0dHIpKXtcbiAgICAgIHZhciBwcm9wcyA9IGF0dHIuc3BsaXQoXCItPlwiKTtcbiAgICAgIGlmIChwcm9wcy5sZW5ndGggPiAxKXtcbiAgICAgICAgdmFyIG1vZGVsID0gdGhpcztcbiAgICAgICAgcHJvcHMuc2xpY2UoMSkuZm9yRWFjaChmdW5jdGlvbihwcm9wKXtcbiAgICAgICAgICBpZiAobW9kZWwuc3RydWN0dXJlW3Byb3BdKSBtb2RlbCA9IG1vZGVsLnN0cnVjdHVyZVtwcm9wXTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtb2RlbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGdldCA9IEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5nZXQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuICAgIGlmICghXy5pc1VuZGVmaW5lZChnZXQpKSByZXR1cm4gZ2V0O1xuICAgIFxuXG4gXG4gICBcbiAgIFxuICB9LFxuICB0b2dnbGU6ZnVuY3Rpb24oa2V5LHZhbDEsdmFsMil7XG4gICAgaWYgKHRoaXMuZ2V0KGtleSk9PXZhbDIpe1xuICAgICAgdGhpcy5zZXQoa2V5LHZhbDEpO1xuICAgIH1cbiAgICBlbHNlIHRoaXMuc2V0KGtleSx2YWwyKTtcbiAgfSxcbiAgc2V0OmZ1bmN0aW9uKGF0dHIsIHZhbCwgb3B0aW9ucyl7XG4gICBcbiAgICAvKlxuICAgIGdldCBjb2RlLi4uSSB3YW50IHNldCBjb2RlIHRvIG1pcnJvciBnZXQgY29kZVxuICAgICovXG4gICAgaWYgKF8uaXNTdHJpbmcoYXR0cikpe1xuICAgICAgdmFyIHByb3BzID0gYXR0ci5zcGxpdChcIi0+XCIpO1xuICAgICAgaWYgKHByb3BzLmxlbmd0aCA+IDEpe1xuICAgICAgICB2YXIgbW9kZWwgPSB0aGlzO1xuICAgICAgICBwcm9wcy5zbGljZSgxKS5mb3JFYWNoKGZ1bmN0aW9uKHByb3AsaSxwcm9wcyl7XG4gICAgICAgICAgaWYgKG1vZGVsLnN0cnVjdHVyZVtwcm9wXSkgbW9kZWwgPSBtb2RlbC5zdHJ1Y3R1cmVbcHJvcF07XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3TW9kZWw7XG4gICAgICAgICAgICBpZiAoaSA8IHByb3BzLmxlbmd0aCAtIDEpe1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IG5ldyBGYWppdGEuTW9kZWw7ICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IChfLmlzQXJyYXkodmFsKSk/bmV3IEZhaml0YS5Db2xsZWN0aW9uKHZhbCk6bmV3IEZhaml0YS5Nb2RlbCh2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3TW9kZWwucGFyZW50TW9kZWxzLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgbW9kZWwuc3RydWN0dXJlW3Byb3BdID0gbmV3TW9kZWw7XG4gICAgICAgICAgICBtb2RlbC5saXN0ZW5UbyhuZXdNb2RlbCxcImNoYW5nZSBhZGRcIixmdW5jdGlvbihuZXdNb2RlbCxvcHRpb25zKXtcbiAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8qIFRPRE86IGludmVudCBlbnRpcmUgc3lzdGVtIGZvciB0cmF2ZXJzaW5nIGFuZCBmaXJpbmcgZXZlbnRzLiBQcm9iYWJseSBub3Qgd29ydGggdGhlIGVmZm9ydCBmb3Igbm93LlxuICAgICAgICAgICAgICBPYmplY3Qua2V5cyhtb2RlbC5jaGFuZ2VkQXR0cmlidXRlcygpKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlOlwiK3Byb3ArXCIuXCIra2V5KVxuICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAqL1xuXG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIFxuXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICByZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG4gICAgfVxuXG5cbiAgICAgIFxuICAgICBcbiAgfVxuICAvL05vdGU6IHRoZXJlIGlzIHN0aWxsIG5vIGxpc3RlbmVyIGZvciBhIHN1Ym1vZGVsIG9mIGEgY29sbGVjdGlvbiBjaGFuZ2luZywgdHJpZ2dlcmluZyB0aGUgcGFyZW50LiBJIHRoaW5rIHRoYXQncyB1c2VmdWwuXG59KTsiLCIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgTW9kZWwgZnJvbSBcIi4vTW9kZWxcIjtcblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIG1vZGVsOk1vZGVsLCAvL3Byb2JsZW06IE1vZGVsIHJlbGllcyBvbiBjb2xsZWN0aW9uIGFzIHdlbGwgY2F1c2luZyBlcnJvclxuICAgIGluaXRpYWxpemU6ZnVuY3Rpb24oKXtcbiAgICAgICAgIHRoaXMucGFyZW50TW9kZWxzID0gW107XG4gICAgICAgIC8vdHJpZ2dlciBcInVwZGF0ZVwiIHdoZW4gc3VibW9kZWwgY2hhbmdlc1xuICAgICAgICB0aGlzLm9uKFwiYWRkXCIsZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyhtb2RlbCxcImNoYW5nZVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG59KTsiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuXG5leHBvcnQgZGVmYXVsdCBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG4gICAgbmFtZTpudWxsLFxuICAgIGJ1aWxkOm51bGwsXG4gICAgcmVuZGVyOm51bGwsXG4gICAgaW5pdGlhbGl6ZTpmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgICAgaWYgKCF0aGlzLm5hbWUpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGEgbmFtZSBpbiB0aGUgcHJvdG90eXBlLlwiKTtcbiAgICAgICAgdGhpcy52YWwgPSBvcHRpb25zLnZhbDtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvL3ZpZXcgaXMgdGhlIHZpZXcgdGhhdCBpbXBsZW1lbnRzIHRoaXMgZGlyZWN0aXZlLlxuICAgICAgICBpZiAoIW9wdGlvbnMudmlldykgY29uc29sZS5lcnJvcihcIkVycm9yOiBEaXJlY3RpdmUgcmVxdWlyZXMgYSB2aWV3IHBhc3NlZCBhcyBhbiBvcHRpb24uXCIpO1xuICAgICAgICB0aGlzLnZpZXcgPSBvcHRpb25zLnZpZXc7XG4gICAgICAgIGlmICghdGhpcy5jaGlsZEluaXQpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGNoaWxkSW5pdCBpbiBwcm90b3R5cGUuXCIpO1xuICAgICAgICB0aGlzLmNoaWxkSW5pdCgpO1xuICAgICAgICB0aGlzLmJ1aWxkKCk7XG4gICAgfSxcbiAgICBjaGlsZEluaXQ6ZnVuY3Rpb24oKXtcbiAgICAgICBcbiAgICAgICAgdGhpcy51cGRhdGVSZXN1bHQoKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnZpZXcudmlld01vZGVsLFwiY2hhbmdlOlwiK3RoaXMudmFsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVJlc3VsdCgpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuICAgIHVwZGF0ZVJlc3VsdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgcmVzdWx0ID0gdGhpcy52aWV3LmdldCh0aGlzLnZhbCk7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ocmVzdWx0KSkgdGhpcy5yZXN1bHQgPSByZXN1bHQuY2FsbCh0aGlzLnZpZXcpO1xuICAgICAgICBlbHNlIHRoaXMucmVzdWx0ID0gcmVzdWx0O1xuICAgIH1cbn0pOyIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbi8vTm90ZTogRG9uJ3QgdXNlIC5odG1sKCkgb3IgLmF0dHIoKSBqcXVlcnkuIEl0J3Mgd2VpcmQgd2l0aCBkaWZmZXJlbnQgdHlwZXMuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiY29udGVudFwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLHRoaXMucmVzdWx0KVxuICAgICAgICBlbHNlIHRoaXMuZWwuaW5uZXJIVE1MID0gdGhpcy5yZXN1bHQ7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5idWlsZCgpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHZhciBwYXNzID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikge1xuICAgICAgICAgICAgaWYgKHRoaXMuZWwuZ2V0QXR0cmlidXRlKFwidGl0bGVcIik9PXZhbHVlICsgXCJcIikgcGFzcyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5lbC5pbm5lckhUTUw9PXZhbHVlK1wiXCIpIHBhc3MgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgfVxufSk7IiwiLy9XaHkgZG9lcyB1bmRlcnNjb3JlIHdvcmsgaGVyZT9cblxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcImVuYWJsZVwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsdHJ1ZSk7XG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIixcIlwiKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpIT12YWx1ZTtcbiAgICB9XG59KTtcbiIsIi8vV2h5IGRvZXMgdW5kZXJzY29yZSB3b3JrIGhlcmU/XG5cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJkaXNhYmxlXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpPT12YWx1ZTtcbiAgICB9XG59KTtcbiIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJocmVmXCIsXG4gICBcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSB0aGlzLiRlbC5hdHRyKFwiaHJlZlwiLHRoaXMucmVzdWx0KTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgICAgICAgICAgYS5jbGFzc0xpc3QuYWRkKFwid3JhcHBlci1hXCIpXG4gICAgICAgICAgICBhLnNldEF0dHJpYnV0ZShcImhyZWZcIix0aGlzLnJlc3VsdCk7XG4gICAgICAgICAgICB0aGlzLndyYXBwZXJBID0gYTtcbiAgICAgICAgICAgIHRoaXMuZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQodGhpcy53cmFwcGVyQSx0aGlzLmVsKVxuICAgICAgICAgICAgLy9jYW4ndCBzaW1wbHkgdXNlIHRoaXMuJGVsLndyYXAoYSk7XG4gICAgICAgICAgICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTcwNzMyOC93cmFwLW9uZS1lbGVtZW50LXdpdGgtYW5vdGhlci1yZXRhaW5pbmctcmVmZXJlbmNlLXRvLXdyYXBwZXJcbiAgICAgICAgICAgIHRoaXMud3JhcHBlckEuYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93LndyYXBwZXJBID0gdGhpcy53cmFwcGVyQTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSAkKHRoaXMuZWwpLmF0dHIoXCJocmVmXCIsdGhpcy5yZXN1bHQpXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy53cmFwcGVyQS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIsdGhpcy5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgaWYgKHRoaXMuJGVsLnByb3AoXCJ0YWdOYW1lXCIpPT1cIkFcIikgcmV0dXJuICQodGhpcy5lbCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucGFyZW50KCkucHJvcChcInRhZ05hbWVcIik9PVwiQVwiICYmICQodGhpcy5lbCkucGFyZW50KCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIH1cbiAgICB9XG59KTsiLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiYWJzdHJhY3RzdWJ2aWV3XCIsXG4gICAgX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgYXJncyA9IHRoaXMudmFsLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgdGhpcy5zdWJWaWV3TmFtZSA9IGFyZ3NbMF07XG4gICAgICAgICBpZiAoYXJnc1sxXSl7XG4gICAgICAgICAgICB0aGlzLnN1Yk1vZGVsTmFtZSA9IGFyZ3NbMV07XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSB0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpOyAvL2NoYW5nZWQgZnJvbSBzdWJNb2RlbE5hbWUuXG4gICAgICAgICAgICBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCkgdGhpcy5zdWJNb2RlbCA9IG1vZGVsO1xuICAgICAgICAgICAgZWxzZSBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Db2xsZWN0aW9uKSB0aGlzLnN1YkNvbGxlY3Rpb24gPSBtb2RlbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCksKG1vZGVsIGluc3RhbmNlb2YgQmFja2JvbmUuQ29sbGVjdGlvbiksdGhpcy5zdWJDb2xsZWN0aW9uKVxuICAgICAgICAgICAgLy9kZWJ1Z2dlcjtcbiAgICAgICAgIH1cbiAgICB9LFxuICAgIF9pbml0aWFsaXplQ2hpbGRNYXBwaW5nczpmdW5jdGlvbigpe1xuICAgICAgICAvL1RoZSBKU09OIG9iamVjdCB0byBwYXNzIGFzIFwibWFwcGluZ3NcIiB0byB0aGUgc3VidmlldyBvciB0aGUgaXRlbSBpbiB0aGUgc3ViQ29sbGVjdGlvbi5cbiAgICAgICAgIC8vRG8gbm90IHNob3J0ZW4gdG8gdmlldy5nZXQuIHZpZXcuZ2V0IGdldHMgZnJvbSB0aGUgdmlld01vZGVsIHdoaWNoIGNvbnRhaW5zIHByb3BzIGFuZCB2YWx1ZXMuLi5ub3QgdmlldyBwcm9wcyBhbmQgYXBwIHByb3BzXG4gICAgICAgIHRoaXMuY2hpbGRNYXBwaW5ncyA9IHRoaXMudmlldy5tYXBwaW5ncyAmJiB0aGlzLnZpZXcubWFwcGluZ3NbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgfSxcbiAgICBfaW5pdGlhbGl6ZU92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaDpmdW5jdGlvbigpe1xuICAgICAgICAvL05vdCBzaG9ydGVuZWQgdG8gdmlldy5nZXQgYmVjYXVzZSBJJ20gbm90IHN1cmUgaWYgaXQgaXMgdXNlZnVsIHRvIGRvIHNvLlxuICAgICAgICAvL3ZpZXcuZ2V0IGdldHMgdGhlIGFwcCB2YWx1ZSBtYXBwZWQgdG8gdGhlIGRlZmF1bHQgdmFsdWUsIGFuZCBpZiBub3QgdGhlbiBpdCBnZXRzIHRoZSBkZWZhdWx0IHZhbHVlLlxuICAgICAgICAvL0kgdGhpbmsgeW91J3JlIGp1c3Qgb3ZlcnJpZGluZyBkZWZhdWx0cyB3aXRoIGRlZmF1bHRzLCBhbmQgbm90aGluZyBmYW5jaWVyIHRoYW4gdGhhdC5cbiAgICAgICAgLy90aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCA9IHRoaXMudmlldy5kZWZhdWx0cyAmJiB0aGlzLnZpZXcuZGVmYXVsdHNbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgICAgIC8vTmV2ZXJtaW5kIGl0IGlzIHVzZWZ1bCB0byB1c2UgLmdldCBiZWNhdXNlIGlmIHRoZXJlIGFyZSBuZXN0ZWQgbmVzdGVkIHZpZXdzLCB5b3UgY2FuJ3QganVzdCBnbyB0byB0aGUgZGVmYXVsdHMgb2YgdGhhdCB2aWV3LiBUaGV5IG1pZ2h0IGJlIG92ZXJyaWRkZW4uXG5cbiAgICAgICAgdGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2ggPSB0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpO1xuICAgIH0sXG5cblxuXG4gICAgX2luaXRpYWxpemVDaGlsZFZpZXdzOmZ1bmN0aW9uKCl7XG5cbiAgICB9XG59KSIsIi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuaW1wb3J0IEFic3RyYWN0U3VidmlldyBmcm9tIFwiLi9hYnN0cmFjdC1zdWJ2aWV3XCJcbmV4cG9ydCBkZWZhdWx0IEFic3RyYWN0U3Vidmlldy5leHRlbmQoe1xuICAgIG5hbWU6XCJtYXBcIixcbiAgICBfaW5pdGlhbGl6ZUNoaWxkVmlld3M6ZnVuY3Rpb24oKXtcblxuXG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJhZGRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJBZGQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZXNldFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclJlc2V0KCk7XG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZW1vdmVcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJSZW1vdmUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJzb3J0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyU29ydCgpOyAgICAgICAgXG4gICAgICAgIH0pO1xuXG5cblxuICAgICAgICAvL01hcCBtb2RlbHMgdG8gY2hpbGRWaWV3IGluc3RhbmNlcyB3aXRoIHRoZWlyIG1hcHBpbmdzXG4gICAgICAgIHRoaXMuQ2hpbGRWaWV3ID0gdGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgICAgIHRoaXMuY2hpbGRWaWV3T3B0aW9ucyA9IHtcbiAgICAgICAgICAgIG1hcHBpbmdzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgdGFnTmFtZTp0aGlzLnZpZXcuY2hpbGRWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXS5wcm90b3R5cGUudGFnTmFtZSB8fCBcInN1Yml0ZW1cIixcbiAgICAgICAgICAgIG92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaDp0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaFxuICAgICAgICB9O1xuXG5cbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzID0gdGhpcy5zdWJDb2xsZWN0aW9uLm1hcChmdW5jdGlvbihjaGlsZE1vZGVsLGkpe1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgY2hpbGRWaWV3T3B0aW9ucyA9IF8uZXh0ZW5kKHt9LHRoaXMuY2hpbGRWaWV3T3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgbW9kZWw6Y2hpbGRNb2RlbCxcbiAgICAgICAgICAgICAgICBpbmRleDppLFxuICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgb3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoOnRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoICYmIHRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoLm1vZGVsc1tpXSAmJiB0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaC5tb2RlbHNbaV0uYXR0cmlidXRlcyxcbiAgICAgICAgICAgICAgICAvL0p1c3QgYWRkZWQgY2hlY2sgZm9yIHRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoLm1vZGVsc1tpXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBjaGlsZHZpZXcgPSBuZXcgdGhpcy5DaGlsZFZpZXcoY2hpbGRWaWV3T3B0aW9ucyk7XG4gICAgICAgICAgICAvL2NoaWxkdmlldy5fc2V0QXR0cmlidXRlcyhfLmV4dGVuZCh7fSwgXy5yZXN1bHQoY2hpbGR2aWV3LCAnYXR0cmlidXRlcycpKSk7XG4gICAgICAgICAgICByZXR1cm4gY2hpbGR2aWV3O1xuICAgICAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgfSxcbiAgICBjaGlsZEluaXQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUJhY2tib25lT2JqZWN0KCk7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVDaGlsZE1hcHBpbmdzKCk7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVPdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2goKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkVmlld3MoKTtcblxuICAgICAgICBcbiAgICAgIFxuXG4gICAgICAgIFxuICAgICAgICBcblxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgIFxuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgodGhpcy5zdWJWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyICRjaGlsZHJlbiA9ICQoKTtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAkY2hpbGRyZW4gPSAkY2hpbGRyZW4uYWRkKGNoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICBjaGlsZFZpZXcuaW5kZXggPSBpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIGlmICgkY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgoJGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkVmlldy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gJGNoaWxkcmVuLnBhcmVudCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkY2hpbGRyZW5cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyQWRkOmZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IFtdO1xuICAgICAgICB0aGlzLnN1YkNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihtb2RlbCxpKXtcbiAgICAgICAgICAgIHZhciBleGlzdGluZ0NoaWxkVmlldyA9IHRoaXMuY2hpbGRWaWV3cy5maWx0ZXIoZnVuY3Rpb24oY2hpbGRWaWV3KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRWaWV3Lm1vZGVsID09IG1vZGVsXG4gICAgICAgICAgICB9KVswXTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ0NoaWxkVmlldykge1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goZXhpc3RpbmdDaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICAgICAgLy92YXIgYXR0cmlidXRlcyA9IF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChleGlzdGluZ0NoaWxkVmlldywgJ2F0dHJpYnV0ZXMnKSlcbiAgICAgICAgICAgICAgICAvL2V4aXN0aW5nQ2hpbGRWaWV3Ll9zZXRBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld0NoaWxkVmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyh7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsOm1vZGVsLFxuICAgICAgICAgICAgICAgICAgICBtYXBwaW5nczp0aGlzLmNoaWxkTWFwcGluZ3MsXG4gICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOnRoaXMudmlldy5nZXQodGhpcy52YWwuc3BsaXQoXCI6XCIpWzBdKVtpXVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnB1c2gobmV3Q2hpbGRWaWV3KTtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKG5ld0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKXtcbiAgICAgICAgICAgIHRoaXMuJHBhcmVudC5hcHBlbmQoY2hpbGQpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkKGNoaWxkcmVuKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIH0pXG5cbiAgICB9LFxuICAgIHJlbmRlclJlc2V0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgIH0sXG4gICAgcmVuZGVyUmVtb3ZlOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGNoaWxkcmVuLmxhc3QoKS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnNwbGljZSgtMSwxKTtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSB0aGlzLiRwYXJlbnQuY2hpbGRyZW4oKTtcbiAgICB9LFxuICAgIHJlbmRlclNvcnQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgIC8vRG9uJ3QgbmVlZCB0aGlzIChub3cpLiBNb2RlbHMgd2lsbCBhbHJlYWR5IGJlIHNvcnRlZCBvbiBhZGQgd2l0aCBjb2xsZWN0aW9uLmNvbXBhcmF0b3IgPSB4eHg7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vdGhpcy52aWV3IGlzIGluc3RhbmNlIG9mIHRoZSB2aWV3IHRoYXQgY29udGFpbnMgdGhlIHN1YnZpZXcgZGlyZWN0aXZlLlxuICAgICAgICAvL3RoaXMuc3ViVmlldyBpcyBpbnN0YW5jZSBvZiB0aGUgc3Vidmlld1xuICAgICAgICAvL3RoaXMgaXMgdGhlIGRpcmVjdGl2ZS5cblxuICAgICAgICBpZiAodGhpcy5zdWJWaWV3KXtcbiAgICAgICAgICAgIC8vd2h5IHBhcmVudE5vZGU/XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aWV3LmVsLmNvbnRhaW5zKHRoaXMuc3ViVmlldy5lbC5wYXJlbnROb2RlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyIHBhc3MgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGVsID0gdGhpcy52aWV3LmVsXG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbi5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCFlbC5jb250YWlucyh0aGlzKSkgcGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbn0pIiwiLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJvcHRpb25hbFwiLFxuICAgIFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkuaGlkZSgpXG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5jc3MoXCJkaXNwbGF5XCIsXCJcIik7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCkgJCh0aGlzLmVsKS5oaWRlKClcbiAgICAgICAgZWxzZSAkKHRoaXMuZWwpLmNzcyhcImRpc3BsYXlcIixcIlwiKTtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICBpZiAoIWRvY3VtZW50LmJvZHkuY29udGFpbnModGhpcy5lbCkpIHRocm93IEVycm9yKFwiZWxlbWVudCBoYXMgdG8gYmUgaW4gdGhlIERPTSBpbiBvcmRlciB0byB0ZXN0XCIpXG4gICAgICAgIHJldHVybiAkKHRoaXMuZWwpLmlzKFwiOnZpc2libGVcIik9PXZhbHVlO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcIm9wdGlvbmFsd3JhcFwiLFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICBEaXJlY3RpdmUucHJvdG90eXBlLmNoaWxkSW5pdC5jYWxsKHRoaXMsYXJndW1lbnRzKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMud3JhcHBlciA9IHRoaXMuZWw7XG4gICAgICAgIHRoaXMuY2hpbGROb2RlcyA9IFtdLnNsaWNlLmNhbGwodGhpcy5lbC5jaGlsZE5vZGVzLCAwKTtcbiAgICAgICAgXG4gICAgfSxcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuY2hpbGROb2RlcykudW53cmFwKCk7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCl7XG4gICAgICAgICAgICAkKHRoaXMuY2hpbGROb2RlcykudW53cmFwKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLmNoaWxkTm9kZXNbMF0pKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmlyc3QgY2hpbGQgaGFzIHRvIGJlIGluIERPTVwiKTtcbiAgICAgICAgICAgICAgICAvL3NvbHV0aW9uOiBhZGQgYSBkdW1teSB0ZXh0IG5vZGUgYXQgYmVnaW5uaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLndyYXBwZXIpKXtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkTm9kZXNbMF0ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy53cmFwcGVyLHRoaXMuY2hpbGROb2Rlc1swXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IodmFyIGk9MDtpPHRoaXMuY2hpbGROb2Rlcy5sZW5ndGg7aSsrKXtcbiAgICAgICAgICAgICAgICB0aGlzLndyYXBwZXIuYXBwZW5kQ2hpbGQodGhpcy5jaGlsZE5vZGVzW2ldKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcblxuXG4gICAgICAgIHJldHVybiAodGhpcy5jaGlsZE5vZGVzWzBdLnBhcmVudE5vZGU9PXRoaXMud3JhcHBlcikgPT0gdmFsdWU7XG5cblxuICAgICAgXG4gICAgfVxufSkiLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwic3JjXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kZWwuYXR0cihcInNyY1wiLHRoaXMucmVzdWx0KTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLiRlbC5hdHRyKFwic3JjXCIsdGhpcy5yZXN1bHQpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHJldHVybiB0aGlzLiRlbC5hdHRyKFwic3JjXCIpPT09dmFsdWU7XG4gICAgfVxufSk7IiwiLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5pbXBvcnQgQWJzdHJhY3RTdWJ2aWV3IGZyb20gXCIuL2Fic3RyYWN0LXN1YnZpZXdcIlxuZXhwb3J0IGRlZmF1bHQgQWJzdHJhY3RTdWJ2aWV3LmV4dGVuZCh7XG4gICAgbmFtZTpcInN1YnZpZXdcIixcbiAgICBfaW5pdGlhbGl6ZUNoaWxkVmlld3M6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXS5wcm90b3R5cGUgaW5zdGFuY2VvZiBCYWNrYm9uZS5WaWV3KSB0aGlzLkNoaWxkQ29uc3RydWN0b3IgPSB0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgICAgIGVsc2UgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLyouY2FsbCh0aGlzLnZpZXcpOyovXG5cbiAgICAgICAgIHZhciBvcHRpb25zID0ge307XG4gICAgICAgICAgIFxuICAgICAgICBpZiAodGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2gpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7b3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoOnRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNofSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5jaGlsZE1hcHBpbmdzKXtcbiAgICAgICAgICAgIF8uZXh0ZW5kKG9wdGlvbnMse1xuICAgICAgICAgICAgICAgIG1hcHBpbmdzOnRoaXMuY2hpbGRNYXBwaW5nc1xuICAgICAgICAgICAgICAgIC8vLGVsOnRoaXMuZWwgVGhlIGVsIG9mIHRoZSBkaXJlY3RpdmUgc2hvdWxkIGJlbG9uZyB0byB0aGUgZGlyZWN0aXZlIGJ1dCBub3QgdGhlIHN1YnZpZXcgaXRzZWxmXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgc3ViTW9kZWwgPSB0aGlzLnN1Yk1vZGVsIHx8IHRoaXMudmlldy5tb2RlbDtcbiAgICAgICAgaWYgKHN1Yk1vZGVsKXtcbiAgICAgICAgICAgIF8uZXh0ZW5kKG9wdGlvbnMse21vZGVsOnN1Yk1vZGVsfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuc3ViQ29sbGVjdGlvbil7XG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcgPSBuZXcgdGhpcy5DaGlsZENvbnN0cnVjdG9yKG9wdGlvbnMpO1xuICAgICAgICAgICAgdmFyIGNsYXNzZXMgPSBfLnJlc3VsdCh0aGlzLnN1YlZpZXcsXCJjbGFzc05hbWVcIilcbiAgICAgICAgICAgIGlmIChjbGFzc2VzKXtcbiAgICAgICAgICAgICAgICBjbGFzc2VzLnNwbGl0KFwiIFwiKS5mb3JFYWNoKGZ1bmN0aW9uKGNsKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdWJWaWV3LmVsLmNsYXNzTGlzdC5hZGQoY2wpXG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBfLnJlc3VsdCh0aGlzLnN1YlZpZXcsXCJhdHRyaWJ1dGVzXCIpO1xuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgICAgIF8uZWFjaChhdHRyaWJ1dGVzLGZ1bmN0aW9uKHZhbCxuYW1lKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdWJWaWV3LmVsLnNldEF0dHJpYnV0ZShuYW1lLHZhbCkgICAgXG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcucGFyZW50ID0gdGhpcy52aWV3O1xuICAgICAgICAgICAgdGhpcy5zdWJWaWV3LnBhcmVudERpcmVjdGl2ZSA9IHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zU2VudFRvU3ViVmlldyA9IG9wdGlvbnM7XG4gICAgfSxcbiAgICBjaGlsZEluaXQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy90aGlzLnZhbCwgdGhpcy52aWV3XG5cbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUJhY2tib25lT2JqZWN0KCk7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVDaGlsZE1hcHBpbmdzKCk7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVPdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2goKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkVmlld3MoKTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgXG4gICAgICBcblxuICAgICAgICBpZiAodGhpcy5zdWJDb2xsZWN0aW9uKXsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJhZGRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckFkZCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZXNldFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyUmVzZXQoKTtcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZW1vdmVcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJzb3J0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJTb3J0KCk7ICAgICAgICBcbiAgICAgICAgICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgICAgICAgICAvL01hcCBtb2RlbHMgdG8gY2hpbGRWaWV3IGluc3RhbmNlcyB3aXRoIHRoZWlyIG1hcHBpbmdzXG4gICAgICAgICAgICAgICAgdGhpcy5DaGlsZFZpZXcgPSB0aGlzLnZpZXcuY2hpbGRWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld09wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcHBpbmdzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIHRhZ05hbWU6dGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlLnRhZ05hbWUgfHwgXCJzdWJpdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgIG92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaDp0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzID0gdGhpcy5zdWJDb2xsZWN0aW9uLm1hcChmdW5jdGlvbihjaGlsZE1vZGVsLGkpe1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkVmlld09wdGlvbnMgPSBfLmV4dGVuZCh7fSx0aGlzLmNoaWxkVmlld09wdGlvbnMse1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6Y2hpbGRNb2RlbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0SW5kZXg6dGhpcy5zdWJDb2xsZWN0aW9uLmxlbmd0aCAtIGkgLSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoOnRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoICYmIHRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoLm1vZGVsc1tpXSAmJiB0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaC5tb2RlbHNbaV0uYXR0cmlidXRlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vSnVzdCBhZGRlZCBjaGVjayBmb3IgdGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2gubW9kZWxzW2ldXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkdmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyhjaGlsZFZpZXdPcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgLy9jaGlsZHZpZXcuX3NldEF0dHJpYnV0ZXMoXy5leHRlbmQoe30sIF8ucmVzdWx0KGNoaWxkdmlldywgJ2F0dHJpYnV0ZXMnKSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGR2aWV3O1xuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG5cblxuICAgICAgICAgICAgICAgIFxuXG5cblxuICAgICAgICB9XG5cbiAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuXG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIGlmICh0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlIGluc3RhbmNlb2YgQmFja2JvbmUuVmlldykgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICAgICAgZWxzZSB0aGlzLkNoaWxkQ29uc3RydWN0b3IgPSB0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0vKi5jYWxsKHRoaXMudmlldyk7Ki9cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIHZhciBvcHRpb25zID0ge307XG4gICAgICAgICAgIFxuICAgICAgICBpZiAodGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2gpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7b3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoOnRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNofSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5jaGlsZE1hcHBpbmdzKXtcbiAgICAgICAgICAgIF8uZXh0ZW5kKG9wdGlvbnMse1xuICAgICAgICAgICAgICAgIG1hcHBpbmdzOnRoaXMuY2hpbGRNYXBwaW5nc1xuICAgICAgICAgICAgICAgIC8vLGVsOnRoaXMuZWwgVGhlIGVsIG9mIHRoZSBkaXJlY3RpdmUgc2hvdWxkIGJlbG9uZyB0byB0aGUgZGlyZWN0aXZlIGJ1dCBub3QgdGhlIHN1YnZpZXcgaXRzZWxmXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgc3ViTW9kZWwgPSB0aGlzLnN1Yk1vZGVsIHx8IHRoaXMudmlldy5tb2RlbDtcbiAgICAgICAgaWYgKHN1Yk1vZGVsKXtcbiAgICAgICAgICAgIF8uZXh0ZW5kKG9wdGlvbnMse21vZGVsOnN1Yk1vZGVsfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuc3ViQ29sbGVjdGlvbil7XG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcgPSBuZXcgdGhpcy5DaGlsZENvbnN0cnVjdG9yKG9wdGlvbnMpO1xuICAgICAgICAgICAgdmFyIGNsYXNzZXMgPSBfLnJlc3VsdCh0aGlzLnN1YlZpZXcsXCJjbGFzc05hbWVcIilcbiAgICAgICAgICAgIGlmIChjbGFzc2VzKXtcbiAgICAgICAgICAgICAgICBjbGFzc2VzLnNwbGl0KFwiIFwiKS5mb3JFYWNoKGZ1bmN0aW9uKGNsKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdWJWaWV3LmVsLmNsYXNzTGlzdC5hZGQoY2wpXG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBfLnJlc3VsdCh0aGlzLnN1YlZpZXcsXCJhdHRyaWJ1dGVzXCIpO1xuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgICAgIF8uZWFjaChhdHRyaWJ1dGVzLGZ1bmN0aW9uKHZhbCxuYW1lKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdWJWaWV3LmVsLnNldEF0dHJpYnV0ZShuYW1lLHZhbCkgICAgXG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcucGFyZW50ID0gdGhpcy52aWV3O1xuICAgICAgICAgICAgdGhpcy5zdWJWaWV3LnBhcmVudERpcmVjdGl2ZSA9IHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zU2VudFRvU3ViVmlldyA9IG9wdGlvbnM7XG4gICAgfSxcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMuc3ViQ29sbGVjdGlvbil7XG4gICAgICAgICAgICB0aGlzLiRlbC5yZXBsYWNlV2l0aCh0aGlzLnN1YlZpZXcuZWwpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB2YXIgJGNoaWxkcmVuID0gJCgpO1xuICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgICAgICRjaGlsZHJlbiA9ICRjaGlsZHJlbi5hZGQoY2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgICAgIGNoaWxkVmlldy5pbmRleCA9IGk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgaWYgKCRjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRlbC5yZXBsYWNlV2l0aCgkY2hpbGRyZW4pO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aGlzLiRwYXJlbnQgPSAkY2hpbGRyZW4ucGFyZW50KClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gdGhpcy4kZWwucGFyZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbiA9ICRjaGlsZHJlblxuICAgICAgICB9XG4gICAgfSxcbiAgICByZW5kZXJBZGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gW107XG4gICAgICAgIHRoaXMuc3ViQ29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKG1vZGVsLGkpe1xuICAgICAgICAgICAgdmFyIGV4aXN0aW5nQ2hpbGRWaWV3ID0gdGhpcy5jaGlsZFZpZXdzLmZpbHRlcihmdW5jdGlvbihjaGlsZFZpZXcpe1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZFZpZXcubW9kZWwgPT0gbW9kZWxcbiAgICAgICAgICAgIH0pWzBdO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nQ2hpbGRWaWV3KSB7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaChleGlzdGluZ0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICAvL3ZhciBhdHRyaWJ1dGVzID0gXy5leHRlbmQoe30sIF8ucmVzdWx0KGV4aXN0aW5nQ2hpbGRWaWV3LCAnYXR0cmlidXRlcycpKVxuICAgICAgICAgICAgICAgIC8vZXhpc3RpbmdDaGlsZFZpZXcuX3NldEF0dHJpYnV0ZXMoYXR0cmlidXRlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3Q2hpbGRWaWV3ID0gbmV3IHRoaXMuQ2hpbGRWaWV3KHtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWw6bW9kZWwsXG4gICAgICAgICAgICAgICAgICAgIG1hcHBpbmdzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdEluZGV4OnRoaXMuc3ViQ29sbGVjdGlvbi5sZW5ndGggLSBpIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6dGhpcy52aWV3LmdldCh0aGlzLnZhbC5zcGxpdChcIjpcIilbMF0pW2ldXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MucHVzaChuZXdDaGlsZFZpZXcpO1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2gobmV3Q2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpe1xuICAgICAgICAgICAgdGhpcy4kcGFyZW50LmFwcGVuZChjaGlsZClcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9ICQoY2hpbGRyZW4pXG4gICAgICAgIFxuICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICBjaGlsZFZpZXcuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgfSlcblxuICAgIH0sXG4gICAgcmVuZGVyUmVzZXQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgfSxcbiAgICByZW5kZXJSZW1vdmU6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4ubGFzdCgpLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmNoaWxkVmlld3Muc3BsaWNlKC0xLDEpO1xuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9IHRoaXMuJHBhcmVudC5jaGlsZHJlbigpO1xuICAgIH0sXG4gICAgcmVuZGVyU29ydDpmdW5jdGlvbigpe1xuICAgICAgICBcbiAgICAgICAgLy9Eb24ndCBuZWVkIHRoaXMgKG5vdykuIE1vZGVscyB3aWxsIGFscmVhZHkgYmUgc29ydGVkIG9uIGFkZCB3aXRoIGNvbGxlY3Rpb24uY29tcGFyYXRvciA9IHh4eDtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy90aGlzLnZpZXcgaXMgaW5zdGFuY2Ugb2YgdGhlIHZpZXcgdGhhdCBjb250YWlucyB0aGUgc3VidmlldyBkaXJlY3RpdmUuXG4gICAgICAgIC8vdGhpcy5zdWJWaWV3IGlzIGluc3RhbmNlIG9mIHRoZSBzdWJ2aWV3XG4gICAgICAgIC8vdGhpcyBpcyB0aGUgZGlyZWN0aXZlLlxuXG4gICAgICAgIGlmICh0aGlzLnN1YlZpZXcpe1xuICAgICAgICAgICAgLy93aHkgcGFyZW50Tm9kZT9cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZpZXcuZWwuY29udGFpbnModGhpcy5zdWJWaWV3LmVsLnBhcmVudE5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB2YXIgcGFzcyA9IHRydWU7XG4gICAgICAgICAgICB2YXIgZWwgPSB0aGlzLnZpZXcuZWxcbiAgICAgICAgICAgIHRoaXMuJGNoaWxkcmVuLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoIWVsLmNvbnRhaW5zKHRoaXMpKSBwYXNzID0gZmFsc2U7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICByZXR1cm4gcGFzcztcbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgfVxufSkiLCIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJkYXRhXCIsXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuY29udGVudCA9IHRoaXMudmlldy52aWV3TW9kZWwuZ2V0KHRoaXMudmFsKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnZpZXcudmlld01vZGVsLFwiY2hhbmdlOlwiK3RoaXMudmFsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLmNvbnRlbnQgPSB0aGlzLnZpZXcudmlld01vZGVsLmdldCh0aGlzLnZhbCk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9KVxuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICBfLmVhY2godGhpcy5jb250ZW50LGZ1bmN0aW9uKHZhbCxwcm9wKXtcbiAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWwpKSB2YWwgPSB2YWwuYmluZCh0aGlzLnZpZXcpO1xuICAgICAgICAgICB0aGlzLiRlbC5hdHRyKFwiZGF0YS1cIitwcm9wLHZhbClcbiAgICAgICB9LmJpbmQodGhpcykpXG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICBfLmVhY2godGhpcy5jb250ZW50LGZ1bmN0aW9uKHZhbCxwcm9wKXtcbiAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWwpKSB2YWwgPSB2YWwuYmluZCh0aGlzLnZpZXcpO1xuICAgICAgICAgICB0aGlzLiRlbC5hdHRyKFwiZGF0YS1cIitwcm9wLHZhbClcbiAgICAgICB9LmJpbmQodGhpcykpXG4gICAgfVxufSk7IiwiaW1wb3J0IERpcmVjdGl2ZUNvbnRlbnQgZnJvbSBcIi4vZGlyZWN0aXZlLWNvbnRlbnRcIjtcbmltcG9ydCBEaXJlY3RpdmVFbmFibGUgZnJvbSBcIi4vZGlyZWN0aXZlLWVuYWJsZVwiO1xuaW1wb3J0IERpcmVjdGl2ZURpc2FibGUgZnJvbSBcIi4vZGlyZWN0aXZlLWRpc2FibGVcIjtcbmltcG9ydCBEaXJlY3RpdmVIcmVmIGZyb20gXCIuL2RpcmVjdGl2ZS1ocmVmXCI7XG5pbXBvcnQgRGlyZWN0aXZlTWFwIGZyb20gXCIuL2RpcmVjdGl2ZS1tYXBcIjtcbmltcG9ydCBEaXJlY3RpdmVPcHRpb25hbCBmcm9tIFwiLi9kaXJlY3RpdmUtb3B0aW9uYWxcIjtcbmltcG9ydCBEaXJlY3RpdmVPcHRpb25hbFdyYXAgZnJvbSBcIi4vZGlyZWN0aXZlLW9wdGlvbmFsd3JhcFwiO1xuaW1wb3J0IERpcmVjdGl2ZVNyYyBmcm9tIFwiLi9kaXJlY3RpdmUtc3JjXCI7XG5pbXBvcnQgRGlyZWN0aXZlU3VidmlldyBmcm9tIFwiLi9kaXJlY3RpdmUtc3Vidmlld1wiO1xuaW1wb3J0IERpcmVjdGl2ZURhdGEgZnJvbSBcIi4vZGlyZWN0aXZlLWRhdGFcIjtcblxudmFyIHJlZ2lzdHJ5ID0ge1xuICAgIENvbnRlbnQ6RGlyZWN0aXZlQ29udGVudCxcbiAgICBFbmFibGU6RGlyZWN0aXZlRW5hYmxlLFxuICAgIERpc2FibGU6RGlyZWN0aXZlRGlzYWJsZSxcbiAgICBIcmVmOkRpcmVjdGl2ZUhyZWYsXG4gICAgTWFwOkRpcmVjdGl2ZU1hcCxcbiAgICBPcHRpb25hbDpEaXJlY3RpdmVPcHRpb25hbCxcbiAgICBPcHRpb25hbFdyYXA6RGlyZWN0aXZlT3B0aW9uYWxXcmFwLFxuICAgIFNyYzpEaXJlY3RpdmVTcmMsXG4gICAgU3VidmlldzpEaXJlY3RpdmVTdWJ2aWV3LFxuICAgIERhdGE6RGlyZWN0aXZlRGF0YVxufTtcblxuZXhwb3J0IGRlZmF1bHQgcmVnaXN0cnk7IiwiLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cbi8qaW1wb3J0IF8gZnJvbSBcInVuZGVyc2NvcmVcIjsqL1xuLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbmltcG9ydCBEaXJlY3RpdmVSZWdpc3RyeSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnkuanNcIlxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlLmpzXCJcblxuXG5cbnZhciBiYWNrYm9uZVZpZXdPcHRpb25zID0gWydtb2RlbCcsICdjb2xsZWN0aW9uJywgJ2VsJywgJ2lkJywgJ2F0dHJpYnV0ZXMnLCAnY2xhc3NOYW1lJywgJ3RhZ05hbWUnLCAnZXZlbnRzJ107XG52YXIgYWRkaXRpb25hbFZpZXdPcHRpb25zID0gWydtYXBwaW5ncycsJ3RlbXBsYXRlU3RyaW5nJywnY2hpbGRWaWV3SW1wb3J0cycsJ3N1YlZpZXdJbXBvcnRzJywnaW5kZXgnLCdsYXN0SW5kZXgnLCdvdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2gnXVxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICAgIHRleHROb2Rlc1VuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDczMDMwOS9maW5kLWFsbC10ZXh0LW5vZGVzLWluLWh0bWwtcGFnZVxuICAgICAgICB2YXIgbiwgYT1bXSwgd2Fsaz1kb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKHRoaXMuZWwsTm9kZUZpbHRlci5TSE9XX1RFWFQsbnVsbCxmYWxzZSk7XG4gICAgICAgIHdoaWxlKG49d2Fsay5uZXh0Tm9kZSgpKSBhLnB1c2gobik7XG4gICAgICAgIHJldHVybiBhO1xuICAgICAgICBcbiAgICB9LFxuICAgIGNvbnN0cnVjdG9yOmZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgIC8vZGVidWdnZXI7XG5cbiAgICAgICAgIC8vTWFrZSBvcHRpb25zIGhhc2ggXCJzdHJpY3RcIi4gT25seSBhbGxvdyBjZXJ0YWluIG9wdGlvbnMgdG8gYmUgcGFzc2VkIGluLlxuICAgICAgICBfLmVhY2goXy5kaWZmZXJlbmNlKF8ua2V5cyhvcHRpb25zKSxfLnVuaW9uKGJhY2tib25lVmlld09wdGlvbnMsYWRkaXRpb25hbFZpZXdPcHRpb25zKSksZnVuY3Rpb24ocHJvcCl7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJXYXJuaW5nISBVbmtub3duIHByb3BlcnR5IFwiK3Byb3ApO1xuICAgICAgICB9KVxuXG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuanN0ICYmICF0aGlzLnRlbXBsYXRlU3RyaW5nKSB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbmVlZCBhIHRlbXBsYXRlXCIpO1xuICAgICAgICBpZiAoIXRoaXMuanN0KXtcbiAgICAgICAgICAgIHRoaXMuanN0ID0gXy50ZW1wbGF0ZSh0aGlzLnRlbXBsYXRlU3RyaW5nKVxuICAgICAgICB9XG4gICAgICAgXG4gICAgICAgIF8uZXh0ZW5kKHRoaXMsIF8ucGljayhvcHRpb25zLCBiYWNrYm9uZVZpZXdPcHRpb25zLmNvbmNhdChhZGRpdGlvbmFsVmlld09wdGlvbnMpKSk7XG5cbiAgICAgICAgLy9BZGQgdGhpcyBoZXJlIHNvIHRoYXQgaXQncyBhdmFpbGFibGUgaW4gY2xhc3NOYW1lIGZ1bmN0aW9uXG4gICAgICAgIGlmICghdGhpcy5kZWZhdWx0cykge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIllvdSBuZWVkIGRlZmF1bHRzIGZvciB5b3VyIHZpZXdcIik7XG4gICAgICAgIH1cblxuICAgICAgICBfLmVhY2godGhpcy5kZWZhdWx0cyxmdW5jdGlvbihkZWYpe1xuICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihkZWYpKSBjb25zb2xlLndhcm4oXCJEZWZhdWx0cyBzaG91bGQgdXN1YWxseSBiZSBwcmltaXRpdmUgdmFsdWVzXCIpXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy9kYXRhIGlzIHBhc3NlZCBpbiBvbiBzdWJ2aWV3c1xuICAgICAgICAvLyBjb21lcyBmcm9tIHRoaXMudmlldy52aWV3TW9kZWwuZ2V0KHRoaXMudmFsKTssIFxuICAgICAgICAvL3NvIGlmIHRoZSBkaXJlY3RpdmUgaXMgbm0tc3Vidmlldz1cIk1lbnVcIiwgdGhlbiB0aGlzLmRhdGEgc2hvdWxkIGJlLi4ud2hhdD9cbiAgICAgICAgLy9BaGEhIGRhdGEgaXMgdG8gb3ZlcnJpZGUgZGVmYXVsdCB2YWx1ZXMgZm9yIHN1YnZpZXdzIGJlaW5nIHBhcnQgb2YgYSBwYXJlbnQgdmlldy4gXG4gICAgICAgIC8vQnV0IGl0IGlzIG5vdCBtZWFudCB0byBvdmVycmlkZSBtYXBwaW5ncyBJIGRvbid0IHRoaW5rLlxuICAgICAgICB0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2g7XG5cbiAgICAgICAgdmFyIGF0dHJzID0gXy5leHRlbmQoXy5jbG9uZSh0aGlzLmRlZmF1bHRzKSwob3B0aW9ucyAmJiBvcHRpb25zLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCkgfHwge30pXG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoLGF0dHJzKVxuICAgICAgICB0aGlzLnZpZXdNb2RlbCA9IG5ldyBCYWNrYm9uZS5Nb2RlbChhdHRycyk7XG5cblxuICAgICAgICAvL21hcHBpbmdzIGNvbnRhaW4gbWFwcGluZ3Mgb2YgdmlldyB2YXJpYWJsZXMgdG8gbW9kZWwgdmFyaWFibGVzLlxuICAgICAgICAvL3N0cmluZ3MgYXJlIHJlZmVyZW5jZXMgdG8gbW9kZWwgdmFyaWFibGVzLiBGdW5jdGlvbnMgYXJlIGZvciB3aGVuIGEgdmlldyB2YXJpYWJsZSBkb2VzXG4gICAgICAgIC8vbm90IG1hdGNoIHBlcmZlY3RseSB3aXRoIGEgbW9kZWwgdmFyaWFibGUuIFRoZXNlIGFyZSB1cGRhdGVkIGVhY2ggdGltZSB0aGUgbW9kZWwgY2hhbmdlcy5cbiAgICAgICAgdGhpcy5wcm9wTWFwID0ge307XG4gICAgICAgIHRoaXMuZnVuY3MgPSB7fTtcblxuICAgICAgICBfLmVhY2godGhpcy5tYXBwaW5ncyxmdW5jdGlvbihtb2RlbFZhcix0ZW1wbGF0ZVZhcil7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG1vZGVsVmFyID09IFwic3RyaW5nXCIpIHRoaXMucHJvcE1hcFt0ZW1wbGF0ZVZhcl0gPSBtb2RlbFZhcjtcbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBtb2RlbFZhciA9PSBcImZ1bmN0aW9uXCIpIHRoaXMuZnVuY3NbdGVtcGxhdGVWYXJdID0gbW9kZWxWYXI7XG4gICAgICAgIH0uYmluZCh0aGlzKSk7ICAgICBcblxuICAgICAgICAvL1Byb2JsZW06IGlmIHlvdSB1cGRhdGUgdGhlIG1vZGVsIGl0IHVwZGF0ZXMgZm9yIGV2ZXJ5IHN1YnZpZXcgKG5vdCBlZmZpY2llbnQpLlxuICAgICAgICAvL0FuZCBpdCBkb2VzIG5vdCB1cGRhdGUgZm9yIHN1Ym1vZGVscy4gUGVyaGFwcyB0aGVyZSBhcmUgbWFueSBkaWZmZXJlbnQgc29sdXRpb25zIGZvciB0aGlzLlxuICAgICAgICAvL1lvdSBjYW4gaGF2ZSBlYWNoIHN1Ym1vZGVsIHRyaWdnZXIgY2hhbmdlIGV2ZW50LlxuICAgICAgICBcbiAgICAgICAgLy9XaGVuZXZlciB0aGUgbW9kZWwgY2hhbmdlcywgdXBkYXRlIHRoZSB2aWV3TW9kZWwgYnkgbWFwcGluZyBwcm9wZXJ0aWVzIG9mIHRoZSBtb2RlbCB0byBwcm9wZXJ0aWVzIG9mIHRoZSB2aWV3IChhc3NpZ25lZCBpbiBtYXBwaW5ncylcbiAgICAgICAgLy9BbHNvLCB0aGUgYXR0cmlidXRlcyBjaGFuZ2UuIFRoaXMgY2FuIGJlIGRvbmUgbW9yZSBlbGVnYW50bHlcbiAgICAgICAgaWYgKHRoaXMubW9kZWwpe1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLFwiY2hhbmdlXCIsdGhpcy51cGRhdGVDb250ZXh0T2JqZWN0KTtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCxcImNoYW5nZVwiLGZ1bmN0aW9uKCl7XG5cdFx0XHQgICAgdGhpcy5fc2V0QXR0cmlidXRlcyhfLmV4dGVuZCh7fSwgXy5yZXN1bHQodGhpcywgJ2F0dHJpYnV0ZXMnKSkpO1xuXHRcdCAgICB9KTtcbiAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNvbnRleHRPYmplY3QodGhpcy5tb2RlbCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYXR0cnMgPSB0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzO1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXMpO1xuICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgICAgIGlmIChrZXk9PT1cImRlZmluaXRpb25zXCIgJiYgIXRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXNba2V5XSl7XG4gICAgICAgICAgICAgICAgLy9wcm9ibGVtIGlzIHRoYXQgcHJvcE1hcCAoc2VlbXMgdG8gYmUgbWFwcGluZ3Mgd2l0aCBmdW5jdGlvbnMgZmlsdGVyZWQgb3V0KSBpcyBcbiAgICAgICAgICAgICAgICAvL3tkZWZpbml0aW9uczpcImRlZmluaXRpb25zXCJ9LiBDb21lcyBmcm9tIGFydGljbGVfYXJ0aWNsZS5qc1xuICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICBcblxuXG4gICAgICAgIHRoaXMuX2Vuc3VyZUVsZW1lbnQoKTtcbiAgICAgICAgdGhpcy5idWlsZElubmVySFRNTCgpO1xuICAgICAgICBcblxuXG4gICAgICAgIHRoaXMuaW5pdERpcmVjdGl2ZXMoKTsvL2luaXQgc2ltcGxlIGRpcmVjdGl2ZXMuLi50aGUgb25lcyB0aGF0IGp1c3QgbWFuaXB1bGF0ZSBhbiBlbGVtZW50XG4gICAgICAgIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB0aGlzLmNoaWxkTm9kZXMgPSBbXS5zbGljZS5jYWxsKHRoaXMuZWwuY2hpbGROb2RlcywgMCk7XG5cbiAgICAgICAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSxcbiAgICBcbiAgICBpbml0aWFsaXplOmZ1bmN0aW9uKG9wdGlvbnMpe1xuICAgICAgICAvL2F0dGFjaCBvcHRpb25zIHRvIHZpZXcgKG1vZGVsLCBwcm9wTWFwLCBzdWJWaWV3cywgZXZlbnRzKVxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgXy5leHRlbmQodGhpcyxvcHRpb25zKTtcbiAgICB9LFxuICAgIGdldE1vZGVsQXR0cjpmdW5jdGlvbihhdHRyKXtcbiAgICAgICAgLy9xdWlja2x5IGdyYWIgYSBtb2RlbHMgYXR0cmlidXRlIGJ5IGEgdmlldyB2YXJpYWJsZS4gVXNlZnVsIGluIGNsYXNzbmFtZSBmdW5jdGlvbi5cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLm1hcHBpbmdzW2F0dHJdID09XCJzdHJpbmdcIikgcmV0dXJuIHRoaXMubW9kZWwuZ2V0KHRoaXMubWFwcGluZ3NbYXR0cl0pO1xuICAgICAgICBlbHNlIHJldHVybiB0aGlzLm1hcHBpbmdzW2F0dHJdLmNhbGwodGhpcylcbiAgICB9LFxuICAgIHVwZGF0ZUNvbnRleHRPYmplY3Q6ZnVuY3Rpb24obW9kZWwpe1xuXG4gICAgICAgIFxuICAgICAgICB2YXIgb2JqID0ge31cbiAgICAgICAgXG4gICAgICAgIC8vQ2hhbmdlIHRlbXBsYXRlVmFycy0+bW9kZWxWYXJzIHRvIHRlbXBsYXRlVmFycy0+bW9kZWwuZ2V0KFwibW9kZWxWYXJcIiksIGFuZCBzZXQgb24gdGhlIG1vZGVsXG4gICAgICAgIF8uZXh0ZW5kKG9iaixfLm1hcE9iamVjdCh0aGlzLnByb3BNYXAsZnVuY3Rpb24obW9kZWxWYXIpe1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb2RlbC5nZXQobW9kZWxWYXIpO1xuICAgICAgICB9LmJpbmQodGhpcykpKTtcbiAgICAgICAgXG5cbiAgICAgICAgXy5leHRlbmQob2JqLF8ubWFwT2JqZWN0KHRoaXMuZnVuY3MsZnVuY3Rpb24oZnVuYyl7XG4gICAgICAgICAgICB2YXIgcmV0ID0gZnVuYy5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIC8vZnVuYy5jYWxsIG1ha2VzIGl0IHdvcmsgYnV0IG9ubHkgb25jZVxuICAgICAgICB9LmJpbmQodGhpcykpKVxuICAgICAgICAgICAgICAgIFxuXG4gICAgICAgIFxuICAgICAgICB0aGlzLnZpZXdNb2RlbC5zZXQob2JqKTtcblxuXG4gICAgICAgIFxuICAgIFxuICAgIH0sXG4gICAgYnVpbGRJbm5lckhUTUw6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMuJGVsKSB0aGlzLiRlbC5odG1sKHRoaXMucmVuZGVyZWRUZW1wbGF0ZSgpKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZHVtbXlkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICAgICAgZHVtbXlkaXYuaW5uZXJIVE1MID0gdGhpcy5yZW5kZXJlZFRlbXBsYXRlKCk7XG4gICAgICAgICAgICB3aGlsZShkdW1teWRpdi5jaGlsZE5vZGVzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgdGhpcy5lbC5hcHBlbmRDaGlsZChkdW1teWRpdi5jaGlsZE5vZGVzWzBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vbWF5YmUgbGVzcyBoYWNraXNoIHNvbHV0aW9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzI1MjE0MTEzLzE3NjMyMTdcbiAgICAgICAgfVxuICAgIH0sXG4gICAgaW5pdERpcmVjdGl2ZXM6ZnVuY3Rpb24oKXtcblxuICAgICAgICBcbiAgICAgICAgIC8vSW5pdCBkaXJlY3RpdmVzIGludm9sdmluZyB7e319XG5cbiAgICAgICAgdGhpcy5faW5pdGlhbFRleHROb2RlcyA9IHRoaXMudGV4dE5vZGVzVW5kZXIoKTtcbiAgICAgICAgdGhpcy5fc3ViVmlld0VsZW1lbnRzID0gW107XG4gICAgICAgIHRoaXMuX2luaXRpYWxUZXh0Tm9kZXMuZm9yRWFjaChmdW5jdGlvbihmdWxsVGV4dE5vZGUpe1xuICAgICAgICAgICAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMTMxMTY3MC8xNzYzMjE3IHRleHRDb250ZW50IHNlZW1zIHJpZ2h0XG5cbiAgICAgICAgICAgIHZhciByZSA9IC9cXHtcXHsoLis/KVxcfVxcfS9nO1xuICAgICAgICAgICAgdmFyIG1hdGNoO1xuICAgICAgICAgICAgXG5cblxuICAgICAgICAgICAgdmFyIG1hdGNoZXMgPSBbXTtcbiAgICAgICAgICAgIHdoaWxlICgobWF0Y2ggPSByZS5leGVjKGZ1bGxUZXh0Tm9kZS50ZXh0Q29udGVudCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVzLnB1c2gobWF0Y2gpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBjdXJyZW50VGV4dE5vZGUgPSBmdWxsVGV4dE5vZGU7XG4gICAgICAgICAgICB2YXIgY3VycmVudFN0cmluZyA9IGZ1bGxUZXh0Tm9kZS50ZXh0Q29udGVudDtcbiAgICAgICAgICAgIHZhciBwcmV2Tm9kZXNMZW5ndGggPSAwO1xuXG4gICAgICAgICAgICBtYXRjaGVzLmZvckVhY2goZnVuY3Rpb24obWF0Y2gpe1xuICAgICAgICAgICAgICAgIHZhciB2YXJOb2RlID0gY3VycmVudFRleHROb2RlLnNwbGl0VGV4dChtYXRjaC5pbmRleCAtIHByZXZOb2Rlc0xlbmd0aCk7XG4gICAgICAgICAgICAgICAgdmFyIGVudGlyZU1hdGNoID0gbWF0Y2hbMF1cbiAgICAgICAgICAgICAgICB2YXJOb2RlLm1hdGNoID0gbWF0Y2hbMV07XG4gICAgICAgICAgICAgICAgdGhpcy5fc3ViVmlld0VsZW1lbnRzLnB1c2godmFyTm9kZSk7XG4gICAgICAgICAgICAgICAgY3VycmVudFRleHROb2RlID0gdmFyTm9kZS5zcGxpdFRleHQoZW50aXJlTWF0Y2gubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGN1cnJlbnRTdHJpbmcgPSBjdXJyZW50VGV4dE5vZGUudGV4dENvbnRlbnQ7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcHJldk5vZGVzTGVuZ3RoPW1hdGNoLmluZGV4ICsgZW50aXJlTWF0Y2gubGVuZ3RoOy8vTm90ZTogVGhpcyB3b3JrcyBhY2NpZGVudGFsbHkuIE1pZ2h0IGJlIHdyb25nLlxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAgICBcblxuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB0aGlzLmRpcmVjdGl2ZSA9IHt9O1xuXG4gICAgICAgXG5cblxuICAgICAgICBmb3IgKHZhciBkaXJlY3RpdmVOYW1lIGluIERpcmVjdGl2ZVJlZ2lzdHJ5KXtcbiAgICAgICAgICAgIHZhciBfX3Byb3RvID0gRGlyZWN0aXZlUmVnaXN0cnlbZGlyZWN0aXZlTmFtZV0ucHJvdG90eXBlXG4gICAgICAgICAgICBpZiAoX19wcm90byBpbnN0YW5jZW9mIERpcmVjdGl2ZSl7IC8vYmVjYXVzZSBmb3JlYWNoIHdpbGwgZ2V0IG1vcmUgdGhhbiBqdXN0IG90aGVyIGRpcmVjdGl2ZXNcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IF9fcHJvdG8ubmFtZTtcbiAgICAgICAgICAgICAgICBpZiAobmFtZSE9PVwic3Vidmlld1wiICYmIG5hbWUhPT1cIm1hcFwiKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW1lbnRzID0gKHRoaXMuJGVsKT8kLm1ha2VBcnJheSh0aGlzLiRlbC5maW5kKFwiW25tLVwiK25hbWUrXCJdXCIpKTokLm1ha2VBcnJheSgkKHRoaXMuZWwucXVlcnlTZWxlY3RvckFsbChcIltubS1cIituYW1lK1wiXVwiKSkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtuYW1lXSA9IGVsZW1lbnRzLm1hcChmdW5jdGlvbihlbGVtZW50LGksZWxlbWVudHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vb24gdGhlIHNlY29uZCBnby1hcm91bmQgZm9yIG5tLW1hcCwgZGlyZWN0aXZlTmFtZSBzb21laG93IGlzIGNhbGxlZCBcIlN1YlZpZXdcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGlyZWN0aXZlUmVnaXN0cnlbZGlyZWN0aXZlTmFtZV0oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsOmVsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbDplbGVtZW50LmdldEF0dHJpYnV0ZShcIm5tLVwiK25hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpOyBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtcInN1YnZpZXdcIl0gPSB0aGlzLl9zdWJWaWV3RWxlbWVudHMubWFwKGZ1bmN0aW9uKHN1YlZpZXdFbGVtZW50LGksc3ViVmlld0VsZW1lbnRzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGlyZWN0aXZlUmVnaXN0cnlbXCJTdWJ2aWV3XCJdKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWw6c3ViVmlld0VsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpOyAqL1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uKHN1YlZpZXdFbGVtZW50KXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gc3ViVmlld0VsZW1lbnQubWF0Y2guc3BsaXQoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoPT0xKXtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZGlyZWN0aXZlW1wic3Vidmlld1wiXSkgdGhpcy5kaXJlY3RpdmVbXCJzdWJ2aWV3XCJdID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5kaXJlY3RpdmVbXCJzdWJ2aWV3XCJdLnB1c2gobmV3IERpcmVjdGl2ZVJlZ2lzdHJ5W1wiU3Vidmlld1wiXSh7XG4gICAgICAgICAgICAgICAgICAgIHZpZXc6dGhpcyxcbiAgICAgICAgICAgICAgICAgICAgZWw6c3ViVmlld0VsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIHZhbDpzdWJWaWV3RWxlbWVudC5tYXRjaFxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmRpcmVjdGl2ZVtcIm1hcFwiXSkgdGhpcy5kaXJlY3RpdmVbXCJtYXBcIl0gPSBbXTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtcIm1hcFwiXS5wdXNoKG5ldyBEaXJlY3RpdmVSZWdpc3RyeVtcIk1hcFwiXSh7XG4gICAgICAgICAgICAgICAgICAgIHZpZXc6dGhpcyxcbiAgICAgICAgICAgICAgICAgICAgZWw6c3ViVmlld0VsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIHZhbDpzdWJWaWV3RWxlbWVudC5tYXRjaFxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuXG5cbiAgICAgICBcbiAgICAgICAgLypcbiAgICAgICAgdGhpcy5fc3ViVmlld0VsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24oc3ViVmlld0VsZW1lbnQpe1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBzdWJWaWV3RWxlbWVudC5tYXRjaC5zcGxpdChcIjpcIik7XG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGg9PTEpe1xuICAgICAgICAgICAgICAgIC8vc3VidmlldyB3aXRoIG5vIGNvbnRleHQgb2JqXG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAvL0NoZWNrIGZvciBjb2xsZWN0aW9uIG9yIG1vZGVsIHBhc3NlZC5cbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xuICAgICAgICAgICAgZWxlbWVudC5zdHlsZS5iYWNrZ3JvdW5kPVwieWVsbG93XCI7XG4gICAgICAgICAgICBlbGVtZW50LmlubmVySFRNTCA9IHN1YlZpZXdFbGVtZW50Lm1hdGNoO1xuICAgICAgICAgICAgc3ViVmlld0VsZW1lbnQucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoZWxlbWVudCxzdWJWaWV3RWxlbWVudCk7XG4gICAgICAgIH0pKi9cblxuICAgICAgIFxuXG5cbiAgICAgICAgXG4gICAgfSxcbiAgICByZW5kZXJlZFRlbXBsYXRlOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLmpzdCkge1xuICAgICAgICAgICAgd2luZG93Ll8gPSBfO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuanN0KHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgcmV0dXJuIF8udGVtcGxhdGUodGhpcy50ZW1wbGF0ZVN0cmluZykodGhpcy52aWV3TW9kZWwuYXR0cmlidXRlcylcbiAgICB9LFxuICAgIGRlbGVnYXRlRXZlbnRzOiBmdW5jdGlvbihldmVudHMpIHsvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzEyMTkzMDY5LzE3NjMyMTdcbiAgICAgICAgdmFyIGRlbGVnYXRlRXZlbnRTcGxpdHRlciA9IC9eKFxcUyspXFxzKiguKikkLztcbiAgICAgICAgZXZlbnRzIHx8IChldmVudHMgPSBfLnJlc3VsdCh0aGlzLCAnZXZlbnRzJykpOyAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIGlmICghZXZlbnRzKSByZXR1cm4gdGhpcztcbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBldmVudHMpIHtcbiAgICAgICAgICAgIHZhciBtZXRob2QgPSBldmVudHNba2V5XTtcbiAgICAgICAgICAgIGlmICghXy5pc0Z1bmN0aW9uKG1ldGhvZCkpIG1ldGhvZCA9IHRoaXNbZXZlbnRzW2tleV1dO1xuICAgICAgICAgICAgaWYgKCFtZXRob2QpIHRocm93IG5ldyBFcnJvcignTWV0aG9kIFwiJyArIGV2ZW50c1trZXldICsgJ1wiIGRvZXMgbm90IGV4aXN0Jyk7XG4gICAgICAgICAgICB2YXIgbWF0Y2ggPSBrZXkubWF0Y2goZGVsZWdhdGVFdmVudFNwbGl0dGVyKTtcbiAgICAgICAgICAgIHZhciBldmVudFR5cGVzID0gbWF0Y2hbMV0uc3BsaXQoJywnKSwgc2VsZWN0b3IgPSBtYXRjaFsyXTtcbiAgICAgICAgICAgIG1ldGhvZCA9IF8uYmluZChtZXRob2QsIHRoaXMpO1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgXyhldmVudFR5cGVzKS5lYWNoKGZ1bmN0aW9uKGV2ZW50TmFtZSkge1xuICAgICAgICAgICAgICAgIGV2ZW50TmFtZSArPSAnLmRlbGVnYXRlRXZlbnRzJyArIHNlbGYuY2lkO1xuICAgICAgICAgICAgICAgIGlmIChzZWxlY3RvciA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICBzZWxmLiRlbC5iaW5kKGV2ZW50TmFtZSwgbWV0aG9kKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRlbC5kZWxlZ2F0ZShzZWxlY3RvciwgZXZlbnROYW1lLCBtZXRob2QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgXG4gICAgfSxcblxuXG5cblxuICAgIHRhZ05hbWU6dW5kZWZpbmVkLC8vZG9uJ3Qgd2FudCBhIHRhZ05hbWUgdG8gYmUgZGl2IGJ5IGRlZmF1bHQuIFJhdGhlciwgbWFrZSBpdCBhIGRvY3VtZW50ZnJhZ21lbnQnXG4gICAgc3ViVmlld0ltcG9ydHM6e30sXG4gICAgY2hpbGRWaWV3SW1wb3J0czp7fSxcbiAgICAgIF9lbnN1cmVFbGVtZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvL092ZXJyaWRpbmcgdGhpcyB0byBzdXBwb3J0IGRvY3VtZW50IGZyYWdtZW50c1xuICAgICAgICAgICAgaWYgKCF0aGlzLmVsKSB7XG4gICAgICAgICAgICAgICAgaWYodGhpcy5hdHRyaWJ1dGVzIHx8IHRoaXMuaWQgfHwgdGhpcy5jbGFzc05hbWUgfHwgdGhpcy50YWdOYW1lKXsvL2lmIHlvdSBoYXZlIGFueSBvZiB0aGVzZSBiYWNrYm9uZSBwcm9wZXJ0aWVzLCBkbyBiYWNrYm9uZSBiZWhhdmlvclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJzID0gXy5leHRlbmQoe30sIF8ucmVzdWx0KHRoaXMsICdhdHRyaWJ1dGVzJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaWQpIGF0dHJzLmlkID0gXy5yZXN1bHQodGhpcywgJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jbGFzc05hbWUpIGF0dHJzWydjbGFzcyddID0gXy5yZXN1bHQodGhpcywgJ2NsYXNzTmFtZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KHRoaXMuX2NyZWF0ZUVsZW1lbnQoXy5yZXN1bHQodGhpcywgJ3RhZ05hbWUnKSB8fCAnZGl2JykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2V0QXR0cmlidXRlcyhhdHRycyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7Ly9ob3dldmVyLCBkZWZhdWx0IHRvIHRoaXMuZWwgYmVpbmcgYSBkb2N1bWVudGZyYWdtZW50IChtYWtlcyB0aGlzLmVsIG5hbWVkIGltcHJvcGVybHkgYnV0IHdoYXRldmVyKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVsID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KF8ucmVzdWx0KHRoaXMsICdlbCcpKTtcbiAgICAgICAgICAgIH1cbiAgICB9LFxuICAgIHNldDpmdW5jdGlvbihvYmope1xuICAgICAgICB0aGlzLnZpZXdNb2RlbC5zZXQob2JqKTtcbiAgICB9LFxuICAgIGdldDpmdW5jdGlvbihwcm9wKXtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlld01vZGVsLmdldChwcm9wKVxuICAgIH1cbn0pO1xuIiwiLy9TYW1lIG1vZGVsLCBjb2xsZWN0aW9uIGluIHNhbWUgZmlsZSBmb3Igbm93IGJlY2F1c2UgdGhlc2UgbW9kdWxlcyByZWx5IG9uIGVhY2ggb3RoZXIuXG5cbi8qaW1wb3J0IF8gZnJvbSBcInVuZGVyc2NvcmVcIjsqL1xuLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbmltcG9ydCBNb2RlbCBmcm9tIFwiLi9Nb2RlbFwiO1xuaW1wb3J0IENvbGxlY3Rpb24gZnJvbSBcIi4vQ29sbGVjdGlvblwiO1xuaW1wb3J0IFZpZXcgZnJvbSBcIi4vVmlld1wiO1xuaW1wb3J0IERpcmVjdGl2ZVJlZ2lzdHJ5IGZyb20gXCIuL2RpcmVjdGl2ZS9kaXJlY3RpdmVSZWdpc3RyeVwiO1xuLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cblxudmFyIEZhaml0YSA9IHtNb2RlbCwgQ29sbGVjdGlvbiwgVmlldywgRGlyZWN0aXZlUmVnaXN0cnl9O1xuRmFqaXRhW1wi8J+MrlwiXSA9IFwiMC4wLjBcIjtcblxuaWYgKHR5cGVvZiB3aW5kb3chPT1cInVuZGVmaW5lZFwiKSB3aW5kb3cuRmFqaXRhID0gRmFqaXRhO1xuaWYgKHR5cGVvZiBnbG9iYWwhPT1cInVuZGVmaW5lZFwiKSBnbG9iYWwuRmFqaXRhID0gRmFqaXRhOyJdLCJuYW1lcyI6WyJCYWNrYm9uZSIsIk1vZGVsIiwiZXh0ZW5kIiwib3B0aW9ucyIsIlVSTFNlYXJjaFBhcmFtcyIsInF1ZXJ5Iiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJzdHJ1Y3R1cmUiLCJwYXJlbnRNb2RlbHMiLCJpbml0IiwiYXR0ciIsIl8iLCJpc1N0cmluZyIsInByb3BzIiwic3BsaXQiLCJsZW5ndGgiLCJtb2RlbCIsInNsaWNlIiwiZm9yRWFjaCIsInByb3AiLCJnZXQiLCJwcm90b3R5cGUiLCJhcHBseSIsImFyZ3VtZW50cyIsImlzVW5kZWZpbmVkIiwia2V5IiwidmFsMSIsInZhbDIiLCJzZXQiLCJ2YWwiLCJpIiwibmV3TW9kZWwiLCJGYWppdGEiLCJpc0FycmF5IiwiQ29sbGVjdGlvbiIsInB1c2giLCJsaXN0ZW5UbyIsInRyaWdnZXIiLCJvbiIsIlZpZXciLCJuYW1lIiwiY29uc29sZSIsImVycm9yIiwidmlldyIsImNoaWxkSW5pdCIsImJ1aWxkIiwidXBkYXRlUmVzdWx0Iiwidmlld01vZGVsIiwicmVuZGVyIiwicmVzdWx0IiwiaXNGdW5jdGlvbiIsImNhbGwiLCJEaXJlY3RpdmUiLCIkZWwiLCJlbCIsInNldEF0dHJpYnV0ZSIsImlubmVySFRNTCIsInZhbHVlIiwicGFzcyIsImdldEF0dHJpYnV0ZSIsIiQiLCJhIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiY2xhc3NMaXN0IiwiYWRkIiwid3JhcHBlckEiLCJwYXJlbnROb2RlIiwicmVwbGFjZUNoaWxkIiwiYXBwZW5kQ2hpbGQiLCJwYXJlbnQiLCJhcmdzIiwic3ViVmlld05hbWUiLCJzdWJNb2RlbE5hbWUiLCJzdWJNb2RlbCIsInN1YkNvbGxlY3Rpb24iLCJjaGlsZE1hcHBpbmdzIiwibWFwcGluZ3MiLCJvdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2giLCJBYnN0cmFjdFN1YnZpZXciLCJyZW5kZXJBZGQiLCJyZW5kZXJSZXNldCIsInJlbmRlclJlbW92ZSIsInJlbmRlclNvcnQiLCJDaGlsZFZpZXciLCJjaGlsZFZpZXdJbXBvcnRzIiwiY2hpbGRWaWV3T3B0aW9ucyIsInRhZ05hbWUiLCJjaGlsZFZpZXdzIiwibWFwIiwiY2hpbGRNb2RlbCIsIm1vZGVscyIsImF0dHJpYnV0ZXMiLCJjaGlsZHZpZXciLCJiaW5kIiwiX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdCIsIl9pbml0aWFsaXplQ2hpbGRNYXBwaW5ncyIsIl9pbml0aWFsaXplT3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoIiwiX2luaXRpYWxpemVDaGlsZFZpZXdzIiwicmVwbGFjZVdpdGgiLCJzdWJWaWV3IiwiJGNoaWxkcmVuIiwiY2hpbGRWaWV3IiwiaW5kZXgiLCJkZWxlZ2F0ZUV2ZW50cyIsIiRwYXJlbnQiLCJjaGlsZHJlbiIsImVhY2giLCJleGlzdGluZ0NoaWxkVmlldyIsImZpbHRlciIsIm5ld0NoaWxkVmlldyIsImVtcHR5IiwiY2hpbGQiLCJhcHBlbmQiLCJsYXN0IiwicmVtb3ZlIiwic3BsaWNlIiwiY29udGFpbnMiLCJoaWRlIiwiY3NzIiwiYm9keSIsIkVycm9yIiwiaXMiLCJ3cmFwcGVyIiwiY2hpbGROb2RlcyIsInVud3JhcCIsImluc2VydEJlZm9yZSIsInN1YlZpZXdJbXBvcnRzIiwiQ2hpbGRDb25zdHJ1Y3RvciIsImNsYXNzZXMiLCJjbCIsInBhcmVudERpcmVjdGl2ZSIsIm9wdGlvbnNTZW50VG9TdWJWaWV3IiwiY29udGVudCIsInJlZ2lzdHJ5IiwiRGlyZWN0aXZlQ29udGVudCIsIkRpcmVjdGl2ZUVuYWJsZSIsIkRpcmVjdGl2ZURpc2FibGUiLCJEaXJlY3RpdmVIcmVmIiwiRGlyZWN0aXZlTWFwIiwiRGlyZWN0aXZlT3B0aW9uYWwiLCJEaXJlY3RpdmVPcHRpb25hbFdyYXAiLCJEaXJlY3RpdmVTcmMiLCJEaXJlY3RpdmVTdWJ2aWV3IiwiRGlyZWN0aXZlRGF0YSIsImJhY2tib25lVmlld09wdGlvbnMiLCJhZGRpdGlvbmFsVmlld09wdGlvbnMiLCJuIiwid2FsayIsImNyZWF0ZVRyZWVXYWxrZXIiLCJOb2RlRmlsdGVyIiwiU0hPV19URVhUIiwibmV4dE5vZGUiLCJkaWZmZXJlbmNlIiwia2V5cyIsInVuaW9uIiwid2FybiIsImpzdCIsInRlbXBsYXRlU3RyaW5nIiwidGVtcGxhdGUiLCJwaWNrIiwiY29uY2F0IiwiZGVmYXVsdHMiLCJkZWYiLCJhdHRycyIsImNsb25lIiwibG9nIiwicHJvcE1hcCIsImZ1bmNzIiwibW9kZWxWYXIiLCJ0ZW1wbGF0ZVZhciIsInVwZGF0ZUNvbnRleHRPYmplY3QiLCJfc2V0QXR0cmlidXRlcyIsIk9iamVjdCIsIl9lbnN1cmVFbGVtZW50IiwiYnVpbGRJbm5lckhUTUwiLCJpbml0RGlyZWN0aXZlcyIsImluaXRpYWxpemUiLCJvYmoiLCJtYXBPYmplY3QiLCJmdW5jIiwicmV0IiwiaHRtbCIsInJlbmRlcmVkVGVtcGxhdGUiLCJkdW1teWRpdiIsIl9pbml0aWFsVGV4dE5vZGVzIiwidGV4dE5vZGVzVW5kZXIiLCJfc3ViVmlld0VsZW1lbnRzIiwiZnVsbFRleHROb2RlIiwicmUiLCJtYXRjaCIsIm1hdGNoZXMiLCJleGVjIiwidGV4dENvbnRlbnQiLCJjdXJyZW50VGV4dE5vZGUiLCJjdXJyZW50U3RyaW5nIiwicHJldk5vZGVzTGVuZ3RoIiwidmFyTm9kZSIsInNwbGl0VGV4dCIsImVudGlyZU1hdGNoIiwiZGlyZWN0aXZlIiwiZGlyZWN0aXZlTmFtZSIsIkRpcmVjdGl2ZVJlZ2lzdHJ5IiwiX19wcm90byIsImVsZW1lbnRzIiwibWFrZUFycmF5IiwiZmluZCIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJlbGVtZW50Iiwic3ViVmlld0VsZW1lbnQiLCJldmVudHMiLCJkZWxlZ2F0ZUV2ZW50U3BsaXR0ZXIiLCJ1bmRlbGVnYXRlRXZlbnRzIiwibWV0aG9kIiwiZXZlbnRUeXBlcyIsInNlbGVjdG9yIiwic2VsZiIsImV2ZW50TmFtZSIsImNpZCIsImRlbGVnYXRlIiwidW5kZWZpbmVkIiwiaWQiLCJjbGFzc05hbWUiLCJzZXRFbGVtZW50IiwiX2NyZWF0ZUVsZW1lbnQiLCJjcmVhdGVEb2N1bWVudEZyYWdtZW50IiwiZ2xvYmFsIl0sIm1hcHBpbmdzIjoiOzs7QUFBQTs7O0FBSUEsWUFBZUEsU0FBU0MsS0FBVCxDQUFlQyxNQUFmLENBQXNCOztjQUV4QixvQkFBU0MsT0FBVCxFQUFpQjtRQUNyQixPQUFPQyxlQUFQLEtBQTJCLFdBQWhDLEVBQTZDO1dBQ3RDQyxLQUFMLEdBQWEsSUFBSUQsZUFBSixDQUFvQkUsT0FBT0MsUUFBUCxDQUFnQkMsTUFBcEMsQ0FBYjs7OztTQU1HQyxTQUFMLEdBQWlCLEVBQWpCOztTQUVLQyxZQUFMLEdBQW9CLEVBQXBCO1NBQ0tDLElBQUw7R0FiaUM7UUFlOUIsZ0JBQVUsRUFmb0I7O09BaUIvQixhQUFTQyxJQUFULEVBQWM7Ozs7UUFJWkMsRUFBRUMsUUFBRixDQUFXRixJQUFYLENBQUosRUFBcUI7VUFDZkcsUUFBUUgsS0FBS0ksS0FBTCxDQUFXLElBQVgsQ0FBWjtVQUNJRCxNQUFNRSxNQUFO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
