/*import $ from "jquery";*/
/*import _ from "underscore";*/
/*import Backbone from "backbone";*/
import DirectiveRegistry from "./directive/directiveRegistry.js"
import Directive from "./directive/directive.js"
import ViewModel from "./ViewModel";



var backboneViewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];
var additionalViewOptions = ['warn','templateValues','templateString','childViewImports','subViewImports','index','lastIndex','defaultsOverride']
export default Backbone.View.extend({
    getAllTextNodes:function(){
        //http://stackoverflow.com/questions/10730309/find-all-text-nodes-in-html-page
        var n, a=[], walk=document.createTreeWalker(this.el,NodeFilter.SHOW_TEXT,null,false);
        while(n=walk.nextNode()) a.push(n);
        return a;
        
    },
     constructor: function constructor(options) {

        var options = options || {};

        //A template and defaults are all but required.
        if (this.warn || typeof this.warn=="undefined"){
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
        if (this.subViewImports){
            for(var prop in this.subViewImports){
                if (attrs[prop] instanceof Array){
                    //this.viewModel.set(prop, attrs[prop].map(obj=>{return _.extend({},this.subViewImports[prop].prototype.defaults,obj)}))
                    this.viewModel.set(prop,
                    new Backbone.Collection(attrs[prop].map((obj,i)=>{
                        let view = new this.subViewImports[prop]({
                            model:this,
                            defaultsOverride:this.defaults[prop][i]
                        });
                        return {view:view};
                            
                        })
                    ))
                }
                else {
                    //this.viewModel.set(prop,_.extend({},this.subViewImports[prop].prototype.defaults,attrs[prop]))
                    this.viewModel.set(prop,new this.subViewImports[prop]({
                        model:this,
                        defaultsOverride:this.defaults[prop]
                    }))
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

            _.each(this.templateValues,function(val,key){
                if (typeof val==="object"){

                    this.viewModel.set(key,new this.subViewImports[key]({
                        model:this.model,
                        templateValues:val
                    }));
                } 
            }.bind(this))
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
    
    initialize:function(options){
        //attach options to view (model, propMap, subViews, events)
        options = options || {};
        _.extend(this,options);
    },
    getModelAttr:function(attr){
        //quickly grab a models attribute by a view variable. Useful in classname function.
        if (typeof this.templateValues[attr] =="string") return this.model.get(this.templateValues[attr]);
        else return this.templateValues[attr].call(this)
    },
    updateViewModel:function(){

        
        
        this.viewModel.set(_.mapObject(this.templateValues,function(modelVar){
            if (typeof modelVar=="string") return this.model.get(modelVar);
            else if (typeof modelVar=="function") return modelVar.call(this)
        }.bind(this)));

        

        
        
    
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

        //Get all of the text nodes in the document.
        this._subViewElements = [];
        this.getAllTextNodes().forEach(function(fullTextNode){
            //http://stackoverflow.com/a/21311670/1763217 textContent seems right

            var re = /\{\{(.+?)\}\}/g; //Match {{subViewName}}
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
            }.bind(this));
           

        }.bind(this));
        
        
        
        this.directive = {};

       


        for (var directiveName in DirectiveRegistry){
            var __proto = DirectiveRegistry[directiveName].prototype
            if (__proto instanceof Directive){ //because foreach will get more than just other directives
                var name = __proto.name;
                var elements = (this.$el)?$.makeArray(this.$el.find("[nm-"+name+"]")):$.makeArray($(this.el.querySelectorAll("[nm-"+name+"]")));
            
                if (elements.length) {
                    this.directive[name] = elements.map(function(element,i,elements){
                        //on the second go-around for nm-map, directiveName somehow is called "SubView"
                        return new DirectiveRegistry[directiveName]({
                            view:this,
                            el:element,
                            val:element.getAttribute("nm-"+name)
                        });
                    }.bind(this)); 
                }
            }
        }   


         this._subViewElements.forEach(function(subViewElement){
            var args = subViewElement.match.split(":");
            if (args.length==1){
                if (!this.directive["subview"]) this.directive["subview"] = [];
                this.directive["subview"].push(new DirectiveRegistry["Subview"]({
                    view:this,
                    el:subViewElement,
                    val:subViewElement.match
                }));
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
