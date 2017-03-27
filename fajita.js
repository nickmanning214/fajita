(function () {
'use strict';

/*import _ from "underscore";*/
/*import Backbone from "backbone";*/

var Model = Backbone.Model.extend({

  initialize: function initialize(options) {
    if (typeof URLSearchParams !== "undefined") {
      this.query = new URLSearchParams(window.location.search);
    }

    //possibly deprecated because if subModels and subCollections are separated then how to you ref them in get id there is a name conflict?
    this.subModels = {};
    this.subCollections = {};

    //new
    this.structure = {};

    this.parentModels = [];
    this.init();
  },
  init: function init() {},
  registerSubCollection: function registerSubCollection(prop, collection) {
    if (_.isArray(collection)) collection = new Base.Collection(collection);else if (!(collection instanceof Backbone.Collection)) collection = new Base.Collection(_.toArray(collection));
    this.subCollections[prop] = collection;
    collection.parentModels.push(this);
    this.listenTo(collection, "add remove reset sort", function () {
      this.trigger("change");
    });
  },
  get: function get(attr) {
    if (_.isString(attr) && attr.startsWith("->")) {
      return this.structure[attr.substr(2)];
    } else {
      var get = Backbone.Model.prototype.get.apply(this, arguments);
      if (!_.isUndefined(get)) return get;

      var props = attr.split(".");
      if (props.length > 1) {
        var model = this;
        props.forEach(function (prop) {
          if (model.subModels[prop]) model = model.subModels[prop];else if (model.subCollections[prop]) model = model.subCollections[prop];
        });
        return model;
      }

      return this.subModels[attr] || this.subCollections[attr];
    }
  },
  toggle: function toggle(key, val1, val2) {
    if (this.get(key) == val2) {
      this.set(key, val1);
    } else this.set(key, val2);
  },
  set: function set(key, val, options) {
    //my code
    if (_.isString(key) && key.startsWith("->")) {

      var modelOrCollection = _.isArray(val) ? new Fajita.Collection(val) : new Fajita.Model(val);
      modelOrCollection.parentModels.push(this);
      this.structure[key.substr(2)] = modelOrCollection;

      this.listenTo(modelOrCollection, "change add", function (modelOrCollection, options) {

        this.trigger("change");

        /* TODO: invent entire system for traversing and firing events. Probably not worth the effort for now.
        Object.keys(model.changedAttributes()).forEach(function(key){
          this.trigger("change:"+prop+"."+key)
        }.bind(this));
        */
      });
    } else {
      var _Backbone$Model$proto;

      (_Backbone$Model$proto = Backbone.Model.prototype.set).call.apply(_Backbone$Model$proto, [this].concat(Array.prototype.slice.call(arguments)));
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


        _.each(_.difference(_.keys(options), _.union(backboneViewOptions, additionalViewOptions)), function (prop) {
            console.warn("Warning! Unknown property " + prop);
        });

        if (!this.jst && !this.templateString) throw new Error("You need a template");
        if (!this.jst) {
            this.cid = _.uniqueId(this.tplid);
            this.jst = _.template(this.templateString);
        } else {
            this.cid = _.uniqueId('view');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFqaXRhLmpzIiwic291cmNlcyI6WyJNb2RlbC5qcyIsIkNvbGxlY3Rpb24uanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1jb250ZW50LmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1lbmFibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRpc2FibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWhyZWYuanMiLCJkaXJlY3RpdmUvYWJzdHJhY3Qtc3Vidmlldy5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtbWFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1vcHRpb25hbC5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtb3B0aW9uYWx3cmFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1zcmMuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLXN1YnZpZXcuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRhdGEuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnkuanMiLCJWaWV3LmpzIiwiQmFzZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5cblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgXG4gIGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgaWYgKCB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSBcInVuZGVmaW5lZFwiICl7XG4gICAgICB0aGlzLnF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICB9XG5cbiAgICAvL3Bvc3NpYmx5IGRlcHJlY2F0ZWQgYmVjYXVzZSBpZiBzdWJNb2RlbHMgYW5kIHN1YkNvbGxlY3Rpb25zIGFyZSBzZXBhcmF0ZWQgdGhlbiBob3cgdG8geW91IHJlZiB0aGVtIGluIGdldCBpZCB0aGVyZSBpcyBhIG5hbWUgY29uZmxpY3Q/XG4gICAgdGhpcy5zdWJNb2RlbHMgPSB7fTtcbiAgICB0aGlzLnN1YkNvbGxlY3Rpb25zID0ge307XG5cbiAgICAvL25ld1xuICAgIHRoaXMuc3RydWN0dXJlID0ge307XG5cbiAgICB0aGlzLnBhcmVudE1vZGVscyA9IFtdO1xuICAgIHRoaXMuaW5pdCgpO1xuICB9LFxuICBpbml0OmZ1bmN0aW9uKCl7fSxcbiAgcmVnaXN0ZXJTdWJDb2xsZWN0aW9uOmZ1bmN0aW9uKHByb3AsY29sbGVjdGlvbil7XG4gICAgaWYgKF8uaXNBcnJheShjb2xsZWN0aW9uKSkgY29sbGVjdGlvbiA9IG5ldyBCYXNlLkNvbGxlY3Rpb24oY29sbGVjdGlvbik7XG4gICAgZWxzZSBpZiAoIShjb2xsZWN0aW9uIGluc3RhbmNlb2YgQmFja2JvbmUuQ29sbGVjdGlvbikpIGNvbGxlY3Rpb24gPSBuZXcgQmFzZS5Db2xsZWN0aW9uKF8udG9BcnJheShjb2xsZWN0aW9uKSlcbiAgICB0aGlzLnN1YkNvbGxlY3Rpb25zW3Byb3BdID0gY29sbGVjdGlvbjtcbiAgICBjb2xsZWN0aW9uLnBhcmVudE1vZGVscy5wdXNoKHRoaXMpO1xuICAgIHRoaXMubGlzdGVuVG8oY29sbGVjdGlvbixcImFkZCByZW1vdmUgcmVzZXQgc29ydFwiLGZ1bmN0aW9uKCl7XG4gICAgICB0aGlzLnRyaWdnZXIoXCJjaGFuZ2VcIik7XG4gICAgfSlcbiAgfSxcbiAgZ2V0OmZ1bmN0aW9uKGF0dHIpe1xuICAgIGlmIChfLmlzU3RyaW5nKGF0dHIpICYmIGF0dHIuc3RhcnRzV2l0aChcIi0+XCIpKSB7XG4gICAgICByZXR1cm4gdGhpcy5zdHJ1Y3R1cmVbYXR0ci5zdWJzdHIoMildO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgdmFyIGdldCA9IEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5nZXQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKGdldCkpIHJldHVybiBnZXQ7XG5cbiAgICAgIHZhciBwcm9wcyA9IGF0dHIuc3BsaXQoXCIuXCIpO1xuICAgICAgICBpZiAocHJvcHMubGVuZ3RoID4gMSl7XG4gICAgICAgICAgdmFyIG1vZGVsID0gdGhpcztcbiAgICAgICAgICBwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3Ape1xuICAgICAgICAgICAgaWYgKG1vZGVsLnN1Yk1vZGVsc1twcm9wXSkgbW9kZWwgPSBtb2RlbC5zdWJNb2RlbHNbcHJvcF07XG4gICAgICAgICAgICBlbHNlIGlmIChtb2RlbC5zdWJDb2xsZWN0aW9uc1twcm9wXSkgbW9kZWwgPSBtb2RlbC5zdWJDb2xsZWN0aW9uc1twcm9wXVxuICAgICAgICAgIH0pXG4gICAgICAgICAgcmV0dXJuIG1vZGVsOyAgIFxuICAgICAgICB9XG4gICAgXG4gICAgICAgIHJldHVybiB0aGlzLnN1Yk1vZGVsc1thdHRyXSB8fCB0aGlzLnN1YkNvbGxlY3Rpb25zW2F0dHJdXG4gICAgfVxuXG4gICBcbiAgIFxuICB9LFxuICB0b2dnbGU6ZnVuY3Rpb24oa2V5LHZhbDEsdmFsMil7XG4gICAgaWYgKHRoaXMuZ2V0KGtleSk9PXZhbDIpe1xuICAgICAgdGhpcy5zZXQoa2V5LHZhbDEpO1xuICAgIH1cbiAgICBlbHNlIHRoaXMuc2V0KGtleSx2YWwyKTtcbiAgfSxcbiAgc2V0OmZ1bmN0aW9uKGtleSwgdmFsLCBvcHRpb25zKXtcbiAgICAgIC8vbXkgY29kZVxuICAgICAgaWYgKF8uaXNTdHJpbmcoa2V5KSAmJiBrZXkuc3RhcnRzV2l0aChcIi0+XCIpKSB7XG5cbiAgICAgICAgdmFyIG1vZGVsT3JDb2xsZWN0aW9uID0gKF8uaXNBcnJheSh2YWwpKT9uZXcgRmFqaXRhLkNvbGxlY3Rpb24odmFsKTpuZXcgRmFqaXRhLk1vZGVsKHZhbCk7XG4gICAgICAgIG1vZGVsT3JDb2xsZWN0aW9uLnBhcmVudE1vZGVscy5wdXNoKHRoaXMpO1xuICAgICAgICB0aGlzLnN0cnVjdHVyZVtrZXkuc3Vic3RyKDIpXSA9IG1vZGVsT3JDb2xsZWN0aW9uO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIHRoaXMubGlzdGVuVG8obW9kZWxPckNvbGxlY3Rpb24sXCJjaGFuZ2UgYWRkXCIsZnVuY3Rpb24obW9kZWxPckNvbGxlY3Rpb24sb3B0aW9ucyl7XG5cbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcImNoYW5nZVwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLyogVE9ETzogaW52ZW50IGVudGlyZSBzeXN0ZW0gZm9yIHRyYXZlcnNpbmcgYW5kIGZpcmluZyBldmVudHMuIFByb2JhYmx5IG5vdCB3b3J0aCB0aGUgZWZmb3J0IGZvciBub3cuXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhtb2RlbC5jaGFuZ2VkQXR0cmlidXRlcygpKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcImNoYW5nZTpcIitwcm9wK1wiLlwiK2tleSlcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAqL1xuXG5cbiAgICAgICAgICB9KTtcblxuICAgICAgIFxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLC4uLmFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgICBcbiAgICAgXG4gIH1cbiAgLy9Ob3RlOiB0aGVyZSBpcyBzdGlsbCBubyBsaXN0ZW5lciBmb3IgYSBzdWJtb2RlbCBvZiBhIGNvbGxlY3Rpb24gY2hhbmdpbmcsIHRyaWdnZXJpbmcgdGhlIHBhcmVudC4gSSB0aGluayB0aGF0J3MgdXNlZnVsLlxufSk7IiwiLyppbXBvcnQgXyBmcm9tIFwidW5kZXJzY29yZVwiOyovXG4vKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuaW1wb3J0IE1vZGVsIGZyb20gXCIuL01vZGVsXCI7XG5cbmV4cG9ydCBkZWZhdWx0IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICBtb2RlbDpNb2RlbCwgLy9wcm9ibGVtOiBNb2RlbCByZWxpZXMgb24gY29sbGVjdGlvbiBhcyB3ZWxsIGNhdXNpbmcgZXJyb3JcbiAgICBpbml0aWFsaXplOmZ1bmN0aW9uKCl7XG4gICAgICAgICB0aGlzLnBhcmVudE1vZGVscyA9IFtdO1xuICAgICAgICAvL3RyaWdnZXIgXCJ1cGRhdGVcIiB3aGVuIHN1Ym1vZGVsIGNoYW5nZXNcbiAgICAgICAgdGhpcy5vbihcImFkZFwiLGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8obW9kZWwsXCJjaGFuZ2VcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcInVwZGF0ZVwiKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxufSk7IiwiLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICAgIG5hbWU6bnVsbCxcbiAgICBidWlsZDpudWxsLFxuICAgIHJlbmRlcjpudWxsLFxuICAgIGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgICAgIGlmICghdGhpcy5uYW1lKSBjb25zb2xlLmVycm9yKFwiRXJyb3I6IERpcmVjdGl2ZSByZXF1aXJlcyBhIG5hbWUgaW4gdGhlIHByb3RvdHlwZS5cIik7XG4gICAgICAgIHRoaXMudmFsID0gb3B0aW9ucy52YWw7XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy92aWV3IGlzIHRoZSB2aWV3IHRoYXQgaW1wbGVtZW50cyB0aGlzIGRpcmVjdGl2ZS5cbiAgICAgICAgaWYgKCFvcHRpb25zLnZpZXcpIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogRGlyZWN0aXZlIHJlcXVpcmVzIGEgdmlldyBwYXNzZWQgYXMgYW4gb3B0aW9uLlwiKTtcbiAgICAgICAgdGhpcy52aWV3ID0gb3B0aW9ucy52aWV3O1xuICAgICAgICBpZiAoIXRoaXMuY2hpbGRJbml0KSBjb25zb2xlLmVycm9yKFwiRXJyb3I6IERpcmVjdGl2ZSByZXF1aXJlcyBjaGlsZEluaXQgaW4gcHJvdG90eXBlLlwiKTtcbiAgICAgICAgdGhpcy5jaGlsZEluaXQoKTtcbiAgICAgICAgdGhpcy5idWlsZCgpO1xuICAgIH0sXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgXG4gICAgICAgIHRoaXMudXBkYXRlUmVzdWx0KCk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy52aWV3LnZpZXdNb2RlbCxcImNoYW5nZTpcIit0aGlzLnZhbCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy51cGRhdGVSZXN1bHQoKTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgfSxcbiAgICB1cGRhdGVSZXN1bHQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHRoaXMudmlldy5nZXQodGhpcy52YWwpO1xuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHJlc3VsdCkpIHRoaXMucmVzdWx0ID0gcmVzdWx0LmNhbGwodGhpcy52aWV3KTtcbiAgICAgICAgZWxzZSB0aGlzLnJlc3VsdCA9IHJlc3VsdDtcbiAgICB9XG59KTsiLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG4vL05vdGU6IERvbid0IHVzZSAuaHRtbCgpIG9yIC5hdHRyKCkganF1ZXJ5LiBJdCdzIHdlaXJkIHdpdGggZGlmZmVyZW50IHR5cGVzLlxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcImNvbnRlbnRcIixcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiSU1HXCIpIHRoaXMuZWwuc2V0QXR0cmlidXRlKFwidGl0bGVcIix0aGlzLnJlc3VsdClcbiAgICAgICAgZWxzZSB0aGlzLmVsLmlubmVySFRNTCA9IHRoaXMucmVzdWx0O1xuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuYnVpbGQoKTtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICB2YXIgcGFzcyA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiSU1HXCIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmVsLmdldEF0dHJpYnV0ZShcInRpdGxlXCIpPT12YWx1ZSArIFwiXCIpIHBhc3MgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuZWwuaW5uZXJIVE1MPT12YWx1ZStcIlwiKSBwYXNzID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBwYXNzO1xuICAgIH1cbn0pOyIsIi8vV2h5IGRvZXMgdW5kZXJzY29yZSB3b3JrIGhlcmU/XG5cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJlbmFibGVcIixcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLHRydWUpO1xuICAgICAgICBlbHNlICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsXCJcIik7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCkgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIix0cnVlKTtcbiAgICAgICAgZWxzZSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLFwiXCIpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHJldHVybiAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiKSE9dmFsdWU7XG4gICAgfVxufSk7XG4iLCIvL1doeSBkb2VzIHVuZGVyc2NvcmUgd29yayBoZXJlP1xuXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiZGlzYWJsZVwiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLnJlc3VsdCkgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIix0cnVlKTtcbiAgICAgICAgZWxzZSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLFwiXCIpO1xuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLnJlc3VsdCkgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIix0cnVlKTtcbiAgICAgICAgZWxzZSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLFwiXCIpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHJldHVybiAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiKT09dmFsdWU7XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiaHJlZlwiLFxuICAgXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMuJGVsLnByb3AoXCJ0YWdOYW1lXCIpPT1cIkFcIikgdGhpcy4kZWwuYXR0cihcImhyZWZcIix0aGlzLnJlc3VsdCk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKTtcbiAgICAgICAgICAgIGEuY2xhc3NMaXN0LmFkZChcIndyYXBwZXItYVwiKVxuICAgICAgICAgICAgYS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIsdGhpcy5yZXN1bHQpO1xuICAgICAgICAgICAgdGhpcy53cmFwcGVyQSA9IGE7XG4gICAgICAgICAgICB0aGlzLmVsLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKHRoaXMud3JhcHBlckEsdGhpcy5lbClcbiAgICAgICAgICAgIC8vY2FuJ3Qgc2ltcGx5IHVzZSB0aGlzLiRlbC53cmFwKGEpO1xuICAgICAgICAgICAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzU3MDczMjgvd3JhcC1vbmUtZWxlbWVudC13aXRoLWFub3RoZXItcmV0YWluaW5nLXJlZmVyZW5jZS10by13cmFwcGVyXG4gICAgICAgICAgICB0aGlzLndyYXBwZXJBLmFwcGVuZENoaWxkKHRoaXMuZWwpO1xuICAgICAgICB9XG4gICAgICAgIHdpbmRvdy53cmFwcGVyQSA9IHRoaXMud3JhcHBlckE7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMuJGVsLnByb3AoXCJ0YWdOYW1lXCIpPT1cIkFcIikgJCh0aGlzLmVsKS5hdHRyKFwiaHJlZlwiLHRoaXMucmVzdWx0KVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMud3JhcHBlckEuc2V0QXR0cmlidXRlKFwiaHJlZlwiLHRoaXMucmVzdWx0KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJBXCIpIHJldHVybiAkKHRoaXMuZWwpLmF0dHIoXCJocmVmXCIpPT12YWx1ZVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAkKHRoaXMuZWwpLnBhcmVudCgpLnByb3AoXCJ0YWdOYW1lXCIpPT1cIkFcIiAmJiAkKHRoaXMuZWwpLnBhcmVudCgpLmF0dHIoXCJocmVmXCIpPT12YWx1ZVxuICAgICAgICB9XG4gICAgfVxufSk7IiwiaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcImFic3RyYWN0c3Vidmlld1wiLFxuICAgIF9pbml0aWFsaXplQmFja2JvbmVPYmplY3Q6ZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGFyZ3MgPSB0aGlzLnZhbC5zcGxpdChcIjpcIik7XG4gICAgICAgIHRoaXMuc3ViVmlld05hbWUgPSBhcmdzWzBdO1xuICAgICAgICAgaWYgKGFyZ3NbMV0pe1xuICAgICAgICAgICAgdGhpcy5zdWJNb2RlbE5hbWUgPSBhcmdzWzFdO1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gdGhpcy52aWV3LmdldCh0aGlzLnN1YlZpZXdOYW1lKTsgLy9jaGFuZ2VkIGZyb20gc3ViTW9kZWxOYW1lLlxuICAgICAgICAgICAgaWYgKG1vZGVsIGluc3RhbmNlb2YgQmFja2JvbmUuTW9kZWwpIHRoaXMuc3ViTW9kZWwgPSBtb2RlbDtcbiAgICAgICAgICAgIGVsc2UgaWYgKG1vZGVsIGluc3RhbmNlb2YgQmFja2JvbmUuQ29sbGVjdGlvbikgdGhpcy5zdWJDb2xsZWN0aW9uID0gbW9kZWw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coKG1vZGVsIGluc3RhbmNlb2YgQmFja2JvbmUuTW9kZWwpLChtb2RlbCBpbnN0YW5jZW9mIEJhY2tib25lLkNvbGxlY3Rpb24pLHRoaXMuc3ViQ29sbGVjdGlvbilcbiAgICAgICAgICAgIC8vZGVidWdnZXI7XG4gICAgICAgICB9XG4gICAgfSxcbiAgICBfaW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3M6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy9UaGUgSlNPTiBvYmplY3QgdG8gcGFzcyBhcyBcIm1hcHBpbmdzXCIgdG8gdGhlIHN1YnZpZXcgb3IgdGhlIGl0ZW0gaW4gdGhlIHN1YkNvbGxlY3Rpb24uXG4gICAgICAgICAvL0RvIG5vdCBzaG9ydGVuIHRvIHZpZXcuZ2V0LiB2aWV3LmdldCBnZXRzIGZyb20gdGhlIHZpZXdNb2RlbCB3aGljaCBjb250YWlucyBwcm9wcyBhbmQgdmFsdWVzLi4ubm90IHZpZXcgcHJvcHMgYW5kIGFwcCBwcm9wc1xuICAgICAgICB0aGlzLmNoaWxkTWFwcGluZ3MgPSB0aGlzLnZpZXcubWFwcGluZ3MgJiYgdGhpcy52aWV3Lm1hcHBpbmdzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgIH0sXG4gICAgX2luaXRpYWxpemVPdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2g6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy9Ob3Qgc2hvcnRlbmVkIHRvIHZpZXcuZ2V0IGJlY2F1c2UgSSdtIG5vdCBzdXJlIGlmIGl0IGlzIHVzZWZ1bCB0byBkbyBzby5cbiAgICAgICAgLy92aWV3LmdldCBnZXRzIHRoZSBhcHAgdmFsdWUgbWFwcGVkIHRvIHRoZSBkZWZhdWx0IHZhbHVlLCBhbmQgaWYgbm90IHRoZW4gaXQgZ2V0cyB0aGUgZGVmYXVsdCB2YWx1ZS5cbiAgICAgICAgLy9JIHRoaW5rIHlvdSdyZSBqdXN0IG92ZXJyaWRpbmcgZGVmYXVsdHMgd2l0aCBkZWZhdWx0cywgYW5kIG5vdGhpbmcgZmFuY2llciB0aGFuIHRoYXQuXG4gICAgICAgIC8vdGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2ggPSB0aGlzLnZpZXcuZGVmYXVsdHMgJiYgdGhpcy52aWV3LmRlZmF1bHRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICAvL05ldmVybWluZCBpdCBpcyB1c2VmdWwgdG8gdXNlIC5nZXQgYmVjYXVzZSBpZiB0aGVyZSBhcmUgbmVzdGVkIG5lc3RlZCB2aWV3cywgeW91IGNhbid0IGp1c3QgZ28gdG8gdGhlIGRlZmF1bHRzIG9mIHRoYXQgdmlldy4gVGhleSBtaWdodCBiZSBvdmVycmlkZGVuLlxuXG4gICAgICAgIHRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoID0gdGhpcy52aWV3LmdldCh0aGlzLnN1YlZpZXdOYW1lKTtcbiAgICB9LFxuXG5cblxuICAgIF9pbml0aWFsaXplQ2hpbGRWaWV3czpmdW5jdGlvbigpe1xuXG4gICAgfVxufSkiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcbmltcG9ydCBBYnN0cmFjdFN1YnZpZXcgZnJvbSBcIi4vYWJzdHJhY3Qtc3Vidmlld1wiXG5leHBvcnQgZGVmYXVsdCBBYnN0cmFjdFN1YnZpZXcuZXh0ZW5kKHtcbiAgICBuYW1lOlwibWFwXCIsXG4gICAgX2luaXRpYWxpemVDaGlsZFZpZXdzOmZ1bmN0aW9uKCl7XG5cblxuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwiYWRkXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyQWRkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwicmVzZXRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJSZXNldCgpO1xuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwicmVtb3ZlXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyUmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwic29ydFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclNvcnQoKTsgICAgICAgIFxuICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgLy9NYXAgbW9kZWxzIHRvIGNoaWxkVmlldyBpbnN0YW5jZXMgd2l0aCB0aGVpciBtYXBwaW5nc1xuICAgICAgICB0aGlzLkNoaWxkVmlldyA9IHRoaXMudmlldy5jaGlsZFZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICB0aGlzLmNoaWxkVmlld09wdGlvbnMgPSB7XG4gICAgICAgICAgICBtYXBwaW5nczp0aGlzLmNoaWxkTWFwcGluZ3MsXG4gICAgICAgICAgICBjb2xsZWN0aW9uOnRoaXMuc3ViQ29sbGVjdGlvbixcbiAgICAgICAgICAgIHRhZ05hbWU6dGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlLnRhZ05hbWUgfHwgXCJzdWJpdGVtXCIsXG4gICAgICAgICAgICBvdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2g6dGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2hcbiAgICAgICAgfTtcblxuXG4gICAgICAgIHRoaXMuY2hpbGRWaWV3cyA9IHRoaXMuc3ViQ29sbGVjdGlvbi5tYXAoZnVuY3Rpb24oY2hpbGRNb2RlbCxpKXtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGNoaWxkVmlld09wdGlvbnMgPSBfLmV4dGVuZCh7fSx0aGlzLmNoaWxkVmlld09wdGlvbnMse1xuICAgICAgICAgICAgICAgIG1vZGVsOmNoaWxkTW9kZWwsXG4gICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICBsYXN0SW5kZXg6dGhpcy5zdWJDb2xsZWN0aW9uLmxlbmd0aCAtIGkgLSAxLFxuICAgICAgICAgICAgICAgIG92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaDp0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCAmJiB0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaC5tb2RlbHNbaV0gJiYgdGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2gubW9kZWxzW2ldLmF0dHJpYnV0ZXMsXG4gICAgICAgICAgICAgICAgLy9KdXN0IGFkZGVkIGNoZWNrIGZvciB0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaC5tb2RlbHNbaV1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgY2hpbGR2aWV3ID0gbmV3IHRoaXMuQ2hpbGRWaWV3KGNoaWxkVmlld09wdGlvbnMpO1xuICAgICAgICAgICAgLy9jaGlsZHZpZXcuX3NldEF0dHJpYnV0ZXMoXy5leHRlbmQoe30sIF8ucmVzdWx0KGNoaWxkdmlldywgJ2F0dHJpYnV0ZXMnKSkpO1xuICAgICAgICAgICAgcmV0dXJuIGNoaWxkdmlldztcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIH0sXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdCgpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQ2hpbGRNYXBwaW5ncygpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplT3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoKCk7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVDaGlsZFZpZXdzKCk7XG5cbiAgICAgICAgXG4gICAgICBcblxuICAgICAgICBcbiAgICAgICAgXG5cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICBcbiAgICB9LFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIHRoaXMuJGVsLnJlcGxhY2VXaXRoKHRoaXMuc3ViVmlldy5lbCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHZhciAkY2hpbGRyZW4gPSAkKCk7XG4gICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgJGNoaWxkcmVuID0gJGNoaWxkcmVuLmFkZChjaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICAgICAgY2hpbGRWaWV3LmluZGV4ID0gaTtcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBpZiAoJGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGVsLnJlcGxhY2VXaXRoKCRjaGlsZHJlbik7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgICAgICAgICBjaGlsZFZpZXcuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9ICRjaGlsZHJlbi5wYXJlbnQoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICB0aGlzLiRwYXJlbnQgPSB0aGlzLiRlbC5wYXJlbnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuJGNoaWxkcmVuID0gJGNoaWxkcmVuXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlbmRlckFkZDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgdGhpcy5zdWJDb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24obW9kZWwsaSl7XG4gICAgICAgICAgICB2YXIgZXhpc3RpbmdDaGlsZFZpZXcgPSB0aGlzLmNoaWxkVmlld3MuZmlsdGVyKGZ1bmN0aW9uKGNoaWxkVmlldyl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkVmlldy5tb2RlbCA9PSBtb2RlbFxuICAgICAgICAgICAgfSlbMF07XG4gICAgICAgICAgICBpZiAoZXhpc3RpbmdDaGlsZFZpZXcpIHtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKGV4aXN0aW5nQ2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgICAgIC8vdmFyIGF0dHJpYnV0ZXMgPSBfLmV4dGVuZCh7fSwgXy5yZXN1bHQoZXhpc3RpbmdDaGlsZFZpZXcsICdhdHRyaWJ1dGVzJykpXG4gICAgICAgICAgICAgICAgLy9leGlzdGluZ0NoaWxkVmlldy5fc2V0QXR0cmlidXRlcyhhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBuZXdDaGlsZFZpZXcgPSBuZXcgdGhpcy5DaGlsZFZpZXcoe1xuICAgICAgICAgICAgICAgICAgICBtb2RlbDptb2RlbCxcbiAgICAgICAgICAgICAgICAgICAgbWFwcGluZ3M6dGhpcy5jaGlsZE1hcHBpbmdzLFxuICAgICAgICAgICAgICAgICAgICBpbmRleDppLFxuICAgICAgICAgICAgICAgICAgICBsYXN0SW5kZXg6dGhpcy5zdWJDb2xsZWN0aW9uLmxlbmd0aCAtIGkgLSAxLFxuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOnRoaXMuc3ViQ29sbGVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgZGF0YTp0aGlzLnZpZXcuZ2V0KHRoaXMudmFsLnNwbGl0KFwiOlwiKVswXSlbaV1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5wdXNoKG5ld0NoaWxkVmlldyk7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaChuZXdDaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB0aGlzLiRwYXJlbnQuZW1wdHkoKTtcbiAgICAgICAgY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCl7XG4gICAgICAgICAgICB0aGlzLiRwYXJlbnQuYXBwZW5kKGNoaWxkKVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIHRoaXMuJGNoaWxkcmVuID0gJChjaGlsZHJlbilcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgIGNoaWxkVmlldy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICB9KVxuXG4gICAgfSxcbiAgICByZW5kZXJSZXNldDpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLiRwYXJlbnQuZW1wdHkoKTtcbiAgICB9LFxuICAgIHJlbmRlclJlbW92ZTpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLiRjaGlsZHJlbi5sYXN0KCkucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuY2hpbGRWaWV3cy5zcGxpY2UoLTEsMSk7XG4gICAgICAgIHRoaXMuJGNoaWxkcmVuID0gdGhpcy4kcGFyZW50LmNoaWxkcmVuKCk7XG4gICAgfSxcbiAgICByZW5kZXJTb3J0OmZ1bmN0aW9uKCl7XG4gICAgICAgIFxuICAgICAgICAvL0Rvbid0IG5lZWQgdGhpcyAobm93KS4gTW9kZWxzIHdpbGwgYWxyZWFkeSBiZSBzb3J0ZWQgb24gYWRkIHdpdGggY29sbGVjdGlvbi5jb21wYXJhdG9yID0geHh4O1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbigpe1xuICAgICAgICAvL3RoaXMudmlldyBpcyBpbnN0YW5jZSBvZiB0aGUgdmlldyB0aGF0IGNvbnRhaW5zIHRoZSBzdWJ2aWV3IGRpcmVjdGl2ZS5cbiAgICAgICAgLy90aGlzLnN1YlZpZXcgaXMgaW5zdGFuY2Ugb2YgdGhlIHN1YnZpZXdcbiAgICAgICAgLy90aGlzIGlzIHRoZSBkaXJlY3RpdmUuXG5cbiAgICAgICAgaWYgKHRoaXMuc3ViVmlldyl7XG4gICAgICAgICAgICAvL3doeSBwYXJlbnROb2RlP1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmlldy5lbC5jb250YWlucyh0aGlzLnN1YlZpZXcuZWwucGFyZW50Tm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHZhciBwYXNzID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBlbCA9IHRoaXMudmlldy5lbFxuICAgICAgICAgICAgdGhpcy4kY2hpbGRyZW4uZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGlmICghZWwuY29udGFpbnModGhpcykpIHBhc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgIHJldHVybiBwYXNzO1xuICAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICB9XG59KSIsIi8qaW1wb3J0ICQgZnJvbSBcImpxdWVyeVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwib3B0aW9uYWxcIixcbiAgICBcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLmhpZGUoKVxuICAgICAgICBlbHNlICQodGhpcy5lbCkuY3NzKFwiZGlzcGxheVwiLFwiXCIpO1xuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkuaGlkZSgpXG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5jc3MoXCJkaXNwbGF5XCIsXCJcIik7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5ib2R5LmNvbnRhaW5zKHRoaXMuZWwpKSB0aHJvdyBFcnJvcihcImVsZW1lbnQgaGFzIHRvIGJlIGluIHRoZSBET00gaW4gb3JkZXIgdG8gdGVzdFwiKVxuICAgICAgICByZXR1cm4gJCh0aGlzLmVsKS5pcyhcIjp2aXNpYmxlXCIpPT12YWx1ZTtcbiAgICB9XG59KTtcbiIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJvcHRpb25hbHdyYXBcIixcbiAgICBjaGlsZEluaXQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgRGlyZWN0aXZlLnByb3RvdHlwZS5jaGlsZEluaXQuY2FsbCh0aGlzLGFyZ3VtZW50cyk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLndyYXBwZXIgPSB0aGlzLmVsO1xuICAgICAgICB0aGlzLmNoaWxkTm9kZXMgPSBbXS5zbGljZS5jYWxsKHRoaXMuZWwuY2hpbGROb2RlcywgMCk7XG4gICAgICAgIFxuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCkgJCh0aGlzLmNoaWxkTm9kZXMpLnVud3JhcCgpO1xuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpe1xuICAgICAgICAgICAgJCh0aGlzLmNoaWxkTm9kZXMpLnVud3JhcCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICBpZiAoIWRvY3VtZW50LmJvZHkuY29udGFpbnModGhpcy5jaGlsZE5vZGVzWzBdKSl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkZpcnN0IGNoaWxkIGhhcyB0byBiZSBpbiBET01cIik7XG4gICAgICAgICAgICAgICAgLy9zb2x1dGlvbjogYWRkIGEgZHVtbXkgdGV4dCBub2RlIGF0IGJlZ2lubmluZ1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoIWRvY3VtZW50LmJvZHkuY29udGFpbnModGhpcy53cmFwcGVyKSl7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZE5vZGVzWzBdLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMud3JhcHBlcix0aGlzLmNoaWxkTm9kZXNbMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yKHZhciBpPTA7aTx0aGlzLmNoaWxkTm9kZXMubGVuZ3RoO2krKyl7XG4gICAgICAgICAgICAgICAgdGhpcy53cmFwcGVyLmFwcGVuZENoaWxkKHRoaXMuY2hpbGROb2Rlc1tpXSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG5cblxuICAgICAgICByZXR1cm4gKHRoaXMuY2hpbGROb2Rlc1swXS5wYXJlbnROb2RlPT10aGlzLndyYXBwZXIpID09IHZhbHVlO1xuXG5cbiAgICAgIFxuICAgIH1cbn0pIiwiaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcInNyY1wiLFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGVsLmF0dHIoXCJzcmNcIix0aGlzLnJlc3VsdCk7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kZWwuYXR0cihcInNyY1wiLHRoaXMucmVzdWx0KTtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICByZXR1cm4gdGhpcy4kZWwuYXR0cihcInNyY1wiKT09PXZhbHVlO1xuICAgIH1cbn0pOyIsIi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuaW1wb3J0IEFic3RyYWN0U3VidmlldyBmcm9tIFwiLi9hYnN0cmFjdC1zdWJ2aWV3XCJcbmV4cG9ydCBkZWZhdWx0IEFic3RyYWN0U3Vidmlldy5leHRlbmQoe1xuICAgIG5hbWU6XCJzdWJ2aWV3XCIsXG4gICAgX2luaXRpYWxpemVDaGlsZFZpZXdzOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0ucHJvdG90eXBlIGluc3RhbmNlb2YgQmFja2JvbmUuVmlldykgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICBlbHNlIHRoaXMuQ2hpbGRDb25zdHJ1Y3RvciA9IHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXS8qLmNhbGwodGhpcy52aWV3KTsqL1xuXG4gICAgICAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoKXtcbiAgICAgICAgICAgIF8uZXh0ZW5kKG9wdGlvbnMse292ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaDp0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuY2hpbGRNYXBwaW5ncyl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtcbiAgICAgICAgICAgICAgICBtYXBwaW5nczp0aGlzLmNoaWxkTWFwcGluZ3NcbiAgICAgICAgICAgICAgICAvLyxlbDp0aGlzLmVsIFRoZSBlbCBvZiB0aGUgZGlyZWN0aXZlIHNob3VsZCBiZWxvbmcgdG8gdGhlIGRpcmVjdGl2ZSBidXQgbm90IHRoZSBzdWJ2aWV3IGl0c2VsZlxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHN1Yk1vZGVsID0gdGhpcy5zdWJNb2RlbCB8fCB0aGlzLnZpZXcubW9kZWw7XG4gICAgICAgIGlmIChzdWJNb2RlbCl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHttb2RlbDpzdWJNb2RlbH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy5zdWJWaWV3ID0gbmV3IHRoaXMuQ2hpbGRDb25zdHJ1Y3RvcihvcHRpb25zKTtcbiAgICAgICAgICAgIHZhciBjbGFzc2VzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiY2xhc3NOYW1lXCIpXG4gICAgICAgICAgICBpZiAoY2xhc3Nlcyl7XG4gICAgICAgICAgICAgICAgY2xhc3Nlcy5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihjbCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5jbGFzc0xpc3QuYWRkKGNsKVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiYXR0cmlidXRlc1wiKTtcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgICAgICBfLmVhY2goYXR0cmlidXRlcyxmdW5jdGlvbih2YWwsbmFtZSl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5zZXRBdHRyaWJ1dGUobmFtZSx2YWwpICAgIFxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zdWJWaWV3LnBhcmVudCA9IHRoaXMudmlldztcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnREaXJlY3RpdmUgPSB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9uc1NlbnRUb1N1YlZpZXcgPSBvcHRpb25zO1xuICAgIH0sXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vdGhpcy52YWwsIHRoaXMudmlld1xuXG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVCYWNrYm9uZU9iamVjdCgpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQ2hpbGRNYXBwaW5ncygpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplT3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoKCk7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVDaGlsZFZpZXdzKCk7XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgIFxuICAgICAgXG5cbiAgICAgICAgaWYgKHRoaXMuc3ViQ29sbGVjdGlvbil7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwiYWRkXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJBZGQoKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwicmVzZXRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclJlc2V0KCk7XG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwicmVtb3ZlXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJSZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwic29ydFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyU29ydCgpOyAgICAgICAgXG4gICAgICAgICAgICAgICAgfSk7XG5cblxuXG4gICAgICAgICAgICAgICAgLy9NYXAgbW9kZWxzIHRvIGNoaWxkVmlldyBpbnN0YW5jZXMgd2l0aCB0aGVpciBtYXBwaW5nc1xuICAgICAgICAgICAgICAgIHRoaXMuQ2hpbGRWaWV3ID0gdGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdPcHRpb25zID0ge1xuICAgICAgICAgICAgICAgICAgICBtYXBwaW5nczp0aGlzLmNoaWxkTWFwcGluZ3MsXG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICB0YWdOYW1lOnRoaXMudmlldy5jaGlsZFZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLnByb3RvdHlwZS50YWdOYW1lIHx8IFwic3ViaXRlbVwiLFxuICAgICAgICAgICAgICAgICAgICBvdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2g6dGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2hcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cyA9IHRoaXMuc3ViQ29sbGVjdGlvbi5tYXAoZnVuY3Rpb24oY2hpbGRNb2RlbCxpKXtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHZhciBjaGlsZFZpZXdPcHRpb25zID0gXy5leHRlbmQoe30sdGhpcy5jaGlsZFZpZXdPcHRpb25zLHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGVsOmNoaWxkTW9kZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRleDppLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGFzdEluZGV4OnRoaXMuc3ViQ29sbGVjdGlvbi5sZW5ndGggLSBpIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaDp0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCAmJiB0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaC5tb2RlbHNbaV0gJiYgdGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2gubW9kZWxzW2ldLmF0dHJpYnV0ZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0p1c3QgYWRkZWQgY2hlY2sgZm9yIHRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoLm1vZGVsc1tpXVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHZhciBjaGlsZHZpZXcgPSBuZXcgdGhpcy5DaGlsZFZpZXcoY2hpbGRWaWV3T3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIC8vY2hpbGR2aWV3Ll9zZXRBdHRyaWJ1dGVzKF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChjaGlsZHZpZXcsICdhdHRyaWJ1dGVzJykpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkdmlldztcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuXG5cbiAgICAgICAgICAgICAgICBcblxuXG5cbiAgICAgICAgfVxuXG4gICAgICAgXG4gICAgICAgIFxuICAgICAgICBcblxuICAgICAgICBpZiAoIXRoaXMuc3ViQ29sbGVjdGlvbil7XG4gICAgICAgICAgICBpZiAodGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLnByb3RvdHlwZSBpbnN0YW5jZW9mIEJhY2tib25lLlZpZXcpIHRoaXMuQ2hpbGRDb25zdHJ1Y3RvciA9IHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgICAgIGVsc2UgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLyouY2FsbCh0aGlzLnZpZXcpOyovXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoKXtcbiAgICAgICAgICAgIF8uZXh0ZW5kKG9wdGlvbnMse292ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaDp0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuY2hpbGRNYXBwaW5ncyl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtcbiAgICAgICAgICAgICAgICBtYXBwaW5nczp0aGlzLmNoaWxkTWFwcGluZ3NcbiAgICAgICAgICAgICAgICAvLyxlbDp0aGlzLmVsIFRoZSBlbCBvZiB0aGUgZGlyZWN0aXZlIHNob3VsZCBiZWxvbmcgdG8gdGhlIGRpcmVjdGl2ZSBidXQgbm90IHRoZSBzdWJ2aWV3IGl0c2VsZlxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHN1Yk1vZGVsID0gdGhpcy5zdWJNb2RlbCB8fCB0aGlzLnZpZXcubW9kZWw7XG4gICAgICAgIGlmIChzdWJNb2RlbCl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHttb2RlbDpzdWJNb2RlbH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy5zdWJWaWV3ID0gbmV3IHRoaXMuQ2hpbGRDb25zdHJ1Y3RvcihvcHRpb25zKTtcbiAgICAgICAgICAgIHZhciBjbGFzc2VzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiY2xhc3NOYW1lXCIpXG4gICAgICAgICAgICBpZiAoY2xhc3Nlcyl7XG4gICAgICAgICAgICAgICAgY2xhc3Nlcy5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihjbCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5jbGFzc0xpc3QuYWRkKGNsKVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiYXR0cmlidXRlc1wiKTtcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgICAgICBfLmVhY2goYXR0cmlidXRlcyxmdW5jdGlvbih2YWwsbmFtZSl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5zZXRBdHRyaWJ1dGUobmFtZSx2YWwpICAgIFxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zdWJWaWV3LnBhcmVudCA9IHRoaXMudmlldztcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnREaXJlY3RpdmUgPSB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9uc1NlbnRUb1N1YlZpZXcgPSBvcHRpb25zO1xuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgodGhpcy5zdWJWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyICRjaGlsZHJlbiA9ICQoKTtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAkY2hpbGRyZW4gPSAkY2hpbGRyZW4uYWRkKGNoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICBjaGlsZFZpZXcuaW5kZXggPSBpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIGlmICgkY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgoJGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkVmlldy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gJGNoaWxkcmVuLnBhcmVudCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkY2hpbGRyZW5cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyQWRkOmZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IFtdO1xuICAgICAgICB0aGlzLnN1YkNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihtb2RlbCxpKXtcbiAgICAgICAgICAgIHZhciBleGlzdGluZ0NoaWxkVmlldyA9IHRoaXMuY2hpbGRWaWV3cy5maWx0ZXIoZnVuY3Rpb24oY2hpbGRWaWV3KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRWaWV3Lm1vZGVsID09IG1vZGVsXG4gICAgICAgICAgICB9KVswXTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ0NoaWxkVmlldykge1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goZXhpc3RpbmdDaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICAgICAgLy92YXIgYXR0cmlidXRlcyA9IF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChleGlzdGluZ0NoaWxkVmlldywgJ2F0dHJpYnV0ZXMnKSlcbiAgICAgICAgICAgICAgICAvL2V4aXN0aW5nQ2hpbGRWaWV3Ll9zZXRBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld0NoaWxkVmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyh7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsOm1vZGVsLFxuICAgICAgICAgICAgICAgICAgICBtYXBwaW5nczp0aGlzLmNoaWxkTWFwcGluZ3MsXG4gICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOnRoaXMudmlldy5nZXQodGhpcy52YWwuc3BsaXQoXCI6XCIpWzBdKVtpXVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnB1c2gobmV3Q2hpbGRWaWV3KTtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKG5ld0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKXtcbiAgICAgICAgICAgIHRoaXMuJHBhcmVudC5hcHBlbmQoY2hpbGQpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkKGNoaWxkcmVuKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIH0pXG5cbiAgICB9LFxuICAgIHJlbmRlclJlc2V0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgIH0sXG4gICAgcmVuZGVyUmVtb3ZlOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGNoaWxkcmVuLmxhc3QoKS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnNwbGljZSgtMSwxKTtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSB0aGlzLiRwYXJlbnQuY2hpbGRyZW4oKTtcbiAgICB9LFxuICAgIHJlbmRlclNvcnQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgIC8vRG9uJ3QgbmVlZCB0aGlzIChub3cpLiBNb2RlbHMgd2lsbCBhbHJlYWR5IGJlIHNvcnRlZCBvbiBhZGQgd2l0aCBjb2xsZWN0aW9uLmNvbXBhcmF0b3IgPSB4eHg7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vdGhpcy52aWV3IGlzIGluc3RhbmNlIG9mIHRoZSB2aWV3IHRoYXQgY29udGFpbnMgdGhlIHN1YnZpZXcgZGlyZWN0aXZlLlxuICAgICAgICAvL3RoaXMuc3ViVmlldyBpcyBpbnN0YW5jZSBvZiB0aGUgc3Vidmlld1xuICAgICAgICAvL3RoaXMgaXMgdGhlIGRpcmVjdGl2ZS5cblxuICAgICAgICBpZiAodGhpcy5zdWJWaWV3KXtcbiAgICAgICAgICAgIC8vd2h5IHBhcmVudE5vZGU/XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aWV3LmVsLmNvbnRhaW5zKHRoaXMuc3ViVmlldy5lbC5wYXJlbnROb2RlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyIHBhc3MgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGVsID0gdGhpcy52aWV3LmVsXG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbi5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCFlbC5jb250YWlucyh0aGlzKSkgcGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbn0pIiwiLyppbXBvcnQgXyBmcm9tIFwidW5kZXJzY29yZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiZGF0YVwiLFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmNvbnRlbnQgPSB0aGlzLnZpZXcudmlld01vZGVsLmdldCh0aGlzLnZhbCk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy52aWV3LnZpZXdNb2RlbCxcImNoYW5nZTpcIit0aGlzLnZhbCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5jb250ZW50ID0gdGhpcy52aWV3LnZpZXdNb2RlbC5nZXQodGhpcy52YWwpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgXy5lYWNoKHRoaXMuY29udGVudCxmdW5jdGlvbih2YWwscHJvcCl7XG4gICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsKSkgdmFsID0gdmFsLmJpbmQodGhpcy52aWV3KTtcbiAgICAgICAgICAgdGhpcy4kZWwuYXR0cihcImRhdGEtXCIrcHJvcCx2YWwpXG4gICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgXy5lYWNoKHRoaXMuY29udGVudCxmdW5jdGlvbih2YWwscHJvcCl7XG4gICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsKSkgdmFsID0gdmFsLmJpbmQodGhpcy52aWV3KTtcbiAgICAgICAgICAgdGhpcy4kZWwuYXR0cihcImRhdGEtXCIrcHJvcCx2YWwpXG4gICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH1cbn0pOyIsImltcG9ydCBEaXJlY3RpdmVDb250ZW50IGZyb20gXCIuL2RpcmVjdGl2ZS1jb250ZW50XCI7XG5pbXBvcnQgRGlyZWN0aXZlRW5hYmxlIGZyb20gXCIuL2RpcmVjdGl2ZS1lbmFibGVcIjtcbmltcG9ydCBEaXJlY3RpdmVEaXNhYmxlIGZyb20gXCIuL2RpcmVjdGl2ZS1kaXNhYmxlXCI7XG5pbXBvcnQgRGlyZWN0aXZlSHJlZiBmcm9tIFwiLi9kaXJlY3RpdmUtaHJlZlwiO1xuaW1wb3J0IERpcmVjdGl2ZU1hcCBmcm9tIFwiLi9kaXJlY3RpdmUtbWFwXCI7XG5pbXBvcnQgRGlyZWN0aXZlT3B0aW9uYWwgZnJvbSBcIi4vZGlyZWN0aXZlLW9wdGlvbmFsXCI7XG5pbXBvcnQgRGlyZWN0aXZlT3B0aW9uYWxXcmFwIGZyb20gXCIuL2RpcmVjdGl2ZS1vcHRpb25hbHdyYXBcIjtcbmltcG9ydCBEaXJlY3RpdmVTcmMgZnJvbSBcIi4vZGlyZWN0aXZlLXNyY1wiO1xuaW1wb3J0IERpcmVjdGl2ZVN1YnZpZXcgZnJvbSBcIi4vZGlyZWN0aXZlLXN1YnZpZXdcIjtcbmltcG9ydCBEaXJlY3RpdmVEYXRhIGZyb20gXCIuL2RpcmVjdGl2ZS1kYXRhXCI7XG5cbnZhciByZWdpc3RyeSA9IHtcbiAgICBDb250ZW50OkRpcmVjdGl2ZUNvbnRlbnQsXG4gICAgRW5hYmxlOkRpcmVjdGl2ZUVuYWJsZSxcbiAgICBEaXNhYmxlOkRpcmVjdGl2ZURpc2FibGUsXG4gICAgSHJlZjpEaXJlY3RpdmVIcmVmLFxuICAgIE1hcDpEaXJlY3RpdmVNYXAsXG4gICAgT3B0aW9uYWw6RGlyZWN0aXZlT3B0aW9uYWwsXG4gICAgT3B0aW9uYWxXcmFwOkRpcmVjdGl2ZU9wdGlvbmFsV3JhcCxcbiAgICBTcmM6RGlyZWN0aXZlU3JjLFxuICAgIFN1YnZpZXc6RGlyZWN0aXZlU3VidmlldyxcbiAgICBEYXRhOkRpcmVjdGl2ZURhdGFcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHJlZ2lzdHJ5OyIsIi8qaW1wb3J0ICQgZnJvbSBcImpxdWVyeVwiOyovXG4vKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlUmVnaXN0cnkgZnJvbSBcIi4vZGlyZWN0aXZlL2RpcmVjdGl2ZVJlZ2lzdHJ5LmpzXCJcbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlL2RpcmVjdGl2ZS5qc1wiXG5cblxuXG52YXIgYmFja2JvbmVWaWV3T3B0aW9ucyA9IFsnbW9kZWwnLCAnY29sbGVjdGlvbicsICdlbCcsICdpZCcsICdhdHRyaWJ1dGVzJywgJ2NsYXNzTmFtZScsICd0YWdOYW1lJywgJ2V2ZW50cyddO1xudmFyIGFkZGl0aW9uYWxWaWV3T3B0aW9ucyA9IFsnbWFwcGluZ3MnLCd0ZW1wbGF0ZVN0cmluZycsJ2NoaWxkVmlld0ltcG9ydHMnLCdzdWJWaWV3SW1wb3J0cycsJ2luZGV4JywnbGFzdEluZGV4Jywnb3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoJ11cbmV4cG9ydCBkZWZhdWx0IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcbiAgICB0ZXh0Tm9kZXNVbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTA3MzAzMDkvZmluZC1hbGwtdGV4dC1ub2Rlcy1pbi1odG1sLXBhZ2VcbiAgICAgICAgdmFyIG4sIGE9W10sIHdhbGs9ZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcih0aGlzLmVsLE5vZGVGaWx0ZXIuU0hPV19URVhULG51bGwsZmFsc2UpO1xuICAgICAgICB3aGlsZShuPXdhbGsubmV4dE5vZGUoKSkgYS5wdXNoKG4pO1xuICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgXG4gICAgfSxcbiAgICBjb25zdHJ1Y3RvcjpmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgICAvL2RlYnVnZ2VyO1xuXG5cbiAgICAgICAgXy5lYWNoKF8uZGlmZmVyZW5jZShfLmtleXMob3B0aW9ucyksXy51bmlvbihiYWNrYm9uZVZpZXdPcHRpb25zLGFkZGl0aW9uYWxWaWV3T3B0aW9ucykpLGZ1bmN0aW9uKHByb3Ape1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFwiV2FybmluZyEgVW5rbm93biBwcm9wZXJ0eSBcIitwcm9wKTtcbiAgICAgICAgfSlcblxuXG4gICAgICAgIGlmICghdGhpcy5qc3QgJiYgIXRoaXMudGVtcGxhdGVTdHJpbmcpIHRocm93IG5ldyBFcnJvcihcIllvdSBuZWVkIGEgdGVtcGxhdGVcIik7XG4gICAgICAgIGlmICghdGhpcy5qc3Qpe1xuICAgICAgICAgICAgdGhpcy5jaWQgPSBfLnVuaXF1ZUlkKHRoaXMudHBsaWQpO1xuICAgICAgICAgICAgdGhpcy5qc3QgPSBfLnRlbXBsYXRlKHRoaXMudGVtcGxhdGVTdHJpbmcpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHRoaXMuY2lkID0gXy51bmlxdWVJZCgndmlldycpO1xuICAgICAgICB9XG4gICAgICAgIF8uZXh0ZW5kKHRoaXMsIF8ucGljayhvcHRpb25zLCBiYWNrYm9uZVZpZXdPcHRpb25zLmNvbmNhdChhZGRpdGlvbmFsVmlld09wdGlvbnMpKSk7XG5cbiAgICAgICAgLy9BZGQgdGhpcyBoZXJlIHNvIHRoYXQgaXQncyBhdmFpbGFibGUgaW4gY2xhc3NOYW1lIGZ1bmN0aW9uXG4gICAgICAgIGlmICghdGhpcy5kZWZhdWx0cykge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIllvdSBuZWVkIGRlZmF1bHRzIGZvciB5b3VyIHZpZXdcIik7XG4gICAgICAgIH1cblxuICAgICAgICBfLmVhY2godGhpcy5kZWZhdWx0cyxmdW5jdGlvbihkZWYpe1xuICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihkZWYpKSBjb25zb2xlLndhcm4oXCJEZWZhdWx0cyBzaG91bGQgdXN1YWxseSBiZSBwcmltaXRpdmUgdmFsdWVzXCIpXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy9kYXRhIGlzIHBhc3NlZCBpbiBvbiBzdWJ2aWV3c1xuICAgICAgICAvLyBjb21lcyBmcm9tIHRoaXMudmlldy52aWV3TW9kZWwuZ2V0KHRoaXMudmFsKTssIFxuICAgICAgICAvL3NvIGlmIHRoZSBkaXJlY3RpdmUgaXMgbm0tc3Vidmlldz1cIk1lbnVcIiwgdGhlbiB0aGlzLmRhdGEgc2hvdWxkIGJlLi4ud2hhdD9cbiAgICAgICAgLy9BaGEhIGRhdGEgaXMgdG8gb3ZlcnJpZGUgZGVmYXVsdCB2YWx1ZXMgZm9yIHN1YnZpZXdzIGJlaW5nIHBhcnQgb2YgYSBwYXJlbnQgdmlldy4gXG4gICAgICAgIC8vQnV0IGl0IGlzIG5vdCBtZWFudCB0byBvdmVycmlkZSBtYXBwaW5ncyBJIGRvbid0IHRoaW5rLlxuICAgICAgICB0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2g7XG5cbiAgICAgICAgdmFyIGF0dHJzID0gXy5leHRlbmQoXy5jbG9uZSh0aGlzLmRlZmF1bHRzKSwob3B0aW9ucyAmJiBvcHRpb25zLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCkgfHwge30pXG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoLGF0dHJzKVxuICAgICAgICB0aGlzLnZpZXdNb2RlbCA9IG5ldyBCYWNrYm9uZS5Nb2RlbChhdHRycyk7XG5cblxuICAgICAgICAvL21hcHBpbmdzIGNvbnRhaW4gbWFwcGluZ3Mgb2YgdmlldyB2YXJpYWJsZXMgdG8gbW9kZWwgdmFyaWFibGVzLlxuICAgICAgICAvL3N0cmluZ3MgYXJlIHJlZmVyZW5jZXMgdG8gbW9kZWwgdmFyaWFibGVzLiBGdW5jdGlvbnMgYXJlIGZvciB3aGVuIGEgdmlldyB2YXJpYWJsZSBkb2VzXG4gICAgICAgIC8vbm90IG1hdGNoIHBlcmZlY3RseSB3aXRoIGEgbW9kZWwgdmFyaWFibGUuIFRoZXNlIGFyZSB1cGRhdGVkIGVhY2ggdGltZSB0aGUgbW9kZWwgY2hhbmdlcy5cbiAgICAgICAgdGhpcy5wcm9wTWFwID0ge307XG4gICAgICAgIHRoaXMuZnVuY3MgPSB7fTtcblxuICAgICAgICBfLmVhY2godGhpcy5tYXBwaW5ncyxmdW5jdGlvbihtb2RlbFZhcix0ZW1wbGF0ZVZhcil7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG1vZGVsVmFyID09IFwic3RyaW5nXCIpIHRoaXMucHJvcE1hcFt0ZW1wbGF0ZVZhcl0gPSBtb2RlbFZhcjtcbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBtb2RlbFZhciA9PSBcImZ1bmN0aW9uXCIpIHRoaXMuZnVuY3NbdGVtcGxhdGVWYXJdID0gbW9kZWxWYXI7XG4gICAgICAgIH0uYmluZCh0aGlzKSk7ICAgICBcblxuICAgICAgICAvL1Byb2JsZW06IGlmIHlvdSB1cGRhdGUgdGhlIG1vZGVsIGl0IHVwZGF0ZXMgZm9yIGV2ZXJ5IHN1YnZpZXcgKG5vdCBlZmZpY2llbnQpLlxuICAgICAgICAvL0FuZCBpdCBkb2VzIG5vdCB1cGRhdGUgZm9yIHN1Ym1vZGVscy4gUGVyaGFwcyB0aGVyZSBhcmUgbWFueSBkaWZmZXJlbnQgc29sdXRpb25zIGZvciB0aGlzLlxuICAgICAgICAvL1lvdSBjYW4gaGF2ZSBlYWNoIHN1Ym1vZGVsIHRyaWdnZXIgY2hhbmdlIGV2ZW50LlxuICAgICAgICBcbiAgICAgICAgLy9XaGVuZXZlciB0aGUgbW9kZWwgY2hhbmdlcywgdXBkYXRlIHRoZSB2aWV3TW9kZWwgYnkgbWFwcGluZyBwcm9wZXJ0aWVzIG9mIHRoZSBtb2RlbCB0byBwcm9wZXJ0aWVzIG9mIHRoZSB2aWV3IChhc3NpZ25lZCBpbiBtYXBwaW5ncylcbiAgICAgICAgLy9BbHNvLCB0aGUgYXR0cmlidXRlcyBjaGFuZ2UuIFRoaXMgY2FuIGJlIGRvbmUgbW9yZSBlbGVnYW50bHlcbiAgICAgICAgaWYgKHRoaXMubW9kZWwpe1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLFwiY2hhbmdlXCIsdGhpcy51cGRhdGVDb250ZXh0T2JqZWN0KTtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCxcImNoYW5nZVwiLGZ1bmN0aW9uKCl7XG5cdFx0XHQgICAgdGhpcy5fc2V0QXR0cmlidXRlcyhfLmV4dGVuZCh7fSwgXy5yZXN1bHQodGhpcywgJ2F0dHJpYnV0ZXMnKSkpO1xuXHRcdCAgICB9KTtcbiAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNvbnRleHRPYmplY3QodGhpcy5tb2RlbCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYXR0cnMgPSB0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzO1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXMpO1xuICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgICAgIGlmIChrZXk9PT1cImRlZmluaXRpb25zXCIgJiYgIXRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXNba2V5XSl7XG4gICAgICAgICAgICAgICAgLy9wcm9ibGVtIGlzIHRoYXQgcHJvcE1hcCAoc2VlbXMgdG8gYmUgbWFwcGluZ3Mgd2l0aCBmdW5jdGlvbnMgZmlsdGVyZWQgb3V0KSBpcyBcbiAgICAgICAgICAgICAgICAvL3tkZWZpbml0aW9uczpcImRlZmluaXRpb25zXCJ9LiBDb21lcyBmcm9tIGFydGljbGVfYXJ0aWNsZS5qc1xuICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICBcblxuXG4gICAgICAgIHRoaXMuX2Vuc3VyZUVsZW1lbnQoKTtcbiAgICAgICAgdGhpcy5idWlsZElubmVySFRNTCgpO1xuICAgICAgICBcblxuXG4gICAgICAgIHRoaXMuaW5pdERpcmVjdGl2ZXMoKTsvL2luaXQgc2ltcGxlIGRpcmVjdGl2ZXMuLi50aGUgb25lcyB0aGF0IGp1c3QgbWFuaXB1bGF0ZSBhbiBlbGVtZW50XG4gICAgICAgIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB0aGlzLmNoaWxkTm9kZXMgPSBbXS5zbGljZS5jYWxsKHRoaXMuZWwuY2hpbGROb2RlcywgMCk7XG5cbiAgICAgICAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSxcbiAgICBcbiAgICBpbml0aWFsaXplOmZ1bmN0aW9uKG9wdGlvbnMpe1xuICAgICAgICAvL2F0dGFjaCBvcHRpb25zIHRvIHZpZXcgKG1vZGVsLCBwcm9wTWFwLCBzdWJWaWV3cywgZXZlbnRzKVxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgXy5leHRlbmQodGhpcyxvcHRpb25zKTtcbiAgICB9LFxuICAgIGdldE1vZGVsQXR0cjpmdW5jdGlvbihhdHRyKXtcbiAgICAgICAgLy9xdWlja2x5IGdyYWIgYSBtb2RlbHMgYXR0cmlidXRlIGJ5IGEgdmlldyB2YXJpYWJsZS4gVXNlZnVsIGluIGNsYXNzbmFtZSBmdW5jdGlvbi5cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLm1hcHBpbmdzW2F0dHJdID09XCJzdHJpbmdcIikgcmV0dXJuIHRoaXMubW9kZWwuZ2V0KHRoaXMubWFwcGluZ3NbYXR0cl0pO1xuICAgICAgICBlbHNlIHJldHVybiB0aGlzLm1hcHBpbmdzW2F0dHJdLmNhbGwodGhpcylcbiAgICB9LFxuICAgIHVwZGF0ZUNvbnRleHRPYmplY3Q6ZnVuY3Rpb24obW9kZWwpe1xuXG4gICAgICAgIFxuICAgICAgICB2YXIgb2JqID0ge31cbiAgICAgICAgXG4gICAgICAgIC8vQ2hhbmdlIHRlbXBsYXRlVmFycy0+bW9kZWxWYXJzIHRvIHRlbXBsYXRlVmFycy0+bW9kZWwuZ2V0KFwibW9kZWxWYXJcIiksIGFuZCBzZXQgb24gdGhlIG1vZGVsXG4gICAgICAgIF8uZXh0ZW5kKG9iaixfLm1hcE9iamVjdCh0aGlzLnByb3BNYXAsZnVuY3Rpb24obW9kZWxWYXIpe1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb2RlbC5nZXQobW9kZWxWYXIpO1xuICAgICAgICB9LmJpbmQodGhpcykpKTtcbiAgICAgICAgXG5cbiAgICAgICAgXy5leHRlbmQob2JqLF8ubWFwT2JqZWN0KHRoaXMuZnVuY3MsZnVuY3Rpb24oZnVuYyl7XG4gICAgICAgICAgICB2YXIgcmV0ID0gZnVuYy5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIC8vZnVuYy5jYWxsIG1ha2VzIGl0IHdvcmsgYnV0IG9ubHkgb25jZVxuICAgICAgICB9LmJpbmQodGhpcykpKVxuICAgICAgICAgICAgICAgIFxuXG4gICAgICAgIFxuICAgICAgICB0aGlzLnZpZXdNb2RlbC5zZXQob2JqKTtcblxuXG4gICAgICAgIFxuICAgIFxuICAgIH0sXG4gICAgYnVpbGRJbm5lckhUTUw6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMuJGVsKSB0aGlzLiRlbC5odG1sKHRoaXMucmVuZGVyZWRUZW1wbGF0ZSgpKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgZHVtbXlkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICAgICAgZHVtbXlkaXYuaW5uZXJIVE1MID0gdGhpcy5yZW5kZXJlZFRlbXBsYXRlKCk7XG4gICAgICAgICAgICB3aGlsZShkdW1teWRpdi5jaGlsZE5vZGVzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgdGhpcy5lbC5hcHBlbmRDaGlsZChkdW1teWRpdi5jaGlsZE5vZGVzWzBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vbWF5YmUgbGVzcyBoYWNraXNoIHNvbHV0aW9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzI1MjE0MTEzLzE3NjMyMTdcbiAgICAgICAgfVxuICAgIH0sXG4gICAgaW5pdERpcmVjdGl2ZXM6ZnVuY3Rpb24oKXtcblxuICAgICAgICBcbiAgICAgICAgIC8vSW5pdCBkaXJlY3RpdmVzIGludm9sdmluZyB7e319XG5cbiAgICAgICAgdGhpcy5faW5pdGlhbFRleHROb2RlcyA9IHRoaXMudGV4dE5vZGVzVW5kZXIoKTtcbiAgICAgICAgdGhpcy5fc3ViVmlld0VsZW1lbnRzID0gW107XG4gICAgICAgIHRoaXMuX2luaXRpYWxUZXh0Tm9kZXMuZm9yRWFjaChmdW5jdGlvbihmdWxsVGV4dE5vZGUpe1xuICAgICAgICAgICAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMTMxMTY3MC8xNzYzMjE3IHRleHRDb250ZW50IHNlZW1zIHJpZ2h0XG5cbiAgICAgICAgICAgIHZhciByZSA9IC9cXHtcXHsoLis/KVxcfVxcfS9nO1xuICAgICAgICAgICAgdmFyIG1hdGNoO1xuICAgICAgICAgICAgXG5cblxuICAgICAgICAgICAgdmFyIG1hdGNoZXMgPSBbXTtcbiAgICAgICAgICAgIHdoaWxlICgobWF0Y2ggPSByZS5leGVjKGZ1bGxUZXh0Tm9kZS50ZXh0Q29udGVudCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVzLnB1c2gobWF0Y2gpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBjdXJyZW50VGV4dE5vZGUgPSBmdWxsVGV4dE5vZGU7XG4gICAgICAgICAgICB2YXIgY3VycmVudFN0cmluZyA9IGZ1bGxUZXh0Tm9kZS50ZXh0Q29udGVudDtcbiAgICAgICAgICAgIHZhciBwcmV2Tm9kZXNMZW5ndGggPSAwO1xuXG4gICAgICAgICAgICBtYXRjaGVzLmZvckVhY2goZnVuY3Rpb24obWF0Y2gpe1xuICAgICAgICAgICAgICAgIHZhciB2YXJOb2RlID0gY3VycmVudFRleHROb2RlLnNwbGl0VGV4dChtYXRjaC5pbmRleCAtIHByZXZOb2Rlc0xlbmd0aCk7XG4gICAgICAgICAgICAgICAgdmFyIGVudGlyZU1hdGNoID0gbWF0Y2hbMF1cbiAgICAgICAgICAgICAgICB2YXJOb2RlLm1hdGNoID0gbWF0Y2hbMV07XG4gICAgICAgICAgICAgICAgdGhpcy5fc3ViVmlld0VsZW1lbnRzLnB1c2godmFyTm9kZSk7XG4gICAgICAgICAgICAgICAgY3VycmVudFRleHROb2RlID0gdmFyTm9kZS5zcGxpdFRleHQoZW50aXJlTWF0Y2gubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGN1cnJlbnRTdHJpbmcgPSBjdXJyZW50VGV4dE5vZGUudGV4dENvbnRlbnQ7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcHJldk5vZGVzTGVuZ3RoPW1hdGNoLmluZGV4ICsgZW50aXJlTWF0Y2gubGVuZ3RoOy8vTm90ZTogVGhpcyB3b3JrcyBhY2NpZGVudGFsbHkuIE1pZ2h0IGJlIHdyb25nLlxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAgICBcblxuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB0aGlzLmRpcmVjdGl2ZSA9IHt9O1xuXG4gICAgICAgXG5cblxuICAgICAgICBmb3IgKHZhciBkaXJlY3RpdmVOYW1lIGluIERpcmVjdGl2ZVJlZ2lzdHJ5KXtcbiAgICAgICAgICAgIHZhciBfX3Byb3RvID0gRGlyZWN0aXZlUmVnaXN0cnlbZGlyZWN0aXZlTmFtZV0ucHJvdG90eXBlXG4gICAgICAgICAgICBpZiAoX19wcm90byBpbnN0YW5jZW9mIERpcmVjdGl2ZSl7IC8vYmVjYXVzZSBmb3JlYWNoIHdpbGwgZ2V0IG1vcmUgdGhhbiBqdXN0IG90aGVyIGRpcmVjdGl2ZXNcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IF9fcHJvdG8ubmFtZTtcbiAgICAgICAgICAgICAgICBpZiAobmFtZSE9PVwic3Vidmlld1wiICYmIG5hbWUhPT1cIm1hcFwiKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW1lbnRzID0gKHRoaXMuJGVsKT8kLm1ha2VBcnJheSh0aGlzLiRlbC5maW5kKFwiW25tLVwiK25hbWUrXCJdXCIpKTokLm1ha2VBcnJheSgkKHRoaXMuZWwucXVlcnlTZWxlY3RvckFsbChcIltubS1cIituYW1lK1wiXVwiKSkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtuYW1lXSA9IGVsZW1lbnRzLm1hcChmdW5jdGlvbihlbGVtZW50LGksZWxlbWVudHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vb24gdGhlIHNlY29uZCBnby1hcm91bmQgZm9yIG5tLW1hcCwgZGlyZWN0aXZlTmFtZSBzb21laG93IGlzIGNhbGxlZCBcIlN1YlZpZXdcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGlyZWN0aXZlUmVnaXN0cnlbZGlyZWN0aXZlTmFtZV0oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsOmVsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbDplbGVtZW50LmdldEF0dHJpYnV0ZShcIm5tLVwiK25hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpOyBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtcInN1YnZpZXdcIl0gPSB0aGlzLl9zdWJWaWV3RWxlbWVudHMubWFwKGZ1bmN0aW9uKHN1YlZpZXdFbGVtZW50LGksc3ViVmlld0VsZW1lbnRzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGlyZWN0aXZlUmVnaXN0cnlbXCJTdWJ2aWV3XCJdKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWw6c3ViVmlld0VsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpOyAqL1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uKHN1YlZpZXdFbGVtZW50KXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gc3ViVmlld0VsZW1lbnQubWF0Y2guc3BsaXQoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoPT0xKXtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZGlyZWN0aXZlW1wic3Vidmlld1wiXSkgdGhpcy5kaXJlY3RpdmVbXCJzdWJ2aWV3XCJdID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5kaXJlY3RpdmVbXCJzdWJ2aWV3XCJdLnB1c2gobmV3IERpcmVjdGl2ZVJlZ2lzdHJ5W1wiU3Vidmlld1wiXSh7XG4gICAgICAgICAgICAgICAgICAgIHZpZXc6dGhpcyxcbiAgICAgICAgICAgICAgICAgICAgZWw6c3ViVmlld0VsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIHZhbDpzdWJWaWV3RWxlbWVudC5tYXRjaFxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmRpcmVjdGl2ZVtcIm1hcFwiXSkgdGhpcy5kaXJlY3RpdmVbXCJtYXBcIl0gPSBbXTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtcIm1hcFwiXS5wdXNoKG5ldyBEaXJlY3RpdmVSZWdpc3RyeVtcIk1hcFwiXSh7XG4gICAgICAgICAgICAgICAgICAgIHZpZXc6dGhpcyxcbiAgICAgICAgICAgICAgICAgICAgZWw6c3ViVmlld0VsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIHZhbDpzdWJWaWV3RWxlbWVudC5tYXRjaFxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuXG5cbiAgICAgICBcbiAgICAgICAgLypcbiAgICAgICAgdGhpcy5fc3ViVmlld0VsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24oc3ViVmlld0VsZW1lbnQpe1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBzdWJWaWV3RWxlbWVudC5tYXRjaC5zcGxpdChcIjpcIik7XG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGg9PTEpe1xuICAgICAgICAgICAgICAgIC8vc3VidmlldyB3aXRoIG5vIGNvbnRleHQgb2JqXG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAvL0NoZWNrIGZvciBjb2xsZWN0aW9uIG9yIG1vZGVsIHBhc3NlZC5cbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xuICAgICAgICAgICAgZWxlbWVudC5zdHlsZS5iYWNrZ3JvdW5kPVwieWVsbG93XCI7XG4gICAgICAgICAgICBlbGVtZW50LmlubmVySFRNTCA9IHN1YlZpZXdFbGVtZW50Lm1hdGNoO1xuICAgICAgICAgICAgc3ViVmlld0VsZW1lbnQucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoZWxlbWVudCxzdWJWaWV3RWxlbWVudCk7XG4gICAgICAgIH0pKi9cblxuICAgICAgIFxuXG5cbiAgICAgICAgXG4gICAgfSxcbiAgICByZW5kZXJlZFRlbXBsYXRlOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLmpzdCkge1xuICAgICAgICAgICAgd2luZG93Ll8gPSBfO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuanN0KHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgcmV0dXJuIF8udGVtcGxhdGUodGhpcy50ZW1wbGF0ZVN0cmluZykodGhpcy52aWV3TW9kZWwuYXR0cmlidXRlcylcbiAgICB9LFxuICAgIGRlbGVnYXRlRXZlbnRzOiBmdW5jdGlvbihldmVudHMpIHsvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzEyMTkzMDY5LzE3NjMyMTdcbiAgICAgICAgdmFyIGRlbGVnYXRlRXZlbnRTcGxpdHRlciA9IC9eKFxcUyspXFxzKiguKikkLztcbiAgICAgICAgZXZlbnRzIHx8IChldmVudHMgPSBfLnJlc3VsdCh0aGlzLCAnZXZlbnRzJykpOyAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIGlmICghZXZlbnRzKSByZXR1cm4gdGhpcztcbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBldmVudHMpIHtcbiAgICAgICAgICAgIHZhciBtZXRob2QgPSBldmVudHNba2V5XTtcbiAgICAgICAgICAgIGlmICghXy5pc0Z1bmN0aW9uKG1ldGhvZCkpIG1ldGhvZCA9IHRoaXNbZXZlbnRzW2tleV1dO1xuICAgICAgICAgICAgaWYgKCFtZXRob2QpIHRocm93IG5ldyBFcnJvcignTWV0aG9kIFwiJyArIGV2ZW50c1trZXldICsgJ1wiIGRvZXMgbm90IGV4aXN0Jyk7XG4gICAgICAgICAgICB2YXIgbWF0Y2ggPSBrZXkubWF0Y2goZGVsZWdhdGVFdmVudFNwbGl0dGVyKTtcbiAgICAgICAgICAgIHZhciBldmVudFR5cGVzID0gbWF0Y2hbMV0uc3BsaXQoJywnKSwgc2VsZWN0b3IgPSBtYXRjaFsyXTtcbiAgICAgICAgICAgIG1ldGhvZCA9IF8uYmluZChtZXRob2QsIHRoaXMpO1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgXyhldmVudFR5cGVzKS5lYWNoKGZ1bmN0aW9uKGV2ZW50TmFtZSkge1xuICAgICAgICAgICAgICAgIGV2ZW50TmFtZSArPSAnLmRlbGVnYXRlRXZlbnRzJyArIHNlbGYuY2lkO1xuICAgICAgICAgICAgICAgIGlmIChzZWxlY3RvciA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICBzZWxmLiRlbC5iaW5kKGV2ZW50TmFtZSwgbWV0aG9kKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRlbC5kZWxlZ2F0ZShzZWxlY3RvciwgZXZlbnROYW1lLCBtZXRob2QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgXG4gICAgfSxcblxuXG5cblxuICAgIHRhZ05hbWU6dW5kZWZpbmVkLC8vZG9uJ3Qgd2FudCBhIHRhZ05hbWUgdG8gYmUgZGl2IGJ5IGRlZmF1bHQuIFJhdGhlciwgbWFrZSBpdCBhIGRvY3VtZW50ZnJhZ21lbnQnXG4gICAgc3ViVmlld0ltcG9ydHM6e30sXG4gICAgY2hpbGRWaWV3SW1wb3J0czp7fSxcbiAgICAgIF9lbnN1cmVFbGVtZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvL092ZXJyaWRpbmcgdGhpcyB0byBzdXBwb3J0IGRvY3VtZW50IGZyYWdtZW50c1xuICAgICAgICAgICAgaWYgKCF0aGlzLmVsKSB7XG4gICAgICAgICAgICAgICAgaWYodGhpcy5hdHRyaWJ1dGVzIHx8IHRoaXMuaWQgfHwgdGhpcy5jbGFzc05hbWUgfHwgdGhpcy50YWdOYW1lKXsvL2lmIHlvdSBoYXZlIGFueSBvZiB0aGVzZSBiYWNrYm9uZSBwcm9wZXJ0aWVzLCBkbyBiYWNrYm9uZSBiZWhhdmlvclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJzID0gXy5leHRlbmQoe30sIF8ucmVzdWx0KHRoaXMsICdhdHRyaWJ1dGVzJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaWQpIGF0dHJzLmlkID0gXy5yZXN1bHQodGhpcywgJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jbGFzc05hbWUpIGF0dHJzWydjbGFzcyddID0gXy5yZXN1bHQodGhpcywgJ2NsYXNzTmFtZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KHRoaXMuX2NyZWF0ZUVsZW1lbnQoXy5yZXN1bHQodGhpcywgJ3RhZ05hbWUnKSB8fCAnZGl2JykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2V0QXR0cmlidXRlcyhhdHRycyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7Ly9ob3dldmVyLCBkZWZhdWx0IHRvIHRoaXMuZWwgYmVpbmcgYSBkb2N1bWVudGZyYWdtZW50IChtYWtlcyB0aGlzLmVsIG5hbWVkIGltcHJvcGVybHkgYnV0IHdoYXRldmVyKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVsID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KF8ucmVzdWx0KHRoaXMsICdlbCcpKTtcbiAgICAgICAgICAgIH1cbiAgICB9LFxuICAgIHNldDpmdW5jdGlvbihvYmope1xuICAgICAgICB0aGlzLnZpZXdNb2RlbC5zZXQob2JqKTtcbiAgICB9LFxuICAgIGdldDpmdW5jdGlvbihwcm9wKXtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlld01vZGVsLmdldChwcm9wKVxuICAgIH1cbn0pO1xuIiwiLy9TYW1lIG1vZGVsLCBjb2xsZWN0aW9uIGluIHNhbWUgZmlsZSBmb3Igbm93IGJlY2F1c2UgdGhlc2UgbW9kdWxlcyByZWx5IG9uIGVhY2ggb3RoZXIuXG5cbi8qaW1wb3J0IF8gZnJvbSBcInVuZGVyc2NvcmVcIjsqL1xuLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbmltcG9ydCBNb2RlbCBmcm9tIFwiLi9Nb2RlbFwiO1xuaW1wb3J0IENvbGxlY3Rpb24gZnJvbSBcIi4vQ29sbGVjdGlvblwiO1xuaW1wb3J0IFZpZXcgZnJvbSBcIi4vVmlld1wiO1xuaW1wb3J0IERpcmVjdGl2ZVJlZ2lzdHJ5IGZyb20gXCIuL2RpcmVjdGl2ZS9kaXJlY3RpdmVSZWdpc3RyeVwiO1xuLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cblxudmFyIEZhaml0YSA9IHtNb2RlbCwgQ29sbGVjdGlvbiwgVmlldywgRGlyZWN0aXZlUmVnaXN0cnl9O1xuRmFqaXRhW1wi8J+MrlwiXSA9IFwiMC4wLjBcIjtcblxuaWYgKHR5cGVvZiB3aW5kb3chPT1cInVuZGVmaW5lZFwiKSB3aW5kb3cuRmFqaXRhID0gRmFqaXRhO1xuaWYgKHR5cGVvZiBnbG9iYWwhPT1cInVuZGVmaW5lZFwiKSBnbG9iYWwuRmFqaXRhID0gRmFqaXRhOyJdLCJuYW1lcyI6WyJCYWNrYm9uZSIsIk1vZGVsIiwiZXh0ZW5kIiwib3B0aW9ucyIsIlVSTFNlYXJjaFBhcmFtcyIsInF1ZXJ5Iiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJzdWJNb2RlbHMiLCJzdWJDb2xsZWN0aW9ucyIsInN0cnVjdHVyZSIsInBhcmVudE1vZGVscyIsImluaXQiLCJwcm9wIiwiY29sbGVjdGlvbiIsIl8iLCJpc0FycmF5IiwiQmFzZSIsIkNvbGxlY3Rpb24iLCJ0b0FycmF5IiwicHVzaCIsImxpc3RlblRvIiwidHJpZ2dlciIsImF0dHIiLCJpc1N0cmluZyIsInN0YXJ0c1dpdGgiLCJzdWJzdHIiLCJnZXQiLCJwcm90b3R5cGUiLCJhcHBseSIsImFyZ3VtZW50cyIsImlzVW5kZWZpbmVkIiwicHJvcHMiLCJzcGxpdCIsImxlbmd0aCIsIm1vZGVsIiwiZm9yRWFjaCIsImtleSIsInZhbDEiLCJ2YWwyIiwic2V0IiwidmFsIiwibW9kZWxPckNvbGxlY3Rpb24iLCJGYWppdGEiLCJjYWxsIiwib24iLCJWaWV3IiwibmFtZSIsImNvbnNvbGUiLCJlcnJvciIsInZpZXciLCJjaGlsZEluaXQiLCJidWlsZCIsInVwZGF0ZVJlc3VsdCIsInZpZXdNb2RlbCIsInJlbmRlciIsInJlc3VsdCIsImlzRnVuY3Rpb24iLCJEaXJlY3RpdmUiLCIkZWwiLCJlbCIsInNldEF0dHJpYnV0ZSIsImlubmVySFRNTCIsInZhbHVlIiwicGFzcyIsImdldEF0dHJpYnV0ZSIsIiQiLCJhIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiY2xhc3NMaXN0IiwiYWRkIiwid3JhcHBlckEiLCJwYXJlbnROb2RlIiwicmVwbGFjZUNoaWxkIiwiYXBwZW5kQ2hpbGQiLCJwYXJlbnQiLCJhcmdzIiwic3ViVmlld05hbWUiLCJzdWJNb2RlbE5hbWUiLCJzdWJNb2RlbCIsInN1YkNvbGxlY3Rpb24iLCJjaGlsZE1hcHBpbmdzIiwibWFwcGluZ3MiLCJvdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2giLCJBYnN0cmFjdFN1YnZpZXciLCJyZW5kZXJBZGQiLCJyZW5kZXJSZXNldCIsInJlbmRlclJlbW92ZSIsInJlbmRlclNvcnQiLCJDaGlsZFZpZXciLCJjaGlsZFZpZXdJbXBvcnRzIiwiY2hpbGRWaWV3T3B0aW9ucyIsInRhZ05hbWUiLCJjaGlsZFZpZXdzIiwibWFwIiwiY2hpbGRNb2RlbCIsImkiLCJtb2RlbHMiLCJhdHRyaWJ1dGVzIiwiY2hpbGR2aWV3IiwiYmluZCIsIl9pbml0aWFsaXplQmFja2JvbmVPYmplY3QiLCJfaW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3MiLCJfaW5pdGlhbGl6ZU92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCIsIl9pbml0aWFsaXplQ2hpbGRWaWV3cyIsInJlcGxhY2VXaXRoIiwic3ViVmlldyIsIiRjaGlsZHJlbiIsImNoaWxkVmlldyIsImluZGV4IiwiZGVsZWdhdGVFdmVudHMiLCIkcGFyZW50IiwiY2hpbGRyZW4iLCJlYWNoIiwiZXhpc3RpbmdDaGlsZFZpZXciLCJmaWx0ZXIiLCJuZXdDaGlsZFZpZXciLCJlbXB0eSIsImNoaWxkIiwiYXBwZW5kIiwibGFzdCIsInJlbW92ZSIsInNwbGljZSIsImNvbnRhaW5zIiwiaGlkZSIsImNzcyIsImJvZHkiLCJFcnJvciIsImlzIiwid3JhcHBlciIsImNoaWxkTm9kZXMiLCJzbGljZSIsInVud3JhcCIsImluc2VydEJlZm9yZSIsInN1YlZpZXdJbXBvcnRzIiwiQ2hpbGRDb25zdHJ1Y3RvciIsImNsYXNzZXMiLCJjbCIsInBhcmVudERpcmVjdGl2ZSIsIm9wdGlvbnNTZW50VG9TdWJWaWV3IiwiY29udGVudCIsInJlZ2lzdHJ5IiwiRGlyZWN0aXZlQ29udGVudCIsIkRpcmVjdGl2ZUVuYWJsZSIsIkRpcmVjdGl2ZURpc2FibGUiLCJEaXJlY3RpdmVIcmVmIiwiRGlyZWN0aXZlTWFwIiwiRGlyZWN0aXZlT3B0aW9uYWwiLCJEaXJlY3RpdmVPcHRpb25hbFdyYXAiLCJEaXJlY3RpdmVTcmMiLCJEaXJlY3RpdmVTdWJ2aWV3IiwiRGlyZWN0aXZlRGF0YSIsImJhY2tib25lVmlld09wdGlvbnMiLCJhZGRpdGlvbmFsVmlld09wdGlvbnMiLCJuIiwid2FsayIsImNyZWF0ZVRyZWVXYWxrZXIiLCJOb2RlRmlsdGVyIiwiU0hPV19URVhUIiwibmV4dE5vZGUiLCJkaWZmZXJlbmNlIiwia2V5cyIsInVuaW9uIiwid2FybiIsImpzdCIsInRlbXBsYXRlU3RyaW5nIiwiY2lkIiwidW5pcXVlSWQiLCJ0cGxpZCIsInRlbXBsYXRlIiwicGljayIsImNvbmNhdCIsImRlZmF1bHRzIiwiZGVmIiwiYXR0cnMiLCJjbG9uZSIsImxvZyIsInByb3BNYXAiLCJmdW5jcyIsIm1vZGVsVmFyIiwidGVtcGxhdGVWYXIiLCJ1cGRhdGVDb250ZXh0T2JqZWN0IiwiX3NldEF0dHJpYnV0ZXMiLCJPYmplY3QiLCJfZW5zdXJlRWxlbWVudCIsImJ1aWxkSW5uZXJIVE1MIiwiaW5pdERpcmVjdGl2ZXMiLCJpbml0aWFsaXplIiwib2JqIiwibWFwT2JqZWN0IiwiZnVuYyIsInJldCIsImh0bWwiLCJyZW5kZXJlZFRlbXBsYXRlIiwiZHVtbXlkaXYiLCJfaW5pdGlhbFRleHROb2RlcyIsInRleHROb2Rlc1VuZGVyIiwiX3N1YlZpZXdFbGVtZW50cyIsImZ1bGxUZXh0Tm9kZSIsInJlIiwibWF0Y2giLCJtYXRjaGVzIiwiZXhlYyIsInRleHRDb250ZW50IiwiY3VycmVudFRleHROb2RlIiwiY3VycmVudFN0cmluZyIsInByZXZOb2Rlc0xlbmd0aCIsInZhck5vZGUiLCJzcGxpdFRleHQiLCJlbnRpcmVNYXRjaCIsImRpcmVjdGl2ZSIsImRpcmVjdGl2ZU5hbWUiLCJEaXJlY3RpdmVSZWdpc3RyeSIsIl9fcHJvdG8iLCJlbGVtZW50cyIsIm1ha2VBcnJheSIsImZpbmQiLCJxdWVyeVNlbGVjdG9yQWxsIiwiZWxlbWVudCIsInN1YlZpZXdFbGVtZW50IiwiZXZlbnRzIiwiZGVsZWdhdGVFdmVudFNwbGl0dGVyIiwidW5kZWxlZ2F0ZUV2ZW50cyIsIm1ldGhvZCIsImV2ZW50VHlwZXMiLCJzZWxlY3RvciIsInNlbGYiLCJldmVudE5hbWUiLCJkZWxlZ2F0ZSIsInVuZGVmaW5lZCIsImlkIiwiY2xhc3NOYW1lIiwic2V0RWxlbWVudCIsIl9jcmVhdGVFbGVtZW50IiwiY3JlYXRlRG9jdW1lbnRGcmFnbWVudCIsImdsb2JhbCJdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7OztBQUlBLFlBQWVBLFNBQVNDLEtBQVQsQ0FBZUMsTUFBZixDQUFzQjs7Y0FFeEIsb0JBQVNDLE9BQVQsRUFBaUI7UUFDckIsT0FBT0MsZUFBUCxLQUEyQixXQUFoQyxFQUE2QztXQUN0Q0MsS0FBTCxHQUFhLElBQUlELGVBQUosQ0FBb0JFLE9BQU9DLFFBQVAsQ0FBZ0JDLE1BQXBDLENBQWI7Ozs7U0FJR0MsU0FBTCxHQUFpQixFQUFqQjtTQUNLQyxjQUFMLEdBQXNCLEVBQXRCOzs7U0FHS0MsU0FBTCxHQUFpQixFQUFqQjs7U0FFS0MsWUFBTCxHQUFvQixFQUFwQjtTQUNLQyxJQUFMO0dBZmlDO1FBaUI5QixnQkFBVSxFQWpCb0I7eUJBa0JiLCtCQUFTQyxJQUFULEVBQWNDLFVBQWQsRUFBeUI7UUFDekNDLEVBQUVDLE9BQUYsQ0FBVUYsVUFBVixDQUFKLEVBQTJCQSxhQUFhLElBQUlHLEtBQUtDLFVBQVQsQ0FBb0JKLFVBQXBCLENBQWIsQ0FBM0IsS0FDSyxJQUFJLEVBQUVBLHNCQUFzQmYsU0FBU21CLFVBQWpDLENBQUosRUFBa0RKLGFBQWEsSUFBSUcsS0FBS0MsVUFBVCxDQUFvQkgsRUFBRUksT0FBRixDQUFVTCxVQUFWLENBQXBCLENBQWI7U0FDbERMLGNBQUwsQ0FBb0JJLElBQXBCLElBQTRCQyxVQUE1QjtlQUNXSCxZQUFYLENBQXdCUyxJQUF4QixDQUE2QixJQUE3QjtTQUNLQyxRQUFMLENBQWNQLFVBQWQsRUFBeUIsdUJBQXpCLEVBQWlELFlBQVU7V0FDcERRLE9BQUwsQ0FBYSxRQUFiO0tBREY7R0F2QmlDO09BMkIvQixhQUFTQyxJQUFULEVBQWM7UUFDWlIsRUFBRVMsUUFBRixDQUFXRCxJQUFYLEtBQW9CQSxLQUFLRSxVQUFMLENBQWdCLElBQWhCLENBQXhCLEVBQStDO2FBQ3RDLEtBQUtmLFNBQUwsQ0FBZWEsS0FBS0csTUFBTCxDQUFZLENBQVosQ0FBZixDQUFQO0tBREYsTUFHSTtVQUNFQyxNQUFNNUIsU0FBU0MsS0FBVCxDQUFlNEIsU0FBZixDQUF5QkQsR0FBekIsQ0FBNkJFLEtBQTdCLENBQW1DLElBQW5DLEVBQXdDQyxTQUF4QyxDQUFWO1VBQ0ksQ0FBQ2YsRUFBRWdCLFdBQUYsQ0FBY0osR0FBZCxDQUFMLEVBQXlCLE9BQU9BLEdBQVA7O1VBRXJCSyxRQUFRVCxLQUFLVSxLQUFMLENBQVcsR0FBWCxDQUFaO1VBQ01ELE1BQU1FLE1BQU4sR0FBZSxDQUFuQixFQUFxQjtZQUNmQyxRQUFRLElBQVo7Y0FDTUMsT0FBTixDQUFjLFVBQVN2QixJQUFULEVBQWM7Y0FDdEJzQixNQUFNM0IsU0FBTixDQUFnQkssSUFBaEIsQ0FBSixFQUEyQnNCLFFBQVFBLE1BQU0zQixTQUFOLENBQWdCSyxJQUFoQixDQUFSLENBQTNCLEtBQ0ssSUFBSXNCLE1BQU0xQixjQUFOLENBQXFCSSxJQUFyQixDQUFKLEVBQWdDc0IsUUFBUUEsTUFBTTFCLGNBQU4sQ0FBcUJJLElBQXJCLENBQVI7U0FGdkM7ZUFJT3NCLEtBQVA7OzthQUdLLEtBQUszQixTQUFMLENBQWVlLElBQWYsS0FBd0IsS0FBS2QsY0FBTCxDQUFvQmMsSUFBcEIsQ0FBL0I7O0dBN0M2QjtVQW1ENUIsZ0JBQVNjLEdBQVQsRUFBYUMsSUFBYixFQUFrQkMsSUFBbEIsRUFBdUI7UUFDeEIsS0FBS1osR0FBTCxDQUFTVSxHQUFULEtBQWVFLElBQW5CLEVBQXdCO1dBQ2pCQyxHQUFMLENBQVNILEdBQVQsRUFBYUMsSUFBYjtLQURGLE1BR0ssS0FBS0UsR0FBTCxDQUFTSCxHQUFULEVBQWFFLElBQWI7R0F2RDRCO09BeUQvQixhQUFTRixHQUFULEVBQWNJLEdBQWQsRUFBbUJ2QyxPQUFuQixFQUEyQjs7UUFFdkJhLEVBQUVTLFFBQUYsQ0FBV2EsR0FBWCxLQUFtQkEsSUFBSVosVUFBSixDQUFlLElBQWYsQ0FBdkIsRUFBNkM7O1VBRXZDaUIsb0JBQXFCM0IsRUFBRUMsT0FBRixDQUFVeUIsR0FBVixDQUFELEdBQWlCLElBQUlFLE9BQU96QixVQUFYLENBQXNCdUIsR0FBdEIsQ0FBakIsR0FBNEMsSUFBSUUsT0FBTzNDLEtBQVgsQ0FBaUJ5QyxHQUFqQixDQUFwRTt3QkFDa0I5QixZQUFsQixDQUErQlMsSUFBL0IsQ0FBb0MsSUFBcEM7V0FDS1YsU0FBTCxDQUFlMkIsSUFBSVgsTUFBSixDQUFXLENBQVgsQ0FBZixJQUFnQ2dCLGlCQUFoQzs7V0FHS3JCLFFBQUwsQ0FBY3FCLGlCQUFkLEVBQWdDLFlBQWhDLEVBQTZDLFVBQVNBLGlCQUFULEVBQTJCeEMsT0FBM0IsRUFBbUM7O2FBRXZFb0IsT0FBTCxDQUFhLFFBQWI7Ozs7Ozs7T0FGSjtLQVBGLE1Bc0JLOzs7d0NBQ010QixLQUFULENBQWU0QixTQUFmLENBQXlCWSxHQUF6QixFQUE2QkksSUFBN0IsK0JBQWtDLElBQWxDLG9DQUEwQ2QsU0FBMUM7Ozs7Q0FsRk8sQ0FBZjs7QUNKQTs7QUFFQSxBQUVBLGlCQUFlL0IsU0FBU21CLFVBQVQsQ0FBb0JqQixNQUFwQixDQUEyQjtXQUNoQ0QsS0FEZ0M7Z0JBRTNCLHNCQUFVO2FBQ1hXLFlBQUwsR0FBb0IsRUFBcEI7O2FBRUlrQyxFQUFMLENBQVEsS0FBUixFQUFjLFVBQVNWLEtBQVQsRUFBZTtpQkFDcEJkLFFBQUwsQ0FBY2MsS0FBZCxFQUFvQixRQUFwQixFQUE2QixZQUFVO3FCQUM5QmIsT0FBTCxDQUFhLFFBQWI7YUFESjtTQURKOztDQUxPLENBQWY7O0FDSkE7O0FBRUEsZ0JBQWV2QixTQUFTK0MsSUFBVCxDQUFjN0MsTUFBZCxDQUFxQjtVQUMzQixJQUQyQjtXQUUxQixJQUYwQjtZQUd6QixJQUh5QjtnQkFJckIsb0JBQVNDLE9BQVQsRUFBaUI7WUFDcEIsQ0FBQyxLQUFLNkMsSUFBVixFQUFnQkMsUUFBUUMsS0FBUixDQUFjLG9EQUFkO2FBQ1hSLEdBQUwsR0FBV3ZDLFFBQVF1QyxHQUFuQjs7O1lBSUksQ0FBQ3ZDLFFBQVFnRCxJQUFiLEVBQW1CRixRQUFRQyxLQUFSLENBQWMsdURBQWQ7YUFDZEMsSUFBTCxHQUFZaEQsUUFBUWdELElBQXBCO1lBQ0ksQ0FBQyxLQUFLQyxTQUFWLEVBQXFCSCxRQUFRQyxLQUFSLENBQWMsbURBQWQ7YUFDaEJFLFNBQUw7YUFDS0MsS0FBTDtLQWQ0QjtlQWdCdEIscUJBQVU7O2FBRVhDLFlBQUw7YUFDS2hDLFFBQUwsQ0FBYyxLQUFLNkIsSUFBTCxDQUFVSSxTQUF4QixFQUFrQyxZQUFVLEtBQUtiLEdBQWpELEVBQXFELFlBQVU7aUJBQ3REWSxZQUFMO2lCQUNLRSxNQUFMO1NBRko7S0FuQjRCO2tCQXlCbkIsd0JBQVU7WUFDZkMsU0FBUyxLQUFLTixJQUFMLENBQVV2QixHQUFWLENBQWMsS0FBS2MsR0FBbkIsQ0FBYjtZQUNJMUIsRUFBRTBDLFVBQUYsQ0FBYUQsTUFBYixDQUFKLEVBQTBCLEtBQUtBLE1BQUwsR0FBY0EsT0FBT1osSUFBUCxDQUFZLEtBQUtNLElBQWpCLENBQWQsQ0FBMUIsS0FDSyxLQUFLTSxNQUFMLEdBQWNBLE1BQWQ7O0NBNUJFLENBQWY7O0FDQ0EsdUJBQWVFLFVBQVV6RCxNQUFWLENBQWlCO1VBQ3ZCLFNBRHVCO1dBRXRCLGlCQUFVO1lBQ1IsS0FBSzBELEdBQUwsQ0FBUzlDLElBQVQsQ0FBYyxTQUFkLEtBQTBCLEtBQTlCLEVBQXFDLEtBQUsrQyxFQUFMLENBQVFDLFlBQVIsQ0FBcUIsT0FBckIsRUFBNkIsS0FBS0wsTUFBbEMsRUFBckMsS0FDSyxLQUFLSSxFQUFMLENBQVFFLFNBQVIsR0FBb0IsS0FBS04sTUFBekI7S0FKbUI7WUFNckIsa0JBQVU7YUFDUkosS0FBTDtLQVB3QjtVQVN2QixjQUFTVyxLQUFULEVBQWU7WUFDWkMsT0FBTyxLQUFYO1lBQ0ksS0FBS0wsR0FBTCxDQUFTOUMsSUFBVCxDQUFjLFNBQWQsS0FBMEIsS0FBOUIsRUFBcUM7Z0JBQzdCLEtBQUsrQyxFQUFMLENBQVFLLFlBQVIsQ0FBcUIsT0FBckIsS0FBK0JGLFFBQVEsRUFBM0MsRUFBK0NDLE9BQU8sSUFBUDtTQURuRCxNQUdLLElBQUksS0FBS0osRUFBTCxDQUFRRSxTQUFSLElBQW1CQyxRQUFNLEVBQTdCLEVBQWlDQyxPQUFPLElBQVA7O2VBRS9CQSxJQUFQOztDQWhCTyxDQUFmOztBQ0hBOztBQUVBLEFBRUEsc0JBQWVOLFVBQVV6RCxNQUFWLENBQWlCO1VBQ3ZCLFFBRHVCO1dBRXRCLGlCQUFVO1lBQ1IsQ0FBQyxLQUFLdUQsTUFBVixFQUFrQlUsRUFBRSxLQUFLTixFQUFQLEVBQVcvQyxJQUFYLENBQWdCLFVBQWhCLEVBQTJCLElBQTNCLEVBQWxCLEtBQ0txRCxFQUFFLEtBQUtOLEVBQVAsRUFBVy9DLElBQVgsQ0FBZ0IsVUFBaEIsRUFBMkIsRUFBM0I7S0FKbUI7WUFNckIsa0JBQVU7WUFDVCxDQUFDLEtBQUsyQyxNQUFWLEVBQWtCVSxFQUFFLEtBQUtOLEVBQVAsRUFBVy9DLElBQVgsQ0FBZ0IsVUFBaEIsRUFBMkIsSUFBM0IsRUFBbEIsS0FDS3FELEVBQUUsS0FBS04sRUFBUCxFQUFXL0MsSUFBWCxDQUFnQixVQUFoQixFQUEyQixFQUEzQjtLQVJtQjtVQVV2QixjQUFTa0QsS0FBVCxFQUFlO2VBQ1RHLEVBQUUsS0FBS04sRUFBUCxFQUFXL0MsSUFBWCxDQUFnQixVQUFoQixLQUE2QmtELEtBQXBDOztDQVhPLENBQWY7O0FDSkE7O0FBRUEsQUFFQSx1QkFBZUwsVUFBVXpELE1BQVYsQ0FBaUI7VUFDdkIsU0FEdUI7V0FFdEIsaUJBQVU7WUFDUixLQUFLdUQsTUFBVCxFQUFpQlUsRUFBRSxLQUFLTixFQUFQLEVBQVcvQyxJQUFYLENBQWdCLFVBQWhCLEVBQTJCLElBQTNCLEVBQWpCLEtBQ0txRCxFQUFFLEtBQUtOLEVBQVAsRUFBVy9DLElBQVgsQ0FBZ0IsVUFBaEIsRUFBMkIsRUFBM0I7S0FKbUI7WUFNckIsa0JBQVU7WUFDVCxLQUFLMkMsTUFBVCxFQUFpQlUsRUFBRSxLQUFLTixFQUFQLEVBQVcvQyxJQUFYLENBQWdCLFVBQWhCLEVBQTJCLElBQTNCLEVBQWpCLEtBQ0txRCxFQUFFLEtBQUtOLEVBQVAsRUFBVy9DLElBQVgsQ0FBZ0IsVUFBaEIsRUFBMkIsRUFBM0I7S0FSbUI7VUFVdkIsY0FBU2tELEtBQVQsRUFBZTtlQUNURyxFQUFFLEtBQUtOLEVBQVAsRUFBVy9DLElBQVgsQ0FBZ0IsVUFBaEIsS0FBNkJrRCxLQUFwQzs7Q0FYTyxDQUFmOztBQ0ZBLG9CQUFlTCxVQUFVekQsTUFBVixDQUFpQjtVQUN2QixNQUR1Qjs7V0FHdEIsaUJBQVU7WUFDUixLQUFLMEQsR0FBTCxDQUFTOUMsSUFBVCxDQUFjLFNBQWQsS0FBMEIsR0FBOUIsRUFBbUMsS0FBSzhDLEdBQUwsQ0FBU3BDLElBQVQsQ0FBYyxNQUFkLEVBQXFCLEtBQUtpQyxNQUExQixFQUFuQyxLQUNLO2dCQUNHVyxJQUFJQyxTQUFTQyxhQUFULENBQXVCLEdBQXZCLENBQVI7Y0FDRUMsU0FBRixDQUFZQyxHQUFaLENBQWdCLFdBQWhCO2NBQ0VWLFlBQUYsQ0FBZSxNQUFmLEVBQXNCLEtBQUtMLE1BQTNCO2lCQUNLZ0IsUUFBTCxHQUFnQkwsQ0FBaEI7aUJBQ0tQLEVBQUwsQ0FBUWEsVUFBUixDQUFtQkMsWUFBbkIsQ0FBZ0MsS0FBS0YsUUFBckMsRUFBOEMsS0FBS1osRUFBbkQ7OztpQkFHS1ksUUFBTCxDQUFjRyxXQUFkLENBQTBCLEtBQUtmLEVBQS9COztlQUVHWSxRQUFQLEdBQWtCLEtBQUtBLFFBQXZCO0tBZndCO1lBaUJyQixrQkFBVTtZQUNULEtBQUtiLEdBQUwsQ0FBUzlDLElBQVQsQ0FBYyxTQUFkLEtBQTBCLEdBQTlCLEVBQW1DcUQsRUFBRSxLQUFLTixFQUFQLEVBQVdyQyxJQUFYLENBQWdCLE1BQWhCLEVBQXVCLEtBQUtpQyxNQUE1QixFQUFuQyxLQUNLO2lCQUNJZ0IsUUFBTCxDQUFjWCxZQUFkLENBQTJCLE1BQTNCLEVBQWtDLEtBQUtMLE1BQXZDOztLQXBCb0I7VUF1QnZCLGNBQVNPLEtBQVQsRUFBZTtZQUNaLEtBQUtKLEdBQUwsQ0FBUzlDLElBQVQsQ0FBYyxTQUFkLEtBQTBCLEdBQTlCLEVBQW1DLE9BQU9xRCxFQUFFLEtBQUtOLEVBQVAsRUFBV3JDLElBQVgsQ0FBZ0IsTUFBaEIsS0FBeUJ3QyxLQUFoQyxDQUFuQyxLQUNLO21CQUNNRyxFQUFFLEtBQUtOLEVBQVAsRUFBV2dCLE1BQVgsR0FBb0IvRCxJQUFwQixDQUF5QixTQUF6QixLQUFxQyxHQUFyQyxJQUE0Q3FELEVBQUUsS0FBS04sRUFBUCxFQUFXZ0IsTUFBWCxHQUFvQnJELElBQXBCLENBQXlCLE1BQXpCLEtBQWtDd0MsS0FBckY7OztDQTFCRyxDQUFmOztBQ0FBLHNCQUFlTCxVQUFVekQsTUFBVixDQUFpQjtVQUN2QixpQkFEdUI7K0JBRUYscUNBQVU7WUFDNUI0RSxPQUFPLEtBQUtwQyxHQUFMLENBQVNSLEtBQVQsQ0FBZSxHQUFmLENBQVg7YUFDSzZDLFdBQUwsR0FBbUJELEtBQUssQ0FBTCxDQUFuQjtZQUNLQSxLQUFLLENBQUwsQ0FBSixFQUFZO2lCQUNKRSxZQUFMLEdBQW9CRixLQUFLLENBQUwsQ0FBcEI7Z0JBQ0kxQyxRQUFRLEtBQUtlLElBQUwsQ0FBVXZCLEdBQVYsQ0FBYyxLQUFLbUQsV0FBbkIsQ0FBWixDQUZTO2dCQUdMM0MsaUJBQWlCcEMsU0FBU0MsS0FBOUIsRUFBcUMsS0FBS2dGLFFBQUwsR0FBZ0I3QyxLQUFoQixDQUFyQyxLQUNLLElBQUlBLGlCQUFpQnBDLFNBQVNtQixVQUE5QixFQUEwQyxLQUFLK0QsYUFBTCxHQUFxQjlDLEtBQXJCOzs7OztLQVQzQjs4QkFlSCxvQ0FBVTs7O2FBRzFCK0MsYUFBTCxHQUFxQixLQUFLaEMsSUFBTCxDQUFVaUMsUUFBVixJQUFzQixLQUFLakMsSUFBTCxDQUFVaUMsUUFBVixDQUFtQixLQUFLTCxXQUF4QixDQUEzQztLQWxCd0I7NENBb0JXLGtEQUFVOzs7Ozs7O2FBT3hDTSwyQkFBTCxHQUFtQyxLQUFLbEMsSUFBTCxDQUFVdkIsR0FBVixDQUFjLEtBQUttRCxXQUFuQixDQUFuQztLQTNCd0I7OzJCQWdDTixpQ0FBVTtDQWhDckIsQ0FBZjs7QUNGQTtBQUNBLEFBQ0EsQUFDQSxtQkFBZU8sZ0JBQWdCcEYsTUFBaEIsQ0FBdUI7VUFDN0IsS0FENkI7MkJBRVosaUNBQVU7O2FBSXZCb0IsUUFBTCxDQUFjLEtBQUs0RCxhQUFuQixFQUFpQyxLQUFqQyxFQUF1QyxZQUFVO2lCQUN4Q0ssU0FBTDtTQURKOzthQUlLakUsUUFBTCxDQUFjLEtBQUs0RCxhQUFuQixFQUFpQyxPQUFqQyxFQUF5QyxZQUFVO2lCQUMxQ00sV0FBTDtTQURKOzthQUlLbEUsUUFBTCxDQUFjLEtBQUs0RCxhQUFuQixFQUFpQyxRQUFqQyxFQUEwQyxZQUFVO2lCQUMzQ08sWUFBTDtTQURKOzthQUlLbkUsUUFBTCxDQUFjLEtBQUs0RCxhQUFuQixFQUFpQyxNQUFqQyxFQUF3QyxZQUFVO2lCQUN6Q1EsVUFBTDtTQURKOzs7YUFPS0MsU0FBTCxHQUFpQixLQUFLeEMsSUFBTCxDQUFVeUMsZ0JBQVYsQ0FBMkIsS0FBS2IsV0FBaEMsQ0FBakI7YUFDS2MsZ0JBQUwsR0FBd0I7c0JBQ1gsS0FBS1YsYUFETTt3QkFFVCxLQUFLRCxhQUZJO3FCQUdaLEtBQUsvQixJQUFMLENBQVV5QyxnQkFBVixDQUEyQixLQUFLYixXQUFoQyxFQUE2Q2xELFNBQTdDLENBQXVEaUUsT0FBdkQsSUFBa0UsU0FIdEQ7eUNBSVEsS0FBS1Q7U0FKckM7O2FBUUtVLFVBQUwsR0FBa0IsS0FBS2IsYUFBTCxDQUFtQmMsR0FBbkIsQ0FBdUIsVUFBU0MsVUFBVCxFQUFvQkMsQ0FBcEIsRUFBc0I7O2dCQUV2REwsbUJBQW1CN0UsRUFBRWQsTUFBRixDQUFTLEVBQVQsRUFBWSxLQUFLMkYsZ0JBQWpCLEVBQWtDO3VCQUMvQ0ksVUFEK0M7dUJBRS9DQyxDQUYrQzsyQkFHM0MsS0FBS2hCLGFBQUwsQ0FBbUIvQyxNQUFuQixHQUE0QitELENBQTVCLEdBQWdDLENBSFc7NkNBSXpCLEtBQUtiLDJCQUFMLElBQW9DLEtBQUtBLDJCQUFMLENBQWlDYyxNQUFqQyxDQUF3Q0QsQ0FBeEMsQ0FBcEMsSUFBa0YsS0FBS2IsMkJBQUwsQ0FBaUNjLE1BQWpDLENBQXdDRCxDQUF4QyxFQUEyQ0U7YUFKdEksQ0FBdkI7O2dCQVFJQyxZQUFZLElBQUksS0FBS1YsU0FBVCxDQUFtQkUsZ0JBQW5CLENBQWhCOzttQkFFT1EsU0FBUDtTQVpxQyxDQWF2Q0MsSUFidUMsQ0FhbEMsSUFia0MsQ0FBdkIsQ0FBbEI7S0FsQzhCO2VBa0R4QixxQkFBVTthQUNYQyx5QkFBTDthQUNLQyx3QkFBTDthQUNLQyxzQ0FBTDthQUNLQyxxQkFBTDtLQXREOEI7V0FtRTVCLGlCQUFVO1lBQ1IsQ0FBQyxLQUFLeEIsYUFBVixFQUF3QjtpQkFDZnRCLEdBQUwsQ0FBUytDLFdBQVQsQ0FBcUIsS0FBS0MsT0FBTCxDQUFhL0MsRUFBbEM7U0FESixNQUdJO2dCQUNJZ0QsWUFBWTFDLEdBQWhCO2lCQUNLNEIsVUFBTCxDQUFnQjFELE9BQWhCLENBQXdCLFVBQVN5RSxTQUFULEVBQW1CWixDQUFuQixFQUFxQjs0QkFDN0JXLFVBQVVyQyxHQUFWLENBQWNzQyxVQUFVakQsRUFBeEIsQ0FBWjswQkFDVWtELEtBQVYsR0FBa0JiLENBQWxCO2FBRm9CLENBR3RCSSxJQUhzQixDQUdqQixJQUhpQixDQUF4QjtnQkFJSU8sVUFBVTFFLE1BQWQsRUFBc0I7cUJBQ2J5QixHQUFMLENBQVMrQyxXQUFULENBQXFCRSxTQUFyQjtxQkFDS2QsVUFBTCxDQUFnQjFELE9BQWhCLENBQXdCLFVBQVN5RSxTQUFULEVBQW1CWixDQUFuQixFQUFxQjs4QkFDL0JjLGNBQVY7aUJBREo7cUJBR0tDLE9BQUwsR0FBZUosVUFBVWhDLE1BQVYsRUFBZjthQUxKLE1BT0k7cUJBQ0tvQyxPQUFMLEdBQWUsS0FBS3JELEdBQUwsQ0FBU2lCLE1BQVQsRUFBZjs7aUJBRUNnQyxTQUFMLEdBQWlCQSxTQUFqQjs7S0F2RjBCO2VBMEZ4QixxQkFBVTtZQUNaSyxXQUFXLEVBQWY7YUFDS2hDLGFBQUwsQ0FBbUJpQyxJQUFuQixDQUF3QixVQUFTL0UsS0FBVCxFQUFlOEQsQ0FBZixFQUFpQjtnQkFDakNrQixvQkFBb0IsS0FBS3JCLFVBQUwsQ0FBZ0JzQixNQUFoQixDQUF1QixVQUFTUCxTQUFULEVBQW1CO3VCQUN2REEsVUFBVTFFLEtBQVYsSUFBbUJBLEtBQTFCO2FBRG9CLEVBRXJCLENBRnFCLENBQXhCO2dCQUdJZ0YsaUJBQUosRUFBdUI7eUJBQ1YvRixJQUFULENBQWMrRixrQkFBa0J2RCxFQUFoQzs7O2FBREosTUFLSztvQkFDR3lELGVBQWUsSUFBSSxLQUFLM0IsU0FBVCxDQUFtQjsyQkFDNUJ2RCxLQUQ0Qjs4QkFFekIsS0FBSytDLGFBRm9COzJCQUc1QmUsQ0FINEI7K0JBSXhCLEtBQUtoQixhQUFMLENBQW1CL0MsTUFBbkIsR0FBNEIrRCxDQUE1QixHQUFnQyxDQUpSO2dDQUt2QixLQUFLaEIsYUFMa0I7MEJBTTdCLEtBQUsvQixJQUFMLENBQVV2QixHQUFWLENBQWMsS0FBS2MsR0FBTCxDQUFTUixLQUFULENBQWUsR0FBZixFQUFvQixDQUFwQixDQUFkLEVBQXNDZ0UsQ0FBdEM7aUJBTlUsQ0FBbkI7cUJBUUtILFVBQUwsQ0FBZ0IxRSxJQUFoQixDQUFxQmlHLFlBQXJCO3lCQUNTakcsSUFBVCxDQUFjaUcsYUFBYXpELEVBQTNCOztTQW5CZ0IsQ0FzQnRCeUMsSUF0QnNCLENBc0JqQixJQXRCaUIsQ0FBeEI7YUF1QktXLE9BQUwsQ0FBYU0sS0FBYjtpQkFDU2xGLE9BQVQsQ0FBaUIsVUFBU21GLEtBQVQsRUFBZTtpQkFDdkJQLE9BQUwsQ0FBYVEsTUFBYixDQUFvQkQsS0FBcEI7U0FEYSxDQUVmbEIsSUFGZSxDQUVWLElBRlUsQ0FBakI7YUFHS08sU0FBTCxHQUFpQjFDLEVBQUUrQyxRQUFGLENBQWpCOzthQUVLbkIsVUFBTCxDQUFnQjFELE9BQWhCLENBQXdCLFVBQVN5RSxTQUFULEVBQW1CWixDQUFuQixFQUFxQjtzQkFDL0JjLGNBQVY7U0FESjtLQXpIOEI7aUJBOEh0Qix1QkFBVTthQUNiQyxPQUFMLENBQWFNLEtBQWI7S0EvSDhCO2tCQWlJckIsd0JBQVU7YUFDZFYsU0FBTCxDQUFlYSxJQUFmLEdBQXNCQyxNQUF0QjthQUNLNUIsVUFBTCxDQUFnQjZCLE1BQWhCLENBQXVCLENBQUMsQ0FBeEIsRUFBMEIsQ0FBMUI7YUFDS2YsU0FBTCxHQUFpQixLQUFLSSxPQUFMLENBQWFDLFFBQWIsRUFBakI7S0FwSThCO2dCQXNJdkIsc0JBQVU7OztLQXRJYTtVQTBJN0IsZ0JBQVU7Ozs7O1lBS1AsS0FBS04sT0FBVCxFQUFpQjs7bUJBRU4sS0FBS3pELElBQUwsQ0FBVVUsRUFBVixDQUFhZ0UsUUFBYixDQUFzQixLQUFLakIsT0FBTCxDQUFhL0MsRUFBYixDQUFnQmEsVUFBdEMsQ0FBUDtTQUZKLE1BSUk7Z0JBQ0lULE9BQU8sSUFBWDtnQkFDSUosS0FBSyxLQUFLVixJQUFMLENBQVVVLEVBQW5CO2lCQUNLZ0QsU0FBTCxDQUFlTSxJQUFmLENBQW9CLFlBQVU7b0JBQ3RCLENBQUN0RCxHQUFHZ0UsUUFBSCxDQUFZLElBQVosQ0FBTCxFQUF3QjVELE9BQU8sS0FBUDthQUQ1QjttQkFHTUEsSUFBUDs7O0NBekpJLENBQWY7O0FDSEE7QUFDQSxBQUVBLHdCQUFlTixVQUFVekQsTUFBVixDQUFpQjtVQUN2QixVQUR1Qjs7V0FHdEIsaUJBQVU7WUFDUixDQUFDLEtBQUt1RCxNQUFWLEVBQWtCVSxFQUFFLEtBQUtOLEVBQVAsRUFBV2lFLElBQVgsR0FBbEIsS0FDSzNELEVBQUUsS0FBS04sRUFBUCxFQUFXa0UsR0FBWCxDQUFlLFNBQWYsRUFBeUIsRUFBekI7S0FMbUI7WUFPckIsa0JBQVU7WUFDVCxDQUFDLEtBQUt0RSxNQUFWLEVBQWtCVSxFQUFFLEtBQUtOLEVBQVAsRUFBV2lFLElBQVgsR0FBbEIsS0FDSzNELEVBQUUsS0FBS04sRUFBUCxFQUFXa0UsR0FBWCxDQUFlLFNBQWYsRUFBeUIsRUFBekI7S0FUbUI7VUFXdkIsY0FBUy9ELEtBQVQsRUFBZTtZQUNaLENBQUNLLFNBQVMyRCxJQUFULENBQWNILFFBQWQsQ0FBdUIsS0FBS2hFLEVBQTVCLENBQUwsRUFBc0MsTUFBTW9FLE1BQU0sK0NBQU4sQ0FBTjtlQUMvQjlELEVBQUUsS0FBS04sRUFBUCxFQUFXcUUsRUFBWCxDQUFjLFVBQWQsS0FBMkJsRSxLQUFsQzs7Q0FiTyxDQUFmOztBQ0RBLDRCQUFlTCxVQUFVekQsTUFBVixDQUFpQjtVQUN2QixjQUR1QjtlQUVsQixxQkFBVTtrQkFDTjJCLFNBQVYsQ0FBb0J1QixTQUFwQixDQUE4QlAsSUFBOUIsQ0FBbUMsSUFBbkMsRUFBd0NkLFNBQXhDOzthQUVLb0csT0FBTCxHQUFlLEtBQUt0RSxFQUFwQjthQUNLdUUsVUFBTCxHQUFrQixHQUFHQyxLQUFILENBQVN4RixJQUFULENBQWMsS0FBS2dCLEVBQUwsQ0FBUXVFLFVBQXRCLEVBQWtDLENBQWxDLENBQWxCO0tBTndCO1dBU3RCLGlCQUFVO1lBQ1IsQ0FBQyxLQUFLM0UsTUFBVixFQUFrQlUsRUFBRSxLQUFLaUUsVUFBUCxFQUFtQkUsTUFBbkI7S0FWTTtZQVlyQixrQkFBVTtZQUNULENBQUMsS0FBSzdFLE1BQVYsRUFBaUI7Y0FDWCxLQUFLMkUsVUFBUCxFQUFtQkUsTUFBbkI7U0FESixNQUdLO2dCQUNFLENBQUNqRSxTQUFTMkQsSUFBVCxDQUFjSCxRQUFkLENBQXVCLEtBQUtPLFVBQUwsQ0FBZ0IsQ0FBaEIsQ0FBdkIsQ0FBTCxFQUFnRDt3QkFDbkNsRixLQUFSLENBQWMsOEJBQWQ7O2FBREwsTUFJTSxJQUFJLENBQUNtQixTQUFTMkQsSUFBVCxDQUFjSCxRQUFkLENBQXVCLEtBQUtNLE9BQTVCLENBQUwsRUFBMEM7cUJBQ3RDQyxVQUFMLENBQWdCLENBQWhCLEVBQW1CMUQsVUFBbkIsQ0FBOEI2RCxZQUE5QixDQUEyQyxLQUFLSixPQUFoRCxFQUF3RCxLQUFLQyxVQUFMLENBQWdCLENBQWhCLENBQXhEOztpQkFFQSxJQUFJbEMsSUFBRSxDQUFWLEVBQVlBLElBQUUsS0FBS2tDLFVBQUwsQ0FBZ0JqRyxNQUE5QixFQUFxQytELEdBQXJDLEVBQXlDO3FCQUNoQ2lDLE9BQUwsQ0FBYXZELFdBQWIsQ0FBeUIsS0FBS3dELFVBQUwsQ0FBZ0JsQyxDQUFoQixDQUF6Qjs7O0tBekJnQjtVQTZCdkIsY0FBU2xDLEtBQVQsRUFBZTs7ZUFHUixLQUFLb0UsVUFBTCxDQUFnQixDQUFoQixFQUFtQjFELFVBQW5CLElBQStCLEtBQUt5RCxPQUFyQyxJQUFpRG5FLEtBQXhEOztDQWhDTyxDQUFmOztBQ0FBLG1CQUFlTCxVQUFVekQsTUFBVixDQUFpQjtVQUN2QixLQUR1QjtXQUV0QixpQkFBVTthQUNQMEQsR0FBTCxDQUFTcEMsSUFBVCxDQUFjLEtBQWQsRUFBb0IsS0FBS2lDLE1BQXpCO0tBSHdCO1lBS3JCLGtCQUFVO2FBQ1JHLEdBQUwsQ0FBU3BDLElBQVQsQ0FBYyxLQUFkLEVBQW9CLEtBQUtpQyxNQUF6QjtLQU53QjtVQVF2QixjQUFTTyxLQUFULEVBQWU7ZUFDVCxLQUFLSixHQUFMLENBQVNwQyxJQUFULENBQWMsS0FBZCxNQUF1QndDLEtBQTlCOztDQVRPLENBQWY7O0FDRkE7QUFDQSxBQUNBLEFBQ0EsdUJBQWVzQixnQkFBZ0JwRixNQUFoQixDQUF1QjtVQUM3QixTQUQ2QjsyQkFFWixpQ0FBVTtZQUN4QixLQUFLaUQsSUFBTCxDQUFVcUYsY0FBVixDQUF5QixLQUFLekQsV0FBOUIsRUFBMkNsRCxTQUEzQyxZQUFnRTdCLFNBQVMrQyxJQUE3RSxFQUFtRixLQUFLMEYsZ0JBQUwsR0FBd0IsS0FBS3RGLElBQUwsQ0FBVXFGLGNBQVYsQ0FBeUIsS0FBS3pELFdBQTlCLENBQXhCLENBQW5GLEtBQ0ssS0FBSzBELGdCQUFMLEdBQXdCLEtBQUt0RixJQUFMLENBQVVxRixjQUFWLENBQXlCLEtBQUt6RCxXQUE5QixDQUF4QixDQUZ1Qjs7WUFJdkI1RSxVQUFVLEVBQWQ7O1lBRUcsS0FBS2tGLDJCQUFULEVBQXFDO2NBQy9CbkYsTUFBRixDQUFTQyxPQUFULEVBQWlCLEVBQUNrRiw2QkFBNEIsS0FBS0EsMkJBQWxDLEVBQWpCOzs7WUFHQSxLQUFLRixhQUFULEVBQXVCO2NBQ2pCakYsTUFBRixDQUFTQyxPQUFULEVBQWlCOzBCQUNKLEtBQUtnRjs7YUFEbEI7OztZQU1BRixXQUFXLEtBQUtBLFFBQUwsSUFBaUIsS0FBSzlCLElBQUwsQ0FBVWYsS0FBMUM7WUFDSTZDLFFBQUosRUFBYTtjQUNQL0UsTUFBRixDQUFTQyxPQUFULEVBQWlCLEVBQUNpQyxPQUFNNkMsUUFBUCxFQUFqQjs7O1lBR0EsQ0FBQyxLQUFLQyxhQUFWLEVBQXdCO2lCQUNmMEIsT0FBTCxHQUFlLElBQUksS0FBSzZCLGdCQUFULENBQTBCdEksT0FBMUIsQ0FBZjtnQkFDSXVJLFVBQVUxSCxFQUFFeUMsTUFBRixDQUFTLEtBQUttRCxPQUFkLEVBQXNCLFdBQXRCLENBQWQ7Z0JBQ0k4QixPQUFKLEVBQVk7d0JBQ0F4RyxLQUFSLENBQWMsR0FBZCxFQUFtQkcsT0FBbkIsQ0FBMkIsVUFBU3NHLEVBQVQsRUFBWTt5QkFDOUIvQixPQUFMLENBQWEvQyxFQUFiLENBQWdCVSxTQUFoQixDQUEwQkMsR0FBMUIsQ0FBOEJtRSxFQUE5QjtpQkFEdUIsQ0FFekJyQyxJQUZ5QixDQUVwQixJQUZvQixDQUEzQjs7O2dCQUtBRixhQUFhcEYsRUFBRXlDLE1BQUYsQ0FBUyxLQUFLbUQsT0FBZCxFQUFzQixZQUF0QixDQUFqQjtnQkFDSVIsVUFBSixFQUFlO2tCQUNUZSxJQUFGLENBQU9mLFVBQVAsRUFBa0IsVUFBUzFELEdBQVQsRUFBYU0sSUFBYixFQUFrQjt5QkFDM0I0RCxPQUFMLENBQWEvQyxFQUFiLENBQWdCQyxZQUFoQixDQUE2QmQsSUFBN0IsRUFBa0NOLEdBQWxDO2lCQURjLENBRWhCNEQsSUFGZ0IsQ0FFWCxJQUZXLENBQWxCOzs7aUJBS0NNLE9BQUwsQ0FBYS9CLE1BQWIsR0FBc0IsS0FBSzFCLElBQTNCO2lCQUNLeUQsT0FBTCxDQUFhZ0MsZUFBYixHQUErQixJQUEvQjs7YUFFQ0Msb0JBQUwsR0FBNEIxSSxPQUE1QjtLQTNDOEI7ZUE2Q3hCLHFCQUFVOzs7YUFHWG9HLHlCQUFMO2FBQ0tDLHdCQUFMO2FBQ0tDLHNDQUFMO2FBQ0tDLHFCQUFMOztZQU1JLEtBQUt4QixhQUFULEVBQXVCO2lCQUNWNUQsUUFBTCxDQUFjLEtBQUs0RCxhQUFuQixFQUFpQyxLQUFqQyxFQUF1QyxZQUFVO3FCQUN4Q0ssU0FBTDthQURKOztpQkFJS2pFLFFBQUwsQ0FBYyxLQUFLNEQsYUFBbkIsRUFBaUMsT0FBakMsRUFBeUMsWUFBVTtxQkFDMUNNLFdBQUw7YUFESjs7aUJBSUtsRSxRQUFMLENBQWMsS0FBSzRELGFBQW5CLEVBQWlDLFFBQWpDLEVBQTBDLFlBQVU7cUJBQzNDTyxZQUFMO2FBREo7O2lCQUlLbkUsUUFBTCxDQUFjLEtBQUs0RCxhQUFuQixFQUFpQyxNQUFqQyxFQUF3QyxZQUFVO3FCQUN6Q1EsVUFBTDthQURKOzs7aUJBT0tDLFNBQUwsR0FBaUIsS0FBS3hDLElBQUwsQ0FBVXlDLGdCQUFWLENBQTJCLEtBQUtiLFdBQWhDLENBQWpCO2lCQUNLYyxnQkFBTCxHQUF3QjswQkFDWCxLQUFLVixhQURNOzRCQUVULEtBQUtELGFBRkk7eUJBR1osS0FBSy9CLElBQUwsQ0FBVXlDLGdCQUFWLENBQTJCLEtBQUtiLFdBQWhDLEVBQTZDbEQsU0FBN0MsQ0FBdURpRSxPQUF2RCxJQUFrRSxTQUh0RDs2Q0FJUSxLQUFLVDthQUpyQztpQkFNS1UsVUFBTCxHQUFrQixLQUFLYixhQUFMLENBQW1CYyxHQUFuQixDQUF1QixVQUFTQyxVQUFULEVBQW9CQyxDQUFwQixFQUFzQjs7b0JBRXZETCxtQkFBbUI3RSxFQUFFZCxNQUFGLENBQVMsRUFBVCxFQUFZLEtBQUsyRixnQkFBakIsRUFBa0M7MkJBQy9DSSxVQUQrQzsyQkFFL0NDLENBRitDOytCQUczQyxLQUFLaEIsYUFBTCxDQUFtQi9DLE1BQW5CLEdBQTRCK0QsQ0FBNUIsR0FBZ0MsQ0FIVztpREFJekIsS0FBS2IsMkJBQUwsSUFBb0MsS0FBS0EsMkJBQUwsQ0FBaUNjLE1BQWpDLENBQXdDRCxDQUF4QyxDQUFwQyxJQUFrRixLQUFLYiwyQkFBTCxDQUFpQ2MsTUFBakMsQ0FBd0NELENBQXhDLEVBQTJDRTtpQkFKdEksQ0FBdkI7O29CQVFJQyxZQUFZLElBQUksS0FBS1YsU0FBVCxDQUFtQkUsZ0JBQW5CLENBQWhCOzt1QkFFT1EsU0FBUDthQVpxQyxDQWF2Q0MsSUFidUMsQ0FhbEMsSUFia0MsQ0FBdkIsQ0FBbEI7OztZQTBCSixDQUFDLEtBQUtwQixhQUFWLEVBQXdCO2dCQUNoQixLQUFLL0IsSUFBTCxDQUFVcUYsY0FBVixDQUF5QixLQUFLekQsV0FBOUIsRUFBMkNsRCxTQUEzQyxZQUFnRTdCLFNBQVMrQyxJQUE3RSxFQUFtRixLQUFLMEYsZ0JBQUwsR0FBd0IsS0FBS3RGLElBQUwsQ0FBVXFGLGNBQVYsQ0FBeUIsS0FBS3pELFdBQTlCLENBQXhCLENBQW5GLEtBQ0ssS0FBSzBELGdCQUFMLEdBQXdCLEtBQUt0RixJQUFMLENBQVVxRixjQUFWLENBQXlCLEtBQUt6RCxXQUE5QixDQUF4QixDQUZlOzs7WUFNcEI1RSxVQUFVLEVBQWQ7O1lBRUksS0FBS2tGLDJCQUFULEVBQXFDO2NBQy9CbkYsTUFBRixDQUFTQyxPQUFULEVBQWlCLEVBQUNrRiw2QkFBNEIsS0FBS0EsMkJBQWxDLEVBQWpCOzs7WUFHQSxLQUFLRixhQUFULEVBQXVCO2NBQ2pCakYsTUFBRixDQUFTQyxPQUFULEVBQWlCOzBCQUNKLEtBQUtnRjs7YUFEbEI7OztZQU1BRixXQUFXLEtBQUtBLFFBQUwsSUFBaUIsS0FBSzlCLElBQUwsQ0FBVWYsS0FBMUM7WUFDSTZDLFFBQUosRUFBYTtjQUNQL0UsTUFBRixDQUFTQyxPQUFULEVBQWlCLEVBQUNpQyxPQUFNNkMsUUFBUCxFQUFqQjs7O1lBR0EsQ0FBQyxLQUFLQyxhQUFWLEVBQXdCO2lCQUNmMEIsT0FBTCxHQUFlLElBQUksS0FBSzZCLGdCQUFULENBQTBCdEksT0FBMUIsQ0FBZjtnQkFDSXVJLFVBQVUxSCxFQUFFeUMsTUFBRixDQUFTLEtBQUttRCxPQUFkLEVBQXNCLFdBQXRCLENBQWQ7Z0JBQ0k4QixPQUFKLEVBQVk7d0JBQ0F4RyxLQUFSLENBQWMsR0FBZCxFQUFtQkcsT0FBbkIsQ0FBMkIsVUFBU3NHLEVBQVQsRUFBWTt5QkFDOUIvQixPQUFMLENBQWEvQyxFQUFiLENBQWdCVSxTQUFoQixDQUEwQkMsR0FBMUIsQ0FBOEJtRSxFQUE5QjtpQkFEdUIsQ0FFekJyQyxJQUZ5QixDQUVwQixJQUZvQixDQUEzQjs7O2dCQUtBRixhQUFhcEYsRUFBRXlDLE1BQUYsQ0FBUyxLQUFLbUQsT0FBZCxFQUFzQixZQUF0QixDQUFqQjtnQkFDSVIsVUFBSixFQUFlO2tCQUNUZSxJQUFGLENBQU9mLFVBQVAsRUFBa0IsVUFBUzFELEdBQVQsRUFBYU0sSUFBYixFQUFrQjt5QkFDM0I0RCxPQUFMLENBQWEvQyxFQUFiLENBQWdCQyxZQUFoQixDQUE2QmQsSUFBN0IsRUFBa0NOLEdBQWxDO2lCQURjLENBRWhCNEQsSUFGZ0IsQ0FFWCxJQUZXLENBQWxCOzs7aUJBS0NNLE9BQUwsQ0FBYS9CLE1BQWIsR0FBc0IsS0FBSzFCLElBQTNCO2lCQUNLeUQsT0FBTCxDQUFhZ0MsZUFBYixHQUErQixJQUEvQjs7YUFFQ0Msb0JBQUwsR0FBNEIxSSxPQUE1QjtLQXpKOEI7V0EySjVCLGlCQUFVO1lBQ1IsQ0FBQyxLQUFLK0UsYUFBVixFQUF3QjtpQkFDZnRCLEdBQUwsQ0FBUytDLFdBQVQsQ0FBcUIsS0FBS0MsT0FBTCxDQUFhL0MsRUFBbEM7U0FESixNQUdJO2dCQUNJZ0QsWUFBWTFDLEdBQWhCO2lCQUNLNEIsVUFBTCxDQUFnQjFELE9BQWhCLENBQXdCLFVBQVN5RSxTQUFULEVBQW1CWixDQUFuQixFQUFxQjs0QkFDN0JXLFVBQVVyQyxHQUFWLENBQWNzQyxVQUFVakQsRUFBeEIsQ0FBWjswQkFDVWtELEtBQVYsR0FBa0JiLENBQWxCO2FBRm9CLENBR3RCSSxJQUhzQixDQUdqQixJQUhpQixDQUF4QjtnQkFJSU8sVUFBVTFFLE1BQWQsRUFBc0I7cUJBQ2J5QixHQUFMLENBQVMrQyxXQUFULENBQXFCRSxTQUFyQjtxQkFDS2QsVUFBTCxDQUFnQjFELE9BQWhCLENBQXdCLFVBQVN5RSxTQUFULEVBQW1CWixDQUFuQixFQUFxQjs4QkFDL0JjLGNBQVY7aUJBREo7cUJBR0tDLE9BQUwsR0FBZUosVUFBVWhDLE1BQVYsRUFBZjthQUxKLE1BT0k7cUJBQ0tvQyxPQUFMLEdBQWUsS0FBS3JELEdBQUwsQ0FBU2lCLE1BQVQsRUFBZjs7aUJBRUNnQyxTQUFMLEdBQWlCQSxTQUFqQjs7S0EvSzBCO2VBa0x4QixxQkFBVTtZQUNaSyxXQUFXLEVBQWY7YUFDS2hDLGFBQUwsQ0FBbUJpQyxJQUFuQixDQUF3QixVQUFTL0UsS0FBVCxFQUFlOEQsQ0FBZixFQUFpQjtnQkFDakNrQixvQkFBb0IsS0FBS3JCLFVBQUwsQ0FBZ0JzQixNQUFoQixDQUF1QixVQUFTUCxTQUFULEVBQW1CO3VCQUN2REEsVUFBVTFFLEtBQVYsSUFBbUJBLEtBQTFCO2FBRG9CLEVBRXJCLENBRnFCLENBQXhCO2dCQUdJZ0YsaUJBQUosRUFBdUI7eUJBQ1YvRixJQUFULENBQWMrRixrQkFBa0J2RCxFQUFoQzs7O2FBREosTUFLSztvQkFDR3lELGVBQWUsSUFBSSxLQUFLM0IsU0FBVCxDQUFtQjsyQkFDNUJ2RCxLQUQ0Qjs4QkFFekIsS0FBSytDLGFBRm9COzJCQUc1QmUsQ0FINEI7K0JBSXhCLEtBQUtoQixhQUFMLENBQW1CL0MsTUFBbkIsR0FBNEIrRCxDQUE1QixHQUFnQyxDQUpSO2dDQUt2QixLQUFLaEIsYUFMa0I7MEJBTTdCLEtBQUsvQixJQUFMLENBQVV2QixHQUFWLENBQWMsS0FBS2MsR0FBTCxDQUFTUixLQUFULENBQWUsR0FBZixFQUFvQixDQUFwQixDQUFkLEVBQXNDZ0UsQ0FBdEM7aUJBTlUsQ0FBbkI7cUJBUUtILFVBQUwsQ0FBZ0IxRSxJQUFoQixDQUFxQmlHLFlBQXJCO3lCQUNTakcsSUFBVCxDQUFjaUcsYUFBYXpELEVBQTNCOztTQW5CZ0IsQ0FzQnRCeUMsSUF0QnNCLENBc0JqQixJQXRCaUIsQ0FBeEI7YUF1QktXLE9BQUwsQ0FBYU0sS0FBYjtpQkFDU2xGLE9BQVQsQ0FBaUIsVUFBU21GLEtBQVQsRUFBZTtpQkFDdkJQLE9BQUwsQ0FBYVEsTUFBYixDQUFvQkQsS0FBcEI7U0FEYSxDQUVmbEIsSUFGZSxDQUVWLElBRlUsQ0FBakI7YUFHS08sU0FBTCxHQUFpQjFDLEVBQUUrQyxRQUFGLENBQWpCOzthQUVLbkIsVUFBTCxDQUFnQjFELE9BQWhCLENBQXdCLFVBQVN5RSxTQUFULEVBQW1CWixDQUFuQixFQUFxQjtzQkFDL0JjLGNBQVY7U0FESjtLQWpOOEI7aUJBc050Qix1QkFBVTthQUNiQyxPQUFMLENBQWFNLEtBQWI7S0F2TjhCO2tCQXlOckIsd0JBQVU7YUFDZFYsU0FBTCxDQUFlYSxJQUFmLEdBQXNCQyxNQUF0QjthQUNLNUIsVUFBTCxDQUFnQjZCLE1BQWhCLENBQXVCLENBQUMsQ0FBeEIsRUFBMEIsQ0FBMUI7YUFDS2YsU0FBTCxHQUFpQixLQUFLSSxPQUFMLENBQWFDLFFBQWIsRUFBakI7S0E1TjhCO2dCQThOdkIsc0JBQVU7OztLQTlOYTtVQWtPN0IsZ0JBQVU7Ozs7O1lBS1AsS0FBS04sT0FBVCxFQUFpQjs7bUJBRU4sS0FBS3pELElBQUwsQ0FBVVUsRUFBVixDQUFhZ0UsUUFBYixDQUFzQixLQUFLakIsT0FBTCxDQUFhL0MsRUFBYixDQUFnQmEsVUFBdEMsQ0FBUDtTQUZKLE1BSUk7Z0JBQ0lULE9BQU8sSUFBWDtnQkFDSUosS0FBSyxLQUFLVixJQUFMLENBQVVVLEVBQW5CO2lCQUNLZ0QsU0FBTCxDQUFlTSxJQUFmLENBQW9CLFlBQVU7b0JBQ3RCLENBQUN0RCxHQUFHZ0UsUUFBSCxDQUFZLElBQVosQ0FBTCxFQUF3QjVELE9BQU8sS0FBUDthQUQ1QjttQkFHTUEsSUFBUDs7O0NBalBJLENBQWY7O0FDSEE7QUFDQSxBQUVBLG9CQUFlTixVQUFVekQsTUFBVixDQUFpQjtVQUN2QixNQUR1QjtlQUVsQixxQkFBVTthQUNYNEksT0FBTCxHQUFlLEtBQUszRixJQUFMLENBQVVJLFNBQVYsQ0FBb0IzQixHQUFwQixDQUF3QixLQUFLYyxHQUE3QixDQUFmO2FBQ0twQixRQUFMLENBQWMsS0FBSzZCLElBQUwsQ0FBVUksU0FBeEIsRUFBa0MsWUFBVSxLQUFLYixHQUFqRCxFQUFxRCxZQUFVO2lCQUN0RG9HLE9BQUwsR0FBZSxLQUFLM0YsSUFBTCxDQUFVSSxTQUFWLENBQW9CM0IsR0FBcEIsQ0FBd0IsS0FBS2MsR0FBN0IsQ0FBZjtpQkFDS2MsTUFBTDtTQUZKO0tBSndCO1dBU3RCLGlCQUFVO1VBQ1gyRCxJQUFGLENBQU8sS0FBSzJCLE9BQVosRUFBb0IsVUFBU3BHLEdBQVQsRUFBYTVCLElBQWIsRUFBa0I7Z0JBQzlCRSxFQUFFMEMsVUFBRixDQUFhaEIsR0FBYixDQUFKLEVBQXVCQSxNQUFNQSxJQUFJNEQsSUFBSixDQUFTLEtBQUtuRCxJQUFkLENBQU47aUJBQ2xCUyxHQUFMLENBQVNwQyxJQUFULENBQWMsVUFBUVYsSUFBdEIsRUFBMkI0QixHQUEzQjtTQUZnQixDQUdsQjRELElBSGtCLENBR2IsSUFIYSxDQUFwQjtLQVZ5QjtZQWVyQixrQkFBVTtVQUNaYSxJQUFGLENBQU8sS0FBSzJCLE9BQVosRUFBb0IsVUFBU3BHLEdBQVQsRUFBYTVCLElBQWIsRUFBa0I7Z0JBQzlCRSxFQUFFMEMsVUFBRixDQUFhaEIsR0FBYixDQUFKLEVBQXVCQSxNQUFNQSxJQUFJNEQsSUFBSixDQUFTLEtBQUtuRCxJQUFkLENBQU47aUJBQ2xCUyxHQUFMLENBQVNwQyxJQUFULENBQWMsVUFBUVYsSUFBdEIsRUFBMkI0QixHQUEzQjtTQUZnQixDQUdsQjRELElBSGtCLENBR2IsSUFIYSxDQUFwQjs7Q0FoQlEsQ0FBZjs7QUNRQSxJQUFJeUMsV0FBVzthQUNIQyxnQkFERztZQUVKQyxlQUZJO2FBR0hDLGdCQUhHO1VBSU5DLGFBSk07U0FLUEMsWUFMTztjQU1GQyxpQkFORTtrQkFPRUMscUJBUEY7U0FRUEMsWUFSTzthQVNIQyxnQkFURztVQVVOQztDQVZULENBYUE7O0FDeEJBOzs7QUFHQSxBQUNBLEFBSUEsSUFBSUMsc0JBQXNCLENBQUMsT0FBRCxFQUFVLFlBQVYsRUFBd0IsSUFBeEIsRUFBOEIsSUFBOUIsRUFBb0MsWUFBcEMsRUFBa0QsV0FBbEQsRUFBK0QsU0FBL0QsRUFBMEUsUUFBMUUsQ0FBMUI7QUFDQSxJQUFJQyx3QkFBd0IsQ0FBQyxVQUFELEVBQVksZ0JBQVosRUFBNkIsa0JBQTdCLEVBQWdELGdCQUFoRCxFQUFpRSxPQUFqRSxFQUF5RSxXQUF6RSxFQUFxRiw2QkFBckYsQ0FBNUI7QUFDQSxXQUFlM0osU0FBUytDLElBQVQsQ0FBYzdDLE1BQWQsQ0FBcUI7b0JBQ2pCLDBCQUFVOztZQUVqQjBKLENBQUo7WUFBT3hGLElBQUUsRUFBVDtZQUFheUYsT0FBS3hGLFNBQVN5RixnQkFBVCxDQUEwQixLQUFLakcsRUFBL0IsRUFBa0NrRyxXQUFXQyxTQUE3QyxFQUF1RCxJQUF2RCxFQUE0RCxLQUE1RCxDQUFsQjtlQUNNSixJQUFFQyxLQUFLSSxRQUFMLEVBQVI7Y0FBMkI1SSxJQUFGLENBQU91SSxDQUFQO1NBQ3pCLE9BQU94RixDQUFQO0tBTDRCO2lCQVFwQixxQkFBU2pFLE9BQVQsRUFBa0I7Ozs7VUFJeEJnSCxJQUFGLENBQU9uRyxFQUFFa0osVUFBRixDQUFhbEosRUFBRW1KLElBQUYsQ0FBT2hLLE9BQVAsQ0FBYixFQUE2QmEsRUFBRW9KLEtBQUYsQ0FBUVYsbUJBQVIsRUFBNEJDLHFCQUE1QixDQUE3QixDQUFQLEVBQXdGLFVBQVM3SSxJQUFULEVBQWM7b0JBQzFGdUosSUFBUixDQUFhLCtCQUE2QnZKLElBQTFDO1NBREo7O1lBS0ksQ0FBQyxLQUFLd0osR0FBTixJQUFhLENBQUMsS0FBS0MsY0FBdkIsRUFBdUMsTUFBTSxJQUFJdEMsS0FBSixDQUFVLHFCQUFWLENBQU47WUFDbkMsQ0FBQyxLQUFLcUMsR0FBVixFQUFjO2lCQUNMRSxHQUFMLEdBQVd4SixFQUFFeUosUUFBRixDQUFXLEtBQUtDLEtBQWhCLENBQVg7aUJBQ0tKLEdBQUwsR0FBV3RKLEVBQUUySixRQUFGLENBQVcsS0FBS0osY0FBaEIsQ0FBWDtTQUZKLE1BSUk7aUJBQ0tDLEdBQUwsR0FBV3hKLEVBQUV5SixRQUFGLENBQVcsTUFBWCxDQUFYOztVQUVGdkssTUFBRixDQUFTLElBQVQsRUFBZWMsRUFBRTRKLElBQUYsQ0FBT3pLLE9BQVAsRUFBZ0J1SixvQkFBb0JtQixNQUFwQixDQUEyQmxCLHFCQUEzQixDQUFoQixDQUFmOzs7WUFHSSxDQUFDLEtBQUttQixRQUFWLEVBQW9CO29CQUNSNUgsS0FBUixDQUFjLGlDQUFkOzs7VUFHRmlFLElBQUYsQ0FBTyxLQUFLMkQsUUFBWixFQUFxQixVQUFTQyxHQUFULEVBQWE7Z0JBQzFCL0osRUFBRTBDLFVBQUYsQ0FBYXFILEdBQWIsQ0FBSixFQUF1QjlILFFBQVFvSCxJQUFSLENBQWEsNkNBQWI7U0FEM0I7Ozs7Ozs7YUFTS2hGLDJCQUFMLEdBQW1DbEYsV0FBV0EsUUFBUWtGLDJCQUF0RDs7WUFFSTJGLFFBQVFoSyxFQUFFZCxNQUFGLENBQVNjLEVBQUVpSyxLQUFGLENBQVEsS0FBS0gsUUFBYixDQUFULEVBQWlDM0ssV0FBV0EsUUFBUWtGLDJCQUFwQixJQUFvRCxFQUFwRixDQUFaO2dCQUNRNkYsR0FBUixDQUFZLEtBQUs3RiwyQkFBakIsRUFBNkMyRixLQUE3QzthQUNLekgsU0FBTCxHQUFpQixJQUFJdkQsU0FBU0MsS0FBYixDQUFtQitLLEtBQW5CLENBQWpCOzs7OzthQU1LRyxPQUFMLEdBQWUsRUFBZjthQUNLQyxLQUFMLEdBQWEsRUFBYjs7VUFFRWpFLElBQUYsQ0FBTyxLQUFLL0IsUUFBWixFQUFxQixVQUFTaUcsUUFBVCxFQUFrQkMsV0FBbEIsRUFBOEI7Z0JBQzNDLE9BQU9ELFFBQVAsSUFBbUIsUUFBdkIsRUFBaUMsS0FBS0YsT0FBTCxDQUFhRyxXQUFiLElBQTRCRCxRQUE1QixDQUFqQyxLQUNLLElBQUksT0FBT0EsUUFBUCxJQUFtQixVQUF2QixFQUFtQyxLQUFLRCxLQUFMLENBQVdFLFdBQVgsSUFBMEJELFFBQTFCO1NBRnZCLENBR25CL0UsSUFIbUIsQ0FHZCxJQUhjLENBQXJCOzs7Ozs7OztZQVdJLEtBQUtsRSxLQUFULEVBQWU7aUJBQ05kLFFBQUwsQ0FBYyxLQUFLYyxLQUFuQixFQUF5QixRQUF6QixFQUFrQyxLQUFLbUosbUJBQXZDO2lCQUNLakssUUFBTCxDQUFjLEtBQUtjLEtBQW5CLEVBQXlCLFFBQXpCLEVBQWtDLFlBQVU7cUJBQzVDb0osY0FBTCxDQUFvQnhLLEVBQUVkLE1BQUYsQ0FBUyxFQUFULEVBQWFjLEVBQUV5QyxNQUFGLENBQVMsSUFBVCxFQUFlLFlBQWYsQ0FBYixDQUFwQjthQURLOztpQkFJSzhILG1CQUFMLENBQXlCLEtBQUtuSixLQUE5Qjs7O1lBR0E0SSxRQUFRLEtBQUt6SCxTQUFMLENBQWU2QyxVQUEzQjtZQUNJK0QsT0FBT3NCLE9BQU90QixJQUFQLENBQVksS0FBSzVHLFNBQUwsQ0FBZTZDLFVBQTNCLENBQVg7YUFDSy9ELE9BQUwsQ0FBYSxVQUFTQyxHQUFULEVBQWE7Z0JBQ2xCQSxRQUFNLGFBQU4sSUFBdUIsQ0FBQyxLQUFLaUIsU0FBTCxDQUFlNkMsVUFBZixDQUEwQjlELEdBQTFCLENBQTVCLEVBQTJEOzs7OztTQURsRCxDQU1YZ0UsSUFOVyxDQU1OLElBTk0sQ0FBYjs7YUFVS29GLGNBQUw7YUFDS0MsY0FBTDs7YUFJS0MsY0FBTCxHQW5GMEI7YUFvRnJCNUUsY0FBTDs7YUFHS29CLFVBQUwsR0FBa0IsR0FBR0MsS0FBSCxDQUFTeEYsSUFBVCxDQUFjLEtBQUtnQixFQUFMLENBQVF1RSxVQUF0QixFQUFrQyxDQUFsQyxDQUFsQjs7YUFFS3lELFVBQUwsQ0FBZ0IvSixLQUFoQixDQUFzQixJQUF0QixFQUE0QkMsU0FBNUI7S0FqRzRCOztnQkFvR3JCLG9CQUFTNUIsT0FBVCxFQUFpQjs7a0JBRWRBLFdBQVcsRUFBckI7VUFDRUQsTUFBRixDQUFTLElBQVQsRUFBY0MsT0FBZDtLQXZHNEI7a0JBeUduQixzQkFBU3FCLElBQVQsRUFBYzs7WUFFbkIsT0FBTyxLQUFLNEQsUUFBTCxDQUFjNUQsSUFBZCxDQUFQLElBQTZCLFFBQWpDLEVBQTJDLE9BQU8sS0FBS1ksS0FBTCxDQUFXUixHQUFYLENBQWUsS0FBS3dELFFBQUwsQ0FBYzVELElBQWQsQ0FBZixDQUFQLENBQTNDLEtBQ0ssT0FBTyxLQUFLNEQsUUFBTCxDQUFjNUQsSUFBZCxFQUFvQnFCLElBQXBCLENBQXlCLElBQXpCLENBQVA7S0E1R3VCO3lCQThHWiw2QkFBU1QsS0FBVCxFQUFlOztZQUczQjBKLE1BQU0sRUFBVjs7O1VBR0U1TCxNQUFGLENBQVM0TCxHQUFULEVBQWE5SyxFQUFFK0ssU0FBRixDQUFZLEtBQUtaLE9BQWpCLEVBQXlCLFVBQVNFLFFBQVQsRUFBa0I7O21CQUU3QyxLQUFLakosS0FBTCxDQUFXUixHQUFYLENBQWV5SixRQUFmLENBQVA7U0FGa0MsQ0FHcEMvRSxJQUhvQyxDQUcvQixJQUgrQixDQUF6QixDQUFiOztVQU1FcEcsTUFBRixDQUFTNEwsR0FBVCxFQUFhOUssRUFBRStLLFNBQUYsQ0FBWSxLQUFLWCxLQUFqQixFQUF1QixVQUFTWSxJQUFULEVBQWM7Z0JBQzFDQyxNQUFNRCxLQUFLbkosSUFBTCxDQUFVLElBQVYsQ0FBVjttQkFDT29KLEdBQVA7O1NBRmdDLENBSWxDM0YsSUFKa0MsQ0FJN0IsSUFKNkIsQ0FBdkIsQ0FBYjs7YUFRSy9DLFNBQUwsQ0FBZWQsR0FBZixDQUFtQnFKLEdBQW5CO0tBbEk0QjtvQkF3SWpCLDBCQUFVO1lBQ2pCLEtBQUtsSSxHQUFULEVBQWMsS0FBS0EsR0FBTCxDQUFTc0ksSUFBVCxDQUFjLEtBQUtDLGdCQUFMLEVBQWQsRUFBZCxLQUNLO2dCQUNHQyxXQUFXL0gsU0FBU0MsYUFBVCxDQUF1QixLQUF2QixDQUFmO3FCQUNTUCxTQUFULEdBQXFCLEtBQUtvSSxnQkFBTCxFQUFyQjttQkFDTUMsU0FBU2hFLFVBQVQsQ0FBb0JqRyxNQUExQixFQUFpQztxQkFDeEIwQixFQUFMLENBQVFlLFdBQVIsQ0FBb0J3SCxTQUFTaEUsVUFBVCxDQUFvQixDQUFwQixDQUFwQjs7OztLQTlJb0I7b0JBbUpqQiwwQkFBVTs7OzthQUtoQmlFLGlCQUFMLEdBQXlCLEtBQUtDLGNBQUwsRUFBekI7YUFDS0MsZ0JBQUwsR0FBd0IsRUFBeEI7YUFDS0YsaUJBQUwsQ0FBdUJoSyxPQUF2QixDQUErQixVQUFTbUssWUFBVCxFQUFzQjs7O2dCQUc3Q0MsS0FBSyxnQkFBVDtnQkFDSUMsS0FBSjs7Z0JBSUlDLFVBQVUsRUFBZDttQkFDTyxDQUFDRCxRQUFRRCxHQUFHRyxJQUFILENBQVFKLGFBQWFLLFdBQXJCLENBQVQsS0FBK0MsSUFBdEQsRUFBNEQ7d0JBQ2hEeEwsSUFBUixDQUFhcUwsS0FBYjs7O2dCQUdBSSxrQkFBa0JOLFlBQXRCO2dCQUNJTyxnQkFBZ0JQLGFBQWFLLFdBQWpDO2dCQUNJRyxrQkFBa0IsQ0FBdEI7O29CQUVRM0ssT0FBUixDQUFnQixVQUFTcUssS0FBVCxFQUFlO29CQUN2Qk8sVUFBVUgsZ0JBQWdCSSxTQUFoQixDQUEwQlIsTUFBTTNGLEtBQU4sR0FBY2lHLGVBQXhDLENBQWQ7b0JBQ0lHLGNBQWNULE1BQU0sQ0FBTixDQUFsQjt3QkFDUUEsS0FBUixHQUFnQkEsTUFBTSxDQUFOLENBQWhCO3FCQUNLSCxnQkFBTCxDQUFzQmxMLElBQXRCLENBQTJCNEwsT0FBM0I7a0NBQ2tCQSxRQUFRQyxTQUFSLENBQWtCQyxZQUFZaEwsTUFBOUIsQ0FBbEI7Z0NBQ2dCMkssZ0JBQWdCRCxXQUFoQzs7a0NBR2dCSCxNQUFNM0YsS0FBTixHQUFjb0csWUFBWWhMLE1BQTFDLENBVDJCO2FBQWYsQ0FVZG1FLElBVmMsQ0FVVCxJQVZTLENBQWhCO1NBakIyQixDQThCN0JBLElBOUI2QixDQThCeEIsSUE5QndCLENBQS9COzthQWtDSzhHLFNBQUwsR0FBaUIsRUFBakI7O2FBS0ssSUFBSUMsYUFBVCxJQUEwQkMsUUFBMUIsRUFBNEM7Z0JBQ3BDQyxVQUFVRCxTQUFrQkQsYUFBbEIsRUFBaUN4TCxTQUEvQztnQkFDSTBMLG1CQUFtQjVKLFNBQXZCLEVBQWlDOztvQkFDekJYLE9BQU91SyxRQUFRdkssSUFBbkI7b0JBQ0lBLFNBQU8sU0FBUCxJQUFvQkEsU0FBTyxLQUEvQixFQUFxQzt3QkFDN0J3SyxXQUFZLEtBQUs1SixHQUFOLEdBQVdPLEVBQUVzSixTQUFGLENBQVksS0FBSzdKLEdBQUwsQ0FBUzhKLElBQVQsQ0FBYyxTQUFPMUssSUFBUCxHQUFZLEdBQTFCLENBQVosQ0FBWCxHQUF1RG1CLEVBQUVzSixTQUFGLENBQVl0SixFQUFFLEtBQUtOLEVBQUwsQ0FBUThKLGdCQUFSLENBQXlCLFNBQU8zSyxJQUFQLEdBQVksR0FBckMsQ0FBRixDQUFaLENBQXRFOzt3QkFFSXdLLFNBQVNyTCxNQUFiLEVBQXFCOzZCQUNaaUwsU0FBTCxDQUFlcEssSUFBZixJQUF1QndLLFNBQVN4SCxHQUFULENBQWEsVUFBUzRILE9BQVQsRUFBaUIxSCxDQUFqQixFQUFtQnNILFFBQW5CLEVBQTRCOzttQ0FFckQsSUFBSUYsU0FBa0JELGFBQWxCLENBQUosQ0FBcUM7c0NBQ25DLElBRG1DO29DQUVyQ08sT0FGcUM7cUNBR3BDQSxRQUFRMUosWUFBUixDQUFxQixRQUFNbEIsSUFBM0I7NkJBSEQsQ0FBUDt5QkFGZ0MsQ0FPbENzRCxJQVBrQyxDQU83QixJQVA2QixDQUFiLENBQXZCOztpQkFKUixNQWNJOzs7Ozs7Ozs7Ozs7YUFjTmlHLGdCQUFMLENBQXNCbEssT0FBdEIsQ0FBOEIsVUFBU3dMLGNBQVQsRUFBd0I7Z0JBQy9DL0ksT0FBTytJLGVBQWVuQixLQUFmLENBQXFCeEssS0FBckIsQ0FBMkIsR0FBM0IsQ0FBWDtnQkFDSTRDLEtBQUszQyxNQUFMLElBQWEsQ0FBakIsRUFBbUI7b0JBQ1gsQ0FBQyxLQUFLaUwsU0FBTCxDQUFlLFNBQWYsQ0FBTCxFQUFnQyxLQUFLQSxTQUFMLENBQWUsU0FBZixJQUE0QixFQUE1QjtxQkFDM0JBLFNBQUwsQ0FBZSxTQUFmLEVBQTBCL0wsSUFBMUIsQ0FBK0IsSUFBSWlNLFNBQWtCLFNBQWxCLENBQUosQ0FBaUM7MEJBQ3ZELElBRHVEO3dCQUV6RE8sY0FGeUQ7eUJBR3hEQSxlQUFlbkI7aUJBSFEsQ0FBL0I7YUFGSixNQVFJO29CQUNJLENBQUMsS0FBS1UsU0FBTCxDQUFlLEtBQWYsQ0FBTCxFQUE0QixLQUFLQSxTQUFMLENBQWUsS0FBZixJQUF3QixFQUF4QjtxQkFDdkJBLFNBQUwsQ0FBZSxLQUFmLEVBQXNCL0wsSUFBdEIsQ0FBMkIsSUFBSWlNLFNBQWtCLEtBQWxCLENBQUosQ0FBNkI7MEJBQy9DLElBRCtDO3dCQUVqRE8sY0FGaUQ7eUJBR2hEQSxlQUFlbkI7aUJBSEksQ0FBM0I7O1NBWnVCLENBa0I3QnBHLElBbEI2QixDQWtCeEIsSUFsQndCLENBQTlCOzs7Ozs7Ozs7Ozs7Ozs7S0FqTzJCO3NCQTRRZiw0QkFBVTtZQUNuQixLQUFLZ0UsR0FBVCxFQUFjO21CQUNIdEosQ0FBUCxHQUFXQSxDQUFYO21CQUNPLEtBQUtzSixHQUFMLENBQVMsS0FBSy9HLFNBQUwsQ0FBZTZDLFVBQXhCLENBQVA7U0FGSixNQUlLLE9BQU9wRixFQUFFMkosUUFBRixDQUFXLEtBQUtKLGNBQWhCLEVBQWdDLEtBQUtoSCxTQUFMLENBQWU2QyxVQUEvQyxDQUFQO0tBalJ1QjtvQkFtUmhCLHdCQUFTMEgsTUFBVCxFQUFpQjs7WUFDekJDLHdCQUF3QixnQkFBNUI7bUJBQ1dELFNBQVM5TSxFQUFFeUMsTUFBRixDQUFTLElBQVQsRUFBZSxRQUFmLENBQXBCO1lBQ0ksQ0FBQ3FLLE1BQUwsRUFBYSxPQUFPLElBQVA7YUFDUkUsZ0JBQUw7YUFDSyxJQUFJMUwsR0FBVCxJQUFnQndMLE1BQWhCLEVBQXdCO2dCQUNoQkcsU0FBU0gsT0FBT3hMLEdBQVAsQ0FBYjtnQkFDSSxDQUFDdEIsRUFBRTBDLFVBQUYsQ0FBYXVLLE1BQWIsQ0FBTCxFQUEyQkEsU0FBUyxLQUFLSCxPQUFPeEwsR0FBUCxDQUFMLENBQVQ7Z0JBQ3ZCLENBQUMyTCxNQUFMLEVBQWEsTUFBTSxJQUFJaEcsS0FBSixDQUFVLGFBQWE2RixPQUFPeEwsR0FBUCxDQUFiLEdBQTJCLGtCQUFyQyxDQUFOO2dCQUNUb0ssUUFBUXBLLElBQUlvSyxLQUFKLENBQVVxQixxQkFBVixDQUFaO2dCQUNJRyxhQUFheEIsTUFBTSxDQUFOLEVBQVN4SyxLQUFULENBQWUsR0FBZixDQUFqQjtnQkFBc0NpTSxXQUFXekIsTUFBTSxDQUFOLENBQWpEO3FCQUNTMUwsRUFBRXNGLElBQUYsQ0FBTzJILE1BQVAsRUFBZSxJQUFmLENBQVQ7Z0JBQ0lHLE9BQU8sSUFBWDtjQUNFRixVQUFGLEVBQWMvRyxJQUFkLENBQW1CLFVBQVNrSCxTQUFULEVBQW9COzZCQUN0QixvQkFBb0JELEtBQUs1RCxHQUF0QztvQkFDSTJELGFBQWEsRUFBakIsRUFBcUI7eUJBQ2hCdkssR0FBTCxDQUFTMEMsSUFBVCxDQUFjK0gsU0FBZCxFQUF5QkosTUFBekI7aUJBREEsTUFFTzt5QkFDRXJLLEdBQUwsQ0FBUzBLLFFBQVQsQ0FBa0JILFFBQWxCLEVBQTRCRSxTQUE1QixFQUF1Q0osTUFBdkM7O2FBTFI7O0tBaFN3QjtZQTBTekIsa0JBQVUsRUExU2U7O2FBa1R4Qk0sU0FsVHdCO29CQW1UakIsRUFuVGlCO3NCQW9UZixFQXBUZTtvQkFxVGQsMEJBQVc7O1lBRWpCLENBQUMsS0FBSzFLLEVBQVYsRUFBYztnQkFDUCxLQUFLdUMsVUFBTCxJQUFtQixLQUFLb0ksRUFBeEIsSUFBOEIsS0FBS0MsU0FBbkMsSUFBZ0QsS0FBSzNJLE9BQXhELEVBQWdFOztvQkFDcERrRixRQUFRaEssRUFBRWQsTUFBRixDQUFTLEVBQVQsRUFBYWMsRUFBRXlDLE1BQUYsQ0FBUyxJQUFULEVBQWUsWUFBZixDQUFiLENBQVo7b0JBQ0ksS0FBSytLLEVBQVQsRUFBYXhELE1BQU13RCxFQUFOLEdBQVd4TixFQUFFeUMsTUFBRixDQUFTLElBQVQsRUFBZSxJQUFmLENBQVg7b0JBQ1QsS0FBS2dMLFNBQVQsRUFBb0J6RCxNQUFNLE9BQU4sSUFBaUJoSyxFQUFFeUMsTUFBRixDQUFTLElBQVQsRUFBZSxXQUFmLENBQWpCO3FCQUNmaUwsVUFBTCxDQUFnQixLQUFLQyxjQUFMLENBQW9CM04sRUFBRXlDLE1BQUYsQ0FBUyxJQUFULEVBQWUsU0FBZixLQUE2QixLQUFqRCxDQUFoQjtxQkFDSytILGNBQUwsQ0FBb0JSLEtBQXBCO2FBTFIsTUFPSTs7cUJBQ0tuSCxFQUFMLEdBQVVRLFNBQVN1SyxzQkFBVCxFQUFWOztTQVRSLE1BV087aUJBQ0VGLFVBQUwsQ0FBZ0IxTixFQUFFeUMsTUFBRixDQUFTLElBQVQsRUFBZSxJQUFmLENBQWhCOztLQW5Vb0I7U0FzVTVCLGFBQVNxSSxHQUFULEVBQWE7YUFDUnZJLFNBQUwsQ0FBZWQsR0FBZixDQUFtQnFKLEdBQW5CO0tBdlU0QjtTQXlVNUIsYUFBU2hMLElBQVQsRUFBYztlQUNQLEtBQUt5QyxTQUFMLENBQWUzQixHQUFmLENBQW1CZCxJQUFuQixDQUFQOztDQTFVTyxDQUFmOztBQ1ZBOzs7O0FBSUEsQUFDQSxBQUNBLEFBQ0EsQUFHQSxJQUFJOEIsV0FBUyxFQUFDM0MsWUFBRCxFQUFRa0Isc0JBQVIsRUFBb0I0QixVQUFwQixFQUEwQnVLLDJCQUExQixFQUFiO0FBQ0ExSyxTQUFPLElBQVAsSUFBZSxPQUFmOztBQUVBLElBQUksT0FBT3RDLE1BQVAsS0FBZ0IsV0FBcEIsRUFBaUNBLE9BQU9zQyxNQUFQLEdBQWdCQSxRQUFoQjtBQUNqQyxJQUFJLE9BQU9pTSxNQUFQLEtBQWdCLFdBQXBCLEVBQWlDQSxPQUFPak0sTUFBUCxHQUFnQkEsUUFBaEI7OyJ9
