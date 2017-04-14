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

var ViewModel = Backbone.Model.extend({});

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
/*
    Note: use view.get for defaultOverride because referring to the defaults hash directly might not be correct in the case of nested nested subViews 

*/

var DirectiveSubview = AbstractSubview.extend({
    name: "subview",
    _initializeChildViews: function _initializeChildViews() {

        if (this.view.subViewImports[this.subViewName].prototype instanceof Backbone.View) this.ChildConstructor = this.view.subViewImports[this.subViewName];else this.ChildConstructor = this.view.subViewImports[this.subViewName]; /*.call(this.view);*/

        var options = {};

        if (this.view.get(this.subViewName)) {
            _.extend(options, { defaultsOverride: this.view.get(this.subViewName) });
        }

        if (this.view.templateValues && this.view.templateValues[this.subViewName]) {
            _.extend(options, {
                templateValues: this.view.templateValues[this.subViewName]
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
                templateValues: this.view.templateValues && this.view.templateValues[this.subViewName],
                collection: this.subCollection,
                tagName: this.view.childViewImports[this.subViewName].prototype.tagName || "subitem",
                defaultsOverride: this.view.get(this.subViewName)
            };
            this.childViews = this.subCollection.map(function (childModel, i) {

                var childViewOptions = _.extend({}, this.childViewOptions, {
                    model: childModel,
                    index: i,
                    lastIndex: this.subCollection.length - i - 1,
                    defaultsOverride: this.view.get(this.subViewName) && this.view.get(this.subViewName).models[i] && this.view.get(this.subViewName).models[i].attributes
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

        if (this.view.get(this.subViewName)) {
            _.extend(options, { defaultsOverride: this.view.get(this.subViewName) });
        }

        if (this.view.templateValues) {
            _.extend(options, {
                templateValues: this.view.templateValues[this.subViewName]
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
                    templateValues: this.view.templateValues && this.view.templateValues[this.subViewName],
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

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

/*import $ from "jquery";*/
/*import _ from "underscore";*/
/*import Backbone from "backbone";*/
function getAllTextNodes(el) {
    //http://stackoverflow.com/questions/10730309/find-all-text-nodes-in-html-page
    var n,
        a = [],
        walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    while (n = walk.nextNode()) {
        a.push(n);
    }return a;
}

var backboneViewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];
var additionalViewOptions = ['warn', 'templateValues', 'templateString', 'childViewImports', 'subViewImports', 'index', 'lastIndex', 'defaultsOverride'];
var View = Backbone.View.extend({

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
        this.viewModel = new Fajita.ViewModel(attrs);

        this.viewCollection = new Fajita.Collection(this.defaultsOverride || this.defaults);

        //I want to use this.set here but can't get it working without rewriting model.set to support two arguments


        //For each subView, set the viewModel to a collection of views (if it is an array) or a view.
        //It sends in defaultOverride and this's model as a model.

        //Actually that's a confusing API. The question is...should childViewImports be a thing or should it all be called subViewImports?

        if (this.subViewImports) {
            _.each(this.subViewImports, function (SubView, subViewName) {
                this.defaults.forEach(function (defaultsObj, subViewIndex) {
                    var subview = new SubView({
                        model: this.model,
                        defaultsOverride: defaultsObj[subViewName],
                        //new
                        templateValues: this.templateValues && this.templateValues[subViewIndex] && this.templateValues[subViewIndex][subViewName]
                    });
                    subview.parent = this;
                    this.viewCollection.at(subViewIndex).set(subViewName, subview);
                }.bind(this));
            }.bind(this));
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

            _.each(this.templateValues, function (val, key) {
                if ((typeof val === "undefined" ? "undefined" : _typeof(val)) === "object") {

                    this.viewModel.set(key, new this.subViewImports[key]({
                        model: this.model,
                        templateValues: val
                    }));
                }
            }.bind(this));
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

        this._subViewElements = [];
        this.initDirectives(); //init simple directives...the ones that just manipulate an element

        this._parseTextNodes();

        //map requires a ":". Should be test against the value though, not whether there is a colon.

        //Before, subViews were directives and accessing a subview meant accessing through this.directive.
        //But now you simply use view.get(subView) to get the actual subView.

        //The only thing you have to do here is move the code from the sperate subView directive to here.
        //Maybe add a parentView reference to the subView, (if does not exist already).

        this._subViewElements.forEach(function (subViewElement) {
            var props = subViewElement.match.split(":");
            console.log(props);
            var subViewConstructor = this.subViewImports[props[0]];
            var context = this.get(props[1]);
            if (context instanceof Backbone.Collection) {
                var collectionOfViews = this.get(props[0]);
                collectionOfViews.each(function (model, i) {
                    if (i == 0) $(subViewElement).replaceWith(model.get("view").el);else {
                        $(collectionOfViews.at(i - 1).get("view").el).after(model.get("view").el);
                    }
                });
            } else {
                $(subViewElement).replaceWith(this.get(props[0]).el);
            }
        }.bind(this));
        /*
        this._subViewElements.forEach(function(subViewElement){
            var args = subViewElement.match.split(":");
            if (args.length==1){
                  if (!this.directive["subview"]) this.directive["subview"] = [];
                this.directive["subview"].push(new DirectiveRegistry["Subview"]({
                    view:this,
                    el:subViewElement,
                    val:subViewElement.match
                }));
                console.log(subViewElement.match)
            }
            else{
                if (!this.directive["map"]) this.directive["map"] = [];
                this.directive["map"].push(new DirectiveRegistry["Map"]({
                    view:this,
                    el:subViewElement,
                    val:subViewElement.match
                }));
            }
        }.bind(this))
        */

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

        this.viewModel.set(_.mapObject(this.templateValues, function (modelVar) {
            if (typeof modelVar == "string") return this.model.get(modelVar);else if (typeof modelVar == "function") return modelVar.call(this);
        }.bind(this)));
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
    _parseTextNodes: function _parseTextNodes() {
        //This function goes through each text node in the element e.g: (textNode<div>textNode</div>textNode), and splits
        //the textNodes so that {{subViewName}} is its own textNode. Then it adds all textNodes matching {{subViewName}} to
        //this._subViewElements


        //Init directives involving {{}}

        //Get all of the text nodes in the document. e.g: (textNode<div>textNode</div>textNode)

        getAllTextNodes(this.el).forEach(function (fullTextNode) {
            //http://stackoverflow.com/a/21311670/1763217 textContent seems right

            var re = /\{\{(.+?)\}\}/g; //Match {{subViewName}}
            var match;

            var matches = [];
            while ((match = re.exec(fullTextNode.textContent)) != null) {
                matches.push(match);
            }
            //For each text node, get the array of matches. 
            //A match is an array itself, with match[0] being the match and match[1] being the captured part
            //Additionally it has the index and the input as properties.

            var currentTextNode = fullTextNode;
            var currentString = fullTextNode.textContent;
            var prevNodesLength = 0;

            //For each match, split the text node into multiple text nodes (in case there are multiple subViews in a textNode).
            //Then, add each textNode of {{subView}} to this._subViewElements.
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
    },
    initDirectives: function initDirectives() {

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
    set: function set$$1(obj) {

        this.viewModel.set(obj);
    },
    get: function get$$1(prop) {
        return this.viewModel.get(prop);
    }
});

//Same model, collection in same file for now because these modules rely on each other.

/*import _ from "underscore";*/
/*import Backbone from "backbone";*/
var Fajita$1 = { Model: Model, ViewModel: ViewModel, Collection: Collection, View: View, DirectiveRegistry: registry };
Fajita$1["🌮"] = "0.0.0";

if (typeof window !== "undefined") window.Fajita = Fajita$1;
if (typeof global !== "undefined") global.Fajita = Fajita$1;

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFqaXRhLmpzIiwic291cmNlcyI6WyJNb2RlbC5qcyIsIlZpZXdNb2RlbC5qcyIsIkNvbGxlY3Rpb24uanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1jb250ZW50LmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1lbmFibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRpc2FibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWhyZWYuanMiLCJkaXJlY3RpdmUvYWJzdHJhY3Qtc3Vidmlldy5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtbWFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1vcHRpb25hbC5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtb3B0aW9uYWx3cmFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1zcmMuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLXN1YnZpZXcuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRhdGEuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnkuanMiLCJWaWV3LmpzIiwiQmFzZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5cblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgXG4gIGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgaWYgKCB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSBcInVuZGVmaW5lZFwiICl7XG4gICAgICB0aGlzLnF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICB9XG5cbiAgIFxuXG4gICAgLy9uZXdcbiAgICB0aGlzLnN0cnVjdHVyZSA9IHt9O1xuXG4gICAgdGhpcy5wYXJlbnRNb2RlbHMgPSBbXTtcbiAgICB0aGlzLmluaXQoKTtcbiAgfSxcbiAgaW5pdDpmdW5jdGlvbigpe30sXG4gIFxuICBnZXQ6ZnVuY3Rpb24oYXR0cil7XG5cbiAgICAvL1RvZG86IGVycm9yIGNoZWNrIHdoZW4gYXR0ciBoYXMgXCItPlwiIGJ1dCBkb2Vzbid0IHN0YXJ0IHdpdGggLT5cblxuICAgIGlmIChfLmlzU3RyaW5nKGF0dHIpKXtcbiAgICAgIHZhciBwcm9wcyA9IGF0dHIuc3BsaXQoXCItPlwiKTtcbiAgICAgIGlmIChwcm9wcy5sZW5ndGggPiAxKXtcbiAgICAgICAgdmFyIG1vZGVsID0gdGhpcztcbiAgICAgICAgcHJvcHMuc2xpY2UoMSkuZm9yRWFjaChmdW5jdGlvbihwcm9wKXtcbiAgICAgICAgICBpZiAobW9kZWwuc3RydWN0dXJlW3Byb3BdKSBtb2RlbCA9IG1vZGVsLnN0cnVjdHVyZVtwcm9wXTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtb2RlbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGdldCA9IEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5nZXQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuICAgIGlmICghXy5pc1VuZGVmaW5lZChnZXQpKSByZXR1cm4gZ2V0O1xuICAgIFxuXG4gXG4gICBcbiAgIFxuICB9LFxuICB0b2dnbGU6ZnVuY3Rpb24oa2V5LHZhbDEsdmFsMil7XG4gICAgaWYgKHRoaXMuZ2V0KGtleSk9PXZhbDIpe1xuICAgICAgdGhpcy5zZXQoa2V5LHZhbDEpO1xuICAgIH1cbiAgICBlbHNlIHRoaXMuc2V0KGtleSx2YWwyKTtcbiAgfSxcbiAgc2V0OmZ1bmN0aW9uKGF0dHIsIHZhbCwgb3B0aW9ucyl7XG4gICBcbiAgICAvKlxuICAgIGdldCBjb2RlLi4uSSB3YW50IHNldCBjb2RlIHRvIG1pcnJvciBnZXQgY29kZVxuICAgICovXG4gICAgaWYgKF8uaXNTdHJpbmcoYXR0cikpe1xuICAgICAgdmFyIHByb3BzID0gYXR0ci5zcGxpdChcIi0+XCIpO1xuICAgICAgaWYgKHByb3BzLmxlbmd0aCA+IDEpe1xuICAgICAgICB2YXIgbW9kZWwgPSB0aGlzO1xuICAgICAgICBwcm9wcy5zbGljZSgxKS5mb3JFYWNoKGZ1bmN0aW9uKHByb3AsaSxwcm9wcyl7XG4gICAgICAgICAgaWYgKG1vZGVsLnN0cnVjdHVyZVtwcm9wXSkgbW9kZWwgPSBtb2RlbC5zdHJ1Y3R1cmVbcHJvcF07XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3TW9kZWw7XG4gICAgICAgICAgICBpZiAoaSA8IHByb3BzLmxlbmd0aCAtIDEpe1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IG5ldyBGYWppdGEuTW9kZWw7ICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IChfLmlzQXJyYXkodmFsKSk/bmV3IEZhaml0YS5Db2xsZWN0aW9uKHZhbCk6bmV3IEZhaml0YS5Nb2RlbCh2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3TW9kZWwucGFyZW50TW9kZWxzLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgbW9kZWwuc3RydWN0dXJlW3Byb3BdID0gbmV3TW9kZWw7XG4gICAgICAgICAgICBtb2RlbC5saXN0ZW5UbyhuZXdNb2RlbCxcImNoYW5nZSBhZGRcIixmdW5jdGlvbihuZXdNb2RlbCxvcHRpb25zKXtcbiAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8qIFRPRE86IGludmVudCBlbnRpcmUgc3lzdGVtIGZvciB0cmF2ZXJzaW5nIGFuZCBmaXJpbmcgZXZlbnRzLiBQcm9iYWJseSBub3Qgd29ydGggdGhlIGVmZm9ydCBmb3Igbm93LlxuICAgICAgICAgICAgICBPYmplY3Qua2V5cyhtb2RlbC5jaGFuZ2VkQXR0cmlidXRlcygpKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlOlwiK3Byb3ArXCIuXCIra2V5KVxuICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAqL1xuXG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIFxuXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICByZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG4gICAgfVxuXG5cbiAgICAgIFxuICAgICBcbiAgfVxuICAvL05vdGU6IHRoZXJlIGlzIHN0aWxsIG5vIGxpc3RlbmVyIGZvciBhIHN1Ym1vZGVsIG9mIGEgY29sbGVjdGlvbiBjaGFuZ2luZywgdHJpZ2dlcmluZyB0aGUgcGFyZW50LiBJIHRoaW5rIHRoYXQncyB1c2VmdWwuXG59KTsiLCJleHBvcnQgZGVmYXVsdCBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIFxufSkiLCIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgTW9kZWwgZnJvbSBcIi4vTW9kZWxcIjtcblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIG1vZGVsOk1vZGVsLCAvL3Byb2JsZW06IE1vZGVsIHJlbGllcyBvbiBjb2xsZWN0aW9uIGFzIHdlbGwgY2F1c2luZyBlcnJvclxuICAgIGluaXRpYWxpemU6ZnVuY3Rpb24oKXtcbiAgICAgICAgIHRoaXMucGFyZW50TW9kZWxzID0gW107XG4gICAgICAgIC8vdHJpZ2dlciBcInVwZGF0ZVwiIHdoZW4gc3VibW9kZWwgY2hhbmdlc1xuICAgICAgICB0aGlzLm9uKFwiYWRkXCIsZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyhtb2RlbCxcImNoYW5nZVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG59KTsiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuXG5leHBvcnQgZGVmYXVsdCBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG4gICAgbmFtZTpudWxsLFxuICAgIGJ1aWxkOm51bGwsXG4gICAgcmVuZGVyOm51bGwsXG4gICAgaW5pdGlhbGl6ZTpmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgICAgaWYgKCF0aGlzLm5hbWUpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGEgbmFtZSBpbiB0aGUgcHJvdG90eXBlLlwiKTtcbiAgICAgICAgdGhpcy52YWwgPSBvcHRpb25zLnZhbDtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvL3ZpZXcgaXMgdGhlIHZpZXcgdGhhdCBpbXBsZW1lbnRzIHRoaXMgZGlyZWN0aXZlLlxuICAgICAgICBpZiAoIW9wdGlvbnMudmlldykgY29uc29sZS5lcnJvcihcIkVycm9yOiBEaXJlY3RpdmUgcmVxdWlyZXMgYSB2aWV3IHBhc3NlZCBhcyBhbiBvcHRpb24uXCIpO1xuICAgICAgICB0aGlzLnZpZXcgPSBvcHRpb25zLnZpZXc7XG4gICAgICAgIGlmICghdGhpcy5jaGlsZEluaXQpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGNoaWxkSW5pdCBpbiBwcm90b3R5cGUuXCIpO1xuICAgICAgICB0aGlzLmNoaWxkSW5pdCgpO1xuICAgICAgICB0aGlzLmJ1aWxkKCk7XG4gICAgfSxcbiAgICBjaGlsZEluaXQ6ZnVuY3Rpb24oKXtcbiAgICAgICBcbiAgICAgICAgdGhpcy51cGRhdGVSZXN1bHQoKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnZpZXcudmlld01vZGVsLFwiY2hhbmdlOlwiK3RoaXMudmFsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVJlc3VsdCgpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuICAgIHVwZGF0ZVJlc3VsdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgcmVzdWx0ID0gdGhpcy52aWV3LmdldCh0aGlzLnZhbCk7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ocmVzdWx0KSkgdGhpcy5yZXN1bHQgPSByZXN1bHQuY2FsbCh0aGlzLnZpZXcpO1xuICAgICAgICBlbHNlIHRoaXMucmVzdWx0ID0gcmVzdWx0O1xuICAgIH1cbn0pOyIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbi8vTm90ZTogRG9uJ3QgdXNlIC5odG1sKCkgb3IgLmF0dHIoKSBqcXVlcnkuIEl0J3Mgd2VpcmQgd2l0aCBkaWZmZXJlbnQgdHlwZXMuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiY29udGVudFwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLHRoaXMucmVzdWx0KVxuICAgICAgICBlbHNlIHRoaXMuZWwuaW5uZXJIVE1MID0gdGhpcy5yZXN1bHQ7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5idWlsZCgpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHZhciBwYXNzID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikge1xuICAgICAgICAgICAgaWYgKHRoaXMuZWwuZ2V0QXR0cmlidXRlKFwidGl0bGVcIik9PXZhbHVlICsgXCJcIikgcGFzcyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5lbC5pbm5lckhUTUw9PXZhbHVlK1wiXCIpIHBhc3MgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgfVxufSk7IiwiLy9XaHkgZG9lcyB1bmRlcnNjb3JlIHdvcmsgaGVyZT9cblxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcImVuYWJsZVwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsdHJ1ZSk7XG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIixcIlwiKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpIT12YWx1ZTtcbiAgICB9XG59KTtcbiIsIi8vV2h5IGRvZXMgdW5kZXJzY29yZSB3b3JrIGhlcmU/XG5cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJkaXNhYmxlXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpPT12YWx1ZTtcbiAgICB9XG59KTtcbiIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJocmVmXCIsXG4gICBcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSB0aGlzLiRlbC5hdHRyKFwiaHJlZlwiLHRoaXMucmVzdWx0KTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgICAgICAgICAgYS5jbGFzc0xpc3QuYWRkKFwid3JhcHBlci1hXCIpXG4gICAgICAgICAgICBhLnNldEF0dHJpYnV0ZShcImhyZWZcIix0aGlzLnJlc3VsdCk7XG4gICAgICAgICAgICB0aGlzLndyYXBwZXJBID0gYTtcbiAgICAgICAgICAgIHRoaXMuZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQodGhpcy53cmFwcGVyQSx0aGlzLmVsKVxuICAgICAgICAgICAgLy9jYW4ndCBzaW1wbHkgdXNlIHRoaXMuJGVsLndyYXAoYSk7XG4gICAgICAgICAgICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTcwNzMyOC93cmFwLW9uZS1lbGVtZW50LXdpdGgtYW5vdGhlci1yZXRhaW5pbmctcmVmZXJlbmNlLXRvLXdyYXBwZXJcbiAgICAgICAgICAgIHRoaXMud3JhcHBlckEuYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93LndyYXBwZXJBID0gdGhpcy53cmFwcGVyQTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSAkKHRoaXMuZWwpLmF0dHIoXCJocmVmXCIsdGhpcy5yZXN1bHQpXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy53cmFwcGVyQS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIsdGhpcy5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgaWYgKHRoaXMuJGVsLnByb3AoXCJ0YWdOYW1lXCIpPT1cIkFcIikgcmV0dXJuICQodGhpcy5lbCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucGFyZW50KCkucHJvcChcInRhZ05hbWVcIik9PVwiQVwiICYmICQodGhpcy5lbCkucGFyZW50KCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIH1cbiAgICB9XG59KTsiLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiYWJzdHJhY3RzdWJ2aWV3XCIsXG4gICAgX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgYXJncyA9IHRoaXMudmFsLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgdGhpcy5zdWJWaWV3TmFtZSA9IGFyZ3NbMF07XG4gICAgICAgICBpZiAoYXJnc1sxXSl7XG4gICAgICAgICAgICB0aGlzLnN1Yk1vZGVsTmFtZSA9IGFyZ3NbMV07XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSB0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpOyAvL2NoYW5nZWQgZnJvbSBzdWJNb2RlbE5hbWUuXG4gICAgICAgICAgICBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCkgdGhpcy5zdWJNb2RlbCA9IG1vZGVsO1xuICAgICAgICAgICAgZWxzZSBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Db2xsZWN0aW9uKSB0aGlzLnN1YkNvbGxlY3Rpb24gPSBtb2RlbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCksKG1vZGVsIGluc3RhbmNlb2YgQmFja2JvbmUuQ29sbGVjdGlvbiksdGhpcy5zdWJDb2xsZWN0aW9uKVxuICAgICAgICAgICAgLy9kZWJ1Z2dlcjtcbiAgICAgICAgIH1cbiAgICB9LFxuXG5cblxuICAgIF9pbml0aWFsaXplQ2hpbGRWaWV3czpmdW5jdGlvbigpe1xuXG4gICAgfVxufSkiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcbmltcG9ydCBBYnN0cmFjdFN1YnZpZXcgZnJvbSBcIi4vYWJzdHJhY3Qtc3Vidmlld1wiXG5leHBvcnQgZGVmYXVsdCBBYnN0cmFjdFN1YnZpZXcuZXh0ZW5kKHtcbiAgICBuYW1lOlwibWFwXCIsXG4gICAgX2luaXRpYWxpemVDaGlsZFZpZXdzOmZ1bmN0aW9uKCl7XG5cblxuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwiYWRkXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyQWRkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwicmVzZXRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJSZXNldCgpO1xuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwicmVtb3ZlXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyUmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwic29ydFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclNvcnQoKTsgICAgICAgIFxuICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgLy9NYXAgbW9kZWxzIHRvIGNoaWxkVmlldyBpbnN0YW5jZXMgd2l0aCB0aGVpciB0ZW1wbGF0ZVZhbHVlc1xuICAgICAgICB0aGlzLkNoaWxkVmlldyA9IHRoaXMudmlldy5jaGlsZFZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICB0aGlzLmNoaWxkVmlld09wdGlvbnMgPSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp0aGlzLmNoaWxkTWFwcGluZ3MsXG4gICAgICAgICAgICBjb2xsZWN0aW9uOnRoaXMuc3ViQ29sbGVjdGlvbixcbiAgICAgICAgICAgIHRhZ05hbWU6dGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlLnRhZ05hbWUgfHwgXCJzdWJpdGVtXCIsXG4gICAgICAgICAgICBkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNPdmVycmlkZVxuICAgICAgICB9O1xuXG5cbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzID0gdGhpcy5zdWJDb2xsZWN0aW9uLm1hcChmdW5jdGlvbihjaGlsZE1vZGVsLGkpe1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgY2hpbGRWaWV3T3B0aW9ucyA9IF8uZXh0ZW5kKHt9LHRoaXMuY2hpbGRWaWV3T3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgbW9kZWw6Y2hpbGRNb2RlbCxcbiAgICAgICAgICAgICAgICBpbmRleDppLFxuICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgZGVmYXVsdHNPdmVycmlkZTp0aGlzLmRlZmF1bHRzT3ZlcnJpZGUgJiYgdGhpcy5kZWZhdWx0c092ZXJyaWRlLm1vZGVsc1tpXSAmJiB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUubW9kZWxzW2ldLmF0dHJpYnV0ZXMsXG4gICAgICAgICAgICAgICAgLy9KdXN0IGFkZGVkIGNoZWNrIGZvciB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUubW9kZWxzW2ldXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGNoaWxkdmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyhjaGlsZFZpZXdPcHRpb25zKTtcbiAgICAgICAgICAgIC8vY2hpbGR2aWV3Ll9zZXRBdHRyaWJ1dGVzKF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChjaGlsZHZpZXcsICdhdHRyaWJ1dGVzJykpKTtcbiAgICAgICAgICAgIHJldHVybiBjaGlsZHZpZXc7XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICB9LFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQmFja2JvbmVPYmplY3QoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3MoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZWRlZmF1bHRzT3ZlcnJpZGUoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkVmlld3MoKTtcblxuICAgICAgICBcbiAgICAgIFxuXG4gICAgICAgIFxuICAgICAgICBcblxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgIFxuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgodGhpcy5zdWJWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyICRjaGlsZHJlbiA9ICQoKTtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAkY2hpbGRyZW4gPSAkY2hpbGRyZW4uYWRkKGNoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICBjaGlsZFZpZXcuaW5kZXggPSBpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIGlmICgkY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgoJGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkVmlldy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gJGNoaWxkcmVuLnBhcmVudCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkY2hpbGRyZW5cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyQWRkOmZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IFtdO1xuICAgICAgICB0aGlzLnN1YkNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihtb2RlbCxpKXtcbiAgICAgICAgICAgIHZhciBleGlzdGluZ0NoaWxkVmlldyA9IHRoaXMuY2hpbGRWaWV3cy5maWx0ZXIoZnVuY3Rpb24oY2hpbGRWaWV3KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRWaWV3Lm1vZGVsID09IG1vZGVsXG4gICAgICAgICAgICB9KVswXTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ0NoaWxkVmlldykge1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goZXhpc3RpbmdDaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICAgICAgLy92YXIgYXR0cmlidXRlcyA9IF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChleGlzdGluZ0NoaWxkVmlldywgJ2F0dHJpYnV0ZXMnKSlcbiAgICAgICAgICAgICAgICAvL2V4aXN0aW5nQ2hpbGRWaWV3Ll9zZXRBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld0NoaWxkVmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyh7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsOm1vZGVsLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp0aGlzLmNoaWxkTWFwcGluZ3MsXG4gICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOnRoaXMudmlldy5nZXQodGhpcy52YWwuc3BsaXQoXCI6XCIpWzBdKVtpXVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnB1c2gobmV3Q2hpbGRWaWV3KTtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKG5ld0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKXtcbiAgICAgICAgICAgIHRoaXMuJHBhcmVudC5hcHBlbmQoY2hpbGQpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkKGNoaWxkcmVuKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIH0pXG5cbiAgICB9LFxuICAgIHJlbmRlclJlc2V0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgIH0sXG4gICAgcmVuZGVyUmVtb3ZlOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGNoaWxkcmVuLmxhc3QoKS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnNwbGljZSgtMSwxKTtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSB0aGlzLiRwYXJlbnQuY2hpbGRyZW4oKTtcbiAgICB9LFxuICAgIHJlbmRlclNvcnQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgIC8vRG9uJ3QgbmVlZCB0aGlzIChub3cpLiBNb2RlbHMgd2lsbCBhbHJlYWR5IGJlIHNvcnRlZCBvbiBhZGQgd2l0aCBjb2xsZWN0aW9uLmNvbXBhcmF0b3IgPSB4eHg7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vdGhpcy52aWV3IGlzIGluc3RhbmNlIG9mIHRoZSB2aWV3IHRoYXQgY29udGFpbnMgdGhlIHN1YnZpZXcgZGlyZWN0aXZlLlxuICAgICAgICAvL3RoaXMuc3ViVmlldyBpcyBpbnN0YW5jZSBvZiB0aGUgc3Vidmlld1xuICAgICAgICAvL3RoaXMgaXMgdGhlIGRpcmVjdGl2ZS5cblxuICAgICAgICBpZiAodGhpcy5zdWJWaWV3KXtcbiAgICAgICAgICAgIC8vd2h5IHBhcmVudE5vZGU/XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aWV3LmVsLmNvbnRhaW5zKHRoaXMuc3ViVmlldy5lbC5wYXJlbnROb2RlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyIHBhc3MgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGVsID0gdGhpcy52aWV3LmVsXG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbi5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCFlbC5jb250YWlucyh0aGlzKSkgcGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbn0pIiwiLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJvcHRpb25hbFwiLFxuICAgIFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkuaGlkZSgpXG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5jc3MoXCJkaXNwbGF5XCIsXCJcIik7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCkgJCh0aGlzLmVsKS5oaWRlKClcbiAgICAgICAgZWxzZSAkKHRoaXMuZWwpLmNzcyhcImRpc3BsYXlcIixcIlwiKTtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICBpZiAoIWRvY3VtZW50LmJvZHkuY29udGFpbnModGhpcy5lbCkpIHRocm93IEVycm9yKFwiZWxlbWVudCBoYXMgdG8gYmUgaW4gdGhlIERPTSBpbiBvcmRlciB0byB0ZXN0XCIpXG4gICAgICAgIHJldHVybiAkKHRoaXMuZWwpLmlzKFwiOnZpc2libGVcIik9PXZhbHVlO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcIm9wdGlvbmFsd3JhcFwiLFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICBEaXJlY3RpdmUucHJvdG90eXBlLmNoaWxkSW5pdC5jYWxsKHRoaXMsYXJndW1lbnRzKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMud3JhcHBlciA9IHRoaXMuZWw7XG4gICAgICAgIHRoaXMuY2hpbGROb2RlcyA9IFtdLnNsaWNlLmNhbGwodGhpcy5lbC5jaGlsZE5vZGVzLCAwKTtcbiAgICAgICAgXG4gICAgfSxcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuY2hpbGROb2RlcykudW53cmFwKCk7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCl7XG4gICAgICAgICAgICAkKHRoaXMuY2hpbGROb2RlcykudW53cmFwKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLmNoaWxkTm9kZXNbMF0pKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmlyc3QgY2hpbGQgaGFzIHRvIGJlIGluIERPTVwiKTtcbiAgICAgICAgICAgICAgICAvL3NvbHV0aW9uOiBhZGQgYSBkdW1teSB0ZXh0IG5vZGUgYXQgYmVnaW5uaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLndyYXBwZXIpKXtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkTm9kZXNbMF0ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy53cmFwcGVyLHRoaXMuY2hpbGROb2Rlc1swXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IodmFyIGk9MDtpPHRoaXMuY2hpbGROb2Rlcy5sZW5ndGg7aSsrKXtcbiAgICAgICAgICAgICAgICB0aGlzLndyYXBwZXIuYXBwZW5kQ2hpbGQodGhpcy5jaGlsZE5vZGVzW2ldKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcblxuXG4gICAgICAgIHJldHVybiAodGhpcy5jaGlsZE5vZGVzWzBdLnBhcmVudE5vZGU9PXRoaXMud3JhcHBlcikgPT0gdmFsdWU7XG5cblxuICAgICAgXG4gICAgfVxufSkiLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwic3JjXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kZWwuYXR0cihcInNyY1wiLHRoaXMucmVzdWx0KTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLiRlbC5hdHRyKFwic3JjXCIsdGhpcy5yZXN1bHQpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHJldHVybiB0aGlzLiRlbC5hdHRyKFwic3JjXCIpPT09dmFsdWU7XG4gICAgfVxufSk7IiwiLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbi8qXG4gICAgTm90ZTogdXNlIHZpZXcuZ2V0IGZvciBkZWZhdWx0T3ZlcnJpZGUgYmVjYXVzZSByZWZlcnJpbmcgdG8gdGhlIGRlZmF1bHRzIGhhc2ggZGlyZWN0bHkgbWlnaHQgbm90IGJlIGNvcnJlY3QgaW4gdGhlIGNhc2Ugb2YgbmVzdGVkIG5lc3RlZCBzdWJWaWV3cyBcblxuKi9cblxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcbmltcG9ydCBBYnN0cmFjdFN1YnZpZXcgZnJvbSBcIi4vYWJzdHJhY3Qtc3Vidmlld1wiXG5leHBvcnQgZGVmYXVsdCBBYnN0cmFjdFN1YnZpZXcuZXh0ZW5kKHtcbiAgICBuYW1lOlwic3Vidmlld1wiLFxuICAgIF9pbml0aWFsaXplQ2hpbGRWaWV3czpmdW5jdGlvbigpe1xuXG4gICAgICAgIGlmICh0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlIGluc3RhbmNlb2YgQmFja2JvbmUuVmlldykgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICBlbHNlIHRoaXMuQ2hpbGRDb25zdHJ1Y3RvciA9IHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXS8qLmNhbGwodGhpcy52aWV3KTsqL1xuXG4gICAgICAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSkpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7ZGVmYXVsdHNPdmVycmlkZTp0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy52aWV3LnRlbXBsYXRlVmFsdWVzICYmIHRoaXMudmlldy50ZW1wbGF0ZVZhbHVlc1t0aGlzLnN1YlZpZXdOYW1lXSl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp0aGlzLnZpZXcudGVtcGxhdGVWYWx1ZXNbdGhpcy5zdWJWaWV3TmFtZV1cbiAgICAgICAgICAgICAgICAvLyxlbDp0aGlzLmVsIFRoZSBlbCBvZiB0aGUgZGlyZWN0aXZlIHNob3VsZCBiZWxvbmcgdG8gdGhlIGRpcmVjdGl2ZSBidXQgbm90IHRoZSBzdWJ2aWV3IGl0c2VsZlxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHN1Yk1vZGVsID0gdGhpcy5zdWJNb2RlbCB8fCB0aGlzLnZpZXcubW9kZWw7XG4gICAgICAgIGlmIChzdWJNb2RlbCl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHttb2RlbDpzdWJNb2RlbH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy5zdWJWaWV3ID0gbmV3IHRoaXMuQ2hpbGRDb25zdHJ1Y3RvcihvcHRpb25zKTtcbiAgICAgICAgICAgIHZhciBjbGFzc2VzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiY2xhc3NOYW1lXCIpXG4gICAgICAgICAgICBpZiAoY2xhc3Nlcyl7XG4gICAgICAgICAgICAgICAgY2xhc3Nlcy5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihjbCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5jbGFzc0xpc3QuYWRkKGNsKVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiYXR0cmlidXRlc1wiKTtcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgICAgICBfLmVhY2goYXR0cmlidXRlcyxmdW5jdGlvbih2YWwsbmFtZSl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5zZXRBdHRyaWJ1dGUobmFtZSx2YWwpICAgIFxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zdWJWaWV3LnBhcmVudCA9IHRoaXMudmlldztcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnREaXJlY3RpdmUgPSB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9uc1NlbnRUb1N1YlZpZXcgPSBvcHRpb25zO1xuICAgIH0sXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vdGhpcy52YWwsIHRoaXMudmlld1xuXG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdCgpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQ2hpbGRWaWV3cygpO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICBcbiAgICAgIFxuXG4gICAgICAgIGlmICh0aGlzLnN1YkNvbGxlY3Rpb24peyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcImFkZFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQWRkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcInJlc2V0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJSZXNldCgpO1xuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcInJlbW92ZVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyUmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcInNvcnRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclNvcnQoKTsgICAgICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuXG5cblxuICAgICAgICAgICAgICAgIC8vTWFwIG1vZGVscyB0byBjaGlsZFZpZXcgaW5zdGFuY2VzIHdpdGggdGhlaXIgdGVtcGxhdGVWYWx1ZXNcbiAgICAgICAgICAgICAgICB0aGlzLkNoaWxkVmlldyA9IHRoaXMudmlldy5jaGlsZFZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dGhpcy52aWV3LnRlbXBsYXRlVmFsdWVzICYmIHRoaXMudmlldy50ZW1wbGF0ZVZhbHVlc1t0aGlzLnN1YlZpZXdOYW1lXSxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIHRhZ05hbWU6dGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlLnRhZ05hbWUgfHwgXCJzdWJpdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRzT3ZlcnJpZGU6dGhpcy52aWV3LmdldCh0aGlzLnN1YlZpZXdOYW1lKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzID0gdGhpcy5zdWJDb2xsZWN0aW9uLm1hcChmdW5jdGlvbihjaGlsZE1vZGVsLGkpe1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkVmlld09wdGlvbnMgPSBfLmV4dGVuZCh7fSx0aGlzLmNoaWxkVmlld09wdGlvbnMse1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6Y2hpbGRNb2RlbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0SW5kZXg6dGhpcy5zdWJDb2xsZWN0aW9uLmxlbmd0aCAtIGkgLSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdHNPdmVycmlkZTp0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpICYmIHRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSkubW9kZWxzW2ldICYmIHRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSkubW9kZWxzW2ldLmF0dHJpYnV0ZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0p1c3QgYWRkZWQgY2hlY2sgZm9yIHRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSkubW9kZWxzW2ldXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkdmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyhjaGlsZFZpZXdPcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgLy9jaGlsZHZpZXcuX3NldEF0dHJpYnV0ZXMoXy5leHRlbmQoe30sIF8ucmVzdWx0KGNoaWxkdmlldywgJ2F0dHJpYnV0ZXMnKSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGR2aWV3O1xuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG5cblxuICAgICAgICAgICAgICAgIFxuXG5cblxuICAgICAgICB9XG5cbiAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuXG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIGlmICh0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlIGluc3RhbmNlb2YgQmFja2JvbmUuVmlldykgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICAgICAgZWxzZSB0aGlzLkNoaWxkQ29uc3RydWN0b3IgPSB0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0vKi5jYWxsKHRoaXMudmlldyk7Ki9cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIHZhciBvcHRpb25zID0ge307XG4gICAgICAgICAgIFxuICAgICAgICBpZiAodGhpcy52aWV3LmdldCh0aGlzLnN1YlZpZXdOYW1lKSl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtkZWZhdWx0c092ZXJyaWRlOnRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSl9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnZpZXcudGVtcGxhdGVWYWx1ZXMpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dGhpcy52aWV3LnRlbXBsYXRlVmFsdWVzW3RoaXMuc3ViVmlld05hbWVdXG4gICAgICAgICAgICAgICAgLy8sZWw6dGhpcy5lbCBUaGUgZWwgb2YgdGhlIGRpcmVjdGl2ZSBzaG91bGQgYmVsb25nIHRvIHRoZSBkaXJlY3RpdmUgYnV0IG5vdCB0aGUgc3VidmlldyBpdHNlbGZcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBzdWJNb2RlbCA9IHRoaXMuc3ViTW9kZWwgfHwgdGhpcy52aWV3Lm1vZGVsO1xuICAgICAgICBpZiAoc3ViTW9kZWwpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7bW9kZWw6c3ViTW9kZWx9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldyA9IG5ldyB0aGlzLkNoaWxkQ29uc3RydWN0b3Iob3B0aW9ucyk7XG4gICAgICAgICAgICB2YXIgY2xhc3NlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImNsYXNzTmFtZVwiKVxuICAgICAgICAgICAgaWYgKGNsYXNzZXMpe1xuICAgICAgICAgICAgICAgIGNsYXNzZXMuc3BsaXQoXCIgXCIpLmZvckVhY2goZnVuY3Rpb24oY2wpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuY2xhc3NMaXN0LmFkZChjbClcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgYXR0cmlidXRlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImF0dHJpYnV0ZXNcIik7XG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlcyl7XG4gICAgICAgICAgICAgICAgXy5lYWNoKGF0dHJpYnV0ZXMsZnVuY3Rpb24odmFsLG5hbWUpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuc2V0QXR0cmlidXRlKG5hbWUsdmFsKSAgICBcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnQgPSB0aGlzLnZpZXc7XG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcucGFyZW50RGlyZWN0aXZlID0gdGhpcztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnNTZW50VG9TdWJWaWV3ID0gb3B0aW9ucztcbiAgICB9LFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIHRoaXMuJGVsLnJlcGxhY2VXaXRoKHRoaXMuc3ViVmlldy5lbCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHZhciAkY2hpbGRyZW4gPSAkKCk7XG4gICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgJGNoaWxkcmVuID0gJGNoaWxkcmVuLmFkZChjaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICAgICAgY2hpbGRWaWV3LmluZGV4ID0gaTtcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBpZiAoJGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGVsLnJlcGxhY2VXaXRoKCRjaGlsZHJlbik7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgICAgICAgICBjaGlsZFZpZXcuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9ICRjaGlsZHJlbi5wYXJlbnQoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICB0aGlzLiRwYXJlbnQgPSB0aGlzLiRlbC5wYXJlbnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuJGNoaWxkcmVuID0gJGNoaWxkcmVuXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlbmRlckFkZDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgdGhpcy5zdWJDb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24obW9kZWwsaSl7XG4gICAgICAgICAgICB2YXIgZXhpc3RpbmdDaGlsZFZpZXcgPSB0aGlzLmNoaWxkVmlld3MuZmlsdGVyKGZ1bmN0aW9uKGNoaWxkVmlldyl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkVmlldy5tb2RlbCA9PSBtb2RlbFxuICAgICAgICAgICAgfSlbMF07XG4gICAgICAgICAgICBpZiAoZXhpc3RpbmdDaGlsZFZpZXcpIHtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKGV4aXN0aW5nQ2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgICAgIC8vdmFyIGF0dHJpYnV0ZXMgPSBfLmV4dGVuZCh7fSwgXy5yZXN1bHQoZXhpc3RpbmdDaGlsZFZpZXcsICdhdHRyaWJ1dGVzJykpXG4gICAgICAgICAgICAgICAgLy9leGlzdGluZ0NoaWxkVmlldy5fc2V0QXR0cmlidXRlcyhhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBuZXdDaGlsZFZpZXcgPSBuZXcgdGhpcy5DaGlsZFZpZXcoe1xuICAgICAgICAgICAgICAgICAgICBtb2RlbDptb2RlbCxcbiAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dGhpcy52aWV3LnRlbXBsYXRlVmFsdWVzICYmIHRoaXMudmlldy50ZW1wbGF0ZVZhbHVlc1t0aGlzLnN1YlZpZXdOYW1lXSxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdEluZGV4OnRoaXMuc3ViQ29sbGVjdGlvbi5sZW5ndGggLSBpIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6dGhpcy52aWV3LmdldCh0aGlzLnZhbC5zcGxpdChcIjpcIilbMF0pW2ldXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MucHVzaChuZXdDaGlsZFZpZXcpO1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2gobmV3Q2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpe1xuICAgICAgICAgICAgdGhpcy4kcGFyZW50LmFwcGVuZChjaGlsZClcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9ICQoY2hpbGRyZW4pXG4gICAgICAgIFxuICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICBjaGlsZFZpZXcuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgfSlcblxuICAgIH0sXG4gICAgcmVuZGVyUmVzZXQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgfSxcbiAgICByZW5kZXJSZW1vdmU6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4ubGFzdCgpLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmNoaWxkVmlld3Muc3BsaWNlKC0xLDEpO1xuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9IHRoaXMuJHBhcmVudC5jaGlsZHJlbigpO1xuICAgIH0sXG4gICAgcmVuZGVyU29ydDpmdW5jdGlvbigpe1xuICAgICAgICBcbiAgICAgICAgLy9Eb24ndCBuZWVkIHRoaXMgKG5vdykuIE1vZGVscyB3aWxsIGFscmVhZHkgYmUgc29ydGVkIG9uIGFkZCB3aXRoIGNvbGxlY3Rpb24uY29tcGFyYXRvciA9IHh4eDtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy90aGlzLnZpZXcgaXMgaW5zdGFuY2Ugb2YgdGhlIHZpZXcgdGhhdCBjb250YWlucyB0aGUgc3VidmlldyBkaXJlY3RpdmUuXG4gICAgICAgIC8vdGhpcy5zdWJWaWV3IGlzIGluc3RhbmNlIG9mIHRoZSBzdWJ2aWV3XG4gICAgICAgIC8vdGhpcyBpcyB0aGUgZGlyZWN0aXZlLlxuXG4gICAgICAgIGlmICh0aGlzLnN1YlZpZXcpe1xuICAgICAgICAgICAgLy93aHkgcGFyZW50Tm9kZT9cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZpZXcuZWwuY29udGFpbnModGhpcy5zdWJWaWV3LmVsLnBhcmVudE5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB2YXIgcGFzcyA9IHRydWU7XG4gICAgICAgICAgICB2YXIgZWwgPSB0aGlzLnZpZXcuZWxcbiAgICAgICAgICAgIHRoaXMuJGNoaWxkcmVuLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoIWVsLmNvbnRhaW5zKHRoaXMpKSBwYXNzID0gZmFsc2U7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICByZXR1cm4gcGFzcztcbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgfVxufSkiLCIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJkYXRhXCIsXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuY29udGVudCA9IHRoaXMudmlldy52aWV3TW9kZWwuZ2V0KHRoaXMudmFsKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnZpZXcudmlld01vZGVsLFwiY2hhbmdlOlwiK3RoaXMudmFsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLmNvbnRlbnQgPSB0aGlzLnZpZXcudmlld01vZGVsLmdldCh0aGlzLnZhbCk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9KVxuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICBfLmVhY2godGhpcy5jb250ZW50LGZ1bmN0aW9uKHZhbCxwcm9wKXtcbiAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWwpKSB2YWwgPSB2YWwuYmluZCh0aGlzLnZpZXcpO1xuICAgICAgICAgICB0aGlzLiRlbC5hdHRyKFwiZGF0YS1cIitwcm9wLHZhbClcbiAgICAgICB9LmJpbmQodGhpcykpXG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICBfLmVhY2godGhpcy5jb250ZW50LGZ1bmN0aW9uKHZhbCxwcm9wKXtcbiAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWwpKSB2YWwgPSB2YWwuYmluZCh0aGlzLnZpZXcpO1xuICAgICAgICAgICB0aGlzLiRlbC5hdHRyKFwiZGF0YS1cIitwcm9wLHZhbClcbiAgICAgICB9LmJpbmQodGhpcykpXG4gICAgfVxufSk7IiwiaW1wb3J0IERpcmVjdGl2ZUNvbnRlbnQgZnJvbSBcIi4vZGlyZWN0aXZlLWNvbnRlbnRcIjtcbmltcG9ydCBEaXJlY3RpdmVFbmFibGUgZnJvbSBcIi4vZGlyZWN0aXZlLWVuYWJsZVwiO1xuaW1wb3J0IERpcmVjdGl2ZURpc2FibGUgZnJvbSBcIi4vZGlyZWN0aXZlLWRpc2FibGVcIjtcbmltcG9ydCBEaXJlY3RpdmVIcmVmIGZyb20gXCIuL2RpcmVjdGl2ZS1ocmVmXCI7XG5pbXBvcnQgRGlyZWN0aXZlTWFwIGZyb20gXCIuL2RpcmVjdGl2ZS1tYXBcIjtcbmltcG9ydCBEaXJlY3RpdmVPcHRpb25hbCBmcm9tIFwiLi9kaXJlY3RpdmUtb3B0aW9uYWxcIjtcbmltcG9ydCBEaXJlY3RpdmVPcHRpb25hbFdyYXAgZnJvbSBcIi4vZGlyZWN0aXZlLW9wdGlvbmFsd3JhcFwiO1xuaW1wb3J0IERpcmVjdGl2ZVNyYyBmcm9tIFwiLi9kaXJlY3RpdmUtc3JjXCI7XG5pbXBvcnQgRGlyZWN0aXZlU3VidmlldyBmcm9tIFwiLi9kaXJlY3RpdmUtc3Vidmlld1wiO1xuaW1wb3J0IERpcmVjdGl2ZURhdGEgZnJvbSBcIi4vZGlyZWN0aXZlLWRhdGFcIjtcblxudmFyIHJlZ2lzdHJ5ID0ge1xuICAgIENvbnRlbnQ6RGlyZWN0aXZlQ29udGVudCxcbiAgICBFbmFibGU6RGlyZWN0aXZlRW5hYmxlLFxuICAgIERpc2FibGU6RGlyZWN0aXZlRGlzYWJsZSxcbiAgICBIcmVmOkRpcmVjdGl2ZUhyZWYsXG4gICAgTWFwOkRpcmVjdGl2ZU1hcCxcbiAgICBPcHRpb25hbDpEaXJlY3RpdmVPcHRpb25hbCxcbiAgICBPcHRpb25hbFdyYXA6RGlyZWN0aXZlT3B0aW9uYWxXcmFwLFxuICAgIFNyYzpEaXJlY3RpdmVTcmMsXG4gICAgU3VidmlldzpEaXJlY3RpdmVTdWJ2aWV3LFxuICAgIERhdGE6RGlyZWN0aXZlRGF0YVxufTtcblxuZXhwb3J0IGRlZmF1bHQgcmVnaXN0cnk7IiwiLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cbi8qaW1wb3J0IF8gZnJvbSBcInVuZGVyc2NvcmVcIjsqL1xuLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbmltcG9ydCBEaXJlY3RpdmVSZWdpc3RyeSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnkuanNcIlxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlLmpzXCJcbmltcG9ydCBWaWV3TW9kZWwgZnJvbSBcIi4vVmlld01vZGVsXCI7XG5cbmZ1bmN0aW9uIGdldEFsbFRleHROb2RlcyhlbCl7XG4gICAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEwNzMwMzA5L2ZpbmQtYWxsLXRleHQtbm9kZXMtaW4taHRtbC1wYWdlXG4gICAgdmFyIG4sIGE9W10sIHdhbGs9ZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcihlbCxOb2RlRmlsdGVyLlNIT1dfVEVYVCxudWxsLGZhbHNlKTtcbiAgICB3aGlsZShuPXdhbGsubmV4dE5vZGUoKSkgYS5wdXNoKG4pO1xuICAgIHJldHVybiBhO1xufVxuXG52YXIgYmFja2JvbmVWaWV3T3B0aW9ucyA9IFsnbW9kZWwnLCAnY29sbGVjdGlvbicsICdlbCcsICdpZCcsICdhdHRyaWJ1dGVzJywgJ2NsYXNzTmFtZScsICd0YWdOYW1lJywgJ2V2ZW50cyddO1xudmFyIGFkZGl0aW9uYWxWaWV3T3B0aW9ucyA9IFsnd2FybicsJ3RlbXBsYXRlVmFsdWVzJywndGVtcGxhdGVTdHJpbmcnLCdjaGlsZFZpZXdJbXBvcnRzJywnc3ViVmlld0ltcG9ydHMnLCdpbmRleCcsJ2xhc3RJbmRleCcsJ2RlZmF1bHRzT3ZlcnJpZGUnXVxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICAgIFxuICAgICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gY29uc3RydWN0b3Iob3B0aW9ucykge1xuXG4gICAgICAgIHZhciBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICAvL0EgdGVtcGxhdGUgYW5kIGRlZmF1bHRzIGFyZSBhbGwgYnV0IHJlcXVpcmVkLlxuICAgICAgICBpZiAodGhpcy53YXJuIHx8IHR5cGVvZiB0aGlzLndhcm49PVwidW5kZWZpbmVkXCIpe1xuICAgICAgICAgICAgaWYgKCF0aGlzLmpzdCAmJiAhdGhpcy50ZW1wbGF0ZVN0cmluZykgY29uc29sZS53YXJuKFwiWW91IHByb2JhYmx5IG5lZWQgYSB0ZW1wbGF0ZVwiKTtcbiAgICAgICAgICAgIGlmICghdGhpcy5kZWZhdWx0cykgY29uc29sZS53YXJuKFwiWW91IHByb2JhYmx5IG5lZWQgc29tZSBkZWZhdWx0cyBmb3IgeW91ciB2aWV3XCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy9Db252ZXJ0IHRlbXBsYXRlU3RyaW5nIHRvIGEgamF2YXNjcmlwdCB0ZW1wbGF0ZVxuICAgICAgICBpZiAoIXRoaXMuanN0KSB7XG4gICAgICAgICAgICB0aGlzLmpzdCA9IF8udGVtcGxhdGUodGhpcy50ZW1wbGF0ZVN0cmluZyB8fCBcIlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vZXh0ZW5kIG9ubHkgdmFsaWQgb3B0aW9uc1xuICAgICAgICBfLmV4dGVuZCh0aGlzLCBfLnBpY2sob3B0aW9ucywgYmFja2JvbmVWaWV3T3B0aW9ucy5jb25jYXQoYWRkaXRpb25hbFZpZXdPcHRpb25zKSkpO1xuXG4gICAgICAgIFxuXG4gICAgICAgIF8uZWFjaCh0aGlzLmRlZmF1bHRzLCBmdW5jdGlvbiAoZGVmKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGRlZikpIGNvbnNvbGUud2FybihcIkRlZmF1bHRzIHNob3VsZCB1c3VhbGx5IGJlIHByaW1pdGl2ZSB2YWx1ZXNcIik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vZGF0YSBpcyBwYXNzZWQgaW4gb24gc3Vidmlld3NcbiAgICAgICAgLy8gY29tZXMgZnJvbSB0aGlzLnZpZXcudmlld01vZGVsLmdldCh0aGlzLnZhbCk7LCBcbiAgICAgICAgLy9zbyBpZiB0aGUgZGlyZWN0aXZlIGlzIG5tLXN1YnZpZXc9XCJNZW51XCIsIHRoZW4gdGhpcy5kYXRhIHNob3VsZCBiZS4uLndoYXQ/XG4gICAgICAgIC8vQWhhISBkYXRhIGlzIHRvIG92ZXJyaWRlIGRlZmF1bHQgdmFsdWVzIGZvciBzdWJ2aWV3cyBiZWluZyBwYXJ0IG9mIGEgcGFyZW50IHZpZXcuIFxuICAgICAgICAvL0J1dCBpdCBpcyBub3QgbWVhbnQgdG8gb3ZlcnJpZGUgdGVtcGxhdGVWYWx1ZXMgSSBkb24ndCB0aGluay5cbiAgICAgICAgdGhpcy5kZWZhdWx0c092ZXJyaWRlID0gb3B0aW9ucyAmJiBvcHRpb25zLmRlZmF1bHRzT3ZlcnJpZGU7XG5cbiAgICAgICAgXG4gICAgICAgIFxuXG4gICAgICAgIHZhciBhdHRycyA9IF8uZXh0ZW5kKF8uY2xvbmUodGhpcy5kZWZhdWx0cyksIG9wdGlvbnMgJiYgb3B0aW9ucy5kZWZhdWx0c092ZXJyaWRlIHx8IHt9KTtcbiAgICAgICAgdGhpcy52aWV3TW9kZWwgPSBuZXcgRmFqaXRhLlZpZXdNb2RlbChhdHRycyk7XG5cbiAgICAgICAgdGhpcy52aWV3Q29sbGVjdGlvbiA9IG5ldyBGYWppdGEuQ29sbGVjdGlvbih0aGlzLmRlZmF1bHRzT3ZlcnJpZGUgfHwgdGhpcy5kZWZhdWx0cyk7XG5cbiAgICAgICAgLy9JIHdhbnQgdG8gdXNlIHRoaXMuc2V0IGhlcmUgYnV0IGNhbid0IGdldCBpdCB3b3JraW5nIHdpdGhvdXQgcmV3cml0aW5nIG1vZGVsLnNldCB0byBzdXBwb3J0IHR3byBhcmd1bWVudHNcbiAgICAgICAgXG5cbiAgICAgICAgLy9Gb3IgZWFjaCBzdWJWaWV3LCBzZXQgdGhlIHZpZXdNb2RlbCB0byBhIGNvbGxlY3Rpb24gb2Ygdmlld3MgKGlmIGl0IGlzIGFuIGFycmF5KSBvciBhIHZpZXcuXG4gICAgICAgIC8vSXQgc2VuZHMgaW4gZGVmYXVsdE92ZXJyaWRlIGFuZCB0aGlzJ3MgbW9kZWwgYXMgYSBtb2RlbC5cblxuICAgICAgICAvL0FjdHVhbGx5IHRoYXQncyBhIGNvbmZ1c2luZyBBUEkuIFRoZSBxdWVzdGlvbiBpcy4uLnNob3VsZCBjaGlsZFZpZXdJbXBvcnRzIGJlIGEgdGhpbmcgb3Igc2hvdWxkIGl0IGFsbCBiZSBjYWxsZWQgc3ViVmlld0ltcG9ydHM/XG5cbiAgICAgICAgaWYgKHRoaXMuc3ViVmlld0ltcG9ydHMpe1xuICAgICAgICAgICAgXy5lYWNoKHRoaXMuc3ViVmlld0ltcG9ydHMsZnVuY3Rpb24oU3ViVmlldyxzdWJWaWV3TmFtZSl7XG4gICAgICAgICAgICAgICAgdGhpcy5kZWZhdWx0cy5mb3JFYWNoKGZ1bmN0aW9uKGRlZmF1bHRzT2JqLHN1YlZpZXdJbmRleCl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzdWJ2aWV3ID0gbmV3IFN1YlZpZXcoe1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6dGhpcy5tb2RlbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRzT3ZlcnJpZGU6ZGVmYXVsdHNPYmpbc3ViVmlld05hbWVdLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy9uZXdcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVmFsdWVzOnRoaXMudGVtcGxhdGVWYWx1ZXMgJiYgdGhpcy50ZW1wbGF0ZVZhbHVlc1tzdWJWaWV3SW5kZXhdICYmIHRoaXMudGVtcGxhdGVWYWx1ZXNbc3ViVmlld0luZGV4XVtzdWJWaWV3TmFtZV1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN1YnZpZXcucGFyZW50ID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3Q29sbGVjdGlvbi5hdChzdWJWaWV3SW5kZXgpLnNldChzdWJWaWV3TmFtZSxzdWJ2aWV3KTtcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcblxuICAgICAgICAvL3RlbXBsYXRlVmFsdWVzIGNvbnRhaW4gdGVtcGxhdGVWYWx1ZXMgb2YgdmlldyB2YXJpYWJsZXMgdG8gbW9kZWwgdmFyaWFibGVzLlxuICAgICAgICAvL3N0cmluZ3MgYXJlIHJlZmVyZW5jZXMgdG8gbW9kZWwgdmFyaWFibGVzLiBGdW5jdGlvbnMgYXJlIGZvciB3aGVuIGEgdmlldyB2YXJpYWJsZSBkb2VzXG4gICAgICAgIC8vbm90IG1hdGNoIHBlcmZlY3RseSB3aXRoIGEgbW9kZWwgdmFyaWFibGUuIFRoZXNlIGFyZSB1cGRhdGVkIGVhY2ggdGltZSB0aGUgbW9kZWwgY2hhbmdlcy5cbiAgICAgICAgXG5cbiAgICAgICAgLy9Qcm9ibGVtOiBpZiB5b3UgdXBkYXRlIHRoZSBtb2RlbCBpdCB1cGRhdGVzIGZvciBldmVyeSBzdWJ2aWV3IChub3QgZWZmaWNpZW50KS5cbiAgICAgICAgLy9BbmQgaXQgZG9lcyBub3QgdXBkYXRlIGZvciBzdWJtb2RlbHMuIFBlcmhhcHMgdGhlcmUgYXJlIG1hbnkgZGlmZmVyZW50IHNvbHV0aW9ucyBmb3IgdGhpcy5cbiAgICAgICAgLy9Zb3UgY2FuIGhhdmUgZWFjaCBzdWJtb2RlbCB0cmlnZ2VyIGNoYW5nZSBldmVudC5cblxuICAgICAgICAvL1doZW5ldmVyIHRoZSBtb2RlbCBjaGFuZ2VzLCB1cGRhdGUgdGhlIHZpZXdNb2RlbCBieSBtYXBwaW5nIHByb3BlcnRpZXMgb2YgdGhlIG1vZGVsIHRvIHByb3BlcnRpZXMgb2YgdGhlIHZpZXcgKGFzc2lnbmVkIGluIHRlbXBsYXRlVmFsdWVzKVxuICAgICAgICAvL0Fsc28sIHRoZSBhdHRyaWJ1dGVzIGNoYW5nZS4gVGhpcyBjYW4gYmUgZG9uZSBtb3JlIGVsZWdhbnRseVxuICAgICAgICBpZiAodGhpcy5tb2RlbCkge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZVwiLCB0aGlzLnVwZGF0ZVZpZXdNb2RlbCk7XG4gICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRBdHRyaWJ1dGVzKF8uZXh0ZW5kKHt9LCBfLnJlc3VsdCh0aGlzLCAnYXR0cmlidXRlcycpKSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy51cGRhdGVWaWV3TW9kZWwoKTtcblxuICAgICAgICAgICAgXy5lYWNoKHRoaXMudGVtcGxhdGVWYWx1ZXMsZnVuY3Rpb24odmFsLGtleSl7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWw9PT1cIm9iamVjdFwiKXtcblxuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXdNb2RlbC5zZXQoa2V5LG5ldyB0aGlzLnN1YlZpZXdJbXBvcnRzW2tleV0oe1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6dGhpcy5tb2RlbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVmFsdWVzOnZhbFxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vU2hvdWxkIHRoZSB2aWV3TW9kZWwgY29udGFpbiB0aGUgc3Vidmlld3MgaW5zdGVhZCBvZiBkaXJlY3RpdmVzPyBcbiAgICAgICAgLy9XZSBoYXZlIHN1YlZpZXdJbXBvcnRzIGhhdmUgdGhlIGNvbnN0cnVjdG9yLCBcbiAgICAgICAgLy9UaGUgZGVmYXVsdHMgY29tZSBmcm9tIGEgc3ViaGFzaCBpbiBkZWZhdWx0cywgYW5kIHRlbXBsYXRlVmFycyBjb21lIGZyb20gdGVtcGxhdGVWYXJzLlxuXG5cbiAgICAgICAgdmFyIGF0dHJzID0gdGhpcy52aWV3TW9kZWwuYXR0cmlidXRlcztcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzKTtcbiAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiZGVmaW5pdGlvbnNcIiAmJiAhdGhpcy52aWV3TW9kZWwuYXR0cmlidXRlc1trZXldKSB7XG4gICAgICAgICAgICAgICAgLy9wcm9ibGVtIGlzIHRoYXQgcHJvcE1hcCAoc2VlbXMgdG8gYmUgdGVtcGxhdGVWYWx1ZXMgd2l0aCBmdW5jdGlvbnMgZmlsdGVyZWQgb3V0KSBpcyBcbiAgICAgICAgICAgICAgICAvL3tkZWZpbml0aW9uczpcImRlZmluaXRpb25zXCJ9LiBDb21lcyBmcm9tIGFydGljbGVfYXJ0aWNsZS5qc1xuICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgICAgIHRoaXMuX2Vuc3VyZUVsZW1lbnQoKTtcbiAgICAgICAgdGhpcy5idWlsZElubmVySFRNTCgpO1xuXG4gICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cyA9IFtdO1xuICAgICAgICB0aGlzLmluaXREaXJlY3RpdmVzKCk7IC8vaW5pdCBzaW1wbGUgZGlyZWN0aXZlcy4uLnRoZSBvbmVzIHRoYXQganVzdCBtYW5pcHVsYXRlIGFuIGVsZW1lbnRcblxuICAgICAgICB0aGlzLl9wYXJzZVRleHROb2RlcygpO1xuXG5cbiAgICAgICAgLy9tYXAgcmVxdWlyZXMgYSBcIjpcIi4gU2hvdWxkIGJlIHRlc3QgYWdhaW5zdCB0aGUgdmFsdWUgdGhvdWdoLCBub3Qgd2hldGhlciB0aGVyZSBpcyBhIGNvbG9uLlxuICAgICAgICBcbiAgICAgICAgLy9CZWZvcmUsIHN1YlZpZXdzIHdlcmUgZGlyZWN0aXZlcyBhbmQgYWNjZXNzaW5nIGEgc3VidmlldyBtZWFudCBhY2Nlc3NpbmcgdGhyb3VnaCB0aGlzLmRpcmVjdGl2ZS5cbiAgICAgICAgLy9CdXQgbm93IHlvdSBzaW1wbHkgdXNlIHZpZXcuZ2V0KHN1YlZpZXcpIHRvIGdldCB0aGUgYWN0dWFsIHN1YlZpZXcuXG5cbiAgICAgICAgLy9UaGUgb25seSB0aGluZyB5b3UgaGF2ZSB0byBkbyBoZXJlIGlzIG1vdmUgdGhlIGNvZGUgZnJvbSB0aGUgc3BlcmF0ZSBzdWJWaWV3IGRpcmVjdGl2ZSB0byBoZXJlLlxuICAgICAgICAvL01heWJlIGFkZCBhIHBhcmVudFZpZXcgcmVmZXJlbmNlIHRvIHRoZSBzdWJWaWV3LCAoaWYgZG9lcyBub3QgZXhpc3QgYWxyZWFkeSkuXG4gICAgICAgIFxuICAgICAgICB0aGlzLl9zdWJWaWV3RWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbihzdWJWaWV3RWxlbWVudCl7XG4gICAgICAgICAgICB2YXIgcHJvcHMgPSBzdWJWaWV3RWxlbWVudC5tYXRjaC5zcGxpdChcIjpcIik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhwcm9wcylcbiAgICAgICAgICAgIHZhciBzdWJWaWV3Q29uc3RydWN0b3IgPSB0aGlzLnN1YlZpZXdJbXBvcnRzW3Byb3BzWzBdXTtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gdGhpcy5nZXQocHJvcHNbMV0pO1xuICAgICAgICAgICAgaWYgKGNvbnRleHQgaW5zdGFuY2VvZiBCYWNrYm9uZS5Db2xsZWN0aW9uKXtcbiAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbk9mVmlld3MgPSB0aGlzLmdldChwcm9wc1swXSk7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbk9mVmlld3MuZWFjaChmdW5jdGlvbihtb2RlbCxpKXtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGk9PTApICQoc3ViVmlld0VsZW1lbnQpLnJlcGxhY2VXaXRoKG1vZGVsLmdldChcInZpZXdcIikuZWwpXG4gICAgICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGNvbGxlY3Rpb25PZlZpZXdzLmF0KGktMSkuZ2V0KFwidmlld1wiKS5lbCkuYWZ0ZXIobW9kZWwuZ2V0KFwidmlld1wiKS5lbClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICQoc3ViVmlld0VsZW1lbnQpLnJlcGxhY2VXaXRoKHRoaXMuZ2V0KHByb3BzWzBdKS5lbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAvKlxuICAgICAgICB0aGlzLl9zdWJWaWV3RWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbihzdWJWaWV3RWxlbWVudCl7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHN1YlZpZXdFbGVtZW50Lm1hdGNoLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aD09MSl7XG5cblxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5kaXJlY3RpdmVbXCJzdWJ2aWV3XCJdKSB0aGlzLmRpcmVjdGl2ZVtcInN1YnZpZXdcIl0gPSBbXTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtcInN1YnZpZXdcIl0ucHVzaChuZXcgRGlyZWN0aXZlUmVnaXN0cnlbXCJTdWJ2aWV3XCJdKHtcbiAgICAgICAgICAgICAgICAgICAgdmlldzp0aGlzLFxuICAgICAgICAgICAgICAgICAgICBlbDpzdWJWaWV3RWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgdmFsOnN1YlZpZXdFbGVtZW50Lm1hdGNoXG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHN1YlZpZXdFbGVtZW50Lm1hdGNoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZGlyZWN0aXZlW1wibWFwXCJdKSB0aGlzLmRpcmVjdGl2ZVtcIm1hcFwiXSA9IFtdO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlyZWN0aXZlW1wibWFwXCJdLnB1c2gobmV3IERpcmVjdGl2ZVJlZ2lzdHJ5W1wiTWFwXCJdKHtcbiAgICAgICAgICAgICAgICAgICAgdmlldzp0aGlzLFxuICAgICAgICAgICAgICAgICAgICBlbDpzdWJWaWV3RWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgdmFsOnN1YlZpZXdFbGVtZW50Lm1hdGNoXG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICovXG5cblxuICAgICAgICB0aGlzLmRlbGVnYXRlRXZlbnRzKCk7XG5cbiAgICAgICAgdGhpcy5jaGlsZE5vZGVzID0gW10uc2xpY2UuY2FsbCh0aGlzLmVsLmNoaWxkTm9kZXMsIDApO1xuXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH0sXG4gICAgXG4gICAgaW5pdGlhbGl6ZTpmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgICAgLy9hdHRhY2ggb3B0aW9ucyB0byB2aWV3IChtb2RlbCwgcHJvcE1hcCwgc3ViVmlld3MsIGV2ZW50cylcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIF8uZXh0ZW5kKHRoaXMsb3B0aW9ucyk7XG4gICAgfSxcbiAgICBnZXRNb2RlbEF0dHI6ZnVuY3Rpb24oYXR0cil7XG4gICAgICAgIC8vcXVpY2tseSBncmFiIGEgbW9kZWxzIGF0dHJpYnV0ZSBieSBhIHZpZXcgdmFyaWFibGUuIFVzZWZ1bCBpbiBjbGFzc25hbWUgZnVuY3Rpb24uXG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy50ZW1wbGF0ZVZhbHVlc1thdHRyXSA9PVwic3RyaW5nXCIpIHJldHVybiB0aGlzLm1vZGVsLmdldCh0aGlzLnRlbXBsYXRlVmFsdWVzW2F0dHJdKTtcbiAgICAgICAgZWxzZSByZXR1cm4gdGhpcy50ZW1wbGF0ZVZhbHVlc1thdHRyXS5jYWxsKHRoaXMpXG4gICAgfSxcbiAgICB1cGRhdGVWaWV3TW9kZWw6ZnVuY3Rpb24oKXtcblxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIHRoaXMudmlld01vZGVsLnNldChfLm1hcE9iamVjdCh0aGlzLnRlbXBsYXRlVmFsdWVzLGZ1bmN0aW9uKG1vZGVsVmFyKXtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbW9kZWxWYXI9PVwic3RyaW5nXCIpIHJldHVybiB0aGlzLm1vZGVsLmdldChtb2RlbFZhcik7XG4gICAgICAgICAgICBlbHNlIGlmICh0eXBlb2YgbW9kZWxWYXI9PVwiZnVuY3Rpb25cIikgcmV0dXJuIG1vZGVsVmFyLmNhbGwodGhpcylcbiAgICAgICAgfS5iaW5kKHRoaXMpKSk7XG5cbiAgICAgICAgXG5cbiAgICAgICAgXG4gICAgICAgIFxuICAgIFxuICAgIH0sXG4gICAgYnVpbGRJbm5lckhUTUw6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMuJGVsKSB0aGlzLiRlbC5odG1sKHRoaXMucmVuZGVyZWRUZW1wbGF0ZSgpKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZHVtbXlkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICAgICAgZHVtbXlkaXYuaW5uZXJIVE1MID0gdGhpcy5yZW5kZXJlZFRlbXBsYXRlKCk7XG4gICAgICAgICAgICB3aGlsZShkdW1teWRpdi5jaGlsZE5vZGVzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgdGhpcy5lbC5hcHBlbmRDaGlsZChkdW1teWRpdi5jaGlsZE5vZGVzWzBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vbWF5YmUgbGVzcyBoYWNraXNoIHNvbHV0aW9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzI1MjE0MTEzLzE3NjMyMTdcbiAgICAgICAgfVxuICAgIH0sXG4gICAgX3BhcnNlVGV4dE5vZGVzOmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vVGhpcyBmdW5jdGlvbiBnb2VzIHRocm91Z2ggZWFjaCB0ZXh0IG5vZGUgaW4gdGhlIGVsZW1lbnQgZS5nOiAodGV4dE5vZGU8ZGl2PnRleHROb2RlPC9kaXY+dGV4dE5vZGUpLCBhbmQgc3BsaXRzXG4gICAgICAgIC8vdGhlIHRleHROb2RlcyBzbyB0aGF0IHt7c3ViVmlld05hbWV9fSBpcyBpdHMgb3duIHRleHROb2RlLiBUaGVuIGl0IGFkZHMgYWxsIHRleHROb2RlcyBtYXRjaGluZyB7e3N1YlZpZXdOYW1lfX0gdG9cbiAgICAgICAgLy90aGlzLl9zdWJWaWV3RWxlbWVudHNcblxuXG4gICAgICAgICAvL0luaXQgZGlyZWN0aXZlcyBpbnZvbHZpbmcge3t9fVxuXG4gICAgICAgIC8vR2V0IGFsbCBvZiB0aGUgdGV4dCBub2RlcyBpbiB0aGUgZG9jdW1lbnQuIGUuZzogKHRleHROb2RlPGRpdj50ZXh0Tm9kZTwvZGl2PnRleHROb2RlKVxuXG4gICAgICAgIGdldEFsbFRleHROb2Rlcyh0aGlzLmVsKS5mb3JFYWNoKGZ1bmN0aW9uKGZ1bGxUZXh0Tm9kZSl7XG4gICAgICAgICAgICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzIxMzExNjcwLzE3NjMyMTcgdGV4dENvbnRlbnQgc2VlbXMgcmlnaHRcblxuICAgICAgICAgICAgdmFyIHJlID0gL1xce1xceyguKz8pXFx9XFx9L2c7IC8vTWF0Y2gge3tzdWJWaWV3TmFtZX19XG4gICAgICAgICAgICB2YXIgbWF0Y2g7XG4gICAgICAgICAgICBcblxuICAgICAgICAgICAgdmFyIG1hdGNoZXMgPSBbXTtcbiAgICAgICAgICAgIHdoaWxlICgobWF0Y2ggPSByZS5leGVjKGZ1bGxUZXh0Tm9kZS50ZXh0Q29udGVudCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVzLnB1c2gobWF0Y2gpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL0ZvciBlYWNoIHRleHQgbm9kZSwgZ2V0IHRoZSBhcnJheSBvZiBtYXRjaGVzLiBcbiAgICAgICAgICAgIC8vQSBtYXRjaCBpcyBhbiBhcnJheSBpdHNlbGYsIHdpdGggbWF0Y2hbMF0gYmVpbmcgdGhlIG1hdGNoIGFuZCBtYXRjaFsxXSBiZWluZyB0aGUgY2FwdHVyZWQgcGFydFxuICAgICAgICAgICAgLy9BZGRpdGlvbmFsbHkgaXQgaGFzIHRoZSBpbmRleCBhbmQgdGhlIGlucHV0IGFzIHByb3BlcnRpZXMuXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBjdXJyZW50VGV4dE5vZGUgPSBmdWxsVGV4dE5vZGU7XG4gICAgICAgICAgICB2YXIgY3VycmVudFN0cmluZyA9IGZ1bGxUZXh0Tm9kZS50ZXh0Q29udGVudDtcbiAgICAgICAgICAgIHZhciBwcmV2Tm9kZXNMZW5ndGggPSAwO1xuXG4gICAgICAgICAgICAvL0ZvciBlYWNoIG1hdGNoLCBzcGxpdCB0aGUgdGV4dCBub2RlIGludG8gbXVsdGlwbGUgdGV4dCBub2RlcyAoaW4gY2FzZSB0aGVyZSBhcmUgbXVsdGlwbGUgc3ViVmlld3MgaW4gYSB0ZXh0Tm9kZSkuXG4gICAgICAgICAgICAvL1RoZW4sIGFkZCBlYWNoIHRleHROb2RlIG9mIHt7c3ViVmlld319IHRvIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5cbiAgICAgICAgICAgIG1hdGNoZXMuZm9yRWFjaChmdW5jdGlvbihtYXRjaCl7XG4gICAgICAgICAgICAgICAgdmFyIHZhck5vZGUgPSBjdXJyZW50VGV4dE5vZGUuc3BsaXRUZXh0KG1hdGNoLmluZGV4IC0gcHJldk5vZGVzTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB2YXIgZW50aXJlTWF0Y2ggPSBtYXRjaFswXVxuICAgICAgICAgICAgICAgIHZhck5vZGUubWF0Y2ggPSBtYXRjaFsxXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdWJWaWV3RWxlbWVudHMucHVzaCh2YXJOb2RlKTtcbiAgICAgICAgICAgICAgICBjdXJyZW50VGV4dE5vZGUgPSB2YXJOb2RlLnNwbGl0VGV4dChlbnRpcmVNYXRjaC5sZW5ndGgpXG4gICAgICAgICAgICAgICAgY3VycmVudFN0cmluZyA9IGN1cnJlbnRUZXh0Tm9kZS50ZXh0Q29udGVudDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwcmV2Tm9kZXNMZW5ndGg9bWF0Y2guaW5kZXggKyBlbnRpcmVNYXRjaC5sZW5ndGg7Ly9Ob3RlOiBUaGlzIHdvcmtzIGFjY2lkZW50YWxseS4gTWlnaHQgYmUgd3JvbmcuXG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICBcblxuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgIH0sXG4gICAgaW5pdERpcmVjdGl2ZXM6ZnVuY3Rpb24oKXtcblxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgdGhpcy5kaXJlY3RpdmUgPSB7fTtcblxuICAgICAgIFxuXG5cbiAgICAgICAgZm9yICh2YXIgZGlyZWN0aXZlTmFtZSBpbiBEaXJlY3RpdmVSZWdpc3RyeSl7XG4gICAgICAgICAgICB2YXIgX19wcm90byA9IERpcmVjdGl2ZVJlZ2lzdHJ5W2RpcmVjdGl2ZU5hbWVdLnByb3RvdHlwZVxuICAgICAgICAgICAgaWYgKF9fcHJvdG8gaW5zdGFuY2VvZiBEaXJlY3RpdmUpeyAvL2JlY2F1c2UgZm9yZWFjaCB3aWxsIGdldCBtb3JlIHRoYW4ganVzdCBvdGhlciBkaXJlY3RpdmVzXG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBfX3Byb3RvLm5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGVsZW1lbnRzID0gKHRoaXMuJGVsKT8kLm1ha2VBcnJheSh0aGlzLiRlbC5maW5kKFwiW25tLVwiK25hbWUrXCJdXCIpKTokLm1ha2VBcnJheSgkKHRoaXMuZWwucXVlcnlTZWxlY3RvckFsbChcIltubS1cIituYW1lK1wiXVwiKSkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtuYW1lXSA9IGVsZW1lbnRzLm1hcChmdW5jdGlvbihlbGVtZW50LGksZWxlbWVudHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9vbiB0aGUgc2Vjb25kIGdvLWFyb3VuZCBmb3Igbm0tbWFwLCBkaXJlY3RpdmVOYW1lIHNvbWVob3cgaXMgY2FsbGVkIFwiU3ViVmlld1wiXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERpcmVjdGl2ZVJlZ2lzdHJ5W2RpcmVjdGl2ZU5hbWVdKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWw6ZWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWw6ZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJubS1cIituYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAgIFxuXG4gICAgICAgIFxuXG4gICAgICAgXG4gICAgIFxuXG4gICAgICAgXG5cblxuICAgICAgICBcbiAgICB9LFxuICAgIHJlbmRlcmVkVGVtcGxhdGU6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMuanN0KSB7XG4gICAgICAgICAgICB3aW5kb3cuXyA9IF87XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5qc3QodGhpcy52aWV3TW9kZWwuYXR0cmlidXRlcyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSByZXR1cm4gXy50ZW1wbGF0ZSh0aGlzLnRlbXBsYXRlU3RyaW5nKSh0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzKVxuICAgIH0sXG4gICAgZGVsZWdhdGVFdmVudHM6IGZ1bmN0aW9uKGV2ZW50cykgey8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTIxOTMwNjkvMTc2MzIxN1xuICAgICAgICB2YXIgZGVsZWdhdGVFdmVudFNwbGl0dGVyID0gL14oXFxTKylcXHMqKC4qKSQvO1xuICAgICAgICBldmVudHMgfHwgKGV2ZW50cyA9IF8ucmVzdWx0KHRoaXMsICdldmVudHMnKSk7ICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgaWYgKCFldmVudHMpIHJldHVybiB0aGlzO1xuICAgICAgICB0aGlzLnVuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGV2ZW50cykge1xuICAgICAgICAgICAgdmFyIG1ldGhvZCA9IGV2ZW50c1trZXldO1xuICAgICAgICAgICAgaWYgKCFfLmlzRnVuY3Rpb24obWV0aG9kKSkgbWV0aG9kID0gdGhpc1tldmVudHNba2V5XV07XG4gICAgICAgICAgICBpZiAoIW1ldGhvZCkgdGhyb3cgbmV3IEVycm9yKCdNZXRob2QgXCInICsgZXZlbnRzW2tleV0gKyAnXCIgZG9lcyBub3QgZXhpc3QnKTtcbiAgICAgICAgICAgIHZhciBtYXRjaCA9IGtleS5tYXRjaChkZWxlZ2F0ZUV2ZW50U3BsaXR0ZXIpO1xuICAgICAgICAgICAgdmFyIGV2ZW50VHlwZXMgPSBtYXRjaFsxXS5zcGxpdCgnLCcpLCBzZWxlY3RvciA9IG1hdGNoWzJdO1xuICAgICAgICAgICAgbWV0aG9kID0gXy5iaW5kKG1ldGhvZCwgdGhpcyk7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBfKGV2ZW50VHlwZXMpLmVhY2goZnVuY3Rpb24oZXZlbnROYW1lKSB7XG4gICAgICAgICAgICAgICAgZXZlbnROYW1lICs9ICcuZGVsZWdhdGVFdmVudHMnICsgc2VsZi5jaWQ7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdG9yID09PSAnJykge1xuICAgICAgICAgICAgICAgIHNlbGYuJGVsLmJpbmQoZXZlbnROYW1lLCBtZXRob2QpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuJGVsLmRlbGVnYXRlKHNlbGVjdG9yLCBldmVudE5hbWUsIG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBcbiAgICAgICBcbiAgICB9LFxuXG5cblxuXG4gICAgdGFnTmFtZTp1bmRlZmluZWQsLy9kb24ndCB3YW50IGEgdGFnTmFtZSB0byBiZSBkaXYgYnkgZGVmYXVsdC4gUmF0aGVyLCBtYWtlIGl0IGEgZG9jdW1lbnRmcmFnbWVudCdcbiAgICBzdWJWaWV3SW1wb3J0czp7fSxcbiAgICBfZW5zdXJlRWxlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvL092ZXJyaWRpbmcgdGhpcyB0byBzdXBwb3J0IGRvY3VtZW50IGZyYWdtZW50c1xuICAgICAgICBpZiAoIXRoaXMuZWwpIHtcbiAgICAgICAgICAgIGlmKHRoaXMuYXR0cmlidXRlcyB8fCB0aGlzLmlkIHx8IHRoaXMuY2xhc3NOYW1lIHx8IHRoaXMudGFnTmFtZSl7Ly9pZiB5b3UgaGF2ZSBhbnkgb2YgdGhlc2UgYmFja2JvbmUgcHJvcGVydGllcywgZG8gYmFja2JvbmUgYmVoYXZpb3JcbiAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJzID0gXy5leHRlbmQoe30sIF8ucmVzdWx0KHRoaXMsICdhdHRyaWJ1dGVzJykpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pZCkgYXR0cnMuaWQgPSBfLnJlc3VsdCh0aGlzLCAnaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2xhc3NOYW1lKSBhdHRyc1snY2xhc3MnXSA9IF8ucmVzdWx0KHRoaXMsICdjbGFzc05hbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KHRoaXMuX2NyZWF0ZUVsZW1lbnQoXy5yZXN1bHQodGhpcywgJ3RhZ05hbWUnKSB8fCAnZGl2JykpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXRBdHRyaWJ1dGVzKGF0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7Ly9ob3dldmVyLCBkZWZhdWx0IHRvIHRoaXMuZWwgYmVpbmcgYSBkb2N1bWVudGZyYWdtZW50IChtYWtlcyB0aGlzLmVsIG5hbWVkIGltcHJvcGVybHkgYnV0IHdoYXRldmVyKVxuICAgICAgICAgICAgICAgIHRoaXMuZWwgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldEVsZW1lbnQoXy5yZXN1bHQodGhpcywgJ2VsJykpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBzZXQ6ZnVuY3Rpb24ob2JqKXtcblxuICAgICAgICB0aGlzLnZpZXdNb2RlbC5zZXQob2JqKTtcbiAgICB9LFxuICAgIGdldDpmdW5jdGlvbihwcm9wKXtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlld01vZGVsLmdldChwcm9wKVxuICAgIH1cbn0pO1xuIiwiLy9TYW1lIG1vZGVsLCBjb2xsZWN0aW9uIGluIHNhbWUgZmlsZSBmb3Igbm93IGJlY2F1c2UgdGhlc2UgbW9kdWxlcyByZWx5IG9uIGVhY2ggb3RoZXIuXG5cbi8qaW1wb3J0IF8gZnJvbSBcInVuZGVyc2NvcmVcIjsqL1xuLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbmltcG9ydCBNb2RlbCBmcm9tIFwiLi9Nb2RlbFwiO1xuaW1wb3J0IFZpZXdNb2RlbCBmcm9tIFwiLi9WaWV3TW9kZWxcIjtcbmltcG9ydCBDb2xsZWN0aW9uIGZyb20gXCIuL0NvbGxlY3Rpb25cIjtcbmltcG9ydCBWaWV3IGZyb20gXCIuL1ZpZXdcIjtcbmltcG9ydCBEaXJlY3RpdmVSZWdpc3RyeSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnlcIjtcbi8qaW1wb3J0ICQgZnJvbSBcImpxdWVyeVwiOyovXG5cbnZhciBGYWppdGEgPSB7TW9kZWwsIFZpZXdNb2RlbCwgQ29sbGVjdGlvbiwgVmlldywgRGlyZWN0aXZlUmVnaXN0cnl9O1xuRmFqaXRhW1wi8J+MrlwiXSA9IFwiMC4wLjBcIjtcblxuaWYgKHR5cGVvZiB3aW5kb3chPT1cInVuZGVmaW5lZFwiKSB3aW5kb3cuRmFqaXRhID0gRmFqaXRhO1xuaWYgKHR5cGVvZiBnbG9iYWwhPT1cInVuZGVmaW5lZFwiKSBnbG9iYWwuRmFqaXRhID0gRmFqaXRhOyJdLCJuYW1lcyI6WyJCYWNrYm9uZSIsIk1vZGVsIiwiZXh0ZW5kIiwib3B0aW9ucyIsIlVSTFNlYXJjaFBhcmFtcyIsInF1ZXJ5Iiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJzdHJ1Y3R1cmUiLCJwYXJlbnRNb2RlbHMiLCJpbml0IiwiYXR0ciIsIl8iLCJpc1N0cmluZyIsInByb3BzIiwic3BsaXQiLCJsZW5ndGgiLCJtb2RlbCIsInNsaWNlIiwiZm9yRWFjaCIsInByb3AiLCJnZXQiLCJwcm90b3R5cGUiLCJhcHBseSIsImFyZ3VtZW50cyIsImlzVW5kZWZpbmVkIiwia2V5IiwidmFsMSIsInZhbDIiLCJzZXQiLCJ2YWwiLCJpIiwibmV3TW9kZWwiLCJGYWppdGEiLCJpc0FycmF5IiwiQ29sbGVjdGlvbiIsInB1c2giLCJsaXN0ZW5UbyIsInRyaWdnZXIiLCJvbiIsIlZpZXciLCJuYW1lIiwiY29uc29sZSIsImVycm9yIiwidmlldyIsImNoaWxkSW5pdCIsImJ1aWxkIiwidXBkYXRlUmVzdWx0Iiwidmlld01vZGVsIiwicmVuZGVyIiwicmVzdWx0IiwiaXNGdW5jdGlvbiIsImNhbGwiLCJEaXJlY3RpdmUiLCIkZWwiLCJlbCIsInNldEF0dHJpYnV0ZSIsImlubmVySFRNTCIsInZhbHVlIiwicGFzcyIsImdldEF0dHJpYnV0ZSIsIiQiLCJhIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiY2xhc3NMaXN0IiwiYWRkIiwid3JhcHBlckEiLCJwYXJlbnROb2RlIiwicmVwbGFjZUNoaWxkIiwiYXBwZW5kQ2hpbGQiLCJwYXJlbnQiLCJhcmdzIiwic3ViVmlld05hbWUiLCJzdWJNb2RlbE5hbWUiLCJzdWJNb2RlbCIsInN1YkNvbGxlY3Rpb24iLCJBYnN0cmFjdFN1YnZpZXciLCJyZW5kZXJBZGQiLCJyZW5kZXJSZXNldCIsInJlbmRlclJlbW92ZSIsInJlbmRlclNvcnQiLCJDaGlsZFZpZXciLCJjaGlsZFZpZXdJbXBvcnRzIiwiY2hpbGRWaWV3T3B0aW9ucyIsImNoaWxkTWFwcGluZ3MiLCJ0YWdOYW1lIiwiZGVmYXVsdHNPdmVycmlkZSIsImNoaWxkVmlld3MiLCJtYXAiLCJjaGlsZE1vZGVsIiwibW9kZWxzIiwiYXR0cmlidXRlcyIsImNoaWxkdmlldyIsImJpbmQiLCJfaW5pdGlhbGl6ZUJhY2tib25lT2JqZWN0IiwiX2luaXRpYWxpemVDaGlsZE1hcHBpbmdzIiwiX2luaXRpYWxpemVkZWZhdWx0c092ZXJyaWRlIiwiX2luaXRpYWxpemVDaGlsZFZpZXdzIiwicmVwbGFjZVdpdGgiLCJzdWJWaWV3IiwiJGNoaWxkcmVuIiwiY2hpbGRWaWV3IiwiaW5kZXgiLCJkZWxlZ2F0ZUV2ZW50cyIsIiRwYXJlbnQiLCJjaGlsZHJlbiIsImVhY2giLCJleGlzdGluZ0NoaWxkVmlldyIsImZpbHRlciIsIm5ld0NoaWxkVmlldyIsImVtcHR5IiwiY2hpbGQiLCJhcHBlbmQiLCJsYXN0IiwicmVtb3ZlIiwic3BsaWNlIiwiY29udGFpbnMiLCJoaWRlIiwiY3NzIiwiYm9keSIsIkVycm9yIiwiaXMiLCJ3cmFwcGVyIiwiY2hpbGROb2RlcyIsInVud3JhcCIsImluc2VydEJlZm9yZSIsInN1YlZpZXdJbXBvcnRzIiwiQ2hpbGRDb25zdHJ1Y3RvciIsInRlbXBsYXRlVmFsdWVzIiwiY2xhc3NlcyIsImNsIiwicGFyZW50RGlyZWN0aXZlIiwib3B0aW9uc1NlbnRUb1N1YlZpZXciLCJjb250ZW50IiwicmVnaXN0cnkiLCJEaXJlY3RpdmVDb250ZW50IiwiRGlyZWN0aXZlRW5hYmxlIiwiRGlyZWN0aXZlRGlzYWJsZSIsIkRpcmVjdGl2ZUhyZWYiLCJEaXJlY3RpdmVNYXAiLCJEaXJlY3RpdmVPcHRpb25hbCIsIkRpcmVjdGl2ZU9wdGlvbmFsV3JhcCIsIkRpcmVjdGl2ZVNyYyIsIkRpcmVjdGl2ZVN1YnZpZXciLCJEaXJlY3RpdmVEYXRhIiwiZ2V0QWxsVGV4dE5vZGVzIiwibiIsIndhbGsiLCJjcmVhdGVUcmVlV2Fsa2VyIiwiTm9kZUZpbHRlciIsIlNIT1dfVEVYVCIsIm5leHROb2RlIiwiYmFja2JvbmVWaWV3T3B0aW9ucyIsImFkZGl0aW9uYWxWaWV3T3B0aW9ucyIsImNvbnN0cnVjdG9yIiwid2FybiIsImpzdCIsInRlbXBsYXRlU3RyaW5nIiwiZGVmYXVsdHMiLCJ0ZW1wbGF0ZSIsInBpY2siLCJjb25jYXQiLCJkZWYiLCJhdHRycyIsImNsb25lIiwiVmlld01vZGVsIiwidmlld0NvbGxlY3Rpb24iLCJTdWJWaWV3IiwiZGVmYXVsdHNPYmoiLCJzdWJWaWV3SW5kZXgiLCJzdWJ2aWV3IiwiYXQiLCJ1cGRhdGVWaWV3TW9kZWwiLCJfc2V0QXR0cmlidXRlcyIsImtleXMiLCJPYmplY3QiLCJfZW5zdXJlRWxlbWVudCIsImJ1aWxkSW5uZXJIVE1MIiwiX3N1YlZpZXdFbGVtZW50cyIsImluaXREaXJlY3RpdmVzIiwiX3BhcnNlVGV4dE5vZGVzIiwic3ViVmlld0VsZW1lbnQiLCJtYXRjaCIsImxvZyIsInN1YlZpZXdDb25zdHJ1Y3RvciIsImNvbnRleHQiLCJjb2xsZWN0aW9uT2ZWaWV3cyIsImFmdGVyIiwiaW5pdGlhbGl6ZSIsIm1hcE9iamVjdCIsIm1vZGVsVmFyIiwiaHRtbCIsInJlbmRlcmVkVGVtcGxhdGUiLCJkdW1teWRpdiIsImZ1bGxUZXh0Tm9kZSIsInJlIiwibWF0Y2hlcyIsImV4ZWMiLCJ0ZXh0Q29udGVudCIsImN1cnJlbnRUZXh0Tm9kZSIsImN1cnJlbnRTdHJpbmciLCJwcmV2Tm9kZXNMZW5ndGgiLCJ2YXJOb2RlIiwic3BsaXRUZXh0IiwiZW50aXJlTWF0Y2giLCJkaXJlY3RpdmUiLCJkaXJlY3RpdmVOYW1lIiwiRGlyZWN0aXZlUmVnaXN0cnkiLCJfX3Byb3RvIiwiZWxlbWVudHMiLCJtYWtlQXJyYXkiLCJmaW5kIiwicXVlcnlTZWxlY3RvckFsbCIsImVsZW1lbnQiLCJldmVudHMiLCJkZWxlZ2F0ZUV2ZW50U3BsaXR0ZXIiLCJ1bmRlbGVnYXRlRXZlbnRzIiwibWV0aG9kIiwiZXZlbnRUeXBlcyIsInNlbGVjdG9yIiwic2VsZiIsImV2ZW50TmFtZSIsImNpZCIsImRlbGVnYXRlIiwidW5kZWZpbmVkIiwiaWQiLCJjbGFzc05hbWUiLCJzZXRFbGVtZW50IiwiX2NyZWF0ZUVsZW1lbnQiLCJjcmVhdGVEb2N1bWVudEZyYWdtZW50Iiwib2JqIiwiZ2xvYmFsIl0sIm1hcHBpbmdzIjoiOzs7QUFBQTs7O0FBSUEsWUFBZUEsU0FBU0MsS0FBVCxDQUFlQyxNQUFmLENBQXNCOztjQUV4QixvQkFBU0MsT0FBVCxFQUFpQjtRQUNyQixPQUFPQyxlQUFQLEtBQTJCLFdBQWhDLEVBQTZDO1dBQ3RDQyxLQUFMLEdBQWEsSUFBSUQsZUFBSixDQUFvQkUsT0FBT0MsUUFBUCxDQUFnQkMsTUFBcEMsQ0FBYjs7OztTQU1HQyxTQUFMLEdBQWlCLEVBQWpCOztTQUVLQyxZQUFMLEdBQW9CLEVBQXBCO1NBQ0tDLElBQUw7R0FiaUM7UUFlOUIsZ0JBQVUsRUFmb0I7O09BaUIvQixhQUFTQyxJQUFULEVBQWM7Ozs7UUFJWkMsRUFBRUMsUUFBRixDQUFXRixJQUFYLENBQUosRUFBcUI7VUFDZkcsUUFBUUgsS0FBS0ksS0FBTCxDQUFXLElBQVgsQ0FBWjtVQUNJRCxNQUFNRSxNQUFOLEdBQWUsQ0FBbkIsRUFBcUI7WUFDZkMsUUFBUSxJQUFaO2NBQ01DLEtBQU4sQ0FBWSxDQUFaLEVBQWVDLE9BQWYsQ0FBdUIsVUFBU0MsSUFBVCxFQUFjO2NBQy9CSCxNQUFNVCxTQUFOLENBQWdCWSxJQUFoQixDQUFKLEVBQTJCSCxRQUFRQSxNQUFNVCxTQUFOLENBQWdCWSxJQUFoQixDQUFSO1NBRDdCO2VBR09ILEtBQVA7OztRQUdBSSxNQUFNdEIsU0FBU0MsS0FB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
