import Directive from "./directive";

export default Directive.extend({
    name:"subview",
    childInit:function(){
        if (this.view.mappings && this.view.mappings[this.val]) this.childMappings = this.view.mappings[this.val];
        this.data = this.view.viewModel.get(this.val);
        if (this.view.subViewImports[this.val].prototype instanceof Backbone.View) this.ChildConstructor = this.view.subViewImports[this.val];
        else this.ChildConstructor = this.view.subViewImports[this.val].call(this.view);
        
        var options = {};
           
        if (this.data){
            _.extend(options,{data:this.data});
        }

        if (this.childMappings){
            _.extend(options,{
                mappings:this.childMappings
                ,el:this.el
            })
        }
        _.extend(options,{model:this.view.model});

        this.subView = new this.ChildConstructor(options);
        var classes = _.result(this.subView,"className")
        if (classes){
            classes.split(" ").forEach(function(cl){
                this.subView.el.classList.add(cl)
            }.bind(this))
        };

        var attributes = _.result(this.subView,"attributes");
        if (attributes){
            _.each(attributes,function(val,name){
                this.subView.el.setAttribute(name,val)    
            }.bind(this))
        }
        
        this.subView.parent = this.view;
        this.subView.parentDirective = this;
        
    },
    build:function(){
        this.$el.replaceWith(this.subView.el);
    }
})