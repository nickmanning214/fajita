import $ from "jquery";
import _ from "underscore";
import Backbone from "backbone";
import DirectiveRegistry from "./directive/directiveRegistry.js"
import Directive from "./directive/directive.js"



var backboneViewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];
var additionalViewOptions = ['mappings','templateString','childViewImports','subViewImports','index','lastIndex','overrideSubviewDefaultsHash']
export default Backbone.View.extend({
    textNodesUnder:function(){
        //http://stackoverflow.com/questions/10730309/find-all-text-nodes-in-html-page
        var n, a=[], walk=document.createTreeWalker(this.el,NodeFilter.SHOW_TEXT,null,false);
        while(n=walk.nextNode()) a.push(n);
        return a;
        
    },
    constructor:function(options) {

        _.each(_.difference(_.keys(options),_.union(backboneViewOptions,additionalViewOptions)),function(prop){
            console.warn("Warning! Unknown property "+prop);
        })


        if (!this.jst && !this.templateString) throw new Error("You need a template");
        if (!this.jst){
            this.cid = _.uniqueId(this.tplid);
            this.jst = _.template(this.templateString)
        }
        else{
            this.cid = _.uniqueId('view');
        }
        _.extend(this, _.pick(options, backboneViewOptions.concat(additionalViewOptions)));

        //Add this here so that it's available in className function
        if (!this.defaults) {
            console.error("You need defaults for your view");
        }

        _.each(this.defaults,function(def){
            if (_.isFunction(def)) console.warn("Defaults should usually be primitive values")
        })

        //data is passed in on subviews
        // comes from this.view.viewModel.get(this.val);, 
        //so if the directive is nm-subview="Menu", then this.data should be...what?
        //Aha! data is to override default values for subviews being part of a parent view. 
        //But it is not meant to override mappings I don't think.
        this.overrideSubviewDefaultsHash = options && options.overrideSubviewDefaultsHash;

        var attrs = _.extend(_.clone(this.defaults),(options && options.overrideSubviewDefaultsHash) || {})
        this.viewModel = new Backbone.Model(attrs);


        //mappings contain mappings of view variables to model variables.
        //strings are references to model variables. Functions are for when a view variable does
        //not match perfectly with a model variable. These are updated each time the model changes.
        this.propMap = {};
        this.funcs = {};

        _.each(this.mappings,function(modelVar,templateVar){
            if (typeof modelVar == "string") this.propMap[templateVar] = modelVar;
            else if (typeof modelVar == "function") this.funcs[templateVar] = modelVar;
        }.bind(this));     

        //Problem: if you update the model it updates for every subview (not efficient).
        //And it does not update for submodels. Perhaps there are many different solutions for this.
        //You can have each submodel trigger change event.
        
        //Whenever the model changes, update the viewModel by mapping properties of the model to properties of the view (assigned in mappings)
        //Also, the attributes change. This can be done more elegantly
        if (this.model){
            this.listenTo(this.model,"change",this.updateContextObject);
            this.listenTo(this.model,"change",function(){
			    this._setAttributes(_.extend({}, _.result(this, 'attributes')));
		    });
        
            this.updateContextObject(this.model);
        }
        


        this._ensureElement();
        this.buildInnerHTML();
        


        this.initDirectives();//init simple directives...the ones that just manipulate an element
        this.delegateEvents();
        
        
        this.childNodes = [].slice.call(this.el.childNodes, 0);

        this.initialize.apply(this, arguments);
    },
    
    initialize:function(options){
        //attach options to view (model, propMap, subViews, events)
        options = options || {};
        _.extend(this,options);
    },
    getModelAttr:function(attr){
        //quickly grab a models attribute by a view variable. Useful in classname function.
        if (typeof this.mappings[attr] =="string") return this.model.get(this.mappings[attr]);
        else return this.mappings[attr].call(this)
    },
    updateContextObject:function(model){


        var obj = {}
        
        //Change templateVars->modelVars to templateVars->model.get("modelVar"), and set on the model
        _.extend(obj,_.mapObject(this.propMap,function(modelVar){
            
            return this.model.get(modelVar);
        }.bind(this)));
        

        _.extend(obj,_.mapObject(this.funcs,function(func){
            var ret = func.call(this);
            return ret;
            //func.call makes it work but only once
        }.bind(this)))
                

        
        this.viewModel.set(obj);


        
    
    },
    buildInnerHTML:function(){
        if (this.$el) this.$el.html(this.renderedTemplate());
        else {
            var dummydiv = document.createElement("div");
            dummydiv.innerHTML = this.renderedTemplate();
            while(dummydiv.childNodes.length){
                this.el.appendChild(dummydiv.childNodes[0]);
            }
            //maybe less hackish solution http://stackoverflow.com/a/25214113/1763217
        }
    },
    initDirectives:function(){

        
         //Init directives involving {{}}

        this._initialTextNodes = this.textNodesUnder();
        this._subViewElements = [];
        this._initialTextNodes.forEach(function(fullTextNode){
            //http://stackoverflow.com/a/21311670/1763217 textContent seems right

            var re = /\{\{(.+?)\}\}/g;
            var match;
            


            var matches = [];
            while ((match = re.exec(fullTextNode.textContent)) != null) {
                matches.push(match)
            }

            var currentTextNode = fullTextNode;
            var currentString = fullTextNode.textContent;
            var prevNodesLength = 0;

            matches.forEach(function(match){
                var varNode = currentTextNode.splitText(match.index - prevNodesLength);
                var entireMatch = match[0]
                varNode.match = match[1];
                this._subViewElements.push(varNode);
                currentTextNode = varNode.splitText(entireMatch.length)
                currentString = currentTextNode.textContent;
                
                
                prevNodesLength=match.index + entireMatch.length;//Note: This works accidentally. Might be wrong.
            }.bind(this))
           

        }.bind(this));
        
        
        
        this.directive = {};

        for (var directiveName in DirectiveRegistry){
            var __proto = DirectiveRegistry[directiveName].prototype
            if (__proto instanceof Directive){ //because foreach will get more than just other directives
                var name = __proto.name;
                if (name!=="subview"){
                    var elements = (this.$el)?$.makeArray(this.$el.find("[nm-"+name+"]")):$.makeArray($(this.el.querySelectorAll("[nm-"+name+"]")));
                
                    if (elements.length) {
                        this.directive[name] = elements.map(function(element,i,elements){
                            //on the second go-around for nm-map, directiveName somehow is called "SubView"
                            return new DirectiveRegistry[directiveName]({
                                view:this,
                                el:element
                            });
                        }.bind(this)); 
                    }
                }
                else{
                    this.directive["subview"] = this._subViewElements.map(function(subViewElement,i,subViewElements){
                        return new DirectiveRegistry["Subview"]({
                            view:this,
                            el:subViewElement
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
    renderedTemplate:function(){
        if (this.jst) {
            window._ = _;
            return this.jst(this.viewModel.attributes);
        }
        else return _.template(this.templateString)(this.viewModel.attributes)
    },
    delegateEvents: function(events) {//http://stackoverflow.com/a/12193069/1763217
        var delegateEventSplitter = /^(\S+)\s*(.*)$/;
        events || (events = _.result(this, 'events'));                    
        if (!events) return this;
        this.undelegateEvents();
        for (var key in events) {
            var method = events[key];
            if (!_.isFunction(method)) method = this[events[key]];
            if (!method) throw new Error('Method "' + events[key] + '" does not exist');
            var match = key.match(delegateEventSplitter);
            var eventTypes = match[1].split(','), selector = match[2];
            method = _.bind(method, this);
            var self = this;
            _(eventTypes).each(function(eventName) {
                eventName += '.delegateEvents' + self.cid;
                if (selector === '') {
                self.$el.bind(eventName, method);
                } else {
                    self.$el.delegate(selector, eventName, method);
                }
            });
        }
    },
    render:function(){
        
       
    },




    tagName:undefined,//don't want a tagName to be div by default. Rather, make it a documentfragment'
    subViewImports:{},
    childViewImports:{},
      _ensureElement: function() {
                //Overriding this to support document fragments
            if (!this.el) {
                if(this.attributes || this.id || this.className || this.tagName){//if you have any of these backbone properties, do backbone behavior
                        var attrs = _.extend({}, _.result(this, 'attributes'));
                        if (this.id) attrs.id = _.result(this, 'id');
                        if (this.className) attrs['class'] = _.result(this, 'className');
                        this.setElement(this._createElement(_.result(this, 'tagName') || 'div'));
                        this._setAttributes(attrs);
                }
                else{//however, default to this.el being a documentfragment (makes this.el named improperly but whatever)
                    this.el = document.createDocumentFragment();
                }
            } else {
                this.setElement(_.result(this, 'el'));
            }
    },
    set:function(obj){
        this.viewModel.set(obj);
    },
    get:function(prop){
        return this.viewModel.get(prop)
    }
});
