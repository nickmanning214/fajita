import $ from "jquery";
import Directive from "./directive";

export default Directive.extend({
    name:"map",
    childInit:function(){
        this.collection = this.view.viewModel.get(this.val.split(":")[0]);
        this.ChildView = this.view.childViewImports[this.val.split(":")[1]];
        if (this.view.mappings && this.view.mappings[this.val.split(":")[1]]) this.childViewMappings = this.view.mappings[this.val.split(":")[1]];
        
       

        //If there is an error here, it's possibly because you didn't include a mapping for this in the giant nested JSON in the parent parent parent parent parent view.
        
        this.listenTo(this.collection,"add",function(){
            this.renderAdd();
        });

        this.listenTo(this.collection,"reset",function(){
            this.renderReset();
        })

        this.listenTo(this.collection,"remove",function(){
            this.renderRemove();
        });

        this.listenTo(this.collection,"sort",function(){
            this.renderSort();        
        })
        
    },
    build:function(){
        //Map models to childView instances with their mappings
        this.childViews = this.collection.map(function(childModel,i){
            var childview = new this.ChildView({
                model:childModel,
                mappings:this.childViewMappings,
                index:i,
                lastIndex:this.collection.length - i - 1,
                collection:this.collection,
                data:this.view.viewModel.get(this.val.split(":")[0])[i],
                tagName:this.el.tagName
            });
            childview._setAttributes(_.extend({}, _.result(childview, 'attributes')));
            return childview;
        }.bind(this));


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
    },
    renderAdd:function(){
        var children = [];
        this.collection.each(function(model,i){
            var existingChildView = this.childViews.filter(function(childView){
                return childView.model == model
            })[0];
            if (existingChildView) {
                children.push(existingChildView.el)
                var attributes = _.extend({}, _.result(existingChildView, 'attributes'))
                existingChildView._setAttributes(attributes);
            }
            else {
                var newChildView = new this.ChildView({
                    model:model,
                    mappings:this.childViewMappings,
                    index:i,
                    lastIndex:this.collection.length - i - 1,
                    collection:this.collection,
                    data:this.view.viewModel.get(this.val.split(":")[0])[i]
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
    }
});