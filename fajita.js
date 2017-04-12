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
        this.viewModel = new Fajita.ViewModel(attrs);

        //I want to use this.set here but can't get it working without rewriting model.set to support two arguments


        //For each subView, set the viewModel to a collection of views (if it is an array) or a view.
        //It sends in defaultOverride and this's model as a model.

        //Actually that's a confusing API. The question is...should childViewImports be a thing or should it all be called subViewImports?

        if (this.subViewImports) {
            for (var prop in this.subViewImports) {
                //this.viewModel.set(prop,_.extend({},this.subViewImports[prop].prototype.defaults,attrs[prop]))
                if (this.defaults[prop] instanceof Array) {
                    var subview = new Backbone.Collection(attrs[prop].map(function (obj, i) {
                        var view = new _this.subViewImports[prop]({
                            model: _this,
                            defaultsOverride: _this.defaults[prop][i]
                        });
                        return { view: view };
                    }));
                } else {
                    var subview = new this.subViewImports[prop]({
                        model: this,
                        defaultsOverride: this.defaults[prop],
                        //new
                        templateValues: this.templateValues && this.templateValues[prop]
                    });
                }
                subview.parent = this;
                this.viewModel.set(prop, subview);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFqaXRhLmpzIiwic291cmNlcyI6WyJNb2RlbC5qcyIsIlZpZXdNb2RlbC5qcyIsIkNvbGxlY3Rpb24uanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1jb250ZW50LmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1lbmFibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRpc2FibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWhyZWYuanMiLCJkaXJlY3RpdmUvYWJzdHJhY3Qtc3Vidmlldy5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtbWFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1vcHRpb25hbC5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtb3B0aW9uYWx3cmFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1zcmMuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLXN1YnZpZXcuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRhdGEuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnkuanMiLCJWaWV3LmpzIiwiQmFzZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5cblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgXG4gIGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgaWYgKCB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSBcInVuZGVmaW5lZFwiICl7XG4gICAgICB0aGlzLnF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICB9XG5cbiAgIFxuXG4gICAgLy9uZXdcbiAgICB0aGlzLnN0cnVjdHVyZSA9IHt9O1xuXG4gICAgdGhpcy5wYXJlbnRNb2RlbHMgPSBbXTtcbiAgICB0aGlzLmluaXQoKTtcbiAgfSxcbiAgaW5pdDpmdW5jdGlvbigpe30sXG4gIFxuICBnZXQ6ZnVuY3Rpb24oYXR0cil7XG5cbiAgICAvL1RvZG86IGVycm9yIGNoZWNrIHdoZW4gYXR0ciBoYXMgXCItPlwiIGJ1dCBkb2Vzbid0IHN0YXJ0IHdpdGggLT5cblxuICAgIGlmIChfLmlzU3RyaW5nKGF0dHIpKXtcbiAgICAgIHZhciBwcm9wcyA9IGF0dHIuc3BsaXQoXCItPlwiKTtcbiAgICAgIGlmIChwcm9wcy5sZW5ndGggPiAxKXtcbiAgICAgICAgdmFyIG1vZGVsID0gdGhpcztcbiAgICAgICAgcHJvcHMuc2xpY2UoMSkuZm9yRWFjaChmdW5jdGlvbihwcm9wKXtcbiAgICAgICAgICBpZiAobW9kZWwuc3RydWN0dXJlW3Byb3BdKSBtb2RlbCA9IG1vZGVsLnN0cnVjdHVyZVtwcm9wXTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtb2RlbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGdldCA9IEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5nZXQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuICAgIGlmICghXy5pc1VuZGVmaW5lZChnZXQpKSByZXR1cm4gZ2V0O1xuICAgIFxuXG4gXG4gICBcbiAgIFxuICB9LFxuICB0b2dnbGU6ZnVuY3Rpb24oa2V5LHZhbDEsdmFsMil7XG4gICAgaWYgKHRoaXMuZ2V0KGtleSk9PXZhbDIpe1xuICAgICAgdGhpcy5zZXQoa2V5LHZhbDEpO1xuICAgIH1cbiAgICBlbHNlIHRoaXMuc2V0KGtleSx2YWwyKTtcbiAgfSxcbiAgc2V0OmZ1bmN0aW9uKGF0dHIsIHZhbCwgb3B0aW9ucyl7XG4gICBcbiAgICAvKlxuICAgIGdldCBjb2RlLi4uSSB3YW50IHNldCBjb2RlIHRvIG1pcnJvciBnZXQgY29kZVxuICAgICovXG4gICAgaWYgKF8uaXNTdHJpbmcoYXR0cikpe1xuICAgICAgdmFyIHByb3BzID0gYXR0ci5zcGxpdChcIi0+XCIpO1xuICAgICAgaWYgKHByb3BzLmxlbmd0aCA+IDEpe1xuICAgICAgICB2YXIgbW9kZWwgPSB0aGlzO1xuICAgICAgICBwcm9wcy5zbGljZSgxKS5mb3JFYWNoKGZ1bmN0aW9uKHByb3AsaSxwcm9wcyl7XG4gICAgICAgICAgaWYgKG1vZGVsLnN0cnVjdHVyZVtwcm9wXSkgbW9kZWwgPSBtb2RlbC5zdHJ1Y3R1cmVbcHJvcF07XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3TW9kZWw7XG4gICAgICAgICAgICBpZiAoaSA8IHByb3BzLmxlbmd0aCAtIDEpe1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IG5ldyBGYWppdGEuTW9kZWw7ICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IChfLmlzQXJyYXkodmFsKSk/bmV3IEZhaml0YS5Db2xsZWN0aW9uKHZhbCk6bmV3IEZhaml0YS5Nb2RlbCh2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3TW9kZWwucGFyZW50TW9kZWxzLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgbW9kZWwuc3RydWN0dXJlW3Byb3BdID0gbmV3TW9kZWw7XG4gICAgICAgICAgICBtb2RlbC5saXN0ZW5UbyhuZXdNb2RlbCxcImNoYW5nZSBhZGRcIixmdW5jdGlvbihuZXdNb2RlbCxvcHRpb25zKXtcbiAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8qIFRPRE86IGludmVudCBlbnRpcmUgc3lzdGVtIGZvciB0cmF2ZXJzaW5nIGFuZCBmaXJpbmcgZXZlbnRzLiBQcm9iYWJseSBub3Qgd29ydGggdGhlIGVmZm9ydCBmb3Igbm93LlxuICAgICAgICAgICAgICBPYmplY3Qua2V5cyhtb2RlbC5jaGFuZ2VkQXR0cmlidXRlcygpKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlOlwiK3Byb3ArXCIuXCIra2V5KVxuICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAqL1xuXG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIFxuXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICByZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG4gICAgfVxuXG5cbiAgICAgIFxuICAgICBcbiAgfVxuICAvL05vdGU6IHRoZXJlIGlzIHN0aWxsIG5vIGxpc3RlbmVyIGZvciBhIHN1Ym1vZGVsIG9mIGEgY29sbGVjdGlvbiBjaGFuZ2luZywgdHJpZ2dlcmluZyB0aGUgcGFyZW50LiBJIHRoaW5rIHRoYXQncyB1c2VmdWwuXG59KTsiLCJleHBvcnQgZGVmYXVsdCBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIFxufSkiLCIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgTW9kZWwgZnJvbSBcIi4vTW9kZWxcIjtcblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIG1vZGVsOk1vZGVsLCAvL3Byb2JsZW06IE1vZGVsIHJlbGllcyBvbiBjb2xsZWN0aW9uIGFzIHdlbGwgY2F1c2luZyBlcnJvclxuICAgIGluaXRpYWxpemU6ZnVuY3Rpb24oKXtcbiAgICAgICAgIHRoaXMucGFyZW50TW9kZWxzID0gW107XG4gICAgICAgIC8vdHJpZ2dlciBcInVwZGF0ZVwiIHdoZW4gc3VibW9kZWwgY2hhbmdlc1xuICAgICAgICB0aGlzLm9uKFwiYWRkXCIsZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyhtb2RlbCxcImNoYW5nZVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG59KTsiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuXG5leHBvcnQgZGVmYXVsdCBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG4gICAgbmFtZTpudWxsLFxuICAgIGJ1aWxkOm51bGwsXG4gICAgcmVuZGVyOm51bGwsXG4gICAgaW5pdGlhbGl6ZTpmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgICAgaWYgKCF0aGlzLm5hbWUpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGEgbmFtZSBpbiB0aGUgcHJvdG90eXBlLlwiKTtcbiAgICAgICAgdGhpcy52YWwgPSBvcHRpb25zLnZhbDtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvL3ZpZXcgaXMgdGhlIHZpZXcgdGhhdCBpbXBsZW1lbnRzIHRoaXMgZGlyZWN0aXZlLlxuICAgICAgICBpZiAoIW9wdGlvbnMudmlldykgY29uc29sZS5lcnJvcihcIkVycm9yOiBEaXJlY3RpdmUgcmVxdWlyZXMgYSB2aWV3IHBhc3NlZCBhcyBhbiBvcHRpb24uXCIpO1xuICAgICAgICB0aGlzLnZpZXcgPSBvcHRpb25zLnZpZXc7XG4gICAgICAgIGlmICghdGhpcy5jaGlsZEluaXQpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGNoaWxkSW5pdCBpbiBwcm90b3R5cGUuXCIpO1xuICAgICAgICB0aGlzLmNoaWxkSW5pdCgpO1xuICAgICAgICB0aGlzLmJ1aWxkKCk7XG4gICAgfSxcbiAgICBjaGlsZEluaXQ6ZnVuY3Rpb24oKXtcbiAgICAgICBcbiAgICAgICAgdGhpcy51cGRhdGVSZXN1bHQoKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnZpZXcudmlld01vZGVsLFwiY2hhbmdlOlwiK3RoaXMudmFsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVJlc3VsdCgpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuICAgIHVwZGF0ZVJlc3VsdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgcmVzdWx0ID0gdGhpcy52aWV3LmdldCh0aGlzLnZhbCk7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ocmVzdWx0KSkgdGhpcy5yZXN1bHQgPSByZXN1bHQuY2FsbCh0aGlzLnZpZXcpO1xuICAgICAgICBlbHNlIHRoaXMucmVzdWx0ID0gcmVzdWx0O1xuICAgIH1cbn0pOyIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbi8vTm90ZTogRG9uJ3QgdXNlIC5odG1sKCkgb3IgLmF0dHIoKSBqcXVlcnkuIEl0J3Mgd2VpcmQgd2l0aCBkaWZmZXJlbnQgdHlwZXMuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiY29udGVudFwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLHRoaXMucmVzdWx0KVxuICAgICAgICBlbHNlIHRoaXMuZWwuaW5uZXJIVE1MID0gdGhpcy5yZXN1bHQ7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5idWlsZCgpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHZhciBwYXNzID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikge1xuICAgICAgICAgICAgaWYgKHRoaXMuZWwuZ2V0QXR0cmlidXRlKFwidGl0bGVcIik9PXZhbHVlICsgXCJcIikgcGFzcyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5lbC5pbm5lckhUTUw9PXZhbHVlK1wiXCIpIHBhc3MgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgfVxufSk7IiwiLy9XaHkgZG9lcyB1bmRlcnNjb3JlIHdvcmsgaGVyZT9cblxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcImVuYWJsZVwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsdHJ1ZSk7XG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIixcIlwiKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpIT12YWx1ZTtcbiAgICB9XG59KTtcbiIsIi8vV2h5IGRvZXMgdW5kZXJzY29yZSB3b3JrIGhlcmU/XG5cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJkaXNhYmxlXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpPT12YWx1ZTtcbiAgICB9XG59KTtcbiIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJocmVmXCIsXG4gICBcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSB0aGlzLiRlbC5hdHRyKFwiaHJlZlwiLHRoaXMucmVzdWx0KTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgICAgICAgICAgYS5jbGFzc0xpc3QuYWRkKFwid3JhcHBlci1hXCIpXG4gICAgICAgICAgICBhLnNldEF0dHJpYnV0ZShcImhyZWZcIix0aGlzLnJlc3VsdCk7XG4gICAgICAgICAgICB0aGlzLndyYXBwZXJBID0gYTtcbiAgICAgICAgICAgIHRoaXMuZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQodGhpcy53cmFwcGVyQSx0aGlzLmVsKVxuICAgICAgICAgICAgLy9jYW4ndCBzaW1wbHkgdXNlIHRoaXMuJGVsLndyYXAoYSk7XG4gICAgICAgICAgICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTcwNzMyOC93cmFwLW9uZS1lbGVtZW50LXdpdGgtYW5vdGhlci1yZXRhaW5pbmctcmVmZXJlbmNlLXRvLXdyYXBwZXJcbiAgICAgICAgICAgIHRoaXMud3JhcHBlckEuYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93LndyYXBwZXJBID0gdGhpcy53cmFwcGVyQTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSAkKHRoaXMuZWwpLmF0dHIoXCJocmVmXCIsdGhpcy5yZXN1bHQpXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy53cmFwcGVyQS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIsdGhpcy5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgaWYgKHRoaXMuJGVsLnByb3AoXCJ0YWdOYW1lXCIpPT1cIkFcIikgcmV0dXJuICQodGhpcy5lbCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucGFyZW50KCkucHJvcChcInRhZ05hbWVcIik9PVwiQVwiICYmICQodGhpcy5lbCkucGFyZW50KCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIH1cbiAgICB9XG59KTsiLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiYWJzdHJhY3RzdWJ2aWV3XCIsXG4gICAgX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgYXJncyA9IHRoaXMudmFsLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgdGhpcy5zdWJWaWV3TmFtZSA9IGFyZ3NbMF07XG4gICAgICAgICBpZiAoYXJnc1sxXSl7XG4gICAgICAgICAgICB0aGlzLnN1Yk1vZGVsTmFtZSA9IGFyZ3NbMV07XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSB0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpOyAvL2NoYW5nZWQgZnJvbSBzdWJNb2RlbE5hbWUuXG4gICAgICAgICAgICBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCkgdGhpcy5zdWJNb2RlbCA9IG1vZGVsO1xuICAgICAgICAgICAgZWxzZSBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Db2xsZWN0aW9uKSB0aGlzLnN1YkNvbGxlY3Rpb24gPSBtb2RlbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCksKG1vZGVsIGluc3RhbmNlb2YgQmFja2JvbmUuQ29sbGVjdGlvbiksdGhpcy5zdWJDb2xsZWN0aW9uKVxuICAgICAgICAgICAgLy9kZWJ1Z2dlcjtcbiAgICAgICAgIH1cbiAgICB9LFxuXG5cblxuICAgIF9pbml0aWFsaXplQ2hpbGRWaWV3czpmdW5jdGlvbigpe1xuXG4gICAgfVxufSkiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcbmltcG9ydCBBYnN0cmFjdFN1YnZpZXcgZnJvbSBcIi4vYWJzdHJhY3Qtc3Vidmlld1wiXG5leHBvcnQgZGVmYXVsdCBBYnN0cmFjdFN1YnZpZXcuZXh0ZW5kKHtcbiAgICBuYW1lOlwibWFwXCIsXG4gICAgX2luaXRpYWxpemVDaGlsZFZpZXdzOmZ1bmN0aW9uKCl7XG5cblxuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwiYWRkXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyQWRkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwicmVzZXRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJSZXNldCgpO1xuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwicmVtb3ZlXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyUmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwic29ydFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclNvcnQoKTsgICAgICAgIFxuICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgLy9NYXAgbW9kZWxzIHRvIGNoaWxkVmlldyBpbnN0YW5jZXMgd2l0aCB0aGVpciB0ZW1wbGF0ZVZhbHVlc1xuICAgICAgICB0aGlzLkNoaWxkVmlldyA9IHRoaXMudmlldy5jaGlsZFZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICB0aGlzLmNoaWxkVmlld09wdGlvbnMgPSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp0aGlzLmNoaWxkTWFwcGluZ3MsXG4gICAgICAgICAgICBjb2xsZWN0aW9uOnRoaXMuc3ViQ29sbGVjdGlvbixcbiAgICAgICAgICAgIHRhZ05hbWU6dGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlLnRhZ05hbWUgfHwgXCJzdWJpdGVtXCIsXG4gICAgICAgICAgICBkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNPdmVycmlkZVxuICAgICAgICB9O1xuXG5cbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzID0gdGhpcy5zdWJDb2xsZWN0aW9uLm1hcChmdW5jdGlvbihjaGlsZE1vZGVsLGkpe1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgY2hpbGRWaWV3T3B0aW9ucyA9IF8uZXh0ZW5kKHt9LHRoaXMuY2hpbGRWaWV3T3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgbW9kZWw6Y2hpbGRNb2RlbCxcbiAgICAgICAgICAgICAgICBpbmRleDppLFxuICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgZGVmYXVsdHNPdmVycmlkZTp0aGlzLmRlZmF1bHRzT3ZlcnJpZGUgJiYgdGhpcy5kZWZhdWx0c092ZXJyaWRlLm1vZGVsc1tpXSAmJiB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUubW9kZWxzW2ldLmF0dHJpYnV0ZXMsXG4gICAgICAgICAgICAgICAgLy9KdXN0IGFkZGVkIGNoZWNrIGZvciB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUubW9kZWxzW2ldXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGNoaWxkdmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyhjaGlsZFZpZXdPcHRpb25zKTtcbiAgICAgICAgICAgIC8vY2hpbGR2aWV3Ll9zZXRBdHRyaWJ1dGVzKF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChjaGlsZHZpZXcsICdhdHRyaWJ1dGVzJykpKTtcbiAgICAgICAgICAgIHJldHVybiBjaGlsZHZpZXc7XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICB9LFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQmFja2JvbmVPYmplY3QoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3MoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZWRlZmF1bHRzT3ZlcnJpZGUoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkVmlld3MoKTtcblxuICAgICAgICBcbiAgICAgIFxuXG4gICAgICAgIFxuICAgICAgICBcblxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgIFxuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgodGhpcy5zdWJWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyICRjaGlsZHJlbiA9ICQoKTtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAkY2hpbGRyZW4gPSAkY2hpbGRyZW4uYWRkKGNoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICBjaGlsZFZpZXcuaW5kZXggPSBpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIGlmICgkY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgoJGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkVmlldy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gJGNoaWxkcmVuLnBhcmVudCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkY2hpbGRyZW5cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyQWRkOmZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IFtdO1xuICAgICAgICB0aGlzLnN1YkNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihtb2RlbCxpKXtcbiAgICAgICAgICAgIHZhciBleGlzdGluZ0NoaWxkVmlldyA9IHRoaXMuY2hpbGRWaWV3cy5maWx0ZXIoZnVuY3Rpb24oY2hpbGRWaWV3KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRWaWV3Lm1vZGVsID09IG1vZGVsXG4gICAgICAgICAgICB9KVswXTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ0NoaWxkVmlldykge1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goZXhpc3RpbmdDaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICAgICAgLy92YXIgYXR0cmlidXRlcyA9IF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChleGlzdGluZ0NoaWxkVmlldywgJ2F0dHJpYnV0ZXMnKSlcbiAgICAgICAgICAgICAgICAvL2V4aXN0aW5nQ2hpbGRWaWV3Ll9zZXRBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld0NoaWxkVmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyh7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsOm1vZGVsLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp0aGlzLmNoaWxkTWFwcGluZ3MsXG4gICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOnRoaXMudmlldy5nZXQodGhpcy52YWwuc3BsaXQoXCI6XCIpWzBdKVtpXVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnB1c2gobmV3Q2hpbGRWaWV3KTtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKG5ld0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKXtcbiAgICAgICAgICAgIHRoaXMuJHBhcmVudC5hcHBlbmQoY2hpbGQpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkKGNoaWxkcmVuKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIH0pXG5cbiAgICB9LFxuICAgIHJlbmRlclJlc2V0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgIH0sXG4gICAgcmVuZGVyUmVtb3ZlOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGNoaWxkcmVuLmxhc3QoKS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnNwbGljZSgtMSwxKTtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSB0aGlzLiRwYXJlbnQuY2hpbGRyZW4oKTtcbiAgICB9LFxuICAgIHJlbmRlclNvcnQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgIC8vRG9uJ3QgbmVlZCB0aGlzIChub3cpLiBNb2RlbHMgd2lsbCBhbHJlYWR5IGJlIHNvcnRlZCBvbiBhZGQgd2l0aCBjb2xsZWN0aW9uLmNvbXBhcmF0b3IgPSB4eHg7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vdGhpcy52aWV3IGlzIGluc3RhbmNlIG9mIHRoZSB2aWV3IHRoYXQgY29udGFpbnMgdGhlIHN1YnZpZXcgZGlyZWN0aXZlLlxuICAgICAgICAvL3RoaXMuc3ViVmlldyBpcyBpbnN0YW5jZSBvZiB0aGUgc3Vidmlld1xuICAgICAgICAvL3RoaXMgaXMgdGhlIGRpcmVjdGl2ZS5cblxuICAgICAgICBpZiAodGhpcy5zdWJWaWV3KXtcbiAgICAgICAgICAgIC8vd2h5IHBhcmVudE5vZGU/XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aWV3LmVsLmNvbnRhaW5zKHRoaXMuc3ViVmlldy5lbC5wYXJlbnROb2RlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyIHBhc3MgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGVsID0gdGhpcy52aWV3LmVsXG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbi5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCFlbC5jb250YWlucyh0aGlzKSkgcGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbn0pIiwiLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJvcHRpb25hbFwiLFxuICAgIFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkuaGlkZSgpXG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5jc3MoXCJkaXNwbGF5XCIsXCJcIik7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCkgJCh0aGlzLmVsKS5oaWRlKClcbiAgICAgICAgZWxzZSAkKHRoaXMuZWwpLmNzcyhcImRpc3BsYXlcIixcIlwiKTtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICBpZiAoIWRvY3VtZW50LmJvZHkuY29udGFpbnModGhpcy5lbCkpIHRocm93IEVycm9yKFwiZWxlbWVudCBoYXMgdG8gYmUgaW4gdGhlIERPTSBpbiBvcmRlciB0byB0ZXN0XCIpXG4gICAgICAgIHJldHVybiAkKHRoaXMuZWwpLmlzKFwiOnZpc2libGVcIik9PXZhbHVlO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcIm9wdGlvbmFsd3JhcFwiLFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICBEaXJlY3RpdmUucHJvdG90eXBlLmNoaWxkSW5pdC5jYWxsKHRoaXMsYXJndW1lbnRzKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMud3JhcHBlciA9IHRoaXMuZWw7XG4gICAgICAgIHRoaXMuY2hpbGROb2RlcyA9IFtdLnNsaWNlLmNhbGwodGhpcy5lbC5jaGlsZE5vZGVzLCAwKTtcbiAgICAgICAgXG4gICAgfSxcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuY2hpbGROb2RlcykudW53cmFwKCk7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCl7XG4gICAgICAgICAgICAkKHRoaXMuY2hpbGROb2RlcykudW53cmFwKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLmNoaWxkTm9kZXNbMF0pKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmlyc3QgY2hpbGQgaGFzIHRvIGJlIGluIERPTVwiKTtcbiAgICAgICAgICAgICAgICAvL3NvbHV0aW9uOiBhZGQgYSBkdW1teSB0ZXh0IG5vZGUgYXQgYmVnaW5uaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLndyYXBwZXIpKXtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkTm9kZXNbMF0ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy53cmFwcGVyLHRoaXMuY2hpbGROb2Rlc1swXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IodmFyIGk9MDtpPHRoaXMuY2hpbGROb2Rlcy5sZW5ndGg7aSsrKXtcbiAgICAgICAgICAgICAgICB0aGlzLndyYXBwZXIuYXBwZW5kQ2hpbGQodGhpcy5jaGlsZE5vZGVzW2ldKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcblxuXG4gICAgICAgIHJldHVybiAodGhpcy5jaGlsZE5vZGVzWzBdLnBhcmVudE5vZGU9PXRoaXMud3JhcHBlcikgPT0gdmFsdWU7XG5cblxuICAgICAgXG4gICAgfVxufSkiLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwic3JjXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kZWwuYXR0cihcInNyY1wiLHRoaXMucmVzdWx0KTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLiRlbC5hdHRyKFwic3JjXCIsdGhpcy5yZXN1bHQpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHJldHVybiB0aGlzLiRlbC5hdHRyKFwic3JjXCIpPT09dmFsdWU7XG4gICAgfVxufSk7IiwiLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbi8qXG4gICAgTm90ZTogdXNlIHZpZXcuZ2V0IGZvciBkZWZhdWx0T3ZlcnJpZGUgYmVjYXVzZSByZWZlcnJpbmcgdG8gdGhlIGRlZmF1bHRzIGhhc2ggZGlyZWN0bHkgbWlnaHQgbm90IGJlIGNvcnJlY3QgaW4gdGhlIGNhc2Ugb2YgbmVzdGVkIG5lc3RlZCBzdWJWaWV3cyBcblxuKi9cblxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcbmltcG9ydCBBYnN0cmFjdFN1YnZpZXcgZnJvbSBcIi4vYWJzdHJhY3Qtc3Vidmlld1wiXG5leHBvcnQgZGVmYXVsdCBBYnN0cmFjdFN1YnZpZXcuZXh0ZW5kKHtcbiAgICBuYW1lOlwic3Vidmlld1wiLFxuICAgIF9pbml0aWFsaXplQ2hpbGRWaWV3czpmdW5jdGlvbigpe1xuXG4gICAgICAgIGlmICh0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlIGluc3RhbmNlb2YgQmFja2JvbmUuVmlldykgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICBlbHNlIHRoaXMuQ2hpbGRDb25zdHJ1Y3RvciA9IHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXS8qLmNhbGwodGhpcy52aWV3KTsqL1xuXG4gICAgICAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSkpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7ZGVmYXVsdHNPdmVycmlkZTp0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy52aWV3LnRlbXBsYXRlVmFsdWVzICYmIHRoaXMudmlldy50ZW1wbGF0ZVZhbHVlc1t0aGlzLnN1YlZpZXdOYW1lXSl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp0aGlzLnZpZXcudGVtcGxhdGVWYWx1ZXNbdGhpcy5zdWJWaWV3TmFtZV1cbiAgICAgICAgICAgICAgICAvLyxlbDp0aGlzLmVsIFRoZSBlbCBvZiB0aGUgZGlyZWN0aXZlIHNob3VsZCBiZWxvbmcgdG8gdGhlIGRpcmVjdGl2ZSBidXQgbm90IHRoZSBzdWJ2aWV3IGl0c2VsZlxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHN1Yk1vZGVsID0gdGhpcy5zdWJNb2RlbCB8fCB0aGlzLnZpZXcubW9kZWw7XG4gICAgICAgIGlmIChzdWJNb2RlbCl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHttb2RlbDpzdWJNb2RlbH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy5zdWJWaWV3ID0gbmV3IHRoaXMuQ2hpbGRDb25zdHJ1Y3RvcihvcHRpb25zKTtcbiAgICAgICAgICAgIHZhciBjbGFzc2VzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiY2xhc3NOYW1lXCIpXG4gICAgICAgICAgICBpZiAoY2xhc3Nlcyl7XG4gICAgICAgICAgICAgICAgY2xhc3Nlcy5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihjbCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5jbGFzc0xpc3QuYWRkKGNsKVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiYXR0cmlidXRlc1wiKTtcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgICAgICBfLmVhY2goYXR0cmlidXRlcyxmdW5jdGlvbih2YWwsbmFtZSl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5zZXRBdHRyaWJ1dGUobmFtZSx2YWwpICAgIFxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zdWJWaWV3LnBhcmVudCA9IHRoaXMudmlldztcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnREaXJlY3RpdmUgPSB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9uc1NlbnRUb1N1YlZpZXcgPSBvcHRpb25zO1xuICAgIH0sXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vdGhpcy52YWwsIHRoaXMudmlld1xuXG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdCgpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQ2hpbGRWaWV3cygpO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICBcbiAgICAgIFxuXG4gICAgICAgIGlmICh0aGlzLnN1YkNvbGxlY3Rpb24peyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcImFkZFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQWRkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcInJlc2V0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJSZXNldCgpO1xuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcInJlbW92ZVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyUmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcInNvcnRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclNvcnQoKTsgICAgICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuXG5cblxuICAgICAgICAgICAgICAgIC8vTWFwIG1vZGVscyB0byBjaGlsZFZpZXcgaW5zdGFuY2VzIHdpdGggdGhlaXIgdGVtcGxhdGVWYWx1ZXNcbiAgICAgICAgICAgICAgICB0aGlzLkNoaWxkVmlldyA9IHRoaXMudmlldy5jaGlsZFZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dGhpcy52aWV3LnRlbXBsYXRlVmFsdWVzICYmIHRoaXMudmlldy50ZW1wbGF0ZVZhbHVlc1t0aGlzLnN1YlZpZXdOYW1lXSxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIHRhZ05hbWU6dGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlLnRhZ05hbWUgfHwgXCJzdWJpdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRzT3ZlcnJpZGU6dGhpcy52aWV3LmdldCh0aGlzLnN1YlZpZXdOYW1lKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzID0gdGhpcy5zdWJDb2xsZWN0aW9uLm1hcChmdW5jdGlvbihjaGlsZE1vZGVsLGkpe1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkVmlld09wdGlvbnMgPSBfLmV4dGVuZCh7fSx0aGlzLmNoaWxkVmlld09wdGlvbnMse1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6Y2hpbGRNb2RlbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0SW5kZXg6dGhpcy5zdWJDb2xsZWN0aW9uLmxlbmd0aCAtIGkgLSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdHNPdmVycmlkZTp0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpICYmIHRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSkubW9kZWxzW2ldICYmIHRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSkubW9kZWxzW2ldLmF0dHJpYnV0ZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0p1c3QgYWRkZWQgY2hlY2sgZm9yIHRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSkubW9kZWxzW2ldXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkdmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyhjaGlsZFZpZXdPcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgLy9jaGlsZHZpZXcuX3NldEF0dHJpYnV0ZXMoXy5leHRlbmQoe30sIF8ucmVzdWx0KGNoaWxkdmlldywgJ2F0dHJpYnV0ZXMnKSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGR2aWV3O1xuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG5cblxuICAgICAgICAgICAgICAgIFxuXG5cblxuICAgICAgICB9XG5cbiAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuXG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIGlmICh0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlIGluc3RhbmNlb2YgQmFja2JvbmUuVmlldykgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICAgICAgZWxzZSB0aGlzLkNoaWxkQ29uc3RydWN0b3IgPSB0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0vKi5jYWxsKHRoaXMudmlldyk7Ki9cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIHZhciBvcHRpb25zID0ge307XG4gICAgICAgICAgIFxuICAgICAgICBpZiAodGhpcy52aWV3LmdldCh0aGlzLnN1YlZpZXdOYW1lKSl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtkZWZhdWx0c092ZXJyaWRlOnRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSl9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnZpZXcudGVtcGxhdGVWYWx1ZXMpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dGhpcy52aWV3LnRlbXBsYXRlVmFsdWVzW3RoaXMuc3ViVmlld05hbWVdXG4gICAgICAgICAgICAgICAgLy8sZWw6dGhpcy5lbCBUaGUgZWwgb2YgdGhlIGRpcmVjdGl2ZSBzaG91bGQgYmVsb25nIHRvIHRoZSBkaXJlY3RpdmUgYnV0IG5vdCB0aGUgc3VidmlldyBpdHNlbGZcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBzdWJNb2RlbCA9IHRoaXMuc3ViTW9kZWwgfHwgdGhpcy52aWV3Lm1vZGVsO1xuICAgICAgICBpZiAoc3ViTW9kZWwpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7bW9kZWw6c3ViTW9kZWx9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldyA9IG5ldyB0aGlzLkNoaWxkQ29uc3RydWN0b3Iob3B0aW9ucyk7XG4gICAgICAgICAgICB2YXIgY2xhc3NlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImNsYXNzTmFtZVwiKVxuICAgICAgICAgICAgaWYgKGNsYXNzZXMpe1xuICAgICAgICAgICAgICAgIGNsYXNzZXMuc3BsaXQoXCIgXCIpLmZvckVhY2goZnVuY3Rpb24oY2wpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuY2xhc3NMaXN0LmFkZChjbClcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgYXR0cmlidXRlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImF0dHJpYnV0ZXNcIik7XG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlcyl7XG4gICAgICAgICAgICAgICAgXy5lYWNoKGF0dHJpYnV0ZXMsZnVuY3Rpb24odmFsLG5hbWUpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuc2V0QXR0cmlidXRlKG5hbWUsdmFsKSAgICBcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnQgPSB0aGlzLnZpZXc7XG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcucGFyZW50RGlyZWN0aXZlID0gdGhpcztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnNTZW50VG9TdWJWaWV3ID0gb3B0aW9ucztcbiAgICB9LFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIHRoaXMuJGVsLnJlcGxhY2VXaXRoKHRoaXMuc3ViVmlldy5lbCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHZhciAkY2hpbGRyZW4gPSAkKCk7XG4gICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgJGNoaWxkcmVuID0gJGNoaWxkcmVuLmFkZChjaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICAgICAgY2hpbGRWaWV3LmluZGV4ID0gaTtcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBpZiAoJGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGVsLnJlcGxhY2VXaXRoKCRjaGlsZHJlbik7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgICAgICAgICBjaGlsZFZpZXcuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9ICRjaGlsZHJlbi5wYXJlbnQoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICB0aGlzLiRwYXJlbnQgPSB0aGlzLiRlbC5wYXJlbnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuJGNoaWxkcmVuID0gJGNoaWxkcmVuXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlbmRlckFkZDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgdGhpcy5zdWJDb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24obW9kZWwsaSl7XG4gICAgICAgICAgICB2YXIgZXhpc3RpbmdDaGlsZFZpZXcgPSB0aGlzLmNoaWxkVmlld3MuZmlsdGVyKGZ1bmN0aW9uKGNoaWxkVmlldyl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkVmlldy5tb2RlbCA9PSBtb2RlbFxuICAgICAgICAgICAgfSlbMF07XG4gICAgICAgICAgICBpZiAoZXhpc3RpbmdDaGlsZFZpZXcpIHtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKGV4aXN0aW5nQ2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgICAgIC8vdmFyIGF0dHJpYnV0ZXMgPSBfLmV4dGVuZCh7fSwgXy5yZXN1bHQoZXhpc3RpbmdDaGlsZFZpZXcsICdhdHRyaWJ1dGVzJykpXG4gICAgICAgICAgICAgICAgLy9leGlzdGluZ0NoaWxkVmlldy5fc2V0QXR0cmlidXRlcyhhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBuZXdDaGlsZFZpZXcgPSBuZXcgdGhpcy5DaGlsZFZpZXcoe1xuICAgICAgICAgICAgICAgICAgICBtb2RlbDptb2RlbCxcbiAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dGhpcy52aWV3LnRlbXBsYXRlVmFsdWVzICYmIHRoaXMudmlldy50ZW1wbGF0ZVZhbHVlc1t0aGlzLnN1YlZpZXdOYW1lXSxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdEluZGV4OnRoaXMuc3ViQ29sbGVjdGlvbi5sZW5ndGggLSBpIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6dGhpcy52aWV3LmdldCh0aGlzLnZhbC5zcGxpdChcIjpcIilbMF0pW2ldXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MucHVzaChuZXdDaGlsZFZpZXcpO1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2gobmV3Q2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpe1xuICAgICAgICAgICAgdGhpcy4kcGFyZW50LmFwcGVuZChjaGlsZClcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9ICQoY2hpbGRyZW4pXG4gICAgICAgIFxuICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICBjaGlsZFZpZXcuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgfSlcblxuICAgIH0sXG4gICAgcmVuZGVyUmVzZXQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgfSxcbiAgICByZW5kZXJSZW1vdmU6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4ubGFzdCgpLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmNoaWxkVmlld3Muc3BsaWNlKC0xLDEpO1xuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9IHRoaXMuJHBhcmVudC5jaGlsZHJlbigpO1xuICAgIH0sXG4gICAgcmVuZGVyU29ydDpmdW5jdGlvbigpe1xuICAgICAgICBcbiAgICAgICAgLy9Eb24ndCBuZWVkIHRoaXMgKG5vdykuIE1vZGVscyB3aWxsIGFscmVhZHkgYmUgc29ydGVkIG9uIGFkZCB3aXRoIGNvbGxlY3Rpb24uY29tcGFyYXRvciA9IHh4eDtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy90aGlzLnZpZXcgaXMgaW5zdGFuY2Ugb2YgdGhlIHZpZXcgdGhhdCBjb250YWlucyB0aGUgc3VidmlldyBkaXJlY3RpdmUuXG4gICAgICAgIC8vdGhpcy5zdWJWaWV3IGlzIGluc3RhbmNlIG9mIHRoZSBzdWJ2aWV3XG4gICAgICAgIC8vdGhpcyBpcyB0aGUgZGlyZWN0aXZlLlxuXG4gICAgICAgIGlmICh0aGlzLnN1YlZpZXcpe1xuICAgICAgICAgICAgLy93aHkgcGFyZW50Tm9kZT9cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZpZXcuZWwuY29udGFpbnModGhpcy5zdWJWaWV3LmVsLnBhcmVudE5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB2YXIgcGFzcyA9IHRydWU7XG4gICAgICAgICAgICB2YXIgZWwgPSB0aGlzLnZpZXcuZWxcbiAgICAgICAgICAgIHRoaXMuJGNoaWxkcmVuLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoIWVsLmNvbnRhaW5zKHRoaXMpKSBwYXNzID0gZmFsc2U7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICByZXR1cm4gcGFzcztcbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgfVxufSkiLCIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJkYXRhXCIsXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuY29udGVudCA9IHRoaXMudmlldy52aWV3TW9kZWwuZ2V0KHRoaXMudmFsKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnZpZXcudmlld01vZGVsLFwiY2hhbmdlOlwiK3RoaXMudmFsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLmNvbnRlbnQgPSB0aGlzLnZpZXcudmlld01vZGVsLmdldCh0aGlzLnZhbCk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9KVxuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICBfLmVhY2godGhpcy5jb250ZW50LGZ1bmN0aW9uKHZhbCxwcm9wKXtcbiAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWwpKSB2YWwgPSB2YWwuYmluZCh0aGlzLnZpZXcpO1xuICAgICAgICAgICB0aGlzLiRlbC5hdHRyKFwiZGF0YS1cIitwcm9wLHZhbClcbiAgICAgICB9LmJpbmQodGhpcykpXG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICBfLmVhY2godGhpcy5jb250ZW50LGZ1bmN0aW9uKHZhbCxwcm9wKXtcbiAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWwpKSB2YWwgPSB2YWwuYmluZCh0aGlzLnZpZXcpO1xuICAgICAgICAgICB0aGlzLiRlbC5hdHRyKFwiZGF0YS1cIitwcm9wLHZhbClcbiAgICAgICB9LmJpbmQodGhpcykpXG4gICAgfVxufSk7IiwiaW1wb3J0IERpcmVjdGl2ZUNvbnRlbnQgZnJvbSBcIi4vZGlyZWN0aXZlLWNvbnRlbnRcIjtcbmltcG9ydCBEaXJlY3RpdmVFbmFibGUgZnJvbSBcIi4vZGlyZWN0aXZlLWVuYWJsZVwiO1xuaW1wb3J0IERpcmVjdGl2ZURpc2FibGUgZnJvbSBcIi4vZGlyZWN0aXZlLWRpc2FibGVcIjtcbmltcG9ydCBEaXJlY3RpdmVIcmVmIGZyb20gXCIuL2RpcmVjdGl2ZS1ocmVmXCI7XG5pbXBvcnQgRGlyZWN0aXZlTWFwIGZyb20gXCIuL2RpcmVjdGl2ZS1tYXBcIjtcbmltcG9ydCBEaXJlY3RpdmVPcHRpb25hbCBmcm9tIFwiLi9kaXJlY3RpdmUtb3B0aW9uYWxcIjtcbmltcG9ydCBEaXJlY3RpdmVPcHRpb25hbFdyYXAgZnJvbSBcIi4vZGlyZWN0aXZlLW9wdGlvbmFsd3JhcFwiO1xuaW1wb3J0IERpcmVjdGl2ZVNyYyBmcm9tIFwiLi9kaXJlY3RpdmUtc3JjXCI7XG5pbXBvcnQgRGlyZWN0aXZlU3VidmlldyBmcm9tIFwiLi9kaXJlY3RpdmUtc3Vidmlld1wiO1xuaW1wb3J0IERpcmVjdGl2ZURhdGEgZnJvbSBcIi4vZGlyZWN0aXZlLWRhdGFcIjtcblxudmFyIHJlZ2lzdHJ5ID0ge1xuICAgIENvbnRlbnQ6RGlyZWN0aXZlQ29udGVudCxcbiAgICBFbmFibGU6RGlyZWN0aXZlRW5hYmxlLFxuICAgIERpc2FibGU6RGlyZWN0aXZlRGlzYWJsZSxcbiAgICBIcmVmOkRpcmVjdGl2ZUhyZWYsXG4gICAgTWFwOkRpcmVjdGl2ZU1hcCxcbiAgICBPcHRpb25hbDpEaXJlY3RpdmVPcHRpb25hbCxcbiAgICBPcHRpb25hbFdyYXA6RGlyZWN0aXZlT3B0aW9uYWxXcmFwLFxuICAgIFNyYzpEaXJlY3RpdmVTcmMsXG4gICAgU3VidmlldzpEaXJlY3RpdmVTdWJ2aWV3LFxuICAgIERhdGE6RGlyZWN0aXZlRGF0YVxufTtcblxuZXhwb3J0IGRlZmF1bHQgcmVnaXN0cnk7IiwiLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cbi8qaW1wb3J0IF8gZnJvbSBcInVuZGVyc2NvcmVcIjsqL1xuLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbmltcG9ydCBEaXJlY3RpdmVSZWdpc3RyeSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnkuanNcIlxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlLmpzXCJcbmltcG9ydCBWaWV3TW9kZWwgZnJvbSBcIi4vVmlld01vZGVsXCI7XG5cbmZ1bmN0aW9uIGdldEFsbFRleHROb2RlcyhlbCl7XG4gICAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEwNzMwMzA5L2ZpbmQtYWxsLXRleHQtbm9kZXMtaW4taHRtbC1wYWdlXG4gICAgdmFyIG4sIGE9W10sIHdhbGs9ZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcihlbCxOb2RlRmlsdGVyLlNIT1dfVEVYVCxudWxsLGZhbHNlKTtcbiAgICB3aGlsZShuPXdhbGsubmV4dE5vZGUoKSkgYS5wdXNoKG4pO1xuICAgIHJldHVybiBhO1xufVxuXG52YXIgYmFja2JvbmVWaWV3T3B0aW9ucyA9IFsnbW9kZWwnLCAnY29sbGVjdGlvbicsICdlbCcsICdpZCcsICdhdHRyaWJ1dGVzJywgJ2NsYXNzTmFtZScsICd0YWdOYW1lJywgJ2V2ZW50cyddO1xudmFyIGFkZGl0aW9uYWxWaWV3T3B0aW9ucyA9IFsnd2FybicsJ3RlbXBsYXRlVmFsdWVzJywndGVtcGxhdGVTdHJpbmcnLCdjaGlsZFZpZXdJbXBvcnRzJywnc3ViVmlld0ltcG9ydHMnLCdpbmRleCcsJ2xhc3RJbmRleCcsJ2RlZmF1bHRzT3ZlcnJpZGUnXVxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICAgIFxuICAgICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gY29uc3RydWN0b3Iob3B0aW9ucykge1xuXG4gICAgICAgIHZhciBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICAvL0EgdGVtcGxhdGUgYW5kIGRlZmF1bHRzIGFyZSBhbGwgYnV0IHJlcXVpcmVkLlxuICAgICAgICBpZiAodGhpcy53YXJuIHx8IHR5cGVvZiB0aGlzLndhcm49PVwidW5kZWZpbmVkXCIpe1xuICAgICAgICAgICAgaWYgKCF0aGlzLmpzdCAmJiAhdGhpcy50ZW1wbGF0ZVN0cmluZykgY29uc29sZS53YXJuKFwiWW91IHByb2JhYmx5IG5lZWQgYSB0ZW1wbGF0ZVwiKTtcbiAgICAgICAgICAgIGlmICghdGhpcy5kZWZhdWx0cykgY29uc29sZS53YXJuKFwiWW91IHByb2JhYmx5IG5lZWQgc29tZSBkZWZhdWx0cyBmb3IgeW91ciB2aWV3XCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy9Db252ZXJ0IHRlbXBsYXRlU3RyaW5nIHRvIGEgamF2YXNjcmlwdCB0ZW1wbGF0ZVxuICAgICAgICBpZiAoIXRoaXMuanN0KSB7XG4gICAgICAgICAgICB0aGlzLmpzdCA9IF8udGVtcGxhdGUodGhpcy50ZW1wbGF0ZVN0cmluZyB8fCBcIlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vZXh0ZW5kIG9ubHkgdmFsaWQgb3B0aW9uc1xuICAgICAgICBfLmV4dGVuZCh0aGlzLCBfLnBpY2sob3B0aW9ucywgYmFja2JvbmVWaWV3T3B0aW9ucy5jb25jYXQoYWRkaXRpb25hbFZpZXdPcHRpb25zKSkpO1xuXG4gICAgICAgIFxuXG4gICAgICAgIF8uZWFjaCh0aGlzLmRlZmF1bHRzLCBmdW5jdGlvbiAoZGVmKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGRlZikpIGNvbnNvbGUud2FybihcIkRlZmF1bHRzIHNob3VsZCB1c3VhbGx5IGJlIHByaW1pdGl2ZSB2YWx1ZXNcIik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vZGF0YSBpcyBwYXNzZWQgaW4gb24gc3Vidmlld3NcbiAgICAgICAgLy8gY29tZXMgZnJvbSB0aGlzLnZpZXcudmlld01vZGVsLmdldCh0aGlzLnZhbCk7LCBcbiAgICAgICAgLy9zbyBpZiB0aGUgZGlyZWN0aXZlIGlzIG5tLXN1YnZpZXc9XCJNZW51XCIsIHRoZW4gdGhpcy5kYXRhIHNob3VsZCBiZS4uLndoYXQ/XG4gICAgICAgIC8vQWhhISBkYXRhIGlzIHRvIG92ZXJyaWRlIGRlZmF1bHQgdmFsdWVzIGZvciBzdWJ2aWV3cyBiZWluZyBwYXJ0IG9mIGEgcGFyZW50IHZpZXcuIFxuICAgICAgICAvL0J1dCBpdCBpcyBub3QgbWVhbnQgdG8gb3ZlcnJpZGUgdGVtcGxhdGVWYWx1ZXMgSSBkb24ndCB0aGluay5cbiAgICAgICAgdGhpcy5kZWZhdWx0c092ZXJyaWRlID0gb3B0aW9ucyAmJiBvcHRpb25zLmRlZmF1bHRzT3ZlcnJpZGU7XG5cbiAgICAgICAgXG4gICAgICAgIFxuXG4gICAgICAgIHZhciBhdHRycyA9IF8uZXh0ZW5kKF8uY2xvbmUodGhpcy5kZWZhdWx0cyksIG9wdGlvbnMgJiYgb3B0aW9ucy5kZWZhdWx0c092ZXJyaWRlIHx8IHt9KTtcbiAgICAgICAgdGhpcy52aWV3TW9kZWwgPSBuZXcgRmFqaXRhLlZpZXdNb2RlbChhdHRycyk7XG5cbiAgICAgICAgLy9JIHdhbnQgdG8gdXNlIHRoaXMuc2V0IGhlcmUgYnV0IGNhbid0IGdldCBpdCB3b3JraW5nIHdpdGhvdXQgcmV3cml0aW5nIG1vZGVsLnNldCB0byBzdXBwb3J0IHR3byBhcmd1bWVudHNcbiAgICAgICAgXG5cbiAgICAgICAgLy9Gb3IgZWFjaCBzdWJWaWV3LCBzZXQgdGhlIHZpZXdNb2RlbCB0byBhIGNvbGxlY3Rpb24gb2Ygdmlld3MgKGlmIGl0IGlzIGFuIGFycmF5KSBvciBhIHZpZXcuXG4gICAgICAgIC8vSXQgc2VuZHMgaW4gZGVmYXVsdE92ZXJyaWRlIGFuZCB0aGlzJ3MgbW9kZWwgYXMgYSBtb2RlbC5cblxuICAgICAgICAvL0FjdHVhbGx5IHRoYXQncyBhIGNvbmZ1c2luZyBBUEkuIFRoZSBxdWVzdGlvbiBpcy4uLnNob3VsZCBjaGlsZFZpZXdJbXBvcnRzIGJlIGEgdGhpbmcgb3Igc2hvdWxkIGl0IGFsbCBiZSBjYWxsZWQgc3ViVmlld0ltcG9ydHM/XG5cbiAgICAgICAgaWYgKHRoaXMuc3ViVmlld0ltcG9ydHMpe1xuICAgICAgICAgICAgZm9yKHZhciBwcm9wIGluIHRoaXMuc3ViVmlld0ltcG9ydHMpe1xuICAgICAgICAgICAgICAgIC8vdGhpcy52aWV3TW9kZWwuc2V0KHByb3AsXy5leHRlbmQoe30sdGhpcy5zdWJWaWV3SW1wb3J0c1twcm9wXS5wcm90b3R5cGUuZGVmYXVsdHMsYXR0cnNbcHJvcF0pKVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRlZmF1bHRzW3Byb3BdIGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgICAgICAgICAgICAgICAgdmFyIHN1YnZpZXcgPSBuZXcgQmFja2JvbmUuQ29sbGVjdGlvbihhdHRyc1twcm9wXS5tYXAoKG9iaixpKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHZpZXcgPSBuZXcgdGhpcy5zdWJWaWV3SW1wb3J0c1twcm9wXSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6dGhpcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNbcHJvcF1baV1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHt2aWV3OnZpZXd9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICB2YXIgc3VidmlldyA9IG5ldyB0aGlzLnN1YlZpZXdJbXBvcnRzW3Byb3BdKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGVsOnRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNbcHJvcF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAvL25ld1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dGhpcy50ZW1wbGF0ZVZhbHVlcyAmJiB0aGlzLnRlbXBsYXRlVmFsdWVzW3Byb3BdXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdWJ2aWV3LnBhcmVudCA9IHRoaXM7XG4gICAgICAgICAgICAgICAgdGhpcy52aWV3TW9kZWwuc2V0KHByb3Asc3Vidmlldyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuXG4gICAgICAgIC8vdGVtcGxhdGVWYWx1ZXMgY29udGFpbiB0ZW1wbGF0ZVZhbHVlcyBvZiB2aWV3IHZhcmlhYmxlcyB0byBtb2RlbCB2YXJpYWJsZXMuXG4gICAgICAgIC8vc3RyaW5ncyBhcmUgcmVmZXJlbmNlcyB0byBtb2RlbCB2YXJpYWJsZXMuIEZ1bmN0aW9ucyBhcmUgZm9yIHdoZW4gYSB2aWV3IHZhcmlhYmxlIGRvZXNcbiAgICAgICAgLy9ub3QgbWF0Y2ggcGVyZmVjdGx5IHdpdGggYSBtb2RlbCB2YXJpYWJsZS4gVGhlc2UgYXJlIHVwZGF0ZWQgZWFjaCB0aW1lIHRoZSBtb2RlbCBjaGFuZ2VzLlxuICAgICAgICBcblxuICAgICAgICAvL1Byb2JsZW06IGlmIHlvdSB1cGRhdGUgdGhlIG1vZGVsIGl0IHVwZGF0ZXMgZm9yIGV2ZXJ5IHN1YnZpZXcgKG5vdCBlZmZpY2llbnQpLlxuICAgICAgICAvL0FuZCBpdCBkb2VzIG5vdCB1cGRhdGUgZm9yIHN1Ym1vZGVscy4gUGVyaGFwcyB0aGVyZSBhcmUgbWFueSBkaWZmZXJlbnQgc29sdXRpb25zIGZvciB0aGlzLlxuICAgICAgICAvL1lvdSBjYW4gaGF2ZSBlYWNoIHN1Ym1vZGVsIHRyaWdnZXIgY2hhbmdlIGV2ZW50LlxuXG4gICAgICAgIC8vV2hlbmV2ZXIgdGhlIG1vZGVsIGNoYW5nZXMsIHVwZGF0ZSB0aGUgdmlld01vZGVsIGJ5IG1hcHBpbmcgcHJvcGVydGllcyBvZiB0aGUgbW9kZWwgdG8gcHJvcGVydGllcyBvZiB0aGUgdmlldyAoYXNzaWduZWQgaW4gdGVtcGxhdGVWYWx1ZXMpXG4gICAgICAgIC8vQWxzbywgdGhlIGF0dHJpYnV0ZXMgY2hhbmdlLiBUaGlzIGNhbiBiZSBkb25lIG1vcmUgZWxlZ2FudGx5XG4gICAgICAgIGlmICh0aGlzLm1vZGVsKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlXCIsIHRoaXMudXBkYXRlVmlld01vZGVsKTtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2VcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldEF0dHJpYnV0ZXMoXy5leHRlbmQoe30sIF8ucmVzdWx0KHRoaXMsICdhdHRyaWJ1dGVzJykpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpZXdNb2RlbCgpO1xuXG4gICAgICAgICAgICBfLmVhY2godGhpcy50ZW1wbGF0ZVZhbHVlcyxmdW5jdGlvbih2YWwsa2V5KXtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbD09PVwib2JqZWN0XCIpe1xuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlld01vZGVsLnNldChrZXksbmV3IHRoaXMuc3ViVmlld0ltcG9ydHNba2V5XSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlbDp0aGlzLm1vZGVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dmFsXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB9XG5cbiAgICAgICAgLy9TaG91bGQgdGhlIHZpZXdNb2RlbCBjb250YWluIHRoZSBzdWJ2aWV3cyBpbnN0ZWFkIG9mIGRpcmVjdGl2ZXM/IFxuICAgICAgICAvL1dlIGhhdmUgc3ViVmlld0ltcG9ydHMgaGF2ZSB0aGUgY29uc3RydWN0b3IsIFxuICAgICAgICAvL1RoZSBkZWZhdWx0cyBjb21lIGZyb20gYSBzdWJoYXNoIGluIGRlZmF1bHRzLCBhbmQgdGVtcGxhdGVWYXJzIGNvbWUgZnJvbSB0ZW1wbGF0ZVZhcnMuXG5cblxuICAgICAgICB2YXIgYXR0cnMgPSB0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzO1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXMpO1xuICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJkZWZpbml0aW9uc1wiICYmICF0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzW2tleV0pIHtcbiAgICAgICAgICAgICAgICAvL3Byb2JsZW0gaXMgdGhhdCBwcm9wTWFwIChzZWVtcyB0byBiZSB0ZW1wbGF0ZVZhbHVlcyB3aXRoIGZ1bmN0aW9ucyBmaWx0ZXJlZCBvdXQpIGlzIFxuICAgICAgICAgICAgICAgIC8ve2RlZmluaXRpb25zOlwiZGVmaW5pdGlvbnNcIn0uIENvbWVzIGZyb20gYXJ0aWNsZV9hcnRpY2xlLmpzXG4gICAgICAgICAgICAgICAgZGVidWdnZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5fZW5zdXJlRWxlbWVudCgpO1xuICAgICAgICB0aGlzLmJ1aWxkSW5uZXJIVE1MKCk7XG5cbiAgICAgICAgdGhpcy5fc3ViVmlld0VsZW1lbnRzID0gW107XG4gICAgICAgIHRoaXMuaW5pdERpcmVjdGl2ZXMoKTsgLy9pbml0IHNpbXBsZSBkaXJlY3RpdmVzLi4udGhlIG9uZXMgdGhhdCBqdXN0IG1hbmlwdWxhdGUgYW4gZWxlbWVudFxuXG4gICAgICAgIHRoaXMuX3BhcnNlVGV4dE5vZGVzKCk7XG5cblxuICAgICAgICAvL21hcCByZXF1aXJlcyBhIFwiOlwiLiBTaG91bGQgYmUgdGVzdCBhZ2FpbnN0IHRoZSB2YWx1ZSB0aG91Z2gsIG5vdCB3aGV0aGVyIHRoZXJlIGlzIGEgY29sb24uXG4gICAgICAgIFxuICAgICAgICAvL0JlZm9yZSwgc3ViVmlld3Mgd2VyZSBkaXJlY3RpdmVzIGFuZCBhY2Nlc3NpbmcgYSBzdWJ2aWV3IG1lYW50IGFjY2Vzc2luZyB0aHJvdWdoIHRoaXMuZGlyZWN0aXZlLlxuICAgICAgICAvL0J1dCBub3cgeW91IHNpbXBseSB1c2Ugdmlldy5nZXQoc3ViVmlldykgdG8gZ2V0IHRoZSBhY3R1YWwgc3ViVmlldy5cblxuICAgICAgICAvL1RoZSBvbmx5IHRoaW5nIHlvdSBoYXZlIHRvIGRvIGhlcmUgaXMgbW92ZSB0aGUgY29kZSBmcm9tIHRoZSBzcGVyYXRlIHN1YlZpZXcgZGlyZWN0aXZlIHRvIGhlcmUuXG4gICAgICAgIC8vTWF5YmUgYWRkIGEgcGFyZW50VmlldyByZWZlcmVuY2UgdG8gdGhlIHN1YlZpZXcsIChpZiBkb2VzIG5vdCBleGlzdCBhbHJlYWR5KS5cbiAgICAgICAgXG4gICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uKHN1YlZpZXdFbGVtZW50KXtcbiAgICAgICAgICAgIHZhciBwcm9wcyA9IHN1YlZpZXdFbGVtZW50Lm1hdGNoLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHByb3BzKVxuICAgICAgICAgICAgdmFyIHN1YlZpZXdDb25zdHJ1Y3RvciA9IHRoaXMuc3ViVmlld0ltcG9ydHNbcHJvcHNbMF1dO1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmdldChwcm9wc1sxXSk7XG4gICAgICAgICAgICBpZiAoY29udGV4dCBpbnN0YW5jZW9mIEJhY2tib25lLkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uT2ZWaWV3cyA9IHRoaXMuZ2V0KHByb3BzWzBdKTtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uT2ZWaWV3cy5lYWNoKGZ1bmN0aW9uKG1vZGVsLGkpe1xuICAgICAgICAgICAgICAgICAgICBpZiAoaT09MCkgJChzdWJWaWV3RWxlbWVudCkucmVwbGFjZVdpdGgobW9kZWwuZ2V0KFwidmlld1wiKS5lbClcbiAgICAgICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoY29sbGVjdGlvbk9mVmlld3MuYXQoaS0xKS5nZXQoXCJ2aWV3XCIpLmVsKS5hZnRlcihtb2RlbC5nZXQoXCJ2aWV3XCIpLmVsKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgJChzdWJWaWV3RWxlbWVudCkucmVwbGFjZVdpdGgodGhpcy5nZXQocHJvcHNbMF0pLmVsKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIC8qXG4gICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uKHN1YlZpZXdFbGVtZW50KXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gc3ViVmlld0VsZW1lbnQubWF0Y2guc3BsaXQoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoPT0xKXtcblxuXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmRpcmVjdGl2ZVtcInN1YnZpZXdcIl0pIHRoaXMuZGlyZWN0aXZlW1wic3Vidmlld1wiXSA9IFtdO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlyZWN0aXZlW1wic3Vidmlld1wiXS5wdXNoKG5ldyBEaXJlY3RpdmVSZWdpc3RyeVtcIlN1YnZpZXdcIl0oe1xuICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgIGVsOnN1YlZpZXdFbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICB2YWw6c3ViVmlld0VsZW1lbnQubWF0Y2hcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coc3ViVmlld0VsZW1lbnQubWF0Y2gpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5kaXJlY3RpdmVbXCJtYXBcIl0pIHRoaXMuZGlyZWN0aXZlW1wibWFwXCJdID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5kaXJlY3RpdmVbXCJtYXBcIl0ucHVzaChuZXcgRGlyZWN0aXZlUmVnaXN0cnlbXCJNYXBcIl0oe1xuICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgIGVsOnN1YlZpZXdFbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICB2YWw6c3ViVmlld0VsZW1lbnQubWF0Y2hcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgKi9cblxuXG4gICAgICAgIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcblxuICAgICAgICB0aGlzLmNoaWxkTm9kZXMgPSBbXS5zbGljZS5jYWxsKHRoaXMuZWwuY2hpbGROb2RlcywgMCk7XG5cbiAgICAgICAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSxcbiAgICBcbiAgICBpbml0aWFsaXplOmZ1bmN0aW9uKG9wdGlvbnMpe1xuICAgICAgICAvL2F0dGFjaCBvcHRpb25zIHRvIHZpZXcgKG1vZGVsLCBwcm9wTWFwLCBzdWJWaWV3cywgZXZlbnRzKVxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgXy5leHRlbmQodGhpcyxvcHRpb25zKTtcbiAgICB9LFxuICAgIGdldE1vZGVsQXR0cjpmdW5jdGlvbihhdHRyKXtcbiAgICAgICAgLy9xdWlja2x5IGdyYWIgYSBtb2RlbHMgYXR0cmlidXRlIGJ5IGEgdmlldyB2YXJpYWJsZS4gVXNlZnVsIGluIGNsYXNzbmFtZSBmdW5jdGlvbi5cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLnRlbXBsYXRlVmFsdWVzW2F0dHJdID09XCJzdHJpbmdcIikgcmV0dXJuIHRoaXMubW9kZWwuZ2V0KHRoaXMudGVtcGxhdGVWYWx1ZXNbYXR0cl0pO1xuICAgICAgICBlbHNlIHJldHVybiB0aGlzLnRlbXBsYXRlVmFsdWVzW2F0dHJdLmNhbGwodGhpcylcbiAgICB9LFxuICAgIHVwZGF0ZVZpZXdNb2RlbDpmdW5jdGlvbigpe1xuXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgdGhpcy52aWV3TW9kZWwuc2V0KF8ubWFwT2JqZWN0KHRoaXMudGVtcGxhdGVWYWx1ZXMsZnVuY3Rpb24obW9kZWxWYXIpe1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtb2RlbFZhcj09XCJzdHJpbmdcIikgcmV0dXJuIHRoaXMubW9kZWwuZ2V0KG1vZGVsVmFyKTtcbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBtb2RlbFZhcj09XCJmdW5jdGlvblwiKSByZXR1cm4gbW9kZWxWYXIuY2FsbCh0aGlzKVxuICAgICAgICB9LmJpbmQodGhpcykpKTtcblxuICAgICAgICBcblxuICAgICAgICBcbiAgICAgICAgXG4gICAgXG4gICAgfSxcbiAgICBidWlsZElubmVySFRNTDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwpIHRoaXMuJGVsLmh0bWwodGhpcy5yZW5kZXJlZFRlbXBsYXRlKCkpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBkdW1teWRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgICAgICBkdW1teWRpdi5pbm5lckhUTUwgPSB0aGlzLnJlbmRlcmVkVGVtcGxhdGUoKTtcbiAgICAgICAgICAgIHdoaWxlKGR1bW15ZGl2LmNoaWxkTm9kZXMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICB0aGlzLmVsLmFwcGVuZENoaWxkKGR1bW15ZGl2LmNoaWxkTm9kZXNbMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9tYXliZSBsZXNzIGhhY2tpc2ggc29sdXRpb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjUyMTQxMTMvMTc2MzIxN1xuICAgICAgICB9XG4gICAgfSxcbiAgICBfcGFyc2VUZXh0Tm9kZXM6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy9UaGlzIGZ1bmN0aW9uIGdvZXMgdGhyb3VnaCBlYWNoIHRleHQgbm9kZSBpbiB0aGUgZWxlbWVudCBlLmc6ICh0ZXh0Tm9kZTxkaXY+dGV4dE5vZGU8L2Rpdj50ZXh0Tm9kZSksIGFuZCBzcGxpdHNcbiAgICAgICAgLy90aGUgdGV4dE5vZGVzIHNvIHRoYXQge3tzdWJWaWV3TmFtZX19IGlzIGl0cyBvd24gdGV4dE5vZGUuIFRoZW4gaXQgYWRkcyBhbGwgdGV4dE5vZGVzIG1hdGNoaW5nIHt7c3ViVmlld05hbWV9fSB0b1xuICAgICAgICAvL3RoaXMuX3N1YlZpZXdFbGVtZW50c1xuXG5cbiAgICAgICAgIC8vSW5pdCBkaXJlY3RpdmVzIGludm9sdmluZyB7e319XG5cbiAgICAgICAgLy9HZXQgYWxsIG9mIHRoZSB0ZXh0IG5vZGVzIGluIHRoZSBkb2N1bWVudC4gZS5nOiAodGV4dE5vZGU8ZGl2PnRleHROb2RlPC9kaXY+dGV4dE5vZGUpXG5cbiAgICAgICAgZ2V0QWxsVGV4dE5vZGVzKHRoaXMuZWwpLmZvckVhY2goZnVuY3Rpb24oZnVsbFRleHROb2RlKXtcbiAgICAgICAgICAgIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjEzMTE2NzAvMTc2MzIxNyB0ZXh0Q29udGVudCBzZWVtcyByaWdodFxuXG4gICAgICAgICAgICB2YXIgcmUgPSAvXFx7XFx7KC4rPylcXH1cXH0vZzsgLy9NYXRjaCB7e3N1YlZpZXdOYW1lfX1cbiAgICAgICAgICAgIHZhciBtYXRjaDtcbiAgICAgICAgICAgIFxuXG4gICAgICAgICAgICB2YXIgbWF0Y2hlcyA9IFtdO1xuICAgICAgICAgICAgd2hpbGUgKChtYXRjaCA9IHJlLmV4ZWMoZnVsbFRleHROb2RlLnRleHRDb250ZW50KSkgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIG1hdGNoZXMucHVzaChtYXRjaClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vRm9yIGVhY2ggdGV4dCBub2RlLCBnZXQgdGhlIGFycmF5IG9mIG1hdGNoZXMuIFxuICAgICAgICAgICAgLy9BIG1hdGNoIGlzIGFuIGFycmF5IGl0c2VsZiwgd2l0aCBtYXRjaFswXSBiZWluZyB0aGUgbWF0Y2ggYW5kIG1hdGNoWzFdIGJlaW5nIHRoZSBjYXB0dXJlZCBwYXJ0XG4gICAgICAgICAgICAvL0FkZGl0aW9uYWxseSBpdCBoYXMgdGhlIGluZGV4IGFuZCB0aGUgaW5wdXQgYXMgcHJvcGVydGllcy5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGN1cnJlbnRUZXh0Tm9kZSA9IGZ1bGxUZXh0Tm9kZTtcbiAgICAgICAgICAgIHZhciBjdXJyZW50U3RyaW5nID0gZnVsbFRleHROb2RlLnRleHRDb250ZW50O1xuICAgICAgICAgICAgdmFyIHByZXZOb2Rlc0xlbmd0aCA9IDA7XG5cbiAgICAgICAgICAgIC8vRm9yIGVhY2ggbWF0Y2gsIHNwbGl0IHRoZSB0ZXh0IG5vZGUgaW50byBtdWx0aXBsZSB0ZXh0IG5vZGVzIChpbiBjYXNlIHRoZXJlIGFyZSBtdWx0aXBsZSBzdWJWaWV3cyBpbiBhIHRleHROb2RlKS5cbiAgICAgICAgICAgIC8vVGhlbiwgYWRkIGVhY2ggdGV4dE5vZGUgb2Yge3tzdWJWaWV3fX0gdG8gdGhpcy5fc3ViVmlld0VsZW1lbnRzLlxuICAgICAgICAgICAgbWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uKG1hdGNoKXtcbiAgICAgICAgICAgICAgICB2YXIgdmFyTm9kZSA9IGN1cnJlbnRUZXh0Tm9kZS5zcGxpdFRleHQobWF0Y2guaW5kZXggLSBwcmV2Tm9kZXNMZW5ndGgpO1xuICAgICAgICAgICAgICAgIHZhciBlbnRpcmVNYXRjaCA9IG1hdGNoWzBdXG4gICAgICAgICAgICAgICAgdmFyTm9kZS5tYXRjaCA9IG1hdGNoWzFdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5wdXNoKHZhck5vZGUpO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRUZXh0Tm9kZSA9IHZhck5vZGUuc3BsaXRUZXh0KGVudGlyZU1hdGNoLmxlbmd0aClcbiAgICAgICAgICAgICAgICBjdXJyZW50U3RyaW5nID0gY3VycmVudFRleHROb2RlLnRleHRDb250ZW50O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHByZXZOb2Rlc0xlbmd0aD1tYXRjaC5pbmRleCArIGVudGlyZU1hdGNoLmxlbmd0aDsvL05vdGU6IFRoaXMgd29ya3MgYWNjaWRlbnRhbGx5LiBNaWdodCBiZSB3cm9uZy5cbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgIFxuXG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgfSxcbiAgICBpbml0RGlyZWN0aXZlczpmdW5jdGlvbigpe1xuXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB0aGlzLmRpcmVjdGl2ZSA9IHt9O1xuXG4gICAgICAgXG5cblxuICAgICAgICBmb3IgKHZhciBkaXJlY3RpdmVOYW1lIGluIERpcmVjdGl2ZVJlZ2lzdHJ5KXtcbiAgICAgICAgICAgIHZhciBfX3Byb3RvID0gRGlyZWN0aXZlUmVnaXN0cnlbZGlyZWN0aXZlTmFtZV0ucHJvdG90eXBlXG4gICAgICAgICAgICBpZiAoX19wcm90byBpbnN0YW5jZW9mIERpcmVjdGl2ZSl7IC8vYmVjYXVzZSBmb3JlYWNoIHdpbGwgZ2V0IG1vcmUgdGhhbiBqdXN0IG90aGVyIGRpcmVjdGl2ZXNcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IF9fcHJvdG8ubmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgZWxlbWVudHMgPSAodGhpcy4kZWwpPyQubWFrZUFycmF5KHRoaXMuJGVsLmZpbmQoXCJbbm0tXCIrbmFtZStcIl1cIikpOiQubWFrZUFycmF5KCQodGhpcy5lbC5xdWVyeVNlbGVjdG9yQWxsKFwiW25tLVwiK25hbWUrXCJdXCIpKSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlyZWN0aXZlW25hbWVdID0gZWxlbWVudHMubWFwKGZ1bmN0aW9uKGVsZW1lbnQsaSxlbGVtZW50cyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL29uIHRoZSBzZWNvbmQgZ28tYXJvdW5kIGZvciBubS1tYXAsIGRpcmVjdGl2ZU5hbWUgc29tZWhvdyBpcyBjYWxsZWQgXCJTdWJWaWV3XCJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGlyZWN0aXZlUmVnaXN0cnlbZGlyZWN0aXZlTmFtZV0oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc6dGhpcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbDplbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbDplbGVtZW50LmdldEF0dHJpYnV0ZShcIm5tLVwiK25hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTsgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9ICAgXG5cbiAgICAgICAgXG5cbiAgICAgICBcbiAgICAgXG5cbiAgICAgICBcblxuXG4gICAgICAgIFxuICAgIH0sXG4gICAgcmVuZGVyZWRUZW1wbGF0ZTpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy5qc3QpIHtcbiAgICAgICAgICAgIHdpbmRvdy5fID0gXztcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmpzdCh0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHJldHVybiBfLnRlbXBsYXRlKHRoaXMudGVtcGxhdGVTdHJpbmcpKHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXMpXG4gICAgfSxcbiAgICBkZWxlZ2F0ZUV2ZW50czogZnVuY3Rpb24oZXZlbnRzKSB7Ly9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xMjE5MzA2OS8xNzYzMjE3XG4gICAgICAgIHZhciBkZWxlZ2F0ZUV2ZW50U3BsaXR0ZXIgPSAvXihcXFMrKVxccyooLiopJC87XG4gICAgICAgIGV2ZW50cyB8fCAoZXZlbnRzID0gXy5yZXN1bHQodGhpcywgJ2V2ZW50cycpKTsgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICBpZiAoIWV2ZW50cykgcmV0dXJuIHRoaXM7XG4gICAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gZXZlbnRzKSB7XG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gZXZlbnRzW2tleV07XG4gICAgICAgICAgICBpZiAoIV8uaXNGdW5jdGlvbihtZXRob2QpKSBtZXRob2QgPSB0aGlzW2V2ZW50c1trZXldXTtcbiAgICAgICAgICAgIGlmICghbWV0aG9kKSB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBcIicgKyBldmVudHNba2V5XSArICdcIiBkb2VzIG5vdCBleGlzdCcpO1xuICAgICAgICAgICAgdmFyIG1hdGNoID0ga2V5Lm1hdGNoKGRlbGVnYXRlRXZlbnRTcGxpdHRlcik7XG4gICAgICAgICAgICB2YXIgZXZlbnRUeXBlcyA9IG1hdGNoWzFdLnNwbGl0KCcsJyksIHNlbGVjdG9yID0gbWF0Y2hbMl07XG4gICAgICAgICAgICBtZXRob2QgPSBfLmJpbmQobWV0aG9kLCB0aGlzKTtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIF8oZXZlbnRUeXBlcykuZWFjaChmdW5jdGlvbihldmVudE5hbWUpIHtcbiAgICAgICAgICAgICAgICBldmVudE5hbWUgKz0gJy5kZWxlZ2F0ZUV2ZW50cycgKyBzZWxmLmNpZDtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgc2VsZi4kZWwuYmluZChldmVudE5hbWUsIG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kZWwuZGVsZWdhdGUoc2VsZWN0b3IsIGV2ZW50TmFtZSwgbWV0aG9kKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIFxuICAgICAgIFxuICAgIH0sXG5cblxuXG5cbiAgICB0YWdOYW1lOnVuZGVmaW5lZCwvL2Rvbid0IHdhbnQgYSB0YWdOYW1lIHRvIGJlIGRpdiBieSBkZWZhdWx0LiBSYXRoZXIsIG1ha2UgaXQgYSBkb2N1bWVudGZyYWdtZW50J1xuICAgIHN1YlZpZXdJbXBvcnRzOnt9LFxuICAgIF9lbnN1cmVFbGVtZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vT3ZlcnJpZGluZyB0aGlzIHRvIHN1cHBvcnQgZG9jdW1lbnQgZnJhZ21lbnRzXG4gICAgICAgIGlmICghdGhpcy5lbCkge1xuICAgICAgICAgICAgaWYodGhpcy5hdHRyaWJ1dGVzIHx8IHRoaXMuaWQgfHwgdGhpcy5jbGFzc05hbWUgfHwgdGhpcy50YWdOYW1lKXsvL2lmIHlvdSBoYXZlIGFueSBvZiB0aGVzZSBiYWNrYm9uZSBwcm9wZXJ0aWVzLCBkbyBiYWNrYm9uZSBiZWhhdmlvclxuICAgICAgICAgICAgICAgICAgICB2YXIgYXR0cnMgPSBfLmV4dGVuZCh7fSwgXy5yZXN1bHQodGhpcywgJ2F0dHJpYnV0ZXMnKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlkKSBhdHRycy5pZCA9IF8ucmVzdWx0KHRoaXMsICdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jbGFzc05hbWUpIGF0dHJzWydjbGFzcyddID0gXy5yZXN1bHQodGhpcywgJ2NsYXNzTmFtZScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEVsZW1lbnQodGhpcy5fY3JlYXRlRWxlbWVudChfLnJlc3VsdCh0aGlzLCAndGFnTmFtZScpIHx8ICdkaXYnKSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3NldEF0dHJpYnV0ZXMoYXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXsvL2hvd2V2ZXIsIGRlZmF1bHQgdG8gdGhpcy5lbCBiZWluZyBhIGRvY3VtZW50ZnJhZ21lbnQgKG1ha2VzIHRoaXMuZWwgbmFtZWQgaW1wcm9wZXJseSBidXQgd2hhdGV2ZXIpXG4gICAgICAgICAgICAgICAgdGhpcy5lbCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChfLnJlc3VsdCh0aGlzLCAnZWwnKSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHNldDpmdW5jdGlvbihvYmope1xuXG4gICAgICAgIHRoaXMudmlld01vZGVsLnNldChvYmopO1xuICAgIH0sXG4gICAgZ2V0OmZ1bmN0aW9uKHByb3Ape1xuICAgICAgICByZXR1cm4gdGhpcy52aWV3TW9kZWwuZ2V0KHByb3ApXG4gICAgfVxufSk7XG4iLCIvL1NhbWUgbW9kZWwsIGNvbGxlY3Rpb24gaW4gc2FtZSBmaWxlIGZvciBub3cgYmVjYXVzZSB0aGVzZSBtb2R1bGVzIHJlbHkgb24gZWFjaCBvdGhlci5cblxuLyppbXBvcnQgXyBmcm9tIFwidW5kZXJzY29yZVwiOyovXG4vKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuaW1wb3J0IE1vZGVsIGZyb20gXCIuL01vZGVsXCI7XG5pbXBvcnQgVmlld01vZGVsIGZyb20gXCIuL1ZpZXdNb2RlbFwiO1xuaW1wb3J0IENvbGxlY3Rpb24gZnJvbSBcIi4vQ29sbGVjdGlvblwiO1xuaW1wb3J0IFZpZXcgZnJvbSBcIi4vVmlld1wiO1xuaW1wb3J0IERpcmVjdGl2ZVJlZ2lzdHJ5IGZyb20gXCIuL2RpcmVjdGl2ZS9kaXJlY3RpdmVSZWdpc3RyeVwiO1xuLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cblxudmFyIEZhaml0YSA9IHtNb2RlbCwgVmlld01vZGVsLCBDb2xsZWN0aW9uLCBWaWV3LCBEaXJlY3RpdmVSZWdpc3RyeX07XG5GYWppdGFbXCLwn4yuXCJdID0gXCIwLjAuMFwiO1xuXG5pZiAodHlwZW9mIHdpbmRvdyE9PVwidW5kZWZpbmVkXCIpIHdpbmRvdy5GYWppdGEgPSBGYWppdGE7XG5pZiAodHlwZW9mIGdsb2JhbCE9PVwidW5kZWZpbmVkXCIpIGdsb2JhbC5GYWppdGEgPSBGYWppdGE7Il0sIm5hbWVzIjpbIkJhY2tib25lIiwiTW9kZWwiLCJleHRlbmQiLCJvcHRpb25zIiwiVVJMU2VhcmNoUGFyYW1zIiwicXVlcnkiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlYXJjaCIsInN0cnVjdHVyZSIsInBhcmVudE1vZGVscyIsImluaXQiLCJhdHRyIiwiXyIsImlzU3RyaW5nIiwicHJvcHMiLCJzcGxpdCIsImxlbmd0aCIsIm1vZGVsIiwic2xpY2UiLCJmb3JFYWNoIiwicHJvcCIsImdldCIsInByb3RvdHlwZSIsImFwcGx5IiwiYXJndW1lbnRzIiwiaXNVbmRlZmluZWQiLCJrZXkiLCJ2YWwxIiwidmFsMiIsInNldCIsInZhbCIsImkiLCJuZXdNb2RlbCIsIkZhaml0YSIsImlzQXJyYXkiLCJDb2xsZWN0aW9uIiwicHVzaCIsImxpc3RlblRvIiwidHJpZ2dlciIsIm9uIiwiVmlldyIsIm5hbWUiLCJjb25zb2xlIiwiZXJyb3IiLCJ2aWV3IiwiY2hpbGRJbml0IiwiYnVpbGQiLCJ1cGRhdGVSZXN1bHQiLCJ2aWV3TW9kZWwiLCJyZW5kZXIiLCJyZXN1bHQiLCJpc0Z1bmN0aW9uIiwiY2FsbCIsIkRpcmVjdGl2ZSIsIiRlbCIsImVsIiwic2V0QXR0cmlidXRlIiwiaW5uZXJIVE1MIiwidmFsdWUiLCJwYXNzIiwiZ2V0QXR0cmlidXRlIiwiJCIsImEiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJjbGFzc0xpc3QiLCJhZGQiLCJ3cmFwcGVyQSIsInBhcmVudE5vZGUiLCJyZXBsYWNlQ2hpbGQiLCJhcHBlbmRDaGlsZCIsInBhcmVudCIsImFyZ3MiLCJzdWJWaWV3TmFtZSIsInN1Yk1vZGVsTmFtZSIsInN1Yk1vZGVsIiwic3ViQ29sbGVjdGlvbiIsIkFic3RyYWN0U3VidmlldyIsInJlbmRlckFkZCIsInJlbmRlclJlc2V0IiwicmVuZGVyUmVtb3ZlIiwicmVuZGVyU29ydCIsIkNoaWxkVmlldyIsImNoaWxkVmlld0ltcG9ydHMiLCJjaGlsZFZpZXdPcHRpb25zIiwiY2hpbGRNYXBwaW5ncyIsInRhZ05hbWUiLCJkZWZhdWx0c092ZXJyaWRlIiwiY2hpbGRWaWV3cyIsIm1hcCIsImNoaWxkTW9kZWwiLCJtb2RlbHMiLCJhdHRyaWJ1dGVzIiwiY2hpbGR2aWV3IiwiYmluZCIsIl9pbml0aWFsaXplQmFja2JvbmVPYmplY3QiLCJfaW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3MiLCJfaW5pdGlhbGl6ZWRlZmF1bHRzT3ZlcnJpZGUiLCJfaW5pdGlhbGl6ZUNoaWxkVmlld3MiLCJyZXBsYWNlV2l0aCIsInN1YlZpZXciLCIkY2hpbGRyZW4iLCJjaGlsZFZpZXciLCJpbmRleCIsImRlbGVnYXRlRXZlbnRzIiwiJHBhcmVudCIsImNoaWxkcmVuIiwiZWFjaCIsImV4aXN0aW5nQ2hpbGRWaWV3IiwiZmlsdGVyIiwibmV3Q2hpbGRWaWV3IiwiZW1wdHkiLCJjaGlsZCIsImFwcGVuZCIsImxhc3QiLCJyZW1vdmUiLCJzcGxpY2UiLCJjb250YWlucyIsImhpZGUiLCJjc3MiLCJib2R5IiwiRXJyb3IiLCJpcyIsIndyYXBwZXIiLCJjaGlsZE5vZGVzIiwidW53cmFwIiwiaW5zZXJ0QmVmb3JlIiwic3ViVmlld0ltcG9ydHMiLCJDaGlsZENvbnN0cnVjdG9yIiwidGVtcGxhdGVWYWx1ZXMiLCJjbGFzc2VzIiwiY2wiLCJwYXJlbnREaXJlY3RpdmUiLCJvcHRpb25zU2VudFRvU3ViVmlldyIsImNvbnRlbnQiLCJyZWdpc3RyeSIsIkRpcmVjdGl2ZUNvbnRlbnQiLCJEaXJlY3RpdmVFbmFibGUiLCJEaXJlY3RpdmVEaXNhYmxlIiwiRGlyZWN0aXZlSHJlZiIsIkRpcmVjdGl2ZU1hcCIsIkRpcmVjdGl2ZU9wdGlvbmFsIiwiRGlyZWN0aXZlT3B0aW9uYWxXcmFwIiwiRGlyZWN0aXZlU3JjIiwiRGlyZWN0aXZlU3VidmlldyIsIkRpcmVjdGl2ZURhdGEiLCJnZXRBbGxUZXh0Tm9kZXMiLCJuIiwid2FsayIsImNyZWF0ZVRyZWVXYWxrZXIiLCJOb2RlRmlsdGVyIiwiU0hPV19URVhUIiwibmV4dE5vZGUiLCJiYWNrYm9uZVZpZXdPcHRpb25zIiwiYWRkaXRpb25hbFZpZXdPcHRpb25zIiwiY29uc3RydWN0b3IiLCJ3YXJuIiwianN0IiwidGVtcGxhdGVTdHJpbmciLCJkZWZhdWx0cyIsInRlbXBsYXRlIiwicGljayIsImNvbmNhdCIsImRlZiIsImF0dHJzIiwiY2xvbmUiLCJWaWV3TW9kZWwiLCJBcnJheSIsInN1YnZpZXciLCJvYmoiLCJ1cGRhdGVWaWV3TW9kZWwiLCJfc2V0QXR0cmlidXRlcyIsImtleXMiLCJPYmplY3QiLCJfZW5zdXJlRWxlbWVudCIsImJ1aWxkSW5uZXJIVE1MIiwiX3N1YlZpZXdFbGVtZW50cyIsImluaXREaXJlY3RpdmVzIiwiX3BhcnNlVGV4dE5vZGVzIiwic3ViVmlld0VsZW1lbnQiLCJtYXRjaCIsImxvZyIsInN1YlZpZXdDb25zdHJ1Y3RvciIsImNvbnRleHQiLCJjb2xsZWN0aW9uT2ZWaWV3cyIsImF0IiwiYWZ0ZXIiLCJpbml0aWFsaXplIiwibWFwT2JqZWN0IiwibW9kZWxWYXIiLCJodG1sIiwicmVuZGVyZWRUZW1wbGF0ZSIsImR1bW15ZGl2IiwiZnVsbFRleHROb2RlIiwicmUiLCJtYXRjaGVzIiwiZXhlYyIsInRleHRDb250ZW50IiwiY3VycmVudFRleHROb2RlIiwiY3VycmVudFN0cmluZyIsInByZXZOb2Rlc0xlbmd0aCIsInZhck5vZGUiLCJzcGxpdFRleHQiLCJlbnRpcmVNYXRjaCIsImRpcmVjdGl2ZSIsImRpcmVjdGl2ZU5hbWUiLCJEaXJlY3RpdmVSZWdpc3RyeSIsIl9fcHJvdG8iLCJlbGVtZW50cyIsIm1ha2VBcnJheSIsImZpbmQiLCJxdWVyeVNlbGVjdG9yQWxsIiwiZWxlbWVudCIsImV2ZW50cyIsImRlbGVnYXRlRXZlbnRTcGxpdHRlciIsInVuZGVsZWdhdGVFdmVudHMiLCJtZXRob2QiLCJldmVudFR5cGVzIiwic2VsZWN0b3IiLCJzZWxmIiwiZXZlbnROYW1lIiwiY2lkIiwiZGVsZWdhdGUiLCJ1bmRlZmluZWQiLCJpZCIsImNsYXNzTmFtZSIsInNldEVsZW1lbnQiLCJfY3JlYXRlRWxlbWVudCIsImNyZWF0ZURvY3VtZW50RnJhZ21lbnQiLCJnbG9iYWwiXSwibWFwcGluZ3MiOiI7OztBQUFBOzs7QUFJQSxZQUFlQSxTQUFTQyxLQUFULENBQWVDLE1BQWYsQ0FBc0I7O2NBRXhCLG9CQUFTQyxPQUFULEVBQWlCO1FBQ3JCLE9BQU9DLGVBQVAsS0FBMkIsV0FBaEMsRUFBNkM7V0FDdENDLEtBQUwsR0FBYSxJQUFJRCxlQUFKLENBQW9CRSxPQUFPQyxRQUFQLENBQWdCQyxNQUFwQyxDQUFiOzs7O1NBTUdDLFNBQUwsR0FBaUIsRUFBakI7O1NBRUtDLFlBQUwsR0FBb0IsRUFBcEI7U0FDS0MsSUFBTDtHQWJpQztRQWU5QixnQkFBVSxFQWZvQjs7T0FpQi9CLGFBQVNDLElBQVQsRUFBYzs7OztRQUlaQyxFQUFFQyxRQUFGLENBQVdGLElBQVgsQ0FBSixFQUFxQjtVQUNmRyxR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
