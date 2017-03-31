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

        if (this.subViewImports) {
            for (var prop in this.subViewImports) {
                this.viewModel.set("->" + prop, attrs[prop]);
                console.log("->" + prop, attrs[prop]);
            }
        }
        console.log(this.viewModel);

        //templateValues contain templateValues of view variables to model variables.
        //strings are references to model variables. Functions are for when a view variable does
        //not match perfectly with a model variable. These are updated each time the model changes.
        this.propMap = {};
        this.funcs = {};

        _.each(this.templateValues, function (modelVar, templateVar) {
            if (typeof modelVar == "string") this.propMap[templateVar] = modelVar;else if (typeof modelVar == "function") this.funcs[templateVar] = modelVar;
        }.bind(this));

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFqaXRhLmpzIiwic291cmNlcyI6WyJNb2RlbC5qcyIsIkNvbGxlY3Rpb24uanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1jb250ZW50LmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1lbmFibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRpc2FibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWhyZWYuanMiLCJkaXJlY3RpdmUvYWJzdHJhY3Qtc3Vidmlldy5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtbWFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1vcHRpb25hbC5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtb3B0aW9uYWx3cmFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1zcmMuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLXN1YnZpZXcuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRhdGEuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnkuanMiLCJWaWV3LmpzIiwiQmFzZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5cblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgXG4gIGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgaWYgKCB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSBcInVuZGVmaW5lZFwiICl7XG4gICAgICB0aGlzLnF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICB9XG5cbiAgIFxuXG4gICAgLy9uZXdcbiAgICB0aGlzLnN0cnVjdHVyZSA9IHt9O1xuXG4gICAgdGhpcy5wYXJlbnRNb2RlbHMgPSBbXTtcbiAgICB0aGlzLmluaXQoKTtcbiAgfSxcbiAgaW5pdDpmdW5jdGlvbigpe30sXG4gIFxuICBnZXQ6ZnVuY3Rpb24oYXR0cil7XG5cbiAgICAvL1RvZG86IGVycm9yIGNoZWNrIHdoZW4gYXR0ciBoYXMgXCItPlwiIGJ1dCBkb2Vzbid0IHN0YXJ0IHdpdGggLT5cblxuICAgIGlmIChfLmlzU3RyaW5nKGF0dHIpKXtcbiAgICAgIHZhciBwcm9wcyA9IGF0dHIuc3BsaXQoXCItPlwiKTtcbiAgICAgIGlmIChwcm9wcy5sZW5ndGggPiAxKXtcbiAgICAgICAgdmFyIG1vZGVsID0gdGhpcztcbiAgICAgICAgcHJvcHMuc2xpY2UoMSkuZm9yRWFjaChmdW5jdGlvbihwcm9wKXtcbiAgICAgICAgICBpZiAobW9kZWwuc3RydWN0dXJlW3Byb3BdKSBtb2RlbCA9IG1vZGVsLnN0cnVjdHVyZVtwcm9wXTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtb2RlbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGdldCA9IEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5nZXQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuICAgIGlmICghXy5pc1VuZGVmaW5lZChnZXQpKSByZXR1cm4gZ2V0O1xuICAgIFxuXG4gXG4gICBcbiAgIFxuICB9LFxuICB0b2dnbGU6ZnVuY3Rpb24oa2V5LHZhbDEsdmFsMil7XG4gICAgaWYgKHRoaXMuZ2V0KGtleSk9PXZhbDIpe1xuICAgICAgdGhpcy5zZXQoa2V5LHZhbDEpO1xuICAgIH1cbiAgICBlbHNlIHRoaXMuc2V0KGtleSx2YWwyKTtcbiAgfSxcbiAgc2V0OmZ1bmN0aW9uKGF0dHIsIHZhbCwgb3B0aW9ucyl7XG4gICBcbiAgICAvKlxuICAgIGdldCBjb2RlLi4uSSB3YW50IHNldCBjb2RlIHRvIG1pcnJvciBnZXQgY29kZVxuICAgICovXG4gICAgaWYgKF8uaXNTdHJpbmcoYXR0cikpe1xuICAgICAgdmFyIHByb3BzID0gYXR0ci5zcGxpdChcIi0+XCIpO1xuICAgICAgaWYgKHByb3BzLmxlbmd0aCA+IDEpe1xuICAgICAgICB2YXIgbW9kZWwgPSB0aGlzO1xuICAgICAgICBwcm9wcy5zbGljZSgxKS5mb3JFYWNoKGZ1bmN0aW9uKHByb3AsaSxwcm9wcyl7XG4gICAgICAgICAgaWYgKG1vZGVsLnN0cnVjdHVyZVtwcm9wXSkgbW9kZWwgPSBtb2RlbC5zdHJ1Y3R1cmVbcHJvcF07XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3TW9kZWw7XG4gICAgICAgICAgICBpZiAoaSA8IHByb3BzLmxlbmd0aCAtIDEpe1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IG5ldyBGYWppdGEuTW9kZWw7ICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IChfLmlzQXJyYXkodmFsKSk/bmV3IEZhaml0YS5Db2xsZWN0aW9uKHZhbCk6bmV3IEZhaml0YS5Nb2RlbCh2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3TW9kZWwucGFyZW50TW9kZWxzLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgbW9kZWwuc3RydWN0dXJlW3Byb3BdID0gbmV3TW9kZWw7XG4gICAgICAgICAgICBtb2RlbC5saXN0ZW5UbyhuZXdNb2RlbCxcImNoYW5nZSBhZGRcIixmdW5jdGlvbihuZXdNb2RlbCxvcHRpb25zKXtcbiAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8qIFRPRE86IGludmVudCBlbnRpcmUgc3lzdGVtIGZvciB0cmF2ZXJzaW5nIGFuZCBmaXJpbmcgZXZlbnRzLiBQcm9iYWJseSBub3Qgd29ydGggdGhlIGVmZm9ydCBmb3Igbm93LlxuICAgICAgICAgICAgICBPYmplY3Qua2V5cyhtb2RlbC5jaGFuZ2VkQXR0cmlidXRlcygpKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlOlwiK3Byb3ArXCIuXCIra2V5KVxuICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAqL1xuXG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIFxuXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICByZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG4gICAgfVxuXG5cbiAgICAgIFxuICAgICBcbiAgfVxuICAvL05vdGU6IHRoZXJlIGlzIHN0aWxsIG5vIGxpc3RlbmVyIGZvciBhIHN1Ym1vZGVsIG9mIGEgY29sbGVjdGlvbiBjaGFuZ2luZywgdHJpZ2dlcmluZyB0aGUgcGFyZW50LiBJIHRoaW5rIHRoYXQncyB1c2VmdWwuXG59KTsiLCIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgTW9kZWwgZnJvbSBcIi4vTW9kZWxcIjtcblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIG1vZGVsOk1vZGVsLCAvL3Byb2JsZW06IE1vZGVsIHJlbGllcyBvbiBjb2xsZWN0aW9uIGFzIHdlbGwgY2F1c2luZyBlcnJvclxuICAgIGluaXRpYWxpemU6ZnVuY3Rpb24oKXtcbiAgICAgICAgIHRoaXMucGFyZW50TW9kZWxzID0gW107XG4gICAgICAgIC8vdHJpZ2dlciBcInVwZGF0ZVwiIHdoZW4gc3VibW9kZWwgY2hhbmdlc1xuICAgICAgICB0aGlzLm9uKFwiYWRkXCIsZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyhtb2RlbCxcImNoYW5nZVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG59KTsiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuXG5leHBvcnQgZGVmYXVsdCBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG4gICAgbmFtZTpudWxsLFxuICAgIGJ1aWxkOm51bGwsXG4gICAgcmVuZGVyOm51bGwsXG4gICAgaW5pdGlhbGl6ZTpmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgICAgaWYgKCF0aGlzLm5hbWUpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGEgbmFtZSBpbiB0aGUgcHJvdG90eXBlLlwiKTtcbiAgICAgICAgdGhpcy52YWwgPSBvcHRpb25zLnZhbDtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvL3ZpZXcgaXMgdGhlIHZpZXcgdGhhdCBpbXBsZW1lbnRzIHRoaXMgZGlyZWN0aXZlLlxuICAgICAgICBpZiAoIW9wdGlvbnMudmlldykgY29uc29sZS5lcnJvcihcIkVycm9yOiBEaXJlY3RpdmUgcmVxdWlyZXMgYSB2aWV3IHBhc3NlZCBhcyBhbiBvcHRpb24uXCIpO1xuICAgICAgICB0aGlzLnZpZXcgPSBvcHRpb25zLnZpZXc7XG4gICAgICAgIGlmICghdGhpcy5jaGlsZEluaXQpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGNoaWxkSW5pdCBpbiBwcm90b3R5cGUuXCIpO1xuICAgICAgICB0aGlzLmNoaWxkSW5pdCgpO1xuICAgICAgICB0aGlzLmJ1aWxkKCk7XG4gICAgfSxcbiAgICBjaGlsZEluaXQ6ZnVuY3Rpb24oKXtcbiAgICAgICBcbiAgICAgICAgdGhpcy51cGRhdGVSZXN1bHQoKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnZpZXcudmlld01vZGVsLFwiY2hhbmdlOlwiK3RoaXMudmFsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVJlc3VsdCgpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuICAgIHVwZGF0ZVJlc3VsdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgcmVzdWx0ID0gdGhpcy52aWV3LmdldCh0aGlzLnZhbCk7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ocmVzdWx0KSkgdGhpcy5yZXN1bHQgPSByZXN1bHQuY2FsbCh0aGlzLnZpZXcpO1xuICAgICAgICBlbHNlIHRoaXMucmVzdWx0ID0gcmVzdWx0O1xuICAgIH1cbn0pOyIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbi8vTm90ZTogRG9uJ3QgdXNlIC5odG1sKCkgb3IgLmF0dHIoKSBqcXVlcnkuIEl0J3Mgd2VpcmQgd2l0aCBkaWZmZXJlbnQgdHlwZXMuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiY29udGVudFwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLHRoaXMucmVzdWx0KVxuICAgICAgICBlbHNlIHRoaXMuZWwuaW5uZXJIVE1MID0gdGhpcy5yZXN1bHQ7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5idWlsZCgpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHZhciBwYXNzID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikge1xuICAgICAgICAgICAgaWYgKHRoaXMuZWwuZ2V0QXR0cmlidXRlKFwidGl0bGVcIik9PXZhbHVlICsgXCJcIikgcGFzcyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5lbC5pbm5lckhUTUw9PXZhbHVlK1wiXCIpIHBhc3MgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgfVxufSk7IiwiLy9XaHkgZG9lcyB1bmRlcnNjb3JlIHdvcmsgaGVyZT9cblxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcImVuYWJsZVwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsdHJ1ZSk7XG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIixcIlwiKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpIT12YWx1ZTtcbiAgICB9XG59KTtcbiIsIi8vV2h5IGRvZXMgdW5kZXJzY29yZSB3b3JrIGhlcmU/XG5cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJkaXNhYmxlXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpPT12YWx1ZTtcbiAgICB9XG59KTtcbiIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJocmVmXCIsXG4gICBcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSB0aGlzLiRlbC5hdHRyKFwiaHJlZlwiLHRoaXMucmVzdWx0KTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgICAgICAgICAgYS5jbGFzc0xpc3QuYWRkKFwid3JhcHBlci1hXCIpXG4gICAgICAgICAgICBhLnNldEF0dHJpYnV0ZShcImhyZWZcIix0aGlzLnJlc3VsdCk7XG4gICAgICAgICAgICB0aGlzLndyYXBwZXJBID0gYTtcbiAgICAgICAgICAgIHRoaXMuZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQodGhpcy53cmFwcGVyQSx0aGlzLmVsKVxuICAgICAgICAgICAgLy9jYW4ndCBzaW1wbHkgdXNlIHRoaXMuJGVsLndyYXAoYSk7XG4gICAgICAgICAgICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTcwNzMyOC93cmFwLW9uZS1lbGVtZW50LXdpdGgtYW5vdGhlci1yZXRhaW5pbmctcmVmZXJlbmNlLXRvLXdyYXBwZXJcbiAgICAgICAgICAgIHRoaXMud3JhcHBlckEuYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93LndyYXBwZXJBID0gdGhpcy53cmFwcGVyQTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSAkKHRoaXMuZWwpLmF0dHIoXCJocmVmXCIsdGhpcy5yZXN1bHQpXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy53cmFwcGVyQS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIsdGhpcy5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgaWYgKHRoaXMuJGVsLnByb3AoXCJ0YWdOYW1lXCIpPT1cIkFcIikgcmV0dXJuICQodGhpcy5lbCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucGFyZW50KCkucHJvcChcInRhZ05hbWVcIik9PVwiQVwiICYmICQodGhpcy5lbCkucGFyZW50KCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIH1cbiAgICB9XG59KTsiLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiYWJzdHJhY3RzdWJ2aWV3XCIsXG4gICAgX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgYXJncyA9IHRoaXMudmFsLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgdGhpcy5zdWJWaWV3TmFtZSA9IGFyZ3NbMF07XG4gICAgICAgICBpZiAoYXJnc1sxXSl7XG4gICAgICAgICAgICB0aGlzLnN1Yk1vZGVsTmFtZSA9IGFyZ3NbMV07XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSB0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpOyAvL2NoYW5nZWQgZnJvbSBzdWJNb2RlbE5hbWUuXG4gICAgICAgICAgICBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCkgdGhpcy5zdWJNb2RlbCA9IG1vZGVsO1xuICAgICAgICAgICAgZWxzZSBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Db2xsZWN0aW9uKSB0aGlzLnN1YkNvbGxlY3Rpb24gPSBtb2RlbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCksKG1vZGVsIGluc3RhbmNlb2YgQmFja2JvbmUuQ29sbGVjdGlvbiksdGhpcy5zdWJDb2xsZWN0aW9uKVxuICAgICAgICAgICAgLy9kZWJ1Z2dlcjtcbiAgICAgICAgIH1cbiAgICB9LFxuICAgIF9pbml0aWFsaXplQ2hpbGRNYXBwaW5nczpmdW5jdGlvbigpe1xuICAgICAgICAvL1RoZSBKU09OIG9iamVjdCB0byBwYXNzIGFzIFwidGVtcGxhdGVWYWx1ZXNcIiB0byB0aGUgc3VidmlldyBvciB0aGUgaXRlbSBpbiB0aGUgc3ViQ29sbGVjdGlvbi5cbiAgICAgICAgIC8vRG8gbm90IHNob3J0ZW4gdG8gdmlldy5nZXQuIHZpZXcuZ2V0IGdldHMgZnJvbSB0aGUgdmlld01vZGVsIHdoaWNoIGNvbnRhaW5zIHByb3BzIGFuZCB2YWx1ZXMuLi5ub3QgdmlldyBwcm9wcyBhbmQgYXBwIHByb3BzXG4gICAgICAgIHRoaXMuY2hpbGRNYXBwaW5ncyA9IHRoaXMudmlldy50ZW1wbGF0ZVZhbHVlcyAmJiB0aGlzLnZpZXcudGVtcGxhdGVWYWx1ZXNbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgfSxcbiAgICBfaW5pdGlhbGl6ZWRlZmF1bHRzT3ZlcnJpZGU6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy9Ob3Qgc2hvcnRlbmVkIHRvIHZpZXcuZ2V0IGJlY2F1c2UgSSdtIG5vdCBzdXJlIGlmIGl0IGlzIHVzZWZ1bCB0byBkbyBzby5cbiAgICAgICAgLy92aWV3LmdldCBnZXRzIHRoZSBhcHAgdmFsdWUgbWFwcGVkIHRvIHRoZSBkZWZhdWx0IHZhbHVlLCBhbmQgaWYgbm90IHRoZW4gaXQgZ2V0cyB0aGUgZGVmYXVsdCB2YWx1ZS5cbiAgICAgICAgLy9JIHRoaW5rIHlvdSdyZSBqdXN0IG92ZXJyaWRpbmcgZGVmYXVsdHMgd2l0aCBkZWZhdWx0cywgYW5kIG5vdGhpbmcgZmFuY2llciB0aGFuIHRoYXQuXG4gICAgICAgIC8vdGhpcy5kZWZhdWx0c092ZXJyaWRlID0gdGhpcy52aWV3LmRlZmF1bHRzICYmIHRoaXMudmlldy5kZWZhdWx0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgLy9OZXZlcm1pbmQgaXQgaXMgdXNlZnVsIHRvIHVzZSAuZ2V0IGJlY2F1c2UgaWYgdGhlcmUgYXJlIG5lc3RlZCBuZXN0ZWQgdmlld3MsIHlvdSBjYW4ndCBqdXN0IGdvIHRvIHRoZSBkZWZhdWx0cyBvZiB0aGF0IHZpZXcuIFRoZXkgbWlnaHQgYmUgb3ZlcnJpZGRlbi5cblxuICAgICAgICB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUgPSB0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpO1xuICAgIH0sXG5cblxuXG4gICAgX2luaXRpYWxpemVDaGlsZFZpZXdzOmZ1bmN0aW9uKCl7XG5cbiAgICB9XG59KSIsIi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuaW1wb3J0IEFic3RyYWN0U3VidmlldyBmcm9tIFwiLi9hYnN0cmFjdC1zdWJ2aWV3XCJcbmV4cG9ydCBkZWZhdWx0IEFic3RyYWN0U3Vidmlldy5leHRlbmQoe1xuICAgIG5hbWU6XCJtYXBcIixcbiAgICBfaW5pdGlhbGl6ZUNoaWxkVmlld3M6ZnVuY3Rpb24oKXtcblxuXG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJhZGRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJBZGQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZXNldFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclJlc2V0KCk7XG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZW1vdmVcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJSZW1vdmUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJzb3J0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyU29ydCgpOyAgICAgICAgXG4gICAgICAgIH0pO1xuXG5cblxuICAgICAgICAvL01hcCBtb2RlbHMgdG8gY2hpbGRWaWV3IGluc3RhbmNlcyB3aXRoIHRoZWlyIHRlbXBsYXRlVmFsdWVzXG4gICAgICAgIHRoaXMuQ2hpbGRWaWV3ID0gdGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgICAgIHRoaXMuY2hpbGRWaWV3T3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHRlbXBsYXRlVmFsdWVzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgdGFnTmFtZTp0aGlzLnZpZXcuY2hpbGRWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXS5wcm90b3R5cGUudGFnTmFtZSB8fCBcInN1Yml0ZW1cIixcbiAgICAgICAgICAgIGRlZmF1bHRzT3ZlcnJpZGU6dGhpcy5kZWZhdWx0c092ZXJyaWRlXG4gICAgICAgIH07XG5cblxuICAgICAgICB0aGlzLmNoaWxkVmlld3MgPSB0aGlzLnN1YkNvbGxlY3Rpb24ubWFwKGZ1bmN0aW9uKGNoaWxkTW9kZWwsaSl7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBjaGlsZFZpZXdPcHRpb25zID0gXy5leHRlbmQoe30sdGhpcy5jaGlsZFZpZXdPcHRpb25zLHtcbiAgICAgICAgICAgICAgICBtb2RlbDpjaGlsZE1vZGVsLFxuICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgbGFzdEluZGV4OnRoaXMuc3ViQ29sbGVjdGlvbi5sZW5ndGggLSBpIC0gMSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNPdmVycmlkZSAmJiB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUubW9kZWxzW2ldICYmIHRoaXMuZGVmYXVsdHNPdmVycmlkZS5tb2RlbHNbaV0uYXR0cmlidXRlcyxcbiAgICAgICAgICAgICAgICAvL0p1c3QgYWRkZWQgY2hlY2sgZm9yIHRoaXMuZGVmYXVsdHNPdmVycmlkZS5tb2RlbHNbaV1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgY2hpbGR2aWV3ID0gbmV3IHRoaXMuQ2hpbGRWaWV3KGNoaWxkVmlld09wdGlvbnMpO1xuICAgICAgICAgICAgLy9jaGlsZHZpZXcuX3NldEF0dHJpYnV0ZXMoXy5leHRlbmQoe30sIF8ucmVzdWx0KGNoaWxkdmlldywgJ2F0dHJpYnV0ZXMnKSkpO1xuICAgICAgICAgICAgcmV0dXJuIGNoaWxkdmlldztcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIH0sXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdCgpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQ2hpbGRNYXBwaW5ncygpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplZGVmYXVsdHNPdmVycmlkZSgpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQ2hpbGRWaWV3cygpO1xuXG4gICAgICAgIFxuICAgICAgXG5cbiAgICAgICAgXG4gICAgICAgIFxuXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgXG4gICAgfSxcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMuc3ViQ29sbGVjdGlvbil7XG4gICAgICAgICAgICB0aGlzLiRlbC5yZXBsYWNlV2l0aCh0aGlzLnN1YlZpZXcuZWwpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB2YXIgJGNoaWxkcmVuID0gJCgpO1xuICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgICAgICRjaGlsZHJlbiA9ICRjaGlsZHJlbi5hZGQoY2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgICAgIGNoaWxkVmlldy5pbmRleCA9IGk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgaWYgKCRjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRlbC5yZXBsYWNlV2l0aCgkY2hpbGRyZW4pO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aGlzLiRwYXJlbnQgPSAkY2hpbGRyZW4ucGFyZW50KClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gdGhpcy4kZWwucGFyZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbiA9ICRjaGlsZHJlblxuICAgICAgICB9XG4gICAgfSxcbiAgICByZW5kZXJBZGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gW107XG4gICAgICAgIHRoaXMuc3ViQ29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKG1vZGVsLGkpe1xuICAgICAgICAgICAgdmFyIGV4aXN0aW5nQ2hpbGRWaWV3ID0gdGhpcy5jaGlsZFZpZXdzLmZpbHRlcihmdW5jdGlvbihjaGlsZFZpZXcpe1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZFZpZXcubW9kZWwgPT0gbW9kZWxcbiAgICAgICAgICAgIH0pWzBdO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nQ2hpbGRWaWV3KSB7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaChleGlzdGluZ0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICAvL3ZhciBhdHRyaWJ1dGVzID0gXy5leHRlbmQoe30sIF8ucmVzdWx0KGV4aXN0aW5nQ2hpbGRWaWV3LCAnYXR0cmlidXRlcycpKVxuICAgICAgICAgICAgICAgIC8vZXhpc3RpbmdDaGlsZFZpZXcuX3NldEF0dHJpYnV0ZXMoYXR0cmlidXRlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3Q2hpbGRWaWV3ID0gbmV3IHRoaXMuQ2hpbGRWaWV3KHtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWw6bW9kZWwsXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVmFsdWVzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdEluZGV4OnRoaXMuc3ViQ29sbGVjdGlvbi5sZW5ndGggLSBpIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6dGhpcy52aWV3LmdldCh0aGlzLnZhbC5zcGxpdChcIjpcIilbMF0pW2ldXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MucHVzaChuZXdDaGlsZFZpZXcpO1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2gobmV3Q2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpe1xuICAgICAgICAgICAgdGhpcy4kcGFyZW50LmFwcGVuZChjaGlsZClcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9ICQoY2hpbGRyZW4pXG4gICAgICAgIFxuICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICBjaGlsZFZpZXcuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgfSlcblxuICAgIH0sXG4gICAgcmVuZGVyUmVzZXQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgfSxcbiAgICByZW5kZXJSZW1vdmU6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4ubGFzdCgpLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmNoaWxkVmlld3Muc3BsaWNlKC0xLDEpO1xuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9IHRoaXMuJHBhcmVudC5jaGlsZHJlbigpO1xuICAgIH0sXG4gICAgcmVuZGVyU29ydDpmdW5jdGlvbigpe1xuICAgICAgICBcbiAgICAgICAgLy9Eb24ndCBuZWVkIHRoaXMgKG5vdykuIE1vZGVscyB3aWxsIGFscmVhZHkgYmUgc29ydGVkIG9uIGFkZCB3aXRoIGNvbGxlY3Rpb24uY29tcGFyYXRvciA9IHh4eDtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy90aGlzLnZpZXcgaXMgaW5zdGFuY2Ugb2YgdGhlIHZpZXcgdGhhdCBjb250YWlucyB0aGUgc3VidmlldyBkaXJlY3RpdmUuXG4gICAgICAgIC8vdGhpcy5zdWJWaWV3IGlzIGluc3RhbmNlIG9mIHRoZSBzdWJ2aWV3XG4gICAgICAgIC8vdGhpcyBpcyB0aGUgZGlyZWN0aXZlLlxuXG4gICAgICAgIGlmICh0aGlzLnN1YlZpZXcpe1xuICAgICAgICAgICAgLy93aHkgcGFyZW50Tm9kZT9cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZpZXcuZWwuY29udGFpbnModGhpcy5zdWJWaWV3LmVsLnBhcmVudE5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB2YXIgcGFzcyA9IHRydWU7XG4gICAgICAgICAgICB2YXIgZWwgPSB0aGlzLnZpZXcuZWxcbiAgICAgICAgICAgIHRoaXMuJGNoaWxkcmVuLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoIWVsLmNvbnRhaW5zKHRoaXMpKSBwYXNzID0gZmFsc2U7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICByZXR1cm4gcGFzcztcbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgfVxufSkiLCIvKmltcG9ydCAkIGZyb20gXCJqcXVlcnlcIjsqL1xuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcIm9wdGlvbmFsXCIsXG4gICAgXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCkgJCh0aGlzLmVsKS5oaWRlKClcbiAgICAgICAgZWxzZSAkKHRoaXMuZWwpLmNzcyhcImRpc3BsYXlcIixcIlwiKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLmhpZGUoKVxuICAgICAgICBlbHNlICQodGhpcy5lbCkuY3NzKFwiZGlzcGxheVwiLFwiXCIpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLmVsKSkgdGhyb3cgRXJyb3IoXCJlbGVtZW50IGhhcyB0byBiZSBpbiB0aGUgRE9NIGluIG9yZGVyIHRvIHRlc3RcIilcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkuaXMoXCI6dmlzaWJsZVwiKT09dmFsdWU7XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwib3B0aW9uYWx3cmFwXCIsXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIERpcmVjdGl2ZS5wcm90b3R5cGUuY2hpbGRJbml0LmNhbGwodGhpcyxhcmd1bWVudHMpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy53cmFwcGVyID0gdGhpcy5lbDtcbiAgICAgICAgdGhpcy5jaGlsZE5vZGVzID0gW10uc2xpY2UuY2FsbCh0aGlzLmVsLmNoaWxkTm9kZXMsIDApO1xuICAgICAgICBcbiAgICB9LFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5jaGlsZE5vZGVzKS51bndyYXAoKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KXtcbiAgICAgICAgICAgICQodGhpcy5jaGlsZE5vZGVzKS51bndyYXAoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgaWYgKCFkb2N1bWVudC5ib2R5LmNvbnRhaW5zKHRoaXMuY2hpbGROb2Rlc1swXSkpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGaXJzdCBjaGlsZCBoYXMgdG8gYmUgaW4gRE9NXCIpO1xuICAgICAgICAgICAgICAgIC8vc29sdXRpb246IGFkZCBhIGR1bW15IHRleHQgbm9kZSBhdCBiZWdpbm5pbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCFkb2N1bWVudC5ib2R5LmNvbnRhaW5zKHRoaXMud3JhcHBlcikpe1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGROb2Rlc1swXS5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLndyYXBwZXIsdGhpcy5jaGlsZE5vZGVzWzBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvcih2YXIgaT0wO2k8dGhpcy5jaGlsZE5vZGVzLmxlbmd0aDtpKyspe1xuICAgICAgICAgICAgICAgIHRoaXMud3JhcHBlci5hcHBlbmRDaGlsZCh0aGlzLmNoaWxkTm9kZXNbaV0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuXG5cbiAgICAgICAgcmV0dXJuICh0aGlzLmNoaWxkTm9kZXNbMF0ucGFyZW50Tm9kZT09dGhpcy53cmFwcGVyKSA9PSB2YWx1ZTtcblxuXG4gICAgICBcbiAgICB9XG59KSIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJzcmNcIixcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLiRlbC5hdHRyKFwic3JjXCIsdGhpcy5yZXN1bHQpO1xuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGVsLmF0dHIoXCJzcmNcIix0aGlzLnJlc3VsdCk7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsLmF0dHIoXCJzcmNcIik9PT12YWx1ZTtcbiAgICB9XG59KTsiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcbmltcG9ydCBBYnN0cmFjdFN1YnZpZXcgZnJvbSBcIi4vYWJzdHJhY3Qtc3Vidmlld1wiXG5leHBvcnQgZGVmYXVsdCBBYnN0cmFjdFN1YnZpZXcuZXh0ZW5kKHtcbiAgICBuYW1lOlwic3Vidmlld1wiLFxuICAgIF9pbml0aWFsaXplQ2hpbGRWaWV3czpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLnByb3RvdHlwZSBpbnN0YW5jZW9mIEJhY2tib25lLlZpZXcpIHRoaXMuQ2hpbGRDb25zdHJ1Y3RvciA9IHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgZWxzZSB0aGlzLkNoaWxkQ29uc3RydWN0b3IgPSB0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0vKi5jYWxsKHRoaXMudmlldyk7Ki9cblxuICAgICAgICAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmRlZmF1bHRzT3ZlcnJpZGUpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7ZGVmYXVsdHNPdmVycmlkZTp0aGlzLmRlZmF1bHRzT3ZlcnJpZGV9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmNoaWxkTWFwcGluZ3Mpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dGhpcy5jaGlsZE1hcHBpbmdzXG4gICAgICAgICAgICAgICAgLy8sZWw6dGhpcy5lbCBUaGUgZWwgb2YgdGhlIGRpcmVjdGl2ZSBzaG91bGQgYmVsb25nIHRvIHRoZSBkaXJlY3RpdmUgYnV0IG5vdCB0aGUgc3VidmlldyBpdHNlbGZcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBzdWJNb2RlbCA9IHRoaXMuc3ViTW9kZWwgfHwgdGhpcy52aWV3Lm1vZGVsO1xuICAgICAgICBpZiAoc3ViTW9kZWwpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7bW9kZWw6c3ViTW9kZWx9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldyA9IG5ldyB0aGlzLkNoaWxkQ29uc3RydWN0b3Iob3B0aW9ucyk7XG4gICAgICAgICAgICB2YXIgY2xhc3NlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImNsYXNzTmFtZVwiKVxuICAgICAgICAgICAgaWYgKGNsYXNzZXMpe1xuICAgICAgICAgICAgICAgIGNsYXNzZXMuc3BsaXQoXCIgXCIpLmZvckVhY2goZnVuY3Rpb24oY2wpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuY2xhc3NMaXN0LmFkZChjbClcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgYXR0cmlidXRlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImF0dHJpYnV0ZXNcIik7XG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlcyl7XG4gICAgICAgICAgICAgICAgXy5lYWNoKGF0dHJpYnV0ZXMsZnVuY3Rpb24odmFsLG5hbWUpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuc2V0QXR0cmlidXRlKG5hbWUsdmFsKSAgICBcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnQgPSB0aGlzLnZpZXc7XG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcucGFyZW50RGlyZWN0aXZlID0gdGhpcztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnNTZW50VG9TdWJWaWV3ID0gb3B0aW9ucztcbiAgICB9LFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICAvL3RoaXMudmFsLCB0aGlzLnZpZXdcblxuICAgICAgICB0aGlzLl9pbml0aWFsaXplQmFja2JvbmVPYmplY3QoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3MoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZWRlZmF1bHRzT3ZlcnJpZGUoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkVmlld3MoKTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgXG4gICAgICBcblxuICAgICAgICBpZiAodGhpcy5zdWJDb2xsZWN0aW9uKXsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJhZGRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckFkZCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZXNldFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyUmVzZXQoKTtcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZW1vdmVcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJzb3J0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJTb3J0KCk7ICAgICAgICBcbiAgICAgICAgICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgICAgICAgICAvL01hcCBtb2RlbHMgdG8gY2hpbGRWaWV3IGluc3RhbmNlcyB3aXRoIHRoZWlyIHRlbXBsYXRlVmFsdWVzXG4gICAgICAgICAgICAgICAgdGhpcy5DaGlsZFZpZXcgPSB0aGlzLnZpZXcuY2hpbGRWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld09wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVmFsdWVzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIHRhZ05hbWU6dGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlLnRhZ05hbWUgfHwgXCJzdWJpdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRzT3ZlcnJpZGU6dGhpcy5kZWZhdWx0c092ZXJyaWRlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MgPSB0aGlzLnN1YkNvbGxlY3Rpb24ubWFwKGZ1bmN0aW9uKGNoaWxkTW9kZWwsaSl7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB2YXIgY2hpbGRWaWV3T3B0aW9ucyA9IF8uZXh0ZW5kKHt9LHRoaXMuY2hpbGRWaWV3T3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlbDpjaGlsZE1vZGVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNPdmVycmlkZSAmJiB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUubW9kZWxzW2ldICYmIHRoaXMuZGVmYXVsdHNPdmVycmlkZS5tb2RlbHNbaV0uYXR0cmlidXRlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vSnVzdCBhZGRlZCBjaGVjayBmb3IgdGhpcy5kZWZhdWx0c092ZXJyaWRlLm1vZGVsc1tpXVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHZhciBjaGlsZHZpZXcgPSBuZXcgdGhpcy5DaGlsZFZpZXcoY2hpbGRWaWV3T3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIC8vY2hpbGR2aWV3Ll9zZXRBdHRyaWJ1dGVzKF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChjaGlsZHZpZXcsICdhdHRyaWJ1dGVzJykpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkdmlldztcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuXG5cbiAgICAgICAgICAgICAgICBcblxuXG5cbiAgICAgICAgfVxuXG4gICAgICAgXG4gICAgICAgIFxuICAgICAgICBcblxuICAgICAgICBpZiAoIXRoaXMuc3ViQ29sbGVjdGlvbil7XG4gICAgICAgICAgICBpZiAodGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLnByb3RvdHlwZSBpbnN0YW5jZW9mIEJhY2tib25lLlZpZXcpIHRoaXMuQ2hpbGRDb25zdHJ1Y3RvciA9IHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgICAgIGVsc2UgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLyouY2FsbCh0aGlzLnZpZXcpOyovXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuZGVmYXVsdHNPdmVycmlkZSl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNPdmVycmlkZX0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuY2hpbGRNYXBwaW5ncyl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp0aGlzLmNoaWxkTWFwcGluZ3NcbiAgICAgICAgICAgICAgICAvLyxlbDp0aGlzLmVsIFRoZSBlbCBvZiB0aGUgZGlyZWN0aXZlIHNob3VsZCBiZWxvbmcgdG8gdGhlIGRpcmVjdGl2ZSBidXQgbm90IHRoZSBzdWJ2aWV3IGl0c2VsZlxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHN1Yk1vZGVsID0gdGhpcy5zdWJNb2RlbCB8fCB0aGlzLnZpZXcubW9kZWw7XG4gICAgICAgIGlmIChzdWJNb2RlbCl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHttb2RlbDpzdWJNb2RlbH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy5zdWJWaWV3ID0gbmV3IHRoaXMuQ2hpbGRDb25zdHJ1Y3RvcihvcHRpb25zKTtcbiAgICAgICAgICAgIHZhciBjbGFzc2VzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiY2xhc3NOYW1lXCIpXG4gICAgICAgICAgICBpZiAoY2xhc3Nlcyl7XG4gICAgICAgICAgICAgICAgY2xhc3Nlcy5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihjbCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5jbGFzc0xpc3QuYWRkKGNsKVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiYXR0cmlidXRlc1wiKTtcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgICAgICBfLmVhY2goYXR0cmlidXRlcyxmdW5jdGlvbih2YWwsbmFtZSl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5zZXRBdHRyaWJ1dGUobmFtZSx2YWwpICAgIFxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zdWJWaWV3LnBhcmVudCA9IHRoaXMudmlldztcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnREaXJlY3RpdmUgPSB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9uc1NlbnRUb1N1YlZpZXcgPSBvcHRpb25zO1xuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgodGhpcy5zdWJWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyICRjaGlsZHJlbiA9ICQoKTtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAkY2hpbGRyZW4gPSAkY2hpbGRyZW4uYWRkKGNoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICBjaGlsZFZpZXcuaW5kZXggPSBpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIGlmICgkY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgoJGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkVmlldy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gJGNoaWxkcmVuLnBhcmVudCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkY2hpbGRyZW5cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyQWRkOmZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IFtdO1xuICAgICAgICB0aGlzLnN1YkNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihtb2RlbCxpKXtcbiAgICAgICAgICAgIHZhciBleGlzdGluZ0NoaWxkVmlldyA9IHRoaXMuY2hpbGRWaWV3cy5maWx0ZXIoZnVuY3Rpb24oY2hpbGRWaWV3KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRWaWV3Lm1vZGVsID09IG1vZGVsXG4gICAgICAgICAgICB9KVswXTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ0NoaWxkVmlldykge1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goZXhpc3RpbmdDaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICAgICAgLy92YXIgYXR0cmlidXRlcyA9IF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChleGlzdGluZ0NoaWxkVmlldywgJ2F0dHJpYnV0ZXMnKSlcbiAgICAgICAgICAgICAgICAvL2V4aXN0aW5nQ2hpbGRWaWV3Ll9zZXRBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld0NoaWxkVmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyh7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsOm1vZGVsLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp0aGlzLmNoaWxkTWFwcGluZ3MsXG4gICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOnRoaXMudmlldy5nZXQodGhpcy52YWwuc3BsaXQoXCI6XCIpWzBdKVtpXVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnB1c2gobmV3Q2hpbGRWaWV3KTtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKG5ld0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKXtcbiAgICAgICAgICAgIHRoaXMuJHBhcmVudC5hcHBlbmQoY2hpbGQpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkKGNoaWxkcmVuKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIH0pXG5cbiAgICB9LFxuICAgIHJlbmRlclJlc2V0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgIH0sXG4gICAgcmVuZGVyUmVtb3ZlOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGNoaWxkcmVuLmxhc3QoKS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnNwbGljZSgtMSwxKTtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSB0aGlzLiRwYXJlbnQuY2hpbGRyZW4oKTtcbiAgICB9LFxuICAgIHJlbmRlclNvcnQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgIC8vRG9uJ3QgbmVlZCB0aGlzIChub3cpLiBNb2RlbHMgd2lsbCBhbHJlYWR5IGJlIHNvcnRlZCBvbiBhZGQgd2l0aCBjb2xsZWN0aW9uLmNvbXBhcmF0b3IgPSB4eHg7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vdGhpcy52aWV3IGlzIGluc3RhbmNlIG9mIHRoZSB2aWV3IHRoYXQgY29udGFpbnMgdGhlIHN1YnZpZXcgZGlyZWN0aXZlLlxuICAgICAgICAvL3RoaXMuc3ViVmlldyBpcyBpbnN0YW5jZSBvZiB0aGUgc3Vidmlld1xuICAgICAgICAvL3RoaXMgaXMgdGhlIGRpcmVjdGl2ZS5cblxuICAgICAgICBpZiAodGhpcy5zdWJWaWV3KXtcbiAgICAgICAgICAgIC8vd2h5IHBhcmVudE5vZGU/XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aWV3LmVsLmNvbnRhaW5zKHRoaXMuc3ViVmlldy5lbC5wYXJlbnROb2RlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyIHBhc3MgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGVsID0gdGhpcy52aWV3LmVsXG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbi5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCFlbC5jb250YWlucyh0aGlzKSkgcGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbn0pIiwiLyppbXBvcnQgXyBmcm9tIFwidW5kZXJzY29yZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiZGF0YVwiLFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmNvbnRlbnQgPSB0aGlzLnZpZXcudmlld01vZGVsLmdldCh0aGlzLnZhbCk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy52aWV3LnZpZXdNb2RlbCxcImNoYW5nZTpcIit0aGlzLnZhbCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5jb250ZW50ID0gdGhpcy52aWV3LnZpZXdNb2RlbC5nZXQodGhpcy52YWwpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgXy5lYWNoKHRoaXMuY29udGVudCxmdW5jdGlvbih2YWwscHJvcCl7XG4gICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsKSkgdmFsID0gdmFsLmJpbmQodGhpcy52aWV3KTtcbiAgICAgICAgICAgdGhpcy4kZWwuYXR0cihcImRhdGEtXCIrcHJvcCx2YWwpXG4gICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgXy5lYWNoKHRoaXMuY29udGVudCxmdW5jdGlvbih2YWwscHJvcCl7XG4gICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsKSkgdmFsID0gdmFsLmJpbmQodGhpcy52aWV3KTtcbiAgICAgICAgICAgdGhpcy4kZWwuYXR0cihcImRhdGEtXCIrcHJvcCx2YWwpXG4gICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH1cbn0pOyIsImltcG9ydCBEaXJlY3RpdmVDb250ZW50IGZyb20gXCIuL2RpcmVjdGl2ZS1jb250ZW50XCI7XG5pbXBvcnQgRGlyZWN0aXZlRW5hYmxlIGZyb20gXCIuL2RpcmVjdGl2ZS1lbmFibGVcIjtcbmltcG9ydCBEaXJlY3RpdmVEaXNhYmxlIGZyb20gXCIuL2RpcmVjdGl2ZS1kaXNhYmxlXCI7XG5pbXBvcnQgRGlyZWN0aXZlSHJlZiBmcm9tIFwiLi9kaXJlY3RpdmUtaHJlZlwiO1xuaW1wb3J0IERpcmVjdGl2ZU1hcCBmcm9tIFwiLi9kaXJlY3RpdmUtbWFwXCI7XG5pbXBvcnQgRGlyZWN0aXZlT3B0aW9uYWwgZnJvbSBcIi4vZGlyZWN0aXZlLW9wdGlvbmFsXCI7XG5pbXBvcnQgRGlyZWN0aXZlT3B0aW9uYWxXcmFwIGZyb20gXCIuL2RpcmVjdGl2ZS1vcHRpb25hbHdyYXBcIjtcbmltcG9ydCBEaXJlY3RpdmVTcmMgZnJvbSBcIi4vZGlyZWN0aXZlLXNyY1wiO1xuaW1wb3J0IERpcmVjdGl2ZVN1YnZpZXcgZnJvbSBcIi4vZGlyZWN0aXZlLXN1YnZpZXdcIjtcbmltcG9ydCBEaXJlY3RpdmVEYXRhIGZyb20gXCIuL2RpcmVjdGl2ZS1kYXRhXCI7XG5cbnZhciByZWdpc3RyeSA9IHtcbiAgICBDb250ZW50OkRpcmVjdGl2ZUNvbnRlbnQsXG4gICAgRW5hYmxlOkRpcmVjdGl2ZUVuYWJsZSxcbiAgICBEaXNhYmxlOkRpcmVjdGl2ZURpc2FibGUsXG4gICAgSHJlZjpEaXJlY3RpdmVIcmVmLFxuICAgIE1hcDpEaXJlY3RpdmVNYXAsXG4gICAgT3B0aW9uYWw6RGlyZWN0aXZlT3B0aW9uYWwsXG4gICAgT3B0aW9uYWxXcmFwOkRpcmVjdGl2ZU9wdGlvbmFsV3JhcCxcbiAgICBTcmM6RGlyZWN0aXZlU3JjLFxuICAgIFN1YnZpZXc6RGlyZWN0aXZlU3VidmlldyxcbiAgICBEYXRhOkRpcmVjdGl2ZURhdGFcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHJlZ2lzdHJ5OyIsIi8qaW1wb3J0ICQgZnJvbSBcImpxdWVyeVwiOyovXG4vKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlUmVnaXN0cnkgZnJvbSBcIi4vZGlyZWN0aXZlL2RpcmVjdGl2ZVJlZ2lzdHJ5LmpzXCJcbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlL2RpcmVjdGl2ZS5qc1wiXG5cblxuXG52YXIgYmFja2JvbmVWaWV3T3B0aW9ucyA9IFsnbW9kZWwnLCAnY29sbGVjdGlvbicsICdlbCcsICdpZCcsICdhdHRyaWJ1dGVzJywgJ2NsYXNzTmFtZScsICd0YWdOYW1lJywgJ2V2ZW50cyddO1xudmFyIGFkZGl0aW9uYWxWaWV3T3B0aW9ucyA9IFsnd2FybicsJ3RlbXBsYXRlVmFsdWVzJywndGVtcGxhdGVTdHJpbmcnLCdjaGlsZFZpZXdJbXBvcnRzJywnc3ViVmlld0ltcG9ydHMnLCdpbmRleCcsJ2xhc3RJbmRleCcsJ2RlZmF1bHRzT3ZlcnJpZGUnXVxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICAgIGdldEFsbFRleHROb2RlczpmdW5jdGlvbigpe1xuICAgICAgICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTA3MzAzMDkvZmluZC1hbGwtdGV4dC1ub2Rlcy1pbi1odG1sLXBhZ2VcbiAgICAgICAgdmFyIG4sIGE9W10sIHdhbGs9ZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcih0aGlzLmVsLE5vZGVGaWx0ZXIuU0hPV19URVhULG51bGwsZmFsc2UpO1xuICAgICAgICB3aGlsZShuPXdhbGsubmV4dE5vZGUoKSkgYS5wdXNoKG4pO1xuICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgXG4gICAgfSxcbiAgICAgY29uc3RydWN0b3I6IGZ1bmN0aW9uIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcblxuICAgICAgICB2YXIgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgLy9BIHRlbXBsYXRlIGFuZCBkZWZhdWx0cyBhcmUgYWxsIGJ1dCByZXF1aXJlZC5cbiAgICAgICAgaWYgKHRoaXMud2FybiB8fCB0eXBlb2YgdGhpcy53YXJuPT1cInVuZGVmaW5lZFwiKXtcbiAgICAgICAgICAgIGlmICghdGhpcy5qc3QgJiYgIXRoaXMudGVtcGxhdGVTdHJpbmcpIGNvbnNvbGUud2FybihcIllvdSBwcm9iYWJseSBuZWVkIGEgdGVtcGxhdGVcIik7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZGVmYXVsdHMpIGNvbnNvbGUud2FybihcIllvdSBwcm9iYWJseSBuZWVkIHNvbWUgZGVmYXVsdHMgZm9yIHlvdXIgdmlld1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vQ29udmVydCB0ZW1wbGF0ZVN0cmluZyB0byBhIGphdmFzY3JpcHQgdGVtcGxhdGVcbiAgICAgICAgaWYgKCF0aGlzLmpzdCkge1xuICAgICAgICAgICAgdGhpcy5qc3QgPSBfLnRlbXBsYXRlKHRoaXMudGVtcGxhdGVTdHJpbmcgfHwgXCJcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvL2V4dGVuZCBvbmx5IHZhbGlkIG9wdGlvbnNcbiAgICAgICAgXy5leHRlbmQodGhpcywgXy5waWNrKG9wdGlvbnMsIGJhY2tib25lVmlld09wdGlvbnMuY29uY2F0KGFkZGl0aW9uYWxWaWV3T3B0aW9ucykpKTtcblxuICAgICAgICBcblxuICAgICAgICBfLmVhY2godGhpcy5kZWZhdWx0cywgZnVuY3Rpb24gKGRlZikge1xuICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihkZWYpKSBjb25zb2xlLndhcm4oXCJEZWZhdWx0cyBzaG91bGQgdXN1YWxseSBiZSBwcmltaXRpdmUgdmFsdWVzXCIpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2RhdGEgaXMgcGFzc2VkIGluIG9uIHN1YnZpZXdzXG4gICAgICAgIC8vIGNvbWVzIGZyb20gdGhpcy52aWV3LnZpZXdNb2RlbC5nZXQodGhpcy52YWwpOywgXG4gICAgICAgIC8vc28gaWYgdGhlIGRpcmVjdGl2ZSBpcyBubS1zdWJ2aWV3PVwiTWVudVwiLCB0aGVuIHRoaXMuZGF0YSBzaG91bGQgYmUuLi53aGF0P1xuICAgICAgICAvL0FoYSEgZGF0YSBpcyB0byBvdmVycmlkZSBkZWZhdWx0IHZhbHVlcyBmb3Igc3Vidmlld3MgYmVpbmcgcGFydCBvZiBhIHBhcmVudCB2aWV3LiBcbiAgICAgICAgLy9CdXQgaXQgaXMgbm90IG1lYW50IHRvIG92ZXJyaWRlIHRlbXBsYXRlVmFsdWVzIEkgZG9uJ3QgdGhpbmsuXG4gICAgICAgIHRoaXMuZGVmYXVsdHNPdmVycmlkZSA9IG9wdGlvbnMgJiYgb3B0aW9ucy5kZWZhdWx0c092ZXJyaWRlO1xuXG4gICAgICAgIFxuICAgICAgICBcblxuICAgICAgICB2YXIgYXR0cnMgPSBfLmV4dGVuZChfLmNsb25lKHRoaXMuZGVmYXVsdHMpLCBvcHRpb25zICYmIG9wdGlvbnMuZGVmYXVsdHNPdmVycmlkZSB8fCB7fSk7XG4gICAgICAgIHRoaXMudmlld01vZGVsID0gbmV3IEZhaml0YS5Nb2RlbChhdHRycyk7XG5cbiAgICAgICAgaWYgKHRoaXMuc3ViVmlld0ltcG9ydHMpe1xuICAgICAgICAgICAgZm9yKHZhciBwcm9wIGluIHRoaXMuc3ViVmlld0ltcG9ydHMpe1xuICAgICAgICAgICAgICAgIHRoaXMudmlld01vZGVsLnNldChcIi0+XCIrcHJvcCxhdHRyc1twcm9wXSlcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0+XCIrcHJvcCxhdHRyc1twcm9wXSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnZpZXdNb2RlbClcblxuICAgICAgICAvL3RlbXBsYXRlVmFsdWVzIGNvbnRhaW4gdGVtcGxhdGVWYWx1ZXMgb2YgdmlldyB2YXJpYWJsZXMgdG8gbW9kZWwgdmFyaWFibGVzLlxuICAgICAgICAvL3N0cmluZ3MgYXJlIHJlZmVyZW5jZXMgdG8gbW9kZWwgdmFyaWFibGVzLiBGdW5jdGlvbnMgYXJlIGZvciB3aGVuIGEgdmlldyB2YXJpYWJsZSBkb2VzXG4gICAgICAgIC8vbm90IG1hdGNoIHBlcmZlY3RseSB3aXRoIGEgbW9kZWwgdmFyaWFibGUuIFRoZXNlIGFyZSB1cGRhdGVkIGVhY2ggdGltZSB0aGUgbW9kZWwgY2hhbmdlcy5cbiAgICAgICAgdGhpcy5wcm9wTWFwID0ge307XG4gICAgICAgIHRoaXMuZnVuY3MgPSB7fTtcblxuICAgICAgICBfLmVhY2godGhpcy50ZW1wbGF0ZVZhbHVlcywgZnVuY3Rpb24gKG1vZGVsVmFyLCB0ZW1wbGF0ZVZhcikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtb2RlbFZhciA9PSBcInN0cmluZ1wiKSB0aGlzLnByb3BNYXBbdGVtcGxhdGVWYXJdID0gbW9kZWxWYXI7XG4gICAgICAgICAgICBlbHNlIGlmICh0eXBlb2YgbW9kZWxWYXIgPT0gXCJmdW5jdGlvblwiKSB0aGlzLmZ1bmNzW3RlbXBsYXRlVmFyXSA9IG1vZGVsVmFyO1xuICAgICAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgICAgIC8vUHJvYmxlbTogaWYgeW91IHVwZGF0ZSB0aGUgbW9kZWwgaXQgdXBkYXRlcyBmb3IgZXZlcnkgc3VidmlldyAobm90IGVmZmljaWVudCkuXG4gICAgICAgIC8vQW5kIGl0IGRvZXMgbm90IHVwZGF0ZSBmb3Igc3VibW9kZWxzLiBQZXJoYXBzIHRoZXJlIGFyZSBtYW55IGRpZmZlcmVudCBzb2x1dGlvbnMgZm9yIHRoaXMuXG4gICAgICAgIC8vWW91IGNhbiBoYXZlIGVhY2ggc3VibW9kZWwgdHJpZ2dlciBjaGFuZ2UgZXZlbnQuXG5cbiAgICAgICAgLy9XaGVuZXZlciB0aGUgbW9kZWwgY2hhbmdlcywgdXBkYXRlIHRoZSB2aWV3TW9kZWwgYnkgbWFwcGluZyBwcm9wZXJ0aWVzIG9mIHRoZSBtb2RlbCB0byBwcm9wZXJ0aWVzIG9mIHRoZSB2aWV3IChhc3NpZ25lZCBpbiB0ZW1wbGF0ZVZhbHVlcylcbiAgICAgICAgLy9BbHNvLCB0aGUgYXR0cmlidXRlcyBjaGFuZ2UuIFRoaXMgY2FuIGJlIGRvbmUgbW9yZSBlbGVnYW50bHlcbiAgICAgICAgaWYgKHRoaXMubW9kZWwpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2VcIiwgdGhpcy51cGRhdGVWaWV3TW9kZWwpO1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2V0QXR0cmlidXRlcyhfLmV4dGVuZCh7fSwgXy5yZXN1bHQodGhpcywgJ2F0dHJpYnV0ZXMnKSkpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMudXBkYXRlVmlld01vZGVsKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvL1Nob3VsZCB0aGUgdmlld01vZGVsIGNvbnRhaW4gdGhlIHN1YnZpZXdzIGluc3RlYWQgb2YgZGlyZWN0aXZlcz8gXG4gICAgICAgIC8vV2UgaGF2ZSBzdWJWaWV3SW1wb3J0cyBoYXZlIHRoZSBjb25zdHJ1Y3RvciwgXG4gICAgICAgIC8vVGhlIGRlZmF1bHRzIGNvbWUgZnJvbSBhIHN1Ymhhc2ggaW4gZGVmYXVsdHMsIGFuZCB0ZW1wbGF0ZVZhcnMgY29tZSBmcm9tIHRlbXBsYXRlVmFycy5cblxuXG4gICAgICAgIHZhciBhdHRycyA9IHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXM7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy52aWV3TW9kZWwuYXR0cmlidXRlcyk7XG4gICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcImRlZmluaXRpb25zXCIgJiYgIXRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXNba2V5XSkge1xuICAgICAgICAgICAgICAgIC8vcHJvYmxlbSBpcyB0aGF0IHByb3BNYXAgKHNlZW1zIHRvIGJlIHRlbXBsYXRlVmFsdWVzIHdpdGggZnVuY3Rpb25zIGZpbHRlcmVkIG91dCkgaXMgXG4gICAgICAgICAgICAgICAgLy97ZGVmaW5pdGlvbnM6XCJkZWZpbml0aW9uc1wifS4gQ29tZXMgZnJvbSBhcnRpY2xlX2FydGljbGUuanNcbiAgICAgICAgICAgICAgICBkZWJ1Z2dlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgICAgICB0aGlzLl9lbnN1cmVFbGVtZW50KCk7XG4gICAgICAgIHRoaXMuYnVpbGRJbm5lckhUTUwoKTtcblxuICAgICAgICB0aGlzLmluaXREaXJlY3RpdmVzKCk7IC8vaW5pdCBzaW1wbGUgZGlyZWN0aXZlcy4uLnRoZSBvbmVzIHRoYXQganVzdCBtYW5pcHVsYXRlIGFuIGVsZW1lbnRcbiAgICAgICAgdGhpcy5kZWxlZ2F0ZUV2ZW50cygpO1xuXG4gICAgICAgIHRoaXMuY2hpbGROb2RlcyA9IFtdLnNsaWNlLmNhbGwodGhpcy5lbC5jaGlsZE5vZGVzLCAwKTtcblxuICAgICAgICB0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9LFxuICAgIFxuICAgIGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgICAgIC8vYXR0YWNoIG9wdGlvbnMgdG8gdmlldyAobW9kZWwsIHByb3BNYXAsIHN1YlZpZXdzLCBldmVudHMpXG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBfLmV4dGVuZCh0aGlzLG9wdGlvbnMpO1xuICAgIH0sXG4gICAgZ2V0TW9kZWxBdHRyOmZ1bmN0aW9uKGF0dHIpe1xuICAgICAgICAvL3F1aWNrbHkgZ3JhYiBhIG1vZGVscyBhdHRyaWJ1dGUgYnkgYSB2aWV3IHZhcmlhYmxlLiBVc2VmdWwgaW4gY2xhc3NuYW1lIGZ1bmN0aW9uLlxuICAgICAgICBpZiAodHlwZW9mIHRoaXMudGVtcGxhdGVWYWx1ZXNbYXR0cl0gPT1cInN0cmluZ1wiKSByZXR1cm4gdGhpcy5tb2RlbC5nZXQodGhpcy50ZW1wbGF0ZVZhbHVlc1thdHRyXSk7XG4gICAgICAgIGVsc2UgcmV0dXJuIHRoaXMudGVtcGxhdGVWYWx1ZXNbYXR0cl0uY2FsbCh0aGlzKVxuICAgIH0sXG4gICAgdXBkYXRlVmlld01vZGVsOmZ1bmN0aW9uKCl7XG5cbiAgICAgICAgXG4gICAgICAgIHZhciBvYmogPSB7fVxuICAgICAgICBcbiAgICAgICAgLy9DaGFuZ2UgdGVtcGxhdGVWYXJzLT5tb2RlbFZhcnMgdG8gdGVtcGxhdGVWYXJzLT5tb2RlbC5nZXQoXCJtb2RlbFZhclwiKSwgYW5kIHNldCBvbiB0aGUgbW9kZWxcbiAgICAgICAgXy5leHRlbmQob2JqLF8ubWFwT2JqZWN0KHRoaXMucHJvcE1hcCxmdW5jdGlvbihtb2RlbFZhcil7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vZGVsLmdldChtb2RlbFZhcik7XG4gICAgICAgIH0uYmluZCh0aGlzKSkpO1xuICAgICAgICBcblxuICAgICAgICBfLmV4dGVuZChvYmosXy5tYXBPYmplY3QodGhpcy5mdW5jcyxmdW5jdGlvbihmdW5jKXtcbiAgICAgICAgICAgIHZhciByZXQgPSBmdW5jLmNhbGwodGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgLy9mdW5jLmNhbGwgbWFrZXMgaXQgd29yayBidXQgb25seSBvbmNlXG4gICAgICAgIH0uYmluZCh0aGlzKSkpXG4gICAgICAgICAgICAgICAgXG5cbiAgICAgICAgXG4gICAgICAgIHRoaXMudmlld01vZGVsLnNldChvYmopO1xuXG4gICAgICAgIFxuICAgICAgICBcbiAgICBcbiAgICB9LFxuICAgIGJ1aWxkSW5uZXJIVE1MOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbCkgdGhpcy4kZWwuaHRtbCh0aGlzLnJlbmRlcmVkVGVtcGxhdGUoKSk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGR1bW15ZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgICAgIGR1bW15ZGl2LmlubmVySFRNTCA9IHRoaXMucmVuZGVyZWRUZW1wbGF0ZSgpO1xuICAgICAgICAgICAgd2hpbGUoZHVtbXlkaXYuY2hpbGROb2Rlcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQoZHVtbXlkaXYuY2hpbGROb2Rlc1swXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL21heWJlIGxlc3MgaGFja2lzaCBzb2x1dGlvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yNTIxNDExMy8xNzYzMjE3XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGluaXREaXJlY3RpdmVzOmZ1bmN0aW9uKCl7XG5cbiAgICAgICAgXG4gICAgICAgIC8vSW5pdCBkaXJlY3RpdmVzIGludm9sdmluZyB7e319XG5cbiAgICAgICAgLy9HZXQgYWxsIG9mIHRoZSB0ZXh0IG5vZGVzIGluIHRoZSBkb2N1bWVudC5cbiAgICAgICAgdGhpcy5fc3ViVmlld0VsZW1lbnRzID0gW107XG4gICAgICAgIHRoaXMuZ2V0QWxsVGV4dE5vZGVzKCkuZm9yRWFjaChmdW5jdGlvbihmdWxsVGV4dE5vZGUpe1xuICAgICAgICAgICAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMTMxMTY3MC8xNzYzMjE3IHRleHRDb250ZW50IHNlZW1zIHJpZ2h0XG5cbiAgICAgICAgICAgIHZhciByZSA9IC9cXHtcXHsoLis/KVxcfVxcfS9nOyAvL01hdGNoIHt7c3ViVmlld05hbWV9fVxuICAgICAgICAgICAgdmFyIG1hdGNoO1xuICAgICAgICAgICAgXG5cblxuICAgICAgICAgICAgdmFyIG1hdGNoZXMgPSBbXTtcbiAgICAgICAgICAgIHdoaWxlICgobWF0Y2ggPSByZS5leGVjKGZ1bGxUZXh0Tm9kZS50ZXh0Q29udGVudCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVzLnB1c2gobWF0Y2gpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcblxuICAgICAgICAgICAgdmFyIGN1cnJlbnRUZXh0Tm9kZSA9IGZ1bGxUZXh0Tm9kZTtcbiAgICAgICAgICAgIHZhciBjdXJyZW50U3RyaW5nID0gZnVsbFRleHROb2RlLnRleHRDb250ZW50O1xuICAgICAgICAgICAgdmFyIHByZXZOb2Rlc0xlbmd0aCA9IDA7XG5cbiAgICAgICAgICAgIG1hdGNoZXMuZm9yRWFjaChmdW5jdGlvbihtYXRjaCl7XG4gICAgICAgICAgICAgICAgdmFyIHZhck5vZGUgPSBjdXJyZW50VGV4dE5vZGUuc3BsaXRUZXh0KG1hdGNoLmluZGV4IC0gcHJldk5vZGVzTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB2YXIgZW50aXJlTWF0Y2ggPSBtYXRjaFswXVxuICAgICAgICAgICAgICAgIHZhck5vZGUubWF0Y2ggPSBtYXRjaFsxXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdWJWaWV3RWxlbWVudHMucHVzaCh2YXJOb2RlKTtcbiAgICAgICAgICAgICAgICBjdXJyZW50VGV4dE5vZGUgPSB2YXJOb2RlLnNwbGl0VGV4dChlbnRpcmVNYXRjaC5sZW5ndGgpXG4gICAgICAgICAgICAgICAgY3VycmVudFN0cmluZyA9IGN1cnJlbnRUZXh0Tm9kZS50ZXh0Q29udGVudDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwcmV2Tm9kZXNMZW5ndGg9bWF0Y2guaW5kZXggKyBlbnRpcmVNYXRjaC5sZW5ndGg7Ly9Ob3RlOiBUaGlzIHdvcmtzIGFjY2lkZW50YWxseS4gTWlnaHQgYmUgd3JvbmcuXG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICBcblxuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB0aGlzLmRpcmVjdGl2ZSA9IHt9O1xuXG4gICAgICAgXG5cblxuICAgICAgICBmb3IgKHZhciBkaXJlY3RpdmVOYW1lIGluIERpcmVjdGl2ZVJlZ2lzdHJ5KXtcbiAgICAgICAgICAgIHZhciBfX3Byb3RvID0gRGlyZWN0aXZlUmVnaXN0cnlbZGlyZWN0aXZlTmFtZV0ucHJvdG90eXBlXG4gICAgICAgICAgICBpZiAoX19wcm90byBpbnN0YW5jZW9mIERpcmVjdGl2ZSl7IC8vYmVjYXVzZSBmb3JlYWNoIHdpbGwgZ2V0IG1vcmUgdGhhbiBqdXN0IG90aGVyIGRpcmVjdGl2ZXNcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IF9fcHJvdG8ubmFtZTtcbiAgICAgICAgICAgICAgICBpZiAobmFtZSE9PVwic3Vidmlld1wiICYmIG5hbWUhPT1cIm1hcFwiKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW1lbnRzID0gKHRoaXMuJGVsKT8kLm1ha2VBcnJheSh0aGlzLiRlbC5maW5kKFwiW25tLVwiK25hbWUrXCJdXCIpKTokLm1ha2VBcnJheSgkKHRoaXMuZWwucXVlcnlTZWxlY3RvckFsbChcIltubS1cIituYW1lK1wiXVwiKSkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtuYW1lXSA9IGVsZW1lbnRzLm1hcChmdW5jdGlvbihlbGVtZW50LGksZWxlbWVudHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vb24gdGhlIHNlY29uZCBnby1hcm91bmQgZm9yIG5tLW1hcCwgZGlyZWN0aXZlTmFtZSBzb21laG93IGlzIGNhbGxlZCBcIlN1YlZpZXdcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGlyZWN0aXZlUmVnaXN0cnlbZGlyZWN0aXZlTmFtZV0oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsOmVsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbDplbGVtZW50LmdldEF0dHJpYnV0ZShcIm5tLVwiK25hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpOyBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtcInN1YnZpZXdcIl0gPSB0aGlzLl9zdWJWaWV3RWxlbWVudHMubWFwKGZ1bmN0aW9uKHN1YlZpZXdFbGVtZW50LGksc3ViVmlld0VsZW1lbnRzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGlyZWN0aXZlUmVnaXN0cnlbXCJTdWJ2aWV3XCJdKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWw6c3ViVmlld0VsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpOyAqL1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uKHN1YlZpZXdFbGVtZW50KXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gc3ViVmlld0VsZW1lbnQubWF0Y2guc3BsaXQoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoPT0xKXtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZGlyZWN0aXZlW1wic3Vidmlld1wiXSkgdGhpcy5kaXJlY3RpdmVbXCJzdWJ2aWV3XCJdID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5kaXJlY3RpdmVbXCJzdWJ2aWV3XCJdLnB1c2gobmV3IERpcmVjdGl2ZVJlZ2lzdHJ5W1wiU3Vidmlld1wiXSh7XG4gICAgICAgICAgICAgICAgICAgIHZpZXc6dGhpcyxcbiAgICAgICAgICAgICAgICAgICAgZWw6c3ViVmlld0VsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIHZhbDpzdWJWaWV3RWxlbWVudC5tYXRjaFxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmRpcmVjdGl2ZVtcIm1hcFwiXSkgdGhpcy5kaXJlY3RpdmVbXCJtYXBcIl0gPSBbXTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtcIm1hcFwiXS5wdXNoKG5ldyBEaXJlY3RpdmVSZWdpc3RyeVtcIk1hcFwiXSh7XG4gICAgICAgICAgICAgICAgICAgIHZpZXc6dGhpcyxcbiAgICAgICAgICAgICAgICAgICAgZWw6c3ViVmlld0VsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIHZhbDpzdWJWaWV3RWxlbWVudC5tYXRjaFxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuXG5cbiAgICAgICBcbiAgICAgICAgLypcbiAgICAgICAgdGhpcy5fc3ViVmlld0VsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24oc3ViVmlld0VsZW1lbnQpe1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBzdWJWaWV3RWxlbWVudC5tYXRjaC5zcGxpdChcIjpcIik7XG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGg9PTEpe1xuICAgICAgICAgICAgICAgIC8vc3VidmlldyB3aXRoIG5vIGNvbnRleHQgb2JqXG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAvL0NoZWNrIGZvciBjb2xsZWN0aW9uIG9yIG1vZGVsIHBhc3NlZC5cbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xuICAgICAgICAgICAgZWxlbWVudC5zdHlsZS5iYWNrZ3JvdW5kPVwieWVsbG93XCI7XG4gICAgICAgICAgICBlbGVtZW50LmlubmVySFRNTCA9IHN1YlZpZXdFbGVtZW50Lm1hdGNoO1xuICAgICAgICAgICAgc3ViVmlld0VsZW1lbnQucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoZWxlbWVudCxzdWJWaWV3RWxlbWVudCk7XG4gICAgICAgIH0pKi9cblxuICAgICAgIFxuXG5cbiAgICAgICAgXG4gICAgfSxcbiAgICByZW5kZXJlZFRlbXBsYXRlOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLmpzdCkge1xuICAgICAgICAgICAgd2luZG93Ll8gPSBfO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuanN0KHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgcmV0dXJuIF8udGVtcGxhdGUodGhpcy50ZW1wbGF0ZVN0cmluZykodGhpcy52aWV3TW9kZWwuYXR0cmlidXRlcylcbiAgICB9LFxuICAgIGRlbGVnYXRlRXZlbnRzOiBmdW5jdGlvbihldmVudHMpIHsvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzEyMTkzMDY5LzE3NjMyMTdcbiAgICAgICAgdmFyIGRlbGVnYXRlRXZlbnRTcGxpdHRlciA9IC9eKFxcUyspXFxzKiguKikkLztcbiAgICAgICAgZXZlbnRzIHx8IChldmVudHMgPSBfLnJlc3VsdCh0aGlzLCAnZXZlbnRzJykpOyAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIGlmICghZXZlbnRzKSByZXR1cm4gdGhpcztcbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBldmVudHMpIHtcbiAgICAgICAgICAgIHZhciBtZXRob2QgPSBldmVudHNba2V5XTtcbiAgICAgICAgICAgIGlmICghXy5pc0Z1bmN0aW9uKG1ldGhvZCkpIG1ldGhvZCA9IHRoaXNbZXZlbnRzW2tleV1dO1xuICAgICAgICAgICAgaWYgKCFtZXRob2QpIHRocm93IG5ldyBFcnJvcignTWV0aG9kIFwiJyArIGV2ZW50c1trZXldICsgJ1wiIGRvZXMgbm90IGV4aXN0Jyk7XG4gICAgICAgICAgICB2YXIgbWF0Y2ggPSBrZXkubWF0Y2goZGVsZWdhdGVFdmVudFNwbGl0dGVyKTtcbiAgICAgICAgICAgIHZhciBldmVudFR5cGVzID0gbWF0Y2hbMV0uc3BsaXQoJywnKSwgc2VsZWN0b3IgPSBtYXRjaFsyXTtcbiAgICAgICAgICAgIG1ldGhvZCA9IF8uYmluZChtZXRob2QsIHRoaXMpO1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgXyhldmVudFR5cGVzKS5lYWNoKGZ1bmN0aW9uKGV2ZW50TmFtZSkge1xuICAgICAgICAgICAgICAgIGV2ZW50TmFtZSArPSAnLmRlbGVnYXRlRXZlbnRzJyArIHNlbGYuY2lkO1xuICAgICAgICAgICAgICAgIGlmIChzZWxlY3RvciA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICBzZWxmLiRlbC5iaW5kKGV2ZW50TmFtZSwgbWV0aG9kKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRlbC5kZWxlZ2F0ZShzZWxlY3RvciwgZXZlbnROYW1lLCBtZXRob2QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgXG4gICAgfSxcblxuXG5cblxuICAgIHRhZ05hbWU6dW5kZWZpbmVkLC8vZG9uJ3Qgd2FudCBhIHRhZ05hbWUgdG8gYmUgZGl2IGJ5IGRlZmF1bHQuIFJhdGhlciwgbWFrZSBpdCBhIGRvY3VtZW50ZnJhZ21lbnQnXG4gICAgc3ViVmlld0ltcG9ydHM6e30sXG4gICAgY2hpbGRWaWV3SW1wb3J0czp7fSxcbiAgICBfZW5zdXJlRWxlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvL092ZXJyaWRpbmcgdGhpcyB0byBzdXBwb3J0IGRvY3VtZW50IGZyYWdtZW50c1xuICAgICAgICBpZiAoIXRoaXMuZWwpIHtcbiAgICAgICAgICAgIGlmKHRoaXMuYXR0cmlidXRlcyB8fCB0aGlzLmlkIHx8IHRoaXMuY2xhc3NOYW1lIHx8IHRoaXMudGFnTmFtZSl7Ly9pZiB5b3UgaGF2ZSBhbnkgb2YgdGhlc2UgYmFja2JvbmUgcHJvcGVydGllcywgZG8gYmFja2JvbmUgYmVoYXZpb3JcbiAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJzID0gXy5leHRlbmQoe30sIF8ucmVzdWx0KHRoaXMsICdhdHRyaWJ1dGVzJykpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pZCkgYXR0cnMuaWQgPSBfLnJlc3VsdCh0aGlzLCAnaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2xhc3NOYW1lKSBhdHRyc1snY2xhc3MnXSA9IF8ucmVzdWx0KHRoaXMsICdjbGFzc05hbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KHRoaXMuX2NyZWF0ZUVsZW1lbnQoXy5yZXN1bHQodGhpcywgJ3RhZ05hbWUnKSB8fCAnZGl2JykpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXRBdHRyaWJ1dGVzKGF0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7Ly9ob3dldmVyLCBkZWZhdWx0IHRvIHRoaXMuZWwgYmVpbmcgYSBkb2N1bWVudGZyYWdtZW50IChtYWtlcyB0aGlzLmVsIG5hbWVkIGltcHJvcGVybHkgYnV0IHdoYXRldmVyKVxuICAgICAgICAgICAgICAgIHRoaXMuZWwgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldEVsZW1lbnQoXy5yZXN1bHQodGhpcywgJ2VsJykpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBzZXQ6ZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgdGhpcy52aWV3TW9kZWwuc2V0KG9iaik7XG4gICAgfSxcbiAgICBnZXQ6ZnVuY3Rpb24ocHJvcCl7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXdNb2RlbC5nZXQocHJvcClcbiAgICB9XG59KTtcbiIsIi8vU2FtZSBtb2RlbCwgY29sbGVjdGlvbiBpbiBzYW1lIGZpbGUgZm9yIG5vdyBiZWNhdXNlIHRoZXNlIG1vZHVsZXMgcmVseSBvbiBlYWNoIG90aGVyLlxuXG4vKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgTW9kZWwgZnJvbSBcIi4vTW9kZWxcIjtcbmltcG9ydCBDb2xsZWN0aW9uIGZyb20gXCIuL0NvbGxlY3Rpb25cIjtcbmltcG9ydCBWaWV3IGZyb20gXCIuL1ZpZXdcIjtcbmltcG9ydCBEaXJlY3RpdmVSZWdpc3RyeSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnlcIjtcbi8qaW1wb3J0ICQgZnJvbSBcImpxdWVyeVwiOyovXG5cbnZhciBGYWppdGEgPSB7TW9kZWwsIENvbGxlY3Rpb24sIFZpZXcsIERpcmVjdGl2ZVJlZ2lzdHJ5fTtcbkZhaml0YVtcIvCfjK5cIl0gPSBcIjAuMC4wXCI7XG5cbmlmICh0eXBlb2Ygd2luZG93IT09XCJ1bmRlZmluZWRcIikgd2luZG93LkZhaml0YSA9IEZhaml0YTtcbmlmICh0eXBlb2YgZ2xvYmFsIT09XCJ1bmRlZmluZWRcIikgZ2xvYmFsLkZhaml0YSA9IEZhaml0YTsiXSwibmFtZXMiOlsiQmFja2JvbmUiLCJNb2RlbCIsImV4dGVuZCIsIm9wdGlvbnMiLCJVUkxTZWFyY2hQYXJhbXMiLCJxdWVyeSIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwic3RydWN0dXJlIiwicGFyZW50TW9kZWxzIiwiaW5pdCIsImF0dHIiLCJfIiwiaXNTdHJpbmciLCJwcm9wcyIsInNwbGl0IiwibGVuZ3RoIiwibW9kZWwiLCJzbGljZSIsImZvckVhY2giLCJwcm9wIiwiZ2V0IiwicHJvdG90eXBlIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJpc1VuZGVmaW5lZCIsImtleSIsInZhbDEiLCJ2YWwyIiwic2V0IiwidmFsIiwiaSIsIm5ld01vZGVsIiwiRmFqaXRhIiwiaXNBcnJheSIsIkNvbGxlY3Rpb24iLCJwdXNoIiwibGlzdGVuVG8iLCJ0cmlnZ2VyIiwib24iLCJWaWV3IiwibmFtZSIsImNvbnNvbGUiLCJlcnJvciIsInZpZXciLCJjaGlsZEluaXQiLCJidWlsZCIsInVwZGF0ZVJlc3VsdCIsInZpZXdNb2RlbCIsInJlbmRlciIsInJlc3VsdCIsImlzRnVuY3Rpb24iLCJjYWxsIiwiRGlyZWN0aXZlIiwiJGVsIiwiZWwiLCJzZXRBdHRyaWJ1dGUiLCJpbm5lckhUTUwiLCJ2YWx1ZSIsInBhc3MiLCJnZXRBdHRyaWJ1dGUiLCIkIiwiYSIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImNsYXNzTGlzdCIsImFkZCIsIndyYXBwZXJBIiwicGFyZW50Tm9kZSIsInJlcGxhY2VDaGlsZCIsImFwcGVuZENoaWxkIiwicGFyZW50IiwiYXJncyIsInN1YlZpZXdOYW1lIiwic3ViTW9kZWxOYW1lIiwic3ViTW9kZWwiLCJzdWJDb2xsZWN0aW9uIiwiY2hpbGRNYXBwaW5ncyIsInRlbXBsYXRlVmFsdWVzIiwiZGVmYXVsdHNPdmVycmlkZSIsIkFic3RyYWN0U3VidmlldyIsInJlbmRlckFkZCIsInJlbmRlclJlc2V0IiwicmVuZGVyUmVtb3ZlIiwicmVuZGVyU29ydCIsIkNoaWxkVmlldyIsImNoaWxkVmlld0ltcG9ydHMiLCJjaGlsZFZpZXdPcHRpb25zIiwidGFnTmFtZSIsImNoaWxkVmlld3MiLCJtYXAiLCJjaGlsZE1vZGVsIiwibW9kZWxzIiwiYXR0cmlidXRlcyIsImNoaWxkdmlldyIsImJpbmQiLCJfaW5pdGlhbGl6ZUJhY2tib25lT2JqZWN0IiwiX2luaXRpYWxpemVDaGlsZE1hcHBpbmdzIiwiX2luaXRpYWxpemVkZWZhdWx0c092ZXJyaWRlIiwiX2luaXRpYWxpemVDaGlsZFZpZXdzIiwicmVwbGFjZVdpdGgiLCJzdWJWaWV3IiwiJGNoaWxkcmVuIiwiY2hpbGRWaWV3IiwiaW5kZXgiLCJkZWxlZ2F0ZUV2ZW50cyIsIiRwYXJlbnQiLCJjaGlsZHJlbiIsImVhY2giLCJleGlzdGluZ0NoaWxkVmlldyIsImZpbHRlciIsIm5ld0NoaWxkVmlldyIsImVtcHR5IiwiY2hpbGQiLCJhcHBlbmQiLCJsYXN0IiwicmVtb3ZlIiwic3BsaWNlIiwiY29udGFpbnMiLCJoaWRlIiwiY3NzIiwiYm9keSIsIkVycm9yIiwiaXMiLCJ3cmFwcGVyIiwiY2hpbGROb2RlcyIsInVud3JhcCIsImluc2VydEJlZm9yZSIsInN1YlZpZXdJbXBvcnRzIiwiQ2hpbGRDb25zdHJ1Y3RvciIsImNsYXNzZXMiLCJjbCIsInBhcmVudERpcmVjdGl2ZSIsIm9wdGlvbnNTZW50VG9TdWJWaWV3IiwiY29udGVudCIsInJlZ2lzdHJ5IiwiRGlyZWN0aXZlQ29udGVudCIsIkRpcmVjdGl2ZUVuYWJsZSIsIkRpcmVjdGl2ZURpc2FibGUiLCJEaXJlY3RpdmVIcmVmIiwiRGlyZWN0aXZlTWFwIiwiRGlyZWN0aXZlT3B0aW9uYWwiLCJEaXJlY3RpdmVPcHRpb25hbFdyYXAiLCJEaXJlY3RpdmVTcmMiLCJEaXJlY3RpdmVTdWJ2aWV3IiwiRGlyZWN0aXZlRGF0YSIsImJhY2tib25lVmlld09wdGlvbnMiLCJhZGRpdGlvbmFsVmlld09wdGlvbnMiLCJuIiwid2FsayIsImNyZWF0ZVRyZWVXYWxrZXIiLCJOb2RlRmlsdGVyIiwiU0hPV19URVhUIiwibmV4dE5vZGUiLCJjb25zdHJ1Y3RvciIsIndhcm4iLCJqc3QiLCJ0ZW1wbGF0ZVN0cmluZyIsImRlZmF1bHRzIiwidGVtcGxhdGUiLCJwaWNrIiwiY29uY2F0IiwiZGVmIiwiYXR0cnMiLCJjbG9uZSIsImxvZyIsInByb3BNYXAiLCJmdW5jcyIsIm1vZGVsVmFyIiwidGVtcGxhdGVWYXIiLCJ1cGRhdGVWaWV3TW9kZWwiLCJfc2V0QXR0cmlidXRlcyIsImtleXMiLCJPYmplY3QiLCJfZW5zdXJlRWxlbWVudCIsImJ1aWxkSW5uZXJIVE1MIiwiaW5pdERpcmVjdGl2ZXMiLCJpbml0aWFsaXplIiwib2JqIiwibWFwT2JqZWN0IiwiZnVuYyIsInJldCIsImh0bWwiLCJyZW5kZXJlZFRlbXBsYXRlIiwiZHVtbXlkaXYiLCJfc3ViVmlld0VsZW1lbnRzIiwiZ2V0QWxsVGV4dE5vZGVzIiwiZnVsbFRleHROb2RlIiwicmUiLCJtYXRjaCIsIm1hdGNoZXMiLCJleGVjIiwidGV4dENvbnRlbnQiLCJjdXJyZW50VGV4dE5vZGUiLCJjdXJyZW50U3RyaW5nIiwicHJldk5vZGVzTGVuZ3RoIiwidmFyTm9kZSIsInNwbGl0VGV4dCIsImVudGlyZU1hdGNoIiwiZGlyZWN0aXZlIiwiZGlyZWN0aXZlTmFtZSIsIkRpcmVjdGl2ZVJlZ2lzdHJ5IiwiX19wcm90byIsImVsZW1lbnRzIiwibWFrZUFycmF5IiwiZmluZCIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJlbGVtZW50Iiwic3ViVmlld0VsZW1lbnQiLCJldmVudHMiLCJkZWxlZ2F0ZUV2ZW50U3BsaXR0ZXIiLCJ1bmRlbGVnYXRlRXZlbnRzIiwibWV0aG9kIiwiZXZlbnRUeXBlcyIsInNlbGVjdG9yIiwic2VsZiIsImV2ZW50TmFtZSIsImNpZCIsImRlbGVnYXRlIiwidW5kZWZpbmVkIiwiaWQiLCJjbGFzc05hbWUiLCJzZXRFbGVtZW50IiwiX2NyZWF0ZUVsZW1lbnQiLCJjcmVhdGVEb2N1bWVudEZyYWdtZW50IiwiZ2xvYmFsIl0sIm1hcHBpbmdzIjoiOzs7QUFBQTs7O0FBSUEsWUFBZUEsU0FBU0MsS0FBVCxDQUFlQyxNQUFmLENBQXNCOztjQUV4QixvQkFBU0MsT0FBVCxFQUFpQjtRQUNyQixPQUFPQyxlQUFQLEtBQTJCLFdBQWhDLEVBQTZDO1dBQ3RDQyxLQUFMLEdBQWEsSUFBSUQsZUFBSixDQUFvQkUsT0FBT0MsUUFBUCxDQUFnQkMsTUFBcEMsQ0FBYjs7OztTQU1HQyxTQUFMLEdBQWlCLEVBQWpCOztTQUVLQyxZQUFMLEdBQW9CLEVBQXBCO1NBQ0tDLElBQUw7R0FiaUM7UUFlOUIsZ0JBQVUsRUFmb0I7O09BaUIvQixhQUFTQyxJQUFULEVBQWM7Ozs7UUFJWkMsRUFB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
