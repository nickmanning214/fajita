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
        //The JSON object to pass as "templateValues" to the subview or the item in the subCollection.
        //Do not shorten to view.get. view.get gets from the viewModel which contains props and values...not view props and app props
        this.childMappings = this.view.templateValues && this.view.templateValues[this.subViewName];
    },
    _initializedefaultsOverride: function _initializedefaultsOverride() {
        //Not shortened to view.get because I'm not sure if it is useful to do so.
        //view.get gets the app value mapped to the default value, and if not then it gets the default value.
        //I think you're just overriding defaults with defaults, and nothing fancier than that.
        //this.defaultsOverride = this.view.defaults && this.view.defaults[this.subViewName];
        //Nevermind it is useful to use .get because if there are nested nested views, you can't just go to the defaults of that view. They might be overridden.

        this.defaultsOverride = this.view.get(this.subViewName);
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

        //Map models to childView instances with their templateValues
        this.ChildView = this.view.childViewImports[this.subViewName];
        this.childViewOptions = {
            templateValues: this.childMappings,
            collection: this.subCollection,
            tagName: this.view.childViewImports[this.subViewName].prototype.tagName || "subitem",
            defaultsOverride: this.defaultsOverride
        };

        this.childViews = this.subCollection.map(function (childModel, i) {

            var childViewOptions = _.extend({}, this.childViewOptions, {
                model: childModel,
                index: i,
                lastIndex: this.subCollection.length - i - 1,
                defaultsOverride: this.defaultsOverride && this.defaultsOverride.models[i] && this.defaultsOverride.models[i].attributes
            });

            var childview = new this.ChildView(childViewOptions);
            //childview._setAttributes(_.extend({}, _.result(childview, 'attributes')));
            return childview;
        }.bind(this));
    },
    childInit: function childInit() {
        this._initializeBackboneObject();
        this._initializeChildMappings();
        this._initializedefaultsOverride();
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
                    templateValues: this.childMappings,
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

        if (this.defaultsOverride) {
            _.extend(options, { defaultsOverride: this.defaultsOverride });
        }

        if (this.childMappings) {
            _.extend(options, {
                templateValues: this.childMappings
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
        this._initializedefaultsOverride();
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

            //Map models to childView instances with their templateValues
            this.ChildView = this.view.childViewImports[this.subViewName];
            this.childViewOptions = {
                templateValues: this.childMappings,
                collection: this.subCollection,
                tagName: this.view.childViewImports[this.subViewName].prototype.tagName || "subitem",
                defaultsOverride: this.defaultsOverride
            };
            this.childViews = this.subCollection.map(function (childModel, i) {

                var childViewOptions = _.extend({}, this.childViewOptions, {
                    model: childModel,
                    index: i,
                    lastIndex: this.subCollection.length - i - 1,
                    defaultsOverride: this.defaultsOverride && this.defaultsOverride.models[i] && this.defaultsOverride.models[i].attributes
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

        if (this.defaultsOverride) {
            _.extend(options, { defaultsOverride: this.defaultsOverride });
        }

        if (this.childMappings) {
            _.extend(options, {
                templateValues: this.childMappings
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
                    templateValues: this.childMappings,
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
var additionalViewOptions = ['warn', 'templateValues', 'templateString', 'childViewImports', 'subViewImports', 'index', 'lastIndex', 'defaultsOverride'];
var View = Backbone.View.extend({
    getAllTextNodes: function getAllTextNodes() {
        //http://stackoverflow.com/questions/10730309/find-all-text-nodes-in-html-page
        var n,
            a = [],
            walk = document.createTreeWalker(this.el, NodeFilter.SHOW_TEXT, null, false);
        while (n = walk.nextNode()) {
            a.push(n);
        }return a;
    },
    constructor: function constructor(options) {
        var _this = this;

        var options = options || {};

        //A template and defaults are all but required.
        if (this.warn || typeof this.warn == "undefined") {
            if (!this.jst && !this.templateString) console.warn("You probably need a template");
            if (!this.defaults) console.warn("You probably need some defaults for your view");
        }

        //Convert templateString to a javascript template
        if (!this.jst) {
            this.jst = _.template(this.templateString || "");
        }

        //extend only valid options
        _.extend(this, _.pick(options, backboneViewOptions.concat(additionalViewOptions)));

        _.each(this.defaults, function (def) {
            if (_.isFunction(def)) console.warn("Defaults should usually be primitive values");
        });

        //data is passed in on subviews
        // comes from this.view.viewModel.get(this.val);, 
        //so if the directive is nm-subview="Menu", then this.data should be...what?
        //Aha! data is to override default values for subviews being part of a parent view. 
        //But it is not meant to override templateValues I don't think.
        this.defaultsOverride = options && options.defaultsOverride;

        var attrs = _.extend(_.clone(this.defaults), options && options.defaultsOverride || {});
        this.viewModel = new Fajita.Model(attrs);

        //I want to use this.set here but can't get it working without rewriting model.set to support two arguments
        if (this.subViewImports) {
            for (var prop in this.subViewImports) {
                if (attrs[prop] instanceof Array) {
                    this.viewModel.set("->" + prop, attrs[prop].map(function (obj) {
                        return _.extend({}, _this.subViewImports[prop].prototype.defaults, obj);
                    }));
                } else this.viewModel.set("->" + prop, _.extend({}, this.subViewImports[prop].prototype.defaults, attrs[prop]));
            }
        }

        //templateValues contain templateValues of view variables to model variables.
        //strings are references to model variables. Functions are for when a view variable does
        //not match perfectly with a model variable. These are updated each time the model changes.


        //Problem: if you update the model it updates for every subview (not efficient).
        //And it does not update for submodels. Perhaps there are many different solutions for this.
        //You can have each submodel trigger change event.

        //Whenever the model changes, update the viewModel by mapping properties of the model to properties of the view (assigned in templateValues)
        //Also, the attributes change. This can be done more elegantly
        if (this.model) {
            this.listenTo(this.model, "change", this.updateViewModel);
            this.listenTo(this.model, "change", function () {
                this._setAttributes(_.extend({}, _.result(this, 'attributes')));
            });

            this.updateViewModel();
        }

        //Should the viewModel contain the subviews instead of directives? 
        //We have subViewImports have the constructor, 
        //The defaults come from a subhash in defaults, and templateVars come from templateVars.


        var attrs = this.viewModel.attributes;
        var keys = Object.keys(this.viewModel.attributes);
        keys.forEach(function (key) {
            if (key === "definitions" && !this.viewModel.attributes[key]) {
                //problem is that propMap (seems to be templateValues with functions filtered out) is 
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
        if (typeof this.templateValues[attr] == "string") return this.model.get(this.templateValues[attr]);else return this.templateValues[attr].call(this);
    },
    updateViewModel: function updateViewModel() {

        var obj = {};

        //Change templateVars->modelVars to templateVars->model.get("modelVar"), and set on the model
        _.extend(obj, _.mapObject(this.templateValues, function (modelVar) {
            if (typeof modelVar == "string") return this.model.get(modelVar);else if (typeof modelVar == "function") return modelVar.call(this);
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

        //Get all of the text nodes in the document.
        this._subViewElements = [];
        this.getAllTextNodes().forEach(function (fullTextNode) {
            //http://stackoverflow.com/a/21311670/1763217 textContent seems right

            var re = /\{\{(.+?)\}\}/g; //Match {{subViewName}}
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFqaXRhLmpzIiwic291cmNlcyI6WyJNb2RlbC5qcyIsIkNvbGxlY3Rpb24uanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1jb250ZW50LmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1lbmFibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRpc2FibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWhyZWYuanMiLCJkaXJlY3RpdmUvYWJzdHJhY3Qtc3Vidmlldy5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtbWFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1vcHRpb25hbC5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtb3B0aW9uYWx3cmFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1zcmMuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLXN1YnZpZXcuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRhdGEuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnkuanMiLCJWaWV3LmpzIiwiQmFzZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5cblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgXG4gIGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgaWYgKCB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSBcInVuZGVmaW5lZFwiICl7XG4gICAgICB0aGlzLnF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICB9XG5cbiAgIFxuXG4gICAgLy9uZXdcbiAgICB0aGlzLnN0cnVjdHVyZSA9IHt9O1xuXG4gICAgdGhpcy5wYXJlbnRNb2RlbHMgPSBbXTtcbiAgICB0aGlzLmluaXQoKTtcbiAgfSxcbiAgaW5pdDpmdW5jdGlvbigpe30sXG4gIFxuICBnZXQ6ZnVuY3Rpb24oYXR0cil7XG5cbiAgICAvL1RvZG86IGVycm9yIGNoZWNrIHdoZW4gYXR0ciBoYXMgXCItPlwiIGJ1dCBkb2Vzbid0IHN0YXJ0IHdpdGggLT5cblxuICAgIGlmIChfLmlzU3RyaW5nKGF0dHIpKXtcbiAgICAgIHZhciBwcm9wcyA9IGF0dHIuc3BsaXQoXCItPlwiKTtcbiAgICAgIGlmIChwcm9wcy5sZW5ndGggPiAxKXtcbiAgICAgICAgdmFyIG1vZGVsID0gdGhpcztcbiAgICAgICAgcHJvcHMuc2xpY2UoMSkuZm9yRWFjaChmdW5jdGlvbihwcm9wKXtcbiAgICAgICAgICBpZiAobW9kZWwuc3RydWN0dXJlW3Byb3BdKSBtb2RlbCA9IG1vZGVsLnN0cnVjdHVyZVtwcm9wXTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtb2RlbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGdldCA9IEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5nZXQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuICAgIGlmICghXy5pc1VuZGVmaW5lZChnZXQpKSByZXR1cm4gZ2V0O1xuICAgIFxuXG4gXG4gICBcbiAgIFxuICB9LFxuICB0b2dnbGU6ZnVuY3Rpb24oa2V5LHZhbDEsdmFsMil7XG4gICAgaWYgKHRoaXMuZ2V0KGtleSk9PXZhbDIpe1xuICAgICAgdGhpcy5zZXQoa2V5LHZhbDEpO1xuICAgIH1cbiAgICBlbHNlIHRoaXMuc2V0KGtleSx2YWwyKTtcbiAgfSxcbiAgc2V0OmZ1bmN0aW9uKGF0dHIsIHZhbCwgb3B0aW9ucyl7XG4gICBcbiAgICAvKlxuICAgIGdldCBjb2RlLi4uSSB3YW50IHNldCBjb2RlIHRvIG1pcnJvciBnZXQgY29kZVxuICAgICovXG4gICAgaWYgKF8uaXNTdHJpbmcoYXR0cikpe1xuICAgICAgdmFyIHByb3BzID0gYXR0ci5zcGxpdChcIi0+XCIpO1xuICAgICAgaWYgKHByb3BzLmxlbmd0aCA+IDEpe1xuICAgICAgICB2YXIgbW9kZWwgPSB0aGlzO1xuICAgICAgICBwcm9wcy5zbGljZSgxKS5mb3JFYWNoKGZ1bmN0aW9uKHByb3AsaSxwcm9wcyl7XG4gICAgICAgICAgaWYgKG1vZGVsLnN0cnVjdHVyZVtwcm9wXSkgbW9kZWwgPSBtb2RlbC5zdHJ1Y3R1cmVbcHJvcF07XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3TW9kZWw7XG4gICAgICAgICAgICBpZiAoaSA8IHByb3BzLmxlbmd0aCAtIDEpe1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IG5ldyBGYWppdGEuTW9kZWw7ICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IChfLmlzQXJyYXkodmFsKSk/bmV3IEZhaml0YS5Db2xsZWN0aW9uKHZhbCk6bmV3IEZhaml0YS5Nb2RlbCh2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3TW9kZWwucGFyZW50TW9kZWxzLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgbW9kZWwuc3RydWN0dXJlW3Byb3BdID0gbmV3TW9kZWw7XG4gICAgICAgICAgICBtb2RlbC5saXN0ZW5UbyhuZXdNb2RlbCxcImNoYW5nZSBhZGRcIixmdW5jdGlvbihuZXdNb2RlbCxvcHRpb25zKXtcbiAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8qIFRPRE86IGludmVudCBlbnRpcmUgc3lzdGVtIGZvciB0cmF2ZXJzaW5nIGFuZCBmaXJpbmcgZXZlbnRzLiBQcm9iYWJseSBub3Qgd29ydGggdGhlIGVmZm9ydCBmb3Igbm93LlxuICAgICAgICAgICAgICBPYmplY3Qua2V5cyhtb2RlbC5jaGFuZ2VkQXR0cmlidXRlcygpKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlOlwiK3Byb3ArXCIuXCIra2V5KVxuICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAqL1xuXG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIFxuXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICByZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG4gICAgfVxuXG5cbiAgICAgIFxuICAgICBcbiAgfVxuICAvL05vdGU6IHRoZXJlIGlzIHN0aWxsIG5vIGxpc3RlbmVyIGZvciBhIHN1Ym1vZGVsIG9mIGEgY29sbGVjdGlvbiBjaGFuZ2luZywgdHJpZ2dlcmluZyB0aGUgcGFyZW50LiBJIHRoaW5rIHRoYXQncyB1c2VmdWwuXG59KTsiLCIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgTW9kZWwgZnJvbSBcIi4vTW9kZWxcIjtcblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIG1vZGVsOk1vZGVsLCAvL3Byb2JsZW06IE1vZGVsIHJlbGllcyBvbiBjb2xsZWN0aW9uIGFzIHdlbGwgY2F1c2luZyBlcnJvclxuICAgIGluaXRpYWxpemU6ZnVuY3Rpb24oKXtcbiAgICAgICAgIHRoaXMucGFyZW50TW9kZWxzID0gW107XG4gICAgICAgIC8vdHJpZ2dlciBcInVwZGF0ZVwiIHdoZW4gc3VibW9kZWwgY2hhbmdlc1xuICAgICAgICB0aGlzLm9uKFwiYWRkXCIsZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyhtb2RlbCxcImNoYW5nZVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG59KTsiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuXG5leHBvcnQgZGVmYXVsdCBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG4gICAgbmFtZTpudWxsLFxuICAgIGJ1aWxkOm51bGwsXG4gICAgcmVuZGVyOm51bGwsXG4gICAgaW5pdGlhbGl6ZTpmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgICAgaWYgKCF0aGlzLm5hbWUpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGEgbmFtZSBpbiB0aGUgcHJvdG90eXBlLlwiKTtcbiAgICAgICAgdGhpcy52YWwgPSBvcHRpb25zLnZhbDtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvL3ZpZXcgaXMgdGhlIHZpZXcgdGhhdCBpbXBsZW1lbnRzIHRoaXMgZGlyZWN0aXZlLlxuICAgICAgICBpZiAoIW9wdGlvbnMudmlldykgY29uc29sZS5lcnJvcihcIkVycm9yOiBEaXJlY3RpdmUgcmVxdWlyZXMgYSB2aWV3IHBhc3NlZCBhcyBhbiBvcHRpb24uXCIpO1xuICAgICAgICB0aGlzLnZpZXcgPSBvcHRpb25zLnZpZXc7XG4gICAgICAgIGlmICghdGhpcy5jaGlsZEluaXQpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGNoaWxkSW5pdCBpbiBwcm90b3R5cGUuXCIpO1xuICAgICAgICB0aGlzLmNoaWxkSW5pdCgpO1xuICAgICAgICB0aGlzLmJ1aWxkKCk7XG4gICAgfSxcbiAgICBjaGlsZEluaXQ6ZnVuY3Rpb24oKXtcbiAgICAgICBcbiAgICAgICAgdGhpcy51cGRhdGVSZXN1bHQoKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnZpZXcudmlld01vZGVsLFwiY2hhbmdlOlwiK3RoaXMudmFsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVJlc3VsdCgpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuICAgIHVwZGF0ZVJlc3VsdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgcmVzdWx0ID0gdGhpcy52aWV3LmdldCh0aGlzLnZhbCk7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ocmVzdWx0KSkgdGhpcy5yZXN1bHQgPSByZXN1bHQuY2FsbCh0aGlzLnZpZXcpO1xuICAgICAgICBlbHNlIHRoaXMucmVzdWx0ID0gcmVzdWx0O1xuICAgIH1cbn0pOyIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbi8vTm90ZTogRG9uJ3QgdXNlIC5odG1sKCkgb3IgLmF0dHIoKSBqcXVlcnkuIEl0J3Mgd2VpcmQgd2l0aCBkaWZmZXJlbnQgdHlwZXMuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiY29udGVudFwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLHRoaXMucmVzdWx0KVxuICAgICAgICBlbHNlIHRoaXMuZWwuaW5uZXJIVE1MID0gdGhpcy5yZXN1bHQ7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5idWlsZCgpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHZhciBwYXNzID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikge1xuICAgICAgICAgICAgaWYgKHRoaXMuZWwuZ2V0QXR0cmlidXRlKFwidGl0bGVcIik9PXZhbHVlICsgXCJcIikgcGFzcyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5lbC5pbm5lckhUTUw9PXZhbHVlK1wiXCIpIHBhc3MgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgfVxufSk7IiwiLy9XaHkgZG9lcyB1bmRlcnNjb3JlIHdvcmsgaGVyZT9cblxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcImVuYWJsZVwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsdHJ1ZSk7XG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIixcIlwiKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpIT12YWx1ZTtcbiAgICB9XG59KTtcbiIsIi8vV2h5IGRvZXMgdW5kZXJzY29yZSB3b3JrIGhlcmU/XG5cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJkaXNhYmxlXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpPT12YWx1ZTtcbiAgICB9XG59KTtcbiIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJocmVmXCIsXG4gICBcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSB0aGlzLiRlbC5hdHRyKFwiaHJlZlwiLHRoaXMucmVzdWx0KTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgICAgICAgICAgYS5jbGFzc0xpc3QuYWRkKFwid3JhcHBlci1hXCIpXG4gICAgICAgICAgICBhLnNldEF0dHJpYnV0ZShcImhyZWZcIix0aGlzLnJlc3VsdCk7XG4gICAgICAgICAgICB0aGlzLndyYXBwZXJBID0gYTtcbiAgICAgICAgICAgIHRoaXMuZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQodGhpcy53cmFwcGVyQSx0aGlzLmVsKVxuICAgICAgICAgICAgLy9jYW4ndCBzaW1wbHkgdXNlIHRoaXMuJGVsLndyYXAoYSk7XG4gICAgICAgICAgICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTcwNzMyOC93cmFwLW9uZS1lbGVtZW50LXdpdGgtYW5vdGhlci1yZXRhaW5pbmctcmVmZXJlbmNlLXRvLXdyYXBwZXJcbiAgICAgICAgICAgIHRoaXMud3JhcHBlckEuYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93LndyYXBwZXJBID0gdGhpcy53cmFwcGVyQTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSAkKHRoaXMuZWwpLmF0dHIoXCJocmVmXCIsdGhpcy5yZXN1bHQpXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy53cmFwcGVyQS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIsdGhpcy5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgaWYgKHRoaXMuJGVsLnByb3AoXCJ0YWdOYW1lXCIpPT1cIkFcIikgcmV0dXJuICQodGhpcy5lbCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucGFyZW50KCkucHJvcChcInRhZ05hbWVcIik9PVwiQVwiICYmICQodGhpcy5lbCkucGFyZW50KCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIH1cbiAgICB9XG59KTsiLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiYWJzdHJhY3RzdWJ2aWV3XCIsXG4gICAgX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgYXJncyA9IHRoaXMudmFsLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgdGhpcy5zdWJWaWV3TmFtZSA9IGFyZ3NbMF07XG4gICAgICAgICBpZiAoYXJnc1sxXSl7XG4gICAgICAgICAgICB0aGlzLnN1Yk1vZGVsTmFtZSA9IGFyZ3NbMV07XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSB0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpOyAvL2NoYW5nZWQgZnJvbSBzdWJNb2RlbE5hbWUuXG4gICAgICAgICAgICBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCkgdGhpcy5zdWJNb2RlbCA9IG1vZGVsO1xuICAgICAgICAgICAgZWxzZSBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Db2xsZWN0aW9uKSB0aGlzLnN1YkNvbGxlY3Rpb24gPSBtb2RlbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCksKG1vZGVsIGluc3RhbmNlb2YgQmFja2JvbmUuQ29sbGVjdGlvbiksdGhpcy5zdWJDb2xsZWN0aW9uKVxuICAgICAgICAgICAgLy9kZWJ1Z2dlcjtcbiAgICAgICAgIH1cbiAgICB9LFxuICAgIF9pbml0aWFsaXplQ2hpbGRNYXBwaW5nczpmdW5jdGlvbigpe1xuICAgICAgICAvL1RoZSBKU09OIG9iamVjdCB0byBwYXNzIGFzIFwidGVtcGxhdGVWYWx1ZXNcIiB0byB0aGUgc3VidmlldyBvciB0aGUgaXRlbSBpbiB0aGUgc3ViQ29sbGVjdGlvbi5cbiAgICAgICAgIC8vRG8gbm90IHNob3J0ZW4gdG8gdmlldy5nZXQuIHZpZXcuZ2V0IGdldHMgZnJvbSB0aGUgdmlld01vZGVsIHdoaWNoIGNvbnRhaW5zIHByb3BzIGFuZCB2YWx1ZXMuLi5ub3QgdmlldyBwcm9wcyBhbmQgYXBwIHByb3BzXG4gICAgICAgIHRoaXMuY2hpbGRNYXBwaW5ncyA9IHRoaXMudmlldy50ZW1wbGF0ZVZhbHVlcyAmJiB0aGlzLnZpZXcudGVtcGxhdGVWYWx1ZXNbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgfSxcbiAgICBfaW5pdGlhbGl6ZWRlZmF1bHRzT3ZlcnJpZGU6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy9Ob3Qgc2hvcnRlbmVkIHRvIHZpZXcuZ2V0IGJlY2F1c2UgSSdtIG5vdCBzdXJlIGlmIGl0IGlzIHVzZWZ1bCB0byBkbyBzby5cbiAgICAgICAgLy92aWV3LmdldCBnZXRzIHRoZSBhcHAgdmFsdWUgbWFwcGVkIHRvIHRoZSBkZWZhdWx0IHZhbHVlLCBhbmQgaWYgbm90IHRoZW4gaXQgZ2V0cyB0aGUgZGVmYXVsdCB2YWx1ZS5cbiAgICAgICAgLy9JIHRoaW5rIHlvdSdyZSBqdXN0IG92ZXJyaWRpbmcgZGVmYXVsdHMgd2l0aCBkZWZhdWx0cywgYW5kIG5vdGhpbmcgZmFuY2llciB0aGFuIHRoYXQuXG4gICAgICAgIC8vdGhpcy5kZWZhdWx0c092ZXJyaWRlID0gdGhpcy52aWV3LmRlZmF1bHRzICYmIHRoaXMudmlldy5kZWZhdWx0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgLy9OZXZlcm1pbmQgaXQgaXMgdXNlZnVsIHRvIHVzZSAuZ2V0IGJlY2F1c2UgaWYgdGhlcmUgYXJlIG5lc3RlZCBuZXN0ZWQgdmlld3MsIHlvdSBjYW4ndCBqdXN0IGdvIHRvIHRoZSBkZWZhdWx0cyBvZiB0aGF0IHZpZXcuIFRoZXkgbWlnaHQgYmUgb3ZlcnJpZGRlbi5cblxuICAgICAgICB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUgPSB0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpO1xuICAgIH0sXG5cblxuXG4gICAgX2luaXRpYWxpemVDaGlsZFZpZXdzOmZ1bmN0aW9uKCl7XG5cbiAgICB9XG59KSIsIi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuaW1wb3J0IEFic3RyYWN0U3VidmlldyBmcm9tIFwiLi9hYnN0cmFjdC1zdWJ2aWV3XCJcbmV4cG9ydCBkZWZhdWx0IEFic3RyYWN0U3Vidmlldy5leHRlbmQoe1xuICAgIG5hbWU6XCJtYXBcIixcbiAgICBfaW5pdGlhbGl6ZUNoaWxkVmlld3M6ZnVuY3Rpb24oKXtcblxuXG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJhZGRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJBZGQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZXNldFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclJlc2V0KCk7XG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZW1vdmVcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJSZW1vdmUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJzb3J0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyU29ydCgpOyAgICAgICAgXG4gICAgICAgIH0pO1xuXG5cblxuICAgICAgICAvL01hcCBtb2RlbHMgdG8gY2hpbGRWaWV3IGluc3RhbmNlcyB3aXRoIHRoZWlyIHRlbXBsYXRlVmFsdWVzXG4gICAgICAgIHRoaXMuQ2hpbGRWaWV3ID0gdGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgICAgIHRoaXMuY2hpbGRWaWV3T3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHRlbXBsYXRlVmFsdWVzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgdGFnTmFtZTp0aGlzLnZpZXcuY2hpbGRWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXS5wcm90b3R5cGUudGFnTmFtZSB8fCBcInN1Yml0ZW1cIixcbiAgICAgICAgICAgIGRlZmF1bHRzT3ZlcnJpZGU6dGhpcy5kZWZhdWx0c092ZXJyaWRlXG4gICAgICAgIH07XG5cblxuICAgICAgICB0aGlzLmNoaWxkVmlld3MgPSB0aGlzLnN1YkNvbGxlY3Rpb24ubWFwKGZ1bmN0aW9uKGNoaWxkTW9kZWwsaSl7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBjaGlsZFZpZXdPcHRpb25zID0gXy5leHRlbmQoe30sdGhpcy5jaGlsZFZpZXdPcHRpb25zLHtcbiAgICAgICAgICAgICAgICBtb2RlbDpjaGlsZE1vZGVsLFxuICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgbGFzdEluZGV4OnRoaXMuc3ViQ29sbGVjdGlvbi5sZW5ndGggLSBpIC0gMSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNPdmVycmlkZSAmJiB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUubW9kZWxzW2ldICYmIHRoaXMuZGVmYXVsdHNPdmVycmlkZS5tb2RlbHNbaV0uYXR0cmlidXRlcyxcbiAgICAgICAgICAgICAgICAvL0p1c3QgYWRkZWQgY2hlY2sgZm9yIHRoaXMuZGVmYXVsdHNPdmVycmlkZS5tb2RlbHNbaV1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgY2hpbGR2aWV3ID0gbmV3IHRoaXMuQ2hpbGRWaWV3KGNoaWxkVmlld09wdGlvbnMpO1xuICAgICAgICAgICAgLy9jaGlsZHZpZXcuX3NldEF0dHJpYnV0ZXMoXy5leHRlbmQoe30sIF8ucmVzdWx0KGNoaWxkdmlldywgJ2F0dHJpYnV0ZXMnKSkpO1xuICAgICAgICAgICAgcmV0dXJuIGNoaWxkdmlldztcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIH0sXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdCgpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQ2hpbGRNYXBwaW5ncygpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplZGVmYXVsdHNPdmVycmlkZSgpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQ2hpbGRWaWV3cygpO1xuXG4gICAgICAgIFxuICAgICAgXG5cbiAgICAgICAgXG4gICAgICAgIFxuXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgXG4gICAgfSxcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMuc3ViQ29sbGVjdGlvbil7XG4gICAgICAgICAgICB0aGlzLiRlbC5yZXBsYWNlV2l0aCh0aGlzLnN1YlZpZXcuZWwpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB2YXIgJGNoaWxkcmVuID0gJCgpO1xuICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgICAgICRjaGlsZHJlbiA9ICRjaGlsZHJlbi5hZGQoY2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgICAgIGNoaWxkVmlldy5pbmRleCA9IGk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgaWYgKCRjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRlbC5yZXBsYWNlV2l0aCgkY2hpbGRyZW4pO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aGlzLiRwYXJlbnQgPSAkY2hpbGRyZW4ucGFyZW50KClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gdGhpcy4kZWwucGFyZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbiA9ICRjaGlsZHJlblxuICAgICAgICB9XG4gICAgfSxcbiAgICByZW5kZXJBZGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gW107XG4gICAgICAgIHRoaXMuc3ViQ29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKG1vZGVsLGkpe1xuICAgICAgICAgICAgdmFyIGV4aXN0aW5nQ2hpbGRWaWV3ID0gdGhpcy5jaGlsZFZpZXdzLmZpbHRlcihmdW5jdGlvbihjaGlsZFZpZXcpe1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZFZpZXcubW9kZWwgPT0gbW9kZWxcbiAgICAgICAgICAgIH0pWzBdO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nQ2hpbGRWaWV3KSB7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaChleGlzdGluZ0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICAvL3ZhciBhdHRyaWJ1dGVzID0gXy5leHRlbmQoe30sIF8ucmVzdWx0KGV4aXN0aW5nQ2hpbGRWaWV3LCAnYXR0cmlidXRlcycpKVxuICAgICAgICAgICAgICAgIC8vZXhpc3RpbmdDaGlsZFZpZXcuX3NldEF0dHJpYnV0ZXMoYXR0cmlidXRlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3Q2hpbGRWaWV3ID0gbmV3IHRoaXMuQ2hpbGRWaWV3KHtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWw6bW9kZWwsXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVmFsdWVzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdEluZGV4OnRoaXMuc3ViQ29sbGVjdGlvbi5sZW5ndGggLSBpIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6dGhpcy52aWV3LmdldCh0aGlzLnZhbC5zcGxpdChcIjpcIilbMF0pW2ldXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MucHVzaChuZXdDaGlsZFZpZXcpO1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2gobmV3Q2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpe1xuICAgICAgICAgICAgdGhpcy4kcGFyZW50LmFwcGVuZChjaGlsZClcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9ICQoY2hpbGRyZW4pXG4gICAgICAgIFxuICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICBjaGlsZFZpZXcuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgfSlcblxuICAgIH0sXG4gICAgcmVuZGVyUmVzZXQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgfSxcbiAgICByZW5kZXJSZW1vdmU6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4ubGFzdCgpLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmNoaWxkVmlld3Muc3BsaWNlKC0xLDEpO1xuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9IHRoaXMuJHBhcmVudC5jaGlsZHJlbigpO1xuICAgIH0sXG4gICAgcmVuZGVyU29ydDpmdW5jdGlvbigpe1xuICAgICAgICBcbiAgICAgICAgLy9Eb24ndCBuZWVkIHRoaXMgKG5vdykuIE1vZGVscyB3aWxsIGFscmVhZHkgYmUgc29ydGVkIG9uIGFkZCB3aXRoIGNvbGxlY3Rpb24uY29tcGFyYXRvciA9IHh4eDtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy90aGlzLnZpZXcgaXMgaW5zdGFuY2Ugb2YgdGhlIHZpZXcgdGhhdCBjb250YWlucyB0aGUgc3VidmlldyBkaXJlY3RpdmUuXG4gICAgICAgIC8vdGhpcy5zdWJWaWV3IGlzIGluc3RhbmNlIG9mIHRoZSBzdWJ2aWV3XG4gICAgICAgIC8vdGhpcyBpcyB0aGUgZGlyZWN0aXZlLlxuXG4gICAgICAgIGlmICh0aGlzLnN1YlZpZXcpe1xuICAgICAgICAgICAgLy93aHkgcGFyZW50Tm9kZT9cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZpZXcuZWwuY29udGFpbnModGhpcy5zdWJWaWV3LmVsLnBhcmVudE5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB2YXIgcGFzcyA9IHRydWU7XG4gICAgICAgICAgICB2YXIgZWwgPSB0aGlzLnZpZXcuZWxcbiAgICAgICAgICAgIHRoaXMuJGNoaWxkcmVuLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoIWVsLmNvbnRhaW5zKHRoaXMpKSBwYXNzID0gZmFsc2U7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICByZXR1cm4gcGFzcztcbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgfVxufSkiLCIvKmltcG9ydCAkIGZyb20gXCJqcXVlcnlcIjsqL1xuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcIm9wdGlvbmFsXCIsXG4gICAgXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCkgJCh0aGlzLmVsKS5oaWRlKClcbiAgICAgICAgZWxzZSAkKHRoaXMuZWwpLmNzcyhcImRpc3BsYXlcIixcIlwiKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLmhpZGUoKVxuICAgICAgICBlbHNlICQodGhpcy5lbCkuY3NzKFwiZGlzcGxheVwiLFwiXCIpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLmVsKSkgdGhyb3cgRXJyb3IoXCJlbGVtZW50IGhhcyB0byBiZSBpbiB0aGUgRE9NIGluIG9yZGVyIHRvIHRlc3RcIilcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkuaXMoXCI6dmlzaWJsZVwiKT09dmFsdWU7XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwib3B0aW9uYWx3cmFwXCIsXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIERpcmVjdGl2ZS5wcm90b3R5cGUuY2hpbGRJbml0LmNhbGwodGhpcyxhcmd1bWVudHMpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy53cmFwcGVyID0gdGhpcy5lbDtcbiAgICAgICAgdGhpcy5jaGlsZE5vZGVzID0gW10uc2xpY2UuY2FsbCh0aGlzLmVsLmNoaWxkTm9kZXMsIDApO1xuICAgICAgICBcbiAgICB9LFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5jaGlsZE5vZGVzKS51bndyYXAoKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KXtcbiAgICAgICAgICAgICQodGhpcy5jaGlsZE5vZGVzKS51bndyYXAoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgaWYgKCFkb2N1bWVudC5ib2R5LmNvbnRhaW5zKHRoaXMuY2hpbGROb2Rlc1swXSkpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGaXJzdCBjaGlsZCBoYXMgdG8gYmUgaW4gRE9NXCIpO1xuICAgICAgICAgICAgICAgIC8vc29sdXRpb246IGFkZCBhIGR1bW15IHRleHQgbm9kZSBhdCBiZWdpbm5pbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCFkb2N1bWVudC5ib2R5LmNvbnRhaW5zKHRoaXMud3JhcHBlcikpe1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGROb2Rlc1swXS5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLndyYXBwZXIsdGhpcy5jaGlsZE5vZGVzWzBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvcih2YXIgaT0wO2k8dGhpcy5jaGlsZE5vZGVzLmxlbmd0aDtpKyspe1xuICAgICAgICAgICAgICAgIHRoaXMud3JhcHBlci5hcHBlbmRDaGlsZCh0aGlzLmNoaWxkTm9kZXNbaV0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuXG5cbiAgICAgICAgcmV0dXJuICh0aGlzLmNoaWxkTm9kZXNbMF0ucGFyZW50Tm9kZT09dGhpcy53cmFwcGVyKSA9PSB2YWx1ZTtcblxuXG4gICAgICBcbiAgICB9XG59KSIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJzcmNcIixcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLiRlbC5hdHRyKFwic3JjXCIsdGhpcy5yZXN1bHQpO1xuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGVsLmF0dHIoXCJzcmNcIix0aGlzLnJlc3VsdCk7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsLmF0dHIoXCJzcmNcIik9PT12YWx1ZTtcbiAgICB9XG59KTsiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcbmltcG9ydCBBYnN0cmFjdFN1YnZpZXcgZnJvbSBcIi4vYWJzdHJhY3Qtc3Vidmlld1wiXG5leHBvcnQgZGVmYXVsdCBBYnN0cmFjdFN1YnZpZXcuZXh0ZW5kKHtcbiAgICBuYW1lOlwic3Vidmlld1wiLFxuICAgIF9pbml0aWFsaXplQ2hpbGRWaWV3czpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLnByb3RvdHlwZSBpbnN0YW5jZW9mIEJhY2tib25lLlZpZXcpIHRoaXMuQ2hpbGRDb25zdHJ1Y3RvciA9IHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgZWxzZSB0aGlzLkNoaWxkQ29uc3RydWN0b3IgPSB0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0vKi5jYWxsKHRoaXMudmlldyk7Ki9cblxuICAgICAgICAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmRlZmF1bHRzT3ZlcnJpZGUpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7ZGVmYXVsdHNPdmVycmlkZTp0aGlzLmRlZmF1bHRzT3ZlcnJpZGV9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmNoaWxkTWFwcGluZ3Mpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dGhpcy5jaGlsZE1hcHBpbmdzXG4gICAgICAgICAgICAgICAgLy8sZWw6dGhpcy5lbCBUaGUgZWwgb2YgdGhlIGRpcmVjdGl2ZSBzaG91bGQgYmVsb25nIHRvIHRoZSBkaXJlY3RpdmUgYnV0IG5vdCB0aGUgc3VidmlldyBpdHNlbGZcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBzdWJNb2RlbCA9IHRoaXMuc3ViTW9kZWwgfHwgdGhpcy52aWV3Lm1vZGVsO1xuICAgICAgICBpZiAoc3ViTW9kZWwpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7bW9kZWw6c3ViTW9kZWx9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldyA9IG5ldyB0aGlzLkNoaWxkQ29uc3RydWN0b3Iob3B0aW9ucyk7XG4gICAgICAgICAgICB2YXIgY2xhc3NlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImNsYXNzTmFtZVwiKVxuICAgICAgICAgICAgaWYgKGNsYXNzZXMpe1xuICAgICAgICAgICAgICAgIGNsYXNzZXMuc3BsaXQoXCIgXCIpLmZvckVhY2goZnVuY3Rpb24oY2wpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuY2xhc3NMaXN0LmFkZChjbClcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgYXR0cmlidXRlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImF0dHJpYnV0ZXNcIik7XG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlcyl7XG4gICAgICAgICAgICAgICAgXy5lYWNoKGF0dHJpYnV0ZXMsZnVuY3Rpb24odmFsLG5hbWUpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuc2V0QXR0cmlidXRlKG5hbWUsdmFsKSAgICBcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnQgPSB0aGlzLnZpZXc7XG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcucGFyZW50RGlyZWN0aXZlID0gdGhpcztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnNTZW50VG9TdWJWaWV3ID0gb3B0aW9ucztcbiAgICB9LFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICAvL3RoaXMudmFsLCB0aGlzLnZpZXdcblxuICAgICAgICB0aGlzLl9pbml0aWFsaXplQmFja2JvbmVPYmplY3QoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3MoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZWRlZmF1bHRzT3ZlcnJpZGUoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkVmlld3MoKTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgXG4gICAgICBcblxuICAgICAgICBpZiAodGhpcy5zdWJDb2xsZWN0aW9uKXsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJhZGRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckFkZCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZXNldFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyUmVzZXQoKTtcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZW1vdmVcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJzb3J0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJTb3J0KCk7ICAgICAgICBcbiAgICAgICAgICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgICAgICAgICAvL01hcCBtb2RlbHMgdG8gY2hpbGRWaWV3IGluc3RhbmNlcyB3aXRoIHRoZWlyIHRlbXBsYXRlVmFsdWVzXG4gICAgICAgICAgICAgICAgdGhpcy5DaGlsZFZpZXcgPSB0aGlzLnZpZXcuY2hpbGRWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld09wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVmFsdWVzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIHRhZ05hbWU6dGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlLnRhZ05hbWUgfHwgXCJzdWJpdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRzT3ZlcnJpZGU6dGhpcy5kZWZhdWx0c092ZXJyaWRlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MgPSB0aGlzLnN1YkNvbGxlY3Rpb24ubWFwKGZ1bmN0aW9uKGNoaWxkTW9kZWwsaSl7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB2YXIgY2hpbGRWaWV3T3B0aW9ucyA9IF8uZXh0ZW5kKHt9LHRoaXMuY2hpbGRWaWV3T3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlbDpjaGlsZE1vZGVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNPdmVycmlkZSAmJiB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUubW9kZWxzW2ldICYmIHRoaXMuZGVmYXVsdHNPdmVycmlkZS5tb2RlbHNbaV0uYXR0cmlidXRlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vSnVzdCBhZGRlZCBjaGVjayBmb3IgdGhpcy5kZWZhdWx0c092ZXJyaWRlLm1vZGVsc1tpXVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHZhciBjaGlsZHZpZXcgPSBuZXcgdGhpcy5DaGlsZFZpZXcoY2hpbGRWaWV3T3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIC8vY2hpbGR2aWV3Ll9zZXRBdHRyaWJ1dGVzKF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChjaGlsZHZpZXcsICdhdHRyaWJ1dGVzJykpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkdmlldztcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuXG5cbiAgICAgICAgICAgICAgICBcblxuXG5cbiAgICAgICAgfVxuXG4gICAgICAgXG4gICAgICAgIFxuICAgICAgICBcblxuICAgICAgICBpZiAoIXRoaXMuc3ViQ29sbGVjdGlvbil7XG4gICAgICAgICAgICBpZiAodGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLnByb3RvdHlwZSBpbnN0YW5jZW9mIEJhY2tib25lLlZpZXcpIHRoaXMuQ2hpbGRDb25zdHJ1Y3RvciA9IHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgICAgIGVsc2UgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLyouY2FsbCh0aGlzLnZpZXcpOyovXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuZGVmYXVsdHNPdmVycmlkZSl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNPdmVycmlkZX0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuY2hpbGRNYXBwaW5ncyl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp0aGlzLmNoaWxkTWFwcGluZ3NcbiAgICAgICAgICAgICAgICAvLyxlbDp0aGlzLmVsIFRoZSBlbCBvZiB0aGUgZGlyZWN0aXZlIHNob3VsZCBiZWxvbmcgdG8gdGhlIGRpcmVjdGl2ZSBidXQgbm90IHRoZSBzdWJ2aWV3IGl0c2VsZlxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHN1Yk1vZGVsID0gdGhpcy5zdWJNb2RlbCB8fCB0aGlzLnZpZXcubW9kZWw7XG4gICAgICAgIGlmIChzdWJNb2RlbCl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHttb2RlbDpzdWJNb2RlbH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy5zdWJWaWV3ID0gbmV3IHRoaXMuQ2hpbGRDb25zdHJ1Y3RvcihvcHRpb25zKTtcbiAgICAgICAgICAgIHZhciBjbGFzc2VzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiY2xhc3NOYW1lXCIpXG4gICAgICAgICAgICBpZiAoY2xhc3Nlcyl7XG4gICAgICAgICAgICAgICAgY2xhc3Nlcy5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihjbCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5jbGFzc0xpc3QuYWRkKGNsKVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiYXR0cmlidXRlc1wiKTtcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgICAgICBfLmVhY2goYXR0cmlidXRlcyxmdW5jdGlvbih2YWwsbmFtZSl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5zZXRBdHRyaWJ1dGUobmFtZSx2YWwpICAgIFxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zdWJWaWV3LnBhcmVudCA9IHRoaXMudmlldztcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnREaXJlY3RpdmUgPSB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9uc1NlbnRUb1N1YlZpZXcgPSBvcHRpb25zO1xuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgodGhpcy5zdWJWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyICRjaGlsZHJlbiA9ICQoKTtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAkY2hpbGRyZW4gPSAkY2hpbGRyZW4uYWRkKGNoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICBjaGlsZFZpZXcuaW5kZXggPSBpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIGlmICgkY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgoJGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkVmlldy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gJGNoaWxkcmVuLnBhcmVudCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkY2hpbGRyZW5cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyQWRkOmZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IFtdO1xuICAgICAgICB0aGlzLnN1YkNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihtb2RlbCxpKXtcbiAgICAgICAgICAgIHZhciBleGlzdGluZ0NoaWxkVmlldyA9IHRoaXMuY2hpbGRWaWV3cy5maWx0ZXIoZnVuY3Rpb24oY2hpbGRWaWV3KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRWaWV3Lm1vZGVsID09IG1vZGVsXG4gICAgICAgICAgICB9KVswXTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ0NoaWxkVmlldykge1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goZXhpc3RpbmdDaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICAgICAgLy92YXIgYXR0cmlidXRlcyA9IF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChleGlzdGluZ0NoaWxkVmlldywgJ2F0dHJpYnV0ZXMnKSlcbiAgICAgICAgICAgICAgICAvL2V4aXN0aW5nQ2hpbGRWaWV3Ll9zZXRBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld0NoaWxkVmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyh7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsOm1vZGVsLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp0aGlzLmNoaWxkTWFwcGluZ3MsXG4gICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOnRoaXMudmlldy5nZXQodGhpcy52YWwuc3BsaXQoXCI6XCIpWzBdKVtpXVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnB1c2gobmV3Q2hpbGRWaWV3KTtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKG5ld0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKXtcbiAgICAgICAgICAgIHRoaXMuJHBhcmVudC5hcHBlbmQoY2hpbGQpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkKGNoaWxkcmVuKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIH0pXG5cbiAgICB9LFxuICAgIHJlbmRlclJlc2V0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgIH0sXG4gICAgcmVuZGVyUmVtb3ZlOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGNoaWxkcmVuLmxhc3QoKS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnNwbGljZSgtMSwxKTtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSB0aGlzLiRwYXJlbnQuY2hpbGRyZW4oKTtcbiAgICB9LFxuICAgIHJlbmRlclNvcnQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgIC8vRG9uJ3QgbmVlZCB0aGlzIChub3cpLiBNb2RlbHMgd2lsbCBhbHJlYWR5IGJlIHNvcnRlZCBvbiBhZGQgd2l0aCBjb2xsZWN0aW9uLmNvbXBhcmF0b3IgPSB4eHg7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vdGhpcy52aWV3IGlzIGluc3RhbmNlIG9mIHRoZSB2aWV3IHRoYXQgY29udGFpbnMgdGhlIHN1YnZpZXcgZGlyZWN0aXZlLlxuICAgICAgICAvL3RoaXMuc3ViVmlldyBpcyBpbnN0YW5jZSBvZiB0aGUgc3Vidmlld1xuICAgICAgICAvL3RoaXMgaXMgdGhlIGRpcmVjdGl2ZS5cblxuICAgICAgICBpZiAodGhpcy5zdWJWaWV3KXtcbiAgICAgICAgICAgIC8vd2h5IHBhcmVudE5vZGU/XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aWV3LmVsLmNvbnRhaW5zKHRoaXMuc3ViVmlldy5lbC5wYXJlbnROb2RlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyIHBhc3MgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGVsID0gdGhpcy52aWV3LmVsXG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbi5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCFlbC5jb250YWlucyh0aGlzKSkgcGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbn0pIiwiLyppbXBvcnQgXyBmcm9tIFwidW5kZXJzY29yZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiZGF0YVwiLFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmNvbnRlbnQgPSB0aGlzLnZpZXcudmlld01vZGVsLmdldCh0aGlzLnZhbCk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy52aWV3LnZpZXdNb2RlbCxcImNoYW5nZTpcIit0aGlzLnZhbCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5jb250ZW50ID0gdGhpcy52aWV3LnZpZXdNb2RlbC5nZXQodGhpcy52YWwpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgXy5lYWNoKHRoaXMuY29udGVudCxmdW5jdGlvbih2YWwscHJvcCl7XG4gICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsKSkgdmFsID0gdmFsLmJpbmQodGhpcy52aWV3KTtcbiAgICAgICAgICAgdGhpcy4kZWwuYXR0cihcImRhdGEtXCIrcHJvcCx2YWwpXG4gICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgXy5lYWNoKHRoaXMuY29udGVudCxmdW5jdGlvbih2YWwscHJvcCl7XG4gICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsKSkgdmFsID0gdmFsLmJpbmQodGhpcy52aWV3KTtcbiAgICAgICAgICAgdGhpcy4kZWwuYXR0cihcImRhdGEtXCIrcHJvcCx2YWwpXG4gICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH1cbn0pOyIsImltcG9ydCBEaXJlY3RpdmVDb250ZW50IGZyb20gXCIuL2RpcmVjdGl2ZS1jb250ZW50XCI7XG5pbXBvcnQgRGlyZWN0aXZlRW5hYmxlIGZyb20gXCIuL2RpcmVjdGl2ZS1lbmFibGVcIjtcbmltcG9ydCBEaXJlY3RpdmVEaXNhYmxlIGZyb20gXCIuL2RpcmVjdGl2ZS1kaXNhYmxlXCI7XG5pbXBvcnQgRGlyZWN0aXZlSHJlZiBmcm9tIFwiLi9kaXJlY3RpdmUtaHJlZlwiO1xuaW1wb3J0IERpcmVjdGl2ZU1hcCBmcm9tIFwiLi9kaXJlY3RpdmUtbWFwXCI7XG5pbXBvcnQgRGlyZWN0aXZlT3B0aW9uYWwgZnJvbSBcIi4vZGlyZWN0aXZlLW9wdGlvbmFsXCI7XG5pbXBvcnQgRGlyZWN0aXZlT3B0aW9uYWxXcmFwIGZyb20gXCIuL2RpcmVjdGl2ZS1vcHRpb25hbHdyYXBcIjtcbmltcG9ydCBEaXJlY3RpdmVTcmMgZnJvbSBcIi4vZGlyZWN0aXZlLXNyY1wiO1xuaW1wb3J0IERpcmVjdGl2ZVN1YnZpZXcgZnJvbSBcIi4vZGlyZWN0aXZlLXN1YnZpZXdcIjtcbmltcG9ydCBEaXJlY3RpdmVEYXRhIGZyb20gXCIuL2RpcmVjdGl2ZS1kYXRhXCI7XG5cbnZhciByZWdpc3RyeSA9IHtcbiAgICBDb250ZW50OkRpcmVjdGl2ZUNvbnRlbnQsXG4gICAgRW5hYmxlOkRpcmVjdGl2ZUVuYWJsZSxcbiAgICBEaXNhYmxlOkRpcmVjdGl2ZURpc2FibGUsXG4gICAgSHJlZjpEaXJlY3RpdmVIcmVmLFxuICAgIE1hcDpEaXJlY3RpdmVNYXAsXG4gICAgT3B0aW9uYWw6RGlyZWN0aXZlT3B0aW9uYWwsXG4gICAgT3B0aW9uYWxXcmFwOkRpcmVjdGl2ZU9wdGlvbmFsV3JhcCxcbiAgICBTcmM6RGlyZWN0aXZlU3JjLFxuICAgIFN1YnZpZXc6RGlyZWN0aXZlU3VidmlldyxcbiAgICBEYXRhOkRpcmVjdGl2ZURhdGFcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHJlZ2lzdHJ5OyIsIi8qaW1wb3J0ICQgZnJvbSBcImpxdWVyeVwiOyovXG4vKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlUmVnaXN0cnkgZnJvbSBcIi4vZGlyZWN0aXZlL2RpcmVjdGl2ZVJlZ2lzdHJ5LmpzXCJcbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlL2RpcmVjdGl2ZS5qc1wiXG5cblxuXG52YXIgYmFja2JvbmVWaWV3T3B0aW9ucyA9IFsnbW9kZWwnLCAnY29sbGVjdGlvbicsICdlbCcsICdpZCcsICdhdHRyaWJ1dGVzJywgJ2NsYXNzTmFtZScsICd0YWdOYW1lJywgJ2V2ZW50cyddO1xudmFyIGFkZGl0aW9uYWxWaWV3T3B0aW9ucyA9IFsnd2FybicsJ3RlbXBsYXRlVmFsdWVzJywndGVtcGxhdGVTdHJpbmcnLCdjaGlsZFZpZXdJbXBvcnRzJywnc3ViVmlld0ltcG9ydHMnLCdpbmRleCcsJ2xhc3RJbmRleCcsJ2RlZmF1bHRzT3ZlcnJpZGUnXVxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICAgIGdldEFsbFRleHROb2RlczpmdW5jdGlvbigpe1xuICAgICAgICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTA3MzAzMDkvZmluZC1hbGwtdGV4dC1ub2Rlcy1pbi1odG1sLXBhZ2VcbiAgICAgICAgdmFyIG4sIGE9W10sIHdhbGs9ZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcih0aGlzLmVsLE5vZGVGaWx0ZXIuU0hPV19URVhULG51bGwsZmFsc2UpO1xuICAgICAgICB3aGlsZShuPXdhbGsubmV4dE5vZGUoKSkgYS5wdXNoKG4pO1xuICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgXG4gICAgfSxcbiAgICAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcblxuICAgICAgICB2YXIgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgLy9BIHRlbXBsYXRlIGFuZCBkZWZhdWx0cyBhcmUgYWxsIGJ1dCByZXF1aXJlZC5cbiAgICAgICAgaWYgKHRoaXMud2FybiB8fCB0eXBlb2YgdGhpcy53YXJuPT1cInVuZGVmaW5lZFwiKXtcbiAgICAgICAgICAgIGlmICghdGhpcy5qc3QgJiYgIXRoaXMudGVtcGxhdGVTdHJpbmcpIGNvbnNvbGUud2FybihcIllvdSBwcm9iYWJseSBuZWVkIGEgdGVtcGxhdGVcIik7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZGVmYXVsdHMpIGNvbnNvbGUud2FybihcIllvdSBwcm9iYWJseSBuZWVkIHNvbWUgZGVmYXVsdHMgZm9yIHlvdXIgdmlld1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vQ29udmVydCB0ZW1wbGF0ZVN0cmluZyB0byBhIGphdmFzY3JpcHQgdGVtcGxhdGVcbiAgICAgICAgaWYgKCF0aGlzLmpzdCkge1xuICAgICAgICAgICAgdGhpcy5qc3QgPSBfLnRlbXBsYXRlKHRoaXMudGVtcGxhdGVTdHJpbmcgfHwgXCJcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvL2V4dGVuZCBvbmx5IHZhbGlkIG9wdGlvbnNcbiAgICAgICAgXy5leHRlbmQodGhpcywgXy5waWNrKG9wdGlvbnMsIGJhY2tib25lVmlld09wdGlvbnMuY29uY2F0KGFkZGl0aW9uYWxWaWV3T3B0aW9ucykpKTtcblxuICAgICAgICBcblxuICAgICAgICBfLmVhY2godGhpcy5kZWZhdWx0cywgZnVuY3Rpb24gKGRlZikge1xuICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihkZWYpKSBjb25zb2xlLndhcm4oXCJEZWZhdWx0cyBzaG91bGQgdXN1YWxseSBiZSBwcmltaXRpdmUgdmFsdWVzXCIpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2RhdGEgaXMgcGFzc2VkIGluIG9uIHN1YnZpZXdzXG4gICAgICAgIC8vIGNvbWVzIGZyb20gdGhpcy52aWV3LnZpZXdNb2RlbC5nZXQodGhpcy52YWwpOywgXG4gICAgICAgIC8vc28gaWYgdGhlIGRpcmVjdGl2ZSBpcyBubS1zdWJ2aWV3PVwiTWVudVwiLCB0aGVuIHRoaXMuZGF0YSBzaG91bGQgYmUuLi53aGF0P1xuICAgICAgICAvL0FoYSEgZGF0YSBpcyB0byBvdmVycmlkZSBkZWZhdWx0IHZhbHVlcyBmb3Igc3Vidmlld3MgYmVpbmcgcGFydCBvZiBhIHBhcmVudCB2aWV3LiBcbiAgICAgICAgLy9CdXQgaXQgaXMgbm90IG1lYW50IHRvIG92ZXJyaWRlIHRlbXBsYXRlVmFsdWVzIEkgZG9uJ3QgdGhpbmsuXG4gICAgICAgIHRoaXMuZGVmYXVsdHNPdmVycmlkZSA9IG9wdGlvbnMgJiYgb3B0aW9ucy5kZWZhdWx0c092ZXJyaWRlO1xuXG4gICAgICAgIFxuICAgICAgICBcblxuICAgICAgICB2YXIgYXR0cnMgPSBfLmV4dGVuZChfLmNsb25lKHRoaXMuZGVmYXVsdHMpLCBvcHRpb25zICYmIG9wdGlvbnMuZGVmYXVsdHNPdmVycmlkZSB8fCB7fSk7XG4gICAgICAgIHRoaXMudmlld01vZGVsID0gbmV3IEZhaml0YS5Nb2RlbChhdHRycyk7XG5cbiAgICAgICAgLy9JIHdhbnQgdG8gdXNlIHRoaXMuc2V0IGhlcmUgYnV0IGNhbid0IGdldCBpdCB3b3JraW5nIHdpdGhvdXQgcmV3cml0aW5nIG1vZGVsLnNldCB0byBzdXBwb3J0IHR3byBhcmd1bWVudHNcbiAgICAgICAgaWYgKHRoaXMuc3ViVmlld0ltcG9ydHMpe1xuICAgICAgICAgICAgZm9yKHZhciBwcm9wIGluIHRoaXMuc3ViVmlld0ltcG9ydHMpe1xuICAgICAgICAgICAgICAgIGlmIChhdHRyc1twcm9wXSBpbnN0YW5jZW9mIEFycmF5KXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3TW9kZWwuc2V0KFwiLT5cIitwcm9wLCBhdHRyc1twcm9wXS5tYXAob2JqPT57cmV0dXJuIF8uZXh0ZW5kKHt9LHRoaXMuc3ViVmlld0ltcG9ydHNbcHJvcF0ucHJvdG90eXBlLmRlZmF1bHRzLG9iail9KSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB0aGlzLnZpZXdNb2RlbC5zZXQoXCItPlwiK3Byb3AsXy5leHRlbmQoe30sdGhpcy5zdWJWaWV3SW1wb3J0c1twcm9wXS5wcm90b3R5cGUuZGVmYXVsdHMsYXR0cnNbcHJvcF0pKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgXG5cbiAgICAgICAgLy90ZW1wbGF0ZVZhbHVlcyBjb250YWluIHRlbXBsYXRlVmFsdWVzIG9mIHZpZXcgdmFyaWFibGVzIHRvIG1vZGVsIHZhcmlhYmxlcy5cbiAgICAgICAgLy9zdHJpbmdzIGFyZSByZWZlcmVuY2VzIHRvIG1vZGVsIHZhcmlhYmxlcy4gRnVuY3Rpb25zIGFyZSBmb3Igd2hlbiBhIHZpZXcgdmFyaWFibGUgZG9lc1xuICAgICAgICAvL25vdCBtYXRjaCBwZXJmZWN0bHkgd2l0aCBhIG1vZGVsIHZhcmlhYmxlLiBUaGVzZSBhcmUgdXBkYXRlZCBlYWNoIHRpbWUgdGhlIG1vZGVsIGNoYW5nZXMuXG4gICAgICAgIFxuXG4gICAgICAgIC8vUHJvYmxlbTogaWYgeW91IHVwZGF0ZSB0aGUgbW9kZWwgaXQgdXBkYXRlcyBmb3IgZXZlcnkgc3VidmlldyAobm90IGVmZmljaWVudCkuXG4gICAgICAgIC8vQW5kIGl0IGRvZXMgbm90IHVwZGF0ZSBmb3Igc3VibW9kZWxzLiBQZXJoYXBzIHRoZXJlIGFyZSBtYW55IGRpZmZlcmVudCBzb2x1dGlvbnMgZm9yIHRoaXMuXG4gICAgICAgIC8vWW91IGNhbiBoYXZlIGVhY2ggc3VibW9kZWwgdHJpZ2dlciBjaGFuZ2UgZXZlbnQuXG5cbiAgICAgICAgLy9XaGVuZXZlciB0aGUgbW9kZWwgY2hhbmdlcywgdXBkYXRlIHRoZSB2aWV3TW9kZWwgYnkgbWFwcGluZyBwcm9wZXJ0aWVzIG9mIHRoZSBtb2RlbCB0byBwcm9wZXJ0aWVzIG9mIHRoZSB2aWV3IChhc3NpZ25lZCBpbiB0ZW1wbGF0ZVZhbHVlcylcbiAgICAgICAgLy9BbHNvLCB0aGUgYXR0cmlidXRlcyBjaGFuZ2UuIFRoaXMgY2FuIGJlIGRvbmUgbW9yZSBlbGVnYW50bHlcbiAgICAgICAgaWYgKHRoaXMubW9kZWwpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2VcIiwgdGhpcy51cGRhdGVWaWV3TW9kZWwpO1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2V0QXR0cmlidXRlcyhfLmV4dGVuZCh7fSwgXy5yZXN1bHQodGhpcywgJ2F0dHJpYnV0ZXMnKSkpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMudXBkYXRlVmlld01vZGVsKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvL1Nob3VsZCB0aGUgdmlld01vZGVsIGNvbnRhaW4gdGhlIHN1YnZpZXdzIGluc3RlYWQgb2YgZGlyZWN0aXZlcz8gXG4gICAgICAgIC8vV2UgaGF2ZSBzdWJWaWV3SW1wb3J0cyBoYXZlIHRoZSBjb25zdHJ1Y3RvciwgXG4gICAgICAgIC8vVGhlIGRlZmF1bHRzIGNvbWUgZnJvbSBhIHN1Ymhhc2ggaW4gZGVmYXVsdHMsIGFuZCB0ZW1wbGF0ZVZhcnMgY29tZSBmcm9tIHRlbXBsYXRlVmFycy5cblxuXG4gICAgICAgIHZhciBhdHRycyA9IHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXM7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy52aWV3TW9kZWwuYXR0cmlidXRlcyk7XG4gICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcImRlZmluaXRpb25zXCIgJiYgIXRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXNba2V5XSkge1xuICAgICAgICAgICAgICAgIC8vcHJvYmxlbSBpcyB0aGF0IHByb3BNYXAgKHNlZW1zIHRvIGJlIHRlbXBsYXRlVmFsdWVzIHdpdGggZnVuY3Rpb25zIGZpbHRlcmVkIG91dCkgaXMgXG4gICAgICAgICAgICAgICAgLy97ZGVmaW5pdGlvbnM6XCJkZWZpbml0aW9uc1wifS4gQ29tZXMgZnJvbSBhcnRpY2xlX2FydGljbGUuanNcbiAgICAgICAgICAgICAgICBkZWJ1Z2dlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgICAgICB0aGlzLl9lbnN1cmVFbGVtZW50KCk7XG4gICAgICAgIHRoaXMuYnVpbGRJbm5lckhUTUwoKTtcblxuICAgICAgICB0aGlzLmluaXREaXJlY3RpdmVzKCk7IC8vaW5pdCBzaW1wbGUgZGlyZWN0aXZlcy4uLnRoZSBvbmVzIHRoYXQganVzdCBtYW5pcHVsYXRlIGFuIGVsZW1lbnRcblxuICAgICAgICBcblxuXG4gICAgICAgIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcblxuICAgICAgICB0aGlzLmNoaWxkTm9kZXMgPSBbXS5zbGljZS5jYWxsKHRoaXMuZWwuY2hpbGROb2RlcywgMCk7XG5cbiAgICAgICAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSxcbiAgICBcbiAgICBpbml0aWFsaXplOmZ1bmN0aW9uKG9wdGlvbnMpe1xuICAgICAgICAvL2F0dGFjaCBvcHRpb25zIHRvIHZpZXcgKG1vZGVsLCBwcm9wTWFwLCBzdWJWaWV3cywgZXZlbnRzKVxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgXy5leHRlbmQodGhpcyxvcHRpb25zKTtcbiAgICB9LFxuICAgIGdldE1vZGVsQXR0cjpmdW5jdGlvbihhdHRyKXtcbiAgICAgICAgLy9xdWlja2x5IGdyYWIgYSBtb2RlbHMgYXR0cmlidXRlIGJ5IGEgdmlldyB2YXJpYWJsZS4gVXNlZnVsIGluIGNsYXNzbmFtZSBmdW5jdGlvbi5cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLnRlbXBsYXRlVmFsdWVzW2F0dHJdID09XCJzdHJpbmdcIikgcmV0dXJuIHRoaXMubW9kZWwuZ2V0KHRoaXMudGVtcGxhdGVWYWx1ZXNbYXR0cl0pO1xuICAgICAgICBlbHNlIHJldHVybiB0aGlzLnRlbXBsYXRlVmFsdWVzW2F0dHJdLmNhbGwodGhpcylcbiAgICB9LFxuICAgIHVwZGF0ZVZpZXdNb2RlbDpmdW5jdGlvbigpe1xuXG4gICAgICAgIFxuICAgICAgICB2YXIgb2JqID0ge31cbiAgICAgICAgXG4gICAgICAgIC8vQ2hhbmdlIHRlbXBsYXRlVmFycy0+bW9kZWxWYXJzIHRvIHRlbXBsYXRlVmFycy0+bW9kZWwuZ2V0KFwibW9kZWxWYXJcIiksIGFuZCBzZXQgb24gdGhlIG1vZGVsXG4gICAgICAgIF8uZXh0ZW5kKG9iaixfLm1hcE9iamVjdCh0aGlzLnRlbXBsYXRlVmFsdWVzLGZ1bmN0aW9uKG1vZGVsVmFyKXtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbW9kZWxWYXI9PVwic3RyaW5nXCIpIHJldHVybiB0aGlzLm1vZGVsLmdldChtb2RlbFZhcik7XG4gICAgICAgICAgICBlbHNlIGlmICh0eXBlb2YgbW9kZWxWYXI9PVwiZnVuY3Rpb25cIikgcmV0dXJuIG1vZGVsVmFyLmNhbGwodGhpcylcbiAgICAgICAgfS5iaW5kKHRoaXMpKSk7XG4gICAgICAgIFxuXG4gICAgICAgIFxuICAgICAgICB0aGlzLnZpZXdNb2RlbC5zZXQob2JqKTtcblxuICAgICAgICBcbiAgICAgICAgXG4gICAgXG4gICAgfSxcbiAgICBidWlsZElubmVySFRNTDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwpIHRoaXMuJGVsLmh0bWwodGhpcy5yZW5kZXJlZFRlbXBsYXRlKCkpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBkdW1teWRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgICAgICBkdW1teWRpdi5pbm5lckhUTUwgPSB0aGlzLnJlbmRlcmVkVGVtcGxhdGUoKTtcbiAgICAgICAgICAgIHdoaWxlKGR1bW15ZGl2LmNoaWxkTm9kZXMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICB0aGlzLmVsLmFwcGVuZENoaWxkKGR1bW15ZGl2LmNoaWxkTm9kZXNbMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9tYXliZSBsZXNzIGhhY2tpc2ggc29sdXRpb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjUyMTQxMTMvMTc2MzIxN1xuICAgICAgICB9XG4gICAgfSxcbiAgICBpbml0RGlyZWN0aXZlczpmdW5jdGlvbigpe1xuXG4gICAgICAgIFxuICAgICAgICAvL0luaXQgZGlyZWN0aXZlcyBpbnZvbHZpbmcge3t9fVxuXG4gICAgICAgIC8vR2V0IGFsbCBvZiB0aGUgdGV4dCBub2RlcyBpbiB0aGUgZG9jdW1lbnQuXG4gICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cyA9IFtdO1xuICAgICAgICB0aGlzLmdldEFsbFRleHROb2RlcygpLmZvckVhY2goZnVuY3Rpb24oZnVsbFRleHROb2RlKXtcbiAgICAgICAgICAgIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjEzMTE2NzAvMTc2MzIxNyB0ZXh0Q29udGVudCBzZWVtcyByaWdodFxuXG4gICAgICAgICAgICB2YXIgcmUgPSAvXFx7XFx7KC4rPylcXH1cXH0vZzsgLy9NYXRjaCB7e3N1YlZpZXdOYW1lfX1cbiAgICAgICAgICAgIHZhciBtYXRjaDtcbiAgICAgICAgICAgIFxuXG5cbiAgICAgICAgICAgIHZhciBtYXRjaGVzID0gW107XG4gICAgICAgICAgICB3aGlsZSAoKG1hdGNoID0gcmUuZXhlYyhmdWxsVGV4dE5vZGUudGV4dENvbnRlbnQpKSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hlcy5wdXNoKG1hdGNoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG5cbiAgICAgICAgICAgIHZhciBjdXJyZW50VGV4dE5vZGUgPSBmdWxsVGV4dE5vZGU7XG4gICAgICAgICAgICB2YXIgY3VycmVudFN0cmluZyA9IGZ1bGxUZXh0Tm9kZS50ZXh0Q29udGVudDtcbiAgICAgICAgICAgIHZhciBwcmV2Tm9kZXNMZW5ndGggPSAwO1xuXG4gICAgICAgICAgICBtYXRjaGVzLmZvckVhY2goZnVuY3Rpb24obWF0Y2gpe1xuICAgICAgICAgICAgICAgIHZhciB2YXJOb2RlID0gY3VycmVudFRleHROb2RlLnNwbGl0VGV4dChtYXRjaC5pbmRleCAtIHByZXZOb2Rlc0xlbmd0aCk7XG4gICAgICAgICAgICAgICAgdmFyIGVudGlyZU1hdGNoID0gbWF0Y2hbMF1cbiAgICAgICAgICAgICAgICB2YXJOb2RlLm1hdGNoID0gbWF0Y2hbMV07XG4gICAgICAgICAgICAgICAgdGhpcy5fc3ViVmlld0VsZW1lbnRzLnB1c2godmFyTm9kZSk7XG4gICAgICAgICAgICAgICAgY3VycmVudFRleHROb2RlID0gdmFyTm9kZS5zcGxpdFRleHQoZW50aXJlTWF0Y2gubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGN1cnJlbnRTdHJpbmcgPSBjdXJyZW50VGV4dE5vZGUudGV4dENvbnRlbnQ7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcHJldk5vZGVzTGVuZ3RoPW1hdGNoLmluZGV4ICsgZW50aXJlTWF0Y2gubGVuZ3RoOy8vTm90ZTogVGhpcyB3b3JrcyBhY2NpZGVudGFsbHkuIE1pZ2h0IGJlIHdyb25nLlxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgXG5cbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgdGhpcy5kaXJlY3RpdmUgPSB7fTtcblxuICAgICAgIFxuXG5cbiAgICAgICAgZm9yICh2YXIgZGlyZWN0aXZlTmFtZSBpbiBEaXJlY3RpdmVSZWdpc3RyeSl7XG4gICAgICAgICAgICB2YXIgX19wcm90byA9IERpcmVjdGl2ZVJlZ2lzdHJ5W2RpcmVjdGl2ZU5hbWVdLnByb3RvdHlwZVxuICAgICAgICAgICAgaWYgKF9fcHJvdG8gaW5zdGFuY2VvZiBEaXJlY3RpdmUpeyAvL2JlY2F1c2UgZm9yZWFjaCB3aWxsIGdldCBtb3JlIHRoYW4ganVzdCBvdGhlciBkaXJlY3RpdmVzXG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBfX3Byb3RvLm5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGVsZW1lbnRzID0gKHRoaXMuJGVsKT8kLm1ha2VBcnJheSh0aGlzLiRlbC5maW5kKFwiW25tLVwiK25hbWUrXCJdXCIpKTokLm1ha2VBcnJheSgkKHRoaXMuZWwucXVlcnlTZWxlY3RvckFsbChcIltubS1cIituYW1lK1wiXVwiKSkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtuYW1lXSA9IGVsZW1lbnRzLm1hcChmdW5jdGlvbihlbGVtZW50LGksZWxlbWVudHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9vbiB0aGUgc2Vjb25kIGdvLWFyb3VuZCBmb3Igbm0tbWFwLCBkaXJlY3RpdmVOYW1lIHNvbWVob3cgaXMgY2FsbGVkIFwiU3ViVmlld1wiXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERpcmVjdGl2ZVJlZ2lzdHJ5W2RpcmVjdGl2ZU5hbWVdKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWw6ZWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWw6ZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJubS1cIituYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAgIFxuXG5cbiAgICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uKHN1YlZpZXdFbGVtZW50KXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gc3ViVmlld0VsZW1lbnQubWF0Y2guc3BsaXQoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoPT0xKXtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZGlyZWN0aXZlW1wic3Vidmlld1wiXSkgdGhpcy5kaXJlY3RpdmVbXCJzdWJ2aWV3XCJdID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5kaXJlY3RpdmVbXCJzdWJ2aWV3XCJdLnB1c2gobmV3IERpcmVjdGl2ZVJlZ2lzdHJ5W1wiU3Vidmlld1wiXSh7XG4gICAgICAgICAgICAgICAgICAgIHZpZXc6dGhpcyxcbiAgICAgICAgICAgICAgICAgICAgZWw6c3ViVmlld0VsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIHZhbDpzdWJWaWV3RWxlbWVudC5tYXRjaFxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmRpcmVjdGl2ZVtcIm1hcFwiXSkgdGhpcy5kaXJlY3RpdmVbXCJtYXBcIl0gPSBbXTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtcIm1hcFwiXS5wdXNoKG5ldyBEaXJlY3RpdmVSZWdpc3RyeVtcIk1hcFwiXSh7XG4gICAgICAgICAgICAgICAgICAgIHZpZXc6dGhpcyxcbiAgICAgICAgICAgICAgICAgICAgZWw6c3ViVmlld0VsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIHZhbDpzdWJWaWV3RWxlbWVudC5tYXRjaFxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuXG5cbiAgICAgICBcbiAgICAgICAgLypcbiAgICAgICAgdGhpcy5fc3ViVmlld0VsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24oc3ViVmlld0VsZW1lbnQpe1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBzdWJWaWV3RWxlbWVudC5tYXRjaC5zcGxpdChcIjpcIik7XG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGg9PTEpe1xuICAgICAgICAgICAgICAgIC8vc3VidmlldyB3aXRoIG5vIGNvbnRleHQgb2JqXG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAvL0NoZWNrIGZvciBjb2xsZWN0aW9uIG9yIG1vZGVsIHBhc3NlZC5cbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xuICAgICAgICAgICAgZWxlbWVudC5zdHlsZS5iYWNrZ3JvdW5kPVwieWVsbG93XCI7XG4gICAgICAgICAgICBlbGVtZW50LmlubmVySFRNTCA9IHN1YlZpZXdFbGVtZW50Lm1hdGNoO1xuICAgICAgICAgICAgc3ViVmlld0VsZW1lbnQucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoZWxlbWVudCxzdWJWaWV3RWxlbWVudCk7XG4gICAgICAgIH0pKi9cblxuICAgICAgIFxuXG5cbiAgICAgICAgXG4gICAgfSxcbiAgICByZW5kZXJlZFRlbXBsYXRlOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLmpzdCkge1xuICAgICAgICAgICAgd2luZG93Ll8gPSBfO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuanN0KHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgcmV0dXJuIF8udGVtcGxhdGUodGhpcy50ZW1wbGF0ZVN0cmluZykodGhpcy52aWV3TW9kZWwuYXR0cmlidXRlcylcbiAgICB9LFxuICAgIGRlbGVnYXRlRXZlbnRzOiBmdW5jdGlvbihldmVudHMpIHsvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzEyMTkzMDY5LzE3NjMyMTdcbiAgICAgICAgdmFyIGRlbGVnYXRlRXZlbnRTcGxpdHRlciA9IC9eKFxcUyspXFxzKiguKikkLztcbiAgICAgICAgZXZlbnRzIHx8IChldmVudHMgPSBfLnJlc3VsdCh0aGlzLCAnZXZlbnRzJykpOyAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIGlmICghZXZlbnRzKSByZXR1cm4gdGhpcztcbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBldmVudHMpIHtcbiAgICAgICAgICAgIHZhciBtZXRob2QgPSBldmVudHNba2V5XTtcbiAgICAgICAgICAgIGlmICghXy5pc0Z1bmN0aW9uKG1ldGhvZCkpIG1ldGhvZCA9IHRoaXNbZXZlbnRzW2tleV1dO1xuICAgICAgICAgICAgaWYgKCFtZXRob2QpIHRocm93IG5ldyBFcnJvcignTWV0aG9kIFwiJyArIGV2ZW50c1trZXldICsgJ1wiIGRvZXMgbm90IGV4aXN0Jyk7XG4gICAgICAgICAgICB2YXIgbWF0Y2ggPSBrZXkubWF0Y2goZGVsZWdhdGVFdmVudFNwbGl0dGVyKTtcbiAgICAgICAgICAgIHZhciBldmVudFR5cGVzID0gbWF0Y2hbMV0uc3BsaXQoJywnKSwgc2VsZWN0b3IgPSBtYXRjaFsyXTtcbiAgICAgICAgICAgIG1ldGhvZCA9IF8uYmluZChtZXRob2QsIHRoaXMpO1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgXyhldmVudFR5cGVzKS5lYWNoKGZ1bmN0aW9uKGV2ZW50TmFtZSkge1xuICAgICAgICAgICAgICAgIGV2ZW50TmFtZSArPSAnLmRlbGVnYXRlRXZlbnRzJyArIHNlbGYuY2lkO1xuICAgICAgICAgICAgICAgIGlmIChzZWxlY3RvciA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICBzZWxmLiRlbC5iaW5kKGV2ZW50TmFtZSwgbWV0aG9kKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRlbC5kZWxlZ2F0ZShzZWxlY3RvciwgZXZlbnROYW1lLCBtZXRob2QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgXG4gICAgfSxcblxuXG5cblxuICAgIHRhZ05hbWU6dW5kZWZpbmVkLC8vZG9uJ3Qgd2FudCBhIHRhZ05hbWUgdG8gYmUgZGl2IGJ5IGRlZmF1bHQuIFJhdGhlciwgbWFrZSBpdCBhIGRvY3VtZW50ZnJhZ21lbnQnXG4gICAgc3ViVmlld0ltcG9ydHM6e30sXG4gICAgY2hpbGRWaWV3SW1wb3J0czp7fSxcbiAgICBfZW5zdXJlRWxlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvL092ZXJyaWRpbmcgdGhpcyB0byBzdXBwb3J0IGRvY3VtZW50IGZyYWdtZW50c1xuICAgICAgICBpZiAoIXRoaXMuZWwpIHtcbiAgICAgICAgICAgIGlmKHRoaXMuYXR0cmlidXRlcyB8fCB0aGlzLmlkIHx8IHRoaXMuY2xhc3NOYW1lIHx8IHRoaXMudGFnTmFtZSl7Ly9pZiB5b3UgaGF2ZSBhbnkgb2YgdGhlc2UgYmFja2JvbmUgcHJvcGVydGllcywgZG8gYmFja2JvbmUgYmVoYXZpb3JcbiAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJzID0gXy5leHRlbmQoe30sIF8ucmVzdWx0KHRoaXMsICdhdHRyaWJ1dGVzJykpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pZCkgYXR0cnMuaWQgPSBfLnJlc3VsdCh0aGlzLCAnaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2xhc3NOYW1lKSBhdHRyc1snY2xhc3MnXSA9IF8ucmVzdWx0KHRoaXMsICdjbGFzc05hbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KHRoaXMuX2NyZWF0ZUVsZW1lbnQoXy5yZXN1bHQodGhpcywgJ3RhZ05hbWUnKSB8fCAnZGl2JykpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXRBdHRyaWJ1dGVzKGF0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7Ly9ob3dldmVyLCBkZWZhdWx0IHRvIHRoaXMuZWwgYmVpbmcgYSBkb2N1bWVudGZyYWdtZW50IChtYWtlcyB0aGlzLmVsIG5hbWVkIGltcHJvcGVybHkgYnV0IHdoYXRldmVyKVxuICAgICAgICAgICAgICAgIHRoaXMuZWwgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldEVsZW1lbnQoXy5yZXN1bHQodGhpcywgJ2VsJykpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBzZXQ6ZnVuY3Rpb24ob2JqKXtcblxuICAgICAgICB0aGlzLnZpZXdNb2RlbC5zZXQob2JqKTtcbiAgICB9LFxuICAgIGdldDpmdW5jdGlvbihwcm9wKXtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlld01vZGVsLmdldChwcm9wKVxuICAgIH1cbn0pO1xuIiwiLy9TYW1lIG1vZGVsLCBjb2xsZWN0aW9uIGluIHNhbWUgZmlsZSBmb3Igbm93IGJlY2F1c2UgdGhlc2UgbW9kdWxlcyByZWx5IG9uIGVhY2ggb3RoZXIuXG5cbi8qaW1wb3J0IF8gZnJvbSBcInVuZGVyc2NvcmVcIjsqL1xuLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbmltcG9ydCBNb2RlbCBmcm9tIFwiLi9Nb2RlbFwiO1xuaW1wb3J0IENvbGxlY3Rpb24gZnJvbSBcIi4vQ29sbGVjdGlvblwiO1xuaW1wb3J0IFZpZXcgZnJvbSBcIi4vVmlld1wiO1xuaW1wb3J0IERpcmVjdGl2ZVJlZ2lzdHJ5IGZyb20gXCIuL2RpcmVjdGl2ZS9kaXJlY3RpdmVSZWdpc3RyeVwiO1xuLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cblxudmFyIEZhaml0YSA9IHtNb2RlbCwgQ29sbGVjdGlvbiwgVmlldywgRGlyZWN0aXZlUmVnaXN0cnl9O1xuRmFqaXRhW1wi8J+MrlwiXSA9IFwiMC4wLjBcIjtcblxuaWYgKHR5cGVvZiB3aW5kb3chPT1cInVuZGVmaW5lZFwiKSB3aW5kb3cuRmFqaXRhID0gRmFqaXRhO1xuaWYgKHR5cGVvZiBnbG9iYWwhPT1cInVuZGVmaW5lZFwiKSBnbG9iYWwuRmFqaXRhID0gRmFqaXRhOyJdLCJuYW1lcyI6WyJCYWNrYm9uZSIsIk1vZGVsIiwiZXh0ZW5kIiwib3B0aW9ucyIsIlVSTFNlYXJjaFBhcmFtcyIsInF1ZXJ5Iiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJzdHJ1Y3R1cmUiLCJwYXJlbnRNb2RlbHMiLCJpbml0IiwiYXR0ciIsIl8iLCJpc1N0cmluZyIsInByb3BzIiwic3BsaXQiLCJsZW5ndGgiLCJtb2RlbCIsInNsaWNlIiwiZm9yRWFjaCIsInByb3AiLCJnZXQiLCJwcm90b3R5cGUiLCJhcHBseSIsImFyZ3VtZW50cyIsImlzVW5kZWZpbmVkIiwia2V5IiwidmFsMSIsInZhbDIiLCJzZXQiLCJ2YWwiLCJpIiwibmV3TW9kZWwiLCJGYWppdGEiLCJpc0FycmF5IiwiQ29sbGVjdGlvbiIsInB1c2giLCJsaXN0ZW5UbyIsInRyaWdnZXIiLCJvbiIsIlZpZXciLCJuYW1lIiwiY29uc29sZSIsImVycm9yIiwidmlldyIsImNoaWxkSW5pdCIsImJ1aWxkIiwidXBkYXRlUmVzdWx0Iiwidmlld01vZGVsIiwicmVuZGVyIiwicmVzdWx0IiwiaXNGdW5jdGlvbiIsImNhbGwiLCJEaXJlY3RpdmUiLCIkZWwiLCJlbCIsInNldEF0dHJpYnV0ZSIsImlubmVySFRNTCIsInZhbHVlIiwicGFzcyIsImdldEF0dHJpYnV0ZSIsIiQiLCJhIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiY2xhc3NMaXN0IiwiYWRkIiwid3JhcHBlckEiLCJwYXJlbnROb2RlIiwicmVwbGFjZUNoaWxkIiwiYXBwZW5kQ2hpbGQiLCJwYXJlbnQiLCJhcmdzIiwic3ViVmlld05hbWUiLCJzdWJNb2RlbE5hbWUiLCJzdWJNb2RlbCIsInN1YkNvbGxlY3Rpb24iLCJjaGlsZE1hcHBpbmdzIiwidGVtcGxhdGVWYWx1ZXMiLCJkZWZhdWx0c092ZXJyaWRlIiwiQWJzdHJhY3RTdWJ2aWV3IiwicmVuZGVyQWRkIiwicmVuZGVyUmVzZXQiLCJyZW5kZXJSZW1vdmUiLCJyZW5kZXJTb3J0IiwiQ2hpbGRWaWV3IiwiY2hpbGRWaWV3SW1wb3J0cyIsImNoaWxkVmlld09wdGlvbnMiLCJ0YWdOYW1lIiwiY2hpbGRWaWV3cyIsIm1hcCIsImNoaWxkTW9kZWwiLCJtb2RlbHMiLCJhdHRyaWJ1dGVzIiwiY2hpbGR2aWV3IiwiYmluZCIsIl9pbml0aWFsaXplQmFja2JvbmVPYmplY3QiLCJfaW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3MiLCJfaW5pdGlhbGl6ZWRlZmF1bHRzT3ZlcnJpZGUiLCJfaW5pdGlhbGl6ZUNoaWxkVmlld3MiLCJyZXBsYWNlV2l0aCIsInN1YlZpZXciLCIkY2hpbGRyZW4iLCJjaGlsZFZpZXciLCJpbmRleCIsImRlbGVnYXRlRXZlbnRzIiwiJHBhcmVudCIsImNoaWxkcmVuIiwiZWFjaCIsImV4aXN0aW5nQ2hpbGRWaWV3IiwiZmlsdGVyIiwibmV3Q2hpbGRWaWV3IiwiZW1wdHkiLCJjaGlsZCIsImFwcGVuZCIsImxhc3QiLCJyZW1vdmUiLCJzcGxpY2UiLCJjb250YWlucyIsImhpZGUiLCJjc3MiLCJib2R5IiwiRXJyb3IiLCJpcyIsIndyYXBwZXIiLCJjaGlsZE5vZGVzIiwidW53cmFwIiwiaW5zZXJ0QmVmb3JlIiwic3ViVmlld0ltcG9ydHMiLCJDaGlsZENvbnN0cnVjdG9yIiwiY2xhc3NlcyIsImNsIiwicGFyZW50RGlyZWN0aXZlIiwib3B0aW9uc1NlbnRUb1N1YlZpZXciLCJjb250ZW50IiwicmVnaXN0cnkiLCJEaXJlY3RpdmVDb250ZW50IiwiRGlyZWN0aXZlRW5hYmxlIiwiRGlyZWN0aXZlRGlzYWJsZSIsIkRpcmVjdGl2ZUhyZWYiLCJEaXJlY3RpdmVNYXAiLCJEaXJlY3RpdmVPcHRpb25hbCIsIkRpcmVjdGl2ZU9wdGlvbmFsV3JhcCIsIkRpcmVjdGl2ZVNyYyIsIkRpcmVjdGl2ZVN1YnZpZXciLCJEaXJlY3RpdmVEYXRhIiwiYmFja2JvbmVWaWV3T3B0aW9ucyIsImFkZGl0aW9uYWxWaWV3T3B0aW9ucyIsIm4iLCJ3YWxrIiwiY3JlYXRlVHJlZVdhbGtlciIsIk5vZGVGaWx0ZXIiLCJTSE9XX1RFWFQiLCJuZXh0Tm9kZSIsImNvbnN0cnVjdG9yIiwid2FybiIsImpzdCIsInRlbXBsYXRlU3RyaW5nIiwiZGVmYXVsdHMiLCJ0ZW1wbGF0ZSIsInBpY2siLCJjb25jYXQiLCJkZWYiLCJhdHRycyIsImNsb25lIiwiQXJyYXkiLCJvYmoiLCJ1cGRhdGVWaWV3TW9kZWwiLCJfc2V0QXR0cmlidXRlcyIsImtleXMiLCJPYmplY3QiLCJfZW5zdXJlRWxlbWVudCIsImJ1aWxkSW5uZXJIVE1MIiwiaW5pdERpcmVjdGl2ZXMiLCJpbml0aWFsaXplIiwibWFwT2JqZWN0IiwibW9kZWxWYXIiLCJodG1sIiwicmVuZGVyZWRUZW1wbGF0ZSIsImR1bW15ZGl2IiwiX3N1YlZpZXdFbGVtZW50cyIsImdldEFsbFRleHROb2RlcyIsImZ1bGxUZXh0Tm9kZSIsInJlIiwibWF0Y2giLCJtYXRjaGVzIiwiZXhlYyIsInRleHRDb250ZW50IiwiY3VycmVudFRleHROb2RlIiwiY3VycmVudFN0cmluZyIsInByZXZOb2Rlc0xlbmd0aCIsInZhck5vZGUiLCJzcGxpdFRleHQiLCJlbnRpcmVNYXRjaCIsImRpcmVjdGl2ZSIsImRpcmVjdGl2ZU5hbWUiLCJEaXJlY3RpdmVSZWdpc3RyeSIsIl9fcHJvdG8iLCJlbGVtZW50cyIsIm1ha2VBcnJheSIsImZpbmQiLCJxdWVyeVNlbGVjdG9yQWxsIiwiZWxlbWVudCIsInN1YlZpZXdFbGVtZW50IiwiZXZlbnRzIiwiZGVsZWdhdGVFdmVudFNwbGl0dGVyIiwidW5kZWxlZ2F0ZUV2ZW50cyIsIm1ldGhvZCIsImV2ZW50VHlwZXMiLCJzZWxlY3RvciIsInNlbGYiLCJldmVudE5hbWUiLCJjaWQiLCJkZWxlZ2F0ZSIsInVuZGVmaW5lZCIsImlkIiwiY2xhc3NOYW1lIiwic2V0RWxlbWVudCIsIl9jcmVhdGVFbGVtZW50IiwiY3JlYXRlRG9jdW1lbnRGcmFnbWVudCIsImdsb2JhbCJdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7OztBQUlBLFlBQWVBLFNBQVNDLEtBQVQsQ0FBZUMsTUFBZixDQUFzQjs7Y0FFeEIsb0JBQVNDLE9BQVQsRUFBaUI7UUFDckIsT0FBT0MsZUFB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
