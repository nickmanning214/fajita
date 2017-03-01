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
        if (this.name === "subview") {
            this.val = this.el.match;
        } else this.val = this.el.getAttribute("nm-" + this.name);

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

/*import $ from "jquery";*/
var DirectiveMap = Directive.extend({
    name: "map",
    childInit: function childInit() {
        this.collection = this.view.viewModel.get(this.val.split(":")[0]);
        this.ChildView = this.view.childViewImports[this.val.split(":")[1]];
        if (this.view.mappings && this.view.mappings[this.val.split(":")[1]]) this.childViewMappings = this.view.mappings[this.val.split(":")[1]];

        //If there is an error here, it's possibly because you didn't include a mapping for this in the giant nested JSON in the parent parent parent parent parent view.

        this.listenTo(this.collection, "add", function () {
            this.renderAdd();
        });

        this.listenTo(this.collection, "reset", function () {
            this.renderReset();
        });

        this.listenTo(this.collection, "remove", function () {
            this.renderRemove();
        });

        this.listenTo(this.collection, "sort", function () {
            this.renderSort();
        });
    },
    build: function build() {
        //Map models to childView instances with their mappings
        this.childViews = this.collection.map(function (childModel, i) {
            var childview = new this.ChildView({
                model: childModel,
                mappings: this.childViewMappings,
                index: i,
                lastIndex: this.collection.length - i - 1,
                collection: this.collection,
                data: this.view.viewModel.get(this.val.split(":")[0])[i],
                tagName: this.el.tagName
            });
            childview._setAttributes(_.extend({}, _.result(childview, 'attributes')));
            return childview;
        }.bind(this));

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
    },
    renderAdd: function renderAdd() {
        var children = [];
        this.collection.each(function (model, i) {
            var existingChildView = this.childViews.filter(function (childView) {
                return childView.model == model;
            })[0];
            if (existingChildView) {
                children.push(existingChildView.el);
                var attributes = _.extend({}, _.result(existingChildView, 'attributes'));
                existingChildView._setAttributes(attributes);
            } else {
                var newChildView = new this.ChildView({
                    model: model,
                    mappings: this.childViewMappings,
                    index: i,
                    lastIndex: this.collection.length - i - 1,
                    collection: this.collection,
                    data: this.view.viewModel.get(this.val.split(":")[0])[i]
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
var DirectiveSubview = Directive.extend({
    name: "subview",
    childInit: function childInit() {

        var args = this.val.split(":");
        var subViewName = args[0];
        if (args[1]) {
            var subModelName = args[1];
            var model = this.view.get(subModelName);
            if (model instanceof Backbone.Model) this.subModel = model;else if (model instanceof Backbone.Collection) this.subCollection = model;
        }

        //The JSON object to pass as "mappings" to the subview or the item in the subCollection.
        //Do not shorten to view.get. view.get gets from the viewModel which contains props and values...not view props and app props
        this.childMappings = this.view.mappings && this.view.mappings[subViewName];

        //Not shortened to view.get because I'm not sure if it is useful to do so.
        //view.get gets the app value mapped to the default value, and if not then it gets the default value.
        //I think you're just overriding defaults with defaults, and nothing fancier than that.
        this.overrideSubviewDefaultsHash = this.view.defaults && this.view.defaults[subViewName];

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
            this.ChildView = this.view.childViewImports[subViewName];
            this.childViewOptions = {
                mappings: this.childMappings,
                collection: this.subCollection,
                tagName: this.view.childViewImports[subViewName].prototype.tagName || "subitem",
                overrideSubviewDefaultsHash: this.overrideSubviewDefaultsHash
            };
            this.childViews = this.subCollection.map(function (childModel, i) {

                var childViewOptions = _.extend({}, this.childViewOptions, {
                    model: childModel,
                    index: i,
                    lastIndex: this.subCollection.length - i - 1,
                    overrideSubviewDefaultsHash: this.overrideSubviewDefaultsHash.models[i].attributes });

                var childview = new this.ChildView(childViewOptions);
                //childview._setAttributes(_.extend({}, _.result(childview, 'attributes')));
                return childview;
            }.bind(this));
        }

        if (!this.subCollection) {
            if (this.view.subViewImports[subViewName].prototype instanceof Backbone.View) this.ChildConstructor = this.view.subViewImports[subViewName];else this.ChildConstructor = this.view.subViewImports[subViewName].call(this.view);
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
                if (name !== "subview") {
                    var elements = this.$el ? $.makeArray(this.$el.find("[nm-" + name + "]")) : $.makeArray($(this.el.querySelectorAll("[nm-" + name + "]")));

                    if (elements.length) {
                        this.directive[name] = elements.map(function (element, i, elements) {
                            //on the second go-around for nm-map, directiveName somehow is called "SubView"
                            return new registry[directiveName]({
                                view: this,
                                el: element
                            });
                        }.bind(this));
                    }
                } else {
                    this.directive["subview"] = this._subViewElements.map(function (subViewElement, i, subViewElements) {
                        return new registry["Subview"]({
                            view: this,
                            el: subViewElement
                        });
                    }.bind(this));
                }
            }
        }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFqaXRhLmpzIiwic291cmNlcyI6WyJNb2RlbC5qcyIsIkNvbGxlY3Rpb24uanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1jb250ZW50LmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1lbmFibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWRpc2FibGUuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLWhyZWYuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLW1hcC5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtb3B0aW9uYWwuanMiLCJkaXJlY3RpdmUvZGlyZWN0aXZlLW9wdGlvbmFsd3JhcC5qcyIsImRpcmVjdGl2ZS9kaXJlY3RpdmUtc3JjLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1zdWJ2aWV3LmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZS1kYXRhLmpzIiwiZGlyZWN0aXZlL2RpcmVjdGl2ZVJlZ2lzdHJ5LmpzIiwiVmlldy5qcyIsIkJhc2UuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyppbXBvcnQgXyBmcm9tIFwidW5kZXJzY29yZVwiOyovXG4vKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuXG5cbmV4cG9ydCBkZWZhdWx0IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gIGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgaWYgKCB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSBcInVuZGVmaW5lZFwiICl7XG4gICAgICB0aGlzLnF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICB9XG5cbiAgICAvL3Bvc3NpYmx5IGRlcHJlY2F0ZWQgYmVjYXVzZSBpZiBzdWJNb2RlbHMgYW5kIHN1YkNvbGxlY3Rpb25zIGFyZSBzZXBhcmF0ZWQgdGhlbiBob3cgdG8geW91IHJlZiB0aGVtIGluIGdldCBpZCB0aGVyZSBpcyBhIG5hbWUgY29uZmxpY3Q/XG4gICAgdGhpcy5zdWJNb2RlbHMgPSB7fTtcbiAgICB0aGlzLnN1YkNvbGxlY3Rpb25zID0ge307XG5cbiAgICAvL25ld1xuICAgIHRoaXMuc3RydWN0dXJlID0ge307XG5cbiAgICB0aGlzLnBhcmVudE1vZGVscyA9IFtdO1xuICAgIHRoaXMuaW5pdCgpO1xuICB9LFxuICBpbml0OmZ1bmN0aW9uKCl7fSxcbiAgcmVnaXN0ZXJTdWJDb2xsZWN0aW9uOmZ1bmN0aW9uKHByb3AsY29sbGVjdGlvbil7XG4gICAgaWYgKF8uaXNBcnJheShjb2xsZWN0aW9uKSkgY29sbGVjdGlvbiA9IG5ldyBCYXNlLkNvbGxlY3Rpb24oY29sbGVjdGlvbik7XG4gICAgZWxzZSBpZiAoIShjb2xsZWN0aW9uIGluc3RhbmNlb2YgQmFja2JvbmUuQ29sbGVjdGlvbikpIGNvbGxlY3Rpb24gPSBuZXcgQmFzZS5Db2xsZWN0aW9uKF8udG9BcnJheShjb2xsZWN0aW9uKSlcbiAgICB0aGlzLnN1YkNvbGxlY3Rpb25zW3Byb3BdID0gY29sbGVjdGlvbjtcbiAgICBjb2xsZWN0aW9uLnBhcmVudE1vZGVscy5wdXNoKHRoaXMpO1xuICAgIHRoaXMubGlzdGVuVG8oY29sbGVjdGlvbixcImFkZCByZW1vdmUgcmVzZXQgc29ydFwiLGZ1bmN0aW9uKCl7XG4gICAgICB0aGlzLnRyaWdnZXIoXCJjaGFuZ2VcIik7XG4gICAgfSlcbiAgfSxcbiAgZ2V0OmZ1bmN0aW9uKGF0dHIpe1xuICAgIGlmIChfLmlzU3RyaW5nKGF0dHIpICYmIGF0dHIuc3RhcnRzV2l0aChcIi0+XCIpKSB7XG4gICAgICByZXR1cm4gdGhpcy5zdHJ1Y3R1cmVbYXR0ci5zdWJzdHIoMildO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgdmFyIGdldCA9IEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5nZXQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKGdldCkpIHJldHVybiBnZXQ7XG5cbiAgICAgIHZhciBwcm9wcyA9IGF0dHIuc3BsaXQoXCIuXCIpO1xuICAgICAgICBpZiAocHJvcHMubGVuZ3RoID4gMSl7XG4gICAgICAgICAgdmFyIG1vZGVsID0gdGhpcztcbiAgICAgICAgICBwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3Ape1xuICAgICAgICAgICAgaWYgKG1vZGVsLnN1Yk1vZGVsc1twcm9wXSkgbW9kZWwgPSBtb2RlbC5zdWJNb2RlbHNbcHJvcF07XG4gICAgICAgICAgICBlbHNlIGlmIChtb2RlbC5zdWJDb2xsZWN0aW9uc1twcm9wXSkgbW9kZWwgPSBtb2RlbC5zdWJDb2xsZWN0aW9uc1twcm9wXVxuICAgICAgICAgIH0pXG4gICAgICAgICAgcmV0dXJuIG1vZGVsOyAgIFxuICAgICAgICB9XG4gICAgXG4gICAgICAgIHJldHVybiB0aGlzLnN1Yk1vZGVsc1thdHRyXSB8fCB0aGlzLnN1YkNvbGxlY3Rpb25zW2F0dHJdXG4gICAgfVxuXG4gICBcbiAgIFxuICB9LFxuICB0b2dnbGU6ZnVuY3Rpb24oa2V5LHZhbDEsdmFsMil7XG4gICAgaWYgKHRoaXMuZ2V0KGtleSk9PXZhbDIpe1xuICAgICAgdGhpcy5zZXQoa2V5LHZhbDEpO1xuICAgIH1cbiAgICBlbHNlIHRoaXMuc2V0KGtleSx2YWwyKTtcbiAgfSxcbiAgc2V0OmZ1bmN0aW9uKGtleSwgdmFsLCBvcHRpb25zKXtcbiAgICAgIC8vbXkgY29kZVxuICAgICAgaWYgKF8uaXNTdHJpbmcoa2V5KSAmJiBrZXkuc3RhcnRzV2l0aChcIi0+XCIpKSB7XG5cbiAgICAgICAgdmFyIG1vZGVsT3JDb2xsZWN0aW9uID0gKF8uaXNBcnJheSh2YWwpKT9uZXcgRmFqaXRhLkNvbGxlY3Rpb24odmFsKTpuZXcgRmFqaXRhLk1vZGVsKHZhbCk7XG4gICAgICAgIG1vZGVsT3JDb2xsZWN0aW9uLnBhcmVudE1vZGVscy5wdXNoKHRoaXMpO1xuICAgICAgICB0aGlzLnN0cnVjdHVyZVtrZXkuc3Vic3RyKDIpXSA9IG1vZGVsT3JDb2xsZWN0aW9uO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIHRoaXMubGlzdGVuVG8obW9kZWxPckNvbGxlY3Rpb24sXCJjaGFuZ2UgYWRkXCIsZnVuY3Rpb24obW9kZWxPckNvbGxlY3Rpb24sb3B0aW9ucyl7XG5cbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcImNoYW5nZVwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLyogVE9ETzogaW52ZW50IGVudGlyZSBzeXN0ZW0gZm9yIHRyYXZlcnNpbmcgYW5kIGZpcmluZyBldmVudHMuIFByb2JhYmx5IG5vdCB3b3J0aCB0aGUgZWZmb3J0IGZvciBub3cuXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhtb2RlbC5jaGFuZ2VkQXR0cmlidXRlcygpKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcImNoYW5nZTpcIitwcm9wK1wiLlwiK2tleSlcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAqL1xuXG5cbiAgICAgICAgICB9KTtcblxuICAgICAgIFxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLC4uLmFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgICBcbiAgICAgXG4gIH1cbiAgLy9Ob3RlOiB0aGVyZSBpcyBzdGlsbCBubyBsaXN0ZW5lciBmb3IgYSBzdWJtb2RlbCBvZiBhIGNvbGxlY3Rpb24gY2hhbmdpbmcsIHRyaWdnZXJpbmcgdGhlIHBhcmVudC4gSSB0aGluayB0aGF0J3MgdXNlZnVsLlxufSk7IiwiLyppbXBvcnQgXyBmcm9tIFwidW5kZXJzY29yZVwiOyovXG4vKmltcG9ydCBCYWNrYm9uZSBmcm9tIFwiYmFja2JvbmVcIjsqL1xuaW1wb3J0IE1vZGVsIGZyb20gXCIuL01vZGVsXCI7XG5cbmV4cG9ydCBkZWZhdWx0IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICBtb2RlbDpNb2RlbCwgLy9wcm9ibGVtOiBNb2RlbCByZWxpZXMgb24gY29sbGVjdGlvbiBhcyB3ZWxsIGNhdXNpbmcgZXJyb3JcbiAgICBpbml0aWFsaXplOmZ1bmN0aW9uKCl7XG4gICAgICAgICB0aGlzLnBhcmVudE1vZGVscyA9IFtdO1xuICAgICAgICAvL3RyaWdnZXIgXCJ1cGRhdGVcIiB3aGVuIHN1Ym1vZGVsIGNoYW5nZXNcbiAgICAgICAgdGhpcy5vbihcImFkZFwiLGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8obW9kZWwsXCJjaGFuZ2VcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcInVwZGF0ZVwiKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxufSk7IiwiLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cblxuZXhwb3J0IGRlZmF1bHQgQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICAgIG5hbWU6bnVsbCxcbiAgICBidWlsZDpudWxsLFxuICAgIHJlbmRlcjpudWxsLFxuICAgIGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgICAgIGlmICghdGhpcy5uYW1lKSBjb25zb2xlLmVycm9yKFwiRXJyb3I6IERpcmVjdGl2ZSByZXF1aXJlcyBhIG5hbWUgaW4gdGhlIHByb3RvdHlwZS5cIik7XG4gICAgICAgIGlmICh0aGlzLm5hbWU9PT1cInN1YnZpZXdcIil7XG5cdFx0XHR0aGlzLnZhbCA9IHRoaXMuZWwubWF0Y2g7XG5cdFx0fVxuXHRcdGVsc2UgdGhpcy52YWwgPSB0aGlzLmVsLmdldEF0dHJpYnV0ZShcIm5tLVwiICsgdGhpcy5uYW1lKTtcbiAgICAgICAgXG4gICAgICAgIC8vdmlldyBpcyB0aGUgdmlldyB0aGF0IGltcGxlbWVudHMgdGhpcyBkaXJlY3RpdmUuXG4gICAgICAgIGlmICghb3B0aW9ucy52aWV3KSBjb25zb2xlLmVycm9yKFwiRXJyb3I6IERpcmVjdGl2ZSByZXF1aXJlcyBhIHZpZXcgcGFzc2VkIGFzIGFuIG9wdGlvbi5cIik7XG4gICAgICAgIHRoaXMudmlldyA9IG9wdGlvbnMudmlldztcbiAgICAgICAgaWYgKCF0aGlzLmNoaWxkSW5pdCkgY29uc29sZS5lcnJvcihcIkVycm9yOiBEaXJlY3RpdmUgcmVxdWlyZXMgY2hpbGRJbml0IGluIHByb3RvdHlwZS5cIik7XG4gICAgICAgIHRoaXMuY2hpbGRJbml0KCk7XG4gICAgICAgIHRoaXMuYnVpbGQoKTtcbiAgICB9LFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgIFxuICAgICAgICB0aGlzLnVwZGF0ZVJlc3VsdCgpO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMudmlldy52aWV3TW9kZWwsXCJjaGFuZ2U6XCIrdGhpcy52YWwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUmVzdWx0KCk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9KTtcblxuICAgIH0sXG4gICAgdXBkYXRlUmVzdWx0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciByZXN1bHQgPSB0aGlzLnZpZXcuZ2V0KHRoaXMudmFsKTtcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihyZXN1bHQpKSB0aGlzLnJlc3VsdCA9IHJlc3VsdC5jYWxsKHRoaXMudmlldyk7XG4gICAgICAgIGVsc2UgdGhpcy5yZXN1bHQgPSByZXN1bHQ7XG4gICAgfVxufSk7IiwiaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuLy9Ob3RlOiBEb24ndCB1c2UgLmh0bWwoKSBvciAuYXR0cigpIGpxdWVyeS4gSXQncyB3ZWlyZCB3aXRoIGRpZmZlcmVudCB0eXBlcy5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJjb250ZW50XCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMuJGVsLnByb3AoXCJ0YWdOYW1lXCIpPT1cIklNR1wiKSB0aGlzLmVsLnNldEF0dHJpYnV0ZShcInRpdGxlXCIsdGhpcy5yZXN1bHQpXG4gICAgICAgIGVsc2UgdGhpcy5lbC5pbm5lckhUTUwgPSB0aGlzLnJlc3VsdDtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmJ1aWxkKCk7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgdmFyIHBhc3MgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuJGVsLnByb3AoXCJ0YWdOYW1lXCIpPT1cIklNR1wiKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5lbC5nZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiKT09dmFsdWUgKyBcIlwiKSBwYXNzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLmVsLmlubmVySFRNTD09dmFsdWUrXCJcIikgcGFzcyA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcGFzcztcbiAgICB9XG59KTsiLCIvL1doeSBkb2VzIHVuZGVyc2NvcmUgd29yayBoZXJlP1xuXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiZW5hYmxlXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCkgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIix0cnVlKTtcbiAgICAgICAgZWxzZSAkKHRoaXMuZWwpLnByb3AoXCJkaXNhYmxlZFwiLFwiXCIpO1xuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsdHJ1ZSk7XG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIixcIlwiKTtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICByZXR1cm4gJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIikhPXZhbHVlO1xuICAgIH1cbn0pO1xuIiwiLy9XaHkgZG9lcyB1bmRlcnNjb3JlIHdvcmsgaGVyZT9cblxuaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcImRpc2FibGVcIixcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy5yZXN1bHQpICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsdHJ1ZSk7XG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIixcIlwiKTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy5yZXN1bHQpICQodGhpcy5lbCkucHJvcChcImRpc2FibGVkXCIsdHJ1ZSk7XG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIixcIlwiKTtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICByZXR1cm4gJCh0aGlzLmVsKS5wcm9wKFwiZGlzYWJsZWRcIik9PXZhbHVlO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcImhyZWZcIixcbiAgIFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJBXCIpIHRoaXMuJGVsLmF0dHIoXCJocmVmXCIsdGhpcy5yZXN1bHQpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XG4gICAgICAgICAgICBhLmNsYXNzTGlzdC5hZGQoXCJ3cmFwcGVyLWFcIilcbiAgICAgICAgICAgIGEuc2V0QXR0cmlidXRlKFwiaHJlZlwiLHRoaXMucmVzdWx0KTtcbiAgICAgICAgICAgIHRoaXMud3JhcHBlckEgPSBhO1xuICAgICAgICAgICAgdGhpcy5lbC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZCh0aGlzLndyYXBwZXJBLHRoaXMuZWwpXG4gICAgICAgICAgICAvL2Nhbid0IHNpbXBseSB1c2UgdGhpcy4kZWwud3JhcChhKTtcbiAgICAgICAgICAgIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy81NzA3MzI4L3dyYXAtb25lLWVsZW1lbnQtd2l0aC1hbm90aGVyLXJldGFpbmluZy1yZWZlcmVuY2UtdG8td3JhcHBlclxuICAgICAgICAgICAgdGhpcy53cmFwcGVyQS5hcHBlbmRDaGlsZCh0aGlzLmVsKTtcbiAgICAgICAgfVxuICAgICAgICB3aW5kb3cud3JhcHBlckEgPSB0aGlzLndyYXBwZXJBO1xuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbC5wcm9wKFwidGFnTmFtZVwiKT09XCJBXCIpICQodGhpcy5lbCkuYXR0cihcImhyZWZcIix0aGlzLnJlc3VsdClcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLndyYXBwZXJBLnNldEF0dHJpYnV0ZShcImhyZWZcIix0aGlzLnJlc3VsdCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICBpZiAodGhpcy4kZWwucHJvcChcInRhZ05hbWVcIik9PVwiQVwiKSByZXR1cm4gJCh0aGlzLmVsKS5hdHRyKFwiaHJlZlwiKT09dmFsdWVcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gJCh0aGlzLmVsKS5wYXJlbnQoKS5wcm9wKFwidGFnTmFtZVwiKT09XCJBXCIgJiYgJCh0aGlzLmVsKS5wYXJlbnQoKS5hdHRyKFwiaHJlZlwiKT09dmFsdWVcbiAgICAgICAgfVxuICAgIH1cbn0pOyIsIi8qaW1wb3J0ICQgZnJvbSBcImpxdWVyeVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwibWFwXCIsXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbiA9IHRoaXMudmlldy52aWV3TW9kZWwuZ2V0KHRoaXMudmFsLnNwbGl0KFwiOlwiKVswXSk7XG4gICAgICAgIHRoaXMuQ2hpbGRWaWV3ID0gdGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbdGhpcy52YWwuc3BsaXQoXCI6XCIpWzFdXTtcbiAgICAgICAgaWYgKHRoaXMudmlldy5tYXBwaW5ncyAmJiB0aGlzLnZpZXcubWFwcGluZ3NbdGhpcy52YWwuc3BsaXQoXCI6XCIpWzFdXSkgdGhpcy5jaGlsZFZpZXdNYXBwaW5ncyA9IHRoaXMudmlldy5tYXBwaW5nc1t0aGlzLnZhbC5zcGxpdChcIjpcIilbMV1dO1xuICAgICAgICBcbiAgICAgICBcblxuICAgICAgICAvL0lmIHRoZXJlIGlzIGFuIGVycm9yIGhlcmUsIGl0J3MgcG9zc2libHkgYmVjYXVzZSB5b3UgZGlkbid0IGluY2x1ZGUgYSBtYXBwaW5nIGZvciB0aGlzIGluIHRoZSBnaWFudCBuZXN0ZWQgSlNPTiBpbiB0aGUgcGFyZW50IHBhcmVudCBwYXJlbnQgcGFyZW50IHBhcmVudCB2aWV3LlxuICAgICAgICBcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sXCJhZGRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJBZGQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sXCJyZXNldFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclJlc2V0KCk7XG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sXCJyZW1vdmVcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJSZW1vdmUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sXCJzb3J0XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyU29ydCgpOyAgICAgICAgXG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgLy9NYXAgbW9kZWxzIHRvIGNoaWxkVmlldyBpbnN0YW5jZXMgd2l0aCB0aGVpciBtYXBwaW5nc1xuICAgICAgICB0aGlzLmNoaWxkVmlld3MgPSB0aGlzLmNvbGxlY3Rpb24ubWFwKGZ1bmN0aW9uKGNoaWxkTW9kZWwsaSl7XG4gICAgICAgICAgICB2YXIgY2hpbGR2aWV3ID0gbmV3IHRoaXMuQ2hpbGRWaWV3KHtcbiAgICAgICAgICAgICAgICBtb2RlbDpjaGlsZE1vZGVsLFxuICAgICAgICAgICAgICAgIG1hcHBpbmdzOnRoaXMuY2hpbGRWaWV3TWFwcGluZ3MsXG4gICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICBsYXN0SW5kZXg6dGhpcy5jb2xsZWN0aW9uLmxlbmd0aCAtIGkgLSAxLFxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5jb2xsZWN0aW9uLFxuICAgICAgICAgICAgICAgIGRhdGE6dGhpcy52aWV3LnZpZXdNb2RlbC5nZXQodGhpcy52YWwuc3BsaXQoXCI6XCIpWzBdKVtpXSxcbiAgICAgICAgICAgICAgICB0YWdOYW1lOnRoaXMuZWwudGFnTmFtZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjaGlsZHZpZXcuX3NldEF0dHJpYnV0ZXMoXy5leHRlbmQoe30sIF8ucmVzdWx0KGNoaWxkdmlldywgJ2F0dHJpYnV0ZXMnKSkpO1xuICAgICAgICAgICAgcmV0dXJuIGNoaWxkdmlldztcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuXG4gICAgICAgIHZhciAkY2hpbGRyZW4gPSAkKCk7XG4gICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICRjaGlsZHJlbiA9ICRjaGlsZHJlbi5hZGQoY2hpbGRWaWV3LmVsKVxuICAgICAgICAgICAgY2hpbGRWaWV3LmluZGV4ID0gaTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgaWYgKCRjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuJGVsLnJlcGxhY2VXaXRoKCRjaGlsZHJlbik7XG4gICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gJGNoaWxkcmVuLnBhcmVudCgpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJGNoaWxkcmVuID0gJGNoaWxkcmVuXG4gICAgfSxcbiAgICByZW5kZXJBZGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gW107XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKG1vZGVsLGkpe1xuICAgICAgICAgICAgdmFyIGV4aXN0aW5nQ2hpbGRWaWV3ID0gdGhpcy5jaGlsZFZpZXdzLmZpbHRlcihmdW5jdGlvbihjaGlsZFZpZXcpe1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZFZpZXcubW9kZWwgPT0gbW9kZWxcbiAgICAgICAgICAgIH0pWzBdO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nQ2hpbGRWaWV3KSB7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaChleGlzdGluZ0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICB2YXIgYXR0cmlidXRlcyA9IF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChleGlzdGluZ0NoaWxkVmlldywgJ2F0dHJpYnV0ZXMnKSlcbiAgICAgICAgICAgICAgICBleGlzdGluZ0NoaWxkVmlldy5fc2V0QXR0cmlidXRlcyhhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBuZXdDaGlsZFZpZXcgPSBuZXcgdGhpcy5DaGlsZFZpZXcoe1xuICAgICAgICAgICAgICAgICAgICBtb2RlbDptb2RlbCxcbiAgICAgICAgICAgICAgICAgICAgbWFwcGluZ3M6dGhpcy5jaGlsZFZpZXdNYXBwaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6aSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdEluZGV4OnRoaXMuY29sbGVjdGlvbi5sZW5ndGggLSBpIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbjp0aGlzLmNvbGxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6dGhpcy52aWV3LnZpZXdNb2RlbC5nZXQodGhpcy52YWwuc3BsaXQoXCI6XCIpWzBdKVtpXVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnB1c2gobmV3Q2hpbGRWaWV3KTtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKG5ld0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKXtcbiAgICAgICAgICAgIHRoaXMuJHBhcmVudC5hcHBlbmQoY2hpbGQpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkKGNoaWxkcmVuKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIH0pXG5cbiAgICB9LFxuICAgIHJlbmRlclJlc2V0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgIH0sXG4gICAgcmVuZGVyUmVtb3ZlOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGNoaWxkcmVuLmxhc3QoKS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnNwbGljZSgtMSwxKTtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSB0aGlzLiRwYXJlbnQuY2hpbGRyZW4oKTtcbiAgICB9LFxuICAgIHJlbmRlclNvcnQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgIC8vRG9uJ3QgbmVlZCB0aGlzIChub3cpLiBNb2RlbHMgd2lsbCBhbHJlYWR5IGJlIHNvcnRlZCBvbiBhZGQgd2l0aCBjb2xsZWN0aW9uLmNvbXBhcmF0b3IgPSB4eHg7XG4gICAgfVxufSk7IiwiLyppbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7Ki9cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJvcHRpb25hbFwiLFxuICAgIFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5yZXN1bHQpICQodGhpcy5lbCkuaGlkZSgpXG4gICAgICAgIGVsc2UgJCh0aGlzLmVsKS5jc3MoXCJkaXNwbGF5XCIsXCJcIik7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCkgJCh0aGlzLmVsKS5oaWRlKClcbiAgICAgICAgZWxzZSAkKHRoaXMuZWwpLmNzcyhcImRpc3BsYXlcIixcIlwiKTtcbiAgICB9LFxuICAgIHRlc3Q6ZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICBpZiAoIWRvY3VtZW50LmJvZHkuY29udGFpbnModGhpcy5lbCkpIHRocm93IEVycm9yKFwiZWxlbWVudCBoYXMgdG8gYmUgaW4gdGhlIERPTSBpbiBvcmRlciB0byB0ZXN0XCIpXG4gICAgICAgIHJldHVybiAkKHRoaXMuZWwpLmlzKFwiOnZpc2libGVcIik9PXZhbHVlO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IERpcmVjdGl2ZSBmcm9tIFwiLi9kaXJlY3RpdmVcIjtcblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlLmV4dGVuZCh7XG4gICAgbmFtZTpcIm9wdGlvbmFsd3JhcFwiLFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICBEaXJlY3RpdmUucHJvdG90eXBlLmNoaWxkSW5pdC5jYWxsKHRoaXMsYXJndW1lbnRzKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMud3JhcHBlciA9IHRoaXMuZWw7XG4gICAgICAgIHRoaXMuY2hpbGROb2RlcyA9IFtdLnNsaWNlLmNhbGwodGhpcy5lbC5jaGlsZE5vZGVzLCAwKTtcbiAgICAgICAgXG4gICAgfSxcbiAgICBidWlsZDpmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMucmVzdWx0KSAkKHRoaXMuY2hpbGROb2RlcykudW53cmFwKCk7XG4gICAgfSxcbiAgICByZW5kZXI6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnJlc3VsdCl7XG4gICAgICAgICAgICAkKHRoaXMuY2hpbGROb2RlcykudW53cmFwKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLmNoaWxkTm9kZXNbMF0pKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmlyc3QgY2hpbGQgaGFzIHRvIGJlIGluIERPTVwiKTtcbiAgICAgICAgICAgICAgICAvL3NvbHV0aW9uOiBhZGQgYSBkdW1teSB0ZXh0IG5vZGUgYXQgYmVnaW5uaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICghZG9jdW1lbnQuYm9keS5jb250YWlucyh0aGlzLndyYXBwZXIpKXtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkTm9kZXNbMF0ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy53cmFwcGVyLHRoaXMuY2hpbGROb2Rlc1swXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IodmFyIGk9MDtpPHRoaXMuY2hpbGROb2Rlcy5sZW5ndGg7aSsrKXtcbiAgICAgICAgICAgICAgICB0aGlzLndyYXBwZXIuYXBwZW5kQ2hpbGQodGhpcy5jaGlsZE5vZGVzW2ldKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKHZhbHVlKXtcblxuXG4gICAgICAgIHJldHVybiAodGhpcy5jaGlsZE5vZGVzWzBdLnBhcmVudE5vZGU9PXRoaXMud3JhcHBlcikgPT0gdmFsdWU7XG5cblxuICAgICAgXG4gICAgfVxufSkiLCJpbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwic3JjXCIsXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy4kZWwuYXR0cihcInNyY1wiLHRoaXMucmVzdWx0KTtcbiAgICB9LFxuICAgIHJlbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLiRlbC5hdHRyKFwic3JjXCIsdGhpcy5yZXN1bHQpO1xuICAgIH0sXG4gICAgdGVzdDpmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgIHJldHVybiB0aGlzLiRlbC5hdHRyKFwic3JjXCIpPT09dmFsdWU7XG4gICAgfVxufSk7IiwiLyppbXBvcnQgQmFja2JvbmUgZnJvbSBcImJhY2tib25lXCI7Ki9cbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IERpcmVjdGl2ZS5leHRlbmQoe1xuICAgIG5hbWU6XCJzdWJ2aWV3XCIsXG4gICAgY2hpbGRJbml0OmZ1bmN0aW9uKCl7XG5cbiAgICAgICAgdmFyIGFyZ3MgPSB0aGlzLnZhbC5zcGxpdChcIjpcIik7XG4gICAgICAgIHZhciBzdWJWaWV3TmFtZSA9IGFyZ3NbMF07XG4gICAgICAgICBpZiAoYXJnc1sxXSl7XG4gICAgICAgICAgICB2YXIgc3ViTW9kZWxOYW1lID0gYXJnc1sxXTtcbiAgICAgICAgICAgIHZhciBtb2RlbCA9IHRoaXMudmlldy5nZXQoc3ViTW9kZWxOYW1lKTtcbiAgICAgICAgICAgIGlmIChtb2RlbCBpbnN0YW5jZW9mIEJhY2tib25lLk1vZGVsKSB0aGlzLnN1Yk1vZGVsID0gbW9kZWw7XG4gICAgICAgICAgICBlbHNlIGlmIChtb2RlbCBpbnN0YW5jZW9mIEJhY2tib25lLkNvbGxlY3Rpb24pIHRoaXMuc3ViQ29sbGVjdGlvbiA9IG1vZGVsO1xuICAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgICAvL1RoZSBKU09OIG9iamVjdCB0byBwYXNzIGFzIFwibWFwcGluZ3NcIiB0byB0aGUgc3VidmlldyBvciB0aGUgaXRlbSBpbiB0aGUgc3ViQ29sbGVjdGlvbi5cbiAgICAgICAgIC8vRG8gbm90IHNob3J0ZW4gdG8gdmlldy5nZXQuIHZpZXcuZ2V0IGdldHMgZnJvbSB0aGUgdmlld01vZGVsIHdoaWNoIGNvbnRhaW5zIHByb3BzIGFuZCB2YWx1ZXMuLi5ub3QgdmlldyBwcm9wcyBhbmQgYXBwIHByb3BzXG4gICAgICAgIHRoaXMuY2hpbGRNYXBwaW5ncyA9IHRoaXMudmlldy5tYXBwaW5ncyAmJiB0aGlzLnZpZXcubWFwcGluZ3Nbc3ViVmlld05hbWVdO1xuXG4gICAgICAgIC8vTm90IHNob3J0ZW5lZCB0byB2aWV3LmdldCBiZWNhdXNlIEknbSBub3Qgc3VyZSBpZiBpdCBpcyB1c2VmdWwgdG8gZG8gc28uXG4gICAgICAgIC8vdmlldy5nZXQgZ2V0cyB0aGUgYXBwIHZhbHVlIG1hcHBlZCB0byB0aGUgZGVmYXVsdCB2YWx1ZSwgYW5kIGlmIG5vdCB0aGVuIGl0IGdldHMgdGhlIGRlZmF1bHQgdmFsdWUuXG4gICAgICAgIC8vSSB0aGluayB5b3UncmUganVzdCBvdmVycmlkaW5nIGRlZmF1bHRzIHdpdGggZGVmYXVsdHMsIGFuZCBub3RoaW5nIGZhbmNpZXIgdGhhbiB0aGF0LlxuICAgICAgICB0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCA9IHRoaXMudmlldy5kZWZhdWx0cyAmJiB0aGlzLnZpZXcuZGVmYXVsdHNbc3ViVmlld05hbWVdO1xuICAgICAgXG5cbiAgICAgICAgaWYgKHRoaXMuc3ViQ29sbGVjdGlvbil7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwiYWRkXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJBZGQoKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwicmVzZXRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclJlc2V0KCk7XG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwicmVtb3ZlXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJSZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5zdWJDb2xsZWN0aW9uLFwic29ydFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyU29ydCgpOyAgICAgICAgXG4gICAgICAgICAgICAgICAgfSk7XG5cblxuXG4gICAgICAgICAgICAgICAgLy9NYXAgbW9kZWxzIHRvIGNoaWxkVmlldyBpbnN0YW5jZXMgd2l0aCB0aGVpciBtYXBwaW5nc1xuICAgICAgICAgICAgICAgIHRoaXMuQ2hpbGRWaWV3ID0gdGhpcy52aWV3LmNoaWxkVmlld0ltcG9ydHNbc3ViVmlld05hbWVdO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3T3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbWFwcGluZ3M6dGhpcy5jaGlsZE1hcHBpbmdzLFxuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOnRoaXMuc3ViQ29sbGVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgdGFnTmFtZTp0aGlzLnZpZXcuY2hpbGRWaWV3SW1wb3J0c1tzdWJWaWV3TmFtZV0ucHJvdG90eXBlLnRhZ05hbWUgfHwgXCJzdWJpdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgIG92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaDp0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzID0gdGhpcy5zdWJDb2xsZWN0aW9uLm1hcChmdW5jdGlvbihjaGlsZE1vZGVsLGkpe1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkVmlld09wdGlvbnMgPSBfLmV4dGVuZCh7fSx0aGlzLmNoaWxkVmlld09wdGlvbnMse1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6Y2hpbGRNb2RlbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0SW5kZXg6dGhpcy5zdWJDb2xsZWN0aW9uLmxlbmd0aCAtIGkgLSAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoOnRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoLm1vZGVsc1tpXS5hdHRyaWJ1dGVzLC8vPz9cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB2YXIgY2hpbGR2aWV3ID0gbmV3IHRoaXMuQ2hpbGRWaWV3KGNoaWxkVmlld09wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAvL2NoaWxkdmlldy5fc2V0QXR0cmlidXRlcyhfLmV4dGVuZCh7fSwgXy5yZXN1bHQoY2hpbGR2aWV3LCAnYXR0cmlidXRlcycpKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZHZpZXc7XG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuXG4gICAgICAgICAgICAgICAgXG5cblxuXG4gICAgICAgIH1cblxuICAgICAgIFxuICAgICAgICBcbiAgICAgICAgXG5cbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgaWYgKHRoaXMudmlldy5zdWJWaWV3SW1wb3J0c1tzdWJWaWV3TmFtZV0ucHJvdG90eXBlIGluc3RhbmNlb2YgQmFja2JvbmUuVmlldykgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3N1YlZpZXdOYW1lXTtcbiAgICAgICAgICAgIGVsc2UgdGhpcy5DaGlsZENvbnN0cnVjdG9yID0gdGhpcy52aWV3LnN1YlZpZXdJbXBvcnRzW3N1YlZpZXdOYW1lXS5jYWxsKHRoaXMudmlldyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMub3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoKXtcbiAgICAgICAgICAgIF8uZXh0ZW5kKG9wdGlvbnMse292ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaDp0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuY2hpbGRNYXBwaW5ncyl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHtcbiAgICAgICAgICAgICAgICBtYXBwaW5nczp0aGlzLmNoaWxkTWFwcGluZ3NcbiAgICAgICAgICAgICAgICAvLyxlbDp0aGlzLmVsIFRoZSBlbCBvZiB0aGUgZGlyZWN0aXZlIHNob3VsZCBiZWxvbmcgdG8gdGhlIGRpcmVjdGl2ZSBidXQgbm90IHRoZSBzdWJ2aWV3IGl0c2VsZlxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHN1Yk1vZGVsID0gdGhpcy5zdWJNb2RlbCB8fCB0aGlzLnZpZXcubW9kZWw7XG4gICAgICAgIGlmIChzdWJNb2RlbCl7XG4gICAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLHttb2RlbDpzdWJNb2RlbH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy5zdWJWaWV3ID0gbmV3IHRoaXMuQ2hpbGRDb25zdHJ1Y3RvcihvcHRpb25zKTtcbiAgICAgICAgICAgIHZhciBjbGFzc2VzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiY2xhc3NOYW1lXCIpXG4gICAgICAgICAgICBpZiAoY2xhc3Nlcyl7XG4gICAgICAgICAgICAgICAgY2xhc3Nlcy5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihjbCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5jbGFzc0xpc3QuYWRkKGNsKVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVzID0gXy5yZXN1bHQodGhpcy5zdWJWaWV3LFwiYXR0cmlidXRlc1wiKTtcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgICAgICBfLmVhY2goYXR0cmlidXRlcyxmdW5jdGlvbih2YWwsbmFtZSl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3ViVmlldy5lbC5zZXRBdHRyaWJ1dGUobmFtZSx2YWwpICAgIFxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zdWJWaWV3LnBhcmVudCA9IHRoaXMudmlldztcbiAgICAgICAgICAgIHRoaXMuc3ViVmlldy5wYXJlbnREaXJlY3RpdmUgPSB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9uc1NlbnRUb1N1YlZpZXcgPSBvcHRpb25zO1xuICAgIH0sXG4gICAgYnVpbGQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLnN1YkNvbGxlY3Rpb24pe1xuICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgodGhpcy5zdWJWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyICRjaGlsZHJlbiA9ICQoKTtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRWaWV3cy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkVmlldyxpKXtcbiAgICAgICAgICAgICAgICAkY2hpbGRyZW4gPSAkY2hpbGRyZW4uYWRkKGNoaWxkVmlldy5lbClcbiAgICAgICAgICAgICAgICBjaGlsZFZpZXcuaW5kZXggPSBpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIGlmICgkY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kZWwucmVwbGFjZVdpdGgoJGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoaWxkVmlld3MuZm9yRWFjaChmdW5jdGlvbihjaGlsZFZpZXcsaSl7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkVmlldy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy4kcGFyZW50ID0gJGNoaWxkcmVuLnBhcmVudCgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuJHBhcmVudCA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkY2hpbGRyZW5cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyQWRkOmZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IFtdO1xuICAgICAgICB0aGlzLnN1YkNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihtb2RlbCxpKXtcbiAgICAgICAgICAgIHZhciBleGlzdGluZ0NoaWxkVmlldyA9IHRoaXMuY2hpbGRWaWV3cy5maWx0ZXIoZnVuY3Rpb24oY2hpbGRWaWV3KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRWaWV3Lm1vZGVsID09IG1vZGVsXG4gICAgICAgICAgICB9KVswXTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ0NoaWxkVmlldykge1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goZXhpc3RpbmdDaGlsZFZpZXcuZWwpXG4gICAgICAgICAgICAgICAgLy92YXIgYXR0cmlidXRlcyA9IF8uZXh0ZW5kKHt9LCBfLnJlc3VsdChleGlzdGluZ0NoaWxkVmlldywgJ2F0dHJpYnV0ZXMnKSlcbiAgICAgICAgICAgICAgICAvL2V4aXN0aW5nQ2hpbGRWaWV3Ll9zZXRBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld0NoaWxkVmlldyA9IG5ldyB0aGlzLkNoaWxkVmlldyh7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsOm1vZGVsLFxuICAgICAgICAgICAgICAgICAgICBtYXBwaW5nczp0aGlzLmNoaWxkTWFwcGluZ3MsXG4gICAgICAgICAgICAgICAgICAgIGluZGV4OmksXG4gICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleDp0aGlzLnN1YkNvbGxlY3Rpb24ubGVuZ3RoIC0gaSAtIDEsXG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246dGhpcy5zdWJDb2xsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOnRoaXMudmlldy5nZXQodGhpcy52YWwuc3BsaXQoXCI6XCIpWzBdKVtpXVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnB1c2gobmV3Q2hpbGRWaWV3KTtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKG5ld0NoaWxkVmlldy5lbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKXtcbiAgICAgICAgICAgIHRoaXMuJHBhcmVudC5hcHBlbmQoY2hpbGQpXG4gICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSAkKGNoaWxkcmVuKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLmZvckVhY2goZnVuY3Rpb24oY2hpbGRWaWV3LGkpe1xuICAgICAgICAgICAgY2hpbGRWaWV3LmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIH0pXG5cbiAgICB9LFxuICAgIHJlbmRlclJlc2V0OmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJHBhcmVudC5lbXB0eSgpO1xuICAgIH0sXG4gICAgcmVuZGVyUmVtb3ZlOmZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGNoaWxkcmVuLmxhc3QoKS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5jaGlsZFZpZXdzLnNwbGljZSgtMSwxKTtcbiAgICAgICAgdGhpcy4kY2hpbGRyZW4gPSB0aGlzLiRwYXJlbnQuY2hpbGRyZW4oKTtcbiAgICB9LFxuICAgIHJlbmRlclNvcnQ6ZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgICAgIC8vRG9uJ3QgbmVlZCB0aGlzIChub3cpLiBNb2RlbHMgd2lsbCBhbHJlYWR5IGJlIHNvcnRlZCBvbiBhZGQgd2l0aCBjb2xsZWN0aW9uLmNvbXBhcmF0b3IgPSB4eHg7XG4gICAgfSxcbiAgICB0ZXN0OmZ1bmN0aW9uKCl7XG4gICAgICAgIC8vdGhpcy52aWV3IGlzIGluc3RhbmNlIG9mIHRoZSB2aWV3IHRoYXQgY29udGFpbnMgdGhlIHN1YnZpZXcgZGlyZWN0aXZlLlxuICAgICAgICAvL3RoaXMuc3ViVmlldyBpcyBpbnN0YW5jZSBvZiB0aGUgc3Vidmlld1xuICAgICAgICAvL3RoaXMgaXMgdGhlIGRpcmVjdGl2ZS5cblxuICAgICAgICBpZiAodGhpcy5zdWJWaWV3KXtcbiAgICAgICAgICAgIC8vd2h5IHBhcmVudE5vZGU/XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aWV3LmVsLmNvbnRhaW5zKHRoaXMuc3ViVmlldy5lbC5wYXJlbnROb2RlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyIHBhc3MgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGVsID0gdGhpcy52aWV3LmVsXG4gICAgICAgICAgICB0aGlzLiRjaGlsZHJlbi5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCFlbC5jb250YWlucyh0aGlzKSkgcGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbn0pIiwiLyppbXBvcnQgXyBmcm9tIFwidW5kZXJzY29yZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlIGZyb20gXCIuL2RpcmVjdGl2ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBEaXJlY3RpdmUuZXh0ZW5kKHtcbiAgICBuYW1lOlwiZGF0YVwiLFxuICAgIGNoaWxkSW5pdDpmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmNvbnRlbnQgPSB0aGlzLnZpZXcudmlld01vZGVsLmdldCh0aGlzLnZhbCk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy52aWV3LnZpZXdNb2RlbCxcImNoYW5nZTpcIit0aGlzLnZhbCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5jb250ZW50ID0gdGhpcy52aWV3LnZpZXdNb2RlbC5nZXQodGhpcy52YWwpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIGJ1aWxkOmZ1bmN0aW9uKCl7XG4gICAgICAgXy5lYWNoKHRoaXMuY29udGVudCxmdW5jdGlvbih2YWwscHJvcCl7XG4gICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsKSkgdmFsID0gdmFsLmJpbmQodGhpcy52aWV3KTtcbiAgICAgICAgICAgdGhpcy4kZWwuYXR0cihcImRhdGEtXCIrcHJvcCx2YWwpXG4gICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgXy5lYWNoKHRoaXMuY29udGVudCxmdW5jdGlvbih2YWwscHJvcCl7XG4gICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsKSkgdmFsID0gdmFsLmJpbmQodGhpcy52aWV3KTtcbiAgICAgICAgICAgdGhpcy4kZWwuYXR0cihcImRhdGEtXCIrcHJvcCx2YWwpXG4gICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH1cbn0pOyIsImltcG9ydCBEaXJlY3RpdmVDb250ZW50IGZyb20gXCIuL2RpcmVjdGl2ZS1jb250ZW50XCI7XG5pbXBvcnQgRGlyZWN0aXZlRW5hYmxlIGZyb20gXCIuL2RpcmVjdGl2ZS1lbmFibGVcIjtcbmltcG9ydCBEaXJlY3RpdmVEaXNhYmxlIGZyb20gXCIuL2RpcmVjdGl2ZS1kaXNhYmxlXCI7XG5pbXBvcnQgRGlyZWN0aXZlSHJlZiBmcm9tIFwiLi9kaXJlY3RpdmUtaHJlZlwiO1xuaW1wb3J0IERpcmVjdGl2ZU1hcCBmcm9tIFwiLi9kaXJlY3RpdmUtbWFwXCI7XG5pbXBvcnQgRGlyZWN0aXZlT3B0aW9uYWwgZnJvbSBcIi4vZGlyZWN0aXZlLW9wdGlvbmFsXCI7XG5pbXBvcnQgRGlyZWN0aXZlT3B0aW9uYWxXcmFwIGZyb20gXCIuL2RpcmVjdGl2ZS1vcHRpb25hbHdyYXBcIjtcbmltcG9ydCBEaXJlY3RpdmVTcmMgZnJvbSBcIi4vZGlyZWN0aXZlLXNyY1wiO1xuaW1wb3J0IERpcmVjdGl2ZVN1YnZpZXcgZnJvbSBcIi4vZGlyZWN0aXZlLXN1YnZpZXdcIjtcbmltcG9ydCBEaXJlY3RpdmVEYXRhIGZyb20gXCIuL2RpcmVjdGl2ZS1kYXRhXCI7XG5cbnZhciByZWdpc3RyeSA9IHtcbiAgICBDb250ZW50OkRpcmVjdGl2ZUNvbnRlbnQsXG4gICAgRW5hYmxlOkRpcmVjdGl2ZUVuYWJsZSxcbiAgICBEaXNhYmxlOkRpcmVjdGl2ZURpc2FibGUsXG4gICAgSHJlZjpEaXJlY3RpdmVIcmVmLFxuICAgIE1hcDpEaXJlY3RpdmVNYXAsXG4gICAgT3B0aW9uYWw6RGlyZWN0aXZlT3B0aW9uYWwsXG4gICAgT3B0aW9uYWxXcmFwOkRpcmVjdGl2ZU9wdGlvbmFsV3JhcCxcbiAgICBTcmM6RGlyZWN0aXZlU3JjLFxuICAgIFN1YnZpZXc6RGlyZWN0aXZlU3VidmlldyxcbiAgICBEYXRhOkRpcmVjdGl2ZURhdGFcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHJlZ2lzdHJ5OyIsIi8qaW1wb3J0ICQgZnJvbSBcImpxdWVyeVwiOyovXG4vKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgRGlyZWN0aXZlUmVnaXN0cnkgZnJvbSBcIi4vZGlyZWN0aXZlL2RpcmVjdGl2ZVJlZ2lzdHJ5LmpzXCJcbmltcG9ydCBEaXJlY3RpdmUgZnJvbSBcIi4vZGlyZWN0aXZlL2RpcmVjdGl2ZS5qc1wiXG5cblxuXG52YXIgYmFja2JvbmVWaWV3T3B0aW9ucyA9IFsnbW9kZWwnLCAnY29sbGVjdGlvbicsICdlbCcsICdpZCcsICdhdHRyaWJ1dGVzJywgJ2NsYXNzTmFtZScsICd0YWdOYW1lJywgJ2V2ZW50cyddO1xudmFyIGFkZGl0aW9uYWxWaWV3T3B0aW9ucyA9IFsnbWFwcGluZ3MnLCd0ZW1wbGF0ZVN0cmluZycsJ2NoaWxkVmlld0ltcG9ydHMnLCdzdWJWaWV3SW1wb3J0cycsJ2luZGV4JywnbGFzdEluZGV4Jywnb3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoJ11cbmV4cG9ydCBkZWZhdWx0IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcbiAgICB0ZXh0Tm9kZXNVbmRlcjpmdW5jdGlvbigpe1xuICAgICAgICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTA3MzAzMDkvZmluZC1hbGwtdGV4dC1ub2Rlcy1pbi1odG1sLXBhZ2VcbiAgICAgICAgdmFyIG4sIGE9W10sIHdhbGs9ZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcih0aGlzLmVsLE5vZGVGaWx0ZXIuU0hPV19URVhULG51bGwsZmFsc2UpO1xuICAgICAgICB3aGlsZShuPXdhbGsubmV4dE5vZGUoKSkgYS5wdXNoKG4pO1xuICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgXG4gICAgfSxcbiAgICBjb25zdHJ1Y3RvcjpmdW5jdGlvbihvcHRpb25zKSB7XG5cbiAgICAgICAgXy5lYWNoKF8uZGlmZmVyZW5jZShfLmtleXMob3B0aW9ucyksXy51bmlvbihiYWNrYm9uZVZpZXdPcHRpb25zLGFkZGl0aW9uYWxWaWV3T3B0aW9ucykpLGZ1bmN0aW9uKHByb3Ape1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFwiV2FybmluZyEgVW5rbm93biBwcm9wZXJ0eSBcIitwcm9wKTtcbiAgICAgICAgfSlcblxuXG4gICAgICAgIGlmICghdGhpcy5qc3QgJiYgIXRoaXMudGVtcGxhdGVTdHJpbmcpIHRocm93IG5ldyBFcnJvcihcIllvdSBuZWVkIGEgdGVtcGxhdGVcIik7XG4gICAgICAgIGlmICghdGhpcy5qc3Qpe1xuICAgICAgICAgICAgdGhpcy5jaWQgPSBfLnVuaXF1ZUlkKHRoaXMudHBsaWQpO1xuICAgICAgICAgICAgdGhpcy5qc3QgPSBfLnRlbXBsYXRlKHRoaXMudGVtcGxhdGVTdHJpbmcpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHRoaXMuY2lkID0gXy51bmlxdWVJZCgndmlldycpO1xuICAgICAgICB9XG4gICAgICAgIF8uZXh0ZW5kKHRoaXMsIF8ucGljayhvcHRpb25zLCBiYWNrYm9uZVZpZXdPcHRpb25zLmNvbmNhdChhZGRpdGlvbmFsVmlld09wdGlvbnMpKSk7XG5cbiAgICAgICAgLy9BZGQgdGhpcyBoZXJlIHNvIHRoYXQgaXQncyBhdmFpbGFibGUgaW4gY2xhc3NOYW1lIGZ1bmN0aW9uXG4gICAgICAgIGlmICghdGhpcy5kZWZhdWx0cykge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIllvdSBuZWVkIGRlZmF1bHRzIGZvciB5b3VyIHZpZXdcIik7XG4gICAgICAgIH1cblxuICAgICAgICBfLmVhY2godGhpcy5kZWZhdWx0cyxmdW5jdGlvbihkZWYpe1xuICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihkZWYpKSBjb25zb2xlLndhcm4oXCJEZWZhdWx0cyBzaG91bGQgdXN1YWxseSBiZSBwcmltaXRpdmUgdmFsdWVzXCIpXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy9kYXRhIGlzIHBhc3NlZCBpbiBvbiBzdWJ2aWV3c1xuICAgICAgICAvLyBjb21lcyBmcm9tIHRoaXMudmlldy52aWV3TW9kZWwuZ2V0KHRoaXMudmFsKTssIFxuICAgICAgICAvL3NvIGlmIHRoZSBkaXJlY3RpdmUgaXMgbm0tc3Vidmlldz1cIk1lbnVcIiwgdGhlbiB0aGlzLmRhdGEgc2hvdWxkIGJlLi4ud2hhdD9cbiAgICAgICAgLy9BaGEhIGRhdGEgaXMgdG8gb3ZlcnJpZGUgZGVmYXVsdCB2YWx1ZXMgZm9yIHN1YnZpZXdzIGJlaW5nIHBhcnQgb2YgYSBwYXJlbnQgdmlldy4gXG4gICAgICAgIC8vQnV0IGl0IGlzIG5vdCBtZWFudCB0byBvdmVycmlkZSBtYXBwaW5ncyBJIGRvbid0IHRoaW5rLlxuICAgICAgICB0aGlzLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5vdmVycmlkZVN1YnZpZXdEZWZhdWx0c0hhc2g7XG5cbiAgICAgICAgdmFyIGF0dHJzID0gXy5leHRlbmQoXy5jbG9uZSh0aGlzLmRlZmF1bHRzKSwob3B0aW9ucyAmJiBvcHRpb25zLm92ZXJyaWRlU3Vidmlld0RlZmF1bHRzSGFzaCkgfHwge30pXG4gICAgICAgIHRoaXMudmlld01vZGVsID0gbmV3IEJhY2tib25lLk1vZGVsKGF0dHJzKTtcblxuXG4gICAgICAgIC8vbWFwcGluZ3MgY29udGFpbiBtYXBwaW5ncyBvZiB2aWV3IHZhcmlhYmxlcyB0byBtb2RlbCB2YXJpYWJsZXMuXG4gICAgICAgIC8vc3RyaW5ncyBhcmUgcmVmZXJlbmNlcyB0byBtb2RlbCB2YXJpYWJsZXMuIEZ1bmN0aW9ucyBhcmUgZm9yIHdoZW4gYSB2aWV3IHZhcmlhYmxlIGRvZXNcbiAgICAgICAgLy9ub3QgbWF0Y2ggcGVyZmVjdGx5IHdpdGggYSBtb2RlbCB2YXJpYWJsZS4gVGhlc2UgYXJlIHVwZGF0ZWQgZWFjaCB0aW1lIHRoZSBtb2RlbCBjaGFuZ2VzLlxuICAgICAgICB0aGlzLnByb3BNYXAgPSB7fTtcbiAgICAgICAgdGhpcy5mdW5jcyA9IHt9O1xuXG4gICAgICAgIF8uZWFjaCh0aGlzLm1hcHBpbmdzLGZ1bmN0aW9uKG1vZGVsVmFyLHRlbXBsYXRlVmFyKXtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbW9kZWxWYXIgPT0gXCJzdHJpbmdcIikgdGhpcy5wcm9wTWFwW3RlbXBsYXRlVmFyXSA9IG1vZGVsVmFyO1xuICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG1vZGVsVmFyID09IFwiZnVuY3Rpb25cIikgdGhpcy5mdW5jc1t0ZW1wbGF0ZVZhcl0gPSBtb2RlbFZhcjtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTsgICAgIFxuXG4gICAgICAgIC8vUHJvYmxlbTogaWYgeW91IHVwZGF0ZSB0aGUgbW9kZWwgaXQgdXBkYXRlcyBmb3IgZXZlcnkgc3VidmlldyAobm90IGVmZmljaWVudCkuXG4gICAgICAgIC8vQW5kIGl0IGRvZXMgbm90IHVwZGF0ZSBmb3Igc3VibW9kZWxzLiBQZXJoYXBzIHRoZXJlIGFyZSBtYW55IGRpZmZlcmVudCBzb2x1dGlvbnMgZm9yIHRoaXMuXG4gICAgICAgIC8vWW91IGNhbiBoYXZlIGVhY2ggc3VibW9kZWwgdHJpZ2dlciBjaGFuZ2UgZXZlbnQuXG4gICAgICAgIFxuICAgICAgICAvL1doZW5ldmVyIHRoZSBtb2RlbCBjaGFuZ2VzLCB1cGRhdGUgdGhlIHZpZXdNb2RlbCBieSBtYXBwaW5nIHByb3BlcnRpZXMgb2YgdGhlIG1vZGVsIHRvIHByb3BlcnRpZXMgb2YgdGhlIHZpZXcgKGFzc2lnbmVkIGluIG1hcHBpbmdzKVxuICAgICAgICAvL0Fsc28sIHRoZSBhdHRyaWJ1dGVzIGNoYW5nZS4gVGhpcyBjYW4gYmUgZG9uZSBtb3JlIGVsZWdhbnRseVxuICAgICAgICBpZiAodGhpcy5tb2RlbCl7XG4gICAgICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsXCJjaGFuZ2VcIix0aGlzLnVwZGF0ZUNvbnRleHRPYmplY3QpO1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLFwiY2hhbmdlXCIsZnVuY3Rpb24oKXtcblx0XHRcdCAgICB0aGlzLl9zZXRBdHRyaWJ1dGVzKF8uZXh0ZW5kKHt9LCBfLnJlc3VsdCh0aGlzLCAnYXR0cmlidXRlcycpKSk7XG5cdFx0ICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQ29udGV4dE9iamVjdCh0aGlzLm1vZGVsKTtcbiAgICAgICAgfVxuICAgICAgICBcblxuXG4gICAgICAgIHRoaXMuX2Vuc3VyZUVsZW1lbnQoKTtcbiAgICAgICAgdGhpcy5idWlsZElubmVySFRNTCgpO1xuICAgICAgICBcblxuXG4gICAgICAgIHRoaXMuaW5pdERpcmVjdGl2ZXMoKTsvL2luaXQgc2ltcGxlIGRpcmVjdGl2ZXMuLi50aGUgb25lcyB0aGF0IGp1c3QgbWFuaXB1bGF0ZSBhbiBlbGVtZW50XG4gICAgICAgIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB0aGlzLmNoaWxkTm9kZXMgPSBbXS5zbGljZS5jYWxsKHRoaXMuZWwuY2hpbGROb2RlcywgMCk7XG5cbiAgICAgICAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSxcbiAgICBcbiAgICBpbml0aWFsaXplOmZ1bmN0aW9uKG9wdGlvbnMpe1xuICAgICAgICAvL2F0dGFjaCBvcHRpb25zIHRvIHZpZXcgKG1vZGVsLCBwcm9wTWFwLCBzdWJWaWV3cywgZXZlbnRzKVxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgXy5leHRlbmQodGhpcyxvcHRpb25zKTtcbiAgICB9LFxuICAgIGdldE1vZGVsQXR0cjpmdW5jdGlvbihhdHRyKXtcbiAgICAgICAgLy9xdWlja2x5IGdyYWIgYSBtb2RlbHMgYXR0cmlidXRlIGJ5IGEgdmlldyB2YXJpYWJsZS4gVXNlZnVsIGluIGNsYXNzbmFtZSBmdW5jdGlvbi5cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLm1hcHBpbmdzW2F0dHJdID09XCJzdHJpbmdcIikgcmV0dXJuIHRoaXMubW9kZWwuZ2V0KHRoaXMubWFwcGluZ3NbYXR0cl0pO1xuICAgICAgICBlbHNlIHJldHVybiB0aGlzLm1hcHBpbmdzW2F0dHJdLmNhbGwodGhpcylcbiAgICB9LFxuICAgIHVwZGF0ZUNvbnRleHRPYmplY3Q6ZnVuY3Rpb24obW9kZWwpe1xuXG5cbiAgICAgICAgdmFyIG9iaiA9IHt9XG4gICAgICAgIFxuICAgICAgICAvL0NoYW5nZSB0ZW1wbGF0ZVZhcnMtPm1vZGVsVmFycyB0byB0ZW1wbGF0ZVZhcnMtPm1vZGVsLmdldChcIm1vZGVsVmFyXCIpLCBhbmQgc2V0IG9uIHRoZSBtb2RlbFxuICAgICAgICBfLmV4dGVuZChvYmosXy5tYXBPYmplY3QodGhpcy5wcm9wTWFwLGZ1bmN0aW9uKG1vZGVsVmFyKXtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW9kZWwuZ2V0KG1vZGVsVmFyKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKSk7XG4gICAgICAgIFxuXG4gICAgICAgIF8uZXh0ZW5kKG9iaixfLm1hcE9iamVjdCh0aGlzLmZ1bmNzLGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICAgICAgdmFyIHJldCA9IGZ1bmMuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAvL2Z1bmMuY2FsbCBtYWtlcyBpdCB3b3JrIGJ1dCBvbmx5IG9uY2VcbiAgICAgICAgfS5iaW5kKHRoaXMpKSlcbiAgICAgICAgICAgICAgICBcblxuICAgICAgICBcbiAgICAgICAgdGhpcy52aWV3TW9kZWwuc2V0KG9iaik7XG5cblxuICAgICAgICBcbiAgICBcbiAgICB9LFxuICAgIGJ1aWxkSW5uZXJIVE1MOmZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLiRlbCkgdGhpcy4kZWwuaHRtbCh0aGlzLnJlbmRlcmVkVGVtcGxhdGUoKSk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGR1bW15ZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgICAgIGR1bW15ZGl2LmlubmVySFRNTCA9IHRoaXMucmVuZGVyZWRUZW1wbGF0ZSgpO1xuICAgICAgICAgICAgd2hpbGUoZHVtbXlkaXYuY2hpbGROb2Rlcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQoZHVtbXlkaXYuY2hpbGROb2Rlc1swXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL21heWJlIGxlc3MgaGFja2lzaCBzb2x1dGlvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yNTIxNDExMy8xNzYzMjE3XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGluaXREaXJlY3RpdmVzOmZ1bmN0aW9uKCl7XG5cbiAgICAgICAgXG4gICAgICAgICAvL0luaXQgZGlyZWN0aXZlcyBpbnZvbHZpbmcge3t9fVxuXG4gICAgICAgIHRoaXMuX2luaXRpYWxUZXh0Tm9kZXMgPSB0aGlzLnRleHROb2Rlc1VuZGVyKCk7XG4gICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cyA9IFtdO1xuICAgICAgICB0aGlzLl9pbml0aWFsVGV4dE5vZGVzLmZvckVhY2goZnVuY3Rpb24oZnVsbFRleHROb2RlKXtcbiAgICAgICAgICAgIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjEzMTE2NzAvMTc2MzIxNyB0ZXh0Q29udGVudCBzZWVtcyByaWdodFxuXG4gICAgICAgICAgICB2YXIgcmUgPSAvXFx7XFx7KC4rPylcXH1cXH0vZztcbiAgICAgICAgICAgIHZhciBtYXRjaDtcbiAgICAgICAgICAgIFxuXG5cbiAgICAgICAgICAgIHZhciBtYXRjaGVzID0gW107XG4gICAgICAgICAgICB3aGlsZSAoKG1hdGNoID0gcmUuZXhlYyhmdWxsVGV4dE5vZGUudGV4dENvbnRlbnQpKSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hlcy5wdXNoKG1hdGNoKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgY3VycmVudFRleHROb2RlID0gZnVsbFRleHROb2RlO1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRTdHJpbmcgPSBmdWxsVGV4dE5vZGUudGV4dENvbnRlbnQ7XG4gICAgICAgICAgICB2YXIgcHJldk5vZGVzTGVuZ3RoID0gMDtcblxuICAgICAgICAgICAgbWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uKG1hdGNoKXtcbiAgICAgICAgICAgICAgICB2YXIgdmFyTm9kZSA9IGN1cnJlbnRUZXh0Tm9kZS5zcGxpdFRleHQobWF0Y2guaW5kZXggLSBwcmV2Tm9kZXNMZW5ndGgpO1xuICAgICAgICAgICAgICAgIHZhciBlbnRpcmVNYXRjaCA9IG1hdGNoWzBdXG4gICAgICAgICAgICAgICAgdmFyTm9kZS5tYXRjaCA9IG1hdGNoWzFdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5wdXNoKHZhck5vZGUpO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRUZXh0Tm9kZSA9IHZhck5vZGUuc3BsaXRUZXh0KGVudGlyZU1hdGNoLmxlbmd0aClcbiAgICAgICAgICAgICAgICBjdXJyZW50U3RyaW5nID0gY3VycmVudFRleHROb2RlLnRleHRDb250ZW50O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHByZXZOb2Rlc0xlbmd0aD1tYXRjaC5pbmRleCArIGVudGlyZU1hdGNoLmxlbmd0aDsvL05vdGU6IFRoaXMgd29ya3MgYWNjaWRlbnRhbGx5LiBNaWdodCBiZSB3cm9uZy5cbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgXG5cbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgdGhpcy5kaXJlY3RpdmUgPSB7fTtcblxuICAgICAgICBmb3IgKHZhciBkaXJlY3RpdmVOYW1lIGluIERpcmVjdGl2ZVJlZ2lzdHJ5KXtcbiAgICAgICAgICAgIHZhciBfX3Byb3RvID0gRGlyZWN0aXZlUmVnaXN0cnlbZGlyZWN0aXZlTmFtZV0ucHJvdG90eXBlXG4gICAgICAgICAgICBpZiAoX19wcm90byBpbnN0YW5jZW9mIERpcmVjdGl2ZSl7IC8vYmVjYXVzZSBmb3JlYWNoIHdpbGwgZ2V0IG1vcmUgdGhhbiBqdXN0IG90aGVyIGRpcmVjdGl2ZXNcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IF9fcHJvdG8ubmFtZTtcbiAgICAgICAgICAgICAgICBpZiAobmFtZSE9PVwic3Vidmlld1wiKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW1lbnRzID0gKHRoaXMuJGVsKT8kLm1ha2VBcnJheSh0aGlzLiRlbC5maW5kKFwiW25tLVwiK25hbWUrXCJdXCIpKTokLm1ha2VBcnJheSgkKHRoaXMuZWwucXVlcnlTZWxlY3RvckFsbChcIltubS1cIituYW1lK1wiXVwiKSkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZVtuYW1lXSA9IGVsZW1lbnRzLm1hcChmdW5jdGlvbihlbGVtZW50LGksZWxlbWVudHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vb24gdGhlIHNlY29uZCBnby1hcm91bmQgZm9yIG5tLW1hcCwgZGlyZWN0aXZlTmFtZSBzb21laG93IGlzIGNhbGxlZCBcIlN1YlZpZXdcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGlyZWN0aXZlUmVnaXN0cnlbZGlyZWN0aXZlTmFtZV0oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3OnRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsOmVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7IFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlyZWN0aXZlW1wic3Vidmlld1wiXSA9IHRoaXMuX3N1YlZpZXdFbGVtZW50cy5tYXAoZnVuY3Rpb24oc3ViVmlld0VsZW1lbnQsaSxzdWJWaWV3RWxlbWVudHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBEaXJlY3RpdmVSZWdpc3RyeVtcIlN1YnZpZXdcIl0oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc6dGhpcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbDpzdWJWaWV3RWxlbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cblxuXG4gICAgICAgXG4gICAgICAgIC8qXG4gICAgICAgIHRoaXMuX3N1YlZpZXdFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uKHN1YlZpZXdFbGVtZW50KXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gc3ViVmlld0VsZW1lbnQubWF0Y2guc3BsaXQoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoPT0xKXtcbiAgICAgICAgICAgICAgICAvL3N1YnZpZXcgd2l0aCBubyBjb250ZXh0IG9ialxuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgLy9DaGVjayBmb3IgY29sbGVjdGlvbiBvciBtb2RlbCBwYXNzZWQuXG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcbiAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUuYmFja2dyb3VuZD1cInllbGxvd1wiO1xuICAgICAgICAgICAgZWxlbWVudC5pbm5lckhUTUwgPSBzdWJWaWV3RWxlbWVudC5tYXRjaDtcbiAgICAgICAgICAgIHN1YlZpZXdFbGVtZW50LnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGVsZW1lbnQsc3ViVmlld0VsZW1lbnQpO1xuICAgICAgICB9KSovXG5cbiAgICAgICBcblxuXG4gICAgICAgIFxuICAgIH0sXG4gICAgcmVuZGVyZWRUZW1wbGF0ZTpmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy5qc3QpIHtcbiAgICAgICAgICAgIHdpbmRvdy5fID0gXztcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmpzdCh0aGlzLnZpZXdNb2RlbC5hdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHJldHVybiBfLnRlbXBsYXRlKHRoaXMudGVtcGxhdGVTdHJpbmcpKHRoaXMudmlld01vZGVsLmF0dHJpYnV0ZXMpXG4gICAgfSxcbiAgICBkZWxlZ2F0ZUV2ZW50czogZnVuY3Rpb24oZXZlbnRzKSB7Ly9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xMjE5MzA2OS8xNzYzMjE3XG4gICAgICAgIHZhciBkZWxlZ2F0ZUV2ZW50U3BsaXR0ZXIgPSAvXihcXFMrKVxccyooLiopJC87XG4gICAgICAgIGV2ZW50cyB8fCAoZXZlbnRzID0gXy5yZXN1bHQodGhpcywgJ2V2ZW50cycpKTsgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICBpZiAoIWV2ZW50cykgcmV0dXJuIHRoaXM7XG4gICAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gZXZlbnRzKSB7XG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gZXZlbnRzW2tleV07XG4gICAgICAgICAgICBpZiAoIV8uaXNGdW5jdGlvbihtZXRob2QpKSBtZXRob2QgPSB0aGlzW2V2ZW50c1trZXldXTtcbiAgICAgICAgICAgIGlmICghbWV0aG9kKSB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBcIicgKyBldmVudHNba2V5XSArICdcIiBkb2VzIG5vdCBleGlzdCcpO1xuICAgICAgICAgICAgdmFyIG1hdGNoID0ga2V5Lm1hdGNoKGRlbGVnYXRlRXZlbnRTcGxpdHRlcik7XG4gICAgICAgICAgICB2YXIgZXZlbnRUeXBlcyA9IG1hdGNoWzFdLnNwbGl0KCcsJyksIHNlbGVjdG9yID0gbWF0Y2hbMl07XG4gICAgICAgICAgICBtZXRob2QgPSBfLmJpbmQobWV0aG9kLCB0aGlzKTtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIF8oZXZlbnRUeXBlcykuZWFjaChmdW5jdGlvbihldmVudE5hbWUpIHtcbiAgICAgICAgICAgICAgICBldmVudE5hbWUgKz0gJy5kZWxlZ2F0ZUV2ZW50cycgKyBzZWxmLmNpZDtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgc2VsZi4kZWwuYmluZChldmVudE5hbWUsIG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kZWwuZGVsZWdhdGUoc2VsZWN0b3IsIGV2ZW50TmFtZSwgbWV0aG9kKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyOmZ1bmN0aW9uKCl7XG4gICAgICAgIFxuICAgICAgIFxuICAgIH0sXG5cblxuXG5cbiAgICB0YWdOYW1lOnVuZGVmaW5lZCwvL2Rvbid0IHdhbnQgYSB0YWdOYW1lIHRvIGJlIGRpdiBieSBkZWZhdWx0LiBSYXRoZXIsIG1ha2UgaXQgYSBkb2N1bWVudGZyYWdtZW50J1xuICAgIHN1YlZpZXdJbXBvcnRzOnt9LFxuICAgIGNoaWxkVmlld0ltcG9ydHM6e30sXG4gICAgICBfZW5zdXJlRWxlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy9PdmVycmlkaW5nIHRoaXMgdG8gc3VwcG9ydCBkb2N1bWVudCBmcmFnbWVudHNcbiAgICAgICAgICAgIGlmICghdGhpcy5lbCkge1xuICAgICAgICAgICAgICAgIGlmKHRoaXMuYXR0cmlidXRlcyB8fCB0aGlzLmlkIHx8IHRoaXMuY2xhc3NOYW1lIHx8IHRoaXMudGFnTmFtZSl7Ly9pZiB5b3UgaGF2ZSBhbnkgb2YgdGhlc2UgYmFja2JvbmUgcHJvcGVydGllcywgZG8gYmFja2JvbmUgYmVoYXZpb3JcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdHRycyA9IF8uZXh0ZW5kKHt9LCBfLnJlc3VsdCh0aGlzLCAnYXR0cmlidXRlcycpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlkKSBhdHRycy5pZCA9IF8ucmVzdWx0KHRoaXMsICdpZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2xhc3NOYW1lKSBhdHRyc1snY2xhc3MnXSA9IF8ucmVzdWx0KHRoaXMsICdjbGFzc05hbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudCh0aGlzLl9jcmVhdGVFbGVtZW50KF8ucmVzdWx0KHRoaXMsICd0YWdOYW1lJykgfHwgJ2RpdicpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NldEF0dHJpYnV0ZXMoYXR0cnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNley8vaG93ZXZlciwgZGVmYXVsdCB0byB0aGlzLmVsIGJlaW5nIGEgZG9jdW1lbnRmcmFnbWVudCAobWFrZXMgdGhpcy5lbCBuYW1lZCBpbXByb3Blcmx5IGJ1dCB3aGF0ZXZlcilcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChfLnJlc3VsdCh0aGlzLCAnZWwnKSk7XG4gICAgICAgICAgICB9XG4gICAgfSxcbiAgICBzZXQ6ZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgdGhpcy52aWV3TW9kZWwuc2V0KG9iaik7XG4gICAgfSxcbiAgICBnZXQ6ZnVuY3Rpb24ocHJvcCl7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXdNb2RlbC5nZXQocHJvcClcbiAgICB9XG59KTtcbiIsIi8vU2FtZSBtb2RlbCwgY29sbGVjdGlvbiBpbiBzYW1lIGZpbGUgZm9yIG5vdyBiZWNhdXNlIHRoZXNlIG1vZHVsZXMgcmVseSBvbiBlYWNoIG90aGVyLlxuXG4vKmltcG9ydCBfIGZyb20gXCJ1bmRlcnNjb3JlXCI7Ki9cbi8qaW1wb3J0IEJhY2tib25lIGZyb20gXCJiYWNrYm9uZVwiOyovXG5pbXBvcnQgTW9kZWwgZnJvbSBcIi4vTW9kZWxcIjtcbmltcG9ydCBDb2xsZWN0aW9uIGZyb20gXCIuL0NvbGxlY3Rpb25cIjtcbmltcG9ydCBWaWV3IGZyb20gXCIuL1ZpZXdcIjtcbmltcG9ydCBEaXJlY3RpdmVSZWdpc3RyeSBmcm9tIFwiLi9kaXJlY3RpdmUvZGlyZWN0aXZlUmVnaXN0cnlcIjtcbi8qaW1wb3J0ICQgZnJvbSBcImpxdWVyeVwiOyovXG5cbnZhciBGYWppdGEgPSB7TW9kZWwsIENvbGxlY3Rpb24sIFZpZXcsIERpcmVjdGl2ZVJlZ2lzdHJ5fTtcbkZhaml0YVtcIvCfjK5cIl0gPSBcIjAuMC4wXCI7XG5cbmlmICh0eXBlb2Ygd2luZG93IT09XCJ1bmRlZmluZWRcIikgd2luZG93LkZhaml0YSA9IEZhaml0YTtcbmlmICh0eXBlb2YgZ2xvYmFsIT09XCJ1bmRlZmluZWRcIikgZ2xvYmFsLkZhaml0YSA9IEZhaml0YTsiXSwibmFtZXMiOlsiQmFja2JvbmUiLCJNb2RlbCIsImV4dGVuZCIsIm9wdGlvbnMiLCJVUkxTZWFyY2hQYXJhbXMiLCJxdWVyeSIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwic3ViTW9kZWxzIiwic3ViQ29sbGVjdGlvbnMiLCJzdHJ1Y3R1cmUiLCJwYXJlbnRNb2RlbHMiLCJpbml0IiwicHJvcCIsImNvbGxlY3Rpb24iLCJfIiwiaXNBcnJheSIsIkJhc2UiLCJDb2xsZWN0aW9uIiwidG9BcnJheSIsInB1c2giLCJsaXN0ZW5UbyIsInRyaWdnZXIiLCJhdHRyIiwiaXNTdHJpbmciLCJzdGFydHNXaXRoIiwic3Vic3RyIiwiZ2V0IiwicHJvdG90eXBlIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJpc1VuZGVmaW5lZCIsInByb3BzIiwic3BsaXQiLCJsZW5ndGgiLCJtb2RlbCIsImZvckVhY2giLCJrZXkiLCJ2YWwxIiwidmFsMiIsInNldCIsInZhbCIsIm1vZGVsT3JDb2xsZWN0aW9uIiwiRmFqaXRhIiwiY2FsbCIsIm9uIiwiVmlldyIsIm5hbWUiLCJjb25zb2xlIiwiZXJyb3IiLCJlbCIsIm1hdGNoIiwiZ2V0QXR0cmlidXRlIiwidmlldyIsImNoaWxkSW5pdCIsImJ1aWxkIiwidXBkYXRlUmVzdWx0Iiwidmlld01vZGVsIiwicmVuZGVyIiwicmVzdWx0IiwiaXNGdW5jdGlvbiIsIkRpcmVjdGl2ZSIsIiRlbCIsInNldEF0dHJpYnV0ZSIsImlubmVySFRNTCIsInZhbHVlIiwicGFzcyIsIiQiLCJhIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiY2xhc3NMaXN0IiwiYWRkIiwid3JhcHBlckEiLCJwYXJlbnROb2RlIiwicmVwbGFjZUNoaWxkIiwiYXBwZW5kQ2hpbGQiLCJwYXJlbnQiLCJDaGlsZFZpZXciLCJjaGlsZFZpZXdJbXBvcnRzIiwibWFwcGluZ3MiLCJjaGlsZFZpZXdNYXBwaW5ncyIsInJlbmRlckFkZCIsInJlbmRlclJlc2V0IiwicmVuZGVyUmVtb3ZlIiwicmVuZGVyU29ydCIsImNoaWxkVmlld3MiLCJtYXAiLCJjaGlsZE1vZGVsIiwiaSIsImNoaWxkdmlldyIsInRhZ05hbWUiLCJfc2V0QXR0cmlidXRlcyIsImJpbmQiLCIkY2hpbGRyZW4iLCJjaGlsZFZpZXciLCJpbmRleCIsInJlcGxhY2VXaXRoIiwiZGVsZWdhdGVFdmVudHMiLCIkcGFyZW50IiwiY2hpbGRyZW4iLCJlYWNoIiwiZXhpc3RpbmdDaGlsZFZpZXciLCJmaWx0ZXIiLCJhdHRyaWJ1dGVzIiwibmV3Q2hpbGRWaWV3IiwiZW1wdHkiLCJjaGlsZCIsImFwcGVuZCIsImxhc3QiLCJyZW1vdmUiLCJzcGxpY2UiLCJoaWRlIiwiY3NzIiwiYm9keSIsImNvbnRhaW5zIiwiRXJyb3IiLCJpcyIsIndyYXBwZXIiLCJjaGlsZE5vZGVzIiwic2xpY2UiLCJ1bndyYXAiLCJpbnNlcnRCZWZvcmUiLCJhcmdzIiwic3ViVmlld05hbWUiLCJzdWJNb2RlbE5hbWUiLCJzdWJNb2RlbCIsInN1YkNvbGxlY3Rpb24iLCJjaGlsZE1hcHBpbmdzIiwib3ZlcnJpZGVTdWJ2aWV3RGVmYXVsdHNIYXNoIiwiZGVmYXVsdHMiLCJjaGlsZFZpZXdPcHRpb25zIiwibW9kZWxzIiwic3ViVmlld0ltcG9ydHMiLCJDaGlsZENvbnN0cnVjdG9yIiwic3ViVmlldyIsImNsYXNzZXMiLCJjbCIsInBhcmVudERpcmVjdGl2ZSIsIm9wdGlvbnNTZW50VG9TdWJWaWV3IiwiY29udGVudCIsInJlZ2lzdHJ5IiwiRGlyZWN0aXZlQ29udGVudCIsIkRpcmVjdGl2ZUVuYWJsZSIsIkRpcmVjdGl2ZURpc2FibGUiLCJEaXJlY3RpdmVIcmVmIiwiRGlyZWN0aXZlTWFwIiwiRGlyZWN0aXZlT3B0aW9uYWwiLCJEaXJlY3RpdmVPcHRpb25hbFdyYXAiLCJEaXJlY3RpdmVTcmMiLCJEaXJlY3RpdmVTdWJ2aWV3IiwiRGlyZWN0aXZlRGF0YSIsImJhY2tib25lVmlld09wdGlvbnMiLCJhZGRpdGlvbmFsVmlld09wdGlvbnMiLCJuIiwid2FsayIsImNyZWF0ZVRyZWVXYWxrZXIiLCJOb2RlRmlsdGVyIiwiU0hPV19URVhUIiwibmV4dE5vZGUiLCJkaWZmZXJlbmNlIiwia2V5cyIsInVuaW9uIiwid2FybiIsImpzdCIsInRlbXBsYXRlU3RyaW5nIiwiY2lkIiwidW5pcXVlSWQiLCJ0cGxpZCIsInRlbXBsYXRlIiwicGljayIsImNvbmNhdCIsImRlZiIsImF0dHJzIiwiY2xvbmUiLCJwcm9wTWFwIiwiZnVuY3MiLCJtb2RlbFZhciIsInRlbXBsYXRlVmFyIiwidXBkYXRlQ29udGV4dE9iamVjdCIsIl9lbnN1cmVFbGVtZW50IiwiYnVpbGRJbm5lckhUTUwiLCJpbml0RGlyZWN0aXZlcyIsImluaXRpYWxpemUiLCJvYmoiLCJtYXBPYmplY3QiLCJmdW5jIiwicmV0IiwiaHRtbCIsInJlbmRlcmVkVGVtcGxhdGUiLCJkdW1teWRpdiIsIl9pbml0aWFsVGV4dE5vZGVzIiwidGV4dE5vZGVzVW5kZXIiLCJfc3ViVmlld0VsZW1lbnRzIiwiZnVsbFRleHROb2RlIiwicmUiLCJtYXRjaGVzIiwiZXhlYyIsInRleHRDb250ZW50IiwiY3VycmVudFRleHROb2RlIiwiY3VycmVudFN0cmluZyIsInByZXZOb2Rlc0xlbmd0aCIsInZhck5vZGUiLCJzcGxpdFRleHQiLCJlbnRpcmVNYXRjaCIsImRpcmVjdGl2ZSIsImRpcmVjdGl2ZU5hbWUiLCJEaXJlY3RpdmVSZWdpc3RyeSIsIl9fcHJvdG8iLCJlbGVtZW50cyIsIm1ha2VBcnJheSIsImZpbmQiLCJxdWVyeVNlbGVjdG9yQWxsIiwiZWxlbWVudCIsInN1YlZpZXdFbGVtZW50Iiwic3ViVmlld0VsZW1lbnRzIiwiZXZlbnRzIiwiZGVsZWdhdGVFdmVudFNwbGl0dGVyIiwidW5kZWxlZ2F0ZUV2ZW50cyIsIm1ldGhvZCIsImV2ZW50VHlwZXMiLCJzZWxlY3RvciIsInNlbGYiLCJldmVudE5hbWUiLCJkZWxlZ2F0ZSIsInVuZGVmaW5lZCIsImlkIiwiY2xhc3NOYW1lIiwic2V0RWxlbWVudCIsIl9jcmVhdGVFbGVtZW50IiwiY3JlYXRlRG9jdW1lbnRGcmFnbWVudCIsImdsb2JhbCJdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7OztBQUlBLFlBQWVBLFNBQVNDLEtBQVQsQ0FBZUMsTUFBZixDQUFzQjtjQUN4QixvQkFBU0MsT0FBVCxFQUFpQjtRQUNyQixPQUFPQyxlQUFQLEtBQTJCLFdBQWhDLEVBQTZDO1dBQ3RDQyxLQUFMLEdBQWEsSUFBSUQsZUFBSixDQUFvQkUsT0FBT0MsUUFBUCxDQUFnQkMsTUFBcEMsQ0FBYjs7OztTQUlHQyxTQUFMLEdBQWlCLEVBQWpCO1NBQ0tDLGNBQUwsR0FBc0IsRUFBdEI7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
