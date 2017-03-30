/*import Backbone from "backbone";*/
import Directive from "./directive";
import AbstractSubview from "./abstract-subview"
export default AbstractSubview.extend({
    name:"map",
    _initializeChildViews:function(){



        this.listenTo(this.subCollection,"add",function(){
            this.renderAdd();
        });

        this.listenTo(this.subCollection,"reset",function(){
            this.renderReset();
        })

        this.listenTo(this.subCollection,"remove",function(){
            this.renderRemove();
        });

        this.listenTo(this.subCollection,"sort",function(){
            this.renderSort();        
        });



        //Map models to childView instances with their templateValues
        this.ChildView = this.view.childViewImports[this.subViewName];
        this.childViewOptions = {
            templateValues:this.childMappings,
            collection:this.subCollection,
            tagName:this.view.childViewImports[this.subViewName].prototype.tagName || "subitem",
            defaultsOverride:this.defaultsOverride
        };


        this.childViews = this.subCollection.map(function(childModel,i){
            
            var childViewOptions = _.extend({},this.childViewOptions,{
                model:childModel,
                index:i,
                lastIndex:this.subCollection.length - i - 1,
                defaultsOverride:this.defaultsOverride && this.defaultsOverride.models[i] && this.defaultsOverride.models[i].attributes,
                //Just added check for this.defaultsOverride.models[i]
            });
            
            var childview = new this.ChildView(childViewOptions);
            //childview._setAttributes(_.extend({}, _.result(childview, 'attributes')));
            return childview;
        }.bind(this));

    },
    childInit:function(){
        this._initializeBackboneObject();
        this._initializeChildMappings();
        this._initializedefaultsOverride();
        this._initializeChildViews();

        
      

        
        

        
        
        
       
    },
    build:function(){
        if (!this.subCollection){
            this.$el.replaceWith(this.subView.el);
        }
        else{
            var $children = $();
            this.childViews.forEach(function(childView,i){
                $children = $children.add(childView.el)
                childView.index = i;
            }.bind(this));
            if ($children.length) {
                this.$el.replaceWith($children);
                this.childViews.forEach(function(childView,i){
                    childView.delegateEvents();
                })
                this.$parent = $children.parent()
            }
            else{
                this.$parent = this.$el.parent();
            }
            this.$children = $children
        }
    },
    renderAdd:function(){
        var children = [];
        this.subCollection.each(function(model,i){
            var existingChildView = this.childViews.filter(function(childView){
                return childView.model == model
            })[0];
            if (existingChildView) {
                children.push(existingChildView.el)
                //var attributes = _.extend({}, _.result(existingChildView, 'attributes'))
                //existingChildView._setAttributes(attributes);
            }
            else {
                var newChildView = new this.ChildView({
                    model:model,
                    templateValues:this.childMappings,
                    index:i,
                    lastIndex:this.subCollection.length - i - 1,
                    collection:this.subCollection,
                    data:this.view.get(this.val.split(":")[0])[i]
                })
                this.childViews.push(newChildView);
                children.push(newChildView.el)
            }
            
        }.bind(this))
        this.$parent.empty();
        children.forEach(function(child){
            this.$parent.append(child)
        }.bind(this))
        this.$children = $(children)
        
        this.childViews.forEach(function(childView,i){
            childView.delegateEvents();
        })

    },
    renderReset:function(){
        this.$parent.empty();
    },
    renderRemove:function(){
        this.$children.last().remove();
        this.childViews.splice(-1,1);
        this.$children = this.$parent.children();
    },
    renderSort:function(){
        
        //Don't need this (now). Models will already be sorted on add with collection.comparator = xxx;
    },
    test:function(){
        //this.view is instance of the view that contains the subview directive.
        //this.subView is instance of the subview
        //this is the directive.

        if (this.subView){
            //why parentNode?
            return this.view.el.contains(this.subView.el.parentNode);
        }
        else{
            var pass = true;
            var el = this.view.el
            this.$children.each(function(){
                if (!el.contains(this)) pass = false;
            })
           return pass;
            
        }
    }
})