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

        //Require a fajita view to have a template.
        //Send a templateString (string) or jst (function)
        //Is it necessary to differentiate? Could just check if it's a string.
        //On the other hand, it's nice to know if you're sending a string template or a javascript template.
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
            this.listenTo(this.model, "change", this.updateViewModel);
            this.listenTo(this.model, "change", function () {
                this._setAttributes(_.extend({}, _.result(this, 'attributes')));
            });

            this.updateViewModel();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFqaXRhLmpzIiwic291cmNlcyI6WyJNb2RlbC5qcyIsIkNvbGxlY3Rpb24uanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1jb250ZW50LmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1lbmFibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRpc2FibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWhyZWYuanMiLCJkaXJlY3RpdmUvYWJzdHJhY3Qtc3Vidmlldy5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtbWFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1vcHRpb25hbC5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtb3B0aW9uYWx3cmFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1zcmMuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLXN1YnZpZXcuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRhdGEuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnkuanMiLCJWaWV3LmpzIiwiQmFzZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5cblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgXG4gIGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgaWYgKCB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSBcInVuZGVmaW5lZFwiICl7XG4gICAgICB0aGlzLnF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICB9XG5cbiAgIFxuXG4gICAgLy9uZXdcbiAgICB0aGlzLnN0cnVjdHVyZSA9IHt9O1xuXG4gICAgdGhpcy5wYXJlbnRNb2RlbHMgPSBbXTtcbiAgICB0aGlzLmluaXQoKTtcbiAgfSxcbiAgaW5pdDpmdW5jdGlvbigpe30sXG4gIFxuICBnZXQ6ZnVuY3Rpb24oYXR0cil7XG5cbiAgICAvL1RvZG86IGVycm9yIGNoZWNrIHdoZW4gYXR0ciBoYXMgXCItPlwiIGJ1dCBkb2Vzbid0IHN0YXJ0IHdpdGggLT5cblxuICAgIGlmIChfLmlzU3RyaW5nKGF0dHIpKXtcbiAgICAgIHZhciBwcm9wcyA9IGF0dHIuc3BsaXQoXCItPlwiKTtcbiAgICAgIGlmIChwcm9wcy5sZW5ndGggPiAxKXtcbiAgICAgICAgdmFyIG1vZGVsID0gdGhpcztcbiAgICAgICAgcHJvcHMuc2xpY2UoMSkuZm9yRWFjaChmdW5jdGlvbihwcm9wKXtcbiAgICAgICAgICBpZiAobW9kZWwuc3RydWN0dXJlW3Byb3BdKSBtb2RlbCA9IG1vZGVsLnN0cnVjdHVyZVtwcm9wXTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtb2RlbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGdldCA9IEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5nZXQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuICAgIGlmICghXy5pc1VuZGVmaW5lZChnZXQpKSByZXR1cm4gZ2V0O1xuICAgIFxuXG4gXG4gICBcbiAgIFxuICB9LFxuICB0b2dnbGU6ZnVuY3Rpb24oa2V5LHZhbDEsdmFsMil7XG4gICAgaWYgKHRoaXMuZ2V0KGtleSk9PXZhbDIpe1xuICAgICAgdGhpcy5zZXQoa2V5LHZhbDEpO1xuICAgIH1cbiAgICBlbHNlIHRoaXMuc2V0KGtleSx2YWwyKTtcbiAgfSxcbiAgc2V0OmZ1bmN0aW9uKGF0dHIsIHZhbCwgb3B0aW9ucyl7XG4gICBcbiAgICAvKlxuICAgIGdldCBjb2RlLi4uSSB3YW50IHNldCBjb2RlIHRvIG1pcnJvciBnZXQgY29kZVxuICAgICovXG4gICAgaWYgKF8uaXNTdHJpbmcoYXR0cikpe1xuICAgICAgdmFyIHByb3BzID0gYXR0ci5zcGxpdChcIi0+XCIpO1xuICAgICAgaWYgKHByb3BzLmxlbmd0aCA+IDEpe1xuICAgICAgICB2YXIgbW9kZWwgPSB0aGlzO1xuICAgICAgICBwcm9wcy5zbGljZSgxKS5mb3JFYWNoKGZ1bmN0aW9uKHByb3AsaSxwcm9wcyl7XG4gICAgICAgICAgaWYgKG1vZGVsLnN0cnVjdHVyZVtwcm9wXSkgbW9kZWwgPSBtb2RlbC5zdHJ1Y3R1cmVbcHJvcF07XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3TW9kZWw7XG4gICAgICAgICAgICBpZiAoaSA8IHByb3BzLmxlbmd0aCAtIDEpe1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IG5ldyBGYWppdGEuTW9kZWw7ICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICBuZXdNb2RlbCA9IChfLmlzQXJyYXkodmFsKSk/bmV3IEZhaml0YS5Db2xsZWN0aW9uKHZhbCk6bmV3IEZhaml0YS5Nb2RlbCh2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3TW9kZWwucGFyZW50TW9kZWxzLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgbW9kZWwuc3RydWN0dXJlW3Byb3BdID0gbmV3TW9kZWw7XG4gICAgICAgICAgICBtb2RlbC5saXN0ZW5UbyhuZXdNb2RlbCxcImNoYW5nZSBhZGRcIixmdW5jdGlvbihuZXdNb2RlbCxvcHRpb25zKXtcbiAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8qIFRPRE86IGludmVudCBlbnRpcmUgc3lzdGVtIGZvciB0cmF2ZXJzaW5nIGFuZCBmaXJpbmcgZXZlbnRzLiBQcm9iYWJseSBub3Qgd29ydGggdGhlIGVmZm9ydCBmb3Igbm93LlxuICAgICAgICAgICAgICBPYmplY3Qua2V5cyhtb2RlbC5jaGFuZ2VkQXR0cmlidXRlcygpKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlOlwiK3Byb3ArXCIuXCIra2V5KVxuICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAqL1xuXG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIFxuXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICByZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG4gICAgfVxuXG5cbiAgICAgIFxuICAgICBcbiAgfVxuICAvL05vdGU6IHRoZXJlIGlzIHN0aWxsIG5vIGxpc3RlbmVyIGZvciBhIHN1Ym1vZGVsIG9mIGEgY29sbGVjdGlvbiBjaGFuZ2luZywgdHJpZ2dlcmluZyB0aGUgcGFyZW50LiBJIHRoaW5rIHRoYXQncyB1c2VmdWwuXG59KTsiLCIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgTW9kZWwgZnJvbSBcIi4vTW9kZWxcIjtcblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIG1vZGVsOk1vZGVsLCAvL3Byb2JsZW06IE1vZGVsIHJlbGllcyBvbiBjb2xsZWN0aW9uIGFzIHdlbGwgY2F1c2luZyBlcnJvclxuICAgIGluaXRpYWxpemU6ZnVuY3Rpb24oKXtcbiAgICAgICAgIHRoaXMucGFyZW50TW9kZWxzID0gW107XG4gICAgICAgIC8vdHJpZ2dlciBcInVwZGF0ZVwiIHdoZW4gc3VibW9kZWwgY2hhbmdlc1xuICAgICAgICB0aGlzLm9uKFwiYWRkXCIsZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyhtb2RlbCxcImNoYW5nZVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG59KTsiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuXG5leHBvcnQgZGVmYXVsdCBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG4gICAgbmFtZTpudWxsLFxuICAgIGJ1aWxkOm51bGwsXG4gICAgcmVuZGVyOm51bGwsXG4gICAgaW5pdGlhbGl6ZTpmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgICAgaWYgKCF0aGlzLm5hbWUpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGEgbmFtZSBpbiB0aGUgcHJvdG90eXBlLlwiKTtcbiAgICAgICAgdGhpcy52YWwgPSBvcHRpb25zLnZhbDtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvL3ZpZXcgaXMgdGhlIHZpZXcgdGhhdCBpbXBsZW1lbnRzIHRoaXMgZGlyZWN0aXZlLlxuICAgICAgICBpZiAoIW9wdGlvbnMudmlldykgY29uc29sZS5lcnJvcihcIkVycm9yOiBEaXJlY3RpdmUgcmVxdWlyZXMgYSB2aWV3IHBhc3NlZCBhcyBhbiBvcHRpb24uXCIpO1xuICAgICAgICB0aGlzLnZpZXcgPSBvcHRpb25zLnZpZXc7XG4gICAgICAgIGlmICghdGhpcy5jaGlsZEluaXQpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGNoaWxkSW5pdCBpbiBwcm90b3R5cGUuXCIpO1xuICAgICAgICB0aGlzLmNoaWxkSW5pdCgpO1xuICAgICAgICB0aGlzLmJ1aWxkKCk7XG4gICAgfSxcbiAgICBjaGlsZEluaXQ6ZnVuY3Rpb24oKXtcbiAgICAgICBcbiAgICAgICAgdGhpcy51cGRhdGVSZXN1bHQoKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnZpZXcudmlld01vZGVsLFwiY2hhbmdlOlwiK3RoaXMudmFsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVJlc3VsdCgpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuICAgIHVwZGF0ZVJlc3VsdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgcmVzdWx0ID0gdGhpcy52aWV3LmdldCh0aGlzLnZhbCk7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24ocmVzdWx0KSkgdGhpcy5yZXN1bHQgPSByZXN1bHQuY2FsbCh0aGlzLnZpZXcpO1xuICAgICAgICBlbHNlIHRoaXMucmVzdWx0ID0gcmVzdWx0O1xuICAgIH1cbn0pOyIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbi8vTm90ZTogRG9uJ3QgdXNlIC5odG1sKCkgb3IgLmF0dHIoKSBqcXVlcnkuIEl0J3Mgd2VpcmQgd2l0aCBkaWZmZXJlbnQgdHlwZXMuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiY29udGVudFwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLHRoaXMucmVzdWx0KVxuICAgICAgICBlbHNlIHRoaXMuZWwuaW5uZXJIVE1MID0gdGhpcy5yZXN1bHQ7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5idWlsZCgpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHZhciBwYXNzID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJJTUdcIikge1xuICAgICAgICAgICAgaWYgKHRoaXMuZWwuZ2V0QXR0cmlidXRlKFwidGl0bGVcIik9PXZhbHVlICsgXCJcIikgcGFzcyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5lbC5pbm5lckhUTUw9PXZhbHVlK1wiXCIpIHBhc3MgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgfVxufSk7IiwiLy9XaHkgZG9lcyB1bmRlcnNjb3JlIHdvcmsgaGVyZT9cblxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcImVuYWJsZVwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsdHJ1ZSk7XG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIixcIlwiKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpIT12YWx1ZTtcbiAgICB9XG59KTtcbiIsIi8vV2h5IGRvZXMgdW5kZXJzY29yZSB3b3JrIGhlcmU/XG5cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJkaXNhYmxlXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIpPT12YWx1ZTtcbiAgICB9XG59KTtcbiIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJocmVmXCIsXG4gICBcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSB0aGlzLiRlbC5hdHRyKFwiaHJlZlwiLHRoaXMucmVzdWx0KTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgICAgICAgICAgYS5jbGFzc0xpc3QuYWRkKFwid3JhcHBlci1hXCIpXG4gICAgICAgICAgICBhLnNldEF0dHJpYnV0ZShcImhyZWZcIix0aGlzLnJlc3VsdCk7XG4gICAgICAgICAgICB0aGlzLndyYXBwZXJBID0gYTtcbiAgICAgICAgICAgIHRoaXMuZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQodGhpcy53cmFwcGVyQSx0aGlzLmVsKVxuICAgICAgICAgICAgLy9jYW4ndCBzaW1wbHkgdXNlIHRoaXMuJGVsLndyYXAoYSk7XG4gICAgICAgICAgICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTcwNzMyOC93cmFwLW9uZS1lbGVtZW50LXdpdGgtYW5vdGhlci1yZXRhaW5pbmctcmVmZXJlbmNlLXRvLXdyYXBwZXJcbiAgICAgICAgICAgIHRoaXMud3JhcHBlckEuYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93LndyYXBwZXJBID0gdGhpcy53cmFwcGVyQTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSAkKHRoaXMuZWwpLmF0dHIoXCJocmVmXCIsdGhpcy5yZXN1bHQpXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy53cmFwcGVyQS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIsdGhpcy5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgaWYgKHRoaXMuJGVsLnByb3AoXCJ0YWdOYW1lXCIpPT1cIkFcIikgcmV0dXJuICQodGhpcy5lbCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICQodGhpcy5lbCkucGFyZW50KCkucHJvcChcInRhZ05hbWVcIik9PVwiQVwiICYmICQodGhpcy5lbCkucGFyZW50KCkuYXR0cihcImhyZWZcIik9PXZhbHVlXG4gICAgICAgIH1cbiAgICB9XG59KTsiLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiYWJzdHJhY3RzdWJ2aWV3XCIsXG4gICAgX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgYXJncyA9IHRoaXMudmFsLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgdGhpcy5zdWJWaWV3TmFtZSA9IGFyZ3NbMF07XG4gICAgICAgICBpZiAoYXJnc1sxXSl7XG4gICAgICAgICAgICB0aGlzLnN1Yk1vZGVsTmFtZSA9IGFyZ3NbMV07XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSB0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpOyAvL2NoYW5nZWQgZnJvbSBzdWJNb2RlbE5hbWUuXG4gICAgICAgICAgICBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCkgdGhpcy5zdWJNb2RlbCA9IG1vZGVsO1xuICAgICAgICAgICAgZWxzZSBpZiAobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Db2xsZWN0aW9uKSB0aGlzLnN1YkNvbGxlY3Rpb24gPSBtb2RlbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbCksKG1vZGVsIGluc3RhbmNlb2YgQmFja2JvbmUuQ29sbGVjdGlvbiksdGhpcy5zdWJDb2xsZWN0aW9uKVxuICAgICAgICAgICAgLy9kZWJ1Z2dlcjtcbiAgICAgICAgIH1cbiAgICB9LFxuICAgIF9pbml0aWFsaXplQ2hpbGRNYXBwaW5nczpmdW5jdGlvbigpe1xuICAgICAgICAvL1RoZSBKU09OIG9iamVjdCB0byBwYXNzIGFzIFwibWFwcGluZ3NcIiB0byB0aGUgc3VidmlldyBvciB0aGUgaXRlbSBpbiB0aGUgc3ViQ29sbGVjdGlvbi5cbiAgICAgICAgIC8vRG8gbm90IHNob3J0ZW4gdG8gdmlldy5nZXQuIHZpZXcuZ2V0IGdldHMgZnJvbSB0aGUgdmlld01vZGVsIHdoaWNoIGNvbnRhaW5zIHByb3BzIGFuZCB2YWx1ZXMuLi5ub3QgdmlldyBwcm9wcyBhbmQgYXBwIHByb3BzXG4gICAgICAgIHRoaXMuY2hpbGRNYXBwaW5ncyA9IHRoaXMudmlldy5tYXBwaW5ncyAmJiB0aGlzLnZpZXcubWFwcGluZ3NbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgfSxcbiAgICBfaW5pdGlhbGl6ZU92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaDpmdW5jdGlvbigpe1xuICAgICAgICAvL05vdCBzaG9ydGVuZWQgdG8gdmlldy5nZXQgYmVjYXVzZSBJJ20gbm90IHN1cmUgaWYgaXQgaXMgdXNlZnVsIHRvIGRvIHNvLlxuICAgICAgICAvL3ZpZXcuZ2V0IGdldHMgdGhlIGFwcCB2YWx1ZSBtYXBwZWQgdG8gdGhlIGRlZmF1bHQgdmFsdWUsIGFuZCBpZiBub3QgdGhlbiBpdCBnZXRzIHRoZSBkZWZhdWx0IHZhbHVlLlxuICAgICAgICAvL0kgdGhpbmsgeW91J3JlIGp1c3Qgb3ZlcnJpZGluZyBkZWZhdWx0cyB3aXRoIGRlZmF1bHRzLCBhbmQgbm90aGluZyBmYW5jaWVyIHRoYW4gdGhhdC5cbiAgICAgICAgLy90aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCA9IHRoaXMudmlldy5kZWZhdWx0cyAmJiB0aGlzLnZpZXcuZGVmYXVsdHNbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgICAgIC8vTmV2ZXJtaW5kIGl0IGlzIHVzZWZ1bCB0byB1c2UgLmdldCBiZWNhdXNlIGlmIHRoZXJlIGFyZSBuZXN0ZWQgbmVzdGVkIHZpZXdzLCB5b3UgY2FuJ3QganVzdCBnbyB0byB0aGUgZGVmYXVsdHMgb2YgdGhhdCB2aWV3LiBUaGV5IG1pZ2h0IGJlIG92ZXJyaWRkZW4uXG5cbiAgICAgICAgdGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2ggPSB0aGlzLnZpZXcuZ2V0KHRoaXMuc3ViVmlld05hbWUpO1xuICAgIH0sXG5cblxuXG4gICAgX2luaXRpYWxpemVDaGlsZFZpZXdzOmZ1bmN0aW9uKCl7XG5cbiAgICB9XG59KSIsIi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuaW1wb3J0IEFic3RyYWN0U3VidmlldyBmcm9tIFwiLi9hYnN0cmFjdC1zdWJ2aWV3XCJcbmV4cG9ydCBkZWZhdWx0IEFic3RyYWN0U3Vidmlldy5leHRlbmQoe1xuICAgIG5hbWU6XCJtYXBcIixcbiAgICBfaW5pdGlhbGl6ZUNoaWxkVmlld3M6ZnVuY3Rpb24oKXtcblxuXG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJhZGRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJBZGQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZXNldFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclJlc2V0KCk7XG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZW1vdmVcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJSZW1vdmUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJzb3J0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyU29ydCgpOyAgICAgICAgXG4gICAgICAgIH0pO1xuXG5cblxuICAgICAgICAvL01hcCBtb2RlbHMgdG8gY2hpbGRWaWV3IGluc3RhbmNlcyB3aXRoIHRoZWlyIG1hcHBpbmdzXG4gICAgICAgIHRoaXMuQ2hpbGRWaWV3ID0gdGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgICAgIHRoaXMuY2hpbGRWaWV3T3B0aW9ucyA9IHtcbiAgICAgICAgICAgIG1hcHBpbmdzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgdGFnTmFtZTp0aGlzLnZpZXcuY2hpbGRWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXS5wcm90b3R5cGUudGFnTmFtZSB8fCBcInN1Yml0ZW1cIixcbiAgICAgICAgICAgIG92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaDp0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaFxuICAgICAgICB9O1xuXG5cbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzID0gdGhpcy5zdWJDb2xsZWN0aW9uLm1hcChmdW5jdGlvbihjaGlsZE1vZGVsLGkpe1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgY2hpbGRWaWV3T3B0aW9ucyA9IF8uZXh0ZW5kKHt9LHRoaXMuY2hpbGRWaWV3T3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgbW9kZWw6Y2hpbGRNb2RlbCxcbiAgICAgICAgICAgICAgICBpbmRleDppLFxuICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgb3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoOnRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoICYmIHRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoLm1vZGVsc1tpXSAmJiB0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaC5tb2RlbHNbaV0uYXR0cmlidXRlcyxcbiAgICAgICAgICAgICAgICAvL0p1c3QgYWRkZWQgY2hlY2sgZm9yIHRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoLm1vZGVsc1tpXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBjaGlsZHZpZXcgPSBuZXcgdGhpcy5DaGlsZFZpZXcoY2hpbGRWaWV3T3B0aW9ucyk7XG4gICAgICAgICAgICAvL2NoaWxkdmlldy5fc2V0QXR0cmlidXRlcyhfLmV4dGVuZCh7fSwgXy5yZXN1bHQoY2hpbGR2aWV3LCAnYXR0cmlidXRlcycpKSk7XG4gICAgICAgICAgICByZXR1cm4gY2hpbGR2aWV3O1xuICAgICAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgfSxcbiAgICBjaGlsZEluaXQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUJhY2tib25lT2JqZWN0KCk7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVDaGlsZE1hcHBpbmdzKCk7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVPdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2goKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkVmlld3MoKTtcblxuICAgICAgICBcbiAgICAgIFxuXG4gICAgICAgIFxuICAgICAgICBcblxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgIFxuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgodGhpcy5zdWJWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyICRjaGlsZHJlbiA9ICQoKTtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAkY2hpbGRyZW4gPSAkY2hpbGRyZW4uYWRkKGNoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICBjaGlsZFZpZXcuaW5kZXggPSBpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIGlmICgkY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgoJGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkVmlldy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gJGNoaWxkcmVuLnBhcmVudCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkY2hpbGRyZW5cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyQWRkOmZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IFtdO1xuICAgICAgICB0aGlzLnN1YkNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihtb2RlbCxpKXtcbiAgICAgICAgICAgIHZhciBleGlzdGluZ0NoaWxkVmlldyA9IHRoaXMuY2hpbGRWaWV3cy5maWx0ZXIoZnVuY3Rpb24oY2hpbGRWaWV3KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRWaWV3Lm1vZGVsID09IG1vZGVsXG4gICAgICAgICAgICB9KVswXTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ0NoaWxkVmlldykge1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goZXhpc3RpbmdDaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICAgICAgLy92YXIgYXR0cmlidXRlcyA9IF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChleGlzdGluZ0NoaWxkVmlldywgJ2F0dHJpYnV0ZXMnKSlcbiAgICAgICAgICAgICAgICAvL2V4aXN0aW5nQ2hpbGRWaWV3Ll9zZXRBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld0NoaWxkVmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyh7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsOm1vZGVsLFxuICAgICAgICAgICAgICAgICAgICBtYXBwaW5nczp0aGlzLmNoaWxkTWFwcGluZ3MsXG4gICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOnRoaXMudmlldy5nZXQodGhpcy52YWwuc3BsaXQoXCI6XCIpWzBdKVtpXVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnB1c2gobmV3Q2hpbGRWaWV3KTtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKG5ld0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKXtcbiAgICAgICAgICAgIHRoaXMuJHBhcmVudC5hcHBlbmQoY2hpbGQpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkKGNoaWxkcmVuKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIH0pXG5cbiAgICB9LFxuICAgIHJlbmRlclJlc2V0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgIH0sXG4gICAgcmVuZGVyUmVtb3ZlOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGNoaWxkcmVuLmxhc3QoKS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnNwbGljZSgtMSwxKTtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSB0aGlzLiRwYXJlbnQuY2hpbGRyZW4oKTtcbiAgICB9LFxuICAgIHJlbmRlclNvcnQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgIC8vRG9uJ3QgbmVlZCB0aGlzIChub3cpLiBNb2RlbHMgd2lsbCBhbHJlYWR5IGJlIHNvcnRlZCBvbiBhZGQgd2l0aCBjb2xsZWN0aW9uLmNvbXBhcmF0b3IgPSB4eHg7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vdGhpcy52aWV3IGlzIGluc3RhbmNlIG9mIHRoZSB2aWV3IHRoYXQgY29udGFpbnMgdGhlIHN1YnZpZXcgZGlyZWN0aXZlLlxuICAgICAgICAvL3RoaXMuc3ViVmlldyBpcyBpbnN0YW5jZSBvZiB0aGUgc3Vidmlld1xuICAgICAgICAvL3RoaXMgaXMgdGhlIGRpcmVjdGl2ZS5cblxuICAgICAgICBpZiAodGhpcy5zdWJWaWV3KXtcbiAgICAgICAgICAgIC8vd2h5IHBhcmVudE5vZGU/XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aWV3LmVsLmNvbnRhaW5zKHRoaXMuc3ViVmlldy5lbC5wYXJlbnROb2RlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyIHBhc3MgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGVsID0gdGhpcy52aWV3LmVsXG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbi5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCFlbC5jb250YWlucyh0aGlzKSkgcGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbn0pIiwiLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJvcHRpb25hbFwiLFxuICAgIFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkuaGlkZSgpXG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5jc3MoXCJkaXNwbGF5XCIsXCJcIik7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCkgJCh0aGlzLmVsKS5oaWRlKClcbiAgICAgICAgZWxzZSAkKHRoaXMuZWwpLmNzcyhcImRpc3BsYXlcIixcIlwiKTtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICBpZiAoIWRvY3VtZW50LmJvZHkuY29udGFpbnModGhpcy5lbCkpIHRocm93IEVycm9yKFwiZWxlbWVudCBoYXMgdG8gYmUgaW4gdGhlIERPTSBpbiBvcmRlciB0byB0ZXN0XCIpXG4gICAgICAgIHJldHVybiAkKHRoaXMuZWwpLmlzKFwiOnZpc2libGVcIik9PXZhbHVlO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcIm9wdGlvbmFsd3JhcFwiLFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICBEaXJlY3RpdmUucHJvdG90eXBlLmNoaWxkSW5pdC5jYWxsKHRoaXMsYXJndW1lbnRzKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMud3JhcHBlciA9IHRoaXMuZWw7XG4gICAgICAgIHRoaXMuY2hpbGROb2RlcyA9IFtdLnNsaWNlLmNhbGwodGhpcy5lbC5jaGlsZE5vZGVzLCAwKTtcbiAgICAgICAgXG4gICAgfSxcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuY2hpbGROb2RlcykudW53cmFwKCk7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCl7XG4gICAgICAgICAgICAkKHRoaXMuY2hpbGROb2RlcykudW53cmFwKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLmNoaWxkTm9kZXNbMF0pKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmlyc3QgY2hpbGQgaGFzIHRvIGJlIGluIERPTVwiKTtcbiAgICAgICAgICAgICAgICAvL3NvbHV0aW9uOiBhZGQgYSBkdW1teSB0ZXh0IG5vZGUgYXQgYmVnaW5uaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLndyYXBwZXIpKXtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkTm9kZXNbMF0ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy53cmFwcGVyLHRoaXMuY2hpbGROb2Rlc1swXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IodmFyIGk9MDtpPHRoaXMuY2hpbGROb2Rlcy5sZW5ndGg7aSsrKXtcbiAgICAgICAgICAgICAgICB0aGlzLndyYXBwZXIuYXBwZW5kQ2hpbGQodGhpcy5jaGlsZE5vZGVzW2ldKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcblxuXG4gICAgICAgIHJldHVybiAodGhpcy5jaGlsZE5vZGVzWzBdLnBhcmVudE5vZGU9PXRoaXMud3JhcHBlcikgPT0gdmFsdWU7XG5cblxuICAgICAgXG4gICAgfVxufSkiLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwic3JjXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kZWwuYXR0cihcInNyY1wiLHRoaXMucmVzdWx0KTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLiRlbC5hdHRyKFwic3JjXCIsdGhpcy5yZXN1bHQpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHJldHVybiB0aGlzLiRlbC5hdHRyKFwic3JjXCIpPT09dmFsdWU7XG4gICAgfVxufSk7IiwiLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5pbXBvcnQgQWJzdHJhY3RTdWJ2aWV3IGZyb20gXCIuL2Fic3RyYWN0LXN1YnZpZXdcIlxuZXhwb3J0IGRlZmF1bHQgQWJzdHJhY3RTdWJ2aWV3LmV4dGVuZCh7XG4gICAgbmFtZTpcInN1YnZpZXdcIixcbiAgICBfaW5pdGlhbGl6ZUNoaWxkVmlld3M6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXS5wcm90b3R5cGUgaW5zdGFuY2VvZiBCYWNrYm9uZS5WaWV3KSB0aGlzLkNoaWxkQ29uc3RydWN0b3IgPSB0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgICAgIGVsc2UgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLyouY2FsbCh0aGlzLnZpZXcpOyovXG5cbiAgICAgICAgIHZhciBvcHRpb25zID0ge307XG4gICAgICAgICAgIFxuICAgICAgICBpZiAodGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2gpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7b3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoOnRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNofSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5jaGlsZE1hcHBpbmdzKXtcbiAgICAgICAgICAgIF8uZXh0ZW5kKG9wdGlvbnMse1xuICAgICAgICAgICAgICAgIG1hcHBpbmdzOnRoaXMuY2hpbGRNYXBwaW5nc1xuICAgICAgICAgICAgICAgIC8vLGVsOnRoaXMuZWwgVGhlIGVsIG9mIHRoZSBkaXJlY3RpdmUgc2hvdWxkIGJlbG9uZyB0byB0aGUgZGlyZWN0aXZlIGJ1dCBub3QgdGhlIHN1YnZpZXcgaXRzZWxmXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgc3ViTW9kZWwgPSB0aGlzLnN1Yk1vZGVsIHx8IHRoaXMudmlldy5tb2RlbDtcbiAgICAgICAgaWYgKHN1Yk1vZGVsKXtcbiAgICAgICAgICAgIF8uZXh0ZW5kKG9wdGlvbnMse21vZGVsOnN1Yk1vZGVsfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuc3ViQ29sbGVjdGlvbil7XG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcgPSBuZXcgdGhpcy5DaGlsZENvbnN0cnVjdG9yKG9wdGlvbnMpO1xuICAgICAgICAgICAgdmFyIGNsYXNzZXMgPSBfLnJlc3VsdCh0aGlzLnN1YlZpZXcsXCJjbGFzc05hbWVcIilcbiAgICAgICAgICAgIGlmIChjbGFzc2VzKXtcbiAgICAgICAgICAgICAgICBjbGFzc2VzLnNwbGl0KFwiIFwiKS5mb3JFYWNoKGZ1bmN0aW9uKGNsKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdWJWaWV3LmVsLmNsYXNzTGlzdC5hZGQoY2wpXG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBfLnJlc3VsdCh0aGlzLnN1YlZpZXcsXCJhdHRyaWJ1dGVzXCIpO1xuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgICAgIF8uZWFjaChhdHRyaWJ1dGVzLGZ1bmN0aW9uKHZhbCxuYW1lKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdWJWaWV3LmVsLnNldEF0dHJpYnV0ZShuYW1lLHZhbCkgICAgXG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcucGFyZW50ID0gdGhpcy52aWV3O1xuICAgICAgICAgICAgdGhpcy5zdWJWaWV3LnBhcmVudERpcmVjdGl2ZSA9IHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zU2VudFRvU3ViVmlldyA9IG9wdGlvbnM7XG4gICAgfSxcbiAgICBjaGlsZEluaXQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy90aGlzLnZhbCwgdGhpcy52aWV3XG5cbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUJhY2tib25lT2JqZWN0KCk7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVDaGlsZE1hcHBpbmdzKCk7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVPdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2goKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkVmlld3MoKTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgXG4gICAgICBcblxuICAgICAgICBpZiAodGhpcy5zdWJDb2xsZWN0aW9uKXsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJhZGRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckFkZCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZXNldFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyUmVzZXQoKTtcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJyZW1vdmVcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnN1YkNvbGxlY3Rpb24sXCJzb3J0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJTb3J0KCk7ICAgICAgICBcbiAgICAgICAgICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgICAgICAgICAvL01hcCBtb2RlbHMgdG8gY2hpbGRWaWV3IGluc3RhbmNlcyB3aXRoIHRoZWlyIG1hcHBpbmdzXG4gICAgICAgICAgICAgICAgdGhpcy5DaGlsZFZpZXcgPSB0aGlzLnZpZXcuY2hpbGRWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld09wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcHBpbmdzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIHRhZ05hbWU6dGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlLnRhZ05hbWUgfHwgXCJzdWJpdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgIG92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaDp0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzID0gdGhpcy5zdWJDb2xsZWN0aW9uLm1hcChmdW5jdGlvbihjaGlsZE1vZGVsLGkpe1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkVmlld09wdGlvbnMgPSBfLmV4dGVuZCh7fSx0aGlzLmNoaWxkVmlld09wdGlvbnMse1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6Y2hpbGRNb2RlbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0SW5kZXg6dGhpcy5zdWJDb2xsZWN0aW9uLmxlbmd0aCAtIGkgLSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoOnRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoICYmIHRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoLm1vZGVsc1tpXSAmJiB0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaC5tb2RlbHNbaV0uYXR0cmlidXRlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vSnVzdCBhZGRlZCBjaGVjayBmb3IgdGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2gubW9kZWxzW2ldXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkdmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyhjaGlsZFZpZXdPcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgLy9jaGlsZHZpZXcuX3NldEF0dHJpYnV0ZXMoXy5leHRlbmQoe30sIF8ucmVzdWx0KGNoaWxkdmlldywgJ2F0dHJpYnV0ZXMnKSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGR2aWV3O1xuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG5cblxuICAgICAgICAgICAgICAgIFxuXG5cblxuICAgICAgICB9XG5cbiAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuXG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIGlmICh0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlIGluc3RhbmNlb2YgQmFja2JvbmUuVmlldykgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICAgICAgZWxzZSB0aGlzLkNoaWxkQ29uc3RydWN0b3IgPSB0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0vKi5jYWxsKHRoaXMudmlldyk7Ki9cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIHZhciBvcHRpb25zID0ge307XG4gICAgICAgICAgIFxuICAgICAgICBpZiAodGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2gpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7b3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoOnRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNofSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5jaGlsZE1hcHBpbmdzKXtcbiAgICAgICAgICAgIF8uZXh0ZW5kKG9wdGlvbnMse1xuICAgICAgICAgICAgICAgIG1hcHBpbmdzOnRoaXMuY2hpbGRNYXBwaW5nc1xuICAgICAgICAgICAgICAgIC8vLGVsOnRoaXMuZWwgVGhlIGVsIG9mIHRoZSBkaXJlY3RpdmUgc2hvdWxkIGJlbG9uZyB0byB0aGUgZGlyZWN0aXZlIGJ1dCBub3QgdGhlIHN1YnZpZXcgaXRzZWxmXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgc3ViTW9kZWwgPSB0aGlzLnN1Yk1vZGVsIHx8IHRoaXMudmlldy5tb2RlbDtcbiAgICAgICAgaWYgKHN1Yk1vZGVsKXtcbiAgICAgICAgICAgIF8uZXh0ZW5kKG9wdGlvbnMse21vZGVsOnN1Yk1vZGVsfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuc3ViQ29sbGVjdGlvbil7XG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcgPSBuZXcgdGhpcy5DaGlsZENvbnN0cnVjdG9yKG9wdGlvbnMpO1xuICAgICAgICAgICAgdmFyIGNsYXNzZXMgPSBfLnJlc3VsdCh0aGlzLnN1YlZpZXcsXCJjbGFzc05hbWVcIilcbiAgICAgICAgICAgIGlmIChjbGFzc2VzKXtcbiAgICAgICAgICAgICAgICBjbGFzc2VzLnNwbGl0KFwiIFwiKS5mb3JFYWNoKGZ1bmN0aW9uKGNsKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdWJWaWV3LmVsLmNsYXNzTGlzdC5hZGQoY2wpXG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBfLnJlc3VsdCh0aGlzLnN1YlZpZXcsXCJhdHRyaWJ1dGVzXCIpO1xuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgICAgIF8uZWFjaChhdHRyaWJ1dGVzLGZ1bmN0aW9uKHZhbCxuYW1lKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdWJWaWV3LmVsLnNldEF0dHJpYnV0ZShuYW1lLHZhbCkgICAgXG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcucGFyZW50ID0gdGhpcy52aWV3O1xuICAgICAgICAgICAgdGhpcy5zdWJWaWV3LnBhcmVudERpcmVjdGl2ZSA9IHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zU2VudFRvU3ViVmlldyA9IG9wdGlvbnM7XG4gICAgfSxcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMuc3ViQ29sbGVjdGlvbil7XG4gICAgICAgICAgICB0aGlzLiRlbC5yZXBsYWNlV2l0aCh0aGlzLnN1YlZpZXcuZWwpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB2YXIgJGNoaWxkcmVuID0gJCgpO1xuICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgICAgICRjaGlsZHJlbiA9ICRjaGlsZHJlbi5hZGQoY2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgICAgIGNoaWxkVmlldy5pbmRleCA9IGk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgaWYgKCRjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRlbC5yZXBsYWNlV2l0aCgkY2hpbGRyZW4pO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aGlzLiRwYXJlbnQgPSAkY2hpbGRyZW4ucGFyZW50KClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gdGhpcy4kZWwucGFyZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbiA9ICRjaGlsZHJlblxuICAgICAgICB9XG4gICAgfSxcbiAgICByZW5kZXJBZGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gW107XG4gICAgICAgIHRoaXMuc3ViQ29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKG1vZGVsLGkpe1xuICAgICAgICAgICAgdmFyIGV4aXN0aW5nQ2hpbGRWaWV3ID0gdGhpcy5jaGlsZFZpZXdzLmZpbHRlcihmdW5jdGlvbihjaGlsZFZpZXcpe1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZFZpZXcubW9kZWwgPT0gbW9kZWxcbiAgICAgICAgICAgIH0pWzBdO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nQ2hpbGRWaWV3KSB7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaChleGlzdGluZ0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICAvL3ZhciBhdHRyaWJ1dGVzID0gXy5leHRlbmQoe30sIF8ucmVzdWx0KGV4aXN0aW5nQ2hpbGRWaWV3LCAnYXR0cmlidXRlcycpKVxuICAgICAgICAgICAgICAgIC8vZXhpc3RpbmdDaGlsZFZpZXcuX3NldEF0dHJpYnV0ZXMoYXR0cmlidXRlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3Q2hpbGRWaWV3ID0gbmV3IHRoaXMuQ2hpbGRWaWV3KHtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWw6bW9kZWwsXG4gICAgICAgICAgICAgICAgICAgIG1hcHBpbmdzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdEluZGV4OnRoaXMuc3ViQ29sbGVjdGlvbi5sZW5ndGggLSBpIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6dGhpcy52aWV3LmdldCh0aGlzLnZhbC5zcGxpdChcIjpcIilbMF0pW2ldXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MucHVzaChuZXdDaGlsZFZpZXcpO1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2gobmV3Q2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpe1xuICAgICAgICAgICAgdGhpcy4kcGFyZW50LmFwcGVuZChjaGlsZClcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9ICQoY2hpbGRyZW4pXG4gICAgICAgIFxuICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICBjaGlsZFZpZXcuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgfSlcblxuICAgIH0sXG4gICAgcmVuZGVyUmVzZXQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgfSxcbiAgICByZW5kZXJSZW1vdmU6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4ubGFzdCgpLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmNoaWxkVmlld3Muc3BsaWNlKC0xLDEpO1xuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9IHRoaXMuJHBhcmVudC5jaGlsZHJlbigpO1xuICAgIH0sXG4gICAgcmVuZGVyU29ydDpmdW5jdGlvbigpe1xuICAgICAgICBcbiAgICAgICAgLy9Eb24ndCBuZWVkIHRoaXMgKG5vdykuIE1vZGVscyB3aWxsIGFscmVhZHkgYmUgc29ydGVkIG9uIGFkZCB3aXRoIGNvbGxlY3Rpb24uY29tcGFyYXRvciA9IHh4eDtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy90aGlzLnZpZXcgaXMgaW5zdGFuY2Ugb2YgdGhlIHZpZXcgdGhhdCBjb250YWlucyB0aGUgc3VidmlldyBkaXJlY3RpdmUuXG4gICAgICAgIC8vdGhpcy5zdWJWaWV3IGlzIGluc3RhbmNlIG9mIHRoZSBzdWJ2aWV3XG4gICAgICAgIC8vdGhpcyBpcyB0aGUgZGlyZWN0aXZlLlxuXG4gICAgICAgIGlmICh0aGlzLnN1YlZpZXcpe1xuICAgICAgICAgICAgLy93aHkgcGFyZW50Tm9kZT9cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZpZXcuZWwuY29udGFpbnModGhpcy5zdWJWaWV3LmVsLnBhcmVudE5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB2YXIgcGFzcyA9IHRydWU7XG4gICAgICAgICAgICB2YXIgZWwgPSB0aGlzLnZpZXcuZWxcbiAgICAgICAgICAgIHRoaXMuJGNoaWxkcmVuLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoIWVsLmNvbnRhaW5zKHRoaXMpKSBwYXNzID0gZmFsc2U7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICByZXR1cm4gcGFzcztcbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgfVxufSkiLCIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJkYXRhXCIsXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuY29udGVudCA9IHRoaXMudmlldy52aWV3TW9kZWwuZ2V0KHRoaXMudmFsKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLnZpZXcudmlld01vZGVsLFwiY2hhbmdlOlwiK3RoaXMudmFsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLmNvbnRlbnQgPSB0aGlzLnZpZXcudmlld01vZGVsLmdldCh0aGlzLnZhbCk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9KVxuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICBfLmVhY2godGhpcy5jb250ZW50LGZ1bmN0aW9uKHZhbCxwcm9wKXtcbiAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWwpKSB2YWwgPSB2YWwuYmluZCh0aGlzLnZpZXcpO1xuICAgICAgICAgICB0aGlzLiRlbC5hdHRyKFwiZGF0YS1cIitwcm9wLHZhbClcbiAgICAgICB9LmJpbmQodGhpcykpXG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICBfLmVhY2godGhpcy5jb250ZW50LGZ1bmN0aW9uKHZhbCxwcm9wKXtcbiAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWwpKSB2YWwgPSB2YWwuYmluZCh0aGlzLnZpZXcpO1xuICAgICAgICAgICB0aGlzLiRlbC5hdHRyKFwiZGF0YS1cIitwcm9wLHZhbClcbiAgICAgICB9LmJpbmQodGhpcykpXG4gICAgfVxufSk7IiwiaW1wb3J0IERpcmVjdGl2ZUNvbnRlbnQgZnJvbSBcIi4vZGlyZWN0aXZlLWNvbnRlbnRcIjtcbmltcG9ydCBEaXJlY3RpdmVFbmFibGUgZnJvbSBcIi4vZGlyZWN0aXZlLWVuYWJsZVwiO1xuaW1wb3J0IERpcmVjdGl2ZURpc2FibGUgZnJvbSBcIi4vZGlyZWN0aXZlLWRpc2FibGVcIjtcbmltcG9ydCBEaXJlY3RpdmVIcmVmIGZyb20gXCIuL2RpcmVjdGl2ZS1ocmVmXCI7XG5pbXBvcnQgRGlyZWN0aXZlTWFwIGZyb20gXCIuL2RpcmVjdGl2ZS1tYXBcIjtcbmltcG9ydCBEaXJlY3RpdmVPcHRpb25hbCBmcm9tIFwiLi9kaXJlY3RpdmUtb3B0aW9uYWxcIjtcbmltcG9ydCBEaXJlY3RpdmVPcHRpb25hbFdyYXAgZnJvbSBcIi4vZGlyZWN0aXZlLW9wdGlvbmFsd3JhcFwiO1xuaW1wb3J0IERpcmVjdGl2ZVNyYyBmcm9tIFwiLi9kaXJlY3RpdmUtc3JjXCI7XG5pbXBvcnQgRGlyZWN0aXZlU3VidmlldyBmcm9tIFwiLi9kaXJlY3RpdmUtc3Vidmlld1wiO1xuaW1wb3J0IERpcmVjdGl2ZURhdGEgZnJvbSBcIi4vZGlyZWN0aXZlLWRhdGFcIjtcblxudmFyIHJlZ2lzdHJ5ID0ge1xuICAgIENvbnRlbnQ6RGlyZWN0aXZlQ29udGVudCxcbiAgICBFbmFibGU6RGlyZWN0aXZlRW5hYmxlLFxuICAgIERpc2FibGU6RGlyZWN0aXZlRGlzYWJsZSxcbiAgICBIcmVmOkRpcmVjdGl2ZUhyZWYsXG4gICAgTWFwOkRpcmVjdGl2ZU1hcCxcbiAgICBPcHRpb25hbDpEaXJlY3RpdmVPcHRpb25hbCxcbiAgICBPcHRpb25hbFdyYXA6RGlyZWN0aXZlT3B0aW9uYWxXcmFwLFxuICAgIFNyYzpEaXJlY3RpdmVTcmMsXG4gICAgU3VidmlldzpEaXJlY3RpdmVTdWJ2aWV3LFxuICAgIERhdGE6RGlyZWN0aXZlRGF0YVxufTtcblxuZXhwb3J0IGRlZmF1bHQgcmVnaXN0cnk7IiwiLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cbi8qaW1wb3J0IF8gZnJvbSBcInVuZGVyc2NvcmVcIjsqL1xuLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbmltcG9ydCBEaXJlY3RpdmVSZWdpc3RyeSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnkuanNcIlxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlLmpzXCJcblxuXG5cbnZhciBiYWNrYm9uZVZpZXdPcHRpb25zID0gWydtb2RlbCcsICdjb2xsZWN0aW9uJywgJ2VsJywgJ2lkJywgJ2F0dHJpYnV0ZXMnLCAnY2xhc3NOYW1lJywgJ3RhZ05hbWUnLCAnZXZlbnRzJ107XG52YXIgYWRkaXRpb25hbFZpZXdPcHRpb25zID0gWydtYXBwaW5ncycsJ3RlbXBsYXRlU3RyaW5nJywnY2hpbGRWaWV3SW1wb3J0cycsJ3N1YlZpZXdJbXBvcnRzJywnaW5kZXgnLCdsYXN0SW5kZXgnLCdvdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2gnXVxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICAgIHRleHROb2Rlc1VuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDczMDMwOS9maW5kLWFsbC10ZXh0LW5vZGVzLWluLWh0bWwtcGFnZVxuICAgICAgICB2YXIgbiwgYT1bXSwgd2Fsaz1kb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKHRoaXMuZWwsTm9kZUZpbHRlci5TSE9XX1RFWFQsbnVsbCxmYWxzZSk7XG4gICAgICAgIHdoaWxlKG49d2Fsay5uZXh0Tm9kZSgpKSBhLnB1c2gobik7XG4gICAgICAgIHJldHVybiBhO1xuICAgICAgICBcbiAgICB9LFxuICAgICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgICAgICAvL2RlYnVnZ2VyO1xuXG4gICAgICAgIC8vTWFrZSBvcHRpb25zIGhhc2ggXCJzdHJpY3RcIi4gT25seSBhbGxvdyBjZXJ0YWluIG9wdGlvbnMgdG8gYmUgcGFzc2VkIGluLlxuICAgICAgICBfLmVhY2goXy5kaWZmZXJlbmNlKF8ua2V5cyhvcHRpb25zKSwgXy51bmlvbihiYWNrYm9uZVZpZXdPcHRpb25zLCBhZGRpdGlvbmFsVmlld09wdGlvbnMpKSwgZnVuY3Rpb24gKHByb3ApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIldhcm5pbmchIFVua25vd24gcHJvcGVydHkgXCIgKyBwcm9wKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9SZXF1aXJlIGEgZmFqaXRhIHZpZXcgdG8gaGF2ZSBhIHRlbXBsYXRlLlxuICAgICAgICAvL1NlbmQgYSB0ZW1wbGF0ZVN0cmluZyAoc3RyaW5nKSBvciBqc3QgKGZ1bmN0aW9uKVxuICAgICAgICAvL0lzIGl0IG5lY2Vzc2FyeSB0byBkaWZmZXJlbnRpYXRlPyBDb3VsZCBqdXN0IGNoZWNrIGlmIGl0J3MgYSBzdHJpbmcuXG4gICAgICAgIC8vT24gdGhlIG90aGVyIGhhbmQsIGl0J3MgbmljZSB0byBrbm93IGlmIHlvdSdyZSBzZW5kaW5nIGEgc3RyaW5nIHRlbXBsYXRlIG9yIGEgamF2YXNjcmlwdCB0ZW1wbGF0ZS5cbiAgICAgICAgaWYgKCF0aGlzLmpzdCAmJiAhdGhpcy50ZW1wbGF0ZVN0cmluZykgdGhyb3cgbmV3IEVycm9yKFwiWW91IG5lZWQgYSB0ZW1wbGF0ZVwiKTtcbiAgICAgICAgaWYgKCF0aGlzLmpzdCkge1xuICAgICAgICAgICAgdGhpcy5qc3QgPSBfLnRlbXBsYXRlKHRoaXMudGVtcGxhdGVTdHJpbmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgXy5leHRlbmQodGhpcywgXy5waWNrKG9wdGlvbnMsIGJhY2tib25lVmlld09wdGlvbnMuY29uY2F0KGFkZGl0aW9uYWxWaWV3T3B0aW9ucykpKTtcblxuICAgICAgICAvL0FkZCB0aGlzIGhlcmUgc28gdGhhdCBpdCdzIGF2YWlsYWJsZSBpbiBjbGFzc05hbWUgZnVuY3Rpb25cbiAgICAgICAgaWYgKCF0aGlzLmRlZmF1bHRzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiWW91IG5lZWQgZGVmYXVsdHMgZm9yIHlvdXIgdmlld1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF8uZWFjaCh0aGlzLmRlZmF1bHRzLCBmdW5jdGlvbiAoZGVmKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGRlZikpIGNvbnNvbGUud2FybihcIkRlZmF1bHRzIHNob3VsZCB1c3VhbGx5IGJlIHByaW1pdGl2ZSB2YWx1ZXNcIik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vZGF0YSBpcyBwYXNzZWQgaW4gb24gc3Vidmlld3NcbiAgICAgICAgLy8gY29tZXMgZnJvbSB0aGlzLnZpZXcudmlld01vZGVsLmdldCh0aGlzLnZhbCk7LCBcbiAgICAgICAgLy9zbyBpZiB0aGUgZGlyZWN0aXZlIGlzIG5tLXN1YnZpZXc9XCJNZW51XCIsIHRoZW4gdGhpcy5kYXRhIHNob3VsZCBiZS4uLndoYXQ/XG4gICAgICAgIC8vQWhhISBkYXRhIGlzIHRvIG92ZXJyaWRlIGRlZmF1bHQgdmFsdWVzIGZvciBzdWJ2aWV3cyBiZWluZyBwYXJ0IG9mIGEgcGFyZW50IHZpZXcuIFxuICAgICAgICAvL0J1dCBpdCBpcyBub3QgbWVhbnQgdG8gb3ZlcnJpZGUgbWFwcGluZ3MgSSBkb24ndCB0aGluay5cbiAgICAgICAgdGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2ggPSBvcHRpb25zICYmIG9wdGlvbnMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoO1xuXG4gICAgICAgIHZhciBhdHRycyA9IF8uZXh0ZW5kKF8uY2xvbmUodGhpcy5kZWZhdWx0cyksIG9wdGlvbnMgJiYgb3B0aW9ucy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2ggfHwge30pO1xuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCwgYXR0cnMpO1xuICAgICAgICB0aGlzLnZpZXdNb2RlbCA9IG5ldyBCYWNrYm9uZS5Nb2RlbChhdHRycyk7XG5cbiAgICAgICAgLy9tYXBwaW5ncyBjb250YWluIG1hcHBpbmdzIG9mIHZpZXcgdmFyaWFibGVzIHRvIG1vZGVsIHZhcmlhYmxlcy5cbiAgICAgICAgLy9zdHJpbmdzIGFyZSByZWZlcmVuY2VzIHRvIG1vZGVsIHZhcmlhYmxlcy4gRnVuY3Rpb25zIGFyZSBmb3Igd2hlbiBhIHZpZXcgdmFyaWFibGUgZG9lc1xuICAgICAgICAvL25vdCBtYXRjaCBwZXJmZWN0bHkgd2l0aCBhIG1vZGVsIHZhcmlhYmxlLiBUaGVzZSBhcmUgdXBkYXRlZCBlYWNoIHRpbWUgdGhlIG1vZGVsIGNoYW5nZXMuXG4gICAgICAgIHRoaXMucHJvcE1hcCA9IHt9O1xuICAgICAgICB0aGlzLmZ1bmNzID0ge307XG5cbiAgICAgICAgXy5lYWNoKHRoaXMubWFwcGluZ3MsIGZ1bmN0aW9uIChtb2RlbFZhciwgdGVtcGxhdGVWYXIpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbW9kZWxWYXIgPT0gXCJzdHJpbmdcIikgdGhpcy5wcm9wTWFwW3RlbXBsYXRlVmFyXSA9IG1vZGVsVmFyO1xuICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG1vZGVsVmFyID09IFwiZnVuY3Rpb25cIikgdGhpcy5mdW5jc1t0ZW1wbGF0ZVZhcl0gPSBtb2RlbFZhcjtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgICAgICAvL1Byb2JsZW06IGlmIHlvdSB1cGRhdGUgdGhlIG1vZGVsIGl0IHVwZGF0ZXMgZm9yIGV2ZXJ5IHN1YnZpZXcgKG5vdCBlZmZpY2llbnQpLlxuICAgICAgICAvL0FuZCBpdCBkb2VzIG5vdCB1cGRhdGUgZm9yIHN1Ym1vZGVscy4gUGVyaGFwcyB0aGVyZSBhcmUgbWFueSBkaWZmZXJlbnQgc29sdXRpb25zIGZvciB0aGlzLlxuICAgICAgICAvL1lvdSBjYW4gaGF2ZSBlYWNoIHN1Ym1vZGVsIHRyaWdnZXIgY2hhbmdlIGV2ZW50LlxuXG4gICAgICAgIC8vV2hlbmV2ZXIgdGhlIG1vZGVsIGNoYW5nZXMsIHVwZGF0ZSB0aGUgdmlld01vZGVsIGJ5IG1hcHBpbmcgcHJvcGVydGllcyBvZiB0aGUgbW9kZWwgdG8gcHJvcGVydGllcyBvZiB0aGUgdmlldyAoYXNzaWduZWQgaW4gbWFwcGluZ3MpXG4gICAgICAgIC8vQWxzbywgdGhlIGF0dHJpYnV0ZXMgY2hhbmdlLiBUaGlzIGNhbiBiZSBkb25lIG1vcmUgZWxlZ2FudGx5XG4gICAgICAgIGlmICh0aGlzLm1vZGVsKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlXCIsIHRoaXMudXBkYXRlVmlld01vZGVsKTtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2VcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldEF0dHJpYnV0ZXMoXy5leHRlbmQoe30sIF8ucmVzdWx0KHRoaXMsICdhdHRyaWJ1dGVzJykpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpZXdNb2RlbCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGF0dHJzID0gdGhpcy52aWV3TW9kZWwuYXR0cmlidXRlcztcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzKTtcbiAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIGlmIChrZXkgPT09IFwiZGVmaW5pdGlvbnNcIiAmJiAhdGhpcy52aWV3TW9kZWwuYXR0cmlidXRlc1trZXldKSB7XG4gICAgICAgICAgICAgICAgLy9wcm9ibGVtIGlzIHRoYXQgcHJvcE1hcCAoc2VlbXMgdG8gYmUgbWFwcGluZ3Mgd2l0aCBmdW5jdGlvbnMgZmlsdGVyZWQgb3V0KSBpcyBcbiAgICAgICAgICAgICAgICAvL3tkZWZpbml0aW9uczpcImRlZmluaXRpb25zXCJ9LiBDb21lcyBmcm9tIGFydGljbGVfYXJ0aWNsZS5qc1xuICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgICAgIHRoaXMuX2Vuc3VyZUVsZW1lbnQoKTtcbiAgICAgICAgdGhpcy5idWlsZElubmVySFRNTCgpO1xuXG4gICAgICAgIHRoaXMuaW5pdERpcmVjdGl2ZXMoKTsgLy9pbml0IHNpbXBsZSBkaXJlY3RpdmVzLi4udGhlIG9uZXMgdGhhdCBqdXN0IG1hbmlwdWxhdGUgYW4gZWxlbWVudFxuICAgICAgICB0aGlzLmRlbGVnYXRlRXZlbnRzKCk7XG5cbiAgICAgICAgdGhpcy5jaGlsZE5vZGVzID0gW10uc2xpY2UuY2FsbCh0aGlzLmVsLmNoaWxkTm9kZXMsIDApO1xuXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH0sXG4gICAgXG4gICAgaW5pdGlhbGl6ZTpmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgICAgLy9hdHRhY2ggb3B0aW9ucyB0byB2aWV3IChtb2RlbCwgcHJvcE1hcCwgc3ViVmlld3MsIGV2ZW50cylcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIF8uZXh0ZW5kKHRoaXMsb3B0aW9ucyk7XG4gICAgfSxcbiAgICBnZXRNb2RlbEF0dHI6ZnVuY3Rpb24oYXR0cil7XG4gICAgICAgIC8vcXVpY2tseSBncmFiIGEgbW9kZWxzIGF0dHJpYnV0ZSBieSBhIHZpZXcgdmFyaWFibGUuIFVzZWZ1bCBpbiBjbGFzc25hbWUgZnVuY3Rpb24uXG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5tYXBwaW5nc1thdHRyXSA9PVwic3RyaW5nXCIpIHJldHVybiB0aGlzLm1vZGVsLmdldCh0aGlzLm1hcHBpbmdzW2F0dHJdKTtcbiAgICAgICAgZWxzZSByZXR1cm4gdGhpcy5tYXBwaW5nc1thdHRyXS5jYWxsKHRoaXMpXG4gICAgfSxcbiAgICB1cGRhdGVWaWV3TW9kZWw6ZnVuY3Rpb24oKXtcblxuICAgICAgICBcbiAgICAgICAgdmFyIG9iaiA9IHt9XG4gICAgICAgIFxuICAgICAgICAvL0NoYW5nZSB0ZW1wbGF0ZVZhcnMtPm1vZGVsVmFycyB0byB0ZW1wbGF0ZVZhcnMtPm1vZGVsLmdldChcIm1vZGVsVmFyXCIpLCBhbmQgc2V0IG9uIHRoZSBtb2RlbFxuICAgICAgICBfLmV4dGVuZChvYmosXy5tYXBPYmplY3QodGhpcy5wcm9wTWFwLGZ1bmN0aW9uKG1vZGVsVmFyKXtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW9kZWwuZ2V0KG1vZGVsVmFyKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKSk7XG4gICAgICAgIFxuXG4gICAgICAgIF8uZXh0ZW5kKG9iaixfLm1hcE9iamVjdCh0aGlzLmZ1bmNzLGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICAgICAgdmFyIHJldCA9IGZ1bmMuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAvL2Z1bmMuY2FsbCBtYWtlcyBpdCB3b3JrIGJ1dCBvbmx5IG9uY2VcbiAgICAgICAgfS5iaW5kKHRoaXMpKSlcbiAgICAgICAgICAgICAgICBcblxuICAgICAgICBcbiAgICAgICAgdGhpcy52aWV3TW9kZWwuc2V0KG9iaik7XG5cblxuICAgICAgICBcbiAgICBcbiAgICB9LFxuICAgIGJ1aWxkSW5uZXJIVE1MOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbCkgdGhpcy4kZWwuaHRtbCh0aGlzLnJlbmRlcmVkVGVtcGxhdGUoKSk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGR1bW15ZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgICAgIGR1bW15ZGl2LmlubmVySFRNTCA9IHRoaXMucmVuZGVyZWRUZW1wbGF0ZSgpO1xuICAgICAgICAgICAgd2hpbGUoZHVtbXlkaXYuY2hpbGROb2Rlcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQoZHVtbXlkaXYuY2hpbGROb2Rlc1swXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL21heWJlIGxlc3MgaGFja2lzaCBzb2x1dGlvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yNTIxNDExMy8xNzYzMjE3XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGluaXREaXJlY3RpdmVzOmZ1bmN0aW9uKCl7XG5cbiAgICAgICAgXG4gICAgICAgICAvL0luaXQgZGlyZWN0aXZlcyBpbnZvbHZpbmcge3t9fVxuXG4gICAgICAgIHRoaXMuX2luaXRpYWxUZXh0Tm9kZXMgPSB0aGlzLnRleHROb2Rlc1VuZGVyKCk7XG4gICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cyA9IFtdO1xuICAgICAgICB0aGlzLl9pbml0aWFsVGV4dE5vZGVzLmZvckVhY2goZnVuY3Rpb24oZnVsbFRleHROb2RlKXtcbiAgICAgICAgICAgIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjEzMTE2NzAvMTc2MzIxNyB0ZXh0Q29udGVudCBzZWVtcyByaWdodFxuXG4gICAgICAgICAgICB2YXIgcmUgPSAvXFx7XFx7KC4rPylcXH1cXH0vZztcbiAgICAgICAgICAgIHZhciBtYXRjaDtcbiAgICAgICAgICAgIFxuXG5cbiAgICAgICAgICAgIHZhciBtYXRjaGVzID0gW107XG4gICAgICAgICAgICB3aGlsZSAoKG1hdGNoID0gcmUuZXhlYyhmdWxsVGV4dE5vZGUudGV4dENvbnRlbnQpKSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hlcy5wdXNoKG1hdGNoKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgY3VycmVudFRleHROb2RlID0gZnVsbFRleHROb2RlO1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRTdHJpbmcgPSBmdWxsVGV4dE5vZGUudGV4dENvbnRlbnQ7XG4gICAgICAgICAgICB2YXIgcHJldk5vZGVzTGVuZ3RoID0gMDtcblxuICAgICAgICAgICAgbWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uKG1hdGNoKXtcbiAgICAgICAgICAgICAgICB2YXIgdmFyTm9kZSA9IGN1cnJlbnRUZXh0Tm9kZS5zcGxpdFRleHQobWF0Y2guaW5kZXggLSBwcmV2Tm9kZXNMZW5ndGgpO1xuICAgICAgICAgICAgICAgIHZhciBlbnRpcmVNYXRjaCA9IG1hdGNoWzBdXG4gICAgICAgICAgICAgICAgdmFyTm9kZS5tYXRjaCA9IG1hdGNoWzFdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5wdXNoKHZhck5vZGUpO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRUZXh0Tm9kZSA9IHZhck5vZGUuc3BsaXRUZXh0KGVudGlyZU1hdGNoLmxlbmd0aClcbiAgICAgICAgICAgICAgICBjdXJyZW50U3RyaW5nID0gY3VycmVudFRleHROb2RlLnRleHRDb250ZW50O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHByZXZOb2Rlc0xlbmd0aD1tYXRjaC5pbmRleCArIGVudGlyZU1hdGNoLmxlbmd0aDsvL05vdGU6IFRoaXMgd29ya3MgYWNjaWRlbnRhbGx5LiBNaWdodCBiZSB3cm9uZy5cbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgXG5cbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgdGhpcy5kaXJlY3RpdmUgPSB7fTtcblxuICAgICAgIFxuXG5cbiAgICAgICAgZm9yICh2YXIgZGlyZWN0aXZlTmFtZSBpbiBEaXJlY3RpdmVSZWdpc3RyeSl7XG4gICAgICAgICAgICB2YXIgX19wcm90byA9IERpcmVjdGl2ZVJlZ2lzdHJ5W2RpcmVjdGl2ZU5hbWVdLnByb3RvdHlwZVxuICAgICAgICAgICAgaWYgKF9fcHJvdG8gaW5zdGFuY2VvZiBEaXJlY3RpdmUpeyAvL2JlY2F1c2UgZm9yZWFjaCB3aWxsIGdldCBtb3JlIHRoYW4ganVzdCBvdGhlciBkaXJlY3RpdmVzXG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBfX3Byb3RvLm5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKG5hbWUhPT1cInN1YnZpZXdcIiAmJiBuYW1lIT09XCJtYXBcIil7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbGVtZW50cyA9ICh0aGlzLiRlbCk/JC5tYWtlQXJyYXkodGhpcy4kZWwuZmluZChcIltubS1cIituYW1lK1wiXVwiKSk6JC5tYWtlQXJyYXkoJCh0aGlzLmVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCJbbm0tXCIrbmFtZStcIl1cIikpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXJlY3RpdmVbbmFtZV0gPSBlbGVtZW50cy5tYXAoZnVuY3Rpb24oZWxlbWVudCxpLGVsZW1lbnRzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL29uIHRoZSBzZWNvbmQgZ28tYXJvdW5kIGZvciBubS1tYXAsIGRpcmVjdGl2ZU5hbWUgc29tZWhvdyBpcyBjYWxsZWQgXCJTdWJWaWV3XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERpcmVjdGl2ZVJlZ2lzdHJ5W2RpcmVjdGl2ZU5hbWVdKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldzp0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbDplbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWw6ZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJubS1cIituYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTsgXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXJlY3RpdmVbXCJzdWJ2aWV3XCJdID0gdGhpcy5fc3ViVmlld0VsZW1lbnRzLm1hcChmdW5jdGlvbihzdWJWaWV3RWxlbWVudCxpLHN1YlZpZXdFbGVtZW50cyl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERpcmVjdGl2ZVJlZ2lzdHJ5W1wiU3Vidmlld1wiXSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldzp0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsOnN1YlZpZXdFbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTsgKi9cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuXG4gICAgICAgICB0aGlzLl9zdWJWaWV3RWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbihzdWJWaWV3RWxlbWVudCl7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHN1YlZpZXdFbGVtZW50Lm1hdGNoLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aD09MSl7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmRpcmVjdGl2ZVtcInN1YnZpZXdcIl0pIHRoaXMuZGlyZWN0aXZlW1wic3Vidmlld1wiXSA9IFtdO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlyZWN0aXZlW1wic3Vidmlld1wiXS5wdXNoKG5ldyBEaXJlY3RpdmVSZWdpc3RyeVtcIlN1YnZpZXdcIl0oe1xuICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgIGVsOnN1YlZpZXdFbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICB2YWw6c3ViVmlld0VsZW1lbnQubWF0Y2hcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5kaXJlY3RpdmVbXCJtYXBcIl0pIHRoaXMuZGlyZWN0aXZlW1wibWFwXCJdID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5kaXJlY3RpdmVbXCJtYXBcIl0ucHVzaChuZXcgRGlyZWN0aXZlUmVnaXN0cnlbXCJNYXBcIl0oe1xuICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgIGVsOnN1YlZpZXdFbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICB2YWw6c3ViVmlld0VsZW1lbnQubWF0Y2hcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0uYmluZCh0aGlzKSlcblxuXG4gICAgICAgXG4gICAgICAgIC8qXG4gICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uKHN1YlZpZXdFbGVtZW50KXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gc3ViVmlld0VsZW1lbnQubWF0Y2guc3BsaXQoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoPT0xKXtcbiAgICAgICAgICAgICAgICAvL3N1YnZpZXcgd2l0aCBubyBjb250ZXh0IG9ialxuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgLy9DaGVjayBmb3IgY29sbGVjdGlvbiBvciBtb2RlbCBwYXNzZWQuXG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcbiAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUuYmFja2dyb3VuZD1cInllbGxvd1wiO1xuICAgICAgICAgICAgZWxlbWVudC5pbm5lckhUTUwgPSBzdWJWaWV3RWxlbWVudC5tYXRjaDtcbiAgICAgICAgICAgIHN1YlZpZXdFbGVtZW50LnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGVsZW1lbnQsc3ViVmlld0VsZW1lbnQpO1xuICAgICAgICB9KSovXG5cbiAgICAgICBcblxuXG4gICAgICAgIFxuICAgIH0sXG4gICAgcmVuZGVyZWRUZW1wbGF0ZTpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy5qc3QpIHtcbiAgICAgICAgICAgIHdpbmRvdy5fID0gXztcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmpzdCh0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHJldHVybiBfLnRlbXBsYXRlKHRoaXMudGVtcGxhdGVTdHJpbmcpKHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXMpXG4gICAgfSxcbiAgICBkZWxlZ2F0ZUV2ZW50czogZnVuY3Rpb24oZXZlbnRzKSB7Ly9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xMjE5MzA2OS8xNzYzMjE3XG4gICAgICAgIHZhciBkZWxlZ2F0ZUV2ZW50U3BsaXR0ZXIgPSAvXihcXFMrKVxccyooLiopJC87XG4gICAgICAgIGV2ZW50cyB8fCAoZXZlbnRzID0gXy5yZXN1bHQodGhpcywgJ2V2ZW50cycpKTsgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICBpZiAoIWV2ZW50cykgcmV0dXJuIHRoaXM7XG4gICAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gZXZlbnRzKSB7XG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gZXZlbnRzW2tleV07XG4gICAgICAgICAgICBpZiAoIV8uaXNGdW5jdGlvbihtZXRob2QpKSBtZXRob2QgPSB0aGlzW2V2ZW50c1trZXldXTtcbiAgICAgICAgICAgIGlmICghbWV0aG9kKSB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBcIicgKyBldmVudHNba2V5XSArICdcIiBkb2VzIG5vdCBleGlzdCcpO1xuICAgICAgICAgICAgdmFyIG1hdGNoID0ga2V5Lm1hdGNoKGRlbGVnYXRlRXZlbnRTcGxpdHRlcik7XG4gICAgICAgICAgICB2YXIgZXZlbnRUeXBlcyA9IG1hdGNoWzFdLnNwbGl0KCcsJyksIHNlbGVjdG9yID0gbWF0Y2hbMl07XG4gICAgICAgICAgICBtZXRob2QgPSBfLmJpbmQobWV0aG9kLCB0aGlzKTtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIF8oZXZlbnRUeXBlcykuZWFjaChmdW5jdGlvbihldmVudE5hbWUpIHtcbiAgICAgICAgICAgICAgICBldmVudE5hbWUgKz0gJy5kZWxlZ2F0ZUV2ZW50cycgKyBzZWxmLmNpZDtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgc2VsZi4kZWwuYmluZChldmVudE5hbWUsIG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kZWwuZGVsZWdhdGUoc2VsZWN0b3IsIGV2ZW50TmFtZSwgbWV0aG9kKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIFxuICAgICAgIFxuICAgIH0sXG5cblxuXG5cbiAgICB0YWdOYW1lOnVuZGVmaW5lZCwvL2Rvbid0IHdhbnQgYSB0YWdOYW1lIHRvIGJlIGRpdiBieSBkZWZhdWx0LiBSYXRoZXIsIG1ha2UgaXQgYSBkb2N1bWVudGZyYWdtZW50J1xuICAgIHN1YlZpZXdJbXBvcnRzOnt9LFxuICAgIGNoaWxkVmlld0ltcG9ydHM6e30sXG4gICAgICBfZW5zdXJlRWxlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy9PdmVycmlkaW5nIHRoaXMgdG8gc3VwcG9ydCBkb2N1bWVudCBmcmFnbWVudHNcbiAgICAgICAgICAgIGlmICghdGhpcy5lbCkge1xuICAgICAgICAgICAgICAgIGlmKHRoaXMuYXR0cmlidXRlcyB8fCB0aGlzLmlkIHx8IHRoaXMuY2xhc3NOYW1lIHx8IHRoaXMudGFnTmFtZSl7Ly9pZiB5b3UgaGF2ZSBhbnkgb2YgdGhlc2UgYmFja2JvbmUgcHJvcGVydGllcywgZG8gYmFja2JvbmUgYmVoYXZpb3JcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdHRycyA9IF8uZXh0ZW5kKHt9LCBfLnJlc3VsdCh0aGlzLCAnYXR0cmlidXRlcycpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlkKSBhdHRycy5pZCA9IF8ucmVzdWx0KHRoaXMsICdpZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2xhc3NOYW1lKSBhdHRyc1snY2xhc3MnXSA9IF8ucmVzdWx0KHRoaXMsICdjbGFzc05hbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudCh0aGlzLl9jcmVhdGVFbGVtZW50KF8ucmVzdWx0KHRoaXMsICd0YWdOYW1lJykgfHwgJ2RpdicpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NldEF0dHJpYnV0ZXMoYXR0cnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNley8vaG93ZXZlciwgZGVmYXVsdCB0byB0aGlzLmVsIGJlaW5nIGEgZG9jdW1lbnRmcmFnbWVudCAobWFrZXMgdGhpcy5lbCBuYW1lZCBpbXByb3Blcmx5IGJ1dCB3aGF0ZXZlcilcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChfLnJlc3VsdCh0aGlzLCAnZWwnKSk7XG4gICAgICAgICAgICB9XG4gICAgfSxcbiAgICBzZXQ6ZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgdGhpcy52aWV3TW9kZWwuc2V0KG9iaik7XG4gICAgfSxcbiAgICBnZXQ6ZnVuY3Rpb24ocHJvcCl7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXdNb2RlbC5nZXQocHJvcClcbiAgICB9XG59KTtcbiIsIi8vU2FtZSBtb2RlbCwgY29sbGVjdGlvbiBpbiBzYW1lIGZpbGUgZm9yIG5vdyBiZWNhdXNlIHRoZXNlIG1vZHVsZXMgcmVseSBvbiBlYWNoIG90aGVyLlxuXG4vKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgTW9kZWwgZnJvbSBcIi4vTW9kZWxcIjtcbmltcG9ydCBDb2xsZWN0aW9uIGZyb20gXCIuL0NvbGxlY3Rpb25cIjtcbmltcG9ydCBWaWV3IGZyb20gXCIuL1ZpZXdcIjtcbmltcG9ydCBEaXJlY3RpdmVSZWdpc3RyeSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnlcIjtcbi8qaW1wb3J0ICQgZnJvbSBcImpxdWVyeVwiOyovXG5cbnZhciBGYWppdGEgPSB7TW9kZWwsIENvbGxlY3Rpb24sIFZpZXcsIERpcmVjdGl2ZVJlZ2lzdHJ5fTtcbkZhaml0YVtcIvCfjK5cIl0gPSBcIjAuMC4wXCI7XG5cbmlmICh0eXBlb2Ygd2luZG93IT09XCJ1bmRlZmluZWRcIikgd2luZG93LkZhaml0YSA9IEZhaml0YTtcbmlmICh0eXBlb2YgZ2xvYmFsIT09XCJ1bmRlZmluZWRcIikgZ2xvYmFsLkZhaml0YSA9IEZhaml0YTsiXSwibmFtZXMiOlsiQmFja2JvbmUiLCJNb2RlbCIsImV4dGVuZCIsIm9wdGlvbnMiLCJVUkxTZWFyY2hQYXJhbXMiLCJxdWVyeSIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwic3RydWN0dXJlIiwicGFyZW50TW9kZWxzIiwiaW5pdCIsImF0dHIiLCJfIiwiaXNTdHJpbmciLCJwcm9wcyIsInNwbGl0IiwibGVuZ3RoIiwibW9kZWwiLCJzbGljZSIsImZvckVhY2giLCJwcm9wIiwiZ2V0IiwicHJvdG90eXBlIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJpc1VuZGVmaW5lZCIsImtleSIsInZhbDEiLCJ2YWwyIiwic2V0IiwidmFsIiwiaSIsIm5ld01vZGVsIiwiRmFqaXRhIiwiaXNBcnJheSIsIkNvbGxlY3Rpb24iLCJwdXNoIiwibGlzdGVuVG8iLCJ0cmlnZ2VyIiwib24iLCJWaWV3IiwibmFtZSIsImNvbnNvbGUiLCJlcnJvciIsInZpZXciLCJjaGlsZEluaXQiLCJidWlsZCIsInVwZGF0ZVJlc3VsdCIsInZpZXdNb2RlbCIsInJlbmRlciIsInJlc3VsdCIsImlzRnVuY3Rpb24iLCJjYWxsIiwiRGlyZWN0aXZlIiwiJGVsIiwiZWwiLCJzZXRBdHRyaWJ1dGUiLCJpbm5lckhUTUwiLCJ2YWx1ZSIsInBhc3MiLCJnZXRBdHRyaWJ1dGUiLCIkIiwiYSIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImNsYXNzTGlzdCIsImFkZCIsIndyYXBwZXJBIiwicGFyZW50Tm9kZSIsInJlcGxhY2VDaGlsZCIsImFwcGVuZENoaWxkIiwicGFyZW50IiwiYXJncyIsInN1YlZpZXdOYW1lIiwic3ViTW9kZWxOYW1lIiwic3ViTW9kZWwiLCJzdWJDb2xsZWN0aW9uIiwiY2hpbGRNYXBwaW5ncyIsIm1hcHBpbmdzIiwib3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoIiwiQWJzdHJhY3RTdWJ2aWV3IiwicmVuZGVyQWRkIiwicmVuZGVyUmVzZXQiLCJyZW5kZXJSZW1vdmUiLCJyZW5kZXJTb3J0IiwiQ2hpbGRWaWV3IiwiY2hpbGRWaWV3SW1wb3J0cyIsImNoaWxkVmlld09wdGlvbnMiLCJ0YWdOYW1lIiwiY2hpbGRWaWV3cyIsIm1hcCIsImNoaWxkTW9kZWwiLCJtb2RlbHMiLCJhdHRyaWJ1dGVzIiwiY2hpbGR2aWV3IiwiYmluZCIsIl9pbml0aWFsaXplQmFja2JvbmVPYmplY3QiLCJfaW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3MiLCJfaW5pdGlhbGl6ZU92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCIsIl9pbml0aWFsaXplQ2hpbGRWaWV3cyIsInJlcGxhY2VXaXRoIiwic3ViVmlldyIsIiRjaGlsZHJlbiIsImNoaWxkVmlldyIsImluZGV4IiwiZGVsZWdhdGVFdmVudHMiLCIkcGFyZW50IiwiY2hpbGRyZW4iLCJlYWNoIiwiZXhpc3RpbmdDaGlsZFZpZXciLCJmaWx0ZXIiLCJuZXdDaGlsZFZpZXciLCJlbXB0eSIsImNoaWxkIiwiYXBwZW5kIiwibGFzdCIsInJlbW92ZSIsInNwbGljZSIsImNvbnRhaW5zIiwiaGlkZSIsImNzcyIsImJvZHkiLCJFcnJvciIsImlzIiwid3JhcHBlciIsImNoaWxkTm9kZXMiLCJ1bndyYXAiLCJpbnNlcnRCZWZvcmUiLCJzdWJWaWV3SW1wb3J0cyIsIkNoaWxkQ29uc3RydWN0b3IiLCJjbGFzc2VzIiwiY2wiLCJwYXJlbnREaXJlY3RpdmUiLCJvcHRpb25zU2VudFRvU3ViVmlldyIsImNvbnRlbnQiLCJyZWdpc3RyeSIsIkRpcmVjdGl2ZUNvbnRlbnQiLCJEaXJlY3RpdmVFbmFibGUiLCJEaXJlY3RpdmVEaXNhYmxlIiwiRGlyZWN0aXZlSHJlZiIsIkRpcmVjdGl2ZU1hcCIsIkRpcmVjdGl2ZU9wdGlvbmFsIiwiRGlyZWN0aXZlT3B0aW9uYWxXcmFwIiwiRGlyZWN0aXZlU3JjIiwiRGlyZWN0aXZlU3VidmlldyIsIkRpcmVjdGl2ZURhdGEiLCJiYWNrYm9uZVZpZXdPcHRpb25zIiwiYWRkaXRpb25hbFZpZXdPcHRpb25zIiwibiIsIndhbGsiLCJjcmVhdGVUcmVlV2Fsa2VyIiwiTm9kZUZpbHRlciIsIlNIT1dfVEVYVCIsIm5leHROb2RlIiwiY29uc3RydWN0b3IiLCJkaWZmZXJlbmNlIiwia2V5cyIsInVuaW9uIiwid2FybiIsImpzdCIsInRlbXBsYXRlU3RyaW5nIiwidGVtcGxhdGUiLCJwaWNrIiwiY29uY2F0IiwiZGVmYXVsdHMiLCJkZWYiLCJhdHRycyIsImNsb25lIiwibG9nIiwicHJvcE1hcCIsImZ1bmNzIiwibW9kZWxWYXIiLCJ0ZW1wbGF0ZVZhciIsInVwZGF0ZVZpZXdNb2RlbCIsIl9zZXRBdHRyaWJ1dGVzIiwiT2JqZWN0IiwiX2Vuc3VyZUVsZW1lbnQiLCJidWlsZElubmVySFRNTCIsImluaXREaXJlY3RpdmVzIiwiaW5pdGlhbGl6ZSIsIm9iaiIsIm1hcE9iamVjdCIsImZ1bmMiLCJyZXQiLCJodG1sIiwicmVuZGVyZWRUZW1wbGF0ZSIsImR1bW15ZGl2IiwiX2luaXRpYWxUZXh0Tm9kZXMiLCJ0ZXh0Tm9kZXNVbmRlciIsIl9zdWJWaWV3RWxlbWVudHMiLCJmdWxsVGV4dE5vZGUiLCJyZSIsIm1hdGNoIiwibWF0Y2hlcyIsImV4ZWMiLCJ0ZXh0Q29udGVudCIsImN1cnJlbnRUZXh0Tm9kZSIsImN1cnJlbnRTdHJpbmciLCJwcmV2Tm9kZXNMZW5ndGgiLCJ2YXJOb2RlIiwic3BsaXRUZXh0IiwiZW50aXJlTWF0Y2giLCJkaXJlY3RpdmUiLCJkaXJlY3RpdmVOYW1lIiwiRGlyZWN0aXZlUmVnaXN0cnkiLCJfX3Byb3RvIiwiZWxlbWVudHMiLCJtYWtlQXJyYXkiLCJmaW5kIiwicXVlcnlTZWxlY3RvckFsbCIsImVsZW1lbnQiLCJzdWJWaWV3RWxlbWVudCIsImV2ZW50cyIsImRlbGVnYXRlRXZlbnRTcGxpdHRlciIsInVuZGVsZWdhdGVFdmVudHMiLCJtZXRob2QiLCJldmVudFR5cGVzIiwic2VsZWN0b3IiLCJzZWxmIiwiZXZlbnROYW1lIiwiY2lkIiwiZGVsZWdhdGUiLCJ1bmRlZmluZWQiLCJpZCIsImNsYXNzTmFtZSIsInNldEVsZW1lbnQiLCJfY3JlYXRlRWxlbWVudCIsImNyZWF0ZURvY3VtZW50RnJhZ21lbnQiLCJnbG9iYWwiXSwibWFwcGluZ3MiOiI7OztBQUFBOzs7QUFJQSxZQUFlQSxTQUFTQyxLQUFULENBQWVDLE1BQWYsQ0FBc0I7O2NBRXhCLG9CQUFTQyxPQUFULEVBQWlCO1FBQ3JCLE9BQU9DLGVBQVAsS0FBMkIsV0FBaEMsRUFBNkM7V0FDdENDLEtB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
