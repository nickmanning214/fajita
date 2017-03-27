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

    if (_.isString(attr)) {
      var props = attr.split("->");
      if (props.length > 1) {
        var model = this;
        props.slice(1).forEach(function (prop) {
          if (model.structure[prop]) model = model.structure[prop];
        });
        return model;
      }
    } else {
      var get = Backbone.Model.prototype.get.apply(this, arguments);
      if (!_.isUndefined(get)) return get;
    }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFqaXRhLmpzIiwic291cmNlcyI6WyJNb2RlbC5qcyIsIkNvbGxlY3Rpb24uanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1jb250ZW50LmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1lbmFibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRpc2FibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWhyZWYuanMiLCJkaXJlY3RpdmUvYWJzdHJhY3Qtc3Vidmlldy5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtbWFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1vcHRpb25hbC5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtb3B0aW9uYWx3cmFwLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1zcmMuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLXN1YnZpZXcuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRhdGEuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnkuanMiLCJWaWV3LmpzIiwiQmFzZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5cblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgXG4gIGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgaWYgKCB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSBcInVuZGVmaW5lZFwiICl7XG4gICAgICB0aGlzLnF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICB9XG5cbiAgIFxuXG4gICAgLy9uZXdcbiAgICB0aGlzLnN0cnVjdHVyZSA9IHt9O1xuXG4gICAgdGhpcy5wYXJlbnRNb2RlbHMgPSBbXTtcbiAgICB0aGlzLmluaXQoKTtcbiAgfSxcbiAgaW5pdDpmdW5jdGlvbigpe30sXG4gIFxuICBnZXQ6ZnVuY3Rpb24oYXR0cil7XG5cbiAgICBpZiAoXy5pc1N0cmluZyhhdHRyKSl7XG4gICAgICB2YXIgcHJvcHMgPSBhdHRyLnNwbGl0KFwiLT5cIik7XG4gICAgICBpZiAocHJvcHMubGVuZ3RoID4gMSl7XG4gICAgICAgIHZhciBtb2RlbCA9IHRoaXM7XG4gICAgICAgIHByb3BzLnNsaWNlKDEpLmZvckVhY2goZnVuY3Rpb24ocHJvcCl7XG4gICAgICAgICAgaWYgKG1vZGVsLnN0cnVjdHVyZVtwcm9wXSkgbW9kZWwgPSBtb2RlbC5zdHJ1Y3R1cmVbcHJvcF07XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICB2YXIgZ2V0ID0gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLmdldC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG4gICAgICBpZiAoIV8uaXNVbmRlZmluZWQoZ2V0KSkgcmV0dXJuIGdldDtcbiAgICB9XG4gICAgXG5cbiBcbiAgIFxuICAgXG4gIH0sXG4gIHRvZ2dsZTpmdW5jdGlvbihrZXksdmFsMSx2YWwyKXtcbiAgICBpZiAodGhpcy5nZXQoa2V5KT09dmFsMil7XG4gICAgICB0aGlzLnNldChrZXksdmFsMSk7XG4gICAgfVxuICAgIGVsc2UgdGhpcy5zZXQoa2V5LHZhbDIpO1xuICB9LFxuICBzZXQ6ZnVuY3Rpb24oYXR0ciwgdmFsLCBvcHRpb25zKXtcbiAgIFxuICAgIC8qXG4gICAgZ2V0IGNvZGUuLi5JIHdhbnQgc2V0IGNvZGUgdG8gbWlycm9yIGdldCBjb2RlXG4gICAgKi9cbiAgICBpZiAoXy5pc1N0cmluZyhhdHRyKSl7XG4gICAgICB2YXIgcHJvcHMgPSBhdHRyLnNwbGl0KFwiLT5cIik7XG4gICAgICBpZiAocHJvcHMubGVuZ3RoID4gMSl7XG4gICAgICAgIHZhciBtb2RlbCA9IHRoaXM7XG4gICAgICAgIHByb3BzLnNsaWNlKDEpLmZvckVhY2goZnVuY3Rpb24ocHJvcCxpLHByb3BzKXtcbiAgICAgICAgICBpZiAobW9kZWwuc3RydWN0dXJlW3Byb3BdKSBtb2RlbCA9IG1vZGVsLnN0cnVjdHVyZVtwcm9wXTtcbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBuZXdNb2RlbDtcbiAgICAgICAgICAgIGlmIChpIDwgcHJvcHMubGVuZ3RoIC0gMSl7XG4gICAgICAgICAgICAgIG5ld01vZGVsID0gbmV3IEZhaml0YS5Nb2RlbDsgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgIG5ld01vZGVsID0gKF8uaXNBcnJheSh2YWwpKT9uZXcgRmFqaXRhLkNvbGxlY3Rpb24odmFsKTpuZXcgRmFqaXRhLk1vZGVsKHZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdNb2RlbC5wYXJlbnRNb2RlbHMucHVzaChtb2RlbCk7XG4gICAgICAgICAgICBtb2RlbC5zdHJ1Y3R1cmVbcHJvcF0gPSBuZXdNb2RlbDtcbiAgICAgICAgICAgIG1vZGVsLmxpc3RlblRvKG5ld01vZGVsLFwiY2hhbmdlIGFkZFwiLGZ1bmN0aW9uKG5ld01vZGVsLG9wdGlvbnMpe1xuICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJjaGFuZ2VcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgLyogVE9ETzogaW52ZW50IGVudGlyZSBzeXN0ZW0gZm9yIHRyYXZlcnNpbmcgYW5kIGZpcmluZyBldmVudHMuIFByb2JhYmx5IG5vdCB3b3J0aCB0aGUgZWZmb3J0IGZvciBub3cuXG4gICAgICAgICAgICAgIE9iamVjdC5rZXlzKG1vZGVsLmNoYW5nZWRBdHRyaWJ1dGVzKCkpLmZvckVhY2goZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJjaGFuZ2U6XCIrcHJvcCtcIi5cIitrZXkpXG4gICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICovXG5cblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgXG5cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtb2RlbDtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuc2V0LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcbiAgICB9XG5cblxuICAgICAgXG4gICAgIFxuICB9XG4gIC8vTm90ZTogdGhlcmUgaXMgc3RpbGwgbm8gbGlzdGVuZXIgZm9yIGEgc3VibW9kZWwgb2YgYSBjb2xsZWN0aW9uIGNoYW5naW5nLCB0cmlnZ2VyaW5nIHRoZSBwYXJlbnQuIEkgdGhpbmsgdGhhdCdzIHVzZWZ1bC5cbn0pOyIsIi8qaW1wb3J0IF8gZnJvbSBcInVuZGVyc2NvcmVcIjsqL1xuLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbmltcG9ydCBNb2RlbCBmcm9tIFwiLi9Nb2RlbFwiO1xuXG5leHBvcnQgZGVmYXVsdCBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgbW9kZWw6TW9kZWwsIC8vcHJvYmxlbTogTW9kZWwgcmVsaWVzIG9uIGNvbGxlY3Rpb24gYXMgd2VsbCBjYXVzaW5nIGVycm9yXG4gICAgaW5pdGlhbGl6ZTpmdW5jdGlvbigpe1xuICAgICAgICAgdGhpcy5wYXJlbnRNb2RlbHMgPSBbXTtcbiAgICAgICAgLy90cmlnZ2VyIFwidXBkYXRlXCIgd2hlbiBzdWJtb2RlbCBjaGFuZ2VzXG4gICAgICAgIHRoaXMub24oXCJhZGRcIixmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgICAgICB0aGlzLmxpc3RlblRvKG1vZGVsLFwiY2hhbmdlXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJ1cGRhdGVcIik7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbn0pOyIsIi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5cbmV4cG9ydCBkZWZhdWx0IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcbiAgICBuYW1lOm51bGwsXG4gICAgYnVpbGQ6bnVsbCxcbiAgICByZW5kZXI6bnVsbCxcbiAgICBpbml0aWFsaXplOmZ1bmN0aW9uKG9wdGlvbnMpe1xuICAgICAgICBpZiAoIXRoaXMubmFtZSkgY29uc29sZS5lcnJvcihcIkVycm9yOiBEaXJlY3RpdmUgcmVxdWlyZXMgYSBuYW1lIGluIHRoZSBwcm90b3R5cGUuXCIpO1xuICAgICAgICB0aGlzLnZhbCA9IG9wdGlvbnMudmFsO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vdmlldyBpcyB0aGUgdmlldyB0aGF0IGltcGxlbWVudHMgdGhpcyBkaXJlY3RpdmUuXG4gICAgICAgIGlmICghb3B0aW9ucy52aWV3KSBjb25zb2xlLmVycm9yKFwiRXJyb3I6IERpcmVjdGl2ZSByZXF1aXJlcyBhIHZpZXcgcGFzc2VkIGFzIGFuIG9wdGlvbi5cIik7XG4gICAgICAgIHRoaXMudmlldyA9IG9wdGlvbnMudmlldztcbiAgICAgICAgaWYgKCF0aGlzLmNoaWxkSW5pdCkgY29uc29sZS5lcnJvcihcIkVycm9yOiBEaXJlY3RpdmUgcmVxdWlyZXMgY2hpbGRJbml0IGluIHByb3RvdHlwZS5cIik7XG4gICAgICAgIHRoaXMuY2hpbGRJbml0KCk7XG4gICAgICAgIHRoaXMuYnVpbGQoKTtcbiAgICB9LFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgIFxuICAgICAgICB0aGlzLnVwZGF0ZVJlc3VsdCgpO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMudmlldy52aWV3TW9kZWwsXCJjaGFuZ2U6XCIrdGhpcy52YWwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUmVzdWx0KCk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9KTtcblxuICAgIH0sXG4gICAgdXBkYXRlUmVzdWx0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciByZXN1bHQgPSB0aGlzLnZpZXcuZ2V0KHRoaXMudmFsKTtcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihyZXN1bHQpKSB0aGlzLnJlc3VsdCA9IHJlc3VsdC5jYWxsKHRoaXMudmlldyk7XG4gICAgICAgIGVsc2UgdGhpcy5yZXN1bHQgPSByZXN1bHQ7XG4gICAgfVxufSk7IiwiaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuLy9Ob3RlOiBEb24ndCB1c2UgLmh0bWwoKSBvciAuYXR0cigpIGpxdWVyeS4gSXQncyB3ZWlyZCB3aXRoIGRpZmZlcmVudCB0eXBlcy5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJjb250ZW50XCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMuJGVsLnByb3AoXCJ0YWdOYW1lXCIpPT1cIklNR1wiKSB0aGlzLmVsLnNldEF0dHJpYnV0ZShcInRpdGxlXCIsdGhpcy5yZXN1bHQpXG4gICAgICAgIGVsc2UgdGhpcy5lbC5pbm5lckhUTUwgPSB0aGlzLnJlc3VsdDtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmJ1aWxkKCk7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgdmFyIHBhc3MgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuJGVsLnByb3AoXCJ0YWdOYW1lXCIpPT1cIklNR1wiKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5lbC5nZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiKT09dmFsdWUgKyBcIlwiKSBwYXNzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLmVsLmlubmVySFRNTD09dmFsdWUrXCJcIikgcGFzcyA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcGFzcztcbiAgICB9XG59KTsiLCIvL1doeSBkb2VzIHVuZGVyc2NvcmUgd29yayBoZXJlP1xuXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiZW5hYmxlXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCkgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIix0cnVlKTtcbiAgICAgICAgZWxzZSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLFwiXCIpO1xuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsdHJ1ZSk7XG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIixcIlwiKTtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICByZXR1cm4gJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIikhPXZhbHVlO1xuICAgIH1cbn0pO1xuIiwiLy9XaHkgZG9lcyB1bmRlcnNjb3JlIHdvcmsgaGVyZT9cblxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcImRpc2FibGVcIixcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy5yZXN1bHQpICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsdHJ1ZSk7XG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIixcIlwiKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy5yZXN1bHQpICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsdHJ1ZSk7XG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIixcIlwiKTtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICByZXR1cm4gJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIik9PXZhbHVlO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcImhyZWZcIixcbiAgIFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJBXCIpIHRoaXMuJGVsLmF0dHIoXCJocmVmXCIsdGhpcy5yZXN1bHQpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XG4gICAgICAgICAgICBhLmNsYXNzTGlzdC5hZGQoXCJ3cmFwcGVyLWFcIilcbiAgICAgICAgICAgIGEuc2V0QXR0cmlidXRlKFwiaHJlZlwiLHRoaXMucmVzdWx0KTtcbiAgICAgICAgICAgIHRoaXMud3JhcHBlckEgPSBhO1xuICAgICAgICAgICAgdGhpcy5lbC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZCh0aGlzLndyYXBwZXJBLHRoaXMuZWwpXG4gICAgICAgICAgICAvL2Nhbid0IHNpbXBseSB1c2UgdGhpcy4kZWwud3JhcChhKTtcbiAgICAgICAgICAgIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy81NzA3MzI4L3dyYXAtb25lLWVsZW1lbnQtd2l0aC1hbm90aGVyLXJldGFpbmluZy1yZWZlcmVuY2UtdG8td3JhcHBlclxuICAgICAgICAgICAgdGhpcy53cmFwcGVyQS5hcHBlbmRDaGlsZCh0aGlzLmVsKTtcbiAgICAgICAgfVxuICAgICAgICB3aW5kb3cud3JhcHBlckEgPSB0aGlzLndyYXBwZXJBO1xuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJBXCIpICQodGhpcy5lbCkuYXR0cihcImhyZWZcIix0aGlzLnJlc3VsdClcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLndyYXBwZXJBLnNldEF0dHJpYnV0ZShcImhyZWZcIix0aGlzLnJlc3VsdCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSByZXR1cm4gJCh0aGlzLmVsKS5hdHRyKFwiaHJlZlwiKT09dmFsdWVcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gJCh0aGlzLmVsKS5wYXJlbnQoKS5wcm9wKFwidGFnTmFtZVwiKT09XCJBXCIgJiYgJCh0aGlzLmVsKS5wYXJlbnQoKS5hdHRyKFwiaHJlZlwiKT09dmFsdWVcbiAgICAgICAgfVxuICAgIH1cbn0pOyIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJhYnN0cmFjdHN1YnZpZXdcIixcbiAgICBfaW5pdGlhbGl6ZUJhY2tib25lT2JqZWN0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBhcmdzID0gdGhpcy52YWwuc3BsaXQoXCI6XCIpO1xuICAgICAgICB0aGlzLnN1YlZpZXdOYW1lID0gYXJnc1swXTtcbiAgICAgICAgIGlmIChhcmdzWzFdKXtcbiAgICAgICAgICAgIHRoaXMuc3ViTW9kZWxOYW1lID0gYXJnc1sxXTtcbiAgICAgICAgICAgIHZhciBtb2RlbCA9IHRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSk7IC8vY2hhbmdlZCBmcm9tIHN1Yk1vZGVsTmFtZS5cbiAgICAgICAgICAgIGlmIChtb2RlbCBpbnN0YW5jZW9mIEJhY2tib25lLk1vZGVsKSB0aGlzLnN1Yk1vZGVsID0gbW9kZWw7XG4gICAgICAgICAgICBlbHNlIGlmIChtb2RlbCBpbnN0YW5jZW9mIEJhY2tib25lLkNvbGxlY3Rpb24pIHRoaXMuc3ViQ29sbGVjdGlvbiA9IG1vZGVsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKChtb2RlbCBpbnN0YW5jZW9mIEJhY2tib25lLk1vZGVsKSwobW9kZWwgaW5zdGFuY2VvZiBCYWNrYm9uZS5Db2xsZWN0aW9uKSx0aGlzLnN1YkNvbGxlY3Rpb24pXG4gICAgICAgICAgICAvL2RlYnVnZ2VyO1xuICAgICAgICAgfVxuICAgIH0sXG4gICAgX2luaXRpYWxpemVDaGlsZE1hcHBpbmdzOmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vVGhlIEpTT04gb2JqZWN0IHRvIHBhc3MgYXMgXCJtYXBwaW5nc1wiIHRvIHRoZSBzdWJ2aWV3IG9yIHRoZSBpdGVtIGluIHRoZSBzdWJDb2xsZWN0aW9uLlxuICAgICAgICAgLy9EbyBub3Qgc2hvcnRlbiB0byB2aWV3LmdldC4gdmlldy5nZXQgZ2V0cyBmcm9tIHRoZSB2aWV3TW9kZWwgd2hpY2ggY29udGFpbnMgcHJvcHMgYW5kIHZhbHVlcy4uLm5vdCB2aWV3IHByb3BzIGFuZCBhcHAgcHJvcHNcbiAgICAgICAgdGhpcy5jaGlsZE1hcHBpbmdzID0gdGhpcy52aWV3Lm1hcHBpbmdzICYmIHRoaXMudmlldy5tYXBwaW5nc1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICB9LFxuICAgIF9pbml0aWFsaXplT3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoOmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vTm90IHNob3J0ZW5lZCB0byB2aWV3LmdldCBiZWNhdXNlIEknbSBub3Qgc3VyZSBpZiBpdCBpcyB1c2VmdWwgdG8gZG8gc28uXG4gICAgICAgIC8vdmlldy5nZXQgZ2V0cyB0aGUgYXBwIHZhbHVlIG1hcHBlZCB0byB0aGUgZGVmYXVsdCB2YWx1ZSwgYW5kIGlmIG5vdCB0aGVuIGl0IGdldHMgdGhlIGRlZmF1bHQgdmFsdWUuXG4gICAgICAgIC8vSSB0aGluayB5b3UncmUganVzdCBvdmVycmlkaW5nIGRlZmF1bHRzIHdpdGggZGVmYXVsdHMsIGFuZCBub3RoaW5nIGZhbmNpZXIgdGhhbiB0aGF0LlxuICAgICAgICAvL3RoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoID0gdGhpcy52aWV3LmRlZmF1bHRzICYmIHRoaXMudmlldy5kZWZhdWx0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgLy9OZXZlcm1pbmQgaXQgaXMgdXNlZnVsIHRvIHVzZSAuZ2V0IGJlY2F1c2UgaWYgdGhlcmUgYXJlIG5lc3RlZCBuZXN0ZWQgdmlld3MsIHlvdSBjYW4ndCBqdXN0IGdvIHRvIHRoZSBkZWZhdWx0cyBvZiB0aGF0IHZpZXcuIFRoZXkgbWlnaHQgYmUgb3ZlcnJpZGRlbi5cblxuICAgICAgICB0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCA9IHRoaXMudmlldy5nZXQodGhpcy5zdWJWaWV3TmFtZSk7XG4gICAgfSxcblxuXG5cbiAgICBfaW5pdGlhbGl6ZUNoaWxkVmlld3M6ZnVuY3Rpb24oKXtcblxuICAgIH1cbn0pIiwiLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5pbXBvcnQgQWJzdHJhY3RTdWJ2aWV3IGZyb20gXCIuL2Fic3RyYWN0LXN1YnZpZXdcIlxuZXhwb3J0IGRlZmF1bHQgQWJzdHJhY3RTdWJ2aWV3LmV4dGVuZCh7XG4gICAgbmFtZTpcIm1hcFwiLFxuICAgIF9pbml0aWFsaXplQ2hpbGRWaWV3czpmdW5jdGlvbigpe1xuXG5cblxuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcImFkZFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnJlbmRlckFkZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcInJlc2V0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyUmVzZXQoKTtcbiAgICAgICAgfSlcblxuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcInJlbW92ZVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclJlbW92ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcInNvcnRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJTb3J0KCk7ICAgICAgICBcbiAgICAgICAgfSk7XG5cblxuXG4gICAgICAgIC8vTWFwIG1vZGVscyB0byBjaGlsZFZpZXcgaW5zdGFuY2VzIHdpdGggdGhlaXIgbWFwcGluZ3NcbiAgICAgICAgdGhpcy5DaGlsZFZpZXcgPSB0aGlzLnZpZXcuY2hpbGRWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdPcHRpb25zID0ge1xuICAgICAgICAgICAgbWFwcGluZ3M6dGhpcy5jaGlsZE1hcHBpbmdzLFxuICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICB0YWdOYW1lOnRoaXMudmlldy5jaGlsZFZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLnByb3RvdHlwZS50YWdOYW1lIHx8IFwic3ViaXRlbVwiLFxuICAgICAgICAgICAgb3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoOnRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoXG4gICAgICAgIH07XG5cblxuICAgICAgICB0aGlzLmNoaWxkVmlld3MgPSB0aGlzLnN1YkNvbGxlY3Rpb24ubWFwKGZ1bmN0aW9uKGNoaWxkTW9kZWwsaSl7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBjaGlsZFZpZXdPcHRpb25zID0gXy5leHRlbmQoe30sdGhpcy5jaGlsZFZpZXdPcHRpb25zLHtcbiAgICAgICAgICAgICAgICBtb2RlbDpjaGlsZE1vZGVsLFxuICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgbGFzdEluZGV4OnRoaXMuc3ViQ29sbGVjdGlvbi5sZW5ndGggLSBpIC0gMSxcbiAgICAgICAgICAgICAgICBvdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2g6dGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2ggJiYgdGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2gubW9kZWxzW2ldICYmIHRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoLm1vZGVsc1tpXS5hdHRyaWJ1dGVzLFxuICAgICAgICAgICAgICAgIC8vSnVzdCBhZGRlZCBjaGVjayBmb3IgdGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2gubW9kZWxzW2ldXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGNoaWxkdmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyhjaGlsZFZpZXdPcHRpb25zKTtcbiAgICAgICAgICAgIC8vY2hpbGR2aWV3Ll9zZXRBdHRyaWJ1dGVzKF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChjaGlsZHZpZXcsICdhdHRyaWJ1dGVzJykpKTtcbiAgICAgICAgICAgIHJldHVybiBjaGlsZHZpZXc7XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICB9LFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQmFja2JvbmVPYmplY3QoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3MoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZU92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCgpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQ2hpbGRWaWV3cygpO1xuXG4gICAgICAgIFxuICAgICAgXG5cbiAgICAgICAgXG4gICAgICAgIFxuXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgXG4gICAgfSxcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMuc3ViQ29sbGVjdGlvbil7XG4gICAgICAgICAgICB0aGlzLiRlbC5yZXBsYWNlV2l0aCh0aGlzLnN1YlZpZXcuZWwpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB2YXIgJGNoaWxkcmVuID0gJCgpO1xuICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgICAgICRjaGlsZHJlbiA9ICRjaGlsZHJlbi5hZGQoY2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgICAgIGNoaWxkVmlldy5pbmRleCA9IGk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgaWYgKCRjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRlbC5yZXBsYWNlV2l0aCgkY2hpbGRyZW4pO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aGlzLiRwYXJlbnQgPSAkY2hpbGRyZW4ucGFyZW50KClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gdGhpcy4kZWwucGFyZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbiA9ICRjaGlsZHJlblxuICAgICAgICB9XG4gICAgfSxcbiAgICByZW5kZXJBZGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gW107XG4gICAgICAgIHRoaXMuc3ViQ29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKG1vZGVsLGkpe1xuICAgICAgICAgICAgdmFyIGV4aXN0aW5nQ2hpbGRWaWV3ID0gdGhpcy5jaGlsZFZpZXdzLmZpbHRlcihmdW5jdGlvbihjaGlsZFZpZXcpe1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZFZpZXcubW9kZWwgPT0gbW9kZWxcbiAgICAgICAgICAgIH0pWzBdO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nQ2hpbGRWaWV3KSB7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaChleGlzdGluZ0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICAvL3ZhciBhdHRyaWJ1dGVzID0gXy5leHRlbmQoe30sIF8ucmVzdWx0KGV4aXN0aW5nQ2hpbGRWaWV3LCAnYXR0cmlidXRlcycpKVxuICAgICAgICAgICAgICAgIC8vZXhpc3RpbmdDaGlsZFZpZXcuX3NldEF0dHJpYnV0ZXMoYXR0cmlidXRlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3Q2hpbGRWaWV3ID0gbmV3IHRoaXMuQ2hpbGRWaWV3KHtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWw6bW9kZWwsXG4gICAgICAgICAgICAgICAgICAgIG1hcHBpbmdzOnRoaXMuY2hpbGRNYXBwaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdEluZGV4OnRoaXMuc3ViQ29sbGVjdGlvbi5sZW5ndGggLSBpIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLnN1YkNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6dGhpcy52aWV3LmdldCh0aGlzLnZhbC5zcGxpdChcIjpcIilbMF0pW2ldXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MucHVzaChuZXdDaGlsZFZpZXcpO1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2gobmV3Q2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpe1xuICAgICAgICAgICAgdGhpcy4kcGFyZW50LmFwcGVuZChjaGlsZClcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9ICQoY2hpbGRyZW4pXG4gICAgICAgIFxuICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICBjaGlsZFZpZXcuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgfSlcblxuICAgIH0sXG4gICAgcmVuZGVyUmVzZXQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kcGFyZW50LmVtcHR5KCk7XG4gICAgfSxcbiAgICByZW5kZXJSZW1vdmU6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4ubGFzdCgpLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmNoaWxkVmlld3Muc3BsaWNlKC0xLDEpO1xuICAgICAgICB0aGlzLiRjaGlsZHJlbiA9IHRoaXMuJHBhcmVudC5jaGlsZHJlbigpO1xuICAgIH0sXG4gICAgcmVuZGVyU29ydDpmdW5jdGlvbigpe1xuICAgICAgICBcbiAgICAgICAgLy9Eb24ndCBuZWVkIHRoaXMgKG5vdykuIE1vZGVscyB3aWxsIGFscmVhZHkgYmUgc29ydGVkIG9uIGFkZCB3aXRoIGNvbGxlY3Rpb24uY29tcGFyYXRvciA9IHh4eDtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy90aGlzLnZpZXcgaXMgaW5zdGFuY2Ugb2YgdGhlIHZpZXcgdGhhdCBjb250YWlucyB0aGUgc3VidmlldyBkaXJlY3RpdmUuXG4gICAgICAgIC8vdGhpcy5zdWJWaWV3IGlzIGluc3RhbmNlIG9mIHRoZSBzdWJ2aWV3XG4gICAgICAgIC8vdGhpcyBpcyB0aGUgZGlyZWN0aXZlLlxuXG4gICAgICAgIGlmICh0aGlzLnN1YlZpZXcpe1xuICAgICAgICAgICAgLy93aHkgcGFyZW50Tm9kZT9cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZpZXcuZWwuY29udGFpbnModGhpcy5zdWJWaWV3LmVsLnBhcmVudE5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB2YXIgcGFzcyA9IHRydWU7XG4gICAgICAgICAgICB2YXIgZWwgPSB0aGlzLnZpZXcuZWxcbiAgICAgICAgICAgIHRoaXMuJGNoaWxkcmVuLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoIWVsLmNvbnRhaW5zKHRoaXMpKSBwYXNzID0gZmFsc2U7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICByZXR1cm4gcGFzcztcbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgfVxufSkiLCIvKmltcG9ydCAkIGZyb20gXCJqcXVlcnlcIjsqL1xuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcIm9wdGlvbmFsXCIsXG4gICAgXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCkgJCh0aGlzLmVsKS5oaWRlKClcbiAgICAgICAgZWxzZSAkKHRoaXMuZWwpLmNzcyhcImRpc3BsYXlcIixcIlwiKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuZWwpLmhpZGUoKVxuICAgICAgICBlbHNlICQodGhpcy5lbCkuY3NzKFwiZGlzcGxheVwiLFwiXCIpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLmVsKSkgdGhyb3cgRXJyb3IoXCJlbGVtZW50IGhhcyB0byBiZSBpbiB0aGUgRE9NIGluIG9yZGVyIHRvIHRlc3RcIilcbiAgICAgICAgcmV0dXJuICQodGhpcy5lbCkuaXMoXCI6dmlzaWJsZVwiKT09dmFsdWU7XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwib3B0aW9uYWx3cmFwXCIsXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIERpcmVjdGl2ZS5wcm90b3R5cGUuY2hpbGRJbml0LmNhbGwodGhpcyxhcmd1bWVudHMpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy53cmFwcGVyID0gdGhpcy5lbDtcbiAgICAgICAgdGhpcy5jaGlsZE5vZGVzID0gW10uc2xpY2UuY2FsbCh0aGlzLmVsLmNoaWxkTm9kZXMsIDApO1xuICAgICAgICBcbiAgICB9LFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5jaGlsZE5vZGVzKS51bndyYXAoKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KXtcbiAgICAgICAgICAgICQodGhpcy5jaGlsZE5vZGVzKS51bndyYXAoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgaWYgKCFkb2N1bWVudC5ib2R5LmNvbnRhaW5zKHRoaXMuY2hpbGROb2Rlc1swXSkpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGaXJzdCBjaGlsZCBoYXMgdG8gYmUgaW4gRE9NXCIpO1xuICAgICAgICAgICAgICAgIC8vc29sdXRpb246IGFkZCBhIGR1bW15IHRleHQgbm9kZSBhdCBiZWdpbm5pbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCFkb2N1bWVudC5ib2R5LmNvbnRhaW5zKHRoaXMud3JhcHBlcikpe1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGROb2Rlc1swXS5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLndyYXBwZXIsdGhpcy5jaGlsZE5vZGVzWzBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvcih2YXIgaT0wO2k8dGhpcy5jaGlsZE5vZGVzLmxlbmd0aDtpKyspe1xuICAgICAgICAgICAgICAgIHRoaXMud3JhcHBlci5hcHBlbmRDaGlsZCh0aGlzLmNoaWxkTm9kZXNbaV0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuXG5cbiAgICAgICAgcmV0dXJuICh0aGlzLmNoaWxkTm9kZXNbMF0ucGFyZW50Tm9kZT09dGhpcy53cmFwcGVyKSA9PSB2YWx1ZTtcblxuXG4gICAgICBcbiAgICB9XG59KSIsImltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJzcmNcIixcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLiRlbC5hdHRyKFwic3JjXCIsdGhpcy5yZXN1bHQpO1xuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGVsLmF0dHIoXCJzcmNcIix0aGlzLnJlc3VsdCk7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsLmF0dHIoXCJzcmNcIik9PT12YWx1ZTtcbiAgICB9XG59KTsiLCIvKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcbmltcG9ydCBBYnN0cmFjdFN1YnZpZXcgZnJvbSBcIi4vYWJzdHJhY3Qtc3Vidmlld1wiXG5leHBvcnQgZGVmYXVsdCBBYnN0cmFjdFN1YnZpZXcuZXh0ZW5kKHtcbiAgICBuYW1lOlwic3Vidmlld1wiLFxuICAgIF9pbml0aWFsaXplQ2hpbGRWaWV3czpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdLnByb3RvdHlwZSBpbnN0YW5jZW9mIEJhY2tib25lLlZpZXcpIHRoaXMuQ2hpbGRDb25zdHJ1Y3RvciA9IHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXTtcbiAgICAgICAgZWxzZSB0aGlzLkNoaWxkQ29uc3RydWN0b3IgPSB0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV0vKi5jYWxsKHRoaXMudmlldyk7Ki9cblxuICAgICAgICAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtvdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2g6dGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2h9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmNoaWxkTWFwcGluZ3Mpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgbWFwcGluZ3M6dGhpcy5jaGlsZE1hcHBpbmdzXG4gICAgICAgICAgICAgICAgLy8sZWw6dGhpcy5lbCBUaGUgZWwgb2YgdGhlIGRpcmVjdGl2ZSBzaG91bGQgYmVsb25nIHRvIHRoZSBkaXJlY3RpdmUgYnV0IG5vdCB0aGUgc3VidmlldyBpdHNlbGZcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBzdWJNb2RlbCA9IHRoaXMuc3ViTW9kZWwgfHwgdGhpcy52aWV3Lm1vZGVsO1xuICAgICAgICBpZiAoc3ViTW9kZWwpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7bW9kZWw6c3ViTW9kZWx9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldyA9IG5ldyB0aGlzLkNoaWxkQ29uc3RydWN0b3Iob3B0aW9ucyk7XG4gICAgICAgICAgICB2YXIgY2xhc3NlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImNsYXNzTmFtZVwiKVxuICAgICAgICAgICAgaWYgKGNsYXNzZXMpe1xuICAgICAgICAgICAgICAgIGNsYXNzZXMuc3BsaXQoXCIgXCIpLmZvckVhY2goZnVuY3Rpb24oY2wpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuY2xhc3NMaXN0LmFkZChjbClcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgYXR0cmlidXRlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImF0dHJpYnV0ZXNcIik7XG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlcyl7XG4gICAgICAgICAgICAgICAgXy5lYWNoKGF0dHJpYnV0ZXMsZnVuY3Rpb24odmFsLG5hbWUpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuc2V0QXR0cmlidXRlKG5hbWUsdmFsKSAgICBcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnQgPSB0aGlzLnZpZXc7XG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcucGFyZW50RGlyZWN0aXZlID0gdGhpcztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnNTZW50VG9TdWJWaWV3ID0gb3B0aW9ucztcbiAgICB9LFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICAvL3RoaXMudmFsLCB0aGlzLnZpZXdcblxuICAgICAgICB0aGlzLl9pbml0aWFsaXplQmFja2JvbmVPYmplY3QoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3MoKTtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZU92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCgpO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplQ2hpbGRWaWV3cygpO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICBcbiAgICAgIFxuXG4gICAgICAgIGlmICh0aGlzLnN1YkNvbGxlY3Rpb24peyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcImFkZFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQWRkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcInJlc2V0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJSZXNldCgpO1xuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcInJlbW92ZVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyUmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuc3ViQ29sbGVjdGlvbixcInNvcnRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclNvcnQoKTsgICAgICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuXG5cblxuICAgICAgICAgICAgICAgIC8vTWFwIG1vZGVscyB0byBjaGlsZFZpZXcgaW5zdGFuY2VzIHdpdGggdGhlaXIgbWFwcGluZ3NcbiAgICAgICAgICAgICAgICB0aGlzLkNoaWxkVmlldyA9IHRoaXMudmlldy5jaGlsZFZpZXdJbXBvcnRzW3RoaXMuc3ViVmlld05hbWVdO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbWFwcGluZ3M6dGhpcy5jaGlsZE1hcHBpbmdzLFxuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOnRoaXMuc3ViQ29sbGVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgdGFnTmFtZTp0aGlzLnZpZXcuY2hpbGRWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXS5wcm90b3R5cGUudGFnTmFtZSB8fCBcInN1Yml0ZW1cIixcbiAgICAgICAgICAgICAgICAgICAgb3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoOnRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MgPSB0aGlzLnN1YkNvbGxlY3Rpb24ubWFwKGZ1bmN0aW9uKGNoaWxkTW9kZWwsaSl7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB2YXIgY2hpbGRWaWV3T3B0aW9ucyA9IF8uZXh0ZW5kKHt9LHRoaXMuY2hpbGRWaWV3T3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlbDpjaGlsZE1vZGVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBvdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2g6dGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2ggJiYgdGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2gubW9kZWxzW2ldICYmIHRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoLm1vZGVsc1tpXS5hdHRyaWJ1dGVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy9KdXN0IGFkZGVkIGNoZWNrIGZvciB0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaC5tb2RlbHNbaV1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB2YXIgY2hpbGR2aWV3ID0gbmV3IHRoaXMuQ2hpbGRWaWV3KGNoaWxkVmlld09wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAvL2NoaWxkdmlldy5fc2V0QXR0cmlidXRlcyhfLmV4dGVuZCh7fSwgXy5yZXN1bHQoY2hpbGR2aWV3LCAnYXR0cmlidXRlcycpKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZHZpZXc7XG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuXG4gICAgICAgICAgICAgICAgXG5cblxuXG4gICAgICAgIH1cblxuICAgICAgIFxuICAgICAgICBcbiAgICAgICAgXG5cbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgaWYgKHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXS5wcm90b3R5cGUgaW5zdGFuY2VvZiBCYWNrYm9uZS5WaWV3KSB0aGlzLkNoaWxkQ29uc3RydWN0b3IgPSB0aGlzLnZpZXcuc3ViVmlld0ltcG9ydHNbdGhpcy5zdWJWaWV3TmFtZV07XG4gICAgICAgICAgICBlbHNlIHRoaXMuQ2hpbGRDb25zdHJ1Y3RvciA9IHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1t0aGlzLnN1YlZpZXdOYW1lXS8qLmNhbGwodGhpcy52aWV3KTsqL1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtvdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2g6dGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2h9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmNoaWxkTWFwcGluZ3Mpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7XG4gICAgICAgICAgICAgICAgbWFwcGluZ3M6dGhpcy5jaGlsZE1hcHBpbmdzXG4gICAgICAgICAgICAgICAgLy8sZWw6dGhpcy5lbCBUaGUgZWwgb2YgdGhlIGRpcmVjdGl2ZSBzaG91bGQgYmVsb25nIHRvIHRoZSBkaXJlY3RpdmUgYnV0IG5vdCB0aGUgc3VidmlldyBpdHNlbGZcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBzdWJNb2RlbCA9IHRoaXMuc3ViTW9kZWwgfHwgdGhpcy52aWV3Lm1vZGVsO1xuICAgICAgICBpZiAoc3ViTW9kZWwpe1xuICAgICAgICAgICAgXy5leHRlbmQob3B0aW9ucyx7bW9kZWw6c3ViTW9kZWx9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldyA9IG5ldyB0aGlzLkNoaWxkQ29uc3RydWN0b3Iob3B0aW9ucyk7XG4gICAgICAgICAgICB2YXIgY2xhc3NlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImNsYXNzTmFtZVwiKVxuICAgICAgICAgICAgaWYgKGNsYXNzZXMpe1xuICAgICAgICAgICAgICAgIGNsYXNzZXMuc3BsaXQoXCIgXCIpLmZvckVhY2goZnVuY3Rpb24oY2wpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuY2xhc3NMaXN0LmFkZChjbClcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgYXR0cmlidXRlcyA9IF8ucmVzdWx0KHRoaXMuc3ViVmlldyxcImF0dHJpYnV0ZXNcIik7XG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlcyl7XG4gICAgICAgICAgICAgICAgXy5lYWNoKGF0dHJpYnV0ZXMsZnVuY3Rpb24odmFsLG5hbWUpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YlZpZXcuZWwuc2V0QXR0cmlidXRlKG5hbWUsdmFsKSAgICBcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnQgPSB0aGlzLnZpZXc7XG4gICAgICAgICAgICB0aGlzLnN1YlZpZXcucGFyZW50RGlyZWN0aXZlID0gdGhpcztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnNTZW50VG9TdWJWaWV3ID0gb3B0aW9ucztcbiAgICB9LFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5zdWJDb2xsZWN0aW9uKXtcbiAgICAgICAgICAgIHRoaXMuJGVsLnJlcGxhY2VXaXRoKHRoaXMuc3ViVmlldy5lbCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHZhciAkY2hpbGRyZW4gPSAkKCk7XG4gICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgJGNoaWxkcmVuID0gJGNoaWxkcmVuLmFkZChjaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICAgICAgY2hpbGRWaWV3LmluZGV4ID0gaTtcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBpZiAoJGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGVsLnJlcGxhY2VXaXRoKCRjaGlsZHJlbik7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgICAgICAgICBjaGlsZFZpZXcuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9ICRjaGlsZHJlbi5wYXJlbnQoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICB0aGlzLiRwYXJlbnQgPSB0aGlzLiRlbC5wYXJlbnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuJGNoaWxkcmVuID0gJGNoaWxkcmVuXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlbmRlckFkZDpmdW5jdGlvbigpe1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgdGhpcy5zdWJDb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24obW9kZWwsaSl7XG4gICAgICAgICAgICB2YXIgZXhpc3RpbmdDaGlsZFZpZXcgPSB0aGlzLmNoaWxkVmlld3MuZmlsdGVyKGZ1bmN0aW9uKGNoaWxkVmlldyl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkVmlldy5tb2RlbCA9PSBtb2RlbFxuICAgICAgICAgICAgfSlbMF07XG4gICAgICAgICAgICBpZiAoZXhpc3RpbmdDaGlsZFZpZXcpIHtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKGV4aXN0aW5nQ2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgICAgIC8vdmFyIGF0dHJpYnV0ZXMgPSBfLmV4dGVuZCh7fSwgXy5yZXN1bHQoZXhpc3RpbmdDaGlsZFZpZXcsICdhdHRyaWJ1dGVzJykpXG4gICAgICAgICAgICAgICAgLy9leGlzdGluZ0NoaWxkVmlldy5fc2V0QXR0cmlidXRlcyhhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBuZXdDaGlsZFZpZXcgPSBuZXcgdGhpcy5DaGlsZFZpZXcoe1xuICAgICAgICAgICAgICAgICAgICBtb2RlbDptb2RlbCxcbiAgICAgICAgICAgICAgICAgICAgbWFwcGluZ3M6dGhpcy5jaGlsZE1hcHBpbmdzLFxuICAgICAgICAgICAgICAgICAgICBpbmRleDppLFxuICAgICAgICAgICAgICAgICAgICBsYXN0SW5kZXg6dGhpcy5zdWJDb2xsZWN0aW9uLmxlbmd0aCAtIGkgLSAxLFxuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOnRoaXMuc3ViQ29sbGVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgZGF0YTp0aGlzLnZpZXcuZ2V0KHRoaXMudmFsLnNwbGl0KFwiOlwiKVswXSlbaV1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5wdXNoKG5ld0NoaWxkVmlldyk7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaChuZXdDaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB0aGlzLiRwYXJlbnQuZW1wdHkoKTtcbiAgICAgICAgY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCl7XG4gICAgICAgICAgICB0aGlzLiRwYXJlbnQuYXBwZW5kKGNoaWxkKVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIHRoaXMuJGNoaWxkcmVuID0gJChjaGlsZHJlbilcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgIGNoaWxkVmlldy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICB9KVxuXG4gICAgfSxcbiAgICByZW5kZXJSZXNldDpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLiRwYXJlbnQuZW1wdHkoKTtcbiAgICB9LFxuICAgIHJlbmRlclJlbW92ZTpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLiRjaGlsZHJlbi5sYXN0KCkucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuY2hpbGRWaWV3cy5zcGxpY2UoLTEsMSk7XG4gICAgICAgIHRoaXMuJGNoaWxkcmVuID0gdGhpcy4kcGFyZW50LmNoaWxkcmVuKCk7XG4gICAgfSxcbiAgICByZW5kZXJTb3J0OmZ1bmN0aW9uKCl7XG4gICAgICAgIFxuICAgICAgICAvL0Rvbid0IG5lZWQgdGhpcyAobm93KS4gTW9kZWxzIHdpbGwgYWxyZWFkeSBiZSBzb3J0ZWQgb24gYWRkIHdpdGggY29sbGVjdGlvbi5jb21wYXJhdG9yID0geHh4O1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbigpe1xuICAgICAgICAvL3RoaXMudmlldyBpcyBpbnN0YW5jZSBvZiB0aGUgdmlldyB0aGF0IGNvbnRhaW5zIHRoZSBzdWJ2aWV3IGRpcmVjdGl2ZS5cbiAgICAgICAgLy90aGlzLnN1YlZpZXcgaXMgaW5zdGFuY2Ugb2YgdGhlIHN1YnZpZXdcbiAgICAgICAgLy90aGlzIGlzIHRoZSBkaXJlY3RpdmUuXG5cbiAgICAgICAgaWYgKHRoaXMuc3ViVmlldyl7XG4gICAgICAgICAgICAvL3doeSBwYXJlbnROb2RlP1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmlldy5lbC5jb250YWlucyh0aGlzLnN1YlZpZXcuZWwucGFyZW50Tm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHZhciBwYXNzID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBlbCA9IHRoaXMudmlldy5lbFxuICAgICAgICAgICAgdGhpcy4kY2hpbGRyZW4uZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGlmICghZWwuY29udGFpbnModGhpcykpIHBhc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgIHJldHVybiBwYXNzO1xuICAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICB9XG59KSIsIi8qaW1wb3J0IF8gZnJvbSBcInVuZGVyc2NvcmVcIjsqL1xuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcImRhdGFcIixcbiAgICBjaGlsZEluaXQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5jb250ZW50ID0gdGhpcy52aWV3LnZpZXdNb2RlbC5nZXQodGhpcy52YWwpO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMudmlldy52aWV3TW9kZWwsXCJjaGFuZ2U6XCIrdGhpcy52YWwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMuY29udGVudCA9IHRoaXMudmlldy52aWV3TW9kZWwuZ2V0KHRoaXMudmFsKTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgIF8uZWFjaCh0aGlzLmNvbnRlbnQsZnVuY3Rpb24odmFsLHByb3Ape1xuICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbCkpIHZhbCA9IHZhbC5iaW5kKHRoaXMudmlldyk7XG4gICAgICAgICAgIHRoaXMuJGVsLmF0dHIoXCJkYXRhLVwiK3Byb3AsdmFsKVxuICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgIF8uZWFjaCh0aGlzLmNvbnRlbnQsZnVuY3Rpb24odmFsLHByb3Ape1xuICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbCkpIHZhbCA9IHZhbC5iaW5kKHRoaXMudmlldyk7XG4gICAgICAgICAgIHRoaXMuJGVsLmF0dHIoXCJkYXRhLVwiK3Byb3AsdmFsKVxuICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICB9XG59KTsiLCJpbXBvcnQgRGlyZWN0aXZlQ29udGVudCBmcm9tIFwiLi9kaXJlY3RpdmUtY29udGVudFwiO1xuaW1wb3J0IERpcmVjdGl2ZUVuYWJsZSBmcm9tIFwiLi9kaXJlY3RpdmUtZW5hYmxlXCI7XG5pbXBvcnQgRGlyZWN0aXZlRGlzYWJsZSBmcm9tIFwiLi9kaXJlY3RpdmUtZGlzYWJsZVwiO1xuaW1wb3J0IERpcmVjdGl2ZUhyZWYgZnJvbSBcIi4vZGlyZWN0aXZlLWhyZWZcIjtcbmltcG9ydCBEaXJlY3RpdmVNYXAgZnJvbSBcIi4vZGlyZWN0aXZlLW1hcFwiO1xuaW1wb3J0IERpcmVjdGl2ZU9wdGlvbmFsIGZyb20gXCIuL2RpcmVjdGl2ZS1vcHRpb25hbFwiO1xuaW1wb3J0IERpcmVjdGl2ZU9wdGlvbmFsV3JhcCBmcm9tIFwiLi9kaXJlY3RpdmUtb3B0aW9uYWx3cmFwXCI7XG5pbXBvcnQgRGlyZWN0aXZlU3JjIGZyb20gXCIuL2RpcmVjdGl2ZS1zcmNcIjtcbmltcG9ydCBEaXJlY3RpdmVTdWJ2aWV3IGZyb20gXCIuL2RpcmVjdGl2ZS1zdWJ2aWV3XCI7XG5pbXBvcnQgRGlyZWN0aXZlRGF0YSBmcm9tIFwiLi9kaXJlY3RpdmUtZGF0YVwiO1xuXG52YXIgcmVnaXN0cnkgPSB7XG4gICAgQ29udGVudDpEaXJlY3RpdmVDb250ZW50LFxuICAgIEVuYWJsZTpEaXJlY3RpdmVFbmFibGUsXG4gICAgRGlzYWJsZTpEaXJlY3RpdmVEaXNhYmxlLFxuICAgIEhyZWY6RGlyZWN0aXZlSHJlZixcbiAgICBNYXA6RGlyZWN0aXZlTWFwLFxuICAgIE9wdGlvbmFsOkRpcmVjdGl2ZU9wdGlvbmFsLFxuICAgIE9wdGlvbmFsV3JhcDpEaXJlY3RpdmVPcHRpb25hbFdyYXAsXG4gICAgU3JjOkRpcmVjdGl2ZVNyYyxcbiAgICBTdWJ2aWV3OkRpcmVjdGl2ZVN1YnZpZXcsXG4gICAgRGF0YTpEaXJlY3RpdmVEYXRhXG59O1xuXG5leHBvcnQgZGVmYXVsdCByZWdpc3RyeTsiLCIvKmltcG9ydCAkIGZyb20gXCJqcXVlcnlcIjsqL1xuLyppbXBvcnQgXyBmcm9tIFwidW5kZXJzY29yZVwiOyovXG4vKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuaW1wb3J0IERpcmVjdGl2ZVJlZ2lzdHJ5IGZyb20gXCIuL2RpcmVjdGl2ZS9kaXJlY3RpdmVSZWdpc3RyeS5qc1wiXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZS9kaXJlY3RpdmUuanNcIlxuXG5cblxudmFyIGJhY2tib25lVmlld09wdGlvbnMgPSBbJ21vZGVsJywgJ2NvbGxlY3Rpb24nLCAnZWwnLCAnaWQnLCAnYXR0cmlidXRlcycsICdjbGFzc05hbWUnLCAndGFnTmFtZScsICdldmVudHMnXTtcbnZhciBhZGRpdGlvbmFsVmlld09wdGlvbnMgPSBbJ21hcHBpbmdzJywndGVtcGxhdGVTdHJpbmcnLCdjaGlsZFZpZXdJbXBvcnRzJywnc3ViVmlld0ltcG9ydHMnLCdpbmRleCcsJ2xhc3RJbmRleCcsJ292ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCddXG5leHBvcnQgZGVmYXVsdCBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG4gICAgdGV4dE5vZGVzVW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEwNzMwMzA5L2ZpbmQtYWxsLXRleHQtbm9kZXMtaW4taHRtbC1wYWdlXG4gICAgICAgIHZhciBuLCBhPVtdLCB3YWxrPWRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIodGhpcy5lbCxOb2RlRmlsdGVyLlNIT1dfVEVYVCxudWxsLGZhbHNlKTtcbiAgICAgICAgd2hpbGUobj13YWxrLm5leHROb2RlKCkpIGEucHVzaChuKTtcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgIFxuICAgIH0sXG4gICAgY29uc3RydWN0b3I6ZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICAgLy9kZWJ1Z2dlcjtcblxuXG4gICAgICAgIF8uZWFjaChfLmRpZmZlcmVuY2UoXy5rZXlzKG9wdGlvbnMpLF8udW5pb24oYmFja2JvbmVWaWV3T3B0aW9ucyxhZGRpdGlvbmFsVmlld09wdGlvbnMpKSxmdW5jdGlvbihwcm9wKXtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIldhcm5pbmchIFVua25vd24gcHJvcGVydHkgXCIrcHJvcCk7XG4gICAgICAgIH0pXG5cblxuICAgICAgICBpZiAoIXRoaXMuanN0ICYmICF0aGlzLnRlbXBsYXRlU3RyaW5nKSB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbmVlZCBhIHRlbXBsYXRlXCIpO1xuICAgICAgICBpZiAoIXRoaXMuanN0KXtcbiAgICAgICAgICAgIHRoaXMuY2lkID0gXy51bmlxdWVJZCh0aGlzLnRwbGlkKTtcbiAgICAgICAgICAgIHRoaXMuanN0ID0gXy50ZW1wbGF0ZSh0aGlzLnRlbXBsYXRlU3RyaW5nKVxuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB0aGlzLmNpZCA9IF8udW5pcXVlSWQoJ3ZpZXcnKTtcbiAgICAgICAgfVxuICAgICAgICBfLmV4dGVuZCh0aGlzLCBfLnBpY2sob3B0aW9ucywgYmFja2JvbmVWaWV3T3B0aW9ucy5jb25jYXQoYWRkaXRpb25hbFZpZXdPcHRpb25zKSkpO1xuXG4gICAgICAgIC8vQWRkIHRoaXMgaGVyZSBzbyB0aGF0IGl0J3MgYXZhaWxhYmxlIGluIGNsYXNzTmFtZSBmdW5jdGlvblxuICAgICAgICBpZiAoIXRoaXMuZGVmYXVsdHMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJZb3UgbmVlZCBkZWZhdWx0cyBmb3IgeW91ciB2aWV3XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgXy5lYWNoKHRoaXMuZGVmYXVsdHMsZnVuY3Rpb24oZGVmKXtcbiAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24oZGVmKSkgY29uc29sZS53YXJuKFwiRGVmYXVsdHMgc2hvdWxkIHVzdWFsbHkgYmUgcHJpbWl0aXZlIHZhbHVlc1wiKVxuICAgICAgICB9KVxuXG4gICAgICAgIC8vZGF0YSBpcyBwYXNzZWQgaW4gb24gc3Vidmlld3NcbiAgICAgICAgLy8gY29tZXMgZnJvbSB0aGlzLnZpZXcudmlld01vZGVsLmdldCh0aGlzLnZhbCk7LCBcbiAgICAgICAgLy9zbyBpZiB0aGUgZGlyZWN0aXZlIGlzIG5tLXN1YnZpZXc9XCJNZW51XCIsIHRoZW4gdGhpcy5kYXRhIHNob3VsZCBiZS4uLndoYXQ/XG4gICAgICAgIC8vQWhhISBkYXRhIGlzIHRvIG92ZXJyaWRlIGRlZmF1bHQgdmFsdWVzIGZvciBzdWJ2aWV3cyBiZWluZyBwYXJ0IG9mIGEgcGFyZW50IHZpZXcuIFxuICAgICAgICAvL0J1dCBpdCBpcyBub3QgbWVhbnQgdG8gb3ZlcnJpZGUgbWFwcGluZ3MgSSBkb24ndCB0aGluay5cbiAgICAgICAgdGhpcy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2ggPSBvcHRpb25zICYmIG9wdGlvbnMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoO1xuXG4gICAgICAgIHZhciBhdHRycyA9IF8uZXh0ZW5kKF8uY2xvbmUodGhpcy5kZWZhdWx0cyksKG9wdGlvbnMgJiYgb3B0aW9ucy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2gpIHx8IHt9KVxuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCxhdHRycylcbiAgICAgICAgdGhpcy52aWV3TW9kZWwgPSBuZXcgQmFja2JvbmUuTW9kZWwoYXR0cnMpO1xuXG5cbiAgICAgICAgLy9tYXBwaW5ncyBjb250YWluIG1hcHBpbmdzIG9mIHZpZXcgdmFyaWFibGVzIHRvIG1vZGVsIHZhcmlhYmxlcy5cbiAgICAgICAgLy9zdHJpbmdzIGFyZSByZWZlcmVuY2VzIHRvIG1vZGVsIHZhcmlhYmxlcy4gRnVuY3Rpb25zIGFyZSBmb3Igd2hlbiBhIHZpZXcgdmFyaWFibGUgZG9lc1xuICAgICAgICAvL25vdCBtYXRjaCBwZXJmZWN0bHkgd2l0aCBhIG1vZGVsIHZhcmlhYmxlLiBUaGVzZSBhcmUgdXBkYXRlZCBlYWNoIHRpbWUgdGhlIG1vZGVsIGNoYW5nZXMuXG4gICAgICAgIHRoaXMucHJvcE1hcCA9IHt9O1xuICAgICAgICB0aGlzLmZ1bmNzID0ge307XG5cbiAgICAgICAgXy5lYWNoKHRoaXMubWFwcGluZ3MsZnVuY3Rpb24obW9kZWxWYXIsdGVtcGxhdGVWYXIpe1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtb2RlbFZhciA9PSBcInN0cmluZ1wiKSB0aGlzLnByb3BNYXBbdGVtcGxhdGVWYXJdID0gbW9kZWxWYXI7XG4gICAgICAgICAgICBlbHNlIGlmICh0eXBlb2YgbW9kZWxWYXIgPT0gXCJmdW5jdGlvblwiKSB0aGlzLmZ1bmNzW3RlbXBsYXRlVmFyXSA9IG1vZGVsVmFyO1xuICAgICAgICB9LmJpbmQodGhpcykpOyAgICAgXG5cbiAgICAgICAgLy9Qcm9ibGVtOiBpZiB5b3UgdXBkYXRlIHRoZSBtb2RlbCBpdCB1cGRhdGVzIGZvciBldmVyeSBzdWJ2aWV3IChub3QgZWZmaWNpZW50KS5cbiAgICAgICAgLy9BbmQgaXQgZG9lcyBub3QgdXBkYXRlIGZvciBzdWJtb2RlbHMuIFBlcmhhcHMgdGhlcmUgYXJlIG1hbnkgZGlmZmVyZW50IHNvbHV0aW9ucyBmb3IgdGhpcy5cbiAgICAgICAgLy9Zb3UgY2FuIGhhdmUgZWFjaCBzdWJtb2RlbCB0cmlnZ2VyIGNoYW5nZSBldmVudC5cbiAgICAgICAgXG4gICAgICAgIC8vV2hlbmV2ZXIgdGhlIG1vZGVsIGNoYW5nZXMsIHVwZGF0ZSB0aGUgdmlld01vZGVsIGJ5IG1hcHBpbmcgcHJvcGVydGllcyBvZiB0aGUgbW9kZWwgdG8gcHJvcGVydGllcyBvZiB0aGUgdmlldyAoYXNzaWduZWQgaW4gbWFwcGluZ3MpXG4gICAgICAgIC8vQWxzbywgdGhlIGF0dHJpYnV0ZXMgY2hhbmdlLiBUaGlzIGNhbiBiZSBkb25lIG1vcmUgZWxlZ2FudGx5XG4gICAgICAgIGlmICh0aGlzLm1vZGVsKXtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCxcImNoYW5nZVwiLHRoaXMudXBkYXRlQ29udGV4dE9iamVjdCk7XG4gICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsXCJjaGFuZ2VcIixmdW5jdGlvbigpe1xuXHRcdFx0ICAgIHRoaXMuX3NldEF0dHJpYnV0ZXMoXy5leHRlbmQoe30sIF8ucmVzdWx0KHRoaXMsICdhdHRyaWJ1dGVzJykpKTtcblx0XHQgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAgICAgdGhpcy51cGRhdGVDb250ZXh0T2JqZWN0KHRoaXMubW9kZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGF0dHJzID0gdGhpcy52aWV3TW9kZWwuYXR0cmlidXRlcztcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzKTtcbiAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICBpZiAoa2V5PT09XCJkZWZpbml0aW9uc1wiICYmICF0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzW2tleV0pe1xuICAgICAgICAgICAgICAgIC8vcHJvYmxlbSBpcyB0aGF0IHByb3BNYXAgKHNlZW1zIHRvIGJlIG1hcHBpbmdzIHdpdGggZnVuY3Rpb25zIGZpbHRlcmVkIG91dCkgaXMgXG4gICAgICAgICAgICAgICAgLy97ZGVmaW5pdGlvbnM6XCJkZWZpbml0aW9uc1wifS4gQ29tZXMgZnJvbSBhcnRpY2xlX2FydGljbGUuanNcbiAgICAgICAgICAgICAgICBkZWJ1Z2dlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgXG5cblxuICAgICAgICB0aGlzLl9lbnN1cmVFbGVtZW50KCk7XG4gICAgICAgIHRoaXMuYnVpbGRJbm5lckhUTUwoKTtcbiAgICAgICAgXG5cblxuICAgICAgICB0aGlzLmluaXREaXJlY3RpdmVzKCk7Ly9pbml0IHNpbXBsZSBkaXJlY3RpdmVzLi4udGhlIG9uZXMgdGhhdCBqdXN0IG1hbmlwdWxhdGUgYW4gZWxlbWVudFxuICAgICAgICB0aGlzLmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgdGhpcy5jaGlsZE5vZGVzID0gW10uc2xpY2UuY2FsbCh0aGlzLmVsLmNoaWxkTm9kZXMsIDApO1xuXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH0sXG4gICAgXG4gICAgaW5pdGlhbGl6ZTpmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgICAgLy9hdHRhY2ggb3B0aW9ucyB0byB2aWV3IChtb2RlbCwgcHJvcE1hcCwgc3ViVmlld3MsIGV2ZW50cylcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIF8uZXh0ZW5kKHRoaXMsb3B0aW9ucyk7XG4gICAgfSxcbiAgICBnZXRNb2RlbEF0dHI6ZnVuY3Rpb24oYXR0cil7XG4gICAgICAgIC8vcXVpY2tseSBncmFiIGEgbW9kZWxzIGF0dHJpYnV0ZSBieSBhIHZpZXcgdmFyaWFibGUuIFVzZWZ1bCBpbiBjbGFzc25hbWUgZnVuY3Rpb24uXG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5tYXBwaW5nc1thdHRyXSA9PVwic3RyaW5nXCIpIHJldHVybiB0aGlzLm1vZGVsLmdldCh0aGlzLm1hcHBpbmdzW2F0dHJdKTtcbiAgICAgICAgZWxzZSByZXR1cm4gdGhpcy5tYXBwaW5nc1thdHRyXS5jYWxsKHRoaXMpXG4gICAgfSxcbiAgICB1cGRhdGVDb250ZXh0T2JqZWN0OmZ1bmN0aW9uKG1vZGVsKXtcblxuICAgICAgICBcbiAgICAgICAgdmFyIG9iaiA9IHt9XG4gICAgICAgIFxuICAgICAgICAvL0NoYW5nZSB0ZW1wbGF0ZVZhcnMtPm1vZGVsVmFycyB0byB0ZW1wbGF0ZVZhcnMtPm1vZGVsLmdldChcIm1vZGVsVmFyXCIpLCBhbmQgc2V0IG9uIHRoZSBtb2RlbFxuICAgICAgICBfLmV4dGVuZChvYmosXy5tYXBPYmplY3QodGhpcy5wcm9wTWFwLGZ1bmN0aW9uKG1vZGVsVmFyKXtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW9kZWwuZ2V0KG1vZGVsVmFyKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKSk7XG4gICAgICAgIFxuXG4gICAgICAgIF8uZXh0ZW5kKG9iaixfLm1hcE9iamVjdCh0aGlzLmZ1bmNzLGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICAgICAgdmFyIHJldCA9IGZ1bmMuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAvL2Z1bmMuY2FsbCBtYWtlcyBpdCB3b3JrIGJ1dCBvbmx5IG9uY2VcbiAgICAgICAgfS5iaW5kKHRoaXMpKSlcbiAgICAgICAgICAgICAgICBcblxuICAgICAgICBcbiAgICAgICAgdGhpcy52aWV3TW9kZWwuc2V0KG9iaik7XG5cblxuICAgICAgICBcbiAgICBcbiAgICB9LFxuICAgIGJ1aWxkSW5uZXJIVE1MOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbCkgdGhpcy4kZWwuaHRtbCh0aGlzLnJlbmRlcmVkVGVtcGxhdGUoKSk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGR1bW15ZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgICAgIGR1bW15ZGl2LmlubmVySFRNTCA9IHRoaXMucmVuZGVyZWRUZW1wbGF0ZSgpO1xuICAgICAgICAgICAgd2hpbGUoZHVtbXlkaXYuY2hpbGROb2Rlcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQoZHVtbXlkaXYuY2hpbGROb2Rlc1swXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL21heWJlIGxlc3MgaGFja2lzaCBzb2x1dGlvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yNTIxNDExMy8xNzYzMjE3XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGluaXREaXJlY3RpdmVzOmZ1bmN0aW9uKCl7XG5cbiAgICAgICAgXG4gICAgICAgICAvL0luaXQgZGlyZWN0aXZlcyBpbnZvbHZpbmcge3t9fVxuXG4gICAgICAgIHRoaXMuX2luaXRpYWxUZXh0Tm9kZXMgPSB0aGlzLnRleHROb2Rlc1VuZGVyKCk7XG4gICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cyA9IFtdO1xuICAgICAgICB0aGlzLl9pbml0aWFsVGV4dE5vZGVzLmZvckVhY2goZnVuY3Rpb24oZnVsbFRleHROb2RlKXtcbiAgICAgICAgICAgIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjEzMTE2NzAvMTc2MzIxNyB0ZXh0Q29udGVudCBzZWVtcyByaWdodFxuXG4gICAgICAgICAgICB2YXIgcmUgPSAvXFx7XFx7KC4rPylcXH1cXH0vZztcbiAgICAgICAgICAgIHZhciBtYXRjaDtcbiAgICAgICAgICAgIFxuXG5cbiAgICAgICAgICAgIHZhciBtYXRjaGVzID0gW107XG4gICAgICAgICAgICB3aGlsZSAoKG1hdGNoID0gcmUuZXhlYyhmdWxsVGV4dE5vZGUudGV4dENvbnRlbnQpKSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hlcy5wdXNoKG1hdGNoKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgY3VycmVudFRleHROb2RlID0gZnVsbFRleHROb2RlO1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRTdHJpbmcgPSBmdWxsVGV4dE5vZGUudGV4dENvbnRlbnQ7XG4gICAgICAgICAgICB2YXIgcHJldk5vZGVzTGVuZ3RoID0gMDtcblxuICAgICAgICAgICAgbWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uKG1hdGNoKXtcbiAgICAgICAgICAgICAgICB2YXIgdmFyTm9kZSA9IGN1cnJlbnRUZXh0Tm9kZS5zcGxpdFRleHQobWF0Y2guaW5kZXggLSBwcmV2Tm9kZXNMZW5ndGgpO1xuICAgICAgICAgICAgICAgIHZhciBlbnRpcmVNYXRjaCA9IG1hdGNoWzBdXG4gICAgICAgICAgICAgICAgdmFyTm9kZS5tYXRjaCA9IG1hdGNoWzFdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5wdXNoKHZhck5vZGUpO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRUZXh0Tm9kZSA9IHZhck5vZGUuc3BsaXRUZXh0KGVudGlyZU1hdGNoLmxlbmd0aClcbiAgICAgICAgICAgICAgICBjdXJyZW50U3RyaW5nID0gY3VycmVudFRleHROb2RlLnRleHRDb250ZW50O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHByZXZOb2Rlc0xlbmd0aD1tYXRjaC5pbmRleCArIGVudGlyZU1hdGNoLmxlbmd0aDsvL05vdGU6IFRoaXMgd29ya3MgYWNjaWRlbnRhbGx5LiBNaWdodCBiZSB3cm9uZy5cbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgXG5cbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgdGhpcy5kaXJlY3RpdmUgPSB7fTtcblxuICAgICAgIFxuXG5cbiAgICAgICAgZm9yICh2YXIgZGlyZWN0aXZlTmFtZSBpbiBEaXJlY3RpdmVSZWdpc3RyeSl7XG4gICAgICAgICAgICB2YXIgX19wcm90byA9IERpcmVjdGl2ZVJlZ2lzdHJ5W2RpcmVjdGl2ZU5hbWVdLnByb3RvdHlwZVxuICAgICAgICAgICAgaWYgKF9fcHJvdG8gaW5zdGFuY2VvZiBEaXJlY3RpdmUpeyAvL2JlY2F1c2UgZm9yZWFjaCB3aWxsIGdldCBtb3JlIHRoYW4ganVzdCBvdGhlciBkaXJlY3RpdmVzXG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBfX3Byb3RvLm5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKG5hbWUhPT1cInN1YnZpZXdcIiAmJiBuYW1lIT09XCJtYXBcIil7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbGVtZW50cyA9ICh0aGlzLiRlbCk/JC5tYWtlQXJyYXkodGhpcy4kZWwuZmluZChcIltubS1cIituYW1lK1wiXVwiKSk6JC5tYWtlQXJyYXkoJCh0aGlzLmVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCJbbm0tXCIrbmFtZStcIl1cIikpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXJlY3RpdmVbbmFtZV0gPSBlbGVtZW50cy5tYXAoZnVuY3Rpb24oZWxlbWVudCxpLGVsZW1lbnRzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL29uIHRoZSBzZWNvbmQgZ28tYXJvdW5kIGZvciBubS1tYXAsIGRpcmVjdGl2ZU5hbWUgc29tZWhvdyBpcyBjYWxsZWQgXCJTdWJWaWV3XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERpcmVjdGl2ZVJlZ2lzdHJ5W2RpcmVjdGl2ZU5hbWVdKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldzp0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbDplbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWw6ZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJubS1cIituYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTsgXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXJlY3RpdmVbXCJzdWJ2aWV3XCJdID0gdGhpcy5fc3ViVmlld0VsZW1lbnRzLm1hcChmdW5jdGlvbihzdWJWaWV3RWxlbWVudCxpLHN1YlZpZXdFbGVtZW50cyl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERpcmVjdGl2ZVJlZ2lzdHJ5W1wiU3Vidmlld1wiXSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldzp0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsOnN1YlZpZXdFbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTsgKi9cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuXG4gICAgICAgICB0aGlzLl9zdWJWaWV3RWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbihzdWJWaWV3RWxlbWVudCl7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHN1YlZpZXdFbGVtZW50Lm1hdGNoLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aD09MSl7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmRpcmVjdGl2ZVtcInN1YnZpZXdcIl0pIHRoaXMuZGlyZWN0aXZlW1wic3Vidmlld1wiXSA9IFtdO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlyZWN0aXZlW1wic3Vidmlld1wiXS5wdXNoKG5ldyBEaXJlY3RpdmVSZWdpc3RyeVtcIlN1YnZpZXdcIl0oe1xuICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgIGVsOnN1YlZpZXdFbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICB2YWw6c3ViVmlld0VsZW1lbnQubWF0Y2hcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5kaXJlY3RpdmVbXCJtYXBcIl0pIHRoaXMuZGlyZWN0aXZlW1wibWFwXCJdID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5kaXJlY3RpdmVbXCJtYXBcIl0ucHVzaChuZXcgRGlyZWN0aXZlUmVnaXN0cnlbXCJNYXBcIl0oe1xuICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgIGVsOnN1YlZpZXdFbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICB2YWw6c3ViVmlld0VsZW1lbnQubWF0Y2hcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0uYmluZCh0aGlzKSlcblxuXG4gICAgICAgXG4gICAgICAgIC8qXG4gICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uKHN1YlZpZXdFbGVtZW50KXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gc3ViVmlld0VsZW1lbnQubWF0Y2guc3BsaXQoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoPT0xKXtcbiAgICAgICAgICAgICAgICAvL3N1YnZpZXcgd2l0aCBubyBjb250ZXh0IG9ialxuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgLy9DaGVjayBmb3IgY29sbGVjdGlvbiBvciBtb2RlbCBwYXNzZWQuXG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcbiAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUuYmFja2dyb3VuZD1cInllbGxvd1wiO1xuICAgICAgICAgICAgZWxlbWVudC5pbm5lckhUTUwgPSBzdWJWaWV3RWxlbWVudC5tYXRjaDtcbiAgICAgICAgICAgIHN1YlZpZXdFbGVtZW50LnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGVsZW1lbnQsc3ViVmlld0VsZW1lbnQpO1xuICAgICAgICB9KSovXG5cbiAgICAgICBcblxuXG4gICAgICAgIFxuICAgIH0sXG4gICAgcmVuZGVyZWRUZW1wbGF0ZTpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy5qc3QpIHtcbiAgICAgICAgICAgIHdpbmRvdy5fID0gXztcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmpzdCh0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHJldHVybiBfLnRlbXBsYXRlKHRoaXMudGVtcGxhdGVTdHJpbmcpKHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXMpXG4gICAgfSxcbiAgICBkZWxlZ2F0ZUV2ZW50czogZnVuY3Rpb24oZXZlbnRzKSB7Ly9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xMjE5MzA2OS8xNzYzMjE3XG4gICAgICAgIHZhciBkZWxlZ2F0ZUV2ZW50U3BsaXR0ZXIgPSAvXihcXFMrKVxccyooLiopJC87XG4gICAgICAgIGV2ZW50cyB8fCAoZXZlbnRzID0gXy5yZXN1bHQodGhpcywgJ2V2ZW50cycpKTsgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICBpZiAoIWV2ZW50cykgcmV0dXJuIHRoaXM7XG4gICAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gZXZlbnRzKSB7XG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gZXZlbnRzW2tleV07XG4gICAgICAgICAgICBpZiAoIV8uaXNGdW5jdGlvbihtZXRob2QpKSBtZXRob2QgPSB0aGlzW2V2ZW50c1trZXldXTtcbiAgICAgICAgICAgIGlmICghbWV0aG9kKSB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBcIicgKyBldmVudHNba2V5XSArICdcIiBkb2VzIG5vdCBleGlzdCcpO1xuICAgICAgICAgICAgdmFyIG1hdGNoID0ga2V5Lm1hdGNoKGRlbGVnYXRlRXZlbnRTcGxpdHRlcik7XG4gICAgICAgICAgICB2YXIgZXZlbnRUeXBlcyA9IG1hdGNoWzFdLnNwbGl0KCcsJyksIHNlbGVjdG9yID0gbWF0Y2hbMl07XG4gICAgICAgICAgICBtZXRob2QgPSBfLmJpbmQobWV0aG9kLCB0aGlzKTtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIF8oZXZlbnRUeXBlcykuZWFjaChmdW5jdGlvbihldmVudE5hbWUpIHtcbiAgICAgICAgICAgICAgICBldmVudE5hbWUgKz0gJy5kZWxlZ2F0ZUV2ZW50cycgKyBzZWxmLmNpZDtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgc2VsZi4kZWwuYmluZChldmVudE5hbWUsIG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kZWwuZGVsZWdhdGUoc2VsZWN0b3IsIGV2ZW50TmFtZSwgbWV0aG9kKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIFxuICAgICAgIFxuICAgIH0sXG5cblxuXG5cbiAgICB0YWdOYW1lOnVuZGVmaW5lZCwvL2Rvbid0IHdhbnQgYSB0YWdOYW1lIHRvIGJlIGRpdiBieSBkZWZhdWx0LiBSYXRoZXIsIG1ha2UgaXQgYSBkb2N1bWVudGZyYWdtZW50J1xuICAgIHN1YlZpZXdJbXBvcnRzOnt9LFxuICAgIGNoaWxkVmlld0ltcG9ydHM6e30sXG4gICAgICBfZW5zdXJlRWxlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy9PdmVycmlkaW5nIHRoaXMgdG8gc3VwcG9ydCBkb2N1bWVudCBmcmFnbWVudHNcbiAgICAgICAgICAgIGlmICghdGhpcy5lbCkge1xuICAgICAgICAgICAgICAgIGlmKHRoaXMuYXR0cmlidXRlcyB8fCB0aGlzLmlkIHx8IHRoaXMuY2xhc3NOYW1lIHx8IHRoaXMudGFnTmFtZSl7Ly9pZiB5b3UgaGF2ZSBhbnkgb2YgdGhlc2UgYmFja2JvbmUgcHJvcGVydGllcywgZG8gYmFja2JvbmUgYmVoYXZpb3JcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdHRycyA9IF8uZXh0ZW5kKHt9LCBfLnJlc3VsdCh0aGlzLCAnYXR0cmlidXRlcycpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlkKSBhdHRycy5pZCA9IF8ucmVzdWx0KHRoaXMsICdpZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2xhc3NOYW1lKSBhdHRyc1snY2xhc3MnXSA9IF8ucmVzdWx0KHRoaXMsICdjbGFzc05hbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudCh0aGlzLl9jcmVhdGVFbGVtZW50KF8ucmVzdWx0KHRoaXMsICd0YWdOYW1lJykgfHwgJ2RpdicpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NldEF0dHJpYnV0ZXMoYXR0cnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNley8vaG93ZXZlciwgZGVmYXVsdCB0byB0aGlzLmVsIGJlaW5nIGEgZG9jdW1lbnRmcmFnbWVudCAobWFrZXMgdGhpcy5lbCBuYW1lZCBpbXByb3Blcmx5IGJ1dCB3aGF0ZXZlcilcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChfLnJlc3VsdCh0aGlzLCAnZWwnKSk7XG4gICAgICAgICAgICB9XG4gICAgfSxcbiAgICBzZXQ6ZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgdGhpcy52aWV3TW9kZWwuc2V0KG9iaik7XG4gICAgfSxcbiAgICBnZXQ6ZnVuY3Rpb24ocHJvcCl7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXdNb2RlbC5nZXQocHJvcClcbiAgICB9XG59KTtcbiIsIi8vU2FtZSBtb2RlbCwgY29sbGVjdGlvbiBpbiBzYW1lIGZpbGUgZm9yIG5vdyBiZWNhdXNlIHRoZXNlIG1vZHVsZXMgcmVseSBvbiBlYWNoIG90aGVyLlxuXG4vKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgTW9kZWwgZnJvbSBcIi4vTW9kZWxcIjtcbmltcG9ydCBDb2xsZWN0aW9uIGZyb20gXCIuL0NvbGxlY3Rpb25cIjtcbmltcG9ydCBWaWV3IGZyb20gXCIuL1ZpZXdcIjtcbmltcG9ydCBEaXJlY3RpdmVSZWdpc3RyeSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnlcIjtcbi8qaW1wb3J0ICQgZnJvbSBcImpxdWVyeVwiOyovXG5cbnZhciBGYWppdGEgPSB7TW9kZWwsIENvbGxlY3Rpb24sIFZpZXcsIERpcmVjdGl2ZVJlZ2lzdHJ5fTtcbkZhaml0YVtcIvCfjK5cIl0gPSBcIjAuMC4wXCI7XG5cbmlmICh0eXBlb2Ygd2luZG93IT09XCJ1bmRlZmluZWRcIikgd2luZG93LkZhaml0YSA9IEZhaml0YTtcbmlmICh0eXBlb2YgZ2xvYmFsIT09XCJ1bmRlZmluZWRcIikgZ2xvYmFsLkZhaml0YSA9IEZhaml0YTsiXSwibmFtZXMiOlsiQmFja2JvbmUiLCJNb2RlbCIsImV4dGVuZCIsIm9wdGlvbnMiLCJVUkxTZWFyY2hQYXJhbXMiLCJxdWVyeSIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwic3RydWN0dXJlIiwicGFyZW50TW9kZWxzIiwiaW5pdCIsImF0dHIiLCJfIiwiaXNTdHJpbmciLCJwcm9wcyIsInNwbGl0IiwibGVuZ3RoIiwibW9kZWwiLCJzbGljZSIsImZvckVhY2giLCJwcm9wIiwiZ2V0IiwicHJvdG90eXBlIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJpc1VuZGVmaW5lZCIsImtleSIsInZhbDEiLCJ2YWwyIiwic2V0IiwidmFsIiwiaSIsIm5ld01vZGVsIiwiRmFqaXRhIiwiaXNBcnJheSIsIkNvbGxlY3Rpb24iLCJwdXNoIiwibGlzdGVuVG8iLCJ0cmlnZ2VyIiwib24iLCJWaWV3IiwibmFtZSIsImNvbnNvbGUiLCJlcnJvciIsInZpZXciLCJjaGlsZEluaXQiLCJidWlsZCIsInVwZGF0ZVJlc3VsdCIsInZpZXdNb2RlbCIsInJlbmRlciIsInJlc3VsdCIsImlzRnVuY3Rpb24iLCJjYWxsIiwiRGlyZWN0aXZlIiwiJGVsIiwiZWwiLCJzZXRBdHRyaWJ1dGUiLCJpbm5lckhUTUwiLCJ2YWx1ZSIsInBhc3MiLCJnZXRBdHRyaWJ1dGUiLCIkIiwiYSIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImNsYXNzTGlzdCIsImFkZCIsIndyYXBwZXJBIiwicGFyZW50Tm9kZSIsInJlcGxhY2VDaGlsZCIsImFwcGVuZENoaWxkIiwicGFyZW50IiwiYXJncyIsInN1YlZpZXdOYW1lIiwic3ViTW9kZWxOYW1lIiwic3ViTW9kZWwiLCJzdWJDb2xsZWN0aW9uIiwiY2hpbGRNYXBwaW5ncyIsIm1hcHBpbmdzIiwib3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoIiwiQWJzdHJhY3RTdWJ2aWV3IiwicmVuZGVyQWRkIiwicmVuZGVyUmVzZXQiLCJyZW5kZXJSZW1vdmUiLCJyZW5kZXJTb3J0IiwiQ2hpbGRWaWV3IiwiY2hpbGRWaWV3SW1wb3J0cyIsImNoaWxkVmlld09wdGlvbnMiLCJ0YWdOYW1lIiwiY2hpbGRWaWV3cyIsIm1hcCIsImNoaWxkTW9kZWwiLCJtb2RlbHMiLCJhdHRyaWJ1dGVzIiwiY2hpbGR2aWV3IiwiYmluZCIsIl9pbml0aWFsaXplQmFja2JvbmVPYmplY3QiLCJfaW5pdGlhbGl6ZUNoaWxkTWFwcGluZ3MiLCJfaW5pdGlhbGl6ZU92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCIsIl9pbml0aWFsaXplQ2hpbGRWaWV3cyIsInJlcGxhY2VXaXRoIiwic3ViVmlldyIsIiRjaGlsZHJlbiIsImNoaWxkVmlldyIsImluZGV4IiwiZGVsZWdhdGVFdmVudHMiLCIkcGFyZW50IiwiY2hpbGRyZW4iLCJlYWNoIiwiZXhpc3RpbmdDaGlsZFZpZXciLCJmaWx0ZXIiLCJuZXdDaGlsZFZpZXciLCJlbXB0eSIsImNoaWxkIiwiYXBwZW5kIiwibGFzdCIsInJlbW92ZSIsInNwbGljZSIsImNvbnRhaW5zIiwiaGlkZSIsImNzcyIsImJvZHkiLCJFcnJvciIsImlzIiwid3JhcHBlciIsImNoaWxkTm9kZXMiLCJ1bndyYXAiLCJpbnNlcnRCZWZvcmUiLCJzdWJWaWV3SW1wb3J0cyIsIkNoaWxkQ29uc3RydWN0b3IiLCJjbGFzc2VzIiwiY2wiLCJwYXJlbnREaXJlY3RpdmUiLCJvcHRpb25zU2VudFRvU3ViVmlldyIsImNvbnRlbnQiLCJyZWdpc3RyeSIsIkRpcmVjdGl2ZUNvbnRlbnQiLCJEaXJlY3RpdmVFbmFibGUiLCJEaXJlY3RpdmVEaXNhYmxlIiwiRGlyZWN0aXZlSHJlZiIsIkRpcmVjdGl2ZU1hcCIsIkRpcmVjdGl2ZU9wdGlvbmFsIiwiRGlyZWN0aXZlT3B0aW9uYWxXcmFwIiwiRGlyZWN0aXZlU3JjIiwiRGlyZWN0aXZlU3VidmlldyIsIkRpcmVjdGl2ZURhdGEiLCJiYWNrYm9uZVZpZXdPcHRpb25zIiwiYWRkaXRpb25hbFZpZXdPcHRpb25zIiwibiIsIndhbGsiLCJjcmVhdGVUcmVlV2Fsa2VyIiwiTm9kZUZpbHRlciIsIlNIT1dfVEVYVCIsIm5leHROb2RlIiwiZGlmZmVyZW5jZSIsImtleXMiLCJ1bmlvbiIsIndhcm4iLCJqc3QiLCJ0ZW1wbGF0ZVN0cmluZyIsImNpZCIsInVuaXF1ZUlkIiwidHBsaWQiLCJ0ZW1wbGF0ZSIsInBpY2siLCJjb25jYXQiLCJkZWZhdWx0cyIsImRlZiIsImF0dHJzIiwiY2xvbmUiLCJsb2ciLCJwcm9wTWFwIiwiZnVuY3MiLCJtb2RlbFZhciIsInRlbXBsYXRlVmFyIiwidXBkYXRlQ29udGV4dE9iamVjdCIsIl9zZXRBdHRyaWJ1dGVzIiwiT2JqZWN0IiwiX2Vuc3VyZUVsZW1lbnQiLCJidWlsZElubmVySFRNTCIsImluaXREaXJlY3RpdmVzIiwiaW5pdGlhbGl6ZSIsIm9iaiIsIm1hcE9iamVjdCIsImZ1bmMiLCJyZXQiLCJodG1sIiwicmVuZGVyZWRUZW1wbGF0ZSIsImR1bW15ZGl2IiwiX2luaXRpYWxUZXh0Tm9kZXMiLCJ0ZXh0Tm9kZXNVbmRlciIsIl9zdWJWaWV3RWxlbWVudHMiLCJmdWxsVGV4dE5vZGUiLCJyZSIsIm1hdGNoIiwibWF0Y2hlcyIsImV4ZWMiLCJ0ZXh0Q29udGVudCIsImN1cnJlbnRUZXh0Tm9kZSIsImN1cnJlbnRTdHJpbmciLCJwcmV2Tm9kZXNMZW5ndGgiLCJ2YXJOb2RlIiwic3BsaXRUZXh0IiwiZW50aXJlTWF0Y2giLCJkaXJlY3RpdmUiLCJkaXJlY3RpdmVOYW1lIiwiRGlyZWN0aXZlUmVnaXN0cnkiLCJfX3Byb3RvIiwiZWxlbWVudHMiLCJtYWtlQXJyYXkiLCJmaW5kIiwicXVlcnlTZWxlY3RvckFsbCIsImVsZW1lbnQiLCJzdWJWaWV3RWxlbWVudCIsImV2ZW50cyIsImRlbGVnYXRlRXZlbnRTcGxpdHRlciIsInVuZGVsZWdhdGVFdmVudHMiLCJtZXRob2QiLCJldmVudFR5cGVzIiwic2VsZWN0b3IiLCJzZWxmIiwiZXZlbnROYW1lIiwiZGVsZWdhdGUiLCJ1bmRlZmluZWQiLCJpZCIsImNsYXNzTmFtZSIsInNldEVsZW1lbnQiLCJfY3JlYXRlRWxlbWVudCIsImNyZWF0ZURvY3VtZW50RnJhZ21lbnQiLCJnbG9iYWwiXSwibWFwcGluZ3MiOiI7OztBQUFBOzs7QUFJQSxZQUFlQSxTQUFTQyxLQUFULENBQWVDLE1BQWYsQ0FBc0I7O2NBRXhCLG9CQUFTQyxPQUFULEVBQWlCO1FBQ3JCLE9BQU9DLGVBQVAsS0FBMkIsV0FBaEMsRUFBNkM7V0FDdENDLEtBQUwsR0FBYSxJQUFJRCxlQUFKLENBQW9CRSxPQUFPQyxRQUFQLENBQWdCQyxNQUFwQyxDQUFiOzs7O1NBTUdDLFNBQUwsR0FBaUIsRUFBakI7O1NBRUtDLFlBQUwsR0FBb0IsRUFBcEI7U0FDS0MsSUFBTDtHQWJpQztRQWU5QixnQkFBVSxFQWZvQjs7T0FpQi9CLGFBQVNDLElBQVQsRUFBYzs7UUFFWkMsRUFBRUMsUUFBRixDQUFXRixJQUFYLENBQUosRUFBcUI7VUFDZkcsUUFBUUgsS0FBS0ksS0FBTCxDQUFXLElBQVgsQ0FBWjtVQUNJRCxNQUFNRSxNQUFOLEdBQWUsQ0FBbkIsRUFBcUI7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
