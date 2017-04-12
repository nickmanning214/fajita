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

        this.viewCollection = new Fajita.Collection(this.defaultsOverride || this.defaults);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFqaXRhLmpzIiwic291cmNlcyI6WyJNb2RlbC5qcyIsIlZpZXdNb2RlbC5qcyIsIkNvbGxlY3Rpb24uanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1jb250ZW50LmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1lbmFibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRpc2FibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWhyZWYuanMiLCJkaXJlY3RpdmUvYWJzdHJhY3Qtc3Vidmlldy5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtbWFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1vcHRpb25hbC5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtb3B0aW9uYWx3cmFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1zcmMuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLXN1YnZpZXcuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRhdGEuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnkuanMiLCJWaWV3LmpzIiwiQmFzZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5cblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgXG4gIGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgaWYgKCB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSBcInVuZGVmaW5lZFwiICl7XG4gICAgICB0aGlzLnF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICB9XG5cbiAgIFxuXG4gICAgLy9uZXdcbiAgICB0aGlzLnN0cnVjdHVyZSA9IHt9O1xuXG4gICAgdGhpcy5wYXJlbnRNb2RlbHMgPSBbXTtcbiAgICB0aGlzLmluaXQoKTtcbiAgfSxcbiAgaW5pdDpmdW5jdGlvbigpe30sXG4gIFxuICBnZXQ6ZnVuY3Rpb24oYXR0cil7XG5cbiAgICAvL1RvZG86IGVycm9yIGNoZWNrIHdoZW4gYXR0ciBoYXMgXCItPlwiIGJ1dCBkb2Vzbid0IHN0YXJ0IHdpdGggLT5cblxuICAgIGlmIChfLmlzU3RyaW5nKGF0dHIpKXtcbiAgICAgIHZhciBwcm9wcyA9IGF0dHIuc3BsaXQoXCItPlwiKTtcbiAgICAgIGlmIChwcm9wcy5sZW5ndGggPiAxKXtcbiAgICAgICAgdmFyIG1vZGVsID0gdGhpcztcbiAgICAgICAgcHJvcHMuc2xpY2UoMSkuZm9yRWFjaChmdW5jdGlvbihwcm9wKXtcbiAgICAgICAgICBpZiAobW9kZWwuc3RydWN0dXJlW3Byb3BdKSBtb2RlbCA9IG1vZGVsLnN0cnVjdHVyZVtwcm9wXTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtb2RlbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGdldCA9IEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5nZXQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuICAgIGlmICghXy5pc1VuZGVmaW5lZChnZXQpKSByZXR1cm4gZ2V0O1xuICAgIFxuXG4gXG4gICBcbiAgIFxuICB9LFxuICB0b2dnbGU6ZnVuY3Rpb24oa2V5LHZhbDEsdmFsMil7XG4gICAgaWYgKHRoaXMuZ2V0KGtleSk9PXZhbDIpe1xuICAgICAgdGhpcy5zZXQoa2V5LHZhbDEpO1xuICAgIH1cbiAgICBlbHNlIHRoaXMuc2V0KGtleSx2YWwyKTtcbiAgfSxcbiAgc2V0OmZ1bmN0aW9uKGF0dHIsIHZhbCwgb3B0aW9ucyl7XG4gICBcbiAgICAvKlxuICAgIGdldCBjb2RlLi4uSSB3YW50IHNldCBjb2RlIHRvIG1pcnJvciBnZXQgY29kZVxuICAgICovXG4gICAgaWYgKF8uaXNTdHJpbmcoYXR0cikpe1xuICAgICAgdmFyIHByb3BzID0gYXR0ci5zcGxpdChcIi0+XCIpO1xuICAgICAgaWYgKHByb3BzLmxlbmd0aCA+IDEpe1xuICAgICAgICB2YXIgbW9kZWwgPSB0aGlzO1xuICAgICAgICBwcm9wcy5zbGljZSgxKS5mb3JFYWNoKGZ1bmN0aW9uKHByb3AsaSxwcm9wcyl7XG4gICAgICAgICAgaWYgKG1vZGVsLnN0cnVjdHVyZVtwcm9wXSkgbW9kZWwgPSBtb2RlbC5zdHJ1Y3R1cmVbcHJvcF07XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3TW9kZWw7XG4gICAgICAgICAgICBpZiAoaSA8IHByb3BzLmxlbmd0aCAtIDEpe1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IG5ldyBGYWppdGEuTW9kZWw7ICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IChfLmlzQXJyYXkodmFsKSk/bmV3IEZhaml0YS5Db2xsZWN0aW9uKHZhbCk6bmV3IEZhaml0YS5Nb2RlbCh2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3TW9kZWwucGFyZW50TW9kZWxzLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgbW9kZWwuc3RydWN0dXJlW3Byb3BdID0gbmV3TW9kZWw7XG4gICAgICAgICAgICBtb2RlbC5saXN0ZW5UbyhuZXdNb2RlbCxcImNoYW5nZSBhZGRcIixmdW5jdGlvbihuZXdNb2RlbCxvcHRpb25zKXtcbiAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8qIFRPRE86IGludmVudCBlbnRpcmUgc3lzdGVtIGZvciB0cmF2ZXJzaW5nIGFuZCBmaXJpbmcgZXZlbnRzLiBQcm9iYWJseSBub3Qgd29ydGggdGhlIGVmZm9ydCBmb3Igbm93LlxuICAgICAgICAgICAgICBPYmplY3Qua2V5cyhtb2RlbC5jaGFuZ2VkQXR0cmlidXRlcygpKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlOlwiK3Byb3ArXCIuXCIra2V5KVxuICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAqL1xuXG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIFxuXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICByZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG4gICAgfVxuXG5cbiAgICAgIFxuICAgICBcbiAgfVxuICAvL05vdGU6IHRoZXJlIGlzIHN0aWxsIG5vIGxpc3RlbmVyIGZvciBhIHN1Ym1vZGVsIG9mIGEgY29sbGVjdGlvbiBjaGFuZ2luZywgdHJpZ2dlcmluZyB0aGUgcGFyZW50LiBJIHRoaW5rIHRoYXQncyB1c2VmdWwuXG59KTsiLCJleHBvcnQgZGVmYXVsdCBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIFxufSkiLCIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgTW9kZWwgZnJvbSBcIi4vTW9kZWxcIjtcblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIG1vZGVsOk1vZGVsLCAvL3Byb2JsZW06IE1vZGVsIHJlbGllcyBvbiBjb2xsZWN0aW9uIGFzIHdlbGwgY2F1c2luZyBlcnJvclxuICAgIGluaXRpYWxpemU6ZnVuY3Rpb24oKXtcbiAgICAgICAgIHRoaXMucGFyZW50TW9kZWxzID0gW107XG4gICAgICAgIC8vdHJpZ2dlciBcInVwZGF0ZVwiIHdoZW4gc3VibW9kZWwgY2hhbmdlc1xuICAgICAgICB0aGlzLm9uKFwiYWRkXCIsZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyhtb2RlbCxcImNoYW5nZVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG59KTsiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuXG5leHBvcnQgZGVmYXVsdCBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG4gICAgbmFtZTpudWxsLFxuICAgIGJ1aWxkOm51bGwsXG4gICAgcmVuZGVyOm51bGwsXG4gICAgaW5pdGlhbGl6ZTpmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgICAgaWYgKCF0aGlzLm5hbWUpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGEgbmFtZSBpbiB0aGUgcHJvdG90eXBlLlwiKTtcbiAgICAgICAgdGhpcy52YWwgPSBvcHRpb25zLnZhbDtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvL3ZpZXcgaXMgdGhlIHZpZXcgdGhhdCBpbXBsZW1lbnRzIHRoaXMgZGlyZWN0aXZlLlxuICAgICAgICBpZiAoIW9wdGlvbnMudmlldykgY29uc29sZS5lcnJvcihcIkVycm9yOiBEaXJlY3RpdmUgcmVxdWlyZXMgYSB2aWV3IHBhc3NlZCBhcyBhbiBvcHRpb24uXCIpO1xuICAgICAgICB0aGlzLnZpZXcgPSBvcHRpb25zLnZpZXc7XG4gICAgICAgIGlmICghdGhpcy5jaGlsZEluaXQpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGNoaWxkSW5pdCBpbiBwcm90b3R5cGUuXCIpO1xuICAgICAgICB0aGlzLmNoaWxkSW5pdCgpO1xuICAgICAgICB0aGlzLmJ1aWxkKCk7XG4gICAgfSxcbiAgICBjaGlsZEluaXQ6ZnVuY3Rpb24oKXtcbiAgICAgICBcbiAgICAgICAgdGhpcy51cGRhdGVSZXN1bHQoKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnZpZXcudmlld01vZGVsLFwiY2hhbmdlOlwiK3RoaXMudmFsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVJlc3VsdCgpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuICAgIHVwZGF0ZVJlc3VsdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgcmVzdWx0ID0gdGhpcy52aWV3LmdldCh0aGlzLnZhbCk7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ocmVzdWx0KSkgdGhpcy5yZXN1bHQgPSByZXN1bHQuY2FsbCh0aGlzLnZpZXcpO1xuICAgICAgICBlbHNlIHRoaXMucmVzdWx0ID0gcmVzdWx0O1xuICAgIH1cbn0pOyIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbi8vTm90ZTogRG9uJ3QgdXNlIC5odG1sKCkgb3IgLmF0dHIoKSBqcXVlcnkuIEl0J3Mgd2VpcmQgd2l0aCBkaWZmZXJlbnQgdHlwZXMuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiY29udGVudFwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLHRoaXMucmVzdWx0KVxuICAgICAgICBlbHNlIHRoaXMuZWwuaW5uZXJIVE1MID0gdGhpcy5yZXN1bHQ7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5idWlsZCgpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHZhciBwYXNzID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikge1xuICAgICAgICAgICAgaWYgKHRoaXMuZWwuZ2V0QXR0cmlidXRlKFwidGl0bGVcIik9PXZhbHVlICsgXCJcIikgcGFzcyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5lbC5pbm5lckhUTUw9PXZhbHVlK1wiXCIpIHBhc3MgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgfVxufSk7IiwiLy9XaHkgZG9lcyB1bmRlcnNjb3JlIHdvcmsgaGVyZT9cblxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcImVuYWJsZVwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsdHJ1ZSk7XG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIixcIlwiKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpIT12YWx1ZTtcbiAgICB9XG59KTtcbiIsIi8vV2h5IGRvZXMgdW5kZXJzY29yZSB3b3JrIGhlcmU/XG5cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJkaXNhYmxlXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpPT12YWx1ZTtcbiAgICB9XG59KTtcbiIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJocmVmXCIsXG4gICBcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSB0aGlzLiRlbC5hdHRyKFwiaHJlZlwiLHRoaXMucmVzdWx0KTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgICAgICAgICAgYS5jbGFzc0xpc3QuYWRkKFwid3JhcHBlci1hXCIpXG4gICAgICAgICAgICBhLnNldEF0dHJpYnV0ZShcImhyZWZcIix0aGlzLnJlc3VsdCk7XG4gICAgICAgICAgICB0aGlzLndyYXBwZXJBID0gYTtcbiAgICAgICAgICAgIHRoaXMuZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQodGhpcy53cmFwcGVyQSx0aGlzLmVsKVxuICAgICAgICAgICAgLy9jYW4ndCBzaW1wbHkgdXNlIHRoaXMuJGVsLndyYXAoYSk7XG4gICAgICAgICAgICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTcwNzMyOC93cmFwLW9uZS1lbGVtZW50LXdpdGgtYW5vdGhlci1yZXRhaW5pbmctcmVmZXJlbmNlLXRvLXdyYXBwZXJcbiAgICAgICAgICAgIHRoaXMud3JhcHBlckEuYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93LndyYXBwZXJBID0gdGhpcy53cmFwcGVyQTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSAkKHRoaXMuZWwpLmF0dHIoXCJocmVmXCIsdGhpcy5yZXN1bHQpXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy53cmFwcGVyQS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIsdGhpcy5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgaWYgKHRoaXMuJGVsLnByb3AoXCJ0YWdOYW1lXCIpPT1cIkFcIikgcmV0dXJuICQodGhpcy5lbCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucGFyZW50KCkucHJvcChcInRhZ05hbWVcIik9PVwiQVwiICYmICQodGhpcy5lbCkucGFyZW50KCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIH1cbiAgICB9XG59KTsiLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiYWJzdHJhY3RzdWJ2aWV3XCIsXG4gICAgX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgYXJncyA9IHRoaXMudmFsLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgdGhpcy5zdWJWaWV3TmFtZSA9IGFyZ3NbMF07XG4gICAgICAgICBpZiAoYXJnc1sxXSl7XG4gICAgICAgICAgICB0aGlzLnN1Yk1vZGVsTmFtZSA9IGFyZ3NbMV07XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSB0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpOyAvL2NoYW5nZWQgZnJvbSBzdWJNb2RlbE5hbWUuXG4gICAgICAgICAgICBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCkgdGhpcy5zdWJNb2RlbCA9IG1vZGVsO1xuICAgICAgICAgICAgZWxzZSBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Db2xsZWN0aW9uKSB0aGlzLnN1YkNvbGxlY3Rpb24gPSBtb2RlbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCksKG1vZGVsIGluc3RhbmNlb2YgQmFja2JvbmUuQ29sbGVjdGlvbiksdGhpcy5zdWJDb2xsZWN0aW9uKVxuICAgICAgICAgICAgLy9kZWJ1Z2dlcjtcbiAgICAgICAgIH1cbiAgICB9LFxuXG5cblxuICAgIF9pbml0aWFsaXplQ2hpbGRWaWV3czpmdW5jdGlvbigpe1xuXG4gICAgfVxufSkiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcbmltcG9ydCBBYnN0cmFjdFN1YnZpZXcgZnJvbSBcIi4vYWJzdHJhY3Qtc3Vidmlld1wiXG5leHBvcnQgZGVmYXVsdCBBYnN0cmFjdFN1YnZpZXcuZXh0ZW5kKHtcbiAgICBuYW1lOlwibWFwXCIsXG4gICAgX2luaXRpYWxpemVDaGlsZFZpZXdzOmZ1bmN0aW9uKCl7XG5cblxuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwiYWRkXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyQWRkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwicmVzZXRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJSZXNldCgpO1xuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwicmVtb3ZlXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyUmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwic29ydFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclNvcnQoKTsgICAgICAgIFxuICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgLy9NYXAgbW9kZWxzIHRvIGNoaWxkVmlldyBpbnN0YW5jZXMgd2l0aCB0aGVpciB0ZW1wbGF0ZVZhbHVlc1xuICAgICAgICB0aGlzLkNoaWxkVmlldyA9IHRoaXMudmlldy5jaGlsZFZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICB0aGlzLmNoaWxkVmlld09wdGlvbnMgPSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp0aGlzLmNoaWxkTWFwcGluZ3MsXG4gICAgICAgICAgICBjb2xsZWN0aW9uOnRoaXMuc3ViQ29sbGVjdGlvbixcbiAgICAgICAgICAgIHRhZ05hbWU6dGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlLnRhZ05hbWUgfHwgXCJzdWJpdGVtXCIsXG4gICAgICAgICAgICBkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNPdmVycmlkZVxuICAgICAgICB9O1xuXG5cbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzID0gdGhpcy5zdWJDb2xsZWN0aW9uLm1hcChmdW5jdGlvbihjaGlsZE1vZGVsLGkpe1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgY2hpbGRWaWV3T3B0aW9ucyA9IF8uZXh0ZW5kKHt9LHRoaXMuY2hpbGRWaWV3T3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgbW9kZWw6Y2hpbGRNb2RlbCxcbiAgICAgICAgICAgICAgICBpbmRleDppLFxuICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgZGVmYXVsdHNPdmVycmlkZTp0aGlzLmRlZmF1bHRzT3ZlcnJpZGUgJiYgdGhpcy5kZWZhdWx0c092ZXJyaWRlLm1vZGVsc1tpXSAmJiB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUubW9kZWxzW2ldLmF0dHJpYnV0ZXMsXG4gICAgICAgICAgICAgICAgLy9KdXN0IGFkZGVkIGNoZWNrIGZvciB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUubW9kZWxzW2ldXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGNoaWxkdmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyhjaGlsZFZpZXdPcHRpb25zKTtcbiAgICAgICAgICAgIC8vY2hpbGR2aWV3Ll9zZXRBdHRyaWJ1dGVzKF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChjaGlsZHZpZXcsICdhdHRyaWJ1dGVzJykpKTtcbiAgICAgICAgICAgIHJldHVybiBjaGlsZHZpZXc7XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICB9LFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQmFja2JvbmVPYmplY3QoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3MoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZWRlZmF1bHRzT3ZlcnJpZGUoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkVmlld3MoKTtcblxuICAgICAgICBcbiAgICAgIFxuXG4gICAgICAgIFxuICAgICAgICBcblxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgIFxuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgodGhpcy5zdWJWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyICRjaGlsZHJlbiA9ICQoKTtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAkY2hpbGRyZW4gPSAkY2hpbGRyZW4uYWRkKGNoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICBjaGlsZFZpZXcuaW5kZXggPSBpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIGlmICgkY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgoJGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkVmlldy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gJGNoaWxkcmVuLnBhcmVudCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkY2hpbGRyZW5cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyQWRkOmZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IFtdO1xuICAgICAgICB0aGlzLnN1YkNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihtb2RlbCxpKXtcbiAgICAgICAgICAgIHZhciBleGlzdGluZ0NoaWxkVmlldyA9IHRoaXMuY2hpbGRWaWV3cy5maWx0ZXIoZnVuY3Rpb24oY2hpbGRWaWV3KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRWaWV3Lm1vZGVsID09IG1vZGVsXG4gICAgICAgICAgICB9KVswXTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ0NoaWxkVmlldykge1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goZXhpc3RpbmdDaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICAgICAgLy92YXIgYXR0cmlidXRlcyA9IF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChleGlzdGluZ0NoaWxkVmlldywgJ2F0dHJpYnV0ZXMnKSlcbiAgICAgICAgICAgICAgICAvL2V4aXN0aW5nQ2hpbGRWaWV3Ll9zZXRBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld0NoaWxkVmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyh7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsOm1vZGVsLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp0aGlzLmNoaWxkTWFwcGluZ3MsXG4gICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOnRoaXMudmlldy5nZXQodGhpcy52YWwuc3BsaXQoXCI6XCIpWzBdKVtpXVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnB1c2gobmV3Q2hpbGRWaWV3KTtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKG5ld0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKXtcbiAgICAgICAgICAgIHRoaXMuJHBhcmVudC5hcHBlbmQoY2hpbGQpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkKGNoaWxkcmVuKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIH0pXG5cbiAgICB9LFxuICAgIHJlbmRlclJlc2V0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgIH0sXG4gICAgcmVuZGVyUmVtb3ZlOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGNoaWxkcmVuLmxhc3QoKS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnNwbGljZSgtMSwxKTtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSB0aGlzLiRwYXJlbnQuY2hpbGRyZW4oKTtcbiAgICB9LFxuICAgIHJlbmRlclNvcnQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgIC8vRG9uJ3QgbmVlZCB0aGlzIChub3cpLiBNb2RlbHMgd2lsbCBhbHJlYWR5IGJlIHNvcnRlZCBvbiBhZGQgd2l0aCBjb2xsZWN0aW9uLmNvbXBhcmF0b3IgPSB4eHg7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vdGhpcy52aWV3IGlzIGluc3RhbmNlIG9mIHRoZSB2aWV3IHRoYXQgY29udGFpbnMgdGhlIHN1YnZpZXcgZGlyZWN0aXZlLlxuICAgICAgICAvL3RoaXMuc3ViVmlldyBpcyBpbnN0YW5jZSBvZiB0aGUgc3Vidmlld1xuICAgICAgICAvL3RoaXMgaXMgdGhlIGRpcmVjdGl2ZS5cblxuICAgICAgICBpZiAodGhpcy5zdWJWaWV3KXtcbiAgICAgICAgICAgIC8vd2h5IHBhcmVudE5vZGU/XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aWV3LmVsLmNvbnRhaW5zKHRoaXMuc3ViVmlldy5lbC5wYXJlbnROb2RlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyIHBhc3MgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGVsID0gdGhpcy52aWV3LmVsXG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbi5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCFlbC5jb250YWlucyh0aGlzKSkgcGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbn0pIiwiLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJvcHRpb25hbFwiLFxuICAgIFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkuaGlkZSgpXG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5jc3MoXCJkaXNwbGF5XCIsXCJcIik7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCkgJCh0aGlzLmVsKS5oaWRlKClcbiAgICAgICAgZWxzZSAkKHRoaXMuZWwpLmNzcyhcImRpc3BsYXlcIixcIlwiKTtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICBpZiAoIWRvY3VtZW50LmJvZHkuY29udGFpbnModGhpcy5lbCkpIHRocm93IEVycm9yKFwiZWxlbWVudCBoYXMgdG8gYmUgaW4gdGhlIERPTSBpbiBvcmRlciB0byB0ZXN0XCIpXG4gICAgICAgIHJldHVybiAkKHRoaXMuZWwpLmlzKFwiOnZpc2libGVcIik9PXZhbHVlO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcIm9wdGlvbmFsd3JhcFwiLFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICBEaXJlY3RpdmUucHJvdG90eXBlLmNoaWxkSW5pdC5jYWxsKHRoaXMsYXJndW1lbnRzKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMud3JhcHBlciA9IHRoaXMuZWw7XG4gICAgICAgIHRoaXMuY2hpbGROb2RlcyA9IFtdLnNsaWNlLmNhbGwodGhpcy5lbC5jaGlsZE5vZGVzLCAwKTtcbiAgICAgICAgXG4gICAgfSxcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuY2hpbGROb2RlcykudW53cmFwKCk7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCl7XG4gICAgICAgICAgICAkKHRoaXMuY2hpbGROb2RlcykudW53cmFwKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLmNoaWxkTm9kZXNbMF0pKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmlyc3QgY2hpbGQgaGFzIHRvIGJlIGluIERPTVwiKTtcbiAgICAgICAgICAgICAgICAvL3NvbHV0aW9uOiBhZGQgYSBkdW1teSB0ZXh0IG5vZGUgYXQgYmVnaW5uaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLndyYXBwZXIpKXtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkTm9kZXNbMF0ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy53cmFwcGVyLHRoaXMuY2hpbGROb2Rlc1swXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IodmFyIGk9MDtpPHRoaXMuY2hpbGROb2Rlcy5sZW5ndGg7aSsrKXtcbiAgICAgICAgICAgICAgICB0aGlzLndyYXBwZXIuYXBwZW5kQ2hpbGQodGhpcy5jaGlsZE5vZGVzW2ldKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcblxuXG4gICAgICAgIHJldHVybiAodGhpcy5jaGlsZE5vZGVzWzBdLnBhcmVudE5vZGU9PXRoaXMud3JhcHBlcikgPT0gdmFsdWU7XG5cblxuICAgICAgXG4gICAgfVxufSkiLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwic3JjXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kZWwuYXR0cihcInNyY1wiLHRoaXMucmVzdWx0KTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLiRlbC5hdHRyKFwic3JjXCIsdGhpcy5yZXN1bHQpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHJldHVybiB0aGlzLiRlbC5hdHRyKFwic3JjXCIpPT09dmFsdWU7XG4gICAgfVxufSk7IiwiLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbi8qXG4gICAgTm90ZTogdXNlIHZpZXcuZ2V0IGZvciBkZWZhdWx0T3ZlcnJpZGUgYmVjYXVzZSByZWZlcnJpbmcgdG8gdGhlIGRlZmF1bHRzIGhhc2ggZGlyZWN0bHkgbWlnaHQgbm90IGJlIGNvcnJlY3QgaW4gdGhlIGNhc2Ugb2YgbmVzdGVkIG5lc3RlZCBzdWJWaWV3cyBcblxuKi9cblxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcbmltcG9ydCBBYnN0cmFjdFN1YnZpZXcgZnJvbSBcIi4vYWJzdHJhY3Qtc3Vidmlld1wiXG5leHBvcnQgZGVmYXVsdCBBYnN0cmFjdFN1YnZpZXcuZXh0ZW5kKHtcbiAgICBuYW1lOlwic3Vidmlld1wiLFxuICAgIF9pbml0aWFsaXplQ2hpbGRWaWV3czpmdW5jdGlvbigpe1xuXG4gICAgICAgIGlmICh0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlIGluc3RhbmNlb2YgQmFja2JvbmUuVmlldykgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICBlbHNlIHRoaXMuQ2hpbGRDb25zdHJ1Y3RvciA9IHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXS8qLmNhbGwodGhpcy52aWV3KTsqL1xuXG4gICAgICAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSkpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7ZGVmYXVsdHNPdmVycmlkZTp0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy52aWV3LnRlbXBsYXRlVmFsdWVzICYmIHRoaXMudmlldy50ZW1wbGF0ZVZhbHVlc1t0aGlzLnN1YlZpZXdOYW1lXSl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp0aGlzLnZpZXcudGVtcGxhdGVWYWx1ZXNbdGhpcy5zdWJWaWV3TmFtZV1cbiAgICAgICAgICAgICAgICAvLyxlbDp0aGlzLmVsIFRoZSBlbCBvZiB0aGUgZGlyZWN0aXZlIHNob3VsZCBiZWxvbmcgdG8gdGhlIGRpcmVjdGl2ZSBidXQgbm90IHRoZSBzdWJ2aWV3IGl0c2VsZlxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHN1Yk1vZGVsID0gdGhpcy5zdWJNb2RlbCB8fCB0aGlzLnZpZXcubW9kZWw7XG4gICAgICAgIGlmIChzdWJNb2RlbCl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHttb2RlbDpzdWJNb2RlbH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy5zdWJWaWV3ID0gbmV3IHRoaXMuQ2hpbGRDb25zdHJ1Y3RvcihvcHRpb25zKTtcbiAgICAgICAgICAgIHZhciBjbGFzc2VzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiY2xhc3NOYW1lXCIpXG4gICAgICAgICAgICBpZiAoY2xhc3Nlcyl7XG4gICAgICAgICAgICAgICAgY2xhc3Nlcy5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihjbCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5jbGFzc0xpc3QuYWRkKGNsKVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiYXR0cmlidXRlc1wiKTtcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgICAgICBfLmVhY2goYXR0cmlidXRlcyxmdW5jdGlvbih2YWwsbmFtZSl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5zZXRBdHRyaWJ1dGUobmFtZSx2YWwpICAgIFxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zdWJWaWV3LnBhcmVudCA9IHRoaXMudmlldztcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnREaXJlY3RpdmUgPSB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9uc1NlbnRUb1N1YlZpZXcgPSBvcHRpb25zO1xuICAgIH0sXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vdGhpcy52YWwsIHRoaXMudmlld1xuXG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdCgpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQ2hpbGRWaWV3cygpO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICBcbiAgICAgIFxuXG4gICAgICAgIGlmICh0aGlzLnN1YkNvbGxlY3Rpb24peyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcImFkZFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQWRkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcInJlc2V0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJSZXNldCgpO1xuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcInJlbW92ZVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyUmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcInNvcnRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclNvcnQoKTsgICAgICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuXG5cblxuICAgICAgICAgICAgICAgIC8vTWFwIG1vZGVscyB0byBjaGlsZFZpZXcgaW5zdGFuY2VzIHdpdGggdGhlaXIgdGVtcGxhdGVWYWx1ZXNcbiAgICAgICAgICAgICAgICB0aGlzLkNoaWxkVmlldyA9IHRoaXMudmlldy5jaGlsZFZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dGhpcy52aWV3LnRlbXBsYXRlVmFsdWVzICYmIHRoaXMudmlldy50ZW1wbGF0ZVZhbHVlc1t0aGlzLnN1YlZpZXdOYW1lXSxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIHRhZ05hbWU6dGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlLnRhZ05hbWUgfHwgXCJzdWJpdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRzT3ZlcnJpZGU6dGhpcy52aWV3LmdldCh0aGlzLnN1YlZpZXdOYW1lKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzID0gdGhpcy5zdWJDb2xsZWN0aW9uLm1hcChmdW5jdGlvbihjaGlsZE1vZGVsLGkpe1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkVmlld09wdGlvbnMgPSBfLmV4dGVuZCh7fSx0aGlzLmNoaWxkVmlld09wdGlvbnMse1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6Y2hpbGRNb2RlbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0SW5kZXg6dGhpcy5zdWJDb2xsZWN0aW9uLmxlbmd0aCAtIGkgLSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdHNPdmVycmlkZTp0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpICYmIHRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSkubW9kZWxzW2ldICYmIHRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSkubW9kZWxzW2ldLmF0dHJpYnV0ZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0p1c3QgYWRkZWQgY2hlY2sgZm9yIHRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSkubW9kZWxzW2ldXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkdmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyhjaGlsZFZpZXdPcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgLy9jaGlsZHZpZXcuX3NldEF0dHJpYnV0ZXMoXy5leHRlbmQoe30sIF8ucmVzdWx0KGNoaWxkdmlldywgJ2F0dHJpYnV0ZXMnKSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGR2aWV3O1xuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG5cblxuICAgICAgICAgICAgICAgIFxuXG5cblxuICAgICAgICB9XG5cbiAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuXG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIGlmICh0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlIGluc3RhbmNlb2YgQmFja2JvbmUuVmlldykgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICAgICAgZWxzZSB0aGlzLkNoaWxkQ29uc3RydWN0b3IgPSB0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0vKi5jYWxsKHRoaXMudmlldyk7Ki9cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIHZhciBvcHRpb25zID0ge307XG4gICAgICAgICAgIFxuICAgICAgICBpZiAodGhpcy52aWV3LmdldCh0aGlzLnN1YlZpZXdOYW1lKSl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtkZWZhdWx0c092ZXJyaWRlOnRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSl9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnZpZXcudGVtcGxhdGVWYWx1ZXMpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dGhpcy52aWV3LnRlbXBsYXRlVmFsdWVzW3RoaXMuc3ViVmlld05hbWVdXG4gICAgICAgICAgICAgICAgLy8sZWw6dGhpcy5lbCBUaGUgZWwgb2YgdGhlIGRpcmVjdGl2ZSBzaG91bGQgYmVsb25nIHRvIHRoZSBkaXJlY3RpdmUgYnV0IG5vdCB0aGUgc3VidmlldyBpdHNlbGZcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBzdWJNb2RlbCA9IHRoaXMuc3ViTW9kZWwgfHwgdGhpcy52aWV3Lm1vZGVsO1xuICAgICAgICBpZiAoc3ViTW9kZWwpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7bW9kZWw6c3ViTW9kZWx9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldyA9IG5ldyB0aGlzLkNoaWxkQ29uc3RydWN0b3Iob3B0aW9ucyk7XG4gICAgICAgICAgICB2YXIgY2xhc3NlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImNsYXNzTmFtZVwiKVxuICAgICAgICAgICAgaWYgKGNsYXNzZXMpe1xuICAgICAgICAgICAgICAgIGNsYXNzZXMuc3BsaXQoXCIgXCIpLmZvckVhY2goZnVuY3Rpb24oY2wpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuY2xhc3NMaXN0LmFkZChjbClcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgYXR0cmlidXRlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImF0dHJpYnV0ZXNcIik7XG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlcyl7XG4gICAgICAgICAgICAgICAgXy5lYWNoKGF0dHJpYnV0ZXMsZnVuY3Rpb24odmFsLG5hbWUpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuc2V0QXR0cmlidXRlKG5hbWUsdmFsKSAgICBcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnQgPSB0aGlzLnZpZXc7XG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcucGFyZW50RGlyZWN0aXZlID0gdGhpcztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnNTZW50VG9TdWJWaWV3ID0gb3B0aW9ucztcbiAgICB9LFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIHRoaXMuJGVsLnJlcGxhY2VXaXRoKHRoaXMuc3ViVmlldy5lbCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHZhciAkY2hpbGRyZW4gPSAkKCk7XG4gICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgJGNoaWxkcmVuID0gJGNoaWxkcmVuLmFkZChjaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICAgICAgY2hpbGRWaWV3LmluZGV4ID0gaTtcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBpZiAoJGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGVsLnJlcGxhY2VXaXRoKCRjaGlsZHJlbik7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgICAgICAgICBjaGlsZFZpZXcuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9ICRjaGlsZHJlbi5wYXJlbnQoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICB0aGlzLiRwYXJlbnQgPSB0aGlzLiRlbC5wYXJlbnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuJGNoaWxkcmVuID0gJGNoaWxkcmVuXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlbmRlckFkZDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgdGhpcy5zdWJDb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24obW9kZWwsaSl7XG4gICAgICAgICAgICB2YXIgZXhpc3RpbmdDaGlsZFZpZXcgPSB0aGlzLmNoaWxkVmlld3MuZmlsdGVyKGZ1bmN0aW9uKGNoaWxkVmlldyl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkVmlldy5tb2RlbCA9PSBtb2RlbFxuICAgICAgICAgICAgfSlbMF07XG4gICAgICAgICAgICBpZiAoZXhpc3RpbmdDaGlsZFZpZXcpIHtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKGV4aXN0aW5nQ2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgICAgIC8vdmFyIGF0dHJpYnV0ZXMgPSBfLmV4dGVuZCh7fSwgXy5yZXN1bHQoZXhpc3RpbmdDaGlsZFZpZXcsICdhdHRyaWJ1dGVzJykpXG4gICAgICAgICAgICAgICAgLy9leGlzdGluZ0NoaWxkVmlldy5fc2V0QXR0cmlidXRlcyhhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBuZXdDaGlsZFZpZXcgPSBuZXcgdGhpcy5DaGlsZFZpZXcoe1xuICAgICAgICAgICAgICAgICAgICBtb2RlbDptb2RlbCxcbiAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dGhpcy52aWV3LnRlbXBsYXRlVmFsdWVzICYmIHRoaXMudmlldy50ZW1wbGF0ZVZhbHVlc1t0aGlzLnN1YlZpZXdOYW1lXSxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdEluZGV4OnRoaXMuc3ViQ29sbGVjdGlvbi5sZW5ndGggLSBpIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6dGhpcy52aWV3LmdldCh0aGlzLnZhbC5zcGxpdChcIjpcIilbMF0pW2ldXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MucHVzaChuZXdDaGlsZFZpZXcpO1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2gobmV3Q2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpe1xuICAgICAgICAgICAgdGhpcy4kcGFyZW50LmFwcGVuZChjaGlsZClcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9ICQoY2hpbGRyZW4pXG4gICAgICAgIFxuICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICBjaGlsZFZpZXcuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgfSlcblxuICAgIH0sXG4gICAgcmVuZGVyUmVzZXQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgfSxcbiAgICByZW5kZXJSZW1vdmU6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4ubGFzdCgpLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmNoaWxkVmlld3Muc3BsaWNlKC0xLDEpO1xuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9IHRoaXMuJHBhcmVudC5jaGlsZHJlbigpO1xuICAgIH0sXG4gICAgcmVuZGVyU29ydDpmdW5jdGlvbigpe1xuICAgICAgICBcbiAgICAgICAgLy9Eb24ndCBuZWVkIHRoaXMgKG5vdykuIE1vZGVscyB3aWxsIGFscmVhZHkgYmUgc29ydGVkIG9uIGFkZCB3aXRoIGNvbGxlY3Rpb24uY29tcGFyYXRvciA9IHh4eDtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy90aGlzLnZpZXcgaXMgaW5zdGFuY2Ugb2YgdGhlIHZpZXcgdGhhdCBjb250YWlucyB0aGUgc3VidmlldyBkaXJlY3RpdmUuXG4gICAgICAgIC8vdGhpcy5zdWJWaWV3IGlzIGluc3RhbmNlIG9mIHRoZSBzdWJ2aWV3XG4gICAgICAgIC8vdGhpcyBpcyB0aGUgZGlyZWN0aXZlLlxuXG4gICAgICAgIGlmICh0aGlzLnN1YlZpZXcpe1xuICAgICAgICAgICAgLy93aHkgcGFyZW50Tm9kZT9cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZpZXcuZWwuY29udGFpbnModGhpcy5zdWJWaWV3LmVsLnBhcmVudE5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB2YXIgcGFzcyA9IHRydWU7XG4gICAgICAgICAgICB2YXIgZWwgPSB0aGlzLnZpZXcuZWxcbiAgICAgICAgICAgIHRoaXMuJGNoaWxkcmVuLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoIWVsLmNvbnRhaW5zKHRoaXMpKSBwYXNzID0gZmFsc2U7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICByZXR1cm4gcGFzcztcbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgfVxufSkiLCIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJkYXRhXCIsXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuY29udGVudCA9IHRoaXMudmlldy52aWV3TW9kZWwuZ2V0KHRoaXMudmFsKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnZpZXcudmlld01vZGVsLFwiY2hhbmdlOlwiK3RoaXMudmFsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLmNvbnRlbnQgPSB0aGlzLnZpZXcudmlld01vZGVsLmdldCh0aGlzLnZhbCk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9KVxuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICBfLmVhY2godGhpcy5jb250ZW50LGZ1bmN0aW9uKHZhbCxwcm9wKXtcbiAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWwpKSB2YWwgPSB2YWwuYmluZCh0aGlzLnZpZXcpO1xuICAgICAgICAgICB0aGlzLiRlbC5hdHRyKFwiZGF0YS1cIitwcm9wLHZhbClcbiAgICAgICB9LmJpbmQodGhpcykpXG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICBfLmVhY2godGhpcy5jb250ZW50LGZ1bmN0aW9uKHZhbCxwcm9wKXtcbiAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWwpKSB2YWwgPSB2YWwuYmluZCh0aGlzLnZpZXcpO1xuICAgICAgICAgICB0aGlzLiRlbC5hdHRyKFwiZGF0YS1cIitwcm9wLHZhbClcbiAgICAgICB9LmJpbmQodGhpcykpXG4gICAgfVxufSk7IiwiaW1wb3J0IERpcmVjdGl2ZUNvbnRlbnQgZnJvbSBcIi4vZGlyZWN0aXZlLWNvbnRlbnRcIjtcbmltcG9ydCBEaXJlY3RpdmVFbmFibGUgZnJvbSBcIi4vZGlyZWN0aXZlLWVuYWJsZVwiO1xuaW1wb3J0IERpcmVjdGl2ZURpc2FibGUgZnJvbSBcIi4vZGlyZWN0aXZlLWRpc2FibGVcIjtcbmltcG9ydCBEaXJlY3RpdmVIcmVmIGZyb20gXCIuL2RpcmVjdGl2ZS1ocmVmXCI7XG5pbXBvcnQgRGlyZWN0aXZlTWFwIGZyb20gXCIuL2RpcmVjdGl2ZS1tYXBcIjtcbmltcG9ydCBEaXJlY3RpdmVPcHRpb25hbCBmcm9tIFwiLi9kaXJlY3RpdmUtb3B0aW9uYWxcIjtcbmltcG9ydCBEaXJlY3RpdmVPcHRpb25hbFdyYXAgZnJvbSBcIi4vZGlyZWN0aXZlLW9wdGlvbmFsd3JhcFwiO1xuaW1wb3J0IERpcmVjdGl2ZVNyYyBmcm9tIFwiLi9kaXJlY3RpdmUtc3JjXCI7XG5pbXBvcnQgRGlyZWN0aXZlU3VidmlldyBmcm9tIFwiLi9kaXJlY3RpdmUtc3Vidmlld1wiO1xuaW1wb3J0IERpcmVjdGl2ZURhdGEgZnJvbSBcIi4vZGlyZWN0aXZlLWRhdGFcIjtcblxudmFyIHJlZ2lzdHJ5ID0ge1xuICAgIENvbnRlbnQ6RGlyZWN0aXZlQ29udGVudCxcbiAgICBFbmFibGU6RGlyZWN0aXZlRW5hYmxlLFxuICAgIERpc2FibGU6RGlyZWN0aXZlRGlzYWJsZSxcbiAgICBIcmVmOkRpcmVjdGl2ZUhyZWYsXG4gICAgTWFwOkRpcmVjdGl2ZU1hcCxcbiAgICBPcHRpb25hbDpEaXJlY3RpdmVPcHRpb25hbCxcbiAgICBPcHRpb25hbFdyYXA6RGlyZWN0aXZlT3B0aW9uYWxXcmFwLFxuICAgIFNyYzpEaXJlY3RpdmVTcmMsXG4gICAgU3VidmlldzpEaXJlY3RpdmVTdWJ2aWV3LFxuICAgIERhdGE6RGlyZWN0aXZlRGF0YVxufTtcblxuZXhwb3J0IGRlZmF1bHQgcmVnaXN0cnk7IiwiLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cbi8qaW1wb3J0IF8gZnJvbSBcInVuZGVyc2NvcmVcIjsqL1xuLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbmltcG9ydCBEaXJlY3RpdmVSZWdpc3RyeSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnkuanNcIlxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlLmpzXCJcbmltcG9ydCBWaWV3TW9kZWwgZnJvbSBcIi4vVmlld01vZGVsXCI7XG5cbmZ1bmN0aW9uIGdldEFsbFRleHROb2RlcyhlbCl7XG4gICAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEwNzMwMzA5L2ZpbmQtYWxsLXRleHQtbm9kZXMtaW4taHRtbC1wYWdlXG4gICAgdmFyIG4sIGE9W10sIHdhbGs9ZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcihlbCxOb2RlRmlsdGVyLlNIT1dfVEVYVCxudWxsLGZhbHNlKTtcbiAgICB3aGlsZShuPXdhbGsubmV4dE5vZGUoKSkgYS5wdXNoKG4pO1xuICAgIHJldHVybiBhO1xufVxuXG52YXIgYmFja2JvbmVWaWV3T3B0aW9ucyA9IFsnbW9kZWwnLCAnY29sbGVjdGlvbicsICdlbCcsICdpZCcsICdhdHRyaWJ1dGVzJywgJ2NsYXNzTmFtZScsICd0YWdOYW1lJywgJ2V2ZW50cyddO1xudmFyIGFkZGl0aW9uYWxWaWV3T3B0aW9ucyA9IFsnd2FybicsJ3RlbXBsYXRlVmFsdWVzJywndGVtcGxhdGVTdHJpbmcnLCdjaGlsZFZpZXdJbXBvcnRzJywnc3ViVmlld0ltcG9ydHMnLCdpbmRleCcsJ2xhc3RJbmRleCcsJ2RlZmF1bHRzT3ZlcnJpZGUnXVxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICAgIFxuICAgICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gY29uc3RydWN0b3Iob3B0aW9ucykge1xuXG4gICAgICAgIHZhciBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICAvL0EgdGVtcGxhdGUgYW5kIGRlZmF1bHRzIGFyZSBhbGwgYnV0IHJlcXVpcmVkLlxuICAgICAgICBpZiAodGhpcy53YXJuIHx8IHR5cGVvZiB0aGlzLndhcm49PVwidW5kZWZpbmVkXCIpe1xuICAgICAgICAgICAgaWYgKCF0aGlzLmpzdCAmJiAhdGhpcy50ZW1wbGF0ZVN0cmluZykgY29uc29sZS53YXJuKFwiWW91IHByb2JhYmx5IG5lZWQgYSB0ZW1wbGF0ZVwiKTtcbiAgICAgICAgICAgIGlmICghdGhpcy5kZWZhdWx0cykgY29uc29sZS53YXJuKFwiWW91IHByb2JhYmx5IG5lZWQgc29tZSBkZWZhdWx0cyBmb3IgeW91ciB2aWV3XCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy9Db252ZXJ0IHRlbXBsYXRlU3RyaW5nIHRvIGEgamF2YXNjcmlwdCB0ZW1wbGF0ZVxuICAgICAgICBpZiAoIXRoaXMuanN0KSB7XG4gICAgICAgICAgICB0aGlzLmpzdCA9IF8udGVtcGxhdGUodGhpcy50ZW1wbGF0ZVN0cmluZyB8fCBcIlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vZXh0ZW5kIG9ubHkgdmFsaWQgb3B0aW9uc1xuICAgICAgICBfLmV4dGVuZCh0aGlzLCBfLnBpY2sob3B0aW9ucywgYmFja2JvbmVWaWV3T3B0aW9ucy5jb25jYXQoYWRkaXRpb25hbFZpZXdPcHRpb25zKSkpO1xuXG4gICAgICAgIFxuXG4gICAgICAgIF8uZWFjaCh0aGlzLmRlZmF1bHRzLCBmdW5jdGlvbiAoZGVmKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGRlZikpIGNvbnNvbGUud2FybihcIkRlZmF1bHRzIHNob3VsZCB1c3VhbGx5IGJlIHByaW1pdGl2ZSB2YWx1ZXNcIik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vZGF0YSBpcyBwYXNzZWQgaW4gb24gc3Vidmlld3NcbiAgICAgICAgLy8gY29tZXMgZnJvbSB0aGlzLnZpZXcudmlld01vZGVsLmdldCh0aGlzLnZhbCk7LCBcbiAgICAgICAgLy9zbyBpZiB0aGUgZGlyZWN0aXZlIGlzIG5tLXN1YnZpZXc9XCJNZW51XCIsIHRoZW4gdGhpcy5kYXRhIHNob3VsZCBiZS4uLndoYXQ/XG4gICAgICAgIC8vQWhhISBkYXRhIGlzIHRvIG92ZXJyaWRlIGRlZmF1bHQgdmFsdWVzIGZvciBzdWJ2aWV3cyBiZWluZyBwYXJ0IG9mIGEgcGFyZW50IHZpZXcuIFxuICAgICAgICAvL0J1dCBpdCBpcyBub3QgbWVhbnQgdG8gb3ZlcnJpZGUgdGVtcGxhdGVWYWx1ZXMgSSBkb24ndCB0aGluay5cbiAgICAgICAgdGhpcy5kZWZhdWx0c092ZXJyaWRlID0gb3B0aW9ucyAmJiBvcHRpb25zLmRlZmF1bHRzT3ZlcnJpZGU7XG5cbiAgICAgICAgXG4gICAgICAgIFxuXG4gICAgICAgIHZhciBhdHRycyA9IF8uZXh0ZW5kKF8uY2xvbmUodGhpcy5kZWZhdWx0cyksIG9wdGlvbnMgJiYgb3B0aW9ucy5kZWZhdWx0c092ZXJyaWRlIHx8IHt9KTtcbiAgICAgICAgdGhpcy52aWV3TW9kZWwgPSBuZXcgRmFqaXRhLlZpZXdNb2RlbChhdHRycyk7XG5cbiAgICAgICAgdGhpcy52aWV3Q29sbGVjdGlvbiA9IG5ldyBGYWppdGEuQ29sbGVjdGlvbih0aGlzLmRlZmF1bHRzT3ZlcnJpZGUgfHwgdGhpcy5kZWZhdWx0cyk7XG5cbiAgICAgICAgLy9JIHdhbnQgdG8gdXNlIHRoaXMuc2V0IGhlcmUgYnV0IGNhbid0IGdldCBpdCB3b3JraW5nIHdpdGhvdXQgcmV3cml0aW5nIG1vZGVsLnNldCB0byBzdXBwb3J0IHR3byBhcmd1bWVudHNcbiAgICAgICAgXG5cbiAgICAgICAgLy9Gb3IgZWFjaCBzdWJWaWV3LCBzZXQgdGhlIHZpZXdNb2RlbCB0byBhIGNvbGxlY3Rpb24gb2Ygdmlld3MgKGlmIGl0IGlzIGFuIGFycmF5KSBvciBhIHZpZXcuXG4gICAgICAgIC8vSXQgc2VuZHMgaW4gZGVmYXVsdE92ZXJyaWRlIGFuZCB0aGlzJ3MgbW9kZWwgYXMgYSBtb2RlbC5cblxuICAgICAgICAvL0FjdHVhbGx5IHRoYXQncyBhIGNvbmZ1c2luZyBBUEkuIFRoZSBxdWVzdGlvbiBpcy4uLnNob3VsZCBjaGlsZFZpZXdJbXBvcnRzIGJlIGEgdGhpbmcgb3Igc2hvdWxkIGl0IGFsbCBiZSBjYWxsZWQgc3ViVmlld0ltcG9ydHM/XG5cbiAgICAgICAgaWYgKHRoaXMuc3ViVmlld0ltcG9ydHMpe1xuICAgICAgICAgICAgZm9yKHZhciBwcm9wIGluIHRoaXMuc3ViVmlld0ltcG9ydHMpe1xuICAgICAgICAgICAgICAgIC8vdGhpcy52aWV3TW9kZWwuc2V0KHByb3AsXy5leHRlbmQoe30sdGhpcy5zdWJWaWV3SW1wb3J0c1twcm9wXS5wcm90b3R5cGUuZGVmYXVsdHMsYXR0cnNbcHJvcF0pKVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRlZmF1bHRzW3Byb3BdIGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgICAgICAgICAgICAgICAgdmFyIHN1YnZpZXcgPSBuZXcgQmFja2JvbmUuQ29sbGVjdGlvbihhdHRyc1twcm9wXS5tYXAoKG9iaixpKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHZpZXcgPSBuZXcgdGhpcy5zdWJWaWV3SW1wb3J0c1twcm9wXSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6dGhpcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNbcHJvcF1baV1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHt2aWV3OnZpZXd9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICB2YXIgc3VidmlldyA9IG5ldyB0aGlzLnN1YlZpZXdJbXBvcnRzW3Byb3BdKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGVsOnRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNbcHJvcF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAvL25ld1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dGhpcy50ZW1wbGF0ZVZhbHVlcyAmJiB0aGlzLnRlbXBsYXRlVmFsdWVzW3Byb3BdXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdWJ2aWV3LnBhcmVudCA9IHRoaXM7XG4gICAgICAgICAgICAgICAgdGhpcy52aWV3TW9kZWwuc2V0KHByb3Asc3Vidmlldyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuXG4gICAgICAgIC8vdGVtcGxhdGVWYWx1ZXMgY29udGFpbiB0ZW1wbGF0ZVZhbHVlcyBvZiB2aWV3IHZhcmlhYmxlcyB0byBtb2RlbCB2YXJpYWJsZXMuXG4gICAgICAgIC8vc3RyaW5ncyBhcmUgcmVmZXJlbmNlcyB0byBtb2RlbCB2YXJpYWJsZXMuIEZ1bmN0aW9ucyBhcmUgZm9yIHdoZW4gYSB2aWV3IHZhcmlhYmxlIGRvZXNcbiAgICAgICAgLy9ub3QgbWF0Y2ggcGVyZmVjdGx5IHdpdGggYSBtb2RlbCB2YXJpYWJsZS4gVGhlc2UgYXJlIHVwZGF0ZWQgZWFjaCB0aW1lIHRoZSBtb2RlbCBjaGFuZ2VzLlxuICAgICAgICBcblxuICAgICAgICAvL1Byb2JsZW06IGlmIHlvdSB1cGRhdGUgdGhlIG1vZGVsIGl0IHVwZGF0ZXMgZm9yIGV2ZXJ5IHN1YnZpZXcgKG5vdCBlZmZpY2llbnQpLlxuICAgICAgICAvL0FuZCBpdCBkb2VzIG5vdCB1cGRhdGUgZm9yIHN1Ym1vZGVscy4gUGVyaGFwcyB0aGVyZSBhcmUgbWFueSBkaWZmZXJlbnQgc29sdXRpb25zIGZvciB0aGlzLlxuICAgICAgICAvL1lvdSBjYW4gaGF2ZSBlYWNoIHN1Ym1vZGVsIHRyaWdnZXIgY2hhbmdlIGV2ZW50LlxuXG4gICAgICAgIC8vV2hlbmV2ZXIgdGhlIG1vZGVsIGNoYW5nZXMsIHVwZGF0ZSB0aGUgdmlld01vZGVsIGJ5IG1hcHBpbmcgcHJvcGVydGllcyBvZiB0aGUgbW9kZWwgdG8gcHJvcGVydGllcyBvZiB0aGUgdmlldyAoYXNzaWduZWQgaW4gdGVtcGxhdGVWYWx1ZXMpXG4gICAgICAgIC8vQWxzbywgdGhlIGF0dHJpYnV0ZXMgY2hhbmdlLiBUaGlzIGNhbiBiZSBkb25lIG1vcmUgZWxlZ2FudGx5XG4gICAgICAgIGlmICh0aGlzLm1vZGVsKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlXCIsIHRoaXMudXBkYXRlVmlld01vZGVsKTtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2VcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldEF0dHJpYnV0ZXMoXy5leHRlbmQoe30sIF8ucmVzdWx0KHRoaXMsICdhdHRyaWJ1dGVzJykpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpZXdNb2RlbCgpO1xuXG4gICAgICAgICAgICBfLmVhY2godGhpcy50ZW1wbGF0ZVZhbHVlcyxmdW5jdGlvbih2YWwsa2V5KXtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbD09PVwib2JqZWN0XCIpe1xuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlld01vZGVsLnNldChrZXksbmV3IHRoaXMuc3ViVmlld0ltcG9ydHNba2V5XSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlbDp0aGlzLm1vZGVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dmFsXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB9XG5cbiAgICAgICAgLy9TaG91bGQgdGhlIHZpZXdNb2RlbCBjb250YWluIHRoZSBzdWJ2aWV3cyBpbnN0ZWFkIG9mIGRpcmVjdGl2ZXM/IFxuICAgICAgICAvL1dlIGhhdmUgc3ViVmlld0ltcG9ydHMgaGF2ZSB0aGUgY29uc3RydWN0b3IsIFxuICAgICAgICAvL1RoZSBkZWZhdWx0cyBjb21lIGZyb20gYSBzdWJoYXNoIGluIGRlZmF1bHRzLCBhbmQgdGVtcGxhdGVWYXJzIGNvbWUgZnJvbSB0ZW1wbGF0ZVZhcnMuXG5cblxuICAgICAgICB2YXIgYXR0cnMgPSB0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzO1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXMpO1xuICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgaWYgKGtleSA9PT0gXCJkZWZpbml0aW9uc1wiICYmICF0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzW2tleV0pIHtcbiAgICAgICAgICAgICAgICAvL3Byb2JsZW0gaXMgdGhhdCBwcm9wTWFwIChzZWVtcyB0byBiZSB0ZW1wbGF0ZVZhbHVlcyB3aXRoIGZ1bmN0aW9ucyBmaWx0ZXJlZCBvdXQpIGlzIFxuICAgICAgICAgICAgICAgIC8ve2RlZmluaXRpb25zOlwiZGVmaW5pdGlvbnNcIn0uIENvbWVzIGZyb20gYXJ0aWNsZV9hcnRpY2xlLmpzXG4gICAgICAgICAgICAgICAgZGVidWdnZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5fZW5zdXJlRWxlbWVudCgpO1xuICAgICAgICB0aGlzLmJ1aWxkSW5uZXJIVE1MKCk7XG5cbiAgICAgICAgdGhpcy5fc3ViVmlld0VsZW1lbnRzID0gW107XG4gICAgICAgIHRoaXMuaW5pdERpcmVjdGl2ZXMoKTsgLy9pbml0IHNpbXBsZSBkaXJlY3RpdmVzLi4udGhlIG9uZXMgdGhhdCBqdXN0IG1hbmlwdWxhdGUgYW4gZWxlbWVudFxuXG4gICAgICAgIHRoaXMuX3BhcnNlVGV4dE5vZGVzKCk7XG5cblxuICAgICAgICAvL21hcCByZXF1aXJlcyBhIFwiOlwiLiBTaG91bGQgYmUgdGVzdCBhZ2FpbnN0IHRoZSB2YWx1ZSB0aG91Z2gsIG5vdCB3aGV0aGVyIHRoZXJlIGlzIGEgY29sb24uXG4gICAgICAgIFxuICAgICAgICAvL0JlZm9yZSwgc3ViVmlld3Mgd2VyZSBkaXJlY3RpdmVzIGFuZCBhY2Nlc3NpbmcgYSBzdWJ2aWV3IG1lYW50IGFjY2Vzc2luZyB0aHJvdWdoIHRoaXMuZGlyZWN0aXZlLlxuICAgICAgICAvL0J1dCBub3cgeW91IHNpbXBseSB1c2Ugdmlldy5nZXQoc3ViVmlldykgdG8gZ2V0IHRoZSBhY3R1YWwgc3ViVmlldy5cblxuICAgICAgICAvL1RoZSBvbmx5IHRoaW5nIHlvdSBoYXZlIHRvIGRvIGhlcmUgaXMgbW92ZSB0aGUgY29kZSBmcm9tIHRoZSBzcGVyYXRlIHN1YlZpZXcgZGlyZWN0aXZlIHRvIGhlcmUuXG4gICAgICAgIC8vTWF5YmUgYWRkIGEgcGFyZW50VmlldyByZWZlcmVuY2UgdG8gdGhlIHN1YlZpZXcsIChpZiBkb2VzIG5vdCBleGlzdCBhbHJlYWR5KS5cbiAgICAgICAgXG4gICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uKHN1YlZpZXdFbGVtZW50KXtcbiAgICAgICAgICAgIHZhciBwcm9wcyA9IHN1YlZpZXdFbGVtZW50Lm1hdGNoLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHByb3BzKVxuICAgICAgICAgICAgdmFyIHN1YlZpZXdDb25zdHJ1Y3RvciA9IHRoaXMuc3ViVmlld0ltcG9ydHNbcHJvcHNbMF1dO1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmdldChwcm9wc1sxXSk7XG4gICAgICAgICAgICBpZiAoY29udGV4dCBpbnN0YW5jZW9mIEJhY2tib25lLkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uT2ZWaWV3cyA9IHRoaXMuZ2V0KHByb3BzWzBdKTtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uT2ZWaWV3cy5lYWNoKGZ1bmN0aW9uKG1vZGVsLGkpe1xuICAgICAgICAgICAgICAgICAgICBpZiAoaT09MCkgJChzdWJWaWV3RWxlbWVudCkucmVwbGFjZVdpdGgobW9kZWwuZ2V0KFwidmlld1wiKS5lbClcbiAgICAgICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoY29sbGVjdGlvbk9mVmlld3MuYXQoaS0xKS5nZXQoXCJ2aWV3XCIpLmVsKS5hZnRlcihtb2RlbC5nZXQoXCJ2aWV3XCIpLmVsKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgJChzdWJWaWV3RWxlbWVudCkucmVwbGFjZVdpdGgodGhpcy5nZXQocHJvcHNbMF0pLmVsKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIC8qXG4gICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uKHN1YlZpZXdFbGVtZW50KXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gc3ViVmlld0VsZW1lbnQubWF0Y2guc3BsaXQoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoPT0xKXtcblxuXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmRpcmVjdGl2ZVtcInN1YnZpZXdcIl0pIHRoaXMuZGlyZWN0aXZlW1wic3Vidmlld1wiXSA9IFtdO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlyZWN0aXZlW1wic3Vidmlld1wiXS5wdXNoKG5ldyBEaXJlY3RpdmVSZWdpc3RyeVtcIlN1YnZpZXdcIl0oe1xuICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgIGVsOnN1YlZpZXdFbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICB2YWw6c3ViVmlld0VsZW1lbnQubWF0Y2hcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coc3ViVmlld0VsZW1lbnQubWF0Y2gpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5kaXJlY3RpdmVbXCJtYXBcIl0pIHRoaXMuZGlyZWN0aXZlW1wibWFwXCJdID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5kaXJlY3RpdmVbXCJtYXBcIl0ucHVzaChuZXcgRGlyZWN0aXZlUmVnaXN0cnlbXCJNYXBcIl0oe1xuICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgIGVsOnN1YlZpZXdFbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICB2YWw6c3ViVmlld0VsZW1lbnQubWF0Y2hcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgKi9cblxuXG4gICAgICAgIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcblxuICAgICAgICB0aGlzLmNoaWxkTm9kZXMgPSBbXS5zbGljZS5jYWxsKHRoaXMuZWwuY2hpbGROb2RlcywgMCk7XG5cbiAgICAgICAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSxcbiAgICBcbiAgICBpbml0aWFsaXplOmZ1bmN0aW9uKG9wdGlvbnMpe1xuICAgICAgICAvL2F0dGFjaCBvcHRpb25zIHRvIHZpZXcgKG1vZGVsLCBwcm9wTWFwLCBzdWJWaWV3cywgZXZlbnRzKVxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgXy5leHRlbmQodGhpcyxvcHRpb25zKTtcbiAgICB9LFxuICAgIGdldE1vZGVsQXR0cjpmdW5jdGlvbihhdHRyKXtcbiAgICAgICAgLy9xdWlja2x5IGdyYWIgYSBtb2RlbHMgYXR0cmlidXRlIGJ5IGEgdmlldyB2YXJpYWJsZS4gVXNlZnVsIGluIGNsYXNzbmFtZSBmdW5jdGlvbi5cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLnRlbXBsYXRlVmFsdWVzW2F0dHJdID09XCJzdHJpbmdcIikgcmV0dXJuIHRoaXMubW9kZWwuZ2V0KHRoaXMudGVtcGxhdGVWYWx1ZXNbYXR0cl0pO1xuICAgICAgICBlbHNlIHJldHVybiB0aGlzLnRlbXBsYXRlVmFsdWVzW2F0dHJdLmNhbGwodGhpcylcbiAgICB9LFxuICAgIHVwZGF0ZVZpZXdNb2RlbDpmdW5jdGlvbigpe1xuXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgdGhpcy52aWV3TW9kZWwuc2V0KF8ubWFwT2JqZWN0KHRoaXMudGVtcGxhdGVWYWx1ZXMsZnVuY3Rpb24obW9kZWxWYXIpe1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtb2RlbFZhcj09XCJzdHJpbmdcIikgcmV0dXJuIHRoaXMubW9kZWwuZ2V0KG1vZGVsVmFyKTtcbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBtb2RlbFZhcj09XCJmdW5jdGlvblwiKSByZXR1cm4gbW9kZWxWYXIuY2FsbCh0aGlzKVxuICAgICAgICB9LmJpbmQodGhpcykpKTtcblxuICAgICAgICBcblxuICAgICAgICBcbiAgICAgICAgXG4gICAgXG4gICAgfSxcbiAgICBidWlsZElubmVySFRNTDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwpIHRoaXMuJGVsLmh0bWwodGhpcy5yZW5kZXJlZFRlbXBsYXRlKCkpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBkdW1teWRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgICAgICBkdW1teWRpdi5pbm5lckhUTUwgPSB0aGlzLnJlbmRlcmVkVGVtcGxhdGUoKTtcbiAgICAgICAgICAgIHdoaWxlKGR1bW15ZGl2LmNoaWxkTm9kZXMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICB0aGlzLmVsLmFwcGVuZENoaWxkKGR1bW15ZGl2LmNoaWxkTm9kZXNbMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9tYXliZSBsZXNzIGhhY2tpc2ggc29sdXRpb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjUyMTQxMTMvMTc2MzIxN1xuICAgICAgICB9XG4gICAgfSxcbiAgICBfcGFyc2VUZXh0Tm9kZXM6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy9UaGlzIGZ1bmN0aW9uIGdvZXMgdGhyb3VnaCBlYWNoIHRleHQgbm9kZSBpbiB0aGUgZWxlbWVudCBlLmc6ICh0ZXh0Tm9kZTxkaXY+dGV4dE5vZGU8L2Rpdj50ZXh0Tm9kZSksIGFuZCBzcGxpdHNcbiAgICAgICAgLy90aGUgdGV4dE5vZGVzIHNvIHRoYXQge3tzdWJWaWV3TmFtZX19IGlzIGl0cyBvd24gdGV4dE5vZGUuIFRoZW4gaXQgYWRkcyBhbGwgdGV4dE5vZGVzIG1hdGNoaW5nIHt7c3ViVmlld05hbWV9fSB0b1xuICAgICAgICAvL3RoaXMuX3N1YlZpZXdFbGVtZW50c1xuXG5cbiAgICAgICAgIC8vSW5pdCBkaXJlY3RpdmVzIGludm9sdmluZyB7e319XG5cbiAgICAgICAgLy9HZXQgYWxsIG9mIHRoZSB0ZXh0IG5vZGVzIGluIHRoZSBkb2N1bWVudC4gZS5nOiAodGV4dE5vZGU8ZGl2PnRleHROb2RlPC9kaXY+dGV4dE5vZGUpXG5cbiAgICAgICAgZ2V0QWxsVGV4dE5vZGVzKHRoaXMuZWwpLmZvckVhY2goZnVuY3Rpb24oZnVsbFRleHROb2RlKXtcbiAgICAgICAgICAgIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjEzMTE2NzAvMTc2MzIxNyB0ZXh0Q29udGVudCBzZWVtcyByaWdodFxuXG4gICAgICAgICAgICB2YXIgcmUgPSAvXFx7XFx7KC4rPylcXH1cXH0vZzsgLy9NYXRjaCB7e3N1YlZpZXdOYW1lfX1cbiAgICAgICAgICAgIHZhciBtYXRjaDtcbiAgICAgICAgICAgIFxuXG4gICAgICAgICAgICB2YXIgbWF0Y2hlcyA9IFtdO1xuICAgICAgICAgICAgd2hpbGUgKChtYXRjaCA9IHJlLmV4ZWMoZnVsbFRleHROb2RlLnRleHRDb250ZW50KSkgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIG1hdGNoZXMucHVzaChtYXRjaClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vRm9yIGVhY2ggdGV4dCBub2RlLCBnZXQgdGhlIGFycmF5IG9mIG1hdGNoZXMuIFxuICAgICAgICAgICAgLy9BIG1hdGNoIGlzIGFuIGFycmF5IGl0c2VsZiwgd2l0aCBtYXRjaFswXSBiZWluZyB0aGUgbWF0Y2ggYW5kIG1hdGNoWzFdIGJlaW5nIHRoZSBjYXB0dXJlZCBwYXJ0XG4gICAgICAgICAgICAvL0FkZGl0aW9uYWxseSBpdCBoYXMgdGhlIGluZGV4IGFuZCB0aGUgaW5wdXQgYXMgcHJvcGVydGllcy5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGN1cnJlbnRUZXh0Tm9kZSA9IGZ1bGxUZXh0Tm9kZTtcbiAgICAgICAgICAgIHZhciBjdXJyZW50U3RyaW5nID0gZnVsbFRleHROb2RlLnRleHRDb250ZW50O1xuICAgICAgICAgICAgdmFyIHByZXZOb2Rlc0xlbmd0aCA9IDA7XG5cbiAgICAgICAgICAgIC8vRm9yIGVhY2ggbWF0Y2gsIHNwbGl0IHRoZSB0ZXh0IG5vZGUgaW50byBtdWx0aXBsZSB0ZXh0IG5vZGVzIChpbiBjYXNlIHRoZXJlIGFyZSBtdWx0aXBsZSBzdWJWaWV3cyBpbiBhIHRleHROb2RlKS5cbiAgICAgICAgICAgIC8vVGhlbiwgYWRkIGVhY2ggdGV4dE5vZGUgb2Yge3tzdWJWaWV3fX0gdG8gdGhpcy5fc3ViVmlld0VsZW1lbnRzLlxuICAgICAgICAgICAgbWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uKG1hdGNoKXtcbiAgICAgICAgICAgICAgICB2YXIgdmFyTm9kZSA9IGN1cnJlbnRUZXh0Tm9kZS5zcGxpdFRleHQobWF0Y2guaW5kZXggLSBwcmV2Tm9kZXNMZW5ndGgpO1xuICAgICAgICAgICAgICAgIHZhciBlbnRpcmVNYXRjaCA9IG1hdGNoWzBdXG4gICAgICAgICAgICAgICAgdmFyTm9kZS5tYXRjaCA9IG1hdGNoWzFdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5wdXNoKHZhck5vZGUpO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRUZXh0Tm9kZSA9IHZhck5vZGUuc3BsaXRUZXh0KGVudGlyZU1hdGNoLmxlbmd0aClcbiAgICAgICAgICAgICAgICBjdXJyZW50U3RyaW5nID0gY3VycmVudFRleHROb2RlLnRleHRDb250ZW50O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHByZXZOb2Rlc0xlbmd0aD1tYXRjaC5pbmRleCArIGVudGlyZU1hdGNoLmxlbmd0aDsvL05vdGU6IFRoaXMgd29ya3MgYWNjaWRlbnRhbGx5LiBNaWdodCBiZSB3cm9uZy5cbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgIFxuXG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgfSxcbiAgICBpbml0RGlyZWN0aXZlczpmdW5jdGlvbigpe1xuXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB0aGlzLmRpcmVjdGl2ZSA9IHt9O1xuXG4gICAgICAgXG5cblxuICAgICAgICBmb3IgKHZhciBkaXJlY3RpdmVOYW1lIGluIERpcmVjdGl2ZVJlZ2lzdHJ5KXtcbiAgICAgICAgICAgIHZhciBfX3Byb3RvID0gRGlyZWN0aXZlUmVnaXN0cnlbZGlyZWN0aXZlTmFtZV0ucHJvdG90eXBlXG4gICAgICAgICAgICBpZiAoX19wcm90byBpbnN0YW5jZW9mIERpcmVjdGl2ZSl7IC8vYmVjYXVzZSBmb3JlYWNoIHdpbGwgZ2V0IG1vcmUgdGhhbiBqdXN0IG90aGVyIGRpcmVjdGl2ZXNcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IF9fcHJvdG8ubmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgZWxlbWVudHMgPSAodGhpcy4kZWwpPyQubWFrZUFycmF5KHRoaXMuJGVsLmZpbmQoXCJbbm0tXCIrbmFtZStcIl1cIikpOiQubWFrZUFycmF5KCQodGhpcy5lbC5xdWVyeVNlbGVjdG9yQWxsKFwiW25tLVwiK25hbWUrXCJdXCIpKSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlyZWN0aXZlW25hbWVdID0gZWxlbWVudHMubWFwKGZ1bmN0aW9uKGVsZW1lbnQsaSxlbGVtZW50cyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL29uIHRoZSBzZWNvbmQgZ28tYXJvdW5kIGZvciBubS1tYXAsIGRpcmVjdGl2ZU5hbWUgc29tZWhvdyBpcyBjYWxsZWQgXCJTdWJWaWV3XCJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGlyZWN0aXZlUmVnaXN0cnlbZGlyZWN0aXZlTmFtZV0oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc6dGhpcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbDplbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbDplbGVtZW50LmdldEF0dHJpYnV0ZShcIm5tLVwiK25hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTsgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9ICAgXG5cbiAgICAgICAgXG5cbiAgICAgICBcbiAgICAgXG5cbiAgICAgICBcblxuXG4gICAgICAgIFxuICAgIH0sXG4gICAgcmVuZGVyZWRUZW1wbGF0ZTpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy5qc3QpIHtcbiAgICAgICAgICAgIHdpbmRvdy5fID0gXztcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmpzdCh0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHJldHVybiBfLnRlbXBsYXRlKHRoaXMudGVtcGxhdGVTdHJpbmcpKHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXMpXG4gICAgfSxcbiAgICBkZWxlZ2F0ZUV2ZW50czogZnVuY3Rpb24oZXZlbnRzKSB7Ly9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xMjE5MzA2OS8xNzYzMjE3XG4gICAgICAgIHZhciBkZWxlZ2F0ZUV2ZW50U3BsaXR0ZXIgPSAvXihcXFMrKVxccyooLiopJC87XG4gICAgICAgIGV2ZW50cyB8fCAoZXZlbnRzID0gXy5yZXN1bHQodGhpcywgJ2V2ZW50cycpKTsgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICBpZiAoIWV2ZW50cykgcmV0dXJuIHRoaXM7XG4gICAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gZXZlbnRzKSB7XG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gZXZlbnRzW2tleV07XG4gICAgICAgICAgICBpZiAoIV8uaXNGdW5jdGlvbihtZXRob2QpKSBtZXRob2QgPSB0aGlzW2V2ZW50c1trZXldXTtcbiAgICAgICAgICAgIGlmICghbWV0aG9kKSB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBcIicgKyBldmVudHNba2V5XSArICdcIiBkb2VzIG5vdCBleGlzdCcpO1xuICAgICAgICAgICAgdmFyIG1hdGNoID0ga2V5Lm1hdGNoKGRlbGVnYXRlRXZlbnRTcGxpdHRlcik7XG4gICAgICAgICAgICB2YXIgZXZlbnRUeXBlcyA9IG1hdGNoWzFdLnNwbGl0KCcsJyksIHNlbGVjdG9yID0gbWF0Y2hbMl07XG4gICAgICAgICAgICBtZXRob2QgPSBfLmJpbmQobWV0aG9kLCB0aGlzKTtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIF8oZXZlbnRUeXBlcykuZWFjaChmdW5jdGlvbihldmVudE5hbWUpIHtcbiAgICAgICAgICAgICAgICBldmVudE5hbWUgKz0gJy5kZWxlZ2F0ZUV2ZW50cycgKyBzZWxmLmNpZDtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgc2VsZi4kZWwuYmluZChldmVudE5hbWUsIG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kZWwuZGVsZWdhdGUoc2VsZWN0b3IsIGV2ZW50TmFtZSwgbWV0aG9kKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIFxuICAgICAgIFxuICAgIH0sXG5cblxuXG5cbiAgICB0YWdOYW1lOnVuZGVmaW5lZCwvL2Rvbid0IHdhbnQgYSB0YWdOYW1lIHRvIGJlIGRpdiBieSBkZWZhdWx0LiBSYXRoZXIsIG1ha2UgaXQgYSBkb2N1bWVudGZyYWdtZW50J1xuICAgIHN1YlZpZXdJbXBvcnRzOnt9LFxuICAgIF9lbnN1cmVFbGVtZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vT3ZlcnJpZGluZyB0aGlzIHRvIHN1cHBvcnQgZG9jdW1lbnQgZnJhZ21lbnRzXG4gICAgICAgIGlmICghdGhpcy5lbCkge1xuICAgICAgICAgICAgaWYodGhpcy5hdHRyaWJ1dGVzIHx8IHRoaXMuaWQgfHwgdGhpcy5jbGFzc05hbWUgfHwgdGhpcy50YWdOYW1lKXsvL2lmIHlvdSBoYXZlIGFueSBvZiB0aGVzZSBiYWNrYm9uZSBwcm9wZXJ0aWVzLCBkbyBiYWNrYm9uZSBiZWhhdmlvclxuICAgICAgICAgICAgICAgICAgICB2YXIgYXR0cnMgPSBfLmV4dGVuZCh7fSwgXy5yZXN1bHQodGhpcywgJ2F0dHJpYnV0ZXMnKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlkKSBhdHRycy5pZCA9IF8ucmVzdWx0KHRoaXMsICdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jbGFzc05hbWUpIGF0dHJzWydjbGFzcyddID0gXy5yZXN1bHQodGhpcywgJ2NsYXNzTmFtZScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEVsZW1lbnQodGhpcy5fY3JlYXRlRWxlbWVudChfLnJlc3VsdCh0aGlzLCAndGFnTmFtZScpIHx8ICdkaXYnKSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3NldEF0dHJpYnV0ZXMoYXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXsvL2hvd2V2ZXIsIGRlZmF1bHQgdG8gdGhpcy5lbCBiZWluZyBhIGRvY3VtZW50ZnJhZ21lbnQgKG1ha2VzIHRoaXMuZWwgbmFtZWQgaW1wcm9wZXJseSBidXQgd2hhdGV2ZXIpXG4gICAgICAgICAgICAgICAgdGhpcy5lbCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChfLnJlc3VsdCh0aGlzLCAnZWwnKSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHNldDpmdW5jdGlvbihvYmope1xuXG4gICAgICAgIHRoaXMudmlld01vZGVsLnNldChvYmopO1xuICAgIH0sXG4gICAgZ2V0OmZ1bmN0aW9uKHByb3Ape1xuICAgICAgICByZXR1cm4gdGhpcy52aWV3TW9kZWwuZ2V0KHByb3ApXG4gICAgfVxufSk7XG4iLCIvL1NhbWUgbW9kZWwsIGNvbGxlY3Rpb24gaW4gc2FtZSBmaWxlIGZvciBub3cgYmVjYXVzZSB0aGVzZSBtb2R1bGVzIHJlbHkgb24gZWFjaCBvdGhlci5cblxuLyppbXBvcnQgXyBmcm9tIFwidW5kZXJzY29yZVwiOyovXG4vKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuaW1wb3J0IE1vZGVsIGZyb20gXCIuL01vZGVsXCI7XG5pbXBvcnQgVmlld01vZGVsIGZyb20gXCIuL1ZpZXdNb2RlbFwiO1xuaW1wb3J0IENvbGxlY3Rpb24gZnJvbSBcIi4vQ29sbGVjdGlvblwiO1xuaW1wb3J0IFZpZXcgZnJvbSBcIi4vVmlld1wiO1xuaW1wb3J0IERpcmVjdGl2ZVJlZ2lzdHJ5IGZyb20gXCIuL2RpcmVjdGl2ZS9kaXJlY3RpdmVSZWdpc3RyeVwiO1xuLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cblxudmFyIEZhaml0YSA9IHtNb2RlbCwgVmlld01vZGVsLCBDb2xsZWN0aW9uLCBWaWV3LCBEaXJlY3RpdmVSZWdpc3RyeX07XG5GYWppdGFbXCLwn4yuXCJdID0gXCIwLjAuMFwiO1xuXG5pZiAodHlwZW9mIHdpbmRvdyE9PVwidW5kZWZpbmVkXCIpIHdpbmRvdy5GYWppdGEgPSBGYWppdGE7XG5pZiAodHlwZW9mIGdsb2JhbCE9PVwidW5kZWZpbmVkXCIpIGdsb2JhbC5GYWppdGEgPSBGYWppdGE7Il0sIm5hbWVzIjpbIkJhY2tib25lIiwiTW9kZWwiLCJleHRlbmQiLCJvcHRpb25zIiwiVVJMU2VhcmNoUGFyYW1zIiwicXVlcnkiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlYXJjaCIsInN0cnVjdHVyZSIsInBhcmVudE1vZGVscyIsImluaXQiLCJhdHRyIiwiXyIsImlzU3RyaW5nIiwicHJvcHMiLCJzcGxpdCIsImxlbmd0aCIsIm1vZGVsIiwic2xpY2UiLCJmb3JFYWNoIiwicHJvcCIsImdldCIsInByb3RvdHlwZSIsImFwcGx5IiwiYXJndW1lbnRzIiwiaXNVbmRlZmluZWQiLCJrZXkiLCJ2YWwxIiwidmFsMiIsInNldCIsInZhbCIsImkiLCJuZXdNb2RlbCIsIkZhaml0YSIsImlzQXJyYXkiLCJDb2xsZWN0aW9uIiwicHVzaCIsImxpc3RlblRvIiwidHJpZ2dlciIsIm9uIiwiVmlldyIsIm5hbWUiLCJjb25zb2xlIiwiZXJyb3IiLCJ2aWV3IiwiY2hpbGRJbml0IiwiYnVpbGQiLCJ1cGRhdGVSZXN1bHQiLCJ2aWV3TW9kZWwiLCJyZW5kZXIiLCJyZXN1bHQiLCJpc0Z1bmN0aW9uIiwiY2FsbCIsIkRpcmVjdGl2ZSIsIiRlbCIsImVsIiwic2V0QXR0cmlidXRlIiwiaW5uZXJIVE1MIiwidmFsdWUiLCJwYXNzIiwiZ2V0QXR0cmlidXRlIiwiJCIsImEiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJjbGFzc0xpc3QiLCJhZGQiLCJ3cmFwcGVyQSIsInBhcmVudE5vZGUiLCJyZXBsYWNlQ2hpbGQiLCJhcHBlbmRDaGlsZCIsInBhcmVudCIsImFyZ3MiLCJzdWJWaWV3TmFtZSIsInN1Yk1vZGVsTmFtZSIsInN1Yk1vZGVsIiwic3ViQ29sbGVjdGlvbiIsIkFic3RyYWN0U3VidmlldyIsInJlbmRlckFkZCIsInJlbmRlclJlc2V0IiwicmVuZGVyUmVtb3ZlIiwicmVuZGVyU29ydCIsIkNoaWxkVmlldyIsImNoaWxkVmlld0ltcG9ydHMiLCJjaGlsZFZpZXdPcHRpb25zIiwiY2hpbGRNYXBwaW5ncyIsInRhZ05hbWUiLCJkZWZhdWx0c092ZXJyaWRlIiwiY2hpbGRWaWV3cyIsIm1hcCIsImNoaWxkTW9kZWwiLCJtb2RlbHMiLCJhdHRyaWJ1dGVzIiwiY2hpbGR2aWV3IiwiYmluZCIsIl9pbml0aWFsaXplQmFja2JvbmVPYmplY3QiLCJfaW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3MiLCJfaW5pdGlhbGl6ZWRlZmF1bHRzT3ZlcnJpZGUiLCJfaW5pdGlhbGl6ZUNoaWxkVmlld3MiLCJyZXBsYWNlV2l0aCIsInN1YlZpZXciLCIkY2hpbGRyZW4iLCJjaGlsZFZpZXciLCJpbmRleCIsImRlbGVnYXRlRXZlbnRzIiwiJHBhcmVudCIsImNoaWxkcmVuIiwiZWFjaCIsImV4aXN0aW5nQ2hpbGRWaWV3IiwiZmlsdGVyIiwibmV3Q2hpbGRWaWV3IiwiZW1wdHkiLCJjaGlsZCIsImFwcGVuZCIsImxhc3QiLCJyZW1vdmUiLCJzcGxpY2UiLCJjb250YWlucyIsImhpZGUiLCJjc3MiLCJib2R5IiwiRXJyb3IiLCJpcyIsIndyYXBwZXIiLCJjaGlsZE5vZGVzIiwidW53cmFwIiwiaW5zZXJ0QmVmb3JlIiwic3ViVmlld0ltcG9ydHMiLCJDaGlsZENvbnN0cnVjdG9yIiwidGVtcGxhdGVWYWx1ZXMiLCJjbGFzc2VzIiwiY2wiLCJwYXJlbnREaXJlY3RpdmUiLCJvcHRpb25zU2VudFRvU3ViVmlldyIsImNvbnRlbnQiLCJyZWdpc3RyeSIsIkRpcmVjdGl2ZUNvbnRlbnQiLCJEaXJlY3RpdmVFbmFibGUiLCJEaXJlY3RpdmVEaXNhYmxlIiwiRGlyZWN0aXZlSHJlZiIsIkRpcmVjdGl2ZU1hcCIsIkRpcmVjdGl2ZU9wdGlvbmFsIiwiRGlyZWN0aXZlT3B0aW9uYWxXcmFwIiwiRGlyZWN0aXZlU3JjIiwiRGlyZWN0aXZlU3VidmlldyIsIkRpcmVjdGl2ZURhdGEiLCJnZXRBbGxUZXh0Tm9kZXMiLCJuIiwid2FsayIsImNyZWF0ZVRyZWVXYWxrZXIiLCJOb2RlRmlsdGVyIiwiU0hPV19URVhUIiwibmV4dE5vZGUiLCJiYWNrYm9uZVZpZXdPcHRpb25zIiwiYWRkaXRpb25hbFZpZXdPcHRpb25zIiwiY29uc3RydWN0b3IiLCJ3YXJuIiwianN0IiwidGVtcGxhdGVTdHJpbmciLCJkZWZhdWx0cyIsInRlbXBsYXRlIiwicGljayIsImNvbmNhdCIsImRlZiIsImF0dHJzIiwiY2xvbmUiLCJWaWV3TW9kZWwiLCJ2aWV3Q29sbGVjdGlvbiIsIkFycmF5Iiwic3VidmlldyIsIm9iaiIsInVwZGF0ZVZpZXdNb2RlbCIsIl9zZXRBdHRyaWJ1dGVzIiwia2V5cyIsIk9iamVjdCIsIl9lbnN1cmVFbGVtZW50IiwiYnVpbGRJbm5lckhUTUwiLCJfc3ViVmlld0VsZW1lbnRzIiwiaW5pdERpcmVjdGl2ZXMiLCJfcGFyc2VUZXh0Tm9kZXMiLCJzdWJWaWV3RWxlbWVudCIsIm1hdGNoIiwibG9nIiwic3ViVmlld0NvbnN0cnVjdG9yIiwiY29udGV4dCIsImNvbGxlY3Rpb25PZlZpZXdzIiwiYXQiLCJhZnRlciIsImluaXRpYWxpemUiLCJtYXBPYmplY3QiLCJtb2RlbFZhciIsImh0bWwiLCJyZW5kZXJlZFRlbXBsYXRlIiwiZHVtbXlkaXYiLCJmdWxsVGV4dE5vZGUiLCJyZSIsIm1hdGNoZXMiLCJleGVjIiwidGV4dENvbnRlbnQiLCJjdXJyZW50VGV4dE5vZGUiLCJjdXJyZW50U3RyaW5nIiwicHJldk5vZGVzTGVuZ3RoIiwidmFyTm9kZSIsInNwbGl0VGV4dCIsImVudGlyZU1hdGNoIiwiZGlyZWN0aXZlIiwiZGlyZWN0aXZlTmFtZSIsIkRpcmVjdGl2ZVJlZ2lzdHJ5IiwiX19wcm90byIsImVsZW1lbnRzIiwibWFrZUFycmF5IiwiZmluZCIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJlbGVtZW50IiwiZXZlbnRzIiwiZGVsZWdhdGVFdmVudFNwbGl0dGVyIiwidW5kZWxlZ2F0ZUV2ZW50cyIsIm1ldGhvZCIsImV2ZW50VHlwZXMiLCJzZWxlY3RvciIsInNlbGYiLCJldmVudE5hbWUiLCJjaWQiLCJkZWxlZ2F0ZSIsInVuZGVmaW5lZCIsImlkIiwiY2xhc3NOYW1lIiwic2V0RWxlbWVudCIsIl9jcmVhdGVFbGVtZW50IiwiY3JlYXRlRG9jdW1lbnRGcmFnbWVudCIsImdsb2JhbCJdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7OztBQUlBLFlBQWVBLFNBQVNDLEtBQVQsQ0FBZUMsTUFBZixDQUFzQjs7Y0FFeEIsb0JBQVNDLE9BQVQsRUFBaUI7UUFDckIsT0FBT0MsZUFBUCxLQUEyQixXQUFoQyxFQUE2QztXQUN0Q0MsS0FBTCxHQUFhLElBQUlELGVBQUosQ0FBb0JFLE9BQU9DLFFBQVAsQ0FBZ0JDLE1BQXBDLENBQWI7Ozs7U0FNR0MsU0FBTCxHQUFpQixFQUFqQjs7U0FFS0MsWUFBTCxHQUFvQixFQUFwQjtTQUNLQyxJQUFMO0dBYmlDO1FBZTlCLGdCQUFVLEVBZm9COztPQWlCL0IsYUFBU0MsSUFBVCxFQUFjOzs7O1FBSVpDLEVBQUVDLFFBQUYsQ0FBV0YsSUFBWCxDQUFKLEVBQXFCO1VBQ2ZHLFFBQVFILEtBQUtJLEtBQUwsQ0FBVyxJQUFYLENBQVo7VUFDSUQsTUFBTUUsTUFBTixHQUFlLENBQW5CLEVBQXFCO1lBQ2ZDLFFBQVEsSUFBWjtjQUNNQyxLQUFOLENBQVksQ0FBWixFQUFlQyxPQUFmLENBQXVCLFVBQVNDLElBQVQsRUFBYztjQUMvQkgsTUFBTVQsU0FBTixDQUFnQlksSUFBaEIsQ0FBSixFQUEyQkgsUUFBUUEsTUFBTVQsU0FBTixDQUFnQlksSUFBaEIsQ0FBUjtTQUQ3QjtlQUdPSCxLQUFQOzs7UUFHQUksTUFBTXRCLFNBQVNDLEtBQVQsQ0FBZXNCLFNBQWYsQ0FBeUJELEdBQXpCLENBQTZCRSxLQUE3QixDQUFtQyxJQUFuQyxFQUF3Q0MsU0FBeEMsQ0FBVjtRQUNJLENBQUNaLEVBQUVhLFdBQUYsQ0FBY0osR0FBZCxDQUFMLEVBQXlCLE9BQU9BLEdBQVA7R0FoQ1E7VUF1QzVCLGdCQUFTSyxHQUFULEVBQWFDLElBQWIsRUFBa0JDLElBQWxCLEVBQXVCO1FBQ3hCLEtBQUtQLEdBQUwsQ0FBU0ssR0FBVCxLQUFlRSxJQUFuQixFQUF3QjtXQUNqQkMsR0FBTCxDQUFTSCxHQUFULEVBQWFDLElBQWI7S0FERixNQUdLLEtBQUtFLEdBQUwsQ0FBU0gsR0FBVCxFQUFhRSxJQUFiO0dBM0M0QjtPQTZDL0IsYUFBU2pCLElBQVQsRUFBZW1CLEdBQWYsRUFBb0I1QixPQUFwQixFQUE0Qjs7Ozs7UUFLMUJVLEVBQUVDLFFBQUYsQ0FBV0YsSUFBWCxDQUFKLEVBQXFCO1VBQ2ZHLFFBQVFILEtBQUtJLEtBQUwsQ0FBVyxJQUFYLENBQVo7VUFDSUQsTUFBTUUsTUFBTixHQUFlLENBQW5CLEVBQXFCO1lBQ2ZDLFFBQVEsSUFBWjtjQUNNQyxLQUFOLENBQVksQ0FBWixFQUFlQyxPQUFmLENBQXVCLFVBQVNDLElBQVQsRUFBY1csQ0FBZCxFQUFnQmpCLEtBQWhCLEVBQXNCO2NBQ3ZDRyxNQUFNVCxTQUFOLENBQWdCWSxJQUFoQixDQUFKLEVBQTJCSCxRQUFRQSxNQUFNVCxTQUFOLENBQWdCWSxJQUFoQixDQUFSLENBQTNCLEtBQ0s7Z0JBQ0NZLFFBQUo7Z0JBQ0lELElBQUlqQixNQUFNRSxNQUFOLEdBQWUsQ0FBdkIsRUFBeUI7eUJBQ1osSUFBSWlCLE9BQU9qQyxLQUFYLEVBQVg7YUFERixNQUdJO3lCQUNVWSxFQUFFc0IsT0FBRixDQUFVSixHQUFWLENBQUQsR0FBaUIsSUFBSUcsT0FBT0UsVUFBWCxDQUFzQkwsR0FBdEIsQ0FBakIsR0FBNEMsSUFBSUcsT0FBT2pDLEtBQVgsQ0FBaUI4QixHQUFqQixDQUF2RDs7cUJBRU9yQixZQUFULENBQXNCMkIsSUFBdEIsQ0FBMkJuQixLQUEzQjtrQkFDTVQsU0FBTixDQUFnQlksSUFBaEIsSUFBd0JZLFFBQXhCO2tCQUNNSyxRQUFOLENBQWVMLFFBQWYsRUFBd0IsWUFBeEIsRUFBcUMsVUFBU0EsUUFBVCxFQUFrQjlCLE9BQWxCLEVBQTBCO21CQUN4RG9DLE9BQUwsQ0FBYSxRQUFiOzs7Ozs7O2FBREY7O1NBWko7ZUE0Qk9yQixLQUFQOztLQWhDSixNQW1DSTthQUNLbEIsU0FBU0MsS0FBVCxDQUFlc0IsU0FBZixDQUF5Qk8sR0FBekIsQ0FBNkJOLEtBQTdCLENBQW1DLElBQW5DLEVBQXdDQyxTQUF4QyxDQUFQOzs7O0NBdEZTLENBQWY7O0FDSkEsZ0JBQWV6QixTQUFTQyxLQUFULENBQWVDLE1BQWYsQ0FBc0IsRUFBdEIsQ0FBZjs7QUNBQTs7QUFFQSxBQUVBLGlCQUFlRixTQUFTb0MsVUFBVCxDQUFvQmxDLE1BQXBCLENBQTJCO1dBQ2hDRCxLQURnQztnQkFFM0Isc0JBQVU7YUFDWFMsWUFBTCxHQUFvQixFQUFwQjs7YUFFSThCLEVBQUwsQ0FBUSxLQUFSLEVBQWMsVUFBU3RCLEtBQVQsRUFBZTtpQkFDcEJvQixRQUFMLENBQWNwQixLQUFkLEVBQW9CLFFBQXBCLEVBQTZCLFlBQVU7cUJBQzlCcUIsT0FBTCxDQUFhLFFBQWI7YUFESjtTQURKOztDQUxPLENBQWY7O0FDSkE7O0FBRUEsZ0JBQWV2QyxTQUFTeUMsSUFBVCxDQUFjdkMsTUFBZCxDQUFxQjtVQUMzQixJQUQyQjtXQUUxQixJQUYwQjtZQUd6QixJQUh5QjtnQkFJckIsb0JBQVNDLE9BQVQsRUFBaUI7WUFDcEIsQ0FBQyxLQUFLdUMsSUFBVixFQUFnQkMsUUFBUUMsS0FBUixDQUFjLG9EQUFkO2FBQ1hiLEdBQUwsR0FBVzVCLFFBQVE0QixHQUFuQjs7O1lBSUksQ0FBQzVCLFFBQVEwQyxJQUFiLEVBQW1CRixRQUFRQyxLQUFSLENBQWMsdURBQWQ7YUFDZEMsSUFBTCxHQUFZMUMsUUFBUTBDLElBQXBCO1lBQ0ksQ0FBQyxLQUFLQyxTQUFWLEVBQXFCSCxRQUFRQyxLQUFSLENBQWMsbURBQWQ7YUFDaEJFLFNBQUw7YUFDS0MsS0FBTDtLQWQ0QjtlQWdCdEIscUJBQVU7O2FBRVhDLFlBQUw7YUFDS1YsUUFBTCxDQUFjLEtBQUtPLElBQUwsQ0FBVUksU0FBeEIsRUFBa0MsWUFBVSxLQUFLbEIsR0FBakQsRUFBcUQsWUFBVTtpQkFDdERpQixZQUFMO2lCQUNLRSxNQUFMO1NBRko7S0FuQjRCO2tCQXlCbkIsd0JBQVU7WUFDZkMsU0FBUyxLQUFLTixJQUFMLENBQVV2QixHQUFWLENBQWMsS0FBS1MsR0FBbkIsQ0FBYjtZQUNJbEIsRUFBRXVDLFVBQUYsQ0FBYUQsTUFBYixDQUFKLEVBQTBCLEtBQUtBLE1BQUwsR0FBY0EsT0FBT0UsSUFBUCxDQUFZLEtBQUtSLElBQWpCLENBQWQsQ0FBMUIsS0FDSyxLQUFLTSxNQUFMLEdBQWNBLE1BQWQ7O0NBNUJFLENBQWY7O0FDQ0EsdUJBQWVHLFVBQVVwRCxNQUFWLENBQWlCO1VBQ3ZCLFNBRHVCO1dBRXRCLGlCQUFVO1lBQ1IsS0FBS3FELEdBQUwsQ0FBU2xDLElBQVQsQ0FBYyxTQUFkLEtBQTBCLEtBQTlCLEVBQXFDLEtBQUttQyxFQUFMLENBQVFDLFlBQVIsQ0FBcUIsT0FBckIsRUFBNkIsS0FBS04sTUFBbEMsRUFBckMsS0FDSyxLQUFLSyxFQUFMLENBQVFFLFNBQVIsR0FBb0IsS0FBS1AsTUFBekI7S0FKbUI7WUFNckIsa0JBQVU7YUFDUkosS0FBTDtLQVB3QjtVQVN2QixjQUFTWSxLQUFULEVBQWU7WUFDWkMsT0FBTyxLQUFYO1lBQ0ksS0FBS0wsR0FBTCxDQUFTbEMsSUFBVCxDQUFjLFNBQWQsS0FBMEIsS0FBOUIsRUFBcUM7Z0JBQzdCLEtBQUttQyxFQUFMLENBQVFLLFlBQVIsQ0FBcUIsT0FBckIsS0FBK0JGLFFBQVEsRUFBM0MsRUFBK0NDLE9BQU8sSUFBUDtTQURuRCxNQUdLLElBQUksS0FBS0osRUFBTCxDQUFRRSxTQUFSLElBQW1CQyxRQUFNLEVBQTdCLEVBQWlDQyxPQUFPLElBQVA7O2VBRS9CQSxJQUFQOztDQWhCTyxDQUFmOztBQ0hBOztBQUVBLEFBRUEsc0JBQWVOLFVBQVVwRCxNQUFWLENBQWlCO1VBQ3ZCLFFBRHVCO1dBRXRCLGlCQUFVO1lBQ1IsQ0FBQyxLQUFLaUQsTUFBVixFQUFrQlcsRUFBRSxLQUFLTixFQUFQLEVBQVduQyxJQUFYLENBQWdCLFVBQWhCLEVBQTJCLElBQTNCLEVBQWxCLEtBQ0t5QyxFQUFFLEtBQUtOLEVBQVAsRUFBV25DLElBQVgsQ0FBZ0IsVUFBaEIsRUFBMkIsRUFBM0I7S0FKbUI7WUFNckIsa0JBQVU7WUFDVCxDQUFDLEtBQUs4QixNQUFWLEVBQWtCVyxFQUFFLEtBQUtOLEVBQVAsRUFBV25DLElBQVgsQ0FBZ0IsVUFBaEIsRUFBMkIsSUFBM0IsRUFBbEIsS0FDS3lDLEVBQUUsS0FBS04sRUFBUCxFQUFXbkMsSUFBWCxDQUFnQixVQUFoQixFQUEyQixFQUEzQjtLQVJtQjtVQVV2QixjQUFTc0MsS0FBVCxFQUFlO2VBQ1RHLEVBQUUsS0FBS04sRUFBUCxFQUFXbkMsSUFBWCxDQUFnQixVQUFoQixLQUE2QnNDLEtBQXBDOztDQVhPLENBQWY7O0FDSkE7O0FBRUEsQUFFQSx1QkFBZUwsVUFBVXBELE1BQVYsQ0FBaUI7VUFDdkIsU0FEdUI7V0FFdEIsaUJBQVU7WUFDUixLQUFLaUQsTUFBVCxFQUFpQlcsRUFBRSxLQUFLTixFQUFQLEVBQVduQyxJQUFYLENBQWdCLFVBQWhCLEVBQTJCLElBQTNCLEVBQWpCLEtBQ0t5QyxFQUFFLEtBQUtOLEVBQVAsRUFBV25DLElBQVgsQ0FBZ0IsVUFBaEIsRUFBMkIsRUFBM0I7S0FKbUI7WUFNckIsa0JBQVU7WUFDVCxLQUFLOEIsTUFBVCxFQUFpQlcsRUFBRSxLQUFLTixFQUFQLEVBQVduQyxJQUFYLENBQWdCLFVBQWhCLEVBQTJCLElBQTNCLEVBQWpCLEtBQ0t5QyxFQUFFLEtBQUtOLEVBQVAsRUFBV25DLElBQVgsQ0FBZ0IsVUFBaEIsRUFBMkIsRUFBM0I7S0FSbUI7VUFVdkIsY0FBU3NDLEtBQVQsRUFBZTtlQUNURyxFQUFFLEtBQUtOLEVBQVAsRUFBV25DLElBQVgsQ0FBZ0IsVUFBaEIsS0FBNkJzQyxLQUFwQzs7Q0FYTyxDQUFmOztBQ0ZBLG9CQUFlTCxVQUFVcEQsTUFBVixDQUFpQjtVQUN2QixNQUR1Qjs7V0FHdEIsaUJBQVU7WUFDUixLQUFLcUQsR0FBTCxDQUFTbEMsSUFBVCxDQUFjLFNBQWQsS0FBMEIsR0FBOUIsRUFBbUMsS0FBS2tDLEdBQUwsQ0FBUzNDLElBQVQsQ0FBYyxNQUFkLEVBQXFCLEtBQUt1QyxNQUExQixFQUFuQyxLQUNLO2dCQUNHWSxJQUFJQyxTQUFTQyxhQUFULENBQXVCLEdBQXZCLENBQVI7Y0FDRUMsU0FBRixDQUFZQyxHQUFaLENBQWdCLFdBQWhCO2NBQ0VWLFlBQUYsQ0FBZSxNQUFmLEVBQXNCLEtBQUtOLE1BQTNCO2lCQUNLaUIsUUFBTCxHQUFnQkwsQ0FBaEI7aUJBQ0tQLEVBQUwsQ0FBUWEsVUFBUixDQUFtQkMsWUFBbkIsQ0FBZ0MsS0FBS0YsUUFBckMsRUFBOEMsS0FBS1osRUFBbkQ7OztpQkFHS1ksUUFBTCxDQUFjRyxXQUFkLENBQTBCLEtBQUtmLEVBQS9COztlQUVHWSxRQUFQLEdBQWtCLEtBQUtBLFFBQXZCO0tBZndCO1lBaUJyQixrQkFBVTtZQUNULEtBQUtiLEdBQUwsQ0FBU2xDLElBQVQsQ0FBYyxTQUFkLEtBQTBCLEdBQTlCLEVBQW1DeUMsRUFBRSxLQUFLTixFQUFQLEVBQVc1QyxJQUFYLENBQWdCLE1BQWhCLEVBQXVCLEtBQUt1QyxNQUE1QixFQUFuQyxLQUNLO2lCQUNJaUIsUUFBTCxDQUFjWCxZQUFkLENBQTJCLE1BQTNCLEVBQWtDLEtBQUtOLE1BQXZDOztLQXBCb0I7VUF1QnZCLGNBQVNRLEtBQVQsRUFBZTtZQUNaLEtBQUtKLEdBQUwsQ0FBU2xDLElBQVQsQ0FBYyxTQUFkLEtBQTBCLEdBQTlCLEVBQW1DLE9BQU95QyxFQUFFLEtBQUtOLEVBQVAsRUFBVzVDLElBQVgsQ0FBZ0IsTUFBaEIsS0FBeUIrQyxLQUFoQyxDQUFuQyxLQUNLO21CQUNNRyxFQUFFLEtBQUtOLEVBQVAsRUFBV2dCLE1BQVgsR0FBb0JuRCxJQUFwQixDQUF5QixTQUF6QixLQUFxQyxHQUFyQyxJQUE0Q3lDLEVBQUUsS0FBS04sRUFBUCxFQUFXZ0IsTUFBWCxHQUFvQjVELElBQXBCLENBQXlCLE1BQXpCLEtBQWtDK0MsS0FBckY7OztDQTFCRyxDQUFmOztBQ0FBLHNCQUFlTCxVQUFVcEQsTUFBVixDQUFpQjtVQUN2QixpQkFEdUI7K0JBRUYscUNBQVU7WUFDNUJ1RSxPQUFPLEtBQUsxQyxHQUFMLENBQVNmLEtBQVQsQ0FBZSxHQUFmLENBQVg7YUFDSzBELFdBQUwsR0FBbUJELEtBQUssQ0FBTCxDQUFuQjtZQUNLQSxLQUFLLENBQUwsQ0FBSixFQUFZO2lCQUNKRSxZQUFMLEdBQW9CRixLQUFLLENBQUwsQ0FBcEI7Z0JBQ0l2RCxRQUFRLEtBQUsyQixJQUFMLENBQVV2QixHQUFWLENBQWMsS0FBS29ELFdBQW5CLENBQVosQ0FGUztnQkFHTHhELGlCQUFpQmxCLFNBQVNDLEtBQTlCLEVBQXFDLEtBQUsyRSxRQUFMLEdBQWdCMUQsS0FBaEIsQ0FBckMsS0FDSyxJQUFJQSxpQkFBaUJsQixTQUFTb0MsVUFBOUIsRUFBMEMsS0FBS3lDLGFBQUwsR0FBcUIzRCxLQUFyQjs7Ozs7S0FUM0I7OzJCQWtCTixpQ0FBVTtDQWxCckIsQ0FBZjs7QUNGQTtBQUNBLEFBQ0EsQUFDQSxtQkFBZTRELGdCQUFnQjVFLE1BQWhCLENBQXVCO1VBQzdCLEtBRDZCOzJCQUVaLGlDQUFVOzthQUl2Qm9DLFFBQUwsQ0FBYyxLQUFLdUMsYUFBbkIsRUFBaUMsS0FBakMsRUFBdUMsWUFBVTtpQkFDeENFLFNBQUw7U0FESjs7YUFJS3pDLFFBQUwsQ0FBYyxLQUFLdUMsYUFBbkIsRUFBaUMsT0FBakMsRUFBeUMsWUFBVTtpQkFDMUNHLFdBQUw7U0FESjs7YUFJSzFDLFFBQUwsQ0FBYyxLQUFLdUMsYUFBbkIsRUFBaUMsUUFBakMsRUFBMEMsWUFBVTtpQkFDM0NJLFlBQUw7U0FESjs7YUFJSzNDLFFBQUwsQ0FBYyxLQUFLdUMsYUFBbkIsRUFBaUMsTUFBakMsRUFBd0MsWUFBVTtpQkFDekNLLFVBQUw7U0FESjs7O2FBT0tDLFNBQUwsR0FBaUIsS0FBS3RDLElBQUwsQ0FBVXVDLGdCQUFWLENBQTJCLEtBQUtWLFdBQWhDLENBQWpCO2FBQ0tXLGdCQUFMLEdBQXdCOzRCQUNMLEtBQUtDLGFBREE7d0JBRVQsS0FBS1QsYUFGSTtxQkFHWixLQUFLaEMsSUFBTCxDQUFVdUMsZ0JBQVYsQ0FBMkIsS0FBS1YsV0FBaEMsRUFBNkNuRCxTQUE3QyxDQUF1RGdFLE9BQXZELElBQWtFLFNBSHREOzhCQUlILEtBQUtDO1NBSjFCOzthQVFLQyxVQUFMLEdBQWtCLEtBQUtaLGFBQUwsQ0FBbUJhLEdBQW5CLENBQXVCLFVBQVNDLFVBQVQsRUFBb0IzRCxDQUFwQixFQUFzQjs7Z0JBRXZEcUQsbUJBQW1CeEUsRUFBRVgsTUFBRixDQUFTLEVBQVQsRUFBWSxLQUFLbUYsZ0JBQWpCLEVBQWtDO3VCQUMvQ00sVUFEK0M7dUJBRS9DM0QsQ0FGK0M7MkJBRzNDLEtBQUs2QyxhQUFMLENBQW1CNUQsTUFBbkIsR0FBNEJlLENBQTVCLEdBQWdDLENBSFc7a0NBSXBDLEtBQUt3RCxnQkFBTCxJQUF5QixLQUFLQSxnQkFBTCxDQUFzQkksTUFBdEIsQ0FBNkI1RCxDQUE3QixDQUF6QixJQUE0RCxLQUFLd0QsZ0JBQUwsQ0FBc0JJLE1BQXRCLENBQTZCNUQsQ0FBN0IsRUFBZ0M2RDthQUoxRixDQUF2Qjs7Z0JBUUlDLFlBQVksSUFBSSxLQUFLWCxTQUFULENBQW1CRSxnQkFBbkIsQ0FBaEI7O21CQUVPUyxTQUFQO1NBWnFDLENBYXZDQyxJQWJ1QyxDQWFsQyxJQWJrQyxDQUF2QixDQUFsQjtLQWxDOEI7ZUFrRHhCLHFCQUFVO2FBQ1hDLHlCQUFMO2FBQ0tDLHdCQUFMO2FBQ0tDLDJCQUFMO2FBQ0tDLHFCQUFMO0tBdEQ4QjtXQW1FNUIsaUJBQVU7WUFDUixDQUFDLEtBQUt0QixhQUFWLEVBQXdCO2lCQUNmdEIsR0FBTCxDQUFTNkMsV0FBVCxDQUFxQixLQUFLQyxPQUFMLENBQWE3QyxFQUFsQztTQURKLE1BR0k7Z0JBQ0k4QyxZQUFZeEMsR0FBaEI7aUJBQ0syQixVQUFMLENBQWdCckUsT0FBaEIsQ0FBd0IsVUFBU21GLFNBQVQsRUFBbUJ2RSxDQUFuQixFQUFxQjs0QkFDN0JzRSxVQUFVbkMsR0FBVixDQUFjb0MsVUFBVS9DLEVBQXhCLENBQVo7MEJBQ1VnRCxLQUFWLEdBQWtCeEUsQ0FBbEI7YUFGb0IsQ0FHdEIrRCxJQUhzQixDQUdqQixJQUhpQixDQUF4QjtnQkFJSU8sVUFBVXJGLE1BQWQsRUFBc0I7cUJBQ2JzQyxHQUFMLENBQVM2QyxXQUFULENBQXFCRSxTQUFyQjtxQkFDS2IsVUFBTCxDQUFnQnJFLE9BQWhCLENBQXdCLFVBQVNtRixTQUFULEVBQW1CdkUsQ0FBbkIsRUFBcUI7OEJBQy9CeUUsY0FBVjtpQkFESjtxQkFHS0MsT0FBTCxHQUFlSixVQUFVOUIsTUFBVixFQUFmO2FBTEosTUFPSTtxQkFDS2tDLE9BQUwsR0FBZSxLQUFLbkQsR0FBTCxDQUFTaUIsTUFBVCxFQUFmOztpQkFFQzhCLFNBQUwsR0FBaUJBLFNBQWpCOztLQXZGMEI7ZUEwRnhCLHFCQUFVO1lBQ1pLLFdBQVcsRUFBZjthQUNLOUIsYUFBTCxDQUFtQitCLElBQW5CLENBQXdCLFVBQVMxRixLQUFULEVBQWVjLENBQWYsRUFBaUI7Z0JBQ2pDNkUsb0JBQW9CLEtBQUtwQixVQUFMLENBQWdCcUIsTUFBaEIsQ0FBdUIsVUFBU1AsU0FBVCxFQUFtQjt1QkFDdkRBLFVBQVVyRixLQUFWLElBQW1CQSxLQUExQjthQURvQixFQUVyQixDQUZxQixDQUF4QjtnQkFHSTJGLGlCQUFKLEVBQXVCO3lCQUNWeEUsSUFBVCxDQUFjd0Usa0JBQWtCckQsRUFBaEM7OzthQURKLE1BS0s7b0JBQ0d1RCxlQUFlLElBQUksS0FBSzVCLFNBQVQsQ0FBbUI7MkJBQzVCakUsS0FENEI7b0NBRW5CLEtBQUtvRSxhQUZjOzJCQUc1QnRELENBSDRCOytCQUl4QixLQUFLNkMsYUFBTCxDQUFtQjVELE1BQW5CLEdBQTRCZSxDQUE1QixHQUFnQyxDQUpSO2dDQUt2QixLQUFLNkMsYUFMa0I7MEJBTTdCLEtBQUtoQyxJQUFMLENBQVV2QixHQUFWLENBQWMsS0FBS1MsR0FBTCxDQUFTZixLQUFULENBQWUsR0FBZixFQUFvQixDQUFwQixDQUFkLEVBQXNDZ0IsQ0FBdEM7aUJBTlUsQ0FBbkI7cUJBUUt5RCxVQUFMLENBQWdCcEQsSUFBaEIsQ0FBcUIwRSxZQUFyQjt5QkFDUzFFLElBQVQsQ0FBYzBFLGFBQWF2RCxFQUEzQjs7U0FuQmdCLENBc0J0QnVDLElBdEJzQixDQXNCakIsSUF0QmlCLENBQXhCO2FBdUJLVyxPQUFMLENBQWFNLEtBQWI7aUJBQ1M1RixPQUFULENBQWlCLFVBQVM2RixLQUFULEVBQWU7aUJBQ3ZCUCxPQUFMLENBQWFRLE1BQWIsQ0FBb0JELEtBQXBCO1NBRGEsQ0FFZmxCLElBRmUsQ0FFVixJQUZVLENBQWpCO2FBR0tPLFNBQUwsR0FBaUJ4QyxFQUFFNkMsUUFBRixDQUFqQjs7YUFFS2xCLFVBQUwsQ0FBZ0JyRSxPQUFoQixDQUF3QixVQUFTbUYsU0FBVCxFQUFtQnZFLENBQW5CLEVBQXFCO3NCQUMvQnlFLGNBQVY7U0FESjtLQXpIOEI7aUJBOEh0Qix1QkFBVTthQUNiQyxPQUFMLENBQWFNLEtBQWI7S0EvSDhCO2tCQWlJckIsd0JBQVU7YUFDZFYsU0FBTCxDQUFlYSxJQUFmLEdBQXNCQyxNQUF0QjthQUNLM0IsVUFBTCxDQUFnQjRCLE1BQWhCLENBQXVCLENBQUMsQ0FBeEIsRUFBMEIsQ0FBMUI7YUFDS2YsU0FBTCxHQUFpQixLQUFLSSxPQUFMLENBQWFDLFFBQWIsRUFBakI7S0FwSThCO2dCQXNJdkIsc0JBQVU7OztLQXRJYTtVQTBJN0IsZ0JBQVU7Ozs7O1lBS1AsS0FBS04sT0FBVCxFQUFpQjs7bUJBRU4sS0FBS3hELElBQUwsQ0FBVVcsRUFBVixDQUFhOEQsUUFBYixDQUFzQixLQUFLakIsT0FBTCxDQUFhN0MsRUFBYixDQUFnQmEsVUFBdEMsQ0FBUDtTQUZKLE1BSUk7Z0JBQ0lULE9BQU8sSUFBWDtnQkFDSUosS0FBSyxLQUFLWCxJQUFMLENBQVVXLEVBQW5CO2lCQUNLOEMsU0FBTCxDQUFlTSxJQUFmLENBQW9CLFlBQVU7b0JBQ3RCLENBQUNwRCxHQUFHOEQsUUFBSCxDQUFZLElBQVosQ0FBTCxFQUF3QjFELE9BQU8sS0FBUDthQUQ1QjttQkFHTUEsSUFBUDs7O0NBekpJLENBQWY7O0FDSEE7QUFDQSxBQUVBLHdCQUFlTixVQUFVcEQsTUFBVixDQUFpQjtVQUN2QixVQUR1Qjs7V0FHdEIsaUJBQVU7WUFDUixDQUFDLEtBQUtpRCxNQUFWLEVBQWtCVyxFQUFFLEtBQUtOLEVBQVAsRUFBVytELElBQVgsR0FBbEIsS0FDS3pELEVBQUUsS0FBS04sRUFBUCxFQUFXZ0UsR0FBWCxDQUFlLFNBQWYsRUFBeUIsRUFBekI7S0FMbUI7WUFPckIsa0JBQVU7WUFDVCxDQUFDLEtBQUtyRSxNQUFWLEVBQWtCVyxFQUFFLEtBQUtOLEVBQVAsRUFBVytELElBQVgsR0FBbEIsS0FDS3pELEVBQUUsS0FBS04sRUFBUCxFQUFXZ0UsR0FBWCxDQUFlLFNBQWYsRUFBeUIsRUFBekI7S0FUbUI7VUFXdkIsY0FBUzdELEtBQVQsRUFBZTtZQUNaLENBQUNLLFNBQVN5RCxJQUFULENBQWNILFFBQWQsQ0FBdUIsS0FBSzlELEVBQTVCLENBQUwsRUFBc0MsTUFBTWtFLE1BQU0sK0NBQU4sQ0FBTjtlQUMvQjVELEVBQUUsS0FBS04sRUFBUCxFQUFXbUUsRUFBWCxDQUFjLFVBQWQsS0FBMkJoRSxLQUFsQzs7Q0FiTyxDQUFmOztBQ0RBLDRCQUFlTCxVQUFVcEQsTUFBVixDQUFpQjtVQUN2QixjQUR1QjtlQUVsQixxQkFBVTtrQkFDTnFCLFNBQVYsQ0FBb0J1QixTQUFwQixDQUE4Qk8sSUFBOUIsQ0FBbUMsSUFBbkMsRUFBd0M1QixTQUF4Qzs7YUFFS21HLE9BQUwsR0FBZSxLQUFLcEUsRUFBcEI7YUFDS3FFLFVBQUwsR0FBa0IsR0FBRzFHLEtBQUgsQ0FBU2tDLElBQVQsQ0FBYyxLQUFLRyxFQUFMLENBQVFxRSxVQUF0QixFQUFrQyxDQUFsQyxDQUFsQjtLQU53QjtXQVN0QixpQkFBVTtZQUNSLENBQUMsS0FBSzFFLE1BQVYsRUFBa0JXLEVBQUUsS0FBSytELFVBQVAsRUFBbUJDLE1BQW5CO0tBVk07WUFZckIsa0JBQVU7WUFDVCxDQUFDLEtBQUszRSxNQUFWLEVBQWlCO2NBQ1gsS0FBSzBFLFVBQVAsRUFBbUJDLE1BQW5CO1NBREosTUFHSztnQkFDRSxDQUFDOUQsU0FBU3lELElBQVQsQ0FBY0gsUUFBZCxDQUF1QixLQUFLTyxVQUFMLENBQWdCLENBQWhCLENBQXZCLENBQUwsRUFBZ0Q7d0JBQ25DakYsS0FBUixDQUFjLDhCQUFkOzthQURMLE1BSU0sSUFBSSxDQUFDb0IsU0FBU3lELElBQVQsQ0FBY0gsUUFBZCxDQUF1QixLQUFLTSxPQUE1QixDQUFMLEVBQTBDO3FCQUN0Q0MsVUFBTCxDQUFnQixDQUFoQixFQUFtQnhELFVBQW5CLENBQThCMEQsWUFBOUIsQ0FBMkMsS0FBS0gsT0FBaEQsRUFBd0QsS0FBS0MsVUFBTCxDQUFnQixDQUFoQixDQUF4RDs7aUJBRUEsSUFBSTdGLElBQUUsQ0FBVixFQUFZQSxJQUFFLEtBQUs2RixVQUFMLENBQWdCNUcsTUFBOUIsRUFBcUNlLEdBQXJDLEVBQXlDO3FCQUNoQzRGLE9BQUwsQ0FBYXJELFdBQWIsQ0FBeUIsS0FBS3NELFVBQUwsQ0FBZ0I3RixDQUFoQixDQUF6Qjs7O0tBekJnQjtVQTZCdkIsY0FBUzJCLEtBQVQsRUFBZTs7ZUFHUixLQUFLa0UsVUFBTCxDQUFnQixDQUFoQixFQUFtQnhELFVBQW5CLElBQStCLEtBQUt1RCxPQUFyQyxJQUFpRGpFLEtBQXhEOztDQWhDTyxDQUFmOztBQ0FBLG1CQUFlTCxVQUFVcEQsTUFBVixDQUFpQjtVQUN2QixLQUR1QjtXQUV0QixpQkFBVTthQUNQcUQsR0FBTCxDQUFTM0MsSUFBVCxDQUFjLEtBQWQsRUFBb0IsS0FBS3VDLE1BQXpCO0tBSHdCO1lBS3JCLGtCQUFVO2FBQ1JJLEdBQUwsQ0FBUzNDLElBQVQsQ0FBYyxLQUFkLEVBQW9CLEtBQUt1QyxNQUF6QjtLQU53QjtVQVF2QixjQUFTUSxLQUFULEVBQWU7ZUFDVCxLQUFLSixHQUFMLENBQVMzQyxJQUFULENBQWMsS0FBZCxNQUF1QitDLEtBQTlCOztDQVRPLENBQWY7O0FDRkE7Ozs7OztBQU1BLEFBQ0EsQUFDQSx1QkFBZW1CLGdCQUFnQjVFLE1BQWhCLENBQXVCO1VBQzdCLFNBRDZCOzJCQUVaLGlDQUFVOztZQUV4QixLQUFLMkMsSUFBTCxDQUFVbUYsY0FBVixDQUF5QixLQUFLdEQsV0FBOUIsRUFBMkNuRCxTQUEzQyxZQUFnRXZCLFNBQVN5QyxJQUE3RSxFQUFtRixLQUFLd0YsZ0JBQUwsR0FBd0IsS0FBS3BGLElBQUwsQ0FBVW1GLGNBQVYsQ0FBeUIsS0FBS3RELFdBQTlCLENBQXhCLENBQW5GLEtBQ0ssS0FBS3VELGdCQUFMLEdBQXdCLEtBQUtwRixJQUFMLENBQVVtRixjQUFWLENBQXlCLEtBQUt0RCxXQUE5QixDQUF4QixDQUh1Qjs7WUFLdkJ2RSxVQUFVLEVBQWQ7O1lBRUcsS0FBSzBDLElBQUwsQ0FBVXZCLEdBQVYsQ0FBYyxLQUFLb0QsV0FBbkIsQ0FBSixFQUFvQztjQUM5QnhFLE1BQUYsQ0FBU0MsT0FBVCxFQUFpQixFQUFDcUYsa0JBQWlCLEtBQUszQyxJQUFMLENBQVV2QixHQUFWLENBQWMsS0FBS29ELFdBQW5CLENBQWxCLEVBQWpCOzs7WUFHQSxLQUFLN0IsSUFBTCxDQUFVcUYsY0FBVixJQUE0QixLQUFLckYsSUFBTCxDQUFVcUYsY0FBVixDQUF5QixLQUFLeEQsV0FBOUIsQ0FBaEMsRUFBMkU7Y0FDckV4RSxNQUFGLENBQVNDLE9BQVQsRUFBaUI7Z0NBQ0UsS0FBSzBDLElBQUwsQ0FBVXFGLGNBQVYsQ0FBeUIsS0FBS3hELFdBQTlCOzthQURuQjs7O1lBTUFFLFdBQVcsS0FBS0EsUUFBTCxJQUFpQixLQUFLL0IsSUFBTCxDQUFVM0IsS0FBMUM7WUFDSTBELFFBQUosRUFBYTtjQUNQMUUsTUFBRixDQUFTQyxPQUFULEVBQWlCLEVBQUNlLE9BQU0wRCxRQUFQLEVBQWpCOzs7WUFHQSxDQUFDLEtBQUtDLGFBQVYsRUFBd0I7aUJBQ2Z3QixPQUFMLEdBQWUsSUFBSSxLQUFLNEIsZ0JBQVQsQ0FBMEI5SCxPQUExQixDQUFmO2dCQUNJZ0ksVUFBVXRILEVBQUVzQyxNQUFGLENBQVMsS0FBS2tELE9BQWQsRUFBc0IsV0FBdEIsQ0FBZDtnQkFDSThCLE9BQUosRUFBWTt3QkFDQW5ILEtBQVIsQ0FBYyxHQUFkLEVBQW1CSSxPQUFuQixDQUEyQixVQUFTZ0gsRUFBVCxFQUFZO3lCQUM5Qi9CLE9BQUwsQ0FBYTdDLEVBQWIsQ0FBZ0JVLFNBQWhCLENBQTBCQyxHQUExQixDQUE4QmlFLEVBQTlCO2lCQUR1QixDQUV6QnJDLElBRnlCLENBRXBCLElBRm9CLENBQTNCOzs7Z0JBS0FGLGFBQWFoRixFQUFFc0MsTUFBRixDQUFTLEtBQUtrRCxPQUFkLEVBQXNCLFlBQXRCLENBQWpCO2dCQUNJUixVQUFKLEVBQWU7a0JBQ1RlLElBQUYsQ0FBT2YsVUFBUCxFQUFrQixVQUFTOUQsR0FBVCxFQUFhVyxJQUFiLEVBQWtCO3lCQUMzQjJELE9BQUwsQ0FBYTdDLEVBQWIsQ0FBZ0JDLFlBQWhCLENBQTZCZixJQUE3QixFQUFrQ1gsR0FBbEM7aUJBRGMsQ0FFaEJnRSxJQUZnQixDQUVYLElBRlcsQ0FBbEI7OztpQkFLQ00sT0FBTCxDQUFhN0IsTUFBYixHQUFzQixLQUFLM0IsSUFBM0I7aUJBQ0t3RCxPQUFMLENBQWFnQyxlQUFiLEdBQStCLElBQS9COzthQUVDQyxvQkFBTCxHQUE0Qm5JLE9BQTVCO0tBNUM4QjtlQThDeEIscUJBQVU7OzthQUdYNkYseUJBQUw7YUFDS0cscUJBQUw7O1lBTUksS0FBS3RCLGFBQVQsRUFBdUI7aUJBQ1Z2QyxRQUFMLENBQWMsS0FBS3VDLGFBQW5CLEVBQWlDLEtBQWpDLEVBQXVDLFlBQVU7cUJBQ3hDRSxTQUFMO2FBREo7O2lCQUlLekMsUUFBTCxDQUFjLEtBQUt1QyxhQUFuQixFQUFpQyxPQUFqQyxFQUF5QyxZQUFVO3FCQUMxQ0csV0FBTDthQURKOztpQkFJSzFDLFFBQUwsQ0FBYyxLQUFLdUMsYUFBbkIsRUFBaUMsUUFBakMsRUFBMEMsWUFBVTtxQkFDM0NJLFlBQUw7YUFESjs7aUJBSUszQyxRQUFMLENBQWMsS0FBS3VDLGFBQW5CLEVBQWlDLE1BQWpDLEVBQXdDLFlBQVU7cUJBQ3pDSyxVQUFMO2FBREo7OztpQkFPS0MsU0FBTCxHQUFpQixLQUFLdEMsSUFBTCxDQUFVdUMsZ0JBQVYsQ0FBMkIsS0FBS1YsV0FBaEMsQ0FBakI7aUJBQ0tXLGdCQUFMLEdBQXdCO2dDQUNMLEtBQUt4QyxJQUFMLENBQVVxRixjQUFWLElBQTRCLEtBQUtyRixJQUFMLENBQVVxRixjQUFWLENBQXlCLEtBQUt4RCxXQUE5QixDQUR2Qjs0QkFFVCxLQUFLRyxhQUZJO3lCQUdaLEtBQUtoQyxJQUFMLENBQVV1QyxnQkFBVixDQUEyQixLQUFLVixXQUFoQyxFQUE2Q25ELFNBQTdDLENBQXVEZ0UsT0FBdkQsSUFBa0UsU0FIdEQ7a0NBSUgsS0FBSzFDLElBQUwsQ0FBVXZCLEdBQVYsQ0FBYyxLQUFLb0QsV0FBbkI7YUFKckI7aUJBTUtlLFVBQUwsR0FBa0IsS0FBS1osYUFBTCxDQUFtQmEsR0FBbkIsQ0FBdUIsVUFBU0MsVUFBVCxFQUFvQjNELENBQXBCLEVBQXNCOztvQkFFdkRxRCxtQkFBbUJ4RSxFQUFFWCxNQUFGLENBQVMsRUFBVCxFQUFZLEtBQUttRixnQkFBakIsRUFBa0M7MkJBQy9DTSxVQUQrQzsyQkFFL0MzRCxDQUYrQzsrQkFHM0MsS0FBSzZDLGFBQUwsQ0FBbUI1RCxNQUFuQixHQUE0QmUsQ0FBNUIsR0FBZ0MsQ0FIVztzQ0FJcEMsS0FBS2EsSUFBTCxDQUFVdkIsR0FBVixDQUFjLEtBQUtvRCxXQUFuQixLQUFtQyxLQUFLN0IsSUFBTCxDQUFVdkIsR0FBVixDQUFjLEtBQUtvRCxXQUFuQixFQUFnQ2tCLE1BQWhDLENBQXVDNUQsQ0FBdkMsQ0FBbkMsSUFBZ0YsS0FBS2EsSUFBTCxDQUFVdkIsR0FBVixDQUFjLEtBQUtvRCxXQUFuQixFQUFnQ2tCLE1BQWhDLENBQXVDNUQsQ0FBdkMsRUFBMEM2RDtpQkFKeEgsQ0FBdkI7O29CQVFJQyxZQUFZLElBQUksS0FBS1gsU0FBVCxDQUFtQkUsZ0JBQW5CLENBQWhCOzt1QkFFT1MsU0FBUDthQVpxQyxDQWF2Q0MsSUFidUMsQ0FhbEMsSUFia0MsQ0FBdkIsQ0FBbEI7OztZQTBCSixDQUFDLEtBQUtsQixhQUFWLEVBQXdCO2dCQUNoQixLQUFLaEMsSUFBTCxDQUFVbUYsY0FBVixDQUF5QixLQUFLdEQsV0FBOUIsRUFBMkNuRCxTQUEzQyxZQUFnRXZCLFNBQVN5QyxJQUE3RSxFQUFtRixLQUFLd0YsZ0JBQUwsR0FBd0IsS0FBS3BGLElBQUwsQ0FBVW1GLGNBQVYsQ0FBeUIsS0FBS3RELFdBQTlCLENBQXhCLENBQW5GLEtBQ0ssS0FBS3VELGdCQUFMLEdBQXdCLEtBQUtwRixJQUFMLENBQVVtRixjQUFWLENBQXlCLEtBQUt0RCxXQUE5QixDQUF4QixDQUZlOzs7WUFNcEJ2RSxVQUFVLEVBQWQ7O1lBRUksS0FBSzBDLElBQUwsQ0FBVXZCLEdBQVYsQ0FBYyxLQUFLb0QsV0FBbkIsQ0FBSixFQUFvQztjQUM5QnhFLE1BQUYsQ0FBU0MsT0FBVCxFQUFpQixFQUFDcUYsa0JBQWlCLEtBQUszQyxJQUFMLENBQVV2QixHQUFWLENBQWMsS0FBS29ELFdBQW5CLENBQWxCLEVBQWpCOzs7WUFHQSxLQUFLN0IsSUFBTCxDQUFVcUYsY0FBZCxFQUE2QjtjQUN2QmhJLE1BQUYsQ0FBU0MsT0FBVCxFQUFpQjtnQ0FDRSxLQUFLMEMsSUFBTCxDQUFVcUYsY0FBVixDQUF5QixLQUFLeEQsV0FBOUI7O2FBRG5COzs7WUFNQUUsV0FBVyxLQUFLQSxRQUFMLElBQWlCLEtBQUsvQixJQUFMLENBQVUzQixLQUExQztZQUNJMEQsUUFBSixFQUFhO2NBQ1AxRSxNQUFGLENBQVNDLE9BQVQsRUFBaUIsRUFBQ2UsT0FBTTBELFFBQVAsRUFBakI7OztZQUdBLENBQUMsS0FBS0MsYUFBVixFQUF3QjtpQkFDZndCLE9BQUwsR0FBZSxJQUFJLEtBQUs0QixnQkFBVCxDQUEwQjlILE9BQTFCLENBQWY7Z0JBQ0lnSSxVQUFVdEgsRUFBRXNDLE1BQUYsQ0FBUyxLQUFLa0QsT0FBZCxFQUFzQixXQUF0QixDQUFkO2dCQUNJOEIsT0FBSixFQUFZO3dCQUNBbkgsS0FBUixDQUFjLEdBQWQsRUFBbUJJLE9BQW5CLENBQTJCLFVBQVNnSCxFQUFULEVBQVk7eUJBQzlCL0IsT0FBTCxDQUFhN0MsRUFBYixDQUFnQlUsU0FBaEIsQ0FBMEJDLEdBQTFCLENBQThCaUUsRUFBOUI7aUJBRHVCLENBRXpCckMsSUFGeUIsQ0FFcEIsSUFGb0IsQ0FBM0I7OztnQkFLQUYsYUFBYWhGLEVBQUVzQyxNQUFGLENBQVMsS0FBS2tELE9BQWQsRUFBc0IsWUFBdEIsQ0FBakI7Z0JBQ0lSLFVBQUosRUFBZTtrQkFDVGUsSUFBRixDQUFPZixVQUFQLEVBQWtCLFVBQVM5RCxHQUFULEVBQWFXLElBQWIsRUFBa0I7eUJBQzNCMkQsT0FBTCxDQUFhN0MsRUFBYixDQUFnQkMsWUFBaEIsQ0FBNkJmLElBQTdCLEVBQWtDWCxHQUFsQztpQkFEYyxDQUVoQmdFLElBRmdCLENBRVgsSUFGVyxDQUFsQjs7O2lCQUtDTSxPQUFMLENBQWE3QixNQUFiLEdBQXNCLEtBQUszQixJQUEzQjtpQkFDS3dELE9BQUwsQ0FBYWdDLGVBQWIsR0FBK0IsSUFBL0I7O2FBRUNDLG9CQUFMLEdBQTRCbkksT0FBNUI7S0F4SjhCO1dBMEo1QixpQkFBVTtZQUNSLENBQUMsS0FBSzBFLGFBQVYsRUFBd0I7aUJBQ2Z0QixHQUFMLENBQVM2QyxXQUFULENBQXFCLEtBQUtDLE9BQUwsQ0FBYTdDLEVBQWxDO1NBREosTUFHSTtnQkFDSThDLFlBQVl4QyxHQUFoQjtpQkFDSzJCLFVBQUwsQ0FBZ0JyRSxPQUFoQixDQUF3QixVQUFTbUYsU0FBVCxFQUFtQnZFLENBQW5CLEVBQXFCOzRCQUM3QnNFLFVBQVVuQyxHQUFWLENBQWNvQyxVQUFVL0MsRUFBeEIsQ0FBWjswQkFDVWdELEtBQVYsR0FBa0J4RSxDQUFsQjthQUZvQixDQUd0QitELElBSHNCLENBR2pCLElBSGlCLENBQXhCO2dCQUlJTyxVQUFVckYsTUFBZCxFQUFzQjtxQkFDYnNDLEdBQUwsQ0FBUzZDLFdBQVQsQ0FBcUJFLFNBQXJCO3FCQUNLYixVQUFMLENBQWdCckUsT0FBaEIsQ0FBd0IsVUFBU21GLFNBQVQsRUFBbUJ2RSxDQUFuQixFQUFxQjs4QkFDL0J5RSxjQUFWO2lCQURKO3FCQUdLQyxPQUFMLEdBQWVKLFVBQVU5QixNQUFWLEVBQWY7YUFMSixNQU9JO3FCQUNLa0MsT0FBTCxHQUFlLEtBQUtuRCxHQUFMLENBQVNpQixNQUFULEVBQWY7O2lCQUVDOEIsU0FBTCxHQUFpQkEsU0FBakI7O0tBOUswQjtlQWlMeEIscUJBQVU7WUFDWkssV0FBVyxFQUFmO2FBQ0s5QixhQUFMLENBQW1CK0IsSUFBbkIsQ0FBd0IsVUFBUzFGLEtBQVQsRUFBZWMsQ0FBZixFQUFpQjtnQkFDakM2RSxvQkFBb0IsS0FBS3BCLFVBQUwsQ0FBZ0JxQixNQUFoQixDQUF1QixVQUFTUCxTQUFULEVBQW1CO3VCQUN2REEsVUFBVXJGLEtBQVYsSUFBbUJBLEtBQTFCO2FBRG9CLEVBRXJCLENBRnFCLENBQXhCO2dCQUdJMkYsaUJBQUosRUFBdUI7eUJBQ1Z4RSxJQUFULENBQWN3RSxrQkFBa0JyRCxFQUFoQzs7O2FBREosTUFLSztvQkFDR3VELGVBQWUsSUFBSSxLQUFLNUIsU0FBVCxDQUFtQjsyQkFDNUJqRSxLQUQ0QjtvQ0FFbkIsS0FBSzJCLElBQUwsQ0FBVXFGLGNBQVYsSUFBNEIsS0FBS3JGLElBQUwsQ0FBVXFGLGNBQVYsQ0FBeUIsS0FBS3hELFdBQTlCLENBRlQ7MkJBRzVCMUMsQ0FINEI7K0JBSXhCLEtBQUs2QyxhQUFMLENBQW1CNUQsTUFBbkIsR0FBNEJlLENBQTVCLEdBQWdDLENBSlI7Z0NBS3ZCLEtBQUs2QyxhQUxrQjswQkFNN0IsS0FBS2hDLElBQUwsQ0FBVXZCLEdBQVYsQ0FBYyxLQUFLUyxHQUFMLENBQVNmLEtBQVQsQ0FBZSxHQUFmLEVBQW9CLENBQXBCLENBQWQsRUFBc0NnQixDQUF0QztpQkFOVSxDQUFuQjtxQkFRS3lELFVBQUwsQ0FBZ0JwRCxJQUFoQixDQUFxQjBFLFlBQXJCO3lCQUNTMUUsSUFBVCxDQUFjMEUsYUFBYXZELEVBQTNCOztTQW5CZ0IsQ0FzQnRCdUMsSUF0QnNCLENBc0JqQixJQXRCaUIsQ0FBeEI7YUF1QktXLE9BQUwsQ0FBYU0sS0FBYjtpQkFDUzVGLE9BQVQsQ0FBaUIsVUFBUzZGLEtBQVQsRUFBZTtpQkFDdkJQLE9BQUwsQ0FBYVEsTUFBYixDQUFvQkQsS0FBcEI7U0FEYSxDQUVmbEIsSUFGZSxDQUVWLElBRlUsQ0FBakI7YUFHS08sU0FBTCxHQUFpQnhDLEVBQUU2QyxRQUFGLENBQWpCOzthQUVLbEIsVUFBTCxDQUFnQnJFLE9BQWhCLENBQXdCLFVBQVNtRixTQUFULEVBQW1CdkUsQ0FBbkIsRUFBcUI7c0JBQy9CeUUsY0FBVjtTQURKO0tBaE44QjtpQkFxTnRCLHVCQUFVO2FBQ2JDLE9BQUwsQ0FBYU0sS0FBYjtLQXROOEI7a0JBd05yQix3QkFBVTthQUNkVixTQUFMLENBQWVhLElBQWYsR0FBc0JDLE1BQXRCO2FBQ0szQixVQUFMLENBQWdCNEIsTUFBaEIsQ0FBdUIsQ0FBQyxDQUF4QixFQUEwQixDQUExQjthQUNLZixTQUFMLEdBQWlCLEtBQUtJLE9BQUwsQ0FBYUMsUUFBYixFQUFqQjtLQTNOOEI7Z0JBNk52QixzQkFBVTs7O0tBN05hO1VBaU83QixnQkFBVTs7Ozs7WUFLUCxLQUFLTixPQUFULEVBQWlCOzttQkFFTixLQUFLeEQsSUFBTCxDQUFVVyxFQUFWLENBQWE4RCxRQUFiLENBQXNCLEtBQUtqQixPQUFMLENBQWE3QyxFQUFiLENBQWdCYSxVQUF0QyxDQUFQO1NBRkosTUFJSTtnQkFDSVQsT0FBTyxJQUFYO2dCQUNJSixLQUFLLEtBQUtYLElBQUwsQ0FBVVcsRUFBbkI7aUJBQ0s4QyxTQUFMLENBQWVNLElBQWYsQ0FBb0IsWUFBVTtvQkFDdEIsQ0FBQ3BELEdBQUc4RCxRQUFILENBQVksSUFBWixDQUFMLEVBQXdCMUQsT0FBTyxLQUFQO2FBRDVCO21CQUdNQSxJQUFQOzs7Q0FoUEksQ0FBZjs7QUNSQTtBQUNBLEFBRUEsb0JBQWVOLFVBQVVwRCxNQUFWLENBQWlCO1VBQ3ZCLE1BRHVCO2VBRWxCLHFCQUFVO2FBQ1hxSSxPQUFMLEdBQWUsS0FBSzFGLElBQUwsQ0FBVUksU0FBVixDQUFvQjNCLEdBQXBCLENBQXdCLEtBQUtTLEdBQTdCLENBQWY7YUFDS08sUUFBTCxDQUFjLEtBQUtPLElBQUwsQ0FBVUksU0FBeEIsRUFBa0MsWUFBVSxLQUFLbEIsR0FBakQsRUFBcUQsWUFBVTtpQkFDdER3RyxPQUFMLEdBQWUsS0FBSzFGLElBQUwsQ0FBVUksU0FBVixDQUFvQjNCLEdBQXBCLENBQXdCLEtBQUtTLEdBQTdCLENBQWY7aUJBQ0ttQixNQUFMO1NBRko7S0FKd0I7V0FTdEIsaUJBQVU7VUFDWDBELElBQUYsQ0FBTyxLQUFLMkIsT0FBWixFQUFvQixVQUFTeEcsR0FBVCxFQUFhVixJQUFiLEVBQWtCO2dCQUM5QlIsRUFBRXVDLFVBQUYsQ0FBYXJCLEdBQWIsQ0FBSixFQUF1QkEsTUFBTUEsSUFBSWdFLElBQUosQ0FBUyxLQUFLbEQsSUFBZCxDQUFOO2lCQUNsQlUsR0FBTCxDQUFTM0MsSUFBVCxDQUFjLFVBQVFTLElBQXRCLEVBQTJCVSxHQUEzQjtTQUZnQixDQUdsQmdFLElBSGtCLENBR2IsSUFIYSxDQUFwQjtLQVZ5QjtZQWVyQixrQkFBVTtVQUNaYSxJQUFGLENBQU8sS0FBSzJCLE9BQVosRUFBb0IsVUFBU3hHLEdBQVQsRUFBYVYsSUFBYixFQUFrQjtnQkFDOUJSLEVBQUV1QyxVQUFGLENBQWFyQixHQUFiLENBQUosRUFBdUJBLE1BQU1BLElBQUlnRSxJQUFKLENBQVMsS0FBS2xELElBQWQsQ0FBTjtpQkFDbEJVLEdBQUwsQ0FBUzNDLElBQVQsQ0FBYyxVQUFRUyxJQUF0QixFQUEyQlUsR0FBM0I7U0FGZ0IsQ0FHbEJnRSxJQUhrQixDQUdiLElBSGEsQ0FBcEI7O0NBaEJRLENBQWY7O0FDUUEsSUFBSXlDLFdBQVc7YUFDSEMsZ0JBREc7WUFFSkMsZUFGSTthQUdIQyxnQkFIRztVQUlOQyxhQUpNO1NBS1BDLFlBTE87Y0FNRkMsaUJBTkU7a0JBT0VDLHFCQVBGO1NBUVBDLFlBUk87YUFTSEMsZ0JBVEc7VUFVTkM7Q0FWVCxDQWFBOzs7Ozs7OztBQ3hCQTs7O0FBR0EsQUFDQSxBQUNBLEFBRUEsU0FBU0MsZUFBVCxDQUF5QjNGLEVBQXpCLEVBQTRCOztRQUVwQjRGLENBQUo7UUFBT3JGLElBQUUsRUFBVDtRQUFhc0YsT0FBS3JGLFNBQVNzRixnQkFBVCxDQUEwQjlGLEVBQTFCLEVBQTZCK0YsV0FBV0MsU0FBeEMsRUFBa0QsSUFBbEQsRUFBdUQsS0FBdkQsQ0FBbEI7V0FDTUosSUFBRUMsS0FBS0ksUUFBTCxFQUFSO1VBQTJCcEgsSUFBRixDQUFPK0csQ0FBUDtLQUN6QixPQUFPckYsQ0FBUDs7O0FBR0osSUFBSTJGLHNCQUFzQixDQUFDLE9BQUQsRUFBVSxZQUFWLEVBQXdCLElBQXhCLEVBQThCLElBQTlCLEVBQW9DLFlBQXBDLEVBQWtELFdBQWxELEVBQStELFNBQS9ELEVBQTBFLFFBQTFFLENBQTFCO0FBQ0EsSUFBSUMsd0JBQXdCLENBQUMsTUFBRCxFQUFRLGdCQUFSLEVBQXlCLGdCQUF6QixFQUEwQyxrQkFBMUMsRUFBNkQsZ0JBQTdELEVBQThFLE9BQTlFLEVBQXNGLFdBQXRGLEVBQWtHLGtCQUFsRyxDQUE1QjtBQUNBLFdBQWUzSixTQUFTeUMsSUFBVCxDQUFjdkMsTUFBZCxDQUFxQjs7aUJBRWxCLFNBQVMwSixXQUFULENBQXFCekosT0FBckIsRUFBOEI7OztZQUVwQ0EsVUFBVUEsV0FBVyxFQUF6Qjs7O1lBR0ksS0FBSzBKLElBQUwsSUFBYSxPQUFPLEtBQUtBLElBQVosSUFBa0IsV0FBbkMsRUFBK0M7Z0JBQ3ZDLENBQUMsS0FBS0MsR0FBTixJQUFhLENBQUMsS0FBS0MsY0FBdkIsRUFBdUNwSCxRQUFRa0gsSUFBUixDQUFhLDhCQUFiO2dCQUNuQyxDQUFDLEtBQUtHLFFBQVYsRUFBb0JySCxRQUFRa0gsSUFBUixDQUFhLCtDQUFiOzs7O1lBS3BCLENBQUMsS0FBS0MsR0FBVixFQUFlO2lCQUNOQSxHQUFMLEdBQVdqSixFQUFFb0osUUFBRixDQUFXLEtBQUtGLGNBQUwsSUFBdUIsRUFBbEMsQ0FBWDs7OztVQUlGN0osTUFBRixDQUFTLElBQVQsRUFBZVcsRUFBRXFKLElBQUYsQ0FBTy9KLE9BQVAsRUFBZ0J1SixvQkFBb0JTLE1BQXBCLENBQTJCUixxQkFBM0IsQ0FBaEIsQ0FBZjs7VUFJRS9DLElBQUYsQ0FBTyxLQUFLb0QsUUFBWixFQUFzQixVQUFVSSxHQUFWLEVBQWU7Z0JBQzdCdkosRUFBRXVDLFVBQUYsQ0FBYWdILEdBQWIsQ0FBSixFQUF1QnpILFFBQVFrSCxJQUFSLENBQWEsNkNBQWI7U0FEM0I7Ozs7Ozs7YUFTS3JFLGdCQUFMLEdBQXdCckYsV0FBV0EsUUFBUXFGLGdCQUEzQzs7WUFLSTZFLFFBQVF4SixFQUFFWCxNQUFGLENBQVNXLEVBQUV5SixLQUFGLENBQVEsS0FBS04sUUFBYixDQUFULEVBQWlDN0osV0FBV0EsUUFBUXFGLGdCQUFuQixJQUF1QyxFQUF4RSxDQUFaO2FBQ0t2QyxTQUFMLEdBQWlCLElBQUlmLE9BQU9xSSxTQUFYLENBQXFCRixLQUFyQixDQUFqQjs7YUFFS0csY0FBTCxHQUFzQixJQUFJdEksT0FBT0UsVUFBWCxDQUFzQixLQUFLb0QsZ0JBQUwsSUFBeUIsS0FBS3dFLFFBQXBELENBQXRCOzs7Ozs7Ozs7O1lBVUksS0FBS2hDLGNBQVQsRUFBd0I7aUJBQ2hCLElBQUkzRyxJQUFSLElBQWdCLEtBQUsyRyxjQUFyQixFQUFvQzs7b0JBRTVCLEtBQUtnQyxRQUFMLENBQWMzSSxJQUFkLGFBQStCb0osS0FBbkMsRUFBeUM7d0JBQ2hDQyxVQUFVLElBQUkxSyxTQUFTb0MsVUFBYixDQUF3QmlJLE1BQU1oSixJQUFOLEVBQVlxRSxHQUFaLENBQWdCLFVBQUNpRixHQUFELEVBQUszSSxDQUFMLEVBQVM7NEJBQ3hEYSxPQUFPLElBQUksTUFBS21GLGNBQUwsQ0FBb0IzRyxJQUFwQixDQUFKLENBQThCO3dDQUFBOzhDQUVwQixNQUFLMkksUUFBTCxDQUFjM0ksSUFBZCxFQUFvQlcsQ0FBcEI7eUJBRlYsQ0FBWDsrQkFJTyxFQUFDYSxNQUFLQSxJQUFOLEVBQVA7cUJBTG1DLENBQXhCLENBQWQ7aUJBREwsTUFVSTt3QkFDSTZILFVBQVUsSUFBSSxLQUFLMUMsY0FBTCxDQUFvQjNHLElBQXBCLENBQUosQ0FBOEI7K0JBQ2xDLElBRGtDOzBDQUV2QixLQUFLMkksUUFBTCxDQUFjM0ksSUFBZCxDQUZ1Qjs7d0NBSXpCLEtBQUs2RyxjQUFMLElBQXVCLEtBQUtBLGNBQUwsQ0FBb0I3RyxJQUFwQjtxQkFKNUIsQ0FBZDs7d0JBT0ltRCxNQUFSLEdBQWlCLElBQWpCO3FCQUNLdkIsU0FBTCxDQUFlbkIsR0FBZixDQUFtQlQsSUFBbkIsRUFBd0JxSixPQUF4Qjs7Ozs7Ozs7Ozs7Ozs7O1lBaUJKLEtBQUt4SixLQUFULEVBQWdCO2lCQUNQb0IsUUFBTCxDQUFjLEtBQUtwQixLQUFuQixFQUEwQixRQUExQixFQUFvQyxLQUFLMEosZUFBekM7aUJBQ0t0SSxRQUFMLENBQWMsS0FBS3BCLEtBQW5CLEVBQTBCLFFBQTFCLEVBQW9DLFlBQVk7cUJBQ3ZDMkosY0FBTCxDQUFvQmhLLEVBQUVYLE1BQUYsQ0FBUyxFQUFULEVBQWFXLEVBQUVzQyxNQUFGLENBQVMsSUFBVCxFQUFlLFlBQWYsQ0FBYixDQUFwQjthQURKOztpQkFJS3lILGVBQUw7O2NBRUVoRSxJQUFGLENBQU8sS0FBS3NCLGNBQVosRUFBMkIsVUFBU25HLEdBQVQsRUFBYUosR0FBYixFQUFpQjtvQkFDcEMsUUFBT0ksR0FBUCx5Q0FBT0EsR0FBUCxPQUFhLFFBQWpCLEVBQTBCOzt5QkFFakJrQixTQUFMLENBQWVuQixHQUFmLENBQW1CSCxHQUFuQixFQUF1QixJQUFJLEtBQUtxRyxjQUFMLENBQW9CckcsR0FBcEIsQ0FBSixDQUE2QjsrQkFDMUMsS0FBS1QsS0FEcUM7d0NBRWpDYTtxQkFGSSxDQUF2Qjs7YUFIbUIsQ0FRekJnRSxJQVJ5QixDQVFwQixJQVJvQixDQUEzQjs7Ozs7Ozs7WUFnQkFzRSxRQUFRLEtBQUtwSCxTQUFMLENBQWU0QyxVQUEzQjtZQUNJaUYsT0FBT0MsT0FBT0QsSUFBUCxDQUFZLEtBQUs3SCxTQUFMLENBQWU0QyxVQUEzQixDQUFYO2FBQ0t6RSxPQUFMLENBQWEsVUFBVU8sR0FBVixFQUFlO2dCQUNwQkEsUUFBUSxhQUFSLElBQXlCLENBQUMsS0FBS3NCLFNBQUwsQ0FBZTRDLFVBQWYsQ0FBMEJsRSxHQUExQixDQUE5QixFQUE4RDs7Ozs7U0FEckQsQ0FNWG9FLElBTlcsQ0FNTixJQU5NLENBQWI7O2FBUUtpRixjQUFMO2FBQ0tDLGNBQUw7O2FBRUtDLGdCQUFMLEdBQXdCLEVBQXhCO2FBQ0tDLGNBQUwsR0E3SHdDOzthQStIbkNDLGVBQUw7Ozs7Ozs7Ozs7YUFXS0YsZ0JBQUwsQ0FBc0I5SixPQUF0QixDQUE4QixVQUFTaUssY0FBVCxFQUF3QjtnQkFDOUN0SyxRQUFRc0ssZUFBZUMsS0FBZixDQUFxQnRLLEtBQXJCLENBQTJCLEdBQTNCLENBQVo7b0JBQ1F1SyxHQUFSLENBQVl4SyxLQUFaO2dCQUNJeUsscUJBQXFCLEtBQUt4RCxjQUFMLENBQW9CakgsTUFBTSxDQUFOLENBQXBCLENBQXpCO2dCQUNJMEssVUFBVSxLQUFLbkssR0FBTCxDQUFTUCxNQUFNLENBQU4sQ0FBVCxDQUFkO2dCQUNJMEssbUJBQW1CekwsU0FBU29DLFVBQWhDLEVBQTJDO29CQUNuQ3NKLG9CQUFvQixLQUFLcEssR0FBTCxDQUFTUCxNQUFNLENBQU4sQ0FBVCxDQUF4QjtrQ0FDa0I2RixJQUFsQixDQUF1QixVQUFTMUYsS0FBVCxFQUFlYyxDQUFmLEVBQWlCO3dCQUNoQ0EsS0FBRyxDQUFQLEVBQVU4QixFQUFFdUgsY0FBRixFQUFrQmpGLFdBQWxCLENBQThCbEYsTUFBTUksR0FBTixDQUFVLE1BQVYsRUFBa0JrQyxFQUFoRCxFQUFWLEtBQ0k7MEJBQ0VrSSxrQkFBa0JDLEVBQWxCLENBQXFCM0osSUFBRSxDQUF2QixFQUEwQlYsR0FBMUIsQ0FBOEIsTUFBOUIsRUFBc0NrQyxFQUF4QyxFQUE0Q29JLEtBQTVDLENBQWtEMUssTUFBTUksR0FBTixDQUFVLE1BQVYsRUFBa0JrQyxFQUFwRTs7aUJBSFI7YUFGSixNQVNJO2tCQUNFNkgsY0FBRixFQUFrQmpGLFdBQWxCLENBQThCLEtBQUs5RSxHQUFMLENBQVNQLE1BQU0sQ0FBTixDQUFULEVBQW1CeUMsRUFBakQ7O1NBZnNCLENBaUI1QnVDLElBakI0QixDQWlCdkIsSUFqQnVCLENBQTlCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7YUE0Q0tVLGNBQUw7O2FBRUtvQixVQUFMLEdBQWtCLEdBQUcxRyxLQUFILENBQVNrQyxJQUFULENBQWMsS0FBS0csRUFBTCxDQUFRcUUsVUFBdEIsRUFBa0MsQ0FBbEMsQ0FBbEI7O2FBRUtnRSxVQUFMLENBQWdCckssS0FBaEIsQ0FBc0IsSUFBdEIsRUFBNEJDLFNBQTVCO0tBNUw0Qjs7Z0JBK0xyQixvQkFBU3RCLE9BQVQsRUFBaUI7O2tCQUVkQSxXQUFXLEVBQXJCO1VBQ0VELE1BQUYsQ0FBUyxJQUFULEVBQWNDLE9BQWQ7S0FsTTRCO2tCQW9NbkIsc0JBQVNTLElBQVQsRUFBYzs7WUFFbkIsT0FBTyxLQUFLc0gsY0FBTCxDQUFvQnRILElBQXBCLENBQVAsSUFBbUMsUUFBdkMsRUFBaUQsT0FBTyxLQUFLTSxLQUFMLENBQVdJLEdBQVgsQ0FBZSxLQUFLNEcsY0FBTCxDQUFvQnRILElBQXBCLENBQWYsQ0FBUCxDQUFqRCxLQUNLLE9BQU8sS0FBS3NILGNBQUwsQ0FBb0J0SCxJQUFwQixFQUEwQnlDLElBQTFCLENBQStCLElBQS9CLENBQVA7S0F2TXVCO3FCQXlNaEIsMkJBQVU7O2FBSWpCSixTQUFMLENBQWVuQixHQUFmLENBQW1CakIsRUFBRWlMLFNBQUYsQ0FBWSxLQUFLNUQsY0FBakIsRUFBZ0MsVUFBUzZELFFBQVQsRUFBa0I7Z0JBQzdELE9BQU9BLFFBQVAsSUFBaUIsUUFBckIsRUFBK0IsT0FBTyxLQUFLN0ssS0FBTCxDQUFXSSxHQUFYLENBQWV5SyxRQUFmLENBQVAsQ0FBL0IsS0FDSyxJQUFJLE9BQU9BLFFBQVAsSUFBaUIsVUFBckIsRUFBaUMsT0FBT0EsU0FBUzFJLElBQVQsQ0FBYyxJQUFkLENBQVA7U0FGUyxDQUdqRDBDLElBSGlELENBRzVDLElBSDRDLENBQWhDLENBQW5CO0tBN000QjtvQkF3TmpCLDBCQUFVO1lBQ2pCLEtBQUt4QyxHQUFULEVBQWMsS0FBS0EsR0FBTCxDQUFTeUksSUFBVCxDQUFjLEtBQUtDLGdCQUFMLEVBQWQsRUFBZCxLQUNLO2dCQUNHQyxXQUFXbEksU0FBU0MsYUFBVCxDQUF1QixLQUF2QixDQUFmO3FCQUNTUCxTQUFULEdBQXFCLEtBQUt1SSxnQkFBTCxFQUFyQjttQkFDTUMsU0FBU3JFLFVBQVQsQ0FBb0I1RyxNQUExQixFQUFpQztxQkFDeEJ1QyxFQUFMLENBQVFlLFdBQVIsQ0FBb0IySCxTQUFTckUsVUFBVCxDQUFvQixDQUFwQixDQUFwQjs7OztLQTlOb0I7cUJBbU9oQiwyQkFBVTs7Ozs7Ozs7Ozt3QkFVTixLQUFLckUsRUFBckIsRUFBeUJwQyxPQUF6QixDQUFpQyxVQUFTK0ssWUFBVCxFQUFzQjs7O2dCQUcvQ0MsS0FBSyxnQkFBVCxDQUhtRDtnQkFJL0NkLEtBQUo7O2dCQUdJZSxVQUFVLEVBQWQ7bUJBQ08sQ0FBQ2YsUUFBUWMsR0FBR0UsSUFBSCxDQUFRSCxhQUFhSSxXQUFyQixDQUFULEtBQStDLElBQXRELEVBQTREO3dCQUNoRGxLLElBQVIsQ0FBYWlKLEtBQWI7Ozs7OztnQkFNQWtCLGtCQUFrQkwsWUFBdEI7Z0JBQ0lNLGdCQUFnQk4sYUFBYUksV0FBakM7Z0JBQ0lHLGtCQUFrQixDQUF0Qjs7OztvQkFJUXRMLE9BQVIsQ0FBZ0IsVUFBU2tLLEtBQVQsRUFBZTtvQkFDdkJxQixVQUFVSCxnQkFBZ0JJLFNBQWhCLENBQTBCdEIsTUFBTTlFLEtBQU4sR0FBY2tHLGVBQXhDLENBQWQ7b0JBQ0lHLGNBQWN2QixNQUFNLENBQU4sQ0FBbEI7d0JBQ1FBLEtBQVIsR0FBZ0JBLE1BQU0sQ0FBTixDQUFoQjtxQkFDS0osZ0JBQUwsQ0FBc0I3SSxJQUF0QixDQUEyQnNLLE9BQTNCO2tDQUNrQkEsUUFBUUMsU0FBUixDQUFrQkMsWUFBWTVMLE1BQTlCLENBQWxCO2dDQUNnQnVMLGdCQUFnQkQsV0FBaEM7O2tDQUdnQmpCLE1BQU05RSxLQUFOLEdBQWNxRyxZQUFZNUwsTUFBMUMsQ0FUMkI7YUFBZixDQVVkOEUsSUFWYyxDQVVULElBVlMsQ0FBaEI7U0FyQjZCLENBa0MvQkEsSUFsQytCLENBa0MxQixJQWxDMEIsQ0FBakM7S0E3TzRCO29CQWlSakIsMEJBQVU7O2FBTWhCK0csU0FBTCxHQUFpQixFQUFqQjs7YUFLSyxJQUFJQyxhQUFULElBQTBCQyxRQUExQixFQUE0QztnQkFDcENDLFVBQVVELFNBQWtCRCxhQUFsQixFQUFpQ3hMLFNBQS9DO2dCQUNJMEwsbUJBQW1CM0osU0FBdkIsRUFBaUM7O29CQUN6QlosT0FBT3VLLFFBQVF2SyxJQUFuQjtvQkFDSXdLLFdBQVksS0FBSzNKLEdBQU4sR0FBV08sRUFBRXFKLFNBQUYsQ0FBWSxLQUFLNUosR0FBTCxDQUFTNkosSUFBVCxDQUFjLFNBQU8xSyxJQUFQLEdBQVksR0FBMUIsQ0FBWixDQUFYLEdBQXVEb0IsRUFBRXFKLFNBQUYsQ0FBWXJKLEVBQUUsS0FBS04sRUFBTCxDQUFRNkosZ0JBQVIsQ0FBeUIsU0FBTzNLLElBQVAsR0FBWSxHQUFyQyxDQUFGLENBQVosQ0FBdEU7O29CQUVJd0ssU0FBU2pNLE1BQWIsRUFBcUI7eUJBQ1o2TCxTQUFMLENBQWVwSyxJQUFmLElBQXVCd0ssU0FBU3hILEdBQVQsQ0FBYSxVQUFTNEgsT0FBVCxFQUFpQnRMLENBQWpCLEVBQW1Ca0wsUUFBbkIsRUFBNEI7OytCQUVyRCxJQUFJRixTQUFrQkQsYUFBbEIsQ0FBSixDQUFxQztrQ0FDbkMsSUFEbUM7Z0NBRXJDTyxPQUZxQztpQ0FHcENBLFFBQVF6SixZQUFSLENBQXFCLFFBQU1uQixJQUEzQjt5QkFIRCxDQUFQO3FCQUZnQyxDQU9sQ3FELElBUGtDLENBTzdCLElBUDZCLENBQWIsQ0FBdkI7Ozs7S0FuU2dCO3NCQXlUZiw0QkFBVTtZQUNuQixLQUFLK0QsR0FBVCxFQUFjO21CQUNIakosQ0FBUCxHQUFXQSxDQUFYO21CQUNPLEtBQUtpSixHQUFMLENBQVMsS0FBSzdHLFNBQUwsQ0FBZTRDLFVBQXhCLENBQVA7U0FGSixNQUlLLE9BQU9oRixFQUFFb0osUUFBRixDQUFXLEtBQUtGLGNBQWhCLEVBQWdDLEtBQUs5RyxTQUFMLENBQWU0QyxVQUEvQyxDQUFQO0tBOVR1QjtvQkFnVWhCLHdCQUFTMEgsTUFBVCxFQUFpQjs7WUFDekJDLHdCQUF3QixnQkFBNUI7bUJBQ1dELFNBQVMxTSxFQUFFc0MsTUFBRixDQUFTLElBQVQsRUFBZSxRQUFmLENBQXBCO1lBQ0ksQ0FBQ29LLE1BQUwsRUFBYSxPQUFPLElBQVA7YUFDUkUsZ0JBQUw7YUFDSyxJQUFJOUwsR0FBVCxJQUFnQjRMLE1BQWhCLEVBQXdCO2dCQUNoQkcsU0FBU0gsT0FBTzVMLEdBQVAsQ0FBYjtnQkFDSSxDQUFDZCxFQUFFdUMsVUFBRixDQUFhc0ssTUFBYixDQUFMLEVBQTJCQSxTQUFTLEtBQUtILE9BQU81TCxHQUFQLENBQUwsQ0FBVDtnQkFDdkIsQ0FBQytMLE1BQUwsRUFBYSxNQUFNLElBQUloRyxLQUFKLENBQVUsYUFBYTZGLE9BQU81TCxHQUFQLENBQWIsR0FBMkIsa0JBQXJDLENBQU47Z0JBQ1QySixRQUFRM0osSUFBSTJKLEtBQUosQ0FBVWtDLHFCQUFWLENBQVo7Z0JBQ0lHLGFBQWFyQyxNQUFNLENBQU4sRUFBU3RLLEtBQVQsQ0FBZSxHQUFmLENBQWpCO2dCQUFzQzRNLFdBQVd0QyxNQUFNLENBQU4sQ0FBakQ7cUJBQ1N6SyxFQUFFa0YsSUFBRixDQUFPMkgsTUFBUCxFQUFlLElBQWYsQ0FBVDtnQkFDSUcsT0FBTyxJQUFYO2NBQ0VGLFVBQUYsRUFBYy9HLElBQWQsQ0FBbUIsVUFBU2tILFNBQVQsRUFBb0I7NkJBQ3RCLG9CQUFvQkQsS0FBS0UsR0FBdEM7b0JBQ0lILGFBQWEsRUFBakIsRUFBcUI7eUJBQ2hCckssR0FBTCxDQUFTd0MsSUFBVCxDQUFjK0gsU0FBZCxFQUF5QkosTUFBekI7aUJBREEsTUFFTzt5QkFDRW5LLEdBQUwsQ0FBU3lLLFFBQVQsQ0FBa0JKLFFBQWxCLEVBQTRCRSxTQUE1QixFQUF1Q0osTUFBdkM7O2FBTFI7O0tBN1V3QjtZQXVWekIsa0JBQVUsRUF2VmU7O2FBK1Z4Qk8sU0EvVndCO29CQWdXakIsRUFoV2lCO29CQWlXaEIsMEJBQVc7O1lBRW5CLENBQUMsS0FBS3pLLEVBQVYsRUFBYztnQkFDUCxLQUFLcUMsVUFBTCxJQUFtQixLQUFLcUksRUFBeEIsSUFBOEIsS0FBS0MsU0FBbkMsSUFBZ0QsS0FBSzVJLE9BQXhELEVBQWdFOztvQkFDcEQ4RSxRQUFReEosRUFBRVgsTUFBRixDQUFTLEVBQVQsRUFBYVcsRUFBRXNDLE1BQUYsQ0FBUyxJQUFULEVBQWUsWUFBZixDQUFiLENBQVo7b0JBQ0ksS0FBSytLLEVBQVQsRUFBYTdELE1BQU02RCxFQUFOLEdBQVdyTixFQUFFc0MsTUFBRixDQUFTLElBQVQsRUFBZSxJQUFmLENBQVg7b0JBQ1QsS0FBS2dMLFNBQVQsRUFBb0I5RCxNQUFNLE9BQU4sSUFBaUJ4SixFQUFFc0MsTUFBRixDQUFTLElBQVQsRUFBZSxXQUFmLENBQWpCO3FCQUNmaUwsVUFBTCxDQUFnQixLQUFLQyxjQUFMLENBQW9CeE4sRUFBRXNDLE1BQUYsQ0FBUyxJQUFULEVBQWUsU0FBZixLQUE2QixLQUFqRCxDQUFoQjtxQkFDSzBILGNBQUwsQ0FBb0JSLEtBQXBCO2FBTFIsTUFPSTs7cUJBQ0s3RyxFQUFMLEdBQVVRLFNBQVNzSyxzQkFBVCxFQUFWOztTQVRSLE1BV087aUJBQ0VGLFVBQUwsQ0FBZ0J2TixFQUFFc0MsTUFBRixDQUFTLElBQVQsRUFBZSxJQUFmLENBQWhCOztLQS9Xd0I7U0FrWDVCLGdCQUFTd0gsR0FBVCxFQUFhOzthQUVSMUgsU0FBTCxDQUFlbkIsR0FBZixDQUFtQjZJLEdBQW5CO0tBcFg0QjtTQXNYNUIsZ0JBQVN0SixJQUFULEVBQWM7ZUFDUCxLQUFLNEIsU0FBTCxDQUFlM0IsR0FBZixDQUFtQkQsSUFBbkIsQ0FBUDs7Q0F2WE8sQ0FBZjs7QUNoQkE7Ozs7QUFJQSxBQUNBLEFBQ0EsQUFDQSxBQUNBLEFBR0EsSUFBSWEsV0FBUyxFQUFDakMsWUFBRCxFQUFRc0ssb0JBQVIsRUFBbUJuSSxzQkFBbkIsRUFBK0JLLFVBQS9CLEVBQXFDdUssMkJBQXJDLEVBQWI7QUFDQTlLLFNBQU8sSUFBUCxJQUFlLE9BQWY7O0FBRUEsSUFBSSxPQUFPNUIsTUFBUCxLQUFnQixXQUFwQixFQUFpQ0EsT0FBTzRCLE1BQVAsR0FBZ0JBLFFBQWhCO0FBQ2pDLElBQUksT0FBT3FNLE1BQVAsS0FBZ0IsV0FBcEIsRUFBaUNBLE9BQU9yTSxNQUFQLEdBQWdCQSxRQUFoQjs7In0=
