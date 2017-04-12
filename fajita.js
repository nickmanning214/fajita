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

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
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
        this.viewModel = new Fajita.ViewModel(attrs);

        //I want to use this.set here but can't get it working without rewriting model.set to support two arguments


        //For each subView, set the viewModel to a collection of views (if it is an array) or a view.
        //It sends in defaultOverride and this's model as a model.
        if (this.subViewImports) {
            for (var prop in this.subViewImports) {
                if (attrs[prop] instanceof Array) {
                    //this.viewModel.set(prop, attrs[prop].map(obj=>{return _.extend({},this.subViewImports[prop].prototype.defaults,obj)}))
                    this.viewModel.set(prop, new Backbone.Collection(attrs[prop].map(function (obj, i) {
                        var view = new _this.subViewImports[prop]({
                            model: _this,
                            defaultsOverride: _this.defaults[prop][i]
                        });
                        return { view: view };
                    })));
                } else {
                    //this.viewModel.set(prop,_.extend({},this.subViewImports[prop].prototype.defaults,attrs[prop]))
                    this.viewModel.set(prop, new this.subViewImports[prop]({
                        model: this,
                        defaultsOverride: this.defaults[prop]
                    }));
                }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFqaXRhLmpzIiwic291cmNlcyI6WyJNb2RlbC5qcyIsIlZpZXdNb2RlbC5qcyIsIkNvbGxlY3Rpb24uanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1jb250ZW50LmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1lbmFibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRpc2FibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWhyZWYuanMiLCJkaXJlY3RpdmUvYWJzdHJhY3Qtc3Vidmlldy5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtbWFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1vcHRpb25hbC5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtb3B0aW9uYWx3cmFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1zcmMuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLXN1YnZpZXcuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRhdGEuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnkuanMiLCJWaWV3LmpzIiwiQmFzZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5cblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgXG4gIGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgaWYgKCB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSBcInVuZGVmaW5lZFwiICl7XG4gICAgICB0aGlzLnF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICB9XG5cbiAgIFxuXG4gICAgLy9uZXdcbiAgICB0aGlzLnN0cnVjdHVyZSA9IHt9O1xuXG4gICAgdGhpcy5wYXJlbnRNb2RlbHMgPSBbXTtcbiAgICB0aGlzLmluaXQoKTtcbiAgfSxcbiAgaW5pdDpmdW5jdGlvbigpe30sXG4gIFxuICBnZXQ6ZnVuY3Rpb24oYXR0cil7XG5cbiAgICAvL1RvZG86IGVycm9yIGNoZWNrIHdoZW4gYXR0ciBoYXMgXCItPlwiIGJ1dCBkb2Vzbid0IHN0YXJ0IHdpdGggLT5cblxuICAgIGlmIChfLmlzU3RyaW5nKGF0dHIpKXtcbiAgICAgIHZhciBwcm9wcyA9IGF0dHIuc3BsaXQoXCItPlwiKTtcbiAgICAgIGlmIChwcm9wcy5sZW5ndGggPiAxKXtcbiAgICAgICAgdmFyIG1vZGVsID0gdGhpcztcbiAgICAgICAgcHJvcHMuc2xpY2UoMSkuZm9yRWFjaChmdW5jdGlvbihwcm9wKXtcbiAgICAgICAgICBpZiAobW9kZWwuc3RydWN0dXJlW3Byb3BdKSBtb2RlbCA9IG1vZGVsLnN0cnVjdHVyZVtwcm9wXTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtb2RlbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGdldCA9IEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5nZXQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuICAgIGlmICghXy5pc1VuZGVmaW5lZChnZXQpKSByZXR1cm4gZ2V0O1xuICAgIFxuXG4gXG4gICBcbiAgIFxuICB9LFxuICB0b2dnbGU6ZnVuY3Rpb24oa2V5LHZhbDEsdmFsMil7XG4gICAgaWYgKHRoaXMuZ2V0KGtleSk9PXZhbDIpe1xuICAgICAgdGhpcy5zZXQoa2V5LHZhbDEpO1xuICAgIH1cbiAgICBlbHNlIHRoaXMuc2V0KGtleSx2YWwyKTtcbiAgfSxcbiAgc2V0OmZ1bmN0aW9uKGF0dHIsIHZhbCwgb3B0aW9ucyl7XG4gICBcbiAgICAvKlxuICAgIGdldCBjb2RlLi4uSSB3YW50IHNldCBjb2RlIHRvIG1pcnJvciBnZXQgY29kZVxuICAgICovXG4gICAgaWYgKF8uaXNTdHJpbmcoYXR0cikpe1xuICAgICAgdmFyIHByb3BzID0gYXR0ci5zcGxpdChcIi0+XCIpO1xuICAgICAgaWYgKHByb3BzLmxlbmd0aCA+IDEpe1xuICAgICAgICB2YXIgbW9kZWwgPSB0aGlzO1xuICAgICAgICBwcm9wcy5zbGljZSgxKS5mb3JFYWNoKGZ1bmN0aW9uKHByb3AsaSxwcm9wcyl7XG4gICAgICAgICAgaWYgKG1vZGVsLnN0cnVjdHVyZVtwcm9wXSkgbW9kZWwgPSBtb2RlbC5zdHJ1Y3R1cmVbcHJvcF07XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3TW9kZWw7XG4gICAgICAgICAgICBpZiAoaSA8IHByb3BzLmxlbmd0aCAtIDEpe1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IG5ldyBGYWppdGEuTW9kZWw7ICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IChfLmlzQXJyYXkodmFsKSk/bmV3IEZhaml0YS5Db2xsZWN0aW9uKHZhbCk6bmV3IEZhaml0YS5Nb2RlbCh2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3TW9kZWwucGFyZW50TW9kZWxzLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgbW9kZWwuc3RydWN0dXJlW3Byb3BdID0gbmV3TW9kZWw7XG4gICAgICAgICAgICBtb2RlbC5saXN0ZW5UbyhuZXdNb2RlbCxcImNoYW5nZSBhZGRcIixmdW5jdGlvbihuZXdNb2RlbCxvcHRpb25zKXtcbiAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8qIFRPRE86IGludmVudCBlbnRpcmUgc3lzdGVtIGZvciB0cmF2ZXJzaW5nIGFuZCBmaXJpbmcgZXZlbnRzLiBQcm9iYWJseSBub3Qgd29ydGggdGhlIGVmZm9ydCBmb3Igbm93LlxuICAgICAgICAgICAgICBPYmplY3Qua2V5cyhtb2RlbC5jaGFuZ2VkQXR0cmlidXRlcygpKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlOlwiK3Byb3ArXCIuXCIra2V5KVxuICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAqL1xuXG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIFxuXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICByZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG4gICAgfVxuXG5cbiAgICAgIFxuICAgICBcbiAgfVxuICAvL05vdGU6IHRoZXJlIGlzIHN0aWxsIG5vIGxpc3RlbmVyIGZvciBhIHN1Ym1vZGVsIG9mIGEgY29sbGVjdGlvbiBjaGFuZ2luZywgdHJpZ2dlcmluZyB0aGUgcGFyZW50LiBJIHRoaW5rIHRoYXQncyB1c2VmdWwuXG59KTsiLCJleHBvcnQgZGVmYXVsdCBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIFxufSkiLCIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgTW9kZWwgZnJvbSBcIi4vTW9kZWxcIjtcblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIG1vZGVsOk1vZGVsLCAvL3Byb2JsZW06IE1vZGVsIHJlbGllcyBvbiBjb2xsZWN0aW9uIGFzIHdlbGwgY2F1c2luZyBlcnJvclxuICAgIGluaXRpYWxpemU6ZnVuY3Rpb24oKXtcbiAgICAgICAgIHRoaXMucGFyZW50TW9kZWxzID0gW107XG4gICAgICAgIC8vdHJpZ2dlciBcInVwZGF0ZVwiIHdoZW4gc3VibW9kZWwgY2hhbmdlc1xuICAgICAgICB0aGlzLm9uKFwiYWRkXCIsZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyhtb2RlbCxcImNoYW5nZVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG59KTsiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuXG5leHBvcnQgZGVmYXVsdCBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG4gICAgbmFtZTpudWxsLFxuICAgIGJ1aWxkOm51bGwsXG4gICAgcmVuZGVyOm51bGwsXG4gICAgaW5pdGlhbGl6ZTpmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgICAgaWYgKCF0aGlzLm5hbWUpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGEgbmFtZSBpbiB0aGUgcHJvdG90eXBlLlwiKTtcbiAgICAgICAgdGhpcy52YWwgPSBvcHRpb25zLnZhbDtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvL3ZpZXcgaXMgdGhlIHZpZXcgdGhhdCBpbXBsZW1lbnRzIHRoaXMgZGlyZWN0aXZlLlxuICAgICAgICBpZiAoIW9wdGlvbnMudmlldykgY29uc29sZS5lcnJvcihcIkVycm9yOiBEaXJlY3RpdmUgcmVxdWlyZXMgYSB2aWV3IHBhc3NlZCBhcyBhbiBvcHRpb24uXCIpO1xuICAgICAgICB0aGlzLnZpZXcgPSBvcHRpb25zLnZpZXc7XG4gICAgICAgIGlmICghdGhpcy5jaGlsZEluaXQpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGNoaWxkSW5pdCBpbiBwcm90b3R5cGUuXCIpO1xuICAgICAgICB0aGlzLmNoaWxkSW5pdCgpO1xuICAgICAgICB0aGlzLmJ1aWxkKCk7XG4gICAgfSxcbiAgICBjaGlsZEluaXQ6ZnVuY3Rpb24oKXtcbiAgICAgICBcbiAgICAgICAgdGhpcy51cGRhdGVSZXN1bHQoKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnZpZXcudmlld01vZGVsLFwiY2hhbmdlOlwiK3RoaXMudmFsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVJlc3VsdCgpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuICAgIHVwZGF0ZVJlc3VsdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgcmVzdWx0ID0gdGhpcy52aWV3LmdldCh0aGlzLnZhbCk7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ocmVzdWx0KSkgdGhpcy5yZXN1bHQgPSByZXN1bHQuY2FsbCh0aGlzLnZpZXcpO1xuICAgICAgICBlbHNlIHRoaXMucmVzdWx0ID0gcmVzdWx0O1xuICAgIH1cbn0pOyIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbi8vTm90ZTogRG9uJ3QgdXNlIC5odG1sKCkgb3IgLmF0dHIoKSBqcXVlcnkuIEl0J3Mgd2VpcmQgd2l0aCBkaWZmZXJlbnQgdHlwZXMuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiY29udGVudFwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLHRoaXMucmVzdWx0KVxuICAgICAgICBlbHNlIHRoaXMuZWwuaW5uZXJIVE1MID0gdGhpcy5yZXN1bHQ7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5idWlsZCgpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHZhciBwYXNzID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikge1xuICAgICAgICAgICAgaWYgKHRoaXMuZWwuZ2V0QXR0cmlidXRlKFwidGl0bGVcIik9PXZhbHVlICsgXCJcIikgcGFzcyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5lbC5pbm5lckhUTUw9PXZhbHVlK1wiXCIpIHBhc3MgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgfVxufSk7IiwiLy9XaHkgZG9lcyB1bmRlcnNjb3JlIHdvcmsgaGVyZT9cblxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcImVuYWJsZVwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsdHJ1ZSk7XG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIixcIlwiKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpIT12YWx1ZTtcbiAgICB9XG59KTtcbiIsIi8vV2h5IGRvZXMgdW5kZXJzY29yZSB3b3JrIGhlcmU/XG5cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJkaXNhYmxlXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpPT12YWx1ZTtcbiAgICB9XG59KTtcbiIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJocmVmXCIsXG4gICBcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSB0aGlzLiRlbC5hdHRyKFwiaHJlZlwiLHRoaXMucmVzdWx0KTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgICAgICAgICAgYS5jbGFzc0xpc3QuYWRkKFwid3JhcHBlci1hXCIpXG4gICAgICAgICAgICBhLnNldEF0dHJpYnV0ZShcImhyZWZcIix0aGlzLnJlc3VsdCk7XG4gICAgICAgICAgICB0aGlzLndyYXBwZXJBID0gYTtcbiAgICAgICAgICAgIHRoaXMuZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQodGhpcy53cmFwcGVyQSx0aGlzLmVsKVxuICAgICAgICAgICAgLy9jYW4ndCBzaW1wbHkgdXNlIHRoaXMuJGVsLndyYXAoYSk7XG4gICAgICAgICAgICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTcwNzMyOC93cmFwLW9uZS1lbGVtZW50LXdpdGgtYW5vdGhlci1yZXRhaW5pbmctcmVmZXJlbmNlLXRvLXdyYXBwZXJcbiAgICAgICAgICAgIHRoaXMud3JhcHBlckEuYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93LndyYXBwZXJBID0gdGhpcy53cmFwcGVyQTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSAkKHRoaXMuZWwpLmF0dHIoXCJocmVmXCIsdGhpcy5yZXN1bHQpXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy53cmFwcGVyQS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIsdGhpcy5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgaWYgKHRoaXMuJGVsLnByb3AoXCJ0YWdOYW1lXCIpPT1cIkFcIikgcmV0dXJuICQodGhpcy5lbCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucGFyZW50KCkucHJvcChcInRhZ05hbWVcIik9PVwiQVwiICYmICQodGhpcy5lbCkucGFyZW50KCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIH1cbiAgICB9XG59KTsiLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiYWJzdHJhY3RzdWJ2aWV3XCIsXG4gICAgX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgYXJncyA9IHRoaXMudmFsLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgdGhpcy5zdWJWaWV3TmFtZSA9IGFyZ3NbMF07XG4gICAgICAgICBpZiAoYXJnc1sxXSl7XG4gICAgICAgICAgICB0aGlzLnN1Yk1vZGVsTmFtZSA9IGFyZ3NbMV07XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSB0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpOyAvL2NoYW5nZWQgZnJvbSBzdWJNb2RlbE5hbWUuXG4gICAgICAgICAgICBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCkgdGhpcy5zdWJNb2RlbCA9IG1vZGVsO1xuICAgICAgICAgICAgZWxzZSBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Db2xsZWN0aW9uKSB0aGlzLnN1YkNvbGxlY3Rpb24gPSBtb2RlbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCksKG1vZGVsIGluc3RhbmNlb2YgQmFja2JvbmUuQ29sbGVjdGlvbiksdGhpcy5zdWJDb2xsZWN0aW9uKVxuICAgICAgICAgICAgLy9kZWJ1Z2dlcjtcbiAgICAgICAgIH1cbiAgICB9LFxuICAgIF9pbml0aWFsaXplQ2hpbGRNYXBwaW5nczpmdW5jdGlvbigpe1xuICAgICAgICAvL1RoZSBKU09OIG9iamVjdCB0byBwYXNzIGFzIFwidGVtcGxhdGVWYWx1ZXNcIiB0byB0aGUgc3VidmlldyBvciB0aGUgaXRlbSBpbiB0aGUgc3ViQ29sbGVjdGlvbi5cbiAgICAgICAgIC8vRG8gbm90IHNob3J0ZW4gdG8gdmlldy5nZXQuIHZpZXcuZ2V0IGdldHMgZnJvbSB0aGUgdmlld01vZGVsIHdoaWNoIGNvbnRhaW5zIHByb3BzIGFuZCB2YWx1ZXMuLi5ub3QgdmlldyBwcm9wcyBhbmQgYXBwIHByb3BzXG4gICAgICAgIHRoaXMuY2hpbGRNYXBwaW5ncyA9IHRoaXMudmlldy50ZW1wbGF0ZVZhbHVlcyAmJiB0aGlzLnZpZXcudGVtcGxhdGVWYWx1ZXNbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgfSxcbiAgICBfaW5pdGlhbGl6ZWRlZmF1bHRzT3ZlcnJpZGU6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy9Ob3Qgc2hvcnRlbmVkIHRvIHZpZXcuZ2V0IGJlY2F1c2UgSSdtIG5vdCBzdXJlIGlmIGl0IGlzIHVzZWZ1bCB0byBkbyBzby5cbiAgICAgICAgLy92aWV3LmdldCBnZXRzIHRoZSBhcHAgdmFsdWUgbWFwcGVkIHRvIHRoZSBkZWZhdWx0IHZhbHVlLCBhbmQgaWYgbm90IHRoZW4gaXQgZ2V0cyB0aGUgZGVmYXVsdCB2YWx1ZS5cbiAgICAgICAgLy9JIHRoaW5rIHlvdSdyZSBqdXN0IG92ZXJyaWRpbmcgZGVmYXVsdHMgd2l0aCBkZWZhdWx0cywgYW5kIG5vdGhpbmcgZmFuY2llciB0aGFuIHRoYXQuXG4gICAgICAgIC8vdGhpcy5kZWZhdWx0c092ZXJyaWRlID0gdGhpcy52aWV3LmRlZmF1bHRzICYmIHRoaXMudmlldy5kZWZhdWx0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgLy9OZXZlcm1pbmQgaXQgaXMgdXNlZnVsIHRvIHVzZSAuZ2V0IGJlY2F1c2UgaWYgdGhlcmUgYXJlIG5lc3RlZCBuZXN0ZWQgdmlld3MsIHlvdSBjYW4ndCBqdXN0IGdvIHRvIHRoZSBkZWZhdWx0cyBvZiB0aGF0IHZpZXcuIFRoZXkgbWlnaHQgYmUgb3ZlcnJpZGRlbi5cblxuICAgICAgICB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUgPSB0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpO1xuICAgIH0sXG5cblxuXG4gICAgX2luaXRpYWxpemVDaGlsZFZpZXdzOmZ1bmN0aW9uKCl7XG5cbiAgICB9XG59KSIsIi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuaW1wb3J0IEFic3RyYWN0U3VidmlldyBmcm9tIFwiLi9hYnN0cmFjdC1zdWJ2aWV3XCJcbmV4cG9ydCBkZWZhdWx0IEFic3RyYWN0U3Vidmlldy5leHRlbmQoe1xuICAgIG5hbWU6XCJtYXBcIixcbiAgICBfaW5pdGlhbGl6ZUNoaWxkVmlld3M6ZnVuY3Rpb24oKXtcblxuXG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJhZGRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJBZGQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZXNldFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclJlc2V0KCk7XG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZW1vdmVcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJSZW1vdmUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJzb3J0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyU29ydCgpOyAgICAgICAgXG4gICAgICAgIH0pO1xuXG5cblxuICAgICAgICAvL01hcCBtb2RlbHMgdG8gY2hpbGRWaWV3IGluc3RhbmNlcyB3aXRoIHRoZWlyIHRlbXBsYXRlVmFsdWVzXG4gICAgICAgIHRoaXMuQ2hpbGRWaWV3ID0gdGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgICAgIHRoaXMuY2hpbGRWaWV3T3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHRlbXBsYXRlVmFsdWVzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgdGFnTmFtZTp0aGlzLnZpZXcuY2hpbGRWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXS5wcm90b3R5cGUudGFnTmFtZSB8fCBcInN1Yml0ZW1cIixcbiAgICAgICAgICAgIGRlZmF1bHRzT3ZlcnJpZGU6dGhpcy5kZWZhdWx0c092ZXJyaWRlXG4gICAgICAgIH07XG5cblxuICAgICAgICB0aGlzLmNoaWxkVmlld3MgPSB0aGlzLnN1YkNvbGxlY3Rpb24ubWFwKGZ1bmN0aW9uKGNoaWxkTW9kZWwsaSl7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBjaGlsZFZpZXdPcHRpb25zID0gXy5leHRlbmQoe30sdGhpcy5jaGlsZFZpZXdPcHRpb25zLHtcbiAgICAgICAgICAgICAgICBtb2RlbDpjaGlsZE1vZGVsLFxuICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgbGFzdEluZGV4OnRoaXMuc3ViQ29sbGVjdGlvbi5sZW5ndGggLSBpIC0gMSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNPdmVycmlkZSAmJiB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUubW9kZWxzW2ldICYmIHRoaXMuZGVmYXVsdHNPdmVycmlkZS5tb2RlbHNbaV0uYXR0cmlidXRlcyxcbiAgICAgICAgICAgICAgICAvL0p1c3QgYWRkZWQgY2hlY2sgZm9yIHRoaXMuZGVmYXVsdHNPdmVycmlkZS5tb2RlbHNbaV1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgY2hpbGR2aWV3ID0gbmV3IHRoaXMuQ2hpbGRWaWV3KGNoaWxkVmlld09wdGlvbnMpO1xuICAgICAgICAgICAgLy9jaGlsZHZpZXcuX3NldEF0dHJpYnV0ZXMoXy5leHRlbmQoe30sIF8ucmVzdWx0KGNoaWxkdmlldywgJ2F0dHJpYnV0ZXMnKSkpO1xuICAgICAgICAgICAgcmV0dXJuIGNoaWxkdmlldztcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIH0sXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdCgpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQ2hpbGRNYXBwaW5ncygpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplZGVmYXVsdHNPdmVycmlkZSgpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQ2hpbGRWaWV3cygpO1xuXG4gICAgICAgIFxuICAgICAgXG5cbiAgICAgICAgXG4gICAgICAgIFxuXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgXG4gICAgfSxcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMuc3ViQ29sbGVjdGlvbil7XG4gICAgICAgICAgICB0aGlzLiRlbC5yZXBsYWNlV2l0aCh0aGlzLnN1YlZpZXcuZWwpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB2YXIgJGNoaWxkcmVuID0gJCgpO1xuICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgICAgICRjaGlsZHJlbiA9ICRjaGlsZHJlbi5hZGQoY2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgICAgIGNoaWxkVmlldy5pbmRleCA9IGk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgaWYgKCRjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRlbC5yZXBsYWNlV2l0aCgkY2hpbGRyZW4pO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aGlzLiRwYXJlbnQgPSAkY2hpbGRyZW4ucGFyZW50KClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gdGhpcy4kZWwucGFyZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbiA9ICRjaGlsZHJlblxuICAgICAgICB9XG4gICAgfSxcbiAgICByZW5kZXJBZGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gW107XG4gICAgICAgIHRoaXMuc3ViQ29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKG1vZGVsLGkpe1xuICAgICAgICAgICAgdmFyIGV4aXN0aW5nQ2hpbGRWaWV3ID0gdGhpcy5jaGlsZFZpZXdzLmZpbHRlcihmdW5jdGlvbihjaGlsZFZpZXcpe1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZFZpZXcubW9kZWwgPT0gbW9kZWxcbiAgICAgICAgICAgIH0pWzBdO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nQ2hpbGRWaWV3KSB7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaChleGlzdGluZ0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICAvL3ZhciBhdHRyaWJ1dGVzID0gXy5leHRlbmQoe30sIF8ucmVzdWx0KGV4aXN0aW5nQ2hpbGRWaWV3LCAnYXR0cmlidXRlcycpKVxuICAgICAgICAgICAgICAgIC8vZXhpc3RpbmdDaGlsZFZpZXcuX3NldEF0dHJpYnV0ZXMoYXR0cmlidXRlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3Q2hpbGRWaWV3ID0gbmV3IHRoaXMuQ2hpbGRWaWV3KHtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWw6bW9kZWwsXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVmFsdWVzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdEluZGV4OnRoaXMuc3ViQ29sbGVjdGlvbi5sZW5ndGggLSBpIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6dGhpcy52aWV3LmdldCh0aGlzLnZhbC5zcGxpdChcIjpcIilbMF0pW2ldXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MucHVzaChuZXdDaGlsZFZpZXcpO1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2gobmV3Q2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpe1xuICAgICAgICAgICAgdGhpcy4kcGFyZW50LmFwcGVuZChjaGlsZClcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9ICQoY2hpbGRyZW4pXG4gICAgICAgIFxuICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICBjaGlsZFZpZXcuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgfSlcblxuICAgIH0sXG4gICAgcmVuZGVyUmVzZXQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgfSxcbiAgICByZW5kZXJSZW1vdmU6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4ubGFzdCgpLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmNoaWxkVmlld3Muc3BsaWNlKC0xLDEpO1xuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9IHRoaXMuJHBhcmVudC5jaGlsZHJlbigpO1xuICAgIH0sXG4gICAgcmVuZGVyU29ydDpmdW5jdGlvbigpe1xuICAgICAgICBcbiAgICAgICAgLy9Eb24ndCBuZWVkIHRoaXMgKG5vdykuIE1vZGVscyB3aWxsIGFscmVhZHkgYmUgc29ydGVkIG9uIGFkZCB3aXRoIGNvbGxlY3Rpb24uY29tcGFyYXRvciA9IHh4eDtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy90aGlzLnZpZXcgaXMgaW5zdGFuY2Ugb2YgdGhlIHZpZXcgdGhhdCBjb250YWlucyB0aGUgc3VidmlldyBkaXJlY3RpdmUuXG4gICAgICAgIC8vdGhpcy5zdWJWaWV3IGlzIGluc3RhbmNlIG9mIHRoZSBzdWJ2aWV3XG4gICAgICAgIC8vdGhpcyBpcyB0aGUgZGlyZWN0aXZlLlxuXG4gICAgICAgIGlmICh0aGlzLnN1YlZpZXcpe1xuICAgICAgICAgICAgLy93aHkgcGFyZW50Tm9kZT9cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZpZXcuZWwuY29udGFpbnModGhpcy5zdWJWaWV3LmVsLnBhcmVudE5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB2YXIgcGFzcyA9IHRydWU7XG4gICAgICAgICAgICB2YXIgZWwgPSB0aGlzLnZpZXcuZWxcbiAgICAgICAgICAgIHRoaXMuJGNoaWxkcmVuLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoIWVsLmNvbnRhaW5zKHRoaXMpKSBwYXNzID0gZmFsc2U7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICByZXR1cm4gcGFzcztcbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgfVxufSkiLCIvKmltcG9ydCAkIGZyb20gXCJqcXVlcnlcIjsqL1xuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcIm9wdGlvbmFsXCIsXG4gICAgXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCkgJCh0aGlzLmVsKS5oaWRlKClcbiAgICAgICAgZWxzZSAkKHRoaXMuZWwpLmNzcyhcImRpc3BsYXlcIixcIlwiKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLmhpZGUoKVxuICAgICAgICBlbHNlICQodGhpcy5lbCkuY3NzKFwiZGlzcGxheVwiLFwiXCIpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLmVsKSkgdGhyb3cgRXJyb3IoXCJlbGVtZW50IGhhcyB0byBiZSBpbiB0aGUgRE9NIGluIG9yZGVyIHRvIHRlc3RcIilcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkuaXMoXCI6dmlzaWJsZVwiKT09dmFsdWU7XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwib3B0aW9uYWx3cmFwXCIsXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIERpcmVjdGl2ZS5wcm90b3R5cGUuY2hpbGRJbml0LmNhbGwodGhpcyxhcmd1bWVudHMpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy53cmFwcGVyID0gdGhpcy5lbDtcbiAgICAgICAgdGhpcy5jaGlsZE5vZGVzID0gW10uc2xpY2UuY2FsbCh0aGlzLmVsLmNoaWxkTm9kZXMsIDApO1xuICAgICAgICBcbiAgICB9LFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5jaGlsZE5vZGVzKS51bndyYXAoKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KXtcbiAgICAgICAgICAgICQodGhpcy5jaGlsZE5vZGVzKS51bndyYXAoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgaWYgKCFkb2N1bWVudC5ib2R5LmNvbnRhaW5zKHRoaXMuY2hpbGROb2Rlc1swXSkpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGaXJzdCBjaGlsZCBoYXMgdG8gYmUgaW4gRE9NXCIpO1xuICAgICAgICAgICAgICAgIC8vc29sdXRpb246IGFkZCBhIGR1bW15IHRleHQgbm9kZSBhdCBiZWdpbm5pbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCFkb2N1bWVudC5ib2R5LmNvbnRhaW5zKHRoaXMud3JhcHBlcikpe1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGROb2Rlc1swXS5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLndyYXBwZXIsdGhpcy5jaGlsZE5vZGVzWzBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvcih2YXIgaT0wO2k8dGhpcy5jaGlsZE5vZGVzLmxlbmd0aDtpKyspe1xuICAgICAgICAgICAgICAgIHRoaXMud3JhcHBlci5hcHBlbmRDaGlsZCh0aGlzLmNoaWxkTm9kZXNbaV0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuXG5cbiAgICAgICAgcmV0dXJuICh0aGlzLmNoaWxkTm9kZXNbMF0ucGFyZW50Tm9kZT09dGhpcy53cmFwcGVyKSA9PSB2YWx1ZTtcblxuXG4gICAgICBcbiAgICB9XG59KSIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJzcmNcIixcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLiRlbC5hdHRyKFwic3JjXCIsdGhpcy5yZXN1bHQpO1xuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGVsLmF0dHIoXCJzcmNcIix0aGlzLnJlc3VsdCk7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsLmF0dHIoXCJzcmNcIik9PT12YWx1ZTtcbiAgICB9XG59KTsiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcbmltcG9ydCBBYnN0cmFjdFN1YnZpZXcgZnJvbSBcIi4vYWJzdHJhY3Qtc3Vidmlld1wiXG5leHBvcnQgZGVmYXVsdCBBYnN0cmFjdFN1YnZpZXcuZXh0ZW5kKHtcbiAgICBuYW1lOlwic3Vidmlld1wiLFxuICAgIF9pbml0aWFsaXplQ2hpbGRWaWV3czpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLnByb3RvdHlwZSBpbnN0YW5jZW9mIEJhY2tib25lLlZpZXcpIHRoaXMuQ2hpbGRDb25zdHJ1Y3RvciA9IHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgZWxzZSB0aGlzLkNoaWxkQ29uc3RydWN0b3IgPSB0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0vKi5jYWxsKHRoaXMudmlldyk7Ki9cblxuICAgICAgICAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmRlZmF1bHRzT3ZlcnJpZGUpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7ZGVmYXVsdHNPdmVycmlkZTp0aGlzLmRlZmF1bHRzT3ZlcnJpZGV9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmNoaWxkTWFwcGluZ3Mpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVWYWx1ZXM6dGhpcy5jaGlsZE1hcHBpbmdzXG4gICAgICAgICAgICAgICAgLy8sZWw6dGhpcy5lbCBUaGUgZWwgb2YgdGhlIGRpcmVjdGl2ZSBzaG91bGQgYmVsb25nIHRvIHRoZSBkaXJlY3RpdmUgYnV0IG5vdCB0aGUgc3VidmlldyBpdHNlbGZcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBzdWJNb2RlbCA9IHRoaXMuc3ViTW9kZWwgfHwgdGhpcy52aWV3Lm1vZGVsO1xuICAgICAgICBpZiAoc3ViTW9kZWwpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7bW9kZWw6c3ViTW9kZWx9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldyA9IG5ldyB0aGlzLkNoaWxkQ29uc3RydWN0b3Iob3B0aW9ucyk7XG4gICAgICAgICAgICB2YXIgY2xhc3NlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImNsYXNzTmFtZVwiKVxuICAgICAgICAgICAgaWYgKGNsYXNzZXMpe1xuICAgICAgICAgICAgICAgIGNsYXNzZXMuc3BsaXQoXCIgXCIpLmZvckVhY2goZnVuY3Rpb24oY2wpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuY2xhc3NMaXN0LmFkZChjbClcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgYXR0cmlidXRlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImF0dHJpYnV0ZXNcIik7XG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlcyl7XG4gICAgICAgICAgICAgICAgXy5lYWNoKGF0dHJpYnV0ZXMsZnVuY3Rpb24odmFsLG5hbWUpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuc2V0QXR0cmlidXRlKG5hbWUsdmFsKSAgICBcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnQgPSB0aGlzLnZpZXc7XG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcucGFyZW50RGlyZWN0aXZlID0gdGhpcztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnNTZW50VG9TdWJWaWV3ID0gb3B0aW9ucztcbiAgICB9LFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICAvL3RoaXMudmFsLCB0aGlzLnZpZXdcblxuICAgICAgICB0aGlzLl9pbml0aWFsaXplQmFja2JvbmVPYmplY3QoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3MoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZWRlZmF1bHRzT3ZlcnJpZGUoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkVmlld3MoKTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgXG4gICAgICBcblxuICAgICAgICBpZiAodGhpcy5zdWJDb2xsZWN0aW9uKXsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJhZGRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckFkZCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZXNldFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyUmVzZXQoKTtcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZW1vdmVcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJzb3J0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJTb3J0KCk7ICAgICAgICBcbiAgICAgICAgICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgICAgICAgICAvL01hcCBtb2RlbHMgdG8gY2hpbGRWaWV3IGluc3RhbmNlcyB3aXRoIHRoZWlyIHRlbXBsYXRlVmFsdWVzXG4gICAgICAgICAgICAgICAgdGhpcy5DaGlsZFZpZXcgPSB0aGlzLnZpZXcuY2hpbGRWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld09wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVmFsdWVzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIHRhZ05hbWU6dGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlLnRhZ05hbWUgfHwgXCJzdWJpdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRzT3ZlcnJpZGU6dGhpcy5kZWZhdWx0c092ZXJyaWRlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MgPSB0aGlzLnN1YkNvbGxlY3Rpb24ubWFwKGZ1bmN0aW9uKGNoaWxkTW9kZWwsaSl7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB2YXIgY2hpbGRWaWV3T3B0aW9ucyA9IF8uZXh0ZW5kKHt9LHRoaXMuY2hpbGRWaWV3T3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlbDpjaGlsZE1vZGVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNPdmVycmlkZSAmJiB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUubW9kZWxzW2ldICYmIHRoaXMuZGVmYXVsdHNPdmVycmlkZS5tb2RlbHNbaV0uYXR0cmlidXRlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vSnVzdCBhZGRlZCBjaGVjayBmb3IgdGhpcy5kZWZhdWx0c092ZXJyaWRlLm1vZGVsc1tpXVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHZhciBjaGlsZHZpZXcgPSBuZXcgdGhpcy5DaGlsZFZpZXcoY2hpbGRWaWV3T3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIC8vY2hpbGR2aWV3Ll9zZXRBdHRyaWJ1dGVzKF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChjaGlsZHZpZXcsICdhdHRyaWJ1dGVzJykpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkdmlldztcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuXG5cbiAgICAgICAgICAgICAgICBcblxuXG5cbiAgICAgICAgfVxuXG4gICAgICAgXG4gICAgICAgIFxuICAgICAgICBcblxuICAgICAgICBpZiAoIXRoaXMuc3ViQ29sbGVjdGlvbil7XG4gICAgICAgICAgICBpZiAodGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLnByb3RvdHlwZSBpbnN0YW5jZW9mIEJhY2tib25lLlZpZXcpIHRoaXMuQ2hpbGRDb25zdHJ1Y3RvciA9IHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgICAgIGVsc2UgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLyouY2FsbCh0aGlzLnZpZXcpOyovXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuZGVmYXVsdHNPdmVycmlkZSl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNPdmVycmlkZX0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuY2hpbGRNYXBwaW5ncyl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp0aGlzLmNoaWxkTWFwcGluZ3NcbiAgICAgICAgICAgICAgICAvLyxlbDp0aGlzLmVsIFRoZSBlbCBvZiB0aGUgZGlyZWN0aXZlIHNob3VsZCBiZWxvbmcgdG8gdGhlIGRpcmVjdGl2ZSBidXQgbm90IHRoZSBzdWJ2aWV3IGl0c2VsZlxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHN1Yk1vZGVsID0gdGhpcy5zdWJNb2RlbCB8fCB0aGlzLnZpZXcubW9kZWw7XG4gICAgICAgIGlmIChzdWJNb2RlbCl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHttb2RlbDpzdWJNb2RlbH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy5zdWJWaWV3ID0gbmV3IHRoaXMuQ2hpbGRDb25zdHJ1Y3RvcihvcHRpb25zKTtcbiAgICAgICAgICAgIHZhciBjbGFzc2VzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiY2xhc3NOYW1lXCIpXG4gICAgICAgICAgICBpZiAoY2xhc3Nlcyl7XG4gICAgICAgICAgICAgICAgY2xhc3Nlcy5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihjbCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5jbGFzc0xpc3QuYWRkKGNsKVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiYXR0cmlidXRlc1wiKTtcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgICAgICBfLmVhY2goYXR0cmlidXRlcyxmdW5jdGlvbih2YWwsbmFtZSl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5zZXRBdHRyaWJ1dGUobmFtZSx2YWwpICAgIFxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zdWJWaWV3LnBhcmVudCA9IHRoaXMudmlldztcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnREaXJlY3RpdmUgPSB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9uc1NlbnRUb1N1YlZpZXcgPSBvcHRpb25zO1xuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgodGhpcy5zdWJWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyICRjaGlsZHJlbiA9ICQoKTtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAkY2hpbGRyZW4gPSAkY2hpbGRyZW4uYWRkKGNoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICBjaGlsZFZpZXcuaW5kZXggPSBpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIGlmICgkY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgoJGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkVmlldy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gJGNoaWxkcmVuLnBhcmVudCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkY2hpbGRyZW5cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyQWRkOmZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IFtdO1xuICAgICAgICB0aGlzLnN1YkNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihtb2RlbCxpKXtcbiAgICAgICAgICAgIHZhciBleGlzdGluZ0NoaWxkVmlldyA9IHRoaXMuY2hpbGRWaWV3cy5maWx0ZXIoZnVuY3Rpb24oY2hpbGRWaWV3KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRWaWV3Lm1vZGVsID09IG1vZGVsXG4gICAgICAgICAgICB9KVswXTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ0NoaWxkVmlldykge1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goZXhpc3RpbmdDaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICAgICAgLy92YXIgYXR0cmlidXRlcyA9IF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChleGlzdGluZ0NoaWxkVmlldywgJ2F0dHJpYnV0ZXMnKSlcbiAgICAgICAgICAgICAgICAvL2V4aXN0aW5nQ2hpbGRWaWV3Ll9zZXRBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld0NoaWxkVmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyh7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsOm1vZGVsLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp0aGlzLmNoaWxkTWFwcGluZ3MsXG4gICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOnRoaXMudmlldy5nZXQodGhpcy52YWwuc3BsaXQoXCI6XCIpWzBdKVtpXVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnB1c2gobmV3Q2hpbGRWaWV3KTtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKG5ld0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKXtcbiAgICAgICAgICAgIHRoaXMuJHBhcmVudC5hcHBlbmQoY2hpbGQpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkKGNoaWxkcmVuKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIH0pXG5cbiAgICB9LFxuICAgIHJlbmRlclJlc2V0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgIH0sXG4gICAgcmVuZGVyUmVtb3ZlOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGNoaWxkcmVuLmxhc3QoKS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnNwbGljZSgtMSwxKTtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSB0aGlzLiRwYXJlbnQuY2hpbGRyZW4oKTtcbiAgICB9LFxuICAgIHJlbmRlclNvcnQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgIC8vRG9uJ3QgbmVlZCB0aGlzIChub3cpLiBNb2RlbHMgd2lsbCBhbHJlYWR5IGJlIHNvcnRlZCBvbiBhZGQgd2l0aCBjb2xsZWN0aW9uLmNvbXBhcmF0b3IgPSB4eHg7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vdGhpcy52aWV3IGlzIGluc3RhbmNlIG9mIHRoZSB2aWV3IHRoYXQgY29udGFpbnMgdGhlIHN1YnZpZXcgZGlyZWN0aXZlLlxuICAgICAgICAvL3RoaXMuc3ViVmlldyBpcyBpbnN0YW5jZSBvZiB0aGUgc3Vidmlld1xuICAgICAgICAvL3RoaXMgaXMgdGhlIGRpcmVjdGl2ZS5cblxuICAgICAgICBpZiAodGhpcy5zdWJWaWV3KXtcbiAgICAgICAgICAgIC8vd2h5IHBhcmVudE5vZGU/XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aWV3LmVsLmNvbnRhaW5zKHRoaXMuc3ViVmlldy5lbC5wYXJlbnROb2RlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyIHBhc3MgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGVsID0gdGhpcy52aWV3LmVsXG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbi5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCFlbC5jb250YWlucyh0aGlzKSkgcGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbn0pIiwiLyppbXBvcnQgXyBmcm9tIFwidW5kZXJzY29yZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiZGF0YVwiLFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmNvbnRlbnQgPSB0aGlzLnZpZXcudmlld01vZGVsLmdldCh0aGlzLnZhbCk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy52aWV3LnZpZXdNb2RlbCxcImNoYW5nZTpcIit0aGlzLnZhbCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5jb250ZW50ID0gdGhpcy52aWV3LnZpZXdNb2RlbC5nZXQodGhpcy52YWwpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgXy5lYWNoKHRoaXMuY29udGVudCxmdW5jdGlvbih2YWwscHJvcCl7XG4gICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsKSkgdmFsID0gdmFsLmJpbmQodGhpcy52aWV3KTtcbiAgICAgICAgICAgdGhpcy4kZWwuYXR0cihcImRhdGEtXCIrcHJvcCx2YWwpXG4gICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgXy5lYWNoKHRoaXMuY29udGVudCxmdW5jdGlvbih2YWwscHJvcCl7XG4gICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsKSkgdmFsID0gdmFsLmJpbmQodGhpcy52aWV3KTtcbiAgICAgICAgICAgdGhpcy4kZWwuYXR0cihcImRhdGEtXCIrcHJvcCx2YWwpXG4gICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH1cbn0pOyIsImltcG9ydCBEaXJlY3RpdmVDb250ZW50IGZyb20gXCIuL2RpcmVjdGl2ZS1jb250ZW50XCI7XG5pbXBvcnQgRGlyZWN0aXZlRW5hYmxlIGZyb20gXCIuL2RpcmVjdGl2ZS1lbmFibGVcIjtcbmltcG9ydCBEaXJlY3RpdmVEaXNhYmxlIGZyb20gXCIuL2RpcmVjdGl2ZS1kaXNhYmxlXCI7XG5pbXBvcnQgRGlyZWN0aXZlSHJlZiBmcm9tIFwiLi9kaXJlY3RpdmUtaHJlZlwiO1xuaW1wb3J0IERpcmVjdGl2ZU1hcCBmcm9tIFwiLi9kaXJlY3RpdmUtbWFwXCI7XG5pbXBvcnQgRGlyZWN0aXZlT3B0aW9uYWwgZnJvbSBcIi4vZGlyZWN0aXZlLW9wdGlvbmFsXCI7XG5pbXBvcnQgRGlyZWN0aXZlT3B0aW9uYWxXcmFwIGZyb20gXCIuL2RpcmVjdGl2ZS1vcHRpb25hbHdyYXBcIjtcbmltcG9ydCBEaXJlY3RpdmVTcmMgZnJvbSBcIi4vZGlyZWN0aXZlLXNyY1wiO1xuaW1wb3J0IERpcmVjdGl2ZVN1YnZpZXcgZnJvbSBcIi4vZGlyZWN0aXZlLXN1YnZpZXdcIjtcbmltcG9ydCBEaXJlY3RpdmVEYXRhIGZyb20gXCIuL2RpcmVjdGl2ZS1kYXRhXCI7XG5cbnZhciByZWdpc3RyeSA9IHtcbiAgICBDb250ZW50OkRpcmVjdGl2ZUNvbnRlbnQsXG4gICAgRW5hYmxlOkRpcmVjdGl2ZUVuYWJsZSxcbiAgICBEaXNhYmxlOkRpcmVjdGl2ZURpc2FibGUsXG4gICAgSHJlZjpEaXJlY3RpdmVIcmVmLFxuICAgIE1hcDpEaXJlY3RpdmVNYXAsXG4gICAgT3B0aW9uYWw6RGlyZWN0aXZlT3B0aW9uYWwsXG4gICAgT3B0aW9uYWxXcmFwOkRpcmVjdGl2ZU9wdGlvbmFsV3JhcCxcbiAgICBTcmM6RGlyZWN0aXZlU3JjLFxuICAgIFN1YnZpZXc6RGlyZWN0aXZlU3VidmlldyxcbiAgICBEYXRhOkRpcmVjdGl2ZURhdGFcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHJlZ2lzdHJ5OyIsIi8qaW1wb3J0ICQgZnJvbSBcImpxdWVyeVwiOyovXG4vKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlUmVnaXN0cnkgZnJvbSBcIi4vZGlyZWN0aXZlL2RpcmVjdGl2ZVJlZ2lzdHJ5LmpzXCJcbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlL2RpcmVjdGl2ZS5qc1wiXG5pbXBvcnQgVmlld01vZGVsIGZyb20gXCIuL1ZpZXdNb2RlbFwiO1xuXG5cblxudmFyIGJhY2tib25lVmlld09wdGlvbnMgPSBbJ21vZGVsJywgJ2NvbGxlY3Rpb24nLCAnZWwnLCAnaWQnLCAnYXR0cmlidXRlcycsICdjbGFzc05hbWUnLCAndGFnTmFtZScsICdldmVudHMnXTtcbnZhciBhZGRpdGlvbmFsVmlld09wdGlvbnMgPSBbJ3dhcm4nLCd0ZW1wbGF0ZVZhbHVlcycsJ3RlbXBsYXRlU3RyaW5nJywnY2hpbGRWaWV3SW1wb3J0cycsJ3N1YlZpZXdJbXBvcnRzJywnaW5kZXgnLCdsYXN0SW5kZXgnLCdkZWZhdWx0c092ZXJyaWRlJ11cbmV4cG9ydCBkZWZhdWx0IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcbiAgICBnZXRBbGxUZXh0Tm9kZXM6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEwNzMwMzA5L2ZpbmQtYWxsLXRleHQtbm9kZXMtaW4taHRtbC1wYWdlXG4gICAgICAgIHZhciBuLCBhPVtdLCB3YWxrPWRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIodGhpcy5lbCxOb2RlRmlsdGVyLlNIT1dfVEVYVCxudWxsLGZhbHNlKTtcbiAgICAgICAgd2hpbGUobj13YWxrLm5leHROb2RlKCkpIGEucHVzaChuKTtcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgIFxuICAgIH0sXG4gICAgIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG5cbiAgICAgICAgdmFyIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAgIC8vQSB0ZW1wbGF0ZSBhbmQgZGVmYXVsdHMgYXJlIGFsbCBidXQgcmVxdWlyZWQuXG4gICAgICAgIGlmICh0aGlzLndhcm4gfHwgdHlwZW9mIHRoaXMud2Fybj09XCJ1bmRlZmluZWRcIil7XG4gICAgICAgICAgICBpZiAoIXRoaXMuanN0ICYmICF0aGlzLnRlbXBsYXRlU3RyaW5nKSBjb25zb2xlLndhcm4oXCJZb3UgcHJvYmFibHkgbmVlZCBhIHRlbXBsYXRlXCIpO1xuICAgICAgICAgICAgaWYgKCF0aGlzLmRlZmF1bHRzKSBjb25zb2xlLndhcm4oXCJZb3UgcHJvYmFibHkgbmVlZCBzb21lIGRlZmF1bHRzIGZvciB5b3VyIHZpZXdcIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvL0NvbnZlcnQgdGVtcGxhdGVTdHJpbmcgdG8gYSBqYXZhc2NyaXB0IHRlbXBsYXRlXG4gICAgICAgIGlmICghdGhpcy5qc3QpIHtcbiAgICAgICAgICAgIHRoaXMuanN0ID0gXy50ZW1wbGF0ZSh0aGlzLnRlbXBsYXRlU3RyaW5nIHx8IFwiXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9leHRlbmQgb25seSB2YWxpZCBvcHRpb25zXG4gICAgICAgIF8uZXh0ZW5kKHRoaXMsIF8ucGljayhvcHRpb25zLCBiYWNrYm9uZVZpZXdPcHRpb25zLmNvbmNhdChhZGRpdGlvbmFsVmlld09wdGlvbnMpKSk7XG5cbiAgICAgICAgXG5cbiAgICAgICAgXy5lYWNoKHRoaXMuZGVmYXVsdHMsIGZ1bmN0aW9uIChkZWYpIHtcbiAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24oZGVmKSkgY29uc29sZS53YXJuKFwiRGVmYXVsdHMgc2hvdWxkIHVzdWFsbHkgYmUgcHJpbWl0aXZlIHZhbHVlc1wiKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9kYXRhIGlzIHBhc3NlZCBpbiBvbiBzdWJ2aWV3c1xuICAgICAgICAvLyBjb21lcyBmcm9tIHRoaXMudmlldy52aWV3TW9kZWwuZ2V0KHRoaXMudmFsKTssIFxuICAgICAgICAvL3NvIGlmIHRoZSBkaXJlY3RpdmUgaXMgbm0tc3Vidmlldz1cIk1lbnVcIiwgdGhlbiB0aGlzLmRhdGEgc2hvdWxkIGJlLi4ud2hhdD9cbiAgICAgICAgLy9BaGEhIGRhdGEgaXMgdG8gb3ZlcnJpZGUgZGVmYXVsdCB2YWx1ZXMgZm9yIHN1YnZpZXdzIGJlaW5nIHBhcnQgb2YgYSBwYXJlbnQgdmlldy4gXG4gICAgICAgIC8vQnV0IGl0IGlzIG5vdCBtZWFudCB0byBvdmVycmlkZSB0ZW1wbGF0ZVZhbHVlcyBJIGRvbid0IHRoaW5rLlxuICAgICAgICB0aGlzLmRlZmF1bHRzT3ZlcnJpZGUgPSBvcHRpb25zICYmIG9wdGlvbnMuZGVmYXVsdHNPdmVycmlkZTtcblxuICAgICAgICBcbiAgICAgICAgXG5cbiAgICAgICAgdmFyIGF0dHJzID0gXy5leHRlbmQoXy5jbG9uZSh0aGlzLmRlZmF1bHRzKSwgb3B0aW9ucyAmJiBvcHRpb25zLmRlZmF1bHRzT3ZlcnJpZGUgfHwge30pO1xuICAgICAgICB0aGlzLnZpZXdNb2RlbCA9IG5ldyBGYWppdGEuVmlld01vZGVsKGF0dHJzKTtcblxuICAgICAgICAvL0kgd2FudCB0byB1c2UgdGhpcy5zZXQgaGVyZSBidXQgY2FuJ3QgZ2V0IGl0IHdvcmtpbmcgd2l0aG91dCByZXdyaXRpbmcgbW9kZWwuc2V0IHRvIHN1cHBvcnQgdHdvIGFyZ3VtZW50c1xuICAgICAgICBcblxuICAgICAgICAvL0ZvciBlYWNoIHN1YlZpZXcsIHNldCB0aGUgdmlld01vZGVsIHRvIGEgY29sbGVjdGlvbiBvZiB2aWV3cyAoaWYgaXQgaXMgYW4gYXJyYXkpIG9yIGEgdmlldy5cbiAgICAgICAgLy9JdCBzZW5kcyBpbiBkZWZhdWx0T3ZlcnJpZGUgYW5kIHRoaXMncyBtb2RlbCBhcyBhIG1vZGVsLlxuICAgICAgICBpZiAodGhpcy5zdWJWaWV3SW1wb3J0cyl7XG4gICAgICAgICAgICBmb3IodmFyIHByb3AgaW4gdGhpcy5zdWJWaWV3SW1wb3J0cyl7XG4gICAgICAgICAgICAgICAgaWYgKGF0dHJzW3Byb3BdIGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgICAgICAgICAgICAgICAvL3RoaXMudmlld01vZGVsLnNldChwcm9wLCBhdHRyc1twcm9wXS5tYXAob2JqPT57cmV0dXJuIF8uZXh0ZW5kKHt9LHRoaXMuc3ViVmlld0ltcG9ydHNbcHJvcF0ucHJvdG90eXBlLmRlZmF1bHRzLG9iail9KSlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3TW9kZWwuc2V0KHByb3AsXG4gICAgICAgICAgICAgICAgICAgIG5ldyBCYWNrYm9uZS5Db2xsZWN0aW9uKGF0dHJzW3Byb3BdLm1hcCgob2JqLGkpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdmlldyA9IG5ldyB0aGlzLnN1YlZpZXdJbXBvcnRzW3Byb3BdKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RlbDp0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRzT3ZlcnJpZGU6dGhpcy5kZWZhdWx0c1twcm9wXVtpXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge3ZpZXc6dmlld307XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICApKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy90aGlzLnZpZXdNb2RlbC5zZXQocHJvcCxfLmV4dGVuZCh7fSx0aGlzLnN1YlZpZXdJbXBvcnRzW3Byb3BdLnByb3RvdHlwZS5kZWZhdWx0cyxhdHRyc1twcm9wXSkpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlld01vZGVsLnNldChwcm9wLG5ldyB0aGlzLnN1YlZpZXdJbXBvcnRzW3Byb3BdKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGVsOnRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0c092ZXJyaWRlOnRoaXMuZGVmYXVsdHNbcHJvcF1cbiAgICAgICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgXG5cbiAgICAgICAgLy90ZW1wbGF0ZVZhbHVlcyBjb250YWluIHRlbXBsYXRlVmFsdWVzIG9mIHZpZXcgdmFyaWFibGVzIHRvIG1vZGVsIHZhcmlhYmxlcy5cbiAgICAgICAgLy9zdHJpbmdzIGFyZSByZWZlcmVuY2VzIHRvIG1vZGVsIHZhcmlhYmxlcy4gRnVuY3Rpb25zIGFyZSBmb3Igd2hlbiBhIHZpZXcgdmFyaWFibGUgZG9lc1xuICAgICAgICAvL25vdCBtYXRjaCBwZXJmZWN0bHkgd2l0aCBhIG1vZGVsIHZhcmlhYmxlLiBUaGVzZSBhcmUgdXBkYXRlZCBlYWNoIHRpbWUgdGhlIG1vZGVsIGNoYW5nZXMuXG4gICAgICAgIFxuXG4gICAgICAgIC8vUHJvYmxlbTogaWYgeW91IHVwZGF0ZSB0aGUgbW9kZWwgaXQgdXBkYXRlcyBmb3IgZXZlcnkgc3VidmlldyAobm90IGVmZmljaWVudCkuXG4gICAgICAgIC8vQW5kIGl0IGRvZXMgbm90IHVwZGF0ZSBmb3Igc3VibW9kZWxzLiBQZXJoYXBzIHRoZXJlIGFyZSBtYW55IGRpZmZlcmVudCBzb2x1dGlvbnMgZm9yIHRoaXMuXG4gICAgICAgIC8vWW91IGNhbiBoYXZlIGVhY2ggc3VibW9kZWwgdHJpZ2dlciBjaGFuZ2UgZXZlbnQuXG5cbiAgICAgICAgLy9XaGVuZXZlciB0aGUgbW9kZWwgY2hhbmdlcywgdXBkYXRlIHRoZSB2aWV3TW9kZWwgYnkgbWFwcGluZyBwcm9wZXJ0aWVzIG9mIHRoZSBtb2RlbCB0byBwcm9wZXJ0aWVzIG9mIHRoZSB2aWV3IChhc3NpZ25lZCBpbiB0ZW1wbGF0ZVZhbHVlcylcbiAgICAgICAgLy9BbHNvLCB0aGUgYXR0cmlidXRlcyBjaGFuZ2UuIFRoaXMgY2FuIGJlIGRvbmUgbW9yZSBlbGVnYW50bHlcbiAgICAgICAgaWYgKHRoaXMubW9kZWwpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2VcIiwgdGhpcy51cGRhdGVWaWV3TW9kZWwpO1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2V0QXR0cmlidXRlcyhfLmV4dGVuZCh7fSwgXy5yZXN1bHQodGhpcywgJ2F0dHJpYnV0ZXMnKSkpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMudXBkYXRlVmlld01vZGVsKCk7XG5cbiAgICAgICAgICAgIF8uZWFjaCh0aGlzLnRlbXBsYXRlVmFsdWVzLGZ1bmN0aW9uKHZhbCxrZXkpe1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsPT09XCJvYmplY3RcIil7XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3TW9kZWwuc2V0KGtleSxuZXcgdGhpcy5zdWJWaWV3SW1wb3J0c1trZXldKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGVsOnRoaXMubW9kZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVZhbHVlczp2YWxcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH0gXG4gICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIH1cblxuICAgICAgICAvL1Nob3VsZCB0aGUgdmlld01vZGVsIGNvbnRhaW4gdGhlIHN1YnZpZXdzIGluc3RlYWQgb2YgZGlyZWN0aXZlcz8gXG4gICAgICAgIC8vV2UgaGF2ZSBzdWJWaWV3SW1wb3J0cyBoYXZlIHRoZSBjb25zdHJ1Y3RvciwgXG4gICAgICAgIC8vVGhlIGRlZmF1bHRzIGNvbWUgZnJvbSBhIHN1Ymhhc2ggaW4gZGVmYXVsdHMsIGFuZCB0ZW1wbGF0ZVZhcnMgY29tZSBmcm9tIHRlbXBsYXRlVmFycy5cblxuXG4gICAgICAgIHZhciBhdHRycyA9IHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXM7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy52aWV3TW9kZWwuYXR0cmlidXRlcyk7XG4gICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICBpZiAoa2V5ID09PSBcImRlZmluaXRpb25zXCIgJiYgIXRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXNba2V5XSkge1xuICAgICAgICAgICAgICAgIC8vcHJvYmxlbSBpcyB0aGF0IHByb3BNYXAgKHNlZW1zIHRvIGJlIHRlbXBsYXRlVmFsdWVzIHdpdGggZnVuY3Rpb25zIGZpbHRlcmVkIG91dCkgaXMgXG4gICAgICAgICAgICAgICAgLy97ZGVmaW5pdGlvbnM6XCJkZWZpbml0aW9uc1wifS4gQ29tZXMgZnJvbSBhcnRpY2xlX2FydGljbGUuanNcbiAgICAgICAgICAgICAgICBkZWJ1Z2dlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgICAgICB0aGlzLl9lbnN1cmVFbGVtZW50KCk7XG4gICAgICAgIHRoaXMuYnVpbGRJbm5lckhUTUwoKTtcblxuICAgICAgICB0aGlzLmluaXREaXJlY3RpdmVzKCk7IC8vaW5pdCBzaW1wbGUgZGlyZWN0aXZlcy4uLnRoZSBvbmVzIHRoYXQganVzdCBtYW5pcHVsYXRlIGFuIGVsZW1lbnRcblxuICAgICAgICBcblxuXG4gICAgICAgIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcblxuICAgICAgICB0aGlzLmNoaWxkTm9kZXMgPSBbXS5zbGljZS5jYWxsKHRoaXMuZWwuY2hpbGROb2RlcywgMCk7XG5cbiAgICAgICAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSxcbiAgICBcbiAgICBpbml0aWFsaXplOmZ1bmN0aW9uKG9wdGlvbnMpe1xuICAgICAgICAvL2F0dGFjaCBvcHRpb25zIHRvIHZpZXcgKG1vZGVsLCBwcm9wTWFwLCBzdWJWaWV3cywgZXZlbnRzKVxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgXy5leHRlbmQodGhpcyxvcHRpb25zKTtcbiAgICB9LFxuICAgIGdldE1vZGVsQXR0cjpmdW5jdGlvbihhdHRyKXtcbiAgICAgICAgLy9xdWlja2x5IGdyYWIgYSBtb2RlbHMgYXR0cmlidXRlIGJ5IGEgdmlldyB2YXJpYWJsZS4gVXNlZnVsIGluIGNsYXNzbmFtZSBmdW5jdGlvbi5cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLnRlbXBsYXRlVmFsdWVzW2F0dHJdID09XCJzdHJpbmdcIikgcmV0dXJuIHRoaXMubW9kZWwuZ2V0KHRoaXMudGVtcGxhdGVWYWx1ZXNbYXR0cl0pO1xuICAgICAgICBlbHNlIHJldHVybiB0aGlzLnRlbXBsYXRlVmFsdWVzW2F0dHJdLmNhbGwodGhpcylcbiAgICB9LFxuICAgIHVwZGF0ZVZpZXdNb2RlbDpmdW5jdGlvbigpe1xuXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgdGhpcy52aWV3TW9kZWwuc2V0KF8ubWFwT2JqZWN0KHRoaXMudGVtcGxhdGVWYWx1ZXMsZnVuY3Rpb24obW9kZWxWYXIpe1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtb2RlbFZhcj09XCJzdHJpbmdcIikgcmV0dXJuIHRoaXMubW9kZWwuZ2V0KG1vZGVsVmFyKTtcbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBtb2RlbFZhcj09XCJmdW5jdGlvblwiKSByZXR1cm4gbW9kZWxWYXIuY2FsbCh0aGlzKVxuICAgICAgICB9LmJpbmQodGhpcykpKTtcblxuICAgICAgICBcblxuICAgICAgICBcbiAgICAgICAgXG4gICAgXG4gICAgfSxcbiAgICBidWlsZElubmVySFRNTDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwpIHRoaXMuJGVsLmh0bWwodGhpcy5yZW5kZXJlZFRlbXBsYXRlKCkpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBkdW1teWRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgICAgICBkdW1teWRpdi5pbm5lckhUTUwgPSB0aGlzLnJlbmRlcmVkVGVtcGxhdGUoKTtcbiAgICAgICAgICAgIHdoaWxlKGR1bW15ZGl2LmNoaWxkTm9kZXMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICB0aGlzLmVsLmFwcGVuZENoaWxkKGR1bW15ZGl2LmNoaWxkTm9kZXNbMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9tYXliZSBsZXNzIGhhY2tpc2ggc29sdXRpb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjUyMTQxMTMvMTc2MzIxN1xuICAgICAgICB9XG4gICAgfSxcbiAgICBpbml0RGlyZWN0aXZlczpmdW5jdGlvbigpe1xuXG4gICAgICAgIFxuICAgICAgICAvL0luaXQgZGlyZWN0aXZlcyBpbnZvbHZpbmcge3t9fVxuXG4gICAgICAgIC8vR2V0IGFsbCBvZiB0aGUgdGV4dCBub2RlcyBpbiB0aGUgZG9jdW1lbnQuXG4gICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cyA9IFtdO1xuICAgICAgICB0aGlzLmdldEFsbFRleHROb2RlcygpLmZvckVhY2goZnVuY3Rpb24oZnVsbFRleHROb2RlKXtcbiAgICAgICAgICAgIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjEzMTE2NzAvMTc2MzIxNyB0ZXh0Q29udGVudCBzZWVtcyByaWdodFxuXG4gICAgICAgICAgICB2YXIgcmUgPSAvXFx7XFx7KC4rPylcXH1cXH0vZzsgLy9NYXRjaCB7e3N1YlZpZXdOYW1lfX1cbiAgICAgICAgICAgIHZhciBtYXRjaDtcbiAgICAgICAgICAgIFxuXG5cbiAgICAgICAgICAgIHZhciBtYXRjaGVzID0gW107XG4gICAgICAgICAgICB3aGlsZSAoKG1hdGNoID0gcmUuZXhlYyhmdWxsVGV4dE5vZGUudGV4dENvbnRlbnQpKSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hlcy5wdXNoKG1hdGNoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG5cbiAgICAgICAgICAgIHZhciBjdXJyZW50VGV4dE5vZGUgPSBmdWxsVGV4dE5vZGU7XG4gICAgICAgICAgICB2YXIgY3VycmVudFN0cmluZyA9IGZ1bGxUZXh0Tm9kZS50ZXh0Q29udGVudDtcbiAgICAgICAgICAgIHZhciBwcmV2Tm9kZXNMZW5ndGggPSAwO1xuXG4gICAgICAgICAgICBtYXRjaGVzLmZvckVhY2goZnVuY3Rpb24obWF0Y2gpe1xuICAgICAgICAgICAgICAgIHZhciB2YXJOb2RlID0gY3VycmVudFRleHROb2RlLnNwbGl0VGV4dChtYXRjaC5pbmRleCAtIHByZXZOb2Rlc0xlbmd0aCk7XG4gICAgICAgICAgICAgICAgdmFyIGVudGlyZU1hdGNoID0gbWF0Y2hbMF1cbiAgICAgICAgICAgICAgICB2YXJOb2RlLm1hdGNoID0gbWF0Y2hbMV07XG4gICAgICAgICAgICAgICAgdGhpcy5fc3ViVmlld0VsZW1lbnRzLnB1c2godmFyTm9kZSk7XG4gICAgICAgICAgICAgICAgY3VycmVudFRleHROb2RlID0gdmFyTm9kZS5zcGxpdFRleHQoZW50aXJlTWF0Y2gubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGN1cnJlbnRTdHJpbmcgPSBjdXJyZW50VGV4dE5vZGUudGV4dENvbnRlbnQ7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcHJldk5vZGVzTGVuZ3RoPW1hdGNoLmluZGV4ICsgZW50aXJlTWF0Y2gubGVuZ3RoOy8vTm90ZTogVGhpcyB3b3JrcyBhY2NpZGVudGFsbHkuIE1pZ2h0IGJlIHdyb25nLlxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgXG5cbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgdGhpcy5kaXJlY3RpdmUgPSB7fTtcblxuICAgICAgIFxuXG5cbiAgICAgICAgZm9yICh2YXIgZGlyZWN0aXZlTmFtZSBpbiBEaXJlY3RpdmVSZWdpc3RyeSl7XG4gICAgICAgICAgICB2YXIgX19wcm90byA9IERpcmVjdGl2ZVJlZ2lzdHJ5W2RpcmVjdGl2ZU5hbWVdLnByb3RvdHlwZVxuICAgICAgICAgICAgaWYgKF9fcHJvdG8gaW5zdGFuY2VvZiBEaXJlY3RpdmUpeyAvL2JlY2F1c2UgZm9yZWFjaCB3aWxsIGdldCBtb3JlIHRoYW4ganVzdCBvdGhlciBkaXJlY3RpdmVzXG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBfX3Byb3RvLm5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGVsZW1lbnRzID0gKHRoaXMuJGVsKT8kLm1ha2VBcnJheSh0aGlzLiRlbC5maW5kKFwiW25tLVwiK25hbWUrXCJdXCIpKTokLm1ha2VBcnJheSgkKHRoaXMuZWwucXVlcnlTZWxlY3RvckFsbChcIltubS1cIituYW1lK1wiXVwiKSkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtuYW1lXSA9IGVsZW1lbnRzLm1hcChmdW5jdGlvbihlbGVtZW50LGksZWxlbWVudHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9vbiB0aGUgc2Vjb25kIGdvLWFyb3VuZCBmb3Igbm0tbWFwLCBkaXJlY3RpdmVOYW1lIHNvbWVob3cgaXMgY2FsbGVkIFwiU3ViVmlld1wiXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERpcmVjdGl2ZVJlZ2lzdHJ5W2RpcmVjdGl2ZU5hbWVdKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWw6ZWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWw6ZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJubS1cIituYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAgIFxuXG5cbiAgICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uKHN1YlZpZXdFbGVtZW50KXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gc3ViVmlld0VsZW1lbnQubWF0Y2guc3BsaXQoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoPT0xKXtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZGlyZWN0aXZlW1wic3Vidmlld1wiXSkgdGhpcy5kaXJlY3RpdmVbXCJzdWJ2aWV3XCJdID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5kaXJlY3RpdmVbXCJzdWJ2aWV3XCJdLnB1c2gobmV3IERpcmVjdGl2ZVJlZ2lzdHJ5W1wiU3Vidmlld1wiXSh7XG4gICAgICAgICAgICAgICAgICAgIHZpZXc6dGhpcyxcbiAgICAgICAgICAgICAgICAgICAgZWw6c3ViVmlld0VsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIHZhbDpzdWJWaWV3RWxlbWVudC5tYXRjaFxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmRpcmVjdGl2ZVtcIm1hcFwiXSkgdGhpcy5kaXJlY3RpdmVbXCJtYXBcIl0gPSBbXTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtcIm1hcFwiXS5wdXNoKG5ldyBEaXJlY3RpdmVSZWdpc3RyeVtcIk1hcFwiXSh7XG4gICAgICAgICAgICAgICAgICAgIHZpZXc6dGhpcyxcbiAgICAgICAgICAgICAgICAgICAgZWw6c3ViVmlld0VsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIHZhbDpzdWJWaWV3RWxlbWVudC5tYXRjaFxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuXG5cbiAgICAgICBcbiAgICAgICAgLypcbiAgICAgICAgdGhpcy5fc3ViVmlld0VsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24oc3ViVmlld0VsZW1lbnQpe1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBzdWJWaWV3RWxlbWVudC5tYXRjaC5zcGxpdChcIjpcIik7XG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGg9PTEpe1xuICAgICAgICAgICAgICAgIC8vc3VidmlldyB3aXRoIG5vIGNvbnRleHQgb2JqXG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAvL0NoZWNrIGZvciBjb2xsZWN0aW9uIG9yIG1vZGVsIHBhc3NlZC5cbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xuICAgICAgICAgICAgZWxlbWVudC5zdHlsZS5iYWNrZ3JvdW5kPVwieWVsbG93XCI7XG4gICAgICAgICAgICBlbGVtZW50LmlubmVySFRNTCA9IHN1YlZpZXdFbGVtZW50Lm1hdGNoO1xuICAgICAgICAgICAgc3ViVmlld0VsZW1lbnQucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoZWxlbWVudCxzdWJWaWV3RWxlbWVudCk7XG4gICAgICAgIH0pKi9cblxuICAgICAgIFxuXG5cbiAgICAgICAgXG4gICAgfSxcbiAgICByZW5kZXJlZFRlbXBsYXRlOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLmpzdCkge1xuICAgICAgICAgICAgd2luZG93Ll8gPSBfO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuanN0KHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgcmV0dXJuIF8udGVtcGxhdGUodGhpcy50ZW1wbGF0ZVN0cmluZykodGhpcy52aWV3TW9kZWwuYXR0cmlidXRlcylcbiAgICB9LFxuICAgIGRlbGVnYXRlRXZlbnRzOiBmdW5jdGlvbihldmVudHMpIHsvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzEyMTkzMDY5LzE3NjMyMTdcbiAgICAgICAgdmFyIGRlbGVnYXRlRXZlbnRTcGxpdHRlciA9IC9eKFxcUyspXFxzKiguKikkLztcbiAgICAgICAgZXZlbnRzIHx8IChldmVudHMgPSBfLnJlc3VsdCh0aGlzLCAnZXZlbnRzJykpOyAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIGlmICghZXZlbnRzKSByZXR1cm4gdGhpcztcbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBldmVudHMpIHtcbiAgICAgICAgICAgIHZhciBtZXRob2QgPSBldmVudHNba2V5XTtcbiAgICAgICAgICAgIGlmICghXy5pc0Z1bmN0aW9uKG1ldGhvZCkpIG1ldGhvZCA9IHRoaXNbZXZlbnRzW2tleV1dO1xuICAgICAgICAgICAgaWYgKCFtZXRob2QpIHRocm93IG5ldyBFcnJvcignTWV0aG9kIFwiJyArIGV2ZW50c1trZXldICsgJ1wiIGRvZXMgbm90IGV4aXN0Jyk7XG4gICAgICAgICAgICB2YXIgbWF0Y2ggPSBrZXkubWF0Y2goZGVsZWdhdGVFdmVudFNwbGl0dGVyKTtcbiAgICAgICAgICAgIHZhciBldmVudFR5cGVzID0gbWF0Y2hbMV0uc3BsaXQoJywnKSwgc2VsZWN0b3IgPSBtYXRjaFsyXTtcbiAgICAgICAgICAgIG1ldGhvZCA9IF8uYmluZChtZXRob2QsIHRoaXMpO1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgXyhldmVudFR5cGVzKS5lYWNoKGZ1bmN0aW9uKGV2ZW50TmFtZSkge1xuICAgICAgICAgICAgICAgIGV2ZW50TmFtZSArPSAnLmRlbGVnYXRlRXZlbnRzJyArIHNlbGYuY2lkO1xuICAgICAgICAgICAgICAgIGlmIChzZWxlY3RvciA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICBzZWxmLiRlbC5iaW5kKGV2ZW50TmFtZSwgbWV0aG9kKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRlbC5kZWxlZ2F0ZShzZWxlY3RvciwgZXZlbnROYW1lLCBtZXRob2QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgXG4gICAgfSxcblxuXG5cblxuICAgIHRhZ05hbWU6dW5kZWZpbmVkLC8vZG9uJ3Qgd2FudCBhIHRhZ05hbWUgdG8gYmUgZGl2IGJ5IGRlZmF1bHQuIFJhdGhlciwgbWFrZSBpdCBhIGRvY3VtZW50ZnJhZ21lbnQnXG4gICAgc3ViVmlld0ltcG9ydHM6e30sXG4gICAgY2hpbGRWaWV3SW1wb3J0czp7fSxcbiAgICBfZW5zdXJlRWxlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvL092ZXJyaWRpbmcgdGhpcyB0byBzdXBwb3J0IGRvY3VtZW50IGZyYWdtZW50c1xuICAgICAgICBpZiAoIXRoaXMuZWwpIHtcbiAgICAgICAgICAgIGlmKHRoaXMuYXR0cmlidXRlcyB8fCB0aGlzLmlkIHx8IHRoaXMuY2xhc3NOYW1lIHx8IHRoaXMudGFnTmFtZSl7Ly9pZiB5b3UgaGF2ZSBhbnkgb2YgdGhlc2UgYmFja2JvbmUgcHJvcGVydGllcywgZG8gYmFja2JvbmUgYmVoYXZpb3JcbiAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJzID0gXy5leHRlbmQoe30sIF8ucmVzdWx0KHRoaXMsICdhdHRyaWJ1dGVzJykpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pZCkgYXR0cnMuaWQgPSBfLnJlc3VsdCh0aGlzLCAnaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2xhc3NOYW1lKSBhdHRyc1snY2xhc3MnXSA9IF8ucmVzdWx0KHRoaXMsICdjbGFzc05hbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KHRoaXMuX2NyZWF0ZUVsZW1lbnQoXy5yZXN1bHQodGhpcywgJ3RhZ05hbWUnKSB8fCAnZGl2JykpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXRBdHRyaWJ1dGVzKGF0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7Ly9ob3dldmVyLCBkZWZhdWx0IHRvIHRoaXMuZWwgYmVpbmcgYSBkb2N1bWVudGZyYWdtZW50IChtYWtlcyB0aGlzLmVsIG5hbWVkIGltcHJvcGVybHkgYnV0IHdoYXRldmVyKVxuICAgICAgICAgICAgICAgIHRoaXMuZWwgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldEVsZW1lbnQoXy5yZXN1bHQodGhpcywgJ2VsJykpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBzZXQ6ZnVuY3Rpb24ob2JqKXtcblxuICAgICAgICB0aGlzLnZpZXdNb2RlbC5zZXQob2JqKTtcbiAgICB9LFxuICAgIGdldDpmdW5jdGlvbihwcm9wKXtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlld01vZGVsLmdldChwcm9wKVxuICAgIH1cbn0pO1xuIiwiLy9TYW1lIG1vZGVsLCBjb2xsZWN0aW9uIGluIHNhbWUgZmlsZSBmb3Igbm93IGJlY2F1c2UgdGhlc2UgbW9kdWxlcyByZWx5IG9uIGVhY2ggb3RoZXIuXG5cbi8qaW1wb3J0IF8gZnJvbSBcInVuZGVyc2NvcmVcIjsqL1xuLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbmltcG9ydCBNb2RlbCBmcm9tIFwiLi9Nb2RlbFwiO1xuaW1wb3J0IFZpZXdNb2RlbCBmcm9tIFwiLi9WaWV3TW9kZWxcIjtcbmltcG9ydCBDb2xsZWN0aW9uIGZyb20gXCIuL0NvbGxlY3Rpb25cIjtcbmltcG9ydCBWaWV3IGZyb20gXCIuL1ZpZXdcIjtcbmltcG9ydCBEaXJlY3RpdmVSZWdpc3RyeSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnlcIjtcbi8qaW1wb3J0ICQgZnJvbSBcImpxdWVyeVwiOyovXG5cbnZhciBGYWppdGEgPSB7TW9kZWwsIFZpZXdNb2RlbCwgQ29sbGVjdGlvbiwgVmlldywgRGlyZWN0aXZlUmVnaXN0cnl9O1xuRmFqaXRhW1wi8J+MrlwiXSA9IFwiMC4wLjBcIjtcblxuaWYgKHR5cGVvZiB3aW5kb3chPT1cInVuZGVmaW5lZFwiKSB3aW5kb3cuRmFqaXRhID0gRmFqaXRhO1xuaWYgKHR5cGVvZiBnbG9iYWwhPT1cInVuZGVmaW5lZFwiKSBnbG9iYWwuRmFqaXRhID0gRmFqaXRhOyJdLCJuYW1lcyI6WyJCYWNrYm9uZSIsIk1vZGVsIiwiZXh0ZW5kIiwib3B0aW9ucyIsIlVSTFNlYXJjaFBhcmFtcyIsInF1ZXJ5Iiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJzdHJ1Y3R1cmUiLCJwYXJlbnRNb2RlbHMiLCJpbml0IiwiYXR0ciIsIl8iLCJpc1N0cmluZyIsInByb3BzIiwic3BsaXQiLCJsZW5ndGgiLCJtb2RlbCIsInNsaWNlIiwiZm9yRWFjaCIsInByb3AiLCJnZXQiLCJwcm90b3R5cGUiLCJhcHBseSIsImFyZ3VtZW50cyIsImlzVW5kZWZpbmVkIiwia2V5IiwidmFsMSIsInZhbDIiLCJzZXQiLCJ2YWwiLCJpIiwibmV3TW9kZWwiLCJGYWppdGEiLCJpc0FycmF5IiwiQ29sbGVjdGlvbiIsInB1c2giLCJsaXN0ZW5UbyIsInRyaWdnZXIiLCJvbiIsIlZpZXciLCJuYW1lIiwiY29uc29sZSIsImVycm9yIiwidmlldyIsImNoaWxkSW5pdCIsImJ1aWxkIiwidXBkYXRlUmVzdWx0Iiwidmlld01vZGVsIiwicmVuZGVyIiwicmVzdWx0IiwiaXNGdW5jdGlvbiIsImNhbGwiLCJEaXJlY3RpdmUiLCIkZWwiLCJlbCIsInNldEF0dHJpYnV0ZSIsImlubmVySFRNTCIsInZhbHVlIiwicGFzcyIsImdldEF0dHJpYnV0ZSIsIiQiLCJhIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiY2xhc3NMaXN0IiwiYWRkIiwid3JhcHBlckEiLCJwYXJlbnROb2RlIiwicmVwbGFjZUNoaWxkIiwiYXBwZW5kQ2hpbGQiLCJwYXJlbnQiLCJhcmdzIiwic3ViVmlld05hbWUiLCJzdWJNb2RlbE5hbWUiLCJzdWJNb2RlbCIsInN1YkNvbGxlY3Rpb24iLCJjaGlsZE1hcHBpbmdzIiwidGVtcGxhdGVWYWx1ZXMiLCJkZWZhdWx0c092ZXJyaWRlIiwiQWJzdHJhY3RTdWJ2aWV3IiwicmVuZGVyQWRkIiwicmVuZGVyUmVzZXQiLCJyZW5kZXJSZW1vdmUiLCJyZW5kZXJTb3J0IiwiQ2hpbGRWaWV3IiwiY2hpbGRWaWV3SW1wb3J0cyIsImNoaWxkVmlld09wdGlvbnMiLCJ0YWdOYW1lIiwiY2hpbGRWaWV3cyIsIm1hcCIsImNoaWxkTW9kZWwiLCJtb2RlbHMiLCJhdHRyaWJ1dGVzIiwiY2hpbGR2aWV3IiwiYmluZCIsIl9pbml0aWFsaXplQmFja2JvbmVPYmplY3QiLCJfaW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3MiLCJfaW5pdGlhbGl6ZWRlZmF1bHRzT3ZlcnJpZGUiLCJfaW5pdGlhbGl6ZUNoaWxkVmlld3MiLCJyZXBsYWNlV2l0aCIsInN1YlZpZXciLCIkY2hpbGRyZW4iLCJjaGlsZFZpZXciLCJpbmRleCIsImRlbGVnYXRlRXZlbnRzIiwiJHBhcmVudCIsImNoaWxkcmVuIiwiZWFjaCIsImV4aXN0aW5nQ2hpbGRWaWV3IiwiZmlsdGVyIiwibmV3Q2hpbGRWaWV3IiwiZW1wdHkiLCJjaGlsZCIsImFwcGVuZCIsImxhc3QiLCJyZW1vdmUiLCJzcGxpY2UiLCJjb250YWlucyIsImhpZGUiLCJjc3MiLCJib2R5IiwiRXJyb3IiLCJpcyIsIndyYXBwZXIiLCJjaGlsZE5vZGVzIiwidW53cmFwIiwiaW5zZXJ0QmVmb3JlIiwic3ViVmlld0ltcG9ydHMiLCJDaGlsZENvbnN0cnVjdG9yIiwiY2xhc3NlcyIsImNsIiwicGFyZW50RGlyZWN0aXZlIiwib3B0aW9uc1NlbnRUb1N1YlZpZXciLCJjb250ZW50IiwicmVnaXN0cnkiLCJEaXJlY3RpdmVDb250ZW50IiwiRGlyZWN0aXZlRW5hYmxlIiwiRGlyZWN0aXZlRGlzYWJsZSIsIkRpcmVjdGl2ZUhyZWYiLCJEaXJlY3RpdmVNYXAiLCJEaXJlY3RpdmVPcHRpb25hbCIsIkRpcmVjdGl2ZU9wdGlvbmFsV3JhcCIsIkRpcmVjdGl2ZVNyYyIsIkRpcmVjdGl2ZVN1YnZpZXciLCJEaXJlY3RpdmVEYXRhIiwiYmFja2JvbmVWaWV3T3B0aW9ucyIsImFkZGl0aW9uYWxWaWV3T3B0aW9ucyIsIm4iLCJ3YWxrIiwiY3JlYXRlVHJlZVdhbGtlciIsIk5vZGVGaWx0ZXIiLCJTSE9XX1RFWFQiLCJuZXh0Tm9kZSIsImNvbnN0cnVjdG9yIiwid2FybiIsImpzdCIsInRlbXBsYXRlU3RyaW5nIiwiZGVmYXVsdHMiLCJ0ZW1wbGF0ZSIsInBpY2siLCJjb25jYXQiLCJkZWYiLCJhdHRycyIsImNsb25lIiwiVmlld01vZGVsIiwiQXJyYXkiLCJvYmoiLCJ1cGRhdGVWaWV3TW9kZWwiLCJfc2V0QXR0cmlidXRlcyIsImtleXMiLCJPYmplY3QiLCJfZW5zdXJlRWxlbWVudCIsImJ1aWxkSW5uZXJIVE1MIiwiaW5pdERpcmVjdGl2ZXMiLCJpbml0aWFsaXplIiwibWFwT2JqZWN0IiwibW9kZWxWYXIiLCJodG1sIiwicmVuZGVyZWRUZW1wbGF0ZSIsImR1bW15ZGl2IiwiX3N1YlZpZXdFbGVtZW50cyIsImdldEFsbFRleHROb2RlcyIsImZ1bGxUZXh0Tm9kZSIsInJlIiwibWF0Y2giLCJtYXRjaGVzIiwiZXhlYyIsInRleHRDb250ZW50IiwiY3VycmVudFRleHROb2RlIiwiY3VycmVudFN0cmluZyIsInByZXZOb2Rlc0xlbmd0aCIsInZhck5vZGUiLCJzcGxpdFRleHQiLCJlbnRpcmVNYXRjaCIsImRpcmVjdGl2ZSIsImRpcmVjdGl2ZU5hbWUiLCJEaXJlY3RpdmVSZWdpc3RyeSIsIl9fcHJvdG8iLCJlbGVtZW50cyIsIm1ha2VBcnJheSIsImZpbmQiLCJxdWVyeVNlbGVjdG9yQWxsIiwiZWxlbWVudCIsInN1YlZpZXdFbGVtZW50IiwiZXZlbnRzIiwiZGVsZWdhdGVFdmVudFNwbGl0dGVyIiwidW5kZWxlZ2F0ZUV2ZW50cyIsIm1ldGhvZCIsImV2ZW50VHlwZXMiLCJzZWxlY3RvciIsInNlbGYiLCJldmVudE5hbWUiLCJjaWQiLCJkZWxlZ2F0ZSIsInVuZGVmaW5lZCIsImlkIiwiY2xhc3NOYW1lIiwic2V0RWxlbWVudCIsIl9jcmVhdGVFbGVtZW50IiwiY3JlYXRlRG9jdW1lbnRGcmFnbWVudCIsImdsb2JhbCJdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7OztBQUlBLFlBQWVBLFNBQVNDLEtBQVQsQ0FBZUMsTUFBZixDQUFzQjs7Y0FFeEIsb0JBQVNDLE9BQVQsRUFBaUI7UUFDckIsT0FBT0MsZUFBUCxLQUEyQixXQUFoQyxFQUE2QztXQUN0Q0MsS0FBTCxHQUFhLElBQUlELGVBQUosQ0FBb0JFLE9BQU9DLFFBQVAsQ0FBZ0JDLE1BQXBDLENBQWI7Ozs7U0FNR0MsU0FBTCxHQUFpQixFQUFqQjs7U0FFS0MsWUFBTCxHQUFvQixFQUFwQjtTQUNLQyxJQUFMO0dBYmlDO1FBZTlCLGdCQUFVLEVBZm9COztPQWlCL0IsYUFBU0MsSUFBVCxFQUFjOzs7O1FBSVpDLEVBQUVDLFFBQUYsQ0FBV0YsSUFBWCxDQUFKLEVBQXFCO1VBQ2ZHLFFBQVFILEtBQUtJLEtBQUwsQ0FBVyxJQUFYLENBQVo7VUFDSUQsTUFBTUUsTUFBTixHQUFlLENBQW5CLEVBQXFCO1lBQ2ZDLFFBQVEsSUFBWjtjQUNNQyxLQUFOLENBQVksQ0FBWixFQUFlQyxPQUFmLENBQXVCLFVBQVNDLElBQVQsRUFBYztjQUMvQkgsTUFBTVQsU0FBTixDQUFnQlksSUFBaEIsQ0FBSixFQUEyQkgsUUFBUUEsTUFBTVQsU0FBTixDQUFnQlksSUFBaEIsQ0FBUjtTQUQ3QjtlQUdPSCxLQUFQOzs7UUFHQUksTUFBTXRCLFNBQVNDLEtBQVQsQ0FBZXNCLFNBQWYsQ0FBeUJELEdBQXpCLENBQTZCRSxLQUE3QixDQUFtQyxJQUFuQyxFQUF3Q0MsU0FBeEMsQ0FBVjtRQUNJLENBQUNaLEVB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
